import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Droplet, Thermometer, Zap, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, RefreshCw, Layers, Activity, Users,
  Waves, CheckCircle2, Play, X, ThermometerSnowflake,
  ShieldAlert, ArrowUpRight, Filter, Sparkles, Wrench, Flame, Brain
} from 'lucide-react';

// ── Animated Water Tank Visual ──────────────────────────────────────────────
const WaterStorageTank: React.FC<{
  pct: number; liters: number; maxL: number; quality: number;
  pipeTemp: number; freezeRisk: string;
}> = ({ pct, liters, maxL, quality, pipeTemp, freezeRisk }) => {
  const clamp = Math.max(0, Math.min(100, pct));
  const riskColor = freezeRisk === 'High' ? '#ef4444' : freezeRisk === 'Medium' ? '#f59e0b' : '#10b981';
  const fillColor = pct < 20 ? '#ef4444' : pct < 40 ? '#f59e0b' : '#38bdf8';
  const w = 160, h = 220, rx = 16;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG Tank */}
      <svg width={w + 60} height={h + 80} viewBox={`0 0 ${w + 60} ${h + 80}`}>
        <defs>
          <linearGradient id="waterFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={`${fillColor}cc`} />
            <stop offset="100%" stopColor={`${fillColor}55`} />
          </linearGradient>
          <linearGradient id="tankBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(8,15,30,0.95)" />
            <stop offset="50%" stopColor="rgba(15,25,50,0.9)" />
            <stop offset="100%" stopColor="rgba(8,15,30,0.95)" />
          </linearGradient>
          <clipPath id="tankClip">
            <rect x={30} y={20} width={w} height={h} rx={rx} />
          </clipPath>
        </defs>

        {/* Tank shell */}
        <rect x={30} y={20} width={w} height={h} rx={rx}
          fill="url(#tankBody)" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />

        {/* Water fill (clipped) */}
        <g clipPath="url(#tankClip)">
          <rect x={30} y={20 + h * (1 - clamp / 100)} width={w} height={h * (clamp / 100)}
            fill="url(#waterFill)" />
          {/* Wave shimmer */}
          {clamp > 5 && (
            <ellipse cx={30 + w / 2} cy={20 + h * (1 - clamp / 100)} rx={w * 0.5} ry={5}
              fill={`${fillColor}88`}>
              <animate attributeName="ry" values="4;7;4" dur="2.5s" repeatCount="indefinite" />
            </ellipse>
          )}
          {/* Bubbles */}
          {clamp > 20 && [0.25, 0.55, 0.75].map((bx, i) => (
            <circle key={i} cx={30 + w * bx} cy={20 + h * (1 - clamp / 100) + 10}
              r={2} fill={`${fillColor}66`}>
              <animate attributeName="cy"
                values={`${20 + h * (1 - clamp / 100) + 10};${20 + h * 0.8 + 10};${20 + h * (1 - clamp / 100) + 10}`}
                dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(t => {
          const y = 20 + h * (1 - t / 100);
          return (
            <g key={t}>
              <line x1={28} y1={y} x2={34} y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              <text x={22} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="monospace">{t}</text>
              <line x1={w + 26} y1={y} x2={w + 30} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            </g>
          );
        })}

        {/* Center text */}
        <text x={30 + w / 2} y={20 + h / 2 - 8} textAnchor="middle"
          fill="white" fontSize={28} fontWeight="900" fontFamily="monospace"
        >{clamp.toFixed(0)}%</text>
        <text x={30 + w / 2} y={20 + h / 2 + 12} textAnchor="middle"
          fill={fillColor} fontSize={12} fontFamily="monospace">
          {(liters / 1000).toFixed(2)}k L
        </text>
        <text x={30 + w / 2} y={20 + h / 2 + 26} textAnchor="middle"
          fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="monospace">
          of {(maxL / 1000).toFixed(0)}k L capacity
        </text>

        {/* Pipe temp indicator */}
        <text x={30 + w + 8} y={20 + h / 2 - 8} fill={riskColor} fontSize={10} fontFamily="monospace">
          {pipeTemp}°C
        </text>
        <text x={30 + w + 8} y={20 + h / 2 + 6} fill={riskColor} fontSize={8} fontFamily="monospace">
          PIPE
        </text>

        {/* Quality badge */}
        <rect x={30 + w / 2 - 36} y={h + 26} width={72} height={22} rx={11}
          fill={quality > 95 ? '#10b98133' : '#f59e0b33'} stroke={quality > 95 ? '#10b981' : '#f59e0b'} strokeWidth={1} />
        <text x={30 + w / 2} y={h + 41} textAnchor="middle"
          fill={quality > 95 ? '#10b981' : '#f59e0b'} fontSize={10} fontFamily="monospace" fontWeight="700">
          WQI: {quality}%
        </text>
      </svg>
    </div>
  );
};

