import { Router, Request, Response } from 'express';
import { analyticalStore } from '../store/db.js';
import { SyntheticDataGenerator } from '../data/syntheticGenerator.js';
import { DataIngestionValidator } from '../ingestion/validator.js';
import { OfflineGeoIPService } from '../data/geoipDb.js';
import { PublicBlockchainService } from '../data/publicBlockchainService.js';

export const apiRouter = Router();

// ==========================================
// 1. DATASET & INGESTION APIS
// ==========================================

// Generate synthetic dataset with custom parameters
apiRouter.post('/datasets/generate', (req: Request, res: Response) => {
  try {
    const { recordCount = 600, walletCount, ipCount, anomalyPercentage = 15, clusterCount = 6, timeRangeHours = 48 } = req.body;
    analyticalStore.loadSyntheticDataset({
      recordCount: Number(recordCount),
      walletCount: walletCount ? Number(walletCount) : undefined,
      ipCount: ipCount ? Number(ipCount) : undefined,
      anomalyPercentage: Number(anomalyPercentage),
      clusterCount: Number(clusterCount),
      timeRangeHours: Number(timeRangeHours)
    });

    res.json({
      success: true,
      message: `Generated and loaded ${analyticalStore.rawRecords.length} synthetic records successfully.`,
      qualityReport: analyticalStore.qualityReport,
      stats: analyticalStore.getSystemStats()
    });
  } catch (err: any) {
    res.status(500).json({ error: `Generation failed: ${err.message}` });
  }
});

// Upload and ingest CSV, JSON, or XML file content
apiRouter.post('/datasets/upload', (req: Request, res: Response) => {
  try {
    const { content, filename = 'uploaded_dataset.csv' } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Missing string data content in request body.' });
      return;
    }

    const { validRecords, report } = DataIngestionValidator.ingest(content, filename);
    if (validRecords.length === 0) {
      res.status(400).json({
        error: 'No valid records could be extracted from provided content.',
        qualityReport: report
      });
      return;
    }

    analyticalStore.processDataset(validRecords, filename, report);

    res.json({
      success: true,
      message: `Ingested ${validRecords.length} valid records (${report.invalidRecords} invalid, ${report.duplicateRecords} duplicates).`,
      qualityReport: report,
      stats: analyticalStore.getSystemStats()
    });
  } catch (err: any) {
    res.status(500).json({ error: `Upload processing failed: ${err.message}` });
  }
});

// Export dataset in CSV, JSON, or XML
apiRouter.get('/datasets/export/:format', (req: Request, res: Response) => {
  const { format } = req.params;
  const records = analyticalStore.rawRecords;

  if (records.length === 0) {
    res.status(404).json({ error: 'No active dataset to export.' });
    return;
  }

  if (format === 'csv') {
    const csv = SyntheticDataGenerator.toCSV(records);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="btc_shield_dataset.csv"');
    res.send(csv);
  } else if (format === 'json') {
    const json = SyntheticDataGenerator.toJSON(records);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="btc_shield_dataset.json"');
    res.send(json);
  } else if (format === 'xml') {
    const xml = SyntheticDataGenerator.toXML(records);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="btc_shield_dataset.xml"');
    res.send(xml);
  } else {
    res.status(400).json({ error: 'Unsupported format. Use csv, json, or xml.' });
  }
});

apiRouter.get('/datasets/status', (req: Request, res: Response) => {
  res.json({
    loaded: analyticalStore.rawRecords.length > 0,
    name: analyticalStore.datasetName,
    recordCount: analyticalStore.rawRecords.length,
    qualityReport: analyticalStore.qualityReport,
    lastTrained: analyticalStore.lastTrained
  });
});

// ==========================================
// 2. SYSTEM DASHBOARD & STATS APIS
// ==========================================

apiRouter.get('/stats', (req: Request, res: Response) => {
  res.json(analyticalStore.getSystemStats());
});

