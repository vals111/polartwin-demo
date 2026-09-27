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
  ShieldAlert, Filter, Brain,
  Gauge, Mountain, Wind, Sun, FlaskConical, Recycle,
  BarChart3, Cpu
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// ── Animated Ring Gauge ───────────────────────────────────────────────────────
const RingGauge: React.FC<{
  value: number; max: number; unit: string; label: string;
  color: string; size?: number; warningAt?: number; warnDirection?: 'above' | 'below';
}> = ({ value, max, unit, label, color, size = 90, warningAt, warnDirection = 'above' }) => {
  const pct = clamp((value / max) * 100);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 99.2) / 100) * circ;
  const warn = warningAt && (warnDirection === 'below' ? value <= warningAt : value >= warningAt);
  const c = warn ? '#ef4444' : color;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: 'none' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} style={{ filter: 'none' }}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1s ease', filter: 'none' }}/>
        <text x={size/2} y={size/2 - 4} textAnchor="middle" fill="white" fontSize={size >= 70 ? 13 : 11} fontWeight="900" fontFamily="monospace">
          {value}
        </text>
        <text x={size/2} y={size/2 + 10} textAnchor="middle" fill={c} fontSize={size >= 70 ? 9 : 8} fontFamily="monospace" fontWeight="bold">
          {unit}
        </text>
      </svg>
      <div className="text-[9px] font-mono text-slate-300 text-center uppercase tracking-wide font-medium">{label}</div>
    </div>
  );
};

