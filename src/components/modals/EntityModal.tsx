import React from 'react';
import {
  Boxes,
  ShieldAlert,
  Cpu,
  Network,
  Globe,
  Radio,
  FileSearch,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { EntityDetail } from '../../types.js';

interface EntityModalProps {
  entity: EntityDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInvestigation: (entityId: string) => void;
  onExploreGraph: (entityId: string) => void;
}

export const EntityModal: React.FC<EntityModalProps> = ({
  entity,
  isOpen,
  onClose,
  onOpenInvestigation,
  onExploreGraph
}) => {
  if (!isOpen || !entity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-3xl rounded-md bg-[#111821] border border-[#1D2836] p-5 shadow-2xl font-sans text-xs max-h-[90vh] overflow-y-auto custom-scrollbar"
        id="entity-detail-modal"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1D2836] pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#17212D] border border-[#2A3A4D] flex items-center justify-center text-sky-400 shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 truncate max-w-md font-mono">{entity.label}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#17212D] border border-[#2A3A4D] text-[10px] uppercase font-semibold text-slate-300">
                  {entity.type}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5 font-mono">Entity ID: {entity.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-400 hover:text-slate-200 border border-[#2A3A4D] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Intelligence Score Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {/* Risk Score */}
          <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836]">
            <div className="text-slate-400 text-[11px] font-medium">Risk Score</div>
            <div className="flex items-baseline gap-1.5 mt-1 font-mono">
              <span className={`text-xl font-bold ${
                entity.riskScore >= 80 ? 'text-rose-400' : entity.riskScore >= 60 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {entity.riskScore}
              </span>
              <span className="text-slate-500 text-[10px]">/ 100</span>
            </div>
            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${
              entity.priority === 'CRITICAL' ? 'bg-rose-950/60 text-rose-300 border-rose-800/60' :
              entity.priority === 'HIGH' ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' : 'bg-[#17212D] text-slate-400 border-[#2A3A4D]'
            }`}>
              {entity.priority}
            </span>
          </div>

          {/* ML Anomaly Score */}
          <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836]">
            <div className="text-slate-400 text-[11px] font-medium">Anomaly Score</div>
            <div className="text-xl font-bold font-mono text-sky-400 mt-1">
              {entity.anomalyScore ? entity.anomalyScore.toFixed(2) : '0.00'}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Isolation Forest</span>
          </div>

          {/* Cluster ID */}
          <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836]">
            <div className="text-slate-400 text-[11px] font-medium">Behavioral Cluster</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-1">
              {entity.clusterId === -1 ? 'Noise Outlier' : `Cluster #${entity.clusterId}`}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">DBSCAN Density</span>
          </div>

          {/* Graph Degree */}
          <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836]">
            <div className="text-slate-400 text-[11px] font-medium">Connections</div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              {entity.connectedEntitiesCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Topological Degree</span>
          </div>
        </div>

        {/* Connected Entities Summary */}
        <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
          <div>
            <span className="text-slate-500 block">Transactions</span>
            <span className="text-slate-200 font-bold font-mono">{entity.transactionsCount}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Connected IPs</span>
            <span className="text-slate-200 font-bold font-mono">{entity.connectedIPs.length}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Connected Wallets</span>
            <span className="text-slate-200 font-bold font-mono">{entity.connectedWallets.length}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Countries / ASNs</span>
            <span className="text-slate-200 font-bold font-mono">{entity.countries.length} / {entity.asns.length}</span>
          </div>
        </div>

        {/* Behavioral Evidence & Reasons Checklist */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-sky-400" />
            <span>Behavioral Evidence Attribution</span>
          </div>
          <div className="space-y-1.5 bg-[#0E141C] p-3 rounded-md border border-[#1D2836]">
            {entity.evidenceList.map((evidence, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>{evidence}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Contribution Breakdown */}
        {entity.featureContributions && entity.featureContributions.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Feature Contribution Analysis</span>
            </div>
            <div className="space-y-2 bg-[#0E141C] p-3 rounded-md border border-[#1D2836]">
              {entity.featureContributions.slice(0, 5).map((fc, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">{fc.displayName}</span>
                    <span className="text-sky-400 font-mono font-semibold">{fc.contributionPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#111821] border border-[#1D2836] overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${Math.min(100, fc.contributionPercent * 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1D2836]">
          <button
            onClick={() => {
              onClose();
              onExploreGraph(entity.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-200 font-medium border border-[#2A3A4D] transition-colors cursor-pointer"
          >
            <Network className="w-3.5 h-3.5 text-sky-400" />
            <span>Explore Subgraph</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenInvestigation(entity.id);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium border border-sky-400/30 transition-colors cursor-pointer"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Inspect Forensic Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
};
