import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Play,
  Settings,
  Plus,
  LogOut,
  User as UserIcon,
  ChevronRight,
  Menu
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SystemStats } from '../../types.js';
import { firestoreService, FirebaseConnectionState } from '../../services/firestoreService.js';

interface TopBarProps {
  stats: SystemStats | null;
  onOpenDemo: () => void;
  onOpenSearch: () => void;
  onOpenInsertTx?: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  currentUser?: User | null;
  onLogout?: () => void;
  onToggleMobile?: () => void;
}

const PAGE_LABELS: Record<string, { section: string; title: string }> = {
  dashboard: { section: 'MONITOR', title: 'Overview' },
  transactions: { section: 'MONITOR', title: 'Live Transactions' },
  alerts: { section: 'MONITOR', title: 'Critical Alerts' },
  entities: { section: 'INVESTIGATE', title: 'Entity Explorer' },
  graph: { section: 'INVESTIGATE', title: 'Transaction Graph' },
  'public-blockchain': { section: 'INVESTIGATE', title: 'Wallet Intelligence' },
  geo: { section: 'INVESTIGATE', title: 'Network Intelligence' },
  'ai-analysis': { section: 'ANALYZE', title: 'Threat Analytics' },
  'india-ops': { section: 'ANALYZE', title: 'India Priority Intelligence' },
  investigation: { section: 'ANALYZE', title: 'Case Dossiers' },
  'model-perf': { section: 'SYSTEM', title: 'Model Safeguards' },
  ingest: { section: 'SYSTEM', title: 'Data Sources' },
  settings: { section: 'SYSTEM', title: 'Settings' }
};

