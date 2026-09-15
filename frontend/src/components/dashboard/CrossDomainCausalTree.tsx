import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import {
  Zap, CloudSnow, Fuel, Wrench, Droplet, Truck, Users, Radio, Archive,
  ExternalLink, GitCompare, GitCommit, Brain, ChevronRight
} from 'lucide-react';
import { OperationalDomainCard } from './OperationalDomainCard';

export interface TreeNode {
  id: string;
  name: string;
  shortDesc: string;
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
}

// 9 Interconnected Operational Domains organized in strict Causal Priority Tiers
// Canvas Dimensions: 1220px x 1040px
export const TREE_NODES: TreeNode[] = [
  // ── Tier 1: Primary Environmental & Supply Forcing (y = 35) ──
  {
    id: 'environment',
    name: 'Environment & Weather',
    shortDesc: 'Polar Atmosphere, Katabatic Wind Chill & Storm Severity',
    tier: 'TIER 1 • ROOT CLIMATE DRIVER',
    tierNumber: 1,
    x: 220,
    y: 35,
    w: 350,
    h: 180,
    route: 'environment',
    icon: CloudSnow,
    color: '#00e5ff',
    accentRgb: '0, 229, 255'
  },
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    shortDesc: 'Overland Traverse Convoys, Cargo Resupply & Vessel ETA',
    tier: 'TIER 1 • EXPEDITION RESUPPLY',
    tierNumber: 1,
    x: 650,
    y: 35,
    w: 350,
    h: 180,
    route: 'logistics',
    icon: Truck,
    color: '#f97316',
    accentRgb: '249, 115, 22'
  },

  // ── Tier 2: Storage Reserves & Conversion Machinery (y = 295) ──
  {
    id: 'fuel',
    name: 'Fuel Depot',
    shortDesc: 'Antarctic Low-Freeze Diesel (AGO) Storage & Autonomy',
    tier: 'TIER 2 • ENERGY RESERVE',
    tierNumber: 2,
    x: 40,
    y: 295,
    w: 350,
    h: 180,
    route: 'fuel',
    icon: Fuel,
    color: '#ef4444',
    accentRgb: '239, 68, 68'
  },
  {
    id: 'inventory',
    name: 'Storage & Inventory',
    shortDesc: 'Critical Spares Safety Buffer, Consumables & Parts Readiness',
    tier: 'TIER 2 • CRITICAL SPARES',
    tierNumber: 2,
    x: 435,
    y: 295,
    w: 350,
    h: 180,
    route: 'inventory',
    icon: Archive,
    color: '#14b8a6',
    accentRgb: '20, 184, 166'
  },
  {
    id: 'equipment',
    name: 'Equipment & Machinery',
    shortDesc: 'Mechanical Asset Health, Vibration Spectrum & Maintenance',
    tier: 'TIER 2 • POWER CONVERSION',
    tierNumber: 2,
    x: 830,
    y: 295,
    w: 350,
    h: 180,
    route: 'equipment',
    icon: Wrench,
    color: '#22c55e',
    accentRgb: '34, 197, 94'
  },

  // ── Tier 3: Central Microgrid Power Core (y = 555) ──
  {
    id: 'energy',
    name: 'Energy & Power',
    shortDesc: 'Diesel Generation, Solar PV & Microgrid Battery Reserve',
    tier: 'TIER 3 • CENTRAL MICROGRID',
    tierNumber: 3,
    x: 420,
    y: 555,
    w: 380,
    h: 180,
    route: 'energy',
    icon: Zap,
    color: '#eab308',
    accentRgb: '234, 179, 8'
  },

  // ── Tier 4: Life Support, Human Habitation & Telemetry (y = 815) ──
  {
    id: 'water',
    name: 'Water Supply & Thermal Line',
    shortDesc: 'Glacial Melt / Seawater RO Desalination & Pipe Trace Heating',
    tier: 'TIER 4 • WATER LIFELINE',
    tierNumber: 4,
    x: 40,
    y: 815,
    w: 350,
    h: 180,
    route: 'water',
    icon: Droplet,
    color: '#38bdf8',
    accentRgb: '56, 189, 248'
  },
  {
    id: 'personnel',
    name: 'Personnel & Occupancy',
    shortDesc: 'Crew Circadian Distribution, Life Support & Atmospheric Safety',
    tier: 'TIER 4 • HABITAT OCCUPANCY',
    tierNumber: 4,
    x: 435,
    y: 815,
    w: 350,
    h: 180,
    route: 'personnel',
    icon: Users,
    color: '#ec4899',
    accentRgb: '236, 72, 153'
  },
  {
    id: 'communication',
    name: 'Communication',
    shortDesc: 'LEO Polar Constellation, Low Latency & QoS Telemetry Sync',
    tier: 'TIER 4 • REAL-TIME TELEMETRY',
    tierNumber: 4,
    x: 830,
    y: 815,
    w: 350,
    h: 180,
    route: 'communication',
    icon: Radio,
    color: '#8b5cf6',
    accentRgb: '139, 92, 246'
  },
];

