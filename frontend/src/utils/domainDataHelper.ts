import {
  Zap, CloudSnow, Fuel, Wrench, Droplet, Truck, Users, Radio, Archive,
  Building2, Sun, Thermometer, Shield
} from 'lucide-react';
import { DomainCardNode, CausalConduitsDef } from '../components/dashboard/OperationalDomainCard';
import { TREE_NODES, TreeEdgeDef } from '../components/dashboard/CrossDomainCausalTree';

// Extended Causal Edges for domain connections
export const CAUSAL_EDGES: TreeEdgeDef[] = [
  { id: 'env-log', from: 'environment', to: 'logistics', label: 'Katabatic wind & blizzards' },
  { id: 'env-eng', from: 'environment', to: 'energy', label: 'Heating demand & PV offset' },
  { id: 'env-wat', from: 'environment', to: 'water', label: 'Conduit freeze hazard' },
  { id: 'env-comm', from: 'environment', to: 'communication', label: 'Blizzard ionization & RF attenuation' },
  { id: 'log-fl', from: 'logistics', to: 'fuel', label: 'Annual diesel replenishment' },
  { id: 'log-inv', from: 'logistics', to: 'inventory', label: 'Spares & consumables restock' },
  { id: 'inv-eq', from: 'inventory', to: 'equipment', label: 'Bearings & filter staging' },
  { id: 'fl-eng', from: 'fuel', to: 'energy', label: '17.5 L/hr diesel supply' },
  { id: 'eq-eng', from: 'equipment', to: 'energy', label: 'Genset alternator uptime' },
  { id: 'eng-wat', from: 'energy', to: 'water', label: '4.2 kW trace line heating' },
  { id: 'eng-pers', from: 'energy', to: 'personnel', label: 'Habitat heating & power' },
  { id: 'eng-comm', from: 'energy', to: 'communication', label: 'Radome UPS & uplink power' },
  { id: 'wat-pers', from: 'water', to: 'personnel', label: 'Potable hydration & galley' },
  { id: 'pers-main', from: 'personnel', to: 'main_station', label: 'Expedition personnel ops' },
  { id: 'main-eng', from: 'main_station', to: 'energy', label: 'Station load dispatch' },
  { id: 'eng-main', from: 'energy', to: 'main_station', label: 'Central microgrid supply' },
];

// Mapping from 3D building IDs to Domain IDs
export const FACILITY_TO_DOMAIN_MAP: Record<string, { domainId: string; subType?: string }> = {
  main_station:     { domainId: 'main_station' },
  power_house:      { domainId: 'energy', subType: 'diesel' },
  solar_array:      { domainId: 'energy', subType: 'solar' },
  fuel_depot:       { domainId: 'fuel' },
  water_facility:   { domainId: 'water' },
  waste_management: { domainId: 'water', subType: 'waste' },
  research_lab:     { domainId: 'equipment', subType: 'lab' },
  communication:    { domainId: 'communication' },
  personnel_area:   { domainId: 'personnel' },
  storage:          { domainId: 'inventory' },
  logistics_area:   { domainId: 'logistics' },
  environment:      { domainId: 'environment' },
};

