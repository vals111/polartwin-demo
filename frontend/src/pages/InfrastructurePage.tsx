import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import * as echarts from 'echarts';
import {
  Building2, Layers, RefreshCw, Wind, Thermometer,
  ShieldCheck, CloudSnow, Activity, Bed,
  Heart, FlaskConical, Truck, Tent, Users,
  CheckCircle2, AlertTriangle, Zap, Droplet, Cpu,
  Wifi, Brain, ArrowLeft, Star, Compass,
  Wrench, Flame, Maximize2,
} from 'lucide-react';

const Pill: React.FC<{ label: string; color?: string; pulse?: boolean; small?: boolean }> = ({
  label, color = '#10b981', pulse, small,
}) => (
  <span
    className={`inline-flex items-center gap-1 ${small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'} rounded-full font-mono font-bold border flex-shrink-0`}
    style={{ background: `${color}15`, borderColor: `${color}44`, color }}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} style={{ background: color }} />
    {label}
  </span>
);

const SectionDivider: React.FC<{
  icon: React.ReactNode; title: string; subtitle?: string; color: string;
}> = ({ icon, title, subtitle, color }) => (
  <div className="flex items-start gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h2 className="text-base font-black text-white">{title}</h2>
      {subtitle && <p className="text-xs font-mono text-slate-200 mt-0.5 leading-relaxed">{subtitle}</p>}
    </div>
  </div>
);

const BarMeter: React.FC<{
  label: string; value: number; max?: number; unit?: string; color: string; height?: string;
}> = ({ label, value, max = 100, unit = '%', color, height = 'h-2' }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const dc = pct < 25 ? '#ef4444' : pct < 50 ? '#f59e0b' : color;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-slate-200 font-semibold">{label}</span>
        <span className="font-bold" style={{ color: dc }}>{value}{unit}</span>
      </div>
      <div className={`${height} bg-white/5 rounded-full overflow-hidden border border-white/5`}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right,${dc}88,${dc})`, boxShadow: `0 0 6px ${dc}44` }} />
      </div>
    </div>
  );
};

const IntegrityArc: React.FC<{
  name: string; integrity: number; temp: number; status: string;
  insulation: number; pressure: number; inspected: string; color: string;
}> = ({ name, integrity, temp, status, insulation, pressure, inspected, color }) => {
  const sc = status === 'Nominal' ? '#10b981' : status === 'Watch' ? '#f59e0b' : '#ef4444';
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ * (integrity / 100);
  const tempColor = temp > 15 ? '#10b981' : temp > 5 ? '#f59e0b' : '#38bdf8';

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl border transition-all duration-200 hover:border-white/20 cursor-pointer shadow-lg relative overflow-hidden group"
      style={{
        background: `radial-gradient(circle at 10% 20%, ${color}12 0%, rgba(15,23,42,0.65) 80%)`,
        borderColor: `${color}35`,
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-white/10">
        <div className="text-sm font-bold text-white tracking-wide truncate group-hover:text-cyan-300 transition-colors">
          {name}
        </div>
        <Pill label={status} color={sc} pulse={status === 'Watch'} />
      </div>

      {/* Main Content: Precision Fined Health Ring + Stacked Telemetry Rows */}
      <div className="flex items-center gap-3.5">
        {/* Fined Health Gauge */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <svg width={84} height={84} viewBox="0 0 100 100" className="flex-shrink-0">
            {/* Outer precision tick track */}
            <circle cx={50} cy={50} r={46} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="2 3" />

            {/* Fine track ring */}
            <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />

            {/* Fine active health arc */}
            <circle
              cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={4.5}
              strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 6px ${color}80)`, transition: 'stroke-dasharray 1s ease' }}
            />

            {/* Refined Center Text */}
            <text x={50} y={48} textAnchor="middle" fill="#ffffff" fontSize={20} fontWeight="900" fontFamily="monospace">
              {integrity}
            </text>
            <text x={50} y={62} textAnchor="middle" fill={color} fontSize={8.5} fontWeight="700" fontFamily="monospace" letterSpacing="0.1em">
              HEALTH%
            </text>
          </svg>
        </div>

        {/* 3 Telemetry Rows formatted to fit comfortably without text overlap */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <div className="flex items-center gap-2 min-w-0">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-xs font-mono font-medium text-slate-300 truncate">Interior</span>
            </div>
            <span className="text-sm font-black font-mono ml-2 flex-shrink-0" style={{ color: tempColor }}>
              {temp}°C
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-mono font-medium text-slate-300 truncate">Insulation</span>
            </div>
            <span className="text-sm font-black font-mono text-slate-100 ml-2 flex-shrink-0">
              R-{insulation}
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="text-xs font-mono font-medium text-slate-300 truncate">Pressure</span>
            </div>
            <span className="text-sm font-black font-mono text-slate-100 ml-2 flex-shrink-0">
              {pressure} <span className="text-xs font-bold text-slate-300 font-mono">hPa</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const WindStressChart: React.FC<{ windSpeed: number; windStress: number; isMaitri: boolean; height?: number }> = ({ windSpeed, windStress, isMaitri, height = 200 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];
    const sh = isMaitri ? [14, 16, 22, 28, 24, 19, windStress] : [10, 12, 18, 22, 20, 15, windStress];
    const wh = isMaitri ? [24, 28, 38, 48, 42, 34, windSpeed] : [32, 36, 45, 58, 52, 44, windSpeed];
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 16, right: 38, bottom: 24, left: 38 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.2)',
        textStyle: { color: '#ffffff', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const time = params[0].axisValue;
          let content = `<div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:2px;">Time: ${time}</div>`;
          params.forEach((p: any) => {
            const unit = p.seriesName === 'Stress Index' ? '/100' : ' km/h';
            content += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px;">
              <span style="color:${p.color};font-weight:600;">● ${p.seriesName}</span>
              <span style="font-weight:900;">${p.value}${unit}</span>
            </div>`;
          });
          return content;
        }
      },
      legend: {
        show: false, // Clean HTML legend rendered above avoids canvas collisions
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#cbd5e1', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: 100,
          interval: 25,
          axisLabel: { color: '#22d3ee', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } }
        },
        {
          type: 'value',
          min: 0,
          max: 100,
          interval: 25,
          axisLabel: { color: '#fbbf24', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
          splitLine: { show: false }
        },
      ],
      series: [
        {
          name: 'Stress Index', type: 'line', yAxisIndex: 0, data: sh, smooth: true,
          lineStyle: { color: '#06b6d4', width: 3 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(6,182,212,0.35)' }, { offset: 1, color: 'rgba(6,182,212,0.02)' }]) },
          itemStyle: { color: '#06b6d4' },
          markLine: {
            data: [{ yAxis: 85, name: 'Critical' }],
            lineStyle: { color: '#ef4444', type: 'dashed', width: 2 },
            label: { position: 'insideEndTop', color: '#f87171', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace', formatter: 'CRITICAL (85)' },
            symbol: ['none', 'none']
          }
        },
        {
          name: 'Wind Velocity', type: 'line', yAxisIndex: 1, data: wh, smooth: true,
          lineStyle: { color: '#f59e0b', width: 2.5, type: 'dashed' },
          itemStyle: { color: '#f59e0b' },
          showSymbol: false
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize()); ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [windStress, windSpeed, isMaitri]);

  return (
    <div className="space-y-2">
      {/* High-visibility responsive HTML legend bar that prevents any text collisions */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0" />
          <span className="font-bold text-cyan-300">Stress Index</span>
          <span className="text-slate-400 font-semibold">(0–100)</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-3 h-0.5 rounded bg-amber-400 flex-shrink-0" />
          <span className="font-bold text-amber-300">Wind</span>
          <span className="text-slate-400 font-semibold">(km/h)</span>
        </div>
      </div>
      <div ref={ref} className="w-full" style={{ height }} />
    </div>
  );
};

const OccupancyDonut: React.FC<{ current: number; capacity: number; label: string }> = ({ current, capacity, label }) => {
  const pct = Math.min(1, current / capacity);
  const r = 44; const circ = 2 * Math.PI * r; const dash = circ * pct;
  const color = pct > 0.85 ? '#ef4444' : pct > 0.65 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={108} height={108} viewBox="0 0 108 108">
        <circle cx={54} cy={54} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={54} cy={54} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 54 54)"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dasharray 1.2s ease' }} />
        <text x={54} y={50} textAnchor="middle" fill="white" fontSize={18} fontWeight="900" fontFamily="monospace">{current}</text>
        <text x={54} y={64} textAnchor="middle" fill={color} fontSize={9} fontFamily="monospace">/ {capacity}</text>
      </svg>
      <div className="text-[10px] font-mono text-slate-200 font-bold uppercase text-center">{label}</div>
      <Pill label={`${Math.round(pct * 100)}% occupied`} color={color} small />
    </div>
  );
};

const LabCard: React.FC<{ lab: any }> = ({ lab }) => {
  const isStandby = lab.status === 'Standby';
  const statusColor = isStandby ? '#cbd5e1' : '#10b981';
  const instruments: string[] = lab.equipmentList || (lab.equipment ? lab.equipment.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

  return (
    <div className="p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 hover:border-slate-500 transition-colors flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              backgroundColor: `${lab.color}15`,
              border: `1px solid ${lab.color}40`,
            }}
          >
            {lab.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
              {lab.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-mono">
              <span style={{ color: lab.color }} className="font-semibold">{lab.discipline || 'Observatory'}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-300 font-medium">Est. {lab.established}</span>
            </div>
          </div>
        </div>
        <Pill
          label={lab.status}
          color={statusColor}
          small
          pulse={!isStandby}
        />
      </div>

      {/* Mission Objective Focus */}
      <div
        className="p-3 rounded-xl border mb-3 flex items-start gap-2.5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: lab.color }} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-0.5">
            Current Research Mission
          </div>
          <div className="text-xs font-mono font-semibold text-slate-100 leading-snug">
            {lab.focus || lab.running}
          </div>
        </div>
      </div>

      {/* Core Instrumentation Badges */}
      <div>
        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
          Active Instrumentation & Sensors
        </div>
        <div className="flex flex-wrap gap-1.5">
          {instruments.map((eq: string) => (
            <span
              key={eq}
              className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs font-mono font-medium text-slate-200"
            >
              {eq}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const VehicleCard: React.FC<{ v: any }> = ({ v }) => {
  const sc = v.status === 'Nominal' ? '#10b981' : v.status === 'Watch' ? '#f59e0b' : v.status === 'Active' ? '#06b6d4' : '#cbd5e1';
  return (
    <div className="p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 hover:border-slate-500 transition-colors flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-3xl flex-shrink-0 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">{v.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-wide truncate">{v.name}</div>
              <div className="text-xs font-mono text-orange-400 mt-0.5 font-semibold truncate">{v.type}</div>
            </div>
          </div>
          <Pill label={v.status} color={sc} small pulse={v.status === 'Watch'} />
        </div>

        {/* Operational Role (1 line) */}
        <div className="my-2.5 px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-200 leading-snug">
          {v.detail}
        </div>
      </div>

      {/* Footer / Status Clearance */}
      <div className="pt-2.5 mt-auto border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
        <span className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v.status === 'Nominal' || v.status === 'Active' ? 'bg-emerald-400' : v.status === 'Watch' ? 'bg-amber-400' : 'bg-slate-400'}`} />
          <span className="text-slate-300 truncate">
            {v.status === 'Watch' ? 'Maintenance Scheduled · Base Only' : v.status === 'Standby' ? 'Standby · Ready for Deployment' : 'Fully Operational · Cleared for Traverse'}
          </span>
        </span>
      </div>
    </div>
  );
};

const CampCard: React.FC<{ camp: any }> = ({ camp }) => (
  <div className="p-5 rounded-2xl border transition-all hover:border-white/20"
    style={{ borderColor: `${camp.color}30`, background: `${camp.color}08` }}>
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{camp.icon}</span>
        <div>
          <div className="text-xs font-bold text-white">{camp.name}</div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: camp.color }}>{camp.status}</div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-black font-mono" style={{ color: camp.color }}>{camp.capacity}</div>
        <div className="text-[10px] font-mono text-slate-200 font-bold">pax</div>
      </div>
    </div>
    <p className="text-xs font-mono text-slate-200 leading-relaxed mb-3">{camp.detail}</p>
    <div className="flex flex-wrap gap-1.5">
      {camp.features.map((f: string) => (
        <span key={f} className="text-[8px] font-mono px-1.5 py-0.5 rounded border"
          style={{ borderColor: `${camp.color}33`, background: `${camp.color}10`, color: camp.color }}>{f}</span>
      ))}
    </div>
  </div>
);

