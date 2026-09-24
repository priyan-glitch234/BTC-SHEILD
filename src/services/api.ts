import {
  SystemStats,
  NormalizedTransaction,
  EntityDetail,
  EntityGraphData,
  AlertItem,
  InvestigationDossier,
  ModelPerformanceMetrics,
  IngestionQualityReport,
  PublicBlockchainSummary
} from '../types.js';

export const API = {
  async getStats(): Promise<SystemStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getTransactions(params: {
    search?: string;
    script_type?: string;
    min_risk?: number;
    anomalous_only?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ total: number; page: number; limit: number; data: NormalizedTransaction[] }> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.script_type) q.set('script_type', params.script_type);
    if (params.min_risk !== undefined) q.set('min_risk', String(params.min_risk));
    if (params.anomalous_only) q.set('anomalous_only', 'true');
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const res = await fetch(`/api/transactions?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async getEntities(params: {
    type?: string;
    min_risk?: number;
    priority?: string;
    cluster_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ total: number; page: number; limit: number; data: EntityDetail[] }> {
    const q = new URLSearchParams();
    if (params.type) q.set('type', params.type);
    if (params.min_risk !== undefined) q.set('min_risk', String(params.min_risk));
    if (params.priority) q.set('priority', params.priority);
    if (params.cluster_id !== undefined) q.set('cluster_id', String(params.cluster_id));
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const res = await fetch(`/api/entities?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch entities');
    return res.json();
  },

  async getEntityDetail(id: string): Promise<EntityDetail> {
    const res = await fetch(`/api/entities/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Entity ${id} not found`);
    return res.json();
  },

  async getGraph(params: {
    centerId?: string;
    hops?: number;
    maxNodes?: number;
    nodeType?: string;
    minRisk?: number;
  } = {}): Promise<EntityGraphData> {
    const q = new URLSearchParams();
    if (params.centerId) q.set('centerId', params.centerId);
    if (params.hops) q.set('hops', String(params.hops));
    if (params.maxNodes) q.set('maxNodes', String(params.maxNodes));
    if (params.nodeType) q.set('nodeType', params.nodeType);
    if (params.minRisk) q.set('minRisk', String(params.minRisk));

    const res = await fetch(`/api/graph?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch graph data');
    return res.json();
  },

  async findPath(source: string, target: string): Promise<{ source: string; target: string; path: string[] | null; found: boolean }> {
    const res = await fetch(`/api/graph/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
    if (!res.ok) throw new Error('Failed to compute graph path');
    return res.json();
  },

  async getAlerts(params: {
    severity?: string;
    status?: string;
    entityType?: string;
    min_risk?: number;
    search?: string;
  } = {}): Promise<AlertItem[]> {
    const q = new URLSearchParams();
    if (params.severity) q.set('severity', params.severity);
    if (params.status) q.set('status', params.status);
    if (params.entityType) q.set('entityType', params.entityType);
    if (params.min_risk) q.set('min_risk', String(params.min_risk));
    if (params.search) q.set('search', params.search);

    const res = await fetch(`/api/alerts?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async updateAlert(id: string, update: { status?: string; note?: string; author?: string }): Promise<{ success: boolean; alert: AlertItem }> {
    const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return res.json();
  },

  async getModelPerformance(): Promise<ModelPerformanceMetrics> {
    const res = await fetch('/api/ml/performance');
    if (!res.ok) throw new Error('Failed to fetch model performance');
    return res.json();
  },

  async getClusters(): Promise<any[]> {
    const res = await fetch('/api/ml/clusters');
    if (!res.ok) throw new Error('Failed to fetch clusters');
    return res.json();
  },

  async retrainML(params: { numTrees?: number; contamination?: number; eps?: number; minPts?: number }): Promise<any> {
    const res = await fetch('/api/ml/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to retrain ML model');
    return res.json();
  },

  async getGeoCountries(): Promise<any[]> {
    const res = await fetch('/api/geo/countries');
    if (!res.ok) throw new Error('Failed to fetch geo countries');
    return res.json();
  },

  async getGeoASNs(): Promise<any[]> {
    const res = await fetch('/api/geo/asn');
    if (!res.ok) throw new Error('Failed to fetch geo ASNs');
    return res.json();
  },

  async getInvestigations(): Promise<InvestigationDossier[]> {
    const res = await fetch('/api/investigations');
    if (!res.ok) throw new Error('Failed to fetch investigations');
    return res.json();
  },

  async getInvestigation(id: string = 'current'): Promise<InvestigationDossier> {
    const res = await fetch(`/api/investigations/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch investigation');
    return res.json();
  },

  async createInvestigation(entityId: string, title?: string): Promise<InvestigationDossier> {
    const res = await fetch('/api/investigations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId, title })
    });
    if (!res.ok) throw new Error('Failed to create investigation');
    return res.json();
  },

  async updateInvestigation(id: string, update: { note?: string; status?: string; author?: string }): Promise<any> {
    const res = await fetch(`/api/investigations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Failed to update investigation');
    return res.json();
  },

  async generateDataset(params: {
    recordCount: number;
    walletCount?: number;
    ipCount?: number;
    anomalyPercentage?: number;
    clusterCount?: number;
    timeRangeHours?: number;
  }): Promise<{ success: boolean; message: string; qualityReport: IngestionQualityReport; stats: SystemStats }> {
    const res = await fetch('/api/datasets/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to generate dataset');
    return res.json();
  },

  async uploadDataset(content: string, filename: string): Promise<{ success: boolean; message: string; qualityReport: IngestionQualityReport; stats: SystemStats }> {
    const res = await fetch('/api/datasets/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, filename })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  async runDemoInvestigation(): Promise<any> {
    const res = await fetch('/api/demo/run', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to execute demo workflow');
    return res.json();
  },

  async getPublicBlockchainSample(): Promise<PublicBlockchainSummary> {
    const res = await fetch('/api/public-blockchain/sample');
    if (!res.ok) throw new Error('Failed to fetch public blockchain sample');
    return res.json();
  }
};
