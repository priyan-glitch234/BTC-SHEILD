import React, { useState, useEffect } from 'react';
import { Search, Boxes, ArrowLeftRight, Network, Globe, Radio, ExternalLink } from 'lucide-react';
import { API } from '../../services/api.js';
import { EntityDetail, NormalizedTransaction } from '../../types.js';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (entityId: string) => void;
  onSelectTransaction: (txid: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectEntity,
  onSelectTransaction
}) => {
  const [query, setQuery] = useState('');
  const [entities, setEntities] = useState<EntityDetail[]>([]);
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setEntities([]);
      setTransactions([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setEntities([]);
      setTransactions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [entRes, txRes] = await Promise.all([
          API.getEntities({ search: query, limit: 6 }),
          API.getTransactions({ search: query, limit: 6 })
        ]);
        setEntities(entRes.data);
        setTransactions(txRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-md bg-[#111821] border border-[#2A3A4D] p-4 shadow-2xl font-sans">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-[#0E141C] border border-[#1D2836] focus-within:border-sky-500 transition-colors">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Wallets, TXIDs, IP Addresses, ASNs, Countries..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none font-sans"
            autoFocus
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#17212D] border border-[#2A3A4D] text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="mt-4 max-h-96 overflow-y-auto space-y-4 pr-1 text-xs custom-scrollbar">
          {loading && (
            <div className="py-8 text-center text-slate-400 font-sans">
              Scanning graph indices...
            </div>
          )}

          {!loading && query && entities.length === 0 && transactions.length === 0 && (
            <div className="py-8 text-center text-slate-500 font-sans">
              No entities or transactions matched "{query}".
            </div>
          )}

          {/* Entities Section */}
          {entities.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-sky-400 mb-2 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Boxes className="w-3.5 h-3.5" />
                <span>Entities & Wallets ({entities.length})</span>
              </div>
              <div className="space-y-1.5">
                {entities.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => {
                      onSelectEntity(e.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="px-1.5 py-0.5 rounded bg-[#17212D] text-[10px] uppercase font-medium text-slate-300 border border-[#2A3A4D]">
                        {e.type}
                      </span>
                      <span className="font-mono text-xs text-slate-200 group-hover:text-sky-300 truncate">
                        {e.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          e.priority === 'CRITICAL'
                            ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                            : e.priority === 'HIGH'
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                            : 'bg-[#17212D] text-slate-300 border border-[#2A3A4D]'
                        }`}
                      >
                        Risk {e.riskScore}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Section */}
          {transactions.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
                <span>Transactions ({transactions.length})</span>
              </div>
              <div className="space-y-1.5">
                {transactions.map((t) => (
                  <div
                    key={t.txid}
                    onClick={() => {
                      onSelectTransaction(t.txid);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="font-mono text-xs text-slate-200 group-hover:text-sky-300 truncate">
                        {t.txid}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                      <span className="text-slate-400">{t.total_input_amount} BTC</span>
                      <span className="text-slate-500">{t.geo_country}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
