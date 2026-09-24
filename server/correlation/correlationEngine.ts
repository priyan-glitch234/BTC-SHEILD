import { RawTransactionRecord, EntityType, GraphNode, GraphEdge, EntityGraphData } from '../../src/types.js';

export interface EntityNodeIndex {
  id: string;
  type: EntityType;
  label: string;
  transactions: Set<string>;
  connectedWallets: Set<string>;
  connectedIPs: Set<string>;
  connectedASNs: Set<string>;
  connectedCountries: Set<string>;
  totalVolume: number;
  degree: number;
  firstSeen: string;
  lastSeen: string;
  metadata: Record<string, any>;
}

export class CorrelationEngine {
  private entities = new Map<string, EntityNodeIndex>();
  private adjacency = new Map<string, Set<string>>();
  private edges = new Map<string, GraphEdge>();
  private txMap = new Map<string, RawTransactionRecord>();

  constructor() {}

  /**
   * Builds high-performance correlation index and graph relations from normalized records
   */
  public build(records: RawTransactionRecord[]): void {
    this.entities.clear();
    this.adjacency.clear();
    this.edges.clear();
    this.txMap.clear();

    for (const record of records) {
      this.txMap.set(record.txid, record);

      const srcIpId = `ip:${record.src_ip}`;
      const dstIpId = `ip:${record.dst_ip}`;
      const txNodeId = `tx:${record.txid}`;
      const countryId = `country:${record.geo_country}`;
      const asnId = `asn:${record.asn}`;

      // 1. Index Transaction Node
      const inSum = record.input_amounts.reduce((a, b) => a + b, 0);
      this.getOrSetEntity(txNodeId, 'transaction', record.txid, {
        timestamp: record.timestamp,
        fee: record.fee,
        script_type: record.script_type,
        volume: inSum
      }, record.timestamp);

      // 2. Index IPs
      this.getOrSetEntity(srcIpId, 'ip', record.src_ip, {
        port: record.src_port,
        asn: record.asn,
        country: record.geo_country,
        organization: record.organization
      }, record.timestamp);

      this.getOrSetEntity(dstIpId, 'ip', record.dst_ip, {
        port: record.dst_port
      }, record.timestamp);

      // 3. Index Country & ASN
      this.getOrSetEntity(countryId, 'country', record.geo_country, {}, record.timestamp);
      this.getOrSetEntity(asnId, 'asn', record.asn, { organization: record.organization }, record.timestamp);

      // 4. Edges: IP -> TX (OBSERVED)
      this.addEdge(srcIpId, txNodeId, 'OBSERVED', 1, record.txid, inSum, record.timestamp);
      this.addEdge(srcIpId, countryId, 'LOCATED_IN', 1);
      this.addEdge(srcIpId, asnId, 'BELONGS_TO_ASN', 1);

      // 5. Input Wallets -> TX (INPUT)
      record.input_addresses.forEach((inAddr, idx) => {
        const walletId = `wallet:${inAddr}`;
        const amt = record.input_amounts[idx] || 0;
        this.getOrSetEntity(walletId, 'wallet', inAddr, {}, record.timestamp);
        this.addEdge(walletId, txNodeId, 'INPUT', amt, record.txid, amt, record.timestamp);

        // Update correlations
        const walletObj = this.entities.get(walletId)!;
        walletObj.transactions.add(record.txid);
        walletObj.connectedIPs.add(record.src_ip);
        walletObj.connectedCountries.add(record.geo_country);
        walletObj.connectedASNs.add(record.asn);
        walletObj.totalVolume += amt;
      });

      // 6. TX -> Output Wallets (OUTPUT)
      record.output_addresses.forEach((outAddr, idx) => {
        const walletId = `wallet:${outAddr}`;
        const amt = record.output_amounts[idx] || 0;
        this.getOrSetEntity(walletId, 'wallet', outAddr, {}, record.timestamp);
        this.addEdge(txNodeId, walletId, 'OUTPUT', amt, record.txid, amt, record.timestamp);

        // Update correlations
        const walletObj = this.entities.get(walletId)!;
        walletObj.transactions.add(record.txid);
        walletObj.connectedIPs.add(record.src_ip);
        walletObj.connectedCountries.add(record.geo_country);
        walletObj.connectedASNs.add(record.asn);
        walletObj.totalVolume += amt;
      });

      // Cross-connect input wallets to output wallets
      for (const inAddr of record.input_addresses) {
        const inWId = `wallet:${inAddr}`;
        const inW = this.entities.get(inWId);
        if (inW) {
          for (const outAddr of record.output_addresses) {
            inW.connectedWallets.add(outAddr);
            const outW = this.entities.get(`wallet:${outAddr}`);
            if (outW) outW.connectedWallets.add(inAddr);
          }
        }
      }
    }

    // Finalize degree counts
    for (const [id, entity] of this.entities.entries()) {
      const neighbors = this.adjacency.get(id);
      entity.degree = neighbors ? neighbors.size : 0;
    }
  }

