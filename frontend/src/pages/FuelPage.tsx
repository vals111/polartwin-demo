import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Fuel, Flame, AlertTriangle, ShieldCheck, Clock,
  ArrowRight, RefreshCw, Thermometer, Layers,
  Gauge, Activity, Truck, Play, X, Zap, Sun,
  ArrowUpRight, TrendingDown, ThermometerSnowflake,
  Sparkles, AlertOctagon, Brain
} from 'lucide-react';

// ── Animated 3D Cylinder Tank ───────────────────────────────────────────────
const CylinderTank: React.FC<{
  pct: number;
  label: string;
  liters: number;
  capacity: number;
  status: string;
  tempC: number;
  color?: string;
  selected?: boolean;
  onClick?: () => void;
}> = ({ pct, label, liters, capacity, status, tempC, color = '#f59e0b', selected, onClick }) => {
  const clamp = Math.max(0, Math.min(100, pct));
  const activeColor = clamp < 15 ? '#ef4444' : clamp < 30 ? '#f59e0b' : color;
  const statusColor = status === 'ONLINE' ? '#10b981' : status === 'TRANSFERRING' ? '#06b6d4' : '#64748b';
  const h = 140;
  const w = 56;
  const fillH = (clamp / 100) * h;

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 cursor-pointer group transition-all ${selected ? 'scale-105' : 'hover:scale-102'}`}
    >
      <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider text-center leading-tight max-w-[64px]">
        {label}
      </div>
      <div className="relative" style={{ width: w, height: h + 16 }}>
        {/* Tank top ellipse */}
        <svg width={w} height={16} className="absolute top-0 left-0" style={{ zIndex: 2 }}>
          <ellipse cx={w / 2} cy={8} rx={w / 2 - 2} ry={7}
            fill={selected ? `${activeColor}33` : 'rgba(15,23,42,0.9)'}
            stroke={selected ? activeColor : 'rgba(255,255,255,0.12)'} strokeWidth={1.5} />
          {status === 'TRANSFERRING' && (
            <ellipse cx={w / 2} cy={8} rx={w / 2 - 6} ry={4}
              fill="none" stroke={activeColor} strokeWidth={1} strokeDasharray="3 2"
              className="animate-spin" style={{ transformOrigin: `${w / 2}px 8px`, animationDuration: '3s' }} />
          )}
        </svg>

        {/* Tank body */}
        <div className="absolute rounded-sm overflow-hidden border border-white/10"
          style={{
            top: 8, left: 0, width: w, height: h,
            background: 'rgba(8,15,30,0.9)',
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)',
          }}>
          {/* Grid lines */}
          {[25, 50, 75].map(t => (
            <div key={t} className="absolute left-0 right-0 border-t border-white/5" style={{ bottom: `${t}%` }}>
              <span className="absolute right-1 text-[7px] font-mono text-white/20" style={{ top: -6 }}>{t}</span>
            </div>
          ))}
          {/* Liquid fill */}
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1200 ease-out"
            style={{
              height: `${clamp}%`,
              background: `linear-gradient(to top, ${activeColor}cc 0%, ${activeColor}44 100%)`,
            }}>
            {/* Wave shimmer */}
            <div className="absolute top-0 left-0 right-0 h-2 animate-pulse opacity-60"
              style={{ background: `linear-gradient(90deg, transparent, ${activeColor}88, transparent)` }} />
            {/* Bubble */}
            {clamp > 10 && (
              <div className="absolute w-1 h-1 rounded-full animate-bounce"
                style={{ background: `${activeColor}99`, left: '30%', top: 4, animationDelay: '0.3s' }} />
            )}
          </div>
          {/* Pct label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-black font-mono text-white/70">{clamp.toFixed(0)}%</span>
          </div>
          {/* Temp strip */}
          <div className="absolute top-1 right-1 text-[8px] font-mono text-white/40 flex items-center gap-0.5">
            <ThermometerSnowflake className="w-2 h-2" />{tempC}°
          </div>
        </div>

        {/* Bottom ellipse */}
        <svg width={w} height={16} className="absolute bottom-0 left-0">
          <ellipse cx={w / 2} cy={8} rx={w / 2 - 2} ry={7}
            fill="rgba(8,15,30,0.9)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        </svg>
      </div>

      {/* Status dot */}
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
        <span className="text-[8px] font-mono" style={{ color: statusColor }}>{status}</span>
      </div>
      <div className="text-[9px] font-mono text-slate-500">{(liters / 1000).toFixed(1)}k/{(capacity / 1000).toFixed(0)}k L</div>
    </div>
  );
};

// ── Radial Burn Rate Gauge ──────────────────────────────────────────────────
const BurnRadialGauge: React.FC<{
  value: number; max: number; unit: string; label: string;
  color?: string; size?: number;
}> = ({ value, max, unit, label, color = '#f59e0b', size = 120 }) => {
  const pct = Math.min(1, value / max);
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * pct;
  const offset = arcLen - filled;
  const rotation = 135;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`bg-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`${color}22`} />
            <stop offset="100%" stopColor={`${color}44`} />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={10}
          strokeLinecap="round" strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={-(circ - arcLen) * 0.125}
          transform={`rotate(${rotation} ${size / 2} ${size / 2})`} />
        {/* Value arc */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeLinecap="round" strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={offset - (circ - arcLen) * 0.125 + arcLen - filled}
          transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        {/* Center */}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
          fill="white" fontSize={size * 0.16} fontWeight="900" fontFamily="monospace">
          {value.toFixed(1)}
        </text>
        <text x={size / 2} y={size / 2 + 10} textAnchor="middle"
          fill={color} fontSize={size * 0.09} fontFamily="monospace">
          {unit}
        </text>
      </svg>
      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center">{label}</div>
    </div>
  );
};

