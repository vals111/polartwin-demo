import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useLive dataStore } from '../store/live dataStore';
import { equipmentApi, scenariosApi } from '../api/client';
import { EquipmentItem } from '../types';
import * as echarts from 'echarts';
import {
  Wrench, HeartPulse, AlertTriangle, CheckCircle, Clock, Timer,
  Sparkles, Shield, Activity, RefreshCw, Layers, ArrowRight,
  Zap, Droplets, Microscope, Flame, Cpu, Filter,
  Search, Play, X, AlertOctagon, TrendingDown, ThermometerSnowflake,
  Gauge, ShieldAlert, CornerDownRight, Check, Brain
} from 'lucide-react';

// ── Health Score Radial Gauge ────────────────────────────────────────────────
const HealthGauge: React.FC<{
  value: number; size?: number; label?: string; subLabel?: string;
}> = ({ value, size = 130, label = 'Health Score', subLabel }) => {
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * (value / 100);
  const color = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={11} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={-(circ - arcLen) * 0.125}
          transform={`rotate(135 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={11} strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={-(circ - arcLen) * 0.125 + arcLen - filled}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease' }} />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
          fill="white" fontSize={size * 0.18} fontWeight="900" fontFamily="monospace">{value.toFixed(0)}</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle"
          fill={color} fontSize={size * 0.08} fontFamily="monospace">%</text>
      </svg>
      <div className="text-[10px] font-mono text-slate-400 text-center">{label}</div>
      {subLabel && <div className="text-[9px] font-mono text-slate-500 text-center">{subLabel}</div>}
    </div>
  );
};

// ── Weibull Hazard Chart ─────────────────────────────────────────────────────
const WeibullChart: React.FC<{
  shape: number; scale: number; currentHours: number; color?: string;
}> = ({ shape, scale, currentHours, color = '#f59e0b' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const maxT = Math.max(scale * 1.8, currentHours * 1.3);
    const pts = Array.from({ length: 50 }, (_, i) => {
      const t = ((i + 1) / 50) * maxT;
      const h = (shape / scale) * Math.pow(t / scale, shape - 1);
      return [Math.round(t), parseFloat(h.toFixed(5))];
    });
    const markLineHours = Math.min(currentHours, maxT * 0.95);

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, bottom: 26, left: 50, right: 14 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 },
        formatter: (p: any) => `h(${p[0].value[0]}h) = ${p[0].value[1].toFixed(5)}/hr`,
      },
      xAxis: { type: 'value', name: 'Hours', nameTextStyle: { color: '#64748b', fontSize: 9 }, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      yAxis: { type: 'value', name: 'h(t)', nameTextStyle: { color: '#64748b', fontSize: 9 }, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      series: [{
        type: 'line', data: pts, smooth: true, symbol: 'none',
        lineStyle: { color, width: 2 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}44` }, { offset: 1, color: `${color}05` }]) },
        markLine: {
          data: [{ xAxis: markLineHours }],
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
          label: { color: '#ef4444', fontFamily: 'monospace', fontSize: 9, formatter: 'Now' },
          symbol: ['none', 'none'],
        },
      }],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [shape, scale, currentHours, color]);

  return <div ref={ref} style={{ width: '100%', height: 140 }} />;
};