// Pristine Causal Edges connecting upstream drivers to downstream consequences
const TREE_EDGES: TreeEdgeDef[] = [
  // 1. Environment -> Logistics (Horizontal atmospheric forcing)
  { id: 'env-log', from: 'environment', to: 'logistics', label: 'Katabatic wind & blizzards' },

  // 2. Environment -> Energy (Direct heating load & PV solar offset)
  { id: 'env-eng', from: 'environment', to: 'energy', label: 'Heating demand & PV offset' },

  // 3. Environment -> Water (Direct conduit freeze hazard)
  { id: 'env-wat', from: 'environment', to: 'water', label: 'Conduit freeze hazard' },

  // 4. Environment -> Communication (Atmospheric RF ionization attenuation)
  { id: 'env-comm', from: 'environment', to: 'communication', label: 'Blizzard ionization & RF attenuation' },

  // 5. Logistics -> Fuel (Bulk AGO resupply tankers)
  { id: 'log-fl', from: 'logistics', to: 'fuel', label: 'Annual diesel replenishment' },

  // 6. Logistics -> Inventory (Container spares manifest)
  { id: 'log-inv', from: 'logistics', to: 'inventory', label: 'Spares & consumables restock' },

  // 7. Inventory -> Equipment (Preventive maintenance spares)
  { id: 'inv-eq', from: 'inventory', to: 'equipment', label: 'Bearings & filter staging' },

  // 8. Fuel -> Energy (Continuous hydrocarbon fuel feed)
  { id: 'fl-eng', from: 'fuel', to: 'energy', label: '17.5 L/hr diesel supply' },

  // 9. Equipment -> Energy (Mechanical alternator health & genset synchro)
  { id: 'eq-eng', from: 'equipment', to: 'energy', label: 'Genset alternator uptime' },

  // 10. Energy -> Water (4.2 kW pipeline trace heating protection)
  { id: 'eng-wat', from: 'energy', to: 'water', label: '4.2 kW trace line heating' },

  // 11. Energy -> Personnel (Microgrid warmth, life support & galley)
  { id: 'eng-pers', from: 'energy', to: 'personnel', label: 'Habitat heating & power' },

  // 12. Energy -> Communication (Radome UPS & transmitter power)
  { id: 'eng-comm', from: 'energy', to: 'communication', label: 'Radome UPS & uplink power' },

  // 13. Water -> Personnel (Potable hydration & galley supply)
  { id: 'wat-pers', from: 'water', to: 'personnel', label: 'Filtered potable hydration' },

  // 14. Personnel -> Communication (Mission coordination & SCADA operations)
  { id: 'pers-comm', from: 'personnel', to: 'communication', label: 'Operator SCADA command' },
];

interface Props {
  stationId?: string;
  onOpenCompare?: () => void;
  onSelectDomain?: (domainId: string) => void;
  selectedDomainId?: string | null;
  domainData?: Record<string, any>;
  children?: React.ReactNode;
}

