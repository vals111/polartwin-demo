import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { useStationStore } from '../store/stationStore';
import {
  Zap, CloudSnow, Fuel, Wrench, Droplet, Truck, Users, Radio, Archive,
  RefreshCw, GitCompare, X, ExternalLink, Activity, ArrowUpRight, ArrowDownRight,
  Compass, Thermometer, ShieldCheck, AlertTriangle, Play, ChevronRight,
  Layers, Clock, CheckCircle2, BatteryCharging, Flame, Box, Maximize2,
  TrendingUp, Shield, Cpu, Waves, Brain, Building2
} from 'lucide-react';
import { CrossDomainCausalTree } from '../components/dashboard/CrossDomainCausalTree';

// ── Domain Configurations (The 8 Operational Domains) ─────────────────────────

interface DomainConfig {
  id: string;
  name: string;
  category: string;
  icon: any;
  route: string;
  color: string;
  accentRgb: string;
  shortDesc: string;
  upstream: string[];
  downstream: string[];
}

const EIGHT_DOMAINS: DomainConfig[] = [
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    category: 'infrastructure',
    icon: Building2,
    route: 'infrastructure',
    color: '#06b6d4',
    accentRgb: '6, 182, 212',
    shortDesc: 'Building Structural Modules, Habitat Envelope & Wind Stress',
    upstream: ['environment', 'logistics'],
    downstream: ['personnel', 'equipment']
  },
  {
    id: 'energy_fuel',
    name: 'Energy & Fuel',
    category: 'energy',
    icon: Zap,
    route: 'energy',
    color: '#f59e0b',
    accentRgb: '245, 158, 11',
    shortDesc: 'Diesel Generation, Solar PV, Power grid Battery & Bulk Fuel Storage',
    upstream: ['environment', 'equipment', 'logistics'],
    downstream: ['water', 'equipment', 'communication']
  },
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    category: 'logistics',
    icon: Truck,
    route: 'logistics',
    color: '#f97316',
    accentRgb: '249, 115, 22',
    shortDesc: 'Overland Traverse Supply runs, Cargo Resupply & Vessel ETA',
    upstream: ['environment'],
    downstream: ['energy_fuel', 'infrastructure']
  },
  {
    id: 'environment',
    name: 'Environment & Weather',
    category: 'environment',
    icon: CloudSnow,
    route: 'environment',
    color: '#00e5ff',
    accentRgb: '0, 229, 255',
    shortDesc: 'Polar Atmosphere, Polar downslope wind Wind Chill & Storm Severity',
    upstream: [],
    downstream: ['infrastructure', 'energy_fuel', 'water', 'communication']
  },
  {
    id: 'communication',
    name: 'Communication',
    category: 'comms',
    icon: Radio,
    route: 'communication',
    color: '#3b82f6',
    accentRgb: '59, 130, 246',
    shortDesc: 'LEO Polar Satellite Tracking, Data speed QoS & Telemetry Sync',
    upstream: ['energy_fuel', 'environment'],
    downstream: []
  },
  {
    id: 'water',
    name: 'Water',
    category: 'water',
    icon: Droplet,
    route: 'water',
    color: '#38bdf8',
    accentRgb: '56, 189, 248',
    shortDesc: 'Glacial Melt / Seawater RO Seawater purification & Pipe Trace Heating',
    upstream: ['environment', 'energy_fuel'],
    downstream: ['personnel', 'equipment']
  },
  {
    id: 'personnel',
    name: 'Personnel Safety & Emergency',
    category: 'personnel',
    icon: Users,
    route: 'personnel',
    color: '#a855f7',
    accentRgb: '168, 85, 247',
    shortDesc: 'Crew Headcount, Circadian Diurnal Demand, Life Safety & Shelters',
    upstream: ['water', 'energy_fuel', 'infrastructure'],
    downstream: ['equipment']
  },
  {
    id: 'equipment',
    name: 'Equipment & Machinery',
    category: 'equipment',
    icon: Wrench,
    route: 'equipment',
    color: '#10b981',
    accentRgb: '16, 185, 129',
    shortDesc: 'Mechanical Asset Health, Vibration Spectrum & Maintenance',
    upstream: ['infrastructure', 'personnel'],
    downstream: ['energy_fuel', 'water']
  }
];

