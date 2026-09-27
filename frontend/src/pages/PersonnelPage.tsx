import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi } from '../api/client';
import {
  Users, Heart, Moon, Sun, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Activity, CheckCircle2, UserCheck, Coffee, Zap, Droplet,
  Utensils, Trash2, Microscope, Wrench, Package, MapPin,
  ChevronRight, ChevronDown, Wind, Thermometer, Radio,
  TrendingUp, BarChart2, X, Info, AlertOctagon,
  FlaskConical, Shield, Truck, Play, ArrowUpRight,
  ArrowDownRight, Minus, Eye, Brain, Flame, Snowflake,
  Navigation, Wifi, Phone, HeartPulse, CloudSnow,
  Bell, Lock, CheckCircle, UserX, Timer, Siren,
  Monitor, Mic, Crosshair, Gauge, Lightbulb, Volume2
} from 'lucide-react';
import * as echarts from 'echarts';

// ── Color helpers ─────────────────────────────────────────────────────────────
const roleColor: Record<string, string> = {
  pink: 'text-pink-400 bg-pink-500/15 border-pink-500/30',
  cyan: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  emerald: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  amber: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
};
const roleBorderColor: Record<string, string> = {
  pink: 'border-pink-500/40 hover:border-pink-400/70',
  cyan: 'border-cyan-500/40 hover:border-cyan-400/70',
  emerald: 'border-emerald-500/40 hover:border-emerald-400/70',
  amber: 'border-amber-500/40 hover:border-amber-400/70',
};
const activityBadge: Record<string, string> = {
  HIGH: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  PEAK: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  NORMAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  STANDBY: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  EMERGENCY: 'bg-red-500/20 text-red-300 border-red-500/40',
};
const riskColor: Record<string, string> = {
  LOW: 'text-emerald-400', MEDIUM: 'text-amber-400',
  HIGH: 'text-orange-400', CRITICAL: 'text-red-400',
};