// ── Fuel Flow Pipeline ──────────────────────────────────────────────────────
const FuelFlowPipeline: React.FC<{
  flowRate: number; pumpStatus: string; dayTankPct: number;
  sourceTank: string; destination: string; isMaitri: boolean;
}> = ({ flowRate, pumpStatus, dayTankPct, sourceTank, destination, isMaitri }) => {
  const isRunning = pumpStatus === 'RUNNING';
  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-900/10 via-polar-dark/50 to-emerald-900/10 border border-polar-border">
      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-3">
        ⚡ Live Fuel Transfer Loop
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        {/* Source Tank */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <div className="w-12 h-16 rounded-lg border border-amber-500/40 bg-amber-500/10 relative overflow-hidden flex items-end">
            <div className="w-full transition-all duration-1000" style={{ height: '76%', background: 'linear-gradient(to top, #f59e0bcc, #f59e0b44)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-mono text-white/70">76%</span>
            </div>
          </div>
          <span className="text-[9px] text-amber-300 text-center leading-tight max-w-[80px]">{sourceTank.replace('Bulk ', '').replace('Coastal ', '')}</span>
        </div>

        {/* Pipeline */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[9px] text-slate-400 font-mono">{flowRate} L/min</div>
          <div className="relative w-full h-3 rounded-full bg-polar-darker border border-amber-500/20 overflow-hidden">
            {isRunning && (
              <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent animate-[flow_1.5s_linear_infinite]"
                style={{ animationName: 'flow', animationDuration: '1.5s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} />
            )}
            <div className="absolute inset-y-0 w-full"
              style={{
                background: isRunning
                  ? 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.4) 50%, transparent 100%)'
                  : 'transparent',
                animation: isRunning ? 'flow 1.5s linear infinite' : 'none'
              }} />
          </div>
          <div className={`flex items-center gap-1 text-[9px] font-mono ${isRunning ? 'text-emerald-300' : 'text-amber-300'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            PUMP: {pumpStatus}
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />

        {/* Day Tank */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <div className="w-12 h-16 rounded-lg border border-cyan-500/40 bg-cyan-500/10 relative overflow-hidden flex items-end">
            <div className="w-full transition-all duration-1000" style={{ height: `${dayTankPct}%`, background: 'linear-gradient(to top, #06b6d4cc, #06b6d444)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-mono text-white/70">{dayTankPct.toFixed(0)}%</span>
            </div>
          </div>
          <span className="text-[9px] text-cyan-300 text-center leading-tight max-w-[80px]">{isMaitri ? 'Generator Day Tank' : 'CHP Header Day Tank'}</span>
        </div>

        <ArrowRight className="w-4 h-4 text-cyan-500 shrink-0" />

        {/* Generator */}
        <div className="flex flex-col items-center gap-1 min-w-[70px]">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[9px] text-emerald-300 text-center">Generator{isMaitri ? '' : '\n/ CHP'}</span>
        </div>
      </div>
    </div>
  );
};

// ── Burn Rate Waterfall EChart ──────────────────────────────────────────────
const BurnWaterfallChart: React.FC<{ drivers: any; isMaitri: boolean }> = ({ drivers, isMaitri }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const items = [
      { name: 'Generator', value: drivers.generator_burn_l_hr || 17.5, color: '#f59e0b' },
      { name: 'Heating', value: drivers.heating_burn_equiv_l_hr || 8.3, color: '#818cf8' },
      { name: 'Research', value: drivers.science_burn_equiv_l_hr || 3.1, color: '#06b6d4' },
      { name: 'Base Load', value: drivers.base_station_load_kw ? drivers.base_station_load_kw * 0.26 : 9.1, color: '#64748b' },
      { name: 'Aux Boiler', value: drivers.auxiliary_boiler_l_hr || 2.7, color: '#f97316' },
      { name: '− Solar', value: -(drivers.solar_fuel_saved_l_hr || 4.7), color: '#22c55e' },
    ];

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, bottom: 34, left: 70, right: 16 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (p: any) => `${p[0].name}: <b>${Math.abs(p[0].value).toFixed(2)} L/hr</b>`,
      },
      xAxis: {
        type: 'category',
        data: items.map(i => i.name),
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      yAxis: {
        type: 'value',
        name: 'L/hr',
        nameTextStyle: { color: '#64748b', fontSize: 9 },
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      series: [{
        type: 'bar',
        data: items.map(i => ({
          value: i.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: i.value < 0 ? '#22c55e' : i.color },
              { offset: 1, color: i.value < 0 ? '#15803d66' : `${i.color}66` },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: '55%',
      }],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [drivers, isMaitri]);

  return <div ref={ref} className="w-full h-44" />;
};

// ── 30-Day Forecast EChart ──────────────────────────────────────────────────
const FuelForecastChart: React.FC<{
  currentLevel: number; totalCapacity: number; burnRate: number; stationId: string;
}> = ({ currentLevel, totalCapacity, burnRate, stationId }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const dailyBurn = burnRate * 24;
    const dates: string[] = [];
    const proj: number[] = [];
    const low: number[] = [];
    const high: number[] = [];
    const now = new Date();

    for (let d = 0; d <= 30; d++) {
      const dt = new Date(now.getTime() + d * 86400000);
      dates.push(dt.toISOString().slice(5, 10));
      const p = Math.max(0, Math.round(currentLevel - d * dailyBurn));
      proj.push(p);
      const m = Math.round(Math.sqrt(d) * dailyBurn * 0.2);
      low.push(Math.max(0, p - m));
      high.push(Math.min(totalCapacity, p + m));
    }

    const watch = totalCapacity * 0.5;
    const critical = totalCapacity * 0.15;

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
      grid: { top: 28, bottom: 36, left: 72, right: 20 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: any) => {
          const main = params.find((p: any) => p.seriesName === 'Reserve');
          if (!main) return '';
          const pct = ((main.value / totalCapacity) * 100).toFixed(1);
          return `<b style="color:#f59e0b">${main.axisValue}</b><br/>Reserve: <b>${main.value?.toLocaleString()} L</b> (${pct}%)`;
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
        {
          name: 'Confidence Low', type: 'line', data: low, lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(245,158,11,0.06)' }, stack: 'band', symbol: 'none',
        },
        {
          name: 'Band', type: 'line', data: high.map((v, i) => v - low[i]),
          lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(245,158,11,0.10)' },
          stack: 'band', symbol: 'none',
        },
        {
          name: 'Reserve', type: 'line', data: proj, smooth: true, symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2.5 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b44' }, { offset: 1, color: '#f59e0b08' }]) },
          markLine: {
            silent: true,
            lineStyle: { type: 'dashed', width: 1 },
            data: [
              { yAxis: watch, lineStyle: { color: '#06b6d4' }, label: { formatter: '50% Watch', color: '#06b6d4', fontSize: 9, fontFamily: 'monospace' } },
              { yAxis: critical, lineStyle: { color: '#ef4444' }, label: { formatter: '15% Critical', color: '#ef4444', fontSize: 9, fontFamily: 'monospace' } },
            ],
          },
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [currentLevel, totalCapacity, burnRate, stationId]);

  return <div ref={ref} className="w-full h-56" />;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const FuelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk } = useTelemetryStore();

  const [fuelDetails, setFuelDetails] = useState<any>(null);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tanks' | 'flow' | 'forecast' | 'whatif'>('tanks');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [scenarioType, setScenarioType] = useState<string>('resupply_delay');

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await resourcesApi.getFuel(stationId);
        if (mounted && res?.fuel) setFuelDetails(res.fuel);
      } catch {}
    };
    load();
    const iv = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [stationId]);

  const snapshot = liveSnapshot[stationId];
  const liveFuel = snapshot?.fuel;
  const env = snapshot?.environment;
  const eng = snapshot?.energy;

  const totalCapacity = liveFuel?.total_capacity ?? fuelDetails?.total_capacity ?? (isMaitri ? 180000 : 300000);
  const currentLevel = liveFuel?.current_level ?? fuelDetails?.current_level ?? (isMaitri ? 138000 : 245000);
  const percentage = liveFuel?.fuel_percentage ?? ((currentLevel / totalCapacity) * 100);
  const burnRate = liveFuel?.consumption_rate_l_per_hr ?? fuelDetails?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.8);
  const daysRemaining = liveFuel?.days_remaining ?? fuelDetails?.days_remaining ?? Math.floor(currentLevel / (burnRate * 24));
  const resupplyEta = liveFuel?.resupply_eta_days ?? (isMaitri ? 88 : 102);
  const reserveZone = liveFuel?.reserve_zone ?? (percentage > 50 ? 'Normal' : percentage > 30 ? 'Watch' : percentage > 15 ? 'High' : 'Critical');
  const fuelTemp = liveFuel?.fuel_temperature ?? (isMaitri ? -4.2 : 2.1);
  const bridgingGap = Math.round(daysRemaining - resupplyEta);

  const tanks = useMemo(() => fuelDetails?.tanks || (isMaitri ? [
    { id: 'tm01', name: 'AGO North #1', capacity_l: 32000, current_level_l: 25600, level_pct: 80, temperature_c: -3.8, status: 'ONLINE', trace_heating_w: 850, health_pct: 97.5 },
    { id: 'tm02', name: 'AGO North #2', capacity_l: 32000, current_level_l: 24320, level_pct: 76, temperature_c: -4.1, status: 'TRANSFERRING', trace_heating_w: 850, health_pct: 96.0 },
    { id: 'tm03', name: 'AGO East #1', capacity_l: 30000, current_level_l: 23100, level_pct: 77, temperature_c: -4.5, status: 'STANDBY', trace_heating_w: 800, health_pct: 95.2 },
    { id: 'tm04', name: 'AGO East #2', capacity_l: 30000, current_level_l: 22800, level_pct: 76, temperature_c: -4.2, status: 'STANDBY', trace_heating_w: 800, health_pct: 94.8 },
    { id: 'tm05', name: 'AGO South #1', capacity_l: 28000, current_level_l: 21280, level_pct: 76, temperature_c: -4.8, status: 'STANDBY', trace_heating_w: 750, health_pct: 98.1 },
    { id: 'tm06', name: 'AGO Reserve', capacity_l: 28000, current_level_l: 20900, level_pct: 74.6, temperature_c: -4.0, status: 'STANDBY', trace_heating_w: 750, health_pct: 95.5 },
  ] : [
    { id: 'tb01', name: 'Coastal N #1', capacity_l: 37500, current_level_l: 31875, level_pct: 85, temperature_c: 2.4, status: 'ONLINE', trace_heating_w: 920, health_pct: 99.1 },
    { id: 'tb02', name: 'Coastal N #2', capacity_l: 37500, current_level_l: 31125, level_pct: 83, temperature_c: 2.2, status: 'TRANSFERRING', trace_heating_w: 920, health_pct: 98.4 },
    { id: 'tb03', name: 'Central #1', capacity_l: 37500, current_level_l: 30750, level_pct: 82, temperature_c: 2.0, status: 'STANDBY', trace_heating_w: 900, health_pct: 97.2 },
    { id: 'tb04', name: 'Central #2', capacity_l: 37500, current_level_l: 30375, level_pct: 81, temperature_c: 2.1, status: 'STANDBY', trace_heating_w: 900, health_pct: 98.0 },
    { id: 'tb05', name: 'South Bay #1', capacity_l: 37500, current_level_l: 30000, level_pct: 80, temperature_c: 1.9, status: 'STANDBY', trace_heating_w: 900, health_pct: 96.5 },
    { id: 'tb06', name: 'South Bay #2', capacity_l: 37500, current_level_l: 30375, level_pct: 81, temperature_c: 2.2, status: 'STANDBY', trace_heating_w: 900, health_pct: 99.0 },
    { id: 'tb07', name: 'Deep Winter', capacity_l: 37500, current_level_l: 30750, level_pct: 82, temperature_c: 2.3, status: 'STANDBY', trace_heating_w: 920, health_pct: 98.3 },
    { id: 'tb08', name: 'CHP Sump', capacity_l: 37500, current_level_l: 29750, level_pct: 79.3, temperature_c: 2.5, status: 'STANDBY', trace_heating_w: 920, health_pct: 97.8 },
  ]), [fuelDetails, isMaitri]);

  const selectedTank = tanks.find((t: any) => t.id === (selectedTankId || tanks[0]?.id)) || tanks[0];

  const drivers = fuelDetails?.drivers || {
    generator_burn_l_hr: (eng?.generator_load ?? (isMaitri ? 67 : 84)) * 0.26,
    heating_burn_equiv_l_hr: (eng?.heating_load ?? (isMaitri ? 32 : 38)) * 0.26,
    science_burn_equiv_l_hr: (eng?.research_load ?? (isMaitri ? 12 : 18)) * 0.26,
    base_station_load_kw: eng?.base_load ?? (isMaitri ? 35 : 45),
    solar_fuel_saved_l_hr: (eng?.solar_output ?? (isMaitri ? 18 : 26)) * 0.26,
    auxiliary_boiler_l_hr: isMaitri ? 2.7 : 3.2,
  };

  const transferLoop = fuelDetails?.transfer_loop || {
    pump_status: 'RUNNING',
    flow_rate_l_min: isMaitri ? 4.8 : 6.2,
    active_source_tank: tanks.find((t: any) => t.status === 'TRANSFERRING')?.name || tanks[1]?.name || '',
    day_tank_level_pct: isMaitri ? 86.4 : 91.2,
  };

  const zoneColor = { Normal: '#10b981', Watch: '#06b6d4', High: '#f59e0b', Critical: '#ef4444' }[reserveZone] || '#10b981';
  const zoneBg = { Normal: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', Watch: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', High: 'bg-amber-500/20 text-amber-300 border-amber-500/40', Critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' }[reserveZone] || '';

  const handleWhatIf = async () => {
    setWhatIfLoading(true);
    try {
      const res = await scenariosApi.execute(stationId, {
        type: scenarioType,
        value: scenarioType === 'resupply_delay' ? 30 : scenarioType === 'generator_failure' ? 1 : 3,
      });
      setWhatIfResult(res || {
        scenario_name: scenarioType === 'resupply_delay' ? 'Resupply Delay +30d' : 'Generator Failure',
        impact: { fuel_days_lost: scenarioType === 'resupply_delay' ? 30 : 5, risk_score_delta: 18.4 },
        recommended_action: scenarioType === 'resupply_delay'
          ? 'Initiate Tier-2 fuel rationing: reduce non-residential heating by 2°C and prioritize renewable solar battery charging.'
          : 'Secondary generator elevated; spin up cold standby to restore N+1 bus redundancy.',
      });
    } catch { setWhatIfResult({ scenario_name: 'Simulation Error', recommended_action: 'Unable to connect to scenario API.' }); }
    finally { setWhatIfLoading(false); }
  };

  const accentColor = '#f59e0b';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, #f59e0b 0%, transparent 60%)' }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Fuel className="w-3 h-3" /> Fuel Storage & Burn Management
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name} • {isMaitri ? 'Schirmacher Oasis' : 'Larsemann Hills'}
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${zoneBg}`}>
                ZONE: {reserveZone.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Fuel className="w-8 h-8 text-amber-400" />
              Fuel Command Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {isMaitri ? `${tanks.length} bunded AGO tanks` : `${tanks.length} SCADA containerized polar tanks`} · Real-time transfer loop · Burn-rate causal breakdown · 30-day forecast
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <Layers className="w-4 h-4 text-cyan-400" /> All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=fuel`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <Brain className="w-4 h-4 text-purple-400" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/fuel' : '/station/maitri/fuel')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-amber-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" /> Switch Station
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Reserve Level', val: `${percentage.toFixed(1)}%`, sub: `${(currentLevel / 1000).toFixed(1)}k / ${(totalCapacity / 1000).toFixed(0)}k L`, color: zoneColor, icon: <Gauge className="w-4 h-4" /> },
            { label: 'Burn Rate', val: `${burnRate.toFixed(1)} L/hr`, sub: `${(burnRate * 24).toFixed(0)} L/day continuous`, color: '#f59e0b', icon: <Flame className="w-4 h-4" /> },
            { label: 'Safe Runway', val: `${daysRemaining} Days`, sub: `Critical: ${Math.round(daysRemaining * 0.3)}d buffer`, color: bridgingGap >= 0 ? '#10b981' : '#ef4444', icon: <Clock className="w-4 h-4" /> },
            { label: 'Resupply ETA', val: `${resupplyEta}d`, sub: `Gap: ${bridgingGap >= 0 ? '+' : ''}${bridgingGap}d ${bridgingGap >= 0 ? 'surplus' : 'DEFICIT'}`, color: bridgingGap >= 0 ? '#06b6d4' : '#ef4444', icon: <Truck className="w-4 h-4" /> },
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
        {(['tanks', 'flow', 'forecast', 'whatif'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${activeTab === tab
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
              : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'}`}>
            {tab === 'tanks' ? '🛢 Tank Farm' : tab === 'flow' ? '⚡ Transfer Loop' : tab === 'forecast' ? '📈 30-Day Forecast' : '🧪 What-If Sim'}
          </button>
        ))}
      </div>

      {/* ── Tank Farm Tab ── */}
      {activeTab === 'tanks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tank cylinders */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {isMaitri ? 'Maitri Bunded Tank Farm — 6 AGO Tanks' : 'Bharati SCADA Containerized Matrix — 8 Tanks'}
            </div>
            <div className="flex flex-wrap justify-around items-end gap-6">
              {tanks.map((tank: any) => (
                <CylinderTank
                  key={tank.id}
                  pct={tank.level_pct}
                  label={tank.name}
                  liters={tank.current_level_l}
                  capacity={tank.capacity_l}
                  status={tank.status}
                  tempC={tank.temperature_c}
                  color="#f59e0b"
                  selected={selectedTankId === tank.id || (!selectedTankId && tank.id === tanks[0]?.id)}
                  onClick={() => setSelectedTankId(tank.id)}
                />
              ))}
            </div>

            {/* Total fill bar */}
            <div className="mt-6 pt-4 border-t border-polar-border/50">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-2">
                <span>Combined Reserve: <strong className="text-amber-300">{(currentLevel / 1000).toFixed(1)}k L</strong></span>
                <span>Capacity: {(totalCapacity / 1000).toFixed(0)}k L</span>
              </div>
              <div className="h-4 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40 relative">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(to right, ${zoneColor}88, ${zoneColor})`,
                  }} />
                {/* Zone markers */}
                {[15, 30, 50].map(m => (
                  <div key={m} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${m}%` }}>
                    <span className="absolute -top-5 text-[8px] font-mono text-white/30" style={{ transform: 'translateX(-50%)' }}>{m}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tank detail panel */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl flex flex-col gap-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Selected Tank Intelligence</div>
            {selectedTank && (
              <>
                <div className="text-sm font-bold text-white">{selectedTank.name}</div>
                <div className="space-y-3">
                  {[
                    { label: 'Fill Level', val: `${selectedTank.level_pct?.toFixed(1)}%`, color: '#f59e0b' },
                    { label: 'Volume', val: `${(selectedTank.current_level_l / 1000).toFixed(2)} kL`, color: '#06b6d4' },
                    { label: 'Capacity', val: `${(selectedTank.capacity_l / 1000).toFixed(0)} kL`, color: '#94a3b8' },
                    { label: 'Temperature', val: `${selectedTank.temperature_c}°C`, color: selectedTank.temperature_c < -5 ? '#818cf8' : '#06b6d4' },
                    { label: 'Health', val: `${selectedTank.health_pct?.toFixed(1)}%`, color: '#10b981' },
                    { label: 'Trace Heating', val: `${selectedTank.trace_heating_w} W`, color: '#f97316' },
                    { label: 'Status', val: selectedTank.status, color: selectedTank.status === 'ONLINE' ? '#10b981' : selectedTank.status === 'TRANSFERRING' ? '#06b6d4' : '#64748b' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-bold" style={{ color: row.color }}>{row.val}</span>
                    </div>
                  ))}
                </div>

                {/* Mini fill bar */}
                <div className="h-2 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${selectedTank.level_pct}%`, background: 'linear-gradient(to right, #f59e0b88, #f59e0b)' }} />
                </div>

                {/* Burn rate gauges */}
                <div className="pt-3 border-t border-polar-border/40">
                  <div className="flex justify-around">
                    <BurnRadialGauge value={burnRate} max={60} unit="L/hr" label="Burn Rate" color="#f59e0b" size={100} />
                    <BurnRadialGauge value={eng?.generator_load ?? (isMaitri ? 67 : 84)} max={200} unit="kW" label="Gen Load" color="#818cf8" size={100} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Transfer Loop Tab ── */}
      {activeTab === 'flow' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <FuelFlowPipeline
              flowRate={transferLoop.flow_rate_l_min}
              pumpStatus={transferLoop.pump_status}
              dayTankPct={transferLoop.day_tank_level_pct}
              sourceTank={transferLoop.active_source_tank || tanks[1]?.name || ''}
              destination={isMaitri ? 'Generator Day Tank #1' : 'CHP Header Day Tank'}
              isMaitri={isMaitri}
            />
            <div className="space-y-2">
              {[
                { label: 'Pump Status', val: transferLoop.pump_status, color: '#10b981' },
                { label: 'Flow Rate', val: `${transferLoop.flow_rate_l_min} L/min`, color: '#f59e0b' },
                { label: 'Day Tank Level', val: `${transferLoop.day_tank_level_pct?.toFixed(1)}%`, color: '#06b6d4' },
                { label: 'Suction Temp', val: `${fuelTemp}°C`, color: '#818cf8' },
                { label: 'Preheater', val: 'ACTIVE — OK', color: '#10b981' },
                { label: 'Fuel Grade', val: isMaitri ? 'AGO −50°C' : 'Polar Gas Oil', color: '#94a3b8' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center text-xs font-mono border-b border-polar-border/30 pb-1.5">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-4">
              Burn Rate by Consumer — Waterfall (L/hr)
            </div>
            <BurnWaterfallChart drivers={drivers} isMaitri={isMaitri} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono">
              {[
                { label: 'Generator', val: `${(drivers.generator_burn_l_hr || 17.5).toFixed(1)} L/hr`, color: '#f59e0b' },
                { label: 'Space Heating', val: `${(drivers.heating_burn_equiv_l_hr || 8.3).toFixed(1)} L/hr`, color: '#818cf8' },
                { label: 'Research Labs', val: `${(drivers.science_burn_equiv_l_hr || 3.1).toFixed(1)} L/hr`, color: '#06b6d4' },
                { label: 'Solar Offset', val: `−${(drivers.solar_fuel_saved_l_hr || 4.7).toFixed(1)} L/hr`, color: '#22c55e' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center p-2 rounded-lg bg-polar-dark/50 border border-polar-border">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Forecast Tab ── */}
      {activeTab === 'forecast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 30-Day Fuel Reserve Trajectory & Threshold Zones
            </div>
            <FuelForecastChart currentLevel={currentLevel} totalCapacity={totalCapacity} burnRate={burnRate} stationId={stationId} />
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Reserve Threshold Zones</div>
            {[
              { zone: 'NORMAL', range: '>50%', color: '#10b981', desc: 'Full operational capacity. No action required.' },
              { zone: 'WATCH', range: '30–50%', color: '#06b6d4', desc: 'Enhanced monitoring. Begin resupply coordination.' },
              { zone: 'HIGH ALERT', range: '15–30%', color: '#f59e0b', desc: 'Non-essential consumption reduction protocol.' },
              { zone: 'CRITICAL', range: '<15%', color: '#ef4444', desc: 'Emergency rationing. Station lockdown possible.' },
            ].map(z => (
              <div key={z.zone} className="p-3 rounded-xl border transition-all"
                style={{ borderColor: `${z.color}44`, background: `${z.color}0A` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold" style={{ color: z.color }}>{z.zone}</span>
                  <span className="text-[10px] font-mono text-slate-400">{z.range}</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed">{z.desc}</p>
              </div>
            ))}
            <div className="pt-3 border-t border-polar-border/40 space-y-2 text-xs font-mono">
              <div className="flex justify-between"><span className="text-slate-400">Current Zone</span><span className="font-bold" style={{ color: zoneColor }}>{reserveZone}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Days to Resupply</span><span className="font-bold text-cyan-300">{resupplyEta}d</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Reserve Buffer</span><span className={`font-bold ${bridgingGap >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{bridgingGap >= 0 ? '+' : ''}{bridgingGap}d</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── What-If Tab ── */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Causal Scenario Simulation Sandbox
            </div>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Simulate adverse operational scenarios and evaluate their impact on fuel runway, risk scores, and recommended mitigation actions.
            </p>
            <div className="space-y-3">
              {[
                { key: 'resupply_delay', label: '🚛 Resupply Delay +30 Days', desc: 'Convoy delayed by sea ice / katabatic event' },
                { key: 'generator_failure', label: '⚡ Generator Trip Fault', desc: 'Primary generator unplanned shutdown' },
                { key: 'blizzard_lockdown', label: '🌨 Blizzard Lockdown ×3d', desc: 'Full station isolation, max heating demand' },
              ].map(s => (
                <div key={s.key} onClick={() => setScenarioType(s.key)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${scenarioType === s.key ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' : 'bg-polar-dark/50 border-polar-border text-slate-400 hover:border-white/20'}`}>
                  <div className="text-xs font-mono font-bold">{s.label}</div>
                  <div className="text-[10px] font-mono mt-0.5 opacity-70">{s.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={handleWhatIf} disabled={whatIfLoading}
              className="w-full py-3 rounded-xl text-sm font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50">
              {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {whatIfLoading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
            {!whatIfResult ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm font-mono text-center gap-3">
                <Sparkles className="w-10 h-10 opacity-20" />
                <p>Select a scenario and run the simulation to see impact analysis.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40">
                  <div className="text-xs font-mono font-bold text-amber-300 mb-1">{whatIfResult.scenario_name}</div>
                </div>
                {whatIfResult.impact && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Fuel Days Lost', val: `−${whatIfResult.impact.fuel_days_lost || 30}d`, color: '#ef4444' },
                      { label: 'Risk Delta', val: `+${whatIfResult.impact.risk_score_delta?.toFixed(1) || '18.4'}pts`, color: '#f59e0b' },
                    ].map(m => (
                      <div key={m.label} className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                        <div className="text-xs font-mono text-slate-400">{m.label}</div>
                        <div className="text-lg font-black font-mono mt-1" style={{ color: m.color }}>{m.val}</div>
                      </div>
                    ))}
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
