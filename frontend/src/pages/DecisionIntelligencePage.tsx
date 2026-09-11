import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useAuthStore } from '../store/authStore';
import { useScenarioStore } from '../store/scenarioStore';
import {
  forecastApi, analyticsApi, alertsApi, optimizationApi,
  recommendationsApi, scenariosApi
} from '../api/client';
import * as echarts from 'echarts';
import {
  Brain, TrendingUp, AlertTriangle, Cpu, FlaskConical,
  LineChart, Lightbulb, Zap, Droplet, Fuel, Wrench,
  RefreshCw, Play, CheckCircle2, Shield, ChevronDown,
  ChevronUp, ArrowRight, Layers, BarChart3, Activity,
  Radio, Users, Package, Truck, ArrowUpRight, ArrowDownRight,
  Minus, X, Sparkles
} from 'lucide-react';

// ── Domain config ─────────────────────────────────────────────────────────────
const DOMAIN_CONFIG: Record<string, {
  label: string; color: string; icon: React.ReactNode;
  forecastDomain: string; riskKeyword: string; optDomain: string;
  scenarioPresets: { id: string; title: string; desc: string }[];
  analyticsDomain: string;
}> = {
  energy: {
    label: 'Energy & Power', color: '#818cf8',
    icon: <Zap className="w-4 h-4" />,
    forecastDomain: 'energy', riskKeyword: 'energy',
    optDomain: 'energy', analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'gen1_offline', title: '⚡ Generator #1 Trip', desc: 'Primary generator offline — load shedding cascade' },
      { id: 'solar_loss', title: '☁️ Solar Array Loss', desc: 'PV contribution drops to zero' },
      { id: 'peak_demand', title: '📈 Peak Demand Surge +40%', desc: 'All life-support heaters simultaneously active' },
    ]
  },
  fuel: {
    label: 'Fuel & Diesel', color: '#f59e0b',
    icon: <Fuel className="w-4 h-4" />,
    forecastDomain: 'fuel', riskKeyword: 'fuel',
    optDomain: 'fuel', analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'fuel_leak', title: '⛽ Tank Leak −20%', desc: 'Undetected pipeline leak reduces reserves' },
      { id: 'resupply_delay', title: '🚢 Resupply Delayed 30d', desc: 'Next tanker delayed by Antarctic ice storm' },
      { id: 'high_burn', title: '🔥 Burn Rate +35%', desc: 'Extreme cold drives generator overload' },
    ]
  },
  water: {
    label: 'Water Supply', color: '#38bdf8',
    icon: <Droplet className="w-4 h-4" />,
    forecastDomain: 'water', riskKeyword: 'water',
    optDomain: 'water', analyticsDomain: 'water_risk',
    scenarioPresets: [
      { id: 'pump_fail', title: '💧 Pump Failure', desc: 'Intake pump mechanical seizure' },
      { id: 'pipe_freeze', title: '🧊 Pipe Freeze Event', desc: 'Distribution pipe frozen at −30°C' },
      { id: 'contamination', title: '⚠️ Contamination Alert', desc: 'TDS/turbidity exceeds safe threshold' },
    ]
  },
  equipment: {
    label: 'Equipment', color: '#10b981',
    icon: <Wrench className="w-4 h-4" />,
    forecastDomain: 'equipment', riskKeyword: 'equipment',
    optDomain: 'equipment', analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'gen_failure', title: '⚙️ Generator Trip', desc: 'Primary generator unplanned shutdown' },
      { id: 'hvac_fail', title: '🌡️ HVAC Breakdown', desc: 'Station heating unit failure in winter' },
      { id: 'pump_failure', title: '🔧 Pump Seizure', desc: 'Critical pump mechanical failure' },
    ]
  },
  environment: {
    label: 'Environment & Weather', color: '#00e5ff',
    icon: <Activity className="w-4 h-4" />,
    forecastDomain: 'energy', riskKeyword: 'weather',
    optDomain: 'energy', analyticsDomain: 'weather_risk',
    scenarioPresets: [
      { id: 'blizzard', title: '🌨️ Katabatic Blizzard', desc: 'Sustained 90 km/h winds for 48 hrs' },
      { id: 'temp_drop', title: '🥶 Temperature −55°C', desc: 'Polar vortex intrusion event' },
      { id: 'whiteout', title: '🌫️ Whiteout Conditions', desc: 'Zero visibility — outdoor ops halted' },
    ]
  },
  logistics: {
    label: 'Logistics & Transport', color: '#f97316',
    icon: <Truck className="w-4 h-4" />,
    forecastDomain: 'fuel', riskKeyword: 'logistics',
    optDomain: 'fuel', analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'ship_delay', title: '🚢 Vessel Delay +45d', desc: 'Antarctic sea ice blocks passage' },
      { id: 'cargo_loss', title: '📦 Critical Cargo Loss', desc: 'Medical/fuel container overboard' },
      { id: 'vehicle_fail', title: '🛻 Ground Vehicle Failure', desc: 'Snow tractor engine seize in traverse' },
    ]
  },
  personnel: {
    label: 'Personnel', color: '#c084fc',
    icon: <Users className="w-4 h-4" />,
    forecastDomain: 'energy', riskKeyword: 'health',
    optDomain: 'energy', analyticsDomain: 'weather_risk',
    scenarioPresets: [
      { id: 'medical_evac', title: '🏥 Medical Emergency Evacuation', desc: 'Crew member requires emergency evacuation' },
      { id: 'reduced_crew', title: '👥 Crew Reduced −30%', desc: 'Illness reduces operational capacity' },
      { id: 'winter_isolation', title: '🧊 Extended Winter Isolation', desc: 'Resupply window closes 2 months early' },
    ]
  },
  communication: {
    label: 'Communications', color: '#38bdf8',
    icon: <Radio className="w-4 h-4" />,
    forecastDomain: 'energy', riskKeyword: 'communication',
    optDomain: 'energy', analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'primary_link_failure', title: '📡 Primary Link Failure', desc: 'LEO satellite dish lock lost' },
      { id: 'bandwidth_reduction', title: '📉 Bandwidth Throttle −65%', desc: 'Transponder orbital contention' },
      { id: 'high_packet_loss', title: '🌩️ Auroral Packet Loss', desc: 'Solar flare ionospheric storm' },
    ]
  },
  inventory: {
    label: 'Inventory & Supplies', color: '#06b6d4',
    icon: <Package className="w-4 h-4" />,
    forecastDomain: 'fuel', riskKeyword: 'inventory',
    optDomain: 'fuel', analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'critical_stockout', title: '🔴 Critical Stockout', desc: 'Medical supplies fall below minimum threshold' },
      { id: 'medical_draw', title: '💊 Medical Emergency Draw', desc: 'Emergency consumption of critical items' },
      { id: 'resupply_failed', title: '🚫 Resupply Mission Failed', desc: 'Antarctic conditions prevent cargo delivery' },
    ]
  },
};

