import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi } from '../api/client';
import {
  CommunicationDigitalTwin, CommunicationAsset,
} from '../types';
import {
  Radio, Wifi, Globe, ShieldCheck, AlertTriangle,
  Clock, ArrowRight, RefreshCw, Layers,
  Activity, CheckCircle2, Server, Signal, Zap, AlertOctagon,
  Shield, Play, TrendingUp, TrendingDown, Cpu,
  Network, ArrowUpRight, BarChart2,
  HardDrive, X, CloudLightning, Flame, Droplet, Users,
  Wrench, Package, MapPin, Wind, Sparkles, Brain,
  Sun, Thermometer, Database, Lock, Satellite,
  Search, MessageSquare, ToggleLeft, ToggleRight,
  Gauge, Eye, ChevronRight, CheckCircle, AlertCircle,
} from 'lucide-react';
import * as echarts from 'echarts';

// ── Shared mini primitives ────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const Pill: React.FC<{ label: string; color?: string; pulse?: boolean; small?: boolean }> = ({
  label, color = '#10b981', pulse, small,
}) => (
  <span className={`inline-flex items-center gap-1 ${small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'} rounded-full font-mono font-bold border`}
    style={{ background: `${color}15`, borderColor: `${color}44`, color }}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} style={{ background: color }} />
    {label}
  </span>
);

const SectionDivider: React.FC<{
  icon: React.ReactNode; title: string; subtitle: string; color: string; layer: string;
}> = ({ icon, title, subtitle, color, layer }) => (
  <div className="flex items-start gap-4 mb-6 pb-4 border-b border-white/8">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>{layer}</span>
      </div>
      <h2 className="text-base font-black text-white">{title}</h2>
      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const BarMeter: React.FC<{
  label: string; value: number; max: number; unit: string; color: string; sub?: string; reversed?: boolean;
}> = ({ label, value, max, unit, color, sub, reversed }) => {
  const pct = clamp((value / max) * 100);
  const displayColor = reversed ? (pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981') : color;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold" style={{ color: displayColor }}>{value}{unit}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${displayColor}88, ${displayColor})`, boxShadow: `0 0 6px ${displayColor}44` }} />
      </div>
      {sub && <div className="text-[9px] font-mono text-slate-600">{sub}</div>}
    </div>
  );
};

// ── Animated Signal Arc Gauge ──────────────────────────────────────────────
const SignalArcGauge: React.FC<{
  value: number; max: number; label: string; unit: string; color: string; size?: number;
}> = ({ value, max, label, unit, color, size = 140 }) => {
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * Math.min(1, value / max);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.05)" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={-(circ - arcLen) * 0.125}
          transform={`rotate(135 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={-(circ - arcLen) * 0.125 + arcLen - filled}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
          fill="white" fontSize={size * 0.17} fontWeight="900" fontFamily="monospace">{value}</text>
        <text x={size / 2} y={size / 2 + 13} textAnchor="middle"
          fill={color} fontSize={size * 0.09} fontFamily="monospace">{unit}</text>
      </svg>
      <div className="text-[9px] font-mono text-slate-400 text-center">{label}</div>
    </div>
  );
};

// ── Animated Data Pipeline Flow ────────────────────────────────────────────
const DataPipelineFlow: React.FC<{
  stages: { title: string; desc: string; status: string; id: number }[];
  selected: number | null; onSelect: (id: number | null) => void;
}> = ({ stages, selected, onSelect }) => {
  const statusColor: Record<string, string> = {
    NORMAL: '#10b981', STREAMING: '#06b6d4', SYNCHRONIZED: '#818cf8',
    FORWARDED: '#10b981', OPERATIONAL: '#10b981', MONITORING: '#f59e0b',
  };
  return (
    <div className="flex items-stretch gap-0">
      {stages.map((stage, i) => {
        const sc = statusColor[stage.status] || '#64748b';
        const isSelected = selected === stage.id;
        return (
          <React.Fragment key={stage.id}>
            <div onClick={() => onSelect(isSelected ? null : stage.id)}
              className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-sky-500/60' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}
              style={isSelected ? { background: `${sc}0A`, borderColor: `${sc}55` } : {}}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-mono text-slate-500 font-bold">0{stage.id}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
              </div>
              <div className="text-[10px] font-mono font-bold text-white leading-tight">{stage.title}</div>
              <div className="text-[9px] font-mono text-slate-500 mt-1 leading-tight">{stage.desc}</div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center px-0.5 shrink-0">
                <div className="relative w-5 h-1 flex items-center">
                  <div className="absolute inset-0 bg-sky-500/20 rounded" />
                  <div className="absolute h-full w-3 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent rounded"
                    style={{ animation: 'flow 1.5s linear infinite' }} />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Link Performance EChart ────────────────────────────────────────────────
const LinkPerformanceChart: React.FC<{ hist: any[] }> = ({ hist }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current || !hist?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const labels = hist.map(h => `${h.t_minus_sec}s`);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 } },
      legend: { data: ['Data speed', 'Signal delay', 'Packet Loss'], textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }, top: 0, right: 10 },
      grid: { top: 28, bottom: 30, left: 50, right: 14 },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' } },
      yAxis: [
        { type: 'value', name: 'Mbps', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#38bdf8', fontSize: 9, fontFamily: 'monospace' }, nameTextStyle: { color: '#38bdf8', fontSize: 9 } },
        { type: 'value', name: 'ms', splitLine: { show: false }, axisLabel: { color: '#34d399', fontSize: 9, fontFamily: 'monospace' }, nameTextStyle: { color: '#34d399', fontSize: 9 } },
      ],
      series: [
        { name: 'Data speed', type: 'line', data: hist.map(h => h.bandwidth_mbps), smooth: true, showSymbol: false, lineStyle: { width: 2.5, color: '#38bdf8' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(56,189,248,0.3)' }, { offset: 1, color: 'rgba(56,189,248,0.02)' }]) } },
        { name: 'Signal delay', type: 'line', yAxisIndex: 1, data: hist.map(h => h.latency_ms), smooth: true, showSymbol: false, lineStyle: { width: 2, color: '#34d399', type: 'dashed' } },
        { name: 'Packet Loss', type: 'bar', data: hist.map(h => h.packet_loss_pct), itemStyle: { color: 'rgba(239,68,68,0.45)', borderRadius: [2, 2, 0, 0] }, barWidth: 6 },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [hist]);
  return <div ref={ref} className="w-full h-64" />;
};

// ── SNR History Chart ─────────────────────────────────────────────────────────
const SNRChart: React.FC<{ snrDb: number; isMaitri: boolean }> = ({ snrDb, isMaitri }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const labels = Array.from({ length: 30 }, (_, i) => `-${29 - i}min`);
    const data = Array.from({ length: 30 }, (_, i) =>
      parseFloat((snrDb + (Math.sin(i * 0.4) * 1.5) + (Math.random() - 0.5) * 0.8).toFixed(1))
    );
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 12, bottom: 22, left: 38, right: 10 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', textStyle: { color: '#e2e8f0', fontSize: 9, fontFamily: 'monospace' }, formatter: (p: any) => `${p[0].axisValue}: ${p[0].value} dB` },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#374151', fontSize: 8, interval: 9 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      yAxis: { type: 'value', name: 'dB', axisLabel: { color: '#64748b', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }, nameTextStyle: { color: '#64748b', fontSize: 8 } },
      series: [
        {
          type: 'line', data, smooth: true, showSymbol: false,
          lineStyle: { width: 2, color: snrDb < 8 ? '#ef4444' : '#06b6d4' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: snrDb < 8 ? 'rgba(239,68,68,0.25)' : 'rgba(6,182,212,0.25)' }, { offset: 1, color: 'transparent' }]) },
          markLine: { data: [{ yAxis: 8 }], lineStyle: { color: '#ef4444', type: 'dashed', width: 1 }, label: { color: '#ef4444', fontSize: 8, formatter: '8dB Alert' }, symbol: ['none', 'none'] },
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [snrDb, isMaitri]);
  return <div ref={ref} style={{ height: 120, width: '100%' }} />;
};

// ── WiFi Coverage Floor Plan ──────────────────────────────────────────────────
const WiFiFloorPlan: React.FC<{ isMaitri: boolean }> = ({ isMaitri }) => {
  const rooms = [
    { name: 'Science Lab A', x: 10, y: 10, w: 28, h: 22, signal: isMaitri ? 92 : 88 },
    { name: 'Science Lab B', x: 42, y: 10, w: 26, h: 22, signal: isMaitri ? 76 : 82 },
    { name: 'Server Room', x: 72, y: 10, w: 20, h: 22, signal: isMaitri ? 98 : 97 },
    { name: 'Control Room', x: 10, y: 36, w: 28, h: 22, signal: isMaitri ? 95 : 94 },
    { name: 'Kitchen/Galley', x: 42, y: 36, w: 26, h: 22, signal: isMaitri ? 54 : 61 },
    { name: 'Living Qtrs', x: 72, y: 36, w: 20, h: 22, signal: isMaitri ? 48 : 52 },
    { name: 'Medical Bay', x: 10, y: 62, w: 28, h: 20, signal: isMaitri ? 88 : 91 },
    { name: 'Workshop', x: 42, y: 62, w: 26, h: 20, signal: isMaitri ? 62 : 68 },
    { name: 'Generator Room', x: 72, y: 62, w: 20, h: 20, signal: isMaitri ? 34 : 40 },
  ];
  const sigColor = (s: number) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444';
  return (
    <svg width="100%" viewBox="0 0 100 90" className="rounded-xl overflow-hidden">
      <rect width="100" height="90" fill="rgba(5,10,25,0.6)" rx="4" />
      {rooms.map(r => {
        const sc = sigColor(r.signal);
        return (
          <g key={r.name}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5}
              fill={`${sc}12`} stroke={`${sc}44`} strokeWidth={0.5} />
            {/* WiFi strength fill */}
            <rect x={r.x} y={r.y + r.h - r.h * (r.signal / 100)} width={r.w} height={r.h * (r.signal / 100)}
              rx={1.5} fill={`${sc}20`} />
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 2} textAnchor="middle"
              fill={sc} fontSize={3.5} fontFamily="monospace" fontWeight="bold">{r.signal}%</text>
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 4} textAnchor="middle"
              fill="rgba(148,163,184,0.7)" fontSize={2.8} fontFamily="monospace">{r.name}</text>
          </g>
        );
      })}
      {/* Access point dots */}
      {[{ x: 25, y: 22 }, { x: 60, y: 22 }, { x: 82, y: 55 }].map((ap, i) => (
        <g key={i}>
          <circle cx={ap.x} cy={ap.y} r={2} fill="#38bdf8" opacity={0.9} />
          <circle cx={ap.x} cy={ap.y} r={4} fill="none" stroke="#38bdf844" strokeWidth={0.5} />
          <circle cx={ap.x} cy={ap.y} r={7} fill="none" stroke="#38bdf822" strokeWidth={0.5} />
        </g>
      ))}
    </svg>
  );
};

// ── HF Propagation Chart ──────────────────────────────────────────────────────
const HFPropChart: React.FC<{ currentHour: number }> = ({ currentHour }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const freq5 = hours.map((_, i) => i >= 6 && i <= 18 ? 85 + Math.sin(i * 0.5) * 10 : 35 + Math.random() * 10);
    const freq14 = hours.map((_, i) => i >= 8 && i <= 20 ? 90 + Math.sin(i * 0.4) * 8 : 50 + Math.random() * 10);
    const freq21 = hours.map((_, i) => i >= 4 && i <= 10 ? 80 + Math.random() * 12 : 45 + Math.random() * 10);
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 16, bottom: 25, left: 36, right: 8 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', textStyle: { color: '#e2e8f0', fontSize: 9, fontFamily: 'monospace' } },
      legend: { data: ['5 MHz', '14 MHz', '21 MHz'], textStyle: { color: '#64748b', fontSize: 8, fontFamily: 'monospace' }, top: 0 },
      xAxis: { type: 'category', data: hours, axisLabel: { color: '#374151', fontSize: 7, interval: 5 }, boundaryGap: false },
      yAxis: { type: 'value', name: 'Signal %', max: 100, axisLabel: { color: '#64748b', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }, nameTextStyle: { color: '#64748b', fontSize: 8 } },
      series: [
        { name: '5 MHz', type: 'line', data: freq5, smooth: true, showSymbol: false, lineStyle: { width: 1.5, color: '#10b981' }, areaStyle: { color: 'rgba(16,185,129,0.08)' } },
        { name: '14 MHz', type: 'line', data: freq14, smooth: true, showSymbol: false, lineStyle: { width: 1.5, color: '#f59e0b' }, areaStyle: { color: 'rgba(245,158,11,0.08)' } },
        { name: '21 MHz', type: 'line', data: freq21, smooth: true, showSymbol: false, lineStyle: { width: 1.5, color: '#818cf8' }, areaStyle: { color: 'rgba(129,140,248,0.08)' } },
        { type: 'line', data: hours.map((_, i) => i === currentHour ? 100 : null), showSymbol: false, lineStyle: { color: '#ef444488', type: 'dashed', width: 1 }, tooltip: { show: false } },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [currentHour]);
  return <div ref={ref} style={{ height: 130, width: '100%' }} />;
};

// ── Data Queue Donut ──────────────────────────────────────────────────────────
const DataQueueDonut: React.FC<{ uploadedGb: number; pendingGb: number; color: string }> = ({ uploadedGb, pendingGb, color }) => {
  const total = uploadedGb + pendingGb;
  const pct = total > 0 ? Math.round((uploadedGb / total) * 100) : 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 6px ${color}66)` }} />
        <text x={50} y={46} textAnchor="middle" fill="white" fontSize={13} fontWeight="900" fontFamily="monospace">{pct}%</text>
        <text x={50} y={60} textAnchor="middle" fill={color} fontSize={7} fontFamily="monospace">uploaded</text>
      </svg>
    </div>
  );
};

