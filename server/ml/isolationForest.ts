import { MLFeatures, FeatureContribution } from '../../src/types.js';

interface IsolationTreeNode {
  isLeaf: boolean;
  size: number;
  splitFeature?: number;
  splitValue?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
}

export interface IsolationForestConfig {
  numTrees?: number; // e.g. 100
  subsampleSize?: number; // e.g. 256
  contamination?: number; // e.g. 0.15
}

export interface AnomalyPrediction {
  entityId: string;
  anomalyScore: number; // 0.0 - 1.0
  normalizedScore: number; // 0 - 100
  isAnomaly: boolean;
  averagePathLength: number;
  featureContributions: FeatureContribution[];
}

export class IsolationForest {
  private trees: IsolationTreeNode[] = [];
  private numTrees: number;
  private subsampleSize: number;
  private contamination: number;
  private featureNames: (keyof MLFeatures)[] = [
    'transaction_frequency',
    'transaction_count',
    'total_input_amount',
    'total_output_amount',
    'average_transaction_amount',
    'amount_variance',
    'average_fee',
    'input_count',
    'output_count',
    'unique_counterparties',
    'unique_ips',
    'unique_asns',
    'country_count',
    'transaction_interval',
    'wallet_degree',
    'graph_centrality'
  ];
  private featureDisplayNames: Record<string, string> = {
    transaction_frequency: 'Transaction Frequency',
    transaction_count: 'Total Transaction Count',
    total_input_amount: 'Total Input Volume (BTC)',
    total_output_amount: 'Total Output Volume (BTC)',
    average_transaction_amount: 'Average TX Amount',
    amount_variance: 'Amount Variance',
    average_fee: 'Average Transaction Fee',
    input_count: 'Input Count',
    output_count: 'Output Count',
    unique_counterparties: 'Unique Counterparties',
    unique_ips: 'Unique IPs Observed',
    unique_asns: 'Unique ASNs Count',
    country_count: 'Geographic Countries',
    transaction_interval: 'Transaction Interval Delta',
    wallet_degree: 'Graph Degree',
    graph_centrality: 'Centrality & PageRank'
  };

  private featureMeans: number[] = [];
  private featureStd: number[] = [];

  constructor(config: IsolationForestConfig = {}) {
    this.numTrees = config.numTrees || 100;
    this.subsampleSize = config.subsampleSize || 256;
    this.contamination = config.contamination || 0.15;
  }

