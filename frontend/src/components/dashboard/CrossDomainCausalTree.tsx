import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import {
  Zap, CloudSnow, Fuel, Wrench, Droplet, Truck, Users, Radio, Archive,
  ExternalLink, Layers, GitCompare, GitCommit, Box, Eye, Sparkles
} from 'lucide-react';
import { ThreeDomainGraph } from './ThreeDomainGraph';

export interface TreeNode {
  id: string;
  name: string;
  shortName: string;
  tier: string;
  tierNumber: number;
  x: number;
  y: number;
  w: number;
  h: number;
  route: string;
  icon: any;
  color: string;
  accentRgb: string;
}

export interface TreeEdgeDef {
  id: string;
  from: string;
  to: string;
  label: string;
  customPath?: string; // Optional manual routing to avoid collisions
}

// 9 Interconnected Operational Domains organized in balanced 4-tier hierarchy
// Canvas Dimensions: 1180px x 740px
const TREE_NODES: TreeNode[] = [
  // ── Tier 1: External Environmental & Supply Forcing (y = 40) ──
  {
    id: 'environment',
    name: 'Environment & Weather',
    shortName: 'Climate & Atmosphere',
    tier: 'TIER 1 • EXTERNAL CLIMATE DRIVER',
    tierNumber: 1,
    x: 200,
    y: 40,
    w: 290,
    h: 88,
    route: 'environment',
    icon: CloudSnow,
    color: '#818cf8',
    accentRgb: '129, 140, 248'
  },
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    shortName: 'Overland & Sea Lifeline',
    tier: 'TIER 1 • EXPEDITION RESUPPLY',
    tierNumber: 1,
    x: 690,
    y: 40,
    w: 290,
    h: 88,
    route: 'logistics',
    icon: Truck,
    color: '#2dd4bf',
    accentRgb: '45, 212, 191'
  },

  // ── Tier 2: Physical Reserves & Hydrological Intake (y = 220) ──
  {
    id: 'fuel',
    name: 'Fuel Storage',
    shortName: 'Hydrocarbon Tank Farm',
    tier: 'TIER 2 • ENERGY RESERVE',
    tierNumber: 2,
    x: 60,
    y: 220,
    w: 280,
    h: 88,
    route: 'fuel',
    icon: Fuel,
    color: '#f59e0b',
    accentRgb: '245, 158, 11'
  },
  {
    id: 'inventory',
    name: 'Storage & Inventory',
    shortName: 'Spares & Consumables',
    tier: 'TIER 2 • CRITICAL SKUS',
    tierNumber: 2,
    x: 450,
    y: 220,
    w: 280,
    h: 88,
    route: 'inventory',
    icon: Archive,
    color: '#34d399',
    accentRgb: '52, 211, 153'
  },
  {
    id: 'water',
    name: 'Water Supply',
    shortName: 'Lake Zub / Desal Intake',
    tier: 'TIER 2 • HYDROLOGICAL CYCLE',
    tierNumber: 2,
    x: 840,
    y: 220,
    w: 280,
    h: 88,
    route: 'water',
    icon: Droplet,
    color: '#38bdf8',
    accentRgb: '56, 189, 248'
  },

  // ── Tier 3: Conversion & Core Generation Hub (y = 400) ──
  {
    id: 'equipment',
    name: 'Equipment & Machinery',
    shortName: 'Mechanical Asset Health',
    tier: 'TIER 3 • POWER CONVERSION',
    tierNumber: 3,
    x: 250,
    y: 400,
    w: 290,
    h: 88,
    route: 'equipment',
    icon: Wrench,
    color: '#10b981',
    accentRgb: '16, 185, 129'
  },
  {
    id: 'energy',
    name: 'Energy & Power',
    shortName: 'Microgrid Bus & PV',
    tier: 'TIER 3 • CENTRAL MICROGRID',
    tierNumber: 3,
    x: 680,
    y: 400,
    w: 290,
    h: 88,
    route: 'resources',
    icon: Zap,
    color: '#fbbf24',
    accentRgb: '251, 191, 36'
  },

  // ── Tier 4: Life Support, Human Habitation & Telemetry (y = 580) ──
  {
    id: 'personnel',
    name: 'Personnel & Occupancy',
    shortName: 'Crew Life Support',
    tier: 'TIER 4 • HABITAT OCCUPANCY',
    tierNumber: 4,
    x: 250,
    y: 580,
    w: 290,
    h: 88,
    route: 'personnel',
    icon: Users,
    color: '#c084fc',
    accentRgb: '192, 132, 252'
  },
  {
    id: 'communication',
    name: 'Communication',
    shortName: 'LEO Polar Constellation',
    tier: 'TIER 4 • REAL-TIME TELEMETRY',
    tierNumber: 4,
    x: 680,
    y: 580,
    w: 290,
    h: 88,
    route: 'communication',
    icon: Radio,
    color: '#38bdf8',
    accentRgb: '56, 189, 248'
  },
];