// ── Shared mini helpers ───────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const Pill: React.FC<{ label: string; color?: string; pulse?: boolean; small?: boolean }> = ({
  label, color = '#10b981', pulse, small
}) => (
  <span className={`inline-flex items-center gap-1 ${small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'} rounded-full font-mono font-bold border`}
    style={{ background: `${color}15`, borderColor: `${color}44`, color }}>
    <span className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`} style={{ background: color }}/>
    {label}
  </span>
);

const SectionDivider: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; color: string; layer: string }> = ({
  icon, title, subtitle, color, layer
}) => (
  <div className="flex items-start gap-4 mb-6 pb-4 border-b border-white/10">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
          {layer}
        </span>
      </div>
      <h2 className="text-base font-black text-white">{title}</h2>
      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const BarMeter: React.FC<{ label: string; value: number; max: number; unit: string; color: string; sub?: string }> = ({
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

// ── KPI Detail Modal ──────────────────────────────────────────────────────────
const KpiModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
    <div className="relative z-10 glass-panel rounded-2xl border border-polar-border w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
      </div>
      {children}
    </div>
  </div>
);

// ── Role Group Intelligence Drawer ────────────────────────────────────────────
const RoleDrawer: React.FC<{ group: any; onClose: () => void }> = ({ group, onClose }) => {
  const color = roleColor[group.color] || roleColor.cyan;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div className="relative z-10 glass-panel rounded-2xl border border-polar-border w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${color}`}>{group.role}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${activityBadge[group.activity_level] ?? activityBadge.NORMAL}`}>
              {group.activity_level}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', value: group.count, unit: 'personnel' },
            { label: 'On Station', value: group.on_station, unit: 'inside' },
            { label: 'Field', value: group.field_deployed, unit: 'deployed' },
            { label: 'Rest / Maint.', value: group.in_rest + group.on_maintenance, unit: 'off-duty' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
              <div className="text-lg font-black text-white">{item.value}</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">{item.label}</div>
              <div className="text-[10px] font-mono text-slate-500">{item.unit}</div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border mb-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Current Activity</div>
          <div className="text-xs font-mono text-slate-200">{group.current_activity_desc}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Energy Draw', value: `${group.energy_contribution_kw} kW`, icon: Zap, color: 'text-yellow-400' },
            { label: 'Water Draw', value: `${group.water_contribution_l_day} L/day`, icon: Droplet, color: 'text-cyan-400' },
            { label: 'Food Demand', value: `${(group.food_demand_kcal_day / 1000).toFixed(1)} Mcal`, icon: Utensils, color: 'text-amber-400' },
            { label: 'Waste Gen.', value: `${group.waste_contribution_kg_day} kg/day`, icon: Trash2, color: 'text-slate-400' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
              <item.icon className={`w-3.5 h-3.5 ${item.color} mb-1`}/>
              <div className="text-sm font-bold text-white">{item.value}</div>
              <div className="text-[10px] font-mono text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>
        {group.specializations?.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">Specializations</div>
            <div className="flex flex-wrap gap-1.5">
              {group.specializations.map((s: string) => (
                <span key={s} className="px-2 py-0.5 rounded bg-polar-navy/60 border border-polar-border text-[10px] font-mono text-slate-300">{s}</span>
              ))}
            </div>
          </div>
        )}
        {group.equipment_dependency?.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">Equipment Dependencies</div>
            <div className="flex flex-wrap gap-1.5">
              {group.equipment_dependency.map((eq: string) => (
                <span key={eq} className="px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">{eq}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Diurnal ECharts Bar Chart ─────────────────────────────────────────────────
const DiurnalChart: React.FC<{ schedule: any[]; currentHour: number; energyKw: number }> = ({ schedule, currentHour, energyKw }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current || !schedule?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const labels = schedule.map(b => b.label.split(' ').slice(0, 2).join(' '));
    const vals = schedule.map(b => +(energyKw * b.demand_mult).toFixed(1));
    const colors = schedule.map(b => {
      const isActive = currentHour >= b.hour_start && currentHour < b.hour_end;
      return isActive ? '#06b6d4' : 'rgba(100,116,139,0.5)';
    });
    chart.setOption({
      backgroundColor: 'transparent', animation: true,
      grid: { top: 12, bottom: 42, left: 52, right: 16 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: any) => { const i = params[0]?.dataIndex; const b = schedule[i]; return `<b style="color:#06b6d4">${b?.label}</b><br/>${b?.hour_start}:00–${b?.hour_end}:00<br/>Demand ×${b?.demand_mult}<br/>Load: ${params[0]?.value} kW`; } },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace', interval: 0, rotate: 25 }, axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } } },
      yAxis: { type: 'value', name: 'kW', nameTextStyle: { color: '#64748b', fontSize: 9 }, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } } },
      series: [{ type: 'bar', data: vals.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [3, 3, 0, 0] } })), barMaxWidth: 32 }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [schedule, currentHour, energyKw]);
  return <div ref={ref} style={{ height: 180, width: '100%' }}/>;
};

// ── UV Index Chart ────────────────────────────────────────────────────────────
const UVIndexChart: React.FC<{ current: number }> = ({ current }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const uvData = hours.map((_, i) => {
      const base = Math.max(0, -0.05 * (i - 12) * (i - 12) + current);
      return parseFloat(base.toFixed(1));
    });
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 8, bottom: 22, left: 32, right: 8 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', textStyle: { color: '#e2e8f0', fontSize: 9, fontFamily: 'monospace' }, formatter: (p: any) => `${p[0].axisValue}: UV ${p[0].value}` },
      xAxis: { type: 'category', data: hours, axisLabel: { color: '#475569', fontSize: 8, interval: 5 } },
      yAxis: { type: 'value', max: 14, axisLabel: { color: '#475569', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      series: [{ type: 'line', data: uvData, smooth: true, symbol: 'none', lineStyle: { color: '#fbbf24', width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#fbbf2466' }, { offset: 1, color: '#fbbf2400' }]) }, markLine: { data: [{ yAxis: 8 }], lineStyle: { color: '#ef4444', type: 'dashed', width: 1 }, label: { color: '#ef4444', fontSize: 8, formatter: 'Extreme' }, symbol: ['none', 'none'] } }],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [current]);
  return <div ref={ref} style={{ height: 100, width: '100%' }}/>;
};

// ── Vital Traffic Light Card ──────────────────────────────────────────────────
const VitalCard: React.FC<{
  name: string; role: string; location: string;
  heartRate: number; coreTemp: number; o2Sat: number;
  outdoorMinutes: number; lastCheckin: number; color: string;
}> = ({ name, role, location, heartRate, coreTemp, o2Sat, outdoorMinutes, lastCheckin, color }) => {
  const hypo = coreTemp < 35;
  const overdue = outdoorMinutes > 240;
  const missed = lastCheckin > 30;
  const overallStatus = hypo || overdue || missed ? 'ALERT' : 'NORMAL';
  const statusColor = overallStatus === 'NORMAL' ? '#10b981' : '#ef4444';

  return (
    <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.01] ${overallStatus === 'ALERT' ? 'border-red-500/60 bg-red-500/05' : ''}`}
      style={overallStatus !== 'ALERT' ? { borderColor: `${color}33`, background: `${color}07` } : {}}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}44` }}>
            <UserCheck className="w-4 h-4"/>
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-white">{name}</div>
            <div className="text-[9px] font-mono text-slate-500">{role} · {location}</div>
          </div>
        </div>
        <Pill label={overallStatus} color={statusColor} pulse={overallStatus === 'ALERT'}/>
      </div>

      {/* Vitals Traffic Light Grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: 'HR', val: `${heartRate}`, unit: 'bpm', ok: heartRate >= 50 && heartRate <= 110, warn: heartRate > 110 },
          { label: 'Core Temp', val: `${coreTemp.toFixed(1)}`, unit: '°C', ok: coreTemp >= 36, warn: coreTemp < 36 && coreTemp >= 35 },
          { label: 'O₂ Sat', val: `${o2Sat}`, unit: '%', ok: o2Sat >= 94, warn: o2Sat >= 90 && o2Sat < 94 },
        ].map(v => {
          const vc = v.ok ? '#10b981' : v.warn ? '#f59e0b' : '#ef4444';
          return (
            <div key={v.label} className="p-2 rounded-xl text-center border"
              style={{ borderColor: `${vc}44`, background: `${vc}10` }}>
              <div className="text-[8px] font-mono text-slate-500 uppercase">{v.label}</div>
              <div className="text-sm font-black font-mono" style={{ color: vc }}>{v.val}</div>
              <div className="text-[8px] font-mono" style={{ color: vc }}>{v.unit}</div>
            </div>
          );
        })}
      </div>

      {/* Outdoor Time & Check-in */}
      <div className="space-y-1.5">
        {location.toLowerCase().includes('outdoor') || location.toLowerCase().includes('field') || location.toLowerCase().includes('glacier') ? (
          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-mono border ${overdue ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Outdoor Time</span>
            <span className="font-bold">{outdoorMinutes}min{overdue ? ' ⚠️ RECALL' : ''}</span>
          </div>
        ) : null}
        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-mono border ${missed ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
          <span className="flex items-center gap-1"><Radio className="w-3 h-3"/> Last Check-in</span>
          <span className="font-bold">{lastCheckin}min ago{missed ? ' — MISSED' : ''}</span>
        </div>
      </div>

      {/* Alert Banners */}
      {hypo && (
        <div className="mt-2 p-2 rounded-lg bg-red-500/20 border border-red-500/50 text-[9px] font-mono text-red-300 font-bold animate-pulse">
          🚨 HYPOTHERMIA WARNING — Core Temp {coreTemp}°C — RETURN TO BASE
        </div>
      )}
    </div>
  );
};

// ── Fire Suppression Room Matrix ──────────────────────────────────────────────
const FireMatrix: React.FC<{ rooms: { name: string; smoke: boolean; heat: boolean; flame: boolean; suppressed: boolean }[] }> = ({ rooms }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {rooms.map(r => {
      const alert = r.smoke || r.heat || r.flame;
      const color = r.flame ? '#ef4444' : r.heat ? '#f97316' : r.smoke ? '#f59e0b' : '#10b981';
      return (
        <div key={r.name} className="p-3 rounded-xl border transition-all hover:scale-[1.02]"
          style={{ borderColor: `${color}44`, background: `${color}08` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-white">{r.name}</span>
            {alert && <span className="text-[8px] font-mono text-red-300 font-bold animate-pulse">ALERT</span>}
          </div>
          <div className="flex gap-1.5">
            {[
              { icon: '💨', label: 'Smoke', active: r.smoke },
              { icon: '🌡', label: 'Heat', active: r.heat },
              { icon: '🔥', label: 'Flame', active: r.flame },
            ].map(s => (
              <div key={s.label} className={`flex-1 text-center p-1 rounded-lg text-[7px] font-mono border ${s.active ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                <div>{s.icon}</div>
                <div>{s.label}</div>
              </div>
            ))}
          </div>
          {r.suppressed && (
            <div className="mt-1.5 text-[8px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3"/> SUPPRESSED
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ── Muster Accountability Panel ───────────────────────────────────────────────
const MusterPanel: React.FC<{ total: number; accounted: number; missing: string[]; color: string }> = ({
  total, accounted, missing, color
}) => {
  const pct = Math.round((accounted / total) * 100);
  const allOk = accounted === total;
  return (
    <div className={`p-5 rounded-2xl border ${allOk ? 'border-emerald-500/40 bg-emerald-500/05' : 'border-red-500/60 bg-red-500/08'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color }}>
          Muster Station Accounting
        </div>
        <Pill label={allOk ? 'ALL ACCOUNTED' : `${total - accounted} MISSING`} color={allOk ? '#10b981' : '#ef4444'} pulse={!allOk}/>
      </div>
      <div className="text-4xl font-black font-mono mb-2" style={{ color: allOk ? '#10b981' : '#ef4444' }}>
        {accounted}<span className="text-xl text-slate-400">/{total}</span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: allOk ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${allOk ? '#10b98188' : '#ef444488'}` }}/>
      </div>
      <div className="text-[10px] font-mono text-slate-400 mb-2">{pct}% personnel accounted for at muster point</div>
      {!allOk && missing.length > 0 && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40">
          <div className="text-[9px] font-mono text-red-400 font-bold mb-1">MISSING — Rescuers deployed to last known location:</div>
          {missing.map((m, i) => (
            <div key={i} className="text-[9px] font-mono text-red-300">⚑ {m}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Frostbite Calculator ──────────────────────────────────────────────────────
const FrostbiteCalc: React.FC<{ windKmh: number; tempC: number }> = ({ windKmh, tempC }) => {
  // Simplified wind-chill formula (Environment Canada)
  const wc = 13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * tempC * Math.pow(windKmh, 0.16);
  const wcRound = Math.round(wc * 10) / 10;
  // Time to frostbite (simplified): below -28°C WC ≈ 30min; -35°C ≈ 15min; -45°C ≈ 10min; -55°C ≈ 5min
  const safeMins = wc > -28 ? 60 : wc > -35 ? 30 : wc > -45 ? 15 : wc > -55 ? 10 : 5;
  const color = safeMins >= 30 ? '#f59e0b' : safeMins >= 15 ? '#f97316' : '#ef4444';
  return (
    <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-500/06 space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
        <Snowflake className="w-4 h-4"/> Time-to-Frostbite Calculator
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-[9px] font-mono text-slate-500 uppercase">Ambient Temp</div>
          <div className="text-2xl font-black font-mono text-sky-300">{tempC}°C</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-[9px] font-mono text-slate-500 uppercase">Wind Speed</div>
          <div className="text-2xl font-black font-mono text-cyan-300">{windKmh}</div>
          <div className="text-[9px] font-mono text-slate-500">km/h</div>
        </div>
      </div>
      <div className="text-center p-4 rounded-2xl border-2" style={{ borderColor: `${color}66`, background: `${color}10` }}>
        <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Wind Chill (Effective)</div>
        <div className="text-3xl font-black font-mono" style={{ color }}>{wcRound}°C</div>
      </div>
      <div className="text-center p-4 rounded-2xl border" style={{ borderColor: `${color}55`, background: `${color}12` }}>
        <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Max Safe Outdoor Exposure</div>
        <div className="text-4xl font-black font-mono" style={{ color, textShadow: `0 0 20px ${color}88` }}>{safeMins} min</div>
        <div className="text-[10px] font-mono mt-1" style={{ color }}>
          {safeMins >= 30 ? 'MODERATE RISK — Rotate crews every 30 min' : safeMins >= 15 ? 'HIGH RISK — Short excursions only' : 'EXTREME RISK — Emergency operations only'}
        </div>
      </div>
      <BarMeter label="Frostbite Risk Index" value={Math.max(0, 100 - safeMins)} max={95} unit="%" color={color} sub="Risk increases with prolonged exposure"/>
    </div>
  );
};

// ── Circadian Lighting Controller ─────────────────────────────────────────────
const CircadianController: React.FC<{ currentHour: number }> = ({ currentHour }) => {
  const isDay = currentHour >= 6 && currentHour < 18;
  const isMorning = currentHour >= 5 && currentHour < 10;
  const isEvening = currentHour >= 18 || currentHour < 5;
  const lightColor = isMorning ? '#60a5fa' : isDay ? '#fde68a' : isEvening ? '#fb923c' : '#7c3aed';
  const lightName = isMorning ? 'Morning Blue-White (Alerting)' : isDay ? 'Midday Bright White (Productive)' : isEvening ? 'Evening Warm Amber (Wind-down)' : 'Night Deep Red (Melatonin)';
  const colorTemp = isMorning ? 6500 : isDay ? 5500 : isEvening ? 3200 : 1800;

  return (
    <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/06 space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-2">
        <Lightbulb className="w-4 h-4"/> Circadian Lighting Controller
      </div>
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${lightColor}12`, border: `1px solid ${lightColor}44` }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${lightColor}25`, boxShadow: `0 0 20px ${lightColor}66` }}>
          {isEvening || !isDay ? <Moon className="w-7 h-7" style={{ color: lightColor }}/> : <Sun className="w-7 h-7" style={{ color: lightColor }}/>}
        </div>
        <div>
          <div className="text-xs font-mono font-bold" style={{ color: lightColor }}>{lightName}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">Color temperature: {colorTemp}K</div>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { phase: 'Wake (05:00–10:00)', desc: 'Blue-enriched bright white', temp: '6500K', color: '#60a5fa', active: isMorning },
          { phase: 'Productive (10:00–18:00)', desc: 'Neutral bright white', temp: '5500K', color: '#fde68a', active: isDay && !isMorning },
          { phase: 'Wind-down (18:00–22:00)', desc: 'Warm amber light', temp: '3200K', color: '#fb923c', active: currentHour >= 18 && currentHour < 22 },
          { phase: 'Sleep (22:00–05:00)', desc: 'Deep red — melatonin mode', temp: '1800K', color: '#7c3aed', active: currentHour >= 22 || currentHour < 5 },
        ].map(p => (
          <div key={p.phase} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[9px] font-mono transition-all ${p.active ? 'border-white/20' : 'border-white/5'}`}
            style={p.active ? { background: `${p.color}15`, borderColor: `${p.color}44` } : {}}>
            <div>
              <div className={`font-bold ${p.active ? '' : 'text-slate-500'}`} style={p.active ? { color: p.color } : {}}>{p.phase}</div>
              <div className="text-slate-600">{p.desc}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono" style={{ color: p.active ? p.color : '#374151' }}>{p.temp}</span>
              {p.active && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border animate-pulse" style={{ background: `${p.color}20`, borderColor: `${p.color}50`, color: p.color }}>ACTIVE</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Social Activity Heatmap ───────────────────────────────────────────────────
const SocialHeatmap: React.FC<{ isMaitri: boolean }> = ({ isMaitri }) => {
  const zones = [
    { name: 'Gym', recent: isMaitri ? 82 : 74, trend: 'up', color: '#10b981' },
    { name: 'Lounge', recent: isMaitri ? 28 : 65, trend: isMaitri ? 'down' : 'normal', color: isMaitri ? '#ef4444' : '#10b981' },
    { name: 'Dining Hall', recent: isMaitri ? 91 : 88, trend: 'normal', color: '#10b981' },
    { name: 'Library', recent: isMaitri ? 42 : 35, trend: 'down', color: '#f59e0b' },
    { name: 'Recreation', recent: isMaitri ? 18 : 52, trend: isMaitri ? 'down' : 'normal', color: isMaitri ? '#ef4444' : '#10b981' },
  ];
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold flex items-center gap-2">
        <Activity className="w-4 h-4"/> Social Interaction Heatmap (Anonymized)
      </div>
      {zones.map(z => {
        const low = z.recent < 40;
        return (
          <div key={z.name} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-300">{z.name}</span>
                {low && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-bold">LOW ACTIVITY</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {z.trend === 'down' ? <ArrowDownRight className="w-3 h-3 text-red-400"/> : z.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-emerald-400"/> : <Minus className="w-3 h-3 text-slate-500"/>}
                <span className="font-bold" style={{ color: z.color }}>{z.recent}%</span>
              </div>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                style={{ width: `${z.recent}%`, background: `${z.color}` }}>
                <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white to-transparent"
                  style={{ animation: 'shimmer 2s infinite' }}/>
              </div>
            </div>
          </div>
        );
      })}
      {zones.some(z => z.recent < 40) && (
        <div className="p-3 rounded-xl border border-violet-500/40 bg-violet-500/10 text-[9px] font-mono text-violet-300">
          ⚠️ Low Social Interaction Risk detected — Suggest team-building activity to Station Leader
        </div>
      )}
    </div>
  );
};

// ── Causal Node ───────────────────────────────────────────────────────────────
const CausalNode: React.FC<{ label: string; value?: string; color?: string; onClick?: () => void; active?: boolean }> = ({
  label, value, color = 'cyan', onClick, active
}) => (
  <button onClick={onClick}
    className={`px-3 py-2 rounded-xl border text-xs font-mono text-center transition-all ${
      active ? `bg-${color}-500/30 border-${color}-400/80 text-${color}-200 shadow-lg`
              : `bg-polar-dark/60 border-polar-border hover:border-${color}-500/50 text-slate-300`}`}>
    <div className="font-bold text-white text-[11px]">{label}</div>
    {value && <div className={`text-[10px] text-${color}-300 mt-0.5`}>{value}</div>}
  </button>
);
const Arrow: React.FC = () => <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0"/>;

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const PersonnelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const station = stations.find(s => s.station_id === stationId) ?? {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [selectedCausal, setSelectedCausal] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'overview' | 'tracking' | 'emergency' | 'hazard' | 'wellness'>('overview');

  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any | null>(null);
  const [whatIfScenario, setWhatIfScenario] = useState<string | null>(null);

  // DEFCON state
  const [defcon, setDefcon] = useState<'NORMAL' | 'ELEVATED' | 'EMERGENCY'>('NORMAL');
  const [fireAlertRoom, setFireAlertRoom] = useState<string | null>(null);

  const { liveSnapshot } = useTelemetryStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await resourcesApi.getPersonnel(stationId);
      setData(res.personnel);
      setError(null);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        localStorage.removeItem('polartwin_token');
        try {
          const retryRes = await resourcesApi.getPersonnel(stationId);
          setData(retryRes.personnel);
          setError(null);
          return;
        } catch {}
      }
      const snapPers = liveSnapshot[stationId]?.personnel;
      if (snapPers && (snapPers as any).role_groups) { setData(snapPers); setError(null); }
      else { setError(e?.message ?? 'Failed to load personnel data'); }
    } finally { setLoading(false); }
  }, [stationId, liveSnapshot]);

  useEffect(() => {
    setLoading(true); setData(null); setWhatIfResult(null); setWhatIfScenario(null); fetchData();
  }, [stationId]);
  useEffect(() => { const t = setInterval(fetchData, 15000); return () => clearInterval(t); }, [fetchData]);

  const runWhatIf = async (scenarioType: string, params: Record<string, any> = {}) => {
    setWhatIfLoading(true); setWhatIfScenario(scenarioType); setWhatIfResult(null);
    try { const res = await resourcesApi.personnelWhatIf(stationId, scenarioType, params); setWhatIfResult(res); }
    catch { setWhatIfResult(null); }
    finally { setWhatIfLoading(false); }
  };

  const currentHour = new Date().getHours();

  // ── Static safety data (simulated) ─────────────────────────────────────────
  const fieldTeam: any[] = isMaitri ? [
    { name: 'Dr. A. Kumar', role: 'Glaciologist', location: 'Glacier Stake S-12 (OUTDOORS)', heartRate: 88, coreTemp: 36.8, o2Sat: 96, outdoorMinutes: 185, lastCheckin: 22, color: '#818cf8' },
    { name: 'Eng. R. Singh', role: 'Meteorologist', location: 'AWS Site 3 (OUTDOORS)', heartRate: 102, coreTemp: 35.8, o2Sat: 95, outdoorMinutes: 310, lastCheckin: 18, color: '#f59e0b' },
    { name: 'Dr. P. Nair', role: 'Physicist', location: 'Schirmacher Oasis (OUTDOORS)', heartRate: 72, coreTemp: 36.2, o2Sat: 97, outdoorMinutes: 90, lastCheckin: 8, color: '#10b981' },
    { name: 'Lt. V. Sharma', role: 'Engineer', location: 'Station Lab (INDOORS)', heartRate: 68, coreTemp: 37.1, o2Sat: 98, outdoorMinutes: 0, lastCheckin: 5, color: '#06b6d4' },
    { name: 'Dr. S. Pillai', role: 'Physician', location: 'Medical Bay (INDOORS)', heartRate: 65, coreTemp: 37.0, o2Sat: 99, outdoorMinutes: 0, lastCheckin: 3, color: '#a855f7' },
  ] : [
    { name: 'Dr. M. Joshi', role: 'Marine Biologist', location: 'Coastal Sampling (OUTDOORS)', heartRate: 95, coreTemp: 36.5, o2Sat: 96, outdoorMinutes: 142, lastCheckin: 14, color: '#38bdf8' },
    { name: 'Eng. K. Rao', role: 'AGEOS Operator', location: 'Antenna Pad (OUTDOORS)', heartRate: 78, coreTemp: 36.9, o2Sat: 97, outdoorMinutes: 65, lastCheckin: 10, color: '#10b981' },
    { name: 'Dr. T. Menon', role: 'Oceanographer', location: 'Tide Gauge Station (OUTDOORS)', heartRate: 115, coreTemp: 34.8, o2Sat: 92, outdoorMinutes: 255, lastCheckin: 38, color: '#ef4444' },
    { name: 'Cdr. P. Iyer', role: 'Station Leader', location: 'Main Control Room (INDOORS)', heartRate: 70, coreTemp: 37.2, o2Sat: 99, outdoorMinutes: 0, lastCheckin: 2, color: '#818cf8' },
  ];

  const fireRooms = [
    { name: 'Generator Room', smoke: fireAlertRoom === 'Generator Room', heat: fireAlertRoom === 'Generator Room', flame: false, suppressed: false },
    { name: 'Fuel Store', smoke: false, heat: false, flame: false, suppressed: false },
    { name: 'Science Lab', smoke: false, heat: false, flame: false, suppressed: false },
    { name: 'Kitchen/Galley', smoke: false, heat: false, flame: false, suppressed: false },
    { name: 'Living Quarters', smoke: false, heat: false, flame: false, suppressed: false },
    { name: 'Medical Bay', smoke: false, heat: false, flame: false, suppressed: false },
    { name: 'Workshop', smoke: false, heat: false, flame: false, suppressed: false },
    { name: 'Communications', smoke: false, heat: false, flame: false, suppressed: false },
    { name: 'Boiler Room', smoke: false, heat: false, flame: false, suppressed: false },
  ];

  const totalPers = isMaitri ? 25 : 30;
  const accountedPers = isMaitri ? 23 : 28;
  const missingPersonnel = isMaitri
    ? ['Dr. A. Kumar — Last seen: Kitchen (14 min ago)', 'Eng. R. Singh — Last seen: Workshop (9 min ago)']
    : ['Dr. T. Menon — Last seen: Coastline Station (22 min ago)', 'Petty Officer R. Das — Last seen: Generator Room (11 min ago)'];

  const windKmh = isMaitri ? 62 : 38;
  const tempC = isMaitri ? -28 : -18;
  const uvIndex = isMaitri ? 9.2 : 7.4;

  const pers = data;
  const rc = pers?.resource_demand_coupling ?? {};
  const dm = pers?.deployment_map ?? {};
  const wc = pers?.workforce_condition ?? {};
  const fe = pers?.field_exposure ?? {};

  const WHAT_IF_SCENARIOS = [
    { id: 'personnel_increase', label: 'Personnel Increase +12', desc: 'Summer expedition surge', icon: TrendingUp, color: 'cyan', params: { additional_people: 12 } },
    { id: 'research_increase', label: 'Research Activity Spike', desc: 'Full science campaign active', icon: FlaskConical, color: 'pink', params: { extra_kw: 14.0 } },
    { id: 'field_deployment', label: 'Full Field Deployment (6 outside)', desc: 'Extended field team deployment', icon: MapPin, color: 'amber', params: { extra_field_personnel: 6 } },
    { id: 'severe_weather', label: 'Severe Weather — Blizzard Protocol', desc: 'All exterior activity halted', icon: Wind, color: 'orange', params: {} },
  ];

  const layers = [
    { id: 'overview' as const, label: 'Personnel Overview', icon: <Users className="w-4 h-4"/>, color: '#a855f7' },
    { id: 'tracking' as const, label: 'Bio-Telemetry & Tracking', icon: <HeartPulse className="w-4 h-4"/>, color: '#ef4444' },
    { id: 'emergency' as const, label: 'Emergency Response', icon: <Shield className="w-4 h-4"/>, color: '#f97316' },
    { id: 'hazard' as const, label: 'Environmental Hazards', icon: <CloudSnow className="w-4 h-4"/>, color: '#06b6d4' },
    { id: 'wellness' as const, label: 'Psychological Wellbeing', icon: <Brain className="w-4 h-4"/>, color: '#818cf8' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"/>
          <div className="text-xs font-mono text-slate-400">Loading personnel twin state…</div>
        </div>
      </div>
    );
  }

  // Build safe fallback pers object
  const safePers = pers ?? {
    headcount: totalPers, bed_capacity: 45, occupancy_pct: Math.round(totalPers / 45 * 100),
    station_name: station.name, expedition_day: 142,
    zone_map: [], role_groups: [], diurnal_block: { label: 'Work', demand_mult: 1.2 },
    resource_demand_coupling: {}, deployment_map: { station_interior: totalPers - 4, field_deployed: 3, in_transit: 0, in_rest: 8, emergency_standby: 1 },
    workforce_condition: { operational_coverage_pct: 92, fatigue_alert_count: 1, adequate_rest_count: 18, watch_count: 4 },
    field_exposure: { exposure_risk: 'HIGH', field_team_count: 3, max_safe_exposure_min: 15 },
    personnel_risk: { level: 'MEDIUM' }, life_support: {}, resupply_impact: {},
    diurnal_schedule: [], current_hour: currentHour,
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── DEFCON Status Bar ── */}
      <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border font-mono text-xs font-bold transition-all ${
        defcon === 'NORMAL' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
        : defcon === 'ELEVATED' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-pulse'
        : 'bg-red-500/15 border-red-500/60 text-red-300 animate-pulse'}`}>
        <Shield className="w-4 h-4"/>
        <span>DEFCON STATUS: {defcon}</span>
        <span className="text-slate-500 font-normal">·</span>
        <span className="font-normal text-slate-400">Weather: CAT {windKmh > 80 ? '3 (LOCKDOWN)' : windKmh > 50 ? '2 (Restricted)' : '1 (Work Allowed)'}</span>
        <span className="text-slate-500 font-normal">·</span>
        <span className="font-normal text-slate-400">Field Teams: {fieldTeam.filter(f => f.location.includes('OUTDOORS')).length} Active</span>
        <div className="ml-auto flex gap-2">
          {(['NORMAL', 'ELEVATED', 'EMERGENCY'] as const).map(d => (
            <button key={d} onClick={() => setDefcon(d)}
              className={`px-2 py-0.5 rounded text-[9px] border cursor-pointer transition-all ${defcon === d ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 80%, #a855f710 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, #ef444408 0%, transparent 50%)' }}/>
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Human Factors · Safety Command · Emergency Response
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {safePers.station_name} · Expedition Day {safePers.expedition_day}
              </span>
              {fieldTeam.some(f => f.coreTemp < 35) && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold bg-red-500/20 text-red-300 border-red-500/40 animate-pulse flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3"/> Hypothermia Alert
                </span>
              )}
              {fieldTeam.some(f => f.outdoorMinutes > 240) && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse flex items-center gap-1">
                  <Clock className="w-3 h-3"/> Safety Recall Triggered
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400"/> Personnel, Safety & Emergency Command
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl leading-relaxed">
              {safePers.headcount} crew · Bio-telemetry monitoring · RFID tag-board · Emergency response matrix · Environmental hazard forecasting · Psychological wellbeing
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=personnel`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4"/> Decision Intel
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Total Headcount', val: `${safePers.headcount}`, sub: `/ ${safePers.bed_capacity} capacity`, color: '#a855f7', icon: <Users className="w-4 h-4"/> },
            { label: 'Field Deployed', val: `${safePers.deployment_map?.field_deployed ?? fieldTeam.filter(f => f.location.includes('OUTDOORS')).length}`, sub: 'Outside station', color: '#f59e0b', icon: <MapPin className="w-4 h-4"/> },
            { label: 'Safety Recalls', val: fieldTeam.filter(f => f.outdoorMinutes > 240).length.toString(), sub: '>4h outdoor limit', color: fieldTeam.some(f => f.outdoorMinutes > 240) ? '#ef4444' : '#10b981', icon: <Bell className="w-4 h-4"/> },
            { label: 'Vital Alerts', val: fieldTeam.filter(f => f.coreTemp < 35 || f.o2Sat < 94).length.toString(), sub: 'Hypothermia / O₂ low', color: fieldTeam.some(f => f.coreTemp < 35) ? '#ef4444' : '#10b981', icon: <HeartPulse className="w-4 h-4"/> },
            { label: 'Max Exposure', val: `${windKmh > 80 ? 5 : windKmh > 50 ? 10 : 20}min`, sub: `WC: ${Math.round(13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * tempC * Math.pow(windKmh, 0.16))}°C`, color: '#06b6d4', icon: <Snowflake className="w-4 h-4"/> },
            { label: 'UV Index', val: uvIndex.toFixed(1), sub: uvIndex > 8 ? 'EYE PROTECTION MANDATORY' : uvIndex > 5 ? 'Wear goggles' : 'Normal', color: uvIndex > 8 ? '#ef4444' : uvIndex > 5 ? '#f59e0b' : '#10b981', icon: <Sun className="w-4 h-4"/> },
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
          LAYER: OVERVIEW (existing rich features)
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'overview' && (
        <div className="space-y-5">
          {/* KPI Modals */}
          {activeModal === 'headcount' && (
            <KpiModal title="Active Headcount — Deployment Breakdown" onClose={() => setActiveModal(null)}>
              <div className="space-y-3">
                {[
                  { label: 'Station Interior', value: safePers.deployment_map?.station_interior ?? 0, total: safePers.headcount, color: 'text-emerald-400', desc: 'Inside station buildings and modules' },
                  { label: 'Field Deployed', value: safePers.deployment_map?.field_deployed ?? 0, total: safePers.headcount, color: 'text-amber-400', desc: 'Outside: AWS sites, field camps, sampling' },
                  { label: 'In Transit', value: safePers.deployment_map?.in_transit ?? 0, total: safePers.headcount, color: 'text-blue-400', desc: 'Vehicle transit between locations' },
                  { label: 'Off-duty / Rest', value: safePers.deployment_map?.in_rest ?? 0, total: safePers.headcount, color: 'text-slate-400', desc: 'Scheduled rest and personal time' },
                  { label: 'Emergency Standby', value: safePers.deployment_map?.emergency_standby ?? 0, total: safePers.headcount, color: 'text-red-400', desc: 'Emergency response readiness' },
                ].map(row => (
                  <div key={row.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-mono text-slate-300">{row.label}</span>
                      <span className={`text-sm font-black ${row.color}`}>{row.value} <span className="text-slate-500 text-[10px]">personnel</span></span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className={`h-full rounded-full transition-all ${row.color.replace('text', 'bg')}`}
                        style={{ width: `${row.total > 0 ? (row.value / row.total) * 100 : 0}%` }}/>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">{row.desc}</div>
                  </div>
                ))}
              </div>
            </KpiModal>
          )}
          {selectedRole && <RoleDrawer group={selectedRole} onClose={() => setSelectedRole(null)}/>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Expedition Roster */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400"/> Expedition Roster — Role Groups
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(safePers.role_groups ?? []).map((rg: any) => (
                  <button key={rg.role} onClick={() => setSelectedRole(rg)}
                    className={`p-4 rounded-xl bg-polar-dark/70 border transition-all text-left ${roleBorderColor[rg.color] ?? 'border-polar-border hover:border-cyan-400/70'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${roleColor[rg.color] ?? roleColor.cyan}`}>{rg.role}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${activityBadge[rg.activity_level] ?? activityBadge.NORMAL}`}>{rg.activity_level}</span>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-2xl font-black text-white">{rg.count}</span>
                      <span className="text-xs font-mono text-slate-400 mb-0.5">personnel</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">{rg.current_activity_desc}</div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] font-mono text-center">
                      {[
                        { label: 'Station', val: rg.on_station, color: 'text-emerald-400' },
                        { label: 'Field', val: rg.field_deployed, color: 'text-amber-400' },
                        { label: 'Rest', val: rg.in_rest, color: 'text-slate-400' },
                      ].map(s => (
                        <div key={s.label} className="p-1 rounded bg-polar-dark/60 border border-polar-border">
                          <div className={`font-bold ${s.color}`}>{s.val}</div>
                          <div className="text-slate-600">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
                {(!safePers.role_groups || safePers.role_groups.length === 0) && (
                  <div className="col-span-2 p-6 rounded-xl border border-polar-border/40 text-center text-slate-500 text-xs font-mono">
                    Role group data loading from API…
                  </div>
                )}
              </div>
            </div>

            {/* Diurnal + Resource Demand */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400"/> Diurnal Energy Demand
              </h3>
              {safePers.diurnal_schedule?.length > 0
                ? <DiurnalChart schedule={safePers.diurnal_schedule} currentHour={currentHour} energyKw={rc.energy_personnel_load_kw ?? 28}/>
                : <div className="h-44 flex items-center justify-center text-slate-600 text-xs font-mono">Diurnal schedule loading…</div>}
              <div className="space-y-2.5 pt-2 border-t border-polar-border/30">
                {[
                  { label: 'Personnel Energy', val: `${rc.energy_personnel_load_kw?.toFixed(1) ?? '--'} kW`, color: '#eab308', icon: <Zap className="w-3.5 h-3.5"/> },
                  { label: 'Water Demand', val: `${rc.water_demand_l_day?.toFixed(0) ?? '--'} L/day`, color: '#06b6d4', icon: <Droplet className="w-3.5 h-3.5"/> },
                  { label: 'Food Demand', val: `${((rc.food_demand_kcal_day ?? 0) / 1000).toFixed(1)} Mcal/d`, color: '#f59e0b', icon: <Utensils className="w-3.5 h-3.5"/> },
                  { label: 'Waste Generated', val: `${rc.waste_generation_kg_day?.toFixed(1) ?? '--'} kg/d`, color: '#94a3b8', icon: <Trash2 className="w-3.5 h-3.5"/> },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-[10px] font-mono border-b border-polar-border/20 pb-1.5">
                    <span className="flex items-center gap-1.5" style={{ color: r.color }}>{r.icon}{r.label}</span>
                    <span className="font-bold text-white">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Causal Chain + What-If */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* What-If Simulator */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-400"/> Personnel Scenario Simulator
              </h3>
              <div className="space-y-2">
                {WHAT_IF_SCENARIOS.map(sc => (
                  <button key={sc.id}
                    onClick={() => runWhatIf(sc.id, sc.params)}
                    disabled={whatIfLoading}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${whatIfScenario === sc.id ? 'border-purple-500/60 bg-purple-500/10' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}>
                    <div className="flex items-center gap-2">
                      <sc.icon className="w-4 h-4 text-slate-400"/>
                      <div>
                        <div className="text-[11px] font-mono font-bold text-white">{sc.label}</div>
                        <div className="text-[9px] font-mono text-slate-500">{sc.desc}</div>
                      </div>
                      {whatIfLoading && whatIfScenario === sc.id && <RefreshCw className="w-3.5 h-3.5 animate-spin ml-auto text-purple-400"/>}
                    </div>
                  </button>
                ))}
              </div>
              {whatIfResult && (
                <div className="space-y-2 pt-2 border-t border-polar-border/40">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Simulation Output</div>
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/40 text-[10px] font-mono text-slate-200">
                    {JSON.stringify(whatIfResult, null, 2).slice(0, 400)}…
                  </div>
                  <button onClick={() => { setWhatIfResult(null); setWhatIfScenario(null); }}
                    className="w-full py-1.5 text-[10px] font-mono text-slate-500 border border-polar-border hover:border-white/20 hover:text-white rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer">
                    <X className="w-3 h-3"/> Clear
                  </button>
                </div>
              )}
            </div>

            {/* Field Exposure */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Wind className="w-4 h-4 text-sky-400"/> Field Exposure & Deployment
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Exposure Risk', val: fe.exposure_risk ?? 'HIGH', color: fe.exposure_risk === 'LOW' ? '#10b981' : fe.exposure_risk === 'MEDIUM' ? '#f59e0b' : '#ef4444' },
                  { label: 'Field Teams', val: `${fe.field_team_count ?? 3} teams`, color: '#f97316' },
                  { label: 'Max Safe Exposure', val: `${fe.max_safe_exposure_min ?? 15} min`, color: '#06b6d4' },
                  { label: 'Research Feasibility', val: fe.research_feasibility ?? 'Moderate', color: '#10b981' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center p-2.5 rounded-xl bg-polar-dark/40 border border-polar-border text-[10px] font-mono">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/08 text-[10px] font-mono text-slate-300 leading-relaxed">
                {fe.current_conditions_desc ?? `Current conditions (Wind ${windKmh} km/h, ${tempC}°C) restrict field teams to short rotations. All personnel must carry emergency radio and check-in every 30 minutes.`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 1: BIO-TELEMETRY & PERSONNEL TRACKING
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'tracking' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<HeartPulse className="w-6 h-6"/>}
              title="Personnel Tracking & Bio-Telemetry Command"
              subtitle="Real-time RFID Tag-Board · Smart-Suit Vital Monitoring · Dead Man's Switch · Safety Recall System"
              color="#ef4444"
              layer="Layer 1 · Personnel Tracking"
            />

            {/* Tag-Board Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Zone A: Lab & Science', count: fieldTeam.filter(f => f.location.includes('Lab') || f.location.includes('Science')).length + (isMaitri ? 8 : 10), color: '#818cf8', icon: <Microscope className="w-4 h-4"/> },
                { label: 'Zone B: Living Quarters', count: isMaitri ? 9 : 11, color: '#10b981', icon: <Coffee className="w-4 h-4"/> },
                { label: 'Zone C: OUTDOORS', count: fieldTeam.filter(f => f.location.includes('OUTDOORS')).length, color: '#f59e0b', icon: <MapPin className="w-4 h-4"/> },
                { label: 'Zone D: Medical / Support', count: isMaitri ? 2 : 3, color: '#ef4444', icon: <HeartPulse className="w-4 h-4"/> },
              ].map(z => (
                <div key={z.label} className="p-3 rounded-2xl border transition-all hover:scale-[1.02]"
                  style={{ borderColor: `${z.color}33`, background: `${z.color}08` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${z.color}18`, color: z.color }}>
                      {z.icon}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">{z.label}</div>
                  </div>
                  <div className="text-2xl font-black font-mono" style={{ color: z.color }}>{z.count}</div>
                  <div className="text-[9px] font-mono text-slate-500">personnel</div>
                </div>
              ))}
            </div>

            {/* Safety Alert Banner */}
            {fieldTeam.some(f => f.outdoorMinutes > 240) && (
              <div className="mb-5 p-4 rounded-2xl border-2 border-red-500/70 bg-red-500/12 flex items-center gap-3 animate-pulse">
                <Bell className="w-6 h-6 text-red-400 flex-shrink-0"/>
                <div>
                  <div className="text-sm font-black font-mono text-red-300">SAFETY RECALL ALARM — OUTDOOR LIMIT EXCEEDED</div>
                  <div className="text-[10px] font-mono text-red-400/80">
                    {fieldTeam.filter(f => f.outdoorMinutes > 240).map(f => f.name).join(', ')} have been outdoors &gt;4 hours. Radio hail initiated. Return to base immediately.
                  </div>
                </div>
              </div>
            )}

            {/* Vital Cards Grid */}
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold mb-3 flex items-center gap-2">
              <HeartPulse className="w-4 h-4"/> Smart-Suit Vital Monitoring — Active Personnel
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
              {fieldTeam.map(f => <VitalCard key={f.name} {...f}/>)}
            </div>

            {/* Dead Man's Switch Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                  <Radio className="w-4 h-4"/> Solo-Traveler Dead Man's Switch
                </div>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                  Scientists working alone in remote huts must press radio check-in every 30 minutes. Escalation protocol activates automatically.
                </p>
                {fieldTeam.filter(f => f.location.includes('OUTDOORS')).map(f => {
                  const escalation = f.lastCheckin > 40 ? 'SAR MOBILIZED' : f.lastCheckin > 20 ? 'RADIO HAIL' : f.lastCheckin > 10 ? 'WATCH' : 'OK';
                  const esc_color = f.lastCheckin > 40 ? '#ef4444' : f.lastCheckin > 20 ? '#f97316' : f.lastCheckin > 10 ? '#f59e0b' : '#10b981';
                  return (
                    <div key={f.name} className="flex items-center justify-between p-3 rounded-xl border border-polar-border bg-polar-dark/40">
                      <div>
                        <div className="text-[10px] font-mono font-bold text-white">{f.name}</div>
                        <div className="text-[9px] font-mono text-slate-500">{f.location.split('(')[0].trim()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-slate-400">{f.lastCheckin}min ago</div>
                        <Pill label={escalation} color={esc_color} pulse={f.lastCheckin > 20}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RFID Tag Board Table */}
              <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-2">
                  <Navigation className="w-4 h-4"/> RFID Tag-Board — Live Roster
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px] font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-polar-border/40">
                        {['Name', 'Role', 'Zone', 'Vitals', 'Check-in'].map(h => (
                          <th key={h} className="text-left pb-1.5 pr-2 text-slate-500 font-normal uppercase text-[8px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fieldTeam.map(f => {
                        const vOk = f.coreTemp >= 36 && f.o2Sat >= 94;
                        return (
                          <tr key={f.name} className={`border-b border-polar-border/15 ${!vOk ? 'bg-red-500/05' : ''}`}>
                            <td className="py-1.5 pr-2 text-white font-bold">{f.name.split(' ')[f.name.split(' ').length - 1]}</td>
                            <td className="py-1.5 pr-2 text-slate-400">{f.role.split(' ')[0]}</td>
                            <td className="py-1.5 pr-2"><Pill label={f.location.includes('OUTDOOR') || f.location.includes('Glacier') || f.location.includes('Coastal') || f.location.includes('Tide') || f.location.includes('Antenna') ? 'C:OUT' : 'A:IN'} color={f.location.includes('OUTDOOR') || f.location.includes('Glacier') || f.location.includes('Coastal') ? '#f59e0b' : '#10b981'}/></td>
                            <td className="py-1.5 pr-2"><Pill label={vOk ? '🟢' : '🔴'} color={vOk ? '#10b981' : '#ef4444'} pulse={!vOk}/></td>
                            <td className="py-1.5 pr-2" style={{ color: f.lastCheckin > 30 ? '#ef4444' : '#10b981' }}>{f.lastCheckin}m</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 2: EMERGENCY RESPONSE
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'emergency' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Shield className="w-6 h-6"/>}
              title="Emergency Response & Evacuation Command"
              subtitle="Fire Suppression Matrix · Telemedicine Digital Doctor Console · Muster Station Accounting · Emergency Medical Bay"
              color="#f97316"
              layer="Layer 2 · Emergency Response"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* Medical Bay Status */}
              <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                  <HeartPulse className="w-4 h-4"/> Medical Bay Status
                </div>
                {[
                  { label: 'AIIMS Tele-Link', val: 'CONNECTED — 48 Mbps', ok: true },
                  { label: 'ECG Monitor', val: 'READY', ok: true },
                  { label: 'Portable Ultrasound', val: 'STANDBY', ok: true },
                  { label: 'Digital X-Ray', val: 'READY', ok: true },
                  { label: 'Defibrillator (AED)', val: 'CHARGED — 97%', ok: true },
                  { label: 'O₂ Bank', val: 'FULL — 240 hrs', ok: true },
                  { label: 'Blood Bank (Type O)', val: '8 units available', ok: true },
                  { label: 'Medevac Window', val: isMaitri ? 'NOV–MAR only' : 'Heli-capable year', ok: false },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center text-[9px] font-mono border-b border-emerald-500/15 pb-1">
                    <span className="text-slate-400">{r.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold" style={{ color: r.ok ? '#10b981' : '#f59e0b' }}>{r.val}</span>
                      {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400"/> : <AlertTriangle className="w-3 h-3 text-amber-400"/>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Telemedicine Console */}
              <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                  <Monitor className="w-4 h-4"/> Telemedicine Digital Doctor Console
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-400 animate-pulse"/>
                  <div>
                    <div className="text-[10px] font-mono font-bold text-emerald-300">CONNECTED — AIIMS New Delhi</div>
                    <div className="text-[9px] font-mono text-slate-400">High-bandwidth video link active · Signal: Strong</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Video Link', val: '4K Active', color: '#10b981', icon: <Monitor className="w-3 h-3"/> },
                    { label: 'ECG Stream', val: 'LIVE — 12-Lead', color: '#ef4444', icon: <Activity className="w-3 h-3"/> },
                    { label: 'Ultrasound Feed', val: 'ON DEMAND', color: '#06b6d4', icon: <Radio className="w-3 h-3"/> },
                    { label: 'X-Ray Uplink', val: 'QUEUED', color: '#818cf8', icon: <Eye className="w-3 h-3"/> },
                    { label: 'Specialist Available', val: 'Dr. R. Mehta (Ortho)', color: '#10b981', icon: <Phone className="w-3 h-3"/> },
                    { label: 'Next Consult', val: 'On-call 24/7', color: '#f59e0b', icon: <Clock className="w-3 h-3"/> },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between text-[9px] font-mono border-b border-cyan-500/15 pb-1">
                      <span className="flex items-center gap-1.5 text-slate-400" style={{ color: r.color }}>{r.icon} {r.label}</span>
                      <span className="font-bold text-white">{r.val}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono text-cyan-300">
                  Data streams — ECG, Ultrasound, X-Ray — auto-relayed to remote specialist dashboard in real-time during teleconsultation.
                </div>
              </div>

              {/* Muster Accountability */}
              <div className="space-y-3">
                <MusterPanel total={totalPers} accounted={accountedPers} missing={missingPersonnel} color="#f97316"/>
                {/* Emergency Systems Status */}
                <div className="p-4 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold">Emergency Systems</div>
                  {[
                    { label: 'Fire Alarm', val: 'READY', ok: true },
                    { label: 'Suppression Pressure', val: '100% — 8.2 bar', ok: true },
                    { label: 'Escape Hatches', val: 'SEALED — Operable', ok: true },
                    { label: 'Emergency Generator', val: 'STANDBY — READY', ok: true },
                    { label: 'Evacuation Siren', val: isMaitri ? 'TEST: 3 days ago' : 'TEST: 5 days ago', ok: true },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-[9px] font-mono pb-1 border-b border-polar-border/20">
                      <span className="text-slate-400">{r.label}</span>
                      <span style={{ color: r.ok ? '#10b981' : '#ef4444' }} className="font-bold">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fire Suppression Matrix */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4"/> Fire Suppression Matrix — Room-by-Room Sensor Status
                </div>
                <button onClick={() => setFireAlertRoom(fireAlertRoom ? null : 'Generator Room')}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-mono border cursor-pointer transition-all bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25">
                  {fireAlertRoom ? '✓ Clear Alert' : '🔥 Simulate Fire (Gen Room)'}
                </button>
              </div>
              <FireMatrix rooms={fireRooms}/>
              {fireAlertRoom && (
                <div className="p-4 rounded-2xl border-2 border-red-600/70 bg-red-500/12 space-y-2 animate-pulse">
                  <div className="text-sm font-black font-mono text-red-300">🚨 FIRE CONFIRMED — {fireAlertRoom}</div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { action: '⛽ Fuel Flow CUT', done: true },
                      { action: '💨 Ventilation OFF', done: true },
                      { action: '🚪 All Doors UNLOCKED', done: true },
                    ].map(a => (
                      <div key={a.action} className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-mono text-emerald-300 text-center font-bold">{a.action}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 3: ENVIRONMENTAL HAZARD FORECASTING
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'hazard' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<CloudSnow className="w-6 h-6"/>}
              title="Environmental Hazard Forecasting & Warning System"
              subtitle="Time-to-Frostbite Calculator · Blizzard Approach Radar · UV Index & Ozone Alert · Wind Chill Monitor"
              color="#06b6d4"
              layer="Layer 3 · Environmental Hazards"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Frostbite Calculator */}
              <FrostbiteCalc windKmh={windKmh} tempC={tempC}/>

              {/* Blizzard Radar + Wind Chill */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/06 space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-2">
                    <CloudSnow className="w-4 h-4"/> Blizzard Approach Radar
                  </div>
                  {/* Simulated radar rings */}
                  <div className="relative flex items-center justify-center" style={{ height: 150 }}>
                    <svg width="150" height="150" viewBox="0 0 150 150">
                      {[60, 45, 30, 15].map((r, i) => (
                        <circle key={r} cx="75" cy="75" r={r} fill="none"
                          stroke={`rgba(99,102,241,${0.1 + i * 0.08})`} strokeWidth="1"/>
                      ))}
                      {/* Station dot */}
                      <circle cx="75" cy="75" r="5" fill="#6366f1" opacity="0.9"/>
                      {/* Storm front */}
                      <ellipse cx="38" cy="42" rx="18" ry="12" fill="rgba(239,68,68,0.3)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2"/>
                      <text x="75" y="78" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">STATION</text>
                      <text x="38" y="32" textAnchor="middle" fill="#ef4444" fontSize="7" fontFamily="monospace">STORM</text>
                    </svg>
                  </div>
                  {isMaitri ? (
                    <div className="p-3 rounded-xl border border-amber-500/50 bg-amber-500/12 text-[9px] font-mono text-amber-300 font-bold">
                      ⚠️ High-Velocity Front detected — Impact ETA: 45 min — LOCK DOWN STATION
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/08 text-[9px] font-mono text-emerald-300">
                      ✓ No active storm fronts within 200 km — Conditions stable
                    </div>
                  )}
                </div>

                {/* Wind Chill Detailed */}
                <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/06 space-y-2">
                  <div className="text-[10px] font-mono uppercase text-sky-400 font-bold">Wind Chill Parameters</div>
                  <BarMeter label="Wind Speed" value={windKmh} max={150} unit=" km/h" color="#06b6d4"/>
                  <BarMeter label="Air Temperature" value={Math.abs(tempC)} max={60} unit="°C below 0" color="#818cf8" sub="Measured at station AWS"/>
                  <BarMeter label="Relative Humidity" value={isMaitri ? 48 : 62} max={100} unit="%" color="#38bdf8"/>
                  <div className={`p-2.5 rounded-xl text-[9px] font-mono border font-bold ${windKmh > 50 ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
                    {windKmh > 80 ? '⚠️ Wind Chill Warning: Exposed skin freezes in <5 min' : windKmh > 50 ? '⚠️ Wind Chill Warning: -45°C Effective — MAX EXPOSURE: 10 MINS' : '✓ Wind chill manageable — Standard PPE sufficient'}
                  </div>
                </div>
              </div>

              {/* UV Index */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/06 space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-2">
                    <Sun className="w-4 h-4"/> UV Index & Ozone Hole Warning
                  </div>
                  <div className="text-center p-4 rounded-xl"
                    style={{ background: `${uvIndex > 8 ? '#ef4444' : uvIndex > 5 ? '#f59e0b' : '#10b981'}12`, border: `1px solid ${uvIndex > 8 ? '#ef4444' : uvIndex > 5 ? '#f59e0b' : '#10b981'}44` }}>
                    <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Current UV Index</div>
                    <div className="text-5xl font-black font-mono" style={{ color: uvIndex > 8 ? '#ef4444' : uvIndex > 5 ? '#f59e0b' : '#10b981' }}>
                      {uvIndex.toFixed(1)}
                    </div>
                    <div className="text-[10px] font-mono mt-1" style={{ color: uvIndex > 8 ? '#ef4444' : uvIndex > 5 ? '#f59e0b' : '#10b981' }}>
                      {uvIndex > 8 ? 'EXTREME' : uvIndex > 5 ? 'HIGH' : 'MODERATE'}
                    </div>
                  </div>
                  <UVIndexChart current={uvIndex}/>
                  {uvIndex > 8 && (
                    <div className="p-3 rounded-xl border border-red-500/50 bg-red-500/15 text-[9px] font-mono text-red-300 font-bold animate-pulse">
                      🕶️ EYE PROTECTION MANDATORY — UV &gt;8 (Extreme) — Goggles + SPF 50+ required outdoors
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {[
                      { range: '0–2', desc: 'Low — Minimal protection needed', color: '#10b981' },
                      { range: '3–5', desc: 'Moderate — Sunscreen recommended', color: '#84cc16' },
                      { range: '6–7', desc: 'High — Goggles required', color: '#f59e0b' },
                      { range: '8–10', desc: 'Very High — Extreme caution', color: '#f97316' },
                      { range: '11+', desc: 'Extreme — Ozone hole overhead', color: '#ef4444' },
                    ].map(r => (
                      <div key={r.range} className="flex items-center gap-2 text-[8px] font-mono">
                        <span className="w-8 font-bold" style={{ color: r.color }}>{r.range}</span>
                        <span className="text-slate-500">{r.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visibility & Whiteout */}
                <div className="p-4 rounded-2xl border border-slate-500/30 bg-slate-500/06 space-y-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Visibility & Whiteout Risk</div>
                  <BarMeter label="Current Visibility" value={isMaitri ? 2.4 : 8.1} max={10} unit=" km" color={isMaitri ? '#f59e0b' : '#10b981'} sub="Whiteout threshold: <0.5 km"/>
                  <div className={`p-2.5 rounded-xl border text-[9px] font-mono font-bold ${isMaitri ? 'border-amber-500/40 bg-amber-500/12 text-amber-300' : 'border-emerald-500/40 bg-emerald-500/08 text-emerald-300'}`}>
                    {isMaitri ? '⚠️ Reduced visibility — Restrict solo travel, use rope guides' : '✓ Good visibility — Normal operations permitted'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 4: PSYCHOLOGICAL WELLBEING
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'wellness' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Brain className="w-6 h-6"/>}
              title="Psychological Wellbeing & Circadian Health Monitor"
              subtitle="Winter-Over Syndrome tracking · Circadian Lighting Controller · Social Interaction Heatmap · Sleep Quality Index"
              color="#818cf8"
              layer="Layer 4 · Psychological Wellbeing"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Circadian Controller */}
              <CircadianController currentHour={currentHour}/>

              {/* Wellbeing Metrics */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold">Crew Wellbeing Dashboard</div>
                <div className="space-y-3">
                  {[
                    { label: 'Average Sleep Quality', val: isMaitri ? 72 : 81, max: 100, unit: '%', color: isMaitri ? '#f59e0b' : '#10b981', sub: 'Based on Actiwatch wrist sensors' },
                    { label: 'Mood Index (Avg)', val: isMaitri ? 64 : 76, max: 100, unit: '%', color: isMaitri ? '#f59e0b' : '#10b981', sub: 'Weekly anonymous survey' },
                    { label: 'Physical Activity', val: isMaitri ? 58 : 71, max: 100, unit: '%', color: isMaitri ? '#f59e0b' : '#10b981', sub: 'Steps + exercise room usage' },
                    { label: 'Social Engagement', val: isMaitri ? 41 : 68, max: 100, unit: '%', color: isMaitri ? '#ef4444' : '#10b981', sub: 'Common area motion sensors' },
                    { label: 'Circadian Alignment', val: isMaitri ? 55 : 72, max: 100, unit: '%', color: isMaitri ? '#f97316' : '#10b981', sub: 'Light-sleep cycle synchrony' },
                  ].map(m => (
                    <BarMeter key={m.label} label={m.label} value={m.val} max={m.max} unit={m.unit} color={m.color} sub={m.sub}/>
                  ))}
                </div>

                {/* Winter-Over Syndrome Risk */}
                <div className={`p-4 rounded-2xl border space-y-2 ${isMaitri ? 'border-amber-500/40 bg-amber-500/08' : 'border-emerald-500/40 bg-emerald-500/06'}`}>
                  <div className="text-[10px] font-mono uppercase font-bold" style={{ color: isMaitri ? '#f59e0b' : '#10b981' }}>
                    Winter-Over Syndrome Risk
                  </div>
                  <div className="text-3xl font-black font-mono" style={{ color: isMaitri ? '#f59e0b' : '#10b981' }}>
                    {isMaitri ? 'MODERATE' : 'LOW'}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 leading-relaxed">
                    {isMaitri
                      ? 'Inland polar darkness. Expedition Day 142 of 365. 3 crew members showing early circadian drift signs. Recommend immediate lighting protocol and group activity.'
                      : 'Coastal station. Expedition Day 98. Crew morale stable. Continue daily wellness check-ins.'}
                  </div>
                  {isMaitri && (
                    <div className="p-2 rounded-lg border border-amber-500/40 bg-amber-500/12 text-[9px] font-mono text-amber-300">
                      📋 Action: Schedule team-building activity. 3 crew showing social withdrawal patterns.
                    </div>
                  )}
                </div>
              </div>

              {/* Social Heatmap + Sleep Schedule */}
              <div className="space-y-4">
                <SocialHeatmap isMaitri={isMaitri}/>

                {/* Circadian Drift Monitor */}
                <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/06 space-y-2">
                  <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Circadian Drift Monitor</div>
                  {(isMaitri ? [
                    { name: 'Crew Group A (Science)', drift: 48, ok: false },
                    { name: 'Crew Group B (Engineering)', drift: 22, ok: true },
                    { name: 'Crew Group C (Support)', drift: 65, ok: false },
                  ] : [
                    { name: 'Crew Group A (Science)', drift: 18, ok: true },
                    { name: 'Crew Group B (Engineering)', drift: 12, ok: true },
                    { name: 'Crew Group C (Support)', drift: 24, ok: true },
                  ]).map(g => (
                    <div key={g.name} className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-slate-400">{g.name}</span>
                        <span className="font-bold" style={{ color: g.ok ? '#10b981' : '#f59e0b' }}>{g.drift}min drift</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${clamp((g.drift / 90) * 100)}%`, background: g.ok ? '#10b981' : g.drift > 60 ? '#ef4444' : '#f59e0b' }}/>
                      </div>
                    </div>
                  ))}
                  <div className="text-[9px] font-mono text-slate-600 mt-1">Sleep phase shift from intended schedule · &gt;60min drift triggers intervention</div>
                </div>

                {/* Meal / Recreation Schedule */}
                <div className="p-4 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Structured Daily Routine</div>
                  {[
                    { time: '06:30', label: 'Breakfast + Social', color: '#fde68a' },
                    { time: '08:00', label: 'Science Operations', color: '#818cf8' },
                    { time: '12:30', label: 'Lunch + Rest', color: '#fde68a' },
                    { time: '14:00', label: 'Field / Lab Work', color: '#10b981' },
                    { time: '18:00', label: 'Dinner + Recreation', color: '#f97316' },
                    { time: '20:00', label: 'Gym / Lounge', color: '#38bdf8' },
                    { time: '22:30', label: 'Lights-Out Protocol', color: '#7c3aed' },
                  ].map(s => {
                    const active = parseInt(s.time.split(':')[0]) === currentHour;
                    return (
                      <div key={s.time} className={`flex items-center gap-2.5 text-[9px] font-mono px-2 py-1 rounded-lg transition-all ${active ? 'bg-white/10 border border-white/20' : ''}`}>
                        <span className="text-slate-500 w-10 flex-shrink-0">{s.time}</span>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }}/>
                        <span style={{ color: active ? s.color : '#64748b' }}>{s.label}</span>
                        {active && <span className="ml-auto text-[8px] font-bold" style={{ color: s.color }}>NOW</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Decision Intelligence CTA ── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-l from-purple-500/10 via-rose-500/05 to-transparent pointer-events-none"/>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-t-0 border-polar-border/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                <Brain className="w-3 h-3"/> Decision Intelligence Suite
              </span>
            </div>
            <h3 className="text-lg font-black text-white">Personnel Safety & Emergency Decision Support</h3>
          </div>
          <button onClick={() => navigate(`/station/${stationId}/decision?domain=personnel`)}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer self-start md:self-auto">
            Launch Decision Intelligence <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <HeartPulse className="w-5 h-5"/>, badge: 'BIO-FORECAST', color: '#ef4444', title: 'Crew Health Trajectory Forecast', desc: '30-day predictive health model based on expedition duration, fatigue accumulation, and winter-over syndrome risk indicators.' },
            { icon: <Shield className="w-5 h-5"/>, badge: 'EMERGENCY SIM', color: '#f97316', title: 'Emergency Scenario Simulator', desc: 'Model fire, medical evacuation, or blizzard lockdown cascades and calculate personnel accountability, resource demand, and response timeline.' },
            { icon: <Brain className="w-5 h-5"/>, badge: 'AI COPILOT', color: '#818cf8', title: 'Personnel Optimization AI', desc: 'AI-generated shift rotation schedules, psychological wellbeing interventions, and field deployment safety recommendations.' },
          ].map(card => (
            <div key={card.badge}
              onClick={() => navigate(`/station/${stationId}/decision?domain=personnel`)}
              className="p-5 rounded-xl border border-polar-border bg-polar-dark/60 hover:bg-polar-dark transition-all cursor-pointer group"
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${card.color}55`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
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
              <div className="mt-4 pt-3 border-t border-polar-border/30 flex items-center justify-between text-xs font-mono group-hover:translate-x-1 transition-transform" style={{ color: card.color }}>
                <span>Open in Decision Intel</span><ArrowRight className="w-4 h-4"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
