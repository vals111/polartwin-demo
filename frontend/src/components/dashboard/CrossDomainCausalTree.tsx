import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import {
  Zap, CloudSnow, Fuel, Droplet, Truck, Users, Radio, Archive,
  ExternalLink, GitCompare, GitCommit, Brain, ChevronRight, Building2
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
// Canvas Dimensions: 1420px x 1310px - Precision 4-Tier Causal DAG
export const TREE_NODES: TreeNode[] = [
  // ── 1. Infrastructure (Row 1 Left) ──
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    shortDesc: 'Habitat Envelope, Structural Wind Stress & Building Integrity',
    tier: 'STRUCTURAL ENVELOPE',
    tierNumber: 1,
    x: 220,
    y: 35,
    w: 440,
    h: 250,
    route: 'infrastructure',
    icon: Building2,
    color: '#06b6d4',
    accentRgb: '6, 182, 212'
  },
  // ── 2. Energy & Fuel (Row 1 Right) ──
  {
    id: 'energy_fuel',
    name: 'Energy & Fuel',
    shortDesc: 'Diesel Generation, Solar PV, Power grid Battery & Bulk Fuel Storage',
    tier: 'CENTRAL POWER & FUEL CORE',
    tierNumber: 1,
    x: 760,
    y: 35,
    w: 440,
    h: 250,
    route: 'energy',
    icon: Zap,
    color: '#eab308',
    accentRgb: '234, 179, 8'
  },
  // ── 3. Transportation & Logistics (Row 2 Left) ──
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    shortDesc: 'Overland Traverse Supply runs, Cargo Resupply & Vessel ETA',
    tier: 'EXPEDITION RESUPPLY',
    tierNumber: 2,
    x: 220,
    y: 360,
    w: 440,
    h: 250,
    route: 'logistics',
    icon: Truck,
    color: '#f97316',
    accentRgb: '249, 115, 22'
  },
  // ── 4. Environment & Weather (Row 2 Right) ──
  {
    id: 'environment',
    name: 'Environment & Weather',
    shortDesc: 'Polar Atmosphere, Polar downslope wind Wind Chill & Storm Severity',
    tier: 'ROOT CLIMATE DRIVER',
    tierNumber: 2,
    x: 760,
    y: 360,
    w: 440,
    h: 250,
    route: 'environment',
    icon: CloudSnow,
    color: '#00e5ff',
    accentRgb: '0, 229, 255'
  },
  // ── 5. Water (Row 3 Left) ──
  {
    id: 'water',
    name: 'Water',
    shortDesc: 'Glacial Melt / Seawater RO Seawater purification & Pipe Trace Heating',
    tier: 'WATER LIFELINE',
    tierNumber: 3,
    x: 40,
    y: 685,
    w: 420,
    h: 250,
    route: 'water',
    icon: Droplet,
    color: '#38bdf8',
    accentRgb: '56, 189, 248'
  },
  // ── 6. Personnel Safety & Emergency (Row 3 Center) ──
  {
    id: 'personnel',
    name: 'Personnel Safety & Emergency',
    shortDesc: 'Crew Headcount, Circadian Diurnal Demand, Life Safety & Shelter Readiness',
    tier: 'HABITAT OCCUPANCY & SAFETY',
    tierNumber: 3,
    x: 500,
    y: 685,
    w: 420,
    h: 250,
    route: 'personnel',
    icon: Users,
    color: '#a855f7',
    accentRgb: '168, 85, 247'
  },
  // ── 7. Communication (Row 3 Right) ──
  {
    id: 'communication',
    name: 'Communication',
    shortDesc: 'LEO Polar Constellation, Low Signal delay & QoS Telemetry Sync',
    tier: 'REAL-TIME LIVE DATA',
    tierNumber: 3,
    x: 960,
    y: 685,
    w: 420,
    h: 250,
    route: 'communication',
    icon: Radio,
    color: '#8b5cf6',
    accentRgb: '139, 92, 246'
  },
];

