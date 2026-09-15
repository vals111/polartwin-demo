import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { useStationStore } from '../store/stationStore';
import * as echarts from 'echarts';
import {
  Zap, CloudSnow, Fuel, Wrench, Droplet, Truck, Users, Radio, Archive,
  RefreshCw, GitCompare, X, ExternalLink, Activity, ArrowUpRight, ArrowDownRight,
  Compass, Thermometer, ShieldCheck, AlertTriangle, Play, ChevronRight,
  Layers, Clock, CheckCircle2, BatteryCharging, Flame, Box, Maximize2,
  TrendingUp, Shield, Cpu, Waves, Brain
} from 'lucide-react';
import { CrossDomainCausalTree } from '../components/dashboard/CrossDomainCausalTree';

// ── Domain Configurations ───────────────────────────────────────────────────

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

const NINE_DOMAINS: DomainConfig[] = [
  {
    id: 'energy',
    name: 'Energy & Power',
    category: 'energy',
    icon: Zap,
    route: 'energy',
    color: '#f59e0b',
    accentRgb: '245, 158, 11',
    shortDesc: 'Diesel Generation, Solar PV & Microgrid Battery Reserve',
    upstream: ['environment', 'fuel', 'equipment'],
    downstream: ['water', 'logistics', 'communication']
  },
  {
    id: 'environment',
    name: 'Environment & Weather',
    category: 'environment',
    icon: CloudSnow,
    route: 'environment',
    color: '#00e5ff',
    accentRgb: '0, 229, 255',
    shortDesc: 'Polar Atmosphere, Katabatic Wind Chill & Storm Severity',
    upstream: [],
    downstream: ['energy', 'water', 'logistics', 'communication']
  },
  {
    id: 'fuel',
    name: 'Fuel Depot',
    category: 'fuel',
    icon: Fuel,
    route: 'fuel',
    color: '#ef4444',
    accentRgb: '239, 68, 68',
    shortDesc: 'Antarctic Low-Freeze Diesel (AGO) Storage & Autonomy',
    upstream: ['logistics'],
    downstream: ['energy', 'equipment']
  },
  {
    id: 'water',
    name: 'Water Supply & Thermal Line',
    category: 'water',
    icon: Droplet,
    route: 'water',
    color: '#38bdf8',
    accentRgb: '56, 189, 248',
    shortDesc: 'Glacial Melt / Seawater RO Desalination & Pipe Trace Heating',
    upstream: ['environment', 'energy'],
    downstream: ['personnel', 'equipment']
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
    upstream: ['inventory', 'personnel'],
    downstream: ['energy', 'water', 'fuel']
  },
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    category: 'logistics',
    icon: Truck,
    route: 'logistics',
    color: '#f97316',
    accentRgb: '249, 115, 22',
    shortDesc: 'Overland Traverse Convoys, Cargo Resupply & Vessel ETA',
    upstream: ['environment'],
    downstream: ['fuel', 'inventory']
  },
  {
    id: 'personnel',
    name: 'Personnel & Occupancy',
    category: 'personnel',
    icon: Users,
    route: 'personnel',
    color: '#a855f7',
    accentRgb: '168, 85, 247',
    shortDesc: 'Crew Headcount, Circadian Diurnal Demand & Life Support',
    upstream: ['water', 'energy'],
    downstream: ['energy', 'water', 'equipment']
  },
  {
    id: 'communication',
    name: 'Satellite Communication',
    category: 'comms',
    icon: Radio,
    route: 'communication',
    color: '#3b82f6',
    accentRgb: '59, 130, 246',
    shortDesc: 'LEO Polar Satellite Tracking, Bandwidth QoS & Telemetry Sync',
    upstream: ['energy', 'environment'],
    downstream: []
  },
  {
    id: 'storage',
    name: 'Storage & Inventory',
    category: 'inventory',
    icon: Archive,
    route: 'inventory',
    color: '#14b8a6',
    accentRgb: '20, 184, 166',
    shortDesc: 'Critical Spares Safety Buffer, Consumable Fluids & Parts Readiness',
    upstream: ['logistics'],
    downstream: ['equipment', 'personnel']
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

  // Modals & Active Inspector State
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);

  // Chart ref for the detail inspector modal
  const detailChartRef = useRef<HTMLDivElement>(null);
  const detailChartInst = useRef<echarts.ECharts | null>(null);

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

    return {
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
        architecture: isM ? 'Heritage Dual Diesel Gensets + 22 kW Rooftop Solar PV' : 'Combined Heat & Power (CHP) Loop + 35 kW Bifacial Solar Array'
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
        architecture: isM ? 'Schirmacher Oasis Bedrock Plateau • Katabatic Drafts' : 'Larsemann Hills Coastal Ridge • Marine Gale Squalls'
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
        architecture: isM ? '6 Bunded Above-Ground Steel Tanks with Tank Suction Pre-heaters' : 'Double-Walled ISO Containerized SCADA Farm with Heat Recovery'
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
        architecture: isM ? 'Priyadarshini (Lake Zub) Pump House with 800m Insulated Heated Pipeline' : 'Quilty Bay Marine Infiltration Intake + Seawater Reverse Osmosis (SWRO)'
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
        architecture: isM ? 'Kirloskar Heavy GenSets, Centrifugal Water Pumps, Oil Burners' : 'Automated CHP Units, High-Pressure RO Pumps, Integrated HVAC'
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
          { label: 'Life Safety SCADA', pct: 25, color: '#10b981' },
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
        architecture: isM ? 'Climate-Controlled Insulated Storage Containers with Manual Tagging' : 'Automated RFID Inventory Staging Matrix with Autonomous Low-Stock Alerts'
      }
    };
  };

  const currentData = useMemo(() => getDomainData(stationId), [stationId, snapshot]);
  const otherData = useMemo(() => getDomainData(otherStationId), [otherStationId, otherSnapshot]);

  // Selected domain config for the modal inspector
  const activeDomainConfig = useMemo(
    () => NINE_DOMAINS.find((d) => d.id === selectedDomainId) || null,
    [selectedDomainId]
  );
  const activeDomainTelemetry = useMemo(
    () => (activeDomainConfig ? (currentData as any)[activeDomainConfig.id] : null),
    [activeDomainConfig, currentData]
  );

  // Initialize ECharts for the domain detail modal
  useEffect(() => {
    if (!selectedDomainId || !detailChartRef.current || !activeDomainTelemetry) return;

    if (detailChartInst.current) detailChartInst.current.dispose();
    const chart = echarts.init(detailChartRef.current, 'dark');
    detailChartInst.current = chart;

    const dataPoints = activeDomainTelemetry.trend || [80, 82, 85, 84, 88, 86];
    const timeLabels = ['04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      grid: { top: 20, bottom: 25, left: 45, right: 20 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [
        {
          name: activeDomainConfig?.name || 'Telemetry',
          type: 'line',
          data: dataPoints,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: activeDomainConfig?.color || '#00e5ff', width: 3 },
          itemStyle: { color: activeDomainConfig?.color || '#00e5ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${activeDomainConfig?.color || '#00e5ff'}55` },
              { offset: 1, color: `${activeDomainConfig?.color || '#00e5ff'}05` }
            ])
          }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [selectedDomainId, activeDomainTelemetry, activeDomainConfig]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── 1. Topological Causal Propagation Tree with Embedded Visual Instruments ── */}
      <CrossDomainCausalTree
        stationId={stationId}
        onOpenCompare={() => setCompareModalOpen(true)}
        onSelectDomain={(id) => setSelectedDomainId(id)}
        selectedDomainId={selectedDomainId}
        domainData={currentData}
      />

      {/* ── 4. Interactive Visual Domain Studio Modal / Drawer ────────────────── */}
      {selectedDomainId && activeDomainConfig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl rounded-3xl border border-cyan-500/50 bg-[#071326]/95 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-polar-border">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-xl border flex-shrink-0"
                  style={{
                    background: `rgba(${activeDomainConfig.accentRgb}, 0.2)`,
                    borderColor: activeDomainConfig.color,
                    color: activeDomainConfig.color
                  }}
                >
                  <activeDomainConfig.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                      style={{
                        background: `rgba(${activeDomainConfig.accentRgb}, 0.15)`,
                        borderColor: activeDomainConfig.color,
                        color: activeDomainConfig.color
                      }}
                    >
                      LIVE DOMAIN STUDIO
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {isMaitri ? 'Maitri Station (Inland)' : 'Bharati Station (Coastal)'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {activeDomainConfig.name} Operational Telemetry
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedDomainId(null)}
                className="p-2 rounded-xl bg-polar-dark border border-polar-border text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6 mt-6">
              {/* Telemetry Curve & Key KPIs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: 24-Hour Telemetry Curve */}
                <div className="lg:col-span-2 p-4 rounded-2xl bg-polar-dark/80 border border-polar-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      24-Hour Trend Telemetry Curve
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Real-Time Physics Engine
                    </span>
                  </div>
                  <div ref={detailChartRef} style={{ height: 210, width: '100%' }} />
                </div>

                {/* Right: Quick KPI Card */}
                <div className="p-4 rounded-2xl bg-polar-dark/80 border border-polar-border flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Primary Operational State
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                      {activeDomainTelemetry?.primaryKpi}
                    </div>
                    <div className="text-xs font-mono text-cyan-400 mt-1">
                      {activeDomainTelemetry?.primaryLabel}
                    </div>

                    <div className="mt-4 pt-3 border-t border-polar-border/60 space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Readiness Score:</span>
                        <span className="text-emerald-400 font-bold">{activeDomainTelemetry?.score}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="text-white font-bold truncate max-w-[150px]">{activeDomainTelemetry?.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Domain page + Decision Intelligence buttons */}
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedDomainId(null);
                        navigate(`/station/${stationId}/${activeDomainConfig.route}`);
                      }}
                      className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>Launch Full Domain Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDomainId(null);
                        navigate(`/station/${stationId}/decision?domain=${activeDomainConfig.id}`);
                      }}
                      className="w-full py-2 rounded-xl font-mono text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Decision Intelligence</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Causal Coupling Conduits */}
              <div className="p-4 rounded-2xl bg-polar-dark/80 border border-polar-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Cross-Domain Causal Dependency Conduits
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Causal Drivers &amp; Downstream Consumers
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Upstream Drivers */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                    <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold mb-2 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Upstream Feeder Domains (Drivers)
                    </div>
                    {activeDomainConfig.upstream.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeDomainConfig.upstream.map((upId) => {
                          const upCfg = NINE_DOMAINS.find((d) => d.id === upId);
                          return (
                            <span
                              key={upId}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              {upCfg?.name || upId}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-slate-400">
                        Root External Driver (No upstream station dependencies)
                      </span>
                    )}
                  </div>

                  {/* Downstream Consumers */}
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                    <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Downstream Dependent Domains (Impacted)
                    </div>
                    {activeDomainConfig.downstream.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeDomainConfig.downstream.map((downId) => {
                          const downCfg = NINE_DOMAINS.find((d) => d.id === downId);
                          return (
                            <span
                              key={downId}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {downCfg?.name || downId}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-slate-400">
                        Terminal Telemetry Sink (Feeds Mission Control Oversight)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Station Architecture Blueprint */}
              <div className="p-4 rounded-2xl bg-polar-dark/80 border border-polar-border space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Antarctic Architectural Implementation • {isMaitri ? 'Maitri Inland Base' : 'Bharati Coastal Base'}
                </span>
                <p className="text-xs font-mono text-slate-200 leading-relaxed">
                  {activeDomainTelemetry?.architecture}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Visual Station Operational Comparison Studio (Maitri vs Bharati) ─ */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-5xl rounded-3xl border border-cyan-500/40 bg-polar-navy/95 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-polar-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-polar-dark border border-cyan-500/40 text-cyan-400">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Station Operational Comparison • Maitri (Inland) vs Bharati (Coastal)
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Side-by-side Digital Twin comparison across all 9 interconnected operational domains.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-2 rounded-xl bg-polar-dark border border-polar-border text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Station Summary Column Headers */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className={`p-4 rounded-xl border ${isMaitri ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-500/30' : 'border-polar-border bg-polar-dark/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-cyan-400">Maitri Station (Inland)</span>
                  {isMaitri && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">CURRENT ACTIVE</span>}
                </div>
                <div className="text-sm font-bold text-white mt-1">Schirmacher Oasis • Nunatak Bedrock</div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  1989 Heritage Architecture • Dual Kirloskar 100kVA • Lake Zub Heated Pipe • 100km Overland Convoy
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${!isMaitri ? 'border-blue-500/60 bg-blue-950/20 ring-1 ring-blue-500/30' : 'border-polar-border bg-polar-dark/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-blue-400">Bharati Station (Coastal)</span>
                  {!isMaitri && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">CURRENT ACTIVE</span>}
                </div>
                <div className="text-sm font-bold text-white mt-1">Larsemann Hills • Prydz Bay Promontory</div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  2012 Automated Architecture • Triple CHP Microgrid • Quilty Bay Desal • Direct Maritime Mooring
                </div>
              </div>
            </div>

            {/* 9-Domain Visual Comparison Grid */}
            <div className="mt-6 space-y-3">
              {NINE_DOMAINS.map((dom) => {
                const Icon = dom.icon;
                const mData = isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];
                const bData = !isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];

                return (
                  <div key={dom.id} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white">{dom.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {dom.shortDesc}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      {/* Maitri column */}
                      <div className="p-3 rounded-lg bg-polar-navy/60 border border-cyan-500/20 space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-slate-400 uppercase">Maitri KPI:</span>
                          <span className="text-sm font-black text-cyan-300">{mData?.primaryKpi}</span>
                        </div>
                        <div className="text-[10px] text-slate-200">{mData?.status}</div>
                        <div className="text-[9px] text-slate-400 truncate">{mData?.architecture}</div>
                      </div>

                      {/* Bharati column */}
                      <div className="p-3 rounded-lg bg-polar-navy/60 border border-blue-500/20 space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-slate-400 uppercase">Bharati KPI:</span>
                          <span className="text-sm font-black text-blue-300">{bData?.primaryKpi}</span>
                        </div>
                        <div className="text-[10px] text-slate-200">{bData?.status}</div>
                        <div className="text-[9px] text-slate-400 truncate">{bData?.architecture}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Controls */}
            <div className="mt-6 pt-4 border-t border-polar-border flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400">
                Switching active station updates all charts, models, and alerts application-wide.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigate(isMaitri ? '/station/bharati/domains' : '/station/maitri/domains');
                    setCompareModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch Active Station to {isMaitri ? 'Bharati' : 'Maitri'}</span>
                </button>
                <button
                  onClick={() => setCompareModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-slate-300"
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
