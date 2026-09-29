import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { useStationStore } from '../store/stationStore';
import { useAlertStore } from '../store/alertStore';
import {
  Zap, CloudSnow, Fuel, Droplet, Truck, Users, Radio, Archive,
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
    downstream: ['personnel']
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
    upstream: ['environment', 'logistics'],
    downstream: ['water', 'communication']
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
    downstream: ['personnel']
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
    downstream: []
  },
];

// ── Main DomainsPage Component ───────────────────────────────────────────────

export const DomainsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime, updateAlertHistory } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: stationId === 'maitri' ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: stationId === 'maitri' ? 'inland' : 'coastal',
  };

  const otherStationId = isMaitri ? 'bharati' : 'maitri';
  const snapshot = liveSnapshot[stationId];
  const otherSnapshot = liveSnapshot[otherStationId];
  const risk = liveRisk[stationId];
  const stationAlerts = alerts[stationId] || [];

  const readiness = snapshot?.station_ops?.overall_readiness ?? (isMaitri ? 92.5 : 94.0);
  const statusBand = snapshot?.station_ops?.status_band ?? 'Nominal';
  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';

  useEffect(() => {
    updateAlertHistory(stationId, stationAlerts.length);
  }, [stationId, stationAlerts.length, updateAlertHistory]);

  const syncTime = lastTickTime[stationId] || new Date().toLocaleTimeString();
  const riskScore = risk?.score !== undefined ? Number(risk.score).toFixed(1) : '24.7';
  const riskLevel = risk?.level || 'LOW';

  const riskColor =
    riskLevel === 'LOW' ? '#10b981' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444';
  const riskBg =
    riskLevel === 'LOW'
      ? 'rgba(16, 185, 129, 0.12)'
      : riskLevel === 'MEDIUM'
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(239, 68, 68, 0.12)';
  const riskBorder =
    riskLevel === 'LOW'
      ? 'rgba(16, 185, 129, 0.35)'
      : riskLevel === 'MEDIUM'
      ? 'rgba(245, 158, 11, 0.35)'
      : 'rgba(239, 68, 68, 0.35)';

  const isAlertEmpty = stationAlerts.length === 0;
  const alertColor = isAlertEmpty ? '#f59e0b' : '#ef4444';
  const alertBg = isAlertEmpty ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.15)';
  const alertBorder = isAlertEmpty ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.45)';

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

  // Helper to render high-contrast domain comparison card with tailored real-time metrics
  const renderDomainComparisonColumn = (domId: string, data: any, isMaitriCard: boolean) => {
    const stationName = isMaitriCard ? 'Maitri Station' : 'Bharati Station';
    const stationType = isMaitriCard ? 'Inland • Nunatak Oasis' : 'Coastal • Prydz Bay';
    const accent = isMaitriCard ? '#2dd4bf' : '#60a5fa';
    const accentBorder = isMaitriCard ? 'rgba(20, 184, 166, 0.45)' : 'rgba(59, 130, 246, 0.45)';
    const accentBg = isMaitriCard ? 'rgba(13, 148, 136, 0.08)' : 'rgba(37, 99, 235, 0.08)';
    const badgeBg = isMaitriCard ? 'rgba(13, 148, 136, 0.22)' : 'rgba(37, 99, 235, 0.22)';
    const badgeText = isMaitriCard ? '#5eead4' : '#93c5fd';

    return (
      <div
        className="p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200"
        style={{ backgroundColor: 'rgba(10, 18, 30, 0.85)', borderColor: accentBorder }}
      >
        {/* Card Header: Station node + Readiness badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: accent }} />
            <span className="text-xs font-mono uppercase font-bold tracking-wider truncate" style={{ color: accent }}>
              {stationName}
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">• {stationType}</span>
          </div>
          <span
            className="text-[10.5px] font-mono px-2 py-0.5 rounded font-bold shadow-sm flex-shrink-0"
            style={{ backgroundColor: badgeBg, color: badgeText, border: `1px solid ${accentBorder}` }}
          >
            {data?.score ?? 95}% Readiness
          </span>
        </div>

        {/* Hero KPI + Operational Status */}
        <div className="flex items-baseline justify-between gap-2 border-b border-slate-700/50 pb-2.5">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300 font-mono">
              {data?.primaryLabel || 'Primary KPI'}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white leading-none mt-0.5">
              {data?.primaryKpi}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold bg-slate-900/90 border border-slate-700 text-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
              {data?.status}
            </span>
          </div>
        </div>

        {/* Domain-Specific Rich Telemetry Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {domId === 'infrastructure' && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Thermal Eff:</span>
                <span className="font-bold text-amber-300">{data?.thermalEff ?? (isMaitriCard ? 88.0 : 96.0)}%</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Snow Drift:</span>
                <span className="font-bold text-sky-300">{data?.snowDriftM ?? (isMaitriCard ? 0.42 : 0.25)}m</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center col-span-2">
                <span className="text-slate-300">Wind Stress Index:</span>
                <span className="font-bold text-teal-300">{data?.stressIndex ?? (isMaitriCard ? 18 : 12)} / 100 (Nominal)</span>
              </div>
            </>
          )}

          {domId === 'energy_fuel' && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Solar PV:</span>
                <span className="font-bold text-amber-300">{data?.solarKw ?? (isMaitriCard ? 22 : 35)} kW</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Battery SoC:</span>
                <span className="font-bold text-emerald-300">{data?.batterySoc ?? (isMaitriCard ? 92 : 96)}%</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Fuel Autonomy:</span>
                <span className="font-bold text-cyan-300">{data?.daysRemaining ?? (isMaitriCard ? 18 : 24)}d Reserve</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Grid Freq:</span>
                <span className="font-bold text-blue-300">{data?.freqHz ?? (isMaitriCard ? 50.08 : 50.02)} Hz</span>
              </div>
            </>
          )}

          {domId === 'logistics' && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Distance:</span>
                <span className="font-bold text-cyan-300">{data?.transitDistanceKm ?? (isMaitriCard ? 100 : 3.5)} km Run</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Progress:</span>
                <span className="font-bold text-teal-300">{data?.journeyProgressPct ?? (isMaitriCard ? 62 : 45)}% Complete</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center col-span-2">
                <span className="text-slate-300">Transport Fleet:</span>
                <span className="font-bold text-amber-300 truncate">{data?.transportMode ?? (isMaitriCard ? 'PistenBully Snow Groomers' : 'Ka-32 Slings & Vessel')}</span>
              </div>
            </>
          )}

          {domId === 'environment' && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Wind Chill:</span>
                <span className="font-bold text-cyan-300">{data?.chillC ?? (isMaitriCard ? -38.4 : -31.2)}°C</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Barometer:</span>
                <span className="font-bold text-blue-300">{data?.pressureHpa ?? (isMaitriCard ? 984 : 992)} hPa</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Wind Velocity:</span>
                <span className="font-bold text-teal-300">{data?.windSpeed ?? (isMaitriCard ? 32 : 44)} km/h</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Peak Gust:</span>
                <span className="font-bold text-amber-300">{data?.windGust ?? (isMaitriCard ? 54 : 68)} km/h</span>
              </div>
            </>
          )}

          {domId === 'communication' && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Latency:</span>
                <span className="font-bold text-emerald-300">{data?.latencyMs ?? (isMaitriCard ? 78 : 65)}ms RTT</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Packet Loss:</span>
                <span className="font-bold text-cyan-300">{data?.packetLossPct ?? (isMaitriCard ? 0.05 : 0.02)}%</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center col-span-2">
                <span className="text-slate-300">Ground Terminal:</span>
                <span className="font-bold text-blue-300 truncate">{isMaitriCard ? 'Single 3.2m Tracking Radome (De-Iced)' : 'Dual Synchronous Tracking Radomes'}</span>
              </div>
            </>
          )}

          {domId === 'water' && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Trace Heat:</span>
                <span className="font-bold text-emerald-300">+{data?.pipeTempC ?? (isMaitriCard ? 3.8 : 4.6)}°C</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Freeze Risk:</span>
                <span className="font-bold text-teal-300">{data?.freezeRisk ?? 'LOW'} Nominal</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Reservoir:</span>
                <span className="font-bold text-sky-300">{data?.percentage ?? (isMaitriCard ? 82 : 88)}% Full</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Daily Demand:</span>
                <span className="font-bold text-blue-300">{data?.consumptionLd ?? (isMaitriCard ? 850 : 1020)} L/d</span>
              </div>
            </>
          )}

          {domId === 'personnel' && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Berth Capacity:</span>
                <span className="font-bold text-purple-300">{data?.bedCapacity ?? (isMaitriCard ? 40 : 47)} Beds ({data?.occupancyPct ?? (isMaitriCard ? 62.5 : 63.8)}%)</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-300">Life Atmosphere:</span>
                <span className="font-bold text-emerald-300">{data?.o2Pct ?? 20.9}% O2 • {data?.co2Ppm ?? 420}ppm</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center col-span-2">
                <span className="text-slate-300">Crew Roles:</span>
                <span className="font-bold text-teal-300 truncate">{isMaitriCard ? '40% Sci • 40% Eng • 8% Med • 12% Ops' : '44% Sci • 38% Eng • 6% Med • 12% Ops'}</span>
              </div>
            </>
          )}
        </div>

        {/* Engineering Architecture Tag */}
        <div className="pt-2 border-t border-slate-700/60 flex items-start gap-1.5 text-[11px] font-mono">
          <span className="text-slate-300 font-bold flex-shrink-0">Architecture:</span>
          <span className="text-white font-medium leading-snug" title={data?.architecture}>
            {data?.architecture}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-[1750px] mx-auto pb-16">
      {/* ── MAIN CARD: MAITRI / BHARATI ANTARCTIC STATION ── */}
      <div
        className="glass-panel p-3 sm:px-4 sm:py-3 rounded-2xl relative overflow-hidden transition-all duration-300 shadow-lg"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: `1.5px solid ${accentColor}44`,
        }}
      >
        {/* Subtle accent highlight line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-80"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Station Identity */}
          <div className="xl:w-56 2xl:w-64 flex-shrink-0 flex flex-col justify-center gap-0.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ backgroundColor: accentColor }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: accentColor }}
                />
              </span>
              <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate-400">
                DIGITAL TWIN
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-black tracking-wide text-white leading-tight truncate">
              {station.name}
            </h1>

            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <span className="text-slate-300 font-semibold text-[10px]">
                Node: <span className="text-cyan-400 uppercase font-bold">{stationId}</span>
              </span>
              <span>•</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                7 Domains Nominal
              </span>
            </div>
          </div>

          {/* Right: The 4 Cards placed INSIDE the main card */}
          <div className="w-full xl:w-auto xl:max-w-[780px] 2xl:max-w-[840px] xl:ml-auto grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* CARD 1: STATION READINESS - SLEEK MINIMAL WITH CYAN/EMERALD HIGHLIGHTS */}
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl relative overflow-hidden flex flex-col justify-between gap-1.5 group transition-all duration-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-800/80 border border-slate-700/60 shadow-inner">
                    <Compass className="w-3 h-3 text-cyan-400" />
                  </div>
                  <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                    Readiness
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold uppercase tracking-wider bg-slate-800/90 border border-slate-700/80 text-slate-300 flex items-center gap-1 flex-shrink-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Nominal
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-1">
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-white leading-none">
                  {readiness}<span className="text-cyan-400 text-sm font-semibold ml-0.5">%</span>
                </div>
                <span className="text-[9px] font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  Optimal • <span className="text-emerald-400 font-bold">{statusBand.toUpperCase()}</span>
                </span>
              </div>
            </div>

            {/* CARD 2: ENGINE STATUS - SLEEK MINIMAL WITH PULSE HIGHLIGHTS */}
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl relative overflow-hidden flex flex-col justify-between gap-1.5 group transition-all duration-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-800/80 border border-slate-700/60 shadow-inner">
                    <Activity className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                    Engine Status
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold uppercase tracking-wider bg-slate-800/90 border border-slate-700/80 text-slate-300 flex items-center gap-1 flex-shrink-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Online
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-1">
                <div className="text-xs sm:text-sm font-bold font-mono tracking-tight text-white leading-none truncate">
                  Tick Loop Active
                </div>
                <span className="text-[9px] font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 flex-shrink-0">
                  <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                  <span className="font-mono text-slate-200 font-semibold">{syncTime}</span>
                </span>
              </div>
            </div>

            {/* CARD 3: RISK LEVEL - SLEEK MINIMAL WITH GAUGE HIGHLIGHT */}
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl relative overflow-hidden flex flex-col justify-between gap-1.5 group transition-all duration-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-800/80 border border-slate-700/60 shadow-inner">
                    <Shield className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                    Risk Level
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold uppercase tracking-wider bg-slate-800/90 border border-slate-700/80 text-slate-300 flex items-center gap-1 flex-shrink-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {riskLevel === 'LOW' ? 'Nominal' : riskLevel}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1">
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-white leading-none">
                  {riskLevel}
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                  <span className="text-[9px] font-mono font-bold text-slate-300">
                    {riskScore} <span className="text-slate-500 font-normal">pts</span>
                  </span>
                  <div className="w-7 sm:w-8 bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out bg-emerald-400"
                      style={{
                        width: `${Math.min(100, Math.max(8, Number(riskScore) || 24.7))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: INCIDENT FEED - SLEEK MINIMAL WITH STATUS HIGHLIGHT */}
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl relative overflow-hidden flex flex-col justify-between gap-1.5 group transition-all duration-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-800/80 border border-slate-700/60 shadow-inner">
                    {isAlertEmpty ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                    Incident Feed
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold uppercase tracking-wider bg-slate-800/90 border border-slate-700/80 text-slate-300 flex items-center gap-1 flex-shrink-0 shadow-sm">
                  {isAlertEmpty ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      All Clear
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {stationAlerts.length} Pending
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-1">
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-white leading-none">
                  {stationAlerts.length} <span className="text-xs font-semibold text-slate-400">{stationAlerts.length === 1 ? 'Alert' : 'Alerts'}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  <span className="text-emerald-400 font-bold">7/7</span> Healthy
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. Topological Causal Flow Tree with Embedded Visual Instruments ── */}
      <CrossDomainCausalTree
        stationId={stationId}
        onOpenCompare={() => setCompareModalOpen(true)}
        domainData={currentData}
      />

      {/* ── 5. Station Comparison Modal ── */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5" style={{ backgroundColor: 'rgba(2, 6, 15, 0.8)', backdropFilter: 'blur(12px)' }}>
          <div
            className="w-full max-w-6xl rounded-3xl p-5 sm:p-7 relative max-h-[92vh] overflow-y-auto"
            style={{
              backgroundColor: '#071322',
              border: '1.5px solid rgba(30, 58, 95, 0.9)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 32px rgba(6,182,212,0.1)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'rgba(6, 182, 212, 0.18)', border: '1px solid rgba(6, 182, 212, 0.45)', color: '#38bdf8' }}>
                  <GitCompare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
                    <span>Station Comparison</span>
                    <span className="text-cyan-400 font-normal">|</span>
                    <span className="text-teal-300">Maitri (Inland)</span>
                    <span className="text-xs text-slate-400 font-mono font-normal">vs</span>
                    <span className="text-blue-400">Bharati (Coastal)</span>
                  </h3>
                  <p className="text-xs font-mono text-cyan-200/90 mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Live Digital Twin telemetry matrix across all 7 operational domains • Schirmacher Oasis vs Larsemann Hills</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-md"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Station Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div
                className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-md"
                style={{
                  border: isMaitri ? '2px solid #14b8a6' : '1px solid rgba(20, 184, 166, 0.4)',
                  background: isMaitri
                    ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(6, 182, 212, 0.10) 100%)'
                    : 'rgba(13, 148, 136, 0.08)',
                  boxShadow: isMaitri ? '0 0 24px rgba(20, 184, 166, 0.25)' : 'none',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm animate-pulse" />
                    <span className="text-xs font-mono uppercase font-bold text-teal-300 tracking-wider">Maitri Station (Inland)</span>
                  </div>
                  {isMaitri ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-teal-500/25 text-teal-200 border border-teal-400/60 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
                      CURRENT ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded text-teal-300/80 border border-teal-500/30">
                      SECONDARY
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-white mt-1.5 tracking-wide">Schirmacher Oasis • Nunatak Bedrock</div>
                <div className="text-xs font-mono mt-1 text-teal-200/90 leading-relaxed">
                  1989 Heritage Architecture • Dual Kirloskar 100kVA • Priyadarshini Lake Zub Heated Pipeline
                </div>
                <div className="mt-2.5 pt-2 border-t border-teal-500/20 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-teal-200">Location: <strong className="text-white font-bold">70°45'57" S, 11°44'09" E</strong></span>
                  <span className="text-emerald-300 font-bold">Elevation: 117m ASL</span>
                </div>
              </div>

              <div
                className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-md"
                style={{
                  border: !isMaitri ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.4)',
                  background: !isMaitri
                    ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(96, 165, 250, 0.10) 100%)'
                    : 'rgba(37, 99, 235, 0.08)',
                  boxShadow: !isMaitri ? '0 0 24px rgba(59, 130, 246, 0.25)' : 'none',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm animate-pulse" />
                    <span className="text-xs font-mono uppercase font-bold text-blue-300 tracking-wider">Bharati Station (Coastal)</span>
                  </div>
                  {!isMaitri ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-blue-500/25 text-blue-200 border border-blue-400/60 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                      CURRENT ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded text-blue-300/80 border border-blue-500/30">
                      SECONDARY
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-white mt-1.5 tracking-wide">Larsemann Hills • Prydz Bay Promontory</div>
                <div className="text-xs font-mono mt-1 text-blue-200/90 leading-relaxed">
                  2012 Automated Architecture • Triple CHP Microgrid • Quilty Bay Seawater Reverse Osmosis
                </div>
                <div className="mt-2.5 pt-2 border-t border-blue-500/20 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-blue-200">Location: <strong className="text-white font-bold">69°24'28" S, 76°11'14" E</strong></span>
                  <span className="text-cyan-300 font-bold">Elevation: 35m ASL</span>
                </div>
              </div>
            </div>

            {/* 7-Domain Comparison Grid */}
            <div className="mt-6 space-y-4">
              {EIGHT_DOMAINS.map((dom) => {
                const Icon = dom.icon;
                const mData = isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];
                const bData = !isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];
                return (
                  <div
                    key={dom.id}
                    className="p-4 sm:p-5 rounded-2xl border transition-all shadow-md"
                    style={{ backgroundColor: '#071527', borderColor: `${dom.color}45` }}
                  >
                    {/* Domain Category Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3.5 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shadow-inner"
                          style={{ backgroundColor: `${dom.color}22`, border: `1px solid ${dom.color}60`, color: dom.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white tracking-wide">{dom.name}</span>
                          <span
                            className="ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: `${dom.color}18`, color: dom.color, border: `1px solid ${dom.color}40` }}
                          >
                            {dom.category}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-cyan-200 font-medium">
                        {dom.shortDesc}
                      </span>
                    </div>

                    {/* Side-by-Side 2-Column Comparison with Rich Domain Telemetry */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Maitri Column */}
                      {renderDomainComparisonColumn(dom.id, mData, true)}

                      {/* Bharati Column */}
                      {renderDomainComparisonColumn(dom.id, bData, false)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
              <div className="text-xs font-mono text-cyan-200/90 flex items-center gap-2 text-center sm:text-left">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                <span>Synchronized live across all 7 operational domains • Switching active station updates all twin cockpits.</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { navigate(isMaitri ? '/station/bharati/domains' : '/station/maitri/domains'); setCompareModalOpen(false); }}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all hover:scale-105 shadow-md"
                  style={{ backgroundColor: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(59, 130, 246, 0.6)', color: '#93c5fd' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch Active Station to {isMaitri ? 'Bharati' : 'Maitri'}</span>
                </button>
                <button
                  onClick={() => setCompareModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors hover:bg-slate-800 text-slate-300 border border-slate-700"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
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