export const CrossDomainCausalTree: React.FC<Props> = ({
  stationId: propStationId,
  onOpenCompare,
  onSelectDomain,
  selectedDomainId,
  domainData,
}) => {
  const navigate = useNavigate();
  const { selectedStationId } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const currentStationId = propStationId || selectedStationId || 'maitri';
  const isMaitri = currentStationId === 'maitri';
  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';
  const snapshot = liveSnapshot[currentStationId];

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Fallback Live KPIs per domain
  const fallbackData = useMemo(() => {
    const env = snapshot?.environment;
    const eng = snapshot?.energy;
    const fl = snapshot?.fuel;
    const wt = snapshot?.water;
    const eq = snapshot?.equipment;
    const pers = snapshot?.personnel;
    const comm = snapshot?.communication;

    return {
      environment: {
        score: 86,
        primaryKpi: `${env?.temperature?.toFixed(1) ?? (isMaitri ? -25.2 : -18.4)}°C`,
        primaryLabel: 'Ambient Temp',
        chillC: isMaitri ? -38.4 : -31.2,
        windSpeed: env?.wind_speed ?? (isMaitri ? 32 : 44),
        windGust: env?.wind_gust ?? (isMaitri ? 54 : 68),
      },
      logistics: {
        score: 88,
        primaryKpi: isMaitri ? '88 Days' : '102 Days',
        primaryLabel: 'Resupply ETA',
        journeyProgressPct: isMaitri ? 65 : 40,
        transportMode: isMaitri ? '100km PistenBully Polar Convoy' : 'MV Vasiliy Golovnin Polar Sea Shuttle',
      },
      fuel: {
        score: 95,
        primaryKpi: `${fl?.fuel_percentage?.toFixed(1) ?? (isMaitri ? 78.0 : 85.7)}%`,
        primaryLabel: 'Reserve Level',
        currentLiters: fl?.current_level ?? (isMaitri ? 142000 : 180000),
        burnRateLh: fl?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.2),
        daysRemaining: fl?.days_remaining ?? (isMaitri ? 18 : 24),
      },
      inventory: {
        score: 97,
        primaryKpi: '0 Stockouts',
        primaryLabel: 'Spares Safety Buffer',
        medicalStockDays: isMaitri ? 180 : 240,
        oilStockLiters: isMaitri ? 1200 : 1800,
      },
      equipment: {
        score: 93,
        primaryKpi: `${eq?.avg_health?.toFixed(1) ?? (isMaitri ? 93.5 : 96.2)}%`,
        primaryLabel: 'Fleet Health',
        activeMachinesCount: isMaitri ? 6 : 8,
        vibrationMmS: isMaitri ? 2.1 : 1.4,
      },
      energy: {
        score: 94,
        primaryKpi: `${eng?.generator_load ?? (isMaitri ? 68 : 82)} kW`,
        primaryLabel: 'Generator Load',
        solarKw: eng?.solar_output ?? (isMaitri ? 22 : 28),
        batterySoc: eng?.battery_level ?? (isMaitri ? 92 : 96),
        freqHz: eng?.grid_frequency ?? (isMaitri ? 50.08 : 50.02),
      },
      water: {
        score: 92,
        primaryKpi: `${wt?.storage_liters?.toLocaleString() ?? (isMaitri ? '18,500' : '24,000')} L`,
        primaryLabel: 'Potable Storage',
        percentage: wt?.percentage ?? (isMaitri ? 82 : 88),
        pipeTempC: wt?.pipe_temp_c ?? (isMaitri ? 3.8 : 4.6),
        freezeRisk: wt?.freeze_risk ?? 'LOW',
      },
      personnel: {
        score: 96,
        primaryKpi: `${pers?.headcount ?? (isMaitri ? 25 : 30)} Crew`,
        primaryLabel: 'Total Occupancy',
        occupancyPct: pers?.occupancy_pct ?? (isMaitri ? 62.5 : 75.0),
        totalPersonnel: pers?.headcount ?? (isMaitri ? 25 : 30),
        onDutyCount: isMaitri ? 18 : 22,
        roleBreakdown: [
          { label: 'Science', pct: 40, color: '#38bdf8' },
          { label: 'Eng', pct: 32, color: '#10b981' },
          { label: 'Medical', pct: 12, color: '#ec4899' },
          { label: 'Galley', pct: 16, color: '#f59e0b' }
        ],
      },
      communication: {
        score: 98,
        primaryKpi: `${comm?.bandwidth_mbps ?? (isMaitri ? 120 : 160)} Mbps`,
        primaryLabel: 'LEO Constellation',
        bandwidthMbps: comm?.bandwidth_mbps ?? (isMaitri ? 120 : 160),
        latencyMs: comm?.latency_ms ?? (isMaitri ? 78 : 65),
        syncState: comm?.sync_state ?? 'SYNCED',
      }
    };
  }, [snapshot, isMaitri]);

  // Causal edge highlights based on hovered node
  const activeIncomingEdges = useMemo(() => {
    if (!hoveredNodeId) return [];
    return TREE_EDGES.filter((e) => e.to === hoveredNodeId);
  }, [hoveredNodeId]);

  const activeOutgoingEdges = useMemo(() => {
    if (!hoveredNodeId) return [];
    return TREE_EDGES.filter((e) => e.from === hoveredNodeId);
  }, [hoveredNodeId]);

  // Precision pin calculations connecting card borders
  const getEdgeConnection = (edge: TreeEdgeDef) => {
    const fromNode = TREE_NODES.find((n) => n.id === edge.from);
    const toNode = TREE_NODES.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    let sx = fromNode.x + fromNode.w / 2;
    let sy = fromNode.y + fromNode.h;
    let tx = toNode.x + toNode.w / 2;
    let ty = toNode.y;

    switch (edge.id) {
      case 'env-log':
        // Environment right border to Logistics left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} C ${sx + 40} ${sy}, ${tx - 40} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'env-eng':
        // Environment bottom-center border directly into Energy top-left border
        sx = fromNode.x + fromNode.w / 2;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + 60;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx} ${sy + 120}, ${tx} ${ty - 120}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'env-wat':
        // Environment left border down along clear left perimeter into Water top-left border
        sx = fromNode.x;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x + 40;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx - 190} ${sy}, ${tx - 60} ${ty - 120}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'env-comm':
        // Environment top-right border over the top and down right channel into Communication top-right
        sx = fromNode.x + fromNode.w - 30;
        sy = fromNode.y;
        tx = toNode.x + toNode.w - 35;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx + 100} ${sy - 28}, 1210 10, 1210 400 C 1210 650, ${tx + 40} ${ty - 100}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'log-fl':
        // Logistics bottom-left border down into Fuel top-center border
        sx = fromNode.x + 60;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx} ${sy + 30}, ${tx} ${ty - 30}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'log-inv':
        // Logistics bottom-center border into Inventory top-center border
        sx = fromNode.x + fromNode.w / 2;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w - 60;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx} ${sy + 30}, ${tx} ${ty - 30}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'inv-eq':
        // Inventory right border into Equipment left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} C ${sx + 25} ${sy}, ${tx - 25} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'fl-eng':
        // Fuel right border into Energy left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + 60;
        return {
          path: `M ${sx} ${sy} C ${sx + 30} ${sy}, ${tx - 30} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'eq-eng':
        // Equipment left border into Energy right border
        sx = fromNode.x;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x + toNode.w;
        ty = toNode.y + 60;
        return {
          path: `M ${sx} ${sy} C ${sx - 30} ${sy}, ${tx + 30} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'eng-wat':
        // Energy bottom-left border into Water top-center border
        sx = fromNode.x + 80;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx} ${sy + 30}, ${tx} ${ty - 30}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'eng-pers':
        // Energy bottom-center border directly into Personnel top-center border
        sx = fromNode.x + fromNode.w / 2;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} L ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'eng-comm':
        // Energy bottom-right border into Communication top-center border
        sx = fromNode.x + fromNode.w - 80;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx} ${sy + 30}, ${tx} ${ty - 30}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'wat-pers':
        // Water right border into Personnel left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} C ${sx + 25} ${sy}, ${tx - 25} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'pers-comm':
        // Personnel right border into Communication left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} C ${sx + 25} ${sy}, ${tx - 25} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      default:
        const dy = ty - sy;
        return {
          path: `M ${sx} ${sy} C ${sx} ${sy + dy * 0.5}, ${tx} ${ty - dy * 0.5}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden bg-gradient-to-b from-[#071326]/95 to-[#030914]/98 shadow-2xl transition-all duration-300">
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: accentColor }}
      />

      {/* ── TOP INTEGRATED HEADER & MISSION CONTROLS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-polar-dark/80 text-slate-300 border border-polar-border shadow-inner">
              {isMaitri ? '70°45′S 11°44′E • Inland Schirmacher' : '69°24′S 76°11′E • Coastal Larsemann'}
            </span>
          </div>

          <h1 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5 font-mono">
            <GitCommit className="w-5 h-5 text-cyan-400" />
            <span>Inter-Domain Causal Propagation Architecture</span>
          </h1>
        </div>

        {/* Right Action Controls: Compare Stations Toolbar */}
        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto flex-shrink-0">
          {/* Compare Stations Button */}
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="h-10 px-4 rounded-xl text-sm font-mono font-bold bg-polar-dark/90 hover:bg-cyan-950/40 border border-polar-border hover:border-cyan-400/50 text-slate-300 hover:text-white flex items-center gap-2.5 transition-all shadow-md group flex-shrink-0"
            >
              <GitCompare className="w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
              <span>Compare Stations</span>
            </button>
          )}
        </div>
      </div>

      {/* ── GRAPH VIEW: 2D TOPOLOGICAL DAG ── */}
      <div className="relative w-full">
        <div className="relative overflow-x-auto mt-2 py-2 rounded-2xl bg-polar-dark/60 border border-polar-border/50">
          <div className="min-w-[1220px] h-[1040px] relative">
            {/* ── HTML NODE CARDS: RICH OPERATIONAL DOMAIN INSTRUMENTS ── */}
            {TREE_NODES.map((node) => {
              const t = (domainData && domainData[node.id]) || (fallbackData as any)[node.id];
              const isHovered = hoveredNodeId === node.id;
              const isUpstream = Boolean(hoveredNodeId && activeIncomingEdges.some((e) => e.from === node.id));
              const isDownstream = Boolean(hoveredNodeId && activeOutgoingEdges.some((e) => e.to === node.id));
              const isDimmed = Boolean(hoveredNodeId && !isHovered && !isUpstream && !isDownstream);
              const isSelected = selectedDomainId === node.id;

              return (
                <OperationalDomainCard
                  key={node.id}
                  node={node}
                  data={t}
                  stationId={currentStationId}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  isUpstream={isUpstream}
                  isDownstream={isDownstream}
                  isDimmed={isDimmed}
                  showFooterButtons={false}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => navigate(`/station/${currentStationId}/${node.route}`)}
                  onSelectDomain={onSelectDomain}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.w}px`,
                    height: `${node.h}px`,
                  }}
                />
              );
            })}

            {/* SVG Canvas for High-Precision Causal Conduits & Border Terminal Pins */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 1220 1080">
              <defs>
                <filter id="neonGlowCyan" x="0" y="0" width="1220" height="1080" filterUnits="userSpaceOnUse">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="neonGlowAmber" x="0" y="0" width="1220" height="1080" filterUnits="userSpaceOnUse">
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

                const conn = getEdgeConnection(edge);
                if (!conn) return null;

                // Calibrated ultra-bright neon colors
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
                      d={conn.path}
                      fill="none"
                      stroke={haloColor}
                      strokeWidth={14}
                      strokeOpacity={0.3}
                      strokeLinecap="round"
                    />

                    {/* Layer 2: Medium Saturating Neon Aura */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke={auraColor}
                      strokeWidth={8}
                      strokeOpacity={0.6}
                      strokeLinecap="round"
                    />

                    {/* Layer 3: Solid Vivid Saturated Neon Conduit Beam */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={3.5}
                      strokeOpacity={1.0}
                      strokeLinecap="round"
                    />

                    {/* Layer 4: Luminous High-Intensity Energy Core */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke={coreColor}
                      strokeWidth={1.2}
                      strokeOpacity={0.95}
                      strokeLinecap="round"
                    />

                    {/* Layer 5: Precision Terminal Port Pins attached directly onto Card Borders */}
                    <circle
                      cx={conn.sx}
                      cy={conn.sy}
                      r={4.5}
                      fill={coreColor}
                      stroke={strokeColor}
                      strokeWidth={2.5}
                    />
                    <circle
                      cx={conn.tx}
                      cy={conn.ty}
                      r={4.5}
                      fill={coreColor}
                      stroke={strokeColor}
                      strokeWidth={2.5}
                    />

                    {/* Layer 6: Live Fast-Traveling Energized Photon Bead */}
                    <circle r={5} fill={coreColor} stroke={strokeColor} strokeWidth={2.5}>
                      <animateMotion
                        dur="1.6s"
                        repeatCount="indefinite"
                        path={conn.path}
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CrossDomainCausalTree;
