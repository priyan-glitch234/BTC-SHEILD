import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Loader2, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { API } from '../../services/api.js';
import { InvestigationDossier, SystemStats } from '../../types.js';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToInvestigation: (id?: string) => void;
  onRefreshStats: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({
  isOpen,
  onClose,
  onNavigateToInvestigation,
  onRefreshStats
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [demoResult, setDemoResult] = useState<{ stats: SystemStats; topInvestigation: InvestigationDossier } | null>(null);

  const steps = [
    { num: 1, label: 'Loading dataset', detail: 'Generating high-entropy synthetic Bitcoin network & blockchain traffic' },
    { num: 2, label: 'Validating records', detail: 'Verifying TXIDs, UTXO arrays, ports, timestamp integrity and duplicates' },
    { num: 3, label: 'Enriching network metadata', detail: 'Mapping IP endpoints to offline GeoIP sovereign nations & ASNs' },
    { num: 4, label: 'Building correlations', detail: 'Linking IP ↔ Transaction ↔ Input Wallet ↔ Output Wallet graphs' },
    { num: 5, label: 'Constructing graph', detail: 'Synthesizing multi-hop undirected adjacency topologies and paths' },
    { num: 6, label: 'Extracting features', detail: 'Engineering 16 multi-dimensional behavioral & topological ML vectors' },
    { num: 7, label: 'Running anomaly detection', detail: 'Executing 100-tree Isolation Forest with path isolation depths' },
    { num: 8, label: 'Clustering entities', detail: 'Running DBSCAN to segment behavioral cohorts and identify noise' },
    { num: 9, label: 'Generating alerts', detail: 'Formulating explainable risk rankings and behavioral evidence leads' },
    { num: 10, label: 'Preparing investigation', detail: 'Constructing forensic dossier and subgraphs for top prioritized lead' }
  ];

  const handleStartDemo = async () => {
    setIsRunning(true);
    setCompleted(false);
    setCurrentStep(1);

    try {
      // Simulate step-by-step progressive animation for clear technical presentation
      for (let s = 1; s <= 9; s++) {
        setCurrentStep(s);
        await new Promise(r => setTimeout(r, 220));
      }

      const res = await API.runDemoInvestigation();
      setCurrentStep(10);
      await new Promise(r => setTimeout(r, 200));

      setDemoResult({
        stats: res.stats,
        topInvestigation: res.topInvestigation
      });
      setCompleted(true);
      setIsRunning(false);
      onRefreshStats();
    } catch (err: any) {
      console.error(err);
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !completed && !isRunning) {
      handleStartDemo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const stats = demoResult?.stats;
  const topInv = demoResult?.topInvestigation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl rounded-md bg-[#111821] border border-[#1D2836] p-5 shadow-2xl font-sans text-xs relative overflow-hidden"
        id="demo-investigation-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1D2836] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#17212D] border border-[#2A3A4D] flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Demo Investigation Pipeline</h2>
              <p className="text-[11px] text-slate-400">End-to-end autonomous analysis simulation & verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-400 hover:text-slate-200 border border-[#2A3A4D] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Pipeline Execution Steps */}
        {!completed ? (
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-sky-400 font-semibold mb-1">
              <span>Pipeline Progress: [{currentStep}/10]</span>
              <span className="font-mono">{Math.round((currentStep / 10) * 100)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-[#0E141C] border border-[#1D2836] overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${(currentStep / 10) * 100}%` }}
              />
            </div>

            {/* Steps List */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 text-xs custom-scrollbar">
              {steps.map((step) => {
                const isPast = currentStep > step.num;
                const isCurrent = currentStep === step.num;

                return (
                  <div
                    key={step.num}
                    className={`flex items-center justify-between p-2.5 rounded-md border transition-all duration-150 ${
                      isPast
                        ? 'bg-[#0E141C] border-[#1D2836] text-slate-300'
                        : isCurrent
                        ? 'bg-[#17212D] border-[#2A3A4D] text-sky-300'
                        : 'bg-[#0E141C]/50 border-[#1D2836]/60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isPast ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-[#1D2836] text-[10px] flex items-center justify-center text-slate-500 font-mono">
                          {step.num}
                        </span>
                      )}
                      <div>
                        <span className="font-semibold text-xs">{`[${step.num}/10] ${step.label}`}</span>
                        {isCurrent && <p className="text-[11px] text-slate-400 mt-0.5">{step.detail}</p>}
                      </div>
                    </div>

                    <span className={`text-[10px] uppercase font-mono font-medium ${
                      isPast ? 'text-emerald-400' : isCurrent ? 'text-sky-400' : 'text-slate-500'
                    }`}>
                      {isPast ? 'DONE' : isCurrent ? 'RUNNING' : 'WAITING'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Completed Demonstration Story Summary */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Story Lead Banner */}
            <div className="p-3.5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Pipeline Execution Finished</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-mono">
                  Ground-Truth Evaluated
                </span>
              </div>

              {/* Leads Tally */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center font-sans">
                <div className="p-2 rounded-md bg-[#111821] border border-[#1D2836]">
                  <div className="text-base font-bold font-mono text-slate-100">{stats?.investigativeLeadsCount || 0}</div>
                  <div className="text-[10px] text-slate-400">Total Leads</div>
                </div>
                <div className="p-2 rounded-md bg-rose-950/20 border border-rose-900/40">
                  <div className="text-base font-bold font-mono text-rose-400">{stats?.alertsBySeverity.critical || 0}</div>
                  <div className="text-[10px] text-rose-300">Critical</div>
                </div>
                <div className="p-2 rounded-md bg-amber-950/20 border border-amber-900/40">
                  <div className="text-base font-bold font-mono text-amber-400">{stats?.alertsBySeverity.high || 0}</div>
                  <div className="text-[10px] text-amber-300">High</div>
                </div>
                <div className="p-2 rounded-md bg-[#111821] border border-[#1D2836]">
                  <div className="text-base font-bold font-mono text-sky-400">{stats?.alertsBySeverity.medium || 0}</div>
                  <div className="text-[10px] text-sky-300">Medium</div>
                </div>
              </div>
            </div>

            {/* Top Entity Prioritization Highlights */}
            {topInv && (
              <div className="p-3 rounded-md bg-[#0E141C] border border-[#1D2836] text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-semibold text-slate-200 text-xs">Primary Target Lead:</span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40 text-[10px] font-bold font-mono">
                    RISK {topInv.riskScore}/100 · {topInv.priority}
                  </span>
                </div>
                <div className="text-slate-300 font-mono text-[11px] truncate bg-[#111821] p-1.5 rounded-md border border-[#1D2836]">
                  Entity: {topInv.entityId}
                </div>

                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Priority Attribution Factors:</div>
                  <div className="space-y-1 text-slate-300 text-xs">
                    {topInv.aiExplanation.keyPoints.slice(0, 3).map((point, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 text-xs font-medium border border-[#2A3A4D] transition-colors cursor-pointer"
              >
                Close & View Overview
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToInvestigation(topInv?.id);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-sky-400/30 transition-colors cursor-pointer"
              >
                <span>Inspect Forensic Case</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