const ALL_FORECAST_DOMAINS = [
  { id: 'fuel', name: 'Fuel Storage', unit: ' L', color: '#f59e0b' },
  { id: 'energy', name: 'Energy Load', unit: ' kW', color: '#818cf8' },
  { id: 'water', name: 'Water Storage', unit: ' L', color: '#06b6d4' },
  { id: 'equipment', name: 'Fleet Health', unit: '%', color: '#10b981' },
];

// ── Forecast mini chart (inline echarts) ─────────────────────────────────────
const ForecastMiniChart: React.FC<{ data: any; color: string }> = ({ data, color }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current || !data?.forecast?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const series = data.forecast.map((p: any) => p.predicted_value ?? p.value ?? 0);
    const labels = data.forecast.map((p: any) => p.horizon_label || `+${p.horizon_hours ?? 0}h`);
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 12, bottom: 28, left: 48, right: 12 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace' } },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace' } },
      series: [{
        type: 'line', data: series, smooth: true, showSymbol: false,
        lineStyle: { width: 2.5, color },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + '44' }, { offset: 1, color: color + '04' }]) },
      }],
    });
    const ro = new ResizeObserver(() => chart.resize()); ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data, color]);
  if (!data?.forecast?.length) return <div className="h-32 flex items-center justify-center text-slate-500 text-xs font-mono">No forecast data available</div>;
  return <div ref={ref} style={{ width: '100%', height: 130 }} />;
};

