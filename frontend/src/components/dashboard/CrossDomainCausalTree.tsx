import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import {
  Zap, CloudSnow, Fuel, Wrench, Droplet, Truck, Users, Radio, Archive,
  ArrowRight, ExternalLink, Activity, Shield, GitCommit, ChevronRight,
  Sparkles, RefreshCw, Eye
} from 'lucide-react';

export interface TreeNode {
  id: string;
  name: string;
  level: number;
  levelName: string;
  x: number;
  y: number;
  w: number;
  h: number;
  route: string;
  icon: any;
  color: string;
  borderGlow: string;
}

export interface TreeEdge {
  from: string;
  to: string;
  label: string;
}

const TREE_NODES: TreeNode[] = [
  // Tier 1: External Climate & Environmental Forcing (Root)
  {
    id: 'environment',
    name: 'Environment & Weather',
    level: 1,
    levelName: 'TIER 1 • EXTERNAL CLIMATE DRIVER',
    x: 460,
    y: 30,
    w: 180,
    h: 68,
    route: 'environment',
    icon: CloudSnow,
    color: '#818cf8',
    borderGlow: 'rgba(129, 140, 248, 0.4)'
  },

  // Tier 2: Annual Resupply & Logistics Lifeline
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    level: 2,
    levelName: 'TIER 2 • EXPEDITION SUPPLY LIFELINE',
    x: 160,
    y: 135,
    w: 195,
    h: 68,
    route: 'logistics',
    icon: Truck,
    color: '#2dd4bf',
    borderGlow: 'rgba(45, 212, 191, 0.4)'
  },

  // Tier 3: Primary Physical Reserves & Storage
  {
    id: 'fuel',
    name: 'Fuel Storage',
    level: 3,
    levelName: 'TIER 3 • HYDROCARBON RESERVE',
    x: 70,
    y: 250,
    w: 165,
    h: 68,
    route: 'fuel',
    icon: Fuel,
    color: '#f59e0b',
    borderGlow: 'rgba(245, 158, 11, 0.4)'
  },
  {
    id: 'inventory',
    name: 'Storage & Inventory',
    level: 3,
    levelName: 'TIER 3 • SPARES & CONSUMABLES',
    x: 270,
    y: 250,
    w: 175,
    h: 68,
    route: 'inventory',
    icon: Archive,
    color: '#34d399',
    borderGlow: 'rgba(52, 211, 153, 0.4)'
  },
  {
    id: 'water',
    name: 'Water Supply',
    level: 3,
    levelName: 'TIER 3 • HYDROLOGICAL INTAKE',
    x: 740,
    y: 250,
    w: 165,
    h: 68,
    route: 'water',
    icon: Droplet,
    color: '#38bdf8',
    borderGlow: 'rgba(56, 189, 248, 0.4)'
  },

  // Tier 4: Mechanical Asset Health & Conversion
  {
    id: 'equipment',
    name: 'Equipment & Machinery',
    level: 4,
    levelName: 'TIER 4 • MECHANICAL ASSET HEALTH',
    x: 270,
    y: 365,
    w: 185,
    h: 68,
    route: 'equipment',
    icon: Wrench,
    color: '#10b981',
    borderGlow: 'rgba(16, 185, 129, 0.4)'
  },

  // Tier 5: Central Microgrid Power Hub
  {
    id: 'energy',
    name: 'Energy & Power',
    level: 5,
    levelName: 'TIER 5 • CENTRAL POWER MICROGRID',
    x: 460,
    y: 450,
    w: 180,
    h: 72,
    route: 'resources',
    icon: Zap,
    color: '#fbbf24',
    borderGlow: 'rgba(251, 191, 36, 0.4)'
  },

  // Tier 6: Human Habitation & External Communications
  {
    id: 'personnel',
    name: 'Personnel & Occupancy',
    level: 6,
    levelName: 'TIER 6 • CREW LIFE SUPPORT',
    x: 310,
    y: 565,
    w: 185,
    h: 68,
    route: 'personnel',
    icon: Users,
    color: '#c084fc',
    borderGlow: 'rgba(192, 132, 252, 0.4)'
  },
  {
    id: 'communication',
    name: 'Communication',
    level: 6,
    levelName: 'TIER 6 • SATELLITE TELEMETRY',
    x: 590,
    y: 565,
    w: 175,
    h: 68,
    route: 'communication',
    icon: Radio,
    color: '#38bdf8',
    borderGlow: 'rgba(56, 189, 248, 0.4)'
  }
];