// ── Satellite Look-Angle Sky Chart ────────────────────────────────────────────
const LookAngleChart: React.FC<{ isMaitri: boolean; elevation: number; azimuth: number }> = ({ isMaitri, elevation, azimuth }) => {
  const toXY = (el: number, az: number, r: number) => {
    const dist = r * (1 - el / 90);
    const rad = (az - 90) * (Math.PI / 180);
    return { x: 80 + dist * Math.cos(rad), y: 80 - dist * Math.sin(rad) };
  };
  const satPos = toXY(elevation, azimuth, 70);
  const blackoutAz = isMaitri ? 220 : 180;
  const blackoutEl = 8;
  const bkPos = toXY(blackoutEl, blackoutAz, 70);
  return (
    <svg width="100%" viewBox="0 0 160 160" className="max-w-[160px] mx-auto">
      <circle cx={80} cy={80} r={70} fill="rgba(5,10,25,0.7)" stroke="rgba(56,189,248,0.15)" strokeWidth={1} />
      <circle cx={80} cy={80} r={46} fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth={0.5} />
      <circle cx={80} cy={80} r={23} fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth={0.5} />
      <circle cx={80} cy={80} r={3} fill="#38bdf8" />
      {/* Cardinal labels */}
      {[{ l: 'N', x: 80, y: 8 }, { l: 'S', x: 80, y: 155 }, { l: 'E', x: 155, y: 83 }, { l: 'W', x: 5, y: 83 }].map(d => (
        <text key={d.l} x={d.x} y={d.y} textAnchor="middle" fill="#374151" fontSize={7} fontFamily="monospace">{d.l}</text>
      ))}
      {/* Elevation rings label */}
      {[{ el: 30, label: '30°' }, { el: 60, label: '60°' }].map(r => {
        const pos = toXY(r.el, 0, 70);
        return <text key={r.el} x={80} y={pos.y + 3} textAnchor="middle" fill="rgba(100,116,139,0.5)" fontSize={5} fontFamily="monospace">{r.label}</text>;
      })}
      {/* Blackout zone */}
      <circle cx={bkPos.x} cy={bkPos.y} r={8} fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth={0.8} strokeDasharray="2,1" />
      <text x={bkPos.x} y={bkPos.y - 11} textAnchor="middle" fill="#ef4444" fontSize={5} fontFamily="monospace">BLACKOUT</text>
      {/* Satellite dot */}
      <circle cx={satPos.x} cy={satPos.y} r={5} fill="#818cf8" style={{ filter: 'drop-shadow(0 0 4px #818cf888)' }} />
      <circle cx={satPos.x} cy={satPos.y} r={8} fill="none" stroke="#818cf866" strokeWidth={0.8} />
      <text x={satPos.x} y={satPos.y - 10} textAnchor="middle" fill="#818cf8" fontSize={5} fontFamily="monospace">GSAT-7</text>
      {/* Horizon mask */}
      <circle cx={80} cy={80} r={70} fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth={1.5} />
    </svg>
  );
};

// ── QoS Stacked Bar ────────────────────────────────────────────────────────
const QoSStackedBar: React.FC<{ tiers: any[]; totalBw: number; throttled: boolean }> = ({ tiers, totalBw, throttled }) => (
  <div className="space-y-3">
    {tiers.map((tier: any) => {
      const effectiveMbps = throttled && tier.id?.toString() === '3' ? tier.current_mbps * 0.3 : tier.current_mbps;
      const pct = (effectiveMbps / totalBw) * 100;
      const tierColors: Record<string, string> = { '1': '#10b981', '2': '#06b6d4', '3': throttled ? '#ef4444' : '#818cf8' };
      const tc = tierColors[tier.id?.toString()] || '#64748b';
      return (
        <div key={tier.id} className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-white font-bold">{tier.short_name}</span>
            <div className="flex items-center gap-1.5">
              {throttled && tier.id?.toString() === '3' && <span className="text-[8px] text-red-400 font-bold">THROTTLED</span>}
              <span className="font-bold" style={{ color: tc }}>{effectiveMbps.toFixed(0)} Mbps ({tier.allocation_pct}%)</span>
            </div>
          </div>
          <div className="h-2.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: `linear-gradient(to right, ${tc}88, ${tc})` }} />
          </div>
          <div className="text-[9px] font-mono text-slate-500">{tier.description}</div>
        </div>
      );
    })}
  </div>
);