// Pristine Causal Edges connecting upstream drivers to downstream consequences
const TREE_EDGES: TreeEdgeDef[] = [
  // 1. Environment -> Logistics (Horizontal atmospheric forcing)
  { id: 'env-log', from: 'environment', to: 'logistics', label: 'Katabatic wind & blizzards' },

  // 2. Environment -> Water (Direct conduit freeze hazard)
  { id: 'env-wat', from: 'environment', to: 'water', label: 'Conduit freeze hazard' },

  // 3. Environment -> Energy (Direct heating load & PV solar offset)
  { id: 'env-eng', from: 'environment', to: 'energy', label: 'Heating demand & PV offset' },

  // 4. Logistics -> Fuel (Bulk AGO resupply tankers)
  { id: 'log-fl', from: 'logistics', to: 'fuel', label: 'Annual diesel replenishment' },

  // 5. Logistics -> Inventory (Container spares manifest)
  { id: 'log-inv', from: 'logistics', to: 'inventory', label: 'Spares & consumables restock' },

  // 6. Fuel -> Energy (Continuous hydrocarbon fuel feed)
  { id: 'fl-eng', from: 'fuel', to: 'energy', label: '17.5 L/hr diesel supply' },

  // 7. Inventory -> Equipment (Preventive maintenance spares)
  { id: 'inv-eq', from: 'inventory', to: 'equipment', label: 'Bearings & filter staging' },

  // 8. Equipment -> Energy (Mechanical alternator health & genset synchro)
  { id: 'eq-eng', from: 'equipment', to: 'energy', label: 'Genset alternator uptime' },

  // 9. Energy -> Water (4.2 kW pipeline trace heating feedback loop)
  { id: 'eng-wat', from: 'energy', to: 'water', label: '4.2 kW trace line heating' },

  // 10. Energy -> Personnel (Microgrid warmth, life support & galley)
  { id: 'eng-pers', from: 'energy', to: 'personnel', label: 'Habitat heating & power' },

  // 11. Energy -> Communication (Radome heaters & transmitter power)
  { id: 'eng-comm', from: 'energy', to: 'communication', label: 'Radome UPS & uplink power' },

  // 12. Water -> Personnel (Potable hydration & galley supply)
  { id: 'wat-pers', from: 'water', to: 'personnel', label: 'Filtered potable hydration' },

  // 13. Personnel -> Communication (Mission coordination & SCADA operations)
  { id: 'pers-comm', from: 'personnel', to: 'communication', label: 'Operator SCADA command' },
];

interface Props {
  stationId?: string;
  onOpenCompare?: () => void;
}

