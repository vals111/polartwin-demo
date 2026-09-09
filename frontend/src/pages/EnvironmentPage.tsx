import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { telemetryApi } from '../api/client';
import { WindCompass } from '../components/charts/WindCompass';
import { IndustrialGauge } from '../components/charts/IndustrialGauge';
import { SparklineChart } from '../components/charts/SparklineChart';
import {
  Thermometer, Eye, Sun, AlertTriangle, ShieldCheck,
  Wind, Waves, Droplets, Gauge
} from 'lucide-react';

// ─── Animated Mercury Thermometer ───────────────────────────────────────────
const MercuryThermometer: React.FC<{ tempC: number }> = ({ tempC }) => {
  const MIN = -60;
  const MAX = 10;
  const pct = Math.max(0, Math.min(100, ((tempC - MIN) / (MAX - MIN)) * 100));
  const color = tempC < -40 ? '#818cf8' : tempC < -20 ? '#06b6d4' : tempC < 0 ? '#3b82f6' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Ambient Temp</div>
      <div className="flex items-end gap-3">
        {/* Thermometer SVG */}
        <svg width="36" height="160" viewBox="0 0 36 160">
          {/* Scale ticks */}
          {[-60, -40, -20, 0, 10].map((t) => {
            const ty = 10 + ((MAX - t) / (MAX - MIN)) * 120;
            return (
              <g key={t}>
                <line x1="24" y1={ty} x2="30" y2={ty} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text x="22" y={ty + 3} fill="#64748b" fontSize="7" textAnchor="end" fontFamily="monospace">
                  {t}°
                </text>
              </g>
            );
          })}
          {/* Tube outline */}
          <rect x="14" y="10" width="8" height="120" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {/* Mercury fill (animates via CSS) */}
          <rect
            x="15"
            y={10 + 120 - (pct / 100) * 120}
            width="6"
            height={(pct / 100) * 120}
            rx="3"
            fill={color}
            style={{ transition: 'all 1s ease-out', filter: `drop-shadow(0 0 4px ${color})` }}
          />
          {/* Bulb */}
          <circle cx="18" cy="140" r="10" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
          <circle cx="18" cy="140" r="6" fill="rgba(255,255,255,0.2)" />
        </svg>
        <div>
          <div className="text-4xl font-black font-mono leading-none" style={{ color }}>
            {tempC.toFixed(1)}
          </div>
          <div className="text-base font-mono text-slate-400 mt-1">°C</div>
        </div>
      </div>
    </div>
  );
};