// ── Satellite Link Topology Visual ─────────────────────────────────────────
const SatelliteTopologyViz: React.FC<{
  bwMbps: number; latMs: number; lossP: number; syncState: string; isMaitri: boolean;
}> = ({ bwMbps, latMs, lossP, syncState, isMaitri }) => {
  const statusColor = syncState === 'SYNCHRONIZED' ? '#10b981' : syncState === 'DEGRADED' ? '#f59e0b' : '#ef4444';
  const bwColor = bwMbps > 100 ? '#10b981' : bwMbps > 50 ? '#06b6d4' : '#f59e0b';
  return (
    <svg width="100%" viewBox="0 0 360 180" className="overflow-visible">
      <defs>
        <radialGradient id="sat-grad"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" /><stop offset="100%" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
        <marker id="arrowR" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#38bdf844" /></marker>
        <marker id="arrowL" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 Z" fill="#38bdf844" /></marker>
      </defs>
      <ellipse cx={50} cy={140} rx={35} ry={20} fill="rgba(10,15,30,0.9)" stroke={statusColor} strokeWidth={1.5} />
      <text x={50} y={136} textAnchor="middle" fill="white" fontSize={8} fontFamily="monospace" fontWeight="bold">{isMaitri ? 'MAITRI' : 'BHARATI'}</text>
      <text x={50} y={148} textAnchor="middle" fill={statusColor} fontSize={7} fontFamily="monospace">{isMaitri ? '70.77°S' : '69.41°S'}</text>
      <ellipse cx={50} cy={118} rx={12} ry={7} fill="none" stroke={statusColor} strokeWidth={1.5} />
      <line x1={50} y1={118} x2={50} y2={125} stroke={statusColor} strokeWidth={1.5} />
      <circle cx={180} cy={35} r={18} fill="rgba(10,15,30,0.9)" stroke="#38bdf8" strokeWidth={1.5} />
      <text x={180} y={32} textAnchor="middle" fill="#38bdf8" fontSize={7} fontFamily="monospace" fontWeight="bold">LEO SAT</text>
      <text x={180} y={43} textAnchor="middle" fill="#64748b" fontSize={7} fontFamily="monospace">GSAT-7</text>
      <rect x={160} y={30} width={14} height={8} rx={1} fill="#818cf8" fillOpacity={0.7} />
      <rect x={206} y={30} width={14} height={8} rx={1} fill="#818cf8" fillOpacity={0.7} />
      <line x1={62} y1={122} x2={163} y2={50} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="5,3" opacity="0.6" markerEnd="url(#arrowR)">
        <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1={197} y1={50} x2={295} y2={122} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="5,3" opacity="0.6" markerEnd="url(#arrowR)">
        <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
      </line>
      <ellipse cx={310} cy={140} rx={40} ry={20} fill="rgba(10,15,30,0.9)" stroke="#10b981" strokeWidth={1.5} />
      <text x={310} y={136} textAnchor="middle" fill="white" fontSize={8} fontFamily="monospace" fontWeight="bold">NCAOR GOA</text>
      <text x={310} y={148} textAnchor="middle" fill="#10b981" fontSize={7} fontFamily="monospace">15.49°N Gateway</text>
      <ellipse cx={310} cy={118} rx={12} ry={7} fill="none" stroke="#10b981" strokeWidth={1.5} />
      <line x1={310} y1={118} x2={310} y2={125} stroke="#10b981" strokeWidth={1.5} />
      <rect x={100} y={68} width={60} height={38} rx={6} fill="rgba(5,10,25,0.9)" stroke="rgba(56,189,248,0.3)" strokeWidth={1} />
      <text x={130} y={80} textAnchor="middle" fill={bwColor} fontSize={8} fontFamily="monospace" fontWeight="bold">{bwMbps} Mbps</text>
      <text x={130} y={92} textAnchor="middle" fill="#94a3b8" fontSize={7} fontFamily="monospace">{latMs}ms delay</text>
      <text x={130} y={102} textAnchor="middle" fill={lossP > 1 ? '#ef4444' : '#10b981'} fontSize={7} fontFamily="monospace">{lossP}% loss</text>
      <rect x={250} y={158} width={110} height={18} rx={4} fill={`${statusColor}22`} stroke={`${statusColor}55`} strokeWidth={1} />
      <text x={305} y={170} textAnchor="middle" fill={statusColor} fontSize={8} fontFamily="monospace" fontWeight="bold">● {syncState}</text>
    </svg>
  );
};

