import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { equipmentApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Wrench, HeartPulse, AlertTriangle, CheckCircle, Clock, Timer,
  Sparkles, Shield, Activity, RefreshCw, Layers, ArrowRight,
  Zap, Droplets, Microscope, Flame, Cpu, Filter,
  Search, Play, X, AlertOctagon, TrendingDown, ThermometerSnowflake,
  Gauge, ShieldAlert, CornerDownRight, Check, Brain,
  Truck, MapPin, Fuel, Radio, Wind, Snowflake,
  FlaskConical, Wifi, Battery, BarChart3, Thermometer,
  Navigation, AlertCircle, CheckCircle2, Settings
} from 'lucide-react';

// ── Shared Helpers ────────────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// ── Health Score Radial Gauge ─────────────────────────────────────────────────
const HealthGauge: React.FC<{ value: number; size?: number; label?: string; subLabel?: string }> = ({
  value, size = 130, label = 'Health Score', subLabel
}) => {
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * (value / 100);
  const color = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={11}
          strokeLinecap="round" strokeDasharray={`${arcLen} ${circ-arcLen}`}
          strokeDashoffset={-(circ-arcLen)*0.125} transform={`rotate(135 ${size/2} ${size/2})`}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={11}
          strokeLinecap="round" strokeDasharray={`${filled} ${circ-filled}`}
          strokeDashoffset={-(circ-arcLen)*0.125+arcLen-filled} transform={`rotate(135 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 4px ${color}88)` }}/>
        <text x={size/2} y={size/2-4} textAnchor="middle" fill="white" fontSize={size*0.18} fontWeight="900" fontFamily="monospace">{value.toFixed(0)}</text>
        <text x={size/2} y={size/2+12} textAnchor="middle" fill={color} fontSize={size*0.08} fontFamily="monospace">%</text>
      </svg>
      <div className="text-[10px] font-mono text-slate-400 text-center">{label}</div>
      {subLabel && <div className="text-[9px] font-mono text-slate-500 text-center">{subLabel}</div>}
    </div>
  );
};

// ── Weibull Hazard Chart ──────────────────────────────────────────────────────
const WeibullChart: React.FC<{ shape: number; scale: number; currentHours: number; color?: string }> = ({
  shape, scale, currentHours, color = '#f59e0b'
}) => {
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
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, bottom: 26, left: 50, right: 14 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 }, formatter: (p: any) => `h(${p[0].value[0]}h) = ${p[0].value[1].toFixed(5)}/hr` },
      xAxis: { type: 'value', name: 'Hours', nameTextStyle: { color: '#64748b', fontSize: 9 }, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      yAxis: { type: 'value', name: 'h(t)', nameTextStyle: { color: '#64748b', fontSize: 9 }, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      series: [{ type: 'line', data: pts, smooth: true, symbol: 'none', lineStyle: { color, width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}44` }, { offset: 1, color: `${color}05` }]) }, markLine: { data: [{ xAxis: Math.min(currentHours, maxT * 0.95) }], lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 }, label: { color: '#ef4444', fontFamily: 'monospace', fontSize: 9, formatter: 'Now' }, symbol: ['none', 'none'] } }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [shape, scale, currentHours, color]);
  return <div ref={ref} style={{ width: '100%', height: 140 }}/>;
};

// ── Health Trend EChart ───────────────────────────────────────────────────────
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
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 }, formatter: (p: any) => `${p[0].axisValue}: Health ${p[0].data}%` },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
      yAxis: { type: 'value', min: 60, max: 100, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace', formatter: '{value}%' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{ type: 'line', data, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { color, width: 2.5 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}40` }, { offset: 1, color: `${color}00` }]) }, markLine: { data: [{ yAxis: 75 }], lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 }, label: { color: '#f59e0b', fontFamily: 'monospace', fontSize: 9, formatter: 'Maint. Limit' }, symbol: ['none', 'none'] } }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [data, color]);
  return <div ref={ref} style={{ width: '100%', height: 140 }}/>;
};

// ── Fleet Health EChart ───────────────────────────────────────────────────────
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
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }, formatter: (p: any) => `${p[0].name}<br/>Health: <b>${p[0].value}%</b>` },
      xAxis: { type: 'value', max: 100, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace', formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      yAxis: { type: 'category', data: sorted.map(i => i.name.length > 22 ? i.name.slice(0, 22) + '…' : i.name), axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }, axisLine: { show: false } },
      series: [{ type: 'bar', barMaxWidth: 14, data: sorted.map(i => ({ value: i.health_score, itemStyle: { color: i.health_score >= 85 ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#10b98188' }, { offset: 1, color: '#10b981' }]) : i.health_score >= 70 ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#f59e0b88' }, { offset: 1, color: '#f59e0b' }]) : new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#ef444488' }, { offset: 1, color: '#ef4444' }]), borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: '#94a3b8', fontSize: 9, fontFamily: 'monospace', formatter: (p: any) => `${p.value}%` }, markLine: { silent: true, data: [{ xAxis: 75 }], lineStyle: { color: '#f59e0b66', type: 'dashed', width: 1 }, label: { show: false }, symbol: ['none', 'none'] } }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [items]);
  return <div ref={ref} style={{ width: '100%', height: Math.max(160, items.length * 28) }}/>;
};

// ── Vibration Spectrum Chart ──────────────────────────────────────────────────
const VibrationChart: React.FC<{ value: number; name: string; color: string }> = ({ value, name, color }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const freqs = Array.from({ length: 30 }, (_, i) => i * 10 + 10);
    const amps = freqs.map(f => {
      const base = value * 0.4 * Math.exp(-Math.pow((f - 60) / 40, 2));
      const noise = (Math.random() - 0.5) * value * 0.15;
      return Math.max(0, base + noise);
    });
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 6, bottom: 22, left: 30, right: 8 },
      xAxis: { type: 'category', data: freqs.map(f => `${f}`), axisLabel: { color: '#475569', fontSize: 8, fontFamily: 'monospace', interval: 4 } },
      yAxis: { type: 'value', axisLabel: { color: '#475569', fontSize: 8, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.9)', textStyle: { color: '#e2e8f0', fontSize: 9, fontFamily: 'monospace' }, formatter: (p: any) => `${p[0].axisValue} Hz: ${p[0].value.toFixed(3)} mm/s` },
      series: [{ type: 'bar', data: amps, barWidth: 4, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color }, { offset: 1, color: `${color}22` }]), borderRadius: [2, 2, 0, 0] } }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [value, color]);
  return <div ref={ref} style={{ width: '100%', height: 90 }}/>;
};

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ label: string; ok?: boolean; warn?: boolean; pulse?: boolean }> = ({
  label, ok = true, warn, pulse
}) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border"
    style={{
      background: ok && !warn ? '#10b98115' : warn ? '#f59e0b15' : '#ef444415',
      borderColor: ok && !warn ? '#10b98144' : warn ? '#f59e0b44' : '#ef444444',
      color: ok && !warn ? '#10b981' : warn ? '#f59e0b' : '#ef4444',
    }}>
    <span className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: ok && !warn ? '#10b981' : warn ? '#f59e0b' : '#ef4444' }}/>
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

