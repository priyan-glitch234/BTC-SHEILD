import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, X, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { TopBar } from './components/layout/TopBar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DataIngestPage } from './pages/DataIngestPage.js';
import { TransactionsPage } from './pages/TransactionsPage.js';
import { EntitiesPage } from './pages/EntitiesPage.js';
import { EntityGraphPage } from './pages/EntityGraphPage.js';
import { AIAnalysisPage } from './pages/AIAnalysisPage.js';
import { AlertsPage } from './pages/AlertsPage.js';
import { GeoIntelligencePage } from './pages/GeoIntelligencePage.js';
import { InvestigationPage } from './pages/InvestigationPage.js';
import { ModelPerformancePage } from './pages/ModelPerformancePage.js';
import { IndiaOperationsPage } from './pages/IndiaOperationsPage.js';
import { PublicBlockchainContextPage } from './pages/PublicBlockchainContextPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { LoginPage } from './pages/LoginPage.js';

import { DemoModal } from './components/modals/DemoModal.js';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal.js';
import { EntityModal } from './components/modals/EntityModal.js';
import { InsertTransactionModal } from './components/modals/InsertTransactionModal.js';

import { API } from './services/api.js';
import { firestoreService } from './services/firestoreService.js';
import { authService } from './services/authService.js';
import { SystemStats, EntityDetail, IngestionQualityReport, NormalizedTransaction } from './types.js';

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [collapsedSidebar, setCollapsedSidebar] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [qualityReport, setQualityReport] = useState<IngestionQualityReport | null>(null);

  // Firestore Loading & Error States
  const [isFirestoreLoading, setIsFirestoreLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Modals & Navigation Targets
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isInsertTxModalOpen, setIsInsertTxModalOpen] = useState<boolean>(false);
  const [selectedEntityDetail, setSelectedEntityDetail] = useState<EntityDetail | null>(null);
  const [isEntityModalOpen, setIsEntityModalOpen] = useState<boolean>(false);
  const [graphCenterId, setGraphCenterId] = useState<string>('');
  const [investigationId, setInvestigationId] = useState<string>('current');

  // Transaction Inspection Modal State
  const [selectedTx, setSelectedTx] = useState<NormalizedTransaction | null>(null);

  const fetchStats = async (retryCount = 0) => {
    try {
      const data = await API.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load system stats:', err);
      if (retryCount < 3) {
        setTimeout(() => fetchStats(retryCount + 1), 1000);
      }
    }
  };

  useEffect(() => {
    setIsFirestoreLoading(true);
    setFirestoreError(null);

    fetchStats();

    // Listen to real-time Firestore updates and sync into recent transactions
    const unsubTxs = firestoreService.subscribeToRealtimeTransactions(
      (liveTxs) => {
        setIsFirestoreLoading(false);
        setFirestoreError(null);
        if (liveTxs.length > 0) {
          setStats((prevStats) => {
            if (!prevStats) return prevStats;
            return {
              ...prevStats,
              recentTransactions: liveTxs.slice(0, 20)
            };
          });
        }
      },
      (err) => {
        console.error('Firestore realtime sync error in App.tsx:', err);
        setIsFirestoreLoading(false);
        let errorMsg = 'Failed to stream real-time transactions from Firestore';
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) {
            errorMsg = `Firestore sync notice: ${parsed.error}`;
          }
        } catch {
          if (err.message) errorMsg = err.message;
        }
        setFirestoreError(errorMsg);
      }
    );

    // Monitor live connection transitions
    const unsubConn = firestoreService.subscribeToConnection((state) => {
      if (state === 'error') {
        setIsFirestoreLoading(false);
        setFirestoreError((prev) => prev || 'Firestore connection error. Operating with cached and fallback data.');
      } else if (state === 'connected') {
        setIsFirestoreLoading(false);
        setFirestoreError(null);
      }
    });

    return () => {
      unsubTxs();
      unsubConn();
    };
  }, []);

  // Firebase Authentication State Observer
  useEffect(() => {
    const unsubAuth = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        firestoreService.retry();
      }
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K or / opens search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectEntity = async (entityId: string) => {
    try {
      const entity = await API.getEntityDetail(entityId);
      setSelectedEntityDetail(entity);
      setIsEntityModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTransaction = async (txid: string) => {
    try {
      const res = await API.getTransactions({ search: txid, limit: 1 });
      if (res.data.length > 0) {
        setSelectedTx(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExploreGraph = (entityId: string) => {
    setGraphCenterId(entityId);
    setCurrentPage('graph');
  };

  const handleOpenInvestigation = (entityId?: string) => {
    if (entityId) {
      setInvestigationId(entityId);
    }
    setCurrentPage('investigation');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // If Auth State is still resolving, show clean SOC loading screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0F14] text-slate-200 flex flex-col justify-center items-center p-4 font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#17212D] border border-[#2A3A4D] flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <div className="text-xs font-semibold tracking-wider text-slate-100 uppercase">BTC-SHIELD SECURITY GATEWAY</div>
            <div className="text-[11px] text-slate-400">Verifying cryptographic analyst session...</div>
          </div>
        </div>
      </div>
    );
  }

  // If user is unauthenticated, redirect to LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          setCurrentPage('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F14] text-slate-200 font-sans select-none antialiased overflow-x-hidden">
      {/* Top Navigation Bar */}
      <TopBar
        stats={stats}
        onOpenDemo={() => setIsDemoModalOpen(true)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenInsertTx={() => setIsInsertTxModalOpen(true)}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Enterprise SOC Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          collapsed={collapsedSidebar}
          onToggleCollapse={() => setCollapsedSidebar(!collapsedSidebar)}
          alertsCount={stats?.highPriorityAlerts}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Dynamic Page Content Viewport */}
        <main className="flex-1 min-w-0 h-[calc(100vh-3.5rem)] overflow-y-auto p-4 md:p-6 bg-[#0B0F14] custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Firestore Synchronization Alert / Notice if Error */}
            {firestoreError && (
              <div 
                id="firestore-error-banner"
                className="flex items-center justify-between p-3 rounded-md bg-[#111821] border border-rose-900/40 text-rose-300 text-xs font-sans animate-in fade-in duration-200"
              >
                <div className="flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{firestoreError}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setFirestoreError(null);
                      setIsFirestoreLoading(true);
                      firestoreService.retry();
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-200 border border-[#2A3A4D] text-[11px] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Sync</span>
                  </button>
                  <button
                    onClick={() => setFirestoreError(null)}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Smooth Initial Fetch Placeholder when Stats is resolving */}
            {!stats && isFirestoreLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[420px] text-sky-400 font-sans text-xs space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <div className="space-y-1 text-center">
                  <p className="text-slate-200 font-semibold tracking-wide">CONNECTING TO BTC-SHIELD REAL-TIME INTELLIGENCE</p>
                  <p className="text-slate-400 text-[11px]">Synchronizing Firestore ledger documents and threat models...</p>
                </div>
              </div>
            ) : (
              <>
                {currentPage === 'dashboard' && (
                  <DashboardPage
                    stats={stats}
                    onNavigate={setCurrentPage}
                    onSelectEntity={handleSelectEntity}
                    onSelectTransaction={handleSelectTransaction}
                    onOpenDemo={() => setIsDemoModalOpen(true)}
                  />
                )}

            {currentPage === 'ingest' && (
              <DataIngestPage
                qualityReport={qualityReport}
                onRefresh={() => fetchStats()}
              />
            )}

            {currentPage === 'transactions' && (
              <TransactionsPage
                onSelectTransaction={handleSelectTransaction}
                onSelectEntity={handleSelectEntity}
              />
            )}

            {currentPage === 'entities' && (
              <EntitiesPage
                onSelectEntity={handleSelectEntity}
                onOpenInvestigation={handleOpenInvestigation}
                onExploreGraph={handleExploreGraph}
                onSelectTransaction={handleSelectTransaction}
              />
            )}

            {currentPage === 'graph' && (
              <EntityGraphPage
                initialCenterId={graphCenterId}
                onSelectEntity={handleSelectEntity}
                onOpenInvestigation={handleOpenInvestigation}
                onSelectTransaction={handleSelectTransaction}
                onNavigateAlert={() => setCurrentPage('alerts')}
              />
            )}

            {currentPage === 'india-ops' && (
              <IndiaOperationsPage
                onSelectEntity={handleSelectEntity}
                onOpenInvestigation={handleOpenInvestigation}
                onExploreGraph={handleExploreGraph}
              />
            )}

            {currentPage === 'public-blockchain' && (
              <PublicBlockchainContextPage />
            )}

            {currentPage === 'ai-analysis' && (
              <AIAnalysisPage
                onRefreshStats={fetchStats}
              />
            )}

            {currentPage === 'alerts' && (
              <AlertsPage
                onSelectEntity={handleSelectEntity}
                onOpenInvestigation={handleOpenInvestigation}
                onSelectTransaction={handleSelectTransaction}
              />
            )}

            {currentPage === 'geo' && (
              <GeoIntelligencePage />
            )}

            {currentPage === 'investigation' && (
              <InvestigationPage
                initialInvestigationId={investigationId}
                onSelectEntity={handleSelectEntity}
                onExploreGraph={handleExploreGraph}
              />
            )}

            {currentPage === 'model-perf' && (
              <ModelPerformancePage />
            )}

            {currentPage === 'settings' && (
              <SettingsPage />
            )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global Interactive Modals */}
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onNavigateToInvestigation={handleOpenInvestigation}
        onRefreshStats={fetchStats}
      />

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectEntity={handleSelectEntity}
        onSelectTransaction={handleSelectTransaction}
      />

      <EntityModal
        entity={selectedEntityDetail}
        isOpen={isEntityModalOpen}
        onClose={() => setIsEntityModalOpen(false)}
        onOpenInvestigation={handleOpenInvestigation}
        onExploreGraph={handleExploreGraph}
      />

      <InsertTransactionModal
        isOpen={isInsertTxModalOpen}
        onClose={() => setIsInsertTxModalOpen(false)}
        onSuccess={() => {
          fetchStats();
        }}
      />

      {/* Transaction Detail Quick Inspector Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-md bg-[#111821] border border-[#1D2836] p-5 shadow-2xl space-y-3.5 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-[#1D2836] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-xs uppercase tracking-wider">Transaction Inspector</span>
                {selectedTx.is_anomalous && (
                  <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 text-[10px] font-bold">
                    FLAGGED ANOMALY
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-400 hover:text-slate-200 border border-[#2A3A4D] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">TXID</span>
              <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 break-all select-all font-mono text-[11px]">
                {selectedTx.txid}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-slate-500 text-[10px] block">Amount</span>
                <span className="text-slate-100 font-bold font-mono text-xs">{selectedTx.total_input_amount} BTC</span>
              </div>
              <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-slate-500 text-[10px] block">Script Type</span>
                <span className="text-sky-400 font-bold font-mono text-xs">{selectedTx.script_type}</span>
              </div>
              <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-slate-500 text-[10px] block">Risk Score</span>
                <span className="text-rose-400 font-bold font-mono text-xs">{selectedTx.risk_score} / 100</span>
              </div>
              <div className="p-2.5 rounded-md bg-[#0E141C] border border-[#1D2836]">
                <span className="text-slate-500 text-[10px] block">Network IP</span>
                <span className="text-slate-300 font-mono text-xs truncate block">{selectedTx.src_ip}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider block">Counterparty Wallets</span>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {selectedTx.input_addresses.map((addr, idx) => (
                  <div
                    key={`in-${idx}`}
                    onClick={() => {
                      setSelectedTx(null);
                      handleSelectEntity(`wallet:${addr}`);
                    }}
                    className="p-2 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] text-slate-300 flex items-center justify-between cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    <span className="truncate mr-2">In: {addr}</span>
                    <span className="text-sky-400 text-[10px] font-sans font-medium shrink-0">Inspect →</span>
                  </div>
                ))}
                {selectedTx.output_addresses.map((addr, idx) => (
                  <div
                    key={`out-${idx}`}
                    onClick={() => {
                      setSelectedTx(null);
                      handleSelectEntity(`wallet:${addr}`);
                    }}
                    className="p-2 rounded-md bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-[#2A3A4D] text-slate-300 flex items-center justify-between cursor-pointer font-mono text-[11px] transition-colors"
                  >
                    <span className="truncate mr-2">Out: {addr}</span>
                    <span className="text-sky-400 text-[10px] font-sans font-medium shrink-0">Inspect →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
