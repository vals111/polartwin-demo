import React from 'react';
import { useParams } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { CloudSnow, Wind, Sun, Eye, AlertTriangle, ShieldCheck, Thermometer, Compass } from 'lucide-react';

export const EnvironmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const { liveSnapshot } = useTelemetryStore();

  const snapshot = liveSnapshot[stationId];
  const env = snapshot?.environment;
  const isMaitri = stationId === 'maitri';

  const isBlizzard = env?.blizzard_active || (env?.wind_speed ?? 0) > 70.0;
  const windChill = Math.round(13.12 + 0.6215 * (env?.temperature ?? -25) - 11.37 * Math.pow((env?.wind_speed ?? 30), 0.16) + 0.3965 * (env?.temperature ?? -25) * Math.pow((env?.wind_speed ?? 30), 0.16));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <CloudSnow className="w-4 h-4" />
              <span>Meteorological & Environmental Driver (Domain 9)</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Antarctic Microclimate
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {isMaitri
                ? 'Schirmacher Oasis (~100 km inland): subjected to fierce katabatic winds draining from the polar ice cap plateau.'
                : 'Larsemann Hills (Coastal Prydz Bay): maritime polar climate with extreme coastal blizzards and fast ice dynamics.'}
            </p>
          </div>

          <div className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold flex items-center space-x-2 ${
            isBlizzard ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isBlizzard ? 'bg-red-400' : 'bg-emerald-400'}`} />
            <span>{isBlizzard ? 'BLIZZARD LOCKDOWN ACTIVE' : 'NOMINAL WEATHER ENVELOPE'}</span>
          </div>
        </div>
      </div>

      {/* Main Meteorological Telemetry Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/40">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <div className="flex items-center space-x-1.5">
              <Thermometer className="w-4 h-4 text-blue-400" />
              <span>Ambient Temp</span>
            </div>
            <span className="font-mono text-[10px] text-cyan-400">Outdoor Sensor</span>
          </div>
          <div className="text-3xl font-black font-mono text-white">
            {env?.temperature ?? -25.2}°C
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2">
            Wind Chill: <strong className="text-cyan-300">{windChill}°C</strong>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-indigo-500/40">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <div className="flex items-center space-x-1.5">
              <Wind className="w-4 h-4 text-indigo-400" />
              <span>Wind Speed</span>
            </div>
            <span className="font-mono text-[10px] text-indigo-300">Anemometer</span>
          </div>
          <div className="text-3xl font-black font-mono text-white">
            {env?.wind_speed ?? 32} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2">
            Peak Gusts: <strong className="text-white">{env?.wind_gust ?? 48} km/h</strong>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/40">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <div className="flex items-center space-x-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Solar Radiation</span>
            </div>
            <span className="font-mono text-[10px] text-amber-300">Pyranometer</span>
          </div>
          <div className="text-3xl font-black font-mono text-white">
            {env?.solar_radiation ?? 210} <span className="text-base text-slate-400 font-normal">W/m²</span>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2">
            Solar PV Output: <strong className="text-amber-300">{snapshot?.energy?.solar_output ?? 22} kW</strong>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-teal-500/40">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <div className="flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-teal-400" />
              <span>Visibility</span>
            </div>
            <span className="font-mono text-[10px] text-teal-300">Optical Sensor</span>
          </div>
          <div className="text-3xl font-black font-mono text-white">
            {env?.visibility ?? 18} <span className="text-base text-slate-400 font-normal">km</span>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2">
            Condition: <strong className="text-white">{env?.condition ?? 'Partly Cloudy'}</strong>
          </div>
        </div>
      </div>

      {/* Climate Risk Assessment Matrix per Master Report Section 23 */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase mb-3">
          Climate Risk Assessment — Cross-Domain Cascade Impacts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border">
            <div className="font-bold text-white mb-1">Heating & Energy Demand</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Ambient temperature of {env?.temperature ?? -25}°C drives building thermal loss, requiring {snapshot?.energy?.heating_load ?? 32} kW of active heating.
            </p>
          </div>

          <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border">
            <div className="font-bold text-white mb-1">Water Intake Freeze Hazard</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Trace-heated pipelines maintain water at {snapshot?.water?.pipe_temp_c ?? 3.8}°C. Freeze risk status: <strong className="text-emerald-400">{snapshot?.water?.freeze_risk ?? 'Low'}</strong>.
            </p>
          </div>

          <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border">
            <div className="font-bold text-white mb-1">Structural Wind Stress</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Wind load of {env?.wind_speed ?? 32} km/h produces 18% rated structural stress on habitat modules and antenna towers.
            </p>
          </div>

          <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border">
            <div className="font-bold text-white mb-1">Resupply Transport Feasibility</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Blizzard severity index at {env?.storm_severity ?? 0.1}. Safe for overland traverse and helicopter apron operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
