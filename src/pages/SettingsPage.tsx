import React from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  FileCode,
  Network,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 font-mono text-xs animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-bold text-slate-100">SYSTEM ARCHITECTURE & SPECIFICATIONS</h1>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Technical implementation standards, REST API surfaces, and ethical compliance declarations for Problem Statement 26146.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold">
            Linux & Docker Ready
          </span>
        </div>
      </div>

      {/* Strict Ethical & Privacy Constraints Declaration */}
      <div className="p-5 rounded-md bg-rose-950/20 border border-rose-500/40 space-y-3 ">
        <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
          <Lock className="w-5 h-5 text-rose-400" />
          <span>MANDATORY ETHICAL & PRIVACY CONSTRAINTS</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          BTC-SHIELD operates exclusively on synthetic and benchmark Bitcoin transaction telemetry. It is strictly forbidden from attempting real-world de-anonymization or mapping cryptographic addresses to physical individuals. All analysis is local, offline, and self-contained.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
          <div className="p-2.5 rounded-md bg-black/40 border border-rose-500/20 text-slate-300">
            <span className="font-bold text-rose-400 block mb-1">✓ Synthetic Data Only</span>
            Evaluates mathematical anomaly patterns without PII dependencies.
          </div>
          <div className="p-2.5 rounded-md bg-black/40 border border-rose-500/20 text-slate-300">
            <span className="font-bold text-rose-400 block mb-1">✓ Zero External Telemetry</span>
            Zero remote AI API calls, zero external blockchain querying.
          </div>
          <div className="p-2.5 rounded-md bg-black/40 border border-rose-500/20 text-slate-300">
            <span className="font-bold text-rose-400 block mb-1">✓ Explainable Leads</span>
            Outputs prioritized leads based on verifiable graph & behavioral metrics.
          </div>
        </div>
      </div>

      {/* Architecture Modules Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Ingestion & Correlation Module */}
        <div className="p-5 rounded-md bg-[#111821] border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <span>1. Ingestion & Graph Correlation Engine</span>
          </h2>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Parses multi-format transaction records (CSV/JSON/XML), normalizes UTXO inputs/outputs, performs offline GeoIP/ASN enrichment, and constructs undirected multi-hop adjacency graphs linking IP endpoints, transactions, wallets, ASNs, and countries.
          </p>
          <div className="space-y-1 text-slate-300 text-[11px] pt-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Multi-hop pathfinding (BFS / Dijkstra)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              <span>PageRank & Degree Centrality graph metrics</span>
            </div>
          </div>
        </div>

        {/* Machine Learning Pipeline */}
        <div className="p-5 rounded-md bg-[#111821] border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-300" />
            <span>2. Real Multi-Model ML Pipeline</span>
          </h2>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Extracts 16 behavioral & topological feature vectors. Fits an ensemble of 100 Isolation Trees to compute anomaly path lengths and executes density-based DBSCAN clustering to partition behavioral cohorts and detect noise outliers.
          </p>
          <div className="space-y-1 text-slate-300 text-[11px] pt-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Isolation Forest with explainable feature attribution</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>DBSCAN with Euclidean distance across normalized Z-scores</span>
            </div>
          </div>
        </div>
      </div>

      {/* REST API Surface Table */}
      <div className="p-5 rounded-md bg-[#111821] border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-sky-400" />
          <span>Core REST API Endpoints Reference</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold">
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Endpoint</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-bold text-sky-400">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/datasets/generate</td>
                <td className="py-2.5 px-3 text-slate-400">Synthesizes parameterized Bitcoin traffic dataset</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-sky-400">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/datasets/upload</td>
                <td className="py-2.5 px-3 text-slate-400">Ingests and validates uploaded CSV/JSON/XML data</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-400">GET</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/graph</td>
                <td className="py-2.5 px-3 text-slate-400">Returns multi-hop graph nodes and edges</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-400">GET</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/graph/path</td>
                <td className="py-2.5 px-3 text-slate-400">Calculates shortest path between two entities</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-indigo-300">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/ml/train</td>
                <td className="py-2.5 px-3 text-slate-400">Retrains Isolation Forest & DBSCAN with custom hyperparameters</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-400">GET</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/alerts</td>
                <td className="py-2.5 px-3 text-slate-400">Fetches prioritized investigative leads with evidence checklists</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-400">GET</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/reports/:id</td>
                <td className="py-2.5 px-3 text-slate-400">Downloads complete Markdown forensic investigation report</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-sky-400">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/demo/run</td>
                <td className="py-2.5 px-3 text-slate-400">Executes 10-step autonomous demonstration workflow</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
