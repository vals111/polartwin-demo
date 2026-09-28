import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Fuel, Flame, AlertTriangle, ShieldCheck, Clock,
  ArrowRight, RefreshCw, Thermometer, Layers,
  Gauge, Truck, Play, X, Zap, Sun,
  ArrowUpRight, TrendingDown, ThermometerSnowflake,
  Sparkles, AlertOctagon, Brain, BatteryCharging, Droplet, Apple, CheckCircle,
  Cpu, Check, Activity
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

  // Running status configuration
  const isOnline = status === 'ONLINE';
  const isTransferring = status === 'TRANSFERRING';
  const statusBadge = isOnline
    ? { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', dot: '#10b981', label: 'ONLINE' }
    : isTransferring
      ? { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-300', dot: '#06b6d4', label: 'TRANSFER' }
      : { bg: 'bg-slate-700/50', border: 'border-slate-600/50', text: 'text-slate-300', dot: '#94a3b8', label: 'STANDBY' };

  // High-contrast temperature highlight style
  const tempStyle = tempC < -4
    ? { bg: 'bg-blue-500/20', border: 'border-blue-400/60', text: 'text-blue-300', icon: 'text-blue-400' }
    : tempC < 0
      ? { bg: 'bg-cyan-500/20', border: 'border-cyan-400/60', text: 'text-cyan-300', icon: 'text-cyan-400' }
      : { bg: 'bg-emerald-500/20', border: 'border-emerald-400/60', text: 'text-emerald-300', icon: 'text-emerald-400' };

  const h = 135;
  const w = 66;

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center gap-2 cursor-pointer group transition-all py-1 px-1 relative ${selected ? 'scale-105' : 'hover:scale-[1.03] opacity-85 hover:opacity-100'
        }`}
      style={{ width: '108px' }}
    >
      {/* ── 1. Core Tank Name ── */}
      <div
        className={`text-xs font-mono font-bold tracking-wide text-center leading-snug min-h-[32px] flex items-center justify-center transition-colors ${selected ? 'text-amber-300 font-black' : 'text-slate-200 group-hover:text-white'
          }`}
      >
        {label}
      </div>

      {/* ── 2. Prominent Temperature Highlight Badge ── */}
      <div
        className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border shadow-sm transition-all ${tempStyle.bg} ${tempStyle.border} ${tempStyle.text}`}
      >
        <ThermometerSnowflake className={`w-3.5 h-3.5 shrink-0 ${tempStyle.icon}`} />
        <span>{tempC >= 0 ? `+${tempC.toFixed(1)}` : tempC.toFixed(1)}°C</span>
      </div>

      {/* ── 3. Visual Cylinder ── */}
      <div className="relative my-0.5" style={{ width: w, height: h + 16 }}>
        {/* Tank top ellipse */}
        <svg width={w} height={16} className="absolute top-0 left-0" style={{ zIndex: 2 }}>
          <ellipse cx={w / 2} cy={8} rx={w / 2 - 2} ry={7}
            fill={selected ? `${activeColor}44` : 'rgba(15,23,42,0.95)'}
            stroke={selected ? activeColor : 'rgba(255,255,255,0.25)'} strokeWidth={selected ? 2 : 1.2} />
          {isTransferring && (
            <ellipse cx={w / 2} cy={8} rx={w / 2 - 6} ry={4}
              fill="none" stroke={activeColor} strokeWidth={1.5} strokeDasharray="4 2"
              className="animate-spin" style={{ transformOrigin: `${w / 2}px 8px`, animationDuration: '2.5s' }} />
          )}
        </svg>

        {/* Tank body */}
        <div className="absolute rounded-sm overflow-hidden border border-white/20"
          style={{
            top: 8, left: 0, width: w, height: h,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(8,15,30,0.98) 100%)',
            boxShadow: 'inset 0 0 14px rgba(0,0,0,0.6)',
          }}>
          {/* Grid lines */}
          {[25, 50, 75].map(t => (
            <div key={t} className="absolute left-0 right-0 border-t border-white/10" style={{ bottom: `${t}%` }}>
              <span className="absolute right-1 text-[7px] font-mono text-white/30" style={{ top: -6 }}>{t}</span>
            </div>
          ))}
          {/* Liquid fill */}
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
            style={{
              height: `${clamp}%`,
              background: `linear-gradient(to top, ${activeColor}dd 0%, ${activeColor}55 100%)`,
            }}>
            {/* Wave shimmer */}
            <div className="absolute top-0 left-0 right-0 h-2 opacity-70"
              style={{ background: `linear-gradient(90deg, transparent, ${activeColor}aa, transparent)` }} />
            {/* Bubble */}
            {clamp > 10 && (
              <div className="absolute w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: `${activeColor}`, left: '30%', top: 4, animationDelay: '0.3s' }} />
            )}
          </div>
          {/* Large Pct label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black font-mono text-white drop-shadow-md">{clamp.toFixed(0)}%</span>
          </div>
        </div>

        {/* Bottom ellipse */}
        <svg width={w} height={16} className="absolute bottom-0 left-0">
          <ellipse cx={w / 2} cy={8} rx={w / 2 - 2} ry={7}
            fill="rgba(8,15,30,0.95)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        </svg>
      </div>

      {/* ── 4. Tank Running Status Highlight Badge ── */}
      <div className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline || isTransferring ? 'animate-pulse' : ''}`} style={{ background: statusBadge.dot }} />
        <span>{statusBadge.label}</span>
      </div>

      {/* ── 5. Tank Capacity & Volume (Numericals only, no box, no 'Fuel Level' label) ── */}
      <div className="text-center font-mono mt-0.5">
        <span className="text-xs font-black text-amber-300">{(liters / 1000).toFixed(1)}k</span>
        <span className="text-[10px] font-bold text-slate-200"> / {(capacity / 1000).toFixed(0)}k L</span>
      </div>

      {/* ── Active Selection Indicator Bar ── */}
      <div
        className={`w-10 h-1 rounded-full transition-all duration-300 ${selected ? 'bg-amber-400' : 'bg-transparent'
          }`}
      />
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
      <div className="text-[10px] font-mono text-slate-200 font-bold uppercase tracking-wider text-center">{label}</div>
    </div>
  );
};

// ── Fuel Flow Pipeline ──────────────────────────────────────────────────────
const FuelFlowPipeline: React.FC<{
  flowRate: number;
  pumpStatus: string;
  dayTankPct: number;
  sourceTank: string;
  sourceTankPct?: number;
  sourceTankLiters?: number;
  sourceTankCapacity?: number;
  sourceTankTemp?: number;
  destination: string;
  destinationLoadKw?: number;
  destinationBurnRate?: number;
  gridFreq?: number;
  isMaitri: boolean;
}> = ({
  flowRate,
  pumpStatus,
  dayTankPct,
  sourceTank,
  sourceTankPct = 76,
  sourceTankLiters = 24320,
  sourceTankCapacity = 32000,
  sourceTankTemp = -4.1,
  destination,
  destinationLoadKw = 68,
  destinationBurnRate = 17.5,
  gridFreq = 50.02,
  isMaitri,
}) => {
    const isRunning = pumpStatus === 'RUNNING';
    const cleanSourceTank = sourceTank.replace(/^(Bulk|Coastal)\s*Tank\s*#?\d*\s*:?\s*/i, '').trim();
    const cleanDestination = destination.replace(/^Generator\s*/i, '').trim();
    const dayTankCapacity = isMaitri ? 1200 : 2500;
    const dayTankLiters = Math.round((dayTankPct / 100) * dayTankCapacity);

    return (
      <div className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-polar-dark/80 to-slate-950/90 border border-polar-border shadow-2xl overflow-hidden">
        {/* Background industrial pattern */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}
        />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-polar-border/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Fuel className="w-5 h-5" />
            </span>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Live Fuel Transfer &amp; Power Grid Feed Loop</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ACTIVE CYCLE
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-polar-darker/90 border border-amber-500/50 shadow-lg flex items-center gap-2">
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-200 uppercase tracking-wider">Loop Flow:</span>
              <span className="text-base sm:text-lg font-mono font-black text-amber-400 tracking-tight">
                {flowRate.toFixed(1)} <span className="text-xs font-semibold text-amber-200/90">L/min</span>
              </span>
            </div>

            <div className={`px-4 py-2 rounded-xl border-2 shadow-lg flex items-center gap-2.5 font-mono ${isRunning
              ? 'bg-emerald-500/20 border-emerald-400/80 text-emerald-300 shadow-emerald-950/50'
              : 'bg-amber-500/20 border-amber-400/80 text-amber-300 shadow-amber-950/50'
              }`}>
              <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
              <span className="text-xs font-bold text-slate-200 tracking-wider">PUMP:</span>
              <span className="text-sm sm:text-base font-black tracking-wide">{pumpStatus}</span>
            </div>
          </div>
        </div>

        {/* ── Schematic Diagram: Source Tank -> Pipeline & Pump -> Day Tank -> Injection -> Generator ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 py-2">

          {/* 1. SOURCE BULK TANK (Cols 1-3) */}
          <div className="md:col-span-3 flex flex-col items-center p-3.5 rounded-xl bg-polar-dark/60 border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-lg group">
            <div className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Active Source Tank
            </div>
            {/* Tank Name Prominent */}
            <div className="text-sm font-black font-mono text-white text-center mb-1 group-hover:text-amber-300 transition-colors">
              {cleanSourceTank}
            </div>
            <div className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40 mb-3">
              ❄️ {sourceTankTemp.toFixed(1)}°C
            </div>

            {/* 3D Vertical Tank Body */}
            <div className="relative w-20 h-32 rounded-xl border-2 border-amber-500/50 bg-slate-950/80 p-1 flex flex-col justify-end overflow-hidden shadow-inner">
              <div className="absolute right-1 inset-y-1 flex flex-col justify-between text-[8px] font-mono text-amber-200/80 font-bold pointer-events-none z-20">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
              </div>
              <div
                className="w-full rounded-b-lg relative transition-all duration-1000 overflow-hidden"
                style={{
                  height: `${Math.max(5, Math.min(100, sourceTankPct))}%`,
                  background: 'linear-gradient(to top, #b45309, #d97706, #f59e0b)',
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-200/40 via-amber-100/70 to-amber-200/40"
                  style={{ animation: 'shimmer 2s infinite linear' }}
                />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <span className="text-sm font-black font-mono text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {sourceTankPct.toFixed(0)}%
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-200">AGO DIESEL</span>
              </div>
            </div>

            <div className="mt-2.5 text-center space-y-0.5">
              <div className="text-xs font-black font-mono text-amber-400">
                {(sourceTankLiters / 1000).toFixed(1)}k L
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-200">
                Cap: {(sourceTankCapacity / 1000).toFixed(0)}k L
              </div>
              <div className="text-[9px] font-mono text-emerald-400 font-bold flex items-center justify-center gap-1 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                VALVE V-101: OPEN
              </div>
            </div>
          </div>

          {/* 2. TRANSFER PIPELINE & INLINE PUMP (Cols 4-5) */}
          <div className="md:col-span-2 flex flex-col items-center justify-center px-1 py-3">
            <div className="text-[10px] font-mono text-slate-200 font-bold mb-1 flex items-center gap-1.5">
              <span className="uppercase tracking-wider">Transfer Line</span>
              <span className="text-amber-400 font-extrabold">{flowRate.toFixed(1)} L/m</span>
            </div>

            <div className="w-full relative py-2">
              <div className="h-5 rounded-full bg-slate-900 border border-amber-500/30 p-0.5 flex items-center relative overflow-hidden shadow-inner">
                <div className="w-full h-full rounded-full bg-amber-950/80 relative overflow-hidden">
                  <svg className="w-full h-full" preserveAspectRatio="none">
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke="#f59e0b"
                      strokeWidth="8"
                      strokeDasharray="10 8"
                      className="animate-pipe-dash"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-2 p-2 rounded-xl bg-slate-900/90 border border-polar-border flex items-center gap-2 shadow-md">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <div className="text-[10px] font-mono font-bold text-white">Pump P-101</div>
                <div className="text-[9px] font-mono text-emerald-300 font-bold">2.4 bar · {flowRate.toFixed(1)} L/m</div>
              </div>
            </div>
            <div className="text-[9px] font-mono font-bold text-amber-300 mt-1 tracking-wider">&gt;&gt;&gt; FLOW TO DAY TANK &gt;&gt;&gt;</div>
          </div>

          {/* 3. GENERATOR DAY TANK (Cols 6-8) */}
          <div className="md:col-span-3 flex flex-col items-center p-3.5 rounded-xl bg-polar-dark/60 border border-cyan-500/30 hover:border-cyan-500/60 transition-all shadow-lg group">
            <div className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Buffer Service Tank
            </div>
            <div className="text-sm font-black font-mono text-white text-center mb-1 group-hover:text-cyan-300 transition-colors">
              {isMaitri ? 'Generator Day Tank #1' : 'CHP Header Day Tank #1'}
            </div>
            <div className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 mb-3">
              Gravity Header
            </div>

            <div className="relative w-20 h-32 rounded-xl border-2 border-cyan-500/50 bg-slate-950/80 p-1 flex flex-col justify-end overflow-hidden shadow-inner">
              <div className="absolute right-1 inset-y-1 flex flex-col justify-between text-[8px] font-mono text-cyan-200/80 font-bold pointer-events-none z-20">
                <span>Full</span>
                <span>75%</span>
                <span>50%</span>
                <span>Low</span>
              </div>
              <div
                className="w-full rounded-b-lg relative transition-all duration-1000 overflow-hidden"
                style={{
                  height: `${Math.max(5, Math.min(100, dayTankPct))}%`,
                  background: 'linear-gradient(to top, #0891b2, #06b6d4, #22d3ee)',
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-cyan-200/40 via-cyan-100/70 to-cyan-200/40"
                  style={{ animation: 'shimmer 2s infinite linear' }}
                />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <span className="text-sm font-black font-mono text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {dayTankPct.toFixed(0)}%
                </span>
                <span className="text-[9px] font-mono font-bold text-cyan-200">READY</span>
              </div>
            </div>

            <div className="mt-2.5 text-center space-y-0.5">
              <div className="text-xs font-black font-mono text-cyan-400">
                {dayTankLiters} L Reserve
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-200">
                Cap: {dayTankCapacity} L
              </div>
              <div className="text-[9px] font-mono text-emerald-400 font-bold flex items-center justify-center gap-1 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                FLOAT HIGH: OK
              </div>
            </div>
          </div>

          {/* 4. GRAVITY INJECTION FEED LINE (Col 9) */}
          <div className="md:col-span-1 flex flex-col items-center justify-center px-1 py-3">
            <div className="w-full relative py-2">
              <div className="h-4 rounded-full bg-slate-900 border border-cyan-500/30 p-0.5 flex items-center relative overflow-hidden shadow-inner">
                <div className="w-full h-full rounded-full bg-cyan-950/80 relative overflow-hidden">
                  <svg className="w-full h-full" preserveAspectRatio="none">
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke="#06b6d4"
                      strokeWidth="6"
                      strokeDasharray="8 6"
                      className="animate-pipe-dash"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="text-[9px] font-mono text-cyan-300 font-black mt-1 text-center tracking-wider">FEED &gt;&gt;</div>
          </div>

          {/* 5. TARGET GENERATOR (Cols 10-12) */}
          <div className="md:col-span-3 flex flex-col items-center p-3.5 rounded-xl bg-polar-dark/60 border border-emerald-500/40 hover:border-emerald-500/70 transition-all shadow-lg group">
            <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Target Power Genset
            </div>
            <div className="text-sm font-black font-mono text-white text-center mb-1 group-hover:text-emerald-300 transition-colors">
              {cleanDestination}
            </div>
            <div className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 mb-3">
              ● ONLINE &amp; SYNCHRONIZED
            </div>

            <div className="relative w-24 sm:w-26 h-32 rounded-xl border-2 border-emerald-500/50 bg-slate-950/90 flex flex-col items-center justify-between p-2 shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="p-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 shadow-md shadow-emerald-500/20">
                <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="text-center space-y-0.5 z-10">
                <div className="text-base font-black font-mono text-white leading-tight">
                  {destinationLoadKw} <span className="text-[10px] text-emerald-400 font-bold">kW</span>
                </div>
                <div className="text-[10px] font-mono text-cyan-300 font-extrabold leading-tight">
                  {gridFreq.toFixed(2)} Hz
                </div>
              </div>
              <div className="w-full flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 shadow-sm z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-[10px] font-mono font-bold text-white tracking-wide">1,500</span>
                <span className="text-[9px] font-mono font-bold text-emerald-300">RPM</span>
              </div>
            </div>

            <div className="mt-2.5 text-center space-y-0.5">
              <div className="text-xs font-black font-mono text-orange-400 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                {destinationBurnRate.toFixed(1)} L/h
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-200">
                {(destinationBurnRate * 24).toFixed(0)} L/day Consumption
              </div>
              <div className="text-[9px] font-mono text-emerald-300 font-bold pt-1">
                COOLANT: 86.2°C NOMINAL
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

// ── Burn Rate Waterfall EChart ──────────────────────────────────────────────
const BurnWaterfallChart: React.FC<{ drivers: any; isMaitri: boolean }> = ({ drivers, isMaitri }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const isInitialRef = useRef(true);

  // Initialize once on mount
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      inst.current = null;
    };
  }, []);

  // Update data smoothly without re-initializing or flickering
  useEffect(() => {
    const chart = inst.current;
    if (!chart) return;

    const isInitial = isInitialRef.current;
    if (isInitial) {
      isInitialRef.current = false;
    }

    const items = [
      { id: 'gen', name: 'Generator', value: Number((drivers.generator_burn_l_hr || 17.5).toFixed(2)), color: '#f59e0b' },
      { id: 'heat', name: 'Heating', value: Number((drivers.heating_burn_equiv_l_hr || 8.3).toFixed(2)), color: '#818cf8' },
      { id: 'sci', name: 'Research', value: Number((drivers.science_burn_equiv_l_hr || 3.1).toFixed(2)), color: '#06b6d4' },
      { id: 'base', name: 'Base Load', value: Number((drivers.base_station_load_kw ? drivers.base_station_load_kw * 0.26 : 9.1).toFixed(2)), color: '#a855f7' },
      { id: 'boiler', name: 'Aux Boiler', value: Number((drivers.auxiliary_boiler_l_hr || 2.7).toFixed(2)), color: '#f97316' },
      { id: 'solar', name: '− Solar', value: -Number((drivers.solar_fuel_saved_l_hr || 4.7).toFixed(2)), color: '#22c55e' },
    ];

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: isInitial ? 500 : 0,
      animationDurationUpdate: 350,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
      grid: { top: 48, bottom: 40, left: 65, right: 25 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.2)',
        textStyle: { color: '#ffffff', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold' },
        formatter: (p: any) => `${p[0]?.name}: <b>${Math.abs(p[0]?.value || 0).toFixed(2)} L/hr</b>`,
      },
      xAxis: {
        type: 'category',
        data: items.map(i => i.name),
        axisLabel: { color: '#f8fafc', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace', margin: 12 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisTick: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      yAxis: {
        type: 'value',
        name: 'L/hr',
        nameTextStyle: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace', padding: [0, 0, 8, 0] },
        axisLabel: { color: '#f1f5f9', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        boundaryGap: ['15%', '22%'],
      },
      series: [{
        id: 'waterfall_bars',
        type: 'bar',
        data: items.map(i => ({
          id: i.id,
          name: i.name,
          value: i.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: i.value < 0 ? '#22c55e' : i.color },
              { offset: 1, color: i.value < 0 ? '#15803d88' : `${i.color}66` },
            ]),
            borderRadius: i.value >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
          },
          label: {
            show: true,
            position: i.value >= 0 ? 'top' : 'bottom',
            distance: 8,
            formatter: `${i.value >= 0 ? '+' : ''}${i.value.toFixed(1)}`,
            color: i.value < 0 ? '#4ade80' : '#ffffff',
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'monospace',
          },
        })),
        barWidth: '48%',
      }],
    }, false);
  }, [drivers, isMaitri]);

  return <div ref={ref} className="w-full h-80 sm:h-96" />;
};

// ── Daily Fuel Consumption Purpose Breakdown Graph ────────────────────────────
const DailyFuelConsumptionChart: React.FC<{
  dailyUsage: Array<{ name: string; liters: number; pct: number; color: string; icon: string; purpose: string }>;
  totalDailyNet: number;
  isMaitri: boolean;
}> = ({ dailyUsage, totalDailyNet, isMaitri }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const barInst = useRef<echarts.ECharts | null>(null);
  const donutInst = useRef<echarts.ECharts | null>(null);

  // Initialize Bar and Donut charts once on mount
  useEffect(() => {
    if (barRef.current) {
      barInst.current = echarts.init(barRef.current, 'dark');
    }
    if (donutRef.current) {
      donutInst.current = echarts.init(donutRef.current, 'dark');
    }

    const onResize = () => {
      barInst.current?.resize();
      donutInst.current?.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      barInst.current?.dispose();
      donutInst.current?.dispose();
      barInst.current = null;
      donutInst.current = null;
    };
  }, []);

  // Update Bar Chart
  useEffect(() => {
    const chart = barInst.current;
    if (!chart) return;

    // Sort reversed for horizontal display (top item is highest)
    const reversed = [...dailyUsage].reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      grid: { top: 20, bottom: 25, left: 250, right: 80 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        backgroundColor: 'rgba(8, 14, 28, 0.96)',
        borderColor: 'rgba(56, 189, 248, 0.35)',
        borderWidth: 1.5,
        padding: [12, 16],
        extraCssText: 'border-radius: 12px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(56, 189, 248, 0.15); backdrop-filter: blur(8px); min-width: 290px; max-width: 380px;',
        textStyle: { color: '#ffffff', fontFamily: 'monospace', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          const item = dailyUsage.find(u => u.name === p.name);
          if (!item) return '';
          return `
            <div style="min-width: 260px; max-width: 350px; box-sizing: border-box;">
              <div style="font-weight: 800; font-size: 13px; color: #ffffff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; line-height: 1.3;">
                <span style="font-size: 15px;">${item.icon}</span>
                <span style="color: #f8fafc; word-break: break-word;">${item.name}</span>
              </div>
              <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                <span style="color: ${item.color}; font-weight: 900; font-size: 15px; font-family: monospace;">
                  ${item.liters < 0 ? '−' : '+'}${Math.abs(item.liters).toLocaleString()} L/day
                </span>
                <span style="font-size: 12px; font-weight: 700; color: #94a3b8; font-family: monospace;">
                  (${item.pct > 0 ? '+' : ''}${item.pct}%)
                </span>
              </div>
              <div style="color: #cbd5e1; font-size: 11px; line-height: 1.45; word-wrap: break-word; word-break: normal; white-space: normal; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.12);">
                ${item.purpose}
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'L/day',
        nameTextStyle: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold' },
        axisLabel: { color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: reversed.map(u => u.name),
        axisLabel: {
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          margin: 10,
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: reversed.map(u => ({
          value: u.liters,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(u.liters >= 0 ? 0 : 1, 0, u.liters >= 0 ? 1 : 0, 0, [
              { offset: 0, color: `${u.color}55` },
              { offset: 1, color: u.color },
            ]),
            borderRadius: u.liters >= 0 ? [0, 6, 6, 0] : [6, 0, 0, 6],
          },
        })),
        barWidth: '55%',
        label: {
          show: true,
          position: (p: any) => p.value >= 0 ? 'right' : 'left',
          formatter: (p: any) => `${p.value >= 0 ? '+' : ''}${p.value} L`,
          color: '#ffffff',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          fontSize: 11,
          distance: 8,
        },
      }],
    }, false);
  }, [dailyUsage]);

  // Update Donut Chart
  useEffect(() => {
    const chart = donutInst.current;
    if (!chart) return;

    // Only consumers (positive values) for donut distribution
    const positiveConsumers = dailyUsage.filter(u => u.liters > 0);

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 600,
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(8, 14, 28, 0.96)',
        borderColor: 'rgba(56, 189, 248, 0.35)',
        borderWidth: 1.5,
        padding: [10, 14],
        extraCssText: 'border-radius: 12px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8); min-width: 200px;',
        textStyle: { color: '#ffffff', fontFamily: 'monospace', fontSize: 12 },
        formatter: (params: any) => {
          return `
            <div style="min-width: 180px;">
              <div style="font-weight: 800; font-size: 13px; color: #ffffff; margin-bottom: 4px;">${params.name}</div>
              <div style="font-weight: 900; font-size: 14px; color: #38bdf8; font-family: monospace;">
                ${params.value.toLocaleString()} L/day <span style="color: #94a3b8; font-size: 11px;">(${params.percent}%)</span>
              </div>
            </div>
          `;
        },
      },
      series: [{
        name: 'Fuel Allocation',
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0b1329',
          borderWidth: 3,
        },
        label: {
          show: true,
          color: '#ffffff',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          formatter: '{b}: {d}%',
        },
        labelLine: {
          show: true,
          lineStyle: { color: 'rgba(255,255,255,0.3)' },
        },
        data: positiveConsumers.map(u => ({
          value: u.liters,
          name: u.name.split(' (')[0],
          itemStyle: { color: u.color },
        })),
      }],
    }, false);
  }, [dailyUsage]);

  return (
    <div className="space-y-6">
      {/* Visual Charts: Side-by-Side Horizontal Bar & Allocation Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Horizontal Comparative Bar Chart */}
        <div className="lg:col-span-7 bg-polar-darker/80 p-5 rounded-2xl border border-slate-700/80 shadow-lg">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-polar-border/50">
            <span className="text-xs font-mono text-slate-200 font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Consumption by Purpose & Offset (L/day)
            </span>
            <span className="text-[10px] font-mono text-amber-300 font-semibold">Hover bar for details</span>
          </div>
          <div ref={barRef} className="w-full h-80 sm:h-96" />
        </div>

        {/* Allocation Share Donut Chart */}
        <div className="lg:col-span-5 bg-polar-darker/80 p-5 rounded-2xl border border-slate-700/80 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-polar-border/50">
            <span className="text-xs font-mono text-slate-200 font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Daily Fuel Share Allocation (%)
            </span>
            <span className="text-[10px] font-mono text-cyan-300 font-bold">Gross Load Share</span>
          </div>
          <div className="relative flex-1 flex items-center justify-center">
            <div ref={donutRef} className="w-full h-72 sm:h-80" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[10px] font-mono text-slate-300 uppercase font-bold tracking-wider">NET DAILY</div>
              <div className="text-2xl font-black font-mono text-amber-300">{totalDailyNet.toLocaleString()}</div>
              <div className="text-[10px] font-mono text-slate-300 font-bold">LITRES / DAY</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

// ── Power Usage Pin-to-Pin Distribution Graph ──────────────────────────────
const PowerUsagePinToPinChart: React.FC<{
  powerConsumers: Array<{
    name: string;
    kw: number;
    pct: number;
    icon: string;
    color: string;
    subItems: string[];
  }>;
  electricOut: number;
  isMaitri: boolean;
}> = ({ powerConsumers, electricOut, isMaitri }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const barInst = useRef<echarts.ECharts | null>(null);
  const donutInst = useRef<echarts.ECharts | null>(null);

  // Initialize Bar and Donut charts once on mount
  useEffect(() => {
    if (barRef.current) {
      barInst.current = echarts.init(barRef.current, 'dark');
    }
    if (donutRef.current) {
      donutInst.current = echarts.init(donutRef.current, 'dark');
    }

    const onResize = () => {
      barInst.current?.resize();
      donutInst.current?.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      barInst.current?.dispose();
      donutInst.current?.dispose();
      barInst.current = null;
      donutInst.current = null;
    };
  }, []);

  // Update Bar Chart
  useEffect(() => {
    const chart = barInst.current;
    if (!chart) return;

    // Reverse for horizontal chart display so highest is at top
    const reversed = [...powerConsumers].reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      grid: { top: 20, bottom: 25, left: 250, right: 80 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        backgroundColor: 'rgba(8, 14, 28, 0.96)',
        borderColor: 'rgba(56, 189, 248, 0.35)',
        borderWidth: 1.5,
        padding: [12, 16],
        extraCssText: 'border-radius: 12px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(56, 189, 248, 0.15); backdrop-filter: blur(8px); min-width: 290px; max-width: 380px;',
        textStyle: { color: '#ffffff', fontFamily: 'monospace', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          const item = powerConsumers.find(c => c.name === p.name);
          if (!item) return '';
          const subList = item.subItems.map(s => `• ${s}`).join('<br/>');
          return `
            <div style="min-width: 260px; max-width: 350px; box-sizing: border-box;">
              <div style="font-weight: 800; font-size: 13px; color: #ffffff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; line-height: 1.3;">
                <span style="font-size: 15px;">${item.icon}</span>
                <span style="color: #f8fafc; word-break: break-word;">${item.name}</span>
              </div>
              <div style="color: ${item.color}; font-weight: 900; font-size: 15px; font-family: monospace; margin-bottom: 8px;">
                ${item.kw} kW <span style="font-size: 12px; font-weight: 700; color: #94a3b8;">(${item.pct}% of active microgrid)</span>
              </div>
              <div style="color: #cbd5e1; font-size: 11px; line-height: 1.5; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.12);">
                ${subList}
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'kW',
        nameTextStyle: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
        axisLabel: { color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: reversed.map(c => c.name),
        axisLabel: {
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          margin: 10,
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: reversed.map(c => ({
          value: c.kw,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: `${c.color}55` },
              { offset: 1, color: c.color },
            ]),
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barWidth: '55%',
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => `${p.value} kW`,
          color: '#ffffff',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          fontSize: 11,
          distance: 8,
        },
      }],
    }, false);
  }, [powerConsumers]);

  // Update Donut Chart
  useEffect(() => {
    const chart = donutInst.current;
    if (!chart) return;

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 600,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.2)',
        textStyle: { color: '#ffffff', fontFamily: 'monospace', fontSize: 12 },
        formatter: '{b}: <b>{c} kW</b> ({d}%)',
      },
      series: [{
        name: 'Power Distribution',
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0b1329',
          borderWidth: 3,
        },
        label: {
          show: true,
          color: '#ffffff',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          formatter: '{b}: {d}%',
        },
        labelLine: {
          show: true,
          lineStyle: { color: 'rgba(255,255,255,0.3)' },
        },
        data: powerConsumers.map(c => ({
          value: c.kw,
          name: c.name.split(' (')[0],
          itemStyle: { color: c.color },
        })),
      }],
    }, false);
  }, [powerConsumers]);

  return (
    <div className="space-y-6">
      {/* Visual Charts: Side-by-Side Horizontal Bar & Sub-Bus Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Horizontal Comparative Bar Chart */}
        <div className="lg:col-span-7 bg-polar-darker/80 p-5 rounded-2xl border border-slate-700/80 shadow-lg">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-polar-border/50">
            <span className="text-xs font-mono text-slate-200 font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Pin-to-Pin Load by Consumer Category (kW)
            </span>
            <span className="text-[10px] font-mono text-cyan-300 font-semibold">Hover bar for sub-circuit details</span>
          </div>
          <div ref={barRef} className="w-full h-80 sm:h-96" />
        </div>

        {/* Allocation Share Donut Chart */}
        <div className="lg:col-span-5 bg-polar-darker/80 p-5 rounded-2xl border border-slate-700/80 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-polar-border/50">
            <span className="text-xs font-mono text-slate-200 font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Microgrid Power Allocation Share (%)
            </span>
            <span className="text-[10px] font-mono text-blue-300 font-bold">Pin-to-Pin Slice</span>
          </div>
          <div className="relative flex-1 flex items-center justify-center">
            <div ref={donutRef} className="w-full h-72 sm:h-80" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[10px] font-mono text-slate-300 uppercase font-bold tracking-wider">TOTAL LOAD</div>
              <div className="text-2xl font-black font-mono text-cyan-300">{electricOut}</div>
              <div className="text-[10px] font-mono text-slate-300 font-bold">KILOWATTS (kW)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

// ── 24-Hour Power Grid Diurnal Load vs Generation Profile Chart ──────────────
const PowerGrid24hChart: React.FC<{
  genLoad: number;
  solarOut: number;
  isMaitri: boolean;
}> = ({ genLoad, solarOut, isMaitri }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

    // Diurnal demand profile based on base load + activity peaks
    const baseDemand = isMaitri ? 62 : 78;
    const demandMultipliers = [0.82, 0.80, 0.84, 0.95, 1.15, 1.25, 1.22, 1.18, 1.12, 1.24, 1.10, 0.90];
    const totalDemandSeries = demandMultipliers.map(m => Math.round(baseDemand * m));

    // Solar generation profile (polar summer daylight curve)
    const solarCurve = [2, 1, 4, 10, 18, 24, 28, 26, 20, 12, 6, 3];
    const solarScale = solarOut > 0 ? solarOut / 28 : (isMaitri ? 0.75 : 1.0);
    const solarSeries = solarCurve.map(s => Math.round(s * solarScale));

    // Generator load is dispatch required to meet demand minus solar
    const genSeries = totalDemandSeries.map((d, i) => Math.max(isMaitri ? 35 : 45, d - solarSeries[i]));

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
      grid: { top: 32, bottom: 36, left: 50, right: 20 },
      legend: {
        data: ['Total Station Demand', 'Diesel Generator Dispatch', 'Solar PV Generation'],
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        top: 0,
        right: 10,
        icon: 'circle',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: any) => {
          let html = `<b style="color:#e2e8f0">${params[0]?.axisValue}</b><br/>`;
          params.forEach((p: any) => {
            html += `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${p.value} kW</b><br/>`;
          });
          return html;
        },
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      yAxis: {
        type: 'value',
        name: 'kW',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      series: [
        {
          name: 'Total Station Demand',
          type: 'line',
          smooth: true,
          data: totalDemandSeries,
          lineStyle: { width: 3, color: '#38bdf8' },
          itemStyle: { color: '#38bdf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56,189,248,0.25)' },
              { offset: 1, color: 'rgba(56,189,248,0.01)' },
            ]),
          },
        },
        {
          name: 'Diesel Generator Dispatch',
          type: 'line',
          smooth: true,
          data: genSeries,
          lineStyle: { width: 2.5, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245,158,11,0.2)' },
              { offset: 1, color: 'rgba(245,158,11,0.01)' },
            ]),
          },
        },
        {
          name: 'Solar PV Generation',
          type: 'line',
          smooth: true,
          data: solarSeries,
          lineStyle: { width: 2.5, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16,185,129,0.25)' },
              { offset: 1, color: 'rgba(16,185,129,0.01)' },
            ]),
          },
        },
      ],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [genLoad, solarOut, isMaitri]);

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
  const [activeTab, setActiveTab] = useState<'tanks' | 'power_grid' | 'flow' | 'fuel_intel' | 'energy_intel'>('tanks');
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
      } catch { }
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
  const totalDemand = eng?.total_demand ?? (genLoad + solarOut);
  const batteryPct = eng?.battery_level ?? 92.0;
  const gridFreq = eng?.grid_frequency ?? (isMaitri ? 50.08 : 50.02);

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

  // 30-day water burn trend
  const waterTrend = useMemo(() => genBurnTrend(35, 30), []);

  // Helper to ensure clean core tank name without "Bulk Tank" or "Coastal Tank"
  const formatTankCoreName = (rawName: string): string => {
    if (!rawName) return '';
    const match = rawName.match(/^(?:Bulk|Coastal)\s*Tank\s*(?:#?(\d+))?\s*\(([^)]+)\)/i);
    if (match) {
      const num = match[1];
      const core = match[2].trim();
      if (/\d+/.test(core) || /Reserve|Sump/i.test(core)) {
        return core;
      }
      return num ? `${core} #${num}` : core;
    }
    return rawName.replace(/^(Bulk|Coastal)\s*Tank\s*#?\d*\s*:?\s*/i, '').trim();
  };

  const rawTanks = useMemo(() => fuelDetails?.tanks || (isMaitri ? [
    { id: 'tm01', name: 'AGO North #1', capacity_l: 32000, current_level_l: 25600, level_pct: 80, temperature_c: -3.8, status: 'ONLINE', trace_heating_w: 850, health_pct: 97.5 },
    { id: 'tm02', name: 'AGO North-East #2', capacity_l: 32000, current_level_l: 24320, level_pct: 76, temperature_c: -4.1, status: 'TRANSFERRING', trace_heating_w: 850, health_pct: 96.0 },
    { id: 'tm03', name: 'AGO East #1', capacity_l: 30000, current_level_l: 23100, level_pct: 77, temperature_c: -4.5, status: 'STANDBY', trace_heating_w: 800, health_pct: 95.2 },
    { id: 'tm04', name: 'AGO South-East #2', capacity_l: 30000, current_level_l: 22800, level_pct: 76, temperature_c: -4.2, status: 'STANDBY', trace_heating_w: 800, health_pct: 94.8 },
    { id: 'tm05', name: 'AGO South #1', capacity_l: 28000, current_level_l: 21280, level_pct: 76, temperature_c: -4.8, status: 'STANDBY', trace_heating_w: 750, health_pct: 98.1 },
    { id: 'tm06', name: 'AGO Reserve', capacity_l: 28000, current_level_l: 20900, level_pct: 74.6, temperature_c: -4.0, status: 'STANDBY', trace_heating_w: 750, health_pct: 95.5 },
  ] : [
    { id: 'tb01', name: 'Larsemann North #1', capacity_l: 37500, current_level_l: 31875, level_pct: 85, temperature_c: 2.4, status: 'ONLINE', trace_heating_w: 920, health_pct: 99.1 },
    { id: 'tb02', name: 'Larsemann North #2', capacity_l: 37500, current_level_l: 31125, level_pct: 83, temperature_c: 2.2, status: 'TRANSFERRING', trace_heating_w: 920, health_pct: 98.4 },
    { id: 'tb03', name: 'Central Matrix #1', capacity_l: 37500, current_level_l: 30750, level_pct: 82, temperature_c: 2.0, status: 'STANDBY', trace_heating_w: 900, health_pct: 97.2 },
    { id: 'tb04', name: 'Central Matrix #2', capacity_l: 37500, current_level_l: 30375, level_pct: 81, temperature_c: 2.1, status: 'STANDBY', trace_heating_w: 900, health_pct: 98.0 },
    { id: 'tb05', name: 'South Bay #1', capacity_l: 37500, current_level_l: 30000, level_pct: 80, temperature_c: 1.9, status: 'STANDBY', trace_heating_w: 900, health_pct: 96.5 },
    { id: 'tb06', name: 'South Bay #2', capacity_l: 37500, current_level_l: 30375, level_pct: 81, temperature_c: 2.2, status: 'STANDBY', trace_heating_w: 900, health_pct: 99.0 },
    { id: 'tb07', name: 'Deep Winter Reserve', capacity_l: 37500, current_level_l: 30750, level_pct: 82, temperature_c: 2.3, status: 'STANDBY', trace_heating_w: 920, health_pct: 98.3 },
    { id: 'tb08', name: 'CHP Return Sump', capacity_l: 37500, current_level_l: 29750, level_pct: 79.3, temperature_c: 2.5, status: 'STANDBY', trace_heating_w: 920, health_pct: 97.8 },
  ]), [fuelDetails, isMaitri]);

  const tanks = useMemo(() => {
    return rawTanks.map((t: any) => ({
      ...t,
      name: formatTankCoreName(t.name)
    }));
  }, [rawTanks]);

  const selectedTank = tanks.find((t: any) => t.id === (selectedTankId || tanks[0]?.id)) || tanks[0];

  const drivers = useMemo(() => fuelDetails?.drivers || {
    generator_burn_l_hr: (eng?.generator_load ?? (isMaitri ? 67 : 84)) * 0.26,
    heating_burn_equiv_l_hr: (eng?.heating_load ?? (isMaitri ? 32 : 38)) * 0.26,
    science_burn_equiv_l_hr: (eng?.research_load ?? (isMaitri ? 12 : 18)) * 0.26,
    base_station_load_kw: eng?.base_load ?? (isMaitri ? 35 : 45),
    solar_fuel_saved_l_hr: (eng?.solar_output ?? (isMaitri ? 18 : 26)) * 0.26,
    auxiliary_boiler_l_hr: isMaitri ? 2.7 : 3.2,
  }, [fuelDetails?.drivers, eng?.generator_load, eng?.heating_load, eng?.research_load, eng?.base_load, eng?.solar_output, isMaitri]);

  const transferLoop = fuelDetails?.transfer_loop || {
    pump_status: 'RUNNING',
    flow_rate_l_min: isMaitri ? 4.8 : 6.2,
    active_source_tank: tanks.find((t: any) => t.status === 'TRANSFERRING')?.name || tanks[1]?.name || (isMaitri ? 'AGO North-East #2' : 'Larsemann North #2'),
    day_tank_level_pct: isMaitri ? 86.4 : 91.2,
  };

  const activeSourceTankName = transferLoop?.active_source_tank || tanks.find((t: any) => t.status === 'TRANSFERRING')?.name || tanks[1]?.name || (isMaitri ? 'AGO North-East #2' : 'Larsemann North #2');
  const activeSourceTankObj = tanks.find((t: any) => t.name === activeSourceTankName) || tanks[1] || tanks[0];
  const destinationGeneratorName = isMaitri ? 'Kirloskar 80kVA Prime Gen #1' : 'Scania 160kW CHP Unit #1';

  const zoneColor = { Normal: '#10b981', Watch: '#06b6d4', High: '#f59e0b', Critical: '#ef4444' }[reserveZone] || '#10b981';

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
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5">
                <Zap className="w-6 h-6 text-amber-400" />
                <Fuel className="w-6 h-6 text-orange-400" />
              </span>
              {stationId.toUpperCase()} Energy &amp; Fuel
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => navigate(`/station/${stationId}/decision?domain=energy`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              <Brain className="w-4 h-4 text-purple-400" /> Decision Intel
            </button>
          </div>
        </div>

        {/* ── Cross-Domain Integrated KPI Banner ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-5 pt-4 border-t border-polar-border/60">
          {[
            {
              id: 'gen_load',
              label: 'Generator Load',
              value: genLoad,
              unit: 'kW',
              sub: `Freq: ${gridFreq.toFixed(2)} Hz`,
              progress: Math.min(100, (genLoad / (isMaitri ? 100 : 160)) * 100),
              badge: 'GRID SYNC',
              badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
              color: '#f59e0b',
              borderHover: 'hover:border-amber-500/50',
              icon: <Zap className="w-4 h-4 text-amber-400" />,
            },
            {
              id: 'solar_pv',
              label: 'Solar PV Output',
              value: solarOut,
              unit: 'kW',
              sub: isMaitri ? 'Rooftop Array' : 'Double-sided Farm',
              progress: Math.min(100, (solarOut / (isMaitri ? 30 : 45)) * 100),
              badge: `+${(solarOut * 0.26).toFixed(1)} L/h SAVED`,
              badgeColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
              color: '#fbbf24',
              borderHover: 'hover:border-yellow-500/50',
              icon: <Sun className="w-4 h-4 text-yellow-400" />,
            },
            {
              id: 'battery_bank',
              label: 'Battery Bank',
              value: batteryPct.toFixed(0),
              unit: '%',
              sub: `~${Math.round(batteryPct * 0.5)}h backup`,
              progress: batteryPct,
              badge: 'VRLA GEL',
              badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
              color: '#10b981',
              borderHover: 'hover:border-emerald-500/50',
              icon: <BatteryCharging className="w-4 h-4 text-emerald-400" />,
            },
            {
              id: 'fuel_reserve',
              label: 'Fuel Reserve',
              value: fuelPct.toFixed(1),
              unit: '%',
              sub: `${(currentLevel / 1000).toFixed(1)}k L in tanks`,
              progress: fuelPct,
              badge: reserveZone.toUpperCase(),
              badgeColor: reserveZone === 'Normal' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : reserveZone === 'Watch' ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10',
              color: zoneColor,
              borderHover: 'hover:border-cyan-500/50',
              icon: <Fuel className="w-4 h-4" style={{ color: zoneColor }} />,
            },
            {
              id: 'burn_rate',
              label: 'Burn Rate',
              value: burnRate.toFixed(1),
              unit: 'L/h',
              sub: `${(burnRate * 24).toFixed(0)} L/day`,
              progress: Math.min(100, (burnRate / 35) * 100),
              badge: 'CHP COMB.',
              badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
              color: '#f97316',
              borderHover: 'hover:border-orange-500/50',
              icon: <Flame className="w-4 h-4 text-orange-400" />,
            },
            {
              id: 'fuel_autonomy',
              label: 'Fuel Autonomy',
              value: daysRemaining,
              unit: 'Days',
              sub: `ETA gap: ${bridgingGap >= 0 ? '+' : ''}${bridgingGap}d`,
              progress: Math.min(100, Math.max(8, (daysRemaining / resupplyEta) * 100)),
              badge: bridgingGap < 0 ? 'CRITICAL GAP' : 'OPTIMAL',
              badgeColor: bridgingGap < 0 ? 'text-rose-400 border-rose-500/40 bg-rose-500/10 font-bold' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
              color: bridgingGap >= 0 ? '#06b6d4' : '#ef4444',
              borderHover: bridgingGap >= 0 ? 'hover:border-cyan-500/50' : 'hover:border-rose-500/60',
              icon: <Clock className="w-4 h-4" style={{ color: bridgingGap >= 0 ? '#06b6d4' : '#ef4444' }} />,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`group relative rounded-xl border border-slate-700/80 bg-polar-darker/95 p-3.5 transition-all duration-200 hover:border-slate-500 ${kpi.borderHover}`}
            >
              {/* Card Header: Label + Pill Icon */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-extrabold tracking-wider text-slate-100 uppercase truncate mr-1">
                  {kpi.label}
                </span>
                <div
                  className="p-1.5 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    backgroundColor: `${kpi.color}18`,
                    borderColor: `${kpi.color}40`,
                  }}
                >
                  {kpi.icon}
                </div>
              </div>

              {/* Main Value + Unit */}
              <div className="flex items-baseline gap-1.5 mb-2.5">
                <span
                  className="text-2xl xl:text-3xl font-black font-mono tracking-tight"
                  style={{ color: kpi.color }}
                >
                  {kpi.value}
                </span>
                <span className="text-xs font-mono font-extrabold text-slate-100">
                  {kpi.unit}
                </span>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2.5 p-0.5 border border-slate-600/60">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(4, Math.min(100, kpi.progress))}%`,
                    backgroundColor: kpi.color,
                  }}
                />
              </div>

              {/* Subtitle & Status Badge */}
              <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                <span className="text-slate-200 font-semibold truncate" title={kpi.sub}>
                  {kpi.sub}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border flex-shrink-0 ${kpi.badgeColor}`}>
                  {kpi.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'tanks', label: '🛢 Fuel Depot & Tanks' },
          { id: 'power_grid', label: '⚡ Power Grid' },
          { id: 'flow', label: '🔄 Fuel-to-Power Loop' },
          { id: 'fuel_intel', label: '⛽ Fuel Intelligence' },
          { id: 'energy_intel', label: '⚡ Energy Intelligence' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${activeTab === tab.id
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
              : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: FUEL DEPOT & TANKS ── */}
      {activeTab === 'tanks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tank cylinders */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {isMaitri ? 'Maitri Bunded Tank Farm — 6 AGO Tanks' : 'Bharati Automated Control System Containerized Matrix — 8 Tanks'}
            </div>
            <div className="flex flex-wrap justify-around items-start gap-5">
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
              <div className="flex justify-between text-[11px] font-mono text-slate-200 font-semibold mb-2">
                <span>Combined Reserve: <strong className="text-amber-300">{(currentLevel / 1000).toFixed(1)}k L</strong></span>
                <span className="text-slate-300">Capacity: {(totalCapacity / 1000).toFixed(0)}k L</span>
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
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-extrabold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Selected Tank Intelligence
            </div>
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
                    { label: 'Capacity', val: `${(selectedTank.capacity_l / 1000).toFixed(0)} kL`, color: '#e2e8f0' },
                    { label: 'Temperature', val: `${selectedTank.temperature_c}°C`, color: selectedTank.temperature_c < -5 ? '#818cf8' : '#06b6d4' },
                    { label: 'Health', val: `${selectedTank.health_pct?.toFixed(1)}%`, color: '#10b981' },
                    { label: 'Trace Heating', val: `${selectedTank.trace_heating_w} W`, color: '#f97316' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-100 font-bold">{row.label}</span>
                      <span className="font-extrabold" style={{ color: row.color }}>{row.val}</span>
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

      {/* ── TAB 2: POWER GRID ── */}
      {activeTab === 'power_grid' && (
        <div className="space-y-6">

          {/* 1. Microgrid Master Synchronizer & Bus Status Banner */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-white">Station Microgrid</span>
                </div>
              </div>

              {/* Live Bus Balance Tag */}
              <div className="flex items-center gap-3 bg-polar-darker/60 p-3 rounded-xl border border-polar-border/60">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-300 uppercase font-semibold">Total Generation</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {(genLoad + solarOut).toFixed(1)} <span className="text-xs text-slate-300">kW</span>
                  </div>
                </div>
                <div className="text-slate-500 font-mono text-lg">⇄</div>
                <div className="text-left">
                  <div className="text-[10px] font-mono text-slate-300 uppercase font-semibold">Station Load</div>
                  <div className="text-base font-bold font-mono text-amber-300">
                    {totalDemand.toFixed(1)} <span className="text-xs text-slate-300">kW</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Master Electrical Instruments Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-200 mb-6 font-extrabold flex items-center justify-between">
              <span>Primary Power Instruments &amp; Stability Telemetry</span>
              <span className="text-emerald-400 font-semibold">● All Transducers Active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Instrument 1: Generator Dispatch Load */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-polar-dark/40 border border-polar-border/60">
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
                <div className="mt-3 text-center space-y-1.5 w-full pt-3 border-t border-polar-border/60">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Dispatch Status</span>
                    <span className="text-amber-300 font-extrabold">1/3 Synced</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Specific Fuel Rate</span>
                    <span className="text-amber-300 font-extrabold">{burnRate.toFixed(1)} L/h</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Governor Load</span>
                    <span className="text-emerald-400 font-extrabold">{Math.round((genLoad / (isMaitri ? 80 : 160)) * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Instrument 2: Solar PV Array Output */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-polar-dark/40 border border-polar-border/60">
                <IndustrialGauge
                  value={solarOut}
                  min={0}
                  max={50}
                  unit="kW"
                  label="Solar PV Output"
                  size={140}
                  accentColor="#fbbf24"
                />
                <div className="mt-3 text-center space-y-1.5 w-full pt-3 border-t border-polar-border/60">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Array Type</span>
                    <span className="text-yellow-300 font-extrabold">{isMaitri ? 'Rooftop Fixed' : 'Bifacial Matrix'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Solar Irradiance</span>
                    <span className="text-amber-300 font-extrabold">{snapshot?.environment?.solar_radiation ?? (isMaitri ? 395 : 460)} W/m²</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Fuel Offset</span>
                    <span className="text-emerald-400 font-extrabold">+{(solarOut * 0.26).toFixed(1)} L/h saved</span>
                  </div>
                </div>
              </div>

              {/* Instrument 3: BESS Battery Storage SOC */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-polar-dark/40 border border-polar-border/60">
                <IndustrialGauge
                  value={batteryPct}
                  min={0}
                  max={100}
                  unit="%"
                  label="Battery Storage"
                  size={140}
                  accentColor="#10b981"
                  warningThreshold={35}
                  criticalThreshold={15}
                />
                <div className="mt-3 text-center space-y-1.5 w-full pt-3 border-t border-polar-border/60">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">UPS Autonomy</span>
                    <span className="text-emerald-300 font-extrabold">~{Math.round(batteryPct * 0.5)}h runtime</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Bank Chemistry</span>
                    <span className="text-cyan-300 font-extrabold">{isMaitri ? 'VRLA Lead-Carbon' : 'LiFePO4 Rack'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Bank Temperature</span>
                    <span className="text-cyan-300 font-extrabold">18.4°C</span>
                  </div>
                </div>
              </div>

              {/* Instrument 4: Precision Synchroscope & Grid Frequency */}
              <div className="flex flex-col items-center justify-between p-4 rounded-xl bg-polar-dark/40 border border-polar-border/60">
                <div className="w-full text-center">
                  <div className="text-[11px] font-mono text-slate-100 font-bold uppercase tracking-wider mb-2">Grid Frequency &amp; Phase</div>
                  {/* Digital Synchroscope Display */}
                  <div className="relative my-3 p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col items-center">
                    <div className="text-3xl font-black font-mono text-cyan-300 tracking-tight">
                      {gridFreq.toFixed(2)} <span className="text-sm font-normal text-slate-300">Hz</span>
                    </div>
                    <div className="text-[10px] font-mono mt-1 text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-200">Dev:</span>
                      <span className={`font-bold ${Math.abs(gridFreq - 50.0) < 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {gridFreq >= 50.0 ? `+${(gridFreq - 50.0).toFixed(2)}` : (gridFreq - 50.0).toFixed(2)} Hz
                      </span>
                    </div>
                    {/* Visual stability bar */}
                    <div className="w-full mt-3 h-2 bg-slate-800 rounded-full overflow-hidden relative">
                      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-300 transform -translate-x-1/2 z-10" />
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                        style={{
                          width: '14%',
                          marginLeft: `${Math.max(0, Math.min(86, 50 + (gridFreq - 50) * 120 - 7))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between w-full text-[8px] font-mono text-slate-300 mt-1 font-semibold">
                      <span>49.80 Hz</span>
                      <span>50.00</span>
                      <span>50.20 Hz</span>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-1.5 pt-3 border-t border-polar-border/60">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Synchro Lock</span>
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> LOCKED
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Power Factor</span>
                    <span className="text-cyan-300 font-extrabold">0.94 Lagging</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100 font-bold">Phase Sequence</span>
                    <span className="text-amber-300 font-extrabold">R - Y - B (120°)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3. 24-Hour Diurnal Load vs. Solar Generation Profile */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-base font-bold text-white">24-Hour Microgrid Power Demand &amp; Generation Profile</div>
                <div className="text-xs font-mono text-slate-300 mt-0.5">
                  Diurnal station load curve vs. diesel generator baseline vs. solar PV peak shaving
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Station Demand
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Generator Dispatch
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Solar PV Output
                </span>
              </div>
            </div>

            <PowerGrid24hChart
              genLoad={genLoad}
              solarOut={solarOut}
              isMaitri={isMaitri}
            />
          </div>

          {/* 4. Generation Assets & Genset Dispatch Matrix (At the bottom, 2 below 2) */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-polar-border/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-white tracking-wide">Microgrid Generation Asset Matrix</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">Total Online Capacity:</span>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-sm">
                  {(isMaitri ? 80 + 30 : 160 + 65)} kW
                </span>
              </div>
            </div>

            {/* 2 Below 2 Layout (2x2 Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Asset 1: Lead Genset */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-white">
                          {isMaitri ? 'Genset #1 (Kirloskar 80kVA)' : 'CHP Unit #1 (Scania 160kW)'}
                        </div>
                        <div className="text-xs font-mono text-slate-400 font-medium mt-0.5">
                          Lead Prime Mover • Continuous Base Load
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      ONLINE
                    </span>
                  </div>

                  {/* 2 Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 gap-3.5 my-3.5">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Electrical Output</div>
                      <div className="text-xl font-mono font-black text-emerald-400 mt-1">{genLoad} kW</div>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Coolant Temp</div>
                      <div className="text-xl font-mono font-black text-cyan-300 mt-1">86.2°C</div>
                    </div>
                  </div>
                </div>

                {/* Capacity Level Bar */}
                <div className="mt-2 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5 font-bold">
                    <span className="text-slate-400">Governor Dispatch Load</span>
                    <span className="text-emerald-400 font-bold">{Math.round((genLoad / (isMaitri ? 80 : 160)) * 100)}% of Rated</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.round((genLoad / (isMaitri ? 80 : 160)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Asset 2: Secondary / Hot Standby Genset */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-white">
                          {isMaitri ? 'Genset #2 (Kirloskar 80kVA)' : 'CHP Unit #2 (Scania 160kW)'}
                        </div>
                        <div className="text-xs font-mono text-slate-400 font-medium mt-0.5">
                          Auto-Start Standby • Fast Sync Ready
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      HOT STANDBY
                    </span>
                  </div>

                  {/* 2 Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 gap-3.5 my-3.5">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Crank Status</div>
                      <div className="text-xl font-mono font-black text-amber-300 mt-1">Auto-Ready</div>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Block Pre-Heater</div>
                      <div className="text-xl font-mono font-black text-emerald-400 mt-1">46.0°C Active</div>
                    </div>
                  </div>
                </div>

                {/* Standby Readiness Bar */}
                <div className="mt-2 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5 font-bold">
                    <span className="text-slate-400">Standby Lube &amp; Jacket Heater</span>
                    <span className="text-amber-400 font-bold">100% Primed for Crank</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div className="h-full bg-amber-500/80 rounded-full w-full" />
                  </div>
                </div>
              </div>

              {/* Asset 3: Solar PV Farm */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-white">
                          {isMaitri ? 'Rooftop PV Array (30kW)' : 'Bifacial Solar Farm (65kW)'}
                        </div>
                        <div className="text-xs font-mono text-slate-400 font-medium mt-0.5">
                          Renewable Peak Shaving • Clean Inverter Bus
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      GENERATING
                    </span>
                  </div>

                  {/* 2 Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 gap-3.5 my-3.5">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Active Output</div>
                      <div className="text-xl font-mono font-black text-yellow-400 mt-1">{solarOut} kW</div>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Fuel Saved</div>
                      <div className="text-xl font-mono font-black text-emerald-300 mt-1">+{(solarOut * 0.26).toFixed(1)} L/h</div>
                    </div>
                  </div>
                </div>

                {/* Solar Output Progress Bar */}
                <div className="mt-2 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5 font-bold">
                    <span className="text-slate-400">Array Capacity Utilization</span>
                    <span className="text-yellow-400 font-bold">{Math.round((solarOut / (isMaitri ? 30 : 65)) * 100)}% Online</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.round((solarOut / (isMaitri ? 30 : 65)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Asset 4: BESS Battery Inverter */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <BatteryCharging className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-white">
                          {isMaitri ? '100 kWh BESS Bank' : '200 kWh LiFePO4 BESS'}
                        </div>
                        <div className="text-xs font-mono text-slate-400 font-medium mt-0.5">
                          Grid Stabilization • Seamless Frequency Response
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      STANDBY FLOAT
                    </span>
                  </div>

                  {/* 2 Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 gap-3.5 my-3.5">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">State of Charge</div>
                      <div className="text-xl font-mono font-black text-cyan-300 mt-1">{batteryPct.toFixed(1)}%</div>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Transfer Time</div>
                      <div className="text-xl font-mono font-black text-emerald-400 mt-1">&lt; 8 ms</div>
                    </div>
                  </div>
                </div>

                {/* BESS State of Charge Progress Bar */}
                <div className="mt-2 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5 font-bold">
                    <span className="text-slate-400">BESS Storage Level</span>
                    <span className="text-cyan-300 font-bold">{batteryPct.toFixed(1)}% SOC</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(5, Math.min(100, batteryPct))}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}


      {/* ── TAB 4: TRANSFER LOOP ── */}
      {activeTab === 'flow' && (
        <div className="space-y-5">
          {/* Main Fuel Transfer & Power Feed Schematic */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <FuelFlowPipeline
              flowRate={transferLoop.flow_rate_l_min}
              pumpStatus={transferLoop.pump_status}
              dayTankPct={transferLoop.day_tank_level_pct}
              sourceTank={activeSourceTankObj?.name || activeSourceTankName}
              sourceTankPct={activeSourceTankObj?.level_pct ?? 76}
              sourceTankLiters={activeSourceTankObj?.current_level_l ?? 24320}
              sourceTankCapacity={activeSourceTankObj?.capacity_l ?? 32000}
              sourceTankTemp={activeSourceTankObj?.temperature_c ?? (isMaitri ? -4.1 : 2.2)}
              destination={destinationGeneratorName}
              destinationLoadKw={genLoad}
              destinationBurnRate={burnRate}
              gridFreq={gridFreq}
              isMaitri={isMaitri}
            />
          </div>

          {/* Waterfall Consumer Chart Card */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-polar-border/50">
              <div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  Burn Rate by Consumer
                </div>

              </div>
              <div className="text-right flex items-center gap-2 sm:flex-col sm:items-end">
                <span className="text-xs font-mono text-slate-200 font-bold uppercase tracking-wider">Total Burn Rate:</span>
                <span className="text-lg font-black font-mono text-amber-400 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 shadow-sm">
                  {burnRate.toFixed(1)} L/hr
                </span>
              </div>
            </div>

            <BurnWaterfallChart drivers={drivers} isMaitri={isMaitri} />

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              {[
                { label: 'Generator', val: `${(drivers.generator_burn_l_hr || 17.5).toFixed(1)} L/hr`, sub: 'Prime Mover', color: '#f59e0b' },
                { label: 'Space Heating', val: `${(drivers.heating_burn_equiv_l_hr || 8.3).toFixed(1)} L/hr`, sub: 'Living Quarters', color: '#818cf8' },
                { label: 'Research Labs', val: `${(drivers.science_burn_equiv_l_hr || 3.1).toFixed(1)} L/hr`, sub: 'LIDAR & Sensors', color: '#06b6d4' },
                { label: 'Solar Offset', val: `−${(drivers.solar_fuel_saved_l_hr || 4.7).toFixed(1)} L/hr`, sub: 'Renewable Savings', color: '#22c55e' },
              ].map(r => (
                <div key={r.label} className="p-3.5 rounded-xl bg-polar-darker/90 border border-slate-700/80 hover:border-slate-500 transition-all shadow-md">
                  <div className="text-slate-200 font-bold uppercase text-xs mb-1 tracking-wider">{r.label}</div>
                  <div className="text-lg font-black font-mono tracking-tight" style={{ color: r.color }}>{r.val}</div>
                  <div className="text-xs text-slate-300 font-semibold mt-1">{r.sub}</div>
                </div>
              ))}
            </div>
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

        // Pipeline Operational Stages (4-Stage Architecture)
        const pipelineStages = isMaitri ? [
          {
            step: '01',
            name: 'Bulk Tank Storage Matrix',
            code: 'TK-AGO-01..06',
            type: 'Primary Fuel Reserve',
            heroValue: '192,000 L',
            heroLabel: 'Gross Storage Volume',
            tags: ['6× 32kL Tanks', 'Vacuum Insulated', 'Sump Drain'],
            temp: '-4.1°C',
            pressure: '0.8 bar',
            status: 'SUCTION ONLINE',
            statusColor: '#10b981',
            conduit: 'DN80 Insulated Steel',
            flowRate: '4.8 L/min',
            icon: '🛢️',
            badge: 'BULK SUPPLY',
          },
          {
            step: '02',
            name: 'Pumping & Filtration Skid',
            code: 'PUMP-SKID P-101/102',
            type: 'Booster & Conditioning',
            heroValue: '4.8 L/min',
            heroLabel: 'Transfer Throughput',
            tags: ['Duplex Pumps', '50µm Filters', 'Mass Flow Meter'],
            temp: '-3.5°C',
            pressure: '3.2 bar',
            status: 'TRANSFERRING',
            statusColor: '#f59e0b',
            conduit: 'DN50 Heat-Traced',
            flowRate: '4.8 L/min',
            icon: '⚙️',
            badge: 'BOOSTER RUNNING',
          },
          {
            step: '03',
            name: 'Day Tank & Preheater',
            code: 'DAY-BUFFER DT-01',
            type: 'Conditioning & Gravity Feed',
            heroValue: '+12.0°C',
            heroLabel: 'Pre-Heated Buffer',
            tags: ['2,000L Day Tank', 'Electric Preheater', 'Gravity Feed'],
            temp: '+12.0°C',
            pressure: '1.4 bar',
            status: 'PRE-HEATER ACTIVE',
            statusColor: '#10b981',
            conduit: 'DN32 Indoor Run',
            flowRate: 'Gravity Feed',
            icon: '🌡️',
            badge: 'BUFFER 95% FULL',
          },
          {
            step: '04',
            name: 'Power House Prime Movers',
            code: 'GEN-01 / GEN-02',
            type: 'Combustion & Grid Power',
            heroValue: `${burnRate.toFixed(1)} L/hr`,
            heroLabel: 'Continuous Feed Burn',
            tags: ['80kVA Kirloskar', '415V 3-Phase', 'Synchronized'],
            temp: '+18.2°C',
            pressure: '2.8 bar',
            status: 'GENERATING',
            statusColor: '#10b981',
            conduit: 'Flexible Rail Line',
            flowRate: `${burnRate.toFixed(1)} L/hr`,
            icon: '⚡',
            badge: '415V SYNCHRONIZED',
          },
        ] : [
          {
            step: '01',
            name: 'Coastal Tank Matrix',
            code: 'TK-PGO-01..08',
            type: 'Primary Fuel Reserve',
            heroValue: '200,000 L',
            heroLabel: 'Gross Storage Volume',
            tags: ['8× 25kL Stainless', 'Double-Walled', 'Leak Monitored'],
            temp: '+2.2°C',
            pressure: '0.9 bar',
            status: 'SUCTION ONLINE',
            statusColor: '#10b981',
            conduit: 'DN100 Stainless Line',
            flowRate: '6.2 L/min',
            icon: '🛢️',
            badge: 'BULK SUPPLY',
          },
          {
            step: '02',
            name: 'ACS Automated Manifold',
            code: 'V-MANIFOLD ACS-400',
            type: 'Pumping & Automation',
            heroValue: '6.2 L/min',
            heroLabel: 'Transfer Throughput',
            tags: ['Motorized 3-Way', 'Duplex Strainers', 'SCADA Monitored'],
            temp: '+3.0°C',
            pressure: '3.6 bar',
            status: 'TRANSFERRING',
            statusColor: '#f59e0b',
            conduit: 'DN65 Heat-Traced',
            flowRate: '6.2 L/min',
            icon: '⚙️',
            badge: 'PUMP ONLINE',
          },
          {
            step: '03',
            name: 'CHP Distribution Header',
            code: 'CHP-HEADER DH-02',
            type: 'Pre-heating & Distribution',
            heroValue: '+16.0°C',
            heroLabel: 'Heat Exchanger Feed',
            tags: ['Plate Heat Exch.', 'Coolant Recovery', 'Conditioned'],
            temp: '+16.0°C',
            pressure: '1.8 bar',
            status: 'HEAT EXCH ACTIVE',
            statusColor: '#10b981',
            conduit: 'DN32 Braided Line',
            flowRate: 'Regulated',
            icon: '🌡️',
            badge: 'PRE-HEATED +16°C',
          },
          {
            step: '04',
            name: 'Jenbacher CHP Units',
            code: 'CHP-101 / CHP-102',
            type: 'Combined Heat & Power',
            heroValue: `${burnRate.toFixed(1)} L/hr`,
            heroLabel: 'Continuous Feed Burn',
            tags: ['160kWe Electric', '220kWth Heating', 'JGC 112 Units'],
            temp: '+21.5°C',
            pressure: '3.1 bar',
            status: 'GENERATING',
            statusColor: '#10b981',
            conduit: 'Engine Injection Rail',
            flowRate: `${burnRate.toFixed(1)} L/hr`,
            icon: '⚡',
            badge: 'CO-GENERATING',
          },
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
                  <div className="text-xs font-mono text-slate-300 font-medium mt-0.5">Certified to {isMaitri ? 'BIS IS:1460 Arctic Grade' : 'EN 590 Polar Grade'} standard</div>
                </div>
                <span className="ml-auto text-[10px] font-mono px-3 py-1 rounded-lg border font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">{fuelSpec.grade}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Fuel Grade', val: fuelSpec.grade, color: '#f59e0b', icon: '⛽' },
                  { label: 'Combustion Quality', val: fuelSpec.cetane.toString(), color: '#06b6d4', icon: '🔢' },
                  { label: 'Flash Point', val: `${fuelSpec.flashPoint}°C`, color: '#f97316', icon: '🔥' },
                  { label: 'Freeze Limit', val: `${fuelSpec.pourPoint}°C`, color: '#818cf8', icon: '❄️' },
                  { label: 'Flow Resistance', val: fuelSpec.viscosity, color: '#10b981', icon: '💧' },
                  { label: 'Fuel Density', val: fuelSpec.density, color: '#38bdf8', icon: '⚖️' },
                  { label: 'Sulfur Content', val: fuelSpec.sulfur, color: '#22c55e', icon: '🌿' },
                ].map(s => (
                  <div
                    key={s.label}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 transition-all duration-200 shadow-md text-center flex flex-col items-center justify-between group"
                    style={{ borderTop: `2px solid ${s.color}` }}
                  >
                    <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200">{s.icon}</div>
                    <div className="text-sm font-black font-mono tracking-tight my-1" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs font-bold font-mono text-slate-200 leading-tight tracking-wide mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section C: Fuel Pipeline & Transfer Network Architecture ── */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-polar-border/60">
                <div>
                  <div className="text-base font-bold text-white">
                    Fuel Pipeline &amp; Transfer Network Architecture
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    {isMaitri ? 'Maitri Station · Insulated DN80 bulk supply → pump skid → day tank → generators' : 'Bharati Station · SCADA Valve Manifold & CHP Pre-Heater Distribution Loop'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-semibold flex items-center gap-2">
                    <span className="text-amber-400">⚡</span> Live Feed: <strong className="text-amber-300 font-mono ml-1">{burnRate.toFixed(1)} L/hr</strong>
                  </span>
                </div>
              </div>

              {/* 4 Connected Stages — Clean Process Grid (No glow, no image box, no gap) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {pipelineStages.map((stage) => (
                  <div
                    key={stage.step}
                    className="flex flex-col justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all duration-200"
                    style={{ borderTop: `3px solid ${stage.statusColor}` }}
                  >
                    {/* Stage & Status Header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${stage.statusColor}15`, color: stage.statusColor, border: `1px solid ${stage.statusColor}30` }}
                        >
                          STAGE {stage.step}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">
                          {stage.code}
                        </span>
                      </div>
                      <span
                        className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${stage.statusColor}15`,
                          color: stage.statusColor,
                          border: `1px solid ${stage.statusColor}30`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.statusColor }} />
                        {stage.badge}
                      </span>
                    </div>

                    {/* Equipment Name & Subtitle — Clean Text (No image/icon box) */}
                    <div className="mb-2.5">
                      <div className="text-sm font-bold text-white leading-snug">{stage.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {stage.type}
                      </div>
                    </div>

                    {/* Hero Metric Box */}
                    <div className="mb-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                      <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                        {stage.heroLabel}
                      </div>
                      <div className="text-xl font-bold font-mono tracking-tight mt-0.5" style={{ color: stage.statusColor }}>
                        {stage.heroValue}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {stage.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Telemetry Row */}
                    <div className="grid grid-cols-2 gap-2 mb-2.5 text-xs font-mono">
                      <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                        <div className="text-[9px] text-slate-400 uppercase font-semibold">Temperature</div>
                        <div className="text-xs font-bold text-white mt-0.5">{stage.temp}</div>
                      </div>
                      <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                        <div className="text-[9px] text-slate-400 uppercase font-semibold">Pressure / Flow</div>
                        <div className="text-xs font-bold text-amber-300 mt-0.5">{stage.pressure}</div>
                      </div>
                    </div>

                    {/* Conduit & Feed Rate Footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 truncate">
                        <span style={{ color: stage.statusColor }}>⟶</span> {stage.conduit}
                      </span>
                      <span
                        className="font-bold px-2 py-0.5 rounded flex-shrink-0"
                        style={{ color: stage.statusColor, backgroundColor: `${stage.statusColor}12`, border: `1px solid ${stage.statusColor}25` }}
                      >
                        {stage.flowRate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Process Sequence Bar (Clean, no glow) */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  {pipelineStages.map((stage, idx) => (
                    <span key={stage.step} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.statusColor }} />
                      <span className="text-slate-300 font-semibold">{stage.step}. {stage.name.split(' ').slice(0, 2).join(' ')}</span>
                      {idx < pipelineStages.length - 1 && (
                        <span className="text-slate-600 font-bold ml-1">⟶</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-emerald-400">●</span> Continuous automated transfer loop
                </div>
              </div>
            </div>

            {/* ── Section D: Daily Fuel Usage Breakdown Graph ── */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-polar-border/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      Daily Fuel Consumption
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="text-xs font-mono text-slate-200 uppercase font-bold tracking-wider">Net Daily Burn:</span>
                  <span className="text-lg font-black font-mono text-amber-300 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 shadow-sm">
                    {totalDailyNet.toLocaleString()} L/day
                  </span>
                </div>
              </div>

              <DailyFuelConsumptionChart
                dailyUsage={dailyUsage}
                totalDailyNet={totalDailyNet}
                isMaitri={isMaitri}
              />
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


        return (
          <div className="space-y-6">

            {/* ── Section A: Energy Conversion Sankey-style Summary ── */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/40 relative overflow-hidden shadow-2xl bg-gradient-to-b from-amber-500/[0.04] via-transparent to-transparent">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(251,191,36,0.08) 0%, transparent 60%)' }} />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      Fuel → Electricity Conversion Efficiency
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                        THERMODYNAMIC CYCLE
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 font-medium mt-0.5">
                      {isMaitri ? 'Open-cycle diesel generators — continuous single-stage thermodynamic conversion' : 'Combined Heat & Power (CHP) — co-generation with exhaust & jacket heat recovery'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-polar-darker/95 border border-amber-500/40 text-right flex items-center gap-2 shadow-sm">
                    <span className="text-[10px] font-mono text-slate-300 uppercase font-bold tracking-wider">Overall Efficiency:</span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      {isMaitri ? `${genEfficiency}%` : `${(genEfficiency + heatRecoveryEff * (100 - genEfficiency) / 100).toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Energy flow cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
                {/* 1. Fuel Energy Input */}
                <div className="bg-polar-darker/95 p-5 rounded-2xl border border-slate-700/80 hover:border-amber-500/50 transition-all shadow-lg flex flex-col justify-between" style={{ borderTop: '3px solid #f59e0b' }}>
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Fuel Energy Input
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        CHEMICAL (LHV)
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl lg:text-4xl font-black font-mono text-amber-300 drop-shadow">
                        {totalFuelEnergyKw.toFixed(0)}
                      </span>
                      <span className="text-sm font-mono font-bold text-amber-100">kW equivalent</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-200 mt-3 pt-2.5 border-t border-slate-700/70 flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">Burn Factor:</span>
                    <span className="font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/60 font-mono">
                      {burnRate.toFixed(1)} L/h × 9.6 kWh/L
                    </span>
                  </div>
                </div>

                {/* 2. Electricity Output */}
                <div className="bg-polar-darker/95 p-5 rounded-2xl border border-slate-700/80 hover:border-emerald-500/50 transition-all shadow-lg flex flex-col justify-between" style={{ borderTop: '3px solid #10b981' }}>
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Electricity Output
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        ACTIVE MICROGRID
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl lg:text-4xl font-black font-mono text-emerald-400 drop-shadow">
                        {electricOut}
                      </span>
                      <span className="text-sm font-mono font-bold text-emerald-100">kW</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-200 mt-3 pt-2.5 border-t border-slate-700/70 flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">Electric Yield:</span>
                    <span className="font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                      {genEfficiency}% conversion efficiency
                    </span>
                  </div>
                </div>

                {/* 3. Waste Heat or Heat Recovered */}
                {isMaitri ? (
                  <div className="bg-polar-darker/95 p-5 rounded-2xl border border-slate-700/80 hover:border-red-500/50 transition-all shadow-lg flex flex-col justify-between" style={{ borderTop: '3px solid #ef4444' }}>
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                          Waste Heat (Lost)
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300">
                          EXHAUST STACK
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl lg:text-4xl font-black font-mono text-red-400 drop-shadow">
                          {exhaustLossKw.toFixed(0)}
                        </span>
                        <span className="text-sm font-mono font-bold text-red-100">kW as exhaust</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mt-3 pt-2.5 border-t border-slate-700/70 flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">Thermal Recovery:</span>
                      <span className="font-bold text-red-300 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30 font-mono">
                        No CHP — heat unrecovered
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-polar-darker/95 p-5 rounded-2xl border border-slate-700/80 hover:border-purple-500/50 transition-all shadow-lg flex flex-col justify-between" style={{ borderTop: '3px solid #a855f7' }}>
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          Heat Recovered (CHP)
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                          CO-GENERATION
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl lg:text-4xl font-black font-mono text-purple-300 drop-shadow">
                          {heatRecoveredKw.toFixed(0)}
                        </span>
                        <span className="text-sm font-mono font-bold text-purple-100">kW thermal</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mt-3 pt-2.5 border-t border-slate-700/70 flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">Co-Gen Recovery:</span>
                      <span className="font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                        {heatRecoveryEff}% CHP heat recovery
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Conversion efficiency bar */}
              <div className="mt-6 p-4 rounded-xl bg-polar-darker/80 border border-slate-700/80 space-y-3 relative z-10">
                <div className="flex justify-between text-xs font-mono text-slate-200 font-bold">
                  <span>Total Input Energy: <span className="text-amber-300 font-mono font-bold">{totalFuelEnergyKw.toFixed(0)} kW fuel</span></span>
                  <span className="text-emerald-300 font-bold">{genEfficiency}% → Electricity</span>
                </div>
                <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 shadow-inner">
                  <div className="absolute inset-y-0 left-0 rounded-l-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${genEfficiency}%`, transition: 'width 0.8s ease' }} />
                  {!isMaitri && (
                    <div className="absolute inset-y-0 rounded-none bg-gradient-to-r from-purple-600 to-purple-400" style={{ left: `${genEfficiency}%`, width: `${heatRecoveryEff * (100 - genEfficiency) / 100}%`, transition: 'all 0.8s ease' }} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-mono text-white font-bold drop-shadow">
                      {genEfficiency}% electric{!isMaitri ? ` + ${heatRecoveryEff}% heat recovery` : ' (open-cycle — no heat recovery)'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-semibold pt-1">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                    ■ Electricity: {genEfficiency}% ({electricOut} kW)
                  </span>
                  {!isMaitri && (
                    <span className="px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold">
                      ■ Heat Recovery: {heatRecoveryEff}%
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-300 font-bold">
                    ■ Exhaust Loss: {isMaitri ? (100 - genEfficiency).toFixed(1) : (100 - genEfficiency - heatRecoveryEff * (100 - genEfficiency) / 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Section B: Power Generation Sources ── */}
            <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(251,191,36,0.05) 0%, transparent 60%)' }} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-polar-border/60 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      Power Generation Sources — What Generates Power
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ACTIVE DISPATCH
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mt-0.5 font-medium">
                      {isMaitri ? 'Kirloskar gensets + Rooftop PV + 100kWh SLA ESS' : 'Jenbacher CHP + 50kW Bifacial PV + 20kW Wind + 200kWh Li-Ion BESS'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-polar-darker/90 border border-yellow-500/30 text-right flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">Total Dispatch:</span>
                    <span className="text-base font-black font-mono text-yellow-400">{electricOut} kW</span>
                  </div>
                </div>
              </div>

              {/* Cute Compact Cards Grid */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMaitri ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-5'} gap-3 relative z-10`}>
                {genSources.map(gs => (
                  <div
                    key={gs.name}
                    className="p-3.5 rounded-xl bg-polar-darker/90 border border-slate-700/80 hover:border-slate-500 transition-all shadow-sm flex flex-col justify-between"
                    style={{ borderTopColor: gs.color, borderTopWidth: 3 }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-lg p-1 rounded-md bg-polar-dark border border-polar-border/50">{gs.icon}</span>
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex-shrink-0"
                          style={{ backgroundColor: `${gs.color}15`, borderColor: `${gs.color}40`, color: gs.color }}
                        >
                          {gs.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white truncate" title={gs.name}>{gs.name}</div>
                      <div className="text-[11px] font-mono text-slate-200 truncate mt-0.5 font-semibold" title={`${gs.type} · ${gs.fuel}`}>
                        {gs.type}
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 truncate mt-0.5" title={gs.detail}>
                        {gs.detail}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-polar-border/50">
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black font-mono" style={{ color: gs.color }}>{gs.output}</span>
                          <span className="text-xs font-mono text-slate-200 font-bold">kW</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {gs.pct}% share
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(gs.pct, gs.output > 0 ? 5 : 0)}%`, backgroundColor: gs.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section C: Power Usage — Pin-to-Pin Distribution Graph ── */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-polar-border/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      Power Usage — Pin-to-Pin Distribution
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        TELEMETRY SYNCHRONIZED
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mt-0.5">
                      Sub-bus power metering & branch circuit loads · {isMaitri ? 'Maitri Station' : 'Bharati Station'}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="text-xs font-mono text-slate-200 uppercase font-bold tracking-wider">Total Active Load:</span>
                  <span className="text-lg font-black font-mono text-cyan-300 px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/40 shadow-sm">
                    {electricOut} kW
                  </span>
                </div>
              </div>

              <PowerUsagePinToPinChart
                powerConsumers={powerConsumers}
                electricOut={electricOut}
                isMaitri={isMaitri}
              />
            </div>

          </div>
        );
      })()}
    </div>
  );
};

export default EnergyFuelPage;
