import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore, createInitialTelemetryHistory } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { StationHealthGauge } from '../components/dashboard/StationHealthGauge';
import { StationFlowTopology } from '../components/dashboard/StationFlowTopology';
import { SparklineChart } from '../components/charts/SparklineChart';
import { Zap, Droplet, Thermometer, AlertTriangle, Activity, Shield } from 'lucide-react';

// ─── Main Page ────────────────────────────────────────────────────────────────
export const StationTwinPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime, telemetryHistory, updateAlertHistory } = useTelemetryStore();
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

  useEffect(() => {
    updateAlertHistory(stationId, stationAlerts.length);
  }, [stationId, stationAlerts.length, updateAlertHistory]);

  const fallbackHistory = useMemo(
    () => createInitialTelemetryHistory(stationId, snapshot, stationAlerts.length),
    [stationId]
  );
  const history = telemetryHistory[stationId] || fallbackHistory;

  const statusCards = [
    {
      label: 'Engine Status',
      value: 'Tick Loop Active',
      sub: lastTickTime[stationId] ? `Sync: ${lastTickTime[stationId]}` : 'Syncing…',
      iconEl: <Activity className="w-4 h-4" style={{ color: '#10b981' }} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconBorder: 'rgba(16, 185, 129, 0.3)',
      valueColor: '#10b981',
      pulse: true,
    },
    {
      label: 'Risk Level',
      value: `${risk?.level || 'LOW'}`,
      sub: `Composite Score: ${risk?.score || 18} pts`,
      iconEl: <Shield className="w-4 h-4" style={{ color: accentColor }} />,
      iconBg: isMaitri ? 'rgba(6, 182, 212, 0.12)' : 'rgba(96, 165, 250, 0.12)',
      iconBorder: isMaitri ? 'rgba(6, 182, 212, 0.3)' : 'rgba(96, 165, 250, 0.3)',
      valueColor: accentColor,
      pulse: false,
    },
    {
      label: 'Incident Feed',
      value: `${stationAlerts.length} ${stationAlerts.length === 1 ? 'Alert' : 'Alerts'}`,
      sub: stationAlerts.length === 0 ? 'All Nodes Nominal' : 'Action Required',
      iconEl: <AlertTriangle className="w-4 h-4" style={{ color: stationAlerts.length > 0 ? '#f59e0b' : '#10b981' }} />,
      iconBg: stationAlerts.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
      iconBorder: stationAlerts.length > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)',
      valueColor: stationAlerts.length > 0 ? '#f59e0b' : '#10b981',
      pulse: false,
    },
  ];

  const kpiCards = [
    {
      label: 'Generator Load',
      value: `${snapshot?.energy?.generator_load ?? (isMaitri ? 68 : 74)} kW`,
      history: history.generator_load,
      color: '#f59e0b',
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      label: 'Fuel Reserve',
      value: `${snapshot?.fuel?.fuel_percentage?.toFixed(1) ?? (isMaitri ? 77.0 : 74.0)}%`,
      history: history.fuel_percentage,
      color: '#06b6d4',
      icon: <Droplet className="w-3.5 h-3.5" />,
    },
    {
      label: 'Ambient Temp',
      value: `${snapshot?.environment?.temperature?.toFixed(1) ?? (isMaitri ? -25.2 : -19.6)}°C`,
      history: history.temperature,
      color: '#818cf8',
      icon: <Thermometer className="w-3.5 h-3.5" />,
    },
    {
      label: 'Active Alerts',
      value: stationAlerts.length,
      history: history.alerts,
      color: stationAlerts.length > 3 ? '#ef4444' : '#10b981',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── Station Header Panel ── */}
      <div
        className="p-6 rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Gauge + Title */}
          <div className="flex items-center gap-6">
            <StationHealthGauge
              score={readiness}
              size={130}
              statusBand={statusBand}
              label="Station Readiness"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: accentColor }}
                  />
                </span>
                <span
                  className="text-[10px] font-mono tracking-widest uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {isMaitri ? 'Inland Research Facility • 70°45′S' : 'Coastal Research Facility • 69°24′S'}
                </span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-wide"
                style={{ color: 'var(--text-primary)' }}
              >
                {station.name}
              </h1>
            </div>
          </div>

          {/* Status Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {statusCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center gap-3.5 p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  minWidth: 180,
                }}
              >
                <div
                  className="p-2.5 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: card.iconBg, border: `1px solid ${card.iconBorder}` }}
                >
                  {card.iconEl}
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[9px] font-mono uppercase tracking-wider font-semibold mb-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {card.label}
                  </div>
                  <div
                    className="text-xs font-bold font-mono truncate flex items-center gap-1.5"
                    style={{ color: card.valueColor }}
                  >
                    {card.pulse && (
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-ping"
                        style={{ backgroundColor: card.valueColor }}
                      />
                    )}
                    {card.value}
                  </div>
                  <div
                    className="text-[10px] font-mono truncate mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {card.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live KPI Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-2xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span
                className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {kpi.label}
              </span>
            </div>
            <div className="text-xl font-black font-mono mb-2" style={{ color: kpi.color }}>
              {kpi.value}
            </div>
            <SparklineChart data={kpi.history} color={kpi.color} height={36} showArea />
          </div>
        ))}
      </div>

      {/* ── Station Flow Topology ── */}
      <StationFlowTopology stationId={stationId} />
    </div>
  );
};