// Complete set of domain card nodes including Main Station
export const ALL_DOMAIN_NODES: Record<string, DomainCardNode> = {
  main_station: {
    id: 'main_station',
    name: 'Main Station Operations',
    shortDesc: 'Central Station Command, Habitation & Multi-Domain Operations Hub',
    tier: 'TIER 0 • EXPEDITION COMMAND',
    tierNumber: 0,
    route: 'dashboard',
    icon: Building2,
    color: '#00e5ff',
    accentRgb: '0, 229, 255',
  },
  environment: {
    id: 'environment',
    name: 'Environment & Weather',
    shortDesc: 'Polar Atmosphere, Katabatic Wind Chill & Storm Severity',
    tier: 'TIER 1 • ROOT CLIMATE DRIVER',
    tierNumber: 1,
    route: 'environment',
    icon: CloudSnow,
    color: '#00e5ff',
    accentRgb: '0, 229, 255',
  },
  logistics: {
    id: 'logistics',
    name: 'Transportation & Logistics',
    shortDesc: 'Overland Traverse Convoys, Cargo Resupply & Vessel ETA',
    tier: 'TIER 1 • EXPEDITION RESUPPLY',
    tierNumber: 1,
    route: 'logistics',
    icon: Truck,
    color: '#f97316',
    accentRgb: '249, 115, 22',
  },
  fuel: {
    id: 'fuel',
    name: 'Fuel Depot',
    shortDesc: 'Antarctic Low-Freeze Diesel (AGO) Storage & Autonomy',
    tier: 'TIER 2 • ENERGY RESERVE',
    tierNumber: 2,
    route: 'fuel',
    icon: Fuel,
    color: '#ef4444',
    accentRgb: '239, 68, 68',
  },
  inventory: {
    id: 'inventory',
    name: 'Storage & Inventory',
    shortDesc: 'Critical Spares Safety Buffer, Consumables & Parts Readiness',
    tier: 'TIER 2 • CRITICAL SPARES',
    tierNumber: 2,
    route: 'inventory',
    icon: Archive,
    color: '#14b8a6',
    accentRgb: '20, 184, 166',
  },
  equipment: {
    id: 'equipment',
    name: 'Equipment & Machinery',
    shortDesc: 'Mechanical Asset Health, Vibration Spectrum & Maintenance',
    tier: 'TIER 2 • POWER CONVERSION',
    tierNumber: 2,
    route: 'equipment',
    icon: Wrench,
    color: '#22c55e',
    accentRgb: '34, 197, 94',
  },
  energy: {
    id: 'energy',
    name: 'Energy & Power',
    shortDesc: 'Diesel Generation, Solar PV & Microgrid Battery Reserve',
    tier: 'TIER 3 • CENTRAL MICROGRID',
    tierNumber: 3,
    route: 'energy',
    icon: Zap,
    color: '#eab308',
    accentRgb: '234, 179, 8',
  },
  water: {
    id: 'water',
    name: 'Water Supply & Thermal Line',
    shortDesc: 'Glacial Melt / Seawater RO Desalination & Pipe Trace Heating',
    tier: 'TIER 4 • WATER LIFELINE',
    tierNumber: 4,
    route: 'water',
    icon: Droplet,
    color: '#38bdf8',
    accentRgb: '56, 189, 248',
  },
  personnel: {
    id: 'personnel',
    name: 'Personnel & Occupancy',
    shortDesc: 'Crew Circadian Distribution, Life Support & Atmospheric Safety',
    tier: 'TIER 4 • HABITAT OCCUPANCY',
    tierNumber: 4,
    route: 'personnel',
    icon: Users,
    color: '#ec4899',
    accentRgb: '236, 72, 153',
  },
  communication: {
    id: 'communication',
    name: 'Communication',
    shortDesc: 'LEO Polar Constellation, Low Latency & QoS Telemetry Sync',
    tier: 'TIER 4 • REAL-TIME TELEMETRY',
    tierNumber: 4,
    route: 'communication',
    icon: Radio,
    color: '#8b5cf6',
    accentRgb: '139, 92, 246',
  },
};

// Compute incoming and outgoing causal conduits for any domain
export function getDomainCausalConduits(domainId: string): CausalConduitsDef {
  const incoming = CAUSAL_EDGES.filter(e => e.to === domainId).map(e => {
    const fromNode = ALL_DOMAIN_NODES[e.from];
    return {
      id: e.from,
      name: fromNode?.name || e.from,
      shortName: fromNode?.name?.split(' ')[0] || e.from,
    };
  });
  const outgoing = CAUSAL_EDGES.filter(e => e.from === domainId).map(e => {
    const toNode = ALL_DOMAIN_NODES[e.to];
    return {
      id: e.to,
      name: toNode?.name || e.to,
      shortName: toNode?.name?.split(' ')[0] || e.to,
    };
  });
  return { incoming, outgoing };
}

