import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLive dataStore } from '../store/live dataStore';
import { live dataApi } from '../api/client';
import { WindCompass } from '../components/charts/WindCompass';
import { IndustrialGauge } from '../components/charts/IndustrialGauge';
import { SparklineChart } from '../components/charts/SparklineChart';
import {
  Thermometer, Eye, Sun, AlertTriangle, ShieldCheck, ShieldAlert, CloudLightning,
  Wind, Waves, Droplets, Gauge, Compass, Brain, Layers, RefreshCw
} from 'lucide-react';

// ─── Animated Mercury Thermometer ───────────────────────────────────────────
const MercuryThermometer: React.FC<{ tempC: number; windChill?: number }> = ({ tempC, windChill }) => {
  const MIN = -60;
  const MAX = 10;
  const pct = Math.max(0, Math.min(100, ((tempC - MIN) / (MAX - MIN)) * 100));
  const color = tempC < -40 ? '#818cf8' : tempC < -20 ? '#06b6d4' : tempC < 0 ? '#3b82f6' : '#ef4444';

  return (
    <div className="flex items-center justify-center gap-4 py-1">
      {/* Thermometer SVG */}
      <svg width="34" height="120" viewBox="0 0 34 125">
        {/* Scale ticks */}
        {[-60, -40, -20, 0, 10].map((t) => {
          const ty = 8 + ((MAX - t) / (MAX - MIN)) * 88;
          return (
            <g key={t}>
              <line x1="22" y1={ty} x2="28" y2={ty} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <text x="20" y={ty + 3} fill="#64748b" fontSize="6.5" textAnchor="end" fontFamily="monospace">
                {t}°
              </text>
            </g>
          );
        })}
        {/* Tube outline */}
        <rect x="13" y="8" width="8" height="90" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {/* Mercury fill (animates via CSS) */}
        <rect
          x="14"
          y={8 + 90 - (pct / 100) * 90}
          width="6"
          height={(pct / 100) * 90}
          rx="3"
          fill={color}
          style={{ transition: 'all 1s ease-out' }}
        />
        {/* Bulb */}
        <circle cx="17" cy="110" r="10" fill={color} />
        <circle cx="17" cy="110" r="6" fill="rgba(255,255,255,0.2)" />
      </svg>
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black font-mono leading-none tracking-tight" style={{ color }}>
            {tempC.toFixed(1)}
          </span>
          <span className="text-sm font-mono text-slate-400 font-bold">°C</span>
        </div>
        {windChill !== undefined && (
          <div className="text-[10px] font-mono text-cyan-300 mt-2.5 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/25 inline-flex items-center gap-1.5">
            <span className="text-slate-400 text-[9px] uppercase">Wind Chill:</span>
            <span className="font-black text-white">{windChill}°C</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Simple & Intuitive Storm Index Card ──────────────────────────────────────
const StormIndexCard: React.FC<{ severity: number; isBlizzard?: boolean }> = ({ severity, isBlizzard }) => {
  const pct = Math.max(0, Math.min(1, severity));
  const score = Math.round(pct * 100);

  const status = isBlizzard || score >= 70
    ? {
        label: 'SEVERE',
        color: '#ef4444',
        badge: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse',
      }
    : score >= 40
    ? {
        label: 'MODERATE',
        color: '#f59e0b',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      }
    : {
        label: 'CALM',
        color: '#10b981',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };

  return (
    <div className="w-full bg-slate-900/60 p-3.5 rounded-xl border border-polar-border/60 font-mono space-y-3">
      {/* Header with Title and Large Clear Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudLightning className="w-4 h-4 flex-shrink-0" style={{ color: status.color }} />
          <span className="text-sm font-bold uppercase tracking-wider text-slate-100">
            Storm Index
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-black tracking-tight" style={{ color: status.color }}>
            {score}<span className="text-xs text-slate-400 font-semibold">/100</span>
          </span>
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${status.badge}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Clean 3-Stage Progress Gauge */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-1 h-2 rounded-full overflow-hidden bg-slate-950 p-0.5 border border-slate-800">
          {/* Calm Zone (0-40) */}
          <div className="relative rounded-l-full overflow-hidden bg-slate-800/80">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (score / 40) * 100)}%` }}
            />
          </div>
          {/* Moderate Zone (40-70) */}
          <div className="relative overflow-hidden bg-slate-800/80">
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: score > 40 ? `${Math.min(100, ((score - 40) / 30) * 100)}%` : '0%' }}
            />
          </div>
          {/* Severe Zone (70-100) */}
          <div className="relative rounded-r-full overflow-hidden bg-slate-800/80">
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: score > 70 ? `${Math.min(100, ((score - 70) / 30) * 100)}%` : '0%' }}
            />
          </div>
        </div>

        {/* Intuitive 3-Stage Labels */}
        <div className="flex justify-between text-[11px] px-0.5 pt-0.5">
          <span className={score < 40 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>Calm (0-40)</span>
          <span className={score >= 40 && score < 70 ? 'text-amber-400 font-bold' : 'text-slate-500'}>Moderate (40-70)</span>
          <span className={score >= 70 ? 'text-red-400 font-bold' : 'text-slate-500'}>Severe (70+)</span>
        </div>
      </div>
    </div>
  );
};

// ─── Visibility Beam ──────────────────────────────────────────────────────────
const VisibilityBeam: React.FC<{ km: number; maxKm?: number }> = ({ km, maxKm = 50 }) => {
  const pct = Math.min(100, (km / maxKm) * 100);
  const color = pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono text-slate-400">
        <span>0 km</span>
        <span className="font-bold" style={{ color }}>{km} km visibility</span>
        <span>{maxKm} km</span>
      </div>
      <div className="relative h-4 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${color}88, ${color})`,
          }}
        />
        {/* Fog overlay */}
        <div
          className="absolute inset-y-0 right-0 rounded-full"
          style={{
            width: `${100 - pct}%`,
            background: 'linear-gradient(to right, rgba(255,255,255,0.02), rgba(255,255,255,0.08))',
          }}
        />
      </div>
    </div>
  );
};

// ─── Interactive 24-Hour Forecast Archive Card ────────────────────────────────
const ForecastArchiveCard: React.FC<{
  label: string;
  data: number[];
  color: string;
  unit: string;
  timestamps?: string[];
}> = ({ label, data, color, unit, timestamps }) => {
  const [hovered, setHovered] = useState<{ val: number; time: string } | null>(null);

  const handleHover = useCallback((val: number | null, time: string | null) => {
    if (val !== null && time !== null) {
      setHovered({ val, time });
    } else {
      setHovered(null);
    }
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900/80 via-polar-dark/95 to-slate-950/90 p-3 rounded-xl border border-polar-border/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between h-full shadow-sm group">
      {/* Top Header: ONLY single graph name + hover-activated readout */}
      <div className="flex items-center justify-between text-xs font-mono mb-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 transition-all group-hover:scale-125"
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200">
            {label}
          </span>
        </div>

        {/* Hover-only data readout (zero layout shift in default state) */}
        <div className="text-right min-h-[16px] flex items-center justify-end">
          {hovered && (
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-[9px] text-slate-400 font-semibold">{hovered.time}</span>
              <span className="text-xs font-black text-white">
                {hovered.val.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">{unit}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pure graph canvas filling available card space with zero clutter */}
      <div className="flex-1 w-full min-h-[56px] relative">
        <SparklineChart
          data={data}
          color={color}
          height="100%"
          showArea
          interactive
          unit={unit}
          label={label}
          timestamps={timestamps}
          onHover={handleHover}
        />
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const EnvironmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const { liveSnapshot } = useLive dataStore();
  const snapshot = liveSnapshot[stationId];
  const env = snapshot?.environment;
  const isMaitri = stationId === 'maitri';

  // Live MET Norway API state
  const [metWeather, setMetWeather] = useState<any>(null);


  // Automatic live sync every 3 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const data = await live dataApi.getWeather(stationId);
        if (isMounted && data) {
          setMetWeather(data);
        }
      } catch (err) {
        console.warn('Live weather poll error:', err);
      }
    };

    fetchWeather();
    const timer = setInterval(fetchWeather, 3000); // 3-second automatic live sync
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [stationId]);

  // Weather parameters: MET Norway live values with simulation fallbacks
  const liveCur = metWeather?.current;
  const temp = liveCur?.temperature ?? env?.temperature ?? (isMaitri ? -25.2 : -18.4);
  const wind = liveCur?.wind_speed_kmh ?? env?.wind_speed ?? (isMaitri ? 34 : 28);
  const windMs = liveCur?.wind_speed_ms ?? (wind / 3.6);
  const gust = liveCur?.wind_gust_kmh ?? env?.wind_gust ?? (isMaitri ? 52 : 44);
  const solar = liveCur?.solar_radiation ?? env?.solar_radiation ?? 210;
  const visibility = env?.visibility ?? 18;
  const stormSev = env?.storm_severity ?? (wind > 60 ? 0.75 : wind > 40 ? 0.45 : 0.15);
  const humidity = liveCur?.humidity ?? env?.humidity ?? 68;
  const pressure = liveCur?.pressure ?? env?.pressure ?? 985;
  const condition = liveCur?.condition ?? env?.condition ?? 'Partly Cloudy';
  const windDir = liveCur?.wind_direction ?? env?.wind_direction ?? (isMaitri ? 220 : 310);
  const isBlizzard = liveCur?.blizzard_active ?? (env?.blizzard_active || wind > 70);
  const windChill = Math.round(
    13.12 + 0.6215 * temp - 11.37 * Math.pow(wind, 0.16) + 0.3965 * temp * Math.pow(wind, 0.16)
  );

  const getCardinal = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
  };
  const cardinal = getCardinal(windDir);

  // Hourly 24h history from MET Norway locationforecast timeseries if available
  const genHistory = (base: number, variance: number, n = 24) =>
    Array.from({ length: n }, (_, i) =>
      Number((base + Math.sin(i / 3.2) * variance * 0.75 + Math.cos(i / 4.8) * variance * 0.25).toFixed(1))
    );

  const tempHistory = metWeather?.forecast_24h?.length
    ? metWeather.forecast_24h.map((f: any) => f.temperature)
    : genHistory(temp, 3);

  const windHistory = metWeather?.forecast_24h?.length
    ? metWeather.forecast_24h.map((f: any) => f.wind_speed_kmh)
    : genHistory(wind, 10);

  const solarHistory = Array.from({ length: 24 }, (_, i) =>
    i < 6 || i > 20 ? 0 : Math.max(0, solar * Math.sin(((i - 6) / 14) * Math.PI))
  );

  const pressureHistory = metWeather?.forecast_24h?.length
    ? metWeather.forecast_24h.map((f: any) => f.pressure)
    : genHistory(pressure, 2);

  const forecastTimestamps = metWeather?.forecast_24h?.length
    ? metWeather.forecast_24h.map((f: any, i: number) => {
        const hoursAgo = metWeather.forecast_24h.length - 1 - i;
        const timeStr = f.time
          ? new Date(f.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          : '';
        return hoursAgo === 0 ? 'Now' : `${timeStr ? `${timeStr} ` : ''}(-${hoursAgo}h)`;
      })
    : Array.from({ length: 24 }, (_, i) => (i === 23 ? 'Now' : `-${23 - i}h`));

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Banner — Clean & Unified without manual buttons */}
      <div className={`glass-panel px-5 py-3.5 rounded-2xl border relative overflow-hidden ${isBlizzard ? 'border-red-500/50' : 'border-polar-border'}`}>
        {isBlizzard && (
          <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-white capitalize">
              {stationId} Antarctic Microclimate
            </h1>
          </div>

          {/* Top Status Live data Capsules & Navigation */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-cyan-950/40 via-polar-darker/80 to-polar-dark/60 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl shadow-sm backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono tracking-widest uppercase text-cyan-400/80 leading-none">Condition</span>
                <span className="text-xs font-bold font-mono text-white leading-tight mt-0.5">{condition}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-950/40 via-polar-darker/80 to-polar-dark/60 border border-blue-500/30 px-3.5 py-1.5 rounded-xl shadow-sm backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono tracking-widest uppercase text-blue-400/80 leading-none">Wind Chill</span>
                <span className="text-xs font-black font-mono text-blue-300 leading-tight mt-0.5">{windChill}°C</span>
              </div>
            </div>

            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-1.5 transition-all cursor-pointer">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=environment`)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <Brain className="w-3.5 h-3.5 text-purple-400" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/environment' : '/station/maitri/environment')}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-blue-400/50 text-white flex items-center gap-1.5 transition-all cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Switch Station
            </button>
          </div>
        </div>
      </div>

      {/* Main Instrument Panel — Balanced 3-column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">

        {/* ── LEFT: Wind Vector Analysis & Polar Dynamics (col-span-1) ── */}
        <div className="xl:col-span-1 glass-panel p-4 rounded-2xl border border-polar-border flex flex-col justify-between gap-3.5 h-full">
          {/* Highlighted Wind Vector Analysis Header */}
          <div className="p-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900/90 border border-cyan-500/40 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping absolute opacity-75" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 relative" />
              </div>
              <span className="text-xs font-mono font-black tracking-wider uppercase text-cyan-300">
                Wind Vector Analysis
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 shadow-sm flex items-baseline gap-1">
              <span className="text-sm font-mono font-black text-cyan-300 tracking-tight">
                {windMs.toFixed(1)}
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-400">m/s</span>
            </div>
          </div>

          {/* Clean Wind Compass (Unobstructed Needle) */}
          <div className="flex justify-center my-auto">
            <WindCompass
              direction={windDir}
              speed={wind}
              gust={gust}
              size={185}
              color={isMaitri ? '#818cf8' : '#60a5fa'}
            />
          </div>

          {/* Primary Wind Live data Card (Information outside compass) */}
          <div className="w-full bg-gradient-to-br from-slate-900/95 via-polar-dark to-slate-950/95 p-3 rounded-xl border border-cyan-500/30 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
                <Wind className="w-3 h-3 text-cyan-400" />
                Wind Live data
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                SURFACE VECTOR
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <div className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Surface Speed</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {wind.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400">km/h</span>
                </div>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <div className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Heading / Bearing</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black font-mono text-indigo-300">
                    {cardinal}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    • {Math.round(((windDir % 360) + 360) % 360)}°
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gust & Vector Live data Cards */}
          <div className="w-full grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-gradient-to-br from-amber-500/10 via-polar-dark/90 to-polar-darker/90 p-2.5 rounded-xl border border-amber-500/25 shadow-sm">
              <div className="flex items-center justify-between text-[9px] text-amber-400/90 uppercase tracking-wider mb-0.5">
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-amber-400" />
                  <span>Gust Peak</span>
                </span>
                <span className="text-[8px] text-amber-500/80 font-bold">MAX</span>
              </div>
              <div className="text-base font-black text-white tracking-tight">
                {gust} <span className="text-[10px] font-medium text-amber-400/80">km/h</span>
              </div>
              <div className="w-full bg-slate-800/80 h-1 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (gust / 90) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 via-polar-dark/90 to-polar-darker/90 p-2.5 rounded-xl border border-indigo-500/25 shadow-sm">
              <div className="flex items-center justify-between text-[9px] text-indigo-400/90 uppercase tracking-wider mb-0.5">
                <span className="flex items-center gap-1">
                  <Compass className="w-3 h-3 text-indigo-400" />
                  <span>Azimuth</span>
                </span>
                <span className="text-[8px] text-indigo-400/80 font-bold">DIR</span>
              </div>
              <div className="text-base font-black text-white tracking-tight">
                {Math.round(((windDir % 360) + 360) % 360)}° <span className="text-xs font-bold text-indigo-300">{cardinal}</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-1 truncate">
                Polar downslope wind Drainage
              </div>
            </div>
          </div>

          {/* Polar Weather layer Flow Dynamics */}
          <div className="w-full bg-gradient-to-br from-cyan-950/20 via-polar-dark/95 to-polar-darker/95 p-3 rounded-xl border border-cyan-500/20 shadow-md space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Polar downslope wind Dynamics</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                wind > 50 
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' 
                  : wind > 30 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {wind > 50 ? 'GALE INFLOW' : wind > 30 ? 'MODERATE ADVECTION' : 'NOMINAL DRAINAGE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-polar-border/40 text-center flex flex-col items-center justify-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide text-center">Polar Air Weight per volume</div>
                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5 text-center">
                  1.39 <span className="text-xs text-slate-400 font-medium">kg/m³</span>
                </div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-polar-border/40 text-center flex flex-col items-center justify-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide text-center">Wind Velocity</div>
                <div className="text-base sm:text-lg font-black font-mono text-cyan-300 mt-0.5 text-center">
                  {windMs.toFixed(1)} <span className="text-xs text-slate-400 font-medium">m/s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Storm Index at the Bottom of the Card */}
          <StormIndexCard severity={stormSev} isBlizzard={isBlizzard} />
        </div>

        {/* ── CENTER: Primary Readouts + Visibility + Cascade (col-span-2) ── */}
        <div className="xl:col-span-2 flex flex-col gap-4 justify-between h-full">
          {/* Primary Instruments */}
          <div className="glass-panel p-4 rounded-2xl border border-polar-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Primary Instrument Readout</span>
              <span className="text-emerald-400 text-[9px] font-bold">LIVE LIVE DATA</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Ambient Temperature */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-polar-border/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between min-h-[175px] shadow-sm group">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Thermometer className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                      Ambient Temp
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-bold">
                    PT100 RTD
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center pt-2">
                  <MercuryThermometer tempC={temp} windChill={windChill} />
                </div>
              </div>

              {/* 2. Solar Radiation */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-polar-border/60 hover:border-amber-500/40 transition-all flex flex-col justify-between min-h-[175px] shadow-sm group">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Sun className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                      Solar Radiation
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25 font-bold">
                    SOLAR RADIATION SENSOR
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center pt-1">
                  <IndustrialGauge
                    value={solar}
                    min={0}
                    max={600}
                    unit="W/m²"
                    size={128}
                    accentColor="#f59e0b"
                    warningThreshold={450}
                  />
                </div>
              </div>

              {/* 3. Air pressure Pressure */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-polar-border/60 hover:border-purple-500/40 transition-all flex flex-col justify-between min-h-[175px] shadow-sm group">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                      <Gauge className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                      Air pressure Pressure
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/25 font-bold">
                    BAROMETER
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center pt-1">
                  <IndustrialGauge
                    value={pressure}
                    min={940}
                    max={1050}
                    unit="hPa"
                    size={128}
                    accentColor="#a78bfa"
                    warningThreshold={965}
                    criticalThreshold={950}
                  />
                </div>
              </div>

              {/* 4. Relative Humidity */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-polar-border/60 hover:border-sky-500/40 transition-all flex flex-col justify-between min-h-[175px] shadow-sm group">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                      <Droplets className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                      Rel. Humidity
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25 font-bold">
                    HYGROMETER
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center pt-1">
                  <IndustrialGauge
                    value={humidity}
                    min={0}
                    max={100}
                    unit="%"
                    size={128}
                    accentColor="#38bdf8"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visibility beam */}
          <div className="glass-panel p-4 rounded-2xl border border-polar-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Eye className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">Optical Visibility</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">Meteorological Optical Range</span>
            </div>
            <VisibilityBeam km={visibility} maxKm={50} />
          </div>

          {/* Cross-domain cascade impact */}
          <div className="glass-panel p-4 rounded-2xl border border-polar-border">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Climate → Systems Cascade Impact
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                Live Weather → Simulation Engine
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                {
                  title: 'Heating Energy Demand',
                  val: `${snapshot?.energy?.heating_load ?? 32} kW`,
                  desc: `Driven by ${temp.toFixed(1)}°C ambient`,
                  color: 'text-orange-400',
                  icon: '🔥',
                },
                {
                  title: 'Water Freeze Hazard',
                  val: snapshot?.water?.freeze_risk ?? 'Low',
                  desc: `Pipe temp ${snapshot?.water?.pipe_temp_c ?? 3.8}°C`,
                  color: 'text-blue-400',
                  icon: '❄️',
                },
                {
                  title: 'Structural Wind Load',
                  val: `${Math.round((wind / 150) * 100)}% rated`,
                  desc: `${wind} km/h (${windMs.toFixed(1)} m/s) stress`,
                  color: 'text-purple-400',
                  icon: '🏗️',
                },
                {
                  title: 'Traverse Feasibility',
                  val: stormSev < 0.3 ? 'GO' : stormSev < 0.6 ? 'CAUTION' : 'NO-GO',
                  desc: `Storm index ${(stormSev * 100).toFixed(0)}%`,
                  color: stormSev < 0.3 ? 'text-emerald-400' : stormSev < 0.6 ? 'text-yellow-400' : 'text-red-400',
                  icon: '🚛',
                },
              ].map((item) => (
                <div key={item.title} className="bg-polar-dark/80 p-3 rounded-xl border border-polar-border flex flex-col items-center justify-center text-center gap-1.5 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-sm">{item.icon}</span>
                    <span className="font-semibold text-white text-[11px] tracking-wide">{item.title}</span>
                  </div>
                  <div className={`text-lg font-black font-mono tracking-tight ${item.color}`}>{item.val}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: 24h Trends & Sensor Array (col-span-1) ── */}
        <div className="xl:col-span-1 glass-panel p-4 rounded-2xl border border-polar-border flex flex-col justify-between gap-3 h-full">
          {/* Header */}
          <div className="p-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-900/90 via-polar-dark to-slate-950/90 border border-polar-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                24-Hour Forecast Archive
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
              MET TIMESERIES
            </span>
          </div>

          {/* Evenly Spaced 4 Archive Trend Graphs Filling Empty Space */}
          <div className="grid grid-rows-4 gap-2.5 flex-1 min-h-[400px]">
            {[
              { label: 'Temperature', data: tempHistory, color: '#06b6d4', unit: '°C' },
              { label: 'Wind Velocity', data: windHistory, color: '#818cf8', unit: 'km/h' },
              { label: 'Solar Radiation', data: solarHistory, color: '#f59e0b', unit: 'W/m²' },
              { label: 'Air pressure Pressure', data: pressureHistory, color: '#a78bfa', unit: 'hPa' },
            ].map((trend) => (
              <ForecastArchiveCard
                key={trend.label}
                label={trend.label}
                data={trend.data}
                color={trend.color}
                unit={trend.unit}
                timestamps={forecastTimestamps}
              />
            ))}
          </div>

          {/* Meteorological Sensors Array */}
          <div className="pt-2 border-t border-polar-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-slate-400">
              <span>Meteorological Sensors</span>
              <span className="text-emerald-400 font-bold">6/6 ONLINE</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
              {['Wind speed sensor', 'Solar radiation sensor', 'Temperature sensor', 'Barograph', 'Cloud height sensor', 'Hygrometer'].map((sensor) => (
                <div key={sensor} className="bg-slate-900/60 px-2 py-1.5 rounded-lg border border-polar-border/40 flex items-center justify-between">
                  <span className="text-slate-400 text-[9px]">{sensor}</span>
                  <span className="flex items-center gap-1 text-emerald-400 text-[8px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Blizzard Alert Banner */}
      {isBlizzard && (
        <div className="glass-panel p-4 rounded-2xl border border-red-500/60 bg-red-500/10 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-black text-red-300 font-mono uppercase tracking-wide">
                BLIZZARD CONDITIONS ACTIVE — STATION LOCKDOWN PROTOCOL IN FORCE
              </div>
              <div className="text-xs text-red-400/80 font-mono mt-0.5">
                Wind speed {wind} km/h ({windMs.toFixed(1)} m/s) exceeds safe operational threshold (70 km/h). All exterior operations suspended.
                Life-support priority mode active.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SECTION DIVIDER — EXTENDED WEATHER LAYER INTELLIGENCE
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest px-2">Extended Weather layer Intelligence</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      </div>

      {/* ── EXTENDED ROW: 5 new weather layer panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* ─── 1. SKY CONDITIONS ──────────────────────────────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden group hover:border-sky-400/50 transition-all">
          {/* Subtle sky gradient bg */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'radial-gradient(ellipse at 60% 20%, rgba(56,189,248,0.06) 0%, transparent 70%)' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">Sky Conditions</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">Cloud height sensor · Cloud Cover · Optical Range</div>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold bg-sky-500/10 border-sky-500/30 text-sky-300">LIVE</span>
          </div>

          {/* Big sky condition icon + label */}
          {(() => {
            const cond = condition.toLowerCase();
            const isClear = cond.includes('clear') || cond.includes('sunny');
            const isPartly = cond.includes('partly') || cond.includes('scattered');
            const isOvercast = cond.includes('overcast') || cond.includes('cloudy');
            const isSnow = cond.includes('snow') || cond.includes('blizzard');
            const emoji = isSnow ? '🌨️' : isOvercast ? '☁️' : isPartly ? '⛅' : isClear ? '🌤️' : '🌫️';
            const coverPct = isSnow ? 100 : isOvercast ? 90 : isPartly ? 55 : isClear ? 10 : 75;
            const ceilKm = isSnow ? 0.4 : isOvercast ? 1.2 : isPartly ? 3.5 : isClear ? 8.0 : 0.8;
            const oktas = isSnow ? 8 : isOvercast ? 7 : isPartly ? 4 : isClear ? 1 : 6;
            const skyColor = isSnow ? '#818cf8' : isOvercast ? '#64748b' : isPartly ? '#38bdf8' : '#fbbf24';
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{emoji}</span>
                  <div>
                    <div className="text-base font-black text-white capitalize">{condition}</div>
                    <div className="text-[10px] font-mono mt-1" style={{ color: skyColor }}>{oktas}/8 Oktas cloud cover</div>
                  </div>
                </div>
                {/* Cloud cover bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>Cloud Cover</span>
                    <span style={{ color: skyColor }}>{coverPct}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${coverPct}%`, background: `linear-gradient(to right, ${skyColor}88, ${skyColor})` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Ceiling', val: `${ceilKm} km`, color: skyColor },
                    { label: 'Visibility', val: `${visibility} km`, color: visibility > 20 ? '#10b981' : visibility > 8 ? '#f59e0b' : '#ef4444' },
                    { label: 'UV Index', val: isMaitri ? (isClear ? '3' : '1') : (isClear ? '4' : '2'), color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-900/60 p-2 rounded-xl border border-polar-border text-center">
                      <div className="text-[8px] font-mono text-slate-500 uppercase">{s.label}</div>
                      <div className="text-xs font-black font-mono mt-0.5" style={{ color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── 2. WEATHER LAYER PRESSURE ANALYSIS ─────────────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden group hover:border-purple-400/50 transition-all">
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'radial-gradient(ellipse at 40% 80%, rgba(167,139,250,0.06) 0%, transparent 70%)' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">Weather layer Pressure</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">Air pressure Trend · Pressure Tendency</div>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold bg-purple-500/10 border-purple-500/30 text-purple-300">BAROMETER</span>
          </div>

          {(() => {
            const trend = pressure > 1005 ? 'RISING' : pressure > 990 ? 'STEADY' : 'FALLING';
            const trendColor = trend === 'RISING' ? '#10b981' : trend === 'STEADY' ? '#f59e0b' : '#ef4444';
            const trendArrow = trend === 'RISING' ? '↑' : trend === 'STEADY' ? '→' : '↓';
            const trendDesc = trend === 'RISING'
              ? 'Improving weather expected. High pressure system building over station.'
              : trend === 'STEADY'
              ? 'Stable weather layer mass overhead. Conditions holding.'
              : 'Low pressure approaching. Deteriorating weather likely within 12–24h.';
            const normPressure = isMaitri ? 984 : 991; // typical Antarctic values
            const deviation = (pressure - normPressure).toFixed(1);
            const pctOfRange = Math.max(0, Math.min(100, ((pressure - 940) / (1050 - 940)) * 100));
            return (
              <div className="space-y-4">
                {/* Big pressure readout */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black font-mono text-purple-300">{pressure}</span>
                      <span className="text-sm font-mono text-slate-400">hPa</span>
                    </div>
                    <div className="text-[10px] font-mono mt-1 flex items-center gap-1.5">
                      <span style={{ color: trendColor, fontSize: 16 }}>{trendArrow}</span>
                      <span className="font-bold" style={{ color: trendColor }}>{trend}</span>
                      <span className="text-slate-500">· {Number(deviation) >= 0 ? '+' : ''}{deviation} hPa vs seasonal norm</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Standard Antarctic</div>
                    <div className="text-sm font-black font-mono text-slate-300">{normPressure} hPa</div>
                  </div>
                </div>
                {/* Pressure scale */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>940 hPa (Low)</span>
                    <span>1050 hPa (High)</span>
                  </div>
                  <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-l-full" style={{ width: '33%', background: 'linear-gradient(to right, #ef444488, #ef4444)' }} />
                    <div className="absolute top-0 h-full" style={{ left: '33%', width: '33%', background: 'linear-gradient(to right, #f59e0b, #10b981)' }} />
                    <div className="absolute top-0 h-full rounded-r-full" style={{ left: '66%', width: '34%', background: 'linear-gradient(to right, #10b981, #38bdf8)' }} />
                    {/* Needle */}
                    <div className="absolute top-0 w-0.5 h-full bg-white shadow-lg rounded-full" style={{ left: `${pctOfRange}%`, transition: 'left 0.7s ease' }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-red-400">Storm</span>
                    <span className="text-amber-400">Variable</span>
                    <span className="text-emerald-400">Fair</span>
                    <span className="text-sky-400">Very High</span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed p-2.5 rounded-lg bg-slate-900/40 border border-polar-border/40">{trendDesc}</p>
              </div>
            );
          })()}
        </div>

        {/* ─── 3. WARMER / WETTER CLIMATE TREND ─────────────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden group hover:border-orange-400/50 transition-all">
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(251,146,60,0.06) 0%, transparent 70%)' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">Warmer / Wetter Index</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">Anomaly vs 30-year baseline · NCPOR climatology</div>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold bg-orange-500/10 border-orange-500/30 text-orange-300">ANOMALY</span>
          </div>

          {(() => {
            const tempAnomaly = isMaitri ? +1.8 : +2.1; // °C above 30-yr mean
            const humidAnomaly = isMaitri ? +4.2 : +3.8; // % above mean
            const precipAnomaly = isMaitri ? +12 : +8; // mm above seasonal mean
            const warmColor = tempAnomaly > 0 ? '#f97316' : '#38bdf8';
            const wetColor = humidAnomaly > 0 ? '#38bdf8' : '#f97316';
            return (
              <div className="space-y-4">
                {/* Anomaly overview cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Temp Anomaly', val: `+${tempAnomaly}°C`, color: '#f97316', icon: '🌡️', desc: 'vs 30-yr mean' },
                    { label: 'Humidity Δ', val: `+${humidAnomaly}%`, color: '#38bdf8', icon: '💧', desc: 'above baseline' },
                    { label: 'Precip Δ', val: `+${precipAnomaly} mm`, color: '#818cf8', icon: '❄️', desc: 'seasonal excess' },
                  ].map(a => (
                    <div key={a.label} className="bg-slate-900/60 p-2.5 rounded-xl border border-polar-border text-center">
                      <div className="text-lg mb-1">{a.icon}</div>
                      <div className="text-xs font-black font-mono" style={{ color: a.color }}>{a.val}</div>
                      <div className="text-[8px] font-mono text-slate-500 mt-0.5">{a.label}</div>
                    </div>
                  ))}
                </div>
                {/* Warmer bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>Temperature vs Baseline</span>
                    <span className="font-bold" style={{ color: warmColor }}>{tempAnomaly > 0 ? 'WARMER' : 'COOLER'} +{Math.abs(tempAnomaly)}°C</span>
                  </div>
                  <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-full rounded-r-full transition-all duration-700"
                      style={{ width: `${Math.min(50, (Math.abs(tempAnomaly) / 5) * 50)}%`, background: `${warmColor}cc` }} />
                    <div className="absolute inset-y-0 left-1/2 w-0.5 h-full bg-slate-400" />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Cooler ←</span>
                    <span>Baseline</span>
                    <span>→ Warmer</span>
                  </div>
                </div>
                {/* Context blurb */}
                <div className="p-3 rounded-xl border text-[10px] font-mono leading-relaxed"
                  style={{ backgroundColor: '#f9731608', borderColor: '#f9731630', color: '#fdba74' }}>
                  {isMaitri
                    ? `Schirmacher Oasis is running +${tempAnomaly}°C above the 1989–2020 climate baseline. Accelerated snow melt observed in summer. Lake Priyadarshini ice-out now 12 days earlier than 2000 records.`
                    : `Larsemann Hills air mass is +${tempAnomaly}°C above the 1991–2020 NCPOR baseline. Prydz Bay sea-ice extent tracking 8% below decadal median. Coastal erosion rate elevated.`}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── 4. ROTATING STORM ACTIVITY & NATURAL CALAMITIES ─────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden group hover:border-red-400/50 transition-all lg:col-span-1">
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.06) 0%, transparent 70%)' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <CloudLightning className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">Rotating storm Activity</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">Polar Spinning air mass · Calamities · Storm Track</div>
              </div>
            </div>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-bold ${
              stormSev > 0.65 ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
              : stormSev > 0.35 ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            }`}>
              {stormSev > 0.65 ? 'SEVERE' : stormSev > 0.35 ? 'WATCH' : 'CALM'}
            </span>
          </div>

          {(() => {
            const polar downslope windRisk = wind > 60 ? 'HIGH' : wind > 35 ? 'MODERATE' : 'LOW';
            const blizzardRisk = stormSev > 0.65 ? 'ACTIVE' : stormSev > 0.4 ? 'DEVELOPING' : 'CLEAR';
            const seismicRisk = 'LOW'; // Antarctica is seismically quiet
            const polarSpinning air massIdx = isMaitri ? 62 : 71; // 0-100 spinning air mass intensity
            const spinning air massColor = polarSpinning air massIdx > 70 ? '#ef4444' : polarSpinning air massIdx > 50 ? '#f59e0b' : '#10b981';
            const events: { name: string; status: string; color: string; detail: string }[] = [
              { name: '🌀 Polar downslope wind Gale', status: polar downslope windRisk, color: polar downslope windRisk === 'HIGH' ? '#ef4444' : polar downslope windRisk === 'MODERATE' ? '#f59e0b' : '#10b981', detail: `${wind} km/h drainage flow from polar plateau` },
              { name: '❄️ Blizzard System', status: blizzardRisk, color: blizzardRisk === 'ACTIVE' ? '#ef4444' : blizzardRisk === 'DEVELOPING' ? '#f59e0b' : '#10b981', detail: `Storm index: ${Math.round(stormSev * 100)}/100` },
              { name: '🌊 Coastal Storm Surge', status: isMaitri ? 'N/A' : (wind > 50 ? 'WATCH' : 'CALM'), color: isMaitri ? '#475569' : (wind > 50 ? '#f59e0b' : '#10b981'), detail: isMaitri ? 'Inland station — not applicable' : `Prydz Bay swell ${wind > 50 ? '2.8m est.' : '0.8m nominal'}` },
              { name: '🏔️ Seismic Activity', status: seismicRisk, color: '#10b981', detail: 'Last event: M1.2 · 340 km NE · 8 days ago' },
              { name: '🌪️ Polar Spinning air mass', status: polarSpinning air massIdx > 70 ? 'STRONG' : polarSpinning air massIdx > 50 ? 'MODERATE' : 'WEAK', color: spinning air massColor, detail: `Spinning air mass intensity index: ${polarSpinning air massIdx}/100` },
            ];
            return (
              <div className="space-y-2.5">
                {events.map(ev => (
                  <div key={ev.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-polar-border/50 hover:border-slate-700 transition-colors">
                    <div>
                      <div className="text-xs font-bold font-mono text-white">{ev.name}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">{ev.detail}</div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold ml-3 flex-shrink-0"
                      style={{ backgroundColor: `${ev.color}15`, borderColor: `${ev.color}40`, color: ev.color }}>
                      {ev.status}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* ─── 5. SPACE WEATHER ──────────────────────────────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden group hover:border-violet-400/50 transition-all xl:col-span-2">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(56,189,248,0.04) 0%, transparent 60%)' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">Space Weather</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">Solar Activity · Upper atmosphere · Aurora · Outer magnetic field region</div>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold bg-violet-500/10 border-violet-500/30 text-violet-300">ISRO · IIG PUNE</span>
          </div>

          {(() => {
            // Station-realistic space weather data
            const kpIndex = isMaitri ? 3.2 : 4.1; // Earth magnetic field Kp index 0-9
            const kpColor = kpIndex > 6 ? '#ef4444' : kpIndex > 4 ? '#f59e0b' : '#10b981';
            const kpLabel = kpIndex > 6 ? 'SEVERE STORM' : kpIndex > 4 ? 'ACTIVE' : kpIndex > 2 ? 'UNSETTLED' : 'QUIET';
            const solarFlux = isMaitri ? 142 : 148; // F10.7 cm radio flux
            const auroraBrightness = isMaitri ? 'KP3 — Faint Glow' : 'KP4 — Diffuse Aurora';
            const auroraColor = isMaitri ? '#a855f7' : '#818cf8';
            const upper atmosphereState = kpIndex > 4 ? 'DISTURBED' : 'QUIET';
            const solarWindSpeed = isMaitri ? 420 : 480; // km/s
            const bz = isMaitri ? -4.2 : -6.8; // Bz component (negative = southward = aurora)
            const bzColor = bz < -5 ? '#ef4444' : bz < -2 ? '#f59e0b' : '#10b981';
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left — Kp index + aurora status */}
                <div className="space-y-4">
                  {/* Kp meter */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-violet-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Kp Earth magnetic field Index</div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold"
                        style={{ backgroundColor: `${kpColor}15`, borderColor: `${kpColor}40`, color: kpColor }}>{kpLabel}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-4xl font-black font-mono" style={{ color: kpColor }}>{kpIndex.toFixed(1)}</span>
                      <span className="text-sm font-mono text-slate-400">/ 9.0</span>
                    </div>
                    {/* Kp scale bars */}
                    <div className="flex gap-1">
                      {[0,1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className="flex-1 h-4 rounded-sm transition-all duration-500"
                          style={{ backgroundColor: kpIndex > i ? (i > 5 ? '#ef4444' : i > 3 ? '#f59e0b' : '#10b981') : '#1e293b', opacity: kpIndex > i ? 1 : 0.4 }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1">
                      <span>0 Quiet</span><span>5 Active</span><span>9 Extreme</span>
                    </div>
                  </div>

                  {/* Aurora status */}
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-purple-500/20 flex items-start gap-3">
                    <div className="text-3xl">🌌</div>
                    <div>
                      <div className="text-xs font-bold text-white">Aurora Australis</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: auroraColor }}>{auroraBrightness}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-1">
                        {isMaitri
                          ? 'Faint aurora visible toward southern magnetic pole direction. 74° Earth magnetic field lat — good auroral oval position.'
                          : 'Diffuse arc visible 12–24° above horizon. Station sits within outer auroral zone during moderate activity.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right — Solar wind + upper atmosphere grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Solar Wind', val: `${solarWindSpeed} km/s`, color: '#f59e0b', icon: '☀️', desc: 'ACE satellite measure' },
                      { label: 'Bz Component', val: `${bz} nT`, color: bzColor, icon: '🧭', desc: bz < -5 ? 'Southward — aurora likely' : 'Northward — quiet' },
                      { label: 'F10.7 Flux', val: `${solarFlux} sfu`, color: '#818cf8', icon: '📡', desc: '10.7cm radio flux' },
                      { label: 'Upper atmosphere', val: upper atmosphereState, color: upper atmosphereState === 'DISTURBED' ? '#f59e0b' : '#10b981', icon: '🌐', desc: 'HF signal spread state' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-900/60 p-3 rounded-xl border border-polar-border text-center">
                        <div className="text-xl mb-1">{s.icon}</div>
                        <div className="text-xs font-black font-mono" style={{ color: s.color }}>{s.val}</div>
                        <div className="text-[8px] font-mono text-slate-500 mt-0.5">{s.label}</div>
                        <div className="text-[8px] font-mono text-slate-600 mt-0.5">{s.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* HF Impact note */}
                  <div className="p-3 rounded-xl text-[9px] font-mono leading-relaxed border"
                    style={{ backgroundColor: kpIndex > 4 ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)', borderColor: kpIndex > 4 ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)', color: kpIndex > 4 ? '#fca5a5' : '#6ee7b7' }}>
                    <strong>HF Radio Impact:</strong>{' '}
                    {kpIndex > 5
                      ? 'BLACKOUT conditions on HF frequencies. Use satellite backup for emergency communications. SATCOM uptime priority.'
                      : kpIndex > 3
                      ? 'Degraded HF signal spread on polar paths. Some signal dropout expected on 14–21 MHz bands. Satellite link recommended.'
                      : 'HF signal spread nominal. All frequency bands operational. LEO satellite link unaffected.'}
                  </div>

                  {/* Station-specific geo context */}
                  <div className="p-2.5 rounded-xl bg-slate-900/40 border border-polar-border/40 text-[9px] font-mono text-slate-500 leading-relaxed">
                    {isMaitri
                      ? '🔬 Maitri operates a fluxgate magnetic field sensor (IIG Pune). Data contributes to INTERMAGNET global Earth magnetic field network. Conjugate point studies with Maitri-Tromsø (Norway) pair ongoing.'
                      : '🔭 Bharati hosts Light spectrum analyzer for aurora spectroscopy and an all-sky imager. Real-time data shared with Indian Institute of Geomagnetism. Conjugate pair: Bharati–Longyearbyen.'}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};

