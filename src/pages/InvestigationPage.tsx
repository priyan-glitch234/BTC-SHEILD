import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSearch,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Network,
  Clock,
  CheckCircle2,
  Download,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  User,
  Calendar,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Globe,
  Building,
  Wallet,
  Activity,
  Zap,
  Radio,
  Eye
} from 'lucide-react';
import { API } from '../services/api.js';
import { 
  InvestigationDossier, 
  AlertItem, 
  AlertSeverity, 
  InvestigationStatus,
  SYNTHETIC_BTC_TO_INR 
} from '../types.js';

interface InvestigationPageProps {
  initialInvestigationId?: string;
  onSelectEntity: (entityId: string) => void;
  onExploreGraph: (entityId: string) => void;
  onSelectTransaction?: (txid: string) => void;
}

type SectionKey = 
  | 'summary' 
  | 'alerts' 
  | 'entities' 
  | 'transactions' 
  | 'graph' 
  | 'behavioral' 
  | 'timeline' 
  | 'india' 
  | 'notes';

export const InvestigationPage: React.FC<InvestigationPageProps> = ({
  initialInvestigationId,
  onSelectEntity,
  onExploreGraph,
  onSelectTransaction
}) => {
  const [dossier, setDossier] = useState<InvestigationDossier | null>(null);
  const [allInvestigations, setAllInvestigations] = useState<InvestigationDossier[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter & Search states for Cases Table
  const [caseSearch, setCaseSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Progressive Disclosure: Track which case detail sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    summary: true,
    alerts: true,
    entities: false,
    transactions: false,
    graph: false,
    behavioral: true,
    timeline: true,
    india: true,
    notes: false
  });

  // Timeline filters
  const [timelineDirectionFilter, setTimelineDirectionFilter] = useState<'ALL' | 'IN' | 'OUT' | 'OBSERVED'>('ALL');
  const [timelineSortOrder, setTimelineSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // Add Note & Update Status Form
  const [newNote, setNewNote] = useState('');
  const [analystName, setAnalystName] = useState('Senior Forensic Investigator');
  const [selectedStatusUpdate, setSelectedStatusUpdate] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState<string | null>(null);

  // Fetch investigations and alerts
  const fetchInvestigationData = async (targetId?: string) => {
    setLoading(true);
    try {
      const [invList, alertList] = await Promise.all([
        API.getInvestigations(),
        API.getAlerts()
      ]);
      setAllInvestigations(invList);
      setAlerts(alertList);

      const idToFetch = targetId || initialInvestigationId || (invList.length > 0 ? invList[0].id : 'current');
      const currentInv = await API.getInvestigation(idToFetch);
      setDossier(currentInv);
      setSelectedStatusUpdate(currentInv.status);
    } catch (err) {
      console.error('Failed to load investigation dossiers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigationData(initialInvestigationId);
  }, [initialInvestigationId]);

  const handleSelectCase = async (id: string) => {
    if (dossier?.id === id) return;
    setLoading(true);
    try {
      const selected = await API.getInvestigation(id);
      setDossier(selected);
      setSelectedStatusUpdate(selected.status);
      // Scroll smoothly to case detail
      const el = document.getElementById('case-detail-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.error(`Failed to fetch case ${id}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Progressive Disclosure: Toggle a single section
  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Progressive Disclosure: Expand All / Collapse All
  const setAllSections = (expand: boolean) => {
    setExpandedSections({
      summary: expand,
      alerts: expand,
      entities: expand,
      transactions: expand,
      graph: expand,
      behavioral: expand,
      timeline: expand,
      india: expand,
      notes: expand
    });
  };

  // Progressive Disclosure: Jump to specific section and auto-expand it
  const scrollToSection = (section: SectionKey) => {
    setExpandedSections(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      const el = document.getElementById(`section-${section}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Add Note & Update Status Handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    if (!newNote.trim() && selectedStatusUpdate === dossier.status) return;

    setIsSubmittingNote(true);
    try {
      const payload: { note?: string; author?: string; status?: string } = {
        author: analystName.trim() || 'Senior Investigator'
      };
      if (newNote.trim()) {
        payload.note = newNote.trim();
      }
      if (selectedStatusUpdate && selectedStatusUpdate !== dossier.status) {
        payload.status = selectedStatusUpdate;
      }

      const res = await API.updateInvestigation(dossier.id, payload);
      setDossier(res.investigation);
      setNewNote('');
      setNoteSuccessMessage('Investigation note and case status committed successfully.');
      setTimeout(() => setNoteSuccessMessage(null), 3500);

      // Refresh list to update status in case table
      const updatedList = await API.getInvestigations();
      setAllInvestigations(updatedList);
    } catch (err) {
      console.error('Failed to update case dossier:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Filtered cases for the Cases management table
  const filteredCases = useMemo(() => {
    return allInvestigations.filter(item => {
      const matchesSearch = 
        !caseSearch.trim() ||
        item.id.toLowerCase().includes(caseSearch.toLowerCase()) ||
        item.title.toLowerCase().includes(caseSearch.toLowerCase()) ||
        item.entityId.toLowerCase().includes(caseSearch.toLowerCase()) ||
        item.analyst.toLowerCase().includes(caseSearch.toLowerCase());

      const matchesSeverity = 
        severityFilter === 'ALL' || item.priority === severityFilter;

      const matchesStatus = 
        statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [allInvestigations, caseSearch, severityFilter, statusFilter]);

  // Associated Alerts for the active dossier
  const relatedAlerts = useMemo(() => {
    if (!dossier) return [];
    return alerts.filter(a => 
      a.entityId === dossier.entityId ||
      a.clusterId === dossier.clusterId ||
      a.relatedEntities.some(r => r.id === dossier.entityId)
    );
  }, [dossier, alerts]);

  // Filtered and Sorted Timeline items
  const processedTimeline = useMemo(() => {
    if (!dossier) return [];
    let list = [...dossier.timeline];

    if (timelineDirectionFilter !== 'ALL') {
      list = list.filter(t => t.direction === timelineDirectionFilter);
    }

    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timelineSortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [dossier, timelineDirectionFilter, timelineSortOrder]);

  // Severity style helper
  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-950/70 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-sky-950/70 text-sky-300 border-sky-500/40';
      case 'LOW':
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  // Status style helper
  const getStatusBadge = (status: InvestigationStatus | string) => {
    switch (status) {
      case 'UNDER_INVESTIGATION':
      case 'IN_PROGRESS':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40';
      case 'OPEN':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
      case 'ESCALATED':
        return 'bg-rose-950/70 text-rose-300 border-rose-500/40';
      case 'RESOLVED':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
      case 'ARCHIVED':
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const formatStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return isoStr;
    }
  };

  const formatRelativeTime = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return isoStr;
    }
  };

  if (loading && !dossier) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-300 font-sans">
        <div className="w-10 h-10 rounded-md bg-[#111821] border border-[#1D2836] flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
        </div>
        <p className="text-xs font-mono text-slate-400">
          Loading Cryptographic Case Management Registry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-xs text-slate-200 animate-in fade-in duration-200">
      {/* 1. Page Header & Key Metrics Bar */}
      <div className="p-5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-sky-500/30 font-mono text-[10px] font-bold">
                FORENSIC CASE MANAGEMENT
              </span>
              <span className="text-slate-400 text-[11px]">
                Active Operational Registry
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">
              Case Dossiers & Investigation Management
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-3xl">
              Cryptographic forensic case tracking, multi-hop entity attribution, and evidentiary chain compilation for compliance analysts and intelligence officers.
            </p>
          </div>

          {/* Global Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchInvestigationData(dossier?.id)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-200 font-medium border border-[#2A3A4D] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Registry</span>
            </button>

            {dossier && (
              <>
                <a
                  href={`/api/reports/${dossier.id}`}
                  download
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#17212D] hover:bg-[#1E2B3B] text-slate-200 font-medium border border-[#2A3A4D] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Export Report (.MD)</span>
                </a>

                <a
                  href={`/api/investigations/${dossier.id}/export/json`}
                  download
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-sky-950/40 hover:bg-sky-950/60 text-sky-300 font-medium border border-sky-500/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-sky-300" />
                  <span>Case Dossier (.JSON)</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Operational Statistics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 border-t border-[#1D2836]">
          <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Total Cases</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-slate-100">{allInvestigations.length}</span>
              <span className="text-[10px] text-slate-400">Indexed</span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Critical Severity</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-rose-400">
                {allInvestigations.filter(i => i.priority === 'CRITICAL').length}
              </span>
              <span className="text-[10px] text-rose-400/80">Immediate Action</span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Under Investigation</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-indigo-300">
                {allInvestigations.filter(i => i.status === 'UNDER_INVESTIGATION' || i.status === 'IN_PROGRESS').length}
              </span>
              <span className="text-[10px] text-slate-400">Assigned</span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Escalated</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400">
                {allInvestigations.filter(i => i.status === 'ESCALATED').length}
              </span>
              <span className="text-[10px] text-amber-400/80">Liaison Required</span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">India Linked</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400">
                {allInvestigations.filter(i => i.india_context?.is_india_linked).length}
              </span>
              <span className="text-[10px] text-slate-400">Corridor Traced</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cases Management Table (Cases, Case ID, Title, Severity, Status, Created, Last Updated, Assigned Investigator) */}
      <div className="p-5 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">
              Cases Registry ({filteredCases.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Select any case row to inspect full dossier
            </span>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                placeholder="Search ID, title, analyst..."
                className="pl-8 pr-3 py-1.5 rounded-md bg-[#111821] border border-[#1D2836] text-xs text-slate-200 outline-none placeholder:text-slate-500 w-44 md:w-56 focus:border-sky-500/50"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#111821] border border-[#1D2836] text-slate-300 text-xs outline-none cursor-pointer focus:border-sky-500/50"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#111821] border border-[#1D2836] text-slate-300 text-xs outline-none cursor-pointer focus:border-sky-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="OPEN">Open</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-md border border-[#1D2836]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111821] text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-[#1D2836]">
              <tr>
                <th className="py-2.5 px-3">Case ID</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3">Last Updated</th>
                <th className="py-2.5 px-3">Assigned Investigator</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2836] font-sans">
              {filteredCases.map((c) => {
                const isSelected = dossier?.id === c.id;
                return (
                  <tr
                    key={c.id}
                    onClick={() => handleSelectCase(c.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-sky-950/30 border-l-2 border-l-sky-400' 
                        : 'hover:bg-[#141C27]'
                    }`}
                  >
                    {/* Case ID */}
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={isSelected ? 'text-sky-300' : 'text-slate-300'}>
                          {c.id}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-sans">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200 max-w-sm md:max-w-md truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>Target: {c.entityId}</span>
                        {c.india_context?.is_india_linked && (
                          <span className="text-amber-400 font-sans">🇮🇳 India Corridor</span>
                        )}
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(c.status)}`}>
                        {formatStatusLabel(c.status)}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-slate-300 text-[11px]">
                        {formatRelativeTime(c.updatedAt)}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {formatDate(c.updatedAt).split(',')[0]}
                      </span>
                    </td>

                    {/* Assigned Investigator */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-200 font-medium text-[11px]">
                          {c.analyst}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCase(c.id);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'bg-sky-600 text-white'
                            : 'bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 border border-[#2A3A4D]'
                        }`}
                      >
                        {isSelected ? 'Inspecting' : 'Open Dossier'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No investigation cases matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. CASE DETAIL CONTAINER */}
      {dossier && (
        <div id="case-detail-container" className="space-y-4 pt-2">
          {/* Progressive Disclosure Navigation & Command Bar */}
          <div className="p-4 rounded-md bg-[#0E141C] border border-[#1D2836] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/30 text-[10px] font-bold font-mono">
                  CASE DOSSIER: {dossier.id}
                </span>
                <span className="text-slate-300 font-bold text-xs truncate max-w-md">
                  {dossier.title}
                </span>
              </div>

              {/* Progressive Disclosure: Global Expand/Collapse controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAllSections(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#111821] hover:bg-[#17212D] text-slate-300 text-[11px] border border-[#1D2836] transition-colors"
                >
                  <Maximize2 className="w-3 h-3 text-sky-400" />
                  <span>Expand All</span>
                </button>
                <button
                  onClick={() => setAllSections(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#111821] hover:bg-[#17212D] text-slate-300 text-[11px] border border-[#1D2836] transition-colors"
                >
                  <Minimize2 className="w-3 h-3 text-slate-400" />
                  <span>Collapse All</span>
                </button>
              </div>
            </div>

            {/* Quick Section Jump Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1D2836]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Jump to:</span>

              <button
                onClick={() => scrollToSection('summary')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.summary ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Case Summary
              </button>

              <button
                onClick={() => scrollToSection('alerts')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.alerts ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Alert Sources ({relatedAlerts.length})
              </button>

              <button
                onClick={() => scrollToSection('entities')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.entities ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Entities ({dossier.connectedEntitiesSummary.walletsCount + dossier.connectedEntitiesSummary.ipsCount})
              </button>

              <button
                onClick={() => scrollToSection('transactions')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.transactions ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Transactions ({dossier.timeline.length})
              </button>

              <button
                onClick={() => scrollToSection('graph')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.graph ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Transaction Graph ({dossier.graphData.nodes.length} Nodes)
              </button>

              <button
                onClick={() => scrollToSection('behavioral')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.behavioral ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Behavioral Evidence ({dossier.evidence.length})
              </button>

              <button
                onClick={() => scrollToSection('timeline')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.timeline ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Timeline ({dossier.timeline.length} Events)
              </button>

              <button
                onClick={() => scrollToSection('india')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.india ? 'bg-amber-950/50 text-amber-300 border border-amber-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                India Relevance {dossier.india_context?.is_india_linked ? '🇮🇳' : ''}
              </button>

              <button
                onClick={() => scrollToSection('notes')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  expandedSections.notes ? 'bg-sky-950/50 text-sky-300 border border-sky-500/40' : 'bg-[#111821] text-slate-400 hover:text-slate-200 border border-[#1D2836]'
                }`}
              >
                Investigation Notes ({dossier.notes.length})
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 1: CASE SUMMARY */}
          {/* ---------------------------------------------------- */}
          <div id="section-summary" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('summary')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  1. Case Summary
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(dossier.priority)}`}>
                  {dossier.priority}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(dossier.status)}`}>
                  {formatStatusLabel(dossier.status)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Assigned: {dossier.analyst}
                </span>
                {expandedSections.summary ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.summary && (
              <div className="p-5 space-y-4 font-sans">
                {/* Executive Summary Statement */}
                <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] text-slate-200 text-xs leading-relaxed">
                  <span className="font-bold text-slate-300 block mb-1">Executive Synopsis:</span>
                  {dossier.summary}
                </div>

                {/* Target Entity & Core Analytical Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Target Entity Card */}
                  <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Primary Target</span>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onSelectEntity(dossier.entityId)}
                        className="font-mono font-bold text-sky-400 hover:text-sky-300 hover:underline text-xs flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{dossier.entityId}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </button>
                      <button
                        onClick={() => handleCopy(dossier.entityId, 'target')}
                        className="p-1 hover:bg-[#1D2836] rounded text-slate-400"
                        title="Copy Entity ID"
                      >
                        {copiedId === 'target' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Type: {dossier.entityType.toUpperCase()}</span>
                  </div>

                  {/* Risk Score */}
                  <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Risk Score</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xl font-bold font-mono ${
                        dossier.riskScore >= 75 ? 'text-rose-400' : dossier.riskScore >= 50 ? 'text-amber-400' : 'text-slate-200'
                      }`}>
                        {dossier.riskScore}
                      </span>
                      <span className="text-[10px] text-slate-400">/ 100</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-auto">
                        Band: {dossier.priority}
                      </span>
                    </div>
                    <div className="w-full bg-[#1D2836] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${dossier.riskScore >= 75 ? 'bg-rose-500' : dossier.riskScore >= 50 ? 'bg-amber-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.min(100, dossier.riskScore)}%` }}
                      />
                    </div>
                  </div>

                  {/* ML Isolation Forest Anomaly Score */}
                  <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Isolation Forest</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-sky-400">
                        {dossier.mlAnomalyScore.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400">anomaly score</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {dossier.mlAnomalyScore >= 0.7 ? 'High Anomaly Threshold' : 'Standard Baseline'}
                    </span>
                  </div>

                  {/* DBSCAN Cluster */}
                  <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Behavioral Cohort</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold font-mono text-indigo-300">
                        {dossier.clusterId === -1 ? 'Isolated Anomaly' : `Cluster #${dossier.clusterId}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      DBSCAN Density Partition
                    </span>
                  </div>
                </div>

                {/* Case Operational Metadata & Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Classification Tags:</span>
                  {dossier.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#17212D] text-slate-300 border border-[#2A3A4D]"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-500 font-mono ml-auto">
                    Opened: {formatDate(dossier.createdAt)} | Updated: {formatDate(dossier.updatedAt)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 2: ALERT SOURCES */}
          {/* ---------------------------------------------------- */}
          <div id="section-alerts" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('alerts')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  2. Alert Sources ({relatedAlerts.length})
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Detection triggers & rule activations
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.alerts ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.alerts && (
              <div className="p-5 space-y-3 font-sans">
                {relatedAlerts.length > 0 ? (
                  <div className="space-y-2.5">
                    {relatedAlerts.map(alt => (
                      <div
                        key={alt.id}
                        className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(alt.severity)}`}>
                              {alt.severity}
                            </span>
                            <span className="font-mono font-bold text-slate-200 text-xs">
                              {alt.id}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              Rule: {alt.modelVersion}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Detected: {formatDate(alt.timestamp)}
                          </div>
                        </div>

                        {/* Alert Reasons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-xs">
                          {alt.reasons.map((r, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-400">•</span>
                              <span className="text-[11px] leading-relaxed">{r}</span>
                            </div>
                          ))}
                        </div>

                        {/* Alert Confidence & Evidence list */}
                        {alt.evidence && alt.evidence.length > 0 && (
                          <div className="pt-1 text-[11px] text-slate-400 border-t border-[#1D2836] flex flex-wrap gap-2">
                            <span className="font-semibold text-slate-300">Confidence: {alt.confidence}%</span>
                            <span>•</span>
                            <span>Heuristic Evidence: {alt.evidence.join('; ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] text-slate-400 text-xs space-y-1">
                    <p>No standalone alerts directly indexed for target entity {dossier.entityId}.</p>
                    <p className="text-[11px] text-slate-500">
                      This investigation was compiled from unsupervised Isolation Forest anomaly telemetry and DBSCAN cluster analysis.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 3: ENTITIES */}
          {/* ---------------------------------------------------- */}
          <div id="section-entities" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('entities')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  3. Entities & Network Footprint
                </h3>
                <span className="text-slate-400 text-[11px]">
                  {dossier.connectedEntitiesSummary.walletsCount} Wallets, {dossier.connectedEntitiesSummary.ipsCount} IP Nodes, {dossier.connectedEntitiesSummary.asnsCount} ASNs
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.entities ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.entities && (
              <div className="p-5 space-y-4 font-sans">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Counterparty Wallets</span>
                    <span className="text-lg font-bold font-mono text-sky-400 mt-0.5 block">
                      {dossier.connectedEntitiesSummary.walletsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">Direct In/Out Links</span>
                  </div>

                  <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Connected IP Nodes</span>
                    <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                      {dossier.connectedEntitiesSummary.ipsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">Gossip Relay Endpoints</span>
                  </div>

                  <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Autonomous Systems</span>
                    <span className="text-lg font-bold font-mono text-indigo-300 mt-0.5 block">
                      {dossier.connectedEntitiesSummary.asnsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">Routing Networks</span>
                  </div>

                  <div className="p-3 rounded-md bg-[#111821] border border-[#1D2836]">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Jurisdictions</span>
                    <span className="text-lg font-bold font-mono text-amber-400 mt-0.5 block">
                      {dossier.connectedEntitiesSummary.countriesCount}
                    </span>
                    <span className="text-[10px] text-slate-400">Observed Countries</span>
                  </div>
                </div>

                {/* Subgraph Nodes breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-200">Correlated Entity Identifiers:</span>
                  <div className="flex flex-wrap gap-2">
                    {dossier.graphData.nodes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => onSelectEntity(n.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono border transition-colors ${
                          n.id === dossier.entityId
                            ? 'bg-sky-950/80 text-sky-300 border-sky-500/50'
                            : n.type === 'ip'
                            ? 'bg-[#111821] text-emerald-300 hover:bg-[#17212D] border-[#1D2836]'
                            : 'bg-[#111821] text-slate-300 hover:bg-[#17212D] border-[#1D2836]'
                        }`}
                      >
                        {n.type === 'wallet' ? (
                          <Wallet className="w-3 h-3 text-sky-400 shrink-0" />
                        ) : n.type === 'ip' ? (
                          <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[160px]">{n.label || n.id}</span>
                        <span className="text-[9px] text-slate-500 uppercase">({n.type})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 4: TRANSACTIONS */}
          {/* ---------------------------------------------------- */}
          <div id="section-transactions" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('transactions')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  4. Transactions ({dossier.timeline.length})
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Observed Bitcoin UTXO transfers
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.transactions ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.transactions && (
              <div className="p-5 space-y-3 font-sans">
                <div className="overflow-x-auto rounded-md border border-[#1D2836]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#111821] text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-[#1D2836]">
                      <tr>
                        <th className="py-2.5 px-3">Direction</th>
                        <th className="py-2.5 px-3">Transaction ID</th>
                        <th className="py-2.5 px-3">Amount (BTC)</th>
                        <th className="py-2.5 px-3">Est. Value (INR)</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Forensic Role</th>
                        <th className="py-2.5 px-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2836] font-sans">
                      {dossier.timeline.map((tx, idx) => {
                        const inrVal = tx.amount * SYNTHETIC_BTC_TO_INR;
                        const inrFormatted = inrVal >= 10000000 
                          ? `₹${(inrVal / 10000000).toFixed(2)} Cr`
                          : `₹${(inrVal / 100000).toFixed(2)} L`;

                        return (
                          <tr key={idx} className="hover:bg-[#141C27] transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                tx.direction === 'IN'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                              }`}>
                                {tx.direction === 'IN' ? (
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3 text-rose-400" />
                                )}
                                <span>{tx.direction}</span>
                              </span>
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[140px] md:max-w-[200px]" title={tx.txid}>
                                  {tx.txid}
                                </span>
                                <button
                                  onClick={() => handleCopy(tx.txid, `tx-${idx}`)}
                                  className="p-1 hover:bg-[#1D2836] rounded text-slate-400"
                                  title="Copy TXID"
                                >
                                  {copiedId === `tx-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                              {tx.amount.toFixed(4)} BTC
                            </td>

                            <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                              {inrFormatted}
                            </td>

                            <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                              {formatDate(tx.timestamp)}
                            </td>

                            <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                              {tx.description}
                            </td>

                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {onSelectTransaction ? (
                                <button
                                  onClick={() => onSelectTransaction(tx.txid)}
                                  className="px-2 py-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-sky-300 text-[10px] border border-[#2A3A4D]"
                                >
                                  View TX
                                </button>
                              ) : (
                                <button
                                  onClick={() => onSelectEntity(dossier.entityId)}
                                  className="px-2 py-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 text-[10px] border border-[#2A3A4D]"
                                >
                                  Trace Entity
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 5: TRANSACTION GRAPH */}
          {/* ---------------------------------------------------- */}
          <div id="section-graph" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('graph')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Network className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  5. Transaction Graph Topology
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Local 2-hop correlation network ({dossier.graphData.nodes.length} Nodes)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.graph ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.graph && (
              <div className="p-5 space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-md bg-[#111821] border border-[#1D2836]">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-200 text-xs">
                      Local 2-Hop Correlation Subgraph
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Target wallet is correlated with {dossier.connectedEntitiesSummary.walletsCount} counterparties and {dossier.connectedEntitiesSummary.ipsCount} IP endpoints across {dossier.connectedEntitiesSummary.countriesCount} jurisdictions.
                    </p>
                  </div>

                  <button
                    onClick={() => onExploreGraph(dossier.entityId)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shrink-0"
                  >
                    <span>Open in Full Graph Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Graph Topology Node Badges */}
                <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Active Subgraph Nodes ({dossier.graphData.nodes.length}):</span>
                    <span>Click any node to open detailed entity analysis</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {dossier.graphData.nodes.map(n => (
                      <div
                        key={n.id}
                        onClick={() => onSelectEntity(n.id)}
                        className="p-2.5 rounded-md bg-[#141C27] hover:bg-[#1B2635] border border-[#1D2836] cursor-pointer transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {n.type === 'wallet' ? (
                            <Wallet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-mono text-[11px] text-slate-200 block truncate">
                              {n.label}
                            </span>
                            <span className="text-[9px] text-slate-500 uppercase">
                              {n.type} • Degree {n.degree || 1}
                            </span>
                          </div>
                        </div>

                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                          n.riskScore >= 75 ? 'bg-rose-950 text-rose-300' : 'bg-slate-900 text-slate-400'
                        }`}>
                          Risk {n.riskScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 6: BEHAVIORAL EVIDENCE */}
          {/* ---------------------------------------------------- */}
          <div id="section-behavioral" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('behavioral')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  6. Behavioral Evidence ({dossier.evidence.length})
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Isolation Forest feature contributions & heuristic flags
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.behavioral ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.behavioral && (
              <div className="p-5 space-y-4 font-sans">
                {/* AI Explanation Headline & Key Points */}
                <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                    <Cpu className="w-4 h-4" />
                    <span>{dossier.aiExplanation.headline}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {dossier.aiExplanation.keyPoints.map((point, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-md bg-[#141C27] border border-[#1D2836] flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200 text-xs leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-md bg-sky-950/20 border border-sky-500/20 text-slate-300 text-xs leading-relaxed">
                    <span className="font-bold text-sky-300 block mb-1">Technical Assessment Narrative:</span>
                    {dossier.aiExplanation.technicalNarrative}
                  </div>
                </div>

                {/* Evidence Checklist Items */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-200">Formal Evidence Points:</span>
                  {dossier.evidence.map(ev => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sky-400 font-bold text-xs">{ev.id}</span>
                          <span className="text-slate-200 font-bold text-xs">{ev.title}</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">{ev.detail}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] shrink-0 border ${getSeverityBadge(ev.severity)}`}>
                        {ev.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 7: EVIDENCE TIMELINE */}
          {/* ---------------------------------------------------- */}
          <div id="section-timeline" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('timeline')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  7. Evidence Timeline ({processedTimeline.length} Events)
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Chronological progression of observed transfers and telemetry events
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.timeline ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.timeline && (
              <div className="p-5 space-y-4 font-sans">
                {/* Timeline Direction & Sorting Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-[#111821] border border-[#1D2836]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Filter Direction:</span>
                    <div className="flex items-center gap-1">
                      {(['ALL', 'IN', 'OUT'] as const).map(dir => (
                        <button
                          key={dir}
                          onClick={() => setTimelineDirectionFilter(dir)}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                            timelineDirectionFilter === dir
                              ? 'bg-sky-600 text-white'
                              : 'bg-[#17212D] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {dir === 'ALL' ? 'All Events' : dir === 'IN' ? 'Inbound (+)' : 'Outbound (-)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Sort:</span>
                    <button
                      onClick={() => setTimelineSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                      className="px-2.5 py-1 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 text-[10px] border border-[#2A3A4D] font-mono"
                    >
                      {timelineSortOrder === 'DESC' ? 'Newest First ↓' : 'Oldest First ↑'}
                    </button>
                  </div>
                </div>

                {/* Vertical Evidence Timeline Track */}
                <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1D2836]">
                  {processedTimeline.map((item, idx) => {
                    const inrVal = item.amount * SYNTHETIC_BTC_TO_INR;
                    const inrFormatted = inrVal >= 10000000 
                      ? `₹${(inrVal / 10000000).toFixed(2)} Cr`
                      : `₹${(inrVal / 100000).toFixed(2)} L`;

                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline Marker Dot */}
                        <div className={`absolute -left-6 sm:-left-8 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          item.direction === 'IN'
                            ? 'bg-[#0E141C] border-emerald-400 text-emerald-400'
                            : 'bg-[#0E141C] border-rose-400 text-rose-400'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.direction === 'IN' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        </div>

                        {/* Event Card */}
                        <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] hover:border-[#2A3A4D] transition-colors space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                item.direction === 'IN'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                              }`}>
                                {item.direction === 'IN' ? 'INBOUND FLOW' : 'OUTBOUND DISPERSION'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {formatDate(item.timestamp)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({formatRelativeTime(item.timestamp)})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 font-mono">
                              <span className={`text-xs font-bold ${item.direction === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.direction === 'IN' ? '+' : '-'}{item.amount.toFixed(4)} BTC
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                ({inrFormatted})
                              </span>
                            </div>
                          </div>

                          <p className="text-slate-200 text-xs font-medium leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1D2836] text-[10px] font-mono text-slate-400">
                            <div className="flex items-center gap-1.5 truncate max-w-md">
                              <span>TXID:</span>
                              <span className="text-slate-300 truncate">{item.txid}</span>
                              <button
                                onClick={() => handleCopy(item.txid, `tl-${idx}`)}
                                className="p-0.5 hover:bg-[#1D2836] rounded text-slate-400"
                                title="Copy TXID"
                              >
                                {copiedId === `tl-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>

                            <span className="text-slate-500">
                              Block Verified // Offline Benchmark
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {processedTimeline.length === 0 && (
                    <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] text-slate-400 text-xs">
                      No timeline events match the selected direction filter.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 8: INDIA RELEVANCE */}
          {/* ---------------------------------------------------- */}
          <div id="section-india" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('india')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  8. India Relevance & Jurisdictional Corridors
                </h3>
                {dossier.india_context?.is_india_linked ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
                    🇮🇳 MONITORED CORRIDOR
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-700">
                    INTERNATIONAL PROFILE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.india ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.india && (
              <div className="p-5 space-y-4 font-sans">
                {dossier.india_context?.is_india_linked ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Regional Endpoint */}
                      <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Regional Endpoint
                        </span>
                        <span className="text-base font-bold text-slate-100 block">
                          {dossier.india_context.city}, {dossier.india_context.state}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Region: {dossier.india_context.region} India Zone
                        </span>
                      </div>

                      {/* Corridor Link Type */}
                      <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Corridor Link Type
                        </span>
                        <span className="text-base font-bold text-amber-300 block">
                          {dossier.india_context.link_type}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Attribution: Relay & Gateway Telemetry
                        </span>
                      </div>

                      {/* Estimated INR Volume */}
                      <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Correlated INR Volume
                        </span>
                        <span className="text-base font-bold font-mono text-emerald-400 block">
                          ₹{((dossier.india_context.estimated_inr || dossier.india_context.valueINR || 0) / 10000000).toFixed(2)} Cr
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Benchmark Fixed Conversion Rate
                        </span>
                      </div>
                    </div>

                    {/* Infrastructure & Autonomous Systems */}
                    <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-2">
                      <span className="text-xs font-bold text-slate-200 block">
                        Observed Domestic Telemetry & Transit ASNs:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Activity correlates with autonomous transit routing across major domestic service providers (including observed endpoints on Bharti Airtel AS9498, Reliance Jio AS55836, and Tata Communications AS4755).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] text-slate-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span>Pure International Transit Profile</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      No direct domestic Indian IP endpoints or exchange gateways were correlated with this target entity. Observed network telemetry is routed through international proxy hubs in Frankfurt, Singapore, and Zurich.
                    </p>
                  </div>
                )}

                {/* Regulatory Disclaimer Banner */}
                <div className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-300 block mb-0.5">
                      ANALYTICAL ATTRIBUTION STANDARDS
                    </span>
                    Pseudonymous Bitcoin on-chain transactions do not encode legal nationality or citizenship. Regional associations reflect network propagation telemetry and exchange fiat-gateway corridors for investigatory triage purposes only.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* SECTION 9: INVESTIGATION NOTES */}
          {/* ---------------------------------------------------- */}
          <div id="section-notes" className="rounded-md bg-[#0E141C] border border-[#1D2836] overflow-hidden">
            <div
              onClick={() => toggleSection('notes')}
              className="p-4 bg-[#111821] border-b border-[#1D2836] flex items-center justify-between cursor-pointer hover:bg-[#141C27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-xs tracking-wide uppercase">
                  9. Investigation Notes & Case Log ({dossier.notes.length})
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Forensic remarks & supervisory status updates
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.notes ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.notes && (
              <div className="p-5 space-y-4 font-sans">
                {/* Notes History */}
                <div className="space-y-2.5">
                  {dossier.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-md bg-[#111821] border border-[#1D2836] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-slate-200 font-bold">{note.author}</span>
                        </div>
                        <span className="text-slate-500 font-mono">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed pl-5.5">
                        {note.text}
                      </p>
                    </div>
                  ))}

                  {dossier.notes.length === 0 && (
                    <div className="p-4 rounded-md bg-[#111821] border border-[#1D2836] text-slate-400 text-xs text-center">
                      No analyst remarks logged for this case yet. Use the form below to append observations.
                    </div>
                  )}
                </div>

                {/* Add Note & Update Status Form */}
                <form onSubmit={handleAddNote} className="p-4 rounded-md bg-[#111821] border border-[#1D2836] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-200 text-xs">
                      Append Forensic Note & Update Case Status
                    </h4>
                    {noteSuccessMessage && (
                      <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {noteSuccessMessage}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Investigator Callsign / Unit:
                      </label>
                      <input
                        type="text"
                        value={analystName}
                        onChange={(e) => setAnalystName(e.target.value)}
                        placeholder="e.g. Senior Forensic Investigator"
                        className="w-full px-3 py-2 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 outline-none text-xs focus:border-sky-500/50"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Update Case Progression Status:
                      </label>
                      <select
                        value={selectedStatusUpdate}
                        onChange={(e) => setSelectedStatusUpdate(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 outline-none text-xs cursor-pointer focus:border-sky-500/50"
                      >
                        <option value="UNDER_INVESTIGATION">Under Investigation</option>
                        <option value="OPEN">Open</option>
                        <option value="ESCALATED">Escalated</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Forensic Case Note / Evidence Log:
                    </label>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      placeholder="Record investigative findings, corroborating IP endpoints, law enforcement liaison requests, or chain of custody notes..."
                      className="w-full px-3 py-2 rounded-md bg-[#0E141C] border border-[#1D2836] text-slate-200 outline-none text-xs focus:border-sky-500/50"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingNote}
                      className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                    >
                      {isSubmittingNote ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Note...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Commit Note & Status</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
