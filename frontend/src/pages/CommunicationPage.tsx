import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import {
  Radio, Wifi, Globe, ShieldCheck, AlertTriangle,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Activity, CheckCircle2, Server, Signal, Zap
} from 'lucide-react';

export const CommunicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, lastTickTime } = useTelemetryStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  const snapshot = liveSnapshot[stationId];
  const comm = snapshot?.communication;

  const bandwidth = comm?.bandwidth_mbps ?? (isMaitri ? 120 : 160);
  const latency = comm?.latency_ms ?? (isMaitri ? 78 : 65);
  const packetLoss = comm?.packet_loss_pct ?? (isMaitri ? 0.05 : 0.02);
  const primaryStatus = comm?.primary_status ?? 'Online';
  const linkHealth = comm?.link_health ?? 'Optimal';

  const qosTiers = [
    { name: 'Tier 1: Life Safety & SCADA Telemetry', priority: '100% Guaranteed', status: 'LIVE Streaming', color: 'text-emerald-400', share: '35%' },
    { name: 'Tier 2: Scientific Data & Earth Observations', priority: 'High Throughput', status: 'Active (QoS Throttled)', color: 'text-cyan-400', share: '50%' },
    { name: 'Tier 3: Crew Welfare Voice & Personal Uplink', priority: 'Bandwidth Capped', status: 'Active', color: 'text-slate-400', share: '15%' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Operational Domain • Satellite Connectivity & Digital Twin Sync
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {station.name} • {isMaitri ? 'Single Radome LEO' : 'Dual Radome LEO & Ku-Band'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-sky-400" />
              Satellite Communications & Telemetry Link
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl">
              High-inclination polar LEO constellation tracking dishes, radome heating de-icers, QoS traffic shaping, and bi-directional Digital Twin streaming to NCAOR Goa.
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
              onClick={() => navigate(isMaitri ? '/station/bharati/communication' : '/station/maitri/communication')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* Live Status KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Link Bandwidth</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{bandwidth} Mbps</div>
            <div className="text-[10px] text-sky-300 mt-0.5">{primaryStatus} (Symmetrical)</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Ping Latency</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{latency} ms</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Round-trip to NCAOR Gateway</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Packet Loss</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{packetLoss}%</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">{linkHealth}</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Telemetry Freshness</div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-0.5">&lt; 2.0s</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{lastTickTime[stationId] || 'Synchronized'}</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Radio Frequency & Tracking Radome */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Signal className="w-4 h-4 text-sky-400" />
            Tracking Radome Hardware
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3 text-xs font-mono">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-300 font-bold">Primary Tracking Antenna</span>
              <span className="text-emerald-400 font-bold">{primaryStatus}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Primary Orbit:</span>
                <span className="font-bold text-slate-200">High-Inclination Polar LEO</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Radome Shell Heater:</span>
                <span className="font-bold text-emerald-400">Engaged (De-iced)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Backup Terminal:</span>
                <span className="font-bold text-amber-300">Inmarsat BGAN Standby</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Emergency Voice:</span>
                <span className="font-bold text-cyan-300">Iridium Extreme PTT</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Causal Matrix</div>
            <div className="text-xs font-mono p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-slate-300">
              <span className="text-cyan-400 font-bold">← Upstream:</span> Microgrid bus powers tracking dish servos and radome de-icing heaters.
            </div>
            <div className="text-xs font-mono p-2 rounded bg-amber-950/30 border border-amber-500/30 text-slate-300">
              <span className="text-amber-400 font-bold">→ Downstream:</span> Maintains real-time Digital Twin state sync, telemedicine, and remote command.
            </div>
          </div>
        </div>

        {/* Middle Column: 3-Tier QoS Priority Queue */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Quality of Service (QoS) Queue Matrix
          </h3>

          <div className="space-y-3">
            {qosTiers.map((tier) => (
              <div key={tier.name} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-white truncate">{tier.name.split(':')[0]}</span>
                  <span className={`text-[10px] font-bold ${tier.color}`}>{tier.status}</span>
                </div>
                <div className="text-[11px] text-slate-300">{tier.name.split(':')[1]}</div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>Priority: {tier.priority}</span>
                  <span>Channel: {tier.share}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Ground Station Telemetry & Actions */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            NCAOR Goa Ground Sync Gateway
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3 text-xs font-mono">
            <div className="text-slate-300 font-bold uppercase">Digital Twin Heartbeat</div>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Gateway Status:</span>
                <span className="font-bold text-emerald-400">CONNECTED (NCAOR Goa)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Telemetry Stream Rate:</span>
                <span className="font-bold text-cyan-300">250 Samples / sec</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Uptime Reliability:</span>
                <span className="font-bold text-white">99.9% (Last 30 Days)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate(`/station/${stationId}/analytics`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>View Data Flow Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate(`/station/${stationId}/risk`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-slate-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Inspect Telemetry Alerts</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationPage;