  /**
   * Fits the Isolation Forest on the extracted feature vectors
   */
  public fit(data: MLFeatures[]): void {
    if (data.length === 0) return;
    this.trees = [];

    const matrix = data.map(d => this.vectorize(d));
    const nSamples = matrix.length;
    const nFeatures = this.featureNames.length;
    const psi = Math.min(this.subsampleSize, nSamples);
    const maxDepth = Math.ceil(Math.log2(Math.max(psi, 2)));

    // Compute baseline mean and std for feature z-scoring
    this.featureMeans = Array(nFeatures).fill(0);
    this.featureStd = Array(nFeatures).fill(1);

    for (let f = 0; f < nFeatures; f++) {
      const vals = matrix.map(row => row[f]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      this.featureMeans[f] = mean;
      this.featureStd[f] = Math.sqrt(variance) || 1;
    }

    // Build ensemble of Isolation Trees
    for (let t = 0; t < this.numTrees; t++) {
      // Subsample psi random rows
      const subsample: number[][] = [];
      for (let i = 0; i < psi; i++) {
        const randIdx = Math.floor(Math.random() * nSamples);
        subsample.push(matrix[randIdx]);
      }

      const tree = this.buildITree(subsample, 0, maxDepth);
      this.trees.push(tree);
    }
  }

  private buildITree(X: number[][], currentDepth: number, maxDepth: number): IsolationTreeNode {
    if (currentDepth >= maxDepth || X.length <= 1) {
      return { isLeaf: true, size: X.length };
    }

    const nFeatures = this.featureNames.length;
    // Check if all instances are identical
    let allIdentical = true;
    for (let i = 1; i < X.length; i++) {
      for (let f = 0; f < nFeatures; f++) {
        if (X[i][f] !== X[0][f]) {
          allIdentical = false;
          break;
        }
      }
      if (!allIdentical) break;
    }

    if (allIdentical) {
      return { isLeaf: true, size: X.length };
    }

    // Pick random feature that has min < max
    let attempts = 0;
    let splitFeature = -1;
    let minVal = 0;
    let maxVal = 0;

    while (attempts < 10) {
      const randF = Math.floor(Math.random() * nFeatures);
      const colVals = X.map(row => row[randF]);
      const min = Math.min(...colVals);
      const max = Math.max(...colVals);
      if (min < max) {
        splitFeature = randF;
        minVal = min;
        maxVal = max;
        break;
      }
      attempts++;
    }

    if (splitFeature === -1) {
      return { isLeaf: true, size: X.length };
    }

    // Pick random split point in [minVal, maxVal]
    const splitValue = minVal + Math.random() * (maxVal - minVal);

    const left: number[][] = [];
    const right: number[][] = [];
    for (const row of X) {
      if (row[splitFeature] < splitValue) {
        left.push(row);
      } else {
        right.push(row);
      }
    }

    return {
      isLeaf: false,
      size: X.length,
      splitFeature,
      splitValue,
      left: this.buildITree(left, currentDepth + 1, maxDepth),
      right: this.buildITree(right, currentDepth + 1, maxDepth)
    };
  }

  /**
   * Calculates anomaly score and local feature attribution for a feature vector
   */
  public predict(feature: MLFeatures): AnomalyPrediction {
    const x = this.vectorize(feature);
    const psi = Math.min(this.subsampleSize, 256);
    const cN = this.cFactor(psi);

    let totalPathLength = 0;
    const featureSplitCounts = Array(this.featureNames.length).fill(0);
    const featureEarlyIsolationBoost = Array(this.featureNames.length).fill(0);

    for (const tree of this.trees) {
      const { pathLength, featureTraversed } = this.pathLength(x, tree, 0);
      totalPathLength += pathLength;

      // Track feature traversal
      featureTraversed.forEach((fIdx, depth) => {
        featureSplitCounts[fIdx]++;
        // Earlier depth splits give higher contribution
        featureEarlyIsolationBoost[fIdx] += (10 / (depth + 1));
      });
    }

    const avgPathLength = totalPathLength / Math.max(1, this.trees.length);
    // Isolation score formula: s(x, n) = 2^(-E(h(x)) / c(n))
    const anomalyScore = Math.pow(2, -avgPathLength / cN);
    const normalizedScore = Math.min(100, Math.max(0, Math.round(anomalyScore * 100)));

    // Explainability: Compute feature contributions
    const totalBoost = featureEarlyIsolationBoost.reduce((a, b) => a + b, 0) || 1;
    const contributions: FeatureContribution[] = this.featureNames.map((fName, idx) => {
      const rawVal = x[idx];
      const mean = this.featureMeans[idx] || 0;
      const std = this.featureStd[idx] || 1;
      const zScore = (rawVal - mean) / std;
      
      const pct = Math.round((featureEarlyIsolationBoost[idx] / totalBoost) * 100);
      const direction: 'HIGH' | 'LOW' | 'NORMAL' = zScore > 1.2 ? 'HIGH' : zScore < -1.2 ? 'LOW' : 'NORMAL';

      let description = `Value ${rawVal}`;
      if (direction === 'HIGH') {
        description = `${+zScore.toFixed(1)}σ above normal baseline`;
      } else if (direction === 'LOW') {
        description = `${+Math.abs(zScore).toFixed(1)}σ below normal baseline`;
      } else {
        description = `Within typical bounds`;
      }

      return {
        featureName: fName,
        displayName: this.featureDisplayNames[fName] || String(fName),
        value: rawVal,
        contributionPercent: pct,
        direction,
        description
      };
    }).sort((a, b) => b.contributionPercent - a.contributionPercent);

    return {
      entityId: feature.entityId,
      anomalyScore: +anomalyScore.toFixed(4),
      normalizedScore,
      isAnomaly: anomalyScore >= (1 - this.contamination),
      averagePathLength: +avgPathLength.toFixed(2),
      featureContributions: contributions
    };
  }

  private pathLength(x: number[], node: IsolationTreeNode, currentDepth: number): { pathLength: number; featureTraversed: number[] } {
    const traversed: number[] = [];
    let curr: IsolationTreeNode = node;
    let depth = currentDepth;

    while (!curr.isLeaf) {
      if (curr.splitFeature !== undefined && curr.splitValue !== undefined) {
        traversed.push(curr.splitFeature);
        if (x[curr.splitFeature] < curr.splitValue) {
          curr = curr.left!;
        } else {
          curr = curr.right!;
        }
        depth++;
      } else {
        break;
      }
    }

    const cSize = this.cFactor(curr.size);
    return {
      pathLength: depth + cSize,
      featureTraversed: traversed
    };
  }

  private cFactor(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    const eulerGamma = 0.5772156649;
    return 2 * (Math.log(n - 1) + eulerGamma) - (2 * (n - 1) / n);
  }

  private vectorize(feature: MLFeatures): number[] {
    return this.featureNames.map(k => {
      const val = (feature as any)[k];
      return typeof val === 'number' && !isNaN(val) ? val : 0;
    });
  }

  public getFeatureImportance(): { feature: string; importance: number }[] {
    // Aggregated feature importance across all trees
    const counts = Array(this.featureNames.length).fill(0);
    for (const tree of this.trees) {
      this.collectTreeFeatureUsage(tree, counts);
    }
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    return this.featureNames.map((fName, idx) => ({
      feature: this.featureDisplayNames[fName] || String(fName),
      importance: +((counts[idx] / total) * 100).toFixed(1)
    })).sort((a, b) => b.importance - a.importance);
  }

  private collectTreeFeatureUsage(node: IsolationTreeNode, counts: number[]): void {
    if (node.isLeaf) return;
    if (node.splitFeature !== undefined) {
      counts[node.splitFeature]++;
    }
    if (node.left) this.collectTreeFeatureUsage(node.left, counts);
    if (node.right) this.collectTreeFeatureUsage(node.right, counts);
  }
}