  private getOrSetEntity(id: string, type: EntityType, label: string, metadata: any, timestamp: string): EntityNodeIndex {
    let e = this.entities.get(id);
    if (!e) {
      e = {
        id,
        type,
        label,
        transactions: new Set(),
        connectedWallets: new Set(),
        connectedIPs: new Set(),
        connectedASNs: new Set(),
        connectedCountries: new Set(),
        totalVolume: 0,
        degree: 0,
        firstSeen: timestamp,
        lastSeen: timestamp,
        metadata
      };
      this.entities.set(id, e);
    } else {
      if (new Date(timestamp).getTime() < new Date(e.firstSeen).getTime()) e.firstSeen = timestamp;
      if (new Date(timestamp).getTime() > new Date(e.lastSeen).getTime()) e.lastSeen = timestamp;
      Object.assign(e.metadata, metadata);
    }
    return e;
  }

  private addEdge(
    source: string,
    target: string,
    type: 'OBSERVED' | 'INPUT' | 'OUTPUT' | 'CONNECTED' | 'LOCATED_IN' | 'BELONGS_TO_ASN',
    weight: number = 1,
    txid?: string,
    amount?: number,
    timestamp?: string
  ): void {
    const edgeKey = `${source}->${target}:${type}${txid ? `:${txid}` : ''}`;
    if (!this.edges.has(edgeKey)) {
      this.edges.set(edgeKey, {
        id: edgeKey,
        source,
        target,
        type,
        weight,
        txid,
        amount,
        timestamp
      });
    }

    // Undirected adjacency for multi-hop BFS
    if (!this.adjacency.has(source)) this.adjacency.set(source, new Set());
    if (!this.adjacency.has(target)) this.adjacency.set(target, new Set());
    this.adjacency.get(source)!.add(target);
    this.adjacency.get(target)!.add(source);
  }

  public getEntity(id: string): EntityNodeIndex | undefined {
    return this.entities.get(id);
  }

  public getAllEntities(): EntityNodeIndex[] {
    return Array.from(this.entities.values());
  }

  public getTransaction(txid: string): RawTransactionRecord | undefined {
    return this.txMap.get(txid);
  }

  /**
   * Multi-hop subgraph exploration (1-hop, 2-hop, 3-hop)
   */
  public getSubGraph(centerId: string, hops: number = 2, maxNodes: number = 100): EntityGraphData {
    const visitedNodes = new Set<string>();
    let currentQueue: string[] = [centerId];
    visitedNodes.add(centerId);

    for (let h = 0; h < hops; h++) {
      const nextQueue: string[] = [];
      for (const curr of currentQueue) {
        const neighbors = this.adjacency.get(curr) || new Set();
        for (const n of neighbors) {
          if (!visitedNodes.has(n)) {
            visitedNodes.add(n);
            nextQueue.push(n);
            if (visitedNodes.size >= maxNodes) break;
          }
        }
        if (visitedNodes.size >= maxNodes) break;
      }
      currentQueue = nextQueue;
      if (visitedNodes.size >= maxNodes || currentQueue.length === 0) break;
    }

    const nodes: GraphNode[] = [];
    for (const nodeId of visitedNodes) {
      const entity = this.entities.get(nodeId);
      if (entity) {
        nodes.push({
          id: entity.id,
          label: entity.label,
          type: entity.type,
          riskScore: entity.metadata.riskScore || 0,
          clusterId: entity.metadata.clusterId || 0,
          degree: entity.degree,
          metadata: entity.metadata
        });
      }
    }

    const matchedEdges: GraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (visitedNodes.has(edge.source) && visitedNodes.has(edge.target)) {
        matchedEdges.push(edge);
      }
    }

    return { nodes, edges: matchedEdges };
  }

  /**
   * Returns complete or filtered graph data
   */
  public getFullGraph(maxNodes: number = 250): EntityGraphData {
    const sortedEntities = Array.from(this.entities.values())
      .sort((a, b) => b.degree - a.degree)
      .slice(0, maxNodes);

    const nodeIds = new Set(sortedEntities.map(e => e.id));
    const nodes: GraphNode[] = sortedEntities.map(e => ({
      id: e.id,
      label: e.label,
      type: e.type,
      riskScore: e.metadata.riskScore || 0,
      clusterId: e.metadata.clusterId || 0,
      degree: e.degree,
      metadata: e.metadata
    }));

    const edges: GraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        edges.push(edge);
      }
    }

    return { nodes, edges };
  }

  /**
   * Finds shortest path between two entities
   */
  public findPath(startId: string, endId: string): string[] | null {
    if (!this.entities.has(startId) || !this.entities.has(endId)) return null;
    const queue: string[] = [startId];
    const visited = new Set<string>([startId]);
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === endId) {
        const path: string[] = [curr];
        let p = curr;
        while (parent.has(p)) {
          p = parent.get(p)!;
          path.unshift(p);
        }
        return path;
      }

      const neighbors = this.adjacency.get(curr) || new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          parent.set(n, curr);
          queue.push(n);
        }
      }
    }

    return null;
  }
}