// ==========================================
// 3. TRANSACTIONS APIS
// ==========================================

apiRouter.get('/transactions', (req: Request, res: Response) => {
  let list = analyticalStore.normalizedTransactions;
  const { search, script_type, min_risk, anomalous_only, page = 1, limit = 50 } = req.query;

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(t =>
      t.txid.toLowerCase().includes(q) ||
      t.src_ip.includes(q) ||
      t.geo_country.toLowerCase().includes(q) ||
      t.input_addresses.some(a => a.toLowerCase().includes(q)) ||
      t.output_addresses.some(a => a.toLowerCase().includes(q))
    );
  }

  if (script_type) {
    list = list.filter(t => t.script_type === script_type);
  }

  if (min_risk) {
    const minR = Number(min_risk);
    list = list.filter(t => t.risk_score >= minR);
  }

  if (anomalous_only === 'true') {
    list = list.filter(t => t.is_anomalous);
  }

  const p = Number(page);
  const l = Number(limit);
  const total = list.length;
  const paginated = list.slice((p - 1) * l, p * l);

  res.json({
    total,
    page: p,
    limit: l,
    data: paginated
  });
});

apiRouter.get('/transactions/:txid', (req: Request, res: Response) => {
  const { txid } = req.params;
  const tx = analyticalStore.normalizedTransactions.find(t => t.txid === txid);
  if (!tx) {
    res.status(404).json({ error: `Transaction ${txid} not found.` });
    return;
  }
  const entity = analyticalStore.entityDetails.get(`tx:${txid}`);
  res.json({ transaction: tx, entityDetail: entity });
});

// ==========================================
// 4. ENTITIES APIS
// ==========================================

apiRouter.get('/entities', (req: Request, res: Response) => {
  let list = Array.from(analyticalStore.entityDetails.values());
  const { type, min_risk, priority, cluster_id, search, page = 1, limit = 50 } = req.query;

  if (type) {
    list = list.filter(e => e.type === type);
  }

  if (min_risk) {
    const mr = Number(min_risk);
    list = list.filter(e => e.riskScore >= mr);
  }

  if (priority) {
    list = list.filter(e => e.priority === priority);
  }

  if (cluster_id !== undefined && cluster_id !== '') {
    const cid = Number(cluster_id);
    list = list.filter(e => e.clusterId === cid);
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(e => e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
  }

  // Sort by riskScore descending
  list.sort((a, b) => b.riskScore - a.riskScore);

  const p = Number(page);
  const l = Number(limit);
  const total = list.length;
  const paginated = list.slice((p - 1) * l, p * l);

  res.json({
    total,
    page: p,
    limit: l,
    data: paginated
  });
});

apiRouter.get('/entities/:id', (req: Request, res: Response) => {
  let id = req.params.id;
  // Support searching by raw wallet address or prefix
  let entity = analyticalStore.entityDetails.get(id);
  if (!entity) {
    entity = analyticalStore.entityDetails.get(`wallet:${id}`) ||
             analyticalStore.entityDetails.get(`ip:${id}`) ||
             analyticalStore.entityDetails.get(`tx:${id}`) ||
             analyticalStore.entityDetails.get(`asn:${id}`) ||
             analyticalStore.entityDetails.get(`country:${id}`);
  }

  if (!entity) {
    res.status(404).json({ error: `Entity ${id} not found.` });
    return;
  }
  res.json(entity);
});

apiRouter.get('/entities/:id/connections', (req: Request, res: Response) => {
  let id = req.params.id;
  if (!id.includes(':')) {
    id = `wallet:${id}`;
  }
  const hops = Number(req.query.hops || 2);
  const maxNodes = Number(req.query.maxNodes || 50);

  const graph = analyticalStore.correlation.getSubGraph(id, hops, maxNodes);
  res.json(graph);
});

// ==========================================
// 5. GRAPH APIS
// ==========================================

apiRouter.get('/graph', (req: Request, res: Response) => {
  const { centerId, hops = 2, maxNodes = 100, nodeType, minRisk = 0 } = req.query;

  let graphData;
  if (centerId) {
    graphData = analyticalStore.correlation.getSubGraph(String(centerId), Number(hops), Number(maxNodes));
  } else {
    graphData = analyticalStore.correlation.getFullGraph(Number(maxNodes));
  }

  // Filter nodes if requested
  if (nodeType) {
    const validNodeIds = new Set(graphData.nodes.filter(n => n.type === nodeType).map(n => n.id));
    graphData.nodes = graphData.nodes.filter(n => validNodeIds.has(n.id));
    graphData.edges = graphData.edges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));
  }

  if (Number(minRisk) > 0) {
    const minR = Number(minRisk);
    const validNodeIds = new Set(graphData.nodes.filter(n => n.riskScore >= minR).map(n => n.id));
    graphData.nodes = graphData.nodes.filter(n => validNodeIds.has(n.id));
    graphData.edges = graphData.edges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));
  }

  res.json(graphData);
});