// Extract live domain telemetry dictionary
export function extractLiveDomainData(targetStationId: string, snap: any) {
  const isM = targetStationId === 'maitri';
  const env = snap?.environment;
  const eng = snap?.energy;
  const fl = snap?.fuel;
  const wt = snap?.water;
  const eq = snap?.equipment;
  const ops = snap?.station_ops;
  const comm = snap?.communication;
  const pers = snap?.personnel;

  return {
    main_station: {
      score: Math.round(ops?.overall_readiness ?? (isM ? 98 : 96)),
      status: (ops?.overall_readiness ?? 98) >= 90 ? 'Operational' : 'Degraded',
      primaryKpi: `${Math.round(ops?.overall_readiness ?? 98)}%`,
      primaryLabel: 'Base Readiness',
      headcount: pers?.headcount ?? (isM ? 42 : 35),
      indoorTemp: '19.4°C',
      hvacStatus: 'Active — 4,200 m³/hr',
      trend: [96, 97, 98, 97, 98, 98],
      architecture: isM ? 'Maitri Multi-Story Central Command Hub & Laboratory Wing' : 'Bharati Aerodynamic High-Latitude Living Pods on Stilts',
    },
    energy: {
      score: ops?.domain_readiness?.energy ?? (isM ? 94 : 97),
      status: isM ? 'Gen #1 Active' : 'Triple CHP Sync',
      primaryKpi: `${eng?.generator_load ?? (isM ? 68 : 82)} kW`,
      primaryLabel: 'Generator Load',
      solarKw: eng?.solar_output ?? (isM ? 22 : 28),
      batterySoc: eng?.battery_level ?? (isM ? 92 : 96),
      freqHz: eng?.grid_frequency ?? (isM ? 50.08 : 50.02),
      activeUnits: isM ? 'Dual 100kVA Kirloskar' : 'Triple 100kVA CHP Automation',
      trend: isM ? [62, 64, 65, 68, 70, 68] : [74, 76, 78, 82, 84, 82],
      architecture: isM ? 'Heritage Dual Diesel Gensets + 22 kW Rooftop Solar PV' : 'Combined Heat & Power (CHP) Loop + 35 kW Bifacial Solar Array',
    },
    environment: {
      score: ops?.domain_readiness?.environment ?? (isM ? 86 : 89),
      status: env?.condition ?? (isM ? 'Partly Cloudy' : 'Coastal Squall'),
      primaryKpi: `${env?.temperature?.toFixed(1) ?? (isM ? -25.2 : -18.4)}°C`,
      primaryLabel: 'Ambient Temp',
      chillC: isM ? -38.4 : -31.2,
      windSpeed: env?.wind_speed ?? (isM ? 32 : 44),
      windGust: env?.wind_gust ?? (isM ? 54 : 68),
      pressureHpa: env?.pressure ?? (isM ? 984 : 992),
      stormIndex: env?.storm_severity ?? (isM ? 0.28 : 0.38),
      trend: isM ? [-23.5, -24.1, -24.8, -25.2, -25.0, -25.2] : [-16.8, -17.2, -18.0, -18.4, -18.2, -18.4],
      architecture: isM ? 'Schirmacher Oasis Bedrock Plateau • Katabatic Drafts' : 'Larsemann Hills Coastal Ridge • Marine Gale Squalls',
    },
    fuel: {
      score: ops?.domain_readiness?.fuel ?? (isM ? 95 : 98),
      status: `${fl?.reserve_zone ?? 'Watch'} Zone`,
      primaryKpi: `${fl?.fuel_percentage?.toFixed(1) ?? (isM ? 78.0 : 85.7)}%`,
      primaryLabel: 'Reserve Level',
      currentLiters: fl?.current_level ?? (isM ? 142000 : 180000),
      capacityLiters: fl?.total_capacity ?? (isM ? 182000 : 210000),
      burnRateLh: fl?.consumption_rate_l_per_hr ?? (isM ? 17.5 : 21.2),
      daysRemaining: fl?.days_remaining ?? (isM ? 18 : 24),
      resupplyEtaDays: fl?.resupply_eta_days ?? (isM ? 88 : 102),
      trend: isM ? [80.2, 79.6, 79.1, 78.6, 78.2, 78.0] : [87.4, 87.0, 86.6, 86.2, 85.9, 85.7],
      architecture: isM ? '6 Bunded Above-Ground Steel Tanks with Tank Suction Pre-heaters' : 'Double-Walled ISO Containerized SCADA Farm with Heat Recovery',
    },
    water: {
      score: ops?.domain_readiness?.water ?? (isM ? 92 : 95),
      status: isM ? 'Trace Heat 4.2 kW Active' : 'SWRO Desal Batching',
      primaryKpi: `${wt?.storage_liters?.toLocaleString() ?? (isM ? '18,500' : '24,000')} L`,
      primaryLabel: 'Potable Storage',
      percentage: wt?.percentage ?? (isM ? 82.0 : 88.0),
      pipeTempC: wt?.pipe_temp_c ?? (isM ? 3.8 : 4.6),
      freezeRisk: wt?.freeze_risk ?? 'LOW',
      consumptionLd: isM ? 850 : 1020,
      trend: isM ? [19200, 19000, 18800, 18650, 18550, 18500] : [22500, 22800, 23200, 23600, 23900, 24000],
      architecture: isM ? 'Priyadarshini (Lake Zub) Pump House with 800m Insulated Heated Pipeline' : 'Quilty Bay Marine Infiltration Intake + Seawater Reverse Osmosis (SWRO)',
    },
    equipment: {
      score: ops?.domain_readiness?.equipment ?? (isM ? 93.5 : 96.2),
      status: '5 Nominal • 1 Watch',
      primaryKpi: `${eq?.avg_health?.toFixed(1) ?? (isM ? 93.5 : 96.2)}%`,
      primaryLabel: 'Fleet Health',
      activeMachinesCount: isM ? 6 : 8,
      vibrationMmS: isM ? 2.1 : 1.4,
      runHoursGen1: isM ? 8420 : 5120,
      trend: isM ? [95.0, 94.8, 94.2, 93.8, 93.6, 93.5] : [97.1, 96.8, 96.5, 96.4, 96.3, 96.2],
      architecture: isM ? 'Kirloskar Heavy GenSets, Centrifugal Water Pumps, Oil Burners' : 'Automated CHP Units, High-Pressure RO Pumps, Integrated HVAC',
    },
    logistics: {
      score: ops?.domain_readiness?.logistics ?? (isM ? 88 : 94),
      status: isM ? 'Overland Traverse Active' : 'Coastal Mooring Ready',
      primaryKpi: isM ? '88 Days' : '102 Days',
      primaryLabel: 'Resupply ETA',
      transitDistanceKm: isM ? 100 : 3.5,
      transportMode: isM ? 'PistenBully Snow Groomer Trains' : 'Fast-Ice Mooring & Ka-32 Helicopter Slings',
      journeyProgressPct: isM ? 62 : 45,
      trend: isM ? [98, 95, 92, 90, 89, 88] : [112, 109, 107, 105, 103, 102],
      architecture: isM ? '100 km Crevasse-Bridged Overland Ice-Shelf Tractor Traverse' : 'Direct Deep-Water Mooring in Quilty Bay with Helipad Cargo Sling',
    },
    personnel: {
      score: ops?.domain_readiness?.personnel ?? (isM ? 96 : 98),
      status: isM ? '25 Winter-Over Crew' : '30 Winter-Over Crew',
      primaryKpi: isM ? '25 Personnel' : '30 Personnel',
      primaryLabel: 'Expedition Headcount',
      bedCapacity: isM ? 40 : 47,
      occupancyPct: isM ? 62.5 : 63.8,
      o2Pct: 20.9,
      co2Ppm: 420,
      roleBreakdown: isM
        ? [
            { label: 'Science', pct: 40, color: '#ec4899' },
            { label: 'Engineering', pct: 40, color: '#06b6d4' },
            { label: 'Medical', pct: 8, color: '#10b981' },
            { label: 'Galley/Ops', pct: 12, color: '#f59e0b' },
          ]
        : [
            { label: 'Science', pct: 44, color: '#ec4899' },
            { label: 'Engineering', pct: 38, color: '#06b6d4' },
            { label: 'Medical', pct: 6, color: '#10b981' },
            { label: 'Galley/Ops', pct: 12, color: '#f59e0b' },
          ],
      trend: isM ? [25, 25, 25, 25, 25, 25] : [30, 30, 30, 30, 30, 30],
      architecture: isM ? 'Main Living Module with Galley, Radio Room, Clinic & 4-Person Cabins' : 'Modular Containerized Habitat on Elevated Stilts with Acoustic Insulation',
    },
    communication: {
      score: ops?.domain_readiness?.communication ?? (isM ? 98 : 99),
      status: 'LEO Link Active',
      primaryKpi: isM ? '120 Mbps' : '160 Mbps',
      primaryLabel: 'Symmetrical Uplink',
      latencyMs: isM ? 78 : 65,
      packetLossPct: isM ? 0.05 : 0.02,
      qosShares: [
        { label: 'Life Safety SCADA', pct: 25, color: '#10b981' },
        { label: 'Science Telemetry', pct: 45, color: '#06b6d4' },
        { label: 'Welfare Voice/Data', pct: 30, color: '#64748b' },
      ],
      trend: isM ? [118, 120, 119, 121, 120, 120] : [158, 160, 162, 159, 161, 160],
      architecture: isM ? 'Single Tracking Radome (De-Iced) + Inmarsat BGAN Secondary' : 'Dual Synchronous Tracking Radomes + C-Band Maritime ISRO Uplink',
    },
    inventory: {
      score: ops?.domain_readiness?.inventory ?? (isM ? 94 : 97),
      status: '0 Stockouts (Nominal)',
      primaryKpi: '0 Stockouts',
      primaryLabel: 'Depletion Status',
      totalSkus: isM ? 1420 : 1850,
      oilStockLiters: 1200,
      glycolStockLiters: 650,
      criticalSparesSafePct: 100,
      trend: isM ? [96, 95, 95, 94, 94, 94] : [98, 97, 97, 97, 97, 97],
      architecture: isM ? 'Climate-Controlled Insulated Storage Containers with Manual Tagging' : 'Automated RFID Inventory Staging Matrix with Autonomous Low-Stock Alerts',
    },
  };
}