// ── Progress Bar Metric ───────────────────────────────────────────────────────
const BarMetric: React.FC<{ label: string; value: number; max: number; unit: string; color: string; sub?: string }> = ({
  label, value, max, unit, color, sub
}) => {
  const pct = clamp((value / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}44` }}/>
      </div>
      {sub && <div className="text-[9px] font-mono text-slate-600">{sub}</div>}
    </div>
  );
};

// ── Small Ring Gauge ──────────────────────────────────────────────────────────
const RingGauge: React.FC<{ value: number; max: number; unit: string; label: string; color: string; size?: number }> = ({
  value, max, unit, label, color, size = 80
}) => {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamp(value / max * 100) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 3px ${color}88)` }}/>
        <text x={size/2} y={size/2-3} textAnchor="middle" fill="white" fontSize={size > 75 ? 13 : 10} fontWeight="900" fontFamily="monospace">{value}</text>
        <text x={size/2} y={size/2+10} textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace">{unit}</text>
      </svg>
      <div className="text-[9px] font-mono text-slate-400 text-center uppercase leading-tight">{label}</div>
    </div>
  );
};

// ── Vehicle Card ──────────────────────────────────────────────────────────────
const VehicleCard: React.FC<{
  name: string; type: string; status: string; location: string;
  fuel: number; temp: number; blockHeater: boolean; color: string;
  geofenced?: boolean; convoyKm: number;
}> = ({ name, type, status, location, fuel, temp, blockHeater, color, geofenced, convoyKm }) => {
  const statusOk = status === 'ON ROUTE' || status === 'DOCKED';
  const fuelColor = fuel > 50 ? '#10b981' : fuel > 25 ? '#f59e0b' : '#ef4444';
  const tempOk = temp > -20;
  return (
    <div className="p-4 rounded-2xl border transition-all hover:scale-[1.01]"
      style={{ borderColor: `${color}33`, background: `${color}07` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>
            <Truck className="w-4 h-4"/>
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-white">{name}</div>
            <div className="text-[9px] font-mono text-slate-500">{type}</div>
          </div>
        </div>
        <StatusBadge label={status} ok={statusOk} warn={status === 'MAINTENANCE'}/>
      </div>

      {/* GPS Location */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2 text-[9px] font-mono ${geofenced ? 'bg-red-500/15 border border-red-500/40 text-red-300' : 'bg-white/5 border border-white/10 text-slate-400'}`}>
        <MapPin className={`w-3 h-3 ${geofenced ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}/>
        {geofenced ? '⚠️ OFF-ROUTE — CREVASSE ZONE' : location}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-1.5 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[8px] font-mono text-slate-500 uppercase">Fuel</div>
          <div className="text-[11px] font-black font-mono" style={{ color: fuelColor }}>{fuel}%</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[8px] font-mono text-slate-500 uppercase">Eng. Temp</div>
          <div className="text-[11px] font-black font-mono" style={{ color: tempOk ? '#10b981' : '#ef4444' }}>{temp}°C</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[8px] font-mono text-slate-500 uppercase">Range</div>
          <div className="text-[11px] font-black font-mono text-sky-300">{convoyKm}km</div>
        </div>
      </div>

      {/* Block Heater */}
      <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-mono border ${blockHeater ? 'bg-orange-500/12 border-orange-500/40 text-orange-300' : 'bg-red-500/12 border-red-500/40 text-red-300'}`}>
        <span className="flex items-center gap-1"><Flame className="w-3 h-3"/> Block Heater</span>
        <span className="font-bold">{blockHeater ? 'ACTIVE' : 'FAILED — DO NOT START'}</span>
      </div>

      {/* Convoy Fuel Bar */}
      <div className="mt-2 space-y-1">
        <div className="text-[9px] font-mono text-slate-500">Convoy Fuel Autonomy</div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${clamp(convoyKm / 300 * 100)}%`, background: fuelColor }}/>
        </div>
      </div>
    </div>
  );
};

// ── EGT Cylinder Matrix ───────────────────────────────────────────────────────
const EGTMatrix: React.FC<{ cylinders: { id: string; temp: number }[] }> = ({ cylinders }) => {
  const avg = cylinders.reduce((s, c) => s + c.temp, 0) / cylinders.length;
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
        Exhaust Gas Temperature (EGT) Matrix
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {cylinders.map(c => {
          const diff = c.temp - avg;
          const color = Math.abs(diff) < 15 ? '#10b981' : Math.abs(diff) < 30 ? '#f59e0b' : '#ef4444';
          return (
            <div key={c.id} className="p-2 rounded-lg border text-center transition-all hover:scale-105"
              style={{ borderColor: `${color}44`, background: `${color}10` }}>
              <div className="text-[8px] font-mono text-slate-500">{c.id}</div>
              <div className="text-sm font-black font-mono" style={{ color }}>{c.temp}°C</div>
              <div className="text-[8px] font-mono" style={{ color }}>
                {diff >= 0 ? '+' : ''}{diff.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[9px] font-mono text-slate-600">Avg: {avg.toFixed(0)}°C · Δ &gt; 30°C = injector fault</div>
    </div>
  );
};

// ── Freezer Time-to-Melt Countdown ───────────────────────────────────────────
const FreezerCountdown: React.FC<{ powerOk: boolean; hoursRemaining: number; color: string }> = ({
  powerOk, hoursRemaining, color
}) => {
  const pct = clamp((hoursRemaining / 8) * 100);
  return (
    <div className="p-4 rounded-2xl border transition-all"
      style={{ borderColor: `${color}44`, background: `${color}08` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
          <Snowflake className="w-4 h-4" style={{ color }}/> −80°C Deep Freezer Status
        </div>
        <StatusBadge label={powerOk ? 'POWERED' : 'POWER LOSS'} ok={powerOk} warn={!powerOk}/>
      </div>
      {!powerOk ? (
        <div className="space-y-2">
          <div className="text-[9px] font-mono text-slate-400">Time-to-Sample-Melt Countdown</div>
          <div className="text-3xl font-black font-mono text-red-400">{hoursRemaining.toFixed(1)}h</div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-red-500/60 to-red-400 transition-all"
              style={{ width: `${pct}%` }}/>
          </div>
          <div className="text-[9px] font-mono text-red-400 animate-pulse">⚠️ ALERT: Samples will degrade — mobilize backup power</div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-1">
          <div className="text-2xl font-black font-mono text-emerald-400">−80°C</div>
          <div className="text-[10px] font-mono text-slate-400">Stable · Buffer: 8.0h on insulation alone</div>
        </div>
      )}
    </div>
  );
};

// ── Type Icon ─────────────────────────────────────────────────────────────────
const typeIcon = (type: string) => {
  const map: Record<string, React.ReactElement> = {
    power: <Zap className="w-4 h-4"/>, utility: <Droplets className="w-4 h-4"/>,
    science: <Microscope className="w-4 h-4"/>, hvac: <ThermometerSnowflake className="w-4 h-4"/>,
    comms: <Cpu className="w-4 h-4"/>, transport: <Truck className="w-4 h-4"/>,
  };
  return map[type] || <Wrench className="w-4 h-4"/>;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const EquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [activeLayer, setActiveLayer] = useState<'fleet' | 'mobility' | 'plant' | 'science' | 'facility'>('fleet');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [scenarioType, setScenarioType] = useState('generator_failure');
  const [freezerPowerOk] = useState(true);

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await equipmentApi.getStationEquipment(stationId);
        if (mounted && data?.items?.length > 0) {
          setEquipmentList(data.items);
          if (!selectedAssetId) setSelectedAssetId(data.items[0].id);
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
    { id: 'sci_m01', name: 'LIDAR Atmospheric Profiler', type: 'science', health_score: 97.2, health_trend: [97.5, 97.4, 97.3, 97.3, 97.2, 97.2], operating_hours: 3240, status: 'operational', load_pct: 35, vibration_mm_s: 0.5, temp_c: 22, failure_risk_pct: 1.2, rul_days: 280, weibull_beta: 3.0, weibull_eta: 20000, maintenance_status: 'NOMINAL', next_service_days: 90 },
  ] : [
    { id: 'gen_b01', name: 'Volvo Penta 100 kVA Gen #1', type: 'power', health_score: 96.8, health_trend: [97.2, 97.1, 97, 96.9, 96.9, 96.8], operating_hours: 5640, status: 'operational', load_pct: 72, vibration_mm_s: 1.9, temp_c: 78.2, failure_risk_pct: 2.1, rul_days: 180, weibull_beta: 2.6, weibull_eta: 14000, maintenance_status: 'NOMINAL', next_service_days: 30 },
    { id: 'chp_b01', name: 'Combined Heat & Power Unit #1', type: 'power', health_score: 93.4, health_trend: [94.5, 94.2, 93.9, 93.7, 93.5, 93.4], operating_hours: 6840, status: 'operational', load_pct: 85, vibration_mm_s: 2.2, temp_c: 91, failure_risk_pct: 4.6, rul_days: 140, weibull_beta: 2.3, weibull_eta: 13000, maintenance_status: 'NOMINAL', next_service_days: 21 },
    { id: 'ro_b01', name: 'High-Pressure RO Plant', type: 'utility', health_score: 91.2, health_trend: [93, 92.6, 92, 91.8, 91.5, 91.2], operating_hours: 4820, status: 'operational', load_pct: 60, vibration_mm_s: 2.6, temp_c: 38, failure_risk_pct: 5.2, rul_days: 110, weibull_beta: 2.1, weibull_eta: 10000, maintenance_status: 'DUE_SOON', next_service_days: 18 },
    { id: 'hvac_b01', name: 'Bharati Heating Loop Unit A', type: 'hvac', health_score: 94.6, health_trend: [95.2, 95, 94.9, 94.8, 94.7, 94.6], operating_hours: 9200, status: 'operational', load_pct: 65, vibration_mm_s: 1.6, temp_c: 48, failure_risk_pct: 3.8, rul_days: 160, weibull_beta: 2.2, weibull_eta: 16000, maintenance_status: 'NOMINAL', next_service_days: 50 },
    { id: 'ageos_b01', name: 'AGEOS 12m Satellite Dish', type: 'science', health_score: 98.1, health_trend: [98.5, 98.4, 98.3, 98.2, 98.1, 98.1], operating_hours: 2100, status: 'operational', load_pct: 28, vibration_mm_s: 0.3, temp_c: 18, failure_risk_pct: 0.9, rul_days: 350, weibull_beta: 3.5, weibull_eta: 25000, maintenance_status: 'NOMINAL', next_service_days: 120 },
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

  // ── Domain-specific data ────────────────────────────────────────────────────
  const vehicles = isMaitri ? [
    { name: 'PistenBully 300 #1', type: 'Snow Groomer', status: 'ON ROUTE', location: '70°45.2′S 11°44.8′E · Ice Shelf Traverse', fuel: 68, temp: -28, blockHeater: true, color: '#f97316', geofenced: false, convoyKm: 184 },
    { name: 'PistenBully 600 #2', type: 'Heavy Tracked', status: 'DOCKED', location: 'Maitri Garage Bay 2', fuel: 92, temp: -12, blockHeater: true, color: '#10b981', geofenced: false, convoyKm: 248 },
    { name: 'Terex Hydraulic Crane', type: 'Offload Crane', status: 'MAINTENANCE', location: 'Workshop Yard', fuel: 45, temp: -5, blockHeater: false, color: '#f59e0b', geofenced: false, convoyKm: 0 },
    { name: 'Skidoo Expedition #3', type: 'Snowmobile', status: 'ON ROUTE', location: '70°46.1′S 11°45.9′E · Glacier Stakes', fuel: 34, temp: -38, blockHeater: false, color: '#ef4444', geofenced: true, convoyKm: 42 },
  ] : [
    { name: 'PistenBully 300 #1', type: 'Snow Groomer', status: 'DOCKED', location: 'Bharati Equipment Bay', fuel: 81, temp: -8, blockHeater: true, color: '#10b981', geofenced: false, convoyKm: 212 },
    { name: 'Crawler Crane #1', type: 'Heavy Crawler', status: 'ON ROUTE', location: 'Ice Edge — Ship Offload', fuel: 57, temp: -15, blockHeater: true, color: '#f97316', geofenced: false, convoyKm: 95 },
    { name: 'Front-End Loader #2', type: 'Earth Mover', status: 'DOCKED', location: 'Helipad Clearance Zone', fuel: 73, temp: -10, blockHeater: true, color: '#06b6d4', geofenced: false, convoyKm: 61 },
  ];

  const egtCylinders = [
    { id: 'Cyl 1', temp: isMaitri ? 480 : 510 },
    { id: 'Cyl 2', temp: isMaitri ? 475 : 505 },
    { id: 'Cyl 3', temp: isMaitri ? 482 : 512 },
    { id: 'Cyl 4', temp: isMaitri ? 388 : 415 }, // clogged injector simulation
    { id: 'Cyl 5', temp: isMaitri ? 479 : 508 },
    { id: 'Cyl 6', temp: isMaitri ? 476 : 507 },
  ];

  const layers = [
    { id: 'fleet' as const, label: 'Fleet Overview', icon: <BarChart3 className="w-4 h-4"/>, color: '#2dd4bf' },
    { id: 'mobility' as const, label: 'Heavy Mobility & Vehicles', icon: <Truck className="w-4 h-4"/>, color: '#f97316' },
    { id: 'plant' as const, label: 'Station Plant', icon: <Zap className="w-4 h-4"/>, color: '#eab308' },
    { id: 'science' as const, label: 'Scientific Hardware', icon: <Microscope className="w-4 h-4"/>, color: '#818cf8' },
    { id: 'facility' as const, label: 'Facility Support', icon: <Settings className="w-4 h-4"/>, color: '#10b981' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 80%, #2dd4bf08 0%, transparent 60%), radial-gradient(ellipse at 20% 20%, #f9731608 0%, transparent 50%)' }}/>
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
                <Wrench className="w-3 h-3"/> Equipment & Machinery Command
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name}
              </span>
              {criticalCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3"/> {criticalCount} Critical Asset{criticalCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <HeartPulse className="w-8 h-8 text-teal-400"/> Equipment Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {allItems.length} monitored assets · 4 industrial domains · Weibull hazard modeling · Predictive maintenance · GPS fleet tracking
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=equipment`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4"/> Decision Intel
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Fleet Health', val: `${avgHealth.toFixed(1)}%`, sub: `${allItems.length} assets`, color: statusColor(avgHealth), icon: <HeartPulse className="w-4 h-4"/> },
            { label: 'Critical Assets', val: criticalCount.toString(), sub: 'Health <70% or risk >10%', color: criticalCount > 0 ? '#ef4444' : '#10b981', icon: <AlertOctagon className="w-4 h-4"/> },
            { label: 'Maint. Due', val: dueSoon.toString(), sub: 'Service within 30 days', color: dueSoon > 0 ? '#f59e0b' : '#10b981', icon: <Clock className="w-4 h-4"/> },
            { label: 'Total Runtime', val: `${(totalHours / 1000).toFixed(1)}k h`, sub: 'Accumulated fleet', color: '#06b6d4', icon: <Timer className="w-4 h-4"/> },
            { label: 'Vehicles Active', val: vehicles.filter(v => v.status === 'ON ROUTE').length.toString(), sub: `${vehicles.length} total fleet`, color: '#f97316', icon: <Truck className="w-4 h-4"/> },
            { label: 'Geofence Alerts', val: vehicles.filter(v => v.geofenced).length.toString(), sub: 'Off-route vehicles', color: vehicles.some(v => v.geofenced) ? '#ef4444' : '#10b981', icon: <MapPin className="w-4 h-4"/> },
          ].map(kpi => (
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

      {/* ── Layer Nav ── */}
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
          FLEET OVERVIEW (existing + enhanced)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'fleet' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Fleet Health Chart */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">Fleet Health Dashboard — All Assets</div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search..." className="pl-7 pr-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 w-32"/>
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
              <FleetHealthChart items={filteredItems}/>
            </div>

            {/* Asset Cards List */}
            <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3 overflow-y-auto max-h-[480px]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold sticky top-0 bg-polar-dark/80 py-1">
                Click asset to inspect →
              </div>
              {filteredItems.map((item: any) => {
                const mc = maintColor(item.maintenance_status);
                const hc = statusColor(item.health_score);
                const isSelected = item.id === (selectedAssetId || allItems[0]?.id);
                return (
                  <div key={item.id} onClick={() => { setSelectedAssetId(item.id); setActiveLayer('fleet'); }}
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
                          style={{ width: `${item.health_score}%`, background: `linear-gradient(to right, ${hc}88, ${hc})` }}/>
                      </div>
                      <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: hc }}>{item.health_score.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asset Detail Panel */}
          {selectedItem && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl flex flex-col items-center gap-5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold self-start w-full">
                  Asset Intelligence — {selectedItem.name}
                </div>
                <HealthGauge value={selectedItem.health_score} size={150} label="Health Score" subLabel={`${selectedItem.operating_hours?.toLocaleString()}h runtime`}/>
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
              <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">24h Health Degradation Trend</div>
                <HealthTrendChart data={selectedItem.health_trend || [90,89,88.5,88,87.5,87]} color={statusColor(selectedItem.health_score)}/>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mt-4">Weibull Hazard Function</div>
                <WeibullChart shape={selectedItem.weibull_beta || 2.4} scale={selectedItem.weibull_eta || 12500} currentHours={selectedItem.operating_hours || 8000} color={statusColor(selectedItem.health_score)}/>
              </div>
              <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Vibration Spectrum Analysis</div>
                <VibrationChart value={selectedItem.vibration_mm_s || 2} name={selectedItem.name} color={statusColor(selectedItem.health_score)}/>
                <div className="text-[9px] font-mono text-slate-600 -mt-1">Frequency domain (10–300 Hz) — Bearing fault signature monitoring</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mt-2">Maintenance Status</div>
                <div className="p-3 rounded-xl border"
                  style={{ borderColor: `${maintColor(selectedItem.maintenance_status)}44`, background: `${maintColor(selectedItem.maintenance_status)}0A` }}>
                  <div className="text-xs font-mono font-bold" style={{ color: maintColor(selectedItem.maintenance_status) }}>
                    {selectedItem.maintenance_status}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">Next service in {selectedItem.next_service_days} days</div>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Switch Asset</div>
                <div className="space-y-2 max-h-36 overflow-y-auto">
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

          {/* Predictive Maintenance Schedule */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4"/> Predictive Maintenance Schedule — Weibull-Based Risk Prioritization
            </div>
            <div className="space-y-3">
              {[...allItems].sort((a: any, b: any) => a.rul_days - b.rul_days).map((item: any) => {
                const hc = statusColor(item.health_score);
                const mc = maintColor(item.maintenance_status);
                const urgency = Math.max(0, 100 - (item.rul_days / 360) * 100);
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-polar-border bg-polar-dark/40 hover:border-white/15 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl border flex items-center justify-center"
                          style={{ borderColor: `${hc}44`, background: `${hc}11`, color: hc }}>
                          {typeIcon(item.type)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{item.operating_hours?.toLocaleString()}h runtime</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded border font-bold"
                        style={{ borderColor: `${mc}44`, background: `${mc}11`, color: mc }}>
                        {item.maintenance_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-center">
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
                    <div className="h-1.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${urgency}%`, background: `linear-gradient(to right, ${hc}88, ${hc})` }}/>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 mt-1 text-right">Urgency: {urgency.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What-If Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4"/> Equipment Failure Scenario Simulator
              </div>
              <div className="space-y-3">
                {[
                  { key: 'generator_failure', label: '⚡ Generator Primary Trip', desc: 'Unplanned diesel generator shutdown' },
                  { key: 'pump_failure', label: '💧 Water Pump Failure', desc: 'Intake pump mechanical seizure' },
                  { key: 'hvac_failure', label: '🌡️ HVAC Heating Failure', desc: 'Station heating unit breakdown in winter' },
                ].map(s => (
                  <div key={s.key} onClick={() => setScenarioType(s.key)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${scenarioType === s.key ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' : 'bg-polar-dark/50 border-polar-border text-slate-400 hover:border-white/20'}`}>
                    <div className="text-xs font-mono font-bold">{s.label}</div>
                    <div className="text-[10px] font-mono mt-0.5 opacity-70">{s.desc}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleWhatIf} disabled={whatIfLoading}
                className="w-full py-3 rounded-xl text-sm font-mono font-bold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50">
                {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
                {whatIfLoading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
              {!whatIfResult ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm font-mono text-center gap-3">
                  <HeartPulse className="w-10 h-10 opacity-20"/>
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
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-2 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5"/> Recommended Action
                    </div>
                    <p className="text-xs font-mono text-slate-300 leading-relaxed">{whatIfResult.recommended_action}</p>
                  </div>
                  <button onClick={() => setWhatIfResult(null)}
                    className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <X className="w-3.5 h-3.5"/> Clear Results
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DOMAIN 1: HEAVY MOBILITY & VEHICLES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'mobility' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<Truck className="w-6 h-6"/>}
              title={isMaitri ? 'Heavy Mobility Fleet — PistenBully & Crane Operations' : 'Coastal Logistics Fleet — Crawler Crane & Loader Operations'}
              subtitle="Real-time GPS overlay, engine cold-start telemetry, convoy fuel autonomy calculator, and geofence safety monitoring"
              color="#f97316"
              layer="Domain 1 · Heavy Mobility & Vehicles"
            />

            {/* Geofence Alert Banner */}
            {vehicles.some(v => v.geofenced) && (
              <div className="mb-5 p-4 rounded-2xl border border-red-500/60 bg-red-500/10 flex items-center gap-3 animate-pulse">
                <AlertOctagon className="w-6 h-6 text-red-400 flex-shrink-0"/>
                <div>
                  <div className="text-sm font-black font-mono text-red-300">OFF-ROUTE ALARM — CREVASSE ZONE BREACH</div>
                  <div className="text-[10px] font-mono text-red-400/80">Vehicle has entered designated danger zone. Station leader notified. Recall immediately.</div>
                </div>
              </div>
            )}

            {/* Vehicle Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {vehicles.map(v => <VehicleCard key={v.name} {...v}/>)}
            </div>

            {/* Convoy Fuel Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl border border-orange-500/30 bg-orange-500/07 space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-300 font-bold flex items-center gap-2">
                  <Fuel className="w-4 h-4"/> Convoy Fuel Autonomy Calculator
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Fuel Tank Level', val: isMaitri ? 68 : 81, max: 100, unit: '%', color: '#f97316' },
                    { label: 'Sledge Load Weight', val: isMaitri ? 2400 : 1800, max: 4000, unit: 'kg', color: '#f59e0b' },
                    { label: 'Ice Friction Coefficient', val: isMaitri ? 0.04 : 0.06, max: 0.15, unit: '', color: '#06b6d4' },
                    { label: 'Convoy Range (Est.)', val: isMaitri ? 184 : 212, max: 300, unit: 'km', color: '#10b981' },
                  ].map(m => (
                    <BarMetric key={m.label} label={m.label} value={m.val} max={m.max} unit={m.unit} color={m.color}/>
                  ))}
                </div>
                <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-[10px] font-mono text-orange-300">
                  Next refuel point: {isMaitri ? 'Dronning Maud Land depot' : 'MV Vasiliy Golovnin vessel'} · Est. {isMaitri ? '12h 40m' : '8h 20m'} travel
                </div>
              </div>

              {/* Cold-Start Telemetry */}
              <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-500/07 space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300 font-bold flex items-center gap-2">
                  <ThermometerSnowflake className="w-4 h-4"/> Engine Cold-Start Telemetry
                </div>
                <div className="space-y-3">
                  {vehicles.map(v => (
                    <div key={v.name} className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/3">
                      <div>
                        <div className="text-[10px] font-mono text-slate-300 font-bold">{v.name}</div>
                        <div className="text-[9px] font-mono text-slate-500">Engine: {v.temp}°C</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold ${v.blockHeater ? 'bg-orange-500/15 border-orange-500/40 text-orange-300' : 'bg-red-500/15 border-red-500/40 text-red-300'}`}>
                          <Flame className="w-3 h-3"/> {v.blockHeater ? 'BH OK' : 'BH FAIL'}
                        </div>
                        <StatusBadge label={v.temp > -20 ? 'START OK' : 'DO NOT START'} ok={v.temp > -20} warn={false}/>
                      </div>
                    </div>
                  ))}
                </div>
                {vehicles.some(v => !v.blockHeater) && (
                  <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-[10px] font-mono text-red-300">
                    ⚠️ Block Heater Failure Detected — Engine block at risk of cracking below −30°C
                  </div>
                )}
              </div>
            </div>

            {/* GPS Position Table */}
            <div className="mt-5 pt-5 border-t border-polar-border/40">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-orange-400"/> Live Ice-Track GPS Overlay
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-polar-border/40">
                      {['Vehicle', 'Status', 'GPS Position', 'Fuel', 'Engine Temp', 'Block Heater', 'Convoy Range', 'Geofence'].map(h => (
                        <th key={h} className="text-left text-slate-500 pb-2 pr-4 font-normal uppercase text-[9px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.name} className={`border-b border-polar-border/20 ${v.geofenced ? 'bg-red-500/05' : ''}`}>
                        <td className="py-2 pr-4 text-white font-bold">{v.name}</td>
                        <td className="py-2 pr-4"><StatusBadge label={v.status} ok={v.status !== 'MAINTENANCE'} warn={v.status === 'MAINTENANCE'}/></td>
                        <td className="py-2 pr-4 text-slate-400 max-w-[160px] truncate">{v.location}</td>
                        <td className="py-2 pr-4 font-bold" style={{ color: v.fuel > 50 ? '#10b981' : v.fuel > 25 ? '#f59e0b' : '#ef4444' }}>{v.fuel}%</td>
                        <td className="py-2 pr-4 font-bold" style={{ color: v.temp > -20 ? '#10b981' : '#ef4444' }}>{v.temp}°C</td>
                        <td className="py-2 pr-4"><StatusBadge label={v.blockHeater ? 'ACTIVE' : 'FAILED'} ok={v.blockHeater} warn={false}/></td>
                        <td className="py-2 pr-4 text-sky-300 font-bold">{v.convoyKm} km</td>
                        <td className="py-2 pr-4">{v.geofenced ? <span className="text-red-400 font-bold animate-pulse">⚠️ BREACH</span> : <span className="text-emerald-400">CLEAR</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DOMAIN 2: STATION PLANT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'plant' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<Zap className="w-6 h-6"/>}
              title={isMaitri ? 'Station Plant — Diesel Gensets, Boilers & Water Pumps' : 'Station Plant — CHP Units, Heat Exchangers & RO Pumps'}
              subtitle="Vibration spectrum analysis, EGT cylinder matrix, boiler burner efficiency, and predictive bearing failure detection"
              color="#eab308"
              layer="Domain 2 · Station Plant"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              {/* Generator Hall */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold">
                  {isMaitri ? 'Generator Hall — Kirloskar 62.5 kVA Units' : 'CHP Units — Combined Heat & Power'}
                </div>
                {(isMaitri ? [
                  { id: '#1', load: 68, temp: 82.5, vib: 2.1, status: 'RUNNING', hours: 8420 },
                  { id: '#2', load: 54, temp: 80.1, vib: 2.8, status: 'RUNNING', hours: 7890 },
                  { id: '#3', load: 0, temp: 22, vib: 0, status: 'STANDBY', hours: 4200 },
                ] : [
                  { id: 'CHP #1', load: 85, temp: 91, vib: 2.2, status: 'RUNNING', hours: 6840 },
                  { id: 'CHP #2', load: 72, temp: 88, vib: 1.9, status: 'RUNNING', hours: 5640 },
                  { id: 'Gen #3', load: 0, temp: 22, vib: 0, status: 'STANDBY', hours: 3100 },
                ]).map(g => {
                  const color = g.status === 'RUNNING' ? '#10b981' : '#64748b';
                  return (
                    <div key={g.id} className="p-4 rounded-2xl border transition-all hover:scale-[1.01]"
                      style={{ borderColor: `${color}33`, background: `${color}08` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" style={{ color }}/>
                          <span className="text-[11px] font-mono font-bold text-white">{isMaitri ? 'Gen' : ''} {g.id}</span>
                        </div>
                        <StatusBadge label={g.status} ok={g.status === 'RUNNING'} warn={g.status === 'STANDBY'}/>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-1.5 rounded-lg bg-white/5">
                          <div className="text-[8px] font-mono text-slate-500">Load</div>
                          <div className="text-[11px] font-black font-mono" style={{ color: g.load > 90 ? '#ef4444' : '#f59e0b' }}>{g.load}%</div>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-white/5">
                          <div className="text-[8px] font-mono text-slate-500">Temp</div>
                          <div className="text-[11px] font-black font-mono" style={{ color: g.temp > 90 ? '#ef4444' : '#10b981' }}>{g.temp}°C</div>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-white/5">
                          <div className="text-[8px] font-mono text-slate-500">Vib</div>
                          <div className="text-[11px] font-black font-mono" style={{ color: g.vib > 3 ? '#ef4444' : '#10b981' }}>{g.vib}</div>
                        </div>
                      </div>
                      {g.status === 'RUNNING' && (
                        <VibrationChart value={g.vib} name={g.id} color={g.vib > 3 ? '#ef4444' : '#10b981'}/>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* EGT Matrix */}
              <div className="space-y-4">
                <EGTMatrix cylinders={egtCylinders}/>
                <div className={`p-3 rounded-xl border ${egtCylinders.some(c => Math.abs(c.temp - egtCylinders.reduce((s,x) => s+x.temp,0)/egtCylinders.length) > 30) ? 'border-red-500/40 bg-red-500/10' : 'border-emerald-500/40 bg-emerald-500/08'}`}>
                  <div className="text-[10px] font-mono font-bold" style={{ color: egtCylinders.some(c => Math.abs(c.temp - egtCylinders.reduce((s,x) => s+x.temp,0)/egtCylinders.length) > 30) ? '#ef4444' : '#10b981' }}>
                    {egtCylinders.some(c => Math.abs(c.temp - egtCylinders.reduce((s,x) => s+x.temp,0)/egtCylinders.length) > 30)
                      ? '⚠️ Cylinder Δ > 30°C detected — Check fuel injector'
                      : '✓ All cylinder temperatures within normal variance'}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    {isMaitri ? 'Boiler Burner Efficiency' : 'Heat Exchanger Performance'}
                  </div>
                  <BarMetric label="Fuel-to-Air Ratio" value={isMaitri ? 14.2 : 14.8} max={20} unit=":1" color="#f59e0b"/>
                  <BarMetric label="Combustion Efficiency" value={isMaitri ? 91 : 94} max={100} unit="%" color="#10b981"/>
                  <BarMetric label="Exhaust Stack Temp" value={isMaitri ? 185 : 195} max={300} unit="°C" color="#f97316" sub="Alert if >250°C"/>
                  <div className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-mono ${isMaitri ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'}`}>
                    <Flame className="w-4 h-4 flex-shrink-0"/>
                    {isMaitri ? '⚠️ CO spike detected in Boiler Room 2 — Check Air Intake Vents' : '✓ Boiler Room CO levels normal'}
                  </div>
                </div>
              </div>

              {/* Vibration Predictive Analysis */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Predictive Bearing Failure Analysis
                </div>
                {allItems.filter((i: any) => i.type === 'power' || i.type === 'utility').map((item: any) => {
                  const hc = statusColor(item.health_score);
                  const daysToFail = item.rul_days;
                  const urgency = clamp(100 - (daysToFail / 180) * 100);
                  return (
                    <div key={item.id} className="p-3 rounded-xl border border-polar-border bg-polar-dark/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-300 font-bold truncate">{item.name}</span>
                        <span className="text-[9px] font-mono font-bold" style={{ color: hc }}>{item.vibration_mm_s} mm/s</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {item.vibration_mm_s > 3.5
                          ? '⚠️ Bearing wear signature — Schedule immediate inspection'
                          : item.vibration_mm_s > 2.5
                          ? '📊 Early-stage roughness — Monitor weekly'
                          : '✓ Smooth vibration profile'}
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${urgency}%`, background: `linear-gradient(to right, ${hc}88, ${hc})` }}/>
                      </div>
                      <div className="text-[9px] font-mono text-slate-600">Bearing replacement urgency: {urgency.toFixed(0)}% · RUL: {daysToFail}d</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DOMAIN 3: SCIENTIFIC HARDWARE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'science' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<Microscope className="w-6 h-6"/>}
              title={isMaitri ? 'Scientific Hardware — LIDAR, Magnetometer & Cold Chain' : 'Scientific Hardware — AGEOS Dish, Tide Gauges & Cold Chain'}
              subtitle="Mission-critical instrument uptime: antenna motor drive health, freezer time-to-melt countdown, sensor dome defrost, and lab power continuity"
              color="#818cf8"
              layer="Domain 3 · Scientific Hardware"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Instrument Uptime */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                  {isMaitri ? 'Atmospheric & Space Science Instruments' : 'Satellite, Marine & Atmospheric Instruments'}
                </div>
                {(isMaitri ? [
                  { name: 'LIDAR Atmospheric Profiler', status: 'ONLINE', uptime: 99.8, icon: <Radio className="w-4 h-4"/>, color: '#818cf8', note: 'Dome defrost: CLEAR' },
                  { name: 'Ozonometer (TOMS)', status: 'ONLINE', uptime: 99.5, icon: <Wind className="w-4 h-4"/>, color: '#06b6d4', note: 'UV index measurement active' },
                  { name: 'Fluxgate Magnetometer', status: 'ONLINE', uptime: 100, icon: <Navigation className="w-4 h-4"/>, color: '#10b981', note: 'Earth magnetic field Bz: 58,240 nT' },
                  { name: 'Digital Seismometer Array', status: 'ONLINE', uptime: 99.2, icon: <Activity className="w-4 h-4"/>, color: '#f59e0b', note: 'Vault temp: −2°C stable' },
                  { name: '−80°C Deep Freezers (×4)', status: 'POWERED', uptime: 100, icon: <Snowflake className="w-4 h-4"/>, color: '#38bdf8', note: 'Ice core samples: stable' },
                ] : [
                  { name: 'AGEOS 12m Satellite Dish', status: 'TRACKING', uptime: 99.9, icon: <Radio className="w-4 h-4"/>, color: '#818cf8', note: 'Azimuth: 142.3° · Elev: 28.7°' },
                  { name: 'Micro-Rain Radar (MRR)', status: 'ONLINE', uptime: 98.8, icon: <Wind className="w-4 h-4"/>, color: '#06b6d4', note: 'Precipitation: 0.4 mm/hr' },
                  { name: 'Black Carbon Aethalometer', status: 'ONLINE', uptime: 99.1, icon: <FlaskConical className="w-4 h-4"/>, color: '#f97316', note: 'BC: 12.4 ng/m³' },
                  { name: 'Tide Gauge & Wave Recorder', status: 'ONLINE', uptime: 100, icon: <Activity className="w-4 h-4"/>, color: '#38bdf8', note: 'Sea level: +0.12m MSL' },
                  { name: '−80°C Deep Freezers (×6)', status: 'POWERED', uptime: 100, icon: <Snowflake className="w-4 h-4"/>, color: '#06b6d4', note: 'Marine samples: stable' },
                ]).map(inst => (
                  <div key={inst.name} className="flex items-center gap-3 p-3 rounded-xl border border-polar-border bg-polar-dark/40 hover:border-white/15 transition-all">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${inst.color}18`, color: inst.color, border: `1px solid ${inst.color}44` }}>
                      {inst.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-bold text-white truncate">{inst.name}</div>
                      <div className="text-[9px] font-mono text-slate-500">{inst.note}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge label={inst.status} ok={true} pulse={inst.status === 'TRACKING' || inst.status === 'ONLINE'}/>
                      <span className="text-[9px] font-mono text-slate-500">{inst.uptime}% uptime</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* AGEOS Antenna / LIDAR Dome Status */}
              <div className="space-y-4">
                {!isMaitri && (
                  <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/07 space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-2">
                      <Radio className="w-4 h-4"/> AGEOS Antenna Motor Drive Health
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <RingGauge value={42} max={80} unit="Nm" label="Azimuth Torque" color="#818cf8" size={80}/>
                      <RingGauge value={28} max={60} unit="Nm" label="Elevation Torque" color="#06b6d4" size={80}/>
                    </div>
                    <div className="space-y-2">
                      <BarMetric label="Azimuth Motor Current" value={8.4} max={12} unit="A" color="#818cf8" sub="High-current alert at 10A"/>
                      <BarMetric label="Elevation Motor Current" value={5.2} max={10} unit="A" color="#06b6d4"/>
                      <BarMetric label="Drive Gear Temperature" value={42} max={80} unit="°C" color="#f59e0b" sub="Ice buildup risk above 50°C"/>
                    </div>
                    <div className={`p-3 rounded-xl border text-[10px] font-mono ${isMaitri ? '' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
                      ⚠️ Azimuth Motor High-Current Warning — Possible ice buildup on gears. De-ice protocol recommended.
                    </div>
                  </div>
                )}

                {isMaitri && (
                  <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/07 space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-2">
                      <Radio className="w-4 h-4"/> LIDAR Sensor Dome Defrost Status
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <RingGauge value={92} max={100} unit="%" label="Dome Clarity" color="#818cf8" size={80}/>
                      <RingGauge value={35} max={50} unit="°C" label="Heater Temp" color="#f97316" size={80}/>
                    </div>
                    <div className="space-y-2">
                      <BarMetric label="Snow Coverage Sensor" value={8} max={100} unit="%" color="#10b981" sub="Alert if >20%"/>
                      <BarMetric label="Dome Heating Power" value={1.8} max={3} unit="kW" color="#f97316"/>
                      <BarMetric label="Optical Clarity Index" value={92} max={100} unit="%" color="#818cf8" sub="Measurement valid above 80%"/>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-[10px] font-mono text-emerald-300">
                      ✓ Dome clear — Automated heating element active · LIDAR measurements valid
                    </div>
                  </div>
                )}

                {/* Freezer Countdown */}
                <FreezerCountdown powerOk={freezerPowerOk} hoursRemaining={4.5} color="#38bdf8"/>
              </div>

              {/* Science Power & Connectivity */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Lab Power & Network Continuity</div>
                <div className="space-y-2">
                  {[
                    { label: 'Lab UPS Status', val: 'ONLINE · 98% charge', color: '#10b981', ok: true },
                    { label: 'Lab Grid Feed', val: 'PRIMARY', color: '#10b981', ok: true },
                    { label: 'Network to NCAOR', val: '48 Mbps · 72ms', color: '#818cf8', ok: true },
                    { label: 'Data Archive Server', val: 'RUNNING · 78% capacity', color: '#06b6d4', ok: true },
                    { label: 'Calibration Due', val: 'LIDAR — 12 days', color: '#f59e0b', ok: false },
                    { label: 'Cold-Chain Audit', val: 'Last: 2 days ago', color: '#10b981', ok: true },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center text-[10px] font-mono border-b border-polar-border/20 pb-1.5">
                      <span className="text-slate-400">{r.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                        {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400"/> : <AlertTriangle className="w-3 h-3 text-amber-400"/>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/07 space-y-2">
                  <div className="text-[10px] font-mono uppercase text-sky-400 font-bold mb-2">Scientific Uptime SLA</div>
                  {(isMaitri ? [
                    { name: 'LIDAR', uptime: 99.8, color: '#818cf8' },
                    { name: 'Magnetometer', uptime: 100, color: '#10b981' },
                    { name: 'Seismometer', uptime: 99.2, color: '#f59e0b' },
                    { name: 'Deep Freezers', uptime: 100, color: '#38bdf8' },
                  ] : [
                    { name: 'AGEOS Dish', uptime: 99.9, color: '#818cf8' },
                    { name: 'Tide Gauge', uptime: 100, color: '#10b981' },
                    { name: 'MRR Radar', uptime: 98.8, color: '#06b6d4' },
                    { name: 'Deep Freezers', uptime: 100, color: '#38bdf8' },
                  ]).map(s => (
                    <BarMetric key={s.name} label={s.name} value={s.uptime} max={100} unit="%" color={s.color}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DOMAIN 4: FACILITY SUPPORT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'facility' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionHeader
              icon={<Settings className="w-6 h-6"/>}
              title="Facility Support Systems — HVAC, Fire Safety & Workshop"
              subtitle="Indoor air quality monitoring, automated fire pump readiness tests, workshop load balancing, and galley equipment health"
              color="#10b981"
              layer="Domain 4 · Facility Support"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* HVAC Air Quality */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                  <Wind className="w-4 h-4"/> HVAC Air Quality Index (Indoor)
                </div>

                {[
                  { zone: 'Sleeping Quarters A', co2: 840, humidity: 52, temp: 19.2 },
                  { zone: 'Sleeping Quarters B', co2: 910, humidity: 55, temp: 19.8 },
                  { zone: 'Science Lab', co2: 680, humidity: 42, temp: 18.5 },
                  { zone: 'Galley / Mess', co2: 1180, humidity: 65, temp: 21.4 },
                  { zone: 'Workshop', co2: 750, humidity: 45, temp: 15.2 },
                ].map(z => {
                  const co2Color = z.co2 < 800 ? '#10b981' : z.co2 < 1000 ? '#f59e0b' : '#ef4444';
                  const humidColor = z.humidity < 60 ? '#10b981' : '#f59e0b';
                  return (
                    <div key={z.zone} className="p-3 rounded-xl border border-polar-border bg-polar-dark/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-white">{z.zone}</span>
                        <StatusBadge label={z.co2 > 1000 ? 'VENTILATE' : 'OK'} ok={z.co2 <= 1000} warn={z.co2 > 1000}/>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="text-center p-1.5 rounded-lg bg-white/5">
                          <div className="text-[8px] font-mono text-slate-500">CO₂</div>
                          <div className="text-[11px] font-black font-mono" style={{ color: co2Color }}>{z.co2}</div>
                          <div className="text-[7px] font-mono text-slate-600">ppm</div>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-white/5">
                          <div className="text-[8px] font-mono text-slate-500">RH%</div>
                          <div className="text-[11px] font-black font-mono" style={{ color: humidColor }}>{z.humidity}%</div>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-white/5">
                          <div className="text-[8px] font-mono text-slate-500">Temp</div>
                          <div className="text-[11px] font-black font-mono text-sky-300">{z.temp}°C</div>
                        </div>
                      </div>
                      {z.co2 > 1000 && (
                        <div className="text-[9px] font-mono text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3"/> Auto-spinning intake fans to cycle fresh air
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fire Pump & Workshop */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4"/> Fire Pump Readiness System
                </div>
                <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/07 space-y-3">
                  {[
                    { label: 'Main Fire Pump', val: 'STANDBY-READY', color: '#10b981', ok: true },
                    { label: 'Jockey Pump', val: 'LAST TEST: 3 days ago', color: '#06b6d4', ok: true },
                    { label: 'System Pressure', val: '8.2 bar', color: '#10b981', ok: true },
                    { label: 'Pressure Curve', val: 'WITHIN SPEC', color: '#10b981', ok: true },
                    { label: 'Foam/Mist Supply', val: '2,400L available', color: '#818cf8', ok: true },
                    { label: 'Next Auto-Test', val: 'In 4 days', color: '#f59e0b', ok: true },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center text-[10px] font-mono border-b border-red-500/15 pb-1.5">
                      <span className="text-slate-400">{r.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                        {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400"/> : <AlertTriangle className="w-3 h-3 text-amber-400"/>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Jockey Pump Weekly Pressure Curve</div>
                  {[8.2, 8.1, 8.3, 8.2, 8.0, 8.2, 8.2].map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 w-10">Day {i + 1}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(p / 10) * 100}%`, background: '#10b981' }}/>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 w-12 text-right font-bold">{p} bar</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workshop Load & Galley */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                  <Wrench className="w-4 h-4"/> Workshop Power Load Monitor
                </div>
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/07 space-y-3">
                  {[
                    { label: 'Welding Array', val: 12.4, max: 20, unit: 'kW', active: true, color: '#f59e0b' },
                    { label: 'Lathe Machine', val: 3.2, max: 8, unit: 'kW', active: true, color: '#06b6d4' },
                    { label: 'Hydraulic Press', val: 0, max: 15, unit: 'kW', active: false, color: '#64748b' },
                    { label: 'Drill Press', val: 0.8, max: 5, unit: 'kW', active: true, color: '#818cf8' },
                  ].map(m => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${m.active ? 'animate-pulse' : ''}`} style={{ background: m.active ? m.color : '#374151' }}/>
                          {m.label}
                        </span>
                        <span className="font-bold" style={{ color: m.active ? m.color : '#64748b' }}>{m.val} {m.unit}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(m.val / m.max) * 100}%`, background: m.color }}/>
                      </div>
                    </div>
                  ))}
                  {(12.4 + 3.2 + 0.8) > 14 && (
                    <div className="p-3 rounded-xl border border-amber-500/50 bg-amber-500/15 text-[10px] font-mono text-amber-300">
                      ⚠️ Warning: Welding Station Active · Do not start RO Plant simultaneously — grid overload risk at {(12.4 + 3.2 + 0.8 + 22).toFixed(1)} kW
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Galley Equipment Status</div>
                <div className="space-y-2">
                  {[
                    { name: 'Convection Oven #1', status: 'RUNNING', color: '#f97316', temp: 180 },
                    { name: 'Convection Oven #2', status: 'STANDBY', color: '#64748b', temp: 22 },
                    { name: 'Walk-in Freezer', status: 'NOMINAL', color: '#38bdf8', temp: -18 },
                    { name: 'Dough Kneader', status: 'STANDBY', color: '#64748b', temp: 22 },
                  ].map(item => (
                    <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl border border-polar-border bg-polar-dark/40 hover:border-white/15 transition-all">
                      <span className="text-[10px] font-mono text-slate-300">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono" style={{ color: item.color }}>{item.temp}°C</span>
                        <StatusBadge label={item.status} ok={item.status !== 'FAULT'} warn={item.status === 'STANDBY'}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Decision Intelligence CTA ── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-l from-purple-500/10 via-teal-500/05 to-transparent pointer-events-none"/>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-polar-border/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                <Brain className="w-3 h-3"/> Decision Intelligence Suite
              </span>
              <span className="text-[10px] font-mono text-slate-400">Equipment Predictive Analytics</span>
            </div>
            <h3 className="text-lg font-black text-white mt-1">Equipment Domain Failure Simulation & Maintenance Forecasting</h3>
          </div>
          <button onClick={() => navigate(`/station/${stationId}/decision?domain=equipment`)}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer self-start md:self-auto">
            Launch Decision Intelligence <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { tab: 'forecast', icon: <Activity className="w-5 h-5"/>, badge: '30-DAY FORECAST', color: '#2dd4bf', title: '30-Day Fleet Health Trajectory', desc: 'Weibull-based RUL forecasting across all assets with predicted failure probability curves and maintenance scheduling windows.' },
            { tab: 'whatif', icon: <Sparkles className="w-5 h-5"/>, badge: 'FAILURE SIM', color: '#f59e0b', title: 'Equipment Failure Cascade Simulator', desc: 'Model primary generator trip, pump seizure, or HVAC failure and calculate downstream cascades on water, personnel, and power domains.' },
            { tab: 'recommendations', icon: <Brain className="w-5 h-5"/>, badge: 'AI COPILOT', color: '#818cf8', title: 'Maintenance Work Order AI', desc: 'AI-generated work order prioritization, spare parts inventory alerts, and operator action protocols for predictive maintenance windows.' },
          ].map(card => (
            <div key={card.tab}
              onClick={() => navigate(`/station/${stationId}/decision?domain=equipment&tab=${card.tab}`)}
              className="p-5 rounded-xl border border-polar-border bg-polar-dark/60 hover:bg-polar-dark transition-all cursor-pointer group flex flex-col justify-between"
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
                <h4 className="text-sm font-bold text-white">{card.title}</h4>
                <p className="text-xs font-mono text-slate-400 mt-2 leading-relaxed">{card.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-polar-border/30 flex items-center justify-between text-xs font-mono group-hover:translate-x-1 transition-transform"
                style={{ color: card.color }}>
                <span>Open in Decision Intel</span>
                <ArrowRight className="w-4 h-4"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
