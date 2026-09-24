import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ShieldCheck,
  Download,
  Search,
  Filter,
  AlertTriangle,
  FileJson,
  FileText,
  Clock,
  Database,
  Layers,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Globe,
  Radio,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { API } from '../services/api.js';
import { PublicBlockchainSummary, PublicBlockchainRecord } from '../types.js';

export const PublicBlockchainContextPage: React.FC = () => {
  const [summary, setSummary] = useState<PublicBlockchainSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExpanderOpen, setIsExpanderOpen] = useState<boolean>(true);
  const pageSize = 10;

  useEffect(() => {
    fetchSample();
  }, []);

  const fetchSample = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await API.getPublicBlockchainSample();
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load public blockchain sample:', err);
      setError(err.message || 'Failed to load public blockchain sample');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    window.open('/api/public-blockchain/export/csv', '_blank');
  };

  const handleDownloadJSON = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary.records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'public_blockchain_sample.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecords = (summary?.records || []).filter((rec) => {
    if (statusFilter === 'CONFIRMED' && !rec.confirmed) return false;
    if (statusFilter === 'UNCONFIRMED' && rec.confirmed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTxid = rec.txid.toLowerCase().includes(q);
      const matchStatus = rec.status.toLowerCase().includes(q);
      const matchValue = rec.value_btc.toString().includes(q);
      const matchFeeRate = rec.fee_rate_sat_vb.toString().includes(q);
      if (!matchTxid && !matchStatus && !matchValue && !matchFeeRate) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Scatter chart data for input vs output count
  const scatterData = (summary?.records || []).slice(0, 35).map((r, idx) => ({
    inputCount: r.input_count,
    outputCount: r.output_count,
    feeRate: r.fee_rate_sat_vb,
    valueBTC: r.value_btc,
    txidShort: r.txid.substring(0, 8)
  }));

  const PIE_COLORS = ['#10b981', '#f59e0b'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans text-xs">
      {/* 1. Mandatory Top Banner: Public On-Chain Context — Not India Attribution */}
      <div className="relative overflow-hidden rounded-xl bg-[#0e0e12] border border-cyan-500/30 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                PUBLIC ON-CHAIN CONTEXT — NOT INDIA ATTRIBUTION
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[9px] font-mono font-semibold">
                CACHED DEMO SNAPSHOT
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-semibold">
                OFFLINE COMPATIBLE
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-cyan-400" />
              Public Bitcoin Blockchain Transaction Context
            </h1>

            <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
              Provides raw on-chain transaction metrics (inputs, outputs, transaction volume, virtual sizes, and fee rates) from public blockchain records to supply macro baseline context without attributing individual geographic or personal identities.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono transition-colors flex items-center gap-1.5"
              title="Download offline CSV sample"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mandatory Prominent Disclaimer Box */}
      <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-cyan-300 flex items-center gap-2">
            PUBLIC ON-CHAIN DATA PRIVACY & ATTRIBUTION BOUNDARY
          </div>
          <p className="text-slate-400 leading-relaxed">
            Public Bitcoin blockchain data can show transaction-level fields such as amounts, fees, inputs, outputs, and confirmation status. <strong>It does not establish wallet ownership, user identity, IP address, state, city, or nationality.</strong>
          </p>
          <p className="text-[11px] text-slate-500">
            All India state/city/ASN/INR correlation features in BTC-SHIELD run exclusively on synthetic demonstration metadata in the offline analytics pipeline.
          </p>
        </div>
      </div>

      {/* 3. Metric Cards (Cached public records, Confirmed, Avg fee rate, Avg output count, Volume) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cached Public Records */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[10px]">Cached Public Records</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {summary?.totalRecords ?? '—'}
          </div>
          <div className="text-[11px] text-cyan-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Cached: {summary?.cachedTimestamp ? new Date(summary.cachedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Offline'}</span>
          </div>
        </div>

        {/* Card 2: Confirmed Records */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[10px]">Confirmed On-Chain</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary?.confirmedCount ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {summary?.unconfirmedCount ?? 0} in mempool queue
          </div>
        </div>

        {/* Card 3: Average Fee Rate */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[10px]">Average Fee Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {summary?.avgFeeRateSatVb ?? '—'} <span className="text-xs text-slate-400 font-sans">sat/vB</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Sample fee total: {summary?.totalFeeBTC} BTC
          </div>
        </div>

        {/* Card 4: Average Output Count & Total Volume */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[10px]">Avg Outputs / Tx</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {summary?.avgOutputCount ?? '—'} <span className="text-xs text-slate-400 font-sans">outputs</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Sample volume: {summary?.totalValueBTC} BTC
          </div>
        </div>
      </div>

      {/* 4. Interactive Visualizations (Fee Rate Distribution, Value Distribution, Input/Output Scatter, Status Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visual 1: Fee Rate Distribution */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Fee Rate Distribution (sat/vB)
              </h3>
              <p className="text-[10px] text-slate-500">Mempool fee density across cached sample records</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-400 border border-white/10">
              HISTOGRAM
            </span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.feeRateDistribution || []} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <XAxis
                  dataKey="range"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                  formatter={(value: any) => [`${value} transactions`, 'Count']}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 2: Transaction Value Distribution */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Transaction Value Brackets (BTC)
              </h3>
              <p className="text-[10px] text-slate-500">Volume distribution across generic public transfers</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-400 border border-white/10">
              ON-CHAIN VOLUME
            </span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.valueDistribution || []} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <XAxis
                  dataKey="range"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                  formatter={(value: any) => [`${value} transactions`, 'Count']}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 3: Input Count vs Output Count Scatter Plot */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Inputs vs Outputs Distribution
              </h3>
              <p className="text-[10px] text-slate-500">UTXO fan-in consolidation vs fan-out payment structures</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-400 border border-white/10">
              SCATTER TOPOLOGY
            </span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: -10 }}>
                <XAxis
                  type="number"
                  dataKey="inputCount"
                  name="Inputs"
                  stroke="#64748b"
                  fontSize={10}
                  unit=" in"
                />
                <YAxis
                  type="number"
                  dataKey="outputCount"
                  name="Outputs"
                  stroke="#64748b"
                  fontSize={10}
                  unit=" out"
                />
                <ZAxis type="number" dataKey="feeRate" range={[50, 400]} name="Fee Rate" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'Inputs' ? `${value} inputs` : name === 'Outputs' ? `${value} outputs` : `${value} sat/vB`,
                    name
                  ]}
                />
                <Scatter name="Transactions" data={scatterData} fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual 4: Confirmed vs Pending Mempool Status */}
        <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                Confirmation Status Ratio
              </h3>
              <p className="text-[10px] text-slate-500">Block inclusion vs active mempool propagation</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-400 border border-white/10">
              STATUS BREAKDOWN
            </span>
          </div>

          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary?.confirmationRatio || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                >
                  {(summary?.confirmationRatio || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Confirmed ({summary?.confirmedCount || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300">Mempool Queue ({summary?.unconfirmedCount || 0})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Downloadable & Filterable Table of Cached Public Blockchain Sample */}
      <div className="bg-[#0e0e12] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Cached Public Sample Records ({filteredRecords.length})
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Offline cached dataset of public Bitcoin blockchain transaction records
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search TXID / Value / Rate..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-mono focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="UNCONFIRMED">Mempool Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                <th className="py-2.5 px-3">Transaction ID (TXID)</th>
                <th className="py-2.5 px-3">Observed At (UTC)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Value (BTC)</th>
                <th className="py-2.5 px-3 text-right">Fee (sats)</th>
                <th className="py-2.5 px-3 text-right">Fee Rate (sat/vB)</th>
                <th className="py-2.5 px-3 text-center">In / Out</th>
                <th className="py-2.5 px-3">Attribution Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No public records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.txid} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-cyan-400">
                      <span title={rec.txid}>
                        {rec.txid.substring(0, 12)}...{rec.txid.substring(rec.txid.length - 8)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(rec.observed_at).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2.5 px-3">
                      {rec.confirmed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          CONFIRMED {rec.block_height ? `#${rec.block_height}` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          MEMPOOL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                      {rec.value_btc.toFixed(4)} BTC
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {rec.fee_sats.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                      {rec.fee_rate_sat_vb}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">
                      <span className="text-slate-300 font-bold">{rec.input_count}</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-indigo-400 font-bold">{rec.output_count}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-500 truncate max-w-[200px]" title={rec.india_attribution_status}>
                      {rec.india_attribution_status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
          <span className="text-slate-500 text-[11px]">
            Showing page <strong className="text-slate-300">{currentPage}</strong> of <strong className="text-slate-300">{totalPages}</strong> ({filteredRecords.length} total records)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 text-xs transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 text-xs transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 6. Mandatory Collapsible Expander: "Why public on-chain data is not India attribution" */}
      <div className="bg-[#0e0e12] border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <button
          onClick={() => setIsExpanderOpen(!isExpanderOpen)}
          className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100 text-xs uppercase tracking-wider">
              Why public on-chain data is not India attribution
            </span>
          </div>
          {isExpanderOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isExpanderOpen && (
          <div className="p-5 space-y-4 border-t border-white/10 text-xs text-slate-300 leading-relaxed font-sans">
            <div className="space-y-2">
              <h4 className="font-semibold text-cyan-300">
                1. Separation of Public On-Chain Data and Synthetic Demonstration Metadata
              </h4>
              <p className="text-slate-400">
                In BTC-SHIELD, India-focused states, cities, ASNs, INR conversions, and inbound/outbound corridors are <strong>synthetic test metadata</strong> generated to demonstrate cyber-financial investigation workflows for Smart India Hackathon (SIH) Problem Statement 26146.
              </p>
              <p className="text-slate-400">
                By contrast, raw public Bitcoin blockchain data contains only mathematical primitives: transaction hashes (TXIDs), cryptographic UTXOs, script types, block heights, fee amounts, and timestamps. Public on-chain data <strong>does not contain IP addresses, geographic locations, nationalities, or citizen identities</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-cyan-300">
                2. Technical Boundaries of On-Chain Analysis
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                <li>
                  <strong>No IP Address in Blocks:</strong> Bitcoin blocks do not record the IP address of the broadcaster or miners. P2P network propagation occurs across thousands of ephemeral nodes.
                </li>
                <li>
                  <strong>No Geographic Ownership:</strong> A Bitcoin address is a cryptographic hash of a public key. It carries no native country code, currency tag, or jurisdiction marker.
                </li>
                <li>
                  <strong>Behavioral Evaluation Only:</strong> Machine learning models (such as Isolation Forest) evaluate behavioral patterns — including fee ratios, transaction bursts, fan-out degrees, and rapid multi-hop clustering — rather than country, nationality, or identity.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-cyan-300">
                3. Real-World Lawful Deployment Requirements
              </h4>
              <p className="text-slate-400">
                In real-world deployment, linking a transaction to an individual or entity requires lawful authorization, court orders, and data-sharing agreements with regulated Virtual Asset Service Providers (VASPs) and telecom Internet Service Providers (ISPs). The prototype produces investigative lead prioritization, not definitive proof of crime.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 7. Data Provenance Summary Footer Card */}
      <div className="bg-[#09090c] border border-white/10 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dataset Provenance: <strong className="text-slate-200">Cached Public Blockchain Sample</strong></span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Mode: <strong className="text-slate-300">Offline</strong></span>
            <span>Live Monitoring: <strong className="text-amber-400">Disabled</strong></span>
            <span>Attribution: <strong className="text-cyan-400">Public Context Only</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
