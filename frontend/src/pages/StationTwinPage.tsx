import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { StationHealthGauge } from '../components/dashboard/StationHealthGauge';
import { DomainSummaryGrid } from '../components/dashboard/DomainSummaryGrid';
import { CausalGraphViewer } from '../components/charts/CausalGraphViewer';
import { Box, Activity, Shield, Thermometer, Wind, Zap, Fuel, ArrowRight } from 'lucide-react';

export const StationTwinPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const station = stations.find(s => s.station_id === stationId) || {
    station_id: stationId,
    name: stationId === 'maitri' ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: stationId === 'maitri' ? 'inland' : 'coastal'
  };

  const snapshot = liveSnapshot[stationId];
  const risk = liveRisk[stationId];
  const stationAlerts = alerts[stationId] || [];

  const readiness = snapshot?.station_ops?.overall_readiness ?? 92.5;
  const statusBand = snapshot?.station_ops?.status_band ?? 'Nominal';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Station Context Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <StationHealthGauge
            score={readiness}
            size={140}
            statusBand={statusBand}
            label="Station Readiness"
          />

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                Digital Twin Live Instance
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono capitalize border border-cyan-500/30">
                {station.location_type} Facility
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white mt-1">
              {station.name}
            </h1>

            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {stationId === 'maitri'
                ? 'Operating since 1989 in Schirmacher Oasis (~100 km inland). Freshwater pumped from Priyadarshini (Zub) Lake via heated overland line.'
                : 'Commissioned 2012 in Larsemann Hills on Prydz Bay. Modular container architecture with 3x100 kVA CHP units and Quilty Bay seawater RO desalination.'}
            </p>

            <div className="flex items-center space-x-4 mt-3 text-xs font-mono text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tick Loop Active ({lastTickTime[stationId] || 'Syncing...'})</span>
              </span>
              <span>•</span>
              <span>Risk: <strong className="text-cyan-300">{risk?.level || 'LOW'}</strong> ({risk?.score || 18} pts)</span>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate(`/station/${stationId}/twin3d`)}
            className={`flex items-center space-x-2 px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-lg transition-all ${
              stationId === 'maitri'
                ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-cyan-600/20'
                : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 shadow-blue-600/20'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Interactive 3D Twin</span>
          </button>

          <button
            onClick={() => navigate(`/station/${stationId}/whatif`)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-polar-navy hover:bg-polar-border border border-polar-border text-cyan-300 rounded-xl text-xs font-bold transition-all"
          >
            <Activity className="w-4 h-4" />
            <span>Run What-If Scenario</span>
          </button>
        </div>
      </div>

      {/* Unique Station Hardware Architecture Showcase */}
      <div className={`glass-panel p-5 rounded-2xl border ${stationId === 'maitri' ? 'border-cyan-500/30 bg-cyan-950/10' : 'border-blue-500/30 bg-blue-950/10'}`}>
        <div className="flex items-center justify-between pb-3 border-b border-polar-border/60 mb-3">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stationId === 'maitri' ? 'bg-cyan-400' : 'bg-blue-400'}`} />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">
              {stationId === 'maitri' ? 'Maitri Inland Specialized Systems' : 'Bharati Coastal Marine Systems'}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {stationId === 'maitri' ? 'Schirmacher Oasis Engineering' : 'Larsemann Promontory Engineering'}
          </span>
        </div>

        {stationId === 'maitri' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-polar-dark/90 p-3 rounded-xl border border-cyan-500/20">
              <div className="text-cyan-400 font-bold mb-1 flex items-center justify-between">
                <span>Lake Zub Pipeline</span>
                <span className="text-[10px] text-emerald-400">HEATED</span>
              </div>
              <p className="text-[11px] text-slate-300">250m trace-heated line from Priyadarshini Lake with freeze-prevention thermostat</p>
              <div className="mt-2 text-[10px] text-slate-400">Flow: ~140 L/h • Intake: +1.8°C</div>
            </div>

            <div className="bg-polar-dark/90 p-3 rounded-xl border border-cyan-500/20">
              <div className="text-amber-400 font-bold mb-1 flex items-center justify-between">
                <span>Waste Incinerator</span>
                <span className="text-[10px] text-cyan-400">ACTIVE</span>
              </div>
              <p className="text-[11px] text-slate-300">High-temp dual chamber for solid & biological waste to meet Madrid Protocol zero-dumping</p>
              <div className="mt-2 text-[10px] text-slate-400">Temp: 850°C • Ash: Inert</div>
            </div>

            <div className="bg-polar-dark/90 p-3 rounded-xl border border-cyan-500/20">
              <div className="text-yellow-400 font-bold mb-1 flex items-center justify-between">
                <span>2x100 kVA Microgrid</span>
                <span className="text-[10px] text-emerald-400">N+1 REDUNDANT</span>
              </div>
              <p className="text-[11px] text-slate-300">Diesel generator gensets with liquid coolant heat exchanger heating habitat water</p>
              <div className="mt-2 text-[10px] text-slate-400">Primary: Gen-1 • Backup: Gen-2</div>
            </div>

            <div className="bg-polar-dark/90 p-3 rounded-xl border border-cyan-500/20">
              <div className="text-indigo-400 font-bold mb-1 flex items-center justify-between">
                <span>Blue Ice Traverse</span>
                <span className="text-[10px] text-slate-300">DROMLAN</span>
              </div>
              <p className="text-[11px] text-slate-300">Tracked PistenBully convoy link to inland blue ice airstrip and ice shelf barrier</p>
              <div className="mt-2 text-[10px] text-slate-400">Shelf Dist: 100km • Snowcat: Ready</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-polar-dark/90 p-3 rounded-xl border border-blue-500/20">
              <div className="text-blue-400 font-bold mb-1 flex items-center justify-between">
                <span>Quilty Bay RO Desal</span>
                <span className="text-[10px] text-emerald-400">OPERATIONAL</span>
              </div>
              <p className="text-[11px] text-slate-300">High-pressure seawater reverse osmosis filtration with saline rejection and heat exchangers</p>
              <div className="mt-2 text-[10px] text-slate-400">Output: 180 L/h • Salinity: &lt;50 ppm</div>
            </div>

            <div className="bg-polar-dark/90 p-3 rounded-xl border border-blue-500/20">
              <div className="text-emerald-400 font-bold mb-1 flex items-center justify-between">
                <span>3x CHP Microgrid</span>
                <span className="text-[10px] text-emerald-400">AUTO-SYNC</span>
              </div>
              <p className="text-[11px] text-slate-300">Computerized Combined Heat and Power with automated dynamic load dispatch and heat loops</p>
              <div className="mt-2 text-[10px] text-slate-400">Gen-1: 38kW • Gen-2: 36kW • Gen-3: Standby</div>
            </div>

            <div className="bg-polar-dark/90 p-3 rounded-xl border border-blue-500/20">
              <div className="text-indigo-400 font-bold mb-1 flex items-center justify-between">
                <span>134-Container Frame</span>
                <span className="text-[10px] text-cyan-400">HYDRAULIC STILTS</span>
              </div>
              <p className="text-[11px] text-slate-300">Elevated multi-layer aerodynamic facade allowing 150 km/h blizzards to pass beneath</p>
              <div className="mt-2 text-[10px] text-slate-400">Clearance: 3.5m • Drift Risk: 0%</div>
            </div>

            <div className="bg-polar-dark/90 p-3 rounded-xl border border-blue-500/20">
              <div className="text-teal-400 font-bold mb-1 flex items-center justify-between">
                <span>Prydz Bay Sea-Ice</span>
                <span className="text-[10px] text-amber-400">MONITORED</span>
              </div>
              <p className="text-[11px] text-slate-300">Marine satellite telemetry monitoring coastal fast-ice thickness for expedition vessel docking</p>
              <div className="mt-2 text-[10px] text-slate-400">Ice Thickness: 1.8m • Berth: Clear</div>
            </div>
          </div>
        )}
      </div>

      {/* Flagship Causal Propagation Graph */}
      <CausalGraphViewer snapshot={snapshot} risk={risk} />

      {/* 16-Domain Digital Twin Summary Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold font-mono tracking-wide text-white">
              The 16 Interconnected Operational Domains
            </h2>
            <span className="text-[10px] font-mono bg-polar-navy border border-polar-border px-2 py-0.5 rounded text-slate-400">
              Full Spectrum Coverage
            </span>
          </div>
          <span className="text-xs text-cyan-400 font-mono">
            Autonomous Multi-Module Orchestration
          </span>
        </div>

        <DomainSummaryGrid snapshot={snapshot} />
      </div>
    </div>
  );
};