// Causal Tree Edges connecting upstream parents to downstream child nodes
const TREE_EDGES: TreeEdge[] = [
  // Climate influences
  { from: 'environment', to: 'energy', label: 'Heating load & Solar PV' },
  { from: 'environment', to: 'water', label: 'Conduit freeze hazard' },
  { from: 'environment', to: 'logistics', label: 'Blizzards & sea-ice drift' },
  { from: 'environment', to: 'communication', label: 'Radome attenuation' },

  // Logistics deliveries
  { from: 'logistics', to: 'fuel', label: 'AGO diesel resupply' },
  { from: 'logistics', to: 'inventory', label: 'Spare parts restock' },

  // Maintenance & machinery
  { from: 'inventory', to: 'equipment', label: 'Filters & bearings' },
  { from: 'fuel', to: 'energy', label: 'Diesel feed to gensets' },
  { from: 'equipment', to: 'energy', label: 'Generator reliability' },

  // Power distribution & life support
  { from: 'energy', to: 'water', label: '4.2 kW trace heating' },
  { from: 'energy', to: 'communication', label: 'Radome heaters & power' },
  { from: 'energy', to: 'personnel', label: 'Habitat warmth & galley' },
  { from: 'water', to: 'personnel', label: 'Potable water hydration' }
];