// Pristine Causal Edges connecting upstream drivers to downstream consequences
const TREE_EDGES: TreeEdgeDef[] = [
  // 1. Environment -> Logistics (Horizontal weather layer forcing)
  { id: 'env-log', from: 'environment', to: 'logistics', label: 'polar downslope wind & blizzards' },

  // 2. Environment -> Infrastructure (Direct wind shear stress & thermal chill)
  { id: 'env-infra', from: 'environment', to: 'infrastructure', label: 'polar downslope wind stress & chill' },

  // 3. Environment -> Energy & Fuel (Direct heating load & PV solar offset)
  { id: 'env-eng', from: 'environment', to: 'energy_fuel', label: 'Heating demand & PV offset' },

  // 4. Environment -> Water (Direct conduit freeze hazard)
  { id: 'env-wat', from: 'environment', to: 'water', label: 'Conduit freeze hazard' },

  // 5. Environment -> Communication (Weather layer RF ionization attenuation)
  { id: 'env-comm', from: 'environment', to: 'communication', label: 'Blizzard ionization & RF attenuation' },

  // 6. Logistics -> Energy & Fuel (Bulk AGO resupply tankers)
  { id: 'log-fl', from: 'logistics', to: 'energy_fuel', label: 'Annual diesel replenishment' },

  // 7. Logistics -> Infrastructure (Module structural panels & seals restock)
  { id: 'log-infra', from: 'logistics', to: 'infrastructure', label: 'Module seals & panel restock' },

  // 8. Infrastructure -> Energy & Fuel (Core shelter enclosure & microgrid housing)
  { id: 'infra-eng', from: 'infrastructure', to: 'energy_fuel', label: 'Habitat shelter & microgrid housing' },

  // 9. Energy & Fuel -> Water (4.2 kW pipeline trace heating protection)
  { id: 'eng-wat', from: 'energy_fuel', to: 'water', label: '4.2 kW trace line heating' },

  // 10. Energy & Fuel -> Personnel (Power grid warmth, life support & galley)
  { id: 'eng-pers', from: 'energy_fuel', to: 'personnel', label: 'Habitat heating & power' },

  // 11. Energy & Fuel -> Communication (Radome UPS & transmitter power)
  { id: 'eng-comm', from: 'energy_fuel', to: 'communication', label: 'Radome UPS & uplink power' },

  // 12. Water -> Personnel (Potable hydration & galley supply)
  { id: 'wat-pers', from: 'water', to: 'personnel', label: 'Filtered potable hydration' },

  // 13. Personnel -> Communication (Mission coordination & Automated Control System operations)
  { id: 'pers-comm', from: 'personnel', to: 'communication', label: 'Operator Automated Control System command' },
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

  // Responsive scale calculation to fit all domain cards within the external card without sliding
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 16;
        if (availableWidth >= 1420) {
          setScale(1);
        } else {
          // Proportionally scale to viewport width so all cards are 100% visible with zero horizontal sliding
          const s = Math.max(0.6, availableWidth / 1420);
          setScale(s);
        }
      }
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(containerRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

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
        transportMode: isMaitri ? '100km PistenBully Polar Supply run' : 'MV Vasiliy Golovnin Polar Sea Shuttle',
      },
      energy_fuel: {
        score: 95,
        primaryKpi: `${eng?.generator_load ?? (isMaitri ? 68 : 82)} kW • ${fl?.fuel_percentage?.toFixed(1) ?? (isMaitri ? 78.0 : 85.7)}%`,
        primaryLabel: 'Load & Reserve',
        fuelPercentage: fl?.fuel_percentage ?? (isMaitri ? 78.0 : 85.7),
        solarKw: eng?.solar_output ?? (isMaitri ? 22 : 28),
        batterySoc: eng?.battery_level ?? (isMaitri ? 92 : 96),
        freqHz: eng?.grid_frequency ?? (isMaitri ? 50.08 : 50.02),
        currentLiters: fl?.current_level ?? (isMaitri ? 142000 : 180000),
        burnRateLh: fl?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.2),
        daysRemaining: fl?.days_remaining ?? (isMaitri ? 18 : 24),
      },
      fuel: {
        score: 95,
        primaryKpi: `${fl?.fuel_percentage?.toFixed(1) ?? (isMaitri ? 78.0 : 85.7)}%`,
        primaryLabel: 'Reserve Level',
        currentLiters: fl?.current_level ?? (isMaitri ? 142000 : 180000),
        burnRateLh: fl?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.2),
        daysRemaining: fl?.days_remaining ?? (isMaitri ? 18 : 24),
      },
      infrastructure: {
        score: 94,
        primaryKpi: `${snapshot?.infrastructure?.structural_stress_index ?? (isMaitri ? 18 : 12)} / 100`,
        primaryLabel: 'Wind Stress',
        stressIndex: snapshot?.infrastructure?.structural_stress_index ?? (isMaitri ? 18 : 12),
        thermalEff: snapshot?.infrastructure?.thermal_insulation_eff ?? (isMaitri ? 88.0 : 96.0),
        snowDriftM: snapshot?.infrastructure?.snow_drift_accumulation_m ?? (isMaitri ? 0.42 : 0.25),
        activeModules: 4,
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
        // Environment left border into Logistics right border
        sx = fromNode.x;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x + toNode.w;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} C ${sx - 35} ${sy}, ${tx + 35} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'env-eng':
        // Environment top border directly into Energy & Fuel bottom border
        sx = fromNode.x + fromNode.w / 2;
        sy = fromNode.y;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y + toNode.h;
        return {
          path: `M ${sx} ${sy} L ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'env-wat':
        // Environment bottom-left border down into Water top border
        sx = fromNode.x + 80;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx - 150} ${sy + 50}, ${tx + 80} ${ty - 50}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'env-comm':
        // Environment bottom-right border directly into Communication top border
        sx = fromNode.x + fromNode.w - 80;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx + 40} ${sy + 40}, ${tx} ${ty - 40}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'log-fl':
        // Logistics right-upper border into Energy & Fuel left-lower border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + 40;
        tx = toNode.x;
        ty = toNode.y + toNode.h - 40;
        return {
          path: `M ${sx} ${sy} C ${sx + 45} ${sy}, ${tx - 45} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'env-infra':
        // Environment left-upper border into Infrastructure right-lower border
        sx = fromNode.x;
        sy = fromNode.y + 40;
        tx = toNode.x + toNode.w;
        ty = toNode.y + toNode.h - 40;
        return {
          path: `M ${sx} ${sy} C ${sx - 45} ${sy}, ${tx + 45} ${ty}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'log-infra':
        // Logistics top border directly up into Infrastructure bottom border
        sx = fromNode.x + fromNode.w / 2;
        sy = fromNode.y;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y + toNode.h;
        return {
          path: `M ${sx} ${sy} L ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'infra-eng':
        // Infrastructure right border into Energy & Fuel left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} L ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'eng-wat':
        // Energy & Fuel bottom-left border into Water top-center border
        sx = fromNode.x + 80;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx - 200} ${sy + 180}, ${tx + 100} ${ty - 180}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'eng-pers':
        // Energy & Fuel bottom-center border directly into Personnel top-center border
        sx = fromNode.x + fromNode.w / 2;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx} ${sy + 150}, ${tx} ${ty - 150}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'eng-comm':
        // Energy & Fuel bottom-right border into Communication top-center border
        sx = fromNode.x + fromNode.w - 80;
        sy = fromNode.y + fromNode.h;
        tx = toNode.x + toNode.w / 2;
        ty = toNode.y;
        return {
          path: `M ${sx} ${sy} C ${sx + 60} ${sy + 150}, ${tx} ${ty - 150}, ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'wat-pers':
        // Water right border into Personnel left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} L ${tx} ${ty}`,
          sx, sy, tx, ty
        };

      case 'pers-comm':
        // Personnel right border into Communication left border
        sx = fromNode.x + fromNode.w;
        sy = fromNode.y + fromNode.h / 2;
        tx = toNode.x;
        ty = toNode.y + toNode.h / 2;
        return {
          path: `M ${sx} ${sy} L ${tx} ${ty}`,
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
    <div
      className="p-6 rounded-2xl relative overflow-hidden transition-all duration-300"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 mb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2.5 font-mono" style={{ color: 'var(--text-primary)' }}>
            <GitCommit className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span>Dashboard</span>
          </h2>
        </div>
        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto flex-shrink-0">
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="h-10 px-4 rounded-xl text-sm font-mono font-bold flex items-center gap-2.5 transition-all flex-shrink-0 cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <GitCompare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>Compare Stations</span>
            </button>
          )}
        </div>
      </div>

      {/* ── GRAPH CANVAS ── */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <div
          className="relative mt-2 py-3 rounded-2xl flex justify-center items-start overflow-hidden transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            height: `${Math.round(980 * scale + 24)}px`,
          }}
        >
          <div
            className="w-[1420px] h-[980px] relative flex-shrink-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
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
                  showFooterButtons={true}
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
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 1420 980">
              <defs>
                <filter id="neonGlowCyan" x="0" y="0" width="1420" height="980" filterUnits="userSpaceOnUse">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="neonGlowAmber" x="0" y="0" width="1420" height="980" filterUnits="userSpaceOnUse">
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

                // Adapted edge colors for both themes (strong enough to read on light)
                const strokeColor = isIncoming ? '#0284c7' : '#d97706';
                const auraColor = isIncoming ? '#38bdf8' : '#fbbf24';
                const haloColor = isIncoming ? '#bfdbfe' : '#fde68a';
                const coreColor = isIncoming ? '#eff6ff' : '#fffbeb';

                return (
                  <g
                    key={edge.id}
                    className="transition-all duration-300"
                    style={{
                      filter: isIncoming
                        ? 'none'
                        : 'none'
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
