import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Droplet, Thermometer, Zap, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, RefreshCw, Layers, Activity, Users,
  Waves, CheckCircle2, ThermometerSnowflake,
  ShieldAlert, Filter, Sparkles, Brain,
  Gauge, Mountain, Wind, Sun, FlaskConical, Recycle,
  BarChart3, TrendingUp, TrendingDown, Leaf, Globe, Cpu
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// ── Animated Ring Gauge ───────────────────────────────────────────────────────
const RingGauge: React.FC<{
  value: number; max: number; unit: string; label: string;
  color: string; size?: number; warningAt?: number;
}> = ({ value, max, unit, label, color, size = 90, warningAt }) => {
  const pct = clamp((value / max) * 100);
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const warn = warningAt && value >= warningAt;
  const c = warn ? '#ef4444' : color;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={9}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 4px ${c}88)` }}/>
        <text x={size/2} y={size/2 - 5} textAnchor="middle" fill="white" fontSize={size > 80 ? 14 : 11} fontWeight="900" fontFamily="monospace">
          {value}
        </text>
        <text x={size/2} y={size/2 + 10} textAnchor="middle" fill={c} fontSize={9} fontFamily="monospace">
          {unit}
        </text>
      </svg>
      <div className="text-[9px] font-mono text-slate-400 text-center uppercase tracking-wide">{label}</div>
    </div>
  );
};

// ── Horizontal Bar Metric ─────────────────────────────────────────────────────
const BarMetric: React.FC<{
  label: string; value: number; max: number; unit: string; color: string; sublabel?: string;
}> = ({ label, value, max, unit, color, sublabel }) => {
  const pct = clamp((value / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold" style={{ color }}>{value} {unit}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}55` }}/>
      </div>
      {sublabel && <div className="text-[9px] font-mono text-slate-500">{sublabel}</div>}
    </div>
  );
};

// ── Pulse KPI Badge ──────────────────────────────────────────────────────────
const PulseKPI: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: string; pulse?: boolean;
}> = ({ icon, label, value, sub, color, pulse }) => (
  <div className="p-4 rounded-2xl border transition-all hover:scale-[1.02]"
    style={{ borderColor: `${color}33`, background: `${color}08` }}>
    <div className="flex items-start justify-between mb-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      {pulse && <span className="w-2 h-2 rounded-full animate-pulse mt-1" style={{ background: color }}/>}
    </div>
    <div className="text-[10px] font-mono uppercase text-slate-500 mb-0.5">{label}</div>
    <div className="text-xl font-black font-mono" style={{ color }}>{value}</div>
    <div className="text-[10px] font-mono text-slate-500 mt-0.5">{sub}</div>
  </div>
);

