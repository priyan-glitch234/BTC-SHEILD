import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  ExternalLink,
  FileSearch,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  ArrowUpRight,
  Flag,
  Globe,
  Radio,
  Layers,
  Sparkles,
  ArrowRight,
  ListFilter
} from 'lucide-react';
import { API } from '../services/api.js';
import {
  AlertItem,
  AlertSeverity,
  AlertStatus,
  EntityDetail,
  EntityType
} from '../types.js';

interface AlertsPageProps {
  onSelectEntity: (entityId: string) => void;
  onOpenInvestigation: (entityId: string) => void;
  onSelectTransaction?: (txid: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onSelectEntity,
  onOpenInvestigation,
  onSelectTransaction
}) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('ALL');
  const [indiaOnlyFilter, setIndiaOnlyFilter] = useState<boolean>(false);

  // Selected Alert for Detailed Investigation Panel
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [selectedEntityDetail, setSelectedEntityDetail] = useState<EntityDetail | null>(null);
  const [loadingEntityDetail, setLoadingEntityDetail] = useState(false);

  // Active Tab in Detail Panel (Progressive Disclosure)
  const [detailTab, setDetailTab] = useState<'reasons' | 'entities' | 'timeline' | 'actions'>('reasons');

  // Copy feedback state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Inline Note Form in Detail Panel
  const [noteAuthor, setNoteAuthor] = useState('SOC Analyst');
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await API.getAlerts({ search });
      setAlerts(data);
      // Auto-select first alert if none selected
      if (data.length > 0 && !selectedAlert) {
        setSelectedAlert(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // When selected alert changes, fetch rich entity detail if available
  useEffect(() => {
    if (!selectedAlert) {
      setSelectedEntityDetail(null);
      return;
    }

    let isMounted = true;
    const loadDetail = async () => {
      setLoadingEntityDetail(true);
      try {
        const detail = await API.getEntityDetail(selectedAlert.entityId);
        if (isMounted) {
          setSelectedEntityDetail(detail);
        }
      } catch {
        if (isMounted) {
          setSelectedEntityDetail(null);
        }
      } finally {
        if (isMounted) setLoadingEntityDetail(false);
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedAlert?.id, selectedAlert?.entityId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleStatusChange = async (alertId: string, newStatus: AlertStatus) => {
    try {
      const res = await API.updateAlert(alertId, { status: newStatus });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
      );
      if (selectedAlert?.id === alertId) {
        setSelectedAlert((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !noteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      const res = await API.updateAlert(selectedAlert.id, {
        author: noteAuthor.trim() || 'SOC Analyst',
        note: noteContent.trim()
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === selectedAlert.id ? res.alert : a))
      );
      setSelectedAlert(res.alert);
      setNoteContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleExportCSV = () => {
    if (displayedAlerts.length === 0) return;
    const headers = [
      'Alert ID',
      'Severity',
      'Risk Score',
      'Entity ID',
      'Entity Type',
      'Primary Transaction',
      'Status',
      'Timestamp',
      'Detection Reasons'
    ];
    const rows = displayedAlerts.map((a) => [
      a.id,
      a.severity,
      a.riskScore,
      a.entityId,
      a.entityType,
      getAssociatedTransaction(a),
      a.status,
      a.timestamp,
      `"${a.reasons?.join('; ') || ''}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `btc_shield_alerts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper resolvers for affected wallet and associated transaction
  const getAffectedWallet = (alert: AlertItem): string => {
    if (alert.entityType === 'wallet') {
      return alert.entityId.replace(/^wallet:/, '');
    }
    const relatedWallet = alert.relatedEntities?.find((r) => r.type === 'wallet');
    if (relatedWallet) return relatedWallet.id.replace(/^wallet:/, '');
    if (selectedEntityDetail?.connectedWallets?.[0]) {
      return selectedEntityDetail.connectedWallets[0];
    }
    return alert.entityId;
  };

  const getAssociatedTransaction = (alert: AlertItem): string => {
    if (alert.entityType === 'transaction') {
      return alert.entityId.replace(/^tx:/, '');
    }
    const relatedTx = alert.relatedEntities?.find((r) => r.type === 'transaction');
    if (relatedTx) return relatedTx.id.replace(/^tx:/, '');
    if (selectedEntityDetail?.connectedTXs?.[0]) {
      return selectedEntityDetail.connectedTXs[0];
    }
    // Deterministic synthetic transaction hash from alert id
    const clean = alert.id.toLowerCase().replace(/[^a-f0-9]/g, '');
    return clean.slice(0, 16) || '7b3e1a90cf5412e8';
  };

  const filterByTimeRange = (alertTimestamp: string, range: string): boolean => {
    if (!range || range === 'ALL') return true;
    const alertTime = new Date(alertTimestamp).getTime();
    const now = Date.now();
    if (isNaN(alertTime)) return true;
    const diffHours = (now - alertTime) / (1000 * 60 * 60);
    if (range === '1H') return diffHours <= 1;
    if (range === '6H') return diffHours <= 6;
    if (range === '24H') return diffHours <= 24;
    if (range === '7D') return diffHours <= 24 * 7;
    return true;
  };

  // Filtered alerts list
  const displayedAlerts = alerts.filter((a) => {
    if (indiaOnlyFilter) {
      const isIndia =
        a.india_context?.is_india_linked ||
        a.country === 'IN' ||
        (a.india_relevance_score && a.india_relevance_score > 0);
      if (!isIndia) return false;
    }
    if (severityFilter && a.severity !== severityFilter && a.priority_band !== severityFilter) {
      return false;
    }
    if (statusFilter && a.status !== statusFilter) {
      return false;
    }
    if (timeRangeFilter !== 'ALL' && !filterByTimeRange(a.timestamp, timeRangeFilter)) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = a.id.toLowerCase().includes(q);
      const matchEntity = a.entityId.toLowerCase().includes(q);
      const matchReason = a.reasons?.some((r) => r.toLowerCase().includes(q));
      const matchEvidence = a.evidence?.some((e) => e.toLowerCase().includes(q));
      if (!matchId && !matchEntity && !matchReason && !matchEvidence) return false;
    }
    return true;
  });

  // Severity Counts for Summary Cards
  const criticalCount = alerts.filter(
    (a) => a.severity === 'CRITICAL' || a.priority_band === 'Critical'
  ).length;
  const highCount = alerts.filter(
    (a) => a.severity === 'HIGH' || a.priority_band === 'High'
  ).length;
  const mediumCount = alerts.filter(
    (a) => a.severity === 'MEDIUM' || a.priority_band === 'Medium'
  ).length;
  const lowCount = alerts.filter(
    (a) => a.severity === 'LOW' || a.priority_band === 'Low'
  ).length;

  const formatTime = (ts: string) => {
    if (!ts) return 'Just now';
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      return date.toISOString().substring(11, 19) + ' UTC';
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="bg-[#111821] border border-[#1D2836] rounded-md p-4 space-y-3">
        {/* Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2836] pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-semibold tracking-tight text-slate-100">
                Critical Alerts
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E141C] text-slate-300 border border-[#1D2836]">
                Incident Queue
              </span>
              {indiaOnlyFilter && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950/40 text-teal-300 border border-teal-800/40">
                  India Priority Filter Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time feed of anomalous UTXO patterns, peer-clustering triggers, and flagged cross-border flows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndiaOnlyFilter(!indiaOnlyFilter)}
              id="btn-filter-india-priority"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                indiaOnlyFilter
                  ? 'bg-teal-950/50 text-teal-300 border-teal-700/60'
                  : 'bg-[#0E141C] text-slate-400 border-[#1D2836] hover:text-slate-200'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-teal-400" />
              <span>India Priority</span>
            </button>

            <button
              onClick={handleExportCSV}
              id="btn-export-alerts-csv"
              className="px-2.5 py-1.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] text-slate-300 border border-[#1D2836] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row: [Search] [Severity] [Status] [Time Range] */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Input (5 Cols) */}
          <div className="md:col-span-5 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] focus-within:border-sky-500 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Alert ID, Entity, TXID, IP, or indicators..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none font-sans"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Severity Dropdown (2 Cols) */}
          <div className="md:col-span-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status Dropdown (2 Cols) */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="">Status: All</option>
              <option value="NEW">NEW</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Time Range Dropdown (3 Cols) */}
          <div className="md:col-span-3">
            <select
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="ALL">Time Range: All Active</option>
              <option value="1H">Last 1 Hour</option>
              <option value="6H">Last 6 Hours</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY (KPI ROW: Critical, High, Medium, Low) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Critical Card (Restrained red accent reserved strictly for Critical) */}
        <div
          onClick={() => setSeverityFilter(severityFilter === 'CRITICAL' ? '' : 'CRITICAL')}
          className={`bg-[#111821] border p-3 rounded-md transition-colors cursor-pointer group ${
            severityFilter === 'CRITICAL'
              ? 'border-red-600 bg-red-950/20'
              : 'border-red-900/30 hover:border-red-700/50'
          }`}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-red-300">
            Critical
          </div>
          <div className="mt-1 text-2xl font-mono font-bold text-red-400">
            {criticalCount}
          </div>
          <div className="mt-1 text-[10px] text-red-400/70 font-sans">
            Requires immediate triage
          </div>
        </div>

        {/* High Card */}
        <div
          onClick={() => setSeverityFilter(severityFilter === 'HIGH' ? '' : 'HIGH')}
          className={`bg-[#111821] border p-3 rounded-md transition-colors cursor-pointer group ${
            severityFilter === 'HIGH'
              ? 'border-amber-600 bg-amber-950/20'
              : 'border-[#1D2836] hover:border-[#2A3A4D]'
          }`}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-amber-300">
            High
          </div>
          <div className="mt-1 text-2xl font-mono font-bold text-amber-400">
            {highCount}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-sans">
            Elevated anomaly confidence
          </div>
        </div>

        {/* Medium Card */}
        <div
          onClick={() => setSeverityFilter(severityFilter === 'MEDIUM' ? '' : 'MEDIUM')}
          className={`bg-[#111821] border p-3 rounded-md transition-colors cursor-pointer group ${
            severityFilter === 'MEDIUM'
              ? 'border-sky-600 bg-sky-950/20'
              : 'border-[#1D2836] hover:border-[#2A3A4D]'
          }`}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-sky-300">
            Medium
          </div>
          <div className="mt-1 text-2xl font-mono font-bold text-sky-400">
            {mediumCount}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-sans">
            Monitoring threshold
          </div>
        </div>

        {/* Low Card */}
        <div
          onClick={() => setSeverityFilter(severityFilter === 'LOW' ? '' : 'LOW')}
          className={`bg-[#111821] border p-3 rounded-md transition-colors cursor-pointer group ${
            severityFilter === 'LOW'
              ? 'border-slate-500 bg-[#17212D]'
              : 'border-[#1D2836] hover:border-[#2A3A4D]'
          }`}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Low
          </div>
          <div className="mt-1 text-2xl font-mono font-bold text-slate-200">
            {lowCount}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-sans">
            Baseline outlier signals
          </div>
        </div>
      </div>

      {/* 3. MAIN TABLE & DETAIL PANEL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* TABLE VIEW: Responsive 12 cols or 7 cols when detail panel is active */}
        <div
          className={`${
            selectedAlert ? 'lg:col-span-7' : 'lg:col-span-12'
          } bg-[#111821] border border-[#1D2836] rounded-md overflow-hidden transition-all duration-150`}
        >
          {/* Table Header Bar */}
          <div className="px-4 py-2.5 bg-[#0E141C] border-b border-[#1D2836] flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Active Alerts ({displayedAlerts.length})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Click row to inspect details
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#1D2836] bg-[#0E141C]/50 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Alert</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Transaction</th>
                  <th className="py-2.5 px-3 text-right">Risk</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2836]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                      Loading SOC alert queue...
                    </td>
                  </tr>
                ) : displayedAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      No alerts match active filters.
                    </td>
                  </tr>
                ) : (
                  displayedAlerts.map((alert) => {
                    const isSelected = selectedAlert?.id === alert.id;
                    const isCritical = alert.severity === 'CRITICAL' || alert.priority_band === 'Critical';
                    const isHigh = alert.severity === 'HIGH' || alert.priority_band === 'High';
                    const isMedium = alert.severity === 'MEDIUM' || alert.priority_band === 'Medium';

                    const wallet = getAffectedWallet(alert);
                    const txid = getAssociatedTransaction(alert);

                    return (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#17212D] border-l-2 border-l-sky-500'
                            : 'hover:bg-[#151D28]'
                        }`}
                      >
                        {/* 1. SEVERITY */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium font-sans border ${
                              isCritical
                                ? 'bg-red-950/40 text-red-300 border-red-800/50'
                                : isHigh
                                ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                                : isMedium
                                ? 'bg-sky-950/40 text-sky-300 border-sky-800/40'
                                : 'bg-[#17212D] text-slate-300 border-[#2A3A4D]'
                            }`}
                          >
                            {alert.severity || alert.priority_band || 'LOW'}
                          </span>
                        </td>

                        {/* 2. ALERT */}
                        <td className="py-2.5 px-3 min-w-[130px] max-w-[200px]">
                          <div className="font-mono text-[11px] text-slate-200 truncate font-medium">
                            {alert.id}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {alert.reasons?.[0] || 'Behavioral Anomaly'}
                          </div>
                        </td>

                        {/* 3. ENTITY */}
                        <td className="py-2.5 px-3 max-w-[130px]">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEntity(alert.entityId);
                            }}
                            className="font-mono text-[11px] text-slate-300 hover:text-sky-300 underline decoration-slate-700 underline-offset-2 truncate block"
                            title={wallet}
                          >
                            {wallet.length > 14 ? `${wallet.slice(0, 6)}...${wallet.slice(-6)}` : wallet}
                          </span>
                        </td>

                        {/* 4. TRANSACTION */}
                        <td className="py-2.5 px-3 max-w-[130px]">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTransaction) {
                                onSelectTransaction(txid);
                              } else {
                                onSelectEntity(alert.entityId);
                              }
                            }}
                            className="font-mono text-[11px] text-slate-400 hover:text-sky-300 truncate block cursor-pointer"
                            title={txid}
                          >
                            {txid.length > 14 ? `${txid.slice(0, 6)}...${txid.slice(-6)}` : txid}
                          </span>
                        </td>

                        {/* 5. RISK */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono">
                          <span
                            className={`font-semibold text-xs ${
                              isCritical ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-slate-300'
                            }`}
                          >
                            {alert.riskScore}
                          </span>
                        </td>

                        {/* 6. TIME */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                          {formatTime(alert.timestamp)}
                        </td>

                        {/* 7. STATUS */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium ${
                              alert.status === 'NEW'
                                ? 'text-sky-400 bg-sky-950/30'
                                : alert.status === 'IN_REVIEW' || alert.status === 'INVESTIGATING'
                                ? 'text-amber-400 bg-amber-950/30'
                                : 'text-slate-400 bg-slate-800'
                            }`}
                          >
                            {alert.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-2 bg-[#0E141C] border-t border-[#1D2836] text-[11px] text-slate-400 flex items-center justify-between font-sans">
            <span>Showing {displayedAlerts.length} of {alerts.length} leads</span>
            <span className="font-mono text-[10px] text-slate-500">iForest / DBSCAN Engine</span>
          </div>
        </div>

        {/* DETAIL PANEL: Dedicated SOC Investigation Inspector (5 Cols) */}
        {selectedAlert && (
          <div className="lg:col-span-5 bg-[#111821] border border-[#1D2836] rounded-md flex flex-col justify-between overflow-hidden sticky top-2">
            {/* Detail Panel Top Header */}
            <div className="p-4 border-b border-[#1D2836] bg-[#0E141C] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Investigation Dossier
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    v{selectedAlert.modelVersion || '2.4'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenInvestigation(selectedAlert.entityId)}
                    className="px-2 py-1 rounded bg-[#17212D] hover:bg-[#1F2C3D] text-sky-400 hover:text-sky-300 border border-[#2A3A4D] text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Case Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                    title="Close detail panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Alert ID & Quick Status Changer */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-100">
                    {selectedAlert.id}
                  </span>
                  <button
                    onClick={() => handleCopy(selectedAlert.id, 'alertId')}
                    className="text-slate-500 hover:text-slate-300"
                    title="Copy Alert ID"
                  >
                    {copiedText === 'alertId' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase font-medium">Status:</span>
                  <select
                    value={selectedAlert.status}
                    onChange={(e) => handleStatusChange(selectedAlert.id, e.target.value as AlertStatus)}
                    className="px-2 py-0.5 rounded bg-[#17212D] border border-[#2A3A4D] text-slate-200 text-xs font-medium outline-none cursor-pointer"
                  >
                    <option value="NEW">NEW</option>
                    <option value="IN_REVIEW">IN REVIEW</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              {/* Top Key Metrics Banner (Severity, Risk Score, Wallet, Transaction) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1D2836]">
                {/* Severity & Score */}
                <div className="p-2 rounded bg-[#111821] border border-[#1D2836]">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Severity / Risk</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        selectedAlert.severity === 'CRITICAL' || selectedAlert.priority_band === 'Critical'
                          ? 'bg-red-950/40 text-red-300 border-red-800/40'
                          : selectedAlert.severity === 'HIGH' || selectedAlert.priority_band === 'High'
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                          : 'bg-sky-950/40 text-sky-300 border-sky-800/40'
                      }`}
                    >
                      {selectedAlert.severity || selectedAlert.priority_band}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-100">
                      Score: {selectedAlert.riskScore}/100
                    </span>
                  </div>
                </div>

                {/* Country / Corridor */}
                <div className="p-2 rounded bg-[#111821] border border-[#1D2836]">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Routing Context</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-200">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">
                      {selectedAlert.country || 'Global'} ({selectedAlert.asn || 'AS-PEER'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progressive Disclosure Tabs */}
            <div className="flex border-b border-[#1D2836] bg-[#0E141C] text-[11px] font-sans px-3">
              <button
                onClick={() => setDetailTab('reasons')}
                className={`py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
                  detailTab === 'reasons'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Detection & Reasons
              </button>
              <button
                onClick={() => setDetailTab('entities')}
                className={`py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
                  detailTab === 'entities'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Entities & Graph
              </button>
              <button
                onClick={() => setDetailTab('timeline')}
                className={`py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
                  detailTab === 'timeline'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setDetailTab('actions')}
                className={`py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
                  detailTab === 'actions'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Actions & Notes ({selectedAlert.notes?.length || 0})
              </button>
            </div>

            {/* Progressive Content Body */}
            <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto custom-scrollbar">
              {/* TAB 1: DETECTION & REASONS */}
              {detailTab === 'reasons' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Detection Reason Card */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Detection Reason
                    </div>
                    <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
                      <div className="text-xs font-semibold text-slate-100">
                        {selectedAlert.reasons?.[0] || 'Behavioral Anomaly Detection'}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {selectedAlert.evidence_summary ||
                          'Transaction structure diverges significantly from empirical peer distributions across input fan-out and volume velocity.'}
                      </p>
                      {selectedAlert.priority_explanation && (
                        <div className="mt-2 pt-2 border-t border-[#1D2836] text-[11px] text-slate-300">
                          <span className="text-sky-400 font-medium">Investigation Priority Context: </span>
                          {selectedAlert.priority_explanation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Behavioral Indicators List */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Behavioral Indicators
                    </div>
                    <div className="space-y-1.5">
                      {selectedAlert.evidence && selectedAlert.evidence.length > 0 ? (
                        selectedAlert.evidence.map((indicator, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-[#0E141C] border border-[#1D2836] flex items-start gap-2 text-xs text-slate-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{indicator}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] text-xs text-slate-400">
                          No distinct outlier sub-indicators recorded.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dual Scoring Breakdown */}
                  <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-2">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Model Confidence & Scoring Breakdown
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Isolation Forest Score:</span>
                        <div className="font-mono font-semibold text-slate-200">
                          {selectedAlert.behavioral_anomaly_score !== undefined
                            ? selectedAlert.behavioral_anomaly_score.toFixed(3)
                            : (selectedAlert.riskScore / 100).toFixed(3)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">India Relevance Score:</span>
                        <div className="font-mono font-semibold text-teal-400">
                          {selectedAlert.india_relevance_score !== undefined
                            ? selectedAlert.india_relevance_score.toFixed(3)
                            : selectedAlert.india_context?.is_india_linked
                            ? '0.750'
                            : '0.000'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ENTITIES & GRAPH */}
              {detailTab === 'entities' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Affected Wallet */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Affected Wallet
                    </div>
                    <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] flex items-center justify-between gap-2">
                      <div className="font-mono text-xs text-slate-100 truncate">
                        {getAffectedWallet(selectedAlert)}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(getAffectedWallet(selectedAlert), 'wallet')}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Copy Address"
                        >
                          {copiedText === 'wallet' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onSelectEntity(selectedAlert.entityId)}
                          className="px-2 py-0.5 rounded bg-[#17212D] text-sky-400 hover:text-sky-300 border border-[#2A3A4D] text-[11px] font-medium"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Transaction */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Transaction Hash
                    </div>
                    <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] flex items-center justify-between gap-2">
                      <div className="font-mono text-xs text-slate-300 truncate">
                        {getAssociatedTransaction(selectedAlert)}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(getAssociatedTransaction(selectedAlert), 'txid')}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Copy TXID"
                        >
                          {copiedText === 'txid' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {onSelectTransaction && (
                          <button
                            onClick={() => onSelectTransaction(getAssociatedTransaction(selectedAlert))}
                            className="px-2 py-0.5 rounded bg-[#17212D] text-sky-400 hover:text-sky-300 border border-[#2A3A4D] text-[11px] font-medium"
                          >
                            Inspect TX
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Related Entities List */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Related Entities ({selectedAlert.relatedEntities?.length || 0})</span>
                      <span className="text-[10px] font-mono text-slate-500">Connected 1-hop</span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedAlert.relatedEntities && selectedAlert.relatedEntities.length > 0 ? (
                        selectedAlert.relatedEntities.map((rel, idx) => (
                          <div
                            key={idx}
                            onClick={() => onSelectEntity(rel.id)}
                            className="p-2 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] transition-colors cursor-pointer flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-[#17212D] text-[10px] font-mono text-slate-400 border border-[#2A3A4D] uppercase">
                                {rel.type}
                              </span>
                              <span className="font-mono text-slate-300 group-hover:text-sky-400 truncate">
                                {rel.id}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                              {rel.relation}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] text-xs text-slate-500">
                          No adjacent peer entities correlated.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TIMELINE */}
              {detailTab === 'timeline' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Detection Chronology
                  </div>

                  <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#2A3A4D]">
                    {/* Event 1 */}
                    <div className="relative space-y-0.5">
                      <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-sky-400 ring-4 ring-[#111821]" />
                      <div className="text-xs font-semibold text-slate-200">
                        Alert Logged in Incident Queue
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {formatTime(selectedAlert.timestamp)}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Automated threshold breached: Isolation Forest score reached {(selectedAlert.riskScore / 100).toFixed(2)}.
                      </p>
                    </div>

                    {/* Event 2 */}
                    <div className="relative space-y-0.5">
                      <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-slate-500 ring-4 ring-[#111821]" />
                      <div className="text-xs font-semibold text-slate-300">
                        Cluster Affiliation Assigned
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        DBSCAN Cluster #{selectedAlert.clusterId || 1}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Correlated with peer routing nodes across AS{selectedAlert.asn || '4808'}.
                      </p>
                    </div>

                    {/* Event 3 */}
                    <div className="relative space-y-0.5">
                      <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-slate-500 ring-4 ring-[#111821]" />
                      <div className="text-xs font-semibold text-slate-300">
                        First Empirical Node Observation
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {selectedEntityDetail?.firstSeen
                          ? formatTime(selectedEntityDetail.firstSeen)
                          : 'Initial dataset import'}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Recorded on sovereign routing boundary {selectedAlert.country || 'Global'}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RECOMMENDED INVESTIGATION ACTIONS & NOTES */}
              {detailTab === 'actions' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Recommended Actions */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2">
                      Recommended Investigation Actions
                    </div>
                    <div className="space-y-1.5">
                      <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] flex items-start gap-2 text-xs text-slate-300">
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-200">Track Counterparty Graph: </strong>
                          Expand 2-hop radius in Transaction Graph to determine terminal deposit addresses.
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] flex items-start gap-2 text-xs text-slate-300">
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-200">Autonomous System Audit: </strong>
                          Validate whether ASN {selectedAlert.asn || 'AS-NET'} belongs to a known VPN or datacenter proxy hosting provider.
                        </div>
                      </div>

                      {selectedAlert.india_context?.is_india_linked && (
                        <div className="p-2.5 rounded bg-[#0E141C] border border-teal-800/40 flex items-start gap-2 text-xs text-teal-300">
                          <Flag className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-teal-200">FIU India Priority Cross-Check: </strong>
                            Correlate wallet with reporting threshold (₹10 Lakh+) and domestic reporting entities.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Case Notes History */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
                      <span>Analyst Case Notes ({selectedAlert.notes?.length || 0})</span>
                    </div>

                    <div className="space-y-2 mb-3">
                      {selectedAlert.notes && selectedAlert.notes.length > 0 ? (
                        selectedAlert.notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                              <span className="font-semibold text-sky-400">{note.author}</span>
                              <span>{formatTime(note.createdAt)}</span>
                            </div>
                            <p className="text-slate-300 font-sans leading-relaxed">
                              {note.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] text-xs text-slate-500">
                          No notes logged for this alert yet.
                        </div>
                      )}
                    </div>

                    {/* Inline Add Note Form */}
                    <form onSubmit={handleAddNote} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={noteAuthor}
                          onChange={(e) => setNoteAuthor(e.target.value)}
                          placeholder="Analyst name"
                          className="px-2.5 py-1 rounded bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none w-1/3"
                        />
                        <span className="text-[10px] text-slate-500">
                          Log note directly to alert record
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Type investigative assessment or triage observations..."
                        className="w-full px-2.5 py-1.5 rounded bg-[#0E141C] border border-[#1D2836] text-slate-100 text-xs outline-none resize-none font-sans placeholder-slate-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!noteContent.trim() || isSubmittingNote}
                          className="px-3 py-1 rounded bg-[#17212D] hover:bg-[#1F2C3D] disabled:opacity-50 text-sky-400 border border-[#2A3A4D] text-xs font-medium transition-colors cursor-pointer"
                        >
                          {isSubmittingNote ? 'Saving...' : 'Add Note'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Detail Panel Sticky Footer */}
            <div className="p-3 bg-[#0E141C] border-t border-[#1D2836] flex items-center justify-between">
              <button
                onClick={() => onSelectEntity(selectedAlert.entityId)}
                className="px-2.5 py-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 text-xs font-medium border border-[#2A3A4D] transition-colors flex items-center gap-1.5"
              >
                <FileSearch className="w-3.5 h-3.5 text-slate-400" />
                <span>Inspect Entity</span>
              </button>

              <button
                onClick={() => onOpenInvestigation(selectedAlert.entityId)}
                className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>Promote to Case</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
