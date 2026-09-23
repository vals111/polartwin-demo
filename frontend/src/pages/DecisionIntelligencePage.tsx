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
  Brain, TrendingUp, AlertTriangle, FlaskConical,
  LineChart, Lightbulb, Zap, Droplet, Wrench,
  RefreshCw, Play, CheckCircle2, Shield, ChevronDown,
  ChevronUp, Layers, BarChart3, Activity,
  Radio, Users, Truck, X, Sparkles,
  Building2, CloudSnow, ChevronRight
} from 'lucide-react';

// ── 8 Canonical Domain Configurations ─────────────────────────────────────────
// Domain IDs match exactly with DomainsPage.tsx and CrossDomainCausalTree.tsx
const DOMAIN_CONFIG: Record<string, {
  label: string; color: string; icon: React.ReactNode;
  forecastDomain: string; riskKeywords: string[]; recKeywords: string[];
  analyticsDomain: string;
  scenarioPresets: { id: string; title: string; desc: string }[];
}> = {
  infrastructure: {
    label: 'Infrastructure',
    color: '#06b6d4',
    icon: <Building2 className="w-4 h-4" />,
    forecastDomain: 'energy',
    riskKeywords: ['infrastructure', 'structural', 'building', 'habitat', 'wind'],
    recKeywords: ['infrastructure', 'structural', 'building', 'maintenance'],
    analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'blizzard_stress', title: '🌨️ Polar downslope wind Blizzard Stress', desc: 'Sustained 90 km/h winds — structural stress index >80' },
      { id: 'thermal_loss', title: '🥶 Thermal Insulation Failure', desc: 'Envelope breach — interior temp drops 12°C' },
      { id: 'power_outage', title: '⚡ Total Power Blackout', desc: 'Grid failure — all life support systems offline' },
    ]
  },
  energy_fuel: {
    label: 'Energy & Fuel',
    color: '#f59e0b',
    icon: <Zap className="w-4 h-4" />,
    forecastDomain: 'fuel',
    riskKeywords: ['energy', 'fuel', 'power', 'generator', 'solar', 'battery', 'grid'],
    recKeywords: ['energy', 'fuel', 'power', 'generator', 'load'],
    analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'gen1_offline', title: '⚡ Generator #1 Trip', desc: 'Primary generator offline — load shedding cascade' },
      { id: 'solar_loss', title: '☁️ Solar Array Loss', desc: 'PV contribution drops to zero due to blizzard' },
      { id: 'fuel_leak', title: '⛽ Tank Leak −20%', desc: 'Undetected pipeline leak reduces reserves' },
      { id: 'resupply_delay', title: '🚢 Resupply Delayed 30d', desc: 'Next tanker delayed by Antarctic ice storm' },
    ]
  },
  logistics: {
    label: 'Transportation & Logistics',
    color: '#f97316',
    icon: <Truck className="w-4 h-4" />,
    forecastDomain: 'fuel',
    riskKeywords: ['logistics', 'transport', 'cargo', 'vessel', 'resupply', 'traverse'],
    recKeywords: ['logistics', 'supply', 'cargo', 'transport'],
    analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'ship_delay', title: '🚢 Vessel Delay +45d', desc: 'Antarctic sea ice blocks passage route' },
      { id: 'cargo_loss', title: '📦 Critical Cargo Loss', desc: 'Medical/fuel container falls overboard' },
      { id: 'vehicle_fail', title: '🛻 Ground Vehicle Failure', desc: 'Snow tractor engine seize mid-traverse' },
    ]
  },
  environment: {
    label: 'Environment & Weather',
    color: '#00e5ff',
    icon: <CloudSnow className="w-4 h-4" />,
    forecastDomain: 'energy',
    riskKeywords: ['environment', 'weather', 'temperature', 'wind', 'storm', 'blizzard', 'polar'],
    recKeywords: ['weather', 'environment', 'storm', 'wind'],
    analyticsDomain: 'weather_risk',
    scenarioPresets: [
      { id: 'blizzard', title: '🌨️ Polar downslope wind Blizzard', desc: 'Sustained 90 km/h winds for 48 hrs' },
      { id: 'temp_drop', title: '🥶 Temperature −55°C', desc: 'Polar spinning air mass intrusion event' },
      { id: 'whiteout', title: '🌫️ Whiteout Conditions', desc: 'Zero visibility — all outdoor ops halted' },
    ]
  },
  communication: {
    label: 'Communication',
    color: '#8b5cf6',
    icon: <Radio className="w-4 h-4" />,
    forecastDomain: 'energy',
    riskKeywords: ['communication', 'satellite', 'data speed', 'link', 'signal', 'live data'],
    recKeywords: ['communication', 'satellite', 'link', 'data speed'],
    analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'primary_link_failure', title: '📡 Primary Link Failure', desc: 'LEO satellite dish lock lost' },
      { id: 'data speed_reduction', title: '📉 Data speed Throttle −65%', desc: 'Transponder orbital contention' },
      { id: 'high_packet_loss', title: '🌩️ Auroral Packet Loss', desc: 'Solar flare ionospheric storm disrupts signal' },
    ]
  },
  water: {
    label: 'Water',
    color: '#38bdf8',
    icon: <Droplet className="w-4 h-4" />,
    forecastDomain: 'water',
    riskKeywords: ['water', 'pump', 'pipe', 'potable', 'contamination', 'freeze', 'seawater purification'],
    recKeywords: ['water', 'pump', 'pipe', 'reservoir'],
    analyticsDomain: 'water_risk',
    scenarioPresets: [
      { id: 'pump_fail', title: '💧 Pump Failure', desc: 'Intake pump mechanical seizure' },
      { id: 'pipe_freeze', title: '🧊 Pipe Freeze Event', desc: 'Distribution pipe frozen at −30°C' },
      { id: 'contamination', title: '⚠️ Contamination Alert', desc: 'TDS/turbidity exceeds safe threshold' },
    ]
  },
  personnel: {
    label: 'Personnel Safety & Emergency',
    color: '#a855f7',
    icon: <Users className="w-4 h-4" />,
    forecastDomain: 'energy',
    riskKeywords: ['personnel', 'crew', 'health', 'medical', 'safety', 'emergency', 'evacuation'],
    recKeywords: ['personnel', 'crew', 'health', 'safety'],
    analyticsDomain: 'weather_risk',
    scenarioPresets: [
      { id: 'medical_evac', title: '🏥 Medical Emergency Evacuation', desc: 'Crew member requires emergency evacuation' },
      { id: 'reduced_crew', title: '👥 Crew Reduced −30%', desc: 'Illness reduces operational capacity' },
      { id: 'winter_isolation', title: '🧊 Extended Winter Isolation', desc: 'Resupply window closes 2 months early' },
    ]
  },
  equipment: {
    label: 'Equipment & Machinery',
    color: '#10b981',
    icon: <Wrench className="w-4 h-4" />,
    forecastDomain: 'equipment',
    riskKeywords: ['equipment', 'machinery', 'generator', 'pump', 'hvac', 'vibration', 'maintenance'],
    recKeywords: ['equipment', 'machinery', 'maintenance', 'generator'],
    analyticsDomain: 'energy_fuel',
    scenarioPresets: [
      { id: 'gen_failure', title: '⚙️ Generator Trip', desc: 'Primary generator unplanned shutdown' },
      { id: 'hvac_fail', title: '🌡️ HVAC Breakdown', desc: 'Station heating unit failure in winter' },
      { id: 'pump_failure', title: '🔧 Pump Seizure', desc: 'Critical pump mechanical failure' },
    ]
  },
};

