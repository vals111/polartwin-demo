import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import {
  Droplet, Thermometer, Zap, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Activity, Users, Waves, CheckCircle2
} from 'lucide-react';

export const WaterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  const snapshot = liveSnapshot[stationId];
  const water = snapshot?.water;
  const env = snapshot?.environment;
  const eng = snapshot?.energy;

  const storageLiters = water?.storage_liters ?? (isMaitri ? 18500 : 24000);
  const maxStorage = water?.max_storage_liters ?? (isMaitri ? 25000 : 32000);
  const fillPct = water?.percentage ?? ((storageLiters / maxStorage) * 100);
  const dailyConsumption = water?.daily_consumption_l ?? (isMaitri ? 850 : 1100);
  const pipeTemp = water?.pipe_temp_c ?? (isMaitri ? 3.8 : 8.5);
  const freezeRisk = water?.freeze_risk ?? 'LOW';
  const traceActive = water?.trace_heating_active ?? true;
  const traceDrawKw = isMaitri ? 4.2 : 2.8;
  const daysBuffer = water?.days_remaining ?? Math.round(storageLiters / dailyConsumption);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Operational Domain • Potable Water & Freeze Mitigation
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {station.name} • {isMaitri ? 'Lake Zub Glacier Melt' : 'Quilty Bay SWRO Desal'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Droplet className="w-8 h-8 text-blue-400" />
              Water Supply & Pipeline Thermal Integrity
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl">
              {isMaitri
                ? 'Insulated 800m surface conduit pumping glacial meltwater from Lake Zub with active electrical trace heating to avert rapid katabatic freezing.'
                : 'High-pressure coastal seawater Reverse Osmosis (SWRO) desalination plant drawing below fast-ice pack with CHP waste heat recovery.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all shadow-md"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>All 9 Domains</span>
            </button>
            <button
              onClick={() => navigate(isMaitri ? '/station/bharati/water' : '/station/maitri/water')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* Live Status KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Storage Reserve</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{storageLiters.toLocaleString()} L</div>
            <div className="text-[10px] text-blue-300 mt-0.5">{fillPct.toFixed(1)}% of {maxStorage.toLocaleString()} L capacity</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Pipeline Temperature</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">+{pipeTemp.toFixed(1)}°C</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Freeze Margin: +{pipeTemp.toFixed(1)}°C above 0°C</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Trace Heating Draw</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{traceDrawKw} kW</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">{traceActive ? 'Thermostat Engaged' : 'Standby'}</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Autonomy Buffer</div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-0.5">{daysBuffer} Days</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Consumption: {dailyConsumption} L/day</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Storage Reservoir & Level Progress */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Waves className="w-4 h-4 text-blue-400" />
            Internal Potable Storage Reservoir
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border">
            <div className="flex justify-between items-baseline mb-2 text-xs font-mono">
              <span className="text-slate-300 font-bold">Heated Tank Fill</span>
              <span className="text-blue-400 font-bold">{fillPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-2xl h-8 overflow-hidden p-1 border border-slate-700">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-xl transition-all duration-700"
                style={{ width: `${Math.min(100, fillPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
              <span>0 Liters</span>
              <span className="text-white font-bold">{storageLiters.toLocaleString()} L in buffer</span>
              <span>{maxStorage.toLocaleString()} L</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Intake Process:</span>
              <span className="font-bold text-slate-200">
                {isMaitri ? 'Lake Zub Surface Pump House' : 'Quilty Bay SWRO 24 L/min'}
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Intake Line Length:</span>
              <span className="font-bold text-slate-200">{isMaitri ? '800 meters (Heated)' : '120 meters (Sub-ice)'}</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Total Days Buffer:</span>
              <span className="font-bold text-emerald-400">{daysBuffer} Days (Without intake)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Water Quality / TDS:</span>
              <span className="font-bold text-cyan-300">{isMaitri ? 'Glacial Purity (18 ppm)' : 'Desalinated (42 ppm)'}</span>
            </div>
          </div>
        </div>

        {/* Middle Column: Freeze Risk & Trace Heating Mechanics */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-emerald-400" />
            Line Freeze Risk & Trace Heating Loop
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">External Thermal Exposure</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Ambient Wind Chill:</span>
                <span className="font-bold text-blue-300">{isMaitri ? '-38.4°C' : '-31.2°C'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Conduit Fluid Temp:</span>
                <span className="font-bold text-emerald-400">+{pipeTemp.toFixed(1)}°C (Safe Zone)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Freeze Hazard Threshold:</span>
                <span className="font-bold text-red-400">&lt; +0.5°C</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Causal Matrix</div>
            <div className="text-xs font-mono p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-slate-300">
              <span className="text-cyan-400 font-bold">← Upstream:</span> Microgrid power supplies continuous {traceDrawKw} kW electrical heating draw.
            </div>
            <div className="text-xs font-mono p-2 rounded bg-amber-950/30 border border-amber-500/30 text-slate-300">
              <span className="text-amber-400 font-bold">→ Downstream:</span> Supplies expedition personnel drinking, galley, and scientific autoclaves.
            </div>
          </div>
        </div>

        {/* Right Column: Crew Consumption Breakdown & Emergency Actions */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Domestic Water Draw Allocation
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Daily Allocation ({dailyConsumption} L)</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Galley & Cooking:</span>
                <span className="font-bold text-slate-200">{isMaitri ? '320 L/day (37.6%)' : '420 L/day'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Hygiene & Showers:</span>
                <span className="font-bold text-slate-200">{isMaitri ? '410 L/day (48.2%)' : '520 L/day'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Science Labs & Autoclaves:</span>
                <span className="font-bold text-cyan-300">{isMaitri ? '120 L/day (14.2%)' : '160 L/day'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate(`/station/${stationId}/whatif`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Simulate Trace Heating Failure Scenario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate(`/station/${stationId}/resources`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-slate-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Open Power & Resources Overview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterPage;
