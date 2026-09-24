import React, { useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  Download,
  FileCheck,
  AlertCircle,
  Clock,
  Layers,
  Database,
  CheckCircle2,
  Sliders,
  FileSpreadsheet,
  FileCode,
  FileJson
} from 'lucide-react';
import { API } from '../services/api.js';
import { IngestionQualityReport, SystemStats } from '../types.js';

interface DataIngestPageProps {
  qualityReport: IngestionQualityReport | null;
  onRefresh: () => void;
}

export const DataIngestPage: React.FC<DataIngestPageProps> = ({
  qualityReport,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate');
  
  // Generator State
  const [recordCount, setRecordCount] = useState<number>(800);
  const [anomalyPercentage, setAnomalyPercentage] = useState<number>(15);
  const [clusterCount, setClusterCount] = useState<number>(6);
  const [timeRangeHours, setTimeRangeHours] = useState<number>(48);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadContent, setUploadContent] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await API.generateDataset({
        recordCount,
        anomalyPercentage,
        clusterCount,
        timeRangeHours
      });
      setStatusMessage(res.message);
      onRefresh();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFileName(file.name);
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const text = await file.text();
      setUploadContent(text);
      const res = await API.uploadDataset(text, file.name);
      setStatusMessage(res.message);
      onRefresh();
    } catch (err: any) {
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-[#111821] border border-[#1D2836] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h1 className="text-base font-semibold text-slate-100 tracking-tight">Data Sources & Ingestion Pipeline</h1>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Ingest, normalize, validate, and synthesize Bitcoin network & blockchain transaction datasets.
          </p>
        </div>

        {/* Dataset Export Quick Links */}
        <div className="flex items-center gap-2">
          <a
            href="/api/datasets/export/csv"
            download
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] text-slate-300 hover:text-slate-100 transition-colors text-xs font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>
          <a
            href="/api/datasets/export/json"
            download
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] text-slate-300 hover:text-slate-100 transition-colors text-xs font-medium"
          >
            <FileJson className="w-3.5 h-3.5 text-sky-400" />
            <span>Export JSON</span>
          </a>
          <a
            href="/api/datasets/export/xml"
            download
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] text-slate-300 hover:text-slate-100 transition-colors text-xs font-medium"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Export XML</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1D2836]">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium border-b-2 text-xs transition-colors cursor-pointer ${
            activeTab === 'generate'
              ? 'border-sky-500 text-sky-400 bg-[#111821]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Synthetic Dataset Generator</span>
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium border-b-2 text-xs transition-colors cursor-pointer ${
            activeTab === 'upload'
              ? 'border-sky-500 text-sky-400 bg-[#111821]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload External File (CSV / JSON / XML)</span>
        </button>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div className="p-3 rounded-md bg-[#0E141C] border border-sky-500/40 text-sky-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tab 1: Synthetic Dataset Generator */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-4">
            <div className="border-b border-[#1D2836] pb-2.5">
              <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>Synthetic Generator Hyperparameters</span>
              </h2>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Generates realistic Bitcoin transaction structures (P2PKH, P2SH, SegWit, Taproot), UTXO arrays, peer propagation timestamps, GeoIP coordinates, and synthetic anomaly ground-truth.
              </p>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Record Count */}
              <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium text-[11px]">Total Records</span>
                  <span className="text-sky-400 font-mono font-bold">{recordCount}</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={recordCount}
                  onChange={(e) => setRecordCount(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">Transaction volume scale</span>
              </div>

              {/* Anomaly Percentage */}
              <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium text-[11px]">Anomaly Rate</span>
                  <span className="text-rose-400 font-mono font-bold">{anomalyPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={anomalyPercentage}
                  onChange={(e) => setAnomalyPercentage(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">Synthetic anomaly injection ratio</span>
              </div>

              {/* Cluster Count */}
              <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium text-[11px]">Behavioral Clusters</span>
                  <span className="text-indigo-400 font-mono font-bold">{clusterCount}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={clusterCount}
                  onChange={(e) => setClusterCount(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">Synthetic entity clusters</span>
              </div>

              {/* Time Range Hours */}
              <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium text-[11px]">Time Window (Hours)</span>
                  <span className="text-emerald-400 font-mono font-bold">{timeRangeHours}h</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="168"
                  step="12"
                  value={timeRangeHours}
                  onChange={(e) => setTimeRangeHours(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">Temporal span for propagation</span>
              </div>
            </div>

            {/* Pattern Presets Included Notice */}
            <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300">Injected Synthetic Behavioral Patterns:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                <li>Rapid Peel Chain Transactions with decreasing change UTXOs</li>
                <li>High-Frequency Transaction Bot Bursts (&lt;10s inter-arrival time)</li>
                <li>Multi-Input Consolidation (Fan-In aggregation structure)</li>
                <li>High-Degree Fan-Out Distributions across disparate ASNs</li>
              </ul>
            </div>

            {/* Generate CTA Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs border border-sky-500/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Synthesizing & Correlating Dataset...' : 'Generate & Ingest Synthetic Dataset'}</span>
            </button>
          </div>

          {/* Quick Schema Reference Card */}
          <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-3">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">Dataset Schema Attributes</h3>
            <p className="text-slate-400 text-[11px]">
              Every generated or uploaded record conforms to strict offline Bitcoin metadata specifications:
            </p>
            <div className="space-y-2 text-[11px] max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              <div className="p-2 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-sky-400 font-mono font-medium">txid</span>
                <span className="text-slate-400 block text-[10px]">64-char Hexadecimal hash</span>
              </div>
              <div className="p-2 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-sky-400 font-mono font-medium">input_addresses / output_addresses</span>
                <span className="text-slate-400 block text-[10px]">Base58 / Bech32 wallet arrays</span>
              </div>
              <div className="p-2 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-sky-400 font-mono font-medium">src_ip / dst_ip / port</span>
                <span className="text-slate-400 block text-[10px]">Network relay propagation endpoints</span>
              </div>
              <div className="p-2 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-sky-400 font-mono font-medium">geo_country / asn</span>
                <span className="text-slate-400 block text-[10px]">Offline geo-routing metadata</span>
              </div>
              <div className="p-2 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-sky-400 font-mono font-medium">synthetic_anomaly_label</span>
                <span className="text-slate-400 block text-[10px]">Ground-truth label (0 or 1) for benchmark evaluation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Upload External File */}
      {activeTab === 'upload' && (
        <div className="p-5 rounded-md bg-[#111821] border border-[#1D2836] space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border border-dashed rounded-md p-8 text-center transition-colors ${
              dragActive
                ? 'border-sky-500 bg-sky-950/20'
                : 'border-[#1D2836] bg-[#0E141C] hover:border-[#2A3A4D]'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-sky-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-100">
              Drag & Drop Bitcoin Dataset File Here
            </h3>
            <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
              Supports CSV, JSON, or XML files. Automatic schema normalization, validation, and offline enrichment.
            </p>

            <label className="mt-4 inline-block px-4 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs cursor-pointer transition-colors border border-sky-500/40">
              <span>Select File from Disk</span>
              <input
                type="file"
                accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Ingestion Quality Report Card */}
      {qualityReport && (
        <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-3">
          <div className="flex items-center justify-between border-b border-[#1D2836] pb-2.5">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">Ingestion Quality & Validation Report</h2>
            </div>
            <span className="text-[10px] text-slate-400 bg-[#0E141C] px-2 py-0.5 rounded border border-[#1D2836] font-mono">
              Processed in {qualityReport.processingTimeMs}ms
            </span>
          </div>

          {/* Quality Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
              <span className="text-slate-500 text-[10px] block">Dataset Name</span>
              <span className="text-slate-200 font-mono font-medium text-xs truncate block">{qualityReport.datasetName}</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
              <span className="text-slate-500 text-[10px] block">Valid Ingested</span>
              <span className="text-emerald-400 font-mono font-semibold text-sm">{qualityReport.validRecords}</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
              <span className="text-slate-500 text-[10px] block">Invalid Discarded</span>
              <span className="text-rose-400 font-mono font-semibold text-sm">{qualityReport.invalidRecords}</span>
            </div>
            <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
              <span className="text-slate-500 text-[10px] block">Duplicate Dropped</span>
              <span className="text-amber-400 font-mono font-semibold text-sm">{qualityReport.duplicateRecords}</span>
            </div>
          </div>

          {/* Validation Issues Log */}
          {qualityReport.issues.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-slate-400 font-medium text-[11px]">Validation Events Log:</span>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {qualityReport.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-md bg-[#0E141C] border border-[#1D2836] text-[11px] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                          issue.severity === 'ERROR'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                            : issue.severity === 'WARNING'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                            : 'bg-sky-950/60 text-sky-300 border border-sky-800/40'
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-slate-300">{issue.message}</span>
                    </div>
                    {issue.field && <span className="text-slate-500 font-mono text-[10px]">[{issue.field}]</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