// ── Water Flow Pipeline Visualization ───────────────────────────────────────
const WaterFlowPipeline: React.FC<{
  isMaitri: boolean; pumpStatus: string; flowRate: number;
  treatStatus: string; traceActive: boolean;
}> = ({ isMaitri, pumpStatus, flowRate, treatStatus, traceActive }) => {
  const isRunning = pumpStatus === 'RUNNING';
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold mb-2">
        Live Water Lifecycle Pipeline
      </div>
      {/* Source → Treatment → Storage → Distribution */}
      <div className="flex items-stretch gap-1">
        {[
          { icon: <Waves className="w-5 h-5" />, label: isMaitri ? 'Zub Lake' : 'Quilty Bay', color: '#38bdf8', status: 'SOURCE' },
          { icon: <ArrowRight className="w-4 h-4" />, label: `${flowRate} L/min`, color: '#64748b', status: '' },
          { icon: <Filter className="w-5 h-5" />, label: isMaitri ? 'UV Filter' : 'Seawater Filter Plant Plant', color: '#818cf8', status: treatStatus },
          { icon: <ArrowRight className="w-4 h-4" />, label: 'treated', color: '#64748b', status: '' },
          { icon: <Droplet className="w-5 h-5" />, label: 'Storage', color: '#38bdf8', status: 'TANK' },
          { icon: <ArrowRight className="w-4 h-4" />, label: 'distributed', color: '#64748b', status: '' },
          { icon: <Users className="w-5 h-5" />, label: 'Station', color: '#10b981', status: 'CONSUMPTION' },
        ].map((node, i) => (
          node.status === '' ? (
            <div key={i} className="flex flex-col items-center justify-center text-[9px] font-mono text-slate-500 min-w-[40px]">
              <div className="relative w-full h-3 flex items-center">
                <div className="absolute inset-y-0 w-full bg-sky-500/20 border-t border-b border-sky-500/30 rounded" />
                {isRunning && <div className="absolute h-full w-6 bg-gradient-to-r from-transparent via-sky-400/40 to-transparent rounded"
                  style={{ animation: 'flow 1.5s linear infinite' }} />}
              </div>
              <span className="mt-0.5">{node.label}</span>
            </div>
          ) : (
            <div key={i} className="flex flex-col items-center gap-1 min-w-[64px]">
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center"
                style={{ borderColor: `${node.color}44`, background: `${node.color}11`, color: node.color }}>
                {node.icon}
              </div>
              <div className="text-[9px] font-mono text-center leading-tight" style={{ color: node.color }}>{node.label}</div>
              {node.status && <div className="text-[8px] font-mono text-slate-500 text-center">{node.status}</div>}
            </div>
          )
        ))}
      </div>
      {/* Trace heating bar */}
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-[10px] font-mono ${traceActive ? 'bg-orange-500/10 border-orange-500/40 text-orange-300' : 'bg-polar-dark border-polar-border text-slate-400'}`}>
        <Thermometer className="w-4 h-4" />
        <span>Pipeline Trace Heating: <strong>{traceActive ? 'ACTIVE' : 'STANDBY'}</strong></span>
        {traceActive && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
      </div>
    </div>
  );
};

// ── Consumption Donut EChart ────────────────────────────────────────────────
const ConsumptionDonut: React.FC<{ breakdown: any; total: number }> = ({ breakdown, total }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (p: any) => `${p.name}: <b>${p.value} L/day</b> (${p.percent?.toFixed(1)}%)`,
      },
      legend: {
        orient: 'vertical', right: 8, top: 'middle',
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        icon: 'circle', itemWidth: 8, itemHeight: 8,
      },
      series: [{
        type: 'pie', radius: ['40%', '70%'], center: ['35%', '50%'],
        avoidLabelOverlap: false, label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' } },
        data: [
          { value: Math.round(breakdown.galley_kitchen_l_day || 320), name: 'Galley/Kitchen', itemStyle: { color: '#06b6d4' } },
          { value: Math.round(breakdown.hygiene_showers_l_day || 410), name: 'Hygiene/Showers', itemStyle: { color: '#38bdf8' } },
          { value: Math.round(breakdown.science_labs_l_day || 120), name: 'Science Labs', itemStyle: { color: '#818cf8' } },
          { value: Math.round(breakdown.domestic_habitat_l_day || 350), name: 'Domestic', itemStyle: { color: '#10b981' } },
        ],
      }],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [breakdown, total]);

  return <div ref={ref} className="w-full h-48" />;
};

// ── Water Forecast EChart ───────────────────────────────────────────────────
const WaterForecastChart: React.FC<{
  storageLiters: number; maxStorage: number; dailyConsumption: number; productionRateHr: number;
}> = ({ storageLiters, maxStorage, dailyConsumption, productionRateHr }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const netDaily = (productionRateHr * 24) - dailyConsumption;
    const dates: string[] = [];
    const proj: number[] = [];
    const low: number[] = [];
    const high: number[] = [];
    const now = new Date();

    for (let d = 0; d <= 15; d++) {
      const dt = new Date(now.getTime() + d * 86400000);
      dates.push(dt.toISOString().slice(5, 10));
      const p = Math.min(maxStorage, Math.max(0, Math.round(storageLiters + netDaily * d)));
      proj.push(p);
      const m = Math.round(Math.sqrt(d) * dailyConsumption * 0.1);
      low.push(Math.max(0, p - m));
      high.push(Math.min(maxStorage, p + m));
    }

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 28, bottom: 36, left: 68, right: 20 },
      tooltip: {
        trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (p: any) => {
          const m = p.find((x: any) => x.seriesName === 'Storage');
          if (!m) return '';
          return `<b style="color:#38bdf8">${m.axisValue}</b><br/>Storage: <b>${m.value?.toLocaleString()} L</b>`;
        },
      },
      xAxis: {
        type: 'category', data: dates,
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      yAxis: {
        type: 'value', name: 'Liters',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace', formatter: (v: number) => `${(v / 1000).toFixed(0)}k` },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      series: [
        { name: 'Low', type: 'line', data: low, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(56,189,248,0.06)' }, stack: 'band', symbol: 'none' },
        { name: 'Band', type: 'line', data: high.map((v, i) => v - low[i]), lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(56,189,248,0.10)' }, stack: 'band', symbol: 'none' },
        {
          name: 'Storage', type: 'line', data: proj, smooth: true, symbol: 'none',
          lineStyle: { color: '#38bdf8', width: 2.5 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#38bdf844' }, { offset: 1, color: '#38bdf808' }]) },
          markLine: {
            silent: true, lineStyle: { type: 'dashed', width: 1 },
            data: [
              { yAxis: maxStorage * 0.4, lineStyle: { color: '#f59e0b' }, label: { formatter: '40% Buffer', color: '#f59e0b', fontSize: 9, fontFamily: 'monospace' } },
              { yAxis: maxStorage * 0.2, lineStyle: { color: '#ef4444' }, label: { formatter: '20% Critical', color: '#ef4444', fontSize: 9, fontFamily: 'monospace' } },
            ],
          },
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [storageLiters, maxStorage, dailyConsumption, productionRateHr]);

  return <div ref={ref} className="w-full h-52" />;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const WaterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [waterDetails, setWaterDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'forecast' | 'whatif'>('overview');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [scenarioType, setScenarioType] = useState<string>('pipe_freeze');

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await resourcesApi.getWater(stationId);
        if (mounted && res?.water) setWaterDetails(res.water);
      } catch {}
    };
    load();
    const iv = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [stationId]);

  const snapshot = liveSnapshot[stationId];
  const liveWater = snapshot?.water;

  const storageLiters = liveWater?.storage_liters ?? waterDetails?.storage_liters ?? (isMaitri ? 18500 : 28000);
  const maxStorage = liveWater?.max_storage_liters ?? waterDetails?.max_storage_liters ?? (isMaitri ? 25000 : 35000);
  const fillPct = liveWater?.percentage ?? ((storageLiters / maxStorage) * 100);
  const dailyConsumption = liveWater?.daily_consumption_l ?? waterDetails?.daily_consumption_l ?? (isMaitri ? 1200 : 1650);
  const productionRateHr = liveWater?.production_rate_l_hr ?? waterDetails?.production_rate_l_hr ?? (isMaitri ? 120 : 160);
  const pipeTemp = liveWater?.pipe_temp_c ?? waterDetails?.pipe_temp_c ?? (isMaitri ? 3.8 : 4.5);
  const freezeRisk = liveWater?.freeze_risk ?? waterDetails?.freeze_risk ?? 'Low';
  const traceActive = liveWater?.trace_heating_active ?? true;
  const traceDrawKw = liveWater?.trace_heating_draw_kw ?? (isMaitri ? 4.2 : 5.8);
  const daysBuffer = Math.round(storageLiters / Math.max(10, dailyConsumption));
  const waterQuality = liveWater?.water_quality_index ?? (isMaitri ? 96.5 : 98.2);
  const netDaily = (productionRateHr * 24) - dailyConsumption;

  const consumptionBreakdown = waterDetails?.consumption_breakdown || {
    galley_kitchen_l_day: isMaitri ? 320 : 460,
    hygiene_showers_l_day: isMaitri ? 410 : 620,
    science_labs_l_day: isMaitri ? 120 : 190,
    domestic_habitat_l_day: isMaitri ? 350 : 380,
  };

  const treatmentProcess = isMaitri ? 'Multimedia Filtration + UV' : 'High-Pressure Seawater Filter Plant + Remineralisation';
  const freezeColor = freezeRisk === 'High' ? '#ef4444' : freezeRisk === 'Medium' ? '#f59e0b' : '#10b981';
  const netColor = netDaily >= 0 ? '#10b981' : '#ef4444';

  const handleWhatIf = async () => {
    setWhatIfLoading(true);
    try {
      const res = await scenariosApi.execute(stationId, { type: scenarioType, value: 2 });
      setWhatIfResult(res || {
        scenario_name: scenarioType === 'pipe_freeze' ? 'Pipeline Freeze Event' : 'Pump Failure Simulation',
        impact: { water_days_lost: scenarioType === 'pipe_freeze' ? 3 : 2, risk_delta: 22 },
        recommended_action: scenarioType === 'pipe_freeze'
          ? 'Activate emergency trace heating to max output. Deploy portable heat tape to exposed pipe segments. Reduce consumption to critical-only (hygiene + lab).'
          : 'Switch to backup pump unit immediately. Reduce flow demand by 25%. Schedule emergency maintenance within 24 hours.',
      });
    } catch { setWhatIfResult({ scenario_name: 'Error', recommended_action: 'Simulation API unavailable.' }); }
    finally { setWhatIfLoading(false); }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, #38bdf8 0%, transparent 60%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                <Droplet className="w-3 h-3" /> Water Supply & Pipeline Thermal Integrity
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name} · {isMaitri ? 'Schirmacher Oasis' : 'Larsemann Hills'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Droplet className="w-8 h-8 text-sky-400" /> Water Command Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {isMaitri ? 'Zub Lake sub-glacial intake → UV filtration → pressurized habitat distribution' : 'Quilty Bay seawater Seawater Filter Plant → remineralisation → coastal station loop'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <Layers className="w-4 h-4 text-cyan-400" /> All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=water`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <Brain className="w-4 h-4 text-purple-400" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/water' : '/station/maitri/water')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-sky-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" /> Switch Station
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Storage Level', val: `${fillPct.toFixed(1)}%`, sub: `${(storageLiters / 1000).toFixed(2)}k / ${(maxStorage / 1000).toFixed(0)}k L`, color: fillPct < 20 ? '#ef4444' : fillPct < 40 ? '#f59e0b' : '#38bdf8', icon: <Droplet className="w-4 h-4" /> },
            { label: 'Net Balance', val: `${netDaily >= 0 ? '+' : ''}${netDaily.toFixed(0)} L/day`, sub: `Prod: ${(productionRateHr * 24).toFixed(0)} · Cons: ${dailyConsumption}`, color: netColor, icon: <Activity className="w-4 h-4" /> },
            { label: 'Autonomy Buffer', val: `${daysBuffer} Days`, sub: `At current consumption rate`, color: daysBuffer > 10 ? '#10b981' : daysBuffer > 5 ? '#f59e0b' : '#ef4444', icon: <Clock className="w-4 h-4" /> },
            { label: 'Freeze Risk', val: freezeRisk, sub: `Pipe: ${pipeTemp}°C · Trace: ${traceActive ? 'ON' : 'OFF'}`, color: freezeColor, icon: <ThermometerSnowflake className="w-4 h-4" /> },
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
        {(['overview', 'pipeline', 'forecast', 'whatif'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${activeTab === tab
              ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
              : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'}`}>
            {tab === 'overview' ? '💧 Storage Overview' : tab === 'pipeline' ? '🔧 Pipeline Systems' : tab === 'forecast' ? '📈 15-Day Forecast' : '🧪 What-If Sim'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Tank Visual */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl flex flex-col items-center gap-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold self-start w-full">
              Main Potable Water Storage
            </div>
            <WaterStorageTank
              pct={fillPct} liters={storageLiters} maxL={maxStorage}
              quality={waterQuality} pipeTemp={pipeTemp} freezeRisk={freezeRisk}
            />
            {/* Fill bar */}
            <div className="w-full space-y-1.5">
              <div className="h-2.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${fillPct}%`, background: 'linear-gradient(to right, #38bdf888, #38bdf8)' }} />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>0</span><span>CRITICAL 20%</span><span>BUFFER 40%</span><span>FULL</span>
              </div>
            </div>
          </div>

          {/* Subsystem Status */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Subsystem Status</div>
            {[
              { label: 'Water Source', val: isMaitri ? 'Zub Lake' : 'Quilty Bay Seawater Filter Plant', color: '#38bdf8', ok: true },
              { label: 'Intake Pump', val: 'RUNNING — Healthy', color: '#10b981', ok: true },
              { label: 'Treatment', val: treatmentProcess, color: '#818cf8', ok: true },
              { label: 'TDS', val: `${isMaitri ? '18' : '42'} ppm`, color: '#06b6d4', ok: true },
              { label: 'pH', val: `${isMaitri ? '7.2' : '7.5'}`, color: '#10b981', ok: true },
              { label: 'Water Quality Index', val: `${waterQuality}%`, color: waterQuality > 95 ? '#10b981' : '#f59e0b', ok: waterQuality > 90 },
              { label: 'Trace Heating Draw', val: `${traceDrawKw} kW`, color: '#f97316', ok: true },
              { label: 'Freeze Margin', val: `${(pipeTemp - 0.5).toFixed(1)}°C above freeze`, color: freezeColor, ok: freezeRisk === 'Low' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center text-xs font-mono border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                  {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Consumption Donut */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Daily Consumption Breakdown</div>
            <ConsumptionDonut breakdown={consumptionBreakdown} total={dailyConsumption} />
            <div className="space-y-2 text-xs font-mono pt-2 border-t border-polar-border/40">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Daily Use</span>
                <span className="font-bold text-sky-300">{dailyConsumption.toLocaleString()} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Per Capita</span>
                <span className="font-bold text-slate-300">{Math.round(dailyConsumption / (isMaitri ? 25 : 35))} L/person/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Production Rate</span>
                <span className="font-bold text-emerald-300">{productionRateHr} L/hr ({(productionRateHr * 24).toLocaleString()} L/day)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pipeline Tab ── */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <WaterFlowPipeline
              isMaitri={isMaitri}
              pumpStatus="RUNNING"
              flowRate={isMaitri ? 28.0 : 35.0}
              treatStatus="NOMINAL"
              traceActive={traceActive}
            />
            <div className="space-y-2 pt-3 border-t border-polar-border/40">
              {[
                { label: isMaitri ? 'Intake Source' : 'RO Plant Status', val: isMaitri ? 'Priyadarshini Sub-Glacial Pump' : 'Seawater Filter Plant Booster — NOMINAL', color: '#38bdf8' },
                { label: 'Filtration', val: treatmentProcess, color: '#818cf8' },
                { label: 'Distribution Pressure', val: `${isMaitri ? '2.4' : '3.1'} bar`, color: '#06b6d4' },
                { label: 'Pipe Material', val: isMaitri ? 'Foam-Insulated HDPE 110mm' : 'SS316L Insulated 140mm', color: '#94a3b8' },
                { label: 'Trace Heating', val: `${traceActive ? 'ACTIVE' : 'STANDBY'} — ${traceDrawKw} kW`, color: traceActive ? '#f97316' : '#64748b' },
                { label: 'Freeze Threshold', val: `Pipe: ${pipeTemp}°C (min 0.5°C)`, color: freezeColor },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center text-xs font-mono border-b border-polar-border/20 pb-1.5">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Wastewater Treatment Loop</div>
            {[
              { label: 'Generated', val: `${isMaitri ? '1,080' : '1,485'} L/day`, color: '#64748b' },
              { label: 'Greywater Recycled', val: `${isMaitri ? '360' : '500'} L/day (${isMaitri ? '33' : '34'}%)`, color: '#10b981' },
              { label: 'Blackwater to STP', val: `${isMaitri ? '720' : '985'} L/day`, color: '#818cf8' },
              { label: 'STP Process', val: isMaitri ? 'Aerobic Digestion' : 'MBR Ultrafiltration', color: '#06b6d4' },
              { label: 'Effluent Quality', val: 'Compliant — Madrid Protocol', color: '#10b981' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center text-xs font-mono border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.label}</span>
                <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
              </div>
            ))}

            {/* Thermal integrity indicator */}
            <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: `${freezeColor}44`, background: `${freezeColor}0A` }}>
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-2" style={{ color: freezeColor }}>
                Pipeline Thermal Integrity
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" width="80" height="80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={freezeColor} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32 * Math.min(1, Math.max(0, (pipeTemp - 0) / 10))} ${2 * Math.PI * 32}`}
                      transform="rotate(-90 40 40)" />
                    <text x="40" y="44" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="monospace">
                      {pipeTemp}°
                    </text>
                  </svg>
                </div>
                <div className="text-xs font-mono space-y-1">
                  <div className="text-slate-300">Freeze Risk: <span className="font-bold" style={{ color: freezeColor }}>{freezeRisk}</span></div>
                  <div className="text-slate-400">Margin: {(pipeTemp - 0.5).toFixed(1)}°C above freeze</div>
                  <div className="text-slate-400">Trace heating: <span className="font-bold text-orange-300">{traceActive ? 'ACTIVE' : 'STANDBY'}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Forecast Tab ── */}
      {activeTab === 'forecast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 15-Day Potable Water Storage Trajectory
            </div>
            <WaterForecastChart
              storageLiters={storageLiters} maxStorage={maxStorage}
              dailyConsumption={dailyConsumption} productionRateHr={productionRateHr}
            />
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Autonomy Analysis</div>
            {[
              { label: 'Storage (current)', val: `${(storageLiters / 1000).toFixed(2)}k L`, color: '#38bdf8' },
              { label: 'Daily Consumption', val: `${dailyConsumption} L/day`, color: '#f59e0b' },
              { label: 'Daily Production', val: `${(productionRateHr * 24).toLocaleString()} L/day`, color: '#10b981' },
              { label: 'Net Daily Balance', val: `${netDaily >= 0 ? '+' : ''}${netDaily.toFixed(0)} L/day`, color: netColor },
              { label: 'Autonomy Buffer', val: `${daysBuffer} days`, color: daysBuffer > 10 ? '#10b981' : '#f59e0b' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center text-xs font-mono border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.label}</span>
                <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
              </div>
            ))}
            <div className="pt-2 space-y-2">
              {[
                { zone: 'ADEQUATE', range: '>40%', desc: 'Normal operations.', color: '#10b981' },
                { zone: 'WATCH', range: '20–40%', desc: 'Reduced non-essential use.', color: '#f59e0b' },
                { zone: 'CRITICAL', range: '<20%', desc: 'Emergency rationing protocol.', color: '#ef4444' },
              ].map(z => (
                <div key={z.zone} className="p-2.5 rounded-xl border text-[10px] font-mono"
                  style={{ borderColor: `${z.color}44`, background: `${z.color}0A` }}>
                  <div className="flex justify-between mb-0.5">
                    <span className="font-bold" style={{ color: z.color }}>{z.zone}</span>
                    <span className="text-slate-400">{z.range}</span>
                  </div>
                  <span className="text-slate-500">{z.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── What-If Tab ── */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Water Scenario Simulator
            </div>
            <div className="space-y-3">
              {[
                { key: 'pipe_freeze', label: '🧊 Pipeline Freeze Event', desc: 'Water line freeze in exterior pipe segment' },
                { key: 'pump_failure', label: '⚙️ Intake Pump Failure', desc: 'Primary pump mechanical trip, no inflow' },
                { key: 'contamination', label: '⚠️ Water Quality Alert', desc: 'TDS / bacterial contamination threshold breach' },
              ].map(s => (
                <div key={s.key} onClick={() => setScenarioType(s.key)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${scenarioType === s.key
                    ? 'bg-sky-500/10 border-sky-500/50 text-sky-300'
                    : 'bg-polar-dark/50 border-polar-border text-slate-400 hover:border-white/20'}`}>
                  <div className="text-xs font-mono font-bold">{s.label}</div>
                  <div className="text-[10px] font-mono mt-0.5 opacity-70">{s.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={handleWhatIf} disabled={whatIfLoading}
              className="w-full py-3 rounded-xl text-sm font-mono font-bold bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50">
              {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {whatIfLoading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
            {!whatIfResult ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm font-mono text-center gap-3">
                <Droplet className="w-10 h-10 opacity-20" />
                <p>Select a scenario and run simulation to see impact.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/40">
                  <div className="text-xs font-mono font-bold text-sky-300">{whatIfResult.scenario_name}</div>
                </div>
                {whatIfResult.impact && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-xs font-mono text-slate-400">Water Days Lost</div>
                      <div className="text-lg font-black font-mono text-rose-400 mt-1">−{whatIfResult.impact.water_days_lost}d</div>
                    </div>
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-xs font-mono text-slate-400">Risk Delta</div>
                      <div className="text-lg font-black font-mono text-amber-400 mt-1">+{whatIfResult.impact.risk_delta}pts</div>
                    </div>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-2 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Recommended Action
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

      <style>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};