// ── Horizontal Bar Metric (Engineered Telemetry Meter) ─────────────────────────
const BarMetric: React.FC<{
  label: string; value: number; max: number; unit: string; color: string; sublabel?: string;
}> = ({ label, value, max, unit, color, sublabel }) => {
  const pct = clamp((value / max) * 100);
  return (
    <div className="space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="text-slate-200 font-semibold">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-white font-mono">{value} {unit}</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
            style={{ background: `${color}20`, color, border: `1px solid ${color}44` }}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="relative h-2.5 bg-slate-950/80 rounded-md overflow-hidden border border-white/10">
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none z-10 opacity-30">
          <span className="w-px h-full bg-white" style={{ left: '25%' }}/>
          <span className="w-px h-full bg-white" style={{ left: '50%' }}/>
          <span className="w-px h-full bg-white" style={{ left: '75%' }}/>
        </div>
        <div className="h-full rounded-md transition-all duration-1000 relative flex items-center justify-end"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}33, ${color})`, boxShadow: `0 0 8px ${color}66` }}>
          <div className="w-1.5 h-full bg-white rounded-r shadow-[0_0_6px_#fff]"/>
        </div>
      </div>
      {sublabel && (
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-300/80">
          <span className="w-1 h-1 rounded-full bg-cyan-400"/>
          {sublabel}
        </div>
      )}
    </div>
  );
};

// ── Analytics Bar Chart (Telemetry Instrument & EChart Graph) ─────────────────
interface AnalyticsMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  sublabel?: string;
}

const AnalyticsBarChart: React.FC<{
  title: string;
  items: AnalyticsMetric[];
  icon?: React.ReactNode;
}> = ({ title, items, icon }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    return () => {
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, []);

  useEffect(() => {
    const onResize = () => chartInst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInst.current) {
      chartInst.current = echarts.init(chartRef.current, 'dark');
    }
    const chart = chartInst.current;

    const labels = items.map(it => it.label).reverse();
    const data = items.map(it => ({
      value: clamp((it.value / it.max) * 100),
      rawVal: it.value,
      maxVal: it.max,
      unit: it.unit,
      sublabel: it.sublabel,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
          { offset: 0, color: it.color },
          { offset: 1, color: `${it.color}33` },
        ]),
        borderRadius: [0, 6, 6, 0],
      },
    })).reverse();

    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10, 18, 38, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (p: any) => {
          const d = p.data;
          return `<div style="font-weight:bold;margin-bottom:4px">${p.name}</div>
                  <div>Value: <span style="color:#38bdf8;font-weight:bold">${d.rawVal} ${d.unit}</span></div>
                  <div>Benchmark: ${d.maxVal} ${d.unit} (${d.value.toFixed(1)}%)</div>
                  ${d.sublabel ? `<div style="color:#94a3b8;font-size:10px;margin-top:2px">${d.sublabel}</div>` : ''}`;
        },
      },
      grid: {
        left: 8,
        right: 48,
        top: 16,
        bottom: 24,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        max: 100,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
        axisLabel: {
          formatter: '{value}%',
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: 'monospace',
        },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: {
          color: '#e2e8f0',
          fontSize: 12,
          fontFamily: 'monospace',
          fontWeight: '600',
          margin: 12,
        },
      },
      series: [
        {
          type: 'bar',
          data,
          barWidth: 26,
          barMaxWidth: 30,
          label: {
            show: true,
            position: 'right',
            distance: 8,
            formatter: (p: any) => `${p.value.toFixed(0)}%`,
            color: '#f8fafc',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
        },
      ],
    }, { notMerge: true, lazyUpdate: true });

    requestAnimationFrame(() => {
      chart.resize();
    });
  }, [items]);

  return (
    <div className="p-4 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
        {icon || <BarChart3 className="w-4 h-4 text-sky-400"/>}
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-200 font-bold">{title}</span>
      </div>

      {/* Chart always visible */}
      <div
        ref={chartRef}
        className="w-full flex-1"
        style={{ minHeight: items.length * 64 + 36, height: '100%' }}
      />
    </div>
  );
};

// ── Interactive Multi-Series Metric Chart ─────────────────────────────────────
const HeatmapGrid: React.FC<{
  title: string; rows: string[]; cols: string[];
  data: number[][]; colorScale?: [string, string, string];
}> = ({ title, rows, cols, data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);


  const palette = ['#38bdf8', '#f59e0b', '#a855f7', '#10b981', '#f43f5e', '#fb923c'];

  useEffect(() => {
    return () => {
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    const onResize = () => inst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) {
      inst.current = echarts.init(ref.current, 'dark');
    }
    const chart = inst.current;

    const series = rows.map((rowName, ri) => {
      const color = palette[ri % palette.length];
      const rowData = data[ri] || [];
      return {
        name: rowName,
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 6,
        data: rowData,
        itemStyle: { color },
        lineStyle: { width: 2, color },
      };
    });

    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 18, 38, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#38bdf866' },
          lineStyle: { color: '#38bdf844', type: 'dashed' },
        },
      },
      legend: {
        right: 8,
        top: 2,
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 8,
        textStyle: { color: '#cbd5e1', fontSize: 10, fontFamily: 'monospace' },
      },
      grid: {
        left: 10,
        right: 14,
        top: 36,
        bottom: 6,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: cols,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
      },
      series,
    }, { notMerge: true, lazyUpdate: true });
  }, [rows, cols, data]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-200 font-bold">{title}</span>
      </div>
      <div className="w-full rounded-xl border border-polar-border bg-polar-dark/40 p-2">
        <div ref={ref} className="w-full h-56" />
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
              <line x1={28} y1={y} x2={34} y2={y} stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
              <text x={22} y={y + 4} textAnchor="end" fill="rgba(226,232,240,0.8)" fontSize={9} fontFamily="monospace">{t}</text>
            </g>
          );
        })}
        <text x={30 + w / 2} y={20 + h / 2 - 8} textAnchor="middle" fill="white" fontSize={28} fontWeight="900" fontFamily="monospace">{c.toFixed(0)}%</text>
        <text x={30 + w / 2} y={20 + h / 2 + 12} textAnchor="middle" fill={fillColor} fontSize={12} fontFamily="monospace">{(liters / 1000).toFixed(2)}k L</text>
        <text x={30 + w / 2} y={20 + h / 2 + 26} textAnchor="middle" fill="rgba(226,232,240,0.75)" fontSize={9} fontFamily="monospace">of {(maxL / 1000).toFixed(0)}k L capacity</text>
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
    return () => {
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    const onResize = () => inst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) {
      inst.current = echarts.init(ref.current, 'dark');
    }
    const chart = inst.current;
    chart.setOption({
      animation: false,
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
        textStyle: { color: '#cbd5e1', fontSize: 10, fontFamily: 'monospace' },
        icon: 'circle', itemWidth: 8, itemHeight: 8,
      },
      series: [{
        type: 'pie', radius: ['38%', '68%'], center: ['35%', '50%'],
        avoidLabelOverlap: false, label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' } },
        data: [
          { value: Math.round(breakdown?.galley_kitchen_l_day || 320), name: 'Galley/Kitchen', itemStyle: { color: '#06b6d4' } },
          { value: Math.round(breakdown?.hygiene_showers_l_day || 410), name: 'Hygiene/Showers', itemStyle: { color: '#38bdf8' } },
          { value: Math.round(breakdown?.science_labs_l_day || 120), name: 'Science Labs', itemStyle: { color: '#818cf8' } },
          { value: Math.round(breakdown?.domestic_habitat_l_day || 350), name: 'Domestic', itemStyle: { color: '#10b981' } },
        ],
      }],
    }, { notMerge: true, lazyUpdate: true });
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
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  color: string;
  rightContent?: React.ReactNode;
}> = ({
  icon, title, color, rightContent
}) => (
  <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
    </div>
    {rightContent && (
      <div className="flex items-center gap-4">
        {rightContent}
      </div>
    )}
  </div>
);

// ── Thermal Depth Profile (ECharts visual wonder) ────────────────────────────
const ThermalDepthProfile: React.FC<{
  isMaitri: boolean;
  layers: { depth: string; temp: number; color: string }[];
}> = ({ isMaitri, layers }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    return () => {
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    const onResize = () => inst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current, 'dark');
    const chart = inst.current;

    const temps = layers.map(l => l.temp);
    const depths = layers.map(l => l.depth);
    const minT = Math.min(...temps) - 1;
    const maxT = Math.max(...temps) + 1;

    // Build rich gradient color per bar segment
    const gradients = layers.map((l) => ({
      type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
      colorStops: [
        { offset: 0, color: l.color + '22' },
        { offset: 0.6, color: l.color + 'bb' },
        { offset: 1, color: l.color },
      ],
    }));

    // Scatter overlay at bar tips
    const scatterData = layers.map((l, i) => ({
      value: [l.temp, i],
      itemStyle: { color: l.color },
    }));

    chart.setOption({
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      backgroundColor: 'transparent',
      grid: {
        top: 14,
        bottom: 12,
        left: 42,
        right: 48,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(6,12,28,0.95)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const layer = layers[p.dataIndex];
          return `<div style="font-family:monospace;font-size:11px">
            <div style="color:#cbd5e1;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Depth ${layer.depth}</div>
            <div style="color:${layer.color};font-size:18px;font-weight:900">${layer.temp}°C</div>
          </div>`;
        },
      },
      xAxis: {
        type: 'value',
        min: minT,
        max: maxT,
        axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
        axisLabel: {
          color: '#cbd5e1', fontFamily: 'monospace', fontSize: 10,
          formatter: (v: number) => `${v}°C`,
        },
      },
      yAxis: {
        type: 'category',
        data: depths,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', margin: 10,
          formatter: (v: string) => v,
        },
      },
      series: [
        {
          name: 'Thermal',
          type: 'bar',
          barWidth: 32,
          barMaxWidth: 36,
          data: layers.map((l, i) => ({
            value: l.temp,
            itemStyle: { color: gradients[i], borderRadius: [0, 8, 8, 0] },
          })),
          label: {
            show: true,
            position: 'right',
            distance: 8,
            formatter: (p: any) => `${layers[p.dataIndex].temp}°C`,
            color: '#f8fafc',
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 'bold',
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(56,189,248,0.4)' },
          },
        },
        {
          name: 'Tips',
          type: 'scatter',
          symbolSize: 10,
          data: scatterData,
          coordinateSystem: 'cartesian2d',
          z: 5,
        },
      ],
    }, { notMerge: true });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    if (ref.current) resizeObserver.observe(ref.current);

    requestAnimationFrame(() => {
      chart.resize();
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [layers, isMaitri]);

  return (
    <div ref={ref} className="w-full flex-1" style={{ minHeight: 356, height: '100%' }} />
  );
};

// ── Physical SCADA Apparatus Illustrations ────────────────────────────────────
const IntakeApparatus: React.FC<{ isMaitri: boolean; color: string }> = ({ isMaitri, color }) => (
  <svg width="130" height="135" viewBox="0 0 130 135" className="overflow-visible select-none">
    <defs>
      <linearGradient id="intakeWaterGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id="wellSteel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="45%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
    {/* Well Basin Wall */}
    <rect x="15" y="32" width="100" height="92" rx="8" fill="url(#wellSteel)" stroke="rgba(56,189,248,0.25)" strokeWidth="1.5" />
    {/* Basin Top Flange */}
    <rect x="10" y="28" width="110" height="8" rx="2" fill="#334155" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    {/* Water Reservoir */}
    <rect x="20" y="46" width="90" height="74" rx="4" fill="url(#intakeWaterGrad)" />
    {/* Wave surface */}
    <path d="M 20 48 Q 42 43 65 48 T 110 48 L 110 120 L 20 120 Z" fill="url(#intakeWaterGrad)" opacity="0.9" />
    <path d="M 22 48 Q 45 44 68 48 T 108 48" fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
    {/* Submersible Intake Pump */}
    <rect x="47" y="86" width="36" height="26" rx="4" fill="#091322" stroke="#38bdf8" strokeWidth="1.5" />
    <circle cx="65" cy="99" r="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
    {/* Strainer vents */}
    <line x1="52" y1="106" x2="56" y2="106" stroke="#38bdf8" strokeWidth="1.5" />
    <line x1="60" y1="106" x2="64" y2="106" stroke="#38bdf8" strokeWidth="1.5" />
    <line x1="66" y1="106" x2="70" y2="106" stroke="#38bdf8" strokeWidth="1.5" />
    <line x1="74" y1="106" x2="78" y2="106" stroke="#38bdf8" strokeWidth="1.5" />
    {/* Vertical Riser Pipe */}
    <rect x="61" y="10" width="8" height="76" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    {/* Outlet Pipe going to right */}
    <path d="M 61 18 L 61 10 L 130 10 L 130 18 L 69 18 Z" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    {/* Isolation Valve */}
    <rect x="92" y="7" width="5" height="14" rx="1" fill="#0284c7" />
    <line x1="94.5" y1="2" x2="94.5" y2="9" stroke="#e2e8f0" strokeWidth="1.5" />
    <line x1="88" y1="2" x2="101" y2="2" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    {/* Depth Level Ticks */}
    <line x1="24" y1="56" x2="30" y2="56" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
    <line x1="24" y1="72" x2="32" y2="72" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
    <line x1="24" y1="88" x2="30" y2="88" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
    <line x1="24" y1="104" x2="32" y2="104" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
    {/* Flow Arrow Indicator */}
    <polygon points="122,11 128,14 122,17" fill="#38bdf8" />
  </svg>
);

const FilterVesselApparatus: React.FC<{ isMaitri: boolean; color: string }> = ({ isMaitri, color }) => (
  <svg width="130" height="135" viewBox="0 0 130 135" className="overflow-visible select-none">
    <defs>
      <linearGradient id="vesselSteelGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="30%" stopColor="#334155" />
        <stop offset="65%" stopColor="#475569" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="sandBedGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#d97706" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    {/* Legs */}
    <rect x="30" y="112" width="6" height="18" rx="1" fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <rect x="94" y="112" width="6" height="18" rx="1" fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <rect x="25" y="128" width="16" height="3" rx="1" fill="#334155" />
    <rect x="89" y="128" width="16" height="3" rx="1" fill="#334155" />
    {/* Top Dished Head */}
    <path d="M 26 32 C 26 14, 104 14, 104 32 Z" fill="url(#vesselSteelGrad)" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" />
    {/* Main Cylinder Body */}
    <rect x="26" y="32" width="78" height="76" fill="url(#vesselSteelGrad)" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" />
    {/* Bottom Dished Head */}
    <path d="M 26 108 C 26 122, 104 122, 104 108 Z" fill="url(#vesselSteelGrad)" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" />
    {/* Inspection Sight Glass */}
    <rect x="42" y="38" width="46" height="62" rx="5" fill="#08101e" stroke="#06b6d4" strokeWidth="1.5" />
    {/* Water Header */}
    <rect x="44" y="40" width="42" height="12" fill="#0284c7" opacity="0.65" />
    {/* Anthracite Layer */}
    <rect x="44" y="52" width="42" height="14" fill="#334155" opacity="0.9" />
    {/* Silica Sand Layer */}
    <rect x="44" y="66" width="42" height="20" fill="url(#sandBedGrad)" />
    {/* Support Gravel Layer */}
    <rect x="44" y="86" width="42" height="12" fill="#475569" opacity="0.85" />
    {/* Top Pressure Gauge */}
    <line x1="65" y1="18" x2="65" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
    <circle cx="65" cy="5" r="7" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.2" />
    <line x1="65" y1="5" x2="69" y2="3" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    {/* Inlet Pipe from Left */}
    <rect x="0" y="10" width="32" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <path d="M 32 10 L 38 10 L 38 28 L 30 28 Z" fill="#475569" />
    {/* Outlet Pipe to Right */}
    <rect x="98" y="100" width="32" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
  </svg>
);

const UVReactorApparatus: React.FC<{ isMaitri: boolean; color: string }> = ({ isMaitri, color }) => {
  if (isMaitri) {
    return (
      <svg width="130" height="135" viewBox="0 0 130 135" className="overflow-visible select-none">
        <defs>
          <linearGradient id="uvSteelGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="40%" stopColor="#312e81" />
            <stop offset="70%" stopColor="#4338ca" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="quartzTubeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9d5ff" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {/* Support Saddles */}
        <path d="M 26 96 L 20 126 L 38 126 L 34 96 Z" fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <path d="M 96 96 L 92 126 L 110 126 L 104 96 Z" fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <rect x="14" y="125" width="102" height="3" rx="1" fill="#334155" />
        {/* Main UV Reactor Chamber */}
        <rect x="18" y="46" width="94" height="50" rx="8" fill="url(#uvSteelGrad)" stroke="#818cf8" strokeWidth="1.5" />
        {/* Reactor Flanges */}
        <rect x="12" y="42" width="7" height="58" rx="2" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <rect x="111" y="42" width="7" height="58" rx="2" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* Quartz Reactor Window */}
        <rect x="32" y="54" width="66" height="34" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.2" />
        {/* Dual Quartz UV Lamps */}
        <rect x="36" y="61" width="58" height="5" rx="2.5" fill="url(#quartzTubeGrad)" />
        <rect x="36" y="74" width="58" height="5" rx="2.5" fill="url(#quartzTubeGrad)" />
        {/* Germicidal Rays */}
        <line x1="45" y1="68" x2="85" y2="68" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.9" />
        {/* Top UV Optical Sensor */}
        <rect x="59" y="32" width="12" height="14" fill="#334155" stroke="#818cf8" strokeWidth="1" />
        <circle cx="65" cy="30" r="3.5" fill="#10b981" />
        {/* Inlet Pipe from Left */}
        <rect x="0" y="100" width="20" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <path d="M 20 100 L 26 100 L 26 94 L 20 94 Z" fill="#475569" />
        {/* Outlet Pipe to Right */}
        <path d="M 104 46 L 104 18 L 130 18 L 130 10 L 96 10 L 96 46 Z" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    );
  }
  // Bharati RO Skid
  return (
    <svg width="130" height="135" viewBox="0 0 130 135" className="overflow-visible select-none">
      <rect x="15" y="124" width="100" height="5" rx="2" fill="#334155" />
      {[38, 68, 98].map((y, idx) => (
        <g key={idx}>
          <rect x="16" y={y} width="98" height="20" rx="4" fill="#1e293b" stroke="#818cf8" strokeWidth="1.5" />
          <rect x="12" y={y-2} width="5" height="24" rx="2" fill="#475569" />
          <rect x="113" y={y-2} width="5" height="24" rx="2" fill="#475569" />
          <line x1="42" y1={y} x2="42" y2={y+20} stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
          <line x1="88" y1={y} x2="88" y2={y+20} stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
        </g>
      ))}
      <rect x="0" y="100" width="16" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path d="M 116 46 L 130 46 L 130 18 L 122 18 L 122 38 L 116 38 Z" fill="#475569" />
    </svg>
  );
};

const QASensorApparatus: React.FC<{ color: string }> = ({ color }) => (
  <svg width="130" height="135" viewBox="0 0 130 135" className="overflow-visible select-none">
    <defs>
      <linearGradient id="flowChamberGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#064e3b" stopOpacity="0.45" />
        <stop offset="50%" stopColor="#10b981" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#064e3b" stopOpacity="0.45" />
      </linearGradient>
    </defs>
    {/* Base Mounting Bracket */}
    <rect x="22" y="114" width="86" height="14" rx="3" fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    <circle cx="32" cy="121" r="2.5" fill="#475569" />
    <circle cx="98" cy="121" r="2.5" fill="#475569" />
    {/* Analytical Flow Chamber Body */}
    <rect x="18" y="52" width="94" height="50" rx="8" fill="#091424" stroke="#10b981" strokeWidth="1.5" />
    {/* Liquid Stream inside */}
    <rect x="20" y="60" width="90" height="34" rx="4" fill="url(#flowChamberGrad)" />
    {/* Laser Analysis Beam */}
    <line x1="22" y1="77" x2="108" y2="77" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.9" />
    {/* Probe 1: pH */}
    <rect x="34" y="20" width="7" height="44" rx="2" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <circle cx="37.5" cy="66" r="3.5" fill="#38bdf8" />
    {/* Probe 2: TDS Conductivity */}
    <rect x="61" y="16" width="8" height="48" rx="2" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <circle cx="65" cy="66" r="4" fill="#10b981" />
    {/* Probe 3: Turbidity Optical */}
    <rect x="89" y="20" width="7" height="44" rx="2" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <circle cx="92.5" cy="66" r="3.5" fill="#a855f7" />
    {/* Probe Transmitter Heads */}
    <circle cx="37.5" cy="16" r="4.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
    <circle cx="65" cy="12" r="5.5" fill="#0f172a" stroke="#10b981" strokeWidth="1.2" />
    <circle cx="92.5" cy="16" r="4.5" fill="#0f172a" stroke="#a855f7" strokeWidth="1.2" />
    {/* Potability OK Status LED */}
    <circle cx="104" cy="58" r="3" fill="#10b981" />
    {/* Inlet from Left */}
    <rect x="0" y="14" width="20" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <path d="M 20 14 L 20 58 L 28 58 L 28 22 L 20 22 Z" fill="#475569" />
    {/* Outlet to Right */}
    <rect x="110" y="73" width="20" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
  </svg>
);

const BufferTankApparatus: React.FC<{ fillPct: number; storageLiters: number; color: string }> = ({ fillPct, storageLiters, color }) => {
  const waterH = Math.max(8, Math.min(76, (fillPct / 100) * 76));
  return (
    <svg width="130" height="135" viewBox="0 0 130 135" className="overflow-visible select-none">
      <defs>
        <linearGradient id="tankSteelGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="25%" stopColor="#334155" />
          <stop offset="60%" stopColor="#475569" />
          <stop offset="90%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="tankFluidGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {/* Foundation Plinth */}
      <rect x="16" y="122" width="98" height="7" rx="2" fill="#1e293b" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Domed Roof */}
      <path d="M 20 38 C 20 18, 110 18, 110 38 Z" fill="url(#tankSteelGrad)" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" />
      {/* Roof Vent Cap */}
      <rect x="61" y="12" width="8" height="8" fill="#64748b" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path d="M 57 12 L 73 12 L 69 8 L 61 8 Z" fill="#94a3b8" />
      {/* Main Cylindrical Tank Body */}
      <rect x="20" y="38" width="90" height="84" fill="url(#tankSteelGrad)" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" />
      {/* Rib Bands */}
      <line x1="20" y1="62" x2="110" y2="62" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="20" y1="88" x2="110" y2="88" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* External Vertical Sight Glass Column */}
      <rect x="90" y="44" width="9" height="76" rx="2.5" fill="#0b1329" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      {/* Fluid in Sight Glass */}
      <rect x="91.5" y={120 - waterH} width="6" height={waterH} rx="1.5" fill="url(#tankFluidGrad)" />
      {/* Meniscus Line */}
      <line x1="90" y1={120 - waterH} x2="99" y2={120 - waterH} stroke="#ffffff" strokeWidth="1.5" />
      {/* Ticks */}
      <line x1="87" y1="48" x2="90" y2="48" stroke="#94a3b8" strokeWidth="1" />
      <line x1="87" y1="68" x2="90" y2="68" stroke="#94a3b8" strokeWidth="1" />
      <line x1="87" y1="88" x2="90" y2="88" stroke="#94a3b8" strokeWidth="1" />
      <line x1="87" y1="108" x2="90" y2="108" stroke="#94a3b8" strokeWidth="1" />
      {/* Digital Level Reading Badge */}
      <rect x="36" y="64" width="46" height="22" rx="4" fill="#0b1329" stroke="rgba(168,85,247,0.5)" strokeWidth="1" />
      <text x="59" y="79" textAnchor="middle" fill="#f1f5f9" fontSize="11" fontWeight="900" fontFamily="monospace">
        {fillPct.toFixed(0)}%
      </text>
      {/* Inlet from Left */}
      <rect x="0" y="73" width="20" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Outlet to Bottom Right */}
      <rect x="110" y="110" width="20" height="8" fill="#475569" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <polygon points="123,111 128,114 123,117" fill="#10b981" />
    </svg>
  );
};

// ── Live Treatment Process Flow Pipeline (Physical SCADA Digital Twin) ─────────
const TreatmentProcessFlow: React.FC<{
  isMaitri: boolean;
  fillPct: number;
  storageLiters: number;
  daysBuffer: number;
  productionRateHr: number;
}> = ({ isMaitri, fillPct, storageLiters, daysBuffer, productionRateHr }) => {
  const units = isMaitri
    ? [
        {
          tag: 'TK-101',
          step: '01',
          name: 'Lake Intake Well',
          type: 'Glacial Source Pump',
          metric: `${productionRateHr} L/hr`,
          detail: 'Temp 1.5°C · Lake Priyadarshini',
          status: 'ONLINE',
          ok: true,
          color: '#38bdf8',
          pipeFlow: '28 L/min',
          apparatus: <IntakeApparatus isMaitri={true} color="#38bdf8" />,
        },
        {
          tag: 'FL-201',
          step: '02',
          name: 'Sand Filter Vessel',
          type: 'Multi-Media Pressure Bed',
          metric: '0.4 NTU',
          detail: 'ΔP 0.18 bar · Bed Nominal',
          status: 'FILTERING',
          ok: true,
          color: '#06b6d4',
          pipeFlow: 'Pre-Filtered',
          apparatus: <FilterVesselApparatus isMaitri={true} color="#06b6d4" />,
        },
        {
          tag: 'RX-301',
          step: '03',
          name: 'UV Disinfection Chamber',
          type: '254nm Quartz Reactor',
          metric: '40 mJ/cm²',
          detail: '98% Intensity · Dual Lamps',
          status: 'ACTIVE',
          ok: true,
          color: '#818cf8',
          pipeFlow: 'Treated',
          apparatus: <UVReactorApparatus isMaitri={true} color="#818cf8" />,
        },
        {
          tag: 'QC-401',
          step: '04',
          name: 'QA Sensor Flow Cell',
          type: 'In-Line Potability Analyzer',
          metric: 'TDS 18 ppm',
          detail: 'pH 7.2 · Residual 0.2 mg/L',
          status: 'PASS',
          ok: true,
          color: '#10b981',
          pipeFlow: 'Verified',
          apparatus: <QASensorApparatus color="#10b981" />,
        },
        {
          tag: 'TK-501',
          step: '05',
          name: 'Potable Buffer Tank',
          type: 'Insulated Storage Bank',
          metric: `${(storageLiters / 1000).toFixed(1)}k L`,
          detail: `${fillPct.toFixed(0)}% Cap · ${daysBuffer}d Autonomy`,
          status: 'BUFFERING',
          ok: true,
          color: '#a855f7',
          pipeFlow: '',
          apparatus: <BufferTankApparatus fillPct={fillPct} storageLiters={storageLiters} color="#a855f7" />,
        },
      ]
    : [
        {
          tag: 'TK-101',
          step: '01',
          name: 'Marine Intake Sump',
          type: 'Quilty Bay Deep Inlet',
          metric: '45 L/min',
          detail: '6m Depth · Salinity 34.2',
          status: 'ONLINE',
          ok: true,
          color: '#38bdf8',
          pipeFlow: '45 L/min',
          apparatus: <IntakeApparatus isMaitri={false} color="#38bdf8" />,
        },
        {
          tag: 'FL-201',
          step: '02',
          name: 'Pre-Filter Skid',
          type: '5μm Cartridge + Antiscalant',
          metric: '3.0 mg/L',
          detail: 'SDI < 3 · Coagulant Active',
          status: 'NOMINAL',
          ok: true,
          color: '#06b6d4',
          pipeFlow: 'Pressurized',
          apparatus: <FilterVesselApparatus isMaitri={false} color="#06b6d4" />,
        },
        {
          tag: 'RX-301',
          step: '03',
          name: 'RO Membrane Rack',
          type: 'High-Pressure Desalination',
          metric: '62 bar',
          detail: '99.4% Rejection · 250 L/hr',
          status: 'OPTIMAL',
          ok: true,
          color: '#818cf8',
          pipeFlow: 'Permeate',
          apparatus: <UVReactorApparatus isMaitri={false} color="#818cf8" />,
        },
        {
          tag: 'QC-401',
          step: '04',
          name: 'Conditioning Cell',
          type: 'CaCO₃ / CO₂ Correction',
          metric: 'pH 7.5',
          detail: 'Hardness 45mg/L · UV Polish',
          status: 'ACTIVE',
          ok: true,
          color: '#10b981',
          pipeFlow: 'Conditioned',
          apparatus: <QASensorApparatus color="#10b981" />,
        },
        {
          tag: 'TK-501',
          step: '05',
          name: 'Potable Buffer Tank',
          type: 'SS316L Insulated Buffer',
          metric: `${(storageLiters / 1000).toFixed(1)}k L`,
          detail: `${fillPct.toFixed(0)}% Cap · ${daysBuffer}d Autonomy`,
          status: 'BUFFERING',
          ok: true,
          color: '#a855f7',
          pipeFlow: '',
          apparatus: <BufferTankApparatus fillPct={fillPct} storageLiters={storageLiters} color="#a855f7" />,
        },
      ];

  const kpis = [
    { label: 'Throughput', value: `${productionRateHr} L/hr`, color: '#38bdf8' },
    { label: 'Recovery', value: isMaitri ? '94.2%' : '97.1%', color: '#10b981' },
    { label: 'Compliance', value: '100%', color: '#a855f7' },
    { label: 'Uptime', value: '99.8%', color: '#f59e0b' },
  ];

  return (
    <div className="mb-5 rounded-2xl overflow-hidden shadow-2xl relative"
      style={{
        background: 'linear-gradient(135deg, rgba(4,9,22,0.99) 0%, rgba(8,14,34,0.99) 50%, rgba(4,9,22,0.99) 100%)',
        border: '1px solid rgba(56,189,248,0.12)',
      }}>

      {/* ── Header bar ── */}
      <div className="relative px-5 py-3 border-b flex items-center justify-between gap-4 flex-wrap"
        style={{ borderColor: 'rgba(56,189,248,0.08)', background: 'rgba(56,189,248,0.025)' }}>
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-white uppercase tracking-[0.15em]">
              Live Treatment Process Pipeline
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex w-1.5 h-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"/>
              </span>
              <span className="text-[9px] font-mono text-emerald-400 tracking-widest font-semibold">CLOSED-CIRCUIT ACTIVE</span>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="flex items-center gap-1">
          {kpis.map((k, i) => (
            <div key={k.label} className="px-3 py-1.5 rounded-lg text-center"
              style={{
                background: `${k.color}0d`,
                border: `1px solid ${k.color}22`,
                marginLeft: i > 0 ? 4 : 0,
              }}>
              <div className="text-[7px] font-mono text-slate-500 uppercase tracking-[0.2em]">{k.label}</div>
              <div className="text-[12px] font-black font-mono mt-0.5" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Industrial SCADA Process Flow Canvas ── */}
      <div className="relative p-5 overflow-x-auto">
        <div className="flex items-start justify-between min-w-[860px] gap-2 relative">
          {units.map((u, i) => (
            <React.Fragment key={u.tag}>
              {/* ── Apparatus Unit Column (Physical Representation) ── */}
              <div className="flex-1 flex flex-col items-center group relative cursor-default" style={{ minWidth: '150px' }}>
                
                {/* Equipment Tag Header */}
                <div className="flex items-center justify-between w-full px-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider bg-white/5 border border-white/10 text-slate-300">
                    {u.tag}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[7px] font-mono font-bold tracking-widest uppercase"
                    style={{
                      background: u.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${u.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: u.ok ? '#10b981' : '#ef4444',
                    }}>
                    ● {u.status}
                  </span>
                </div>

                {/* Physical Tank / Apparatus Graphic */}
                <div className="w-full flex items-center justify-center p-2 rounded-xl bg-white/[0.015] border border-white/5 group-hover:border-white/15 transition-all">
                  {u.apparatus}
                </div>

                {/* Apparatus Identity & Telemetry */}
                <div className="mt-3 text-center w-full px-1">
                  <div className="text-[12px] font-bold text-white font-mono leading-tight">{u.name}</div>
                  <div className="text-[8px] font-mono text-slate-400 mt-0.5">{u.type}</div>
                  
                  {/* Primary Metric */}
                  <div className="text-[17px] font-black font-mono mt-1.5" style={{ color: u.color }}>
                    {u.metric}
                  </div>
                  <div className="text-[8px] font-mono text-slate-400 mt-0.5 leading-snug">
                    {u.detail}
                  </div>
                </div>
              </div>

              {/* ── Animated Inter-Connecting Pipe Manifold ── */}
              {i < units.length - 1 && (
                <div className="flex flex-col items-center justify-center flex-shrink-0 w-8 lg:w-12 pt-16 relative z-10">
                  {/* Flanged steel pipe */}
                  <div className="relative w-full h-3 rounded-full overflow-hidden bg-slate-900 border border-white/15">
                    {/* Fluid stream */}
                    <div className="absolute inset-0 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${u.color}35, ${units[i+1].color}35)` }} />
                    {/* Animated fluid pulse */}
                    <div className="absolute inset-y-0.5 w-5 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${u.color}, ${units[i+1].color}, transparent)`,
                        animation: `flow ${1.5 + i * 0.2}s linear infinite`,
                      }} />
                  </div>
                  {/* Pipe flow label */}
                  <div className="text-[7px] font-mono text-slate-400 mt-1.5 text-center leading-none uppercase tracking-wider whitespace-nowrap">
                    {u.pipeFlow}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
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
  const [activeLayer, setActiveLayer] = useState<'source' | 'production' | 'distribution'>('source');

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

  const layers = [
    { id: 'source' as const, label: 'Source Monitoring', icon: <Mountain className="w-4 h-4"/>, color: '#38bdf8' },
    { id: 'production' as const, label: 'Production & Treatment', icon: <FlaskConical className="w-4 h-4"/>, color: '#818cf8' },
    { id: 'distribution' as const, label: 'Distribution & Storage', icon: <Droplet className="w-4 h-4"/>, color: '#06b6d4' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 15% 50%, #38bdf808 0%, transparent 60%), radial-gradient(ellipse at 85% 50%, #818cf808 0%, transparent 60%)' }}/>
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Droplet className="w-8 h-8 text-sky-400"/> Water Domain Digital Twin
            </h1>
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
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 font-semibold mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono text-slate-300 mt-0.5">{kpi.sub}</div>
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
              : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
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
              color="#38bdf8"
              rightContent={
                <div className="flex items-center gap-5 flex-wrap justify-end">
                  <div className="p-2.5 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 min-w-[200px]">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-amber-300 font-bold mb-1">
                      {isMaitri ? 'Frazil Ice Index' : 'Sediment Load Index'}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-xl font-black font-mono text-amber-300">
                        {isMaitri ? '0.12' : '0.31'}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden w-24">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-500/50 to-amber-400"
                            style={{ width: isMaitri ? '12%' : '31%' }}/>
                        </div>
                        <div className="text-[8px] font-mono text-slate-300 mt-0.5">Index 0–1 (alert at 0.5)</div>
                      </div>
                    </div>
                  </div>
                  <RingGauge value={isMaitri ? 3.2 : 6.0} max={10} unit="m" label={isMaitri ? 'Ice Thickness' : 'Inlet Depth'} color="#38bdf8" size={76}/>
                  <RingGauge value={isMaitri ? 0.8 : 3.2} max={5} unit="NTU" label="Turbidity" color="#818cf8" size={76} warningAt={4}/>
                </div>
              }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Thermal Gradient — ECharts visual */}
              <div className="p-4 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl flex flex-col justify-between h-full">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-rose-400" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-200 font-bold">
                      {isMaitri ? 'Thermal Gradient — Depth Profile' : 'Seawater Temperature Profile'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex w-2 h-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"/>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"/>
                      </span>
                      <span className="text-[8px] font-mono text-sky-400 uppercase tracking-widest font-bold">LIVE SCAN</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
                      {isMaitri ? 'Lake Priyadarshini · 0–4m' : 'Quilty Bay · 0–10m'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center pt-2">
                  <ThermalDepthProfile
                    isMaitri={isMaitri}
                    layers={isMaitri
                      ? [
                          { depth: '0m', temp: -12, color: '#f43f5e' },
                          { depth: '0.5m', temp: -6, color: '#fb923c' },
                          { depth: '1m', temp: -2, color: '#eab308' },
                          { depth: '2m', temp: 1.5, color: '#10b981' },
                          { depth: '3m', temp: 2.8, color: '#38bdf8' },
                          { depth: '4m', temp: 3.2, color: '#a855f7' },
                        ]
                      : [
                          { depth: '0m', temp: -1.8, color: '#f43f5e' },
                          { depth: '2m', temp: 0.5, color: '#fb923c' },
                          { depth: '4m', temp: 2.1, color: '#eab308' },
                          { depth: '6m', temp: 3.5, color: '#10b981' },
                          { depth: '8m', temp: 4.2, color: '#38bdf8' },
                          { depth: '10m', temp: 4.8, color: '#a855f7' },
                        ]
                    }
                  />
                </div>
              </div>

              {/* Source Quality Metrics */}
              <div className="h-full">
                <AnalyticsBarChart
                  title="Source Water Quality Analytics"
                  items={[
                    { label: isMaitri ? 'Lake Volume (Est.)' : 'Tidal Volume', value: isMaitri ? 4200 : 18000, max: isMaitri ? 6000 : 25000, unit: 'kL', color: '#38bdf8' },
                    { label: 'Dissolved Oxygen', value: isMaitri ? 11.2 : 8.4, max: 14, unit: 'mg/L', color: '#ec4899' },
                    { label: isMaitri ? 'Glacial Melt Rate' : 'Salinity', value: isMaitri ? 0.8 : 34.2, max: isMaitri ? 3 : 40, unit: isMaitri ? 'L/s' : 'ppt', color: '#818cf8' },
                    { label: 'pH Level', value: isMaitri ? 7.2 : 8.1, max: 14, unit: '', color: '#10b981', sublabel: 'Optimal range 6.5–8.5' },
                    { label: 'Conductivity', value: isMaitri ? 42 : 52000, max: isMaitri ? 200 : 60000, unit: isMaitri ? 'μS/cm' : 'μS/cm', color: '#f59e0b' },
                  ]}
                />
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
              color="#818cf8"
              rightContent={
                <div className="flex items-center gap-6">
                  <RingGauge value={waterQuality} max={100} unit="WQI%" label="Water Quality" color="#10b981" size={76} warningAt={70} warnDirection="below"/>
                  <RingGauge value={traceDrawKw} max={10} unit="kW" label="Trace Heat" color="#f97316" size={76}/>
                </div>
              }
            />

            {/* Hydraulic Treatment Process Flow */}
            <TreatmentProcessFlow
              isMaitri={isMaitri}
              fillPct={fillPct}
              storageLiters={storageLiters}
              daysBuffer={daysBuffer}
              productionRateHr={productionRateHr}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Treatment Metrics */}
              <AnalyticsBarChart
                title="Treatment Performance"
                items={[
                  { label: 'Production Rate', value: productionRateHr, max: isMaitri ? 180 : 250, unit: 'L/hr', color: '#38bdf8' },
                  { label: 'Treatment Efficiency', value: isMaitri ? 94 : 97, max: 100, unit: '%', color: '#10b981' },
                  { label: isMaitri ? 'UV Dose' : 'Membrane Pressure', value: isMaitri ? 40 : 62, max: isMaitri ? 60 : 80, unit: isMaitri ? 'mJ/cm²' : 'bar', color: '#a855f7' },
                  { label: 'Post-Treatment TDS', value: isMaitri ? 18 : 42, max: isMaitri ? 50 : 100, unit: 'ppm', color: '#f59e0b', sublabel: 'Limit: 500 ppm (WHO)' },
                  ...(!isMaitri ? [{ label: 'Salt Rejection Rate', value: 99.4, max: 100, unit: '%', color: '#ec4899', sublabel: 'RO membrane performance' }] : []),
                ]}
              />

              {/* Chemical Dosing */}
              <div className="p-4 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
                  <Activity className="w-4 h-4 text-purple-400"/>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-200 font-bold">
                    {isMaitri ? 'Dosing & Disinfection' : 'Chemical Dosing System'}
                  </span>
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-between pt-3">
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
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all">
                      <div>
                        <div className="text-[11px] font-mono text-slate-200 font-medium">{item.label}</div>
                        <div className="text-[9px] font-mono text-slate-300 mt-0.5">{item.sub}</div>
                      </div>
                      <StatusBadge label={item.val} ok={item.ok}/>
                    </div>
                  ))}
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
              color="#06b6d4"
              rightContent={
                <div className="p-2.5 px-4 rounded-xl border flex items-center gap-4"
                  style={{ borderColor: `${freezeColor}44`, background: `${freezeColor}0D` }}>
                  <svg viewBox="0 0 72 72" width="60" height="60">
                    <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
                    <circle cx="36" cy="36" r="28" fill="none" stroke={freezeColor} strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28 * Math.min(1, Math.max(0, (pipeTemp - 0) / 10))} ${2 * Math.PI * 28}`}
                      transform="rotate(-90 36 36)"/>
                    <text x="36" y="41" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="monospace">{pipeTemp}°</text>
                  </svg>
                  <div className="text-xs font-mono space-y-1">
                    <div className="text-[9px] font-mono uppercase tracking-wider font-bold" style={{ color: freezeColor }}>Pipeline Thermal Integrity</div>
                    <div className="text-slate-200">Freeze Risk: <span className="font-bold" style={{ color: freezeColor }}>{freezeRisk}</span></div>
                    <div className="text-slate-300 text-[10px]">Margin: <span className="text-white font-semibold">{(pipeTemp - 0.5).toFixed(1)}°C</span> · Trace: <span className="font-bold text-orange-300">{traceActive ? `ACTIVE (${traceDrawKw}kW)` : 'STANDBY'}</span></div>
                  </div>
                </div>
              }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div className="flex justify-between text-[9px] font-mono text-slate-300 font-medium">
                    <span>EMPTY</span><span className="text-red-400 font-bold">CRITICAL 20%</span><span className="text-amber-400 font-bold">BUFFER 40%</span><span>FULL</span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg border border-sky-500/20 bg-sky-500/07 text-center">
                    <div className="text-[9px] font-mono text-slate-300 font-semibold">Net Balance</div>
                    <div className="text-sm font-black font-mono" style={{ color: netColor }}>{netDaily >= 0 ? '+' : ''}{netDaily.toFixed(0)} L/d</div>
                  </div>
                  <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/07 text-center">
                    <div className="text-[9px] font-mono text-slate-300 font-semibold">Autonomy</div>
                    <div className="text-sm font-black font-mono text-emerald-300">{daysBuffer} Days</div>
                  </div>
                </div>
              </div>

              {/* Consumption Breakdown */}
              <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-200 font-bold">
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
                    <span className="text-slate-200 font-medium">Total Daily</span>
                    <span className="font-bold text-sky-300">{dailyConsumption.toLocaleString()} L/day</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-medium">Per Capita</span>
                    <span className="font-bold text-slate-200">{Math.round(dailyConsumption / (isMaitri ? 25 : 35))} L/person/day</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wastewater Section */}
            <div className="mt-6 pt-5 border-t border-polar-border/40">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-200 font-bold mb-4 flex items-center gap-2">
                <Recycle className="w-4 h-4 text-emerald-400"/> Wastewater Treatment Loop — Closed-Circuit Recovery
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Wastewater Generated', val: `${isMaitri ? '1,080' : '1,485'} L/day`, color: '#38bdf8', icon: <Droplet className="w-4 h-4"/>, sub: '90% of daily intake' },
                  { label: 'Greywater Recycled', val: `${isMaitri ? '360' : '500'} L/day`, color: '#10b981', icon: <Recycle className="w-4 h-4"/>, sub: `${isMaitri ? '33' : '34'}% recovery rate` },
                  { label: 'Blackwater to STP', val: `${isMaitri ? '720' : '985'} L/day`, color: '#818cf8', icon: <Filter className="w-4 h-4"/>, sub: isMaitri ? 'Aerobic Digestion' : 'MBR Ultrafiltration' },
                  { label: 'Effluent Compliance', val: 'Madrid Protocol', color: '#10b981', icon: <ShieldCheck className="w-4 h-4"/>, sub: 'Annex III compliant' },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-2xl border transition-all hover:scale-[1.02]"
                    style={{ borderColor: `${item.color}33`, background: `${item.color}08` }}>
                    <div className="flex items-center gap-2 mb-2" style={{ color: item.color }}>
                      {item.icon}
                      <span className="text-[9px] font-mono uppercase text-slate-300 font-medium">{item.label}</span>
                    </div>
                    <div className="text-lg font-black font-mono" style={{ color: item.color }}>{item.val}</div>
                    <div className="text-[9px] font-mono text-slate-300 mt-0.5">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage Trend */}
            <div className="mt-4 p-4 rounded-2xl border border-polar-border bg-polar-dark/40">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono uppercase text-slate-200 font-bold">Storage Level Trend (12h)</span>
                <span className="text-[10px] font-mono text-sky-300 font-bold">{fillPct.toFixed(1)}% current</span>
              </div>
              <SparklineChart data={storageTrend} color="#38bdf8" height={50}/>
            </div>
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
