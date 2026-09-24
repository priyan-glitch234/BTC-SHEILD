import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldAlert,
  Boxes,
  Network,
  Wallet,
  Globe,
  Activity,
  Flag,
  FileSearch,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  alertsCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeClass?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  alertsCount,
  mobileOpen = false,
  onCloseMobile
}) => {
  // STRICT SPECIFICATION SIDEBAR STRUCTURE:
  // MONITOR: Overview, Live Transactions, Alerts
  // INVESTIGATE: Entity Explorer, Transaction Graph, Wallet Intelligence, Network Intelligence
  // ANALYZE: Threat Analytics, India Priority, Case Dossiers
  // SYSTEM: Data Sources, Settings
  const sections: NavSection[] = [
    {
      title: 'MONITOR',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'transactions', label: 'Live Transactions', icon: ArrowLeftRight },
        {
          id: 'alerts',
          label: 'Critical Alerts',
          icon: ShieldAlert,
          badge: alertsCount && alertsCount > 0 ? alertsCount : undefined,
          badgeClass: 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
        }
      ]
    },
    {
      title: 'INVESTIGATE',
      items: [
        { id: 'entities', label: 'Entity Explorer', icon: Boxes },
        { id: 'graph', label: 'Transaction Graph', icon: Network },
        { id: 'public-blockchain', label: 'Wallet Intelligence', icon: Wallet },
        { id: 'geo', label: 'Network Intelligence', icon: Globe }
      ]
    },
    {
      title: 'ANALYZE',
      items: [
        { id: 'ai-analysis', label: 'Threat Analytics', icon: Activity },
        {
          id: 'india-ops',
          label: 'India Priority Intelligence',
          icon: Flag
        },
        { id: 'investigation', label: 'Case Dossiers', icon: FileSearch }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'ingest', label: 'Data Sources', icon: Database },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-20 h-screen lg:h-[calc(100vh-3.5rem)] border-r border-[#1D2836] bg-[#111821] flex flex-col justify-between transition-all duration-200 select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-16' : 'w-60'}`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-[#1D2836] px-3.5 flex items-center justify-between bg-[#0E141C] shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-md bg-[#17212D] border border-[#2A3A4D] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-sky-400" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold tracking-tight text-slate-100 font-sans leading-none truncate">
                  BTC-SHIELD
                </div>
                <div className="text-[10px] text-slate-400 font-sans truncate mt-1">
                  Bitcoin Transaction Intelligence
                </div>
              </div>
            )}
          </div>
          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-200"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="p-2 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    id={`nav-item-${item.id}`}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-sans transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#17212D] text-sky-400 border border-[#2A3A4D] font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#151E2A] border border-transparent'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    />

                    {!collapsed && (
                      <span className={`truncate text-xs ${isActive ? 'text-slate-100 font-medium' : 'text-slate-300'}`}>
                        {item.label}
                      </span>
                    )}

                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          item.badgeClass || 'bg-[#0E141C] text-slate-400 border border-[#1D2836]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer / Collapse Toggle */}
        <div className="p-2 border-t border-[#1D2836] bg-[#0E141C] flex items-center justify-between shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-slate-400 font-sans">
                SOC Active
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            id="sidebar-toggle-btn"
            className="hidden lg:flex items-center justify-center p-1.5 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-400 hover:text-slate-200 border border-[#2A3A4D] transition-colors ml-auto cursor-pointer"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>
    </>
  );
};