// ── Dispatch bar ──────────────────────────────────────────────────────────────
const DispatchBar: React.FC<{ label: string; current: number; recommended: number; max?: number; color: string }> = ({ label, current, recommended, max = 100, color }) => {
  const curPct = Math.min(100, (current / max) * 100);
  const recPct = Math.min(100, (recommended / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-300 font-bold">{label}</span>
        <span className="text-slate-400">Now: <strong className="text-white">{current}</strong> → <strong style={{ color }}>{recommended}</strong></span>
      </div>
      <div className="relative h-5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
        <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${curPct}%`, background: '#94a3b8' }} />
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${recPct}%`, background: `linear-gradient(to right,${color}88,${color})`, boxShadow: `0 0 8px ${color}44` }} />
      </div>
    </div>
  );
};

// ── SHAP waterfall chart ──────────────────────────────────────────────────────
const ShapChart: React.FC<{ features: any[]; baseValue: number; output: number; color: string }> = ({ features, baseValue, output, color }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current || !features?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const sorted = [...features].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value)).slice(0, 8);
    const names = ['Base', ...sorted.map((f: any) => f.name.substring(0, 14)), 'Output'];
    const values: (number | [number, number])[] = [];
    let running = baseValue;
    values.push(baseValue);
    sorted.forEach((f: any) => { const from = running; running += f.shap_value; values.push([from, running]); });
    values.push(output);
    const colors = [color, ...sorted.map((f: any) => (f.shap_value > 0 ? '#ef4444' : '#10b981')), color];
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 12, bottom: 60, left: 60, right: 16 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace' } },
      xAxis: { type: 'category', data: names, axisLabel: { color: '#475569', fontSize: 8, fontFamily: 'monospace', rotate: 30 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace' } },
      series: [{ type: 'bar', data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: 3 } })), barWidth: 18 }],
    });
    const ro = new ResizeObserver(() => chart.resize()); ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [features, baseValue, output, color]);
  return <div ref={ref} style={{ width: '100%', height: 180 }} />;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const DecisionIntelligencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';
  const { role } = useAuthStore();
  const { stations } = useStationStore();

  // Active domain from URL param (e.g. ?domain=fuel)
  const domainParam = searchParams.get('domain') || 'energy';
  const domainCfg = DOMAIN_CONFIG[domainParam] || DOMAIN_CONFIG.energy;

  const station = stations.find(s => s.station_id === stationId) || {
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  // Active feature tab
  const [activeFeature, setActiveFeature] = useState<'forecast' | 'risk' | 'optimization' | 'whatif' | 'analytics' | 'recommendations'>('forecast');

  // Data states
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastDomain, setForecastDomain] = useState(domainCfg.forecastDomain);
  const [forecastHorizon, setForecastHorizon] = useState(24);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [optLoading, setOptLoading] = useState(false);

  const [whatIfScenario, setWhatIfScenario] = useState(domainCfg.scenarioPresets[0]?.id || '');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [shapData, setShapData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [expandedRec, setExpandedRec] = useState<number | null>(0);
  const [executedRecs, setExecutedRecs] = useState<Record<number, boolean>>({});

  // Scenario store for What-If
  const { presets, loadPresets, selectPreset, runScenario, currentResult, isRunning } = useScenarioStore();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState<any>(null);

  const accentColor = domainCfg.color;

  // Load data when feature tab changes
  useEffect(() => {
    if (activeFeature === 'forecast') loadForecast();
    if (activeFeature === 'risk') loadAlerts();
    if (activeFeature === 'optimization' && role !== 'viewer') loadOptimization();
    if (activeFeature === 'analytics') loadAnalytics();
    if (activeFeature === 'recommendations' && role !== 'viewer') loadRecs();
    if (activeFeature === 'whatif' && role !== 'viewer') loadPresets();
  }, [activeFeature, stationId, domainParam]);

  useEffect(() => {
    if (activeFeature === 'forecast') loadForecast();
  }, [forecastDomain, forecastHorizon]);

  const loadForecast = async () => {
    setForecastLoading(true);
    try { const d = await forecastApi.get(stationId, forecastDomain, forecastHorizon); setForecastData(d); }
    catch {} finally { setForecastLoading(false); }
  };

  const loadAlerts = async () => {
    setAlertsLoading(true);
    try { const d = await alertsApi.list(stationId); setAlerts(Array.isArray(d) ? d : []); }
    catch {} finally { setAlertsLoading(false); }
  };

  const loadOptimization = async () => {
    setOptLoading(true);
    try { const d = await optimizationApi.getRlDispatch(stationId); setOptimizationData(d); }
    catch {} finally { setOptLoading(false); }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [ana, shap] = await Promise.all([
        analyticsApi.get(stationId, domainCfg.analyticsDomain),
        analyticsApi.getShap(stationId, 'risk'),
      ]);
      setAnalyticsData(ana); setShapData(shap);
    } catch {} finally { setAnalyticsLoading(false); }
  };

  const loadRecs = async () => {
    setRecsLoading(true);
    try { const d = await recommendationsApi.list(stationId); setRecommendations(Array.isArray(d) ? d : []); }
    catch {} finally { setRecsLoading(false); }
  };

  const handleRunWhatIf = async () => {
    setWhatIfLoading(true); setWhatIfResult(null);
    try {
      const res = await scenariosApi.execute(stationId, { type: whatIfScenario });
      setWhatIfResult(res?.result || res);
    } catch {} finally { setWhatIfLoading(false); }
  };

  const handleRunMonteCarlo = async () => {
    setMcLoading(true);
    try { const d = await scenariosApi.runMonteCarlo(stationId, 100, 30, whatIfScenario); setMcResult(d); }
    catch {} finally { setMcLoading(false); }
  };

  const FEATURES: Array<{ id: string; label: string; desc: string; icon: React.ComponentType<any>; restricted?: boolean }> = [
    { id: 'forecast', label: '📈 Forecast', desc: 'Physics-based resource trajectory', icon: TrendingUp },
    { id: 'risk', label: '⚠️ Risk & Alerts', desc: 'Anomaly detection & prioritized alerts', icon: AlertTriangle },
    { id: 'optimization', label: '⚡ Optimization', desc: 'RL dispatch recommendations', icon: Cpu, restricted: true },
    { id: 'whatif', label: '🧪 What-If Sim', desc: 'Scenario impact sandbox', icon: FlaskConical, restricted: true },
    { id: 'analytics', label: '📊 Analytics', desc: 'SHAP explainability & trends', icon: LineChart },
    { id: 'recommendations', label: '💡 AI Recs', desc: 'Operator action support', icon: Lightbulb, restricted: true },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none opacity-6"
          style={{ background: `radial-gradient(ellipse at 40% 60%, ${accentColor} 0%, transparent 60%)` }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Brain className="w-8 h-8" style={{ color: accentColor }} />
              Decision Intelligence — {domainCfg.label}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <Layers className="w-4 h-4 text-cyan-400" /> Domains
            </button>
          </div>
        </div>
      </div>

      {/* ── Feature Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {FEATURES.map(f => {
          const locked = f.restricted && role === 'viewer';
          const Icon = f.icon;
          return (
            <button key={f.id}
              onClick={() => !locked && setActiveFeature(f.id as any)}
              disabled={locked}
              title={locked ? 'Requires Operator+ role' : f.desc}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all flex items-center gap-2 ${activeFeature === f.id
                ? 'border-opacity-60 text-white'
                : locked
                  ? 'bg-polar-dark/30 border-polar-border text-slate-600 cursor-not-allowed'
                  : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20 cursor-pointer'}`}
              style={activeFeature === f.id ? { background: `${accentColor}20`, borderColor: `${accentColor}60`, color: accentColor } : {}}>
              <Icon className="w-3.5 h-3.5" />
              {f.label}
              {locked && <span className="text-[8px] px-1 py-0.5 rounded bg-slate-700 text-slate-500 font-mono">OP+</span>}
            </button>
          );
        })}
      </div>

      {/* ══════════════════ FORECAST ══════════════════ */}
      {activeFeature === 'forecast' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Domain</span>
              <select value={forecastDomain} onChange={e => setForecastDomain(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-white focus:outline-none focus:border-cyan-400/50 cursor-pointer">
                {ALL_FORECAST_DOMAINS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Horizon</span>
              <div className="flex gap-1">
                {[12, 24, 48, 72, 168].map(h => (
                  <button key={h} onClick={() => setForecastHorizon(h)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${forecastHorizon === h ? 'text-white border-opacity-60' : 'bg-polar-dark border-polar-border text-slate-400 hover:text-white'}`}
                    style={forecastHorizon === h ? { background: `${accentColor}20`, borderColor: `${accentColor}60`, color: accentColor } : {}}>
                    {h < 24 ? `${h}h` : `${h / 24}d`}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={loadForecast} disabled={forecastLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white hover:border-white/30 transition-all cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${forecastLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: accentColor }} />
                {forecastHorizon}h Forecast — {ALL_FORECAST_DOMAINS.find(d => d.id === forecastDomain)?.name}
              </div>
              {forecastLoading
                ? <div className="h-32 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>
                : <ForecastMiniChart data={forecastData} color={accentColor} />
              }
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Forecast Metrics</div>
              {forecastData ? (
                <div className="space-y-3 text-xs font-mono">
                  {[
                    { label: 'RMSE', val: forecastData.metrics?.rmse?.toFixed(2) ?? '—', color: '#94a3b8' },
                    { label: 'MAPE', val: forecastData.metrics?.mape != null ? forecastData.metrics.mape.toFixed(1) + '%' : '—', color: '#94a3b8' },
                    { label: 'Confidence', val: `${forecastData.confidence_pct ?? 94}%`, color: accentColor },
                    { label: 'Trend', val: forecastData.trend ?? 'STABLE', color: '#10b981' },
                    { label: 'Horizon', val: `${forecastHorizon}h`, color: '#64748b' },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between border-b border-polar-border/30 pb-2">
                      <span className="text-slate-400">{m.label}</span>
                      <span className="font-bold" style={{ color: m.color }}>{m.val}</span>
                    </div>
                  ))}
                  {forecastData.predicted_value && (
                    <div className="p-3 rounded-xl border text-center"
                      style={{ borderColor: `${accentColor}33`, background: `${accentColor}09` }}>
                      <div className="text-[9px] text-slate-400 uppercase">End of Horizon Value</div>
                      <div className="text-2xl font-black mt-1" style={{ color: accentColor }}>
                        {typeof forecastData.predicted_value === 'number' ? forecastData.predicted_value.toFixed(1) : forecastData.predicted_value}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-500 text-center py-8">No forecast data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ RISK & ALERTS ══════════════════ */}
      {activeFeature === 'risk' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-white font-bold uppercase tracking-wider">Active Alerts — {domainCfg.label}</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                {alerts.filter(a => a.domain?.toLowerCase().includes(domainCfg.riskKeyword)).length || alerts.length} ALERTS
              </span>
            </div>
            <button onClick={loadAlerts} disabled={alertsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {alertsLoading
            ? <div className="glass-panel p-12 rounded-2xl border border-polar-border flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>
            : alerts.length === 0
              ? <div className="glass-panel p-12 rounded-2xl border border-polar-border text-center text-xs font-mono text-slate-400">
                  <Shield className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  All systems nominal. No active alerts.
                </div>
              : alerts.map((alert: any, i: number) => {
                  const sev = alert.severity?.toUpperCase() || 'LOW';
                  const sevColor = sev === 'CRITICAL' ? '#ef4444' : sev === 'HIGH' ? '#f59e0b' : sev === 'MEDIUM' ? '#eab308' : '#10b981';
                  return (
                    <div key={i} className="glass-panel p-4 rounded-2xl border shadow-xl"
                      style={{ borderColor: `${sevColor}33` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: sevColor }} />
                          <div>
                            <div className="text-xs font-mono font-bold text-white">{alert.alert_type || alert.message}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{alert.domain} · {alert.timestamp || 'Real-time'}</div>
                            {alert.recommendation && <p className="text-[10px] font-mono text-slate-300 mt-2 leading-relaxed">{alert.recommendation}</p>}
                          </div>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold shrink-0"
                          style={{ borderColor: `${sevColor}44`, background: `${sevColor}11`, color: sevColor }}>{sev}</span>
                      </div>
                    </div>
                  );
                })
          }
        </div>
      )}

      {/* ══════════════════ OPTIMIZATION ══════════════════ */}
      {activeFeature === 'optimization' && role !== 'viewer' && (
        <div className="space-y-5">
          <div className="glass-panel p-5 rounded-2xl border border-polar-border">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: accentColor }}>
                <Cpu className="w-4 h-4" /> RL-Based Power Dispatch Optimization — {domainCfg.label}
              </div>
              <button onClick={loadOptimization} disabled={optLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer">
                <RefreshCw className={`w-3.5 h-3.5 ${optLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {optLoading
              ? <div className="h-24 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>
              : optimizationData
                ? (
                  <div className="space-y-4">
                    {(optimizationData.dispatch_schedule || []).slice(0, 5).map((item: any, i: number) => (
                      <DispatchBar key={i} label={item.source || `Source ${i + 1}`}
                        current={item.current_kw ?? 0} recommended={item.recommended_kw ?? 0}
                        max={item.capacity_kw ?? 100} color={accentColor} />
                    ))}
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-polar-border/40">
                      <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                        <div className="text-[9px] font-mono text-slate-500 uppercase">Savings</div>
                        <div className="text-lg font-black font-mono text-emerald-400">{optimizationData.total_savings_kw ?? 0} kW</div>
                      </div>
                      <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                        <div className="text-[9px] font-mono text-slate-500 uppercase">Efficiency</div>
                        <div className="text-lg font-black font-mono" style={{ color: accentColor }}>{optimizationData.efficiency_gain_pct ?? 0}%</div>
                      </div>
                      <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                        <div className="text-[9px] font-mono text-slate-500 uppercase">Confidence</div>
                        <div className="text-lg font-black font-mono text-cyan-300">{optimizationData.confidence_pct ?? 0}%</div>
                      </div>
                    </div>
                  </div>
                )
                : <div className="text-xs font-mono text-slate-500 text-center py-8">No optimization data available. Click refresh.</div>
            }
          </div>
        </div>
      )}

      {/* ══════════════════ WHAT-IF SIM ══════════════════ */}
      {activeFeature === 'whatif' && role !== 'viewer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: accentColor }}>
              <Sparkles className="w-4 h-4" /> Scenario Sandbox — {domainCfg.label}
            </div>
            <p className="text-[10px] font-mono text-slate-500">Domain-specific failure scenarios. Live state untouched.</p>
            <div className="space-y-2.5">
              {domainCfg.scenarioPresets.map(sc => (
                <div key={sc.id} onClick={() => setWhatIfScenario(sc.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${whatIfScenario === sc.id ? 'text-white' : 'bg-polar-dark/50 border-polar-border text-slate-400 hover:border-white/20'}`}
                  style={whatIfScenario === sc.id ? { background: `${accentColor}10`, borderColor: `${accentColor}50` } : {}}>
                  <div className="text-xs font-mono font-bold">{sc.title}</div>
                  <div className="text-[10px] font-mono mt-0.5 opacity-70">{sc.desc}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleRunWhatIf} disabled={whatIfLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                style={{ background: `${accentColor}20`, borderColor: `${accentColor}50`, color: accentColor }}>
                {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Scenario
              </button>
              <button onClick={handleRunMonteCarlo} disabled={mcLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold border border-polar-border bg-polar-dark/60 text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50">
                {mcLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                Monte Carlo
              </button>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
            {!whatIfResult && !mcResult
              ? <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs font-mono text-center gap-3">
                  <FlaskConical className="w-12 h-12 opacity-20" />
                  Run a scenario or Monte Carlo simulation to see projected impact.
                </div>
              : whatIfResult
                ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl border" style={{ borderColor: `${accentColor}40`, background: `${accentColor}0A` }}>
                      <div className="text-xs font-mono font-bold" style={{ color: accentColor }}>
                        {domainCfg.scenarioPresets.find(s => s.id === whatIfScenario)?.title}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-300 mt-1">✓ Cloned-state simulation — live data untouched</div>
                    </div>
                    {whatIfResult.projected_states && Object.entries(whatIfResult.projected_states).slice(0, 5).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs font-mono border-b border-polar-border/20 pb-2">
                        <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-amber-300">{String(v)}</span>
                      </div>
                    ))}
                    {whatIfResult.risk_assessment && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-300">
                        <div className="font-bold mb-1">Risk Assessment</div>
                        <p className="text-slate-300">{whatIfResult.risk_assessment}</p>
                      </div>
                    )}
                    <button onClick={() => setWhatIfResult(null)}
                      className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" /> Clear
                    </button>
                  </div>
                )
                : mcResult
                  ? (
                    <div className="space-y-3 text-xs font-mono">
                      <div className="text-[10px] font-bold text-cyan-300">Monte Carlo Results — 100 Iterations</div>
                      {[
                        { l: 'P5 (Worst-case 5%)', v: mcResult.p5_value ?? '—' },
                        { l: 'P50 (Median)', v: mcResult.p50_value ?? '—' },
                        { l: 'P95 (Best-case 5%)', v: mcResult.p95_value ?? '—' },
                        { l: 'Std Deviation', v: mcResult.std_deviation ?? '—' },
                        { l: 'Critical Risk P(%)', v: `${mcResult.critical_probability ?? 0}%` },
                      ].map(r => (
                        <div key={r.l} className="flex justify-between border-b border-polar-border/20 pb-1.5">
                          <span className="text-slate-400">{r.l}</span>
                          <span className="font-bold text-cyan-300">{String(r.v)}</span>
                        </div>
                      ))}
                      <button onClick={() => setMcResult(null)}
                        className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <X className="w-3.5 h-3.5" /> Clear
                      </button>
                    </div>
                  )
                  : null
            }
          </div>
        </div>
      )}

      {/* ══════════════════ ANALYTICS ══════════════════ */}
      {activeFeature === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                <LineChart className="w-4 h-4" style={{ color: accentColor }} /> Analytics Trend — {domainCfg.label}
              </div>
              {analyticsLoading
                ? <div className="h-40 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>
                : analyticsData?.series
                  ? <ForecastMiniChart data={{ forecast: analyticsData.series.map((p: any) => ({ predicted_value: p.value, horizon_label: p.label })) }} color={accentColor} />
                  : <div className="h-40 flex items-center justify-center text-slate-500 text-xs font-mono">No analytics data</div>
              }
              {analyticsData && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-polar-border/40">
                  {[
                    { label: 'Mean', val: analyticsData.stats?.mean?.toFixed(1) ?? '—' },
                    { label: 'Std Dev', val: analyticsData.stats?.std?.toFixed(2) ?? '—' },
                    { label: 'Trend', val: analyticsData.trend ?? 'STABLE' },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <div className="text-[9px] font-mono text-slate-500 uppercase">{m.label}</div>
                      <div className="text-xs font-bold font-mono text-white mt-0.5">{m.val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" style={{ color: accentColor }} /> SHAP Explainability — Feature Impact
              </div>
              {analyticsLoading
                ? <div className="h-40 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>
                : shapData?.features
                  ? <ShapChart features={shapData.features} baseValue={shapData.base_value} output={shapData.output_value} color={accentColor} />
                  : <div className="h-40 flex items-center justify-center text-slate-500 text-xs font-mono">No SHAP data available</div>
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ AI RECOMMENDATIONS ══════════════════ */}
      {activeFeature === 'recommendations' && role !== 'viewer' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Lightbulb className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-white font-bold uppercase tracking-wider">AI Recommendations — {domainCfg.label}</span>
            </div>
            <button onClick={loadRecs} disabled={recsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {recsLoading
            ? <div className="glass-panel p-12 rounded-2xl border border-polar-border flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>
            : recommendations.length === 0
              ? <div className="glass-panel p-12 rounded-2xl border border-polar-border text-center text-xs font-mono text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No active recommendations. All systems optimal.
                </div>
              : recommendations.map((rec: any, i: number) => {
                  const pColor = rec.priority === 'CRITICAL' ? '#ef4444' : rec.priority === 'HIGH' ? '#f97316' : rec.priority === 'MEDIUM' ? '#eab308' : '#10b981';
                  const isExp = expandedRec === i;
                  const isDone = executedRecs[i];
                  return (
                    <div key={i} className="glass-panel rounded-2xl border overflow-hidden" style={{ borderColor: `${pColor}22` }}>
                      <div onClick={() => setExpandedRec(isExp ? null : i)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-polar-dark/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold uppercase"
                            style={{ borderColor: `${pColor}44`, background: `${pColor}11`, color: pColor }}>{rec.priority}</span>
                          <div>
                            <div className="text-xs font-mono font-bold text-white">{rec.action}</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">Domain: {rec.domain} · Operator+</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setExecutedRecs(p => ({ ...p, [i]: true })); }}
                            disabled={isDone}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>
                            {isDone ? '✓ Done' : 'Apply'}
                          </button>
                          {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>
                      {isExp && (
                        <div className="px-4 pb-4 pt-2 border-t border-polar-border/40 bg-polar-dark/30">
                          <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold mb-2">Causal Justification:</div>
                          <p className="text-xs font-mono text-slate-300 leading-relaxed">{rec.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })
          }
        </div>
      )}
    </div>
  );
};

export default DecisionIntelligencePage;