// ─── Storm Severity Ring ─────────────────────────────────────────────────────
const StormSeverityRing: React.FC<{ severity: number }> = ({ severity }) => {
  const pct = Math.max(0, Math.min(1, severity));
  const color = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f59e0b' : '#10b981';
  const label = pct > 0.7 ? 'SEVERE' : pct > 0.4 ? 'MODERATE' : 'CALM';
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Storm Index</div>
      <div className="relative">
        <svg width="110" height="110" viewBox="0 0 110 110">
          {/* Background ring */}
          <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          {/* Filled arc */}
          <circle
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 55 55)"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out', filter: `drop-shadow(0 0 6px ${color})` }}
          />
          {/* Label */}
          <text x="55" y="50" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="monospace">
            {(pct * 100).toFixed(0)}
          </text>
          <text x="55" y="63" textAnchor="middle" fill={color} fontSize="8" fontFamily="monospace">
            {label}
          </text>
        </svg>
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
            boxShadow: `0 0 12px ${color}55`,
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export const EnvironmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const { liveSnapshot } = useTelemetryStore();
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
        const data = await telemetryApi.getWeather(stationId);
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

  // Hourly 24h history from MET Norway locationforecast timeseries if available
  const genHistory = (base: number, variance: number, n = 24) =>
    Array.from({ length: n }, (_, i) => base + (Math.random() - 0.5) * variance * 2 + Math.sin(i / 4) * variance * 0.5);

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

          {/* Clean condition readouts */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-polar-darker border border-polar-border rounded-xl px-3 py-1.5 text-xs font-mono flex items-center gap-2">
              <span className="text-slate-500 text-[9px] uppercase tracking-wider">Condition</span>
              <span className="text-white font-bold">{condition}</span>
            </div>
            <div className="bg-polar-darker border border-polar-border rounded-xl px-3 py-1.5 text-xs font-mono flex items-center gap-2">
              <span className="text-slate-500 text-[9px] uppercase tracking-wider">Wind Chill</span>
              <span className="text-blue-300 font-bold">{windChill}°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Instrument Panel — Balanced 3-column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">

        {/* ── LEFT: Wind Vector Analysis & Polar Dynamics (col-span-1) ── */}
        <div className="xl:col-span-1 glass-panel p-4 rounded-2xl border border-polar-border flex flex-col justify-between gap-4 h-full">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between w-full">
            <span>Wind Vector Analysis</span>
            <span className="text-cyan-400 font-bold">{windMs.toFixed(1)} m/s</span>
          </div>

          <div className="flex justify-center my-auto">
            <WindCompass
              direction={windDir}
              speed={wind}
              gust={gust}
              size={185}
              color={isMaitri ? '#818cf8' : '#60a5fa'}
            />
          </div>

          <StormSeverityRing severity={stormSev} />

          {/* Gust & Wind Chill cards */}
          <div className="w-full grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-polar-dark/80 p-2.5 rounded-xl border border-polar-border text-center">
              <div className="text-slate-500 text-[9px] mb-0.5">GUST PEAK</div>
              <div className="text-white font-bold">{gust} km/h</div>
            </div>
            <div className="bg-polar-dark/80 p-2.5 rounded-xl border border-polar-border text-center">
              <div className="text-slate-500 text-[9px] mb-0.5">WIND CHILL</div>
              <div className="text-blue-300 font-bold">{windChill}°C</div>
            </div>
          </div>

          {/* Polar Atmospheric Flow Dynamics (balances height with center column) */}
          <div className="w-full bg-polar-dark/80 p-3 rounded-xl border border-polar-border text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 uppercase tracking-wider">Katabatic Flow</span>
              <span className={wind > 50 ? 'text-red-400 font-bold' : wind > 30 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {wind > 50 ? 'GALE FORCE' : wind > 30 ? 'MODERATE ADVECTION' : 'NOMINAL DRAINAGE'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Polar Air Density</span>
              <span className="text-slate-200 font-bold">1.39 kg/m³</span>
            </div>
          </div>
        </div>

        {/* ── CENTER: Primary Readouts + Visibility + Cascade (col-span-2) ── */}
        <div className="xl:col-span-2 flex flex-col gap-4 justify-between h-full">
          {/* Primary Instruments */}
          <div className="glass-panel p-4 rounded-2xl border border-polar-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Primary Instrument Readout</span>
              <span className="text-emerald-400 text-[9px] font-bold">LIVE TELEMETRY</span>
            </div>
            <div className="flex flex-wrap justify-around items-center gap-4">
              <MercuryThermometer tempC={temp} />

              <div className="flex flex-col items-center gap-1">
                <IndustrialGauge
                  value={solar}
                  min={0}
                  max={800}
                  unit="W/m²"
                  label="Solar Radiation"
                  size={135}
                  accentColor="#f59e0b"
                  warningThreshold={600}
                />
              </div>

              <div className="flex flex-col items-center gap-1">
                <IndustrialGauge
                  value={humidity}
                  min={0}
                  max={100}
                  unit="%"
                  label="Rel. Humidity"
                  size={135}
                  accentColor="#38bdf8"
                />
              </div>

              <div className="flex flex-col items-center gap-1">
                <IndustrialGauge
                  value={pressure}
                  min={940}
                  max={1050}
                  unit="hPa"
                  label="Barometric Pressure"
                  size={135}
                  accentColor="#a78bfa"
                  warningThreshold={965}
                  criticalThreshold={950}
                />
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
                <div key={item.title} className="bg-polar-dark/80 p-2.5 rounded-xl border border-polar-border flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span className="font-semibold text-white text-[11px]">{item.title}</span>
                  </div>
                  <div className={`text-base font-black font-mono ${item.color}`}>{item.val}</div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: 24h Trends & Sensor Array (col-span-1) ── */}
        <div className="xl:col-span-1 glass-panel p-4 rounded-2xl border border-polar-border flex flex-col justify-between gap-3 h-full">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">24-Hour Forecast Archive</div>
            <span className="text-[9px] font-mono text-cyan-400 font-bold">MET Timeseries</span>
          </div>

          {/* Sparkline trends */}
          <div className="space-y-2.5">
            {[
              { label: 'Temperature', data: tempHistory, color: '#06b6d4', unit: '°C', current: temp },
              { label: 'Wind Velocity', data: windHistory, color: '#818cf8', unit: 'km/h', current: wind },
              { label: 'Solar Radiation', data: solarHistory, color: '#f59e0b', unit: 'W/m²', current: solar },
              { label: 'Barometric Pressure', data: pressureHistory, color: '#a78bfa', unit: 'hPa', current: pressure },
            ].map((trend) => (
              <div key={trend.label} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase tracking-wider">{trend.label}</span>
                  <span className="font-bold" style={{ color: trend.color }}>
                    {trend.current.toFixed(1)}{trend.unit}
                  </span>
                </div>
                <SparklineChart data={trend.data} color={trend.color} height={42} showArea />
              </div>
            ))}
          </div>

          {/* Sensor Array Status Grid (fills the bottom without dead space) */}
          <div className="pt-2.5 border-t border-polar-border/60 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Meteorological Sensors</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              {['Anemometer', 'Pyranometer', 'Thermistor', 'Barograph', 'Ceilometer', 'Hygrometer'].map((sensor) => (
                <div key={sensor} className="bg-polar-dark/80 px-2 py-1.5 rounded-lg border border-polar-border/40 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">{sensor}</span>
                  <span className="flex items-center gap-1 text-emerald-400 text-[9px]">
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
    </div>
  );
};