export const CrossDomainCausalTree: React.FC<Props> = ({
  stationId: propStationId,
  onOpenCompare
}) => {
  const navigate = useNavigate();
  const { selectedStationId } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const currentStationId = propStationId || selectedStationId || 'maitri';
  const isMaitri = currentStationId === 'maitri';
  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';
  const snapshot = liveSnapshot[currentStationId];

  // View mode switcher: '2d' DAG or '3d' Spatial Orbit
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
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

  // Helper to compute clean non-overlapping Bézier paths
  const getEdgePath = (edge: TreeEdgeDef) => {
    const fromNode = TREE_NODES.find((n) => n.id === edge.from);
    const toNode = TREE_NODES.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return '';

    // Specific port coordinates engineered to avoid card collisions
    let sx = fromNode.x + fromNode.w / 2;
    let sy = fromNode.y + fromNode.h;
    let tx = toNode.x + toNode.w / 2;
    let ty = toNode.y;

    // Custom non-colliding anchor assignments
    switch (edge.id) {
      case 'env-log':
        // Horizontal connection across Tier 1 with gentle upward arc
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + 44;
        tx = toNode.x;
        ty = toNode.y + 44;
        return `M ${sx} ${sy} C ${sx + 70} ${sy - 28}, ${tx - 70} ${ty - 28}, ${tx} ${ty}`;

      case 'env-wat':
        // Curves from Env bottom-right across Tier 2 gap down to Water top
        sx = fromNode.x + fromNode.w - 40;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + 40;
        ty = toNode.y;
        return `M ${sx} ${sy} C ${sx} ${sy + 40}, ${tx} ${ty - 50}, ${tx} ${ty}`;

      case 'env-eng':
        // Smooth corridor between Fuel and Inventory directly into Energy
        sx = fromNode.x + 180;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + 60;
        ty = toNode.y;
        return `M ${sx} ${sy} C ${sx} ${sy + 120}, ${tx} ${ty - 80}, ${tx} ${ty}`;

      case 'log-fl':
        // Logistics down-left over to Fuel
        sx = fromNode.x + 50;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w - 40;
        ty = toNode.y;
        return `M ${sx} ${sy} C ${sx} ${sy + 50}, ${tx} ${ty - 50}, ${tx} ${ty}`;

      case 'log-inv':
        // Logistics down-center to Inventory
        sx = fromNode.x + 145;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w - 50;
        ty = toNode.y;
        return `M ${sx} ${sy} C ${sx} ${sy + 40}, ${tx} ${ty - 40}, ${tx} ${ty}`;

      case 'fl-eng':
        // Fuel bottom-right into Energy left
        sx = fromNode.x + fromNode.w - 30;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x;
        ty = toNode.y + 30;
        return `M ${sx} ${sy} C ${sx} ${sy + 70}, ${tx - 90} ${ty}, ${tx} ${ty}`;

      case 'inv-eq':
        // Inventory bottom-left into Equipment top
        sx = fromNode.x + 60;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w - 60;
        ty = toNode.y;
        return `M ${sx} ${sy} C ${sx} ${sy + 40}, ${tx} ${ty - 40}, ${tx} ${ty}`;

      case 'eq-eng':
        // Generator power bridge with gentle upward arc
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + 44;
        tx = toNode.x;
        ty = toNode.y + 44;
        return `M ${sx} ${sy} C ${sx + 60} ${sy - 25}, ${tx - 60} ${ty - 25}, ${tx} ${ty}`;

      case 'eng-wat':
        // Trace line heating loop: Energy top-right up into Water bottom
        sx = fromNode.x + fromNode.w - 30;
        sy = fromNode.y;
        tx = toNode.x + 100;
        ty = toNode.y + toNode.h;
        return `M ${sx} ${sy} C ${sx + 40} ${sy - 30}, ${tx} ${ty + 40}, ${tx} ${ty}`;

      case 'eng-pers':
        // Energy bottom-left into Personnel top-right
        sx = fromNode.x + 50;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w - 50;
        ty = toNode.y;
        return `M ${sx} ${sy} C ${sx} ${sy + 40}, ${tx} ${ty - 40}, ${tx} ${ty}`;

      case 'eng-comm':
        // Energy bottom-right into Communication top with slight S-curve
        sx = fromNode.x + fromNode.w - 50;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w - 50;
        ty = toNode.y;
        return `M ${sx} ${sy} C ${sx + 35} ${sy + 35}, ${tx + 35} ${ty - 35}, ${tx} ${ty}`;

      case 'wat-pers':
        // Water bottom down around into Personnel
        sx = fromNode.x + 50;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w;
        ty = toNode.y + 44;
        return `M ${sx} ${sy} C ${sx} ${sy + 100}, ${tx + 80} ${ty}, ${tx} ${ty}`;

      case 'pers-comm':
        // Horizontal human-comms command bridge with gentle upward arc
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + 44;
        tx = toNode.x;
        ty = toNode.y + 44;
        return `M ${sx} ${sy} C ${sx + 60} ${sy - 25}, ${tx - 60} ${ty - 25}, ${tx} ${ty}`;

      default:
        // Default clean vertical S-curve
        const dy = ty - sy;
        return `M ${sx} ${sy} C ${sx} ${sy + dy * 0.5}, ${tx} ${ty - dy * 0.5}, ${tx} ${ty}`;
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden bg-gradient-to-b from-[#071326]/95 to-[#030914]/98 shadow-2xl transition-all duration-300">
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: accentColor }}
      />

      {/* ── TOP INTEGRATED HEADER & MISSION CONTROLS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-polar-border/40 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-polar-dark/80 text-slate-300 border border-polar-border shadow-inner">
              {isMaitri ? '70°45′S 11°44′E • Inland Schirmacher' : '69°24′S 76°11′E • Coastal Larsemann'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Causal Digital Twin Engine</span>
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
            <Layers className="w-7 h-7" style={{ color: accentColor }} />
            9 Interconnected Operational Domains
          </h1>
        </div>

        {/* Right Action Controls: Station Switcher, View Switcher & Compare Stations */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 2D / 3D Mode Toggle */}
          <div className="bg-polar-dark/90 p-1 rounded-xl border border-polar-border flex items-center shadow-md">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                viewMode === '2d'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>2D Topological DAG</span>
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                viewMode === '3d'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Spatial Constellation</span>
            </button>
          </div>

          {/* Station Switcher Pills */}
          <div className="bg-polar-dark/90 p-1 rounded-xl border border-polar-border flex items-center shadow-md">
            <button
              onClick={() => navigate('/station/maitri/domains')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                isMaitri
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Maitri</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-bold">Inland</span>
            </button>
            <button
              onClick={() => navigate('/station/bharati/domains')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                !isMaitri
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Bharati</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40 font-bold">Coastal</span>
            </button>
          </div>

          {/* Compare Stations Button */}
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all shadow-md group"
            >
              <GitCompare className="w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
              <span>Compare Stations</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SUBHEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3">
        <h2 className="text-base lg:text-lg font-bold text-slate-200 flex items-center gap-2 font-mono">
          <GitCommit className="w-4 h-4 text-cyan-400" />
          <span>Inter-Domain Causal Propagation Architecture</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyan-300 font-semibold px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Hover over any domain to reveal its causal links</span>
          </span>
        </div>
      </div>

      {/* ── GRAPH VIEW: 3D SPATIAL VS 2D TOPOLOGICAL DAG ── */}
      {viewMode === '3d' ? (
        <ThreeDomainGraph stationId={currentStationId} />
      ) : (
        <div className="relative overflow-x-auto mt-2 py-2 rounded-2xl bg-polar-dark/60 border border-polar-border/50">
          <div className="min-w-[1180px] h-[720px] relative">
            {/* SVG Canvas for High-Precision Causal Conduits */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1180 720">
              <defs>
                <filter id="neonGlowCyan" x="0" y="0" width="1180" height="720" filterUnits="userSpaceOnUse">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="neonGlowAmber" x="0" y="0" width="1180" height="720" filterUnits="userSpaceOnUse">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Render Directed Causal Edges ONLY when a domain is hovered */}
              {hoveredNodeId && TREE_EDGES.map((edge) => {
                const isIncoming = edge.to === hoveredNodeId;
                const isOutgoing = edge.from === hoveredNodeId;
                if (!isIncoming && !isOutgoing) return null;

                const pathData = getEdgePath(edge);
                if (!pathData) return null;

                // Perfectly calibrated ultra-bright neon colors with equal perceived luminance and high saturation
                const strokeColor = isIncoming ? '#00f2fe' : '#fbbf24';
                const auraColor = isIncoming ? '#00c6ff' : '#f59e0b';
                const haloColor = isIncoming ? '#0284c7' : '#d97706';
                const coreColor = isIncoming ? '#e0faff' : '#fffbeb';

                return (
                  <g
                    key={edge.id}
                    className="transition-all duration-300"
                    style={{
                      filter: isIncoming
                        ? 'drop-shadow(0 0 6px rgba(0, 242, 254, 0.75)) drop-shadow(0 0 14px rgba(0, 198, 255, 0.45))'
                        : 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.75)) drop-shadow(0 0 14px rgba(245, 158, 11, 0.45))'
                    }}
                  >
                    {/* Layer 1: Wide Deep Neon Halo Aura */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={haloColor}
                      strokeWidth={14}
                      strokeOpacity={0.3}
                      strokeLinecap="round"
                    />

                    {/* Layer 2: Medium Saturating Neon Aura */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={auraColor}
                      strokeWidth={8}
                      strokeOpacity={0.6}
                      strokeLinecap="round"
                    />

                    {/* Layer 3: Solid Vivid Saturated Neon Conduit Beam */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={3.5}
                      strokeOpacity={1.0}
                      strokeLinecap="round"
                    />

                    {/* Layer 4: Luminous High-Intensity Energy Core */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={coreColor}
                      strokeWidth={1.2}
                      strokeOpacity={0.95}
                      strokeLinecap="round"
                    />

                    {/* Layer 5: Live Fast-Traveling Energized Photon Bead */}
                    <circle r={5} fill={coreColor} stroke={strokeColor} strokeWidth={2.5}>
                      <animateMotion
                        dur="1.6s"
                        repeatCount="indefinite"
                        path={pathData}
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>

            {/* ── HTML NODE CARDS (High-Legibility, Full Titles, Zero Truncation) ── */}
            {TREE_NODES.map((node) => {
              const Icon = node.icon;
              const live = (nodeLiveKpi as any)[node.id] || { kpi: '--', sub: 'Nominal', status: 'Online' };
              const isHovered = hoveredNodeId === node.id;
              const isUpstream = hoveredNodeId && activeIncomingEdges.some((e) => e.from === node.id);
              const isDownstream = hoveredNodeId && activeOutgoingEdges.some((e) => e.to === node.id);
              const isDimmed = hoveredNodeId && !isHovered && !isUpstream && !isDownstream;

              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => navigate(`/station/${currentStationId}/${node.route}`)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.w}px`,
                    height: `${node.h}px`,
                  }}
                  className={`absolute rounded-xl p-3.5 cursor-pointer select-none transition-all duration-300 flex flex-col justify-between group ${
                    isHovered
                      ? 'bg-polar-navy/95 border-2 shadow-2xl scale-[1.03] z-30'
                      : isUpstream
                      ? 'bg-cyan-950/40 border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20 z-20'
                      : isDownstream
                      ? 'bg-amber-950/40 border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 z-20'
                      : isDimmed
                      ? 'opacity-25 bg-polar-dark/40 border border-polar-border/40 z-10'
                      : 'bg-polar-dark/90 hover:bg-polar-navy/80 border border-polar-border/80 hover:border-cyan-500/50 shadow-md z-10'
                  }`}
                >
                  {/* Glowing Outline & Corner Accents */}
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none transition-opacity"
                    style={{
                      boxShadow: isHovered ? `0 0 25px rgba(${node.accentRgb}, 0.35)` : undefined,
                      borderColor: isHovered ? node.color : undefined
                    }}
                  />

                  {/* Header Row: Icon, Domain Title, Tier Tag & Link */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="p-2 rounded-lg border flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm"
                        style={{
                          background: `rgba(${node.accentRgb}, 0.15)`,
                          borderColor: `rgba(${node.accentRgb}, 0.45)`,
                          color: node.color
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                          {node.name}
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 whitespace-nowrap">
                          {node.shortName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {isHovered ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 flex items-center gap-1">
                          <span>OPEN</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      ) : isUpstream ? (
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50">
                          DRIVER
                        </span>
                      ) : isDownstream ? (
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/50">
                          IMPACT
                        </span>
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Live Telemetry Row: Large Primary KPI + Sub-metrics */}
                  <div className="flex items-baseline justify-between border-t border-polar-border/40 pt-1.5 mt-1 font-mono">
                    <div>
                      <span className="text-base font-black text-white tracking-tight">
                        {live.kpi}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {live.sub}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[10px] font-bold text-cyan-300/90">
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                        style={{ background: node.color }}
                      />
                      <span className="text-[9px] text-slate-300 truncate max-w-[100px]">
                        {live.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossDomainCausalTree;
