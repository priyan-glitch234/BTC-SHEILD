import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Search,
  Filter,
  Flame,
  Globe,
  Radio,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Database,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { API } from '../services/api.js';
import { NormalizedTransaction } from '../types.js';
import { firestoreService, FirebaseConnectionState } from '../services/firestoreService.js';
import { InsertTransactionModal } from '../components/modals/InsertTransactionModal.js';

interface TransactionsPageProps {
  onSelectTransaction: (txid: string) => void;
  onSelectEntity: (entityId: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onSelectTransaction,
  onSelectEntity
}) => {
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [firestoreTxs, setFirestoreTxs] = useState<NormalizedTransaction[]>([]);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionState>('connecting');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [scriptType, setScriptType] = useState('');
  const [minRisk, setMinRisk] = useState<number>(0);
  const [anomalousOnly, setAnomalousOnly] = useState(false);

  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Real-time Firestore onSnapshot subscription
  useEffect(() => {
    const unsubConn = firestoreService.subscribeToConnection((state) => {
      setFirebaseStatus(state);
    });

    const unsubTxs = firestoreService.subscribeToRealtimeTransactions((liveTxs) => {
      setFirestoreTxs(liveTxs);
    });

    return () => {
      unsubConn();
      unsubTxs();
    };
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // If we have live Firestore transactions and no specialized server-side query params, prioritize Firestore
      if (firestoreTxs.length > 0 && !search && !scriptType && minRisk === 0 && !anomalousOnly) {
        setTransactions(firestoreTxs.slice((page - 1) * limit, page * limit));
        setTotal(firestoreTxs.length);
        setLoading(false);
        return;
      }

      // If user is searching or filtering, apply locally on Firestore list first if available
      if (firestoreTxs.length > 0) {
        let filtered = firestoreTxs;
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(t => 
            t.txid.toLowerCase().includes(q) ||
            (t.transactionId && t.transactionId.toLowerCase().includes(q)) ||
            (t.src_ip && t.src_ip.toLowerCase().includes(q)) ||
            (t.geo_country && t.geo_country.toLowerCase().includes(q)) ||
            (t.input_addresses && t.input_addresses.some(a => a.toLowerCase().includes(q))) ||
            (t.output_addresses && t.output_addresses.some(a => a.toLowerCase().includes(q)))
          );
        }
        if (scriptType) {
          filtered = filtered.filter(t => t.script_type === scriptType);
        }
        if (minRisk > 0) {
          filtered = filtered.filter(t => (t.riskScore || t.risk_score || 0) >= minRisk);
        }
        if (anomalousOnly) {
          filtered = filtered.filter(t => t.is_anomalous);
        }

        setTransactions(filtered.slice((page - 1) * limit, page * limit));
        setTotal(filtered.length);
        setLoading(false);
        return;
      }

      const res = await API.getTransactions({
        search,
        script_type: scriptType || undefined,
        min_risk: minRisk > 0 ? minRisk : undefined,
        anomalous_only: anomalousOnly,
        page,
        limit
      });
      setTransactions(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      if (firestoreTxs.length > 0) {
        setTransactions(firestoreTxs.slice((page - 1) * limit, page * limit));
        setTotal(firestoreTxs.length);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, scriptType, minRisk, anomalousOnly, firestoreTxs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 1500);
  };

  const handleStatusUpdate = async (tx: NormalizedTransaction, newStatus: string) => {
    try {
      const docId = tx.id || tx.txid;
      await firestoreService.updateTransaction(docId, {
        status: newStatus as any,
        is_anomalous: newStatus === 'flagged' || newStatus === 'blocked'
      });
      setActionMessage(`Status of ${docId} updated to ${newStatus}`);
      setTimeout(() => setActionMessage(null), 2500);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setActionMessage(`Error: ${err?.message || 'Failed to update transaction'}`);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const handleDeleteTransaction = async (tx: NormalizedTransaction) => {
    const docId = tx.id || tx.txid;
    if (!window.confirm(`Are you sure you want to delete transaction ${docId} from Firestore?`)) {
      return;
    }

    try {
      await firestoreService.deleteTransaction(docId);
      setActionMessage(`Transaction ${docId} deleted from Firestore`);
      setTimeout(() => setActionMessage(null), 2500);
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      setActionMessage(`Error: ${err?.message || 'Failed to delete transaction'}`);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4 font-sans text-xs animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-[#111821] border border-[#1D2836] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowLeftRight className="w-4 h-4 text-sky-400" />
            <h1 className="text-base font-semibold text-slate-100 tracking-tight">Bitcoin Transaction Intelligence</h1>
            {firebaseStatus === 'connected' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Active
              </span>
            )}
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Normalized ledger transactions enriched with network propagation metadata and behavioral risk scores.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-slate-400 flex-wrap">
          {/* Insert Transaction Button */}
          <button
            onClick={() => setIsInsertModalOpen(true)}
            id="btn-insert-transaction-page"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs border border-emerald-500/40 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insert Transaction</span>
          </button>

          <button
            onClick={() => fetchTransactions()}
            title="Refresh Transactions"
            className="p-1.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span>Indexed:</span>
            <span className="text-slate-200 font-semibold">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 rounded-md bg-[#0E141C] border border-sky-500/40 text-sky-200 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="flex-1 w-full flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] focus-within:border-sky-500 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by TXID, Wallet Address, IP, Country..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 outline-none text-xs font-sans"
            />
          </div>

          {/* Script Type Filter */}
          <select
            value={scriptType}
            onChange={(e) => { setScriptType(e.target.value); setPage(1); }}
            className="w-full md:w-44 px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 outline-none text-xs cursor-pointer font-sans"
          >
            <option value="">All Script Types</option>
            <option value="P2PKH">P2PKH (Legacy)</option>
            <option value="P2SH">P2SH (Script Hash)</option>
            <option value="P2WPKH">P2WPKH (SegWit)</option>
            <option value="TAPROOT">TAPROOT (v1 Witness)</option>
          </select>

          {/* Min Risk Filter */}
          <select
            value={minRisk}
            onChange={(e) => { setMinRisk(Number(e.target.value)); setPage(1); }}
            className="w-full md:w-36 px-2.5 py-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 outline-none text-xs cursor-pointer font-sans"
          >
            <option value={0}>All Risk Levels</option>
            <option value={40}>Risk ≥ 40</option>
            <option value={65}>Risk ≥ 65 (High)</option>
            <option value={85}>Risk ≥ 85 (Critical)</option>
          </select>

          {/* Anomalous Only Toggle */}
          <button
            type="button"
            onClick={() => { setAnomalousOnly(!anomalousOnly); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              anomalousOnly
                ? 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                : 'bg-[#0E141C] border-[#1D2836] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Anomalous Only</span>
          </button>

          <button
            type="submit"
            className="w-full md:w-auto px-3.5 py-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] border border-[#2A3A4D] text-slate-200 font-medium text-xs transition-colors cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md bg-[#111821] border border-[#1D2836] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1D2836] bg-[#0E141C] text-slate-400 text-[10px] uppercase font-semibold tracking-wider font-sans">
                <th className="py-2.5 px-3">TXID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Inputs / Outputs</th>
                <th className="py-2.5 px-3">Amount (BTC)</th>
                <th className="py-2.5 px-3">Script</th>
                <th className="py-2.5 px-3">Network IP / Geo</th>
                <th className="py-2.5 px-3 text-center">Risk Score</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2836]/60 text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sky-400">
                    Scanning transaction ledger...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No transactions found in Firestore. Click "+ Insert Transaction" to add one!
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const txIdentifier = tx.transactionId || tx.txid || tx.id;
                  const displayAmount = tx.amount !== undefined ? tx.amount : (tx.total_input_amount !== undefined ? tx.total_input_amount : 0.025);
                  const displayRisk = tx.riskScore !== undefined ? tx.riskScore : (tx.risk_score !== undefined ? tx.risk_score : 25);
                  const displayStatus = tx.status || (tx.is_anomalous ? 'flagged' : 'pending');

                  const isHighRisk = displayRisk >= 65;
                  const isCritical = displayRisk >= 85;

                  const inAddr = (tx.input_addresses && tx.input_addresses[0]) || `1${txIdentifier.slice(0, 8)}...`;
                  const outAddr = (tx.output_addresses && tx.output_addresses[0]) || `3${txIdentifier.slice(0, 8)}...`;
                  const inCount = tx.input_count || (tx.input_addresses ? tx.input_addresses.length : 1);
                  const outCount = tx.output_count || (tx.output_addresses ? tx.output_addresses.length : 1);

                  return (
                    <tr
                      key={tx.id || tx.txid}
                      className="hover:bg-[#17212D]/60 transition-colors group"
                    >
                      {/* TXID */}
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => onSelectTransaction(txIdentifier)}
                            className="cursor-pointer hover:text-sky-300 truncate max-w-[130px] font-mono"
                            title={txIdentifier}
                          >
                            {txIdentifier.slice(0, 16)}...
                          </span>
                          <button
                            onClick={() => copyToClipboard(txIdentifier)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                            title="Copy full TXID"
                          >
                            {copiedTx === txIdentifier ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[10px]">
                        {typeof tx.timestamp === 'string' ? tx.timestamp.replace('T', ' ').slice(5, 19) : 'Just now'}
                      </td>

                      {/* Inputs / Outputs addresses */}
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[10px]">
                        <div className="space-y-0.5">
                          <span
                            onClick={() => onSelectEntity(`wallet:${inAddr}`)}
                            className="block text-slate-400 hover:text-sky-300 cursor-pointer truncate max-w-[140px]"
                            title={inAddr}
                          >
                            In: {inAddr.slice(0, 10)}... ({inCount})
                          </span>
                          <span
                            onClick={() => onSelectEntity(`wallet:${outAddr}`)}
                            className="block text-slate-500 hover:text-sky-300 cursor-pointer truncate max-w-[140px]"
                            title={outAddr}
                          >
                            Out: {outAddr.slice(0, 10)}... ({outCount})
                          </span>
                        </div>
                      </td>

                      {/* Amount BTC */}
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-100">
                        {displayAmount} BTC
                        <span className="block text-[9px] text-slate-500 font-normal">Fee: {tx.fee || 0.0001} BTC</span>
                      </td>

                      {/* Script Type */}
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-[#0E141C] border border-[#1D2836] text-[10px] font-mono text-slate-300">
                          {tx.script_type || 'P2WPKH'}
                        </span>
                      </td>

                      {/* IP & Geo */}
                      <td className="py-2.5 px-3 text-slate-300">
                        <div className="space-y-0.5">
                          <span
                            onClick={() => onSelectEntity(`ip:${tx.src_ip || '198.51.100.24'}`)}
                            className="block font-mono text-slate-300 hover:text-emerald-400 cursor-pointer text-[10px]"
                          >
                            {tx.src_ip || '198.51.100.24'}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {tx.geo_country || tx.country || 'US'} • {tx.asn || 'AS13335'}
                          </span>
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${
                            isCritical
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                              : isHighRisk
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                              : 'bg-[#0E141C] text-slate-400 border border-[#1D2836]'
                          }`}
                        >
                          {displayRisk}/100
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={displayStatus}
                          onChange={(e) => handleStatusUpdate(tx, e.target.value)}
                          className="bg-[#0E141C] border border-[#1D2836] text-slate-300 text-[10px] rounded px-1.5 py-0.5 outline-none cursor-pointer font-sans"
                          title="Click to change status in Firestore"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="flagged">Flagged</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectTransaction(txIdentifier)}
                            className="p-1 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            title="Inspect Transaction"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx)}
                            className="p-1 rounded bg-[#0E141C] hover:bg-rose-950/40 border border-[#1D2836] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Delete from Firestore"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-3 border-t border-[#1D2836] bg-[#0E141C]">
          <span className="text-slate-400 text-xs">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total.toLocaleString()} transactions
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] border border-[#2A3A4D] text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 py-1 rounded bg-[#111821] border border-[#1D2836] text-slate-200 text-xs font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] border border-[#2A3A4D] text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Insert Transaction Modal */}
      <InsertTransactionModal
        isOpen={isInsertModalOpen}
        onClose={() => setIsInsertModalOpen(false)}
        onSuccess={(insertedTxId) => {
          setActionMessage(`Transaction ${insertedTxId} recorded in Firestore`);
          setTimeout(() => setActionMessage(null), 3000);
          fetchTransactions();
        }}
      />
    </div>
  );
};
