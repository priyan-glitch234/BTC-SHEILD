import { RawTransactionRecord, MLFeatures, EntityType } from '../../src/types.js';
import { CorrelationEngine } from '../correlation/correlationEngine.js';
import { GraphCentralityResult } from './graphAnalytics.js';

export class FeatureExtractor {
  /**
   * Extracts rich multi-dimensional behavioral and topological ML feature vectors
   */
  public static extractWalletFeatures(
    records: RawTransactionRecord[],
    correlation: CorrelationEngine,
    graphMetrics: GraphCentralityResult
  ): Map<string, MLFeatures> {
    const featuresMap = new Map<string, MLFeatures>();

    // Map wallet -> transactions list with timestamps and amounts
    const walletTxMap = new Map<string, {
      timestamps: number[];
      inAmounts: number[];
      outAmounts: number[];
      fees: number[];
      counterparties: Set<string>;
      ips: Set<string>;
      asns: Set<string>;
      countries: Set<string>;
      inCount: number;
      outCount: number;
    }>();

    for (const tx of records) {
      const timeMs = new Date(tx.timestamp).getTime();

      // Inputs
      tx.input_addresses.forEach((inAddr, idx) => {
        let stats = walletTxMap.get(inAddr);
        if (!stats) {
          stats = {
            timestamps: [],
            inAmounts: [],
            outAmounts: [],
            fees: [],
            counterparties: new Set(),
            ips: new Set(),
            asns: new Set(),
            countries: new Set(),
            inCount: 0,
            outCount: 0
          };
          walletTxMap.set(inAddr, stats);
        }
        stats.timestamps.push(timeMs);
        const inAmt = tx.input_amounts[idx] || 0;
        stats.inAmounts.push(inAmt);
        stats.fees.push(tx.fee);
        stats.inCount++;
        stats.ips.add(tx.src_ip);
        stats.asns.add(tx.asn);
        stats.countries.add(tx.geo_country);
        tx.output_addresses.forEach(o => stats!.counterparties.add(o));
      });

      // Outputs
      tx.output_addresses.forEach((outAddr, idx) => {
        let stats = walletTxMap.get(outAddr);
        if (!stats) {
          stats = {
            timestamps: [],
            inAmounts: [],
            outAmounts: [],
            fees: [],
            counterparties: new Set(),
            ips: new Set(),
            asns: new Set(),
            countries: new Set(),
            inCount: 0,
            outCount: 0
          };
          walletTxMap.set(outAddr, stats);
        }
        stats.timestamps.push(timeMs);
        const outAmt = tx.output_amounts[idx] || 0;
        stats.outAmounts.push(outAmt);
        stats.outCount++;
        stats.ips.add(tx.src_ip);
        stats.asns.add(tx.asn);
        stats.countries.add(tx.geo_country);
        tx.input_addresses.forEach(i => stats!.counterparties.add(i));
      });
    }

    // Compute mathematical statistics for each wallet
    for (const [walletAddr, stats] of walletTxMap.entries()) {
      const txCount = stats.timestamps.length;
      const sortedTimes = stats.timestamps.slice().sort((a, b) => a - b);
      
      let totalTimeDeltaSec = 0;
      let intervals: number[] = [];
      let burstCount = 0;
      for (let i = 1; i < sortedTimes.length; i++) {
        const delta = (sortedTimes[i] - sortedTimes[i - 1]) / 1000;
        intervals.push(delta);
        totalTimeDeltaSec += delta;
        if (delta < 60) {
          burstCount++;
        }
      }

      const avgInterval = intervals.length > 0 ? (totalTimeDeltaSec / intervals.length) : 3600;
      const timespanHours = Math.max(1, (sortedTimes[sortedTimes.length - 1] - sortedTimes[0]) / (1000 * 3600));
      const txFrequency = +(txCount / timespanHours).toFixed(4);

      const totalIn = stats.inAmounts.reduce((a, b) => a + b, 0);
      const totalOut = stats.outAmounts.reduce((a, b) => a + b, 0);
      const allAmounts = [...stats.inAmounts, ...stats.outAmounts];
      const avgAmount = allAmounts.length > 0 ? allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length : 0;
      
      // Variance
      let variance = 0;
      if (allAmounts.length > 1) {
        const sumSq = allAmounts.reduce((acc, val) => acc + Math.pow(val - avgAmount, 2), 0);
        variance = +(sumSq / allAmounts.length).toFixed(6);
      }

      const avgFee = stats.fees.length > 0 ? stats.fees.reduce((a, b) => a + b, 0) / stats.fees.length : 0;

      const entityKey = `wallet:${walletAddr}`;
      const degCentrality = graphMetrics.degreeCentrality.get(entityKey) || 0;
      const pr = graphMetrics.pageRank.get(entityKey) || 0;
      const betweenness = graphMetrics.betweennessApprox.get(entityKey) || 0;
      const combinedCentrality = +((degCentrality * 0.4 + pr * 0.4 + betweenness * 0.2)).toFixed(4);

      const entityObj = correlation.getEntity(entityKey);
      const walletDegree = entityObj ? entityObj.degree : stats.counterparties.size;

      const inrValue = +((totalIn + totalOut) * 7500000).toFixed(2);
      const isIndiaLinked = stats.countries.has('IN');
      const isCrossBorder = isIndiaLinked && stats.countries.size > 1;

      featuresMap.set(walletAddr, {
        entityId: walletAddr,
        entityType: 'wallet',
        transaction_frequency: txFrequency,
        transaction_count: txCount,
        total_input_amount: +totalIn.toFixed(4),
        total_output_amount: +totalOut.toFixed(4),
        average_transaction_amount: +avgAmount.toFixed(4),
        amount_variance: variance,
        average_fee: +avgFee.toFixed(6),
        input_count: stats.inCount,
        output_count: stats.outCount,
        unique_counterparties: stats.counterparties.size,
        unique_ips: stats.ips.size,
        unique_asns: stats.asns.size,
        country_count: stats.countries.size,
        transaction_interval: +avgInterval.toFixed(2),
        wallet_degree: walletDegree,
        graph_centrality: combinedCentrality,
        betweenness_centrality: betweenness,
        pagerank: pr,
        transaction_value_inr: inrValue,
        ip_repeat_count: Math.max(1, Math.floor(txCount / Math.max(1, stats.ips.size))),
        wallet_repeat_count: txCount,
        burst_activity_count: burstCount,
        india_linked_flag: isIndiaLinked ? 1 : 0,
        cross_border_flag: isCrossBorder ? 1 : 0
      });
    }

    return featuresMap;
  }
}