export const TopBar: React.FC<TopBarProps> = ({
  stats,
  onOpenDemo,
  onOpenSearch,
  onOpenInsertTx,
  onNavigate,
  currentPage,
  currentUser,
  onLogout,
  onToggleMobile
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionState>('connecting');

  useEffect(() => {
    const unsub = firestoreService.subscribeToConnection((state) => {
      setFirebaseStatus(state);
    });
    return () => unsub();
  }, []);

  const criticalAlertsCount = stats?.alertsBySeverity.critical || 0;
  const highAlertsCount = stats?.alertsBySeverity.high || 0;
  const activePageInfo = PAGE_LABELS[currentPage] || { section: 'MONITOR', title: 'Overview' };

  return (
    <header className="sticky top-0 z-30 w-full h-14 border-b border-[#1D2836] bg-[#111821] px-3.5 md:px-5 flex items-center justify-between select-none">
      {/* Left: Mobile Toggle + Breadcrumbs */}
      <div className="flex items-center gap-2.5">
        {onToggleMobile && (
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-1.5 rounded-md bg-[#17212D] border border-[#2A3A4D] text-slate-300 hover:text-white cursor-pointer"
            aria-label="Open Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center text-xs font-sans">
          <span className="text-slate-500 font-medium tracking-wider text-[11px] uppercase">
            {activePageInfo.section}
          </span>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-600" />
          <span className="text-slate-100 font-semibold">
            {activePageInfo.title}
          </span>
        </div>
      </div>

      {/* Center: Global Search Input Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenSearch}
          id="global-search-trigger"
          className="w-full flex items-center justify-between bg-[#0E141C] border border-[#1D2836] hover:border-[#2A3A4D] rounded-md py-1.5 px-3 text-xs text-slate-400 hover:text-slate-200 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400" />
            <span className="text-slate-400 font-sans text-xs">Search address, txid, IP, ASN...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-[#17212D] border border-[#2A3A4D] text-[10px] text-slate-400 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-1.5 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-400 hover:text-slate-200 cursor-pointer"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Real-time Connection State */}
        <div
          id="firebase-status-badge"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-sans border transition-colors ${
            firebaseStatus === 'connected'
              ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
              : firebaseStatus === 'connecting'
              ? 'bg-amber-950/30 border-amber-800/40 text-amber-300'
              : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
          }`}
          title={`Data Feed: ${firebaseStatus}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              firebaseStatus === 'connected'
                ? 'bg-emerald-400'
                : firebaseStatus === 'connecting'
                ? 'bg-amber-400'
                : 'bg-rose-400'
            }`}
          />
          <span className="font-medium font-mono text-[10px] uppercase">
            {firebaseStatus === 'connected'
              ? 'LIVE STREAM'
              : firebaseStatus === 'connecting'
              ? 'CONNECTING'
              : 'OFFLINE'}
          </span>
        </div>

        {/* Insert Transaction CTA */}
        {onOpenInsertTx && (
          <button
            onClick={onOpenInsertTx}
            id="btn-insert-tx-topbar"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-sky-400 hover:text-sky-300 border border-[#2A3A4D] hover:border-sky-500/40 text-xs font-medium transition-colors cursor-pointer"
            title="Insert a transaction document"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Insert TX</span>
          </button>
        )}

        {/* Run Demo Walkthrough */}
        <button
          onClick={onOpenDemo}
          id="btn-run-demo"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/40 text-xs font-medium transition-colors cursor-pointer"
          title="Run an automated investigation walkthrough"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Run Demo</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            id="notifications-toggle"
            className="p-1.5 rounded-md bg-[#17212D] border border-[#2A3A4D] hover:bg-[#1E2B3B] text-slate-300 hover:text-slate-100 transition-colors relative cursor-pointer"
            title="Alert Notifications"
          >
            <Bell className="w-4 h-4" />
            {criticalAlertsCount + highAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center font-mono">
                {criticalAlertsCount + highAlertsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-md bg-[#111821] border border-[#1D2836] p-3 shadow-xl z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#1D2836] pb-2 mb-2">
                <span className="text-xs font-semibold text-slate-200">Investigative Leads</span>
                <span className="text-[10px] font-mono text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60 font-semibold">
                  {criticalAlertsCount} Critical
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs font-sans custom-scrollbar">
                {criticalAlertsCount > 0 ? (
                  <div className="p-2.5 rounded bg-[#0E141C] border border-rose-900/40 text-slate-200">
                    <p className="font-medium text-rose-400">Critical Anomaly Lead</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">High-frequency bursts detected from top wallet cluster.</p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] text-slate-400">
                    <p className="text-[11px]">No active critical leads at this time.</p>
                  </div>
                )}
                <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] text-slate-300">
                  <p className="font-medium text-slate-200">Local Pipeline Active</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">ML isolation forests executing without external telemetry leakage.</p>
                </div>
              </div>
              <button
                onClick={() => { setShowNotifications(false); onNavigate('alerts'); }}
                className="w-full mt-2.5 py-1.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] border border-[#2A3A4D] text-slate-200 text-xs font-medium text-center transition-colors cursor-pointer"
              >
                View Critical Alerts →
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              id="btn-user-profile-menu"
              className="w-8 h-8 rounded-md bg-[#17212D] border border-[#2A3A4D] flex items-center justify-center text-xs font-medium text-slate-200 cursor-pointer hover:bg-[#1E2B3B] transition-colors overflow-hidden"
              title={currentUser?.email ? `Analyst: ${currentUser.email}` : 'Analyst Profile'}
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Analyst'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : currentUser?.displayName ? (
                currentUser.displayName.slice(0, 2).toUpperCase()
              ) : currentUser?.email ? (
                currentUser.email.slice(0, 2).toUpperCase()
              ) : (
                'AN'
              )}
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                id="btn-quick-logout"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#17212D] hover:bg-rose-950/40 border border-[#2A3A4D] hover:border-rose-800/40 text-slate-400 hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                title="Sign out of BTC-SHIELD"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[11px]">Logout</span>
              </button>
            )}
          </div>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-md bg-[#111821] border border-[#1D2836] p-3 shadow-xl z-50 animate-in fade-in duration-150 text-xs font-sans">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#1D2836] mb-2.5">
                <div className="w-8 h-8 rounded-md bg-[#0E141C] border border-[#1D2836] flex items-center justify-center text-xs font-medium text-slate-300 shrink-0 overflow-hidden">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-100 truncate">
                    {currentUser?.displayName || 'Security Analyst'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate font-mono">
                    {currentUser?.email || 'analyst@btc-shield.internal'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
                  id="menu-item-settings"
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-300 hover:text-slate-100 hover:bg-[#17212D] transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>System Settings</span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => { setShowUserMenu(false); onLogout(); }}
                    id="menu-item-logout"
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
