import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { telemetryApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Truck, Ship, Anchor, AlertTriangle, ShieldCheck,
  Clock, RefreshCw, Layers,
  Compass, MapPin, Wind, CheckCircle2, Activity,
  X, Gauge, Fuel, Package, Play, Sparkles,
  AlertOctagon, ArrowUpRight, Brain, ArrowLeft,
  Thermometer, Droplet, BarChart2, TrendingDown,
  TrendingUp, ChevronRight, Database, Zap,
  UtensilsCrossed, Wrench, ChevronDown, Flame,
  Users, Waves, Navigation, Radio, Eye, LifeBuoy, Box, Check, Crosshair, Cpu, Shield,
} from 'lucide-react';

// Ã¢â€â‚¬Ã¢â€â‚¬ Shared Primitives Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const Pill: React.FC<{ label: string; color?: string; pulse?: boolean; small?: boolean }> = ({
  label, color = '#10b981', pulse, small,
}) => (
  <span className={`inline-flex items-center gap-1.5 ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} rounded-full font-mono font-bold border flex-shrink-0`}
    style={{ background: `${color}18`, borderColor: `${color}55`, color }}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} style={{ background: color }} />
    {label}
  </span>
);

const SectionDivider: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  color: string;
  action?: React.ReactNode;
}> = ({ icon, title, subtitle, color, action }) => (
  <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10 flex-wrap">
    <div className="flex items-start gap-4 min-w-0">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-black text-white">{title}</h2>
        {subtitle && <p className="text-xs font-mono text-slate-200 mt-1 leading-relaxed font-medium">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

const BarMeter: React.FC<{
  label: string; value: number; max: number; unit: string; color: string;
  sub?: string; reversed?: boolean; height?: string;
}> = ({ label, value, max, unit, color, sub, reversed, height = 'h-2' }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const displayColor = reversed
    ? (pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981')
    : (pct < 25 ? '#ef4444' : pct < 50 ? '#f59e0b' : color);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-slate-200 font-semibold">{label}</span>
        <span className="font-bold" style={{ color: displayColor }}>{value}{unit}</span>
      </div>
      <div className={`${height} bg-white/10 rounded-full overflow-hidden border border-white/10`}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${displayColor}88, ${displayColor})`, boxShadow: `0 0 6px ${displayColor}44` }} />
      </div>
      {sub && <div className="text-[10px] font-mono text-slate-300 font-medium">{sub}</div>}
    </div>
  );
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Tank Gauge Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const TankGauge: React.FC<{
  label: string; current: number; capacity: number; unit: string;
  color: string; criticalPct?: number; warningPct?: number;
  icon?: React.ReactNode; daysRemaining?: number;
}> = ({ label, current, capacity, unit, color, criticalPct = 15, warningPct = 30, daysRemaining }) => {
  const pct = Math.max(0, Math.min(100, (current / capacity) * 100));
  const displayColor = pct <= criticalPct ? '#ef4444' : pct <= warningPct ? '#f59e0b' : color;
  const fillHeight = `${pct}%`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-mono font-bold text-white text-center">{label}</div>
      <div className="relative w-14" style={{ height: 110 }}>
        {/* Tank body */}
        <div className="absolute inset-0 rounded-xl border-2 overflow-hidden"
          style={{ borderColor: `${displayColor}55`, background: 'rgba(5,10,25,0.8)' }}>
          {/* Fill */}
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl transition-all duration-1500"
            style={{
              height: fillHeight,
              background: `linear-gradient(to top, ${displayColor}, ${displayColor}88)`,
              boxShadow: `0 -4px 12px ${displayColor}44`,
            }} />
          {/* Wave effect */}
          <div className="absolute w-full" style={{ bottom: fillHeight, height: 4 }}>
            <div className="w-full h-full opacity-60"
              style={{ background: `linear-gradient(to right, transparent, ${displayColor}88, transparent)`, animation: 'wave 2s ease-in-out infinite' }} />
          </div>
          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span
              className="text-sm font-black font-mono text-white"
              style={{
                textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.9)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
              }}
            >
              {Math.round(pct)}%
            </span>
          </div>
        </div>
        {/* Level markers */}
        {[25, 50, 75].map(m => (
          <div key={m} className="absolute right-0 w-2 h-px" style={{ bottom: `${m}%`, background: 'rgba(255,255,255,0.2)' }} />
        ))}
        {/* Critical line */}
        <div className="absolute left-0 right-0 border-t border-dashed"
          style={{ bottom: `${criticalPct}%`, borderColor: '#ef444466' }} />
      </div>
      <div className="text-center space-y-0.5">
        <div className="text-xs font-mono font-bold" style={{ color: displayColor }}>
          {current.toLocaleString()} {unit}
        </div>
        <div className="text-[10px] font-mono text-slate-200 font-semibold">of {capacity.toLocaleString()} {unit}</div>
        {daysRemaining !== undefined && (
          <div className="text-[10px] font-mono font-bold" style={{ color: daysRemaining < 30 ? '#ef4444' : '#10b981' }}>
            ~{daysRemaining}d left
          </div>
        )}
      </div>
      {pct <= criticalPct && (
        <div className="text-[9px] font-mono font-bold text-red-400 animate-pulse text-center">Ã¢Å¡Â Ã¯Â¸Â CRITICAL</div>
      )}
    </div>
  );
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Interactive Waypoint & Vessel Intelligence Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export interface WaypointWeather {
  temp: string;
  wind_chill: string;
  wind_speed: string;
  wind_dir: string;
  wind_gust: string;
  sea_state: string;
  wave_height: string;
  swell_period: string;
  ice_coverage: string;
  ice_type: string;
  visibility: string;
  sst: string;
  salinity: string;
  barometer: string;
}

export interface WaypointIssue {
  title: string;
  desc: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface InteractiveWaypoint {
  id: string;
  name: string;
  code: string;
  status: 'PASSED' | 'ACTIVE' | 'UPCOMING';
  distance_km: number;
  coordinates: string;
  x: number;
  y: number;
  delay_days: number;
  risk: 'NOMINAL' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  weather: WaypointWeather;
  issues: WaypointIssue[];
  nav_protocol: string;
  eta_time: string;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Polar Voyage Ocean Ã¢â‚¬â€ React RAF Animated Ship Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const PolarVoyageOcean: React.FC<{
  vesselName: string;
  speedKnots: number;
  heading: string;
  coordinates: string;
  isMaitri: boolean;
  waypoints: InteractiveWaypoint[];
  selectedEntity: 'vessel' | number;
  onSelectEntity: (entity: 'vessel' | number) => void;
}> = ({
  vesselName,
  speedKnots,
  heading,
  coordinates,
  isMaitri,
  waypoints,
  selectedEntity,
  onSelectEntity,
}) => {
    const cleanVesselName = vesselName.replace(/\s*\(Expedition Charter\)\s*/i, '').trim();

    const pts = waypoints.map(w => ({ x: w.x, y: w.y }));

    // Catmull-Rom interpolation at globalT (0..numSegments)
    const getPathPoint = (globalT: number): { x: number; y: number; angle: number } => {
      if (pts.length < 2) return { x: pts[0]?.x ?? 0, y: pts[0]?.y ?? 0, angle: 0 };
      const n = pts.length - 1;
      const clamped = Math.max(0, Math.min(n - 0.001, globalT));
      const seg = Math.min(Math.floor(clamped), n - 1);
      const t = clamped - seg;
      const p0 = pts[Math.max(0, seg - 1)];
      const p1 = pts[seg];
      const p2 = pts[Math.min(n, seg + 1)];
      const p3 = pts[Math.min(n, seg + 2)];
      const b1x = p1.x + (p2.x - p0.x) / 6;
      const b1y = p1.y + (p2.y - p0.y) / 6;
      const b2x = p2.x - (p3.x - p1.x) / 6;
      const b2y = p2.y - (p3.y - p1.y) / 6;
      const mt = 1 - t;
      const x = mt * mt * mt * p1.x + 3 * mt * mt * t * b1x + 3 * mt * t * t * b2x + t * t * t * p2.x;
      const y = mt * mt * mt * p1.y + 3 * mt * mt * t * b1y + 3 * mt * t * t * b2y + t * t * t * p2.y;
      const dx = 3 * mt * mt * (b1x - p1.x) + 6 * mt * t * (b2x - b1x) + 3 * t * t * (p2.x - b2x);
      const dy = 3 * mt * mt * (b1y - p1.y) + 6 * mt * t * (b2y - b1y) + 3 * t * t * (p2.y - b2y);
      return { x, y, angle: Math.atan2(dy, dx) * (180 / Math.PI) };
    };

    // Build SVG display path string using Catmull-Rom â†’ cubic bezier
    const buildSvgPath = (): string => {
      if (pts.length < 2) return `M ${pts[0]?.x ?? 0} ${pts[0]?.y ?? 0}`;
      const n = pts.length - 1;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let seg = 0; seg < n; seg++) {
        const p0 = pts[Math.max(0, seg - 1)];
        const p1 = pts[seg];
        const p2 = pts[Math.min(n, seg + 1)];
        const p3 = pts[Math.min(n, seg + 2)];
        const b1x = p1.x + (p2.x - p0.x) / 6;
        const b1y = p1.y + (p2.y - p0.y) / 6;
        const b2x = p2.x - (p3.x - p1.x) / 6;
        const b2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${b1x.toFixed(1)} ${b1y.toFixed(1)}, ${b2x.toFixed(1)} ${b2y.toFixed(1)}, ${p2.x} ${p2.y}`;
      }
      return d;
    };

    const pathD = buildSvgPath();
    const totalSegs = pts.length - 1;

    // Real scenario current ship position along the route:
    // The ship stops at the active position corridor where it is currently operating (between CP-03 and CP-04)
    const shipState = useMemo(() => {
      const activeIdx = waypoints.findIndex(w => w.status === 'ACTIVE');
      let targetT = 0;
      if (activeIdx !== -1) {
        // Active waypoint represents current operating corridor (e.g. CP-03 Princess Astrid Ice Edge)
        const nextIdx = Math.min(waypoints.length - 1, activeIdx + 1);
        if (nextIdx > activeIdx) {
          targetT = activeIdx + 0.18; // Positioned cleanly just past CP-03 heading toward CP-04
        } else {
          targetT = activeIdx;
        }
      } else {
        const lastPassed = waypoints.reduce((acc, w, idx) => (w.status === 'PASSED' ? idx : acc), -1);
        targetT = lastPassed !== -1 ? Math.min(totalSegs, lastPassed + 0.5) : 0;
      }
      return getPathPoint(targetT);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waypoints, totalSegs]);

    const statusColors: Record<string, string> = {
      PASSED: '#10b981',
      ACTIVE: '#06b6d4',
      UPCOMING: '#94a3b8',
    };

    return (
      <div>
        <style>{`
        @keyframes polarWaveShift {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -120; }
        }
        @keyframes wakeExpand {
          0% { opacity: 0.65; transform: scale(0.8); }
          100% { opacity: 0; transform: scale(1.6); }
        }
        @keyframes shipBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Ocean Chart Canvas Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="relative w-full rounded-2xl border border-cyan-500/40 overflow-hidden shadow-2xl" style={{ background: '#030c1a' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 80% 90%, rgba(3,105,161,0.28) 0%, transparent 60%), radial-gradient(ellipse at 20% 10%, rgba(14,116,144,0.2) 0%, transparent 50%), linear-gradient(180deg, #061525 0%, #020b16 100%)'
          }} />

          <svg
            viewBox="0 0 1000 440"
            className="relative w-full select-none"
            style={{ height: '420px', display: 'block' }}
          >
            <defs>
              <filter id="pvRouteGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="pvShipGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="pvRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="30%" stopColor="#06b6d4" />
                <stop offset="70%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="pvShelfGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="pvBowBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
              <pattern id="pvNavGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(56,189,248,0.07)" strokeWidth="1" />
              </pattern>
              <radialGradient id="pvRadarGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Nautical grid */}
            <rect width="1000" height="440" fill="url(#pvNavGrid)" />

            {/* Latitude lines */}
            {[
              { y: 70, label: '35Ã‚Â°S Ã‚Â· Sub-Tropical Convergence' },
              { y: 160, label: '45Ã‚Â°S Ã‚Â· Roaring Forties' },
              { y: 260, label: '55Ã‚Â°S Ã‚Â· Antarctic Polar Front' },
              { y: 345, label: '65Ã‚Â°S Ã‚Â· Marginal Ice Zone' },
              { y: 410, label: isMaitri ? '70Ã‚Â°S Ã‚Â· Princess Astrid Coast' : '69Ã‚Â°S Ã‚Â· Prydz Bay' },
            ].map(lat => (
              <g key={lat.y}>
                <line x1="0" y1={lat.y} x2="1000" y2={lat.y}
                  stroke="rgba(56,189,248,0.14)" strokeWidth="1" strokeDasharray="6,8" />
                <text x="18" y={lat.y - 5} fill="#4b6a8a" fontSize="9" fontFamily="monospace" fontWeight="600">
                  {lat.label}
                </text>
              </g>
            ))}

            {/* Ocean current waves */}
            {[
              { d: 'M 0 110 Q 250 130 500 110 T 1000 115', c: '#0284c7', o: 0.18 },
              { d: 'M 0 205 Q 260 225 530 205 T 1000 212', c: '#06b6d4', o: 0.22 },
              { d: 'M 0 308 Q 280 325 560 305 T 1000 312', c: '#38bdf8', o: 0.2 },
            ].map((w, i) => (
              <path key={i} d={w.d} fill="none" stroke={w.c} strokeWidth="1.8"
                strokeOpacity={w.o} strokeDasharray="18,26"
                style={{ animation: `polarWaveShift ${20 + i * 5}s linear infinite` }} />
            ))}

            {/* Antarctic ice shelf */}
            <path d="M 420 440 Q 580 370 780 382 T 1000 345 L 1000 440 Z"
              fill="url(#pvShelfGrad)" stroke="rgba(165,243,252,0.35)" strokeWidth="1.5" strokeDasharray="5,5" />
            <text x="850" y="430" fill="#a5f3fc" fontSize="9" fontFamily="monospace" fontWeight="bold"
              opacity="0.8" textAnchor="middle">Ã¢Ââ€ž ANTARCTIC ICE MARGIN</text>

            {/* Origin / Destination port badges */}
            <g transform={`translate(${pts[0]?.x ?? 140}, ${(pts[0]?.y ?? 75) - 28})`}>
              <rect x="-68" y="-10" width="136" height="18" rx="4"
                fill="rgba(3,12,28,0.95)" stroke="#10b981" strokeWidth="1.2" />
              <text x="0" y="3" textAnchor="middle" fill="#6ee7b7" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                Ã¢Å¡â€œ CAPE TOWN Ã¢â‚¬â€ DEPARTURE
              </text>
            </g>
            <g transform={`translate(${pts[pts.length - 1]?.x ?? 910}, ${(pts[pts.length - 1]?.y ?? 410) - 28})`}>
              <rect x="-78" y="-10" width="156" height="18" rx="4"
                fill="rgba(3,12,28,0.95)" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="0" y="3" textAnchor="middle" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                Ã°Å¸ÂÂ {isMaitri ? 'MAITRI Ã¢â‚¬â€ ANTARCTICA' : 'BHARATI Ã¢â‚¬â€ ANTARCTICA'}
              </text>
            </g>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ ROUTE TRACK Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
            {/* Glow halo */}
            <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="16"
              strokeOpacity="0.22" strokeLinecap="round" filter="url(#pvRouteGlow)" />
            {/* Solid gradient route */}
            <path d={pathD} fill="none" stroke="url(#pvRouteGrad)"
              strokeWidth="4.5" strokeLinecap="round" strokeOpacity="0.95" />
            {/* Animated travelling dashes */}
            <path d={pathD} fill="none" stroke="#ffffff" strokeWidth="1.8"
              strokeDasharray="12 16" strokeLinecap="round"
              style={{ animation: 'polarWaveShift 10s linear infinite', opacity: 0.9 }} />

            {/* Wide clickable corridor */}
            <path d={pathD} fill="none" stroke="transparent" strokeWidth="40"
              className="cursor-pointer" onClick={() => onSelectEntity(2)}
              style={{ pointerEvents: 'stroke' }} />

            {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ WAYPOINT MARKERS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
            {waypoints.map((wp, idx) => {
              const sc = statusColors[wp.status] ?? '#94a3b8';
              const isSelected = selectedEntity === idx;
              const isActive = wp.status === 'ACTIVE';
              const isPassed = wp.status === 'PASSED';
              return (
                <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}
                  onClick={e => { e.stopPropagation(); onSelectEntity(idx); }}
                  className="cursor-pointer" style={{ pointerEvents: 'all' }}>
                  {(isActive || isSelected) && (
                    <circle r={isSelected ? 26 : 20} fill="none"
                      stroke={isSelected ? '#38bdf8' : '#06b6d4'}
                      strokeWidth="1.8" strokeOpacity="0.55"
                      style={{ animation: 'wakeExpand 2s ease-out infinite' }} />
                  )}
                  <circle r="14" fill="#030c1a"
                    stroke={isSelected ? '#38bdf8' : sc}
                    strokeWidth={isSelected ? 2.8 : 2.2}
                    style={{ filter: `drop-shadow(0 0 12px ${sc})` }} />
                  <circle r="5.5"
                    fill={isPassed ? '#10b981' : isActive ? '#06b6d4' : '#475569'}
                    className={isActive ? 'animate-pulse' : ''} />
                  <g transform="translate(0,-26)">
                    <rect x="-22" y="-10" width="44" height="18" rx="4"
                      fill="rgba(3,12,28,0.97)"
                      stroke={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.25)'}
                      strokeWidth={isSelected ? 2 : 1} />
                    <text x="0" y="3" textAnchor="middle"
                      fill={isSelected ? '#38bdf8' : '#f0f9ff'}
                      fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {wp.code}
                    </text>
                  </g>
                  <g transform="translate(0,25)">
                    <rect x="-60" y="-6" width="120" height="18" rx="4"
                      fill="rgba(3,12,28,0.92)"
                      stroke={isSelected ? 'rgba(56,189,248,0.6)' : 'rgba(255,255,255,0.14)'}
                      strokeWidth="1" />
                    <text x="0" y="6" textAnchor="middle"
                      fill={isSelected ? '#7dd3fc' : '#cbd5e1'}
                      fontSize="8.5" fontFamily="monospace" fontWeight="600">
                      {wp.name.length > 20 ? wp.name.substring(0, 18) + 'Ã¢â‚¬Â¦' : wp.name}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ ANIMATED TOP-VIEW ICEBREAKER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
            <g
              transform={`translate(${shipState.x.toFixed(1)}, ${shipState.y.toFixed(1)}) rotate(${shipState.angle.toFixed(1)})`}
              onClick={e => { e.stopPropagation(); onSelectEntity('vessel'); }}
              className="cursor-pointer" style={{ pointerEvents: 'all' }}>

              <circle r="50" fill="transparent" />

              {/* Radar sweep */}
              <circle r="46" fill="url(#pvRadarGlow)" />
              <g style={{ transformOrigin: '0 0', animation: 'radarSweep 4s linear infinite' }}>
                <path d="M 0 0 L 42 -22 A 46 46 0 0 1 46 0 Z" fill="#06b6d4" fillOpacity="0.2" />
                <line x1="0" y1="0" x2="46" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
              </g>
              <circle r="46" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1" strokeDasharray="4,4" />

              {/* Bow searchlight */}
              <polygon points="30,-5 115,-28 115,28 30,5" fill="url(#pvBowBeam)" opacity="0.5" />

              {/* Wake trails */}
              <path d="M -28 -7 L -80 -22" fill="none" stroke="#38bdf8" strokeWidth="2"
                strokeOpacity="0.55" strokeDasharray="5,5"
                style={{ animation: 'wakeExpand 2.5s ease-out infinite' }} />
              <path d="M -28  7 L -80  22" fill="none" stroke="#38bdf8" strokeWidth="2"
                strokeOpacity="0.55" strokeDasharray="5,5"
                style={{ animation: 'wakeExpand 2.5s ease-out infinite 0.4s' }} />
              <ellipse cx="-42" cy="0" rx="14" ry="7" fill="none"
                stroke="#0ea5e9" strokeWidth="1.2" strokeOpacity="0.35" />

              {/* Selected reticle */}
              {selectedEntity === 'vessel' && (
                <g>
                  <circle r="40" fill="none" stroke="#22d3ee" strokeWidth="2"
                    strokeDasharray="5,5" className="animate-spin"
                    style={{ animationDuration: '6s' }} />
                  <circle r="50" fill="none" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" />
                  <line x1="-58" y1="0" x2="-42" y2="0" stroke="#22d3ee" strokeWidth="1.5" />
                  <line x1="42" y1="0" x2="58" y2="0" stroke="#22d3ee" strokeWidth="1.5" />
                  <line x1="0" y1="-58" x2="0" y2="-42" stroke="#22d3ee" strokeWidth="1.5" />
                  <line x1="0" y1="42" x2="0" y2="58" stroke="#22d3ee" strokeWidth="1.5" />
                </g>
              )}

              {/* TOP-DOWN SHIP */}
              <g style={{ animation: 'shipBob 3s ease-in-out infinite' }} filter="url(#pvShipGlow)">
                <ellipse cx="0" cy="1.5" rx="30" ry="13" fill="rgba(0,0,0,0.55)" />
                <path d="M 30 0 C 26 7, 14 12, -18 12 C -25 12, -28 8, -28 0 C -28 -8, -25 -12, -18 -12 C 14 -12, 26 -7, 30 0 Z"
                  fill="#dc2626" stroke="#fca5a5" strokeWidth="1.2" />
                <path d="M 26 0 C 22 6, 11 10, -15 10 C -22 10, -25 6, -25 0 C -25 -6, -22 -10, -15 -10 C 11 -10, 22 -6, 26 0 Z"
                  fill="#0f172a" />
                <rect x="1" y="-8" width="7" height="7" rx="0.8" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.7" />
                <rect x="1" y="1" width="7" height="7" rx="0.8" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.7" />
                <rect x="9" y="-8" width="7" height="7" rx="0.8" fill="#f59e0b" stroke="#fcd34d" strokeWidth="0.7" />
                <rect x="9" y="1" width="7" height="7" rx="0.8" fill="#10b981" stroke="#6ee7b7" strokeWidth="0.7" />
                <circle cx="18" cy="0" r="2.5" fill="#94a3b8" />
                <line x1="18" y1="0" x2="25" y2="0" stroke="#f1f5f9" strokeWidth="1.2" />
                <rect x="-14" y="-8" width="10" height="16" rx="1.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
                <line x1="-9" y1="-11" x2="-9" y2="11" stroke="#f1f5f9" strokeWidth="1.2" />
                <line x1="-4.5" y1="-7" x2="-4.5" y2="7" stroke="#06b6d4" strokeWidth="2" />
                <rect x="-17" y="-4.5" width="3" height="9" rx="0.8" fill="#b91c1c" stroke="#ef4444" strokeWidth="0.5" />
                <circle cx="-22" cy="0" r="4.5" fill="#1e293b" stroke="#facc15" strokeWidth="0.8" />
                <text x="-22" y="2" textAnchor="middle" fill="#f8fafc" fontSize="4.5" fontWeight="bold" fontFamily="monospace">H</text>
                <circle cx="-6" cy="-12" r="1.8" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }} />
                <circle cx="-6" cy="12" r="1.8" fill="#22c55e" style={{ filter: 'drop-shadow(0 0 4px #22c55e)' }} />
                <circle cx="28" cy="0" r="1.8" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 5px #fff)' }} />
              </g>

              {/* HUD badge */}
              <g transform="translate(0, 32)">
                <rect x="-75" y="-9" width="150" height="18" rx="5"
                  fill="rgba(3,12,28,0.97)" stroke="#06b6d4" strokeWidth="1.2"
                  style={{ filter: 'drop-shadow(0 2px 10px rgba(6,182,212,0.35))' }} />
                <text x="0" y="3" textAnchor="middle" fill="#22d3ee"
                  fontSize="8" fontFamily="monospace" fontWeight="bold">
                  Ã¢â€ºÂ´ {cleanVesselName.toUpperCase()} Ã‚Â· TAP SHIP
                </text>
              </g>
            </g>
          </svg>

          {/* Status bar */}
          <div className="px-4 py-2.5 border-t border-cyan-500/20 bg-[#030c1a]/95 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cleared
              </span>
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Active
              </span>
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" /> Upcoming
              </span>
              <span className="text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-red-500" /> Vessel (Top View)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-500">Speed:</span>
              <span className="text-cyan-300 font-bold">{speedKnots} kn</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">Hdg:</span>
              <span className="text-indigo-300 font-bold">{heading}</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300 font-bold">{coordinates}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
// Ã¢â€â‚¬Ã¢â€â‚¬ Vessel Inspection Console (Cargo Counts, Crew Manning & Situation) Ã¢â€â‚¬Ã¢â€â‚¬
const VesselInspectionPanel: React.FC<{
  vesselName: string;
  speedKnots: number;
  heading: string;
  coordinates: string;
  effectiveEta: number;
  voyageDay: number;
  totalVoyageDays: number;
  isMaitri: boolean;
  onInspectCurrentLocation?: () => void;
}> = ({
  vesselName,
  speedKnots,
  heading,
  coordinates,
  effectiveEta,
  voyageDay,
  totalVoyageDays,
  onInspectCurrentLocation,
}) => {
    const cleanVesselName = vesselName.replace(/\s*\(Expedition Charter\)\s*/i, '').trim();

    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        {/* Vessel Header Card */}
        <div className="p-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-polar-dark/80 to-slate-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-mono">{cleanVesselName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center font-mono text-xs flex-wrap">
            {onInspectCurrentLocation && (
              <button
                onClick={onInspectCurrentLocation}
                className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Wind className="w-4 h-4" /> View Current Location Weather & Directives
              </button>
            )}
            <div className="p-2.5 rounded-xl bg-polar-dark/90 border border-polar-border text-center">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Transit Progress</div>
              <div className="text-sm font-black text-cyan-300 mt-0.5">D+{voyageDay} <span className="text-[10px] text-slate-400">/ {totalVoyageDays}d</span></div>
            </div>
            <div className="p-2.5 rounded-xl bg-polar-dark/90 border border-polar-border text-center">
              <div className="text-[10px] uppercase text-slate-400 font-bold">ETA (Est. Time of Arrival)</div>
              <div className="text-sm font-black text-amber-300 mt-0.5">{Math.round(effectiveEta)} Days</div>
            </div>
          </div>
        </div>

        {/* 3 Pillars Grid: Cargo, Crew, Situation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ PILLAR 1: CARGO CAPACITY & SUMMARY (Aggregates Only - NO Itemized Details) Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="p-5 rounded-2xl border border-cyan-500/30 bg-polar-dark/70 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-polar-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                    Cargo Capacity & Tonnage
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  76.8% Hold Load
                </span>
              </div>

              {/* Top Tonnage & Capacity Utilization Meter */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
                <div className="flex justify-between items-baseline font-mono">
                  <span className="text-xs font-semibold text-slate-200">Total Freight Loaded</span>
                  <span className="text-base font-black text-cyan-300">1,420 MT <span className="text-xs font-normal text-slate-400">/ 1,850 MT</span></span>
                </div>
                {/* Visual capacity progress bar */}
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/80 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-md shadow-cyan-500/40 transition-all duration-1000"
                    style={{ width: '76.8%' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>Reserve Margin: 430 MT</span>
                  <span className="text-emerald-400 font-bold">Optimal Ballast Trim</span>
                </div>
              </div>

              {/* Cargo Units Breakdown by Container Category */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-3 rounded-xl bg-polar-dark border border-polar-border">
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Containers</div>
                  <div className="text-xl font-black text-white mt-1">118</div>
                  <div className="text-[10px] text-cyan-300 font-medium">ISO 20ft</div>
                </div>
                <div className="p-3 rounded-xl bg-polar-dark border border-polar-border">
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Machinery</div>
                  <div className="text-xl font-black text-white mt-1">24</div>
                  <div className="text-[10px] text-amber-300 font-medium">Skids</div>
                </div>
                <div className="p-3 rounded-xl bg-polar-dark border border-polar-border">
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Bulk Tanks</div>
                  <div className="text-xl font-black text-white mt-1">4</div>
                  <div className="text-[10px] text-purple-300 font-medium">Cryo/Fuel</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ PILLAR 2: CREW COMPLEMENT & MANNING Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="p-5 rounded-2xl border border-indigo-500/30 bg-polar-dark/70 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-polar-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                    Crew Manning & Distribution
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                  38 Total Onboard
                </span>
              </div>

              {/* Manning Distribution Segmented Visual Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-200">
                  <span>Departmental Distribution</span>
                  <span className="text-indigo-300 font-bold">100% Fit for Duty</span>
                </div>
                <div className="h-4 rounded-full bg-slate-800 overflow-hidden flex border border-slate-700 p-0.5">
                  <div className="h-full bg-cyan-500 rounded-l-full" style={{ width: '36.8%' }} title="Maritime Officers: 14" />
                  <div className="h-full bg-emerald-500" style={{ width: '42.1%' }} title="Scientists & Specialists: 16" />
                  <div className="h-full bg-amber-500 rounded-r-full" style={{ width: '21.1%' }} title="Engineers & Logistics: 8" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-cyan-400">Ã¢â€“Â  Maritime (36.8%)</span>
                  <span className="text-emerald-400">Ã¢â€“Â  Science (42.1%)</span>
                  <span className="text-amber-400">Ã¢â€“Â  Logistics (21.1%)</span>
                </div>
              </div>

              {/* Department Breakdown Cards */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                  <div className="text-[10px] uppercase text-cyan-300 font-bold">Maritime</div>
                  <div className="text-xl font-black text-white mt-1">14</div>
                  <div className="text-[10px] text-slate-300 font-medium">Officers</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="text-[10px] uppercase text-emerald-300 font-bold">Science</div>
                  <div className="text-xl font-black text-white mt-1">16</div>
                  <div className="text-[10px] text-slate-300 font-medium">Specialists</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="text-[10px] uppercase text-amber-300 font-bold">Tech</div>
                  <div className="text-xl font-black text-white mt-1">8</div>
                  <div className="text-[10px] text-slate-300 font-medium">Engineers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ PILLAR 3: SHIP SITUATION & REAL-TIME NAVIGATION Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="p-5 rounded-2xl border border-sky-500/30 bg-polar-dark/70 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-polar-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-400" />
                  <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                    Operational Situation
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  Underway at Sea
                </span>
              </div>

              {/* Navigation Matrix */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30">
                  <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-sky-400" /> Cruising Speed
                  </div>
                  <div className="text-2xl font-black text-cyan-300 mt-1">{speedKnots} kn</div>
                  <div className="text-[10px] text-slate-400">Eco-transit throttle</div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
                  <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-indigo-400" /> Heading
                  </div>
                  <div className="text-2xl font-black text-indigo-300 mt-1">{heading}</div>
                  <div className="text-[10px] text-slate-400">Polar bearing true</div>
                </div>
              </div>

              {/* Distance & Sea Resistance Specs */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                  <span className="text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" /> Coordinates
                  </span>
                  <span className="font-bold text-cyan-300">{coordinates}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Waves className="w-4 h-4 text-blue-400" /> Sea Resistance
                  </span>
                  <span className="font-bold text-amber-300">Moderate Drag (Brash Ice)</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> Satellite Link
                  </span>
                  <span className="font-bold text-emerald-400">Iridium Certus (98%)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-polar-dark border border-polar-border text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span>Escort Directive:</span>
                <span className="text-emerald-400 font-bold">Autonomous Transit</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

// Ã¢â€â‚¬Ã¢â€â‚¬ Waypoint Inspection Console (Weather Conditions & Hazards/Issues) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const WaypointInspectionPanel: React.FC<{
  waypoint: InteractiveWaypoint;
  totalWaypoints: number;
  currentIndex: number;
  onBackToShip: () => void;
}> = ({ waypoint, totalWaypoints, currentIndex, onBackToShip }) => {
  const sc = waypoint.status === 'PASSED' ? '#10b981' : waypoint.status === 'ACTIVE' ? '#06b6d4' : '#94a3b8';
  const rc =
    waypoint.risk === 'NOMINAL'
      ? '#10b981'
      : waypoint.risk === 'MODERATE'
        ? '#f59e0b'
        : waypoint.risk === 'ELEVATED'
          ? '#f97316'
          : '#ef4444';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Waypoint Header Card */}
      <div className="p-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-polar-dark/80 to-slate-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-sm shrink-0 border shadow-lg"
            style={{ background: `${sc}18`, borderColor: `${sc}55`, color: sc }}
          >
            {waypoint.code}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white font-mono">{waypoint.name}</h3>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                style={{ background: `${sc}20`, borderColor: `${sc}55`, color: sc }}
              >
                {waypoint.status}
              </span>
              {waypoint.status === 'ACTIVE' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center gap-1">
                  <Ship className="w-3 h-3 text-cyan-400" /> CURRENT SHIP LOCATION
                </span>
              )}
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                style={{ background: `${rc}20`, borderColor: `${rc}55`, color: rc }}
              >
                RISK: {waypoint.risk}
              </span>
              {waypoint.delay_days > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  +{waypoint.delay_days}d WEATHER DELAY
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-300 mt-1 font-medium">
              Waypoint {currentIndex + 1} of {totalWaypoints} Ã‚Â· {waypoint.coordinates} Ã‚Â· {waypoint.distance_km.toLocaleString()} km from origin port
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={onBackToShip}
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Ship className="w-4 h-4" /> Inspect Vessel Status
          </button>
        </div>
      </div>

      {/* Weather Grid + Issues / Hazards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ SECTION 1: ENVIRONMENTAL WEATHER CONDITIONS Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="p-5 rounded-2xl border border-sky-500/30 bg-polar-dark/70 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-cyan-400" />
              <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Localized Polar Weather & Sea State
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-300">
              {waypoint.eta_time}
            </span>
          </div>

          {/* Key Weather Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            {/* Air Temp */}
            <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-cyan-400" /> Air Temp
              </div>
              <div className="text-lg font-black text-cyan-300">{waypoint.weather.temp}</div>
              <div className="text-[10px] text-slate-300">Chill: {waypoint.weather.wind_chill}</div>
            </div>

            {/* Wind Vector */}
            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-indigo-400" /> Wind Speed
              </div>
              <div className="text-lg font-black text-indigo-300">{waypoint.weather.wind_speed}</div>
              <div className="text-[10px] text-slate-300">{waypoint.weather.wind_dir} Ã‚Â· Gusts {waypoint.weather.wind_gust}</div>
            </div>

            {/* Sea State */}
            <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-blue-400" /> Sea State
              </div>
              <div className="text-lg font-black text-blue-300">{waypoint.weather.wave_height}</div>
              <div className="text-[10px] text-slate-300">{waypoint.weather.sea_state}</div>
            </div>

            {/* Sea Ice Coverage */}
            <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/30 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-teal-400" /> Sea Ice Cover
              </div>
              <div className="text-lg font-black text-teal-300">{waypoint.weather.ice_coverage}</div>
              <div className="text-[10px] text-slate-300">{waypoint.weather.ice_type}</div>
            </div>

            {/* Visibility */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-300" /> Visibility
              </div>
              <div className="text-lg font-black text-slate-100">{waypoint.weather.visibility}</div>
              <div className="text-[10px] text-slate-400">Atmospheric condition</div>
            </div>

            {/* Barometer & SST */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-purple-400" /> Barometer / SST
              </div>
              <div className="text-lg font-black text-purple-300">{waypoint.weather.barometer}</div>
              <div className="text-[10px] text-slate-300">SST: {waypoint.weather.sst}</div>
            </div>
          </div>
        </div>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ SECTION 2: OPERATIONAL ISSUES, HAZARDS & PROTOCOLS Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-polar-dark/70 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border/60 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Operational Issues, Hazards & Navigation Directives
              </h4>
            </div>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
              style={{ background: `${rc}18`, color: rc, border: `1px solid ${rc}44` }}
            >
              {waypoint.issues.length} Active Notice{waypoint.issues.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Issues List */}
          <div className="space-y-3 font-mono">
            {waypoint.issues.map((issue, idx) => {
              const borderCol =
                issue.severity === 'critical'
                  ? 'border-red-500/40 bg-red-950/20'
                  : issue.severity === 'warning'
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-cyan-500/40 bg-cyan-950/20';
              const textCol =
                issue.severity === 'critical'
                  ? 'text-red-400'
                  : issue.severity === 'warning'
                    ? 'text-amber-400'
                    : 'text-cyan-400';
              const badgeLabel =
                issue.severity === 'critical' ? 'CRITICAL ISSUE' : issue.severity === 'warning' ? 'CAUTION HAZARD' : 'OPERATIONAL INFO';

              return (
                <div key={idx} className={`p-3.5 rounded-xl border ${borderCol} space-y-1.5`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${textCol} flex items-center gap-1.5`}>
                      <AlertOctagon className="w-4 h-4 shrink-0" />
                      {issue.title}
                    </span>
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${borderCol} ${textCol}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {issue.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Navigation Protocol */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-1.5 font-mono text-xs">
            <div className="text-[10px] uppercase text-emerald-400 font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> Mandatory Polar Navigation Protocol
            </div>
            <p className="text-slate-200 leading-relaxed font-medium">
              {waypoint.nav_protocol}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};


// Ã¢â€â‚¬Ã¢â€â‚¬ Stock Consumption Timeline Chart Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const ConsumptionChart: React.FC<{
  label: string; currentStock: number; dailyRate: number; color: string; etaDays: number;
}> = ({ label, currentStock, dailyRate, color, etaDays }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); inst.current = null; };
  }, []);

  useEffect(() => {
    const chart = inst.current;
    if (!chart) return;
    const days = Array.from({ length: 100 }, (_, i) => `D+${i}`);
    const stockLine = days.map((_, i) => Math.max(0, currentStock - dailyRate * i));
    const etaMarker = etaDays;
    chart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 500,
      animationDurationUpdate: 300,
      grid: { top: 12, bottom: 22, left: 40, right: 12 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', textStyle: { color: '#f8fafc', fontSize: 10, fontFamily: 'monospace' } },
      xAxis: { type: 'category', data: days, axisLabel: { color: '#cbd5e1', fontSize: 9, interval: 19 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { color: '#cbd5e1', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      series: [
        {
          type: 'line', data: stockLine, smooth: true, showSymbol: false,
          lineStyle: { width: 2.5, color },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}40` }, { offset: 1, color: 'transparent' }]) },
          markLine: {
            data: [
              { xAxis: etaMarker, name: 'Vessel ETA' },
              { yAxis: currentStock * 0.15, name: 'Critical Level' },
            ],
            lineStyle: { type: 'dashed', width: 1.5 },
            label: { color: '#38bdf8', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
            symbol: ['none', 'none'],
          },
        },
      ],
    }, { notMerge: true, lazyUpdate: true });
  }, [currentStock, dailyRate, color, etaDays]);

  return <div ref={ref} style={{ height: 90, width: '100%' }} />;
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Asset Card Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const AssetCard: React.FC<{ asset: any; selected: boolean; onClick: () => void }> = ({ asset, selected, onClick }) => {
  const statusColor = asset.status === 'READY' ? '#10b981' : asset.status === 'STANDBY' ? '#f59e0b' : '#ef4444';
  const weatherColor: Record<string, string> = { EXCELLENT: '#10b981', GOOD: '#06b6d4', MODERATE: '#f59e0b', POOR: '#ef4444' };
  const wc = weatherColor[asset.weather_suitability] || '#94a3b8';
  return (
    <div onClick={onClick}
      className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xl ${selected ? 'border-cyan-500/60 bg-cyan-500/06' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-sm font-mono font-bold text-white">{asset.name}</div>
          <div className="text-xs font-mono text-slate-200 mt-0.5 font-medium">{asset.type} Ã‚Â· {asset.count}</div>
        </div>
        <Pill label={asset.status} color={statusColor} small />
      </div>
      <BarMeter label="Readiness" value={asset.readiness_pct} max={100} unit="%" color={statusColor} height="h-2" />
      <div className="flex items-center justify-between mt-2.5 text-[11px] font-mono font-medium">
        <span className="text-slate-300">Capacity: <span className="text-cyan-300 font-bold">{asset.capacity}</span></span>
        <span style={{ color: wc }} className="font-bold">Weather: {asset.weather_suitability}</span>
      </div>
    </div>
  );
};

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Ã¢â€â‚¬Ã¢â€â‚¬ Main Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Station Stock & Inbound Cargo Interactive Visual Comparison Charts â”€â”€
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Graph 1: Comparative Grouped Bar Chart (Station vs Loading vs Capacity) â”€â”€
const StockVsCargoComparativeBarChart: React.FC<{
  stocks: any[];
  etaDays: number;
}> = ({ stocks, etaDays }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const hasLoaded = useRef(false);

  // Initialize ONCE on mount
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, 'dark');
    chartInstance.current = chart;

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Update options smoothly on data changes without disposing/re-init
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || !stocks || stocks.length === 0) return;

    const categories = stocks.map(s => s.label);
    const stationPcts = stocks.map(s => s.pct);
    const inboundPcts = stocks.map(s => s.incomingPct);
    const postResupplyPcts = stocks.map(s => s.postResupplyPct);

    // Stop continuous dotted line animations: animate only on initial mount, then stay static
    const shouldAnimate = !hasLoaded.current;

    chart.setOption({
      backgroundColor: 'transparent',
      animation: shouldAnimate,
      animationDuration: 600,
      animationDurationUpdate: 0,
      color: ['#f59e0b', '#06b6d4', '#10b981'],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(10, 18, 38, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex ?? 0;
          const s = stocks[idx];
          if (!s) return '';
          return `
            <div style="font-weight:bold;color:#f8fafc;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:4px">
              ${s.label} (${s.unit})
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin:3px 0">
              <span style="color:#f59e0b;display:flex;align-items:center;gap:4px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#f59e0b"></span>
                Station Stock:
              </span>
              <b>${s.current.toLocaleString()} ${s.unit} (${s.pct}%)</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin:3px 0">
              <span style="color:#06b6d4;display:flex;align-items:center;gap:4px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#06b6d4"></span>
                Inbound Cargo:
              </span>
              <b>+${s.incomingUnits.toLocaleString()} ${s.unit} (+${s.incomingPct}%)</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin:3px 0">
              <span style="color:#10b981;display:flex;align-items:center;gap:4px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#10b981"></span>
                Post-Resupply Total:
              </span>
              <b>${Math.min(s.capacity, s.current + s.incomingUnits).toLocaleString()} ${s.unit} (${s.postResupplyPct}%)</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin:3px 0;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px">
              <span style="color:#cbd5e1">Days of Use Remaining:</span>
              <b style="color:${s.daysRemaining < etaDays ? '#ef4444' : '#10b981'}">${s.daysRemaining}d (${s.daysRemaining < etaDays ? `Deficit of ${etaDays - s.daysRemaining}d before ship arrives` : `+${s.daysRemaining - etaDays}d safe buffer`})</b>
            </div>
          `;
        }
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: { color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' },
        data: ['Station Stock', 'Inbound Cargo', 'Post-Resupply Total']
      },
      grid: { top: 40, bottom: 35, left: 45, right: 30 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: '#f1f5f9', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
      },
      yAxis: {
        type: 'value',
        max: 120,
        axisLabel: { color: '#94a3b8', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }
      },
      series: [
        {
          name: 'Station Stock',
          type: 'bar',
          barWidth: 16,
          barGap: '20%',
          color: '#f59e0b',
          data: stationPcts.map((val: number, i: number) => ({
            value: val,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#f59e0b' },
                { offset: 1, color: '#b45309' }
              ]),
              borderRadius: [4, 4, 0, 0],
              borderColor: stocks[i]?.pct <= stocks[i]?.criticalPct ? '#ef4444' : 'transparent',
              borderWidth: stocks[i]?.pct <= stocks[i]?.criticalPct ? 1.5 : 0
            }
          })),
          markLine: {
            symbol: 'none',
            animation: false,
            silent: true,
            data: [
              { yAxis: 100, lineStyle: { color: 'rgba(255,255,255,0.4)', type: 'dashed', width: 1.5 }, label: { formatter: 'Max Capacity (100%)', color: '#cbd5e1', position: 'end', fontSize: 9 } },
              { yAxis: 20, lineStyle: { color: 'rgba(239,68,68,0.7)', type: 'dotted', width: 1.5 }, label: { formatter: 'Critical Reserve (20%)', color: '#ef4444', position: 'start', fontSize: 9 } }
            ]
          }
        },
        {
          name: 'Inbound Cargo',
          type: 'bar',
          barWidth: 16,
          color: '#06b6d4',
          data: inboundPcts.map((val: number) => ({
            value: val,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#22d3ee' },
                { offset: 1, color: '#0891b2' }
              ]),
              borderRadius: [4, 4, 0, 0]
            }
          }))
        },
        {
          name: 'Post-Resupply Total',
          type: 'bar',
          barWidth: 16,
          color: '#10b981',
          data: postResupplyPcts.map((val: number) => ({
            value: val,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#34d399' },
                { offset: 1, color: '#059669' }
              ]),
              borderRadius: [4, 4, 0, 0]
            }
          }))
        }
      ]
    }, { notMerge: true, lazyUpdate: true });
    hasLoaded.current = true;
  }, [stocks, etaDays]);

  return <div ref={chartRef} style={{ height: 320, width: '100%' }} />;
};

// â”€â”€ Graph 2: Depletion Trajectory & Resupply Jump Area Chart â”€â”€
const DepletionRunwayTimelineChart: React.FC<{
  stocks: any[];
  etaDays: number;
}> = ({ stocks, etaDays }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const hasLoaded = useRef(false);

  // Initialize ONCE on mount
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, 'dark');
    chartInstance.current = chart;

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Update options smoothly on data changes without disposing/re-init
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || !stocks || stocks.length === 0) return;

    const days = Array.from({ length: 90 }, (_, i) => `D+${i}`);
    const shouldAnimate = !hasLoaded.current;

    const series = stocks.map(s => {
      const data = days.map((_, day) => {
        let level = s.current - s.dailyRate * day;
        if (day >= etaDays && s.incomingUnits > 0) {
          level += s.incomingUnits;
        }
        level = Math.max(0, Math.min(s.capacity, level));
        return Math.round((level / s.capacity) * 100);
      });

      return {
        name: s.label,
        type: 'line',
        smooth: true,
        showSymbol: false,
        color: s.color,
        itemStyle: { color: s.color },
        lineStyle: { width: 2.5, color: s.color },
        data,
      };
    });

    chart.setOption({
      backgroundColor: 'transparent',
      animation: shouldAnimate,
      animationDuration: 600,
      animationDurationUpdate: 0,
      color: stocks.map(s => s.color),
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 18, 38, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          const dayStr = params[0]?.axisValue;
          let html = `<div style="font-weight:bold;color:#f8fafc;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px">${dayStr} Depletion Trajectory</div>`;
          params.forEach((p: any) => {
            if (p.seriesName) {
              const sItem = stocks.find(s => s.label === p.seriesName);
              const itemCol = sItem ? sItem.color : p.color;
              html += `<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0">
                <span style="color:${itemCol};display:flex;align-items:center;gap:4px">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${itemCol}"></span>
                  ${p.seriesName}:
                </span>
                <b style="color:#ffffff">${p.value}%</b>
              </div>`;
            }
          });
          return html;
        }
      },
      legend: {
        top: 0,
        textStyle: { color: '#cbd5e1', fontSize: 10, fontFamily: 'monospace' },
        icon: 'circle'
      },
      grid: { top: 40, bottom: 25, left: 45, right: 30 },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: { color: '#94a3b8', fontSize: 10, interval: 9 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: '#94a3b8', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }
      },
      series: [
        ...series,
        {
          type: 'line',
          markLine: {
            symbol: ['none', 'none'],
            animation: false,
            silent: true,
            data: [
              {
                xAxis: `D+${etaDays}`,
                lineStyle: { color: '#06b6d4', width: 2, type: 'dashed' },
                label: { formatter: `ðŸš¢ Vessel Discharge (D+${etaDays})`, color: '#38bdf8', position: 'start', fontSize: 10, fontWeight: 'bold' }
              },
              {
                yAxis: 20,
                lineStyle: { color: '#ef4444', width: 1.5, type: 'dotted' },
                label: { formatter: 'Critical Limit (20%)', color: '#ef4444', position: 'end', fontSize: 9 }
              }
            ]
          },
          markArea: {
            itemStyle: { color: 'rgba(239, 68, 68, 0.05)' },
            data: [[{ yAxis: 0 }, { yAxis: 20 }]]
          }
        }
      ]
    }, { notMerge: true, lazyUpdate: true });
    hasLoaded.current = true;
  }, [stocks, etaDays]);

  return <div ref={chartRef} style={{ height: 320, width: '100%' }} />;
};

// â”€â”€ Graph 3: Proportional Allocation & Load Donut Comparison â”€â”€
const CargoDistributionPieChart: React.FC<{
  stocks: any[];
  cargoManifest: any[];
}> = ({ stocks, cargoManifest }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const hasLoaded = useRef(false);

  // Initialize ONCE on mount
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, 'dark');
    chartInstance.current = chart;

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Update options smoothly on data changes without disposing/re-init
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || !stocks || stocks.length === 0) return;

    const shouldAnimate = !hasLoaded.current;

    const stationData = stocks.map(s => ({
      name: s.label,
      value: s.current,
      itemStyle: { color: s.color }
    }));

    const cargoColors = ['#0284c7', '#059669', '#7c3aed', '#db2777', '#d97706'];
    const cargoData = cargoManifest.map((c: any, i: number) => ({
      name: c.name.split('(')[0].trim(),
      value: c.weight_mt || 10,
      itemStyle: { color: cargoColors[i % cargoColors.length] }
    }));

    chart.setOption({
      backgroundColor: 'transparent',
      animation: shouldAnimate,
      animationDuration: 600,
      animationDurationUpdate: 0,
      title: [
        { text: 'Station Inventory Distribution', left: '23%', top: 6, textStyle: { color: '#f59e0b', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' } },
        { text: 'Inbound Vessel Cargo Load (MT)', left: '70%', top: 6, textStyle: { color: '#06b6d4', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' } }
      ],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10, 18, 38, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 11, fontFamily: 'monospace' },
        formatter: (p: any) => {
          const col = p.color || (p.data && p.data.itemStyle && p.data.itemStyle.color) || '#38bdf8';
          const isCargo = p.seriesName?.includes('Cargo');
          return `
            <div style="font-weight:bold;color:${col};margin-bottom:4px;display:flex;align-items:center;gap:6px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:3px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col}"></span>
              ${p.seriesName}
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;margin-top:4px">
              <span style="color:#cbd5e1">${p.name}:</span>
              <b style="color:#ffffff">${typeof p.value === 'number' ? p.value.toLocaleString() : p.value} ${isCargo ? 'MT' : ''}</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;margin-top:2px">
              <span style="color:#94a3b8">Proportion:</span>
              <b style="color:${col}">${p.percent}%</b>
            </div>
          `;
        }
      },
      series: [
        {
          name: 'Station Stocks',
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['28%', '56%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#050c1a', borderWidth: 2 },
          label: {
            show: true,
            position: 'inside',
            formatter: '{d}%',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#ffffff'
          },
          data: stationData
        },
        {
          name: 'Inbound Cargo Load',
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['75%', '56%'],
          avoidLabelOverlap: false,
          roseType: 'radius',
          itemStyle: { borderRadius: 6, borderColor: '#050c1a', borderWidth: 2 },
          label: {
            show: true,
            position: 'inside',
            formatter: '{c}MT',
            fontSize: 9,
            fontWeight: 'bold',
            color: '#ffffff'
          },
          data: cargoData
        }
      ]
    }, { notMerge: true, lazyUpdate: true });
    hasLoaded.current = true;
  }, [stocks, cargoManifest]);

  return <div ref={chartRef} style={{ height: 280, width: '100%' }} />;
};

// â”€â”€ Graph 4: Interactive Runway Speedometer & Days-of-Supply Meter â”€â”€
const InteractiveRunwayGauge: React.FC<{
  stocks: any[];
  etaDays: number;
}> = ({ stocks, etaDays }) => {
  const [selectedStockId, setSelectedStockId] = useState(stocks[0]?.id || 'diesel');
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const selected = stocks.find(s => s.id === selectedStockId) || stocks[0];
  const maxDays = 150;

  // Initialize ONCE on mount
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, 'dark');
    chartInstance.current = chart;

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Update options smoothly on data changes without disposing/re-init
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || !selected) return;

    const criticalRatio = Math.min(1, etaDays / maxDays);
    const warningRatio = Math.min(1, (etaDays + 25) / maxDays);

    chart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 500,
      animationDurationUpdate: 0,
      tooltip: {
        show: true,
        backgroundColor: 'rgba(10, 18, 38, 0.95)',
        borderColor: selected.color || '#38bdf8',
        borderWidth: 1.5,
        textStyle: { color: '#f8fafc', fontSize: 11, fontFamily: 'monospace' },
        formatter: () => {
          const isDeficit = selected.daysRemaining < etaDays;
          const statusColor = isDeficit ? '#ef4444' : selected.daysRemaining <= etaDays + 25 ? '#f59e0b' : '#10b981';
          return `
            <div style="font-weight:bold;color:${selected.color};margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:4px;display:flex;align-items:center;gap:6px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${selected.color}"></span>
              ${selected.label} Runway Speedometer
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0">
              <span style="color:#cbd5e1">Current Supply:</span>
              <b style="color:#ffffff">${selected.current.toLocaleString()} ${selected.unit}</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0">
              <span style="color:#cbd5e1">Daily Consumption:</span>
              <b style="color:#ffffff">${selected.dailyRate.toLocaleString()} ${selected.unit}/day</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0">
              <span style="color:#cbd5e1">Runway Days:</span>
              <b style="color:${statusColor}">${selected.daysRemaining} Days</b>
            </div>
            <div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0">
              <span style="color:#cbd5e1">Vessel Arrival ETA:</span>
              <b style="color:#06b6d4">D+${etaDays} (${Math.abs(selected.daysRemaining - etaDays)}d ${isDeficit ? 'Deficit' : 'Buffer'})</b>
            </div>
          `;
        }
      },
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          center: ['50%', '75%'],
          radius: '110%',
          min: 0,
          max: maxDays,
          splitNumber: 6,
          axisLine: {
            lineStyle: {
              width: 16,
              color: [
                [criticalRatio, '#ef4444'],
                [warningRatio, '#f59e0b'],
                [1, '#10b981']
              ]
            }
          },
          pointer: {
            icon: 'triangle',
            length: '65%',
            width: 8,
            offsetCenter: [0, '5%'],
            itemStyle: { color: selected.color || '#38bdf8' }
          },
          axisTick: { length: 6, lineStyle: { color: 'rgba(255,255,255,0.4)', width: 1 } },
          splitLine: { length: 12, lineStyle: { color: '#ffffff', width: 2 } },
          axisLabel: { color: '#94a3b8', fontSize: 10, distance: -38, formatter: '{value}d' },
          title: {
            offsetCenter: [0, '-20%'],
            fontSize: 12,
            color: '#e2e8f0',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          },
          detail: {
            fontSize: 24,
            offsetCenter: [0, '-45%'],
            valueAnimation: true,
            formatter: '{value} Days',
            color: selected.daysRemaining < etaDays ? '#ef4444' : selected.daysRemaining <= etaDays + 25 ? '#f59e0b' : '#10b981',
            fontFamily: 'monospace',
            fontWeight: '900'
          },
          data: [{ value: selected.daysRemaining, name: `${selected.label} Runway` }]
        }
      ]
    }, { notMerge: true, lazyUpdate: true });
  }, [selected, etaDays]);

  const daysBuffer = selected ? selected.daysRemaining - etaDays : 0;

  return (
    <div className="space-y-4">
      {/* Category selector chips */}
      <div className="flex flex-wrap gap-2">
        {stocks.map(s => {
          const isSel = s.id === selectedStockId;
          const isCrit = s.daysRemaining < etaDays;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedStockId(s.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border"
              style={isSel ? {
                borderColor: s.color,
                backgroundColor: `${s.color}25`,
                color: '#ffffff',
                boxShadow: `0 0 12px ${s.color}40`
              } : {
                borderColor: 'rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: '#cbd5e1'
              }}
            >
              <span style={{ color: s.color }}>{s.icon}</span>
              <span>{s.label}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{
                  backgroundColor: isCrit ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                  color: isCrit ? '#fca5a5' : '#6ee7b7'
                }}
              >
                {s.daysRemaining}d
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Gauge Chart */}
        <div className="h-[210px] flex items-center justify-center relative">
          <div ref={chartRef} style={{ height: 210, width: '100%' }} />
          <div className="absolute bottom-2 text-center text-[10px] font-mono text-slate-400 font-bold">
            Vessel ETA: <span className="text-cyan-300 font-black">{etaDays} Days</span> Â· Safe Threshold: <span className="text-emerald-400 font-black">&gt;{etaDays + 25} Days</span>
          </div>
        </div>

        {/* Deliberate Comparative Details Bar */}
        <div className="p-4 rounded-xl border border-polar-border bg-polar-dark/70 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs uppercase text-slate-300 font-bold">Commodity Status</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${daysBuffer < 0 ? 'bg-red-500/20 border border-red-500/40 text-red-300' : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              }`}>
              {daysBuffer < 0 ? `DEFICIT: EXHAUSTS ${Math.abs(daysBuffer)}d BEFORE ETA` : `BUFFER: +${daysBuffer}d AFTER ARRIVAL`}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Stock On Hand:</span>
              <span className="text-white font-bold">{selected?.current?.toLocaleString()} {selected?.unit} ({selected?.pct}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Daily Burn Rate:</span>
              <span className="text-amber-300 font-bold">{selected?.dailyRate} {selected?.unit}/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inbound Shipment Loading:</span>
              <span className="text-cyan-300 font-bold">+{selected?.incomingUnits?.toLocaleString()} {selected?.unit} (+{selected?.incomingPct}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Projected Post-Arrival:</span>
              <span className="text-emerald-300 font-bold">{Math.min(selected?.capacity || 0, (selected?.current || 0) + (selected?.incomingUnits || 0)).toLocaleString()} {selected?.unit} ({selected?.postResupplyPct}%)</span>
            </div>
          </div>

          {/* Visual Runway Progress Meter */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-400">Runway Progress vs Arrival</span>
              <span className={daysBuffer < 0 ? 'text-red-300 font-bold' : 'text-emerald-300 font-bold'}>
                {Math.round(((selected?.daysRemaining || 0) / etaDays) * 100)}% of arrival milestone
              </span>
            </div>
            <div className="h-3 bg-white/06 rounded-full overflow-hidden border border-white/10 relative">
              <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10" style={{ left: `${Math.min(95, (etaDays / maxDays) * 100)}%` }} />
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, ((selected?.daysRemaining || 0) / maxDays) * 100)}%`,
                  background: (selected?.daysRemaining || 0) < etaDays ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'linear-gradient(to right, #10b981, #059669)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LogisticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [localLogistics, setLocalLogistics] = useState<any>(null);
  const [activeLayer, setActiveLayer] = useState<'vessel' | 'stock' | 'cargo' | 'fleet'>('vessel');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await telemetryApi.getLogistics(stationId);
        if (mounted && data) setLocalLogistics(data);
      } catch { }
    };
    load();
    return () => { mounted = false; };
  }, [stationId]);

  const snapshot = liveSnapshot[stationId];
  const log = snapshot?.logistics || localLogistics;

  // Voyage / vessel data
  const plannedEta = log?.planned_eta_days ?? (isMaitri ? 88.0 : 102.0);
  const weatherDelay = log?.weather_delay_days ?? (isMaitri ? 3.5 : 1.5);
  const effectiveEta = log?.effective_eta_days ?? (plannedEta + weatherDelay);
  const voyageDay = log?.voyage_day ?? 34;
  const totalVoyageDays = log?.total_voyage_days ?? 120;
  const voyageProgress = Math.round((voyageDay / totalVoyageDays) * 100);
  const logisticsRisk = log?.logistics_risk_score ?? (isMaitri ? 25.3 : 18.4);
  const riskLevel = logisticsRisk < 30 ? 'LOW' : logisticsRisk < 60 ? 'MEDIUM' : 'HIGH';
  const riskLevelColor = riskLevel === 'LOW' ? '#10b981' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444';
  const vesselName = log?.resupply_vessel ?? 'MV Vasiliy Golovnin';
  const confidence = log?.confidence ?? 'Medium';

  const riskFactors = log?.risk_factors ?? {
    weather_delay: 38, route_exposure: 24, eta_uncertainty: 18,
    cargo_dependency: 12, transport_readiness: 8,
  };

  // Initially show the current travelling location (CP-03, index 2) with weather & operational directives
  const [selectedEntity, setSelectedEntity] = useState<'vessel' | number>(2);

  const interactiveWaypoints: InteractiveWaypoint[] = isMaitri ? [
    {
      id: 'wp-1',
      code: 'CP-01',
      name: 'Cape Town Harbor Fairway',
      status: 'PASSED',
      distance_km: 0,
      coordinates: "33Ã‚Â° 55' S, 18Ã‚Â° 25' E",
      x: 140,
      y: 75,
      delay_days: 0,
      risk: 'NOMINAL',
      weather: {
        temp: '+18.5Ã‚Â°C',
        wind_chill: '+18.5Ã‚Â°C',
        wind_speed: '14 km/h',
        wind_dir: 'SSE',
        wind_gust: '22 km/h',
        sea_state: 'State 2 (Smooth)',
        wave_height: '0.8 m',
        swell_period: '6.5 s',
        ice_coverage: '0% (Open Sea)',
        ice_type: 'Ice Free Fairway',
        visibility: '> 10 NM (Clear)',
        sst: '+16.2Ã‚Â°C',
        salinity: '35.2 PSU',
        barometer: '1018 hPa',
      },
      issues: [
        { title: 'Harbor Clearance & Fuel Bunkering Complete', desc: 'Pre-departure ballast inspection and full Arctic-grade diesel bunkering completed without delays.', severity: 'info' },
        { title: 'Pre-Voyage Metacenter Stability Verification', desc: 'Transverse GM calculated at 2.45m; container lashing chains tensioned to class spec.', severity: 'info' },
      ],
      nav_protocol: 'Fairway transit speed limit 10 kn; transition to open ocean passage bearing 195Ã‚Â°S.',
      eta_time: 'Day 01 Ã‚Â· 08:00 UTC (Departed)',
    },
    {
      id: 'wp-2',
      code: 'CP-02',
      name: 'Southern Ocean Gales / Roaring Forties',
      status: 'PASSED',
      distance_km: 2400,
      coordinates: "45Ã‚Â° 10' S, 16Ã‚Â° 40' E",
      x: 340,
      y: 165,
      delay_days: 1.0,
      risk: 'MODERATE',
      weather: {
        temp: '+4.2Ã‚Â°C',
        wind_chill: '-2.8Ã‚Â°C',
        wind_speed: '52 km/h',
        wind_dir: 'WSW',
        wind_gust: '74 km/h',
        sea_state: 'State 6 (Rough)',
        wave_height: '4.6 m',
        swell_period: '12.2 s',
        ice_coverage: '0% (Open Sea)',
        ice_type: 'Heavy Sea Spray & Swell',
        visibility: '4.0 NM (Heavy spray)',
        sst: '+2.8Ã‚Â°C',
        salinity: '34.2 PSU',
        barometer: '982 hPa (Deep low)',
      },
      issues: [
        { title: 'Heavy Transverse Swell & 16Ã‚Â° Roll Dynamics', desc: 'Open ocean gales induced heavy rolling; automated anti-heeling ballast tanks activated.', severity: 'warning' },
        { title: 'Cruising Throttle Reduced for Hull Protection', desc: 'Throttled from 14.5 kn to 11.0 kn to avoid slamming shock on forward bow structure.', severity: 'warning' },
      ],
      nav_protocol: 'Maintain continuous anti-heeling stabilization; execute 4-hour deck lashing security inspections.',
      eta_time: 'Day 14 Ã‚Â· 12:00 UTC (Cleared)',
    },
    {
      id: 'wp-3',
      code: 'CP-03',
      name: 'Princess Astrid Ice Edge (MIZ)',
      status: 'ACTIVE',
      distance_km: 4100,
      coordinates: "66Ã‚Â° 30' S, 12Ã‚Â° 20' E",
      x: 550,
      y: 270,
      delay_days: 2.5,
      risk: 'ELEVATED',
      weather: {
        temp: '-16.5Ã‚Â°C',
        wind_chill: '-29.2Ã‚Â°C',
        wind_speed: '42 km/h',
        wind_dir: 'ESE',
        wind_gust: '64 km/h',
        sea_state: 'State 4 (Dampened)',
        wave_height: '1.8 m',
        swell_period: '8.0 s',
        ice_coverage: '45% Pack Ice',
        ice_type: 'First-Year Consolidated Floes (0.8m - 1.2m)',
        visibility: '1.5 NM (Sea Smoke & Flurries)',
        sst: '-1.6Ã‚Â°C',
        salinity: '33.9 PSU',
        barometer: '991 hPa',
      },
      issues: [
        { title: 'First-Year Pack Ice Pressure Ridges', desc: 'Forward ice concentration reached 5/10ths with 1.2m pressure ridges; active zigzag icebreaking path required.', severity: 'critical' },
        { title: 'Sub-Zero Superstructure Freezing Sea Spray', desc: 'Rapid ice accretion detected on forward forecastle winches; thermal steam de-icers activated.', severity: 'warning' },
        { title: 'Downslope Katabatic Wind Flurries', desc: 'Blowing snow off the continental slope reducing optical horizon visibility to 1.5 NM.', severity: 'warning' },
      ],
      nav_protocol: 'Activate dual 5kW Xenon bow searchlights; limit cruising speed to 8.5 kn; continuous forward sonar scanning.',
      eta_time: 'CURRENT ACTIVE POSITION Ã‚Â· Target Mooring in 4.8d',
    },
    {
      id: 'wp-4',
      code: 'CP-04',
      name: 'Ice Shelf Barrier Mooring Trench',
      status: 'UPCOMING',
      distance_km: 4350,
      coordinates: "69Ã‚Â° 58' S, 11Ã‚Â° 55' E",
      x: 750,
      y: 355,
      delay_days: 0,
      risk: 'HIGH',
      weather: {
        temp: '-22.4Ã‚Â°C',
        wind_chill: '-38.0Ã‚Â°C',
        wind_speed: '55 km/h',
        wind_dir: 'SE',
        wind_gust: '78 km/h',
        sea_state: 'State 1 (Fast Ice)',
        wave_height: '0.3 m',
        swell_period: '4.5 s',
        ice_coverage: '92% Heavy Fast Ice',
        ice_type: 'Multi-year Fast Ice (> 2.0m)',
        visibility: '0.8 NM (Blizzard drift)',
        sst: '-1.8Ã‚Â°C',
        salinity: '34.1 PSU',
        barometer: '978 hPa',
      },
      issues: [
        { title: 'Fast-Ice Mooring Anchor Deadman Installation', desc: 'Requires boring ice anchors into 2.5m thick shelf ice to establish high-tensile mooring lines.', severity: 'warning' },
        { title: 'Barrier Shelf Calving Rift Surveillance', desc: 'Satellite SAR and drone inspection mandatory to verify shelf edge stability prior to docking.', severity: 'critical' },
      ],
      nav_protocol: 'Controlled ramming approach into fast ice notch at 3.5 kn; deploy steel ice screws and deadman timbers.',
      eta_time: 'Day 38 Ã‚Â· 16:00 UTC (Scheduled)',
    },
    {
      id: 'wp-5',
      code: 'CP-05',
      name: '100km Overland Supply Corridor to Maitri',
      status: 'UPCOMING',
      distance_km: 4450,
      coordinates: "70Ã‚Â° 46' S, 11Ã‚Â° 44' E (Maitri)",
      x: 910,
      y: 410,
      delay_days: 0,
      risk: 'CRITICAL',
      weather: {
        temp: '-28.5Ã‚Â°C',
        wind_chill: '-45.0Ã‚Â°C',
        wind_speed: '68 km/h',
        wind_dir: 'SSE',
        wind_gust: '92 km/h',
        sea_state: 'Continental Glacial Sheet',
        wave_height: 'N/A',
        swell_period: 'N/A',
        ice_coverage: '100% Continental Ice Sheet',
        ice_type: 'Blue ice sheet & sastrugi snowdrifts',
        visibility: '0.2 NM (Ground blizzard whiteout)',
        sst: 'N/A',
        salinity: 'N/A',
        barometer: '970 hPa',
      },
      issues: [
        { title: 'Active Shear Crevasse Zones in Blue Ice', desc: 'Schirmacher Oasis route crosses known shear fractures; Ground Penetrating Radar (GPR) lead vehicle required.', severity: 'critical' },
        { title: 'Ground Blizzard Whiteout & Severe Sastrugi', desc: 'Surface sastrugi ridges up to 1.8m tall; zero optical horizon visibility during polar blowouts.', severity: 'critical' },
      ],
      nav_protocol: 'Tracked snow tractor convoy only: lead PistenBully with GPR scanner, maximum 12 km/h convoy speed.',
      eta_time: 'Day 44 Ã‚Â· 20:00 UTC (Scheduled)',
    },
  ] : [
    {
      id: 'wp-b1',
      code: 'CP-01',
      name: 'Cape Town Harbor Fairway',
      status: 'PASSED',
      distance_km: 0,
      coordinates: "33Ã‚Â° 55' S, 18Ã‚Â° 25' E",
      x: 140,
      y: 75,
      delay_days: 0,
      risk: 'NOMINAL',
      weather: {
        temp: '+19.2Ã‚Â°C',
        wind_chill: '+19.2Ã‚Â°C',
        wind_speed: '12 km/h',
        wind_dir: 'SE',
        wind_gust: '18 km/h',
        sea_state: 'State 2 (Smooth)',
        wave_height: '0.7 m',
        swell_period: '6.0 s',
        ice_coverage: '0% (Open Sea)',
        ice_type: 'Clear Shipping Corridor',
        visibility: '> 10 NM (Clear)',
        sst: '+16.8Ã‚Â°C',
        salinity: '35.4 PSU',
        barometer: '1020 hPa',
      },
      issues: [
        { title: 'Harbor Clearance & Fuel Bunkering Complete', desc: 'Full Antarctic bunkering and cargo inspection signed off prior to open ocean transit.', severity: 'info' },
        { title: 'Metacenter Stability Nominal', desc: 'Vessel trim verified with full container deck load; twist-lock sensors verified.', severity: 'info' },
      ],
      nav_protocol: 'Fairway transit speed limit 10 kn; transition to Indian Ocean polar corridor heading 162Ã‚Â°SE.',
      eta_time: 'Day 01 Ã‚Â· 09:30 UTC (Departed)',
    },
    {
      id: 'wp-b2',
      code: 'CP-02',
      name: 'Roaring Forties / Indian Ocean Sector',
      status: 'PASSED',
      distance_km: 2600,
      coordinates: "48Ã‚Â° 10' S, 42Ã‚Â° 30' E",
      x: 360,
      y: 165,
      delay_days: 0.5,
      risk: 'MODERATE',
      weather: {
        temp: '+6.5Ã‚Â°C',
        wind_chill: '-0.8Ã‚Â°C',
        wind_speed: '44 km/h',
        wind_dir: 'SW',
        wind_gust: '62 km/h',
        sea_state: 'State 5 (Moderate-Rough)',
        wave_height: '3.8 m',
        swell_period: '10.5 s',
        ice_coverage: '0% (Open Sea)',
        ice_type: 'Sub-Antarctic Open Waters',
        visibility: '5.5 NM (Scattered showers)',
        sst: '+4.5Ã‚Â°C',
        salinity: '34.6 PSU',
        barometer: '988 hPa',
      },
      issues: [
        { title: 'Moderate Oceanic Swell Dynamics', desc: 'Following swell generated 12Ã‚Â° pitch motion; auto stabilizers maintained steady cruising speed.', severity: 'info' },
        { title: 'Routine Deck Securing Verification', desc: 'All container lashing tension readouts nominal; zero displacement recorded.', severity: 'info' },
      ],
      nav_protocol: 'Maintain optimal economic cruising speed of 14.2 kn; execute regular weather routing updates.',
      eta_time: 'Day 15 Ã‚Â· 18:00 UTC (Cleared)',
    },
    {
      id: 'wp-b3',
      code: 'CP-03',
      name: 'Prydz Bay Marginal Pack Ice',
      status: 'ACTIVE',
      distance_km: 4500,
      coordinates: "67Ã‚Â° 20' S, 74Ã‚Â° 15' E",
      x: 570,
      y: 265,
      delay_days: 1.0,
      risk: 'ELEVATED',
      weather: {
        temp: '-14.8Ã‚Â°C',
        wind_chill: '-26.5Ã‚Â°C',
        wind_speed: '34 km/h',
        wind_dir: 'E',
        wind_gust: '52 km/h',
        sea_state: 'State 3 (Ice Dampened)',
        wave_height: '1.4 m',
        swell_period: '7.2 s',
        ice_coverage: '38% Pack Ice',
        ice_type: 'Brash Ice & First-Year Floes (0.6m - 1.0m)',
        visibility: '2.5 NM (Snow flurries)',
        sst: '-1.4Ã‚Â°C',
        salinity: '33.8 PSU',
        barometer: '995 hPa',
      },
      issues: [
        { title: 'Sea Ice Drift & Lead Channel Navigation', desc: 'Satellite SAR imagery indicates open lead navigation path 8 NM East of standard line; adjusting track.', severity: 'warning' },
        { title: 'Sea Chest Thermal De-Icing Active', desc: 'Low seawater temperatures require thermal recirculation to prevent ice ingestion in engine cooling lines.', severity: 'info' },
      ],
      nav_protocol: 'Reduce cruising speed to 10 kn; activate bow searchlights; follow open water leads through pack.',
      eta_time: 'CURRENT ACTIVE POSITION Ã‚Â· Distance to Bay: 320 km',
    },
    {
      id: 'wp-b4',
      code: 'CP-04',
      name: 'Quilty Bay Mooring Basin',
      status: 'UPCOMING',
      distance_km: 4800,
      coordinates: "69Ã‚Â° 22' S, 76Ã‚Â° 02' E",
      x: 760,
      y: 350,
      delay_days: 0,
      risk: 'MODERATE',
      weather: {
        temp: '-19.2Ã‚Â°C',
        wind_chill: '-33.0Ã‚Â°C',
        wind_speed: '40 km/h',
        wind_dir: 'NE',
        wind_gust: '58 km/h',
        sea_state: 'State 1 (Sheltered Basin)',
        wave_height: '0.4 m',
        swell_period: '5.0 s',
        ice_coverage: '75% Fast Ice & Ice Foot',
        ice_type: 'Coastal Fast Ice Sheet (1.5m)',
        visibility: '3.0 NM (Haze)',
        sst: '-1.7Ã‚Â°C',
        salinity: '34.0 PSU',
        barometer: '984 hPa',
      },
      issues: [
        { title: 'Ice Barge Shuttle Preparation', desc: 'Amphibious cargo barges standing by at shore ramp for direct lightering operations upon arrival.', severity: 'info' },
        { title: 'Coastal Ice Foot Stability Monitoring', desc: 'Checking tide-crack fissures along landing ramp prior to heavy vehicle unloading.', severity: 'warning' },
      ],
      nav_protocol: 'Slow approach at 3 kn; secure ship with heavy ice bitts; prepare container cranes for shuttle barge offload.',
      eta_time: 'Day 36 Ã‚Â· 14:00 UTC (Scheduled)',
    },
    {
      id: 'wp-b5',
      code: 'CP-05',
      name: 'Bharati Station Terminal (Larsemann Hills)',
      status: 'UPCOMING',
      distance_km: 4820,
      coordinates: "69Ã‚Â° 24' S, 76Ã‚Â° 11' E (Bharati)",
      x: 910,
      y: 410,
      delay_days: 0,
      risk: 'NOMINAL',
      weather: {
        temp: '-21.5Ã‚Â°C',
        wind_chill: '-35.8Ã‚Â°C',
        wind_speed: '38 km/h',
        wind_dir: 'ENE',
        wind_gust: '54 km/h',
        sea_state: 'Coastal Rocky Peninsula',
        wave_height: 'N/A',
        swell_period: 'N/A',
        ice_coverage: 'Shore Fast Ice Margin',
        ice_type: 'Permanent Coastal Permafrost & Rock',
        visibility: '4.5 NM (Clear)',
        sst: 'N/A',
        salinity: 'N/A',
        barometer: '980 hPa',
      },
      issues: [
        { title: 'Shore Fuel Pipeline Manifold Ready', desc: 'Insulated cryogenic fuel hose connected from tank farm down to quayside barge discharge point.', severity: 'info' },
        { title: 'Helicopter Sling Staging Prepared', desc: 'Station roof helipad and Ka-32 rotorcraft prepped for priority cargo airlift.', severity: 'info' },
      ],
      nav_protocol: 'Station transfer protocol: simultaneous barge shuttle for heavy equipment & helicopter sling for priority stores.',
      eta_time: 'Day 38 Ã‚Â· 08:00 UTC (Final Resupply)',
    },
  ];

  const assets = log?.assets ?? (isMaitri ? [
    { id: 'fleet-1', name: 'PistenBully 300 Polar', type: 'Heavy Tracked Snow Tractor', count: '3 Units', status: 'READY', readiness_pct: 94, capacity: '45 MT', assignment: '100km Overland Ice-Shelf Resupply', weather_suitability: 'EXCELLENT' },
    { id: 'fleet-2', name: 'Kamov Ka-32 Helix', type: 'Heavy Lift Rotorcraft', count: '1 Unit', status: 'STANDBY', readiness_pct: 91, capacity: '5,000 kg sling', assignment: 'Airlift / Crew Rotation', weather_suitability: 'MODERATE' },
    { id: 'fleet-3', name: 'Heavy Polar Sled Train', type: 'HDPE Ice Sleds', count: '6 Sleds', status: 'READY', readiness_pct: 98, capacity: '60 MT', assignment: 'Bulk Fuel & Generator Transfer', weather_suitability: 'EXCELLENT' },
  ] : [
    { id: 'fleet-b1', name: 'Self-Propelled Ice Barges', type: 'Amphibious Cargo Barge', count: '2 Barges', status: 'READY', readiness_pct: 96, capacity: '35 MT each', assignment: 'Quilty Bay Shore Shuttle', weather_suitability: 'GOOD' },
    { id: 'fleet-b2', name: 'Kamov Ka-32 Helix', type: 'Heavy Lift Rotorcraft', count: '1 Unit', status: 'READY', readiness_pct: 95, capacity: '5,000 kg sling', assignment: 'Roof Helipad Slings', weather_suitability: 'MODERATE' },
    { id: 'fleet-b3', name: 'PistenBully Groomers', type: 'Tracked Utility Tractor', count: '2 Units', status: 'READY', readiness_pct: 92, capacity: '20 MT', assignment: 'Coastal Ramp Clearing', weather_suitability: 'EXCELLENT' },
  ]);

  const cargoManifest = useMemo(() => log?.cargo_manifest ?? [
    { id: 'c1', name: isMaitri ? 'AGO Bulk Diesel (180,000 L)' : 'AGO Bulk Diesel (220,000 L)', category: 'Energy & Thermal', shortage_risk: 'HIGH', required_by_days: isMaitri ? 74 : 85, reserve_days: isMaitri ? 48 : 58, dependent_domain: 'Fuel & Energy', weight_mt: isMaitri ? 152 : 185, volume_m3: 190, priority: 1 },
    { id: 'c2', name: 'Dry Rations & Fresh Provisions', category: 'Life Support', shortage_risk: 'LOW', required_by_days: 90, reserve_days: 65, dependent_domain: 'Personnel', weight_mt: 12, volume_m3: 28, priority: 2 },
    { id: 'c3', name: 'Equipment Overhaul Spares', category: 'Maintenance', shortage_risk: 'MEDIUM', required_by_days: 80, reserve_days: 35, dependent_domain: 'Equipment & Systems', weight_mt: 8, volume_m3: 15, priority: 3 },
    { id: 'c4', name: 'Medical & Lab Consumables', category: 'Life Support', shortage_risk: 'LOW', required_by_days: 120, reserve_days: 90, dependent_domain: 'Personnel/Safety', weight_mt: 1.2, volume_m3: 3, priority: 4 },
    { id: 'c5', name: isMaitri ? 'LPG Cylinders (Heating)' : 'Methanol & Antifreeze Chemicals', category: 'Thermal Management', shortage_risk: 'MEDIUM', required_by_days: 60, reserve_days: 40, dependent_domain: 'Infrastructure', weight_mt: 4.5, volume_m3: 8, priority: 2 },
  ], [log?.cargo_manifest, isMaitri]);

  // Stock inventory â€” per station (memoized to prevent re-creation flicker)
  const stocks = useMemo(() => isMaitri ? [
    { id: 'diesel', label: 'HSD Diesel', icon: <Fuel className="w-5 h-5" />, current: 82000, capacity: 200000, unit: 'L', color: '#eab308', criticalPct: 20, warningPct: 35, dailyRate: 1800, daysRemaining: 46 },
    { id: 'lpg', label: 'LPG (Heating)', icon: <Flame className="w-5 h-5" />, current: 3200, capacity: 8000, unit: 'kg', color: '#f97316', criticalPct: 15, warningPct: 30, dailyRate: 42, daysRemaining: 76 },
    { id: 'water', label: 'Fresh Water', icon: <Droplet className="w-5 h-5" />, current: 28000, capacity: 60000, unit: 'L', color: '#38bdf8', criticalPct: 20, warningPct: 40, dailyRate: 800, daysRemaining: 35 },
    { id: 'food', label: 'Dry Rations', icon: <UtensilsCrossed className="w-5 h-5" />, current: 4200, capacity: 8000, unit: 'kg', color: '#10b981', criticalPct: 15, warningPct: 30, dailyRate: 40, daysRemaining: 105 },
    { id: 'oxygen', label: 'Medical O2', icon: <Activity className="w-5 h-5" />, current: 420, capacity: 800, unit: 'kg', color: '#a855f7', criticalPct: 20, warningPct: 40, dailyRate: 3, daysRemaining: 140 },
    { id: 'spares', label: 'Maint. Spares', icon: <Wrench className="w-5 h-5" />, current: 62, capacity: 100, unit: '%', color: '#ec4899', criticalPct: 20, warningPct: 40, dailyRate: 0.4, daysRemaining: 55 },
  ] : [
    { id: 'diesel', label: 'HSD Diesel', icon: <Fuel className="w-5 h-5" />, current: 138000, capacity: 280000, unit: 'L', color: '#eab308', criticalPct: 20, warningPct: 35, dailyRate: 2200, daysRemaining: 63 },
    { id: 'lpg', label: 'LPG (Heating)', icon: <Flame className="w-5 h-5" />, current: 5800, capacity: 12000, unit: 'kg', color: '#f97316', criticalPct: 15, warningPct: 30, dailyRate: 58, daysRemaining: 100 },
    { id: 'water', label: 'Fresh Water', icon: <Droplet className="w-5 h-5" />, current: 42000, capacity: 80000, unit: 'L', color: '#38bdf8', criticalPct: 20, warningPct: 40, dailyRate: 1000, daysRemaining: 42 },
    { id: 'food', label: 'Dry Rations', icon: <UtensilsCrossed className="w-5 h-5" />, current: 5800, capacity: 10000, unit: 'kg', color: '#10b981', criticalPct: 15, warningPct: 30, dailyRate: 52, daysRemaining: 112 },
    { id: 'oxygen', label: 'Medical O2', icon: <Activity className="w-5 h-5" />, current: 580, capacity: 1000, unit: 'kg', color: '#a855f7', criticalPct: 20, warningPct: 40, dailyRate: 4, daysRemaining: 145 },
    { id: 'spares', label: 'Maint. Spares', icon: <Wrench className="w-5 h-5" />, current: 74, capacity: 100, unit: '%', color: '#ec4899', criticalPct: 20, warningPct: 40, dailyRate: 0.3, daysRemaining: 80 },
  ], [isMaitri]);

  // Memoized enriched stocks
  const enrichedStocks = useMemo(() => {
    const eta = Math.round(effectiveEta);
    return stocks.map(s => {
      const incomingMatch = cargoManifest.find((c: any) =>
        (s.id === 'diesel' && c.name.toLowerCase().includes('diesel')) ||
        (s.id === 'lpg' && (c.name.toLowerCase().includes('lpg') || c.name.toLowerCase().includes('methanol'))) ||
        (s.id === 'food' && c.name.toLowerCase().includes('ration')) ||
        (s.id === 'spares' && c.name.toLowerCase().includes('spares'))
      );
      const pct = Math.round((s.current / s.capacity) * 100);
      const statusColor = pct <= s.criticalPct ? '#ef4444' : pct <= s.warningPct ? '#f59e0b' : s.color;
      const urgency: 'CRITICAL' | 'WARNING' | 'NOMINAL' = pct <= s.criticalPct ? 'CRITICAL' : pct <= s.warningPct ? 'WARNING' : 'NOMINAL';
      const runoutBeforeEta = s.daysRemaining < eta;
      const incomingUnits = incomingMatch ? Math.round(s.capacity * 0.55) : 0;
      const incomingPct = incomingMatch ? Math.min(100, Math.round((incomingUnits / s.capacity) * 100)) : 0;
      const postResupplyPct = Math.min(100, pct + incomingPct);
      return { ...s, pct, statusColor, urgency, runoutBeforeEta, incomingMatch, incomingUnits, incomingPct, postResupplyPct };
    });
  }, [stocks, cargoManifest, effectiveEta]);

  const selectedAsset = assets.find((a: any) => a.id === selectedAssetId) || assets[0];

  const layers = [
    { id: 'vessel' as const, label: 'Maritime Voyage & Route Command', icon: <Ship className="w-4 h-4" />, color: '#06b6d4' },
    { id: 'stock' as const, label: 'Stock Inventory', icon: <Database className="w-4 h-4" />, color: '#f59e0b' },
    { id: 'cargo' as const, label: 'Cargo Manifest', icon: <Package className="w-4 h-4" />, color: '#10b981' },
    { id: 'fleet' as const, label: 'Transport Fleet', icon: <Truck className="w-4 h-4" />, color: '#818cf8' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Header Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 60%, #06b6d408 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, #f59e0b08 0%, transparent 50%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Ship className="w-8 h-8 text-cyan-400" /> Logistics
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-polar-dark border border-cyan-500/30 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-bold">DAY {voyageDay}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-100 font-semibold" title="Estimated Time of Arrival">
                ETA (Estimated Time of Arrival): {Math.round(effectiveEta)}d
              </span>
            </div>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=logistics`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4" /> Decision Intel
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Voyage Day', val: `D+${voyageDay}`, sub: `${voyageProgress}% of ${totalVoyageDays}d`, color: '#38bdf8', icon: <Compass className="w-4 h-4" /> },
            { label: 'ETA Ã‚Â· Estimated Time of Arrival', val: `${Math.round(effectiveEta)}d`, sub: `+${weatherDelay}d weather delay`, color: '#f59e0b', icon: <Clock className="w-4 h-4" /> },
            { label: 'Logistics Risk', val: `${logisticsRisk.toFixed(1)}`, sub: `Level: ${riskLevel}`, color: riskLevelColor, icon: <AlertTriangle className="w-4 h-4" /> },
            { label: 'Confidence', val: confidence, sub: `Vessel: ${vesselName.split(' ').slice(0, 2).join(' ')}`, color: confidence === 'High' ? '#10b981' : confidence === 'Medium' ? '#f59e0b' : '#ef4444', icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'Diesel Left', val: `${Math.round(stocks[0].current / 1000)}kL`, sub: `~${stocks[0].daysRemaining}d remaining`, color: stocks[0].daysRemaining < 30 ? '#ef4444' : '#f59e0b', icon: <Fuel className="w-4 h-4" /> },
            { label: 'Food Stock', val: `${stocks[3].current}kg`, sub: `~${stocks[3].daysRemaining}d remaining`, color: '#10b981', icon: <UtensilsCrossed className="w-4 h-4" /> },
          ].map(kpi => (
            <div key={kpi.label}
              className="p-3.5 rounded-xl bg-polar-dark/80 border border-polar-border hover:border-cyan-500/40 transition-all group">
              <div className="flex items-center justify-between text-xs font-mono text-slate-200 font-bold mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-xl font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-xs font-mono text-slate-300 mt-1 font-medium">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Layer Navigation Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="flex gap-2 flex-wrap">
        {layers.map(l => (
          <button key={l.id} onClick={() => setActiveLayer(l.id)}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border cursor-pointer"
            style={activeLayer === l.id
              ? { background: `${l.color}22`, borderColor: `${l.color}66`, color: l.color }
              : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#cbd5e1' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>



      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
          LAYER: MARITIME VOYAGE & ROUTE COMMAND
      Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
      {activeLayer === 'vessel' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/05 rounded-full blur-3xl pointer-events-none" />

            <SectionDivider
              icon={<Ship className="w-6 h-6" />}
              title="Polar Sea Voyage & Live Route Intelligence"
              color="#06b6d4"
              action={
                <button
                  onClick={() => {
                    setSelectedEntity(2);
                    const el = document.getElementById('voyage-telemetry-console');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg border ${selectedEntity === 2
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-cyan-500/20'
                    : 'bg-polar-dark/90 hover:bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:border-cyan-400'
                    }`}
                  title="Show Current Ship Location Weather & Directives"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>Current Ship Location</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                    {interactiveWaypoints[2]?.code || 'CP-03'}
                  </span>
                </button>
              }
            />

            {/* Interactive Ocean Canvas with Animated Ship & Route Waypoints */}
            <div className="mb-6">
              <PolarVoyageOcean
                vesselName={vesselName}
                speedKnots={isMaitri ? 12.4 : 14.2}
                heading={isMaitri ? '174Â° S' : '162Â° SE'}
                coordinates={isMaitri ? "66Â° 18' S, 12Â° 45' E" : "58Â° 42' S, 48Â° 15' E"}
                isMaitri={isMaitri}
                waypoints={interactiveWaypoints}
                selectedEntity={selectedEntity}
                onSelectEntity={(entity) => setSelectedEntity(entity)}
              />
            </div>

            {/* Interactive Telemetry & Intelligence Console based on selected item */}
            <div id="voyage-telemetry-console" className="pt-2">
              {selectedEntity === 'vessel' ? (
                <VesselInspectionPanel
                  vesselName={vesselName}
                  speedKnots={isMaitri ? 12.4 : 14.2}
                  heading={isMaitri ? '174Ã‚Â° S' : '162Ã‚Â° SE'}
                  coordinates={isMaitri ? "66Ã‚Â° 18' S, 12Ã‚Â° 45' E" : "58Ã‚Â° 42' S, 48Ã‚Â° 15' E"}
                  effectiveEta={effectiveEta}
                  voyageDay={voyageDay}
                  totalVoyageDays={totalVoyageDays}
                  isMaitri={isMaitri}
                  onInspectCurrentLocation={() => setSelectedEntity(2)}
                />
              ) : (
                <WaypointInspectionPanel
                  waypoint={interactiveWaypoints[selectedEntity]}
                  totalWaypoints={interactiveWaypoints.length}
                  currentIndex={selectedEntity}
                  onBackToShip={() => setSelectedEntity('vessel')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          LAYER: STOCK INVENTORY - VISUAL COMPARATIVE ANALYTICS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeLayer === 'stock' && (() => {
        const eta = Math.round(effectiveEta);
        const enriched = enrichedStocks;
        const criticalCount = enriched.filter(s => s.urgency === 'CRITICAL').length;
        const warningCount = enriched.filter(s => s.urgency === 'WARNING').length;
        const incomingCount = cargoManifest.length;
        const totalCargoWeight = cargoManifest.reduce((a: number, c: any) => a + (c.weight_mt || 0), 0);

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Glass Container */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/05 rounded-full blur-3xl pointer-events-none" />

              <SectionDivider
                icon={<Database className="w-6 h-6" />}
                title="Station Stock & Cargo Comparative Intelligence"
                color="#f59e0b"
                action={
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-cyan-400" /> {incomingCount} Cargos Inbound ({totalCargoWeight} MT)
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                      {stocks.length} Station Categories Active
                    </span>
                    {criticalCount > 0 && (
                      <span className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold animate-pulse">
                        {criticalCount} Critical
                      </span>
                    )}
                  </div>
                }
              />

              {/* â”€â”€ GRAPH SECTION 1: DIRECT COMPARISON BAR GRAPH (CURRENT vs LOADING vs POST-RESUPPLY) â”€â”€ */}
              <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/60 mb-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-amber-400" /> Current Inventory vs Loading Cargo Comparison Graph
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-[#f59e0b]"></span> Station Stock
                    </span>
                    <span className="px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-[#06b6d4]"></span> Inbound Cargo
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-[#10b981]"></span> Post-Resupply Total
                    </span>
                  </div>
                </div>

                <StockVsCargoComparativeBarChart stocks={enriched} etaDays={eta} />
              </div>

              {/* â”€â”€ GRAPH SECTION 2: DEPLETION TRAJECTORY & RUNWAY DAYS TIMELINE GRAPH â”€â”€ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Multi-Line Trajectory Area Chart */}
                <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-cyan-400" /> Depletion Trajectory & Resupply Jump (90-Day Timeline)
                      </h3>
                    </div>
                  </div>
                  <DepletionRunwayTimelineChart stocks={enriched} etaDays={eta} />
                  <div className="mt-3 p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/08 text-[11px] font-mono text-cyan-200 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span><b>Vessel Arrival at D+{eta}:</b> All commodities jump upward by inbound tonnage upon cargo discharge.</span>
                  </div>
                </div>

                {/* Donut Allocation Comparison Chart */}
                <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" /> Cargo Volume & Station Allocation Distribution
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Station Stocks (Left)
                      </span>
                      <span className="px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#06b6d4]"></span> Inbound Cargo (Right)
                      </span>
                    </div>
                  </div>
                  <CargoDistributionPieChart stocks={enriched} cargoManifest={cargoManifest} />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center font-mono text-[10px]">
                    <div className="p-2 rounded-lg bg-polar-dark border border-amber-500/30 text-amber-300 font-bold">
                      Station: {stocks.reduce((a, b) => a + b.current, 0).toLocaleString()} Units On Hand
                    </div>
                    <div className="p-2 rounded-lg bg-polar-dark border border-cyan-500/30 text-cyan-300 font-bold">
                      Inbound: {incomingCount} Cargo Manifests ({totalCargoWeight} MT)
                    </div>
                  </div>
                </div>
              </div>

              {/* â”€â”€ GRAPH SECTION 3: INTERACTIVE RUNWAY SPEEDOMETER & COMMODITY INSPECTOR â”€â”€ */}
              <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/60 mb-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-emerald-400" /> Days of Supply Gauge & Burn Rate Speedometer
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-2.5 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Critical (&lt;{eta}d)
                    </span>
                    <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Warning ({eta}-{eta + 25}d)
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Safe (&gt;{eta + 25}d)
                    </span>
                  </div>
                </div>
                <InteractiveRunwayGauge stocks={enriched} etaDays={eta} />
              </div>

              {/* â”€â”€ GRAPH SECTION 4: LIVE TANK LEVELS (COMPACT MONITORING) â”€â”€ */}
              <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/04">
                <div className="text-xs font-mono uppercase text-amber-300 font-bold mb-4 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" /> Station Tank Physical Fill Levels
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {stocks.map(s => (
                    <TankGauge key={s.id}
                      label={s.label}
                      current={s.current}
                      capacity={s.capacity}
                      unit={s.unit}
                      color={s.color}
                      criticalPct={s.criticalPct}
                      warningPct={s.warningPct}
                      daysRemaining={s.daysRemaining}
                    />
                  ))}
                </div>
                {stocks.some(s => (s.current / s.capacity) * 100 <= s.criticalPct) && (
                  <div className="mt-4 p-3 rounded-xl border border-red-500/60 bg-red-500/15 text-[11px] font-mono text-red-200 font-bold animate-pulse flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    CRITICAL STOCK LEVEL ALERT â€” {stocks.filter(s => (s.current / s.capacity) * 100 <= s.criticalPct).map(s => s.label).join(', ')} below critical threshold. Vessel resupply priority elevated.
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
          LAYER: CARGO MANIFEST
      Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
      {activeLayer === 'cargo' && (() => {
        const eta = Math.round(effectiveEta);
        const totalMT = cargoManifest.reduce((a: number, c: any) => a + (c.weight_mt || 0), 0);
        const totalVol = cargoManifest.reduce((a: number, c: any) => a + (c.volume_m3 || 0), 0);
        const highRisk = cargoManifest.filter((c: any) => c.shortage_risk === 'HIGH').length;
        const manifestColors = ['#eab308', '#f97316', '#10b981', '#818cf8', '#06b6d4'];
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <SectionDivider
                icon={<Package className="w-6 h-6" />}
                title="Resupply Cargo Manifest"
                color="#10b981"
                action={
                  <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                    <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-2">
                      <Box className="w-4 h-4 text-emerald-400" /> {cargoManifest.length} Manifests · {totalMT} MT
                    </span>
                    {highRisk > 0 && (
                      <span className="px-3.5 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold animate-pulse flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" /> {highRisk} HIGH RISK
                      </span>
                    )}
                    <span className="px-3.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold">
                      ETA: D+{eta}
                    </span>
                  </div>
                }
              />

              {/* KPI Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Cargo Weight', val: `${totalMT} MT`, sub: 'Gross Deck Load', color: '#10b981', icon: <Box className="w-5 h-5" /> },
                  { label: 'Total Volume', val: `${totalVol} m³`, sub: 'Hold Capacity Used', color: '#818cf8', icon: <Layers className="w-5 h-5" /> },
                  { label: 'Vessel ETA', val: `D+${eta}`, sub: 'Weather delay applied', color: '#06b6d4', icon: <Ship className="w-5 h-5" /> },
                  { label: 'Shortage Risk', val: `${highRisk} Items`, sub: 'HIGH priority cargo', color: highRisk > 0 ? '#ef4444' : '#10b981', icon: <AlertTriangle className="w-5 h-5" /> },
                ].map(k => (
                  <div key={k.label} className="p-4 rounded-2xl border border-polar-border bg-polar-dark/70 flex items-center gap-3.5 shadow-lg hover:border-white/20 transition-all">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${k.color}20`, color: k.color }}>
                      {k.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">{k.label}</div>
                      <div className="text-xl font-black font-mono tracking-tight mt-0.5" style={{ color: k.color }}>{k.val}</div>
                      <div className="text-xs font-mono text-slate-300 font-medium">{k.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Animated Urgency Timeline Track */}
              <div className="mb-6 p-5 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-sm font-mono font-bold text-white tracking-wide">
                  <TrendingDown className="w-4 h-4 text-cyan-400" />
                  <span>Reserve Days vs. Vessel ETA — Cargo Urgency Timeline</span>
                </div>
                <div className="space-y-4">
                  {cargoManifest.map((cargo: any, idx: number) => {
                    const risk = cargo.shortage_risk;
                    const rc = risk === 'HIGH' ? '#ef4444' : risk === 'MEDIUM' ? '#f59e0b' : '#10b981';
                    const maxDay = 130;
                    const reservePct = Math.min(100, (cargo.reserve_days / maxDay) * 100);
                    const etaPct = Math.min(100, (eta / maxDay) * 100);
                    const isShort = cargo.reserve_days < eta;
                    return (
                      <div key={cargo.id} className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${rc}25`, color: rc, border: `1px solid ${rc}60` }}>
                            P{cargo.priority}
                          </span>
                          <span className="text-sm font-mono font-bold text-white truncate flex-1">
                            {cargo.name.split('(')[0].trim()}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-200 bg-white/05 px-2.5 py-0.5 rounded-md border border-white/10 flex-shrink-0">
                            {cargo.reserve_days}d buffer
                          </span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0 border" style={{ background: `${rc}20`, color: rc, borderColor: `${rc}50` }}>
                            {risk}
                          </span>
                        </div>
                        <div className="relative h-7 bg-slate-900/90 rounded-xl border border-white/15 overflow-hidden shadow-inner">
                          <div
                            className="absolute left-0 top-0 h-full rounded-xl"
                            style={{ width: `${reservePct}%`, background: `linear-gradient(to right, ${rc}66, ${rc})`, boxShadow: `0 0 10px ${rc}55`, transition: 'width 1.2s ease' }}
                          />
                          <div
                            className="absolute top-0 h-full w-0.5 z-10"
                            style={{ left: `${etaPct}%`, background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }}
                          />
                          <div className="absolute inset-0 flex items-center px-3.5 gap-2">
                            <span className="text-xs font-mono font-bold z-10 text-white drop-shadow-md">
                              {cargo.reserve_days}d reserve · Need by D+{cargo.required_by_days}
                            </span>
                            {isShort && (
                              <span className="ml-auto text-xs font-mono font-extrabold text-red-200 bg-red-950/90 border border-red-500/60 px-2 py-0.5 rounded-md animate-pulse z-10">
                                ⚠ SHORT BEFORE ETA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-3" style={{ position: 'relative', height: 20 }}>
                  <div className="absolute h-full w-0.5 bg-cyan-400" style={{ left: `${Math.min(100, (eta / 130) * 100)}%`, boxShadow: '0 0 6px #06b6d4' }} />
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/40 absolute" style={{ left: `calc(${Math.min(100, (eta / 130) * 100)}% + 6px)` }}>
                    ▲ Vessel ETA D+{eta}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-6 text-xs font-mono text-slate-300 font-medium border-t border-polar-border/50 pt-2.5">
                  <span className="flex items-center gap-2"><span className="w-8 h-2 rounded-full bg-emerald-400/80 inline-block shadow-sm"></span> Reserve Buffer</span>
                  <span className="flex items-center gap-2"><span className="w-1 h-4 bg-cyan-400 inline-block rounded-full shadow-sm" style={{ boxShadow: '0 0 6px #06b6d4' }}></span> Vessel ETA (D+{eta})</span>
                </div>
              </div>



              {/* Weight & Volume Distribution */}
              <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-sm font-mono font-bold text-white tracking-wide">
                  <BarChart2 className="w-4 h-4 text-purple-400" />
                  <span>Cargo Load Distribution — Weight & Volume Breakdown per Manifest</span>
                </div>
                <div className="space-y-3.5">
                  {cargoManifest.map((cargo: any, idx: number) => {
                    const risk = cargo.shortage_risk;
                    const rc = risk === 'HIGH' ? '#ef4444' : risk === 'MEDIUM' ? '#f59e0b' : '#10b981';
                    const cc = manifestColors[idx % manifestColors.length];
                    const wtPct = totalMT > 0 ? (cargo.weight_mt / totalMT) * 100 : 0;
                    const volPct = totalVol > 0 ? (cargo.volume_m3 / totalVol) * 100 : 0;
                    return (
                      <div key={cargo.id} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 text-xs font-mono text-white font-bold truncate">{cargo.name.split('(')[0].trim()}</div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 bg-slate-800 rounded-md overflow-hidden border border-white/10">
                              <div className="h-full rounded-md" style={{ width: `${wtPct}%`, background: `linear-gradient(to right, ${cc}80, ${cc})`, boxShadow: `0 0 8px ${cc}55`, transition: 'width 1.2s ease' }} />
                            </div>
                            <span className="text-xs font-mono font-black w-16 flex-shrink-0" style={{ color: cc }}>{cargo.weight_mt} MT</span>
                          </div>
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 bg-slate-800 rounded-md overflow-hidden border border-white/10">
                              <div className="h-full rounded-md" style={{ width: `${volPct}%`, background: `linear-gradient(to right, ${rc}60, ${rc})`, transition: 'width 1.2s ease' }} />
                            </div>
                            <span className="text-xs font-mono font-black w-16 flex-shrink-0" style={{ color: rc }}>{cargo.volume_m3} m³</span>
                          </div>
                        </div>
                        <div className="col-span-1 text-right text-xs font-mono font-bold text-slate-300">{wtPct.toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-6 text-xs font-mono text-slate-300 font-medium border-t border-polar-border/50 pt-3.5">
                  <span>Total Weight: <b className="text-emerald-300 font-bold">{totalMT} MT</b></span>
                  <span>Total Volume: <b className="text-cyan-300 font-bold">{totalVol} m³</b></span>
                  <span>Manifests: <b className="text-purple-300 font-bold">{cargoManifest.length}</b></span>
                  <span className="ml-auto text-xs text-slate-400">Top bar = weight · Bottom bar = volume vs. urgency</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
          LAYER: TRANSPORT FLEET
      Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
      {activeLayer === 'fleet' && (() => {
        const fleetReady = assets.filter((a: any) => a.status === 'READY').length;
        const avgReadiness = Math.round(assets.reduce((s: number, a: any) => s + a.readiness_pct, 0) / assets.length);
        const totalCapacity = isMaitri ? '105 MT + 5T Airlift' : '90 MT + Airlift';
        const missionStatus = fleetReady === assets.length ? 'FULLY OPERATIONAL' : fleetReady > 0 ? 'PARTIALLY READY' : 'STANDBY';
        const missionColor = fleetReady === assets.length ? '#10b981' : '#f59e0b';

        const assetColors = ['#818cf8', '#06b6d4', '#10b981'];
        const activeAsset = assets.find((x: any) => x.id === selectedAssetId) || assets[0];
        const ac = activeAsset?.status === 'READY' ? '#10b981' : activeAsset?.status === 'STANDBY' ? '#f59e0b' : '#ef4444';

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <SectionDivider
                icon={<Truck className="w-6 h-6" />}
                title={isMaitri ? 'Maitri Overland Resupply Fleet' : 'Bharati Coastal Discharge Fleet'}
                color="#818cf8"
                subtitle={isMaitri
                  ? 'Heavy tracked convoy operations across 100 km Antarctic ice shelf — PistenBully tractors + Ka-32 helicopter + HDPE polar sled trains'
                  : 'Coastal discharge operations at Quilty Bay — amphibious barges, helicopter sling loads, and shore-ramp tractor support'
                }
                action={
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-2"
                      style={{ background: `${missionColor}20`, borderColor: `${missionColor}50`, color: missionColor }}>
                      <Activity className="w-4 h-4" /> {missionStatus}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold">
                      {fleetReady}/{assets.length} Assets Ready
                    </span>
                  </div>
                }
              />

              {/* ── Fleet KPI Command Bar ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Fleet Status', val: missionStatus, sub: `${fleetReady} of ${assets.length} ready`, color: missionColor, icon: <Shield className="w-5 h-5" /> },
                  { label: 'Avg Readiness', val: `${avgReadiness}%`, sub: 'Cross-fleet average', color: '#818cf8', icon: <Gauge className="w-5 h-5" /> },
                  { label: 'Total Payload', val: totalCapacity, sub: 'Combined load capacity', color: '#06b6d4', icon: <Box className="w-5 h-5" /> },
                  { label: 'Mission Type', val: isMaitri ? 'Overland Traverse' : 'Coastal Discharge', sub: isMaitri ? '100km Ice-Shelf Route' : 'Quilty Bay Operations', color: '#f97316', icon: <Navigation className="w-5 h-5" /> },
                ].map(k => (
                  <div key={k.label} className="p-4 rounded-2xl border border-polar-border bg-polar-dark/70 flex items-center gap-3.5 shadow-lg hover:border-white/20 transition-all">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${k.color}20`, color: k.color }}>
                      {k.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">{k.label}</div>
                      <div className="text-base sm:text-lg font-black font-mono tracking-tight mt-0.5" style={{ color: k.color }}>{k.val}</div>
                      <div className="text-xs font-mono text-slate-300 font-medium">{k.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Main Fleet Grid ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

                {/* Asset Cards List */}
                <div className="lg:col-span-2 space-y-4">
                  {assets.map((asset: any, idx: number) => {
                    const sc = asset.status === 'READY' ? '#10b981' : asset.status === 'STANDBY' ? '#f59e0b' : '#ef4444';
                    const wc = asset.weather_suitability === 'EXCELLENT' ? '#10b981' : asset.weather_suitability === 'GOOD' ? '#06b6d4' : '#f59e0b';
                    const cc = assetColors[idx % assetColors.length];
                    const isSelected = selectedAssetId === asset.id || (!selectedAssetId && asset.id === assets[0]?.id);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        className="p-5 rounded-2xl border cursor-pointer transition-all shadow-xl group"
                        style={{
                          borderColor: isSelected ? `${cc}80` : 'rgba(255,255,255,0.10)',
                          background: isSelected ? `${cc}10` : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cc}25`, color: cc, border: `1px solid ${cc}50` }}>
                              {idx === 0 ? <Truck className="w-5 h-5" /> : idx === 1 ? <Wind className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-base font-black text-white group-hover:text-indigo-200 transition-colors">{asset.name}</div>
                              <div className="text-xs font-mono text-slate-200 font-semibold mt-0.5">{asset.type} · <span style={{ color: cc }}>{asset.count}</span></div>
                            </div>
                          </div>
                          <Pill label={asset.status} color={sc} pulse={asset.status === 'READY'} />
                        </div>

                        {/* Readiness bar — prominent */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-mono text-slate-200 font-bold uppercase tracking-wider">Mission Readiness</span>
                            <span className="text-base font-black font-mono" style={{ color: asset.readiness_pct > 80 ? '#10b981' : '#f59e0b' }}>{asset.readiness_pct}%</span>
                          </div>
                          <div className="h-3.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${asset.readiness_pct}%`,
                                background: `linear-gradient(to right, ${cc}85, ${cc})`,
                                boxShadow: `0 0 10px ${cc}55`,
                                transition: 'width 1.2s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Info chips row */}
                        <div className="grid grid-cols-3 gap-2.5 mb-3.5">
                          {[
                            { label: 'Payload', val: asset.capacity, color: cc },
                            { label: 'Weather', val: asset.weather_suitability, color: wc },
                            { label: 'Assignment', val: asset.assignment.split(' ').slice(0,3).join(' '), color: '#cbd5e1' },
                          ].map(m => (
                            <div key={m.label} className="p-2.5 rounded-xl bg-white/05 border border-white/10 text-center">
                              <div className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider">{m.label}</div>
                              <div className="text-xs font-mono font-bold leading-normal mt-0.5 truncate" style={{ color: m.color }}>{m.val}</div>
                            </div>
                          ))}
                        </div>

                        {/* Deployment checklist pills */}
                        <div className="flex flex-wrap gap-2">
                          {['Fuelled', 'Cold-start OK', 'Safety kit', 'Comms pass'].map((item) => (
                            <span key={item} className="text-xs font-mono px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5"
                              style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98144' }}>
                              <Check className="w-3 h-3" /> {item}
                            </span>
                          ))}
                          {isMaitri && (
                            <span className="text-xs font-mono px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5"
                              style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
                              <Clock className="w-3 h-3" /> Ice route: pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Asset Detail Panel */}
                <div className="p-5 rounded-2xl border shadow-xl space-y-4" style={{ borderColor: `${ac}55`, background: `${ac}0a` }}>
                  <div className="text-xs font-mono uppercase font-black tracking-wider flex items-center gap-2" style={{ color: ac }}>
                    <Crosshair className="w-4 h-4" /> Asset Intelligence
                  </div>

                  {/* Half-arc readiness gauge */}
                  <div className="flex justify-center">
                    <svg width={160} height={92} viewBox="0 0 160 92">
                      <path d="M 18 78 A 62 62 0 0 1 142 78" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={15} strokeLinecap="round" />
                      <path d="M 18 78 A 62 62 0 0 1 142 78" fill="none" stroke={ac} strokeWidth={15} strokeLinecap="round"
                        strokeDasharray={`${Math.PI * 62 * (activeAsset.readiness_pct / 100)} ${Math.PI * 62}`}
                        style={{ filter: `drop-shadow(0 0 8px ${ac}77)`, transition: 'stroke-dasharray 1.2s ease' }} />
                      <text x="80" y="68" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="monospace">{activeAsset.readiness_pct}%</text>
                      <text x="80" y="84" textAnchor="middle" fill={ac} fontSize="10" fontWeight="800" fontFamily="monospace">READINESS</text>
                    </svg>
                  </div>

                  {/* Name + type */}
                  <div className="text-center">
                    <div className="text-base font-black text-white">{activeAsset.name}</div>
                    <div className="text-xs font-mono text-slate-200 mt-0.5">{activeAsset.type}</div>
                  </div>

                  {/* Key metrics */}
                  <div className="space-y-2.5">
                    {[
                      { label: 'Operational Status', val: activeAsset.status, color: ac },
                      { label: 'Payload Capacity', val: activeAsset.capacity, color: '#818cf8' },
                      { label: 'Current Assignment', val: activeAsset.assignment, color: '#cbd5e1' },
                      { label: 'Weather Tolerance', val: activeAsset.weather_suitability, color: activeAsset.weather_suitability === 'EXCELLENT' ? '#10b981' : activeAsset.weather_suitability === 'GOOD' ? '#06b6d4' : '#f59e0b' },
                      { label: 'Unit Count', val: activeAsset.count, color: '#f97316' },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center border-b border-polar-border/40 pb-2">
                        <span className="text-xs font-mono text-slate-200 font-medium">{r.label}</span>
                        <span className="text-xs font-mono font-black text-right max-w-[55%] leading-tight" style={{ color: r.color }}>{r.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Readiness sub-bars */}
                  <div className="space-y-2.5 pt-2">
                    <div className="text-xs font-mono text-slate-200 uppercase font-bold tracking-wider mb-2.5">System Checks</div>
                    {['Propulsion Systems', 'Navigation Equipment', 'Safety Gear', 'Cold-Weather Seals', 'Communication Array'].map((sys, i) => {
                      const pct = [97, 94, 100, 88, 92][i];
                      const c = pct > 95 ? '#10b981' : pct > 85 ? '#06b6d4' : '#f59e0b';
                      return (
                        <div key={sys}>
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-slate-200 font-medium">{sys}</span>
                            <span style={{ color: c }} className="font-bold">{pct}%</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c, transition: 'width 1s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Mission Route / Operations Card ── */}
              <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/60 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-sm font-mono font-bold text-white tracking-wide">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>{isMaitri ? 'Overland Ice-Shelf Traverse Route · Maitri Station to Discharge Point' : 'Coastal Discharge Operations · Bharati Station Maritime Zone'}</span>
                </div>
                <div className="relative py-2">
                  {/* Route nodes */}
                  {isMaitri ? (
                    <div className="flex items-center gap-0">
                      {[
                        { label: 'MV Vasiliy\nGolovnin', sub: 'Vessel Anchorage', icon: <Ship className="w-5 h-5" />, color: '#06b6d4', status: 'ARRIVED' },
                        { label: 'Shore\nStaging', sub: 'Bulk Transfer', icon: <Anchor className="w-5 h-5" />, color: '#818cf8', status: 'READY' },
                        { label: 'Checkpoint\nKM 35', sub: 'Mid-traverse Depot', icon: <MapPin className="w-5 h-5" />, color: '#f59e0b', status: 'PREPPED' },
                        { label: 'Maitri\nStation', sub: 'Final Destination', icon: <Database className="w-5 h-5" />, color: '#10b981', status: 'AWAITING' },
                      ].map((node, i, arr) => (
                        <React.Fragment key={node.label}>
                          <div className="flex flex-col items-center text-center min-w-[85px] px-1">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 shadow-lg" style={{ background: `${node.color}25`, color: node.color, borderColor: `${node.color}66` }}>
                              {node.icon}
                            </div>
                            <div className="text-xs font-mono font-bold text-white whitespace-pre-line leading-tight">{node.label}</div>
                            <div className="text-[11px] font-mono text-slate-200 mt-1 font-medium">{node.sub}</div>
                            <div className="text-[11px] font-mono font-bold mt-1.5 px-2 py-0.5 rounded border border-white/15 bg-white/05" style={{ color: node.color }}>{node.status}</div>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="flex-1 relative h-1 mx-1 mt-[-24px]">
                              <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, ${node.color}90, ${arr[i+1].color}90)` }} />
                              <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 text-[11px] font-mono font-bold text-cyan-300 bg-slate-900/95 px-2 py-0.5 rounded border border-white/20 shadow-md">
                                {['~20km', '~35km', '~45km'][i]}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0">
                      {[
                        { label: 'MV Bharati', sub: 'Vessel at Anchor', icon: <Ship className="w-5 h-5" />, color: '#06b6d4', status: 'ANCHORED' },
                        { label: 'Barge\nShuttle', sub: 'Lightering Ops', icon: <Waves className="w-5 h-5" />, color: '#818cf8', status: 'READY' },
                        { label: 'Shore\nRamp', sub: 'Coastal Landing', icon: <Anchor className="w-5 h-5" />, color: '#f59e0b', status: 'CLEARED' },
                        { label: 'Bharati\nStation', sub: 'Final Destination', icon: <Database className="w-5 h-5" />, color: '#10b981', status: 'AWAITING' },
                      ].map((node, i, arr) => (
                        <React.Fragment key={node.label}>
                          <div className="flex flex-col items-center text-center min-w-[85px] px-1">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 shadow-lg" style={{ background: `${node.color}25`, color: node.color, borderColor: `${node.color}66` }}>
                              {node.icon}
                            </div>
                            <div className="text-xs font-mono font-bold text-white whitespace-pre-line leading-tight">{node.label}</div>
                            <div className="text-[11px] font-mono text-slate-200 mt-1 font-medium">{node.sub}</div>
                            <div className="text-[11px] font-mono font-bold mt-1.5 px-2 py-0.5 rounded border border-white/15 bg-white/05" style={{ color: node.color }}>{node.status}</div>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="flex-1 relative h-1 mx-1 mt-[-24px]">
                              <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, ${node.color}90, ${arr[i+1].color}90)` }} />
                              <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 text-[11px] font-mono font-bold text-cyan-300 bg-slate-900/95 px-2 py-0.5 rounded border border-white/20 shadow-md">
                                {['2.5km', '0.5km', '0.1km'][i]}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Operational conditions row */}
                <div className="mt-5 pt-4 border-t border-polar-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {(isMaitri ? [
                    { label: 'Surface Condition', val: 'Compact Firn Ice', icon: <Thermometer className="w-4 h-4" />, color: '#06b6d4' },
                    { label: 'Wind Speed', val: '22 kn Crosswind', icon: <Wind className="w-4 h-4" />, color: '#818cf8' },
                    { label: 'Visibility', val: '4.2 NM Clear', icon: <Eye className="w-4 h-4" />, color: '#10b981' },
                    { label: 'Crevasse Risk', val: 'LOW (Bridged)', icon: <AlertOctagon className="w-4 h-4" />, color: '#10b981' },
                  ] : [
                    { label: 'Sea State', val: 'Swell 1.2m', icon: <Waves className="w-4 h-4" />, color: '#06b6d4' },
                    { label: 'Wind Speed', val: '15 kn Onshore', icon: <Wind className="w-4 h-4" />, color: '#818cf8' },
                    { label: 'Visibility', val: '6 NM Clear', icon: <Eye className="w-4 h-4" />, color: '#10b981' },
                    { label: 'Barge Window', val: 'OPEN (6h)', icon: <Clock className="w-4 h-4" />, color: '#f59e0b' },
                  ]).map(op => (
                    <div key={op.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/05 border border-white/10 hover:border-white/20 transition-all">
                      <div className="flex-shrink-0" style={{ color: op.color }}>{op.icon}</div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider">{op.label}</div>
                        <div className="text-xs font-mono font-black mt-0.5 truncate" style={{ color: op.color }}>{op.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}



      <style>{`
        @keyframes wave { 0%, 100% { opacity: 0.4; transform: scaleX(1); } 50% { opacity: 0.8; transform: scaleX(1.2); } }
      `}</style>
    </div>
  );
};

export default LogisticsPage;

