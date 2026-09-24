export interface GraphCentralityResult {
  degreeCentrality: Map<string, number>;
  pageRank: Map<string, number>;
  betweennessApprox: Map<string, number>;
  components: Map<string, number>;
}

export class GraphAnalyticsService {
  /**
   * Computes PageRank, Degree Centrality, and Connected Components on an adjacency map
   */
  public static analyze(adjacency: Map<string, Set<string>>, damping: number = 0.85, maxIter: number = 25): GraphCentralityResult {
    const nodes = Array.from(adjacency.keys());
    const N = nodes.length;

    const degreeCentrality = new Map<string, number>();
    const pageRank = new Map<string, number>();
    const betweennessApprox = new Map<string, number>();
    const components = new Map<string, number>();

    if (N === 0) {
      return { degreeCentrality, pageRank, betweennessApprox, components };
    }

    // 1. Degree Centrality
    let maxDegree = 1;
    for (const node of nodes) {
      const deg = adjacency.get(node)?.size || 0;
      if (deg > maxDegree) maxDegree = deg;
    }
    for (const node of nodes) {
      const deg = adjacency.get(node)?.size || 0;
      degreeCentrality.set(node, deg / maxDegree);
    }

    // 2. PageRank (Power Iteration)
    const initialPr = 1.0 / N;
    let pr = new Map<string, number>();
    for (const node of nodes) {
      pr.set(node, initialPr);
    }

    for (let iter = 0; iter < maxIter; iter++) {
      const nextPr = new Map<string, number>();
      let sinkSum = 0;

      for (const node of nodes) {
        const deg = adjacency.get(node)?.size || 0;
        if (deg === 0) {
          sinkSum += pr.get(node)!;
        }
      }

      for (const node of nodes) {
        let incomingSum = 0;
        const neighbors = adjacency.get(node) || new Set();
        for (const n of neighbors) {
          const nDeg = adjacency.get(n)?.size || 1;
          incomingSum += (pr.get(n)! / nDeg);
        }
        const rank = (1 - damping) / N + damping * (incomingSum + sinkSum / N);
        nextPr.set(node, rank);
      }
      pr = nextPr;
    }

    // Normalize PageRank to 0..1 scale
    let maxPr = 0;
    for (const v of pr.values()) {
      if (v > maxPr) maxPr = v;
    }
    for (const [k, v] of pr.entries()) {
      pageRank.set(k, maxPr > 0 ? v / maxPr : 0);
    }

    // 3. Approximate Betweenness Centrality (sample-based shortest paths)
    const sampleSize = Math.min(30, N);
    const sampleNodes = nodes.slice(0, sampleSize);
    const betweennessScores = new Map<string, number>();
    for (const node of nodes) betweennessScores.set(node, 0);

    for (const s of sampleNodes) {
      const queue: string[] = [s];
      const visited = new Set<string>([s]);
      const parent = new Map<string, string[]>();

      while (queue.length > 0) {
        const v = queue.shift()!;
        const neighbors = adjacency.get(v) || new Set();
        for (const w of neighbors) {
          if (!visited.has(w)) {
            visited.add(w);
            parent.set(w, [v]);
            queue.push(w);
          } else if (parent.has(w)) {
            parent.get(w)!.push(v);
          }
        }
      }

      for (const node of visited) {
        if (node !== s) {
          let curr: string | undefined = node;
          while (curr && parent.has(curr)) {
            const pList = parent.get(curr)!;
            for (const p of pList) {
              if (p !== s) {
                betweennessScores.set(p, (betweennessScores.get(p) || 0) + 1);
              }
            }
            curr = pList[0];
          }
        }
      }
    }

    let maxBetweenness = 1;
    for (const v of betweennessScores.values()) {
      if (v > maxBetweenness) maxBetweenness = v;
    }
    for (const [k, v] of betweennessScores.entries()) {
      betweennessApprox.set(k, v / maxBetweenness);
    }

    // 4. Connected Components (BFS labeling)
    let compId = 0;
    const compVisited = new Set<string>();
    for (const node of nodes) {
      if (!compVisited.has(node)) {
        compId++;
        const q = [node];
        compVisited.add(node);
        while (q.length > 0) {
          const curr = q.shift()!;
          components.set(curr, compId);
          const neighbors = adjacency.get(curr) || new Set();
          for (const n of neighbors) {
            if (!compVisited.has(n)) {
              compVisited.add(n);
              q.push(n);
            }
          }
        }
      }
    }

    return { degreeCentrality, pageRank, betweennessApprox, components };
  }
}
