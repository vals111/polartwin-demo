import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { StationCard } from '../components/dashboard/StationCard';
import { GlobalAlertBanner } from '../components/dashboard/GlobalAlertBanner';
import { Compass, ShieldCheck, Box, Activity, CloudSnow, Zap, Wrench } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stations, selectedStationId, selectStation, loadStations } = useStationStore();
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Alert */}
      <GlobalAlertBanner alerts={activeAlerts} />

      {/* Hero Welcome & Mission Summary */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4" />
              <span>National Centre for Polar and Ocean Research (NCPOR)</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Antarctic Research Stations Digital Twin
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Continuous physical-behaviour simulation and multi-domain reasoning for India's 
              <strong> Maitri</strong> and <strong>Bharati</strong> polar bases.
              Tracks 16 operational domains, forecasts resource depletion, detects telemetry anomalies, 
              and executes What-If scenarios without altering live twin state.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(`/station/${selectedStationId}/twin3d`)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all group"
            >
              <Box className="w-4 h-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
              <span>Explore 3D Digital Twin</span>
            </button>

            <button
              onClick={() => navigate(`/station/${selectedStationId}/whatif`)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-polar-navy hover:bg-polar-border border border-polar-border text-cyan-300 rounded-xl text-xs font-bold transition-all"
            >
              <Activity className="w-4 h-4" />
              <span>Launch What-If Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Station Cards Side-by-Side */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold font-mono tracking-wider text-slate-300 uppercase">
            Active Station Twins (Dual Independent Simulation)
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Ticking live every 4 seconds
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stations.map((st) => (
            <StationCard
              key={st.station_id}
              station={st}
              snapshot={liveSnapshot[st.station_id]}
              risk={liveRisk[st.station_id]}
              isSelected={selectedStationId === st.station_id}
              onSelect={() => selectStation(st.station_id)}
            />
          ))}
        </div>
      </div>

      {/* Quick Mission Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-polar-border">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold mb-1">
            <Zap className="w-4 h-4" />
            <span>Power & Energy Resilience</span>
          </div>
          <p className="text-xs text-slate-400">
            Coupled heating load, solar radiation, and automatic generator dispatch. Real-time fuel burn rate updates continuously.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-polar-border">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold mb-1">
            <CloudSnow className="w-4 h-4" />
            <span>Antarctic Climate Risk</span>
          </div>
          <p className="text-xs text-slate-400">
            Real meteorological telemetry drives freeze hazards on lake/seawater pump houses, structural wind stresses, and satellite attenuation.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-polar-border">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold mb-1">
            <Wrench className="w-4 h-4" />
            <span>Predictive Machinery Care</span>
          </div>
          <p className="text-xs text-slate-400">
            Load stress degradation models for generators, intake pumps, and HVAC units, with condition-based maintenance alerts.
          </p>
        </div>
      </div>
    </div>
  );
};