apiRouter.get('/graph/path', (req: Request, res: Response) => {
  const { source, target } = req.query;
  if (!source || !target) {
    res.status(400).json({ error: 'Source and target query parameters required.' });
    return;
  }
  const path = analyticalStore.correlation.findPath(String(source), String(target));
  res.json({ source, target, path, found: path !== null });
});

// ==========================================
// 6. AI/ML PIPELINE APIS
// ==========================================

apiRouter.post('/ml/train', (req: Request, res: Response) => {
  try {
    const { numTrees = 100, contamination = 0.15, eps = 1.1, minPts = 3 } = req.body;
    analyticalStore.isolationForest = new (analyticalStore.isolationForest.constructor as any)({ numTrees, contamination });
    analyticalStore.dbscan = new (analyticalStore.dbscan.constructor as any)({ eps, minPts });

    // Re-run pipeline on existing records
    analyticalStore.processDataset(analyticalStore.rawRecords, analyticalStore.datasetName, analyticalStore.qualityReport || undefined);

    res.json({
      success: true,
      message: 'Models successfully retrained with updated hyperparameters.',
      performance: analyticalStore.modelPerformance
    });
  } catch (err: any) {
    res.status(500).json({ error: `ML Training failed: ${err.message}` });
  }
});

apiRouter.get('/ml/performance', (req: Request, res: Response) => {
  res.json(analyticalStore.modelPerformance || {});
});

apiRouter.get('/ml/clusters', (req: Request, res: Response) => {
  res.json(analyticalStore.clusterSummaries);
});

apiRouter.get('/ml/clusters/:id', (req: Request, res: Response) => {
  const cid = Number(req.params.id);
  const cluster = analyticalStore.clusterSummaries.find(c => c.clusterId === cid);
  if (!cluster) {
    res.status(404).json({ error: `Cluster ${cid} not found.` });
    return;
  }
  res.json(cluster);
});

// ==========================================
// 7. ALERTS APIS
// ==========================================

apiRouter.get('/alerts', (req: Request, res: Response) => {
  let alerts = analyticalStore.alertEngine.getAllAlerts();
  const { severity, status, entityType, min_risk, search } = req.query;

  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (status) alerts = alerts.filter(a => a.status === status);
  if (entityType) alerts = alerts.filter(a => a.entityType === entityType);
  if (min_risk) alerts = alerts.filter(a => a.riskScore >= Number(min_risk));
  if (search) {
    const q = String(search).toLowerCase();
    alerts = alerts.filter(a => a.entityId.toLowerCase().includes(q) || a.reasons.some(r => r.toLowerCase().includes(q)));
  }

  res.json(alerts);
});

apiRouter.get('/alerts/:id', (req: Request, res: Response) => {
  const alert = analyticalStore.alertEngine.getAlert(req.params.id);
  if (!alert) {
    res.status(404).json({ error: `Alert ${req.params.id} not found.` });
    return;
  }
  res.json(alert);
});

