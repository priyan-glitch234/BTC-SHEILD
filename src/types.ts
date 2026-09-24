export type ScriptType = 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH' | 'TAPROOT';

export type EntityType = 'wallet' | 'ip' | 'transaction' | 'asn' | 'country';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'NEW' | 'IN_REVIEW' | 'INVESTIGATING' | 'CLOSED';

export type InvestigationStatus = 'OPEN' | 'IN_PROGRESS' | 'UNDER_INVESTIGATION' | 'ESCALATED' | 'RESOLVED' | 'ARCHIVED';

export type IndiaLinkType = 
  | 'None' 
  | 'India Domestic' 
  | 'India Inbound' 
  | 'India Outbound' 
  | 'India Graph-Linked' 
  | 'Domestic India' 
  | 'International Context';

export type PriorityBand = 'Critical' | 'High' | 'Medium' | 'Low';

export type TransactionScope = 'Domestic' | 'Cross-Border' | 'Global Context';

export type IndiaRegion = 'South' | 'North' | 'West' | 'East' | 'Central' | 'Not Applicable';

export const SYNTHETIC_BTC_TO_INR = 7500000; // Synthetic fixed conversion rate for demonstration: 1 BTC = 75,00,000 INR

export type PatternType = 
  | 'NORMAL'
  | 'HIGH_FREQUENCY_BOT'
  | 'RAPID_MULTI_HOP'
  | 'FAN_IN_CONSOLIDATION'
  | 'FAN_OUT_DISTRIBUTION'
  | 'PEEL_CHAIN'
  | 'SYBIL_IP_CLUSTER'
  | 'GEOGRAPHIC_ANOMALY'
  | 'UNUSUAL_TIMING_BURST';

export interface IndiaContext {
  is_india_linked: boolean;
  isIndiaLinked: boolean;
  link_type: IndiaLinkType;
  linkType: IndiaLinkType;
  state?: string;
  city?: string;
  region?: IndiaRegion;
  valueINR: number;
  estimated_inr?: number;
  total_volume_inr?: number;
  crossBorderDestinations?: string[];
}

export interface RawTransactionRecord {
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  txid: string;
  transactionId?: string;
  amount?: number;
  status?: string;
  riskScore?: number;
  input_addresses: string[];
  output_addresses: string[];
  input_amounts: number[];
  output_amounts: number[];
  input_count?: number;
  output_count?: number;
  country?: string;
  fee: number;
  script_type: ScriptType;
  geo_country: string;
  asn: string;
  organization?: string;
  synthetic_anomaly_label?: number; // 0 = normal, 1 = anomalous (benchmark ground truth)
  pattern_type?: PatternType;
  // Global & India priority fields
  transaction_scope?: TransactionScope;
  cross_border_flag?: boolean;
  external_country?: string;
  india_state?: string;
  india_city?: string;
  india_region?: IndiaRegion;
  transaction_value_inr?: number;
  india_link_type?: IndiaLinkType;
  is_india_linked?: boolean;
  event_window_id?: string;
  behavioral_anomaly_score?: number;
  india_relevance_score?: number;
  final_priority_score?: number;
  priority_band?: PriorityBand;
  priority_explanation?: string;
}

export interface NormalizedTransaction extends RawTransactionRecord {
  id: string;
  total_input_amount: number;
  total_output_amount: number;
  risk_score: number;
  anomaly_score: number;
  is_anomalous: boolean;
  cluster_id: number;
  region?: string;
  transactionId?: string;
  amount?: number;
  status?: string;
  riskScore?: number;
  input_count?: number;
  output_count?: number;
  country?: string;
  // Guaranteed/Optional India fields
  transaction_scope?: TransactionScope;
  cross_border_flag?: boolean;
  external_country?: string;
  india_state?: string;
  india_city?: string;
  india_region?: IndiaRegion;
  transaction_value_inr?: number;
  india_link_type?: IndiaLinkType;
  is_india_linked?: boolean;
  event_window_id?: string;
  behavioral_anomaly_score?: number;
  india_relevance_score?: number;
  final_priority_score?: number;
  priority_band?: PriorityBand;
  priority_explanation?: string;
}

export interface GeoLocation {
  countryCode: string;
  countryName: string;
  region: string;
  lat: number;
  lng: number;
  asn: string;
  organization: string;
}

