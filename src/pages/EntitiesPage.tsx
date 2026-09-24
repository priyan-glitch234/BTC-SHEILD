import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ShieldAlert,
  Network,
  Globe,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ArrowUpRight,
  Clock,
  Layers,
  Activity,
  Flag,
  X,
  Radio,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Hash,
  ArrowRight,
  Boxes,
  ExternalLink
} from 'lucide-react';
import { API } from '../services/api.js';
import {
  EntityDetail,
  EntityType,
  AlertSeverity,
  PriorityBand,
  NormalizedTransaction
} from '../types.js';

interface EntitiesPageProps {
  onSelectEntity: (entityId: string) => void;
  onOpenInvestigation: (entityId: string) => void;
  onExploreGraph: (entityId: string) => void;
  onSelectTransaction?: (txid: string) => void;
}

export const EntitiesPage: React.FC<EntitiesPageProps> = ({
  onSelectEntity,
  onOpenInvestigation,
  onExploreGraph,
  onSelectTransaction
}) => {
  const [entities, setEntities] = useState<EntityDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);

  // SEARCH
  const [search, setSearch] = useState('');

  // FILTERS
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('ALL');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('ALL');

  // Selected Entity for Investigation View
  const [selectedEntity, setSelectedEntity] = useState<EntityDetail | null>(null);

  // Active Tab in Entity Intelligence View
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'connections' | 'behavior' | 'timeline'>('overview');

  // Associated Transactions for Selected Entity
  const [entityTransactions, setEntityTransactions] = useState<NormalizedTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Copy feedback state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      // Map riskFilter to API params
      let minRiskParam: number | undefined = undefined;
      let priorityParam: string | undefined = undefined;

      if (riskFilter === 'CRITICAL') {
        minRiskParam = 80;
        priorityParam = 'CRITICAL';
      } else if (riskFilter === 'HIGH') {
        minRiskParam = 60;
        priorityParam = 'HIGH';
      } else if (riskFilter === 'MEDIUM') {
        minRiskParam = 35;
        priorityParam = 'MEDIUM';
      }

      const res = await API.getEntities({
        type: typeFilter || undefined,
        priority: priorityParam,
        min_risk: minRiskParam,
        search: search.trim() || undefined,
        page,
        limit
      });

      setEntities(res.data);
      setTotal(res.total);

      // Auto-select first entity if none selected yet on initial load
      if (res.data.length > 0 && !selectedEntity) {
        setSelectedEntity(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [page, typeFilter, riskFilter]);

  // Load transactions when selected entity changes
  useEffect(() => {
    if (!selectedEntity) {
      setEntityTransactions([]);
      return;
    }

    let isMounted = true;
    const loadTx = async () => {
      setLoadingTransactions(true);
      try {
        const cleanId = selectedEntity.label || selectedEntity.id.replace(/^[a-z]+:/, '');
        const res = await API.getTransactions({ search: cleanId, limit: 15 });
        if (isMounted) {
          setEntityTransactions(res.data);
        }
      } catch {
        if (isMounted) setEntityTransactions([]);
      } finally {
        if (isMounted) setLoadingTransactions(false);
      }
    };

    loadTx();
    return () => {
      isMounted = false;
    };
  }, [selectedEntity?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntities();
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Client-side filtering for Jurisdiction, Activity, and Time Range
  const displayedEntities = entities.filter((e) => {
    // Jurisdiction filter
    if (jurisdictionFilter === 'INDIA') {
      const isIndia =
        e.india_context?.is_india_linked ||
        e.countries?.includes('IN') ||
        (e.india_relevance_score && e.india_relevance_score > 0);
      if (!isIndia) return false;
    } else if (jurisdictionFilter !== 'ALL') {
      if (!e.countries?.includes(jurisdictionFilter)) return false;
    }

    // Activity filter
    if (activityFilter === 'HIGH_VOLUME' && (e.totalVolumeBTC || 0) < 5) {
      return false;
    }
    if (activityFilter === 'HIGH_TX' && (e.transactionsCount || 0) < 5) {
      return false;
    }
    if (activityFilter === 'HIGH_DEGREE' && (e.connectedEntitiesCount || 0) < 5) {
      return false;
    }

    // Time Range filter based on lastSeen
    if (timeRangeFilter !== 'ALL') {
      const ts = new Date(e.lastSeen).getTime();
      const now = Date.now();
      if (!isNaN(ts)) {
        const diffHours = (now - ts) / (1000 * 60 * 60);
        if (timeRangeFilter === '1H' && diffHours > 1) return false;
        if (timeRangeFilter === '24H' && diffHours > 24) return false;
        if (timeRangeFilter === '7D' && diffHours > 24 * 7) return false;
        if (timeRangeFilter === '30D' && diffHours > 24 * 30) return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Recent';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch {
      return ts;
    }
  };

  const getCleanIdentifier = (entity: EntityDetail) => {
    return entity.label || entity.id.replace(/^[a-z]+:/, '');
  };

  const isCriticalRisk = (score: number) => score >= 80;
  const isHighRisk = (score: number) => score >= 60 && score < 80;

  return (
    <div className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="bg-[#111821] border border-[#1D2836] rounded-md p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2836] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-slate-100">
                Entity Explorer
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E141C] text-slate-300 border border-[#1D2836]">
                Entity Profiling & Forensics
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Profile, correlate, and inspect Bitcoin addresses, autonomous systems, routing endpoints, and sovereign clusters.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <span>Indexed Entities:</span>
            <span className="text-slate-100 font-semibold">{total.toLocaleString()}</span>
          </div>
        </div>

        {/* 2. SEARCH BAR */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] focus-within:border-sky-500 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search wallet address / transaction hash / IP / entity label..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none font-mono"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-200 border border-[#2A3A4D] text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* 3. FILTERS ROW: [Entity type] [Risk level] [Jurisdiction] [Activity] [Time range] */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
          {/* Entity Type Filter */}
          <div>
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Entity Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="">All Types</option>
              <option value="wallet">Wallets (Addresses)</option>
              <option value="ip">IP Endpoints</option>
              <option value="asn">Autonomous Systems</option>
              <option value="country">Sovereign Countries</option>
              <option value="transaction">Transactions</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Risk Level
            </label>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical (≥ 80)</option>
              <option value="HIGH">High (≥ 60)</option>
              <option value="MEDIUM">Medium (≥ 35)</option>
            </select>
          </div>

          {/* Jurisdiction Filter */}
          <div>
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Jurisdiction
            </label>
            <select
              value={jurisdictionFilter}
              onChange={(e) => setJurisdictionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="ALL">All Jurisdictions</option>
              <option value="INDIA">India Priority (IN)</option>
              <option value="US">United States (US)</option>
              <option value="SG">Singapore (SG)</option>
              <option value="DE">Germany (DE)</option>
              <option value="GB">United Kingdom (GB)</option>
              <option value="AE">UAE / Dubai (AE)</option>
              <option value="RU">Russia (RU)</option>
              <option value="CN">China (CN)</option>
            </select>
          </div>

          {/* Activity Filter */}
          <div>
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Activity
            </label>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="ALL">All Activity Levels</option>
              <option value="HIGH_VOLUME">High Volume (≥ 5 BTC)</option>
              <option value="HIGH_TX">High TXs (≥ 5 TXs)</option>
              <option value="HIGH_DEGREE">High Degree (≥ 5 Peers)</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Time Range
            </label>
            <select
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer font-sans"
            >
              <option value="ALL">All Time</option>
              <option value="1H">Last 1 Hour</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. MAIN LAYOUT: ENTITY TABLE + ENTITY INTELLIGENCE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ENTITY TABLE (Takes 7 columns when entity is selected, 12 if collapsed) */}
        <div
          className={`${
            selectedEntity ? 'lg:col-span-7' : 'lg:col-span-12'
          } bg-[#111821] border border-[#1D2836] rounded-md overflow-hidden transition-all duration-150`}
        >
          {/* Table Header Bar */}
          <div className="px-4 py-2.5 bg-[#0E141C] border-b border-[#1D2836] flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Entities ({displayedEntities.length})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Select row to inspect entity intelligence
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#1D2836] bg-[#0E141C]/50 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Transactions</th>
                  <th className="py-2.5 px-3 text-right">Connections</th>
                  <th className="py-2.5 px-3 text-right">Risk</th>
                  <th className="py-2.5 px-3 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2836]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                      Scanning entity intelligence index...
                    </td>
                  </tr>
                ) : displayedEntities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      No entities found matching active filters.
                    </td>
                  </tr>
                ) : (
                  displayedEntities.map((entity) => {
                    const isSelected = selectedEntity?.id === entity.id;
                    const cleanIdentifier = getCleanIdentifier(entity);
                    const isCritical = isCriticalRisk(entity.riskScore);
                    const isHigh = isHighRisk(entity.riskScore);

                    return (
                      <tr
                        key={entity.id}
                        onClick={() => setSelectedEntity(entity)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#17212D] border-l-2 border-l-sky-500'
                            : 'hover:bg-[#151D28]'
                        }`}
                      >
                        {/* 1. ENTITY IDENTIFIER */}
                        <td className="py-2.5 px-3 max-w-[170px]">
                          <div className="font-mono text-xs text-slate-100 font-medium truncate" title={entity.id}>
                            {cleanIdentifier.length > 18
                              ? `${cleanIdentifier.slice(0, 8)}...${cleanIdentifier.slice(-8)}`
                              : cleanIdentifier}
                          </div>
                          {entity.clusterId !== undefined && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                              {entity.clusterId === -1 ? 'Anomalous Node' : `Cluster #${entity.clusterId}`}
                              {entity.countries?.length ? ` · ${entity.countries[0]}` : ''}
                            </div>
                          )}
                        </td>

                        {/* 2. TYPE */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#0E141C] text-slate-300 border border-[#1D2836]">
                            {entity.type}
                          </span>
                        </td>

                        {/* 3. TRANSACTIONS */}
                        <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                          <span className="text-slate-200 font-medium">
                            {entity.transactionsCount || 1}
                          </span>
                          <span className="text-slate-500 text-[10px] block">
                            {(entity.totalVolumeBTC || 0).toFixed(2)} BTC
                          </span>
                        </td>

                        {/* 4. CONNECTIONS */}
                        <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                          <span className="text-slate-200 font-medium">
                            {entity.connectedEntitiesCount || 0}
                          </span>
                          <span className="text-slate-500 text-[10px] block">
                            1-hop peers
                          </span>
                        </td>

                        {/* 5. RISK */}
                        <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                          <span
                            className={`font-semibold text-xs ${
                              isCritical
                                ? 'text-red-400'
                                : isHigh
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {entity.riskScore}
                          </span>
                          <span className="text-[10px] text-slate-500 block uppercase font-sans">
                            {entity.priority || (isCritical ? 'Critical' : isHigh ? 'High' : 'Normal')}
                          </span>
                        </td>

                        {/* 6. LAST ACTIVITY */}
                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {formatTimestamp(entity.lastSeen)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="px-4 py-2.5 bg-[#0E141C] border-t border-[#1D2836] flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total.toLocaleString()} entities
            </span>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] disabled:opacity-40 text-slate-300 border border-[#2A3A4D] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] disabled:opacity-40 text-slate-300 border border-[#2A3A4D] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 5. ENTITY INTELLIGENCE (INVESTIGATION VIEW - 5 Cols) */}
        {selectedEntity && (
          <div className="lg:col-span-5 bg-[#111821] border border-[#1D2836] rounded-md flex flex-col justify-between overflow-hidden sticky top-2">
            {/* Investigation View Header */}
            <div className="p-4 border-b border-[#1D2836] bg-[#0E141C] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Entity Intelligence
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#17212D] text-slate-300 font-mono text-[10px] uppercase border border-[#2A3A4D]">
                    {selectedEntity.type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenInvestigation(selectedEntity.id)}
                    className="px-2 py-1 rounded bg-[#17212D] hover:bg-[#1F2C3D] text-sky-400 hover:text-sky-300 border border-[#2A3A4D] text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                    title="Close intelligence view"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Entity Identifier Banner */}
              <div className="p-2.5 rounded bg-[#111821] border border-[#1D2836] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 uppercase font-medium">Entity Identifier</div>
                  <div className="font-mono text-xs font-semibold text-slate-100 truncate mt-0.5" title={selectedEntity.id}>
                    {getCleanIdentifier(selectedEntity)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(getCleanIdentifier(selectedEntity), 'entityId')}
                    className="p-1 text-slate-400 hover:text-slate-200"
                    title="Copy Identifier"
                  >
                    {copiedText === 'entityId' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onSelectEntity(selectedEntity.id)}
                    className="p-1 text-slate-400 hover:text-sky-300"
                    title="Inspect in Modal"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Top Intelligence Metrics */}
              <div className="grid grid-cols-3 gap-2">
                {/* Risk Score */}
                <div className="p-2 rounded bg-[#111821] border border-[#1D2836]">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Risk Score</div>
                  <div className="mt-1 font-mono text-base font-bold flex items-center gap-1.5">
                    <span
                      className={
                        isCriticalRisk(selectedEntity.riskScore)
                          ? 'text-red-400'
                          : isHighRisk(selectedEntity.riskScore)
                          ? 'text-amber-400'
                          : 'text-slate-200'
                      }
                    >
                      {selectedEntity.riskScore}
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans font-normal">/100</span>
                  </div>
                </div>

                {/* Total Volume */}
                <div className="p-2 rounded bg-[#111821] border border-[#1D2836]">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Volume</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-slate-200 truncate">
                    {(selectedEntity.totalVolumeBTC || 0).toFixed(2)} BTC
                  </div>
                </div>

                {/* Connections */}
                <div className="p-2 rounded bg-[#111821] border border-[#1D2836]">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Connections</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-slate-200">
                    {selectedEntity.connectedEntitiesCount || 0} Peers
                  </div>
                </div>
              </div>
            </div>

            {/* TAB NAVIGATION: Overview | Transactions | Connections | Behavior | Timeline */}
            <div className="flex border-b border-[#1D2836] bg-[#0E141C] text-[11px] font-sans px-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'transactions', label: `Transactions (${selectedEntity.connectedTXs?.length || entityTransactions.length || 0})` },
                { id: 'connections', label: `Connections (${selectedEntity.connectedEntitiesCount || 0})` },
                { id: 'behavior', label: 'Behavior' },
                { id: 'timeline', label: 'Timeline' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-3 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-sky-500 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT BODY */}
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Behavioral Outlier Summary */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Behavioral Anomalies & Forensic Summary
                    </div>
                    <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-2">
                      <div className="text-xs font-semibold text-slate-100">
                        {selectedEntity.behavioralReasons?.[0] || 'Standard baseline transaction activity'}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {selectedEntity.evidence_summary ||
                          'Peer analysis shows volume dispersion and graph fan-out metrics aligning with empirical behavioral profiles.'}
                      </p>
                      {selectedEntity.priority_explanation && (
                        <div className="pt-2 border-t border-[#1D2836] text-[11px] text-slate-300">
                          <span className="text-sky-400 font-medium">Investigation Context: </span>
                          {selectedEntity.priority_explanation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dual Scoring Breakdown */}
                  <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-2">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Model Scoring & Attribution
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Isolation Forest Score:</span>
                        <div className="font-mono font-semibold text-slate-200 mt-0.5">
                          {selectedEntity.behavioral_anomaly_score !== undefined
                            ? selectedEntity.behavioral_anomaly_score.toFixed(3)
                            : (selectedEntity.anomalyScore || selectedEntity.riskScore / 100).toFixed(3)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">India Relevance Score:</span>
                        <div className="font-mono font-semibold text-teal-400 mt-0.5">
                          {selectedEntity.india_relevance_score !== undefined
                            ? selectedEntity.india_relevance_score.toFixed(3)
                            : selectedEntity.india_context?.is_india_linked
                            ? '0.750'
                            : '0.000'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Jurisdictions & Routing Context */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Jurisdictions & Autonomous Systems
                    </div>
                    <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Jurisdictions:</span>
                        <div className="flex items-center gap-1.5 font-mono text-slate-200">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedEntity.countries?.join(', ') || 'Global'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#1D2836]">
                        <span className="text-slate-400">Autonomous Systems:</span>
                        <span className="font-mono text-slate-200">
                          {selectedEntity.asns?.join(', ') || 'AS-TRANSIT'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#1D2836]">
                        <span className="text-slate-400">DBSCAN Cluster:</span>
                        <span className="font-mono text-slate-200">
                          {selectedEntity.clusterId === -1 ? 'Anomalous Node' : `Cluster #${selectedEntity.clusterId}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TRANSACTIONS */}
              {activeTab === 'transactions' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Associated Blockchain Transactions</span>
                    <span className="font-mono text-slate-500">
                      {entityTransactions.length} indexed
                    </span>
                  </div>

                  {loadingTransactions ? (
                    <div className="p-8 text-center text-slate-500 font-mono">
                      Querying transaction ledger...
                    </div>
                  ) : entityTransactions.length > 0 ? (
                    <div className="space-y-2">
                      {entityTransactions.map((tx) => (
                        <div
                          key={tx.txid}
                          className="p-2.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] transition-colors space-y-1.5 text-xs group"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              onClick={() => onSelectTransaction ? onSelectTransaction(tx.txid) : handleCopy(tx.txid, 'txid')}
                              className="font-mono font-medium text-slate-200 group-hover:text-sky-300 truncate max-w-[200px] cursor-pointer"
                              title={tx.txid}
                            >
                              {tx.txid.slice(0, 10)}...{tx.txid.slice(-8)}
                            </span>
                            <span className="font-mono text-[11px] text-slate-300">
                              {(tx.total_output_amount || tx.total_input_amount || 0).toFixed(4)} BTC
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>{formatTimestamp(tx.timestamp)}</span>
                            <span
                              className={
                                isCriticalRisk(tx.risk_score || 0)
                                  ? 'text-red-400 font-semibold'
                                  : 'text-slate-400'
                              }
                            >
                              Risk: {tx.risk_score || 20}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedEntity.connectedTXs && selectedEntity.connectedTXs.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedEntity.connectedTXs.map((txid, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-[#0E141C] border border-[#1D2836] flex items-center justify-between text-xs"
                        >
                          <span className="font-mono text-slate-200 truncate max-w-[220px]">
                            {txid}
                          </span>
                          <button
                            onClick={() => handleCopy(txid, `tx-${idx}`)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Copy Hash"
                          >
                            {copiedText === `tx-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded bg-[#0E141C] border border-[#1D2836] text-center text-slate-500 text-xs">
                      No direct transaction records mapped.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CONNECTIONS */}
              {activeTab === 'connections' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Connected Wallets */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Counterparty Wallets ({selectedEntity.connectedWallets?.length || 0})</span>
                      <button
                        onClick={() => onExploreGraph(selectedEntity.id)}
                        className="text-sky-400 hover:text-sky-300 text-[10px] font-sans flex items-center gap-1"
                      >
                        <Network className="w-3 h-3" />
                        <span>Open Graph</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {selectedEntity.connectedWallets && selectedEntity.connectedWallets.length > 0 ? (
                        selectedEntity.connectedWallets.map((w, idx) => (
                          <div
                            key={idx}
                            onClick={() => onSelectEntity(`wallet:${w}`)}
                            className="p-2 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] transition-colors cursor-pointer flex items-center justify-between text-xs group"
                          >
                            <span className="font-mono text-slate-300 group-hover:text-sky-300 truncate max-w-[220px]">
                              {w}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">Peer</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 rounded bg-[#0E141C] border border-[#1D2836] text-xs text-slate-500">
                          No direct counterparty wallets linked.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connected IP Addresses */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Observed IP Propagation Endpoints ({selectedEntity.connectedIPs?.length || 0})
                    </div>
                    <div className="space-y-1.5">
                      {selectedEntity.connectedIPs && selectedEntity.connectedIPs.length > 0 ? (
                        selectedEntity.connectedIPs.map((ip, idx) => (
                          <div
                            key={idx}
                            onClick={() => onSelectEntity(`ip:${ip}`)}
                            className="p-2 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] transition-colors cursor-pointer flex items-center justify-between text-xs group"
                          >
                            <span className="font-mono text-slate-300 group-hover:text-sky-300">
                              {ip}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">Broadcast Node</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 rounded bg-[#0E141C] border border-[#1D2836] text-xs text-slate-500">
                          No distinct IP addresses recorded.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BEHAVIOR */}
              {activeTab === 'behavior' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Indicators checklist */}
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                      Behavioral Indicators
                    </div>
                    <div className="space-y-1.5">
                      {selectedEntity.evidenceList && selectedEntity.evidenceList.length > 0 ? (
                        selectedEntity.evidenceList.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-[#0E141C] border border-[#1D2836] flex items-start gap-2 text-xs text-slate-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{ev}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] text-xs text-slate-400">
                          Standard peer behavior profile.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feature Contributions */}
                  {selectedEntity.featureContributions && selectedEntity.featureContributions.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                        ML Feature Anomaly Contributions
                      </div>
                      <div className="space-y-1.5">
                        {selectedEntity.featureContributions.map((fc, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">
                                {fc.displayName || fc.featureName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                  fc.direction === 'HIGH'
                                    ? 'text-amber-400 bg-amber-950/40'
                                    : 'text-sky-400 bg-sky-950/40'
                                }`}
                              >
                                {fc.direction} ({(fc.contributionPercent || 0).toFixed(1)}%)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-sans">
                              {fc.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Operational Activity Timeline
                  </div>

                  <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#2A3A4D]">
                    {/* Event 1: Last Activity */}
                    <div className="relative space-y-0.5">
                      <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-sky-400 ring-4 ring-[#111821]" />
                      <div className="text-xs font-semibold text-slate-200">
                        Latest Observed Node Activity
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {formatTimestamp(selectedEntity.lastSeen)}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Broadcast recorded with active UTXO state transitions.
                      </p>
                    </div>

                    {/* Event 2: Cluster Evaluation */}
                    <div className="relative space-y-0.5">
                      <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-slate-500 ring-4 ring-[#111821]" />
                      <div className="text-xs font-semibold text-slate-300">
                        DBSCAN Cluster Correlation
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {selectedEntity.clusterId === -1 ? 'Isolated Anomaly Node' : `Assigned Cluster #${selectedEntity.clusterId}`}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Aggregated with {selectedEntity.connectedEntitiesCount || 0} neighboring nodes.
                      </p>
                    </div>

                    {/* Event 3: First Seen */}
                    <div className="relative space-y-0.5">
                      <span className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-slate-500 ring-4 ring-[#111821]" />
                      <div className="text-xs font-semibold text-slate-300">
                        Initial Ingestion Timestamp
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {formatTimestamp(selectedEntity.firstSeen)}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Entity first indexed in blockchain propagation ledger.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Investigation View Footer Actions */}
            <div className="p-3 bg-[#0E141C] border-t border-[#1D2836] flex items-center justify-between">
              <button
                onClick={() => onExploreGraph(selectedEntity.id)}
                className="px-2.5 py-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 text-xs font-medium border border-[#2A3A4D] transition-colors flex items-center gap-1.5"
              >
                <Network className="w-3.5 h-3.5 text-slate-400" />
                <span>Explore Graph</span>
              </button>

              <button
                onClick={() => onOpenInvestigation(selectedEntity.id)}
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