apiRouter.patch('/alerts/:id', (req: Request, res: Response) => {
  const { status, note, author } = req.body;
  let alert = analyticalStore.alertEngine.getAlert(req.params.id);
  if (!alert) {
    res.status(404).json({ error: `Alert ${req.params.id} not found.` });
    return;
  }

  if (status) alert = analyticalStore.alertEngine.updateStatus(req.params.id, status)!;
  if (note) alert = analyticalStore.alertEngine.addNote(req.params.id, author || 'Analyst', note)!;

  res.json({ success: true, alert });
});

// ==========================================
// 8. GEO INTELLIGENCE APIS
// ==========================================

apiRouter.get('/geo/countries', (req: Request, res: Response) => {
  const stats = analyticalStore.getSystemStats();
  const enhanced = stats.countryDistribution.map(c => {
    const meta = OfflineGeoIPService.getCountryMeta(c.country);
    return {
      ...c,
      name: meta.name,
      region: meta.region,
      lat: meta.lat,
      lng: meta.lng
    };
  });
  res.json(enhanced);
});

apiRouter.get('/geo/asn', (req: Request, res: Response) => {
  res.json(analyticalStore.getSystemStats().asnDistribution);
});

// ==========================================
// 9. INVESTIGATION DOSSIER APIS
// ==========================================

apiRouter.get('/investigations', (req: Request, res: Response) => {
  const all = Array.from(analyticalStore.investigations.values());
  const seen = new Set<string>();
  const unique = [];
  for (const d of all) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      unique.push(d);
    }
  }
  res.json(unique);
});

apiRouter.get('/investigations/:id', (req: Request, res: Response) => {
  const dossier = analyticalStore.investigations.get(req.params.id);
  if (!dossier) {
    res.status(404).json({ error: `Investigation ${req.params.id} not found.` });
    return;
  }
  res.json(dossier);
});

apiRouter.post('/investigations', (req: Request, res: Response) => {
  const { entityId, title } = req.body;
  let entity = analyticalStore.entityDetails.get(entityId);
  if (!entity) {
    entity = analyticalStore.entityDetails.get(`wallet:${entityId}`) || analyticalStore.entityDetails.get(`ip:${entityId}`);
  }

  if (!entity) {
    res.status(404).json({ error: `Entity ${entityId} not found.` });
    return;
  }

  const subGraph = analyticalStore.correlation.getSubGraph(entity.id, 2, 35);
  const relatedTxs = analyticalStore.normalizedTransactions
    .filter(t => t.input_addresses.includes(entity!.label) || t.output_addresses.includes(entity!.label))
    .slice(0, 10);

  const dossier = {
    id: `INV-MANUAL-${Date.now().toString(36).toUpperCase()}`,
    title: title || `Investigative Dossier: ${entity.label}`,
    entityId: entity.id,
    entityType: entity.type,
    riskScore: entity.riskScore,
    priority: entity.priority,
    mlAnomalyScore: entity.anomalyScore,
    clusterId: entity.clusterId,
    status: 'OPEN' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    analyst: 'Security Operations Center',
    tags: ['MANUAL_CASE', entity.priority],
    summary: `Manually initiated forensic investigation targeting ${entity.label}. Risk Score: ${entity.riskScore}/100.`,
    timeline: relatedTxs.map(t => ({
      timestamp: t.timestamp,
      txid: t.txid,
      description: `Observed transaction ${t.txid.slice(0, 16)}`,
      amount: t.total_input_amount,
      direction: (t.input_addresses.includes(entity!.label) ? 'OUT' : 'IN') as 'IN' | 'OUT'
    })),
    evidence: entity.evidenceList.map((e, idx) => ({
      id: `EV-${idx + 1}`,
      title: `Evidence Point #${idx + 1}`,
      detail: e,
      severity: entity!.priority
    })),
    aiExplanation: {
      headline: `BEHAVIORAL ASSESSMENT FOR ${entity.label}`,
      keyPoints: entity.behavioralReasons,
      technicalNarrative: `Entity displays distinct traffic patterns with ${entity.connectedWallets.length} counterparties and ${entity.connectedIPs.length} connected IPs.`
    },
    connectedEntitiesSummary: {
      transactionsCount: entity.transactionsCount,
      ipsCount: entity.connectedIPs.length,
      walletsCount: entity.connectedWallets.length,
      asnsCount: entity.asns.length,
      countriesCount: entity.countries.length
    },
    graphData: subGraph,
    notes: []
  };

  analyticalStore.investigations.set(dossier.id, dossier);
  res.json(dossier);
});

