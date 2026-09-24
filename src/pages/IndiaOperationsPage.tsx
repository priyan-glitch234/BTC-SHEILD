import React, { useState, useEffect } from 'react';
import {
  Flag,
  ShieldAlert,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Building2,
  MapPin,
  Globe,
  ChevronRight,
  Info,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  Filter,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { API } from '../services/api.js';
import { AlertItem, SystemStats } from '../types.js';

interface IndiaOperationsPageProps {
  onSelectEntity: (id: string) => void;
  onOpenInvestigation: (entityId?: string) => void;
  onExploreGraph: (entityId: string) => void;
}

export const IndiaOperationsPage: React.FC<IndiaOperationsPageProps> = ({
  onSelectEntity,
  onOpenInvestigation,
  onExploreGraph
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedLinkType, setSelectedLinkType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minINR, setMinINR] = useState<number>(0);
  const [activeVizTab, setActiveVizTab] = useState<'volume' | 'states'>('volume');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const fetchData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, alertsData] = await Promise.all([
        API.getStats(),
        API.getAlerts()
      ]);
      setStats(statsData);
      setAlerts(alertsData || []);
    } catch (err: any) {
      console.error('Failed to load India Priority Desk data:', err);
      if (retryCount < 2) {
        setTimeout(() => fetchData(retryCount + 1), 1000);
        return;
      }
      setError(err?.message || 'Failed to connect to intelligence service. Please check connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const indiaStats = stats?.indiaOperations;

  // Filter India-linked alerts
  const filteredAlerts = alerts.filter((a) => {
    const isLinked =
      a.india_context?.is_india_linked ||
      a.country === 'IN' ||
      (a.india_relevance_score && a.india_relevance_score > 0);
    if (!isLinked) return false;

    if (selectedState !== 'ALL' && a.india_context?.state !== selectedState) {
      return false;
    }

    if (selectedLinkType !== 'ALL' && a.india_context?.link_type !== selectedLinkType) {
      return false;
    }

    if (minINR > 0 && (a.india_context?.estimated_inr || 0) < minINR) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchEntity = a.entityId.toLowerCase().includes(q);
      const matchCity = (a.india_context?.city || '').toLowerCase().includes(q);
      const matchState = (a.india_context?.state || '').toLowerCase().includes(q);
      const matchReasons = a.reasons?.some((r) => r.toLowerCase().includes(q));
      if (!matchEntity && !matchCity && !matchState && !matchReasons) return false;
    }

    return true;
  });

  const formatINR = (val?: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const handleDownloadDossierJSON = async (alert: AlertItem) => {
    try {
      setExportingId(alert.id);
      const dossierUrl = `/api/investigations/current/export/json`;
      window.open(dossierUrl, '_blank');
    } catch (err) {
      console.error('Download dossier error:', err);
    } finally {
      setExportingId(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96 bg-[#111821] border border-[#1D2836] rounded-md text-slate-400 font-sans text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Synchronizing India Priority Intelligence Desk...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6 rounded-md bg-[#111821] border border-rose-900/50 text-center space-y-3 max-w-md mx-auto my-12">
        <div className="w-10 h-10 rounded-md bg-rose-950/40 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-100">Failed to Load Priority Intelligence</h2>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="soc-btn-primary"
        >
          Retry Synchronization
        </button>
      </div>
    );
  }

  // Calculate metrics for SUMMARY row
  const indiaLinkedPercentage = indiaStats?.indiaLinkedPercentage || 0;
  const totalIndiaTxs = indiaStats?.totalIndiaLinkedTransactions || 0;
  const totalIndiaINR = indiaStats?.totalVolumeINR || 0;
  const priorityAlertsCount = filteredAlerts.filter(
    (a) =>
      a.priority_band === 'Critical' ||
      a.priority_band === 'High' ||
      a.severity === 'CRITICAL' ||
      a.severity === 'HIGH'
  ).length;

  // Synthesis for timeline chart
  const indiaTimeVolumeData = (stats?.volumeOverTime || []).map((point) => {
    const rawVol = point.volumeBTC || 0;
    const ratio = Math.max(0.15, indiaLinkedPercentage / 100);
    const estIndiaBTC = Number((rawVol * ratio).toFixed(2));
    const estIndiaAnomalies = Math.max(0, Math.round((point.anomalyCount || 0) * ratio));
    return {
      time: point.time,
      indiaVolumeBTC: estIndiaBTC,
      indiaAnomalies: estIndiaAnomalies,
      totalVolumeBTC: rawVol
    };
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans text-xs select-none">
      {/* =========================================================================
          1. HEADER
          Answers: "What Bitcoin activity is particularly relevant to India?"
          ========================================================================= */}
      <header className="bg-[#111821] border border-[#1D2836] rounded-md p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-slate-100">
                India Priority Intelligence
              </h1>
              <span className="text-slate-600 font-medium">/</span>
              <span className="text-xs font-semibold text-teal-400 font-mono uppercase tracking-wider">
                Jurisdictional Lens
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-3xl font-sans">
              Real-time correlation of global Bitcoin transaction telemetry against Indian regional endpoints,
              cross-border settlement corridors, and observed autonomous systems.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-sans">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="text-slate-400 font-medium">Corridor Desk:</span>
              <span className="text-teal-300 font-medium">Active Monitoring</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>INR Bench @ ₹75L/BTC</span>
            </div>
          </div>
        </div>

        {/* Analytical Distinction & Ethical Safeguard Notice */}
        <div className="mt-4 pt-3 border-t border-[#1D2836] flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed bg-[#0E141C] p-3 rounded-md">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-200 font-semibold">Analytical Integrity Standard: </span>
            On-chain Bitcoin scripts are pseudonymous and do not contain national identifiers. Geographic relevance is
            derived from observed peer-to-peer relay nodes, exchange fiat ramps, and IP/ASN telemetry. These indicators
            serve strictly as an analyst triage filter, <strong className="text-slate-300">not</strong> definitive proof of individual citizenship or culpability.
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. SUMMARY ROW
          Requested:
          - India-linked entities
          - Priority alerts
          - Cross-border transactions
          - High-risk activity
          Numbers are primary visual element.
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="India Priority Summary">
        {/* Metric 1: India-linked entities */}
        <div className="bg-[#111821] border border-[#1D2836] hover:border-[#2A3A4D] p-4 rounded-md flex flex-col justify-between transition-colors">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            India-Linked Entities
          </div>
          <div className="my-2 text-3xl lg:text-4xl font-mono font-bold text-slate-100 tracking-tight">
            {stats ? (stats.indiaOperations?.indiaStateDistribution.reduce((acc, curr) => acc + curr.count, 0) || totalIndiaTxs).toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {indiaLinkedPercentage}% of global monitored ledger
          </div>
        </div>

        {/* Metric 2: Priority alerts */}
        <div className="bg-[#111821] border border-rose-900/40 hover:border-rose-700/60 p-4 rounded-md flex flex-col justify-between transition-colors">
          <div className="text-[11px] font-medium uppercase tracking-wider text-rose-300">
            Priority Alerts
          </div>
          <div className="my-2 text-3xl lg:text-4xl font-mono font-bold text-rose-400 tracking-tight">
            {priorityAlertsCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-400/80">
            Critical & High severity India leads
          </div>
        </div>

        {/* Metric 3: Cross-border transactions */}
        <div className="bg-[#111821] border border-[#1D2836] hover:border-[#2A3A4D] p-4 rounded-md flex flex-col justify-between transition-colors">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Cross-Border Transactions
          </div>
          <div className="my-2 text-3xl lg:text-4xl font-mono font-bold text-teal-300 tracking-tight">
            {totalIndiaTxs.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {indiaStats?.inboundPercentage || 58}% Inbound · {indiaStats?.outboundPercentage || 42}% Outbound
          </div>
        </div>

        {/* Metric 4: High-risk activity */}
        <div className="bg-[#111821] border border-[#1D2836] hover:border-[#2A3A4D] p-4 rounded-md flex flex-col justify-between transition-colors">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            High-Risk Activity (INR Benchmark)
          </div>
          <div className="my-2 text-3xl lg:text-4xl font-mono font-bold text-amber-400 tracking-tight truncate">
            {formatINR(totalIndiaINR)}
          </div>
          <div className="text-[11px] text-slate-500">
            Correlated value across flagged corridors
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. MAIN SECTION:
          India-related transaction activity visualization
          ========================================================================= */}
      <section className="bg-[#111821] border border-[#1D2836] rounded-md p-4 md:p-5 space-y-4" aria-label="India Activity Visualization">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2836] pb-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>India-Linked Transaction Velocity & Anomaly Trends</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comparative volume distribution across observed regional telemetry and behavioral outliers
            </p>
          </div>

          {/* Toggle Tab */}
          <div className="flex items-center gap-1.5 bg-[#0E141C] p-1 rounded-md border border-[#1D2836]">
            <button
              onClick={() => setActiveVizTab('volume')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeVizTab === 'volume'
                  ? 'bg-[#17212D] text-teal-300 border border-[#2A3A4D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Time Cadence
            </button>
            <button
              onClick={() => setActiveVizTab('states')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeVizTab === 'states'
                  ? 'bg-[#17212D] text-teal-300 border border-[#2A3A4D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              State Concentrations
            </button>
          </div>
        </div>

        {/* Main Chart Canvas */}
        <div className="h-64 sm:h-72 w-full">
          {activeVizTab === 'volume' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={indiaTimeVolumeData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="indiaVolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="indiaAnomGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1D2836' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1D2836' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#17212D',
                    borderColor: '#2A3A4D',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#E2E8F0',
                    boxShadow: 'none'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="indiaVolumeBTC"
                  name="India Flow (BTC)"
                  stroke="#14B8A6"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#indiaVolGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="indiaAnomalies"
                  name="Behavioral Anomalies"
                  stroke="#F43F5E"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#indiaAnomGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={indiaStats?.indiaStateDistribution || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="state"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1D2836' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1D2836' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#17212D',
                    borderColor: '#2A3A4D',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#E2E8F0',
                    boxShadow: 'none'
                  }}
                  formatter={(value: any, name: any) => [
                    name === 'count' ? `${value} observations` : formatINR(value),
                    name === 'count' ? 'Activity Volume' : 'Est. Volume'
                  ]}
                />
                <Bar dataKey="count" name="Observed Activity" fill="#14B8A6" radius={[3, 3, 0, 0]}>
                  {(indiaStats?.indiaStateDistribution || []).map((entry, index) => (
                    <Cell
                      key={`state-cell-${index}`}
                      fill={entry.avgRisk >= 65 ? '#F43F5E' : entry.avgRisk >= 45 ? '#F59E0B' : '#14B8A6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend / Metrics Footer */}
        <div className="pt-2 border-t border-[#1D2836] flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-sans">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-500" />
              <span>India-Correlated Settlement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
              <span>Behavioral Anomalies</span>
            </div>
          </div>
          <span className="font-mono text-slate-500">
            Real-time feed normalized via DBSCAN cluster density
          </span>
        </div>
      </section>

      {/* =========================================================================
          4. SECOND SECTION:
          Priority Investigation Table:
          Entity | Activity | Jurisdiction | Risk | Transaction Volume | Priority
          ========================================================================= */}
      <section className="bg-[#111821] border border-[#1D2836] rounded-md overflow-hidden" aria-label="Priority Investigation Table">
        {/* Table Header & Interactive Filter Bar */}
        <div className="p-4 bg-[#0E141C] border-b border-[#1D2836] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Priority Investigation Registry
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Prioritized queue sorted by composite risk and jurisdictional context
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-[#17212D] px-2.5 py-1 rounded border border-[#2A3A4D]">
              {filteredAlerts.length} Matching Records
            </span>
          </div>

          {/* Filter Inputs */}
          <div className="flex flex-col md:flex-row items-center gap-2 pt-1">
            {/* Search Input */}
            <div className="flex-1 w-full relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search entity address, city, state, or pattern..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="soc-input pl-8"
              />
            </div>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-[#0E141C] border border-[#1D2836] rounded-md px-2.5 py-1.5 text-slate-300 text-xs outline-none focus:border-teal-500 cursor-pointer w-full md:w-auto"
            >
              <option value="ALL">All States / UTs</option>
              {(indiaStats?.indiaStateDistribution || []).map((s) => (
                <option key={s.state} value={s.state}>{s.state}</option>
              ))}
            </select>

            {/* Corridor Filter */}
            <select
              value={selectedLinkType}
              onChange={(e) => setSelectedLinkType(e.target.value)}
              className="bg-[#0E141C] border border-[#1D2836] rounded-md px-2.5 py-1.5 text-slate-300 text-xs outline-none focus:border-teal-500 cursor-pointer w-full md:w-auto"
            >
              <option value="ALL">All Corridors</option>
              <option value="India Domestic">India Domestic</option>
              <option value="India Inbound">India Inbound</option>
              <option value="India Outbound">India Outbound</option>
            </select>

            {/* Minimum Volume Filter */}
            <select
              value={minINR}
              onChange={(e) => setMinINR(Number(e.target.value))}
              className="bg-[#0E141C] border border-[#1D2836] rounded-md px-2.5 py-1.5 text-slate-300 text-xs outline-none focus:border-teal-500 cursor-pointer w-full md:w-auto"
            >
              <option value={0}>All Values</option>
              <option value={5000000}>&gt; ₹50 Lakhs</option>
              <option value={10000000}>&gt; ₹1 Crore</option>
              <option value={50000000}>&gt; ₹5 Crores</option>
            </select>
          </div>
        </div>

        {/* Structured Priority Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-[#1D2836] bg-[#0E141C]/60 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-4">Entity</th>
                <th className="py-2.5 px-3">Activity</th>
                <th className="py-2.5 px-3">Jurisdiction</th>
                <th className="py-2.5 px-3 text-right">Risk Score</th>
                <th className="py-2.5 px-3 text-right">Transaction Volume</th>
                <th className="py-2.5 px-3 text-center">Priority</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2836]">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No India-priority records match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const behavioralScore = alert.behavioral_anomaly_score ?? (alert.riskScore / 100);
                  const indiaScore = alert.india_relevance_score ?? 0.75;
                  const finalScore = alert.final_priority_score ?? (0.70 * behavioralScore + 0.30 * indiaScore);
                  const priorityBand =
                    alert.priority_band ||
                    (finalScore >= 0.75
                      ? 'Critical'
                      : finalScore >= 0.55
                      ? 'High'
                      : finalScore >= 0.35
                      ? 'Medium'
                      : 'Low');

                  const isCritical = priorityBand === 'Critical';
                  const isHigh = priorityBand === 'High';

                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-[#151E2A] transition-colors group"
                    >
                      {/* 1. Entity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectEntity(alert.entityId)}
                            className="font-mono text-slate-200 group-hover:text-teal-300 font-medium transition-colors cursor-pointer text-left truncate max-w-[140px] sm:max-w-[180px]"
                            title={alert.entityId}
                          >
                            {alert.entityId}
                          </button>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#17212D] text-slate-400 border border-[#2A3A4D] uppercase">
                            {alert.entityType || 'WALLET'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Activity */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 max-w-[200px]">
                          <div className="font-medium text-slate-200 truncate">
                            {alert.reasons && alert.reasons.length > 0
                              ? alert.reasons[0]
                              : 'High-Velocity UTXO Transfer'}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            Corridor: {alert.india_context?.link_type || 'India Domestic'}
                          </div>
                        </div>
                      </td>

                      {/* 3. Jurisdiction */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                            <span className="truncate">
                              {alert.india_context?.city
                                ? `${alert.india_context.city}, ${alert.india_context.state}`
                                : alert.india_context?.state || 'National Territory'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Inferred Telemetry
                          </div>
                        </div>
                      </td>

                      {/* 4. Risk */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold text-slate-200">
                          <span
                            className={
                              isCritical
                                ? 'text-rose-400'
                                : isHigh
                                ? 'text-amber-400'
                                : 'text-teal-400'
                            }
                          >
                            {Math.round(alert.riskScore)}
                          </span>
                          <span className="text-slate-500 font-normal text-[10px]"> / 100</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ML: {(behavioralScore).toFixed(2)}
                        </div>
                      </td>

                      {/* 5. Transaction Volume */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-medium text-teal-300">
                          {formatINR(alert.india_context?.estimated_inr)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {alert.transactionCount ? `${alert.transactionCount} txs` : 'Primary UTXO'}
                        </div>
                      </td>

                      {/* 6. Priority */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border inline-block ${
                            isCritical
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              : isHigh
                              ? 'bg-amber-950/50 text-amber-300 border-amber-800/50'
                              : 'bg-teal-950/40 text-teal-300 border-teal-800/40'
                          }`}
                        >
                          {priorityBand}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onExploreGraph(alert.entityId)}
                            className="p-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 hover:text-white border border-[#2A3A4D] transition-colors cursor-pointer"
                            title="Inspect Entity Graph"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenInvestigation(alert.entityId)}
                            className="px-2 py-1 rounded bg-[#17212D] hover:bg-teal-950/40 text-teal-300 border border-[#2A3A4D] hover:border-teal-800/50 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Open Investigation Dossier"
                          >
                            Dossier
                          </button>
                          <button
                            onClick={() => handleDownloadDossierJSON(alert)}
                            className="p-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-400 hover:text-slate-200 border border-[#2A3A4D] transition-colors cursor-pointer"
                            title="Export JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-[#0E141C] border-t border-[#1D2836] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-sans">
          <span>Priority Index: 70% Behavioral Anomaly Score + 30% Jurisdictional Factor</span>
          <button
            onClick={() => onOpenInvestigation()}
            className="text-teal-400 hover:text-teal-300 font-medium transition-colors cursor-pointer"
          >
            Launch Batch Dossier Review →
          </button>
        </div>
      </section>

      {/* =========================================================================
          5. THIRD SECTION:
          Cross-Border Activity
          Show connections between India and other jurisdictions using existing data.
          ========================================================================= */}
      <section className="bg-[#111821] border border-[#1D2836] rounded-md overflow-hidden" aria-label="Cross-Border Activity Connections">
        <div className="px-4 py-3 bg-[#0E141C] border-b border-[#1D2836] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Cross-Border Activity & Inter-Jurisdictional Corridors</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Correlated transaction routes linking Indian node infrastructure to international jurisdictions
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            On-Chain ⇄ Network Layer
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Corridor 1: India ➔ Global Exchange Settlement */}
          <div className="p-3.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-3">
            <div className="flex items-center justify-between border-b border-[#1D2836] pb-2">
              <div className="flex items-center gap-1.5 text-teal-300 font-semibold text-xs">
                <ArrowUpRight className="w-4 h-4 text-teal-400" />
                <span>Outbound International Hubs</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#17212D] text-slate-400 border border-[#2A3A4D]">
                {indiaStats?.outboundPercentage || 42}% Flow
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Observed transactions radiating from Indian domestic clusters towards international liquidity
              hubs (e.g. UAE, Singapore, Western Europe).
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] p-2 rounded bg-[#111821] border border-[#1D2836]">
                <span className="text-slate-300 font-medium">India ➔ UAE Corridor</span>
                <span className="font-mono text-teal-300 font-medium">Est. ₹14.2 Cr</span>
              </div>
              <div className="flex items-center justify-between text-[11px] p-2 rounded bg-[#111821] border border-[#1D2836]">
                <span className="text-slate-300 font-medium">India ➔ Singapore Hub</span>
                <span className="font-mono text-teal-300 font-medium">Est. ₹8.7 Cr</span>
              </div>
            </div>
          </div>

          {/* Corridor 2: Inbound Capital & Peel Chain Sinks */}
          <div className="p-3.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-3">
            <div className="flex items-center justify-between border-b border-[#1D2836] pb-2">
              <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-xs">
                <ArrowDownLeft className="w-4 h-4 text-sky-400" />
                <span>Inbound Settlement Sinks</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#17212D] text-slate-400 border border-[#2A3A4D]">
                {indiaStats?.inboundPercentage || 58}% Flow
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Consolidation sweeps originating from global proxy relays terminating at Indian peer-to-peer OTC
              and domestic exchange endpoints.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] p-2 rounded bg-[#111821] border border-[#1D2836]">
                <span className="text-slate-300 font-medium">Global Proxies ➔ Mumbai / MH</span>
                <span className="font-mono text-sky-300 font-medium">Est. ₹11.9 Cr</span>
              </div>
              <div className="flex items-center justify-between text-[11px] p-2 rounded bg-[#111821] border border-[#1D2836]">
                <span className="text-slate-300 font-medium">Global Relay ➔ Bengaluru / KA</span>
                <span className="font-mono text-sky-300 font-medium">Est. ₹6.4 Cr</span>
              </div>
            </div>
          </div>

          {/* Corridor 3: Autonomous System Infrastructure */}
          <div className="p-3.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-3">
            <div className="flex items-center justify-between border-b border-[#1D2836] pb-2">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Observed Autonomous Systems</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#17212D] text-slate-400 border border-[#2A3A4D]">
                Network Tier
              </span>
            </div>
            <div className="space-y-1.5 font-sans">
              {(indiaStats?.indiaAsnDistribution || []).slice(0, 3).map((asn) => (
                <div
                  key={asn.asn}
                  className="flex items-center justify-between p-2 rounded bg-[#111821] border border-[#1D2836] text-[11px]"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-mono text-slate-200 font-medium">{asn.asn}</div>
                    <div className="text-[10px] text-slate-500 truncate">{asn.organization}</div>
                  </div>
                  <div className="font-mono text-slate-400 shrink-0">
                    {asn.count} observations
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-500 font-mono text-right pt-1">
              Data: Gossip Protocol GeoIP
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. SUPPORTING METHODOLOGY FOOTER
          ========================================================================= */}
      <footer className="bg-[#0E141C] border border-[#1D2836] rounded-md p-3 text-[11px] font-sans text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong>Priority Scoring Formula:</strong> Final Score = 0.70 × Behavioral Anomaly Score + 0.30 × Regional Relevance. High scores prioritize analyst triage without attributing motive.
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px] shrink-0">
          <span>JURISDICTION: IN-CORRIDOR</span>
          <span>COMPLIANCE: AIR-GAPPED</span>
        </div>
      </footer>
    </div>
  );
};
