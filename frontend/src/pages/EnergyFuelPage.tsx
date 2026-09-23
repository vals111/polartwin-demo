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
  Sparkles, AlertOctagon, Brain, BatteryCharging, Droplet, Apple, CheckCircle
} from 'lucide-react';
import { TankLevelBar } from '../components/charts/TankLevelBar';
import { IndustrialGauge } from '../components/charts/IndustrialGauge';
import { EChartsLine } from '../components/charts/EChartsLine';
import { EChartsBar } from '../components/charts/EChartsBar';

// ── Resupply Countdown Ring ────────────────────────────────────────────────
const ResupplyCountdown: React.FC<{ days: number; maxDays?: number }> = ({
  days,
  maxDays = 180,
}) => {
  const pct = Math.max(0, Math.min(1, days / maxDays));
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = days < 30 ? '#ef4444' : days < 60 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
          <circle
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
          <text x="65" y="60" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="monospace">
            {days}
          </text>
          <text x="65" y="74" textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace">
            DAYS LEFT
          </text>
          <text x="65" y="88" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
            TO RESUPPLY
          </text>
        </svg>
      </div>
    </div>
  );
};

// ── 30-Day Burn Rate Trend Generator ────────────────────────────────────────
const genBurnTrend = (base: number, n = 30): { time: string; value: number }[] =>
  Array.from({ length: n }, (_, i) => ({
    time: `D-${n - i}`,
    value: Math.max(0, Number((base + Math.sin(i / 4) * base * 0.08 + Math.cos(i / 6) * base * 0.04).toFixed(1))),
  }));

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
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
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
      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-3 flex items-center justify-between">
        <span>⚡ Live Fuel Transfer & Power grid Feed Loop</span>
        <span className="text-[9px] text-slate-400 font-normal">Active Source: {sourceTank}</span>
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
          <div className="text-[9px] text-slate-400 font-mono">{flowRate} L/min Feed</div>
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
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <span className="text-[9px] text-emerald-300 text-center">{destination.replace('Generator ', '')}</span>
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

