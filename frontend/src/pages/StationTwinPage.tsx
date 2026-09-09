import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { StationHealthGauge } from '../components/dashboard/StationHealthGauge';
import { StationFlowTopology } from '../components/dashboard/StationFlowTopology';
import { CausalGraphViewer } from '../components/charts/CausalGraphViewer';
import { SparklineChart } from '../components/charts/SparklineChart';
import { Zap, Droplet, Thermometer, AlertTriangle, Activity, Shield } from 'lucide-react';


// ─── Main Page ────────────────────────────────────────────────────────────────
export const StationTwinPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: stationId === 'maitri' ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: stationId === 'maitri' ? 'inland' : 'coastal',
  };

  const snapshot = liveSnapshot[stationId];
  const risk = liveRisk[stationId];
  const stationAlerts = alerts[stationId] || [];

  const readiness = snapshot?.station_ops?.overall_readiness ?? 92.5;
  const statusBand = snapshot?.station_ops?.status_band ?? 'Nominal';

  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';

  // Simulated mini sparklines for key metrics
  const genHist = Array.from({ length: 20 }, (_, i) =>
    (snapshot?.energy?.generator_load ?? 68) + (Math.random() - 0.5) * 15
  );
  const fuelHist = Array.from({ length: 20 }, (_, i) =>
    Math.max(0, (snapshot?.fuel?.fuel_percentage ?? 77) - i * 0.3 + (Math.random() - 0.5))
  ).reverse();
  const tempHist = Array.from({ length: 20 }, () =>
    (snapshot?.environment?.temperature ?? -25) + (Math.random() - 0.5) * 4
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Station context header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Ambient glow */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: accentColor }}
        />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full relative z-10">
          {/* Station Gauge & Title */}
          <div className="flex items-center gap-6">
            <StationHealthGauge
              score={readiness}
              size={135}
              statusBand={statusBand}
              label="Station Readiness"
            />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMaitri ? 'bg-cyan-400' : 'bg-blue-400'}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isMaitri ? 'bg-cyan-400' : 'bg-blue-400'}`} />
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                  {isMaitri ? 'Inland Research Facility • 70°45′S' : 'Coastal Research Facility • 69°24′S'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">{station.name}</h1>
            </div>
          </div>

          {/* 3 Individual Cards: Tick Loop, Risk, Alerts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Tick Loop Active */}
            <div className="bg-[#091526]/85 border border-cyan-500/25 rounded-2xl p-3.5 shadow-[0_0_15px_rgba(6,182,212,0.08)] flex items-center gap-3.5 min-w-[190px] hover:border-cyan-400/40 transition-colors">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                <Activity className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Engine Status</div>
                <div className="text-xs font-bold font-mono text-emerald-300 truncate flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Tick Loop Active
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  {lastTickTime[stationId] ? `Sync: ${lastTickTime[stationId]}` : 'Syncing…'}
                </div>
              </div>
            </div>

            {/* Card 2: Risk: LOW (18 pts) */}
            <div className="bg-[#091526]/85 border border-slate-700/50 rounded-2xl p-3.5 shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center gap-3.5 min-w-[190px] hover:border-slate-600/60 transition-colors">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Risk Level</div>
                <div className="text-xs font-bold font-mono text-cyan-300 truncate mt-0.5 flex items-center gap-1.5">
                  <span className="font-black" style={{ color: accentColor }}>{risk?.level || 'LOW'}</span>
                  <span className="text-[10px] font-normal text-slate-400">({risk?.score || 18} pts)</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  Composite Risk Score
                </div>
              </div>
            </div>

            {/* Card 3: Alerts: 0 active */}
            <div className="bg-[#091526]/85 border border-slate-700/50 rounded-2xl p-3.5 shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center gap-3.5 min-w-[190px] hover:border-slate-600/60 transition-colors">
              <div className={`p-2.5 rounded-xl flex-shrink-0 border ${
                stationAlerts.length > 0
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Incident Feed</div>
                <div className={`text-xs font-bold font-mono truncate mt-0.5 ${
                  stationAlerts.length > 0 ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  {stationAlerts.length} Active {stationAlerts.length === 1 ? 'Alert' : 'Alerts'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  {stationAlerts.length === 0 ? 'All Nodes Nominal' : 'Action Required'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live KPI Mini-Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Generator Load',
            value: `${snapshot?.energy?.generator_load ?? 68} kW`,
            history: genHist,
            color: '#f59e0b',
            icon: <Zap className="w-3.5 h-3.5" />,
          },
          {
            label: 'Fuel Reserve',
            value: `${snapshot?.fuel?.fuel_percentage?.toFixed(1) ?? 77}%`,
            history: fuelHist,
            color: '#06b6d4',
            icon: <Droplet className="w-3.5 h-3.5" />,
          },
          {
            label: 'Ambient Temp',
            value: `${snapshot?.environment?.temperature?.toFixed(1) ?? -25.2}°C`,
            history: tempHist,
            color: '#818cf8',
            icon: <Thermometer className="w-3.5 h-3.5" />,
          },
          {
            label: 'Active Alerts',
            value: stationAlerts.length,
            history: Array.from({ length: 20 }, () => Math.round(Math.random() * 5)),
            color: stationAlerts.length > 3 ? '#ef4444' : '#10b981',
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel p-4 rounded-2xl border border-polar-border">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
                {kpi.label}
              </div>
            </div>
            <div className="text-xl font-black font-mono mb-2" style={{ color: kpi.color }}>
              {kpi.value}
            </div>
            <SparklineChart data={kpi.history} color={kpi.color} height={36} showArea />
          </div>
        ))}
      </div>

      {/* POLARTWIN Two-Station Dynamic P&ID Flow Topology */}
      <StationFlowTopology stationId={stationId} />

      {/* Causal graph */}
      <CausalGraphViewer snapshot={snapshot} risk={risk} stationId={stationId} />
    </div>
  );
};
