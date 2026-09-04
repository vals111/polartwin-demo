import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { StationHealthGauge } from '../components/dashboard/StationHealthGauge';
import { CausalGraphViewer } from '../components/charts/CausalGraphViewer';
import { SparklineChart } from '../components/charts/SparklineChart';
import { Zap, Droplet, Thermometer, AlertTriangle } from 'lucide-react';

// ── Animated P&ID Flow Diagram ─────────────────────────────────────────────
const PIDFlowDiagram: React.FC<{
  snapshot: any;
  stationId: string;
}> = ({ snapshot, stationId }) => {
  const isMaitri = stationId === 'maitri';
  const energy = snapshot?.energy;
  const water = snapshot?.water;
  const fuel = snapshot?.fuel;
  const env = snapshot?.environment;

  const genLoad = energy?.generator_load ?? 68;
  const genOk = genLoad < 90;
  const waterOk = (water?.percentage ?? 80) > 20;
  const fuelOk = (fuel?.fuel_percentage ?? 77) > 15;
  const tempOk = (env?.temperature ?? -25) > -50;

  const NodeBox: React.FC<{
    x: number; y: number; w?: number; h?: number;
    label: string; sublabel?: string; color: string;
    status?: 'ok' | 'warn' | 'crit';
    value?: string;
  }> = ({ x, y, w = 120, h = 60, label, sublabel, color, status = 'ok', value }) => {
    const statusColor = status === 'ok' ? '#10b981' : status === 'warn' ? '#f59e0b' : '#ef4444';
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect x={0} y={0} width={w} height={h} rx={8} fill={`${color}18`} stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
        <rect x={0} y={0} width={w} height={4} rx={2} fill={color} fillOpacity="0.7" />
        <circle cx={w - 10} cy={10} r={4} fill={statusColor} opacity="0.9">
          {status === 'crit' && <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1s" repeatCount="indefinite" />}
        </circle>
        <text x={w / 2} y={24} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">{label}</text>
        {sublabel && <text x={w / 2} y={36} textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">{sublabel}</text>}
        {value && <text x={w / 2} y={50} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold" fontFamily="monospace">{value}</text>}
      </g>
    );
  };

  const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color?: string; animated?: boolean }> = ({
    x1, y1, x2, y2, color = '#334155', animated = false,
  }) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const id = `arr-${x1}-${y1}`;
    return (
      <g>
        {animated && (
          <defs>
            <marker id={id} markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={color} />
            </marker>
          </defs>
        )}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth="2"
          strokeDasharray={animated ? '6 3' : undefined}
          markerEnd={animated ? `url(#${id})` : undefined}
          opacity="0.7"
        >
          {animated && (
            <animate attributeName="stroke-dashoffset" values={`${len};0`} dur="2s" repeatCount="indefinite" />
          )}
        </line>
      </g>
    );
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-polar-border overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
          P&amp;ID Schematic — {isMaitri ? 'Maitri Inland Station' : 'Bharati Coastal Station'} Flow Topology
        </div>
        <div className="text-[9px] font-mono text-slate-600">
          ● Active Flow &nbsp;○ Standby
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 820 280" className="w-full" style={{ minWidth: 600, maxHeight: 280 }}>
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="820" height="280" fill="url(#grid)" />

          {/* Source nodes */}
          <NodeBox x={10} y={20} label={isMaitri ? "Lake Zub" : "Quilty Bay"} sublabel={isMaitri ? "Freshwater" : "Seawater RO"} color="#06b6d4" status={waterOk ? 'ok' : 'crit'} value={`${water?.percentage?.toFixed(0) ?? 82}%`} />
          <NodeBox x={10} y={110} label="Fuel Tank" sublabel="AGO Diesel" color="#f59e0b" status={fuelOk ? 'ok' : 'crit'} value={`${fuel?.fuel_percentage?.toFixed(0) ?? 77}%`} />
          <NodeBox x={10} y={200} label="Solar PV" sublabel="Photovoltaic" color="#fbbf24" status="ok" value={`${energy?.solar_output ?? 22} kW`} />

          {/* Arrows: Sources → Processing */}
          <Arrow x1={130} y1={50} x2={190} y2={50} color="#06b6d4" animated />
          <Arrow x1={130} y1={140} x2={190} y2={140} color="#f59e0b" animated />
          <Arrow x1={130} y1={230} x2={190} y2={230} color="#fbbf24" animated />

          {/* Processing nodes */}
          <NodeBox x={190} y={20} label={isMaitri ? "Water Treatment" : "RO Membrane"} sublabel="Purification" color="#06b6d4" status="ok" value={`${water?.pipe_temp_c ?? 3.8}°C`} />
          <NodeBox x={190} y={110} label={isMaitri ? "2×100kVA Gen" : "3×100kVA CHP"} sublabel="Power Plant" color="#f59e0b" status={genOk ? 'ok' : 'warn'} value={`${genLoad} kW`} />
          <NodeBox x={190} y={200} label="Battery Bank" sublabel="UPS Storage" color="#10b981" status="ok" value={`${energy?.battery_level ?? 92}%`} />

          {/* Arrows: Processing → Distribution */}
          <Arrow x1={310} y1={50} x2={370} y2={60} color="#06b6d4" animated />
          <Arrow x1={310} y1={140} x2={370} y2={140} color="#f59e0b" animated />
          <Arrow x1={310} y1={230} x2={370} y2={210} color="#10b981" animated />

          {/* Distribution hub */}
          <NodeBox x={370} y={100} w={130} h={75} label="MICROGRID BUS" sublabel="Power Distribution" color={isMaitri ? '#06b6d4' : '#60a5fa'} status={genOk ? 'ok' : 'warn'} value={`Load: ${genLoad} kW`} />

          {/* Arrows from hub → consumers */}
          <Arrow x1={500} y1={120} x2={560} y2={50} color={isMaitri ? '#06b6d4' : '#60a5fa'} animated />
          <Arrow x1={500} y1={137} x2={560} y2={137} color={isMaitri ? '#06b6d4' : '#60a5fa'} animated />
          <Arrow x1={500} y1={155} x2={560} y2={210} color={isMaitri ? '#06b6d4' : '#60a5fa'} animated />

          {/* Consumer nodes */}
          <NodeBox x={560} y={15} label="Habitat Heating" sublabel="HVAC+Radiant" color="#818cf8" status={tempOk ? 'ok' : 'crit'} value={`${energy?.heating_load ?? 32} kW`} />
          <NodeBox x={560} y={107} label="Science Labs" sublabel="Research Load" color="#a78bfa" status="ok" value={`${Math.round(genLoad * 0.25)} kW`} />
          <NodeBox x={560} y={198} label={isMaitri ? "Waste Incinerator" : "Desalination Pump"} sublabel={isMaitri ? "850°C Incineration" : "Seawater Intake"} color="#fb923c" status="ok" value={`${Math.round(genLoad * 0.15)} kW`} />

          {/* Arrow to monitoring */}
          <Arrow x1={680} y1={50} x2={730} y2={137} color="#818cf8" />
          <Arrow x1={680} y1={137} x2={730} y2={137} color="#a78bfa" />
          <Arrow x1={680} y1={228} x2={730} y2={137} color="#fb923c" />

          {/* Final monitoring node */}
          <NodeBox x={700} y={107} w={110} h={60} label="SCADA Monitor" sublabel="Digital Twin" color={isMaitri ? '#06b6d4' : '#60a5fa'} status="ok" value="LIVE" />

          {/* Environmental overlay */}
          <g opacity="0.6">
            <text x={340} y={20} fill="#94a3b8" fontSize="8" fontFamily="monospace">
              ENV: {env?.temperature?.toFixed(1) ?? -25}°C | Wind: {env?.wind_speed ?? 34} km/h
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

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

        <div className="flex items-center gap-6">
          <StationHealthGauge
            score={readiness}
            size={140}
            statusBand={statusBand}
            label="Station Readiness"
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: accentColor }}>
                Digital Twin Live Instance
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-mono capitalize border"
                style={{ background: `${accentColor}18`, color: accentColor, borderColor: `${accentColor}44` }}
              >
                {station.location_type} Facility
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white mt-1">{station.name}</h1>

            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {isMaitri
                ? 'Operating since 1989 in Schirmacher Oasis (~100 km inland). Freshwater from Priyadarshini (Zub) Lake via heated overland line.'
                : 'Commissioned 2012 in Larsemann Hills on Prydz Bay. Modular 134-container architecture with 3×100 kVA CHP and Quilty Bay seawater RO.'}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Tick Loop Active ({lastTickTime[stationId] || 'Syncing…'})
              </span>
              <span>•</span>
              <span>Risk: <strong style={{ color: accentColor }}>{risk?.level || 'LOW'}</strong> ({risk?.score || 18} pts)</span>
              <span>•</span>
              <span>Alerts: <strong className="text-amber-300">{stationAlerts.length}</strong> active</span>
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

      {/* P&ID Flow Diagram */}
      <PIDFlowDiagram snapshot={snapshot} stationId={stationId} />

      {/* Causal graph */}
      <CausalGraphViewer snapshot={snapshot} risk={risk} />
    </div>
  );
};