// ── Domain Freshness Chip ───────────────────────────────────────────────────
const DomainFreshChip: React.FC<{ dom: any; stationId: string }> = ({ dom, stationId }) => {
  const navigate = useNavigate();
  const fc = dom.freshness_state === 'LIVE' ? '#10b981' : dom.freshness_state === 'DELAYED' ? '#f59e0b' : '#ef4444';
  return (
    <div onClick={() => navigate(`/station/${stationId}/${dom.route}`)}
      className="p-3 rounded-xl border cursor-pointer group transition-all hover:scale-[1.02]"
      style={{ borderColor: `${fc}33`, background: `${fc}07` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold text-white truncate pr-1 group-hover:text-sky-300 transition-colors">{dom.name?.split('&')[0]?.trim()}</span>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: fc }}>
          {dom.freshness_state === 'LIVE' && <span className="block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: fc }} />}
        </span>
      </div>
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-slate-500">{dom.last_update_sec}s ago</span>
        <span className="font-bold" style={{ color: fc }}>{dom.freshness_state}</span>
      </div>
      <div className="h-1 bg-polar-darker rounded-full overflow-hidden mt-1.5 border border-polar-border/30">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, 100 - dom.last_update_sec * 5)}%`, background: fc }} />
      </div>
    </div>
  );
};

// ── Modal ───────────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div className="relative z-10 glass-panel rounded-2xl border border-polar-border w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      {children}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const CommunicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [commData, setCommData] = useState<CommunicationDigitalTwin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<'overview' | 'satellite' | 'lan' | 'radio' | 'datapipe' | 'whatif'>('overview');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CommunicationAsset | null>(null);
  const [selectedFlowNode, setSelectedFlowNode] = useState<number | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [qosThrottled, setQosThrottled] = useState(false);
  const [radioLogSearch, setRadioLogSearch] = useState('');

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  const fetchCommData = useCallback(async () => {
    try {
      const res = await resourcesApi.getCommunication(stationId);
      if (res?.communication) { setCommData(res.communication); }
    } catch {
      const snapComm = liveSnapshot[stationId]?.communication;
      if (snapComm && (snapComm as any).qos_tiers) setCommData(snapComm as any);
    } finally { setLoading(false); }
  }, [stationId, liveSnapshot]);

  useEffect(() => {
    setLoading(true); setCommData(null);
    setWhatIfResult(null); setActiveScenario(null);
    fetchCommData();
  }, [stationId]);
  useEffect(() => { const t = setInterval(fetchCommData, 10000); return () => clearInterval(t); }, [fetchCommData]);

  const runWhatIf = async (scenarioType: string, params: Record<string, any> = {}) => {
    setWhatIfLoading(true); setActiveScenario(scenarioType); setWhatIfResult(null);
    try { const res = await resourcesApi.communicationWhatIf(stationId, scenarioType, params); setWhatIfResult(res); }
    catch { setWhatIfResult(null); }
    finally { setWhatIfLoading(false); }
  };

  const currentHour = new Date().getHours();

  const comm = commData;
  const syncState = comm?.sync_state ?? 'SYNCHRONIZED';
  const syncColor = syncState === 'SYNCHRONIZED' ? '#10b981' : syncState === 'DEGRADED' ? '#f59e0b' : '#ef4444';
  const bwMbps = comm?.bandwidth_mbps ?? (isMaitri ? 118.5 : 157.2);
  const latMs = comm?.latency_ms ?? (isMaitri ? 78 : 62);
  const lossP = comm?.packet_loss_pct ?? (isMaitri ? 0.05 : 0.02);
  const freshSec = comm?.telemetry_freshness_sec ?? 1.4;
  const bwCapacity = comm?.bandwidth_capacity_mbps ?? (isMaitri ? 120 : 160);
  const utilPct = comm?.bandwidth_utilization_pct ?? Math.round((bwMbps / bwCapacity) * 100);
  const dataConfidence = comm?.data_confidence_pct ?? 99.4;
  const riskScore = comm?.communication_risk?.overall_risk_score ?? 2.0;
  const riskLevel = riskScore > 30 ? 'HIGH' : riskScore > 10 ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981';

  // Satellite WAN params
  const snrDb = isMaitri ? 12.4 : 14.8;
  const satElevation = isMaitri ? 22 : 31;
  const satAzimuth = isMaitri ? 18 : 42;
  const kIndex = isMaitri ? 3 : 1;
  const kColor = kIndex >= 5 ? '#ef4444' : kIndex >= 3 ? '#f59e0b' : '#10b981';

  // Radio repeater data
  const repeaters = isMaitri ? [
    { name: 'Repeater 1 — Station Roof', battery: 94, solar: 88, status: 'ONLINE', lastComm: '2min', pos: 'Maitri HQ' },
    { name: 'Repeater 2 — Glacier Tip', battery: 28, solar: 42, status: 'LOW BATTERY', lastComm: '8min', pos: '12km NE' },
    { name: 'Repeater 3 — Schirmacher Oasis', battery: 76, solar: 71, status: 'ONLINE', lastComm: '4min', pos: '6km SE' },
  ] : [
    { name: 'Repeater 1 — Helipad Mast', battery: 91, solar: 95, status: 'ONLINE', lastComm: '1min', pos: 'Bharati HQ' },
    { name: 'Repeater 2 — Coastal Ridge', battery: 67, solar: 62, status: 'ONLINE', lastComm: '3min', pos: '8km W' },
    { name: 'Repeater 3 — Ocean Buoy', battery: 45, solar: 38, status: 'DEGRADED', lastComm: '14min', pos: '3km offshore' },
  ];

  const radioLogs = [
    { time: '14:32', team: 'Team Alpha', msg: 'Returning to base. Sampling complete. Ice bridge stable.', type: 'normal' },
    { time: '14:18', team: 'Team Beta', msg: 'Request weather update for Sector 3 movement.', type: 'normal' },
    { time: '13:55', team: 'Team Alpha', msg: 'Visual on crevasse field. Routing around. ETA extended 20 min.', type: 'warn' },
    { time: '13:41', team: 'Control', msg: 'Wind chill advisory issued for sectors 2 and 5. Recall non-essential field teams.', type: 'warn' },
    { time: '13:28', team: 'Team Gamma', msg: 'Drill core sample retrieved. Generator fuel at 40%.', type: 'normal' },
    { time: '12:55', team: 'Team Beta', msg: 'MAYDAY — Snowmobile stuck in ice. Team safe. Require extraction.', type: 'alert' },
    { time: '12:50', team: 'Control', msg: 'Copy MAYDAY Team Beta. Dispatching recovery unit.', type: 'alert' },
    { time: '12:30', team: 'Team Delta', msg: 'AWS calibration complete. Data upload initiated.', type: 'normal' },
  ];
  const filteredLogs = radioLogSearch
    ? radioLogs.filter(l => l.msg.toLowerCase().includes(radioLogSearch.toLowerCase()) || l.team.toLowerCase().includes(radioLogSearch.toLowerCase()))
    : radioLogs;

  // Data pipeline
  const uploadedGb = isMaitri ? 120 : 890;
  const pendingGb = isMaitri ? 42 : 450;
  const etaHrs = Math.round(pendingGb / (bwMbps * 0.125 * 0.6));

  const raidDrives = [
    { id: 'A1', health: 98, ok: true }, { id: 'A2', health: 97, ok: true },
    { id: 'A3', health: 94, ok: true }, { id: 'A4', health: 45, ok: false },
    { id: 'B1', health: 99, ok: true }, { id: 'B2', health: 98, ok: true },
    { id: 'B3', health: 96, ok: true }, { id: 'B4', health: 91, ok: true },
  ];

  const mockHist = comm?.history ?? Array.from({ length: 20 }, (_, i) => ({
    t_minus_sec: (20 - i) * 30,
    bandwidth_mbps: bwMbps + (Math.random() - 0.5) * 10,
    latency_ms: latMs + (Math.random() - 0.5) * 8,
    packet_loss_pct: Math.max(0, lossP + (Math.random() - 0.5) * 0.1),
  }));

  const FLOW_STAGES = [
    { id: 1, title: 'Station Sensors', desc: '1,420 ACS Points', status: 'NORMAL' },
    { id: 2, title: 'Edge Bus', desc: 'Real-time Broker', status: 'STREAMING' },
    { id: 3, title: 'Radome Uplink', desc: isMaitri ? '2.4m Dish' : 'Dual 3.0m', status: 'STREAMING' },
    { id: 4, title: 'LEO Satellite', desc: 'GSAT-7 / SES', status: 'STREAMING' },
    { id: 5, title: 'Gateway Rx', desc: 'NCAOR Goa', status: 'SYNCHRONIZED' },
    { id: 6, title: 'Digital Twin', desc: 'PolarTwin Engine', status: 'OPERATIONAL' },
  ];

  const WHAT_IF_PRESETS = [
    { id: 'primary_link_failure', title: '📡 Primary Link Failure', desc: 'LEO dish lock loss + backup failover', icon: CloudLightning, params: {} },
    { id: 'bandwidth_reduction', title: '📉 Bandwidth Throttle −65%', desc: 'Transponder orbital contention', icon: TrendingDown, params: { reduction_pct: 65 } },
    { id: 'high_packet_loss', title: '🌩️ Auroral Packet Loss 6.8%', desc: 'Solar flare ionospheric storm', icon: AlertTriangle, params: { packet_loss_pct: 6.8 } },
    { id: 'high_latency', title: '⏱️ Multi-Hop Relay 520ms', desc: 'Inter-satellite routing delay', icon: Clock, params: { latency_ms: 520 } },
    { id: 'backup_activation', title: '🔄 Backup Link Drill', desc: 'Inmarsat/Iridium switchover test', icon: Shield, params: {} },
  ];

  const layers = [
    { id: 'overview' as const, label: 'Link Overview', icon: <Globe className="w-4 h-4" />, color: '#38bdf8' },
    { id: 'satellite' as const, label: 'Satellite WAN', icon: <Satellite className="w-4 h-4" />, color: '#818cf8' },
    { id: 'lan' as const, label: 'LAN & WiFi', icon: <Wifi className="w-4 h-4" />, color: '#10b981' },
    { id: 'radio' as const, label: 'Tactical Radio HF/VHF', icon: <Radio className="w-4 h-4" />, color: '#f59e0b' },
    { id: 'datapipe' as const, label: 'Data Science Pipeline', icon: <Database className="w-4 h-4" />, color: '#f97316' },
    { id: 'whatif' as const, label: 'What-If Simulator', icon: <Sparkles className="w-4 h-4" />, color: '#06b6d4' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm font-mono text-sky-300">Loading communication twin state…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 70%, #38bdf808 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, #818cf808 0%, transparent 50%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                <Radio className="w-3 h-3" /> Communications Command Digital Twin
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name} · {isMaitri ? 'Single 2.4m Radome' : 'Dual 3.0m Radomes + AGEOS'}
              </span>
              <Pill label={syncState} color={syncColor} pulse />
              {kIndex >= 5 && <Pill label={`K-Index ${kIndex} — Geomagnetic Storm`} color="#ef4444" pulse />}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Signal className="w-8 h-8 text-sky-400" /> Communications Command Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl leading-relaxed">
              {station.name} → GSAT-7 LEO → NCAOR Goa · Satellite WAN · LAN/WiFi · HF/VHF Radio · AGEOS Data Pipeline · Solar Weather Monitor
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-polar-dark border border-emerald-500/30 text-[10px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">WEBSOCKET LIVE</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">{latMs}ms</span>
            </div>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=communication`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4" /> Decision Intel
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Bandwidth', val: `${bwMbps} Mbps`, sub: `${utilPct}% of ${bwCapacity}Mbps`, color: '#38bdf8', icon: <Wifi className="w-4 h-4" />, modal: 'data speed' },
            { label: 'Signal Delay', val: `${latMs} ms`, sub: `Jitter ±${comm?.latency_jitter_ms ?? 3}ms`, color: '#10b981', icon: <Activity className="w-4 h-4" />, modal: 'signal delay' },
            { label: 'Packet Loss', val: `${lossP}%`, sub: `${comm?.packets_dropped ?? 422} dropped`, color: lossP < 0.5 ? '#10b981' : '#f59e0b', icon: <Signal className="w-4 h-4" />, modal: 'packet_loss' },
            { label: 'SNR', val: `${snrDb} dB`, sub: snrDb < 8 ? '⚠️ Below threshold' : 'Signal quality good', color: snrDb < 8 ? '#ef4444' : '#10b981', icon: <Gauge className="w-4 h-4" />, modal: 'snr' },
            { label: 'Solar K-Index', val: kIndex.toString(), sub: kIndex >= 5 ? 'Storm — Satcom risk' : kIndex >= 3 ? 'Active — Watch' : 'Quiet — Safe', color: kColor, icon: <Sun className="w-4 h-4" />, modal: 'solar' },
            { label: 'Twin Freshness', val: `${freshSec}s`, sub: `Confidence: ${dataConfidence}%`, color: '#818cf8', icon: <Clock className="w-4 h-4" />, modal: 'freshness' },
          ].map(kpi => (
            <div key={kpi.label} onClick={() => setActiveModal(kpi.modal)}
              className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all cursor-pointer group">
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

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: OVERVIEW (existing features preserved)
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Topology Visual */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
                <Globe className="w-4 h-4" /> Live Satellite Link Topology — Station to Ground Gateway
              </div>
              <SatelliteTopologyViz bwMbps={bwMbps} latMs={latMs} lossP={lossP} syncState={syncState} isMaitri={isMaitri} />
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-polar-border/40">
                <SignalArcGauge value={utilPct} max={100} label="Channel Util" unit="%" color="#38bdf8" size={110} />
                <SignalArcGauge value={Math.round(dataConfidence)} max={100} label="Data Confidence" unit="%" color="#10b981" size={110} />
                <SignalArcGauge value={Math.round(100 - riskScore)} max={100} label="Link Health" unit="%" color={riskColor} size={110} />
              </div>
            </div>

            {/* Sync + Risk */}
            <div className="space-y-4">
              <div className="glass-panel p-5 rounded-2xl border shadow-xl space-y-3" style={{ borderColor: `${syncColor}33` }}>
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: syncColor }}>Digital Twin Synchronization</div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border flex items-center justify-center" style={{ borderColor: `${syncColor}44`, background: `${syncColor}11` }}>
                    <Globe className="w-6 h-6" style={{ color: syncColor }} />
                  </div>
                  <div>
                    <div className="text-sm font-black font-mono" style={{ color: syncColor }}>{syncState}</div>
                    <div className="text-[10px] font-mono text-slate-400">Gateway: {comm?.ground_gateway ?? 'NCAOR Goa'}</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs font-mono pt-2 border-t border-polar-border/40">
                  {[
                    { label: 'Data Completeness', val: `${comm?.data_completeness_pct ?? 99.8}%`, color: '#10b981' },
                    { label: 'Stream Rate', val: `${comm?.stream_rate_samples_sec ?? 250} spl/s`, color: '#06b6d4' },
                    { label: 'Freshness', val: `${freshSec}s ago`, color: '#818cf8' },
                    { label: 'CRC Frame Pass', val: '99.98%', color: '#10b981' },
                    { label: 'Data Ingestion', val: '1.42 GB Today', color: '#94a3b8' },
                    { label: '30-Day Uptime', val: '99.94%', color: '#10b981' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center border-b border-polar-border/20 pb-1.5">
                      <span className="text-slate-400">{r.label}</span>
                      <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Communication Risk Score</div>
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 64 64" width="64" height="64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={riskColor} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 26 * (1 - riskScore / 100)} ${2 * Math.PI * 26}`} />
                    <text x="32" y="37" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="monospace">{riskScore}</text>
                  </svg>
                  <div>
                    <div className="text-sm font-black font-mono" style={{ color: riskColor }}>{riskLevel}</div>
                    <div className="text-[10px] font-mono text-slate-400">Visibility Risk Level</div>
                  </div>
                </div>
                {[
                  { label: 'Link Health', val: `${comm?.communication_risk?.link_health_factor ?? 98.5}%` },
                  { label: 'Freshness Factor', val: `${comm?.communication_risk?.freshness_factor ?? 99.0}%` },
                  { label: 'Packet Integrity', val: `${comm?.communication_risk?.packet_integrity_factor ?? 99.8}%` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs font-mono border-b border-polar-border/20 pb-1.5">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="font-bold text-emerald-300">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline + Domain freshness */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
              <Network className="w-4 h-4" /> Operational Data Pipeline · Station → India Digital Twin Flow
            </div>
            <DataPipelineFlow stages={FLOW_STAGES} selected={selectedFlowNode} onSelect={setSelectedFlowNode} />
            {selectedFlowNode && (
              <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 text-xs font-mono text-slate-300 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Stage {selectedFlowNode}: {FLOW_STAGES[selectedFlowNode - 1].title} — </span>
                  <span>Real-time sensor telemetry processing at this stage with automated CRC validation and QoS priority tagging.</span>
                </div>
              </div>
            )}
          </div>

          {/* Domain Freshness */}
          {(comm?.domains_freshness ?? []).length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" /> 16-Domain Telemetry Freshness Matrix
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(comm?.domains_freshness ?? []).map((dom: any) => (
                  <DomainFreshChip key={dom.domain_id} dom={dom} stationId={stationId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 1: SATELLITE LINK MANAGEMENT (WAN)
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'satellite' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Satellite className="w-6 h-6" />}
              title="Satellite Link Management — WAN Command"
              subtitle="SNR Heatmap · QoS Bandwidth Controller · Look-Angle Sky Chart · Solar Weather Interference Monitor"
              color="#818cf8"
              layer="Layer 1 · Satellite WAN"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* SNR Heatmap */}
              <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-2">
                  <Signal className="w-4 h-4" /> Signal-to-Noise Ratio (SNR) Monitor
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl" style={{
                  background: `${snrDb < 8 ? '#ef4444' : '#06b6d4'}10`, border: `1px solid ${snrDb < 8 ? '#ef4444' : '#06b6d4'}44`
                }}>
                  <div className="text-center">
                    <div className="text-3xl font-black font-mono" style={{ color: snrDb < 8 ? '#ef4444' : '#06b6d4' }}>{snrDb}</div>
                    <div className="text-[9px] font-mono" style={{ color: snrDb < 8 ? '#ef4444' : '#06b6d4' }}>dB</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-mono font-bold text-white">{snrDb < 8 ? '⚠️ Below Threshold' : '✓ Signal Nominal'}</div>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">{snrDb < 8 ? 'Check Radome for snow accumulation' : 'Radome clear — Good propagation'}</div>
                    <div className="text-[9px] font-mono text-slate-400 mt-1">{isMaitri ? 'Primary: C-Band (uplink)' : 'Primary: Ku-Band + AGEOS dedicated'}</div>
                  </div>
                </div>
                <SNRChart snrDb={snrDb} isMaitri={isMaitri} />
                {snrDb < 8 && (
                  <div className="p-3 rounded-xl border border-red-500/50 bg-red-500/12 text-[9px] font-mono text-red-300 font-bold animate-pulse">
                    ⚠️ SNR &lt; 8dB — Check Radome for snow accumulation. Dispatch maintenance team.
                  </div>
                )}
                <div className="space-y-1.5">
                  <BarMeter label="C-Band SNR" value={snrDb} max={20} unit=" dB" color="#818cf8" sub="Threshold: 8 dB" />
                  {!isMaitri && <BarMeter label="AGEOS Ku-Band SNR" value={18.2} max={25} unit=" dB" color="#06b6d4" sub="ISRO IRS data link" />}
                </div>
              </div>

              {/* Look-Angle Sky Chart */}
              <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Look-Angle Predictor — Sky Chart
                </div>
                <LookAngleChart isMaitri={isMaitri} elevation={satElevation} azimuth={satAzimuth} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Elevation</div>
                    <div className="text-lg font-black font-mono text-purple-300">{satElevation}°</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Azimuth</div>
                    <div className="text-lg font-black font-mono text-purple-300">{satAzimuth}°</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/08 space-y-1.5 text-[9px] font-mono">
                  <div className="flex justify-between"><span className="text-slate-400">Satellite</span><span className="text-white font-bold">GSAT-7 (INSAT-4)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Next Blackout</span><span className={`font-bold ${isMaitri ? 'text-amber-400' : 'text-emerald-400'}`}>{isMaitri ? 'In 2h 15min' : 'None (6hrs)'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Pass Duration</span><span className="text-white">8h 45min</span></div>
                  {isMaitri && (
                    <div className="mt-2 p-2 rounded-lg border border-amber-500/40 bg-amber-500/12 text-amber-300 font-bold">
                      ⚠️ Mountain shadow blackout predicted — Shift to HF backup in 2h15m
                    </div>
                  )}
                </div>
              </div>

              {/* Solar Weather + QoS */}
              <div className="space-y-4">
                {/* Solar Weather */}
                <div className="p-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/06 space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Solar Weather Interference Monitor
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: `${kColor}10`, border: `1px solid ${kColor}44` }}>
                    <div className="text-center">
                      <div className="text-3xl font-black font-mono" style={{ color: kColor }}>{kIndex}</div>
                      <div className="text-[9px] font-mono text-slate-400">K-Index</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold" style={{ color: kColor }}>
                        {kIndex >= 5 ? 'GEOMAGNETIC STORM' : kIndex >= 3 ? 'Active — Watch' : 'Quiet — Safe'}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        {kIndex >= 5 ? `Expect Radio/Satcom disruption for 4 hours` : 'Ionosphere stable — Normal propagation'}
                      </div>
                    </div>
                  </div>
                  <BarMeter label="K-Index" value={kIndex} max={9} unit="" color={kColor} reversed sub="Safe: 0–2 · Active: 3–4 · Storm: 5–9" />
                  <div className="space-y-1.5 text-[9px] font-mono">
                    {[
                      { label: 'Solar Flare Risk', val: kIndex >= 5 ? 'HIGH' : 'LOW', color: kIndex >= 5 ? '#ef4444' : '#10b981' },
                      { label: 'Ionosphere State', val: kIndex >= 3 ? 'DISTURBED' : 'STABLE', color: kIndex >= 3 ? '#f59e0b' : '#10b981' },
                      { label: 'Satcom Disruption', val: kIndex >= 5 ? '3–4 Hours' : 'None expected', color: kIndex >= 5 ? '#ef4444' : '#10b981' },
                      { label: 'HF Radio Impact', val: kIndex >= 5 ? 'BLACKOUT RISK' : 'Normal propagation', color: kIndex >= 5 ? '#f97316' : '#10b981' },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500">{r.label}</span>
                        <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* QoS Controller */}
                <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/06 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">QoS Bandwidth Controller</div>
                    <button onClick={() => setQosThrottled(q => !q)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold border cursor-pointer transition-all ${qosThrottled ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'}`}>
                      {qosThrottled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {qosThrottled ? 'NON-ESS THROTTLED' : 'THROTTLE NON-ESSENTIAL'}
                    </button>
                  </div>
                  <QoSStackedBar
                    tiers={comm?.qos_tiers ?? [
                      { id: '1', short_name: 'Tier 1 — Safety/ACS', description: 'Life support, power grid, emergency', current_mbps: 32, allocation_pct: 35 },
                      { id: '2', short_name: 'Tier 2 — Science', description: 'Earth obs, research data, telemedicine', current_mbps: 48, allocation_pct: 45 },
                      { id: '3', short_name: 'Tier 3 — Crew Welfare', description: 'VoIP, video, social media, personal', current_mbps: 22, allocation_pct: 20 },
                    ]}
                    totalBw={bwCapacity}
                    throttled={qosThrottled}
                  />
                  {qosThrottled && (
                    <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/08 text-[9px] font-mono text-emerald-300">
                      ✓ Crew welfare (Tier 3) throttled to 30% — Bandwidth freed for scientific data upload and telemedicine
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Link Performance Chart */}
            <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                <BarChart2 className="w-4 h-4" /> Link Performance History (Last 20 Telemetry Ticks)
              </div>
              <LinkPerformanceChart hist={mockHist} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 2: LAN & WiFi
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'lan' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Wifi className="w-6 h-6" />}
              title="Local Area Network — LAN & WiFi Coverage Command"
              subtitle="WiFi Coverage Floor-Plan · Fiber Backbone Health · Server Room Monitor · Network Asset Status"
              color="#10b981"
              layer="Layer 2 · LAN & WiFi"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* WiFi Floor Plan */}
              <div className="lg:col-span-2 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/06 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                    <Wifi className="w-4 h-4" /> WiFi Coverage Heat-Map — Station Floor Plan
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-mono">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Strong</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Dead Zone</span>
                  </div>
                </div>
                <WiFiFloorPlan isMaitri={isMaitri} />
                <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                  <span className="w-3 h-3 rounded-full bg-sky-400" /> Access Point · {isMaitri ? '3 APs deployed' : '4 APs deployed'}
                </div>
                {/* Dead zone alert */}
                {(isMaitri) && (
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[9px] font-mono text-amber-300">
                    ⚠️ Dead Zone detected: Generator Room (34% coverage). Scientists unable to upload data from this zone. Deploy mesh extender.
                  </div>
                )}
              </div>

              {/* Server Room + Fiber */}
              <div className="space-y-4">
                {/* Server Room Monitor */}
                <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/06 space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                    <Server className="w-4 h-4" /> Server Room Environmental Monitor
                  </div>
                  {[
                    { label: 'Rack Temperature', val: isMaitri ? 19 : 21, max: 35, unit: '°C', color: '#06b6d4', warnAt: 25 },
                    { label: 'Relative Humidity', val: isMaitri ? 42 : 48, max: 80, unit: '%', color: '#818cf8', warnAt: 70 },
                    { label: 'Power Load', val: isMaitri ? 68 : 74, max: 100, unit: '%', color: '#10b981', warnAt: 85 },
                    { label: 'UPS Battery', val: isMaitri ? 94 : 98, max: 100, unit: '%', color: '#10b981', warnAt: 20 },
                  ].map(m => {
                    const warn = m.label.includes('Battery') ? m.val < m.warnAt : m.val > m.warnAt;
                    return (
                      <div key={m.label} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-slate-400">{m.label}</span>
                          <span className="font-bold" style={{ color: warn ? '#ef4444' : m.color }}>{m.val}{m.unit}{warn ? ' ⚠️' : ''}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(m.val / m.max) * 100}%`, background: warn ? '#ef4444' : m.color }} />
                        </div>
                      </div>
                    );
                  })}
                  {(isMaitri ? 19 : 21) > 25 && (
                    <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-500/12 text-[9px] font-mono text-red-300 font-bold">
                      🌡 Server room temperature critical — Emergency cooling fans activated
                    </div>
                  )}
                </div>

                {/* Fiber Backbone */}
                <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-500/06 space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold flex items-center gap-2">
                    <Network className="w-4 h-4" /> Fiber-Optic Backbone Health
                  </div>
                  {(isMaitri ? [
                    { id: 'A', name: 'Station Core ↔ Science Wing', attn: 0.8, temp: -12, ok: true },
                    { id: 'B', name: 'Station Core ↔ Living Qtrs', attn: 1.1, temp: -14, ok: true },
                    { id: 'C', name: 'Station ↔ Magnetometer Hut', attn: 4.2, temp: -31, ok: false },
                    { id: 'D', name: 'Station ↔ AWS Site 3', attn: 2.1, temp: -22, ok: true },
                  ] : [
                    { id: 'A', name: 'Main Hub ↔ Lab Module', attn: 0.6, temp: -8, ok: true },
                    { id: 'B', name: 'Main Hub ↔ AGEOS Pad', attn: 1.4, temp: -11, ok: true },
                    { id: 'C', name: 'Main Hub ↔ Helipad Comms', attn: 0.9, temp: -9, ok: true },
                    { id: 'D', name: 'Main Hub ↔ Ocean Instruments', attn: 1.8, temp: -16, ok: true },
                  ]).map(link => (
                    <div key={link.id} className={`p-3 rounded-xl border text-[9px] font-mono ${!link.ok ? 'border-red-500/40 bg-red-500/08' : 'border-polar-border bg-polar-dark/40'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{link.id}: {link.name}</span>
                        <Pill label={link.ok ? 'OK' : 'FAULT'} color={link.ok ? '#10b981' : '#ef4444'} pulse={!link.ok} small />
                      </div>
                      <div className="flex gap-3 text-slate-400">
                        <span>Attn: <span style={{ color: link.attn > 3 ? '#ef4444' : '#10b981' }} className="font-bold">{link.attn} dB/km</span></span>
                        <span>Temp: <span className="font-bold text-sky-300">{link.temp}°C</span></span>
                      </div>
                      {!link.ok && <div className="text-red-300 font-bold mt-1">⚠️ Attenuation high — Possible cable stress from ice movement</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LAN Hardware Assets */}
            {(comm?.assets ?? []).length > 0 && (
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> Communication Hardware Subsystems — Click to Inspect
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(comm?.assets ?? []).map(asset => {
                    const isOk = asset.status.includes('ONLINE') || asset.status.includes('CONNECTED') || asset.status.includes('OPERATIONAL');
                    const sc = isOk ? '#10b981' : '#f59e0b';
                    const hp = asset.health_pct ?? 95;
                    return (
                      <div key={asset.id} onClick={() => setSelectedAsset(asset)}
                        className="glass-panel p-4 rounded-2xl border border-polar-border hover:border-sky-500/40 cursor-pointer transition-all shadow-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-mono font-bold text-white">{asset.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">{asset.subsystem}</div>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold shrink-0"
                            style={{ borderColor: `${sc}44`, background: `${sc}11`, color: sc }}>
                            {asset.status.split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg viewBox="0 0 48 48" width="48" height="48">
                            <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <circle cx="24" cy="24" r="18" fill="none" stroke={sc} strokeWidth="6" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 18 * (hp / 100)} ${2 * Math.PI * 18}`}
                              transform="rotate(-90 24 24)" />
                            <text x="24" y="28" textAnchor="middle" fill="white" fontSize="9" fontWeight="900" fontFamily="monospace">{hp}%</text>
                          </svg>
                          <div className="text-xs font-mono space-y-1">
                            <div className="text-slate-400">Power: <span className="font-bold text-amber-300">{asset.power_draw_kw} kW</span></div>
                            <div className="text-slate-400">Health: <span className="font-bold" style={{ color: sc }}>{hp}%</span></div>
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 bg-polar-darker/60 px-2 py-1 rounded border border-polar-border/30 truncate">
                          {asset.source_provenance}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 3: TACTICAL RADIO HF/VHF
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'radio' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Radio className="w-6 h-6" />}
              title="Tactical Radio — HF/VHF Field Communications"
              subtitle="Repeater Station Monitor · Digital Radio Log (AI Transcription) · HF Propagation Forecast · Inter-Station Link"
              color="#f59e0b"
              layer="Layer 3 · Tactical Radio"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* Repeater Status */}
              <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                  <Signal className="w-4 h-4" /> Remote Repeater Station Status
                </div>
                {repeaters.map(r => {
                  const battColor = r.battery < 30 ? '#ef4444' : r.battery < 60 ? '#f59e0b' : '#10b981';
                  const statColor = r.status === 'ONLINE' ? '#10b981' : r.status === 'DEGRADED' ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={r.name} className={`p-4 rounded-2xl border transition-all ${r.battery < 30 ? 'border-red-500/60 bg-red-500/08' : 'border-polar-border bg-polar-dark/40'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-white">{r.name}</div>
                          <div className="text-[9px] font-mono text-slate-500">{r.pos} · Last: {r.lastComm} ago</div>
                        </div>
                        <Pill label={r.status} color={statColor} pulse={r.status !== 'ONLINE'} small />
                      </div>
                      <div className="space-y-1.5">
                        <BarMeter label="Battery" value={r.battery} max={100} unit="%" color={battColor} />
                        <BarMeter label="Solar Charge" value={r.solar} max={100} unit="%" color="#f59e0b" />
                      </div>
                      {r.battery < 30 && (
                        <div className="mt-2 text-[8px] font-mono text-red-300 font-bold border border-red-500/40 bg-red-500/12 px-2 py-1 rounded-lg animate-pulse">
                          ⚠️ LOW BATTERY — Field team will lose contact in ~{Math.round(r.battery / 5)} hours
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Inter-Station Link */}
                <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/06 space-y-2">
                  <div className="text-[9px] font-mono uppercase text-sky-400 font-bold">Inter-Station Link</div>
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-400">Maitri ↔ Bharati HF</span>
                    <Pill label="CONNECTED" color="#10b981" />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-400">Backup Iridium</span>
                    <Pill label="STANDBY" color="#64748b" />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-400">Cape Town SAR HF</span>
                    <Pill label="AVAILABLE" color="#10b981" />
                  </div>
                </div>
              </div>

              {/* AI Radio Log */}
              <div className="p-5 rounded-2xl border border-orange-500/30 bg-orange-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Digital Radio Log — AI Speech-to-Text Transcription
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg border border-orange-500/30 bg-polar-dark/40">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={radioLogSearch}
                    onChange={e => setRadioLogSearch(e.target.value)}
                    placeholder='Search logs (e.g. "Mayday", "Help")'
                    className="flex-1 bg-transparent text-[10px] font-mono text-white placeholder-slate-600 outline-none"
                  />
                  {radioLogSearch && <button onClick={() => setRadioLogSearch('')} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>}
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {filteredLogs.map((log, i) => {
                    const logColor = log.type === 'alert' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#64748b';
                    return (
                      <div key={i} className={`p-2.5 rounded-xl border text-[9px] font-mono ${log.type === 'alert' ? 'border-red-500/40 bg-red-500/08' : log.type === 'warn' ? 'border-amber-500/30 bg-amber-500/06' : 'border-polar-border bg-polar-dark/40'}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold" style={{ color: logColor }}>{log.team}</span>
                          <span className="text-slate-600">{log.time}</span>
                        </div>
                        <div className="text-slate-300 leading-relaxed">{log.msg}</div>
                        {log.type === 'alert' && <div className="text-red-400 font-bold mt-0.5">🚨 MAYDAY DETECTED</div>}
                      </div>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <div className="text-center text-slate-600 text-[10px] font-mono py-6">No matching radio logs</div>
                  )}
                </div>
              </div>

              {/* HF Propagation Forecast */}
              <div className="p-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4" /> HF Propagation Forecast
                </div>
                <HFPropChart currentHour={currentHour} />
                <div className="p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/08 space-y-2 text-[9px] font-mono">
                  <div className="font-bold text-yellow-300">Best Frequencies Right Now:</div>
                  {[
                    { freq: '5 MHz', quality: currentHour >= 6 && currentHour <= 18 ? 85 : 35, use: 'Medium range — Daytime' },
                    { freq: '14 MHz', quality: currentHour >= 8 && currentHour <= 20 ? 90 : 50, use: 'Long range — Day/Dusk' },
                    { freq: '21 MHz', quality: currentHour >= 4 && currentHour <= 10 ? 80 : 45, use: 'ISRO/Cape Town backup' },
                  ].map(f => (
                    <div key={f.freq} className="flex items-center justify-between border-b border-white/5 pb-1">
                      <div>
                        <span className="font-bold text-white">{f.freq}</span>
                        <span className="text-slate-500 ml-1.5">{f.use}</span>
                      </div>
                      <Pill label={f.quality > 70 ? 'BEST' : f.quality > 50 ? 'OK' : 'POOR'} color={f.quality > 70 ? '#10b981' : f.quality > 50 ? '#f59e0b' : '#ef4444'} small />
                    </div>
                  ))}
                </div>
                <div className="p-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/08 text-[9px] font-mono text-yellow-300">
                  📻 Ionosphere: {currentHour >= 6 && currentHour <= 18 ? 'Daytime — F2 layer active — Higher frequencies preferred' : 'Nighttime — F layer collapses — Shift to lower frequencies (5MHz)'}
                </div>

                {/* VHF field team status */}
                <div className="space-y-2">
                  <div className="text-[9px] font-mono uppercase text-slate-500 font-bold">VHF Field Team Radio Status</div>
                  {[
                    { team: 'Team Alpha', freq: 'VHF Ch.1', status: 'CLEAR', last: '2min' },
                    { team: 'Team Beta', freq: 'VHF Ch.2', status: 'RECOVERING', last: '12min' },
                    { team: 'Team Gamma', freq: 'VHF Ch.3', status: 'CLEAR', last: '5min' },
                  ].map(t => (
                    <div key={t.team} className="flex items-center justify-between p-2 rounded-lg border border-polar-border bg-polar-dark/40 text-[9px] font-mono">
                      <span className="text-white font-bold">{t.team}</span>
                      <span className="text-slate-500">{t.freq}</span>
                      <Pill label={t.status} color={t.status === 'CLEAR' ? '#10b981' : '#f59e0b'} small />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 4: DATA SCIENCE PIPELINE
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'datapipe' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Database className="w-6 h-6" />}
              title={isMaitri ? 'Scientific Data Pipeline — Maitri AWS/Seismic Uplink' : 'AGEOS Data Pipeline — ISRO Satellite Downlink & Upload'}
              subtitle="Data-to-Go Upload Queue · RAID Storage Health · AGEOS Satellite Download Status · Data Transmission Log"
              color="#f97316"
              layer="Layer 4 · Data Science Pipeline"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* Upload Queue */}
              <div className="p-5 rounded-2xl border border-orange-500/30 bg-orange-500/06 space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Data-to-Go Upload Queue
                </div>
                <div className="flex items-center justify-center gap-6">
                  <DataQueueDonut uploadedGb={uploadedGb} pendingGb={pendingGb} color="#f97316" />
                  <div className="space-y-2 text-[10px] font-mono">
                    <div><span className="text-slate-400">Uploaded Today</span><div className="text-lg font-black text-emerald-400">{uploadedGb} GB</div></div>
                    <div><span className="text-slate-400">In Queue</span><div className="text-lg font-black text-orange-400">{pendingGb} GB</div></div>
                    <div><span className="text-slate-400">ETA to Clear</span><div className="text-sm font-black text-amber-300">{etaHrs}h</div></div>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/08 text-[9px] font-mono text-orange-300">
                  Upload Queue: <span className="font-bold">{pendingGb} GB</span> · ETA to clear at current bandwidth: <span className="font-bold">{etaHrs} Hours</span>
                </div>
                <BarMeter label="Upload Progress" value={uploadedGb} max={uploadedGb + pendingGb} unit=" GB" color="#f97316" sub={`${Math.round((uploadedGb / (uploadedGb + pendingGb)) * 100)}% of daily quota uploaded`} />
                <div className="space-y-1.5">
                  {(isMaitri ? [
                    { type: 'AWS Telemetry', size: 12, status: 'UPLOADING' },
                    { type: 'Seismic Data', size: 8, status: 'QUEUED' },
                    { type: 'Magnetometer Logs', size: 4, status: 'QUEUED' },
                    { type: 'Ice Core Images', size: 18, status: 'QUEUED' },
                  ] : [
                    { type: 'IRS-P6 Imagery (AGEOS)', size: 280, status: 'DOWNLOADING' },
                    { type: 'Resourcesat-3 Data', size: 150, status: 'QUEUED' },
                    { type: 'Ocean Colour Monitor', size: 20, status: 'UPLOADING' },
                    { type: 'Chlorophyll Dataset', size: 0.4, status: 'DONE' },
                  ]).map(item => (
                    <div key={item.type} className="flex items-center justify-between text-[9px] font-mono border-b border-white/5 pb-1">
                      <span className="text-slate-300">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{item.size}GB</span>
                        <Pill label={item.status} color={item.status === 'DONE' ? '#10b981' : item.status === 'UPLOADING' || item.status === 'DOWNLOADING' ? '#06b6d4' : '#64748b'} pulse={item.status === 'UPLOADING' || item.status === 'DOWNLOADING'} small />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAID Health */}
              <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-2">
                  <HardDrive className="w-4 h-4" /> Storage RAID Health Monitor
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {raidDrives.map(d => (
                    <div key={d.id}
                      className={`p-2 rounded-xl text-center border text-[8px] font-mono transition-all ${!d.ok ? 'border-red-500/60 bg-red-500/18 animate-pulse' : 'border-emerald-500/30 bg-emerald-500/08'}`}>
                      <HardDrive className="w-4 h-4 mx-auto mb-1" style={{ color: d.ok ? '#10b981' : '#ef4444' }} />
                      <div className="font-bold" style={{ color: d.ok ? '#10b981' : '#ef4444' }}>{d.id}</div>
                      <div style={{ color: d.ok ? '#6ee7b7' : '#ef4444' }}>{d.health}%</div>
                    </div>
                  ))}
                </div>
                {raidDrives.some(d => !d.ok) && (
                  <div className="p-3 rounded-xl border border-red-500/60 bg-red-500/15 text-[9px] font-mono text-red-300 font-bold animate-pulse">
                    🚨 Drive A4 in Array A failing — Health: 45% — SWAP IMMEDIATELY to prevent data loss
                  </div>
                )}
                <div className="space-y-2">
                  {[
                    { label: 'Array A Status', val: raidDrives.slice(0, 4).some(d => !d.ok) ? 'DEGRADED' : 'HEALTHY', ok: !raidDrives.slice(0, 4).some(d => !d.ok) },
                    { label: 'Array B Status', val: raidDrives.slice(4).some(d => !d.ok) ? 'DEGRADED' : 'HEALTHY', ok: !raidDrives.slice(4).some(d => !d.ok) },
                    { label: 'Total Capacity', val: isMaitri ? '48 TB (RAID-6)' : '96 TB (RAID-6)', ok: true },
                    { label: 'Used Space', val: isMaitri ? '31.2 TB (65%)' : '78.4 TB (82%)', ok: true },
                    { label: 'Backup Last Run', val: '6h ago', ok: true },
                    { label: 'Tape Archive', val: isMaitri ? 'Monthly — Current' : 'Weekly — Current', ok: true },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-[9px] font-mono border-b border-white/5 pb-1">
                      <span className="text-slate-400">{r.label}</span>
                      <span className="font-bold" style={{ color: r.ok ? '#10b981' : '#ef4444' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AGEOS / Transmission Log */}
              <div className="space-y-4">
                {!isMaitri && (
                  <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/06 space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-2">
                      <Satellite className="w-4 h-4" /> AGEOS Satellite Download Status
                    </div>
                    <div className="p-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 space-y-2 text-[9px] font-mono">
                      <div className="font-bold text-white text-[10px]">🛰 IRS-P6 (ResourceSat-2A) Pass In Progress</div>
                      <BarMeter label="Download Progress" value={280} max={430} unit=" GB" color="#818cf8" />
                      <div className="flex justify-between text-slate-400">
                        <span>Pass window: 12 min remaining</span>
                        <span className="text-indigo-300 font-bold">65% complete</span>
                      </div>
                    </div>
                    {[
                      { sat: 'Cartosat-3', next: 'In 45min', dl: '18 GB' },
                      { sat: 'RISAT-2B', next: 'In 2h 10min', dl: '8 GB' },
                      { sat: 'Oceansat-3', next: 'In 5h 30min', dl: '12 GB' },
                    ].map(s => (
                      <div key={s.sat} className="flex items-center justify-between p-2.5 rounded-xl border border-polar-border bg-polar-dark/40 text-[9px] font-mono">
                        <span className="text-slate-300 font-bold">{s.sat}</span>
                        <span className="text-slate-500">Next pass: {s.next}</span>
                        <span className="text-indigo-300">{s.dl}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transmission Log */}
                <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Data Transmission Log</div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {[
                      { time: '14:30', event: 'AWS Batch Upload started', size: '12 GB', ok: true },
                      { time: '13:45', event: isMaitri ? 'Seismic data compressed and queued' : 'AGEOS downlink session started — IRS-P6', size: isMaitri ? '8 GB' : '280 GB', ok: true },
                      { time: '12:00', event: 'Daily backup to NCAOR archive completed', size: '4.2 GB', ok: true },
                      { time: '11:15', event: 'RAID rebuild initiated — Drive A4 fault', size: '—', ok: false },
                      { time: '10:30', event: 'Nightly data consolidation completed', size: '22 GB', ok: true },
                      { time: '08:00', event: 'Metadata sync to ISRO Hyderabad', size: '0.8 GB', ok: true },
                    ].map((log, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-[8px] font-mono border ${!log.ok ? 'border-red-500/30 bg-red-500/06' : 'border-polar-border/30'}`}>
                        <span className="text-slate-600 w-10 flex-shrink-0">{log.time}</span>
                        <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: log.ok ? '#10b981' : '#ef4444' }} />
                        <span className="text-slate-300 flex-1">{log.event}</span>
                        <span className="text-slate-500 flex-shrink-0">{log.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: WHAT-IF SIMULATOR
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Communication Link Scenario Sandbox
            </div>
            <p className="text-[10px] font-mono text-slate-500">
              Simulate link failures on an isolated cloned state. Live twin is never touched.
            </p>
            <div className="space-y-3">
              {WHAT_IF_PRESETS.map(sc => {
                const isActive = activeScenario === sc.id;
                return (
                  <button key={sc.id} onClick={() => runWhatIf(sc.id, sc.params)} disabled={whatIfLoading}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-sky-500/10 border-sky-500/50' : 'bg-polar-dark/50 border-polar-border hover:border-white/20'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-white">{sc.title}</div>
                      {isActive && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-300">ACTIVE</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">{sc.desc}</div>
                  </button>
                );
              })}
            </div>
            {whatIfLoading && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                <span className="text-xs font-mono text-sky-300">Simulating communication perturbation…</span>
              </div>
            )}
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
            {!whatIfResult ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-sm font-mono text-center gap-3">
                <Signal className="w-12 h-12 opacity-20" />
                <p>Select a scenario and run simulation to see impact on the cloned Digital Twin state.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/40">
                  <div className="text-xs font-mono font-bold text-sky-300">{WHAT_IF_PRESETS.find(p => p.id === activeScenario)?.title}</div>
                  <div className="text-[10px] font-mono text-emerald-300 mt-1">✓ CLONED-STATE VERIFIED — LIVE STATE SAFE</div>
                </div>
                {whatIfResult.baseline && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-mono">
                      <thead>
                        <tr className="border-b border-polar-border">
                          <th className="text-left text-slate-500 pb-2 pr-3">Metric</th>
                          <th className="text-left text-slate-500 pb-2 pr-3">Baseline</th>
                          <th className="text-left text-slate-500 pb-2 pr-3">Projected</th>
                          <th className="text-left text-slate-500 pb-2">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-polar-border/20">
                        {[
                          { label: 'Bandwidth', base: `${whatIfResult.baseline.bandwidth_mbps} Mbps`, proj: `${whatIfResult.projected.bandwidth_mbps} Mbps`, delta: `${whatIfResult.delta.bandwidth_delta_mbps} Mbps` },
                          { label: 'Signal delay', base: `${whatIfResult.baseline.latency_ms} ms`, proj: `${whatIfResult.projected.latency_ms} ms`, delta: `+${whatIfResult.delta.latency_delta_ms} ms` },
                          { label: 'Packet Loss', base: `${whatIfResult.baseline.packet_loss_pct}%`, proj: `${whatIfResult.projected.packet_loss_pct}%`, delta: `+${whatIfResult.delta.packet_loss_delta_pct}%` },
                          { label: 'Freshness', base: `${whatIfResult.baseline.telemetry_freshness_sec}s`, proj: `${whatIfResult.projected.telemetry_freshness_sec}s`, delta: `+${whatIfResult.delta.freshness_delta_sec}s` },
                        ].map(r => (
                          <tr key={r.label}>
                            <td className="py-2 pr-3 text-slate-400">{r.label}</td>
                            <td className="py-2 pr-3 text-slate-300">{r.base}</td>
                            <td className="py-2 pr-3 font-bold text-amber-300">{r.proj}</td>
                            <td className="py-2 font-bold text-rose-400">{r.delta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {whatIfResult.recommendation && (
                  <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
                    <div className="text-[10px] font-mono font-bold text-sky-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {whatIfResult.recommendation.title}
                    </div>
                    <p className="text-[10px] font-mono text-slate-300 leading-relaxed">{whatIfResult.recommendation.rationale}</p>
                    <div className="space-y-1">
                      {(whatIfResult.recommendation.actions ?? []).map((act: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[9px] font-mono text-slate-300">
                          <span className="text-sky-400 font-bold shrink-0">✓</span><span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => { setWhatIfResult(null); setActiveScenario(null); }}
                  className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <X className="w-3.5 h-3.5" /> Clear Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Drilldown Modals ── */}
      {activeModal === 'data speed' && (
        <Modal title="Link Bandwidth & Throughput Breakdown" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Total Capacity', v: `${bwCapacity} Mbps`, c: '#94a3b8' },
              { l: 'Active Throughput', v: `${bwMbps} Mbps`, c: '#38bdf8' },
              { l: 'Channel Utilization', v: `${utilPct}%`, c: '#10b981' },
              { l: 'Available Headroom', v: `${(bwCapacity - bwMbps).toFixed(1)} Mbps`, c: '#06b6d4' },
              { l: 'Tier 1 (Safety/ACS)', v: '35% — 32 Mbps', c: '#10b981' },
              { l: 'Tier 2 (Science)', v: '45% — 48 Mbps', c: '#06b6d4' },
              { l: 'Tier 3 (Crew)', v: `20% — ${qosThrottled ? 6 : 22} Mbps`, c: qosThrottled ? '#ef4444' : '#64748b' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'signal delay' && (
        <Modal title="Round-Trip Signal Delay & Jitter Profile" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Current Delay', v: `${latMs} ms`, c: '#10b981' },
              { l: '24-Hour Average', v: `${comm?.latency_avg_ms ?? 76} ms`, c: '#94a3b8' },
              { l: 'Peak Observed', v: `${comm?.latency_peak_ms ?? 94} ms`, c: '#f59e0b' },
              { l: 'Jitter', v: `±${comm?.latency_jitter_ms ?? 3} ms`, c: '#06b6d4' },
              { l: 'Trend', v: comm?.latency_trend ?? 'STABLE', c: '#10b981' },
              { l: 'Satellite Altitude', v: '35,786 km (GEO)', c: '#818cf8' },
              { l: 'Speed-of-light one-way', v: '~119 ms', c: '#94a3b8' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'packet_loss' && (
        <Modal title="Packet Delivery & Frame Statistics" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Drop Rate', v: `${lossP}%`, c: lossP < 0.5 ? '#10b981' : '#f59e0b' },
              { l: 'Total Sent', v: (comm?.packets_sent ?? 842100).toLocaleString(), c: '#94a3b8' },
              { l: 'Received', v: (comm?.packets_received ?? 841678).toLocaleString(), c: '#10b981' },
              { l: 'Dropped', v: `${comm?.packets_dropped ?? 422}`, c: '#ef4444' },
              { l: 'Status', v: comm?.packet_loss_status ?? 'OPTIMAL', c: '#10b981' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'snr' && (
        <Modal title="Signal-to-Noise Ratio Analysis" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Current SNR', v: `${snrDb} dB`, c: snrDb < 8 ? '#ef4444' : '#10b981' },
              { l: 'Alert Threshold', v: '8.0 dB', c: '#f59e0b' },
              { l: 'Band', v: isMaitri ? 'C-Band (uplink)' : 'Ku-Band (AGEOS primary)', c: '#818cf8' },
              { l: 'Dish Size', v: isMaitri ? '2.4m Radome' : 'Dual 3.0m Radomes', c: '#94a3b8' },
              { l: 'Cause if low', v: 'Snow on radome, rain fade, misalignment', c: '#f59e0b' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'solar' && (
        <Modal title="Solar Weather & Geomagnetic Conditions" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'K-Index', v: `${kIndex} (${kIndex >= 5 ? 'Storm' : kIndex >= 3 ? 'Active' : 'Quiet'})`, c: kColor },
              { l: 'Geomagnetic Activity', v: kIndex >= 5 ? 'STORM' : kIndex >= 3 ? 'ACTIVE' : 'QUIET', c: kColor },
              { l: 'Radio Blackout Risk', v: kIndex >= 6 ? 'R3 HIGH' : kIndex >= 4 ? 'R1 MINOR' : 'None', c: kIndex >= 4 ? '#ef4444' : '#10b981' },
              { l: 'Satcom Disruption', v: kIndex >= 5 ? 'Expected 3–4 hours' : 'None expected', c: kIndex >= 5 ? '#ef4444' : '#10b981' },
              { l: 'HF Impact', v: kIndex >= 5 ? 'Blackout risk on HF' : 'Propagation normal', c: kIndex >= 5 ? '#f97316' : '#10b981' },
              { l: 'Aurora Probability', v: kIndex >= 5 ? 'Very High (visible even at station)' : 'Low', c: '#818cf8' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'freshness' && (
        <Modal title="Digital Twin Telemetry Stream Health" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Current Freshness', v: `${freshSec}s`, c: '#818cf8' },
              { l: 'Expected Interval', v: `${comm?.expected_interval_sec ?? 2.0}s`, c: '#94a3b8' },
              { l: 'Data Confidence', v: `${dataConfidence}%`, c: '#10b981' },
              { l: 'Completeness', v: `${comm?.data_completeness_pct ?? 99.8}%`, c: '#06b6d4' },
              { l: 'Domains Synced', v: '16 of 16', c: '#10b981' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Asset detail modal */}
      {selectedAsset && (
        <Modal title={`Asset: ${selectedAsset.name}`} onClose={() => setSelectedAsset(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Status', v: selectedAsset.status, c: '#10b981' },
              { l: 'Health Index', v: `${selectedAsset.health_pct}%`, c: '#10b981' },
              { l: 'Power Draw', v: `${selectedAsset.power_draw_kw} kW`, c: '#f59e0b' },
              { l: 'Power Source', v: selectedAsset.power_source, c: '#94a3b8' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold truncate max-w-[200px] text-right" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
            <div className="p-2.5 rounded-lg bg-polar-dark border border-polar-border text-[10px] text-slate-400">
              <div className="font-bold text-slate-300 mb-1">Operating Condition</div>
              <p>{selectedAsset.operating_condition}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-polar-dark border border-sky-500/30 text-[10px] text-cyan-300">
              <div className="font-bold mb-1">Recent Event</div>
              <p>{selectedAsset.recent_event}</p>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      `}</style>
    </div>
  );
};

export default CommunicationPage;
