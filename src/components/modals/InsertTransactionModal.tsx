import React, { useState } from 'react';
import { Plus, ShieldAlert, CheckCircle2, AlertCircle, Loader2, X, Database } from 'lucide-react';
import { firestoreService, NewTransactionInput } from '../../services/firestoreService.js';

interface InsertTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txid: string) => void;
}

export const InsertTransactionModal: React.FC<InsertTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('0.025');
  const [riskScore, setRiskScore] = useState('25');
  const [status, setStatus] = useState('pending');
  const [scriptType, setScriptType] = useState('P2WPKH');
  const [geoCountry, setGeoCountry] = useState('US');
  const [patternType, setPatternType] = useState('NORMAL');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setTransactionId('');
    setAmount('0.025');
    setRiskScore('25');
    setStatus('pending');
    setScriptType('P2WPKH');
    setGeoCountry('US');
    setPatternType('NORMAL');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Frontend validation
    const cleanTxId = transactionId.trim();
    if (!cleanTxId) {
      setErrorMessage('Transaction ID cannot be empty (e.g. TX001, TX_LIVE_101)');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Amount must be a positive number greater than 0');
      return;
    }

    const numRisk = parseInt(riskScore, 10);
    if (isNaN(numRisk) || numRisk < 0 || numRisk > 100) {
      setErrorMessage('Risk score must be a number between 0 and 100');
      return;
    }

    const validStatuses = ['pending', 'confirmed', 'flagged', 'blocked'];
    if (!validStatuses.includes(status)) {
      setErrorMessage(`Status must be one of: ${validStatuses.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      const payload: NewTransactionInput = {
        transactionId: cleanTxId,
        amount: numAmount,
        riskScore: numRisk,
        status: status as any,
        script_type: scriptType,
        geo_country: geoCountry,
        pattern_type: patternType
      };

      const insertedId = await firestoreService.insertTransaction(payload);
      setSuccessMessage(`Transaction ${insertedId} successfully written to Firestore!`);
      
      if (onSuccess) {
        onSuccess(insertedId);
      }

      // Reset fields after brief confirmation
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Failed to insert transaction to Firestore:', err);
      setErrorMessage(err?.message || 'Failed to insert transaction into Firestore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg rounded-md bg-[#111821] border border-[#1D2836] p-5 shadow-2xl font-sans text-xs relative overflow-hidden"
        id="insert-transaction-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1D2836] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#17212D] border border-[#2A3A4D] flex items-center justify-center text-sky-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Insert Transaction Document</h2>
              <p className="text-[11px] text-slate-400">Append verified Bitcoin record to operational stream</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-400 hover:text-slate-200 border border-[#2A3A4D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert / Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-md bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="mb-4 p-2.5 rounded-md bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Transaction ID */}
          <div>
            <label className="block text-slate-300 text-[11px] font-medium mb-1">
              Transaction ID (TXID) <span className="text-sky-400">*</span>
            </label>
            <input
              type="text"
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. TX_OP_90218 or btc_tx_hash"
              className="w-full px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-100 placeholder-slate-500 font-mono text-xs outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Amount & Risk Score (2 Columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                Amount (BTC) <span className="text-sky-400">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.00000001"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.025"
                className="w-full px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-100 font-mono text-xs outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                Risk Score (0 - 100) <span className="text-sky-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={riskScore}
                onChange={(e) => setRiskScore(e.target.value)}
                placeholder="25"
                className="w-full px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-100 font-mono text-xs outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          {/* Status & Script Type (2 Columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                Status <span className="text-sky-400">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none focus:border-sky-500 transition-colors cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="flagged">Flagged</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                Script Type
              </label>
              <select
                value={scriptType}
                onChange={(e) => setScriptType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none focus:border-sky-500 transition-colors cursor-pointer"
              >
                <option value="P2WPKH">P2WPKH (SegWit)</option>
                <option value="P2PKH">P2PKH (Legacy)</option>
                <option value="P2SH">P2SH (Script Hash)</option>
                <option value="TAPROOT">TAPROOT</option>
              </select>
            </div>
          </div>

          {/* Country & Behavioral Pattern (2 Columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                Jurisdiction / Country
              </label>
              <select
                value={geoCountry}
                onChange={(e) => setGeoCountry(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none focus:border-sky-500 transition-colors cursor-pointer"
              >
                <option value="US">US - United States</option>
                <option value="IN">IN - India</option>
                <option value="GB">GB - United Kingdom</option>
                <option value="DE">DE - Germany</option>
                <option value="SG">SG - Singapore</option>
                <option value="JP">JP - Japan</option>
                <option value="CA">CA - Canada</option>
                <option value="CH">CH - Switzerland</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                Behavioral Pattern
              </label>
              <select
                value={patternType}
                onChange={(e) => setPatternType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none focus:border-sky-500 transition-colors cursor-pointer"
              >
                <option value="NORMAL">Normal Traffic</option>
                <option value="RAPID_MULTI_HOP">Rapid Multi-Hop</option>
                <option value="PEEL_CHAIN">Peel Chain</option>
                <option value="FAN_OUT_DISTRIBUTION">Fan-Out Distribution</option>
                <option value="FAN_IN_CONSOLIDATION">Fan-In Consolidation</option>
                <option value="HIGH_FREQUENCY_BOT">High-Frequency Bot</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1D2836]">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 border border-[#2A3A4D] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              id="btn-submit-insert-tx"
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium border border-sky-400/30 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Writing to stream...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Commit Transaction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
