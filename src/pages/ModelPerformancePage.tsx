import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  TrendingUp,
  Flame,
  Layers,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { API } from '../services/api.js';
import { ModelPerformanceMetrics } from '../types.js';

export const ModelPerformancePage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const data = await API.getModelPerformance();
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96 text-sky-400 font-mono text-xs animate-pulse">
        Evaluating Machine Learning Benchmarks...
      </div>
    );
  }

  const featureData = metrics.featureImportance?.map(f => ({
    name: f.displayName,
    importance: Math.round(f.importance * 100)
  })) || [];

  return (
    <div className="space-y-6 font-mono text-xs animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-bold text-slate-100">MODEL PERFORMANCE & BENCHMARK VALIDATION</h1>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Statistical evaluation of Isolation Forest and DBSCAN against ground-truth synthetic anomaly injections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-md bg-cyan-950/60 border border-sky-500/40 text-sky-300 font-bold">
            Ground-Truth Verified
          </span>
        </div>
      </div>

      {/* Primary ML Score Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Precision */}
        <div className="p-4 rounded-md bg-[#111821] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Precision</span>
          <span className="text-2xl font-extrabold text-sky-400 mt-1 block">
            {metrics.precision.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">TP / (TP + FP)</span>
        </div>

        {/* Recall */}
        <div className="p-4 rounded-md bg-[#111821] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Recall</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
            {metrics.recall.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">TP / (TP + FN)</span>
        </div>

        {/* F1 Score */}
        <div className="p-4 rounded-md bg-[#111821] border border-sky-500/40 bg-[#17212D]">
          <span className="text-sky-300 text-[10px] block font-bold">F1-Measure</span>
          <span className="text-2xl font-extrabold text-sky-300 mt-1 block">
            {metrics.f1Score.toFixed(3)}
          </span>
          <span className="text-[10px] text-sky-400/80 block mt-1">Harmonic Mean</span>
        </div>

        {/* Accuracy */}
        <div className="p-4 rounded-md bg-[#111821] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Accuracy</span>
          <span className="text-2xl font-extrabold text-indigo-400 mt-1 block">
            {metrics.accuracy.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">(TP + TN) / Total</span>
        </div>

        {/* ROC-AUC */}
        <div className="p-4 rounded-md bg-[#111821] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">ROC-AUC Approx</span>
          <span className="text-2xl font-extrabold text-indigo-300 mt-1 block">
            {metrics.rocAuc.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Area Under Curve</span>
        </div>
      </div>

      {/* Confusion Matrix + Clustering Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix (2x2) */}
        <div className="p-5 rounded-md bg-[#111821] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Confusion Matrix (Ground Truth Evaluation)</span>
            </h2>
            <span className="text-[10px] text-slate-400">{metrics.totalSamples} Samples</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* True Positive */}
            <div className="p-4 rounded-md bg-emerald-950/30 border border-emerald-500/40 text-center">
              <span className="text-emerald-400 text-[10px] uppercase font-bold block">True Positive (TP)</span>
              <span className="text-2xl font-extrabold text-emerald-300 mt-1 block">{metrics.truePositives}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Correctly Flagged Anomalies</span>
            </div>

            {/* False Positive */}
            <div className="p-4 rounded-md bg-rose-950/30 border border-rose-500/40 text-center">
              <span className="text-rose-400 text-[10px] uppercase font-bold block">False Positive (FP)</span>
              <span className="text-2xl font-extrabold text-rose-300 mt-1 block">{metrics.falsePositives}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Normal Flagged as Outlier</span>
            </div>

            {/* False Negative */}
            <div className="p-4 rounded-md bg-amber-950/30 border border-amber-500/40 text-center">
              <span className="text-amber-400 text-[10px] uppercase font-bold block">False Negative (FN)</span>
              <span className="text-2xl font-extrabold text-amber-300 mt-1 block">{metrics.falseNegatives}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Missed Outlier Injection</span>
            </div>

            {/* True Negative */}
            <div className="p-4 rounded-md bg-slate-900/60 border border-slate-700/60 text-center">
              <span className="text-slate-300 text-[10px] uppercase font-bold block">True Negative (TN)</span>
              <span className="text-2xl font-extrabold text-slate-200 mt-1 block">{metrics.trueNegatives}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Correctly Identified Normal</span>
            </div>
          </div>
        </div>

        {/* Clustering & Unsupervised Analytics */}
        <div className="p-5 rounded-md bg-[#111821] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-300" />
              <span>DBSCAN Clustering Validation</span>
            </h2>
            <span className="text-[10px] text-purple-300 font-semibold">Density Reachability</span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center p-3 rounded-md bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Total Behavioral Clusters Mapped:</span>
              <span className="text-slate-100 font-bold text-sm">{metrics.clusteringMetrics.totalClusters}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-md bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Isolated Noise Artifacts:</span>
              <span className="text-rose-400 font-bold text-sm">{metrics.clusteringMetrics.noisePoints}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-md bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Approximate Silhouette Coefficient:</span>
              <span className="text-sky-400 font-bold text-sm">{metrics.clusteringMetrics.silhouetteScoreApprox}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-md bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Average Cluster Member Count:</span>
              <span className="text-slate-100 font-bold text-sm">{metrics.clusteringMetrics.avgClusterSize}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Importance Attribution Bar */}
      <div className="p-5 rounded-md bg-[#111821] border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span>Feature Weight Attribution (Isolation Forest Split Frequency)</span>
        </h2>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={featureData.slice(0, 10)}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 90, bottom: 0 }}
            >
              <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
              />
              <Bar dataKey="importance" name="Weight (%)" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
