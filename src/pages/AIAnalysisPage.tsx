import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sliders,
  Sparkles,
  Flame,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';
import { API } from '../services/api.js';
import { ModelPerformanceMetrics } from '../types.js';

interface AIAnalysisPageProps {
  onRefreshStats: () => void;
}

export const AIAnalysisPage: React.FC<AIAnalysisPageProps> = ({ onRefreshStats }) => {
  const [performance, setPerformance] = useState<ModelPerformanceMetrics | null>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Hyperparameters
  const [numTrees, setNumTrees] = useState(100);
  const [contamination, setContamination] = useState(0.15);
  const [eps, setEps] = useState(1.1);
  const [minPts, setMinPts] = useState(3);
  const [retraining, setRetraining] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchMLData = async () => {
    setLoading(true);
    try {
      const [perfRes, clusterRes] = await Promise.all([
        API.getModelPerformance(),
        API.getClusters()
      ]);
      setPerformance(perfRes);
      setClusters(clusterRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMLData();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setStatusMessage(null);
    try {
      const res = await API.retrainML({ numTrees, contamination, eps, minPts });
      setStatusMessage(res.message);
      setPerformance(res.performance);
      const clusterRes = await API.getClusters();
      setClusters(clusterRes);
      onRefreshStats();
    } catch (err: any) {
      setStatusMessage(`Retraining failed: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  // Feature Importance Data formatting
  const featureData = performance?.featureImportance?.map(f => ({
    name: f.displayName,
    importance: Math.round(f.importance * 100)
  })) || [];

  return (
    <div className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-[#111821] border border-[#1D2836] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h1 className="text-base font-semibold text-slate-100 tracking-tight">Threat Analytics & Anomaly Detection</h1>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Behavioral anomaly detection via Isolation Forest and unsupervised DBSCAN entity clustering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-[#0E141C] border border-[#1D2836] text-sky-400 font-mono text-[11px]">
            Active Detection Engine
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-md bg-[#0E141C] border border-sky-500/40 text-sky-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid: Hyperparameter Widget + Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hyperparameter Tuning Widget (1 Col) */}
        <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1D2836] pb-2.5">
            <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Hyperparameter Tuning</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Live Retrain</span>
          </div>

          <div className="space-y-3">
            {/* Isolation Forest Trees */}
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[11px]">Isolation Trees (n_trees)</span>
                <span className="text-sky-400 font-mono font-bold">{numTrees}</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="10"
                value={numTrees}
                onChange={(e) => setNumTrees(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Ensemble tree partition count</span>
            </div>

            {/* Contamination Rate */}
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[11px]">Contamination Ratio</span>
                <span className="text-rose-400 font-mono font-bold">{contamination}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.01"
                value={contamination}
                onChange={(e) => setContamination(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Expected anomaly prior</span>
            </div>

            {/* DBSCAN Epsilon */}
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[11px]">DBSCAN Epsilon (eps)</span>
                <span className="text-indigo-400 font-mono font-bold">{eps}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={eps}
                onChange={(e) => setEps(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Maximum neighborhood distance</span>
            </div>

            {/* DBSCAN MinPts */}
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[11px]">DBSCAN MinPts</span>
                <span className="text-emerald-400 font-mono font-bold">{minPts}</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={minPts}
                onChange={(e) => setMinPts(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Core sample density threshold</span>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="w-full py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors border border-sky-500/40 text-xs cursor-pointer disabled:opacity-50"
          >
            {retraining ? 'Re-fitting ML Models...' : 'Retrain & Re-evaluate Models'}
          </button>
        </div>

        {/* Feature Importance Rankings (2 Cols) */}
        <div className="lg:col-span-2 p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1D2836] pb-2.5">
            <div>
              <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span>Feature Importance Attribution (Isolation Tree Splits)</span>
              </h2>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Relative influence of behavioral metrics on early path isolation depths.
              </p>
            </div>
            <span className="text-[10px] text-slate-400 bg-[#0E141C] px-2 py-0.5 rounded border border-[#1D2836] font-mono">
              16 Features
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureData.slice(0, 8)}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
              >
                <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} axisLine={{ stroke: '#1D2836' }} />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} tickLine={false} axisLine={{ stroke: '#1D2836' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#17212D', borderColor: '#2A3A4D', borderRadius: '4px', fontSize: '11px', color: '#F1F5F9' }}
                />
                <Bar dataKey="importance" name="Relative Weight (%)" fill="#0EA5E9" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DBSCAN Behavioral Clusters Grid */}
      <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1D2836] pb-2.5">
          <div>
            <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>DBSCAN Behavioral Entity Clusters</span>
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Cohorts grouped by density across multi-dimensional feature space. Noise artifacts are tagged as anomalous outliers.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {clusters.length} Cohorts Mapped
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clusters.map((cluster) => {
            const isNoise = cluster.clusterId === -1;

            return (
              <div
                key={cluster.clusterId}
                className={`p-3.5 rounded-md border transition-colors ${
                  isNoise
                    ? 'bg-[#150F16] border-rose-900/50 text-rose-200'
                    : 'bg-[#0E141C] border-[#1D2836] hover:border-[#2A3A4D] text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-100">
                    {cluster.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                      isNoise
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                        : 'bg-[#17212D] text-slate-300 border border-[#2A3A4D]'
                    }`}
                  >
                    {cluster.memberCount} Members
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Average Risk Score:</span>
                    <span className={`font-mono font-semibold ${cluster.avgRiskScore >= 60 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {cluster.avgRiskScore} / 100
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Average Volume:</span>
                    <span className="text-slate-200 font-mono font-medium">{cluster.avgVolumeBTC} BTC</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tx Frequency:</span>
                    <span className="text-sky-400 font-mono font-medium">{cluster.avgTxFrequency} tx/hr</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology & Ethics Disclosure */}
      <div className="p-4 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-2 text-xs">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider font-mono">
          <AlertTriangle className="w-4 h-4" />
          <span>Methodology & Behavioral Feature Isolation</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          The Isolation Forest and DBSCAN algorithms operate on graph topological metrics and transaction parameters (velocity, burst interval, fee ratio, fan-out degree). Geographic jurisdictions and demographic indicators are strictly excluded from the behavioral feature space to prevent algorithmic bias. Jurisdictional indicators are correlated from observed peer network routing and public gateway endpoints to support geographic triage.
        </p>
      </div>
    </div>
  );
};
