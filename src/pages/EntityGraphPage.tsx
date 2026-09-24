import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Filter,
  Search,
  Route,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Check,
  ExternalLink,
  X,
  ChevronRight,
  SlidersHorizontal,
  Eye,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Activity,
  Boxes,
  Radio,
  Globe,
  Building2,
  ArrowDownRight,
  Flame,
  CornerDownRight
} from 'lucide-react';
import { API } from '../services/api.js';
import {
  EntityGraphData,
  EntityGraphNode,
  EntityGraphEdge,
  EntityType,
  EntityDetail,
  NormalizedTransaction,
  AlertItem
} from '../types.js';

interface EntityGraphPageProps {
  initialCenterId?: string;
  onSelectEntity: (entityId: string) => void;
  onOpenInvestigation: (entityId: string) => void;
  onSelectTransaction?: (txid: string) => void;
  onNavigateAlert?: (alertId?: string) => void;
}

interface SimNode extends EntityGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

type NodeCategory = 'wallet' | 'transaction' | 'exchange' | 'entity' | 'flagged';

type WorkflowStep = 'node' | 'transaction' | 'entity' | 'alert';

export const EntityGraphPage: React.FC<EntityGraphPageProps> = ({
  initialCenterId,
  onSelectEntity,
  onOpenInvestigation,
  onSelectTransaction,
  onNavigateAlert
}) => {
  // Graph parameters
  const [centerId, setCenterId] = useState<string>(initialCenterId || '');
  const [hops, setHops] = useState<number>(2);
  const [maxNodes, setMaxNodes] = useState<number>(65);
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('');
  const [minRiskFilter, setMinRiskFilter] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Search in focus
  const [focusInput, setFocusInput] = useState<string>(initialCenterId || '');

  // Raw and simulated data
  const [graphData, setGraphData] = useState<EntityGraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState<boolean>(false);

  // Selected Node & Details
  const [selectedNode, setSelectedNode] = useState<EntityGraphNode | null>(null);
  const [selectedEntityDetail, setSelectedEntityDetail] = useState<EntityDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Associated ledger transactions for selected node
  const [nodeTransactions, setNodeTransactions] = useState<NormalizedTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState<boolean>(false);

  // Associated alerts for selected node
  const [nodeAlerts, setNodeAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

  // Active Transaction being inspected in the workflow
  const [activeWorkflowTx, setActiveWorkflowTx] = useState<NormalizedTransaction | null>(null);

  // Investigation Workflow progression state
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('node');

  // Path finder state
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [pathSearching, setPathSearching] = useState<boolean>(false);
  const [pathError, setPathError] = useState<string | null>(null);

  // Canvas / SVG transformation
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Copy feedback state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const [, setRenderTrigger] = useState(0);

  // Helper: check if a node is an Exchange
  const isExchangeNode = (node: EntityGraphNode): boolean => {
    if (node.metadata?.is_exchange || node.metadata?.service_type === 'exchange') return true;
    const label = (node.label || '').toLowerCase();
    const id = (node.id || '').toLowerCase();
    const org = (node.metadata?.organization || '').toLowerCase();
    const exchangeKeywords = [
      'exchange', 'wazirx', 'coindcx', 'binance', 'zebpay', 'kraken',
      'coinbase', 'bitfinex', 'huobi', 'okx', 'kucoin', 'hot wallet',
      'deposit', 'vasp', 'custody'
    ];
    return exchangeKeywords.some(kw => label.includes(kw) || id.includes(kw) || org.includes(kw));
  };

  // Helper: determine node category
  const getNodeCategory = (node: EntityGraphNode): NodeCategory => {
    if (node.riskScore >= 80 || (node.metadata && node.metadata.is_flagged)) {
      return 'flagged';
    }
    if (isExchangeNode(node)) {
      return 'exchange';
    }
    if (node.type === 'transaction') {
      return 'transaction';
    }
    if (node.type === 'wallet') {
      return 'wallet';
    }
    return 'entity'; // ip, asn, country
  };

  // Fetch graph data from backend
  const fetchGraph = async (forcedCenterId?: string) => {
    setLoading(true);
    const targetCenter = forcedCenterId !== undefined ? forcedCenterId : centerId;
    try {
      const data = await API.getGraph({
        centerId: targetCenter || undefined,
        hops,
        maxNodes,
        nodeType: nodeTypeFilter || undefined,
        minRisk: minRiskFilter
      });

      // Filter by category if user selected specific category filter
      let filteredNodes = data.nodes;
      if (categoryFilter !== 'ALL') {
        filteredNodes = data.nodes.filter(n => {
          const cat = getNodeCategory(n);
          return cat === categoryFilter;
        });
      }

      const validNodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredEdges = data.edges.filter(
        e => validNodeIds.has(e.source) && validNodeIds.has(e.target)
      );

      const resolvedData = {
        nodes: filteredNodes,
        edges: filteredEdges
      };

      setGraphData(resolvedData);
      initializeSimulation(resolvedData);

      // Auto-select center node or highest risk node if none selected
      if (resolvedData.nodes.length > 0) {
        if (targetCenter) {
          const cNode = resolvedData.nodes.find(n => n.id === targetCenter);
          if (cNode) setSelectedNode(cNode);
        } else if (!selectedNode) {
          // Select highest risk node
          const sorted = [...resolvedData.nodes].sort((a, b) => b.riskScore - a.riskScore);
          setSelectedNode(sorted[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [centerId, hops, maxNodes, nodeTypeFilter, minRiskFilter, categoryFilter]);

  // Load detailed entity intel, transactions, and alerts when selectedNode changes
  useEffect(() => {
    if (!selectedNode) {
      setSelectedEntityDetail(null);
      setNodeTransactions([]);
      setNodeAlerts([]);
      setActiveWorkflowTx(null);
      setWorkflowStep('node');
      return;
    }

    let isMounted = true;
    setLoadingDetail(true);
    setLoadingTx(true);
    setLoadingAlerts(true);
    setActiveWorkflowTx(null);
    setWorkflowStep('node');

    const cleanId = selectedNode.label || selectedNode.id.replace(/^[a-z]+:/, '');

    // 1. Fetch Entity Detail
    API.getEntityDetail(selectedNode.id)
      .then(detail => {
        if (isMounted) setSelectedEntityDetail(detail);
      })
      .catch(() => {
        if (isMounted) setSelectedEntityDetail(null);
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    // 2. Fetch Associated Transactions
    API.getTransactions({ search: cleanId, limit: 12 })
      .then(res => {
        if (isMounted) {
          setNodeTransactions(res.data);
          if (selectedNode.type === 'transaction' && res.data.length > 0) {
            setActiveWorkflowTx(res.data[0]);
          }
        }
      })
      .catch(() => {
        if (isMounted) setNodeTransactions([]);
      })
      .finally(() => {
        if (isMounted) setLoadingTx(false);
      });

    // 3. Fetch Associated Alerts
    API.getAlerts({ search: cleanId })
      .then(alerts => {
        if (isMounted) setNodeAlerts(alerts);
      })
      .catch(() => {
        if (isMounted) setNodeAlerts([]);
      })
      .finally(() => {
        if (isMounted) setLoadingAlerts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedNode?.id]);

  // Physics Force Simulation in Pure Fast Math
  const initializeSimulation = (data: EntityGraphData) => {
    const width = 1000;
    const height = 700;
    const nodesMap = new Map<string, SimNode>();

    data.nodes.forEach((node, idx) => {
      const existing = simNodesRef.current.get(node.id);
      const angle = (idx / Math.max(1, data.nodes.length)) * 2 * Math.PI;
      const radius = 180 + (Math.random() * 90);
      nodesMap.set(node.id, {
        ...node,
        x: existing ? existing.x : width / 2 + Math.cos(angle) * radius,
        y: existing ? existing.y : height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      });
    });

    simNodesRef.current = nodesMap;

    // Run force simulation iterations
    for (let step = 0; step < 75; step++) {
      const nodes = Array.from(nodesMap.values());

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 280) {
            const force = ((280 - dist) / dist) * 0.45;
            nodes[i].vx -= dx * force;
            nodes[i].vy -= dy * force;
            nodes[j].vx += dx * force;
            nodes[j].vy += dy * force;
          }
        }
      }

      // Attraction along edges
      data.edges.forEach((edge) => {
        const source = nodesMap.get(edge.source);
        const target = nodesMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 120;
          const force = (dist - desiredDist) * 0.045;
          source.vx += (dx / dist) * force;
          source.vy += (dy / dist) * force;
          target.vx -= (dx / dist) * force;
          target.vy -= (dy / dist) * force;
        }
      });

      // Center gravity force
      nodes.forEach((node) => {
        node.vx += (width / 2 - node.x) * 0.018;
        node.vy += (height / 2 - node.y) * 0.018;

        // Apply velocity with damping
        node.x += node.vx * 0.4;
        node.y += node.vy * 0.4;
        node.vx *= 0.72;
        node.vy *= 0.72;
      });
    }

    setRenderTrigger(t => t + 1);
  };

  // Find Path between source and target
  const handleFindPath = async () => {
    if (!pathSource || !pathTarget) return;
    setPathSearching(true);
    setPathError(null);
    try {
      const res = await API.findPath(pathSource.trim(), pathTarget.trim());
      if (res.found && res.path) {
        setHighlightedPath(res.path);
      } else {
        setPathError(`No direct or indirect traversal path found between nodes.`);
      }
    } catch (err: any) {
      setPathError('Failed to compute path. Ensure valid node IDs.');
    } finally {
      setPathSearching(false);
    }
  };

  // Node Color & Shape Styling Helper
  // Strictly restrained colors: Sky (Wallets), Indigo (Transactions), Emerald (Exchanges), Slate (Entities), Red (Flagged)
  const getNodeColorConfig = (node: EntityGraphNode) => {
    const category = getNodeCategory(node);
    switch (category) {
      case 'flagged':
        return {
          stroke: '#f43f5e', // Red
          fill: '#1e1017',
          glow: '#f43f5e',
          badgeText: 'FLAGGED',
          badgeBg: 'bg-red-950/60 text-red-300 border-red-800'
        };
      case 'exchange':
        return {
          stroke: '#34d399', // Emerald
          fill: '#0d1f18',
          glow: '#34d399',
          badgeText: 'EXCHANGE',
          badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
        };
      case 'transaction':
        return {
          stroke: '#818cf8', // Indigo
          fill: '#131526',
          glow: '#818cf8',
          badgeText: 'TRANSACTION',
          badgeBg: 'bg-indigo-950/60 text-indigo-300 border-indigo-800'
        };
      case 'wallet':
        return {
          stroke: '#38bdf8', // Sky
          fill: '#0c1724',
          glow: '#38bdf8',
          badgeText: 'WALLET',
          badgeBg: 'bg-sky-950/60 text-sky-300 border-sky-800'
        };
      case 'entity':
      default:
        return {
          stroke: node.riskScore >= 60 ? '#f59e0b' : '#94a3b8', // Amber or Slate
          fill: '#131922',
          glow: node.riskScore >= 60 ? '#f59e0b' : '#94a3b8',
          badgeText: node.type.toUpperCase(),
          badgeBg: 'bg-slate-900 text-slate-300 border-slate-700'
        };
    }
  };

  const getNodeRadius = (node: EntityGraphNode) => {
    if (node.id === centerId) return 18;
    const base = 9;
    const riskBonus = Math.min(8, (node.riskScore / 100) * 7);
    const degreeBonus = Math.min(5, (node.degree / 20) * 4);
    return base + riskBonus + degreeBonus;
  };

  // Pan & Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'rect') {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSetCenter = (nodeId: string) => {
    setCenterId(nodeId);
    setFocusInput(nodeId);
    resetView();
  };

  const handleClearCenter = () => {
    setCenterId('');
    setFocusInput('');
    resetView();
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Recent';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch {
      return ts;
    }
  };

  // Derive incoming and outgoing transactions / edges from local graph topology
  const getIncomingEdges = () => {
    if (!selectedNode) return [];
    return graphData.edges.filter(e => e.target === selectedNode.id);
  };

  const getOutgoingEdges = () => {
    if (!selectedNode) return [];
    return graphData.edges.filter(e => e.source === selectedNode.id);
  };

  const getConnectedEntities = () => {
    if (!selectedNode) return [];
    const entityIds = new Set<string>();
    graphData.edges.forEach(e => {
      if (e.source === selectedNode.id) entityIds.add(e.target);
      if (e.target === selectedNode.id) entityIds.add(e.source);
    });
    return Array.from(entityIds)
      .map(id => graphData.nodes.find(n => n.id === id))
      .filter((n): n is EntityGraphNode => n !== undefined);
  };

  const incomingEdges = getIncomingEdges();
  const outgoingEdges = getOutgoingEdges();
  const connectedEntitiesList = getConnectedEntities();

  const isCriticalRisk = (score: number) => score >= 80;
  const isHighRisk = (score: number) => score >= 60 && score < 80;

  // Selected node config
  const selectedConfig = selectedNode ? getNodeColorConfig(selectedNode) : null;

  return (
    <div className="space-y-3 font-sans text-xs animate-in fade-in duration-150 select-none">
      {/* 1. TOP STATUS / TITLE BAR */}
      <div className="bg-[#111821] border border-[#1D2836] rounded-md px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#0E141C] border border-[#1D2836] flex items-center justify-center text-sky-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-slate-100 uppercase">
                Transaction Graph Topology
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E141C] text-slate-300 border border-[#1D2836]">
                Multi-Hop Forensic Traversal
              </span>
              {centerId && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800 flex items-center gap-1">
                  <span>Focus:</span>
                  <span className="truncate max-w-[120px]">{centerId.replace(/^[a-z]+:/, '')}</span>
                  <button onClick={handleClearCenter} className="hover:text-white ml-0.5">×</button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Correlate transaction flows, counterparties, exchange deposit hubs, and flagged routing endpoints.
            </p>
          </div>
        </div>

        {/* Global Graph Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Nodes:</span>
            <span className="text-slate-100 font-semibold">{graphData.nodes.length}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Edges:</span>
            <span className="text-slate-100 font-semibold">{graphData.edges.length}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Critical:</span>
            <span className="text-red-400 font-semibold">
              {graphData.nodes.filter(n => n.riskScore >= 80).length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. THREE-COLUMN INVESTIGATION LAYOUT: [LEFT: Controls] [CENTER: Graph Canvas] [RIGHT: Intelligence Panel] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: FILTERS & INVESTIGATION CONTROLS (3 Cols)                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 bg-[#111821] border border-[#1D2836] rounded-md overflow-hidden flex flex-col divide-y divide-[#1D2836]">
          
          {/* A. Focus & Centering Section */}
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <span>Graph Focus</span>
              {centerId && (
                <button
                  onClick={handleClearCenter}
                  className="text-sky-400 hover:text-sky-300 text-[10px] font-sans lowercase font-normal"
                >
                  reset to full
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (focusInput.trim()) {
                  handleSetCenter(focusInput.trim());
                }
              }}
              className="flex items-center gap-1.5"
            >
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#0E141C] border border-[#1D2836] focus-within:border-sky-500">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  placeholder="Wallet / TX / IP identifier..."
                  className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-200 border border-[#2A3A4D] text-xs font-medium cursor-pointer shrink-0"
              >
                Center
              </button>
            </form>
          </div>

          {/* B. Traversal Depth & Density */}
          <div className="p-3.5 space-y-3">
            <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Traversal & Scope
            </div>

            {/* Hops Selector */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-medium mb-1">
                <span>Expansion Hops</span>
                <span className="font-mono text-sky-400 font-semibold">{hops} {hops === 1 ? 'Hop' : 'Hops'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHops(h)}
                    className={`py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer border ${
                      hops === h
                        ? 'bg-sky-600/20 text-sky-300 border-sky-500/50'
                        : 'bg-[#0E141C] text-slate-400 border-[#1D2836] hover:text-slate-200'
                    }`}
                  >
                    {h} {h === 1 ? 'Hop' : 'Hops'}
                  </button>
                ))}
              </div>
            </div>

            {/* Node Cap Slider */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-medium mb-1">
                <span>Node Cap</span>
                <span className="font-mono text-slate-200 font-semibold">{maxNodes}</span>
              </div>
              <input
                type="range"
                min="20"
                max="140"
                step="10"
                value={maxNodes}
                onChange={(e) => setMaxNodes(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-[#0E141C] rounded-lg"
              />
            </div>
          </div>

          {/* C. Node Category & Risk Filtering */}
          <div className="p-3.5 space-y-2.5">
            <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Node Classification Filters
            </div>

            {/* Archetype Filter */}
            <div>
              <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
                Archetype
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer"
              >
                <option value="ALL">All Node Archetypes</option>
                <option value="wallet">Wallets Only</option>
                <option value="transaction">Transactions Only</option>
                <option value="exchange">Exchanges / VASPs Only</option>
                <option value="entity">Network Entities (IP / ASN / Geo)</option>
                <option value="flagged">Flagged Nodes Only</option>
              </select>
            </div>

            {/* Risk Threshold Filter */}
            <div>
              <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
                Minimum Risk Threshold
              </label>
              <select
                value={minRiskFilter}
                onChange={(e) => setMinRiskFilter(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded bg-[#0E141C] border border-[#1D2836] text-slate-200 text-xs outline-none cursor-pointer"
              >
                <option value={0}>All Risk Scores (≥ 0)</option>
                <option value={40}>Elevated (≥ 40)</option>
                <option value={60}>High Risk (≥ 60)</option>
                <option value={80}>Critical Flagged (≥ 80)</option>
              </select>
            </div>
          </div>

          {/* D. Shortest Path Forensic Finder */}
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-sky-400" />
                <span>Forensic Path Tracer</span>
              </span>
              {highlightedPath.length > 0 && (
                <button
                  onClick={() => setHighlightedPath([])}
                  className="text-red-400 hover:text-red-300 text-[10px] lowercase font-normal"
                >
                  clear trace
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 bg-[#0E141C] px-2 py-1 rounded border border-[#1D2836]">
                <span className="text-[10px] text-slate-500 font-mono w-10">FROM:</span>
                <input
                  type="text"
                  value={pathSource}
                  onChange={(e) => setPathSource(e.target.value)}
                  placeholder="Source Node ID..."
                  className="w-full bg-transparent text-[11px] text-slate-200 font-mono outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#0E141C] px-2 py-1 rounded border border-[#1D2836]">
                <span className="text-[10px] text-slate-500 font-mono w-10">TO:</span>
                <input
                  type="text"
                  value={pathTarget}
                  onChange={(e) => setPathTarget(e.target.value)}
                  placeholder="Target Node ID..."
                  className="w-full bg-transparent text-[11px] text-slate-200 font-mono outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleFindPath}
                disabled={pathSearching || !pathSource || !pathTarget}
                className="w-full py-1.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] disabled:opacity-40 text-sky-400 font-medium text-xs border border-[#2A3A4D] transition-colors cursor-pointer"
              >
                {pathSearching ? 'Tracing Topology...' : 'Highlight Shortest Path'}
              </button>

              {pathError && (
                <div className="text-[10px] text-red-400 font-mono pt-1">
                  {pathError}
                </div>
              )}

              {highlightedPath.length > 0 && (
                <div className="p-2 rounded bg-amber-950/20 border border-amber-800/40 text-[10px] font-mono text-amber-300">
                  <div className="font-semibold">Path Found: {highlightedPath.length - 1} hops</div>
                  <div className="truncate mt-0.5 text-slate-400">
                    {highlightedPath.map(p => p.replace(/^[a-z]+:/, '')).join(' → ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* E. Visual Distinction Legend */}
          <div className="p-3.5 space-y-2">
            <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              Visual Archetype Legend
            </div>

            <div className="space-y-1.5 text-xs">
              {/* 1. Wallets */}
              <div className="flex items-center justify-between p-1.5 rounded bg-[#0E141C] border border-[#1D2836]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-sky-400 bg-[#0c1724]" />
                  <span className="text-slate-200">Wallets (Addresses)</span>
                </div>
                <span className="font-mono text-[10px] text-sky-400 font-semibold">Sky Blue</span>
              </div>

              {/* 2. Transactions */}
              <div className="flex items-center justify-between p-1.5 rounded bg-[#0E141C] border border-[#1D2836]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-indigo-400 bg-[#131526]" />
                  <span className="text-slate-200">Transactions</span>
                </div>
                <span className="font-mono text-[10px] text-indigo-400 font-semibold">Indigo</span>
              </div>

              {/* 3. Exchanges */}
              <div className="flex items-center justify-between p-1.5 rounded bg-[#0E141C] border border-[#1D2836]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rotate-45 border border-emerald-400 bg-[#0d1f18]" />
                  <span className="text-slate-200">Exchanges / VASPs</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 font-semibold">Emerald</span>
              </div>

              {/* 4. Entities */}
              <div className="flex items-center justify-between p-1.5 rounded bg-[#0E141C] border border-[#1D2836]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-slate-500 bg-[#131922]" />
                  <span className="text-slate-200">Entities (IP / ASN / Geo)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 font-semibold">Slate</span>
              </div>

              {/* 5. Flagged Nodes */}
              <div className="flex items-center justify-between p-1.5 rounded bg-red-950/20 border border-red-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-red-400 bg-red-950/80" />
                  <span className="text-red-200 font-medium">Flagged Anomaly Nodes</span>
                </div>
                <span className="font-mono text-[10px] text-red-400 font-bold">Crimson Red</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: LARGE TRANSACTION RELATIONSHIP GRAPH (6 Cols)               */}
        {/* ========================================================================= */}
        <div
          ref={containerRef}
          className="lg:col-span-6 bg-[#080C14] border border-[#1D2836] rounded-md overflow-hidden relative shadow-inner flex flex-col h-[740px]"
        >
          {/* HUD Floating Viewport Controls (Top-Left) */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 p-1 rounded-md bg-[#111821]/90 border border-[#1D2836] backdrop-blur-md shadow-lg">
            <button
              onClick={() => setZoom(z => Math.min(3.5, z + 0.25))}
              className="p-1.5 rounded hover:bg-[#17212D] text-slate-300 hover:text-sky-400 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
              className="p-1.5 rounded hover:bg-[#17212D] text-slate-300 hover:text-sky-400 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded hover:bg-[#17212D] text-slate-300 hover:text-sky-400 transition-colors"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-[#1D2836] mx-0.5" />
            <button
              onClick={() => fetchGraph()}
              className="p-1.5 rounded hover:bg-[#17212D] text-slate-300 hover:text-sky-400 transition-colors"
              title="Re-run Simulation"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>

          {/* HUD Status / Tip Badge (Top-Right) */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-md bg-[#111821]/90 border border-[#1D2836] backdrop-blur-md text-[10px] text-slate-400 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Interactive Graph Viewport</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-sans">Zoom: {Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {/* Quick HUD Navigation Hint (Bottom-Left) */}
          <div className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-[#111821]/80 border border-[#1D2836] text-[10px] text-slate-400 font-sans pointer-events-none">
            Drag to pan • Click node to inspect • Double-click to center
          </div>

          {/* SVG Graph Canvas */}
          <svg
            ref={svgRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            viewBox="0 0 1000 700"
          >
            {/* Mathematical Grid Definition */}
            <defs>
              <pattern id="forensic-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#131C2A" strokeWidth="0.75" />
              </pattern>

              {/* Directional Flow Arrow Markers */}
              <marker
                id="flow-arrow-default"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#2A3A4D" />
              </marker>

              <marker
                id="flow-arrow-highlight"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
              </marker>

              <marker
                id="flow-arrow-path"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#fbbf24" />
              </marker>

              <marker
                id="flow-arrow-flagged"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
              </marker>
            </defs>

            {/* Grid background */}
            <rect width="100%" height="100%" fill="url(#forensic-grid)" />

            {/* Scaled and panned viewport container */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* 1. EDGES */}
              {graphData.edges.map((edge) => {
                const srcNode = simNodesRef.current.get(edge.source);
                const tgtNode = simNodesRef.current.get(edge.target);
                if (!srcNode || !tgtNode) return null;

                const isPathEdge =
                  highlightedPath.includes(edge.source) &&
                  highlightedPath.includes(edge.target) &&
                  Math.abs(highlightedPath.indexOf(edge.source) - highlightedPath.indexOf(edge.target)) === 1;

                const isConnectedToSelected =
                  selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

                const isFlaggedEdge =
                  srcNode.riskScore >= 80 || tgtNode.riskScore >= 80;

                return (
                  <g key={edge.id}>
                    <line
                      x1={srcNode.x}
                      y1={srcNode.y}
                      x2={tgtNode.x}
                      y2={tgtNode.y}
                      stroke={
                        isPathEdge
                          ? '#fbbf24' // Yellow path
                          : isConnectedToSelected
                          ? '#38bdf8' // Sky blue connected
                          : isFlaggedEdge
                          ? '#7f1d1d' // Subtle deep red
                          : '#1D2836' // Slate neutral
                      }
                      strokeWidth={isPathEdge ? 3 : isConnectedToSelected ? 2 : 1}
                      strokeDasharray={
                        edge.type === 'OBSERVED' ? '4 3' : edge.type === 'LOCATED_IN' ? '2 2' : undefined
                      }
                      opacity={isPathEdge ? 1 : isConnectedToSelected ? 0.95 : 0.45}
                      markerEnd={
                        isPathEdge
                          ? 'url(#flow-arrow-path)'
                          : isConnectedToSelected
                          ? 'url(#flow-arrow-highlight)'
                          : isFlaggedEdge
                          ? 'url(#flow-arrow-flagged)'
                          : 'url(#flow-arrow-default)'
                      }
                    />
                  </g>
                );
              })}

              {/* 2. NODES */}
              {graphData.nodes.map((node) => {
                const simNode = simNodesRef.current.get(node.id);
                if (!simNode) return null;

                const category = getNodeCategory(node);
                const config = getNodeColorConfig(node);
                const radius = getNodeRadius(node);
                const isSelected = selectedNode?.id === node.id;
                const isCenter = node.id === centerId;
                const isPathNode = highlightedPath.includes(node.id);
                const isFlagged = category === 'flagged';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${simNode.x}, ${simNode.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleSetCenter(node.id);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Outer Alert / Pulse Ring for Flagged or Centered Nodes */}
                    {(isFlagged || isCenter || isPathNode) && (
                      <circle
                        r={radius + (isCenter ? 8 : 6)}
                        fill="none"
                        stroke={isPathNode ? '#fbbf24' : config.stroke}
                        strokeWidth={1.5}
                        strokeDasharray={isFlagged ? '3 3' : isCenter ? '2 2' : undefined}
                        opacity={0.8}
                        className={isFlagged ? 'animate-pulse' : undefined}
                      />
                    )}

                    {/* SHAPE RENDERING ACCORDING TO CATEGORY */}
                    {/* A. TRANSACTIONS: Hexagonal / Rounded Square Box */}
                    {category === 'transaction' ? (
                      <rect
                        x={-radius}
                        y={-radius}
                        width={radius * 2}
                        height={radius * 2}
                        rx={radius * 0.35}
                        fill={isSelected ? '#1e2538' : config.fill}
                        stroke={isSelected ? '#ffffff' : config.stroke}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        className="transition-all duration-150 group-hover:scale-110"
                      />
                    ) : category === 'exchange' ? (
                      /* B. EXCHANGES: Diamond Shape */
                      <polygon
                        points={`0,${-radius * 1.2} ${radius * 1.2},0 0,${radius * 1.2} ${-radius * 1.2},0`}
                        fill={isSelected ? '#133324' : config.fill}
                        stroke={isSelected ? '#ffffff' : config.stroke}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        className="transition-all duration-150 group-hover:scale-110"
                      />
                    ) : (
                      /* C. WALLETS / ENTITIES / FLAGGED: Standard Precise Circles */
                      <circle
                        r={radius}
                        fill={isSelected ? '#17212D' : config.fill}
                        stroke={isSelected ? '#ffffff' : config.stroke}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        className="transition-all duration-150 group-hover:scale-110"
                      />
                    )}

                    {/* Inner Glyph / Symbol */}
                    {category === 'transaction' ? (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={config.stroke}
                        fontSize={8}
                        fontFamily="monospace"
                        className="pointer-events-none"
                      >
                        ⇄
                      </text>
                    ) : category === 'exchange' ? (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={config.stroke}
                        fontSize={7}
                        fontFamily="monospace"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        EX
                      </text>
                    ) : isFlagged ? (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#f43f5e"
                        fontSize={8}
                        fontFamily="monospace"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        !
                      </text>
                    ) : null}

                    {/* Label below node */}
                    <text
                      y={radius + 11}
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : isPathNode ? '#fbbf24' : '#94a3b8'}
                      fontSize={9}
                      fontFamily="monospace"
                      className="pointer-events-none transition-colors group-hover:fill-slate-100 font-medium"
                    >
                      {node.label.length > 14 ? `${node.label.slice(0, 11)}...` : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: SELECTED ENTITY / TRANSACTION INTELLIGENCE PANEL (3 Cols)   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 bg-[#111821] border border-[#1D2836] rounded-md overflow-hidden flex flex-col justify-between max-h-[740px] sticky top-2">
          {selectedNode ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* 1. Header with Entity Identity */}
              <div className="p-3.5 border-b border-[#1D2836] bg-[#0E141C] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${selectedConfig?.badgeBg}`}>
                      {selectedConfig?.badgeText}
                    </span>
                    {selectedNode.riskScore >= 80 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/80 text-red-300 border border-red-800">
                        CRITICAL
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSetCenter(selectedNode.id)}
                      className="px-2 py-0.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-sky-400 text-[10px] font-medium border border-[#2A3A4D] transition-colors"
                      title="Set as Graph Center"
                    >
                      Center
                    </button>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="text-slate-500 hover:text-slate-300 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Identifier Bar */}
                <div className="p-2 rounded bg-[#111821] border border-[#1D2836] flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase font-medium text-slate-500">Entity Identifier</div>
                    <div className="font-mono text-xs font-semibold text-slate-100 truncate mt-0.5" title={selectedNode.id}>
                      {selectedNode.label || selectedNode.id.replace(/^[a-z]+:/, '')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(selectedNode.label || selectedNode.id, 'selId')}
                      className="p-1 text-slate-400 hover:text-slate-200"
                      title="Copy Address/Hash"
                    >
                      {copiedText === 'selId' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => onSelectEntity(selectedNode.id)}
                      className="p-1 text-slate-400 hover:text-sky-400"
                      title="Inspect Entity Modal"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. INVESTIGATION WORKFLOW STEPPER: Node → Transaction → Related Entity → Alert */}
                <div className="pt-1">
                  <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider mb-1 flex items-center justify-between">
                    <span>Investigation Workflow</span>
                    <span className="text-sky-400 font-mono">
                      {workflowStep.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
                    {/* Step 1: Node */}
                    <button
                      onClick={() => setWorkflowStep('node')}
                      className={`py-1 px-1 rounded text-center truncate border transition-colors cursor-pointer ${
                        workflowStep === 'node'
                          ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 font-semibold'
                          : 'bg-[#111821] text-slate-400 border-[#1D2836] hover:text-slate-200'
                      }`}
                    >
                      1. Node
                    </button>

                    {/* Step 2: Transaction */}
                    <button
                      onClick={() => setWorkflowStep('transaction')}
                      className={`py-1 px-1 rounded text-center truncate border transition-colors cursor-pointer ${
                        workflowStep === 'transaction'
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60 font-semibold'
                          : 'bg-[#111821] text-slate-400 border-[#1D2836] hover:text-slate-200'
                      }`}
                    >
                      2. TX ({nodeTransactions.length})
                    </button>

                    {/* Step 3: Related Entity */}
                    <button
                      onClick={() => setWorkflowStep('entity')}
                      className={`py-1 px-1 rounded text-center truncate border transition-colors cursor-pointer ${
                        workflowStep === 'entity'
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 font-semibold'
                          : 'bg-[#111821] text-slate-400 border-[#1D2836] hover:text-slate-200'
                      }`}
                    >
                      3. Peers ({connectedEntitiesList.length})
                    </button>

                    {/* Step 4: Alert */}
                    <button
                      onClick={() => setWorkflowStep('alert')}
                      className={`py-1 px-1 rounded text-center truncate border transition-colors cursor-pointer ${
                        workflowStep === 'alert'
                          ? 'bg-red-600/30 text-red-300 border-red-500/60 font-semibold'
                          : 'bg-[#111821] text-slate-400 border-[#1D2836] hover:text-slate-200'
                      }`}
                    >
                      4. Alert ({nodeAlerts.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. SCROLLABLE INTELLIGENCE BODY */}
              <div className="p-3.5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
                
                {/* ================================================================= */}
                {/* STEP 1: NODE INTELLIGENCE                                         */}
                {/* ================================================================= */}
                {workflowStep === 'node' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    {/* Risk Metric Bar */}
                    <div className="p-2.5 rounded bg-[#0E141C] border border-[#1D2836] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-medium">
                        <span className="text-slate-400 uppercase">Risk Evaluation</span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            isCriticalRisk(selectedNode.riskScore)
                              ? 'text-red-400'
                              : isHighRisk(selectedNode.riskScore)
                              ? 'text-amber-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {selectedNode.riskScore} / 100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#17212D] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCriticalRisk(selectedNode.riskScore)
                              ? 'bg-red-500'
                              : isHighRisk(selectedNode.riskScore)
                              ? 'bg-amber-500'
                              : 'bg-sky-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, selectedNode.riskScore))}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats: Transaction Count & Connected Degree */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded bg-[#0E141C] border border-[#1D2836]">
                        <span className="text-[10px] text-slate-500 block font-sans uppercase">TX Volume</span>
                        <span className="font-semibold text-slate-200 mt-0.5 block">
                          {selectedEntityDetail
                            ? `${(selectedEntityDetail.totalVolumeBTC || 0).toFixed(2)} BTC`
                            : `${nodeTransactions.length} TXs`}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#0E141C] border border-[#1D2836]">
                        <span className="text-[10px] text-slate-500 block font-sans uppercase">Connections</span>
                        <span className="font-semibold text-sky-400 mt-0.5 block">
                          {selectedNode.degree} Peer Links
                        </span>
                      </div>
                    </div>

                    {/* Behavioral Indicators */}
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                        Behavioral Indicators
                      </div>
                      <div className="space-y-1 text-xs">
                        {selectedEntityDetail?.evidenceList && selectedEntityDetail.evidenceList.length > 0 ? (
                          selectedEntityDetail.evidenceList.map((ev, idx) => (
                            <div
                              key={idx}
                              className="p-1.5 rounded bg-[#0E141C] border border-[#1D2836] flex items-start gap-1.5 text-slate-300 text-[11px]"
                            >
                              <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{ev}</span>
                            </div>
                          ))
                        ) : selectedNode.metadata?.reasons && selectedNode.metadata.reasons.length > 0 ? (
                          selectedNode.metadata.reasons.map((r: string, idx: number) => (
                            <div
                              key={idx}
                              className="p-1.5 rounded bg-[#0E141C] border border-[#1D2836] flex items-start gap-1.5 text-slate-300 text-[11px]"
                            >
                              <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{r}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 rounded bg-[#0E141C] border border-[#1D2836] text-[11px] text-slate-400">
                            Standard baseline transaction activity observed.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Link to Next Workflow Step */}
                    <div className="pt-1">
                      <button
                        onClick={() => setWorkflowStep('transaction')}
                        className="w-full py-1.5 px-2.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-sky-300 border border-[#2A3A4D] text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>Inspect Transactions & Flow</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* STEP 2: TRANSACTIONS (INCOMING & OUTGOING)                        */}
                {/* ================================================================= */}
                {workflowStep === 'transaction' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    
                    {/* Active Transaction View if Selected */}
                    {activeWorkflowTx && (
                      <div className="p-2.5 rounded bg-[#0E141C] border border-indigo-500/40 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-indigo-400 font-semibold uppercase">
                          <span>Active TX Focus</span>
                          <button
                            onClick={() => setActiveWorkflowTx(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                        <div className="font-mono text-xs text-slate-100 font-semibold truncate">
                          {activeWorkflowTx.txid}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-[#1D2836]">
                          <span>Volume: {(activeWorkflowTx.total_output_amount || 0).toFixed(4)} BTC</span>
                          <span className={activeWorkflowTx.risk_score >= 70 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            Risk: {activeWorkflowTx.risk_score || 0}
                          </span>
                        </div>
                        <div className="pt-1 flex gap-1">
                          <button
                            onClick={() => onSelectTransaction && onSelectTransaction(activeWorkflowTx.txid)}
                            className="flex-1 py-1 rounded bg-[#17212D] text-slate-200 text-[10px] font-medium hover:bg-[#202D3E] border border-[#2A3A4D]"
                          >
                            Open TX Modal
                          </button>
                          <button
                            onClick={() => setWorkflowStep('entity')}
                            className="flex-1 py-1 rounded bg-indigo-600/30 text-indigo-300 text-[10px] font-medium hover:bg-indigo-600/50 border border-indigo-500/50 flex items-center justify-center gap-1"
                          >
                            <span>Trace Peers</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Incoming Transactions */}
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Incoming Transactions ({incomingEdges.length})</span>
                        <span className="text-sky-400 font-mono text-[9px]">INFLOW</span>
                      </div>
                      <div className="space-y-1.5">
                        {incomingEdges.length > 0 ? (
                          incomingEdges.map((edge, idx) => {
                            const src = graphData.nodes.find(n => n.id === edge.source);
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (edge.txid) {
                                    const found = nodeTransactions.find(t => t.txid === edge.txid);
                                    if (found) setActiveWorkflowTx(found);
                                  }
                                  if (src) setSelectedNode(src);
                                }}
                                className="p-2 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-sky-500/40 cursor-pointer transition-colors space-y-1 group"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono text-slate-200 group-hover:text-sky-300 truncate max-w-[170px]">
                                    {src ? (src.label || src.id) : edge.source}
                                  </span>
                                  <span className="font-mono text-emerald-400 font-medium text-[11px]">
                                    +{(edge.amount || 0).toFixed(4)} BTC
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono text-slate-500 flex items-center justify-between">
                                  <span>{edge.type}</span>
                                  <span>{formatTimestamp(edge.timestamp)}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : nodeTransactions.length > 0 ? (
                          nodeTransactions.slice(0, 4).map((tx, idx) => (
                            <div
                              key={idx}
                              onClick={() => setActiveWorkflowTx(tx)}
                              className="p-2 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] cursor-pointer text-xs"
                            >
                              <div className="font-mono text-slate-200 truncate">{tx.txid}</div>
                              <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between mt-1">
                                <span>{(tx.total_output_amount || 0).toFixed(4)} BTC</span>
                                <span>Risk: {tx.risk_score || 0}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 rounded bg-[#0E141C] border border-[#1D2836] text-[11px] text-slate-500">
                            No direct inbound flows recorded.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Outgoing Transactions */}
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Outgoing Transactions ({outgoingEdges.length})</span>
                        <span className="text-indigo-400 font-mono text-[9px]">OUTFLOW</span>
                      </div>
                      <div className="space-y-1.5">
                        {outgoingEdges.length > 0 ? (
                          outgoingEdges.map((edge, idx) => {
                            const tgt = graphData.nodes.find(n => n.id === edge.target);
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (edge.txid) {
                                    const found = nodeTransactions.find(t => t.txid === edge.txid);
                                    if (found) setActiveWorkflowTx(found);
                                  }
                                  if (tgt) setSelectedNode(tgt);
                                }}
                                className="p-2 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-indigo-500/40 cursor-pointer transition-colors space-y-1 group"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono text-slate-200 group-hover:text-indigo-300 truncate max-w-[170px]">
                                    {tgt ? (tgt.label || tgt.id) : edge.target}
                                  </span>
                                  <span className="font-mono text-slate-300 font-medium text-[11px]">
                                    -{(edge.amount || 0).toFixed(4)} BTC
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono text-slate-500 flex items-center justify-between">
                                  <span>{edge.type}</span>
                                  <span>{formatTimestamp(edge.timestamp)}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-2 rounded bg-[#0E141C] border border-[#1D2836] text-[11px] text-slate-500">
                            No direct outbound flows recorded.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* STEP 3: RELATED ENTITIES & PEERS                                 */}
                {/* ================================================================= */}
                {workflowStep === 'entity' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Counterparties & Connected Peers</span>
                      <span className="font-mono text-slate-500">{connectedEntitiesList.length}</span>
                    </div>

                    <div className="space-y-1.5">
                      {connectedEntitiesList.length > 0 ? (
                        connectedEntitiesList.map((peer) => {
                          const peerConfig = getNodeColorConfig(peer);
                          return (
                            <div
                              key={peer.id}
                              onClick={() => setSelectedNode(peer)}
                              className="p-2 rounded bg-[#0E141C] hover:bg-[#17212D] border border-[#1D2836] hover:border-sky-500/50 cursor-pointer transition-colors space-y-1 group"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-slate-200 group-hover:text-sky-300 truncate max-w-[180px]">
                                  {peer.label || peer.id}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase ${peerConfig.badgeBg}`}>
                                  {peerConfig.badgeText}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                                <span>{peer.degree} Peers</span>
                                <span className={peer.riskScore >= 70 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                                  Risk: {peer.riskScore}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 rounded bg-[#0E141C] border border-[#1D2836] text-[11px] text-slate-500">
                          No connected peers in immediate subgraph scope.
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => setWorkflowStep('alert')}
                        className="w-full py-1.5 px-2.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-red-300 border border-[#2A3A4D] text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>Check Threat Alerts</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* STEP 4: ALERT & TRIAGE DOSSIER                                   */}
                {/* ================================================================= */}
                {workflowStep === 'alert' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Triggered Forensic Alerts</span>
                      <span className="font-mono text-red-400">{nodeAlerts.length}</span>
                    </div>

                    {nodeAlerts.length > 0 ? (
                      <div className="space-y-2">
                        {nodeAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="p-2.5 rounded bg-red-950/20 border border-red-900/40 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-red-400">
                                {alert.id}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-900/40 text-red-300 border border-red-800">
                                {alert.severity}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-300 leading-snug">
                              {alert.reasons?.[0] || 'Behavioral heuristic threshold exceeded.'}
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-red-900/30">
                              <span>Confidence: {Math.round((alert.confidence || 0.85) * 100)}%</span>
                              <span>Risk: {alert.riskScore}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded bg-[#0E141C] border border-[#1D2836] text-[11px] text-slate-400 space-y-1">
                        <div className="font-medium text-slate-300">No active alerts filed for this entity.</div>
                        <p className="text-[10px] text-slate-500">
                          Entity maintains normal operational parameters within confidence limits.
                        </p>
                      </div>
                    )}

                    {/* Action to Navigate to Alerts Center */}
                    <div className="pt-1 space-y-1.5">
                      {onNavigateAlert && (
                        <button
                          onClick={() => onNavigateAlert(nodeAlerts[0]?.id)}
                          className="w-full py-1.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-200 border border-[#2A3A4D] text-xs font-medium transition-colors cursor-pointer"
                        >
                          View in Alerts Queue
                        </button>
                      )}
                      <button
                        onClick={() => onOpenInvestigation(selectedNode.id)}
                        className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Promote to Case Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Bottom Quick Actions */}
              <div className="p-3 bg-[#0E141C] border-t border-[#1D2836] flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    if (!pathSource) setPathSource(selectedNode.id);
                    else setPathTarget(selectedNode.id);
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#17212D] hover:bg-[#1E2B3B] text-slate-300 text-xs font-medium border border-[#2A3A4D] transition-colors flex items-center gap-1"
                  title="Use for shortest path trace"
                >
                  <Route className="w-3.5 h-3.5 text-slate-400" />
                  <span>Use in Path</span>
                </button>

                <button
                  onClick={() => onOpenInvestigation(selectedNode.id)}
                  className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <span>Dossier</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Empty State when no node is selected */
            <div className="p-8 text-center text-slate-400 space-y-3 my-auto font-sans">
              <div className="w-12 h-12 rounded-full bg-[#0E141C] border border-[#1D2836] mx-auto flex items-center justify-center text-slate-500">
                <Network className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Node Intelligence Panel
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                Select any node in the transaction graph to inspect intelligence, trace transaction flow, and correlate threat alerts.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