// ── Health Trend EChart ──────────────────────────────────────────────────────
const HealthTrendChart: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#2dd4bf' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const labels = data.map((_, i) => i === data.length - 1 ? 'Now' : `-${(data.length - 1 - i) * 4}h`);

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 12, bottom: 24, left: 40, right: 14 },
      tooltip: {
        trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 },
        formatter: (p: any) => `${p[0].axisValue}: Health ${p[0].data}%`,
      },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
      yAxis: { type: 'value', min: 60, max: 100, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace', formatter: '{value}%' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{
        type: 'line', data, smooth: true, symbol: 'circle', symbolSize: 4,
        lineStyle: { color, width: 2.5 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}40` }, { offset: 1, color: `${color}00` }]) },
        markLine: {
          data: [{ yAxis: 75 }],
          lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
          label: { color: '#f59e0b', fontFamily: 'monospace', fontSize: 9, formatter: 'Maint. Limit' },
          symbol: ['none', 'none'],
        },
      }],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data, color]);

  return <div ref={ref} style={{ width: '100%', height: 140 }} />;
};

// ── Fleet Health Overview EChart ─────────────────────────────────────────────
const FleetHealthChart: React.FC<{ items: any[] }> = ({ items }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !items.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const sorted = [...items].sort((a, b) => a.health_score - b.health_score);

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, bottom: 10, left: 10, right: 60 },
      tooltip: {
        trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (p: any) => `${p[0].name}<br/>Health: <b>${p[0].value}%</b>`,
      },
      xAxis: { type: 'value', max: 100, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace', formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      yAxis: { type: 'category', data: sorted.map(i => i.name.length > 22 ? i.name.slice(0, 22) + '…' : i.name), axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }, axisLine: { show: false } },
      series: [{
        type: 'bar', barMaxWidth: 14,
        data: sorted.map(i => ({
          value: i.health_score,
          itemStyle: {
            color: i.health_score >= 85
              ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#10b98188' }, { offset: 1, color: '#10b981' }])
              : i.health_score >= 70
                ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#f59e0b88' }, { offset: 1, color: '#f59e0b' }])
                : new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#ef444488' }, { offset: 1, color: '#ef4444' }]),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 9, fontFamily: 'monospace', formatter: (p: any) => `${p.value}%` },
        markLine: {
          silent: true, data: [{ xAxis: 75 }],
          lineStyle: { color: '#f59e0b66', type: 'dashed', width: 1 },
          label: { show: false }, symbol: ['none', 'none'],
        },
      }],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [items]);

  return <div ref={ref} style={{ width: '100%', height: Math.max(160, items.length * 28) }} />;
};

// ── Equipment Type Icon ──────────────────────────────────────────────────────
const typeIcon = (type: string) => {
  const map: Record<string, React.ReactElement> = {
    power: <Zap className="w-4 h-4" />,
    utility: <Droplets className="w-4 h-4" />,
    science: <Microscope className="w-4 h-4" />,
    hvac: <ThermometerSnowflake className="w-4 h-4" />,
    comms: <Cpu className="w-4 h-4" />,
    transport: <Gauge className="w-4 h-4" />,
  };
  return map[type] || <Wrench className="w-4 h-4" />;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const EquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useLive dataStore();

  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [predictiveMaint, setPredictiveMaint] = useState<any>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'fleet' | 'detail' | 'predictive' | 'whatif'>('fleet');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [scenarioType, setScenarioType] = useState('generator_failure');

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [data, pm] = await Promise.all([
          equipmentApi.getStationEquipment(stationId),
          equipmentApi.getPredictiveMaintenance(stationId),
        ]);
        if (mounted) {
          if (data?.items?.length > 0) {
            setEquipmentList(data.items);
            if (!selectedAssetId) setSelectedAssetId(data.items[0].id);
          }
          if (pm) setPredictiveMaint(pm);
        }
      } catch {}
    };
    load();
    setWhatIfResult(null);
    return () => { mounted = false; };
  }, [stationId]);

  const snapshot = liveSnapshot[stationId];

  const fallbackItems = isMaitri ? [
    { id: 'gen_m01', name: 'Kirloskar 62.5 kVA Gen #1', type: 'power', health_score: 94.5, health_trend: [96, 95.8, 95.4, 95, 94.8, 94.5], operating_hours: 8420, status: 'operational', load_pct: 68, vibration_mm_s: 2.1, temp_c: 82.5, failure_risk_pct: 3.2, rul_days: 124, weibull_beta: 2.4, weibull_eta: 12500, maintenance_status: 'NOMINAL', next_service_days: 14 },
    { id: 'gen_m02', name: 'Kirloskar 62.5 kVA Gen #2', type: 'power', health_score: 89.2, health_trend: [92, 91.5, 90.8, 90.1, 89.6, 89.2], operating_hours: 7890, status: 'operational', load_pct: 54, vibration_mm_s: 2.8, temp_c: 80.1, failure_risk_pct: 7.8, rul_days: 88, weibull_beta: 2.4, weibull_eta: 12000, maintenance_status: 'DUE_SOON', next_service_days: 28 },
    { id: 'pump_m01', name: 'Lake Water Extraction Pump P-1', type: 'utility', health_score: 87.8, health_trend: [91, 90.2, 89.5, 88.9, 88.2, 87.8], operating_hours: 6120, status: 'operational', load_pct: 42, vibration_mm_s: 3.2, temp_c: 45, failure_risk_pct: 8.4, rul_days: 74, weibull_beta: 2.1, weibull_eta: 9000, maintenance_status: 'DUE_SOON', next_service_days: 21 },
    { id: 'hvac_m01', name: 'Station HVAC Heating Unit A', type: 'hvac', health_score: 91.1, health_trend: [93, 92.5, 92, 91.8, 91.4, 91.1], operating_hours: 12040, status: 'operational', load_pct: 78, vibration_mm_s: 1.8, temp_c: 55, failure_risk_pct: 4.1, rul_days: 150, weibull_beta: 2.2, weibull_eta: 18000, maintenance_status: 'NOMINAL', next_service_days: 45 },
    { id: 'sci_m01', name: 'Weather layer LIDAR System', type: 'science', health_score: 97.2, health_trend: [97.5, 97.4, 97.3, 97.3, 97.2, 97.2], operating_hours: 3240, status: 'operational', load_pct: 35, vibration_mm_s: 0.5, temp_c: 22, failure_risk_pct: 1.2, rul_days: 280, weibull_beta: 3.0, weibull_eta: 20000, maintenance_status: 'NOMINAL', next_service_days: 90 },
  ] : [
    { id: 'gen_b01', name: 'Volvo Penta 100 kVA Gen #1', type: 'power', health_score: 96.8, health_trend: [97.2, 97.1, 97, 96.9, 96.9, 96.8], operating_hours: 5640, status: 'operational', load_pct: 72, vibration_mm_s: 1.9, temp_c: 78.2, failure_risk_pct: 2.1, rul_days: 180, weibull_beta: 2.6, weibull_eta: 14000, maintenance_status: 'NOMINAL', next_service_days: 30 },
    { id: 'chp_b01', name: 'Combined Heat & Power Unit #1', type: 'power', health_score: 93.4, health_trend: [94.5, 94.2, 93.9, 93.7, 93.5, 93.4], operating_hours: 6840, status: 'operational', load_pct: 85, vibration_mm_s: 2.2, temp_c: 91, failure_risk_pct: 4.6, rul_days: 140, weibull_beta: 2.3, weibull_eta: 13000, maintenance_status: 'NOMINAL', next_service_days: 21 },
    { id: 'ro_b01', name: 'Seawater RO Seawater purification Plant', type: 'utility', health_score: 91.2, health_trend: [93, 92.6, 92, 91.8, 91.5, 91.2], operating_hours: 4820, status: 'operational', load_pct: 60, vibration_mm_s: 2.6, temp_c: 38, failure_risk_pct: 5.2, rul_days: 110, weibull_beta: 2.1, weibull_eta: 10000, maintenance_status: 'DUE_SOON', next_service_days: 18 },
    { id: 'hvac_b01', name: 'Bharati Heating Loop Unit A', type: 'hvac', health_score: 94.6, health_trend: [95.2, 95, 94.9, 94.8, 94.7, 94.6], operating_hours: 9200, status: 'operational', load_pct: 65, vibration_mm_s: 1.6, temp_c: 48, failure_risk_pct: 3.8, rul_days: 160, weibull_beta: 2.2, weibull_eta: 16000, maintenance_status: 'NOMINAL', next_service_days: 50 },
    { id: 'radar_b01', name: 'Ice Radar & Satellite VSAT', type: 'comms', health_score: 98.1, health_trend: [98.5, 98.4, 98.3, 98.2, 98.1, 98.1], operating_hours: 2100, status: 'operational', load_pct: 28, vibration_mm_s: 0.3, temp_c: 18, failure_risk_pct: 0.9, rul_days: 350, weibull_beta: 3.5, weibull_eta: 25000, maintenance_status: 'NOMINAL', next_service_days: 120 },
  ];

  const allItems = (snapshot?.equipment?.items?.length > 0 ? snapshot.equipment.items : null) || (equipmentList.length > 0 ? equipmentList : fallbackItems);

  const selectedItem = allItems.find((i: any) => i.id === (selectedAssetId || allItems[0]?.id)) || allItems[0];

  const filteredItems = allItems.filter((i: any) => {
    const matchStatus = statusFilter === 'all' || i.status === statusFilter || i.maintenance_status === statusFilter;
    const matchSearch = searchQuery === '' || i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const avgHealth = allItems.length > 0 ? allItems.reduce((s: number, i: any) => s + i.health_score, 0) / allItems.length : 0;
  const criticalCount = allItems.filter((i: any) => i.health_score < 70 || i.failure_risk_pct > 10).length;
  const dueSoon = allItems.filter((i: any) => i.maintenance_status === 'DUE_SOON' || i.next_service_days <= 30).length;
  const totalHours = allItems.reduce((s: number, i: any) => s + (i.operating_hours || 0), 0);

  const maintColor = (ms: string) => ms === 'NOMINAL' ? '#10b981' : ms === 'DUE_SOON' ? '#f59e0b' : '#ef4444';
  const statusColor = (hs: number) => hs >= 85 ? '#10b981' : hs >= 70 ? '#f59e0b' : '#ef4444';

  const handleWhatIf = async () => {
    setWhatIfLoading(true);
    try {
      const res = await scenariosApi.execute(stationId, { type: scenarioType, value: 1 });
      setWhatIfResult(res || {
        scenario_name: scenarioType === 'generator_failure' ? 'Generator Primary Trip' : 'Pump Critical Failure',
        impact: { health_delta: -18, power_loss_kw: scenarioType === 'generator_failure' ? 62.5 : 0, runtime_impact_hrs: 48 },
        recommended_action: scenarioType === 'generator_failure'
          ? 'Initiate automatic load transfer to Generator #2 and #3. Reduce non-essential loads by 35 kW. Schedule emergency service within 24 hours.'
          : 'Switch to backup pump immediately. Reduce water consumption to critical-only. Alert maintenance team.',
      });
    } catch { setWhatIfResult({ scenario_name: 'Error', recommended_action: 'Simulation unavailable.' }); }
    finally { setWhatIfLoading(false); }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 80%, #2dd4bf 0%, transparent 60%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
                <Wrench className="w-3 h-3" /> Equipment Health & Predictive Maintenance
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name}
              </span>
              {criticalCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> {criticalCount} Critical Asset{criticalCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <HeartPulse className="w-8 h-8 text-teal-400" /> Equipment Command Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {allItems.length} assets · Weibull hazard modeling · Real-time health live data · Predictive maintenance scheduling
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <Layers className="w-4 h-4 text-cyan-400" /> All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=equipment`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <Brain className="w-4 h-4 text-purple-400" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/equipment' : '/station/maitri/equipment')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-teal-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" /> Switch Station
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Avg Fleet Health', val: `${avgHealth.toFixed(1)}%`, sub: `${allItems.length} monitored assets`, color: statusColor(avgHealth), icon: <HeartPulse className="w-4 h-4" /> },
            { label: 'Critical Assets', val: criticalCount.toString(), sub: 'Health < 70% or risk > 10%', color: criticalCount > 0 ? '#ef4444' : '#10b981', icon: <AlertOctagon className="w-4 h-4" /> },
            { label: 'Maintenance Due', val: dueSoon.toString(), sub: 'Service within 30 days', color: dueSoon > 0 ? '#f59e0b' : '#10b981', icon: <Clock className="w-4 h-4" /> },
            { label: 'Total Op Hours', val: `${(totalHours / 1000).toFixed(1)}k`, sub: 'Accumulated fleet runtime', color: '#06b6d4', icon: <Timer className="w-4 h-4" /> },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 flex-wrap">
        {(['fleet', 'detail', 'predictive', 'whatif'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${activeTab === tab
              ? 'bg-teal-500/20 border-teal-500/60 text-teal-300'
              : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'}`}>
            {tab === 'fleet' ? '🏭 Fleet Overview' : tab === 'detail' ? '🔍 Asset Detail' : tab === 'predictive' ? '📊 Predictive Maint.' : '🧪 What-If Sim'}
          </button>
        ))}
      </div>

      {/* ── Fleet Overview Tab ── */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Fleet health bars */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">Fleet Health Dashboard — All Assets</div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search..." className="pl-7 pr-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 w-32" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 focus:outline-none cursor-pointer">
                  <option value="all">All</option>
                  <option value="NOMINAL">Nominal</option>
                  <option value="DUE_SOON">Due Soon</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
            </div>
            <FleetHealthChart items={filteredItems} />
          </div>

          {/* Asset cards list */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3 overflow-y-auto max-h-[480px]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold sticky top-0 bg-polar-dark/80 py-1">
              Click asset to inspect →
            </div>
            {filteredItems.map((item: any) => {
              const mc = maintColor(item.maintenance_status);
              const hc = statusColor(item.health_score);
              const isSelected = item.id === (selectedAssetId || allItems[0]?.id);
              return (
                <div key={item.id} onClick={() => { setSelectedAssetId(item.id); setActiveTab('detail'); }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-teal-500/60 bg-teal-500/5' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
                      style={{ borderColor: `${hc}44`, background: `${hc}11`, color: hc }}>
                      {typeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-bold text-white truncate">{item.name}</div>
                      <div className="text-[9px] font-mono text-slate-500">{item.type} · {item.operating_hours?.toLocaleString()}h</div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold shrink-0"
                      style={{ borderColor: `${mc}44`, background: `${mc}11`, color: mc }}>
                      {item.maintenance_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.health_score}%`, background: `linear-gradient(to right, ${hc}88, ${hc})` }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: hc }}>{item.health_score.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Asset Detail Tab ── */}
      {activeTab === 'detail' && selectedItem && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main gauges */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl flex flex-col items-center gap-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold self-start w-full">
              Asset Intelligence — {selectedItem.name}
            </div>
            {/* Health Gauge */}
            <HealthGauge value={selectedItem.health_score} size={150}
              label="Health Score" subLabel={`${selectedItem.operating_hours?.toLocaleString()}h runtime`} />
            <div className="grid grid-cols-2 gap-3 w-full">
              {[
                { label: 'Load', val: `${selectedItem.load_pct}%`, color: '#06b6d4' },
                { label: 'Vibration', val: `${selectedItem.vibration_mm_s} mm/s`, color: selectedItem.vibration_mm_s > 3 ? '#ef4444' : '#10b981' },
                { label: 'Temperature', val: `${selectedItem.temp_c}°C`, color: selectedItem.temp_c > 90 ? '#ef4444' : '#f59e0b' },
                { label: 'Fail Risk', val: `${selectedItem.failure_risk_pct}%`, color: selectedItem.failure_risk_pct > 10 ? '#ef4444' : selectedItem.failure_risk_pct > 5 ? '#f59e0b' : '#10b981' },
                { label: 'RUL', val: `${selectedItem.rul_days} days`, color: '#10b981' },
                { label: 'Next Service', val: `${selectedItem.next_service_days}d`, color: selectedItem.next_service_days <= 14 ? '#ef4444' : '#f59e0b' },
              ].map(m => (
                <div key={m.label} className="p-2.5 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">{m.label}</div>
                  <div className="text-sm font-black font-mono mt-0.5" style={{ color: m.color }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Health trend */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">24h Health Degradation Trend</div>
            <HealthTrendChart
              data={selectedItem.health_trend || [90, 89, 88.5, 88, 87.5, 87]}
              color={statusColor(selectedItem.health_score)}
            />
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mt-4">Weibull Hazard Function — Failure Probability</div>
            <WeibullChart
              shape={selectedItem.weibull_beta || 2.4}
              scale={selectedItem.weibull_eta || 12500}
              currentHours={selectedItem.operating_hours || 8000}
              color={statusColor(selectedItem.health_score)}
            />
          </div>

          {/* Dependencies + maintenance */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Maintenance Status</div>
            <div className="p-3 rounded-xl border"
              style={{ borderColor: `${maintColor(selectedItem.maintenance_status)}44`, background: `${maintColor(selectedItem.maintenance_status)}0A` }}>
              <div className="text-xs font-mono font-bold" style={{ color: maintColor(selectedItem.maintenance_status) }}>
                {selectedItem.maintenance_status}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">Next service in {selectedItem.next_service_days} days</div>
            </div>

            {/* Asset selector */}
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Switch Asset</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allItems.map((item: any) => (
                <button key={item.id} onClick={() => setSelectedAssetId(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${item.id === selectedItem.id ? 'border-teal-500/50 bg-teal-500/10 text-teal-300' : 'border-polar-border bg-polar-dark/40 text-slate-400 hover:border-white/20 hover:text-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="font-bold shrink-0" style={{ color: statusColor(item.health_score) }}>{item.health_score.toFixed(0)}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Predictive Maintenance Tab ── */}
      {activeTab === 'predictive' && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold glass-panel px-4 py-3 rounded-2xl border border-teal-500/30">
            🔧 Predictive Maintenance Schedule — Weibull-Based Risk Prioritization
          </div>
          {[...allItems].sort((a: any, b: any) => a.rul_days - b.rul_days).map((item: any) => {
            const hc = statusColor(item.health_score);
            const mc = maintColor(item.maintenance_status);
            const urgency = Math.max(0, 100 - (item.rul_days / 360) * 100);
            return (
              <div key={item.id} className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                      style={{ borderColor: `${hc}44`, background: `${hc}11`, color: hc }}>
                      {typeIcon(item.type)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.operating_hours?.toLocaleString()}h total runtime</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded border font-bold shrink-0"
                    style={{ borderColor: `${mc}44`, background: `${mc}11`, color: mc }}>
                    {item.maintenance_status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-3 text-center">
                  {[
                    { label: 'Health', val: `${item.health_score.toFixed(0)}%`, color: hc },
                    { label: 'Fail Risk', val: `${item.failure_risk_pct}%`, color: item.failure_risk_pct > 10 ? '#ef4444' : item.failure_risk_pct > 5 ? '#f59e0b' : '#10b981' },
                    { label: 'RUL', val: `${item.rul_days}d`, color: item.rul_days < 90 ? '#f59e0b' : '#10b981' },
                    { label: 'Next Svc', val: `${item.next_service_days}d`, color: item.next_service_days <= 14 ? '#ef4444' : '#f59e0b' },
                  ].map(m => (
                    <div key={m.label} className="p-2 rounded-xl bg-polar-dark/60 border border-polar-border">
                      <div className="text-[9px] font-mono text-slate-500 uppercase">{m.label}</div>
                      <div className="text-sm font-black font-mono" style={{ color: m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                {/* Urgency bar */}
                <div className="h-2 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${urgency}%`, background: `linear-gradient(to right, ${hc}88, ${hc})` }} />
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-1.5 text-right">Maintenance urgency: {urgency.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── What-If Tab ── */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Equipment Failure Scenario Simulator
            </div>
            <div className="space-y-3">
              {[
                { key: 'generator_failure', label: '⚡ Generator Primary Trip', desc: 'Unplanned diesel generator shutdown' },
                { key: 'pump_failure', label: '💧 Water Pump Failure', desc: 'Intake pump mechanical seizure' },
                { key: 'hvac_failure', label: '🌡️ HVAC Heating Failure', desc: 'Station heating unit breakdown in winter' },
              ].map(s => (
                <div key={s.key} onClick={() => setScenarioType(s.key)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${scenarioType === s.key
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300'
                    : 'bg-polar-dark/50 border-polar-border text-slate-400 hover:border-white/20'}`}>
                  <div className="text-xs font-mono font-bold">{s.label}</div>
                  <div className="text-[10px] font-mono mt-0.5 opacity-70">{s.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={handleWhatIf} disabled={whatIfLoading}
              className="w-full py-3 rounded-xl text-sm font-mono font-bold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50">
              {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {whatIfLoading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
            {!whatIfResult ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm font-mono text-center gap-3">
                <HeartPulse className="w-10 h-10 opacity-20" />
                <p>Select a failure scenario and run simulation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/40">
                  <div className="text-xs font-mono font-bold text-teal-300">{whatIfResult.scenario_name}</div>
                </div>
                {whatIfResult.impact && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-[9px] font-mono text-slate-400">Health Delta</div>
                      <div className="text-lg font-black font-mono text-rose-400 mt-1">{whatIfResult.impact.health_delta}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-[9px] font-mono text-slate-400">Power Loss</div>
                      <div className="text-lg font-black font-mono text-amber-400 mt-1">{whatIfResult.impact.power_loss_kw} kW</div>
                    </div>
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-[9px] font-mono text-slate-400">Impact Hrs</div>
                      <div className="text-lg font-black font-mono text-cyan-400 mt-1">{whatIfResult.impact.runtime_impact_hrs}h</div>
                    </div>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-2 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Recommended Action
                  </div>
                  <p className="text-xs font-mono text-slate-300 leading-relaxed">{whatIfResult.recommended_action}</p>
                </div>
                <button onClick={() => setWhatIfResult(null)}
                  className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <X className="w-3.5 h-3.5" /> Clear Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