// ── Main DomainsPage Component ───────────────────────────────────────────────

export const DomainsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { liveSnapshot } = useTelemetryStore();
  const otherStationId = isMaitri ? 'bharati' : 'maitri';
  const snapshot = liveSnapshot[stationId];
  const otherSnapshot = liveSnapshot[otherStationId];

  // Modals
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);

  // Extract domain data with real fallbacks
  const getDomainData = (targetStationId: string) => {
    const isM = targetStationId === 'maitri';
    const snap = liveSnapshot[targetStationId];
    const env = snap?.environment;
    const eng = snap?.energy;
    const fl = snap?.fuel;
    const wt = snap?.water;
    const eq = snap?.equipment;
    const ops = snap?.station_ops;
    const infra = snap?.infrastructure;

    return {
      infrastructure: {
        score: ops?.domain_readiness?.infrastructure ?? (isM ? 94 : 97),
        status: (infra?.structural_stress_index ?? 18) > 75 ? 'High Wind Stress' : 'Structural Nominal',
        primaryKpi: `${infra?.structural_stress_index ?? (isM ? 18 : 12)} / 100`,
        primaryLabel: 'Wind Stress',
        stressIndex: infra?.structural_stress_index ?? (isM ? 18 : 12),
        thermalEff: infra?.thermal_insulation_eff ?? (isM ? 88.0 : 96.0),
        snowDriftM: infra?.snow_drift_accumulation_m ?? (isM ? 0.42 : 0.25),
        trend: isM ? [14, 16, 22, 28, 24, 18] : [10, 12, 18, 22, 20, 12],
        architecture: isM ? 'Nunatak Bedrock Foundation • Polyurethane Sandwich Shell' : 'Aerodynamic Elevated Pods on 4m High-Tensile Steel Stilts'
      },
      energy_fuel: {
        score: Math.round(((ops?.domain_readiness?.energy ?? (isM ? 94 : 97)) + (ops?.domain_readiness?.fuel ?? (isM ? 95 : 98))) / 2),
        status: `${isM ? 'Gen #1 Active' : 'Triple CHP Sync'} • ${fl?.reserve_zone ?? 'Watch'} Zone`,
        primaryKpi: `${eng?.generator_load ?? (isM ? 68 : 82)} kW | ${fl?.fuel_percentage?.toFixed(1) ?? (isM ? 78.0 : 85.7)}%`,
        primaryLabel: 'Grid Load & Fuel Reserve',
        solarKw: eng?.solar_output ?? (isM ? 22 : 28),
        batterySoc: eng?.battery_level ?? (isM ? 92 : 96),
        freqHz: eng?.grid_frequency ?? (isM ? 50.08 : 50.02),
        currentLiters: fl?.current_level ?? (isM ? 142000 : 180000),
        capacityLiters: fl?.total_capacity ?? (isM ? 182000 : 210000),
        burnRateLh: fl?.consumption_rate_l_per_hr ?? (isM ? 17.5 : 21.2),
        daysRemaining: fl?.days_remaining ?? (isM ? 18 : 24),
        resupplyEtaDays: fl?.resupply_eta_days ?? (isM ? 88 : 102),
        trend: isM ? [78.2, 78.4, 78.6, 78.8, 78.2, 78.0] : [85.9, 86.1, 86.0, 85.8, 85.7, 85.7],
        architecture: isM ? 'Heritage Dual Diesel Diesel generators + 22 kW Solar PV • 6 Bunded AGO Steel Tanks' : 'Combined Heat & Power (CHP) Loop + 35 kW Solar Array • ISO Automated Control System Farm'
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
        architecture: isM ? 'Heritage Dual Diesel Diesel generators + 22 kW Rooftop Solar PV' : 'Combined Heat & Power (CHP) Loop + 35 kW Double-sided Solar Array'
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
        architecture: isM ? 'Schirmacher Oasis Bedrock Plateau • Polar downslope wind Drafts' : 'Larsemann Hills Coastal Ridge • Marine Gale Squalls'
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
        architecture: isM ? '6 Bunded Above-Ground Steel Tanks with Tank Suction Pre-heaters' : 'Double-Walled ISO Containerized Automated Control System Farm with Heat Recovery'
      },
      water: {
        score: ops?.domain_readiness?.water ?? (isM ? 92 : 95),
        status: isM ? 'Trace Heat 4.2 kW Active' : 'Seawater Filter Plant Desal Batching',
        primaryKpi: `${wt?.storage_liters?.toLocaleString() ?? (isM ? '18,500' : '24,000')} L`,
        primaryLabel: 'Potable Storage',
        percentage: wt?.percentage ?? (isM ? 82.0 : 88.0),
        pipeTempC: wt?.pipe_temp_c ?? (isM ? 3.8 : 4.6),
        freezeRisk: wt?.freeze_risk ?? 'LOW',
        consumptionLd: isM ? 850 : 1020,
        trend: isM ? [19200, 19000, 18800, 18650, 18550, 18500] : [22500, 22800, 23200, 23600, 23900, 24000],
        architecture: isM ? 'Priyadarshini (Lake Zub) Pump House with 800m Insulated Heated Pipeline' : 'Quilty Bay Marine Infiltration Intake + Seawater Reverse Osmosis (Seawater Filter Plant)'
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
        architecture: isM ? 'Kirloskar Heavy Diesel generators, Centrifugal Water Pumps, Oil Burners' : 'Automated CHP Units, High-Pressure RO Pumps, Integrated HVAC'
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
        architecture: isM ? '100 km Crevasse-Bridged Overland Ice-Shelf Tractor Traverse' : 'Direct Deep-Water Mooring in Quilty Bay with Helipad Cargo Sling'
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
              { label: 'Galley/Ops', pct: 12, color: '#f59e0b' }
            ]
          : [
              { label: 'Science', pct: 44, color: '#ec4899' },
              { label: 'Engineering', pct: 38, color: '#06b6d4' },
              { label: 'Medical', pct: 6, color: '#10b981' },
              { label: 'Galley/Ops', pct: 12, color: '#f59e0b' }
            ],
        trend: isM ? [25, 25, 25, 25, 25, 25] : [30, 30, 30, 30, 30, 30],
        architecture: isM ? 'Main Living Module with Galley, Radio Room, Clinic & 4-Person Cabins' : 'Modular Containerized Habitat on Elevated Stilts with Acoustic Insulation'
      },
      communication: {
        score: ops?.domain_readiness?.communication ?? (isM ? 98 : 99),
        status: 'LEO Link Active',
        primaryKpi: isM ? '120 Mbps' : '160 Mbps',
        primaryLabel: 'Symmetrical Uplink',
        latencyMs: isM ? 78 : 65,
        packetLossPct: isM ? 0.05 : 0.02,
        qosShares: [
          { label: 'Life Safety Automated Control System', pct: 25, color: '#10b981' },
          { label: 'Science Telemetry', pct: 45, color: '#06b6d4' },
          { label: 'Welfare Voice/Data', pct: 30, color: '#64748b' }
        ],
        trend: isM ? [118, 120, 119, 121, 120, 120] : [158, 160, 162, 159, 161, 160],
        architecture: isM ? 'Single Tracking Radome (De-Iced) + Inmarsat BGAN Secondary' : 'Dual Synchronous Tracking Radomes + C-Band Maritime ISRO Uplink'
      },
      storage: {
        score: ops?.domain_readiness?.inventory ?? (isM ? 94 : 97),
        status: '0 Stockouts (Nominal)',
        primaryKpi: '0 Stockouts',
        primaryLabel: 'Depletion Status',
        totalSkus: isM ? 1420 : 1850,
        oilStockLiters: 1200,
        glycolStockLiters: 650,
        criticalSparesSafePct: 100,
        trend: isM ? [96, 95, 95, 94, 94, 94] : [98, 97, 97, 97, 97, 97],
        architecture: isM ? 'Climate-Controlled Insulated Storage Containers with Manual Tagging' : 'Automated RFID Inventory Staging Matrix with Self-operating Low-Stock Alerts'
      }
    };
  };

  const currentData = useMemo(() => getDomainData(stationId), [stationId, snapshot]);
  const otherData = useMemo(() => getDomainData(otherStationId), [otherStationId, otherSnapshot]);

  return (
    <div className="space-y-8 w-full max-w-[1750px] mx-auto pb-16">
      {/* ── 1. Topological Causal Flow Tree with Embedded Visual Instruments ── */}
      <CrossDomainCausalTree
        stationId={stationId}
        onOpenCompare={() => setCompareModalOpen(true)}
        domainData={currentData}
      />

      {/* ── 5. Station Comparison Modal ── */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-5xl rounded-3xl p-6 relative max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}>
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                    Station Comparison • Maitri (Inland) vs Bharati (Coastal)
                  </h3>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    Side-by-side Digital Twin comparison across all 8 interconnected operational domains.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-2 rounded-xl cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Station Headers */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="p-4 rounded-xl" style={isMaitri
                ? { border: '2px solid #0d9488', backgroundColor: '#f0fdfa' }
                : { border: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }
              }>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold" style={{ color: '#0d9488' }}>Maitri Station (Inland)</span>
                  {isMaitri && <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold" style={{ backgroundColor: '#f0fdfa', color: '#0d9488', border: '1px solid #5eead4' }}>CURRENT ACTIVE</span>}
                </div>
                <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Schirmacher Oasis • Nunatak Bedrock</div>
                <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  1989 Heritage Architecture • Dual Kirloskar 100kVA • Lake Zub Heated Pipe
                </div>
              </div>
              <div className="p-4 rounded-xl" style={!isMaitri
                ? { border: '2px solid #2563eb', backgroundColor: '#eff6ff' }
                : { border: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }
              }>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold" style={{ color: '#2563eb' }}>Bharati Station (Coastal)</span>
                  {!isMaitri && <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>CURRENT ACTIVE</span>}
                </div>
                <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Larsemann Hills • Prydz Bay Promontory</div>
                <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  2012 Automated Architecture • Triple CHP Power grid • Quilty Bay Desal
                </div>
              </div>
            </div>

            {/* 8-Domain Grid */}
            <div className="mt-6 space-y-3">
              {EIGHT_DOMAINS.map((dom) => {
                const Icon = dom.icon;
                const mData = isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];
                const bData = !isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];
                return (
                  <div key={dom.id} className="p-3.5 rounded-xl transition-all" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: dom.color }} />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{dom.name}</span>
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{dom.shortDesc}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3 rounded-lg space-y-1" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid #5eead444' }}>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Maitri KPI:</span>
                          <span className="text-sm font-black" style={{ color: '#0d9488' }}>{mData?.primaryKpi}</span>
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{mData?.status}</div>
                        <div className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{mData?.architecture}</div>
                      </div>
                      <div className="p-3 rounded-lg space-y-1" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid #93c5fd44' }}>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Bharati KPI:</span>
                          <span className="text-sm font-black" style={{ color: '#2563eb' }}>{bData?.primaryKpi}</span>
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{bData?.status}</div>
                        <div className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{bData?.architecture}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Switching active station updates all charts, models, and alerts application-wide.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { navigate(isMaitri ? '/station/bharati/domains' : '/station/maitri/domains'); setCompareModalOpen(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
                </button>
                <button
                  onClick={() => setCompareModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainsPage;
