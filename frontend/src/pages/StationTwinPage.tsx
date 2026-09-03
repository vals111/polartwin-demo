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
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
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