export interface MLFeatures {
  entityId: string;
  entityType: EntityType;
  transaction_frequency: number;
  transaction_count: number;
  total_input_amount: number;
  total_output_amount: number;
  average_transaction_amount: number;
  amount_variance: number;
  average_fee: number;
  input_count: number;
  output_count: number;
  unique_counterparties: number;
  unique_ips: number;
  unique_asns: number;
  country_count: number;
  transaction_interval: number; // avg delta seconds
  wallet_degree: number;
  graph_centrality: number;
  betweenness_centrality?: number;
  pagerank?: number;
  // Extended behavioral anomaly features
  transaction_value_inr?: number;
  ip_repeat_count?: number;
  wallet_repeat_count?: number;
  burst_activity_count?: number;
  india_linked_flag?: number;
  cross_border_flag?: number;
}

export interface FeatureContribution {
  featureName: string;
  displayName: string;
  value: number;
  contributionPercent: number;
  direction: 'HIGH' | 'LOW' | 'NORMAL';
  description: string;
}

export interface EntityDetail {
  id: string;
  type: EntityType;
  label: string;
  riskScore: number; // 0 - 100
  anomalyScore: number; // 0 - 1
  priority: AlertSeverity;
  clusterId: number;
  transactionsCount: number;
  totalVolumeBTC: number;
  connectedEntitiesCount: number;
  connectedIPs: string[];
  connectedWallets: string[];
  connectedTXs: string[];
  countries: string[];
  asns: string[];
  behavioralReasons: string[];
  evidenceList: string[];
  featureContributions: FeatureContribution[];
  features?: MLFeatures;
  firstSeen: string;
  lastSeen: string;
  groundTruthLabel?: number;
  patternType?: PatternType;
  evidence_summary?: string;
  india_context?: IndiaContext;
  behavioral_anomaly_score?: number;
  india_relevance_score?: number;
  final_priority_score?: number;
  priority_band?: PriorityBand;
  priority_explanation?: string;
  transaction_scope?: TransactionScope;
  cross_border_flag?: boolean;
  external_country?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  riskScore: number;
  clusterId: number;
  degree: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'OBSERVED' | 'INPUT' | 'OUTPUT' | 'CONNECTED' | 'LOCATED_IN' | 'BELONGS_TO_ASN';
  label?: string;
  weight?: number;
  txid?: string;
  amount?: number;
  timestamp?: string;
}

export type EntityGraphNode = GraphNode;
export type EntityGraphEdge = GraphEdge;

export interface EntityGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AlertItem {
  id: string;
  entityId: string;
  entityType: EntityType;
  riskScore: number;
  severity: AlertSeverity;
  confidence: number;
  timestamp: string;
  reasons: string[];
  evidence: string[];
  relatedEntities: { id: string; type: EntityType; relation: string }[];
  modelVersion: string;
  status: AlertStatus;
  notes: { id: string; author: string; text: string; createdAt: string }[];
  clusterId: number;
  country?: string;
  asn?: string;
  transaction_scope?: TransactionScope;
  cross_border_flag?: boolean;
  external_country?: string;
  india_link_type?: IndiaLinkType;
  is_india_linked?: boolean;
  india_state?: string;
  india_city?: string;
  transaction_value_inr?: number;
  evidence_summary?: string;
  india_context?: IndiaContext;
  behavioral_anomaly_score?: number;
  india_relevance_score?: number;
  final_priority_score?: number;
  priority_band?: PriorityBand;
  priority_explanation?: string;
}

export interface InvestigationDossier {
  id: string;
  title: string;
  entityId: string;
  entityType: EntityType;
  riskScore: number;
  priority: AlertSeverity;
  mlAnomalyScore: number;
  clusterId: number;
  status: InvestigationStatus;
  createdAt: string;
  updatedAt: string;
  analyst: string;
  tags: string[];
  summary: string;
  timeline: { timestamp: string; txid: string; description: string; amount: number; direction: 'IN' | 'OUT' | 'OBSERVED' }[];
  evidence: { id: string; title: string; detail: string; severity: AlertSeverity }[];
  aiExplanation: {
    headline: string;
    keyPoints: string[];
    technicalNarrative: string;
  };
  connectedEntitiesSummary: {
    transactionsCount: number;
    ipsCount: number;
    walletsCount: number;
    asnsCount: number;
    countriesCount: number;
  };
  graphData: EntityGraphData;
  notes: { id: string; author: string; text: string; createdAt: string }[];
  india_context?: IndiaContext;
}