apiRouter.patch('/investigations/:id', (req: Request, res: Response) => {
  const { note, author, status } = req.body;
  const dossier = analyticalStore.investigations.get(req.params.id);
  if (!dossier) {
    res.status(404).json({ error: `Investigation ${req.params.id} not found.` });
    return;
  }

  if (status) dossier.status = status;
  if (note) {
    dossier.notes.push({
      id: `note_${Date.now()}`,
      author: author || 'Analyst',
      text: note,
      createdAt: new Date().toISOString()
    });
  }
  dossier.updatedAt = new Date().toISOString();

  res.json({ success: true, investigation: dossier });
});

// Download full markdown / text forensic report
apiRouter.get('/reports/:id', (req: Request, res: Response) => {
  const dossier = analyticalStore.investigations.get(req.params.id);
  if (!dossier) {
    res.status(404).json({ error: `Investigation ${req.params.id} not found.` });
    return;
  }

  const reportMd = `
# BTC-SHIELD FORENSIC INVESTIGATION REPORT
## Case ID: ${dossier.id}
**Classification:** STRICTLY CONFIDENTIAL // SYNTHETIC DEMO DATA BENCHMARK
**Timestamp:** ${dossier.createdAt}
**Target Entity:** ${dossier.entityId} (${dossier.entityType.toUpperCase()})
**Risk Score:** ${dossier.riskScore}/100 [Priority: ${dossier.priority}]
**ML Anomaly Score:** ${dossier.mlAnomalyScore.toFixed(2)} [Cluster: ${dossier.clusterId}]
${dossier.india_context?.is_india_linked ? `**India Operations Context:** ${dossier.india_context.city}, ${dossier.india_context.state} (${dossier.india_context.region}) | Link: ${dossier.india_context.link_type} | Est. Value: ₹${((dossier.india_context.estimated_inr || 0) / 10000000).toFixed(2)} Cr [SYNTHETIC DEMO DATA]` : ''}

---

### 1. EXECUTIVE SUMMARY
${dossier.summary}

### 2. AI & MACHINE LEARNING ASSESSMENT
${dossier.aiExplanation.headline}
${dossier.aiExplanation.keyPoints.map(p => `- ${p}`).join('\n')}

Technical Narrative:
${dossier.aiExplanation.technicalNarrative}

### 3. EVIDENCE RECORD
${dossier.evidence.map(e => `#### [${e.severity}] ${e.title}\n${e.detail}`).join('\n\n')}

### 4. NETWORK & TOPOLOGY SUMMARY
- Observed Transactions: ${dossier.connectedEntitiesSummary.transactionsCount}
- Connected IP Endpoints: ${dossier.connectedEntitiesSummary.ipsCount}
- Counterparty Wallets: ${dossier.connectedEntitiesSummary.walletsCount}
- Sovereign Jurisdictions: ${dossier.connectedEntitiesSummary.countriesCount}

### 5. TRANSACTION TIMELINE
${dossier.timeline.map(t => `- **${t.timestamp}** | TX: \`${t.txid}\` | ${t.direction} | ${t.amount} BTC | ${t.description}`).join('\n')}

---
**LEGAL & COMPLIANCE DISCLAIMER:**
All entity records, geographical distributions, IP linkages, and compliance indicators are derived strictly from offline SYNTHETIC DEMO DATA. Cyber-incident reporting obligations and financial compliance requirements depend on the organization, data source, and applicable law. This prototype does not provide legal advice.

*Report generated offline by BTC-SHIELD v2.4 India-First Intelligence Suite.*
`;

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="btc_shield_report_${dossier.id}.md"`);
  res.send(reportMd);
});