// ── Unified Master Page: Energy, Power & Fuel ─────────────────────────────────
export const EnergyFuelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [fuelDetails, setFuelDetails] = useState<any>(null);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'power grid' | 'tanks' | 'flow' | 'forecast' | 'whatif' | 'fuel_intel' | 'energy_intel'>('overview');
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
  const water = snapshot?.water;
  const supplies = snapshot?.supplies;

  // Energy & Power grid Metrics
  const genLoad = eng?.generator_load ?? (isMaitri ? 68 : 84);
  const solarOut = eng?.solar_output ?? (isMaitri ? 22 : 28);
  const batteryPct = eng?.battery_level ?? 92.0;
  const gridFreq = eng?.grid_frequency ?? (isMaitri ? 50.08 : 50.02);
  const totalDemand = eng?.total_demand ?? (genLoad + solarOut);

  // Fuel Metrics
  const totalCapacity = liveFuel?.total_capacity ?? fuelDetails?.total_capacity ?? (isMaitri ? 180000 : 300000);
  const currentLevel = liveFuel?.current_level ?? fuelDetails?.current_level ?? (isMaitri ? 138000 : 245000);
  const fuelPct = liveFuel?.fuel_percentage ?? ((currentLevel / totalCapacity) * 100);
  const burnRate = liveFuel?.consumption_rate_l_per_hr ?? fuelDetails?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.8);
  const daysRemaining = liveFuel?.days_remaining ?? fuelDetails?.days_remaining ?? Math.floor(currentLevel / (burnRate * 24));
  const resupplyEta = liveFuel?.resupply_eta_days ?? (isMaitri ? 88 : 102);
  const reserveZone = liveFuel?.reserve_zone ?? (fuelPct > 50 ? 'Normal' : fuelPct > 30 ? 'Watch' : fuelPct > 15 ? 'High' : 'Critical');
  const fuelTemp = liveFuel?.fuel_temperature ?? (isMaitri ? -4.2 : 2.1);
  const bridgingGap = Math.round(daysRemaining - resupplyEta);

  // Other resource telemetry
  const waterPct = water?.percentage ?? 82.0;
  const waterLiters = water?.storage_liters ?? 18400;
  const foodPct = supplies?.food_days_remaining != null
    ? Math.min(100, (supplies.food_days_remaining / 365) * 100)
    : 68.0;

  // 30-day burn trends
  const fuelTrend = useMemo(() => genBurnTrend(burnRate, 30), [burnRate]);
  const waterTrend = useMemo(() => genBurnTrend(35, 30), []);

  // Daily consumption for bar chart
  const dailyConsumption = [
    { name: 'Gen-1', value: Math.round(burnRate * 0.6 * 24), color: '#f59e0b' },
    { name: 'Gen-2', value: Math.round(burnRate * 0.4 * 24), color: '#ef4444' },
    { name: 'Heating', value: Math.round(18 * 24), color: '#818cf8' },
    { name: 'Vehicles', value: Math.round(8 * 24), color: '#10b981' },
    { name: 'Kitchen', value: Math.round(6 * 24), color: '#06b6d4' },
  ];

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
          : 'Secondary generator elevated; spin up cold standby to restore N+1 bus backup systems.',
      });
    } catch { setWhatIfResult({ scenario_name: 'Simulation Error', recommended_action: 'Unable to connect to scenario API.' }); }
    finally { setWhatIfLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 font-ui">

      {/* ── UNIFIED MASTER HEADER ── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 85% 40%, #f59e0b 0%, #06b6d4 40%, transparent 70%)' }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <Fuel className="w-3.5 h-3.5 text-orange-400" />
                Unified Domain • Energy, Power &amp; Fuel Depot
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/30">
                {station.name} • {isMaitri ? 'Schirmacher Oasis (Inland)' : 'Larsemann Hills (Coastal)'}
              </span>
              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-md border font-bold ${zoneBg}`}>
                ZONE: {reserveZone.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5">
                <Zap className="w-6 h-6 text-amber-400" />
                <Fuel className="w-6 h-6 text-orange-400" />
              </span>
              {stationId.toUpperCase()} Energy, Power &amp; Fuel Command
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl leading-relaxed">
              Unified operational command combining the Central Power grid (Diesel Generators, Solar PV &amp; Battery Bank) with the Bulk Arctic Diesel (AGO) Fuel Depot &amp; Transfer Loop.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Layers className="w-4 h-4 text-cyan-400" /> All Domains
            </button>
            <button
              onClick={() => navigate(`/station/${stationId}/decision?domain=energy`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              <Brain className="w-4 h-4 text-purple-400" /> Decision Intel
            </button>
            <button
              onClick={() => navigate(isMaitri ? '/station/bharati/energy' : '/station/maitri/energy')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-amber-400/50 text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Switch Station
            </button>
          </div>
        </div>

        {/* ── Cross-Domain Integrated KPI Banner ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Generator Load', val: `${genLoad} kW`, sub: `Freq: ${gridFreq} Hz`, color: '#f59e0b', icon: <Zap className="w-3.5 h-3.5" /> },
            { label: 'Solar PV Output', val: `${solarOut} kW`, sub: isMaitri ? 'Rooftop Array' : 'Double-sided Farm', color: '#fbbf24', icon: <Sun className="w-3.5 h-3.5" /> },
            { label: 'Battery Bank', val: `${batteryPct.toFixed(0)}%`, sub: `~${Math.round(batteryPct * 0.5)}h backup`, color: '#10b981', icon: <BatteryCharging className="w-3.5 h-3.5" /> },
            { label: 'Fuel Reserve', val: `${fuelPct.toFixed(1)}%`, sub: `${(currentLevel / 1000).toFixed(1)}k L in tanks`, color: zoneColor, icon: <Fuel className="w-3.5 h-3.5" /> },
            { label: 'Burn Rate', val: `${burnRate.toFixed(1)} L/h`, sub: `${(burnRate * 24).toFixed(0)} L/day`, color: '#f97316', icon: <Flame className="w-3.5 h-3.5" /> },
            { label: 'Fuel Autonomy', val: `${daysRemaining} Days`, sub: `ETA gap: ${bridgingGap >= 0 ? '+' : ''}${bridgingGap}d`, color: bridgingGap >= 0 ? '#06b6d4' : '#ef4444', icon: <Clock className="w-3.5 h-3.5" /> },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-base font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: '⚡ ⛽ Integrated Overview' },
          { id: 'power grid', label: '⚡ Power & Power grid' },
          { id: 'tanks', label: '🛢 Fuel Depot & Tanks' },
          { id: 'flow', label: '🔄 Fuel-to-Power Loop' },
          { id: 'fuel_intel', label: '⛽ Fuel Intelligence' },
          { id: 'energy_intel', label: '⚡ Energy Intelligence' },
          { id: 'forecast', label: '📈 30-Day Forecast & Trends' },
          { id: 'whatif', label: '🧪 What-If Sim' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: INTEGRATED OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Live Flow Pipeline */}
          <FuelFlowPipeline
            flowRate={transferLoop.flow_rate_l_min}
            pumpStatus={transferLoop.pump_status}
            dayTankPct={transferLoop.day_tank_level_pct}
            sourceTank={transferLoop.active_source_tank || tanks[1]?.name || ''}
            destination={isMaitri ? 'Generator Day Tank #1' : 'CHP Header Day Tank'}
            isMaitri={isMaitri}
          />

          {/* Core Dual Command Row: Power Dials on Left, Tank Farm on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Power & Power grid Gauges (4 cols) */}
            <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-polar-border flex flex-col justify-between">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Central Power grid Generation</span>
                <span className="text-[9px] text-slate-400">Total: {totalDemand} kW</span>
              </div>
              <div className="flex flex-wrap justify-around items-center gap-4 py-2">
                <IndustrialGauge
                  value={genLoad}
                  min={0}
                  max={200}
                  unit="kW"
                  label="Generator Load"
                  size={140}
                  accentColor="#f59e0b"
                  warningThreshold={160}
                  criticalThreshold={190}
                />
                <IndustrialGauge
                  value={solarOut}
                  min={0}
                  max={50}
                  unit="kW"
                  label="Solar PV Output"
                  size={140}
                  accentColor="#fbbf24"
                />
              </div>
              <div className="mt-4 pt-3 border-t border-polar-border/40 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                  <div className="text-[10px] text-slate-400">Battery SOC</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{batteryPct.toFixed(1)}%</div>
                </div>
                <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                  <div className="text-[10px] text-slate-400">Grid Frequency</div>
                  <div className="text-sm font-bold text-blue-400 mt-0.5">{gridFreq} Hz</div>
                </div>
              </div>
            </div>

            {/* Fuel Storage Cylinder Matrix Preview (7 cols) */}
            <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-polar-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5" /> Fuel Depot Tanks ({tanks.length} Tanks Online)
                </div>
                <button
                  onClick={() => setActiveTab('tanks')}
                  className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Manage Tank Farm <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap justify-around items-end gap-3 py-2">
                {tanks.slice(0, 6).map((tank: any) => (
                  <CylinderTank
                    key={tank.id}
                    pct={tank.level_pct}
                    label={tank.name.replace('AGO ', '').replace('Coastal ', '')}
                    liters={tank.current_level_l}
                    capacity={tank.capacity_l}
                    status={tank.status}
                    tempC={tank.temperature_c}
                    color="#f59e0b"
                    selected={selectedTankId === tank.id}
                    onClick={() => { setSelectedTankId(tank.id); setActiveTab('tanks'); }}
                  />
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-polar-border/40 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Bulk Storage: <strong className="text-amber-300">{(currentLevel / 1000).toFixed(1)}k L</strong></span>
                <span className="text-slate-400">Safe Runway: <strong className="text-cyan-300">{daysRemaining} Days</strong></span>
              </div>
            </div>
          </div>

          {/* Supply Chain & Consumption Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-polar-border">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Fuel Burn Rate — 30-Day Rolling History (L/h)
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Continuous Rate: <strong className="text-amber-300">{burnRate.toFixed(1)} L/h</strong>
                </div>
              </div>
              <EChartsLine
                data={fuelTrend}
                color="#f59e0b"
                showArea
                unit=" L/h"
                smooth
                height={200}
              />
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-polar-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 font-bold">
                Daily Fuel Budget by Consumer (L/day)
              </div>
              <EChartsBar
                data={dailyConsumption}
                horizontal
                height={200}
                unit=" L"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: POWER & POWER GRID ── */}
      {activeTab === 'power grid' && (
        <div className="space-y-6">
          {/* Main Tank Level Indicators Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-5 font-bold">
              Station Life-Support Storage &amp; Electrical Reserve Buffer
            </div>
            <div className="flex flex-wrap justify-around items-end gap-8">
              <div className="text-center space-y-3">
                <TankLevelBar
                  percentage={fuelPct}
                  label="FUEL STORAGE"
                  sublabel={`${(currentLevel / 1000).toFixed(1)}k L`}
                  value={`${fuelPct.toFixed(1)}%`}
                  color="#f59e0b"
                  warningAt={25}
                  criticalAt={10}
                  height={220}
                  width={72}
                />
                <div className="text-[9px] font-mono text-slate-500">
                  ~{daysRemaining}d autonomy
                </div>
              </div>

              <div className="text-center space-y-3">
                <TankLevelBar
                  percentage={waterPct}
                  label="FRESHWATER"
                  sublabel={`${(waterLiters / 1000).toFixed(1)}k L`}
                  value={`${waterPct.toFixed(1)}%`}
                  color="#06b6d4"
                  warningAt={30}
                  criticalAt={15}
                  height={220}
                  width={72}
                />
                <div className="text-[9px] font-mono text-slate-500">
                  {isMaitri ? 'Lake Zub pipeline' : 'Quilty Bay RO'}
                </div>
              </div>

              <div className="text-center space-y-3">
                <TankLevelBar
                  percentage={batteryPct}
                  label="BATTERY BANK"
                  sublabel="Emergency reserve"
                  value={`${batteryPct.toFixed(1)}%`}
                  color="#10b981"
                  warningAt={40}
                  criticalAt={20}
                  height={220}
                  width={72}
                />
                <div className="text-[9px] font-mono text-slate-500">
                  {Math.round(batteryPct * 0.5)}h autonomy
                </div>
              </div>

              <div className="text-center space-y-3">
                <TankLevelBar
                  percentage={foodPct}
                  label="FOOD SUPPLIES"
                  sublabel={`${supplies?.food_days_remaining ?? 248}d`}
                  value={`${foodPct.toFixed(1)}%`}
                  color="#a78bfa"
                  warningAt={25}
                  criticalAt={10}
                  height={220}
                  width={72}
                />
                <div className="text-[9px] font-mono text-slate-500">
                  Annual ration cycle
                </div>
              </div>

              {/* Resupply countdown */}
              <div className="flex flex-col items-center gap-2">
                <ResupplyCountdown days={resupplyEta} maxDays={180} />
                <div className="text-[9px] font-mono text-slate-500 text-center">
                  {isMaitri ? 'Supply run ETA' : 'Vessel ETA'}
                </div>
              </div>

              {/* Power gauges */}
              <div className="flex flex-col items-center gap-3">
                <IndustrialGauge
                  value={genLoad}
                  min={0}
                  max={200}
                  unit="kW"
                  label="Generator Load"
                  size={140}
                  accentColor="#f59e0b"
                  warningThreshold={160}
                  criticalThreshold={190}
                />
                <IndustrialGauge
                  value={solarOut}
                  min={0}
                  max={50}
                  unit="kW"
                  label="Solar PV Output"
                  size={140}
                  accentColor="#fbbf24"
                />
              </div>
            </div>
          </div>

          {/* Supply chain critical KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-polar-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-4 font-bold">
                Critical Energy &amp; Fuel Buffer Limits
              </div>
              <div className="space-y-3.5">
                {[
                  { label: 'Diesel (AGO) Inventory', val: `${(currentLevel / 1000).toFixed(1)}k L`, pct: fuelPct, warn: 25, color: '#f59e0b' },
                  { label: 'Freshwater Storage', val: `${(waterLiters / 1000).toFixed(1)}k L`, pct: waterPct, warn: 30, color: '#06b6d4' },
                  { label: 'Battery Reserve (UPS)', val: `${batteryPct.toFixed(0)}%`, pct: batteryPct, warn: 40, color: '#10b981' },
                  { label: 'Food Rations Remaining', val: `${supplies?.food_days_remaining ?? 248} days`, pct: foodPct, warn: 25, color: '#a78bfa' },
                  { label: isMaitri ? 'LPG (Cooking Gas)' : 'Propane Reserve', val: `${supplies?.lpg_percentage ?? 62}%`, pct: supplies?.lpg_percentage ?? 62, warn: 20, color: '#fb923c' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: item.color }}>{item.val}</span>
                        {item.pct < item.warn ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                    <div className="h-2.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${item.pct}%`,
                          background: `linear-gradient(to right, ${item.color}88, ${item.color})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-polar-border flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold mb-4">
                  Freshwater Consumption Trend — 30-Day (L/h)
                </div>
                <EChartsLine
                  data={waterTrend}
                  color="#06b6d4"
                  showArea
                  unit=" L/h"
                  smooth
                  height={190}
                />
              </div>
              <div className="pt-3 border-t border-polar-border/40 text-xs font-mono flex justify-between text-slate-400">
                <span>Thermal trace line heating: <strong className="text-emerald-300">4.2 kW ACTIVE</strong></span>
                <span>Freeze hazard index: <strong className="text-blue-300">NOMINAL</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: FUEL DEPOT & TANKS ── */}
      {activeTab === 'tanks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tank cylinders */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {isMaitri ? 'Maitri Bunded Tank Farm — 6 AGO Tanks' : 'Bharati Automated Control System Containerized Matrix — 8 Tanks'}
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
                    width: `${fuelPct}%`,
                    background: `linear-gradient(to right, ${zoneColor}88, ${zoneColor})`,
                  }} />
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
                <div className="text-sm font-bold text-white flex items-center justify-between">
                  <span>{selectedTank.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedTank.status}
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Fill Level', val: `${selectedTank.level_pct?.toFixed(1)}%`, color: '#f59e0b' },
                    { label: 'Volume', val: `${(selectedTank.current_level_l / 1000).toFixed(2)} kL`, color: '#06b6d4' },
                    { label: 'Capacity', val: `${(selectedTank.capacity_l / 1000).toFixed(0)} kL`, color: '#94a3b8' },
                    { label: 'Temperature', val: `${selectedTank.temperature_c}°C`, color: selectedTank.temperature_c < -5 ? '#818cf8' : '#06b6d4' },
                    { label: 'Health', val: `${selectedTank.health_pct?.toFixed(1)}%`, color: '#10b981' },
                    { label: 'Trace Heating', val: `${selectedTank.trace_heating_w} W`, color: '#f97316' },
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
                    <BurnRadialGauge value={genLoad} max={200} unit="kW" label="Gen Load" color="#818cf8" size={100} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: TRANSFER LOOP ── */}
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

      {/* ── TAB 5: FORECAST ── */}
      {activeTab === 'forecast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 30-Day Fuel Reserve Trajectory &amp; Threshold Zones
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

      {/* ── TAB 6: WHAT-IF SIMULATION ── */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Causal Scenario Simulation Sandbox
            </div>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Simulate adverse operational scenarios and evaluate their combined impact on power grid generator load, fuel runway, and recommended mitigation actions.
            </p>
            <div className="space-y-3">
              {[
                { key: 'resupply_delay', label: '🚛 Resupply Delay +30 Days', desc: 'Supply run delayed by sea ice / polar downslope wind event' },
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

      {/* ══════════════════════════════════════════════════════
          TAB 7: FUEL INTELLIGENCE
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'fuel_intel' && (() => {
        const fuelType = isMaitri ? 'Arctic Gas Oil (AGO) — Freezing limit −50°C' : 'Polar Gas Oil (PGO) — Freezing limit −45°C';
        const fuelSpec = isMaitri
          ? { grade: 'AGO −50°C', cetane: 48, flashPoint: 62, pourPoint: -50, viscosity: '4.6 cSt @ −20°C', density: '840 kg/m³', sulfur: '<10 ppm' }
          : { grade: 'PGO −45°C', cetane: 51, flashPoint: 65, pourPoint: -45, viscosity: '5.1 cSt @ −20°C', density: '845 kg/m³', sulfur: '<15 ppm' };
        const freezeRisk = fuelTemp < -45 ? 'CRITICAL' : fuelTemp < -40 ? 'WARNING' : fuelTemp < -35 ? 'WATCH' : 'NOMINAL';
        const freezeColor = freezeRisk === 'CRITICAL' ? '#ef4444' : freezeRisk === 'WARNING' ? '#f97316' : freezeRisk === 'WATCH' ? '#f59e0b' : '#10b981';

        // Daily usage breakdown (station-specific, L/day)
        const dailyUsage = isMaitri ? [
          { name: 'Generator #1 (Kirloskar 80kVA)', liters: Math.round(burnRate * 0.38 * 24), pct: 38, color: '#f59e0b', icon: '⚡', purpose: 'Primary electrical generation for station load' },
          { name: 'Generator #2 (Kirloskar 80kVA)', liters: Math.round(burnRate * 0.25 * 24), pct: 25, color: '#f97316', icon: '⚡', purpose: 'Parallel generation & emergency backup' },
          { name: 'Space Heating Boilers (×3)', liters: Math.round(burnRate * 0.17 * 24), pct: 17, color: '#818cf8', icon: '🔥', purpose: 'Living block, labs, workshop radiant heating' },
          { name: 'Vehicle Fleet Refuelling', liters: Math.round(burnRate * 0.10 * 24), pct: 10, color: '#10b981', icon: '🚛', purpose: 'PistenBully traverse, Bolero ground vehicle, snowmobiles' },
          { name: 'Galley & Cooking Boiler', liters: Math.round(burnRate * 0.05 * 24), pct: 5, color: '#06b6d4', icon: '🍳', purpose: 'Kitchen range fuel, hot water generation' },
          { name: 'Emergency Generator (Standby)', liters: Math.round(burnRate * 0.03 * 24), pct: 3, color: '#64748b', icon: '🛡️', purpose: 'Monthly test run + emergency reserve draw' },
          { name: 'Solar Offset (Saved)', liters: -Math.round((drivers.solar_fuel_saved_l_hr || 4.7) * 24), pct: -8, color: '#22c55e', icon: '☀️', purpose: '30kW rooftop PV array reduces diesel burn' },
        ] : [
          { name: 'CHP Unit #1 (Jenbacher 160kW)', liters: Math.round(burnRate * 0.42 * 24), pct: 42, color: '#f59e0b', icon: '⚡', purpose: 'Combined Heat & Power primary unit — electricity + heat recovery' },
          { name: 'CHP Unit #2 (Jenbacher 160kW)', liters: Math.round(burnRate * 0.28 * 24), pct: 28, color: '#f97316', icon: '⚡', purpose: 'Secondary CHP — parallel generation, load sharing' },
          { name: 'Auxiliary Heating Boiler', liters: Math.round(burnRate * 0.12 * 24), pct: 12, color: '#818cf8', icon: '🔥', purpose: 'Supplemental heat for habitat modules during extreme cold' },
          { name: 'Vehicle & Boat Fleet', liters: Math.round(burnRate * 0.08 * 24), pct: 8, color: '#10b981', icon: '🚤', purpose: 'PistenBully, Zodiac RIB outboards, ATV, cargo vehicles' },
          { name: 'Galley & Domestic Hot Water', liters: Math.round(burnRate * 0.05 * 24), pct: 5, color: '#06b6d4', icon: '🍳', purpose: 'Kitchen operations, personnel hot water supply' },
          { name: 'Science Equipment Direct Fuel', liters: Math.round(burnRate * 0.03 * 24), pct: 3, color: '#a855f7', icon: '🔬', purpose: 'Remote field generators, AWS battery chargers' },
          { name: 'Solar + Wind Offset (Saved)', liters: -Math.round((drivers.solar_fuel_saved_l_hr || 6.5) * 24), pct: -10, color: '#22c55e', icon: '☀️', purpose: '50kW double-sided PV array + 2×10kW wind turbines reduce consumption' },
        ];

        // Pipeline segments
        const pipeSegments = isMaitri ? [
          { from: 'AGO Tank Farm (North Group)', to: 'Pump House', distance: '15 m', material: 'Insulated steel DN80', temp: '-4°C', status: 'ONLINE', flow: '4.8 L/min' },
          { from: 'Pump House', to: 'Day Tank Header', distance: '45 m', material: 'Heat-traced DN50 above-ground', temp: '-3.5°C', status: 'TRANSFERRING', flow: '4.8 L/min' },
          { from: 'Day Tank Header', to: 'Generator Room', distance: '8 m', material: 'Insulated DN32 indoor run', temp: '12°C', status: 'ONLINE', flow: 'Gravity feed' },
          { from: 'Generator Room', to: 'Gen #1 & Gen #2', distance: '3 m', material: 'Flexible braided supply lines', temp: '18°C', status: 'ONLINE', flow: 'Auto-valve' },
        ] : [
          { from: 'Coastal Tank Matrix (8 tanks)', to: 'Automated Control System Valve Manifold', distance: '22 m', material: 'Insulated stainless DN100', temp: '2°C', status: 'ONLINE', flow: '6.2 L/min' },
          { from: 'Automated Control System Valve Manifold', to: 'CHP Fuel Header', distance: '30 m', material: 'Heat-traced DN65 above-ground', temp: '3°C', status: 'TRANSFERRING', flow: '6.2 L/min' },
          { from: 'CHP Fuel Header', to: 'CHP Unit #1 & #2', distance: '6 m', material: 'Flexible DN32 braid with pre-filter', temp: '16°C', status: 'ONLINE', flow: 'Pressure-regulated' },
          { from: 'CHP Header', to: 'Auxiliary Boiler', distance: '12 m', material: 'DN25 copper-traced line', temp: '14°C', status: 'STANDBY', flow: '1.8 L/min (demand)' },
        ];

        const totalDailyNet = dailyUsage.reduce((acc, u) => acc + u.liters, 0);

        return (
          <div className="space-y-6">
            {/* ── Section A: Fuel Type & Specification Card ── */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 90% 20%, rgba(245,158,11,0.07) 0%, transparent 60%)' }} />
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Fuel Type & Chemical Specification</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">Certified to {isMaitri ? 'BIS IS:1460 Arctic Grade' : 'EN 590 Polar Grade'} standard</div>
                </div>
                <span className="ml-auto text-[10px] font-mono px-3 py-1 rounded-lg border font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">{fuelSpec.grade}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Fuel Grade', val: fuelSpec.grade, color: '#f59e0b', icon: '⛽' },
                  { label: 'Combustion Quality', val: fuelSpec.cetane.toString(), color: '#06b6d4', icon: '🔢' },
                  { label: 'Flash Point', val: `${fuelSpec.flashPoint}°C`, color: '#f97316', icon: '🔥' },
                  { label: 'Freeze Limit', val: `${fuelSpec.pourPoint}°C`, color: '#818cf8', icon: '❄️' },
                  { label: 'Flow Resistance', val: fuelSpec.viscosity, color: '#10b981', icon: '💧' },
                  { label: 'Fuel Density', val: fuelSpec.density, color: '#38bdf8', icon: '⚖️' },
                  { label: 'Sulfur Content', val: fuelSpec.sulfur, color: '#22c55e', icon: '🌿' },
                ].map(s => (
                  <div key={s.label} className="bg-polar-dark/60 p-3 rounded-xl border border-polar-border text-center">
                    <div className="text-xl mb-1.5">{s.icon}</div>
                    <div className="text-xs font-black font-mono" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-[8px] font-mono text-slate-500 mt-1 leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section B: Fuel Temperature Monitor & Freeze Risk ── */}
            <div className="glass-panel p-6 rounded-2xl border relative overflow-hidden" style={{ borderColor: `${freezeColor}35` }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 20% 50%, ${freezeColor}08 0%, transparent 60%)` }} />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl border" style={{ backgroundColor: `${freezeColor}15`, borderColor: `${freezeColor}40`, color: freezeColor }}>
                    <ThermometerSnowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Fuel Temperature Monitor — Freeze-Risk Telemetry</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">Pour point: {fuelSpec.pourPoint}°C · Alarm threshold: {fuelSpec.pourPoint + 5}°C</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-3 py-1.5 rounded-xl border font-bold animate-pulse" style={{ backgroundColor: `${freezeColor}15`, borderColor: `${freezeColor}40`, color: freezeColor }}>
                  {freezeRisk}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Big temp readout */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border flex flex-col items-center justify-center" style={{ borderColor: `${freezeColor}30` }}>
                  <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">Bulk Fuel Temperature</div>
                  <div className="text-5xl font-black font-mono" style={{ color: freezeColor }}>{fuelTemp.toFixed(1)}</div>
                  <div className="text-sm font-mono text-slate-400 mt-1">°C</div>
                  <div className="mt-3 text-[10px] font-mono text-center" style={{ color: freezeColor }}>
                    {freezeRisk === 'CRITICAL' ? '⚠️ BELOW FREEZING LIMIT — FUEL MAY WAX' :
                     freezeRisk === 'WARNING' ? '⚠️ Within 5°C of freezing limit — Preheater ON' :
                     freezeRisk === 'WATCH' ? '⚡ Trace heating active — Monitor closely' :
                     '✓ Safe operating temperature range'}
                  </div>
                </div>

                {/* Per-tank freeze status */}
                <div className="lg:col-span-2 space-y-2.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-2">Per-Tank Temperature Status</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {tanks.map((tank: any) => {
                      const tc = tank.temperature_c;
                      const risk = tc < fuelSpec.pourPoint ? 'CRITICAL' : tc < fuelSpec.pourPoint + 5 ? 'WARNING' : tc < fuelSpec.pourPoint + 10 ? 'WATCH' : 'OK';
                      const tc_ = risk === 'CRITICAL' ? '#ef4444' : risk === 'WARNING' ? '#f97316' : risk === 'WATCH' ? '#f59e0b' : '#10b981';
                      return (
                        <div key={tank.id} className="p-3 rounded-xl border transition-all" style={{ borderColor: `${tc_}30`, backgroundColor: `${tc_}08` }}>
                          <div className="text-[9px] font-mono text-slate-400 mb-1 truncate">{tank.name}</div>
                          <div className="text-lg font-black font-mono" style={{ color: tc_ }}>{tc.toFixed(1)}°C</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[8px] font-mono text-slate-500">{tank.trace_heating_w}W trace heat</span>
                            <span className="text-[8px] font-mono font-bold" style={{ color: tc_ }}>{risk}</span>
                          </div>
                          {/* Mini temperature bar */}
                          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.max(5, Math.min(100, ((tc - fuelSpec.pourPoint) / (10)) * 100))}%`,
                              backgroundColor: tc_
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-polar-dark/40 border border-polar-border/40 text-[10px] font-mono text-slate-400 leading-relaxed">
                <span className="font-bold" style={{ color: freezeColor }}>Trace Heating System: </span>
                {isMaitri
                  ? 'Electric trace heating cables (750–850 W/tank) wrap all 6 AGO tank bodies and above-ground fuel lines. Controlled by thermostat set to activate at −38°C. Total trace heating load: 4.9 kW. Preheater in pump house raises fuel temp to −15°C before generator day tank transfer.'
                  : 'Self-regulating trace heating tapes on all 8 PGO tank bodies (900–920 W/tank) and all transfer lines. Automated Control System-controlled setpoint at −35°C. Total trace load: 7.3 kW. CHP inlet fuel pre-heater (electric, 2.4 kW) ensures fuel reaches minimum viscosity before combustion.'}
              </div>
            </div>

            {/* ── Section C: Full Pipeline Schematic ── */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Fuel Pipeline & Transfer Network</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{isMaitri ? 'Ground-level insulated above-ground pipeline with heat tracing' : 'Automated Control System-controlled automated valve manifold system'}</div>
                </div>
              </div>

              {/* Visual pipeline flow */}
              <div className="relative">
                <div className="flex items-center gap-0 overflow-x-auto pb-3">
                  {pipeSegments.map((seg, i) => (
                    <React.Fragment key={i}>
                      {/* Node */}
                      <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 120 }}>
                        <div className="p-3 rounded-xl border text-center" style={{
                          backgroundColor: seg.status === 'TRANSFERRING' ? '#f59e0b15' : seg.status === 'ONLINE' ? '#10b98115' : '#64748b15',
                          borderColor: seg.status === 'TRANSFERRING' ? '#f59e0b50' : seg.status === 'ONLINE' ? '#10b98150' : '#64748b50'
                        }}>
                          <div className="text-[9px] font-mono font-bold text-white text-center leading-tight">{seg.from}</div>
                          <div className="text-[8px] font-mono mt-1" style={{ color: seg.status === 'TRANSFERRING' ? '#f59e0b' : seg.status === 'ONLINE' ? '#10b981' : '#64748b' }}>{seg.status}</div>
                        </div>
                        <div className="text-[8px] font-mono text-slate-500 mt-1 text-center">{seg.temp}</div>
                      </div>
                      {/* Pipe with flow indicator */}
                      <div className="flex flex-col items-center flex-1" style={{ minWidth: 80 }}>
                        <div className="text-[8px] font-mono text-amber-300 mb-1">{seg.flow}</div>
                        <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-amber-500/20">
                          {seg.status !== 'STANDBY' && (
                            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
                              style={{ animation: 'flow 1.5s linear infinite' }} />
                          )}
                        </div>
                        <div className="text-[7px] font-mono text-slate-600 mt-1">{seg.distance} · {seg.material.substring(0, 20)}</div>
                      </div>
                    </React.Fragment>
                  ))}
                  {/* Final node */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 100 }}>
                    <div className="p-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-center">
                      <div className="text-[9px] font-mono font-bold text-white">{isMaitri ? 'Gen #1 & #2' : 'CHP Units'}</div>
                      <Zap className="w-4 h-4 text-emerald-400 animate-pulse mx-auto mt-1" />
                    </div>
                    <div className="text-[8px] font-mono text-emerald-400 mt-1">GENERATING</div>
                  </div>
                </div>
              </div>

              {/* Pipeline details table */}
              <div className="mt-4 space-y-2">
                {pipeSegments.map((seg, i) => (
                  <div key={i} className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-polar-dark/40 border border-polar-border/40 text-[10px] font-mono">
                    <div><span className="text-slate-500">Segment:</span><span className="text-white ml-2">{seg.from} → {seg.to}</span></div>
                    <div><span className="text-slate-500">Material:</span><span className="text-slate-300 ml-2">{seg.material}</span></div>
                    <div><span className="text-slate-500">Flow:</span><span className="text-amber-300 ml-2">{seg.flow}</span></div>
                    <div><span className="text-slate-500">Status:</span>
                      <span className="ml-2 font-bold" style={{ color: seg.status === 'TRANSFERRING' ? '#f59e0b' : seg.status === 'ONLINE' ? '#10b981' : '#64748b' }}>{seg.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section D: Daily Fuel Usage Breakdown ── */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Daily Fuel Consumption — Purpose-by-Purpose Breakdown</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">Every litre accounted for · {isMaitri ? 'Maitri Station' : 'Bharati Station'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-500">Net Daily Total</div>
                  <div className="text-lg font-black font-mono text-amber-300">{totalDailyNet.toLocaleString()} L/day</div>
                </div>
              </div>

              <div className="space-y-3">
                {dailyUsage.map(u => {
                  const isNeg = u.liters < 0;
                  const absL = Math.abs(u.liters);
                  const maxL = Math.max(...dailyUsage.map(x => Math.abs(x.liters)));
                  const barW = (absL / maxL) * 100;
                  return (
                    <div key={u.name} className="p-4 rounded-2xl border transition-all hover:border-amber-400/30" style={{ borderColor: `${u.color}25`, backgroundColor: `${u.color}06` }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-2xl flex-shrink-0 mt-0.5">{u.icon}</span>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-white">{u.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-relaxed">{u.purpose}</div>
                            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, backgroundColor: u.color }} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-base font-black font-mono" style={{ color: u.color }}>
                            {isNeg ? '−' : ''}{absL.toLocaleString()} L
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 mt-0.5">{Math.abs(u.pct)}% of daily</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          TAB 8: ENERGY INTELLIGENCE
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'energy_intel' && (() => {
        // Electricity conversion efficiency
        const genEfficiency = isMaitri ? 36.2 : 42.1; // % of fuel energy → electricity
        const heatRecoveryEff = isMaitri ? 0 : 48.5;   // % of waste heat recovered (CHP only)
        const totalFuelEnergyKw = burnRate * 9.6; // AGO: ~9.6 kWh/L
        const electricOut = genLoad + solarOut;
        const heatRecoveredKw = isMaitri ? 0 : (burnRate * 0.485 * 9.6);
        const exhaustLossKw = totalFuelEnergyKw - electricOut - heatRecoveredKw;

        // Power generation sources
        const genSources = isMaitri ? [
          { name: 'Diesel Generator #1', type: 'Kirloskar 80kVA', fuel: 'AGO −50°C', output: Math.round(genLoad * 0.60), pct: Math.round((genLoad * 0.60 / electricOut) * 100), color: '#f59e0b', status: 'RUNNING', icon: '⚡', detail: 'Primary generator — baseload + HVAC compressor load' },
          { name: 'Diesel Generator #2', type: 'Kirloskar 80kVA', fuel: 'AGO −50°C', output: Math.round(genLoad * 0.40), pct: Math.round((genLoad * 0.40 / electricOut) * 100), color: '#f97316', status: 'RUNNING', icon: '⚡', detail: 'Secondary generator — load sharing, emergency standby mode' },
          { name: 'Solar PV Array', type: '30kW Rooftop Monocrystalline', fuel: 'Solar Irradiance', output: solarOut, pct: Math.round((solarOut / electricOut) * 100), color: '#fbbf24', status: 'GENERATING', icon: '☀️', detail: '30kW array on station roof — Antarctic summer peak 210 W/m²' },
          { name: 'Battery Bank (Discharging)', type: 'Sealed lead-acid battery Lead-Acid 100kWh', fuel: 'Stored Charge', output: 0, pct: 0, color: '#10b981', status: 'STANDBY (92%)', icon: '🔋', detail: '100kWh UPS bank — seamless switchover on generator trip' },
        ] : [
          { name: 'CHP Unit #1', type: 'Jenbacher JGC 112 (160kW)', fuel: 'PGO −45°C', output: Math.round(genLoad * 0.55), pct: Math.round((genLoad * 0.55 / electricOut) * 100), color: '#f59e0b', status: 'RUNNING', icon: '⚡', detail: 'Combined Heat & Power — 160kWe + 220kWth heat recovery' },
          { name: 'CHP Unit #2', type: 'Jenbacher JGC 112 (160kW)', fuel: 'PGO −45°C', output: Math.round(genLoad * 0.45), pct: Math.round((genLoad * 0.45 / electricOut) * 100), color: '#f97316', status: 'RUNNING', icon: '⚡', detail: 'Secondary CHP unit — parallel operation for N+1 backup systems' },
          { name: 'Solar PV Farm', type: '50kW Double-sided Panels (220 modules)', fuel: 'Solar Irradiance', output: solarOut, pct: Math.round((solarOut / electricOut) * 100), color: '#fbbf24', status: 'GENERATING', icon: '☀️', detail: '50kW double-sided PV on south-facing terrace — optimized for low-angle Antarctic sun' },
          { name: 'Wind Turbines (×2)', type: '10kW Bergey Excel 10 each', fuel: 'Wind (44 km/h avg)', output: 8, pct: Math.round((8 / electricOut) * 100), color: '#38bdf8', status: 'SPINNING', icon: '🌀', detail: 'Two 10kW small wind turbines — coastal wind resource 44 km/h mean' },
          { name: 'Battery Bank (Discharging)', type: 'Li-Ion 200kWh Battery energy storage', fuel: 'Stored Charge', output: 0, pct: 0, color: '#10b981', status: 'STANDBY (92%)', icon: '🔋', detail: '200kWh Lithium-Ion Battery energy storage with BMS — frequency regulation + UPS' },
        ];

        // Power usage tree (how power is consumed)
        const powerConsumers = isMaitri ? [
          { name: 'HVAC & Space Heating', kw: Math.round(electricOut * 0.34), pct: 34, icon: '🌡️', color: '#818cf8', subItems: ['Living block air handling units', 'Workshop & lab forced-air heating', 'Anti-freeze pipe trace heating (4.9 kW)'] },
          { name: 'Lighting (All Areas)', kw: Math.round(electricOut * 0.08), pct: 8, icon: '💡', color: '#fbbf24', subItems: ['LED luminaires throughout station', 'Exterior flood & safety lighting', 'Emergency exit pathway lighting'] },
          { name: 'Scientific Instruments & Labs', kw: Math.round(electricOut * 0.18), pct: 18, icon: '🔬', color: '#06b6d4', subItems: ['Ozone ozone measuring instrument', 'Earthquake sensor network + GPS timing', 'PCR lab, high-speed lab spinner, −80°C freezers'] },
          { name: 'Water Treatment & Pumping', kw: Math.round(electricOut * 0.09), pct: 9, icon: '💧', color: '#38bdf8', subItems: ['Priyadarshini lake pump motor', 'Water purification & UV sterilizer', 'Hot water circulation pumps'] },
          { name: 'Communications & IT', kw: Math.round(electricOut * 0.06), pct: 6, icon: '📡', color: '#a855f7', subItems: ['LEO satellite uplink (ISRO)', 'HF/VHF radio stations', 'Server room & workstations'] },
          { name: 'Galley & Kitchen', kw: Math.round(electricOut * 0.07), pct: 7, icon: '🍳', color: '#f97316', subItems: ['Electric ranges & microwave', 'Refrigeration (3 units)', 'Industrial dishwasher'] },
          { name: 'Vehicle Workshop', kw: Math.round(electricOut * 0.08), pct: 8, icon: '🔧', color: '#10b981', subItems: ['Welding & metalwork tools', 'PistenBully charger & diagnostics', 'Compressor & fluid-powered press'] },
          { name: 'Medical Clinic', kw: Math.round(electricOut * 0.05), pct: 5, icon: '🏥', color: '#ef4444', subItems: ['ECG, X-ray & diagnostic equipment', 'Remote doctor service satellite station', 'Pharmacy cold storage'] },
          { name: 'Misc & Standby Loads', kw: Math.round(electricOut * 0.05), pct: 5, icon: '⚙️', color: '#64748b', subItems: ['Battery bank trickle charge', 'Metering & Automated Control System systems', 'Unallocated base load'] },
        ] : [
          { name: 'HVAC & Habitat Climate Control', kw: Math.round(electricOut * 0.28), pct: 28, icon: '🌡️', color: '#818cf8', subItems: ['3-story habitat air handling units', 'CHP heat exchange distribution', 'Under-floor heating coils (heat recovery)'] },
          { name: 'Scientific Instruments & Labs', kw: Math.round(electricOut * 0.22), pct: 22, icon: '🔬', color: '#06b6d4', subItems: ['Prydz Bay CTD sensor & ADCP', 'Light spectrum analyzer + all-sky imager', 'DNA sequencer, high-speed lab spinner, cryo-microscope'] },
          { name: 'Marine & Field Operations', kw: Math.round(electricOut * 0.12), pct: 12, icon: '🚤', color: '#38bdf8', subItems: ['Zodiac RHIB winch & crane', 'ROV (Prydz Bay 500m dive)', 'Helipad floodlights & beacon'] },
          { name: 'Seawater Filter Plant Seawater purification Plant', kw: Math.round(electricOut * 0.10), pct: 10, icon: '💧', color: '#3b82f6', subItems: ['Quilty Bay seawater intake pump', 'Reverse osmosis high-pressure pump', 'Post-treatment UV + mineraliser'] },
          { name: 'Lighting (All Areas)', kw: Math.round(electricOut * 0.06), pct: 6, icon: '💡', color: '#fbbf24', subItems: ['LED throughout all levels', 'Helipad & exterior safety', 'Emergency exit network'] },
          { name: 'Communications & IT', kw: Math.round(electricOut * 0.07), pct: 7, icon: '📡', color: '#a855f7', subItems: ['Starlink + ISRO dual satellite', 'HF/VHF radio & radio atmosphere probe', 'Server room + workstations'] },
          { name: 'Galley & Kitchen', kw: Math.round(electricOut * 0.06), pct: 6, icon: '🍳', color: '#f97316', subItems: ['Induction cooktops', 'Walk-in freezer (−25°C)', 'Hydroponics grow lights'] },
          { name: 'Medical Center', kw: Math.round(electricOut * 0.05), pct: 5, icon: '🏥', color: '#ef4444', subItems: ['Mini CT scanner (4.5kW peak)', 'ICU monitoring suite', 'Pressure treatment chamber compressor'] },
          { name: 'Misc & Standby', kw: Math.round(electricOut * 0.04), pct: 4, icon: '⚙️', color: '#64748b', subItems: ['Battery energy storage charging topping', 'BMS & Automated Control System control systems', 'Unallocated base load'] },
        ];

        // Heat generation data (CHP-specific for Bharati, boiler-only for Maitri)
        const heatSources = isMaitri ? [
          { name: 'Diesel Boiler #1 (Space Heat)', output: 45, color: '#f97316', icon: '🔥', dest: 'Living block radiators' },
          { name: 'Diesel Boiler #2 (Water Heat)', output: 28, color: '#f59e0b', icon: '🔥', dest: 'Hot water DHW circuit' },
          { name: 'Generator Jacket Water Heat', output: 18, color: '#818cf8', icon: '♻️', dest: 'Workshop heating (partial recovery)' },
          { name: 'Exhaust Gas Heat (Partial)', output: 8, color: '#64748b', icon: '💨', dest: 'Vented — partial muffler recovery' },
        ] : [
          { name: 'CHP #1 Jacket Water Recovery', output: 112, color: '#f59e0b', icon: '♻️', dest: 'Habitat under-floor heating loop' },
          { name: 'CHP #2 Jacket Water Recovery', output: 108, color: '#f97316', icon: '♻️', dest: 'Seawater Filter Plant pre-heat + DHW circuit' },
          { name: 'CHP Exhaust Gas Heat Exchanger', output: 64, color: '#a855f7', icon: '♻️', dest: 'Fresh air pre-conditioning HRV' },
          { name: 'Auxiliary Diesel Boiler', output: 35, color: '#818cf8', icon: '🔥', dest: 'Supplemental room heating (winter peak)' },
        ];

        const totalHeat = heatSources.reduce((a, h) => a + h.output, 0);

        return (
          <div className="space-y-6">

            {/* ── Section A: Energy Conversion Sankey-style Summary ── */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(251,191,36,0.06) 0%, transparent 60%)' }} />
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Fuel → Electricity Conversion Efficiency</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {isMaitri ? 'Open-cycle diesel generators — no heat recovery' : 'Combined Heat & Power (CHP) — co-generation with heat recovery'}
                  </div>
                </div>
              </div>

              {/* Energy flow bars */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-amber-500/20">
                  <div className="text-[9px] font-mono text-slate-400 uppercase mb-2">Fuel Energy Input</div>
                  <div className="text-3xl font-black font-mono text-amber-300">{totalFuelEnergyKw.toFixed(0)}</div>
                  <div className="text-sm font-mono text-slate-400">kW equivalent</div>
                  <div className="text-[9px] font-mono text-slate-500 mt-1">{burnRate.toFixed(1)} L/h × 9.6 kWh/L</div>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-emerald-500/20">
                  <div className="text-[9px] font-mono text-slate-400 uppercase mb-2">Electricity Output</div>
                  <div className="text-3xl font-black font-mono text-emerald-400">{electricOut}</div>
                  <div className="text-sm font-mono text-slate-400">kW</div>
                  <div className="text-[9px] font-mono text-emerald-400 mt-1">{genEfficiency}% conversion efficiency</div>
                </div>
                {isMaitri ? (
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-red-500/20">
                    <div className="text-[9px] font-mono text-slate-400 uppercase mb-2">Waste Heat (Lost)</div>
                    <div className="text-3xl font-black font-mono text-red-400">{exhaustLossKw.toFixed(0)}</div>
                    <div className="text-sm font-mono text-slate-400">kW as exhaust</div>
                    <div className="text-[9px] font-mono text-red-400 mt-1">No CHP — heat unrecovered</div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-purple-500/20">
                    <div className="text-[9px] font-mono text-slate-400 uppercase mb-2">Heat Recovered (CHP)</div>
                    <div className="text-3xl font-black font-mono text-purple-400">{heatRecoveredKw.toFixed(0)}</div>
                    <div className="text-sm font-mono text-slate-400">kW thermal</div>
                    <div className="text-[9px] font-mono text-purple-400 mt-1">{heatRecoveryEff}% CHP heat recovery</div>
                  </div>
                )}
              </div>

              {/* Conversion efficiency bar */}
              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Total Input Energy ({totalFuelEnergyKw.toFixed(0)} kW fuel)</span>
                  <span className="text-emerald-400 font-bold">{genEfficiency}% → Electricity</span>
                </div>
                <div className="relative h-5 bg-slate-800 rounded-full overflow-hidden border border-polar-border/40">
                  <div className="absolute inset-y-0 left-0 rounded-l-full bg-emerald-500" style={{ width: `${genEfficiency}%`, transition: 'width 0.8s ease' }} />
                  {!isMaitri && (
                    <div className="absolute inset-y-0 rounded-none bg-purple-500" style={{ left: `${genEfficiency}%`, width: `${heatRecoveryEff * (100 - genEfficiency) / 100}%`, transition: 'all 0.8s ease' }} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-mono text-white font-bold">
                      {genEfficiency}% electric{!isMaitri ? ` + ${heatRecoveryEff}% heat recovery` : ' (open-cycle — no heat recovery)'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-emerald-400">■ Electricity ({genEfficiency}%)</span>
                  {!isMaitri && <span className="text-purple-400">■ Heat Recovery ({heatRecoveryEff}%)</span>}
                  <span className="text-red-400">■ Exhaust Loss ({isMaitri ? (100 - genEfficiency).toFixed(1) : (100 - genEfficiency - heatRecoveryEff * (100 - genEfficiency) / 100).toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* ── Section B: Power Generation Sources ── */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Power Generation Sources — What Generates Power</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">Total generating capacity: {electricOut} kW active · {isMaitri ? '100kWh Sealed lead-acid battery backup' : '200kWh Li-Ion Battery energy storage'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {genSources.map(gs => (
                  <div key={gs.name} className="p-4 rounded-2xl border transition-all hover:border-yellow-400/30" style={{ borderColor: `${gs.color}25`, backgroundColor: `${gs.color}06` }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{gs.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-white">{gs.name}</div>
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">{gs.type} · {gs.fuel}</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold flex-shrink-0"
                        style={{ backgroundColor: `${gs.color}15`, borderColor: `${gs.color}40`, color: gs.color }}>
                        {gs.status}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-black font-mono" style={{ color: gs.color }}>{gs.output}</span>
                      <span className="text-sm font-mono text-slate-400">kW</span>
                      <span className="text-[10px] font-mono text-slate-500">({gs.pct}% of total)</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full" style={{ width: `${gs.pct}%`, backgroundColor: gs.color }} />
                    </div>
                    <div className="text-[9px] font-mono text-slate-500">{gs.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section C: Power Distribution Tree ── */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Power Usage — Pin-to-Pin Distribution</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">How every kW is allocated across station systems · Total: {electricOut} kW</div>
                </div>
              </div>

              <div className="space-y-3">
                {powerConsumers.map(pc => (
                  <div key={pc.name} className="p-4 rounded-2xl border transition-all hover:border-blue-400/20" style={{ borderColor: `${pc.color}20`, backgroundColor: `${pc.color}05` }}>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl flex-shrink-0">{pc.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-white">{pc.name}</div>
                          <div className="text-right">
                            <span className="text-sm font-black font-mono" style={{ color: pc.color }}>{pc.kw} kW</span>
                            <span className="text-[9px] font-mono text-slate-500 ml-2">{pc.pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pc.pct}%`, backgroundColor: pc.color }} />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {pc.subItems.map((s, i) => (
                            <span key={i} className="text-[9px] font-mono text-slate-500">· {s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section D: Heat Generation & Transfer ── */}
            <div className="glass-panel p-6 rounded-2xl border border-orange-500/25 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 70%, rgba(249,115,22,0.05) 0%, transparent 60%)' }} />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Heat Generation & Thermal Distribution</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {isMaitri ? 'Open-cycle diesel boilers — dedicated space & water heating' : 'CHP jacket water + exhaust gas heat exchangers — fully integrated thermal network'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-500">Total Heat Generated</div>
                  <div className="text-lg font-black font-mono text-orange-400">{totalHeat} kWth</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {heatSources.map(hs => (
                  <div key={hs.name} className="p-4 rounded-2xl border" style={{ borderColor: `${hs.color}30`, backgroundColor: `${hs.color}07` }}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{hs.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{hs.name}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">→ {hs.dest}</div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-black font-mono" style={{ color: hs.color }}>{hs.output}</span>
                      <span className="text-sm font-mono text-slate-400">kWth</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(hs.output / totalHeat) * 100}%`, backgroundColor: hs.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Heat distribution schematic */}
              <div className="p-4 rounded-2xl bg-polar-dark/50 border border-polar-border/40">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-3">Thermal Distribution Network</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono">
                  {(isMaitri ? [
                    { zone: 'Living Block', heat: '28 kWth', method: 'Forced-air duct', color: '#818cf8' },
                    { zone: 'Laboratories', heat: '12 kWth', method: 'Baseboard radiators', color: '#06b6d4' },
                    { zone: 'Workshop/Garage', heat: '18 kWth', method: 'Generator waste heat', color: '#10b981' },
                    { zone: 'Domestic Hot Water', heat: '28 kWth', method: 'Boiler #2 DHW loop', color: '#f59e0b' },
                  ] : [
                    { zone: 'Habitat Under-Floor', heat: '112 kWth', method: 'CHP jacket water loop', color: '#f59e0b' },
                    { zone: 'Seawater Filter Plant Pre-heat', heat: '54 kWth', method: 'CHP water + HEX', color: '#38bdf8' },
                    { zone: 'Fresh Air (HRV)', heat: '64 kWth', method: 'CHP exhaust HXGR', color: '#a855f7' },
                    { zone: 'Peak Winter Top-up', heat: '35 kWth', method: 'Aux diesel boiler', color: '#f97316' },
                  ]).map(z => (
                    <div key={z.zone} className="p-3 rounded-xl border text-center" style={{ borderColor: `${z.color}30`, backgroundColor: `${z.color}08` }}>
                      <div className="font-bold text-white mb-1">{z.zone}</div>
                      <div className="text-base font-black" style={{ color: z.color }}>{z.heat}</div>
                      <div className="text-slate-500 mt-1">{z.method}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default EnergyFuelPage;