export interface ModelPerformanceMetrics {
  modelName: string;
  algorithm: string;
  datasetName: string;
  totalSamples: number;
  anomaliesDetected: number;
  contaminationRate: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  rocAuc: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  clusteringMetrics: {
    algorithm: string;
    totalClusters: number;
    noisePoints: number;
    silhouetteScoreApprox: number;
    avgClusterSize: number;
  };
  featureImportance: { feature: string; importance: number }[];
  trainingTimeMs: number;
  evaluationNote: string;
}

export interface IngestionQualityReport {
  datasetName: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  missingFieldsCount: Record<string, number>;
  normalizedFieldsCount: Record<string, number>;
  processingTimeMs: number;
  validationErrors: { line: number; error: string; sample: string }[];
  timestamp: string;
}

export interface IndiaOperationsSnapshot {
  totalIndiaLinked: number;
  indiaFlaggedAlerts: number;
  indiaOutboundFlagged: number;
  highPriorityIndiaLeads: number;
  totalSyntheticINRValue: number;
  stateDistribution: { state: string; alertCount: number; avgRisk: number; totalINR: number }[];
  linkTypeDistribution: { type: IndiaLinkType; alertCount: number; totalINR: number }[];
  topReasons: { reason: string; count: number }[];
  topExternalCorridors: { country: string; count: number }[];
  analystBrief: string;
}

export interface SystemStats {
  totalTransactions: number;
  totalWallets: number;
  totalIPs: number;
  totalTXIDs: number;
  totalClusters: number;
  totalAnomalies: number;
  highPriorityAlerts: number;
  investigativeLeadsCount: number;
  alertsBySeverity: { critical: number; high: number; medium: number; low: number };
  recentTransactions: NormalizedTransaction[];
  countryDistribution: { country: string; count: number; riskAvg: number }[];
  asnDistribution: { asn: string; organization: string; count: number }[];
  volumeOverTime: { time: string; volumeBTC: number; txCount: number; anomalyCount: number }[];
  riskDistribution: { range: string; count: number }[];
  clusterSizes: { clusterId: string; size: number; avgRisk: number }[];
  modelStatus: {
    isolationForestReady: boolean;
    dbscanReady: boolean;
    lastTrained: string;
  };
  datasetStatus: {
    loaded: boolean;
    name: string;
    recordCount: number;
  };
  indiaOperations?: {
    totalIndiaLinkedTransactions: number;
    indiaLinkedPercentage: number;
    totalVolumeINR: number;
    indiaStateDistribution: { state: string; count: number; riskAvg: number; volumeINR?: number; avgRisk?: number }[];
    indiaCityDistribution: { city: string; count: number; riskAvg: number; state?: string; avgRisk?: number }[];
    indiaLinkTypeDistribution: { linkType: string; count: number; percentage?: number }[];
    indiaRegionDistribution?: { region: string; count: number; volumeINR: number }[];
    indiaAsnDistribution?: { asn: string; organization: string; count: number }[];
    complianceAlertsCount?: number;
  };
  indiaOperationsSnapshot?: IndiaOperationsSnapshot;
}

export interface PublicBlockchainRecord {
  txid: string;
  observed_at: string;
  block_time?: string;
  block_height?: number;
  confirmed: boolean;
  fee_sats: number;
  fee_btc: number;
  value_sats: number;
  value_btc: number;
  vsize: number;
  fee_rate_sat_vb: number;
  input_count: number;
  output_count: number;
  status: string;
  data_source: string;
  collection_mode: string;
  india_attribution_status: string;
  privacy_note: string;
}

export interface PublicBlockchainSummary {
  totalRecords: number;
  confirmedCount: number;
  unconfirmedCount: number;
  avgFeeRateSatVb: number;
  avgOutputCount: number;
  avgInputCount: number;
  totalValueBTC: number;
  totalValueSats: number;
  totalFeeBTC: number;
  cachedTimestamp: string;
  dataSource: string;
  collectionMode: string;
  indiaAttributionStatus: string;
  privacyNote: string;
  records: PublicBlockchainRecord[];
  feeRateDistribution: { range: string; count: number }[];
  valueDistribution: { range: string; count: number }[];
  confirmationRatio: { name: string; value: number }[];
}