// Download JSON case dossier
apiRouter.get('/investigations/:id/export/json', (req: Request, res: Response) => {
  const dossier = analyticalStore.investigations.get(req.params.id);
  if (!dossier) {
    res.status(404).json({ error: `Investigation ${req.params.id} not found.` });
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="btc_shield_dossier_${dossier.id}.json"`);
  res.send(JSON.stringify(dossier, null, 2));
});

// ==========================================
// 10. ONE-CLICK DEMO PIPELINE API
// ==========================================

apiRouter.post('/demo/run', (req: Request, res: Response) => {
  try {
    // Generate fresh diverse demonstration dataset with verified multi-pattern anomalies
    analyticalStore.loadSyntheticDataset({
      recordCount: 850,
      anomalyPercentage: 18,
      clusterCount: 7,
      timeRangeHours: 72
    });

    const stats = analyticalStore.getSystemStats();
    const topInv = analyticalStore.investigations.get('current');

    res.json({
      success: true,
      steps: [
        { step: 1, name: 'Loading dataset', status: 'COMPLETE', detail: `Loaded 850 synthetic transaction records` },
        { step: 2, name: 'Validating records', status: 'COMPLETE', detail: `${stats.totalTransactions} valid records passed verification` },
        { step: 3, name: 'Enriching network metadata', status: 'COMPLETE', detail: `Offline GeoIP/ASN enrichment across ${stats.countryDistribution.length} jurisdictions` },
        { step: 4, name: 'Building correlations', status: 'COMPLETE', detail: `Indexed ${stats.totalWallets} wallets and ${stats.totalIPs} IP nodes` },
        { step: 5, name: 'Constructing graph', status: 'COMPLETE', detail: `Generated multi-hop graph topology` },
        { step: 6, name: 'Extracting features', status: 'COMPLETE', detail: `Extracted 16 multidimensional behavioral & topological features` },
        { step: 7, name: 'Running anomaly detection', status: 'COMPLETE', detail: `Isolation Forest identified ${stats.totalAnomalies} outlier anomalies` },
        { step: 8, name: 'Clustering entities', status: 'COMPLETE', detail: `DBSCAN mapped ${stats.totalClusters} behavioral clusters` },
        { step: 9, name: 'Generating alerts', status: 'COMPLETE', detail: `Formulated ${stats.investigativeLeadsCount} explainable investigative leads` },
        { step: 10, name: 'Preparing investigation', status: 'COMPLETE', detail: `Opened top lead: ${topInv ? topInv.title : 'Lead Ready'}` }
      ],
      stats,
      topInvestigation: topInv
    });
  } catch (err: any) {
    res.status(500).json({ error: `Demo execution failed: ${err.message}` });
  }
});

// ==========================================
// 10. PUBLIC BLOCKCHAIN CONTEXT APIS (GENERIC ON-CHAIN CONTEXT)
// ==========================================

// Get cached public blockchain sample metadata and statistics
apiRouter.get('/public-blockchain/sample', (req: Request, res: Response) => {
  try {
    const summary = PublicBlockchainService.loadSample();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load public blockchain sample: ${err.message}` });
  }
});

// Export cached public blockchain sample CSV
apiRouter.get('/public-blockchain/export/csv', (req: Request, res: Response) => {
  try {
    const csvContent = PublicBlockchainService.getRawCSV();
    if (!csvContent) {
      res.status(404).json({ error: 'Public blockchain CSV file not found on server.' });
      return;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="public_blockchain_sample.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to export CSV: ${err.message}` });
  }
});