// Domain display order for the switcher
const DOMAIN_ORDER = [
  'infrastructure', 'energy_fuel', 'logistics', 'environment',
  'communication', 'water', 'personnel', 'equipment'
];

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

// ── Domain Switcher Component ─────────────────────────────────────────────────
const DomainSwitcher: React.FC<{
  currentDomain: string;
  stationId: string;
  accentColor: string;
}> = ({ currentDomain, stationId, accentColor }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap gap-1.5">
      {DOMAIN_ORDER.map(domId => {
        const cfg = DOMAIN_CONFIG[domId];
        const isActive = currentDomain === domId;
        return (
          <button
            key={domId}
            onClick={() => navigate(`/station/${stationId}/decision?domain=${domId}`)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5"
            style={isActive
              ? { background: `${cfg.color}20`, borderColor: `${cfg.color}60`, color: cfg.color }
              : { background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.08)', color: '#64748b' }
            }
          >
            {cfg.icon}
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const DecisionIntelligencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const { role } = useAuthStore();
  const { stations } = useStationStore();

  // Active domain from URL param (e.g. ?domain=energy_fuel)
  const domainParam = searchParams.get('domain') || 'energy_fuel';
  // Resolve to valid domain — if someone passes 'energy' or 'fuel' redirect gracefully
  const resolvedDomain = DOMAIN_CONFIG[domainParam] ? domainParam :
    (domainParam === 'energy' || domainParam === 'fuel' ? 'energy_fuel' : 'energy_fuel');
  const domainCfg = DOMAIN_CONFIG[resolvedDomain];

  const station = stations.find(s => s.station_id === stationId) || {
    name: stationId === 'maitri' ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  // Active feature tab
  const [activeFeature, setActiveFeature] = useState<'forecast' | 'risk' | 'whatif' | 'analytics' | 'recommendations'>('forecast');

  // Data states
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastDomain, setForecastDomain] = useState(domainCfg.forecastDomain);
  const [forecastHorizon, setForecastHorizon] = useState(24);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

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
  const { loadPresets } = useScenarioStore();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState<any>(null);

  const accentColor = domainCfg.color;

  // Reset domain-specific state when domain changes
  useEffect(() => {
    setWhatIfScenario(domainCfg.scenarioPresets[0]?.id || '');
    setWhatIfResult(null);
    setMcResult(null);
    setForecastDomain(domainCfg.forecastDomain);
    setForecastData(null);
    setAlerts([]);
    setAnalyticsData(null);
    setShapData(null);
    setRecommendations([]);
    setExpandedRec(0);
    setExecutedRecs({});
  }, [resolvedDomain]);

  // Load data when feature tab or domain changes
  useEffect(() => {
    if (activeFeature === 'forecast') loadForecast();
    if (activeFeature === 'risk') loadAlerts();
    if (activeFeature === 'analytics') loadAnalytics();
    if (activeFeature === 'recommendations') loadRecs();
    if (activeFeature === 'whatif') loadPresets();
  }, [activeFeature, stationId, resolvedDomain]);

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
    try {
      const d = await alertsApi.list(stationId);
      const all = Array.isArray(d) ? d : [];
      // Filter by domain keywords — show domain-relevant alerts first, then all if none match
      const keywords = domainCfg.riskKeywords;
      const filtered = all.filter((a: any) =>
        keywords.some(kw => (a.domain || '').toLowerCase().includes(kw) ||
          (a.alert_type || '').toLowerCase().includes(kw) ||
          (a.message || '').toLowerCase().includes(kw))
      );
      setAlerts(filtered.length > 0 ? filtered : all);
    }
    catch {} finally { setAlertsLoading(false); }
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
    try {
      const d = await recommendationsApi.list(stationId);
      const all = Array.isArray(d) ? d : [];
      // Filter by domain keywords
      const keywords = domainCfg.recKeywords;
      const filtered = all.filter((r: any) =>
        keywords.some(kw => (r.domain || '').toLowerCase().includes(kw) ||
          (r.action || '').toLowerCase().includes(kw) ||
          (r.explanation || '').toLowerCase().includes(kw))
      );
      setRecommendations(filtered.length > 0 ? filtered : all);
    }
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

  const FEATURES: Array<{ id: string; label: string; desc: string; icon: React.ComponentType<any> }> = [
    { id: 'forecast', label: '📈 Forecasting', desc: 'Physics-based resource trajectory', icon: TrendingUp },
    { id: 'analytics', label: '📊 Analytics', desc: 'SHAP explainability & trend analysis', icon: LineChart },
    { id: 'risk', label: '⚠️ Risks & Alerts', desc: 'Anomaly detection & prioritized alerts', icon: AlertTriangle },
    { id: 'whatif', label: '🧪 What-If Simulation', desc: 'Scenario impact sandbox & Monte Carlo', icon: FlaskConical },
    { id: 'recommendations', label: '💡 AI Recommendations', desc: 'Operator action support', icon: Lightbulb },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none opacity-6"
          style={{ background: `radial-gradient(ellipse at 40% 60%, ${accentColor} 0%, transparent 60%)` }} />
        <div className="relative flex flex-col gap-4">
          {/* Title Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Decision Intelligence</div>
              <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
                <Brain className="w-8 h-8" style={{ color: accentColor }} />
                <span style={{ color: accentColor }}>{domainCfg.label}</span>
              </h1>
            </div>
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer self-start lg:self-center">
              <Layers className="w-4 h-4 text-cyan-400" /> Back to Domains
            </button>
          </div>

          {/* Domain Switcher */}
          <div>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-2">Switch Domain</div>
            <DomainSwitcher currentDomain={resolvedDomain} stationId={stationId} accentColor={accentColor} />
          </div>
        </div>
      </div>

      {/* ── Feature Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {FEATURES.map(f => {
          const Icon = f.icon;
          return (
            <button key={f.id}
              onClick={() => setActiveFeature(f.id as any)}
              title={f.desc}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all flex items-center gap-2 cursor-pointer ${activeFeature === f.id
                ? 'border-opacity-60 text-white'
                : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'}`}
              style={activeFeature === f.id ? { background: `${accentColor}20`, borderColor: `${accentColor}60`, color: accentColor } : {}}>
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════ FORECASTING ══════════════════ */}
      {activeFeature === 'forecast' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Metric</span>
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
                {forecastHorizon}h Forecast — {domainCfg.label} · {ALL_FORECAST_DOMAINS.find(d => d.id === forecastDomain)?.name}
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
                <div className="text-xs font-mono text-slate-500 text-center py-8">
                  {forecastLoading ? 'Loading...' : 'No forecast data — click Refresh'}
                </div>
              )}
            </div>
          </div>

          {/* Domain-specific forecast context */}
          <div className="glass-panel p-4 rounded-2xl border border-polar-border">
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-2" style={{ color: accentColor }}>
              {domainCfg.label} — Forecast Context
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
              {resolvedDomain === 'infrastructure' && 'Forecasting structural stress loads based on predicted wind speed and thermal gradients. High confidence in 24–48h window; uncertainty increases with storm probability beyond 72h.'}
              {resolvedDomain === 'energy_fuel' && 'Dual-metric forecast: generator load trajectory (kW) and diesel reserve depletion curve (L). Incorporates heating demand spikes, solar PV intermittency, and burn-rate variability.'}
              {resolvedDomain === 'logistics' && 'Resupply ETA and cargo timeline forecast based on sea-ice extent, traverse distance, and vessel schedule probability distributions.'}
              {resolvedDomain === 'environment' && 'Weather trajectory powered by ECMWF re-analysis and local sensor fusion. polar downslope wind onset prediction with 6h confidence bands.'}
              {resolvedDomain === 'communication' && 'LEO satellite pass schedule and data speed availability forecast. Ionospheric disturbance index integrated for signal attenuation prediction.'}
              {resolvedDomain === 'water' && 'Potable water storage forecast with melt-rate inputs, consumption demand profile, and pipe freeze risk temperature thresholds.'}
              {resolvedDomain === 'personnel' && 'Crew operational capacity and health monitoring trend. Incorporates circadian disruption metrics and isolation-period psychological stress indices.'}
              {resolvedDomain === 'equipment' && 'Fleet health degradation curve from vibration spectra, run-hours, and thermal cycling data. Predictive maintenance window estimated within ±8h.'}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════ ANALYTICS ══════════════════ */}
      {activeFeature === 'analytics' && (
        <div className="space-y-5">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Activity className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-white font-bold uppercase tracking-wider">Analytics & Explainability — {domainCfg.label}</span>
            </div>
            <button onClick={loadAnalytics} disabled={analyticsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                <LineChart className="w-4 h-4" style={{ color: accentColor }} /> Analytics Trend — {domainCfg.label}
              </div>
              {analyticsLoading
                ? <div className="h-40 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>
                : analyticsData?.series
                  ? <ForecastMiniChart data={{ forecast: analyticsData.series.map((p: any) => ({ predicted_value: p.value, horizon_label: p.label })) }} color={accentColor} />
                  : <div className="h-40 flex items-center justify-center text-slate-500 text-xs font-mono">No analytics data — click Refresh</div>
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
                  : <div className="h-40 flex items-center justify-center text-slate-500 text-xs font-mono">No SHAP data — click Refresh</div>
              }
            </div>
          </div>

          {/* Domain-specific analytics insight */}
          <div className="glass-panel p-4 rounded-2xl border border-polar-border">
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-2" style={{ color: accentColor }}>
              {domainCfg.label} — Key Analytics Drivers
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(resolvedDomain === 'infrastructure' ? [
                { kpi: 'Stress Index', val: '18/100', trend: '↑' },
                { kpi: 'Thermal Eff', val: '88.0%', trend: '↓' },
                { kpi: 'Snow Drift', val: '0.42 m', trend: '↑' },
                { kpi: 'Module Integrity', val: '94%', trend: '→' },
              ] : resolvedDomain === 'energy_fuel' ? [
                { kpi: 'Generator Load', val: '68 kW', trend: '↑' },
                { kpi: 'Fuel Reserve', val: '78.0%', trend: '↓' },
                { kpi: 'Solar Output', val: '22 kW', trend: '→' },
                { kpi: 'Battery SoC', val: '92%', trend: '→' },
              ] : resolvedDomain === 'logistics' ? [
                { kpi: 'Resupply ETA', val: '88 days', trend: '→' },
                { kpi: 'Cargo Integrity', val: '100%', trend: '→' },
                { kpi: 'Traverse Progress', val: '62%', trend: '↑' },
                { kpi: 'Fleet Ready', val: '4/4', trend: '→' },
              ] : resolvedDomain === 'environment' ? [
                { kpi: 'Temperature', val: '-25.2°C', trend: '↓' },
                { kpi: 'Wind Speed', val: '32 km/h', trend: '↑' },
                { kpi: 'Storm Index', val: '0.28', trend: '→' },
                { kpi: 'Pressure', val: '984 hPa', trend: '↓' },
              ] : resolvedDomain === 'communication' ? [
                { kpi: 'Data speed', val: '120 Mbps', trend: '→' },
                { kpi: 'Signal delay', val: '78 ms', trend: '→' },
                { kpi: 'Packet Loss', val: '0.05%', trend: '→' },
                { kpi: 'Link Uptime', val: '99.8%', trend: '→' },
              ] : resolvedDomain === 'water' ? [
                { kpi: 'Storage', val: '18,500 L', trend: '↓' },
                { kpi: 'Level', val: '82.0%', trend: '↓' },
                { kpi: 'Pipe Temp', val: '3.8°C', trend: '→' },
                { kpi: 'Freeze Risk', val: 'LOW', trend: '→' },
              ] : resolvedDomain === 'personnel' ? [
                { kpi: 'Headcount', val: '25 crew', trend: '→' },
                { kpi: 'Occupancy', val: '62.5%', trend: '→' },
                { kpi: 'O₂ Level', val: '20.9%', trend: '→' },
                { kpi: 'CO₂ Level', val: '420 ppm', trend: '→' },
              ] : [
                { kpi: 'Fleet Health', val: '93.5%', trend: '↓' },
                { kpi: 'Active Units', val: '6/6', trend: '→' },
                { kpi: 'Vibration', val: '2.1 mm/s', trend: '↑' },
                { kpi: 'Run Hours', val: '8,420 h', trend: '↑' },
              ]).map(item => (
                <div key={item.kpi} className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">{item.kpi}</div>
                  <div className="text-sm font-black font-mono mt-1" style={{ color: accentColor }}>{item.val}</div>
                  <div className="text-[10px] font-mono mt-0.5" style={{
                    color: item.trend === '↑' ? '#f59e0b' : item.trend === '↓' ? '#ef4444' : '#10b981'
                  }}>{item.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ RISKS & ALERTS ══════════════════ */}
      {activeFeature === 'risk' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-white font-bold uppercase tracking-wider">Risks & Alerts — {domainCfg.label}</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                {alerts.length} ALERTS
              </span>
            </div>
            <button onClick={loadAlerts} disabled={alertsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Domain-specific risk summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(resolvedDomain === 'infrastructure' ? [
              { label: 'Wind Stress', val: 'NOMINAL', color: '#10b981' },
              { label: 'Thermal Load', val: 'MODERATE', color: '#f59e0b' },
              { label: 'Snow Drift', val: 'WATCH', color: '#f59e0b' },
              { label: 'Structural', val: 'SAFE', color: '#10b981' },
            ] : resolvedDomain === 'energy_fuel' ? [
              { label: 'Grid Stability', val: 'NOMINAL', color: '#10b981' },
              { label: 'Fuel Reserve', val: 'WATCH', color: '#f59e0b' },
              { label: 'Solar Risk', val: 'LOW', color: '#10b981' },
              { label: 'Generator', val: 'NOMINAL', color: '#10b981' },
            ] : resolvedDomain === 'logistics' ? [
              { label: 'Vessel ETA', val: 'ON TRACK', color: '#10b981' },
              { label: 'Sea Ice', val: 'MODERATE', color: '#f59e0b' },
              { label: 'Cargo Status', val: 'NOMINAL', color: '#10b981' },
              { label: 'Ground Ops', val: 'ACTIVE', color: '#10b981' },
            ] : resolvedDomain === 'environment' ? [
              { label: 'Storm Risk', val: 'MODERATE', color: '#f59e0b' },
              { label: 'Wind Chill', val: 'WATCH', color: '#f59e0b' },
              { label: 'Visibility', val: 'GOOD', color: '#10b981' },
              { label: 'Temp Risk', val: 'LOW', color: '#10b981' },
            ] : resolvedDomain === 'communication' ? [
              { label: 'Primary Link', val: 'ACTIVE', color: '#10b981' },
              { label: 'Data speed', val: 'NOMINAL', color: '#10b981' },
              { label: 'Solar Flare', val: 'LOW', color: '#10b981' },
              { label: 'Backup', val: 'STANDBY', color: '#64748b' },
            ] : resolvedDomain === 'water' ? [
              { label: 'Storage Level', val: 'WATCH', color: '#f59e0b' },
              { label: 'Freeze Risk', val: 'LOW', color: '#10b981' },
              { label: 'Contamination', val: 'CLEAR', color: '#10b981' },
              { label: 'Pump Status', val: 'NOMINAL', color: '#10b981' },
            ] : resolvedDomain === 'personnel' ? [
              { label: 'Crew Health', val: 'NOMINAL', color: '#10b981' },
              { label: 'Isolation Stress', val: 'WATCH', color: '#f59e0b' },
              { label: 'Medical Risk', val: 'LOW', color: '#10b981' },
              { label: 'Safety Status', val: 'NOMINAL', color: '#10b981' },
            ] : [
              { label: 'Fleet Health', val: 'WATCH', color: '#f59e0b' },
              { label: 'Generator', val: 'NOMINAL', color: '#10b981' },
              { label: 'HVAC', val: 'NOMINAL', color: '#10b981' },
              { label: 'Maintenance', val: 'DUE', color: '#f59e0b' },
            ]).map(item => (
              <div key={item.label} className="glass-panel p-3 rounded-xl border border-polar-border text-center">
                <div className="text-[9px] font-mono text-slate-500 uppercase">{item.label}</div>
                <div className="text-xs font-black font-mono mt-1" style={{ color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>

          {alertsLoading
            ? <div className="glass-panel p-12 rounded-2xl border border-polar-border flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>
            : alerts.length === 0
              ? <div className="glass-panel p-12 rounded-2xl border border-polar-border text-center text-xs font-mono text-slate-400">
                  <Shield className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  All systems nominal for {domainCfg.label}. No active alerts.
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

      {/* ══════════════════ WHAT-IF SIMULATION ══════════════════ */}
      {activeFeature === 'whatif' && (
        <div className="space-y-5">
          {/* Role info banner */}
          {role === 'viewer' && (
            <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/05 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs font-mono text-amber-300">
                What-If Simulation requires Operator+ role to execute scenarios. You can view scenario definitions below.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: accentColor }}>
                <Sparkles className="w-4 h-4" /> Scenario Sandbox — {domainCfg.label}
              </div>
              <p className="text-[10px] font-mono text-slate-500">
                Domain-specific failure scenarios. Live station state is untouched — all simulations run on a cloned state engine.
              </p>
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
                <button onClick={handleRunWhatIf} disabled={whatIfLoading || role === 'viewer'}
                  className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  style={{ background: `${accentColor}20`, borderColor: `${accentColor}50`, color: accentColor }}>
                  {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Scenario
                </button>
                <button onClick={handleRunMonteCarlo} disabled={mcLoading || role === 'viewer'}
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
                    Select a {domainCfg.label} scenario and click Run Scenario or Monte Carlo to see projected impact.
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
                        <div className="text-[10px] font-bold text-cyan-300">Monte Carlo Results — 100 Iterations · {domainCfg.label}</div>
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
        </div>
      )}

      {/* ══════════════════ AI RECOMMENDATIONS ══════════════════ */}
      {activeFeature === 'recommendations' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Lightbulb className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-white font-bold uppercase tracking-wider">AI Recommendations — {domainCfg.label}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border"
                style={{ background: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}>
                {recommendations.length} ACTIONS
              </span>
            </div>
            <button onClick={loadRecs} disabled={recsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Fallback domain-specific recommendations when backend returns empty */}
          {!recsLoading && recommendations.length === 0 && (
            <div className="space-y-3">
              <div className="glass-panel p-3 rounded-xl border border-polar-border text-center text-[10px] font-mono text-slate-500 mb-2">
                Showing domain-intelligent fallback recommendations for {domainCfg.label}
              </div>
              {(resolvedDomain === 'infrastructure' ? [
                { priority: 'MEDIUM', action: 'Inspect snow drift accumulation on windward panels', domain: 'infrastructure', explanation: 'Current drift at 0.42m approaches load-bearing threshold for secondary roof panels. Manual inspection recommended within 48h.' },
                { priority: 'LOW', action: 'Test emergency shelter thermal seals', domain: 'infrastructure', explanation: 'Quarterly seal integrity check is due. Winter season increases thermal fatigue on polyurethane edge seals.' },
              ] : resolvedDomain === 'energy_fuel' ? [
                { priority: 'HIGH', action: 'Initiate load-shedding protocol for non-critical systems', domain: 'energy', explanation: 'Generator #1 at 68 kW is approaching 85% rated load. Non-critical heating circuits should be load-managed to extend service interval.' },
                { priority: 'MEDIUM', action: 'Request expedited fuel tanker ETA confirmation', domain: 'fuel', explanation: 'Current burn rate of 17.5 L/hr and 78% reserve projects depletion to critical zone in 28 days, 2 days before expected resupply.' },
              ] : resolvedDomain === 'logistics' ? [
                { priority: 'MEDIUM', action: 'Pre-position emergency fuel cache at Traverse Waypoint 3', domain: 'logistics', explanation: 'Supply run midpoint caching reduces traverse abort risk by 40% in the event of primary tractor engine failure at distance.' },
                { priority: 'LOW', action: 'Coordinate vessel ice pilot scheduling for early season approach', domain: 'logistics', explanation: 'Early-season ice extent data suggests 2026 approach window may open 15 days earlier than historical average.' },
              ] : resolvedDomain === 'environment' ? [
                { priority: 'HIGH', action: 'Issue outdoor operations stand-down for next 6 hours', domain: 'environment', explanation: 'Wind speed trending toward 45 km/h. Stand-down threshold is 50 km/h. Pre-emptive stand-down prevents personnel exposure during ramp-up.' },
                { priority: 'LOW', action: 'Recalibrate air pressure pressure sensors', domain: 'environment', explanation: 'Sensor drift of ±2.1 hPa detected on unit ENV-02. Calibration using portable reference standard recommended before next weather window.' },
              ] : resolvedDomain === 'communication' ? [
                { priority: 'LOW', action: 'Schedule radome de-icing maintenance', domain: 'communication', explanation: 'LEO satellite dish tracking accuracy degrades 8% under 3mm ice accumulation. Next window for de-icing: 14:00–16:00 local.' },
                { priority: 'LOW', action: 'Test Inmarsat BGAN backup link functionality', domain: 'communication', explanation: 'Secondary communication link last tested 18 days ago. Monthly test cycle due. Ensures backup systems during primary LEO outage.' },
              ] : resolvedDomain === 'water' ? [
                { priority: 'HIGH', action: 'Increase trace heating on distribution pipe Segment C', domain: 'water', explanation: 'Pipe temp at 3.8°C — 2.2°C above freeze threshold but trending down. Ambient temperature forecast of -32°C tonight places freeze risk at MEDIUM.' },
                { priority: 'MEDIUM', action: 'Run water quality TDS and turbidity analysis', domain: 'water', explanation: 'Scheduled monthly quality assurance test due. Ensures potable standards are maintained before winter isolation period.' },
              ] : resolvedDomain === 'personnel' ? [
                { priority: 'MEDIUM', action: 'Schedule structured recreation activity for winter-over morale', domain: 'personnel', explanation: 'Day 148 of winter isolation. Psychological stress indicators trending up in crew self-reporting. Group activity recommended per NCPOR protocol.' },
                { priority: 'LOW', action: 'Conduct quarterly first-aid refresher training', domain: 'personnel', explanation: 'Medical preparedness training due per station safety protocol. Remote location requires all crew to maintain emergency response certification.' },
              ] : [
                { priority: 'HIGH', action: 'Schedule Generator #1 preventive maintenance', domain: 'equipment', explanation: 'Generator #1 has accumulated 8,420 run-hours. Manufacturer service interval is 8,000 hours. Overdue for oil change, injector inspection, and belt replacement.' },
                { priority: 'MEDIUM', action: 'Reduce HVAC fan speed to lower vibration reading', domain: 'equipment', explanation: 'Vibration sensor shows 2.1 mm/s on HVAC Unit A — above nominal 1.8 mm/s. Fan speed reduction to 85% will reduce reading and extend bearing life.' },
              ]).map((rec, i) => {
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
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Domain: {rec.domain}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopSignal spread(); setExecutedRecs(p => ({ ...p, [i]: true })); }}
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
              })}
            </div>
          )}

          {recsLoading
            ? <div className="glass-panel p-12 rounded-2xl border border-polar-border flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>
            : recommendations.length > 0
              ? recommendations.map((rec: any, i: number) => {
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
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">Domain: {rec.domain} · AI Generated</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopSignal spread(); setExecutedRecs(p => ({ ...p, [i]: true })); }}
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
              : null
          }
        </div>
      )}
    </div>
  );
};

export default DecisionIntelligencePage;