const MedCard: React.FC<{ eq: any }> = ({ eq }) => {
  const Icon = eq.icon;
  const sc = eq.status === 'Active' ? '#10b981' : eq.status === 'Standby' ? '#cbd5e1' : '#10b981';

  // Support both structured items and fallback parsing from detail string
  const items: string[] = eq.items || (eq.detail ? eq.detail.split('.')[0].split(',').map((s: string) => s.trim()).filter(Boolean) : []);

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex flex-col hover:border-slate-500 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold text-white tracking-wide truncate">
            {eq.name}
          </div>
        </div>
        <Pill label={eq.status} color={sc} small />
      </div>

      <div className="my-2">
        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
          Equipment & Inventory
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item: string) => (
            <span
              key={item}
              className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs font-mono font-medium text-slate-200"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const InfrastructurePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedStationId } = useStationStore();
  const stationId = id || selectedStationId || 'maitri';
  const isMaitri = stationId === 'maitri';
  const { liveSnapshot } = useTelemetryStore();
  const snapshot = liveSnapshot[stationId];
  const env = snapshot?.environment;
  const infraData = snapshot?.infrastructure;
  const ops = snapshot?.station_ops;

  const [activeLayer, setActiveLayer] = useState<'overview' | 'structural' | 'quarters' | 'medical' | 'labs' | 'vehicles'>('overview');

  const windSpeed = env?.wind_speed ?? (isMaitri ? 32 : 44);
  const ambientTemp = env?.temperature ?? (isMaitri ? -25.2 : -18.4);
  const windStress = Math.min(100, Math.round((windSpeed / 120) * 100 * 10) / 10);
  const thermalEff = useMemo(() => {
    const base = isMaitri ? 88.0 : 96.0;
    const penalty = Math.max(0, (windSpeed - 40) * 0.15) + Math.max(0, (-30 - ambientTemp) * 0.2);
    return Math.max(65, Math.round((base - penalty) * 10) / 10);
  }, [windSpeed, ambientTemp, isMaitri]);
  const snowDrift = infraData?.snow_drift_accumulation_m ?? (isMaitri ? 0.42 : 0.25);
  const overallReadiness = ops?.domain_readiness?.infrastructure ?? (isMaitri ? 94.0 : 97.2);

  const modules = isMaitri ? [
    { id: 'a', name: 'Main Living Block (A & B Wings)', integrity: infraData?.modules?.[0]?.integrity ?? 94.0, temp: infraData?.modules?.[0]?.temp_c ?? 19.4, status: 'Nominal', r: 38, pressure: 1012, inspected: '2 days ago', color: '#06b6d4' },
    { id: 'b', name: 'Priyadarshini Lake Pump Station', integrity: infraData?.modules?.[1]?.integrity ?? 89.5, temp: infraData?.modules?.[1]?.temp_c ?? 8.2, status: 'Watch', r: 28, pressure: 998, inspected: '6 hours ago', color: '#f59e0b' },
    { id: 'c', name: 'Bulk AGO Fuel Tank Depot', integrity: infraData?.modules?.[2]?.integrity ?? 96.2, temp: infraData?.modules?.[2]?.temp_c ?? -11.5, status: 'Nominal', r: 24, pressure: 1004, inspected: '12 hours ago', color: '#06b6d4' },
    { id: 'd', name: 'Heavy Vehicle & Technical Workshop', integrity: infraData?.modules?.[3]?.integrity ?? 91.8, temp: infraData?.modules?.[3]?.temp_c ?? 16.2, status: 'Nominal', r: 32, pressure: 1010, inspected: '1 day ago', color: '#06b6d4' },
  ] : [
    { id: 'a', name: 'Elevated 3-Story Aerodynamic Habitat', integrity: infraData?.modules?.[0]?.integrity ?? 98.2, temp: infraData?.modules?.[0]?.temp_c ?? 20.8, status: 'Nominal', r: 52, pressure: 1014, inspected: '1 day ago', color: '#06b6d4' },
    { id: 'b', name: 'Quilty Bay Seawater Filter Plant', integrity: infraData?.modules?.[1]?.integrity ?? 94.5, temp: infraData?.modules?.[1]?.temp_c ?? 9.5, status: 'Nominal', r: 35, pressure: 1002, inspected: '8 hours ago', color: '#06b6d4' },
    { id: 'c', name: 'CHP Automated Power Plant', integrity: infraData?.modules?.[2]?.integrity ?? 97.4, temp: infraData?.modules?.[2]?.temp_c ?? 18.5, status: 'Nominal', r: 44, pressure: 1015, inspected: '14 hours ago', color: '#06b6d4' },
    { id: 'd', name: 'Helipad Deck & Cargo Apron', integrity: infraData?.modules?.[3]?.integrity ?? 95.0, temp: infraData?.modules?.[3]?.temp_c ?? -15.8, status: 'Nominal', r: 20, pressure: 994, inspected: '4 hours ago', color: '#06b6d4' },
  ];

  const qd = isMaitri ? {
    capacity: 40, current: 25, rooms: 14,
    areas: [
      { name: 'Sleeping Cabins (Block A)', icon: Bed, detail: '7 x 4-person heated steel cabins. Bunk beds, wardrobe, reading light. Interior 19-21C via ducted HVAC.', status: 'Nominal', health: 92, metric: '7 Cabins · 28 Beds', color: '#818cf8' },
      { name: 'Sleeping Cabins (Block B)', icon: Bed, detail: '6 x 2-person cabins for senior scientists & station commander. Double-pane insulated walls.', status: 'Nominal', health: 96, metric: '6 Cabins · 12 Beds', color: '#818cf8' },
      { name: 'Bathrooms & Sanitation', icon: Droplet, detail: '3 shared bathroom blocks, composting toilets, grey water recycling. Hot water via diesel boiler with heat recovery.', status: 'Nominal', health: 88, metric: '3 Blocks · 9 Showers', color: '#38bdf8' },
      { name: 'Main Galley & Dining Hall', icon: Star, detail: 'Central galley with 3 chef stations, industrial refrigeration, gas ranges, 40-seat dining. Pantry stocked 18 months.', status: 'Nominal', health: 97, metric: '40-seat · 3 Meals/Day', color: '#f59e0b' },
      { name: 'Common Room & Recreation', icon: Users, detail: 'TV lounge, ping pong, library (600+ books), satellite radio, board games. Critical for winter-over psychological wellbeing.', status: 'Nominal', health: 95, metric: '1 Common Room · 25 pax', color: '#a855f7' },
      { name: 'Radio Room & Communications', icon: Wifi, detail: 'HF/VHF radio for emergency contact, welfare calls, SAR coordination. Primary LEO satellite uplink 8m away.', status: 'Nominal', health: 99, metric: 'HF/VHF/Sat · 24x7', color: '#10b981' },
    ],
  } : {
    capacity: 47, current: 30, rooms: 20,
    areas: [
      { name: 'Sleeping Modules (Level 2)', icon: Bed, detail: '12 x 2-person insulated container modules with double-glazed portholes, adjustable climate, USB charging, individual lockers.', status: 'Nominal', health: 98, metric: '12 Modules · 24 Beds', color: '#818cf8' },
      { name: 'Sleeping Modules (Level 3 — Senior)', icon: Bed, detail: '6 x single-occupancy VIP modules for chief scientists. Acoustic insulation panels, independent HVAC zones.', status: 'Nominal', health: 99, metric: '6 Modules · 6 Beds', color: '#818cf8' },
      { name: 'Bathrooms & Sanitation (Dual Zone)', icon: Droplet, detail: 'Two fully plumbed zones, pressurized hot water from seawater purification + CHP heat recovery. Vacuum waste system.', status: 'Nominal', health: 97, metric: '2 Zones · 12 Showers', color: '#38bdf8' },
      { name: 'Galley, Dining & Pantry', icon: Star, detail: 'NCPOR galley with walk-in freezers (-25C), hydroponics bay (lettuce, herbs), 47-seat dining with Prydz Bay panoramic view.', status: 'Nominal', health: 99, metric: '47-seat · Hydroponics', color: '#f59e0b' },
      { name: 'Lounge, Gym & Recreation', icon: Users, detail: 'Stationary bikes, resistance bands, yoga mats, 65" smart TV, PlayStation. Daily group exercise at 07:30 hrs.', status: 'Nominal', health: 98, metric: 'Gym + AV Lounge · 47 pax', color: '#a855f7' },
      { name: 'Emergency Shelter Module', icon: ShieldCheck, detail: 'Dedicated 10-person emergency shelter at ground level with 30-day independent food/water/power supply.', status: 'Standby', health: 100, metric: '10-person · 30 Day Supply', color: '#10b981' },
    ],
  };

  const md = isMaitri ? {
    staff: '1 MO + 1 Paramedic', beds: 4, tele: true,
    equipment: [
      {
        name: 'Emergency Resuscitation Unit',
        items: ['AED Defibrillator', 'Bag-Valve-Mask', 'Crash Cart', 'ACLS Emergency Meds'],
        protocol: 'Verified Operational · Last tested: 3 days ago',
        status: 'Nominal',
        icon: Heart,
        detail: 'AED defibrillator, bag-valve-mask, crash cart with ACLS medications. Last tested: 3 days ago.'
      },
      {
        name: 'Surgical Theater (Minor Ops)',
        items: ['Sterile Minor OR Field', 'Appendectomy Kit', 'Fracture Reduction Tools', 'Ketamine Protocol'],
        protocol: 'Minor Surgical Protocol Active & Sterile',
        status: 'Nominal',
        icon: Zap,
        detail: 'Sterile field for minor surgeries: appendectomy, fracture reduction. Ketamine anesthesia protocol.'
      },
      {
        name: 'Diagnostic Equipment',
        items: ['12-Lead ECG', 'Digital X-Ray (Portable)', 'Pulse Oximetry', 'Blood Pressure Monitors', 'Glucometer', 'Hemoglobin Kit'],
        protocol: 'Point-of-Care Pathology & Vitals Calibrated',
        status: 'Nominal',
        icon: Activity,
        detail: '12-lead ECG, digital X-ray (portable), pulse oximetry, blood pressure monitors, glucometer, hemoglobin kit.'
      },
      {
        name: 'Pharmacy & Drug Storage',
        items: ['WHO Essential Medicines', 'Frostbite Treatment', 'Hypoxia Meds', 'Antidepressants', 'IV Fluids'],
        protocol: 'Cold-Climate Polar Formulary Stocked',
        status: 'Nominal',
        icon: FlaskConical,
        detail: 'WHO essential medicines + Antarctic-specific: frostbite treatment, hypoxia meds, antidepressants, IV fluids.'
      },
      {
        name: 'Telemedicine Station',
        items: ['Encrypted ISRO Satellite Link', 'AIIMS Delhi Portal', 'NCPOR Medical Board', '24x7 Teleconsultation'],
        protocol: 'Direct AIIMS Link · Last session: 6 days ago',
        status: 'Active',
        icon: Wifi,
        detail: 'Encrypted ISRO satellite video link to AIIMS Delhi & NCPOR medical board. 24x7 teleconsultation. Last session: 6 days ago.'
      },
      {
        name: 'Dental Chair',
        items: ['Basic Dental Station', 'Extraction Tools', 'Cavity Fillers', 'Local Anesthetics'],
        protocol: 'All winter-over crew dental-cleared pre-deployment',
        status: 'Nominal',
        icon: CheckCircle2,
        detail: 'Basic dental station with extraction tools, cavity fillers, local anesthetic. All winter-over crew dental-cleared before deployment.'
      },
      {
        name: 'Physiotherapy Equipment',
        items: ['TENS Machine', 'Ultrasound Therapy Unit', 'Resistance Bands', 'Rehab Mats'],
        protocol: 'Scheduled weekly ergonomic injury prevention',
        status: 'Nominal',
        icon: Users,
        detail: 'TENS machine, ultrasound therapy unit, resistance bands. Used weekly for ergonomic injury prevention.'
      },
      {
        name: 'Cold Injury Treatment Unit',
        items: ['Warm-Water Rewarming (38–42°C)', 'Frostbite Staging Kit', 'Vasodilator Infusion', 'Thermal Blankets'],
        protocol: 'High-risk Antarctic outdoor response ready',
        status: 'Standby',
        icon: Thermometer,
        detail: 'Warm-water rewarming tanks (38-42C), frostbite assessment, vasodilator protocol. Highest-risk Antarctic outdoor intervention.'
      },
    ],
  } : {
    desc: 'Bharati Medical Center — Advanced 2012 NCPOR facility. 2 MOs + 1 ICU nurse. Superior capability vs Maitri.',
    staff: '2 MOs + 1 ICU Nurse', beds: 6, tele: true,
    equipment: [
      {
        name: 'ICU-Grade Monitoring Suite',
        items: ['6-Bed SpO2 & NIBP', '12-Lead ECG & Capnography', 'Continuous Temp Probe', '72-hr UPS Battery Backup'],
        protocol: 'Multi-Parameter Continuous Telemetry',
        status: 'Nominal',
        icon: Heart,
        detail: 'Multi-parameter monitors for 6 beds: SpO2, NIBP, 12-lead ECG, capnography, temp. CHP UPS with 72-hr battery backup.'
      },
      {
        name: 'Portable CT Scanner (Mini)',
        items: ['Compact CT Imaging Ring', 'Head & Chest Scans', 'Abdomen Trauma Triage', 'Rapid Hemorrhage Detection'],
        protocol: 'Unique to Bharati · Trauma & Neuro Triage',
        status: 'Nominal',
        icon: Cpu,
        detail: 'Compact CT ring for head/chest/abdomen imaging — unique to Bharati. Critical for trauma triage and hemorrhage detection.'
      },
      {
        name: 'Full Surgical Theater',
        items: ['20 m² Sterile OR Suite', 'Shadowless Lighting Table', 'Electrocautery', 'Keyhole Instruments', 'Orthopedic Drill'],
        protocol: 'Sterile Full Surgical Capability',
        status: 'Nominal',
        icon: Zap,
        detail: '20 m2 sterile surgical suite with OR table, shadowless lighting, electrocautery, keyhole instruments, orthopedic drill.'
      },
      {
        name: 'Advanced Diagnostics',
        items: ['POCUS Portable Ultrasound', 'Digital Flat-Panel X-Ray', 'Full Blood Panel (CBC/CMP/Coags)', 'Arterial Blood Gas (ABG)'],
        protocol: 'Comprehensive On-Site Laboratory',
        status: 'Nominal',
        icon: Activity,
        detail: 'POCUS portable ultrasound, digital X-ray, full blood panel analyzer (CBC, CMP, coags), blood gas analyzer.'
      },
      {
        name: 'Pharmacy & Blood Bank',
        items: ['WHO Essential Formulary', '8-Unit O-Neg Blood Products', 'Refrigerated Blood Storage', 'Emergency Transfusion Kit'],
        protocol: 'Cold-Chain Maintained · Transfusion Protocol Active',
        status: 'Nominal',
        icon: FlaskConical,
        detail: 'WHO drugs + Antarctic formulary. 8-unit refrigerated blood products (O-neg universal). Emergency transfusion protocol in place.'
      },
      {
        name: 'Telemedicine Suite (Dual-Screen)',
        items: ['Dual Encrypted ISRO + Starlink', 'Direct to AIIMS Delhi', 'INHS Nirvana Direct Link', 'Sub-1s Low-Latency Delay'],
        protocol: 'Dual Redundancy Telepresence Active',
        status: 'Active',
        icon: Wifi,
        detail: 'Dual encrypted ISRO + Starlink stations. Direct to AIIMS Delhi, INHS Nirvana, ISRO Space Medicine. Sub-1s delay.'
      },
      {
        name: 'Mental Health Room',
        items: ['Private Soundproof Suite', 'NCPOR Psychological Video Link', 'Circadian Lighting Array', 'Therapeutic Audio System'],
        protocol: 'Polar Isolation & Wellbeing Support Active',
        status: 'Active',
        icon: Users,
        detail: 'Private counseling room, soundproofing, secure video sessions with NCPOR psychological support team.'
      },
      {
        name: 'Hyperbaric Chamber (1-Person)',
        items: ['1-Person Hyperbaric O2 Pod', 'Decompression Protocol', 'Prydz Bay Dive Support', 'CO Poisoning Emergency Protocol'],
        protocol: 'Certified Operator On Standby',
        status: 'Standby',
        icon: CheckCircle2,
        detail: '1-person hyperbaric O2 pod for decompression sickness from Prydz Bay diving and CO poisoning treatment.'
      },
    ],
  };

  const labsData = isMaitri ? [
    {
      id: 'atmos',
      name: 'Atmosphere & Ozone Science Lab',
      discipline: 'Atmospheric Physics',
      icon: '🌬️',
      color: '#00e5ff',
      status: 'Active',
      focus: 'Stratospheric Ozone Column & UV Radiation Monitoring',
      equipmentList: ['Dobson Ozonometer', 'MICROTOPS II', 'Brewer Spectrophotometer', 'GM Counter'],
      network: 'WMO Global Atmosphere Watch (GAW)',
      metric: '24x7 Real-Time Uplink',
      running: 'Stratospheric ozone column measurement, aerosol optical depth, UV radiation monitoring',
      equipment: 'Dobson ozonometer, MICROTOPS II, Brewer spectrophotometer, GM counter',
      output: '24x7 ozone data transmitted to WMO Global Atmosphere Watch network',
      established: '1989'
    },
    {
      id: 'earth',
      name: 'Earth Sciences & Glaciology Observatory',
      discipline: 'Glaciology & Geophysics',
      icon: '⛰️',
      color: '#10b981',
      status: 'Active',
      focus: 'Bedrock Geophysics & Ice Sheet Velocity Tracking (4 mm/yr)',
      equipmentList: ['GPR Ground-Penetrating Radar', '4-Node Seismometer Array', 'Ice Core Drill Rig', 'GNSS Geodetic Receivers'],
      network: 'IPCC Antarctic Assessment',
      metric: 'Continuous Ice Mass Budget',
      running: 'Ice core analysis, bedrock geophysics, GNSS monitoring of ice sheet movement at 4 mm/yr precision',
      equipment: 'GPR ground-penetrating radar, seismometer network (4 nodes), ice core drill rig, GNSS geodetic receivers',
      output: 'Annual ice velocity & mass balance reports for IPCC Antarctic assessment',
      established: '1992'
    },
    {
      id: 'biology',
      name: 'Biology & Microbiology Laboratory',
      discipline: 'Polar Extremophiles',
      icon: '🦠',
      color: '#a855f7',
      status: 'Active',
      focus: 'Schirmacher Oasis Microorganism Cultures & Psychrophilic Enzymes',
      equipmentList: ['Cryo-Microscope', 'PCR Thermocycler', 'Laminar Flow Hood', 'Centrifuge', '6x -80°C Freezers'],
      network: 'Journal of Antarctic Science',
      metric: '3 Active Research Projects',
      running: 'Extremophile microorganism culture from Schirmacher Oasis lakes, psychrophilic enzyme research',
      equipment: 'Cryo-microscope, PCR thermocycler, laminar flow hood, centrifuge, -80C ultra-low freezer (6 units)',
      output: 'Research published in Journal of Antarctic Science; 3 active projects',
      established: '1998'
    },
    {
      id: 'met',
      name: 'Meteorology & Weather Observatory',
      discipline: 'Synoptic Meteorology',
      icon: '🌡️',
      color: '#f59e0b',
      status: 'Active',
      focus: '3-Hour WMO Synoptic Observations & High-Altitude Radiosonde Soundings',
      equipmentList: ['Automated Weather Station (AWS)', 'RS41 Radiosonde System', 'Vaisala Sensor Suite', 'Stevenson Screen'],
      network: 'IMD & ECMWF Global Models',
      metric: '00Z & 12Z Daily Launches',
      running: 'Continuous synoptic weather observations every 3 hours for WMO SYNOP; radiosonde balloon launches at 00Z & 12Z',
      equipment: 'AWS, RS41 radiosonde + balloon launcher, VAISALA sensors, Stevenson screen',
      output: 'SYNOP/TEMP data transmitted to IMD & ECMWF',
      established: '1989'
    },
    {
      id: 'seismo',
      name: 'Geophysics & Seismology Station',
      discipline: 'Seismology & Tectonics',
      icon: '📡',
      color: '#f97316',
      status: 'Standby',
      focus: 'Antarctic Micro-Seismic & Global Teleseismic Waveform Recording',
      equipmentList: ['Broadband Seismometer (STS-2)', 'MEMS Accelerometer Array', 'GPS Precision Timing', 'Bedrock Vault Installation'],
      network: 'GEOFON Global Seismic Net',
      metric: 'Austral Winter Data-Only',
      running: 'Antarctic micro-seismic monitoring and global P/S-wave teleseismic events. Currently data-only mode (austral winter)',
      equipment: 'Broadband seismometer (STS-2), MEMS accelerometer array, GPS timing, quiet vaulted bedrock installation',
      output: 'Data shared with GEOFON global seismic network in real-time',
      established: '2003'
    },
  ] : [
    {
      id: 'ocean',
      name: 'Prydz Bay Marine & Oceanography Lab',
      discipline: 'Marine Oceanography',
      icon: '🌊',
      color: '#38bdf8',
      status: 'Active',
      focus: 'Prydz Bay CTD Profiling, Sea-Ice Sonar & Krill Biomass Surveys',
      equipmentList: ['SEABIRD SBE19+ CTD', 'ADCP Current Profiler', 'ROPOS ROV (500m)', 'Doppler Sonar', 'Plankton Nets'],
      network: 'CLIVAR Ocean Circulation',
      metric: '5 Active Research Missions',
      running: 'Prydz Bay CTD profiling, ocean current measurement, sea-ice thickness sonar, krill biomass surveys',
      equipment: 'SEABIRD SBE19+ CTD, ADCP current profiler, ROPOS ROV (500m depth), Doppler sonar, plankton nets',
      output: 'Southern Ocean circulation data for CLIVAR program; 5 active research missions',
      established: '2012'
    },
    {
      id: 'cryo',
      name: 'Cryosphere & Ice Sheet Dynamics Lab',
      discipline: 'Cryosphere Dynamics',
      icon: '🧊',
      color: '#00e5ff',
      status: 'Active',
      focus: 'Larsemann Hills Ice Sheet Mass Balance & InSAR Glacier Tracking',
      equipmentList: ['Differential GNSS (mm-level)', '28-Site Ablation Stake Array', 'Ice Radar', 'DJI M300 Photogrammetry Drone'],
      network: 'GRACE-FO Satellite Validation',
      metric: 'Sub-Centimeter Mass Tracking',
      running: 'Larsemann Hills ice mass balance via GNSS, InSAR correlation, surface ablation stake network across Prydz Bay glacier tributaries',
      equipment: 'Differential GNSS (mm-level), ablation stake array (28 sites), ice radar, drone photogrammetry (DJI M300)',
      output: 'Antarctic ice mass budget contribution to GRACE-FO satellite data validation',
      established: '2012'
    },
    {
      id: 'atmos2',
      name: 'Atmosphere Chemistry & Aerosol Lab',
      discipline: 'Aerosol Chemistry',
      icon: '🌬️',
      color: '#10b981',
      status: 'Active',
      focus: 'Southern Ocean Aerosols, Black Carbon & Baseline CO2/CH4 Monitoring',
      equipmentList: ['AERONET Photometer', 'Dobson Ozonometer', 'DMA Particle Sizer', 'GC-FID Trace Gas Analyzer', 'FTIR'],
      network: 'WMO GAW Baseline Network',
      metric: 'Continuous Clean-Air Sampling',
      running: 'Southern Ocean aerosol chemistry (sea-salt, DMS, black carbon), total column ozone, NOAA baseline CO2/CH4',
      equipment: 'AERONET photometer, Dobson ozonometer, DMA particle sizer, GC-FID trace gas analyzer, FTIR',
      output: 'India contribution to WMO GAW network; 3 published papers last 12 months',
      established: '2012'
    },
    {
      id: 'bio',
      name: 'Biology, Ecology & Krill Lab',
      discipline: 'Marine Ecology',
      icon: '🦠',
      color: '#a855f7',
      status: 'Active',
      focus: 'Antarctic Krill Breeding Cycles, Penguin Colonies & Micro-Plastics',
      equipmentList: ['Dissecting Microscope', 'MinION DNA Sequencer', '-30°C Cold Room', 'GF/C Filtration', 'Nikon Camera Traps'],
      network: 'CCAMLR Fisheries Body',
      metric: 'Biomass Stock Assessment',
      running: 'Antarctic krill breeding cycle study, penguin colony monitoring, micro-plastic contamination in fish tissue',
      equipment: 'Dissecting microscope, MinION DNA sequencer, cold room (-30C), GF/C filtration, Nikon camera trap network',
      output: 'Krill biomass estimates fed to CCAMLR international fisheries management body',
      established: '2013'
    },
    {
      id: 'aurora',
      name: 'Space Weather & Aurora Observatory',
      discipline: 'Space Weather',
      icon: '🌠',
      color: '#f59e0b',
      status: 'Active',
      focus: 'Aurora Australis Spectroscopy & Solar Wind-Magnetosphere Coupling',
      equipmentList: ['All-Sky Imager (ASI)', 'Spectrograph', 'Fluxgate Magnetometer', 'VLF Receiver Antenna', 'Riometer'],
      network: 'Indian Inst of Geomagnetism',
      metric: 'Real-Time Space Alerts',
      running: 'Aurora australis spectroscopy, solar wind-magnetosphere coupling, conjugate point ionospheric studies',
      equipment: 'All-sky imager (ASI), spectrograph, fluxgate magnetometer, VLF receiver antenna, riometer',
      output: 'Real-time aurora forecasts; data shared with Indian Institute of Geomagnetism (IIG)',
      established: '2012'
    },
    {
      id: 'geo',
      name: 'Geology & Rock Petrology Lab',
      discipline: 'Petrology & Geology',
      icon: '⛰️',
      color: '#f97316',
      status: 'Standby',
      focus: 'Rock Sample Preparation & Thin-Section Coastline Analysis',
      equipmentList: ['Thin-Section Polisher', 'Polarizing Petrographic Microscope', 'XRF Rock Analyzer', '-20°C Sample Vault'],
      network: 'Australian Antarctic Div Collab',
      metric: 'Austral Winter Standby',
      running: 'Rock sample preparation and thin-section analysis from Prydz Bay coastline surveys. Reduced for winter season.',
      equipment: 'Thin-section grinder/polisher, polarizing petrographic microscope, XRF rock analyzer, -20C sample archive',
      output: 'Prydz Bay geological evolution; collaboration with Australian Antarctic Division',
      established: '2014'
    },
  ];

  const vd = isMaitri ? {
    desc: 'Maitri Vehicles',
    garage: { name: 'Main Technical Workshop & Garage', size: '600 m2', capacity: '6 heavy vehicles indoor', heating: 'Diesel-fired forced air, 18C interior' },
    vehicles: [
      { id: 'pb1', name: 'PistenBully 300W Polar', type: 'Snow Groomer / Traverse Tractor', icon: '🚛', status: 'Nominal', health: 94, hours: 2840, detail: 'Primary 100 km Maitri-coast heavy traverse vehicle with 4-crew heated cab.', color: '#06b6d4' },
      { id: 'pb2', name: 'PistenBully 300W Polar #2', type: 'Snow Groomer / Backup Traverse', icon: '🚛', status: 'Watch', health: 78, hours: 4120, detail: 'Backup traverse tractor restricted to base ops pending engine oil cooler service.', color: '#f59e0b' },
      { id: 'kasb', name: 'Kassbohrer SNO CAT 1', type: 'Heavy Cargo Hauler', icon: '🚜', status: 'Nominal', health: 91, hours: 1980, detail: 'Heavy 15-tonne towing hauler for crevasse-route fuel and cargo sledges.', color: '#06b6d4' },
      { id: 't4', name: 'Mahindra Bolero 4x4 (Modified)', type: 'Station Ground Vehicle', icon: '🚙', status: 'Nominal', health: 88, hours: 6200, detail: 'Studded-tire 4x4 for Schirmacher Oasis rocky perimeter and lake survey ops.', color: '#10b981' },
      { id: 'atv1', name: 'Polaris Sportsman 850 ATV', type: 'All-Terrain Vehicle', icon: '🏍️', status: 'Nominal', health: 96, hours: 520, detail: 'Rapid-response all-terrain vehicle with 80 km range for field instrument checks.', color: '#10b981' },
      { id: 'snow1', name: 'Yamaha SRViper Snowmobile x2', type: 'Light Snowmobiles', icon: '🏂', status: 'Nominal', health: 99, hours: 310, detail: 'High-speed snowmobiles for rapid AWS sensor checks and emergency medevac.', color: '#10b981' },
    ],
  } : {
    desc: 'Bharati Vehicle Fleet — Coastal marine and helicopter operations. Garage at ground level under elevated structure.',
    garage: { name: 'Integrated Vehicle & Cargo Apron Garage', size: '1,200 m2', capacity: '8 vehicles + helicopter apron', heating: 'CHP waste-heat floor heating, 15C interior' },
    vehicles: [
      { id: 'heli', name: 'HAL Dhruv ALH / Ka-32 Helipad', type: 'Helicopter Landing & Servicing', icon: '🚁', status: 'Standby', health: 100, hours: 0, detail: 'Rooftop 20×20m helipad with crane and tie-down deck for November aviation assets.', color: '#38bdf8' },
      { id: 'zodiac', name: 'Zodiac Milpro FC470 RIB x3', type: 'Rigid Inflatable Boats (Marine)', icon: '🚤', status: 'Active', health: 97, hours: 245, detail: 'Triple RHIBs equipped with 60HP outboards and GPS for Prydz Bay marine science.', color: '#38bdf8' },
      { id: 'pb1b', name: 'PistenBully 600 Polar (Heavy)', type: 'Heavy Tracked Snow Machine', icon: '🚛', status: 'Nominal', health: 97, hours: 1240, detail: 'Heavy 6-person tracked snow machine for terrain grading and cargo hauling.', color: '#06b6d4' },
      { id: 'kassb', name: 'Kassbohrer All-Terrain Vehicle', type: 'Cargo Transport', icon: '🚜', status: 'Nominal', health: 93, hours: 890, detail: 'Amphibious 10-tonne payload carrier between coastal mooring and station.', color: '#06b6d4' },
      { id: 'atv', name: 'Polaris Sportsman 1000 ATV x2', type: 'All-Terrain Vehicles', icon: '🏍️', status: 'Nominal', health: 99, hours: 180, detail: 'Dual extended-range ATVs (90 km) for rocky Larsemann Hills field access.', color: '#10b981' },
      { id: 'sled', name: 'Dog Sled Heritage Display', type: 'Historical Exhibit', icon: '🛷', status: 'Standby', health: 100, hours: 0, detail: 'Historical pre-mechanized expedition sled preserved under Antarctic Treaty protocol.', color: '#64748b' },
    ],
  };

  const sd = isMaitri ? {
    season: 'November - March (Antarctic Summer)',
    totalExtra: 15,
    camps: [
      { name: 'Summer Annex Module Block C', icon: '🏕️', color: '#f59e0b', capacity: 8, status: 'Active (Nov-Mar)', detail: 'Pre-fabricated temporary steel modules alongside Block B. 4 x 2-person rooms with basic heating, shared bathroom access. Deployed annually Oct, demobilized March.', features: ['4 x 2-person rooms', 'Shared bath from Block B', 'Basic heated steel panels', 'Oct-Mar deployment'] },
      { name: 'Field Science Camp — Schirmacher Lake', icon: '⛺', color: '#10b981', capacity: 6, status: 'Active (Dec-Feb)', detail: 'Remote camp 3 km at Priyadarshini Lake for glaciology and limnology. Scott Polar tents (rated -55C), portable stove, VHF radio, EPIRB beacon. Teams rotate weekly.', features: ['Scott Polar tents x3', 'Rated to -55C', 'Weekly crew rotation', '3 km from station'] },
      { name: 'Aviation Forward Operating Camp', icon: '🚁', color: '#38bdf8', capacity: 4, status: 'Active (Nov-Jan)', detail: 'Temporary camp at aircraft ingress zone for helicopter crews and engineers. Containerized unit, portable generator, satellite phone, aviation fuel staging.', features: ['Aviation crew 4 pax', 'Containerized portable unit', 'Fuel staging area', 'Sat phone + VHF'] },
    ],
  } : {
    season: 'November - March (Antarctic Summer)',
    desc: 'Bharati expansion to 47 pax vs 30 winter-over, with researchers arriving by helicopter from vessel MV SCI.',
    totalExtra: 17,
    camps: [
      { name: 'Upper Deck Research Suite Extension', icon: '🏕️', color: '#38bdf8', capacity: 8, status: 'Active (Nov-Mar)', detail: 'Level 4 rooftop container block: 4 x 2-person climate-controlled lab/sleeping combo units. Panoramic Prydz Bay views for aurora observation. R-60 insulation.', features: ['4 x 2-person combo suites', 'Panoramic Prydz Bay view', 'R-60 insulation', 'Nov-Mar only'] },
      { name: 'Marine Field Camp — Quilty Bay Ice Edge', icon: '⛺', color: '#10b981', capacity: 6, status: 'Active (Dec-Feb)', detail: 'Seasonal camp at Quilty Bay fast-ice for seal tagging, ice drilling, ROV ops. Pyramid tents on sea ice, 500m comms cable. Emergency dry suits on-site.', features: ['6-person pyramid tents', 'Sea-ice ice anchors', 'ROV deployment site', 'Emergency dry suits'] },
      { name: 'Penguin Colony Monitoring Camp', icon: '🐧', color: '#a855f7', capacity: 3, status: 'Active (Nov-Feb)', detail: 'Observation camp at Adelie & Emperor rookery, 4 km east. 3 biologists, minimal-impact protocol. Thermal cameras and microphone arrays. Zero-waste camp.', features: ['3-person ecology team', 'Zero-waste protocol', 'Thermal camera hide', '4 km east of station'] },
      { name: 'Logistics Overflow Container Block', icon: '📦', color: '#f59e0b', capacity: 6, status: 'Active (Nov-Jan)', detail: 'ISO container accommodation at cargo apron for logistics and vessel crew during resupply operations. 3-bunk per container, climate control, shared sanitation.', features: ['ISO container bunkrooms', '6 logistics crew', 'Cargo apron proximity', 'Jan deployment peak'] },
    ],
  };

  const layers = [
    { id: 'overview' as const, label: 'Overview', icon: <Compass className="w-4 h-4" />, color: '#06b6d4' },
    { id: 'structural' as const, label: 'Structural', icon: <Building2 className="w-4 h-4" />, color: '#06b6d4' },
    { id: 'quarters' as const, label: 'Living Quarters', icon: <Bed className="w-4 h-4" />, color: '#818cf8' },
    { id: 'medical' as const, label: 'Medical Clinic', icon: <Heart className="w-4 h-4" />, color: '#ef4444' },
    { id: 'labs' as const, label: 'Labs & Obs', icon: <FlaskConical className="w-4 h-4" />, color: '#10b981' },
    { id: 'vehicles' as const, label: 'Vehicles', icon: <Truck className="w-4 h-4" />, color: '#f97316' },
  ];

  const activeLabsCount = labsData.filter(l => l.status === 'Active').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* HEADER */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 60%, rgba(6,182,212,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(129,140,248,0.05) 0%, transparent 50%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-cyan-400" />
              Infrastructure
              <span className="text-cyan-400">{isMaitri ? '· Maitri' : '· Bharati'}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=infrastructure`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4" /> Decision Intel
            </button>
          </div>
        </div>
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Overall Readiness', val: `${overallReadiness}%`, sub: `${modules.filter(m => m.status === 'Nominal').length}/${modules.length} modules nominal`, color: overallReadiness > 90 ? '#10b981' : '#f59e0b', icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'Wind Stress Index', val: `${windStress}/100`, sub: `${windSpeed} km/h polar wind`, color: windStress > 70 ? '#ef4444' : windStress > 40 ? '#f59e0b' : '#10b981', icon: <Wind className="w-4 h-4" /> },
            { label: 'Thermal Efficiency', val: `${thermalEff}%`, sub: 'Indoor 19-21C target', color: thermalEff > 85 ? '#10b981' : '#f59e0b', icon: <Thermometer className="w-4 h-4" /> },
            { label: 'Snow Drift Height', val: `${snowDrift.toFixed(2)} m`, sub: '1.20 m critical threshold', color: snowDrift > 0.8 ? '#f59e0b' : '#10b981', icon: <CloudSnow className="w-4 h-4" /> },
            { label: 'Occupancy', val: `${qd.current}/${qd.capacity}`, sub: `${Math.round((qd.current / qd.capacity) * 100)}% capacity`, color: '#818cf8', icon: <Users className="w-4 h-4" /> },
            { label: 'Active Labs', val: `${activeLabsCount}/${labsData.length}`, sub: 'Research experiments running', color: '#10b981', icon: <FlaskConical className="w-4 h-4" /> },
          ].map(kpi => (
            <div key={kpi.label} className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all">
              <div className="flex items-center justify-between text-xs font-mono text-slate-200 font-bold mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-xs font-mono text-slate-300 font-medium mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LAYER NAV */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {layers.map(l => {
          const isActive = activeLayer === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setActiveLayer(l.id)}
              className="p-3.5 rounded-2xl border text-center cursor-pointer transition-all duration-200 group relative overflow-hidden"
              style={isActive
                ? {
                  background: `${l.color}20`,
                  borderColor: `${l.color}80`,
                  boxShadow: `0 0 16px ${l.color}25, inset 0 1px 0 rgba(255,255,255,0.1)`,
                }
                : {
                  background: `${l.color}08`,
                  borderColor: `${l.color}25`,
                }
              }
            >
              <div
                className="flex justify-center mb-1.5 transition-transform duration-200 group-hover:scale-110"
                style={{ color: l.color }}
              >
                {l.icon}
              </div>
              <div
                className={`text-[9px] font-mono font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-cyan-300'
                  }`}
              >
                {l.label}
              </div>
              {isActive && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }}
                />
              )}
            </button>
          );
        })}
      </div>


      {/* OVERVIEW */}
      {activeLayer === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Building Module Health Matrix
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-200 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>4 Modules Monitored</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modules.map(m => (
                  <IntegrityArc key={m.id} name={m.name} integrity={m.integrity} temp={m.temp}
                    status={m.status} insulation={m.r} pressure={m.pressure} inspected={m.inspected} color={m.color} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3.5">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                    <Wind className="w-4 h-4" /> Environment Stress (24h)
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{windStress > 70 ? 'CRITICAL' : windStress > 40 ? 'ELEVATED' : 'NOMINAL'}</span>
                  </div>
                </div>

                <WindStressChart windSpeed={windSpeed} windStress={windStress} isMaitri={isMaitri} height={190} />

                {/* 2x2 Grid of High-Visibility Micro-KPIs */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { l: 'Max Wind Today', v: `${isMaitri ? 58 : 72} km/h`, c: '#f59e0b', sub: 'Peak 24h gust' },
                    { l: 'Critical Limit', v: '85/100', c: '#ef4444', sub: 'Structural ceiling' },
                    { l: 'Foundation Vib', v: `${isMaitri ? '0.4' : '0.2'} mm/s`, c: '#10b981', sub: 'Bedrock damping' },
                    { l: 'Snow Drift Status', v: snowDrift > 0.8 ? 'PLOW REQ' : 'CLEAR', c: snowDrift > 0.8 ? '#f59e0b' : '#10b981', sub: `${snowDrift.toFixed(2)}m perimeter` },
                  ].map(r => (
                    <div key={r.l} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                      <div className="text-[10px] font-mono text-slate-300 font-bold uppercase truncate">{r.l}</div>
                      <div className="text-base font-black font-mono my-0.5" style={{ color: r.c }}>{r.v}</div>
                      <div className="text-[10px] font-mono text-slate-400 font-medium">{r.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl flex flex-col items-center gap-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold self-start flex items-center gap-2">
                  <Users className="w-4 h-4" /> Station Occupancy
                </div>
                <OccupancyDonut current={qd.current} capacity={qd.capacity} label="Personnel on station" />
                <div className="text-xs font-mono text-center text-slate-200 font-bold">+{sd.totalExtra} summer expansion planned</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STRUCTURAL */}
      {activeLayer === 'structural' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider icon={<Building2 className="w-6 h-6" />}
              title="Station Building Modules"
              color="#06b6d4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {modules.map(m => (
                <IntegrityArc key={m.id} name={m.name} integrity={m.integrity} temp={m.temp}
                  status={m.status} insulation={m.r} pressure={m.pressure} inspected={m.inspected} color={m.color} />
              ))}
            </div>
            {/* Wind Stress Telemetry — Full Width 24h History */}
            <div className="p-6 rounded-2xl border border-cyan-500/30 space-y-5 shadow-2xl relative overflow-hidden"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.12) 0%, rgba(15,23,42,0.85) 100%)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Wind Stress Telemetry — 24h History
                    </h3>
                    <p className="text-xs font-mono text-slate-200 mt-0.5">
                      Real-time structural stress correlation with Antarctic wind velocity
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>24H SENSOR STREAM NOMINAL</span>
                </div>
              </div>

              {/* High-visibility Telemetry Graph */}
              <WindStressChart windSpeed={windSpeed} windStress={windStress} isMaitri={isMaitri} height={240} />

              {/* 6 High-Contrast Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                {[
                  { label: 'Current Wind', val: `${windSpeed} km/h`, color: '#f59e0b', sub: 'Instantaneous speed', icon: <Wind className="w-4 h-4" /> },
                  { label: 'Stress Index', val: `${windStress}/100`, color: windStress > 70 ? '#ef4444' : '#06b6d4', sub: 'Dynamic load index', icon: <Activity className="w-4 h-4" /> },
                  { label: 'Critical Threshold', val: '85/100', color: '#ef4444', sub: 'Safety threshold', icon: <AlertTriangle className="w-4 h-4" /> },
                  { label: 'Foundation Vibration', val: `${isMaitri ? '0.4' : '0.2'} mm/s`, color: '#10b981', sub: 'Bedrock damping', icon: <Activity className="w-4 h-4" /> },
                  { label: 'Max Wind Recorded', val: `${isMaitri ? 58 : 72} km/h`, color: '#f59e0b', sub: 'Peak 24h gust', icon: <Wind className="w-4 h-4" /> },
                  { label: 'Snow Drift Clearance', val: snowDrift > 0.8 ? 'PLOW REQ' : 'CLEAR', color: snowDrift > 0.8 ? '#f59e0b' : '#10b981', sub: 'Perimeter check', icon: <CheckCircle2 className="w-4 h-4" /> },
                ].map(r => (
                  <div
                    key={r.label}
                    className="p-3.5 rounded-xl border flex flex-col justify-between"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200 mb-1">
                      <span className="truncate">{r.label}</span>
                      <span style={{ color: r.color }}>{r.icon}</span>
                    </div>
                    <div className="text-xl font-black font-mono my-1 tracking-tight" style={{ color: r.color }}>
                      {r.val}
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 font-semibold">
                      {r.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVING QUARTERS */}
      {activeLayer === 'quarters' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <SectionDivider icon={<Bed className="w-6 h-6" />}
              title="Living Quarters & Habitat Facilities"
              color="#818cf8" />
            {/* HERO HABITAT TELEMETRY DECK */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
              {/* Left Command Hub: 5 cols on lg */}
              <div
                className="lg:col-span-5 p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">Station Habitability Core</h3>
                      <p className="text-xs font-mono text-slate-200">Bedrock Polar Habitat · Winter Crew</p>
                    </div>
                  </div>
                  <Pill label="63% OCCUPIED" color="#10b981" />
                </div>

                {/* Central Orbital HUD Dial */}
                <div className="my-3 flex flex-col items-center justify-center relative">
                  <svg width={136} height={136} viewBox="0 0 136 136" className="flex-shrink-0">
                    {/* Outer dashed precision track */}
                    <circle cx={68} cy={68} r={60} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} strokeDasharray="3 4" />
                    {/* Background track */}
                    <circle cx={68} cy={68} r={50} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9} />
                    {/* Active gradient arc */}
                    <circle
                      cx={68}
                      cy={68}
                      r={50}
                      fill="none"
                      stroke="url(#occupancyGrad)"
                      strokeWidth={9}
                      strokeLinecap="round"
                      strokeDasharray={`${(2 * Math.PI * 50) * (qd.current / qd.capacity)} ${2 * Math.PI * 50}`}
                      transform="rotate(-90 68 68)"
                      style={{ transition: 'stroke-dasharray 1.2s ease' }}
                    />
                    <defs>
                      <linearGradient id="occupancyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                    <text x={68} y={63} textAnchor="middle" fill="#ffffff" fontSize={28} fontWeight="900" fontFamily="monospace">
                      {qd.current}
                    </text>
                    <text x={68} y={80} textAnchor="middle" fill="#34d399" fontSize={11} fontWeight="700" fontFamily="monospace" letterSpacing="0.05em">
                      / {qd.capacity} BEDS
                    </text>
                  </svg>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono font-bold text-slate-100">
                      {qd.capacity - qd.current} BEDS AVAILABLE
                    </span>
                  </div>
                </div>

                {/* Bottom Segmented Allocation Visualizer */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-medium">Station Crew Allocation</span>
                    <span className="text-emerald-300 font-bold">{Math.round((qd.current / qd.capacity) * 100)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/60">
                    <div
                      className="h-full rounded-l-full transition-all duration-1000"
                      style={{
                        width: `${(qd.current / (qd.capacity + sd.totalExtra)) * 100}%`,
                        background: '#10b981',
                      }}
                    />
                    <div
                      className="h-full rounded-r-full transition-all duration-1000 opacity-90"
                      style={{
                        width: `${(sd.totalExtra / (qd.capacity + sd.totalExtra)) * 100}%`,
                        background: '#f59e0b',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-slate-200">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {qd.current} Winter Crew
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      +{sd.totalExtra} Summer Surge
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: 4 Clean, Simple Metric Cards (7 cols on lg in a 2x2 grid) */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Cabins Inventory */}
                <div className="p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        <Bed className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                        Private Sleeping Cabins
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                      100% ONLINE
                    </span>
                  </div>

                  <div className="my-auto py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-sky-400">
                        {qd.rooms}
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-200">
                        Cabins Equipped
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-2">
                      14 / 14 Nominal · Block A, B & Commander Quarters
                    </p>
                  </div>
                </div>

                {/* 2. Microclimate & Thermal Envelope */}
                <div className="p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        <Thermometer className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                        Interior Climate & HVAC
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      TARGET MET
                    </span>
                  </div>

                  <div className="my-auto py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-orange-400">
                        19 - 21°C
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Comfort 98%
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-2">
                      Living Modules +20.2°C · Ext -28°C · R-38 Core
                    </p>
                  </div>
                </div>

                {/* 3. Water Life Support & Quota */}
                <div className="p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        <Droplet className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                        Hydration & Water Quota
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      QUOTA ACTIVE
                    </span>
                  </div>

                  <div className="my-auto py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-cyan-400">
                        {isMaitri ? '25' : '30'}
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-200">
                        L/day per pax
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 ml-auto">
                        92% Recycled
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-2">
                      Reserve: 18,000 L · Priyadarshini Heated Pipeline
                    </p>
                  </div>
                </div>

                {/* 4. Summer Expedition Surge Readiness */}
                <div className="p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Tent className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                        Summer Surge Expansion
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      NOV - FEB WINDOW
                    </span>
                  </div>

                  <div className="my-auto py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-amber-400">
                        +{sd.totalExtra}
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-200">
                        Additional Beds
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 ml-auto">
                        Peak 55 Pax
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 mt-2">
                      Prefabricated Annex Pods · 100% Deployment Ready
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {qd.areas.map((area) => {
                const Icon = area.icon;
                return (
                  <div
                    key={area.name}
                    className="p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 transition-colors duration-200 hover:border-slate-500 relative flex flex-col justify-between"
                  >
                    {/* Top Header: Icon, Name, and Status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="p-2.5 rounded-xl border flex-shrink-0"
                          style={{
                            backgroundColor: `${area.color}15`,
                            borderColor: `${area.color}40`,
                            color: area.color,
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white tracking-wide truncate">
                            {area.name}
                          </h4>
                          <span className="text-xs font-mono text-slate-200 font-medium">Habitat Facility</span>
                        </div>
                      </div>
                      <Pill label={area.status} color={area.status === 'Nominal' ? '#10b981' : '#cbd5e1'} small />
                    </div>

                    {/* Highlighted Main Content Metric Banner */}
                    <div
                      className="p-3 rounded-xl border flex items-center justify-between mt-auto"
                      style={{
                        background: 'rgba(15,23,42,0.6)',
                        borderColor: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: area.color }}
                        />
                        <span className="text-[11px] font-mono font-semibold text-slate-200 uppercase tracking-wider">
                          Capacity
                        </span>
                      </div>
                      <span
                        className="text-sm sm:text-base font-bold font-mono tracking-tight"
                        style={{ color: area.color }}
                      >
                        {area.metric}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MEDICAL */}
      {activeLayer === 'medical' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <SectionDivider icon={<Heart className="w-6 h-6" />}
              title="Medical Clinic & Emergency Healthcare Facilities"
              subtitle={md.desc} color="#ef4444" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Medical Staff', val: md.staff, color: '#ef4444', icon: <Users className="w-5 h-5" /> },
                { label: 'Hospital Beds', val: `${md.beds} ICU beds`, color: '#f97316', icon: <Bed className="w-5 h-5" /> },
                { label: 'Telemedicine', val: md.tele ? 'ACTIVE' : 'OFFLINE', color: '#10b981', icon: <Wifi className="w-5 h-5" /> },
                { label: 'Med Readiness', val: '100%', color: '#10b981', icon: <ShieldCheck className="w-5 h-5" /> },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 text-center">
                  <div className="flex justify-center mb-2 text-rose-400">{s.icon}</div>
                  <div className="text-xs font-mono text-slate-300 font-bold uppercase mb-1">{s.label}</div>
                  <div className="text-base font-black font-mono" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {md.equipment.map(eq => <MedCard key={eq.name} eq={eq} />)}
            </div>
          </div>
        </div>
      )}

      {/* LABS */}
      {activeLayer === 'labs' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <SectionDivider icon={<FlaskConical className="w-6 h-6" />}
              title={`${isMaitri ? 'Maitri' : 'Bharati'} Research Laboratories & Scientific Observatories`}
              color="#10b981" />

            {/* Quick KPI Overview Deck */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-center">
                <div className="text-xs font-mono text-slate-300 font-bold uppercase mb-1">Active Observatories</div>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {labsData.filter(l => l.status === 'Active').length} / {labsData.length} Online
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-center">
                <div className="text-xs font-mono text-slate-300 font-bold uppercase mb-1">Continuous Monitoring</div>
                <div className="text-xl font-black font-mono text-cyan-400">
                  {isMaitri ? 'Since 1989 · 35+ Yrs' : 'Since 2012 · 12+ Yrs'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-center">
                <div className="text-xs font-mono text-slate-300 font-bold uppercase mb-1">Data Transmission</div>
                <div className="text-xl font-black font-mono text-indigo-400">100% Real-Time</div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-center">
                <div className="text-xs font-mono text-slate-300 font-bold uppercase mb-1">Global Networks</div>
                <div className="text-xl font-black font-mono text-amber-400">WMO · IPCC · GEOFON</div>
              </div>
            </div>

            {/* 2-Column Responsive High-Impact Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {labsData.map(lab => (
                <LabCard key={lab.id} lab={lab} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VEHICLES */}
      {activeLayer === 'vehicles' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <SectionDivider icon={<Truck className="w-6 h-6" />}
              title={vd.desc}
              color="#f97316" />

            {/* High-Impact Garage Infrastructure Deck */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Garage Facility */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex-shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Central Garage Facility
                  </div>
                  <div className="text-base font-bold text-white truncate">
                    {vd.garage.name}
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-1 font-medium">
                    Heavy Machinery & Traverse Maintenance Depot
                  </div>
                </div>
              </div>

              {/* Size / Capacity */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Floor Space & Capacity
                  </div>
                  <div className="text-base font-bold text-amber-300">
                    {vd.garage.size}
                  </div>
                  <div className="text-xs font-mono text-slate-200 mt-1 font-medium">
                    {vd.garage.capacity}
                  </div>
                </div>
              </div>

              {/* Heating */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Climate & Thermal System
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    {vd.garage.heating.split(',')[1] ? vd.garage.heating.split(',')[1].trim() : '18°C Interior'}
                  </div>
                  <div className="text-xs font-mono text-slate-200 mt-1 font-medium truncate">
                    {vd.garage.heating}
                  </div>
                </div>
              </div>
            </div>

            {/* Fleet Status Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Nominal / Operational', val: vd.vehicles.filter(v => v.status === 'Nominal' || v.status === 'Active').length, color: '#10b981' },
                { label: 'Under Watch / Service', val: vd.vehicles.filter(v => v.status === 'Watch').length, color: '#f59e0b' },
                { label: 'Standby / Reserve', val: vd.vehicles.filter(v => v.status === 'Standby').length, color: '#cbd5e1' },
              ].map(s => (
                <div key={s.label} className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-center">
                  <div className="text-2xl font-black font-mono" style={{ color: s.color }}>
                    {s.val}<span className="text-sm text-slate-400 font-bold">/{vd.vehicles.length}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-200 font-bold mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* 3-Column Responsive Vehicle Fleet Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vd.vehicles.map(v => (
                <VehicleCard key={v.id} v={v} />
              ))}
            </div>
          </div>
        </div>
      )}



    </div>
  );
};

export default InfrastructurePage;
