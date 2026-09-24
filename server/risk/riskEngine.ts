import { 
  MLFeatures, 
  AlertSeverity, 
  EntityDetail, 
  FeatureContribution, 
  PatternType,
  PriorityBand
} from '../../src/types.js';
import { AnomalyPrediction } from '../ml/isolationForest.js';
import { ClusterAssignment } from '../ml/dbscan.js';
import { EntityNodeIndex } from '../correlation/correlationEngine.js';

export interface CalculatedRisk {
  riskScore: number; // 0 - 100
  priority: AlertSeverity;
  behavioralAnomalyScore: number; // 0.0 - 1.0
  indiaRelevanceScore: number; // 0.0 - 1.0
  finalPriorityScore: number; // 0.0 - 1.0
  priorityBand: PriorityBand;
  priorityExplanation: string;
  reasons: string[];
  evidenceList: string[];
  headline: string;
  evidenceSummary: string;
}

export class ExplainableRiskEngine {
  /**
   * Evaluates mathematical anomaly scores and graph topology to produce an explainable risk dossier
   * adhering to the dual-scoring architecture:
   * 1. behavioral_anomaly_score (0-1) from ML and behavioral graph features
   * 2. india_relevance_score (0-1) from contextual signals only
   * 3. final_priority_score = 0.70 * behavioral + 0.30 * india_relevance
   */
  public static evaluate(
    entity: EntityNodeIndex,
    features: MLFeatures | undefined,
    anomaly: AnomalyPrediction | undefined,
    cluster: ClusterAssignment | undefined
  ): CalculatedRisk {
    const reasons: string[] = [];
    const evidenceList: string[] = [];

    // --- STEP 1: Behavioral Anomaly Score Calculation (0.0 to 1.0) ---
    let behavioralScore = 0.15; // baseline

    if (anomaly) {
      behavioralScore = Math.max(behavioralScore, anomaly.anomalyScore);
      if (anomaly.anomalyScore > 0.65) {
        reasons.push(`Isolation Forest flagged observation as early-isolating outlier (${(anomaly.anomalyScore).toFixed(2)})`);
        evidenceList.push(`Isolation Forest path depth anomaly score: ${anomaly.normalizedScore}/100`);
      }
    }

    if (features) {
      if (features.total_input_amount > 2.5 || (features.average_transaction_amount && features.average_transaction_amount > 2.0)) {
        behavioralScore += 0.25;
        reasons.push('Unusual transaction amount compared to peer baseline');
        evidenceList.push(`Aggregated transaction volume of ${features.total_input_amount.toFixed(2)} BTC exceeds typical retail distribution`);
      }

      if (features.average_fee > 0.002) {
        behavioralScore += 0.25;
        reasons.push('High fee ratio compared to baseline');
        evidenceList.push(`Average transaction fee of ${features.average_fee.toFixed(6)} BTC exceeds standard network median`);
      }

      if (features.output_count >= 6) {
        behavioralScore += 0.28;
        reasons.push('High output fan-out topology');
        evidenceList.push(`High-degree distribution to ${features.output_count} distinct output addresses`);
      } else if (features.input_count >= 6) {
        behavioralScore += 0.25;
        reasons.push('High input fan-in consolidation');
        evidenceList.push(`Multi-input aggregation (${features.input_count} inputs -> collector address)`);
      }

      if (features.burst_activity_count && features.burst_activity_count >= 2) {
        behavioralScore += 0.20;
        reasons.push('Rapid repeated source-IP activity');
        reasons.push('Repeated wallet activity');
        evidenceList.push(`Observed ${features.burst_activity_count} burst events in short time windows`);
      }

      if (features.transaction_interval < 30 && features.transaction_count > 3) {
        behavioralScore += 0.15;
        reasons.push('Rapid transaction timing pattern');
        evidenceList.push(`Sub-minute interval delta of ${features.transaction_interval.toFixed(1)}s indicates automated bot execution`);
      }

      if (features.wallet_degree > 10 || (features.graph_centrality && features.graph_centrality > 0.4)) {
        behavioralScore += 0.15;
        reasons.push('High graph connectivity & hub centrality');
        evidenceList.push(`Direct degree of ${features.wallet_degree} counterparties with PageRank ${features.graph_centrality?.toFixed(2)}`);
      }

      if (features.cross_border_flag === 1) {
        behavioralScore += 0.10;
        reasons.push('Cross-border context observed');
        evidenceList.push(`Transactions linked across ${features.country_count} distinct sovereign network routing zones`);
      }
    }

    if (cluster && cluster.isNoise) {
      behavioralScore += 0.12;
      reasons.push('DBSCAN Outlier: Isolated from regular behavioral clusters');
      evidenceList.push('Classified as isolated noise artifact in high-dimensional feature space');
    }

    // Clamp behavioral anomaly score between 0.05 and 1.00
    const finalBehavioralScore = Math.min(1.0, Math.max(0.05, +behavioralScore.toFixed(3)));

    // --- STEP 2: India Relevance Score (0.0 to 1.0) purely from context ---
    let indiaRelevanceScore = 0.0;
    const isIndiaLinked = entity.connectedCountries.has('IN') || (features?.india_linked_flag === 1);

    if (isIndiaLinked) {
      if (features?.cross_border_flag === 1) {
        indiaRelevanceScore = 0.85; // Cross-border India Inbound/Outbound
      } else {
        indiaRelevanceScore = 0.75; // Domestic India
      }
    }

    // --- STEP 3: Final Priority Score Calculation ---
    // Formula: final_priority_score = 0.70 * behavioral_anomaly_score + 0.30 * india_relevance_score
    const finalPriorityScore = +(0.70 * finalBehavioralScore + 0.30 * indiaRelevanceScore).toFixed(3);
    const riskScore = Math.round(finalPriorityScore * 100);

    // Priority Band Mapping
    let priorityBand: PriorityBand = 'Low';
    let priority: AlertSeverity = 'LOW';

    if (finalPriorityScore >= 0.75) {
      priorityBand = 'Critical';
      priority = 'CRITICAL';
    } else if (finalPriorityScore >= 0.55) {
      priorityBand = 'High';
      priority = 'HIGH';
    } else if (finalPriorityScore >= 0.35) {
      priorityBand = 'Medium';
      priority = 'MEDIUM';
    }

    // Priority Explanation
    let priorityExplanation = '';
    if (isIndiaLinked && finalBehavioralScore >= 0.60) {
      priorityExplanation = 'High behavioral anomaly combined with direct India-linked network context.';
    } else if (isIndiaLinked) {
      priorityExplanation = 'Moderate behavioral signals with India-linked priority context for analyst triage.';
    } else if (finalBehavioralScore >= 0.60) {
      priorityExplanation = 'Global anomaly detected; no India-linked context was observed.';
    } else {
      priorityExplanation = 'Standard global transaction baseline; no high-priority anomalies detected.';
    }

    if (reasons.length === 0) {
      reasons.push('Standard peer transaction traffic');
      evidenceList.push('Behavioral profile conforms to typical wallet transaction distribution');
    }

    const headline = priorityBand === 'Critical' || priorityBand === 'High'
      ? `Investigative Lead: Priority ${priorityBand} anomaly on ${entity.label}`
      : `Routine Observation: Baseline activity on ${entity.label}`;

    const evidenceSummary = `Entity ${entity.label} evaluated with behavioral anomaly ${(finalBehavioralScore).toFixed(2)}, India relevance ${(indiaRelevanceScore).toFixed(2)}, final priority ${(finalPriorityScore).toFixed(2)} [${priorityBand}]. Key behavioral signals: ${reasons.slice(0, 2).join(', ')}.`;

    return {
      riskScore,
      priority,
      behavioralAnomalyScore: finalBehavioralScore,
      indiaRelevanceScore,
      finalPriorityScore,
      priorityBand,
      priorityExplanation,
      reasons,
      evidenceList,
      headline,
      evidenceSummary
    };
  }
}