// ── Heatmap Grid ─────────────────────────────────────────────────────────────
const HeatmapGrid: React.FC<{
  title: string; rows: string[]; cols: string[];
  data: number[][]; colorScale: [string, string, string];
}> = ({ title, rows, cols, data, colorScale }) => {
  const getColor = (v: number) => {
    if (v < 33) return colorScale[0];
    if (v < 66) return colorScale[1];
    return colorScale[2];
  };
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="text-left text-slate-600 pr-2 pb-1 font-normal">Zone</th>
              {cols.map(c => <th key={c} className="text-slate-500 pb-1 text-center font-normal px-1">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row}>
                <td className="text-slate-400 pr-2 py-0.5 whitespace-nowrap">{row}</td>
                {cols.map((_, ci) => {
                  const v = data[ri]?.[ci] ?? 0;
                  return (
                    <td key={ci} className="py-0.5 px-0.5 text-center">
                      <div className="w-full h-5 rounded text-[8px] flex items-center justify-center font-bold transition-all"
                        style={{ background: `${getColor(v)}22`, color: getColor(v), border: `1px solid ${getColor(v)}44` }}>
                        {v}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Animated Water Tank ───────────────────────────────────────────────────────
const WaterTankSVG: React.FC<{ pct: number; liters: number; maxL: number; quality: number; pipeTemp: number; freezeRisk: string }> = ({
  pct, liters, maxL, quality, pipeTemp, freezeRisk
}) => {
  const c = clamp(pct);
  const riskColor = freezeRisk === 'High' ? '#ef4444' : freezeRisk === 'Medium' ? '#f59e0b' : '#10b981';
  const fillColor = pct < 20 ? '#ef4444' : pct < 40 ? '#f59e0b' : '#38bdf8';
  const w = 160, h = 220, rx = 16;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={w + 60} height={h + 80} viewBox={`0 0 ${w + 60} ${h + 80}`}>
        <defs>
          <linearGradient id="wFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={`${fillColor}cc`}/>
            <stop offset="100%" stopColor={`${fillColor}44`}/>
          </linearGradient>
          <linearGradient id="wBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(8,15,30,0.95)"/>
            <stop offset="50%" stopColor="rgba(15,25,50,0.9)"/>
            <stop offset="100%" stopColor="rgba(8,15,30,0.95)"/>
          </linearGradient>
          <clipPath id="wClip"><rect x={30} y={20} width={w} height={h} rx={rx}/></clipPath>
        </defs>
        <rect x={30} y={20} width={w} height={h} rx={rx} fill="url(#wBody)" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5}/>
        <g clipPath="url(#wClip)">
          <rect x={30} y={20 + h * (1 - c / 100)} width={w} height={h * (c / 100)} fill="url(#wFill)"/>
          {c > 5 && <ellipse cx={30 + w / 2} cy={20 + h * (1 - c / 100)} rx={w * 0.5} ry={5} fill={`${fillColor}88`}>
            <animate attributeName="ry" values="4;7;4" dur="2.5s" repeatCount="indefinite"/>
          </ellipse>}
          {c > 20 && [0.25, 0.55, 0.75].map((bx, i) => (
            <circle key={i} cx={30 + w * bx} cy={20 + h * (1 - c / 100) + 10} r={2} fill={`${fillColor}66`}>
              <animate attributeName="cy"
                values={`${20 + h * (1 - c / 100) + 10};${20 + h * 0.8 + 10};${20 + h * (1 - c / 100) + 10}`}
                dur={`${2 + i * 0.7}s`} repeatCount="indefinite"/>
            </circle>
          ))}
        </g>
        {[0, 25, 50, 75, 100].map(t => {
          const y = 20 + h * (1 - t / 100);
          return (
            <g key={t}>
              <line x1={28} y1={y} x2={34} y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
              <text x={22} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="monospace">{t}</text>
            </g>
          );
        })}
        <text x={30 + w / 2} y={20 + h / 2 - 8} textAnchor="middle" fill="white" fontSize={28} fontWeight="900" fontFamily="monospace">{c.toFixed(0)}%</text>
        <text x={30 + w / 2} y={20 + h / 2 + 12} textAnchor="middle" fill={fillColor} fontSize={12} fontFamily="monospace">{(liters / 1000).toFixed(2)}k L</text>
        <text x={30 + w / 2} y={20 + h / 2 + 26} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="monospace">of {(maxL / 1000).toFixed(0)}k L capacity</text>
        <text x={30 + w + 8} y={20 + h / 2 - 8} fill={riskColor} fontSize={10} fontFamily="monospace">{pipeTemp}°C</text>
        <text x={30 + w + 8} y={20 + h / 2 + 6} fill={riskColor} fontSize={8} fontFamily="monospace">PIPE</text>
        <rect x={30 + w / 2 - 36} y={h + 26} width={72} height={22} rx={11}
          fill={quality > 95 ? '#10b98133' : '#f59e0b33'} stroke={quality > 95 ? '#10b981' : '#f59e0b'} strokeWidth={1}/>
        <text x={30 + w / 2} y={h + 41} textAnchor="middle"
          fill={quality > 95 ? '#10b981' : '#f59e0b'} fontSize={10} fontFamily="monospace" fontWeight="700">
          WQI {quality}%
        </text>
      </svg>
    </div>
  );
};

// ── Consumption Donut EChart ──────────────────────────────────────────────────
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
        type: 'pie', radius: ['38%', '68%'], center: ['35%', '50%'],
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
  return <div ref={ref} className="w-full h-44"/>;
};

// ── Sparkline Timeline Chart ──────────────────────────────────────────────────
const SparklineChart: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 50 }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" height={h}>
      <defs>
        <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}/>
    </svg>
  );
};

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ label: string; ok: boolean; warn?: boolean }> = ({ label, ok, warn }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border"
    style={{
      background: ok ? '#10b98118' : warn ? '#f59e0b18' : '#ef444418',
      borderColor: ok ? '#10b98144' : warn ? '#f59e0b44' : '#ef444444',
      color: ok ? '#10b981' : warn ? '#f59e0b' : '#ef4444',
    }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? '#10b981' : warn ? '#f59e0b' : '#ef4444' }}/>
    {label}
  </span>
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; color: string; layer: string }> = ({
  icon, title, subtitle, color, layer
}) => (
  <div className="flex items-start gap-4 mb-6 pb-4 border-b border-white/10">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
          {layer}
        </span>
      </div>
      <h2 className="text-lg font-black text-white">{title}</h2>
      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

// ── Thermal Gradient Cell ─────────────────────────────────────────────────────
const ThermalCell: React.FC<{ depth: string; temp: number; color: string }> = ({ depth, temp, color }) => (
  <div className="flex items-center gap-2 p-2 rounded-lg border transition-all hover:scale-[1.02]"
    style={{ borderColor: `${color}33`, background: `${color}08` }}>
    <div className="text-[9px] font-mono text-slate-400 w-8">{depth}</div>
    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${clamp(((temp + 5) / 15) * 100)}%`, background: `linear-gradient(to right, ${color}66, ${color})` }}/>
    </div>
    <div className="text-[10px] font-mono font-bold w-10 text-right" style={{ color }}>{temp}°C</div>
  </div>
);

// ── Ice Profiler ─────────────────────────────────────────────────────────────
const IceProfiler: React.FC<{ isMaitri: boolean }> = ({ isMaitri }) => {
  const layers = isMaitri
    ? [
        { label: 'Surface Ice', thick: 1.8, phase: 'Solid', color: '#bfdbfe' },
        { label: 'Slush Zone', thick: 0.4, phase: 'Mixed', color: '#93c5fd' },
        { label: 'Liquid Water', thick: 3.2, phase: 'Liquid', color: '#38bdf8' },
        { label: 'Sub-Lake Sediment', thick: 0.6, phase: 'Sediment', color: '#78716c' },
      ]
    : [
        { label: 'Seawater Surface', thick: 0.0, phase: 'Inlet', color: '#06b6d4' },
        { label: 'Intake Depth', thick: 6.0, phase: 'Marine', color: '#0284c7' },
        { label: 'Halocline', thick: 1.5, phase: 'Transition', color: '#0369a1' },
        { label: 'Deep Water', thick: 4.0, phase: 'Source', color: '#1e3a5f' },
      ];
  const total = layers.reduce((a, b) => a + b.thick, 0.01);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
        {isMaitri ? '3D Ice-to-Liquid Column Profiler' : 'Marine Column Profile'}
      </div>
      <div className="relative w-full rounded-xl overflow-hidden border border-white/10" style={{ height: 160 }}>
        {layers.map((l, i) => (
          <div key={i} className="flex items-center px-3 transition-all"
            style={{
              height: `${(l.thick / total) * 100}%`,
              minHeight: 28,
              background: `${l.color}18`,
              borderBottom: i < layers.length - 1 ? `1px dashed ${l.color}33` : undefined,
            }}>
            <span className="text-[9px] font-mono text-slate-300 flex-1">{l.label}</span>
            <span className="text-[9px] font-mono font-bold" style={{ color: l.color }}>{l.phase}</span>
            <span className="text-[9px] font-mono text-slate-500 ml-2">{l.thick > 0 ? `${l.thick}m` : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Compliance Meter ─────────────────────────────────────────────────────────
const ComplianceMeter: React.FC<{ label: string; value: number; target: number; unit: string; color: string; invert?: boolean }> = ({
  label, value, target, unit, color, invert
}) => {
  const ok = invert ? value <= target : value >= target;
  const pct = invert ? clamp(100 - ((value / (target * 2)) * 100)) : clamp((value / target) * 100);
  return (
    <div className="p-3 rounded-xl border transition-all"
      style={{ borderColor: `${ok ? '#10b981' : '#f59e0b'}33`, background: `${ok ? '#10b981' : '#f59e0b'}07` }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-mono text-slate-400">{label}</span>
        <StatusBadge label={ok ? 'COMPLIANT' : 'MONITOR'} ok={ok} warn={!ok}/>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-xl font-black font-mono" style={{ color }}>{value}</span>
        <span className="text-[10px] font-mono text-slate-400">{unit}</span>
        <span className="text-[9px] font-mono text-slate-600 ml-1">/ target {target}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}88, ${color})` }}/>
      </div>
    </div>
  );
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
  const [activeLayer, setActiveLayer] = useState<'source' | 'production' | 'distribution' | 'sustainability'>('source');

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

  // ── Live telemetry values ──
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

  const treatmentProcess = isMaitri ? 'Multimedia Filtration + UV' : 'High-Pressure RO + Remineralisation';
  const freezeColor = freezeRisk === 'High' ? '#ef4444' : freezeRisk === 'Medium' ? '#f59e0b' : '#10b981';
  const netColor = netDaily >= 0 ? '#10b981' : '#ef4444';
  const fillColor = fillPct < 20 ? '#ef4444' : fillPct < 40 ? '#f59e0b' : '#38bdf8';

  // ── Simulated time-series sparklines ──
  const makeSparkline = (base: number, noise: number, len = 12) =>
    Array.from({ length: len }, (_, i) => base + (Math.sin(i * 0.8) * noise) + (Math.random() * noise * 0.3));

  const storageTrend = makeSparkline(fillPct, 8);
  const flowTrend = makeSparkline(productionRateHr, 15);
  const turbidityTrend = makeSparkline(isMaitri ? 0.4 : 1.2, 0.3);

  const layers = [
    { id: 'source' as const, label: 'Source Monitoring', icon: <Mountain className="w-4 h-4"/>, color: '#38bdf8' },
    { id: 'production' as const, label: 'Production & Treatment', icon: <FlaskConical className="w-4 h-4"/>, color: '#818cf8' },
    { id: 'distribution' as const, label: 'Distribution & Storage', icon: <Droplet className="w-4 h-4"/>, color: '#06b6d4' },
    { id: 'sustainability' as const, label: 'Sustainability & Compliance', icon: <Leaf className="w-4 h-4"/>, color: '#10b981' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 15% 50%, #38bdf808 0%, transparent 60%), radial-gradient(ellipse at 85% 50%, #818cf808 0%, transparent 60%)' }}/>
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                <Droplet className="w-3 h-3"/> Water Supply Command
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name} · {isMaitri ? 'Schirmacher Oasis' : 'Larsemann Hills'}
              </span>
              <StatusBadge label="LIVE" ok={true}/>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Droplet className="w-8 h-8 text-sky-400"/> Water Domain Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {isMaitri
                ? 'Lake Priyadarshini sub-glacial intake → UV filtration → pressurized habitat loop · 4-layer operational coverage'
                : 'Quilty Bay marine inlet → High-pressure RO plant → remineralisation → coastal distribution loop · 4-layer operational coverage'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=water`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4"/> Decision Intel
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Storage Level', val: `${fillPct.toFixed(1)}%`, sub: `${(storageLiters/1000).toFixed(1)}k / ${(maxStorage/1000).toFixed(0)}k L`, color: fillColor, icon: <Droplet className="w-4 h-4"/> },
            { label: 'Net Balance', val: `${netDaily >= 0 ? '+' : ''}${netDaily.toFixed(0)} L/d`, sub: `Prod: ${(productionRateHr*24).toFixed(0)} / Cons: ${dailyConsumption}`, color: netColor, icon: <Activity className="w-4 h-4"/> },
            { label: 'Autonomy Buffer', val: `${daysBuffer} Days`, sub: 'At current consumption', color: daysBuffer > 10 ? '#10b981' : daysBuffer > 5 ? '#f59e0b' : '#ef4444', icon: <Clock className="w-4 h-4"/> },
            { label: 'Freeze Risk', val: freezeRisk, sub: `Pipe: ${pipeTemp}°C · Trace: ${traceActive ? 'ON' : 'OFF'}`, color: freezeColor, icon: <ThermometerSnowflake className="w-4 h-4"/> },
            { label: 'Water Quality', val: `${waterQuality}%`, sub: `TDS: ${isMaitri ? '18' : '42'} ppm · pH ${isMaitri ? '7.2' : '7.5'}`, color: waterQuality > 95 ? '#10b981' : '#f59e0b', icon: <ShieldCheck className="w-4 h-4"/> },
            { label: 'Production Rate', val: `${productionRateHr} L/hr`, sub: `${(productionRateHr * 24).toFixed(0)} L/day capacity`, color: '#818cf8', icon: <Gauge className="w-4 h-4"/> },
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

      {/* ── Layer Navigation ── */}
      <div className="flex gap-2 flex-wrap">
        {layers.map(l => (
          <button key={l.id} onClick={() => setActiveLayer(l.id)}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border cursor-pointer"
            style={activeLayer === l.id
              ? { background: `${l.color}22`, borderColor: `${l.color}66`, color: l.color }
              : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#64748b' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LAYER 1: SOURCE MONITORING
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'source' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<Mountain className="w-6 h-6"/>}
              title={isMaitri ? 'Glacial Lake Dynamics — Lake Priyadarshini' : 'Marine Inlet Monitoring — Quilty Bay'}
              subtitle={isMaitri
                ? 'Sub-glacial freshwater source monitoring: ice column profiling, thermal gradients, and frazil ice detection'
                : 'Seawater inlet quality surveillance: salinity stratification, tidal rhythms, and bio-fouling indices'}
              color="#38bdf8"
              layer="Layer 1 · Source Monitoring"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Ice / Marine Profiler */}
              <div className="space-y-4">
                <IceProfiler isMaitri={isMaitri}/>
                <div className="grid grid-cols-2 gap-2">
                  <RingGauge value={isMaitri ? 3.2 : 6.0} max={10} unit="m" label={isMaitri ? 'Ice Thickness' : 'Inlet Depth'} color="#38bdf8" size={80}/>
                  <RingGauge value={isMaitri ? 0.8 : 3.2} max={5} unit="NTU" label="Turbidity" color="#818cf8" size={80} warningAt={4}/>
                </div>
              </div>

              {/* Thermal Gradient */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {isMaitri ? 'Thermal Gradient Heatmap (Depth Profile)' : 'Seawater Temperature Profile'}
                </div>
                {(isMaitri
                  ? [
                      { depth: '0m', temp: -12 },
                      { depth: '0.5m', temp: -6 },
                      { depth: '1m', temp: -2 },
                      { depth: '2m', temp: 1.5 },
                      { depth: '3m', temp: 2.8 },
                      { depth: '4m', temp: 3.2 },
                    ]
                  : [
                      { depth: '0m', temp: -1.8 },
                      { depth: '2m', temp: 0.5 },
                      { depth: '4m', temp: 2.1 },
                      { depth: '6m', temp: 3.5 },
                      { depth: '8m', temp: 4.2 },
                      { depth: '10m', temp: 4.8 },
                    ]
                ).map((d, i) => (
                  <ThermalCell key={i} depth={d.depth} temp={d.temp}
                    color={d.temp < 0 ? '#ef4444' : d.temp < 2 ? '#f59e0b' : '#38bdf8'}/>
                ))}

                <div className="mt-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/07">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-amber-300 font-bold mb-1">
                    {isMaitri ? 'Frazil Ice Index' : 'Sediment Load Index'}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black font-mono text-amber-300">
                      {isMaitri ? '0.12' : '0.31'}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500/50 to-amber-400"
                          style={{ width: isMaitri ? '12%' : '31%' }}/>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">Index 0–1 (alert at 0.5)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Quality Metrics */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Source Water Quality Analytics
                </div>
                <div className="space-y-2">
                  <BarMetric label={isMaitri ? 'Lake Volume (Est.)' : 'Tidal Volume'} value={isMaitri ? 4200 : 18000} max={isMaitri ? 6000 : 25000} unit="kL" color="#38bdf8"/>
                  <BarMetric label="Dissolved Oxygen" value={isMaitri ? 11.2 : 8.4} max={14} unit="mg/L" color="#06b6d4"/>
                  <BarMetric label={isMaitri ? 'Glacial Melt Rate' : 'Salinity'} value={isMaitri ? 0.8 : 34.2} max={isMaitri ? 3 : 40} unit={isMaitri ? 'L/s' : 'ppt'} color="#818cf8"/>
                  <BarMetric label="pH" value={isMaitri ? 7.2 : 8.1} max={14} unit="" color="#10b981" sublabel="Optimal range 6.5–8.5"/>
                  <BarMetric label="Conductivity" value={isMaitri ? 42 : 52000} max={isMaitri ? 200 : 60000} unit={isMaitri ? 'μS/cm' : 'μS/cm'} color="#f59e0b"/>
                </div>

                <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/07 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300 font-bold">
                    {isMaitri ? 'Sub-Glacial Pump Status' : 'Marine Inlet Gate Status'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Pump A', ok: true, status: 'RUNNING' },
                      { label: 'Pump B', ok: true, status: 'STANDBY' },
                      { label: 'Intake Screen', ok: true, status: 'CLEAR' },
                      { label: isMaitri ? 'Ice Melt Sensor' : 'Tide Sensor', ok: true, status: 'ACTIVE' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-2 rounded-lg border border-white/10 bg-white/3">
                        <span className="text-[9px] font-mono text-slate-400">{item.label}</span>
                        <StatusBadge label={item.status} ok={item.ok}/>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Turbidity Sparkline */}
                <div className="p-3 rounded-xl border border-polar-border bg-polar-dark/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono uppercase text-slate-500">Turbidity Trend (12h)</span>
                    <span className="text-[10px] font-mono text-sky-300 font-bold">{isMaitri ? '0.4' : '1.2'} NTU</span>
                  </div>
                  <SparklineChart data={turbidityTrend} color="#38bdf8" height={40}/>
                </div>
              </div>
            </div>

            {/* Source Heatmap */}
            <div className="mt-5 pt-5 border-t border-polar-border/40">
              <HeatmapGrid
                title={isMaitri ? 'Ice Sheet Monitoring Grid — Schirmacher Oasis' : 'Inlet Zone Quality Matrix — Quilty Bay Sectors'}
                rows={isMaitri ? ['North Basin', 'Central Dome', 'South Margin', 'Sub-Glacial'] : ['Zone A (Shallow)', 'Zone B (Mid)', 'Zone C (Deep)', 'Zone D (Far)']}
                cols={['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']}
                data={[
                  [12, 14, 22, 38, 42, 28],
                  [8, 9, 18, 32, 35, 22],
                  [5, 6, 12, 28, 31, 18],
                  [2, 2, 4, 8, 10, 6],
                ]}
                colorScale={['#38bdf8', '#f59e0b', '#ef4444']}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LAYER 2: PRODUCTION & TREATMENT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'production' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<FlaskConical className="w-6 h-6"/>}
              title={isMaitri ? 'UV Filtration & Treatment — Maitri Plant' : 'High-Pressure RO Seawater Filter Plant — Bharati'}
              subtitle={isMaitri
                ? 'Multimedia filtration → UV disinfection → quality assurance → distribution pressurization'
                : 'Pre-filtration → high-pressure membrane RO → remineralisation → pH correction → quality gate'}
              color="#818cf8"
              layer="Layer 2 · Production & Treatment"
            />

            {/* Flow Pipeline Visual */}
            <div className="relative mb-6 p-4 rounded-2xl border border-white/10 bg-white/3 overflow-x-auto">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Live Treatment Process Flow</div>
              <div className="flex items-stretch gap-1 min-w-max">
                {(isMaitri
                  ? [
                      { icon: <Waves className="w-5 h-5"/>, label: 'Lake Intake', status: 'SOURCE', color: '#38bdf8' },
                      { arrow: true, label: `${isMaitri ? 28 : 35} L/min`, flow: true },
                      { icon: <Filter className="w-5 h-5"/>, label: 'Sand Filter', status: 'RUNNING', color: '#06b6d4' },
                      { arrow: true, label: 'prefilt', flow: true },
                      { icon: <Filter className="w-5 h-5"/>, label: 'UV Chamber', status: 'ACTIVE', color: '#818cf8' },
                      { arrow: true, label: 'treated', flow: true },
                      { icon: <ShieldCheck className="w-5 h-5"/>, label: 'QA Gate', status: 'PASS', color: '#10b981' },
                      { arrow: true, label: 'dist.', flow: true },
                      { icon: <Droplet className="w-5 h-5"/>, label: 'Storage', status: `${fillPct.toFixed(0)}%`, color: '#38bdf8' },
                    ]
                  : [
                      { icon: <Waves className="w-5 h-5"/>, label: 'Marine Inlet', status: 'SOURCE', color: '#06b6d4' },
                      { arrow: true, label: '45 L/min', flow: true },
                      { icon: <Filter className="w-5 h-5"/>, label: 'Pre-Filter', status: 'RUNNING', color: '#38bdf8' },
                      { arrow: true, label: 'prefilt', flow: true },
                      { icon: <Cpu className="w-5 h-5"/>, label: 'RO Memb.', status: 'NOMINAL', color: '#818cf8' },
                      { arrow: true, label: 're-min', flow: true },
                      { icon: <FlaskConical className="w-5 h-5"/>, label: 'Remineralise', status: 'ACTIVE', color: '#f59e0b' },
                      { arrow: true, label: 'dist.', flow: true },
                      { icon: <Droplet className="w-5 h-5"/>, label: 'Storage', status: `${fillPct.toFixed(0)}%`, color: '#38bdf8' },
                    ]
                ).map((node: any, i: number) =>
                  node.arrow ? (
                    <div key={i} className="flex flex-col items-center justify-center min-w-[44px]">
                      <div className="relative h-3 w-full flex items-center">
                        <div className="absolute inset-y-0 w-full bg-sky-500/15 border-t border-b border-sky-500/25 rounded"/>
                        {node.flow && <div className="absolute h-full w-8 bg-gradient-to-r from-transparent via-sky-400/35 to-transparent rounded" style={{ animation: 'flow 1.5s linear infinite' }}/>}
                      </div>
                      <span className="text-[8px] font-mono text-slate-600 mt-0.5">{node.label}</span>
                    </div>
                  ) : (
                    <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                      <div className="w-12 h-12 rounded-xl border flex items-center justify-center transition-all hover:scale-110"
                        style={{ borderColor: `${node.color}44`, background: `${node.color}15`, color: node.color }}>
                        {node.icon}
                      </div>
                      <div className="text-[9px] font-mono text-center leading-tight" style={{ color: node.color }}>{node.label}</div>
                      <div className="text-[8px] font-mono text-slate-500 text-center">{node.status}</div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Treatment Metrics */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Treatment Performance</div>
                <div className="space-y-2.5">
                  <BarMetric label="Production Rate" value={productionRateHr} max={isMaitri ? 180 : 250} unit="L/hr" color="#818cf8"/>
                  <BarMetric label="Treatment Efficiency" value={isMaitri ? 94 : 97} max={100} unit="%" color="#10b981"/>
                  <BarMetric label={isMaitri ? 'UV Dose' : 'Membrane Pressure'} value={isMaitri ? 40 : 62} max={isMaitri ? 60 : 80} unit={isMaitri ? 'mJ/cm²' : 'bar'} color="#818cf8"/>
                  <BarMetric label="Post-Treatment TDS" value={isMaitri ? 18 : 42} max={isMaitri ? 50 : 100} unit="ppm" color="#06b6d4" sublabel="Limit: 500 ppm (WHO)"/>
                  {!isMaitri && <BarMetric label="Salt Rejection Rate" value={99.4} max={100} unit="%" color="#10b981" sublabel="RO membrane performance"/>}
                </div>
              </div>

              {/* Chemical Dosing */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {isMaitri ? 'Dosing & Disinfection' : 'Chemical Dosing System'}
                </div>
                {(isMaitri
                  ? [
                      { label: 'UV Lamp Status', val: 'ACTIVE', ok: true, sub: '98% intensity' },
                      { label: 'Chlorination', val: 'AUTO', ok: true, sub: '0.2 mg/L residual' },
                      { label: 'Coagulant Dose', val: '2.5 mg/L', ok: true, sub: 'Aluminium Sulphate' },
                      { label: 'pH Correction', val: 'NaOH 0.8 mg/L', ok: true, sub: 'pH 7.2 target' },
                    ]
                  : [
                      { label: 'Antiscalant Dose', val: '3.0 mg/L', ok: true, sub: 'Membrane protection' },
                      { label: 'CaCO₃ Re-min', val: '45 mg/L', ok: true, sub: 'Hardness correction' },
                      { label: 'CO₂ Dosing', val: '12 mg/L', ok: true, sub: 'pH 7.5 adjustment' },
                      { label: 'UV Polishing', val: 'ACTIVE', ok: true, sub: '40 mJ/cm² post-RO' },
                    ]
                ).map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/3 hover:border-white/20 transition-all">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">{item.label}</div>
                      <div className="text-[9px] font-mono text-slate-600 mt-0.5">{item.sub}</div>
                    </div>
                    <StatusBadge label={item.val} ok={item.ok}/>
                  </div>
                ))}
              </div>

              {/* Production Ring Gauges */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Live Production Metrics</div>
                <div className="grid grid-cols-2 gap-4">
                  <RingGauge value={productionRateHr} max={isMaitri ? 180 : 250} unit="L/hr" label="Production" color="#818cf8"/>
                  <RingGauge value={waterQuality} max={100} unit="WQI%" label="Water Quality" color="#10b981" warningAt={90}/>
                  <RingGauge value={isMaitri ? 40 : 62} max={isMaitri ? 60 : 80} unit={isMaitri ? 'mJ/cm²' : 'bar'} label={isMaitri ? 'UV Dose' : 'RO Press.'} color="#818cf8"/>
                  <RingGauge value={traceDrawKw} max={10} unit="kW" label="Trace Heat" color="#f97316"/>
                </div>
                <div className="p-3 rounded-xl border border-polar-border bg-polar-dark/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono uppercase text-slate-500">Production Trend (12h)</span>
                    <span className="text-[10px] font-mono text-purple-300 font-bold">{productionRateHr} L/hr</span>
                  </div>
                  <SparklineChart data={flowTrend} color="#818cf8" height={40}/>
                </div>
              </div>
            </div>

            {/* Treatment Quality Matrix */}
            <div className="mt-5 pt-5 border-t border-polar-border/40">
              <HeatmapGrid
                title="Treatment Process Quality Matrix (Last 6 Hours)"
                rows={isMaitri ? ['Sand Filtration', 'UV Disinfection', 'Chemical Dosing', 'QA Sensor Gate'] : ['Pre-Filtration', 'RO Membrane', 'Remineralisation', 'QA Sensor Gate']}
                cols={['T-6h', 'T-5h', 'T-4h', 'T-3h', 'T-2h', 'T-1h']}
                data={[
                  [95, 96, 97, 95, 98, 97],
                  [99, 98, 99, 99, 98, 99],
                  [94, 95, 93, 96, 95, 94],
                  [100, 100, 99, 100, 100, 100],
                ]}
                colorScale={['#ef4444', '#f59e0b', '#10b981']}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LAYER 3: DISTRIBUTION & STORAGE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'distribution' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<Droplet className="w-6 h-6"/>}
              title="Distribution Network & Storage Inventory"
              subtitle="Pressurized distribution loop monitoring, tank inventory management, consumption ledgers, and wastewater treatment loop"
              color="#06b6d4"
              layer="Layer 3 · Distribution & Storage"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Animated Tank */}
              <div className="glass-panel p-5 rounded-2xl border border-sky-500/20 shadow-xl flex flex-col items-center gap-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold self-start w-full">
                  Main Potable Storage Tank
                </div>
                <WaterTankSVG pct={fillPct} liters={storageLiters} maxL={maxStorage}
                  quality={waterQuality} pipeTemp={pipeTemp} freezeRisk={freezeRisk}/>
                <div className="w-full space-y-1.5">
                  <div className="h-2.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${fillPct}%`, background: `linear-gradient(to right, ${fillColor}88, ${fillColor})` }}/>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>EMPTY</span><span className="text-red-400">CRITICAL 20%</span><span className="text-amber-400">BUFFER 40%</span><span>FULL</span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg border border-sky-500/20 bg-sky-500/07 text-center">
                    <div className="text-[9px] font-mono text-slate-500">Net Balance</div>
                    <div className="text-sm font-black font-mono" style={{ color: netColor }}>{netDaily >= 0 ? '+' : ''}{netDaily.toFixed(0)} L/d</div>
                  </div>
                  <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/07 text-center">
                    <div className="text-[9px] font-mono text-slate-500">Autonomy</div>
                    <div className="text-sm font-black font-mono text-emerald-300">{daysBuffer} Days</div>
                  </div>
                </div>
              </div>

              {/* Consumption Breakdown */}
              <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Consumption Ledger Breakdown
                </div>
                <ConsumptionDonut breakdown={consumptionBreakdown} total={dailyConsumption}/>
                <div className="space-y-2 pt-2 border-t border-polar-border/40">
                  {[
                    { label: 'Galley / Kitchen', val: consumptionBreakdown.galley_kitchen_l_day, color: '#06b6d4' },
                    { label: 'Hygiene / Showers', val: consumptionBreakdown.hygiene_showers_l_day, color: '#38bdf8' },
                    { label: 'Science Labs', val: consumptionBreakdown.science_labs_l_day, color: '#818cf8' },
                    { label: 'Domestic / Habitat', val: consumptionBreakdown.domestic_habitat_l_day, color: '#10b981' },
                  ].map(r => (
                    <BarMetric key={r.label} label={r.label} value={r.val} max={dailyConsumption} unit="L/d" color={r.color}/>
                  ))}
                  <div className="flex justify-between text-xs font-mono pt-1 border-t border-polar-border/30">
                    <span className="text-slate-400">Total Daily</span>
                    <span className="font-bold text-sky-300">{dailyConsumption.toLocaleString()} L/day</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Per Capita</span>
                    <span className="font-bold text-slate-300">{Math.round(dailyConsumption / (isMaitri ? 25 : 35))} L/person/day</span>
                  </div>
                </div>
              </div>

              {/* Distribution Metrics */}
              <div className="space-y-4">
                <div className="glass-panel p-4 rounded-2xl border border-polar-border shadow-xl space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Distribution Network</div>
                  {[
                    { label: 'Distribution Pressure', val: `${isMaitri ? '2.4' : '3.1'} bar`, color: '#06b6d4', ok: true },
                    { label: 'Pipe Material', val: isMaitri ? 'HDPE 110mm Foam-Insulated' : 'SS316L Insulated 140mm', color: '#94a3b8', ok: true },
                    { label: 'Loop Length', val: isMaitri ? '420 m' : '680 m', color: '#64748b', ok: true },
                    { label: 'Flow Velocity', val: `${isMaitri ? '0.8' : '1.1'} m/s`, color: '#38bdf8', ok: true },
                    { label: 'Head Loss', val: `${isMaitri ? '1.2' : '1.8'} m/100m`, color: '#f59e0b', ok: true },
                    { label: 'Leakage Detection', val: 'NONE DETECTED', color: '#10b981', ok: true },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center text-xs font-mono border-b border-polar-border/20 pb-1.5">
                      <span className="text-slate-400">{r.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                        {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400"/> : <AlertTriangle className="w-3 h-3 text-amber-400"/>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pipe Thermal Integrity */}
                <div className="p-4 rounded-2xl border transition-all" style={{ borderColor: `${freezeColor}44`, background: `${freezeColor}0A` }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-3" style={{ color: freezeColor }}>
                    Pipeline Thermal Integrity
                  </div>
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 80 80" width="76" height="76">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke={freezeColor} strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 32 * Math.min(1, Math.max(0, (pipeTemp - 0) / 10))} ${2 * Math.PI * 32}`}
                        transform="rotate(-90 40 40)" style={{ filter: `drop-shadow(0 0 4px ${freezeColor}88)` }}/>
                      <text x="40" y="44" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="monospace">{pipeTemp}°</text>
                    </svg>
                    <div className="text-xs font-mono space-y-1.5">
                      <div>Freeze Risk: <span className="font-bold" style={{ color: freezeColor }}>{freezeRisk}</span></div>
                      <div className="text-slate-400">Margin: {(pipeTemp - 0.5).toFixed(1)}°C above freeze</div>
                      <div className="text-slate-400">Trace: <span className="font-bold text-orange-300">{traceActive ? `ACTIVE · ${traceDrawKw}kW` : 'STANDBY'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wastewater Section */}
            <div className="mt-6 pt-5 border-t border-polar-border/40">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4 flex items-center gap-2">
                <Recycle className="w-4 h-4 text-emerald-400"/> Wastewater Treatment Loop — Closed-Circuit Recovery
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Wastewater Generated', val: `${isMaitri ? '1,080' : '1,485'} L/day`, color: '#64748b', icon: <Droplet className="w-4 h-4"/>, sub: '90% of daily intake' },
                  { label: 'Greywater Recycled', val: `${isMaitri ? '360' : '500'} L/day`, color: '#10b981', icon: <Recycle className="w-4 h-4"/>, sub: `${isMaitri ? '33' : '34'}% recovery rate` },
                  { label: 'Blackwater to STP', val: `${isMaitri ? '720' : '985'} L/day`, color: '#818cf8', icon: <Filter className="w-4 h-4"/>, sub: isMaitri ? 'Aerobic Digestion' : 'MBR Ultrafiltration' },
                  { label: 'Effluent Compliance', val: 'Madrid Protocol', color: '#10b981', icon: <ShieldCheck className="w-4 h-4"/>, sub: 'Annex III compliant' },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-2xl border transition-all hover:scale-[1.02]"
                    style={{ borderColor: `${item.color}33`, background: `${item.color}08` }}>
                    <div className="flex items-center gap-2 mb-2" style={{ color: item.color }}>
                      {item.icon}
                      <span className="text-[9px] font-mono uppercase text-slate-500">{item.label}</span>
                    </div>
                    <div className="text-lg font-black font-mono" style={{ color: item.color }}>{item.val}</div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage Trend */}
            <div className="mt-4 p-4 rounded-2xl border border-polar-border bg-polar-dark/40">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Storage Level Trend (12h)</span>
                <span className="text-[10px] font-mono text-sky-300 font-bold">{fillPct.toFixed(1)}% current</span>
              </div>
              <SparklineChart data={storageTrend} color="#38bdf8" height={50}/>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LAYER 4: SUSTAINABILITY & COMPLIANCE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'sustainability' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<Leaf className="w-6 h-6"/>}
              title="Sustainability, Compliance & Environmental Stewardship"
              subtitle="Madrid Protocol adherence, water audit tracking, energy efficiency of water systems, and conservation indices"
              color="#10b981"
              layer="Layer 4 · Sustainability & Compliance"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              {/* Compliance Meters */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Regulatory Compliance Gauges</div>
                <ComplianceMeter label="Water Quality Index (WQI)" value={waterQuality} target={95} unit="%" color="#10b981"/>
                <ComplianceMeter label="Effluent BOD Level" value={isMaitri ? 12 : 8} target={20} unit="mg/L" color="#38bdf8" invert/>
                <ComplianceMeter label="Turbidity (Treated)" value={isMaitri ? 0.1 : 0.08} target={1} unit="NTU" color="#818cf8" invert/>
                <ComplianceMeter label="Residual Chlorine" value={isMaitri ? 0.2 : 0.18} target={0.2} unit="mg/L" color="#10b981"/>
                <ComplianceMeter label="Coliform Count" value={0} target={0} unit="CFU/100mL" color="#10b981"/>
              </div>

              {/* Energy & Carbon */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Energy Intensity & Carbon Footprint</div>
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/07 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400"/>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Water System Energy</span>
                  </div>
                  {[
                    { label: 'Pumping Energy', val: isMaitri ? 2.8 : 4.2, unit: 'kW', color: '#f59e0b' },
                    { label: 'UV / RO Plant', val: isMaitri ? 1.4 : 6.8, unit: 'kW', color: '#818cf8' },
                    { label: 'Trace Heating', val: traceDrawKw, unit: 'kW', color: '#f97316' },
                    { label: 'STP (Wastewater)', val: isMaitri ? 0.6 : 0.9, unit: 'kW', color: '#10b981' },
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="font-bold" style={{ color: item.color }}>{item.val} {item.unit}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(item.val / 10) * 100}%`, background: item.color }}/>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-emerald-500/20 flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Total Water System Draw</span>
                    <span className="font-bold text-yellow-300">{isMaitri ? '9.0' : '18.7'} kW</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/07 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-sky-400"/>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Environmental Indices</span>
                  </div>
                  {[
                    { label: 'Water Recycling Rate', val: `${isMaitri ? '33' : '34'}%`, color: '#10b981' },
                    { label: 'Energy per kL produced', val: `${isMaitri ? '4.8' : '7.2'} kWh/kL`, color: '#f59e0b' },
                    { label: 'Water Efficiency Score', val: isMaitri ? '82 / 100' : '78 / 100', color: '#818cf8' },
                    { label: 'Carbon Equiv. (Water)', val: `${isMaitri ? '0.42' : '0.81'} kg CO₂/kL`, color: '#94a3b8' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between text-xs font-mono border-b border-white/5 pb-1.5">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-bold" style={{ color: item.color }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Water Audit & Conservation */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Water Audit & Conservation Ledger</div>

                <div className="grid grid-cols-2 gap-2">
                  <PulseKPI icon={<TrendingDown className="w-4 h-4"/>} label="7-Day Consumption Δ" value="-3.2%" sub="Improving trend" color="#10b981" pulse/>
                  <PulseKPI icon={<TrendingUp className="w-4 h-4"/>} label="Recovery Rate Δ" value="+1.8%" sub="vs last month" color="#06b6d4"/>
                  <PulseKPI icon={<BarChart3 className="w-4 h-4"/>} label="Audit Score" value="A+" sub="Madrid Protocol" color="#818cf8"/>
                  <PulseKPI icon={<ShieldAlert className="w-4 h-4"/>} label="Protocol Alerts" value="0" sub="All clear" color="#10b981" pulse/>
                </div>

                <div className="p-4 rounded-2xl border border-white/10 bg-white/3 space-y-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-2">Madrid Protocol Checklist</div>
                  {[
                    { item: 'Annex III — Wastewater discharge limits', ok: true },
                    { item: 'No untreated sewage discharge', ok: true },
                    { item: 'Greywater recycling active', ok: true },
                    { item: 'Effluent BOD < 20 mg/L', ok: true },
                    { item: 'Coliform-free discharge', ok: true },
                    { item: 'Monthly water audit filed', ok: true },
                  ].map(row => (
                    <div key={row.item} className="flex items-center gap-2 text-[10px] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400"/>
                      <span className="text-slate-400">{row.item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sustainability Heatmap */}
            <div className="mt-2">
              <HeatmapGrid
                title="Sustainability KPI Grid — 7-Day Rolling Window"
                rows={['Water Quality', 'Energy Efficiency', 'Recycling Rate', 'Protocol Compliance']}
                cols={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                data={[
                  [97, 96, 98, 97, 96, 98, waterQuality],
                  [82, 80, 83, 85, 84, 83, 82],
                  [33, 34, 33, 35, 33, 34, 33],
                  [100, 100, 100, 100, 100, 100, 100],
                ]}
                colorScale={['#ef4444', '#f59e0b', '#10b981']}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Decision Intelligence Entry (always visible at bottom) ── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-l from-purple-500/10 via-sky-500/05 to-transparent pointer-events-none"/>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-polar-border/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                <Brain className="w-3 h-3"/> Decision Intelligence Suite
              </span>
              <span className="text-[10px] font-mono text-slate-400">Water Supply & Autonomy Analytics</span>
            </div>
            <h3 className="text-lg font-black text-white mt-1">Water Domain Predictive Analytics & Scenario Sandbox</h3>
          </div>
          <button onClick={() => navigate(`/station/${stationId}/decision?domain=water`)}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer self-start md:self-auto">
            Launch Decision Intelligence <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              tab: 'forecast', icon: <Activity className="w-5 h-5"/>, badge: '15-DAY MODEL', color: '#38bdf8',
              title: '15-Day Storage Trajectory Forecast',
              desc: 'Holt-Winters time-series forecast with confidence intervals, predicting 360-hour storage runway, daily draw profiles, and autonomy buffer.',
              cta: 'Open 15-Day Forecast'
            },
            {
              tab: 'whatif', icon: <Sparkles className="w-5 h-5"/>, badge: 'CLONED SANDBOX', color: '#06b6d4',
              title: 'What-If Water Failure Simulator',
              desc: 'Stress-test failure scenarios: pipeline freeze at −30°C, intake pump seizure, quality contamination breach, or hidden fissure leaks.',
              cta: 'Open What-If Simulation'
            },
            {
              tab: 'recommendations', icon: <Brain className="w-5 h-5"/>, badge: 'AI COPILOT', color: '#818cf8',
              title: 'Threat Mitigations & Recommendations',
              desc: 'Automated operator protocol recommendations for trace heating thermostat modulation, water quality assurance, and Madrid Protocol wastewater discharge.',
              cta: 'View Recommendations'
            },
          ].map(card => (
            <div key={card.tab}
              onClick={() => navigate(`/station/${stationId}/decision?domain=water&tab=${card.tab}`)}
              className="p-5 rounded-xl border border-polar-border bg-polar-dark/60 hover:bg-polar-dark transition-all cursor-pointer group flex flex-col justify-between"
              style={{ '--hover-border': `${card.color}66` } as any}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${card.color}55`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ background: `${card.color}15`, border: `1px solid ${card.color}44`, color: card.color }}>
                    {card.icon}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold"
                    style={{ background: `${card.color}18`, color: card.color, border: `1px solid ${card.color}44` }}>
                    {card.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:transition-colors" style={{ color: undefined }}>
                  {card.title}
                </h4>
                <p className="text-xs font-mono text-slate-400 mt-2 leading-relaxed">{card.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-polar-border/30 flex items-center justify-between text-xs font-mono group-hover:translate-x-1 transition-transform"
                style={{ color: card.color }}>
                <span>{card.cta}</span>
                <ArrowRight className="w-4 h-4"/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};
