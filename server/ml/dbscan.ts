import { MLFeatures } from '../../src/types.js';

export interface DBSCANConfig {
  eps?: number; // default ~ 0.8 on normalized features
  minPts?: number; // default 3
}

export interface ClusterAssignment {
  entityId: string;
  clusterId: number; // -1 for noise, >= 1 for clusters
  isCorePoint: boolean;
  isNoise: boolean;
}

export interface ClusterSummary {
  clusterId: number;
  name: string;
  memberCount: number;
  avgVolumeBTC: number;
  avgTxCount: number;
  avgRiskScore: number;
  memberEntities: string[];
  characteristicDescription: string;
}

export class DBSCAN {
  private eps: number;
  private minPts: number;
  private featureKeys: (keyof MLFeatures)[] = [
    'transaction_frequency',
    'transaction_count',
    'total_input_amount',
    'total_output_amount',
    'average_transaction_amount',
    'average_fee',
    'unique_counterparties',
    'unique_ips',
    'unique_asns',
    'wallet_degree',
    'graph_centrality'
  ];

  constructor(config: DBSCANConfig = {}) {
    this.eps = config.eps || 1.1;
    this.minPts = config.minPts || 3;
  }

  /**
   * Clusters ML feature vectors using DBSCAN
   */
  public fit(features: MLFeatures[]): { assignments: Map<string, ClusterAssignment>; summaries: ClusterSummary[] } {
    const assignments = new Map<string, ClusterAssignment>();
    if (features.length === 0) {
      return { assignments, summaries: [] };
    }

    // 1. Normalize feature matrix (Standard Z-Score normalization)
    const rawMatrix = features.map(f => this.featureKeys.map(k => Number((f as any)[k]) || 0));
    const nSamples = rawMatrix.length;
    const nFeatures = this.featureKeys.length;

    const means: number[] = Array(nFeatures).fill(0);
    const stds: number[] = Array(nFeatures).fill(1);

    for (let f = 0; f < nFeatures; f++) {
      const vals = rawMatrix.map(row => row[f]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      means[f] = mean;
      stds[f] = Math.sqrt(variance) || 1;
    }

    const normMatrix: number[][] = rawMatrix.map(row =>
      row.map((val, f) => (val - means[f]) / stds[f])
    );

    // 2. Compute distance neighborhoods
    const neighbors: number[][] = Array.from({ length: nSamples }, () => []);
    for (let i = 0; i < nSamples; i++) {
      for (let j = 0; j < nSamples; j++) {
        if (i === j) continue;
        const dist = this.euclideanDistance(normMatrix[i], normMatrix[j]);
        if (dist <= this.eps) {
          neighbors[i].push(j);
        }
      }
    }

    // 3. DBSCAN clustering expansion
    const visited = new Array(nSamples).fill(false);
    const clusterLabels = new Array(nSamples).fill(0); // 0 = unclassified, -1 = noise, 1..K = clusters
    const isCore = new Array(nSamples).fill(false);
    let currentClusterId = 0;

    for (let i = 0; i < nSamples; i++) {
      if (visited[i]) continue;
      visited[i] = true;

      const nbrs = neighbors[i];
      if (nbrs.length < this.minPts - 1) { // -1 because neighbors doesn't include i itself
        clusterLabels[i] = -1; // Mark as noise initially
      } else {
        currentClusterId++;
        clusterLabels[i] = currentClusterId;
        isCore[i] = true;

        // Expand cluster
        const seedQueue = [...nbrs];
        let qIdx = 0;

        while (qIdx < seedQueue.length) {
          const currentPoint = seedQueue[qIdx++];
          if (!visited[currentPoint]) {
            visited[currentPoint] = true;
            const currentNbrs = neighbors[currentPoint];
            if (currentNbrs.length >= this.minPts - 1) {
              isCore[currentPoint] = true;
              for (const n of currentNbrs) {
                if (!seedQueue.includes(n)) {
                  seedQueue.push(n);
                }
              }
            }
          }

          if (clusterLabels[currentPoint] <= 0) {
            clusterLabels[currentPoint] = currentClusterId;
          }
        }
      }
    }

    // 4. Build return structure
    const clusterBuckets = new Map<number, MLFeatures[]>();

    features.forEach((f, idx) => {
      const cId = clusterLabels[idx];
      const isNoise = cId === -1;
      assignments.set(f.entityId, {
        entityId: f.entityId,
        clusterId: cId,
        isCorePoint: isCore[idx],
        isNoise: isNoise
      });

      if (!clusterBuckets.has(cId)) clusterBuckets.set(cId, []);
      clusterBuckets.get(cId)!.push(f);
    });

    const summaries: ClusterSummary[] = [];
    for (const [cId, members] of clusterBuckets.entries()) {
      const volSum = members.reduce((a, b) => a + (b.total_input_amount + b.total_output_amount), 0);
      const txSum = members.reduce((a, b) => a + b.transaction_count, 0);
      const name = cId === -1 ? 'Noise / Outliers' : `Cluster-${cId.toString().padStart(2, '0')}`;
      
      let desc = '';
      if (cId === -1) {
        desc = 'High-variance anomalous entities with isolated behavioral signatures';
      } else {
        const avgFreq = members.reduce((a, b) => a + b.transaction_frequency, 0) / members.length;
        const avgDeg = members.reduce((a, b) => a + b.wallet_degree, 0) / members.length;
        if (avgFreq > 5) {
          desc = 'High-frequency automated bot/relay cluster';
        } else if (avgDeg > 15) {
          desc = 'Dense hub-and-spoke multi-counterparty network cluster';
        } else {
          desc = 'Regular peer-to-peer behavioral grouping';
        }
      }

      summaries.push({
        clusterId: cId,
        name,
        memberCount: members.length,
        avgVolumeBTC: +(volSum / members.length).toFixed(4),
        avgTxCount: Math.round(txSum / members.length),
        avgRiskScore: cId === -1 ? 85 : 25,
        memberEntities: members.map(m => m.entityId),
        characteristicDescription: desc
      });
    }

    summaries.sort((a, b) => {
      if (a.clusterId === -1) return -1;
      if (b.clusterId === -1) return 1;
      return b.memberCount - a.memberCount;
    });

    return { assignments, summaries };
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
