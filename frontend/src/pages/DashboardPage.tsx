import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { GlobalAlertBanner } from '../components/dashboard/GlobalAlertBanner';
import {
  Compass,
  ArrowRight,
  Shield,
  Thermometer,
  Wind,
  Zap,
  Droplet,
  Flame,
  Waves,
  Cpu,
  Layers,
  Box,
  Activity,
  Anchor,
  PlaneTakeoff,
  Gauge
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectStation, loadStations } = useStationStore();
  const { liveSnapshot, liveRisk } = useTelemetryStore();
  const { alerts, loadAlerts } = useAlertStore();

  useEffect(() => {
    loadStations();
    loadAlerts('maitri');
    loadAlerts('bharati');
  }, [loadStations, loadAlerts]);

  const activeAlerts = [
    ...(alerts['maitri'] || []),
    ...(alerts['bharati'] || [])
  ];

  const handleLaunchStation = (stationId: string) => {
    selectStation(stationId);
    navigate(`/station/${stationId}`);
  };

  const maitriSnap = liveSnapshot['maitri'];
  const maitriRisk = liveRisk['maitri'];
  const bharatiSnap = liveSnapshot['bharati'];
  const bharatiRisk = liveRisk['bharati'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Global Alert Notification Banner */}
      <GlobalAlertBanner alerts={activeAlerts} />

      {/* Main Command Header & Selector Intro */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-widest uppercase shadow-sm">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>National Centre for Polar and Ocean Research (NCPOR)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase">
          Select Antarctic Research Base
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          India operates two independent scientific stations in Antarctica with fundamentally different engineering architectures, 
          resource supply chains, and geographical constraints. Select a base below to launch its dedicated digital twin dashboard.
        </p>
      </div>

      {/* Dual Station Portals - Deeply Differentiated Representations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ======================================================== */}
        {/* STATION 1: MAITRI INLAND BASE (Schirmacher Oasis)        */}
        {/* ======================================================== */}
        <div className="glass-panel rounded-3xl border-2 border-cyan-500/40 hover:border-cyan-400 p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-900/30 group bg-gradient-to-b from-polar-navy/90 to-polar-dark/95">
          {/* Top Glacial Radial Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />

          <div>
            {/* Station Identity Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  Inland Research Base
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-polar-dark px-2 py-1 rounded border border-polar-border">Est. 1989</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Live Simulation Active</span>
              </div>
            </div>

            {/* Station Title & Geographical Specs */}
            <div className="mt-5">
              <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-cyan-200 transition-colors">
                MAITRI STATION
              </h2>
              <div className="text-xs font-mono text-cyan-400/90 mt-1 flex items-center space-x-2">
                <span>70°45′57″S 11°44′09″E</span>
                <span>•</span>
                <span>Schirmacher Oasis</span>
                <span>•</span>
                <span>Altitude: 130m (~100km Inland)</span>
              </div>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                Situated on rocky ice-free terrain surrounded by the Antarctic continental ice sheet. 
                Features the heated freshwater pipeline from <strong>Priyadarshini (Zub) Lake</strong>, high-temperature waste incinerators, 
                and overland tracked convoys navigating blue ice moraines.
              </p>
            </div>

            {/* Maitri-Specific Engineering Subsystems */}
            <div className="mt-6 p-4 rounded-2xl bg-polar-dark/80 border border-polar-border/80 space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>Distinct Engineering Architecture</span>
                <span className="text-cyan-400 text-[10px]">Inland Specialized</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <Droplet className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Lake Zub Pipeline</div>
                    <div className="text-[10px] text-slate-400">Trace-Heated Overland Water</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <Flame className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Waste Incinerator</div>
                    <div className="text-[10px] text-slate-400">High-Temp Zero-Discharge</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">2x100 kVA Microgrid</div>
                    <div className="text-[10px] text-slate-400">Primary Diesel & Heat Recovery</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <PlaneTakeoff className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Blue Ice Runway</div>
                    <div className="text-[10px] text-slate-400">DROMLAN Aviation Access</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Operational Telemetry Readout */}
            <div className="grid grid-cols-4 gap-3 my-6">
              <div className="bg-polar-darker/90 border border-cyan-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Ambient Temp</div>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
                  {maitriSnap?.environment?.temperature ?? -25.4}°C
                </div>
              </div>
              <div className="bg-polar-darker/90 border border-cyan-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Katabatic Wind</div>
                <div className="text-lg font-bold font-mono text-white mt-1">
                  {maitriSnap?.environment?.wind_speed ?? 34} km/h
                </div>
              </div>
              <div className="bg-polar-darker/90 border border-cyan-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Generator Load</div>
                <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                  {maitriSnap?.energy?.generator_load ?? 68} kW
                </div>
              </div>
              <div className="bg-polar-darker/90 border border-cyan-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Fuel Autonomy</div>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
                  {maitriSnap?.fuel?.days_remaining ?? 19}d
                </div>
              </div>
            </div>
          </div>

          {/* Action Button - Direct Launch to Maitri */}
          <div className="pt-4 border-t border-polar-border/60 flex items-center justify-between">
            <div className="text-xs font-mono">
              <span className="text-slate-400">Risk Assessment: </span>
              <span className="font-bold text-cyan-300">
                {maitriRisk?.level || 'LOW'} ({maitriRisk?.score || 18} pts)
              </span>
            </div>

            <button
              onClick={() => handleLaunchStation('maitri')}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all group/btn"
            >
              <span>Launch Maitri Twin</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STATION 2: BHARATI COASTAL BASE (Larsemann Hills)        */}
        {/* ======================================================== */}
        <div className="glass-panel rounded-3xl border-2 border-blue-500/40 hover:border-blue-400 p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/30 group bg-gradient-to-b from-polar-navy/90 to-polar-dark/95">
          {/* Top Marine Oceanic Radial Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/25 transition-all" />

          <div>
            {/* Station Identity Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                  Coastal Marine Base
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-polar-dark px-2 py-1 rounded border border-polar-border">Est. 2012</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-blue-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                <span>Live Simulation Active</span>
              </div>
            </div>

            {/* Station Title & Geographical Specs */}
            <div className="mt-5">
              <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-blue-200 transition-colors">
                BHARATI STATION
              </h2>
              <div className="text-xs font-mono text-blue-400/90 mt-1 flex items-center space-x-2">
                <span>69°24′28″S 76°11′14″E</span>
                <span>•</span>
                <span>Larsemann Hills</span>
                <span>•</span>
                <span>Prydz Bay Promontory</span>
              </div>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                State-of-the-art modular container station raised on aerodynamic hydraulic stilts between Thala Fjord and Quilty Bay. 
                Features <strong>Quilty Bay Seawater Reverse Osmosis (RO)</strong> desalination, automated 
                <strong> 3x100 kVA Combined Heat & Power (CHP)</strong>, and marine resupply logistics.
              </p>
            </div>

            {/* Bharati-Specific Engineering Subsystems */}
            <div className="mt-6 p-4 rounded-2xl bg-polar-dark/80 border border-polar-border/80 space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>Distinct Engineering Architecture</span>
                <span className="text-blue-400 text-[10px]">Maritime Specialized</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <Waves className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Quilty Bay Seawater RO</div>
                    <div className="text-[10px] text-slate-400">Desalination Intake Pump</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <Cpu className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">3x100 kVA Automated CHP</div>
                    <div className="text-[10px] text-slate-400">Co-Generation Thermal Plant</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">134-Container Stilt Frame</div>
                    <div className="text-[10px] text-slate-400">Aerodynamic Snow-Drift Lift</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-200 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/40">
                  <Anchor className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Prydz Bay Sea-Ice Berthing</div>
                    <div className="text-[10px] text-slate-400">Vessel Resupply Channel</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Operational Telemetry Readout */}
            <div className="grid grid-cols-4 gap-3 my-6">
              <div className="bg-polar-darker/90 border border-blue-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Ambient Temp</div>
                <div className="text-lg font-bold font-mono text-blue-300 mt-1">
                  {bharatiSnap?.environment?.temperature ?? -18.2}°C
                </div>
              </div>
              <div className="bg-polar-darker/90 border border-blue-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Maritime Wind</div>
                <div className="text-lg font-bold font-mono text-white mt-1">
                  {bharatiSnap?.environment?.wind_speed ?? 28} km/h
                </div>
              </div>
              <div className="bg-polar-darker/90 border border-blue-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">CHP Load</div>
                <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                  {bharatiSnap?.energy?.generator_load ?? 74} kW
                </div>
              </div>
              <div className="bg-polar-darker/90 border border-blue-500/20 rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Fuel Autonomy</div>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
                  {bharatiSnap?.fuel?.days_remaining ?? 21}d
                </div>
              </div>
            </div>
          </div>

          {/* Action Button - Direct Launch to Bharati */}
          <div className="pt-4 border-t border-polar-border/60 flex items-center justify-between">
            <div className="text-xs font-mono">
              <span className="text-slate-400">Risk Assessment: </span>
              <span className="font-bold text-blue-300">
                {bharatiRisk?.level || 'LOW'} ({bharatiRisk?.score || 16} pts)
              </span>
            </div>

            <button
              onClick={() => handleLaunchStation('bharati')}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all group/btn"
            >
              <span>Launch Bharati Twin</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Mission Capability Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="glass-panel p-5 rounded-2xl border border-polar-border flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 mt-0.5">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono">Interactive 3D Spatial Twin</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Three.js and React Three Fiber rendering accurate station layouts, terrain elevations, daylight sun paths, and asset status beacons.
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-polar-border flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 mt-0.5">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono">Monte Carlo & What-If Engine</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Simulate katabatic blizzards and generator outages on isolated cloned states with P10/P50/P90 confidence envelopes.
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-polar-border flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 mt-0.5">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono">RL Operational Optimization</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Reinforcement Learning microgrid agent optimizing CHP dispatch and fuel burn without risking brownouts or thermal drop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