export const CrossDomainCausalTree: React.FC<{ stationId?: string }> = ({ stationId: propStationId }) => {
  const navigate = useNavigate();
  const { selectedStationId } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const currentStationId = propStationId || selectedStationId || 'maitri';
  const isMaitri = currentStationId === 'maitri';
  const snapshot = liveSnapshot[currentStationId];

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Dynamic Live KPIs per domain
  const nodeLiveKpi = useMemo(() => {
    const env = snapshot?.environment;
    const eng = snapshot?.energy;
    const fl = snapshot?.fuel;
    const wt = snapshot?.water;
    const eq = snapshot?.equipment;
    const log = snapshot?.logistics;
    const pers = snapshot?.personnel;
    const comm = snapshot?.communication;
    const inv = snapshot?.inventory;

    return {
      environment: {
        kpi: `${env?.temperature?.toFixed(1) ?? (isMaitri ? -25.2 : -18.4)}°C`,
        sub: `Wind: ${env?.wind_speed ?? (isMaitri ? 32 : 44)} km/h`,
        status: isMaitri ? 'Katabatic Gale' : 'Coastal Squall'
      },
      logistics: {
        kpi: isMaitri ? '88 Days ETA' : '102 Days ETA',
        sub: 'MV Vasiliy Golovnin',
        status: isMaitri ? '+4.5d Delay' : '+2.0d Delay'
      },
      fuel: {
        kpi: `${fl?.fuel_percentage?.toFixed(0) ?? (isMaitri ? 78 : 86)}%`,
        sub: `${fl?.current_level?.toLocaleString() ?? (isMaitri ? '142,000' : '180,000')} L`,
        status: `${fl?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.2)} L/hr`
      },
      inventory: {
        kpi: '0 Stockouts',
        sub: `${isMaitri ? '1,420' : '1,850'} SKUs`,
        status: '100% Critical Spares'
      },
      water: {
        kpi: `${wt?.storage_liters?.toLocaleString() ?? (isMaitri ? '18,500' : '24,000')} L`,
        sub: `Pipe: +${wt?.pipe_temp_c ?? (isMaitri ? 3.8 : 8.5)}°C`,
        status: isMaitri ? 'Trace Active (4.2kW)' : 'SWRO Active (24L/m)'
      },
      equipment: {
        kpi: `${eq?.avg_health ?? (isMaitri ? 93.5 : 96.2)}%`,
        sub: isMaitri ? '6 Units Active' : '8 Units Active',
        status: '1 Unit on Watch'
      },
      energy: {
        kpi: `${eng?.generator_load ?? (isMaitri ? 68 : 82)} kW`,
        sub: `PV: +${eng?.solar_output ?? (isMaitri ? 22 : 28)} kW`,
        status: isMaitri ? 'Gen #1 Active' : 'CHP Array Sync'
      },
      personnel: {
        kpi: `${pers?.headcount ?? (isMaitri ? 25 : 30)} Crew`,
        sub: `Occupancy: ${isMaitri ? '83%' : '64%'}`,
        status: 'All Accounted'
      },
      communication: {
        kpi: `${comm?.bandwidth_mbps ?? (isMaitri ? 120 : 160)} Mbps`,
        sub: `Lat: ${comm?.latency_ms ?? (isMaitri ? 78 : 65)}ms`,
        status: 'QoS Tier 1 LIVE'
      }
    };
  }, [snapshot, isMaitri]);

  // Identify related edges when hovering a node
  const activeIncomingEdges = useMemo(() => {
    if (!hoveredNodeId) return [];
    return TREE_EDGES.filter((e) => e.to === hoveredNodeId);
  }, [hoveredNodeId]);

  const activeOutgoingEdges = useMemo(() => {
    if (!hoveredNodeId) return [];
    return TREE_EDGES.filter((e) => e.from === hoveredNodeId);
  }, [hoveredNodeId]);

  const isRelatedNode = (nodeId: string) => {
    if (!hoveredNodeId) return true;
    if (hoveredNodeId === nodeId) return true;
    return (
      activeIncomingEdges.some((e) => e.from === nodeId) ||
      activeOutgoingEdges.some((e) => e.to === nodeId)
    );
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden bg-gradient-to-b from-[#071326]/90 to-[#030914]/95 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-polar-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Cross-Domain Causal Propagation Tree
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {isMaitri ? 'Maitri Inland Model' : 'Bharati Coastal Model'} • 9 Interconnected Domains
            </span>
          </div>
          <h2 className="text-lg lg:text-xl font-black text-white flex items-center gap-2.5">
            <GitCommit className="w-5 h-5 text-cyan-400" />
            Inter-Domain Causal Propagation Architecture
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Hierarchical causal dependencies linking weather, logistics, reserves, equipment, and microgrid power. <span className="text-cyan-300 font-bold">Click any domain node to navigate directly to its dedicated feature page.</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Hover to trace causality • Click to open page
          </span>
        </div>
      </div>

      {/* SVG Canvas for Tree Nodes & Animated Causal Edges */}
      <div className="relative overflow-x-auto mt-4 py-2">
        <div className="min-w-[980px] h-[670px] relative">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 980 670">
            <defs>
              <linearGradient id="edgeGlowCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="edgeGlowAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="edgeGlowPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
              </linearGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Directed Causal Edges */}
            {TREE_EDGES.map((edge, idx) => {
              const fromNode = TREE_NODES.find((n) => n.id === edge.from);
              const toNode = TREE_NODES.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + fromNode.w / 2;
              const y1 = fromNode.y + fromNode.h;
              const x2 = toNode.x + toNode.w / 2;
              const y2 = toNode.y;

              const isIncoming = hoveredNodeId === edge.to;
              const isOutgoing = hoveredNodeId === edge.from;
              const isHighlighted = isIncoming || isOutgoing;
              const isMuted = hoveredNodeId && !isHighlighted;

              // Cubic bezier control points
              const cy1 = y1 + (y2 - y1) * 0.5;
              const cy2 = y1 + (y2 - y1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;

              const strokeColor = isIncoming
                ? '#38bdf8'
                : isOutgoing
                ? '#f59e0b'
                : 'rgba(71, 85, 105, 0.45)';

              return (
                <g key={idx} className="transition-all duration-300">
                  {/* Background glow path when highlighted */}
                  {isHighlighted && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={5}
                      strokeOpacity={0.4}
                      filter="url(#glowFilter)"
                    />
                  )}

                  {/* Base curve */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={isHighlighted ? '6 3' : undefined}
                    strokeOpacity={isMuted ? 0.15 : isHighlighted ? 1 : 0.6}
                  />

                  {/* Flow direction particle animation */}
                  {isHighlighted && (
                    <circle r={3.5} fill={strokeColor} filter="url(#glowFilter)">
                      <animateMotion path={pathD} dur="2.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Render Interactive Tree Nodes */}
          {TREE_NODES.map((node) => {
            const Icon = node.icon;
            const kpiData = (nodeLiveKpi as any)[node.id];
            const isHovered = hoveredNodeId === node.id;
            const isRelated = isRelatedNode(node.id);

            return (
              <div
                key={node.id}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.w}px`,
                  height: `${node.h}px`
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => navigate(`/station/${currentStationId}/${node.route}`)}
                className={`absolute rounded-xl border p-2.5 transition-all duration-300 cursor-pointer select-none flex flex-col justify-between group ${
                  isHovered
                    ? 'ring-2 ring-cyan-400 shadow-xl bg-polar-navy -translate-y-1 z-20 scale-105'
                    : !isRelated
                    ? 'opacity-35 bg-polar-dark/80 border-slate-800'
                    : 'bg-[#091526]/90 border-slate-700/80 hover:border-cyan-400/60 hover:shadow-lg'
                }`}
                title={`Click to open ${node.name} full feature page`}
              >
                {/* Top Node Identity */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="p-1 rounded-lg border transition-transform group-hover:scale-110 flex-shrink-0"
                      style={{
                        background: `${node.color}15`,
                        color: node.color,
                        borderColor: `${node.color}40`
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-white group-hover:text-cyan-200 truncate">
                      {node.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-300 transition-colors flex-shrink-0">
                    <span className="text-[8px] font-mono uppercase font-semibold hidden group-hover:inline">
                      OPEN
                    </span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                </div>

                {/* Primary Live KPI & Sublabel */}
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-base font-black font-mono text-white tracking-tight">
                    {kpiData?.kpi}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-300 truncate max-w-[90px]">
                    {kpiData?.sub}
                  </span>
                </div>

                {/* Status Indicator Bar */}
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                  <span className="truncate">{kpiData?.status}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                    style={{ background: node.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Footer Legend & Guidance */}
      <div className="mt-2 pt-3 border-t border-polar-border/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-400" /> Tier 1: Climate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-teal-400" /> Tier 2: Resupply
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Tier 3: Reserves
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Tier 4: Machinery
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-yellow-400" /> Tier 5: Microgrid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-400" /> Tier 6: Life Support
          </span>
        </div>

        <div className="text-[11px] text-cyan-300 font-bold flex items-center gap-1">
          <span>Click any node to navigate to its feature page</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};

export default CrossDomainCausalTree;
