import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { TankLevelBar } from '../components/charts/TankLevelBar';
import { IndustrialGauge } from '../components/charts/IndustrialGauge';
import { SparklineChart } from '../components/charts/SparklineChart';
import {
  Fuel, Droplet, Flame, AlertTriangle, ShieldCheck, Clock,
  ArrowRight, ExternalLink, RefreshCw, Thermometer, Layers,
  ChevronRight, Gauge, Activity, Truck, CheckCircle2
} from 'lucide-react';

export const FuelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  const snapshot = liveSnapshot[stationId];
  const fuel = snapshot?.fuel;
  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const stationAlerts = alerts[stationId] || [];

  const currentLevel = fuel?.current_level ?? (isMaitri ? 142000 : 180000);
  const totalCapacity = fuel?.total_capacity ?? (isMaitri ? 182000 : 210000);
  const percentage = fuel?.fuel_percentage ?? ((currentLevel / totalCapacity) * 100);
  const burnRate = fuel?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.2);
  const daysRemaining = fuel?.days_remaining ?? (isMaitri ? 18 : 24);
  const resupplyEta = fuel?.resupply_eta_days ?? (isMaitri ? 88 : 102);
  const reserveZone = fuel?.reserve_zone ?? 'Watch';
  const fuelTemp = fuel?.fuel_temperature ?? (isMaitri ? -4.2 : 2.1);

  const safeBufferThreshold = totalCapacity * 0.3; // 30% emergency reserve
  const usableAboveBuffer = Math.max(0, currentLevel - safeBufferThreshold);
  const bridgingGap = daysRemaining - resupplyEta;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Operational Domain • Fuel & Chemical Energy
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {station.name} • {isMaitri ? 'Inland Schirmacher Oasis' : 'Coastal Larsemann Hills'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Fuel className="w-8 h-8 text-amber-400" />
              Fuel Storage & Burn Management
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl">
              Antarctic Grade Low-Freeze Diesel (AGO) storage tanks, line suction preheaters, hourly generator burn rates, and resupply bridging calculations.
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
              onClick={() => navigate(isMaitri ? '/station/bharati/fuel' : '/station/maitri/fuel')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* Live Status KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Reserve Level</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{percentage.toFixed(1)}%</div>
            <div className="text-[10px] text-cyan-300 mt-0.5">{currentLevel.toLocaleString()} / {totalCapacity.toLocaleString()} L</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Hourly Burn Rate</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{burnRate.toFixed(1)} L/hr</div>
            <div className="text-[10px] text-slate-400 mt-0.5">~{(burnRate * 24).toFixed(0)} L/day continuous</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Safe Runway</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{daysRemaining} Days</div>
            <div className="text-[10px] text-amber-400 mt-0.5">30% buffer: {safeBufferThreshold.toLocaleString()} L</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Resupply Window</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{resupplyEta} Days</div>
            <div className="text-[10px] text-red-400 mt-0.5">Bridging Gap: {bridgingGap} Days</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tank Level Visualization & Storage Geometry */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Droplet className="w-4 h-4 text-amber-400" />
            Bulk Fuel Farm Telemetry
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border">
            <div className="flex justify-between items-baseline mb-2 text-xs font-mono">
              <span className="text-slate-300 font-bold">Tank Capacity Fill</span>
              <span className="text-amber-400 font-bold">{percentage.toFixed(1)}%</span>
            </div>
            {/* Multi-segment vertical progress indicator */}
            <div className="w-full bg-slate-800 rounded-2xl h-8 overflow-hidden p-1 border border-slate-700 relative">
              <div
                className="bg-gradient-to-r from-amber-500 to-cyan-400 h-full rounded-xl transition-all duration-700"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
              {/* 30% safe threshold line marker */}
              <div
                className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-red-400/90 shadow-sm"
                title="30% Emergency Buffer Threshold"
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
              <span className="text-red-400 font-bold">0% Empty</span>
              <span className="text-red-300 font-bold">▲ 30% Buffer Line</span>
              <span>100% Full</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Architecture Mode:</span>
              <span className="font-bold text-slate-200">
                {isMaitri ? 'Manual Bunded Tanks (6 Units)' : 'SCADA Containerized Matrix (8 Units)'}
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Fuel Suction Temp:</span>
              <span className="font-bold text-cyan-300">{fuelTemp > 0 ? `+${fuelTemp}` : fuelTemp}°C</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Preheater Circulation:</span>
              <span className="font-bold text-emerald-400">Active (Thermostat OK)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Fuel Grade:</span>
              <span className="font-bold text-amber-300">Antarctic Gas Oil (AGO -50°C Pour Point)</span>
            </div>
          </div>
        </div>

        {/* Middle Column: Burn Rate Dynamics & Upstream/Downstream Coupling */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Consumption Drivers & Cross-Domain Linkages
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Primary Consumer Units</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Gen #1 (Primary 100kVA):</span>
                <span className="font-bold text-amber-400">14.8 L/hr (84.5% of total)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Auxiliary Boiler / Snow Melt:</span>
                <span className="font-bold text-cyan-300">2.7 L/hr (15.5% of total)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Electrical Output Yield:</span>
                <span className="font-bold text-emerald-300">{isMaitri ? '3.88 kWh / Liter' : '4.12 kWh / Liter'}</span>
              </div>
            </div>
          </div>

          {/* Cross-Domain Flow Pills */}
          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Causal Matrix</div>
            <div className="text-xs font-mono p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-slate-300">
              <span className="text-cyan-400 font-bold">← Upstream:</span> Maritime resupply voyage (88d ETA) provides annual bulk replenishment.
            </div>
            <div className="text-xs font-mono p-2 rounded bg-amber-950/30 border border-amber-500/30 text-slate-300">
              <span className="text-amber-400 font-bold">→ Downstream:</span> Powers 100kVA diesel generators, life support thermal loops, and emergency standby units.
            </div>
          </div>
        </div>

        {/* Right Column: Resupply Timeline & Action Protocol */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-teal-400" />
            Resupply Bridging Protocol
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">Bridging Runway Deficit</span>
              <span className="text-red-400 font-bold">{bridgingGap} Days</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Current burn rate of {burnRate} L/hr will draw fuel down to the 30% safety reserve in {daysRemaining} days. The next relief expedition vessel is projected in {resupplyEta} days.
            </p>
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono leading-snug">
              RECOMMENDED ACTION: Engage solar PV prioritization and throttle non-essential laboratory heating to extend fuel autonomy by +12 days.
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate(`/station/${stationId}/whatif`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Simulate Fuel Leak / Surge Scenario</span>
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

export default FuelPage;
