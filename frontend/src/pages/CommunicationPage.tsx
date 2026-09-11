import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi } from '../api/client';
import {
  CommunicationDigitalTwin, CommunicationAsset,
} from '../types';
import {
  Radio, Wifi, Globe, ShieldCheck, AlertTriangle,
  Clock, ArrowRight, RefreshCw, Layers,
  Activity, CheckCircle2, Server, Signal, Zap, AlertOctagon,
  Shield, Play, TrendingUp, TrendingDown, Cpu,
  Network, ArrowUpRight, BarChart2,
  HardDrive, X, CloudLightning, Flame, Droplet, Users,
  Wrench, Package, MapPin, Wind, Sparkles, Brain
} from 'lucide-react';
import * as echarts from 'echarts';

// ── Animated Signal Arc Gauge ──────────────────────────────────────────────
const SignalArcGauge: React.FC<{
  value: number; max: number; label: string; unit: string; color: string; size?: number;
}> = ({ value, max, label, unit, color, size = 140 }) => {
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * Math.min(1, value / max);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`}>
        <defs>
          <filter id={`sig-glow-${label}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(255,255,255,0.05)" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={-(circ - arcLen) * 0.125}
          transform={`rotate(135 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={-(circ - arcLen) * 0.125 + arcLen - filled}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          filter={`url(#sig-glow-${label})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
          fill="white" fontSize={size * 0.17} fontWeight="900" fontFamily="monospace">{value}</text>
        <text x={size / 2} y={size / 2 + 13} textAnchor="middle"
          fill={color} fontSize={size * 0.09} fontFamily="monospace">{unit}</text>
      </svg>
      <div className="text-[9px] font-mono text-slate-400 text-center">{label}</div>
    </div>
  );
};

// ── Animated Data Pipeline Flow ────────────────────────────────────────────
const DataPipelineFlow: React.FC<{
  stages: { title: string; desc: string; status: string; id: number }[];
  selected: number | null; onSelect: (id: number | null) => void;
}> = ({ stages, selected, onSelect }) => {
  const statusColor: Record<string, string> = {
    NORMAL: '#10b981', STREAMING: '#06b6d4', SYNCHRONIZED: '#818cf8',
    FORWARDED: '#10b981', OPERATIONAL: '#10b981', MONITORING: '#f59e0b',
  };

  return (
    <div className="flex items-stretch gap-0">
      {stages.map((stage, i) => {
        const sc = statusColor[stage.status] || '#64748b';
        const isSelected = selected === stage.id;
        return (
          <React.Fragment key={stage.id}>
            <div onClick={() => onSelect(isSelected ? null : stage.id)}
              className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-sky-500/60 bg-sky-500/8' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}
              style={isSelected ? { background: `${sc}0A`, borderColor: `${sc}55` } : {}}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-mono text-slate-500 font-bold">0{stage.id}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc }}>{stage.status === 'STREAMING' && <span className="block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sc }} />}</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-white leading-tight">{stage.title}</div>
              <div className="text-[9px] font-mono text-slate-500 mt-1 leading-tight">{stage.desc}</div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center px-0.5 shrink-0">
                <div className="relative w-5 h-1 flex items-center">
                  <div className="absolute inset-0 bg-sky-500/20 rounded" />
                  <div className="absolute h-full w-3 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent rounded"
                    style={{ animation: 'flow 1.5s linear infinite' }} />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Link Performance EChart ────────────────────────────────────────────────
const LinkPerformanceChart: React.FC<{ hist: any[] }> = ({ hist }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !hist?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const labels = hist.map(h => `${h.t_minus_sec}s`);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 },
      },
      legend: {
        data: ['Bandwidth', 'Latency', 'Packet Loss'],
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        top: 0, right: 10,
      },
      grid: { top: 28, bottom: 30, left: 50, right: 14 },
      xAxis: {
        type: 'category', data: labels, boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' },
      },
      yAxis: [
        { type: 'value', name: 'Mbps', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#38bdf8', fontSize: 9, fontFamily: 'monospace' }, nameTextStyle: { color: '#38bdf8', fontSize: 9 } },
        { type: 'value', name: 'ms', splitLine: { show: false }, axisLabel: { color: '#34d399', fontSize: 9, fontFamily: 'monospace' }, nameTextStyle: { color: '#34d399', fontSize: 9 } },
      ],
      series: [
        {
          name: 'Bandwidth', type: 'line', data: hist.map(h => h.bandwidth_mbps),
          smooth: true, showSymbol: false, lineStyle: { width: 2.5, color: '#38bdf8' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(56,189,248,0.3)' }, { offset: 1, color: 'rgba(56,189,248,0.02)' }]) },
        },
        {
          name: 'Latency', type: 'line', yAxisIndex: 1, data: hist.map(h => h.latency_ms),
          smooth: true, showSymbol: false, lineStyle: { width: 2, color: '#34d399', type: 'dashed' },
        },
        {
          name: 'Packet Loss', type: 'bar', data: hist.map(h => h.packet_loss_pct),
          itemStyle: { color: 'rgba(239,68,68,0.45)', borderRadius: [2, 2, 0, 0] }, barWidth: 6,
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [hist]);

  return <div ref={ref} className="w-full h-64" />;
};

// ── QoS Stacked Bar ────────────────────────────────────────────────────────
const QoSStackedBar: React.FC<{ tiers: any[]; totalBw: number }> = ({ tiers, totalBw }) => (
  <div className="space-y-3">
    {tiers.map((tier: any) => {
      const pct = (tier.current_mbps / totalBw) * 100;
      const tierColors: Record<string, string> = { '1': '#10b981', '2': '#06b6d4', '3': '#818cf8' };
      const tc = tierColors[tier.id?.toString()] || '#64748b';
      return (
        <div key={tier.id} className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-white font-bold">{tier.short_name}</span>
            <span className="font-bold" style={{ color: tc }}>{tier.current_mbps} Mbps ({tier.allocation_pct}%)</span>
          </div>
          <div className="h-2 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: `linear-gradient(to right, ${tc}88, ${tc})`, boxShadow: `0 0 6px ${tc}44` }} />
          </div>
          <div className="text-[9px] font-mono text-slate-500">{tier.description}</div>
        </div>
      );
    })}
  </div>
);

// ── Satellite Link Topology Visual ─────────────────────────────────────────
const SatelliteTopologyViz: React.FC<{
  bwMbps: number; latMs: number; lossP: number; syncState: string; isMaitri: boolean;
}> = ({ bwMbps, latMs, lossP, syncState, isMaitri }) => {
  const statusColor = syncState === 'SYNCHRONIZED' ? '#10b981' : syncState === 'DEGRADED' ? '#f59e0b' : '#ef4444';
  const bwColor = bwMbps > 100 ? '#10b981' : bwMbps > 50 ? '#06b6d4' : '#f59e0b';

  return (
    <svg width="100%" viewBox="0 0 360 180" className="overflow-visible">
      <defs>
        <filter id="sat-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="sat-grad">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <marker id="arrowR" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf844" />
        </marker>
        <marker id="arrowL" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf844" />
        </marker>
      </defs>

      {/* Station node */}
      <ellipse cx={50} cy={140} rx={35} ry={20} fill="rgba(10,15,30,0.9)" stroke={statusColor} strokeWidth={1.5} />
      <text x={50} y={136} textAnchor="middle" fill="white" fontSize={8} fontFamily="monospace" fontWeight="bold">
        {isMaitri ? 'MAITRI' : 'BHARATI'}
      </text>
      <text x={50} y={148} textAnchor="middle" fill={statusColor} fontSize={7} fontFamily="monospace">
        {isMaitri ? '70.77°S' : '69.41°S'}
      </text>
      {/* Radome dish */}
      <ellipse cx={50} cy={118} rx={12} ry={7} fill="none" stroke={statusColor} strokeWidth={1.5} />
      <line x1={50} y1={118} x2={50} y2={125} stroke={statusColor} strokeWidth={1.5} />

      {/* LEO Satellite */}
      <circle cx={180} cy={35} r={18} fill="rgba(10,15,30,0.9)" stroke="#38bdf8" strokeWidth={1.5} filter="url(#sat-glow)" />
      <text x={180} y={32} textAnchor="middle" fill="#38bdf8" fontSize={7} fontFamily="monospace" fontWeight="bold">LEO SAT</text>
      <text x={180} y={43} textAnchor="middle" fill="#64748b" fontSize={7} fontFamily="monospace">INSAT-4</text>
      {/* Satellite solar panels */}
      <rect x={160} y={30} width={14} height={8} rx={1} fill="#818cf8" fillOpacity={0.7} />
      <rect x={206} y={30} width={14} height={8} rx={1} fill="#818cf8" fillOpacity={0.7} />
      {/* Signal beams with animation */}
      <line x1={62} y1={122} x2={163} y2={50} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="5,3" opacity="0.6"
        markerEnd="url(#arrowR)">
        <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1={197} y1={50} x2={295} y2={122} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="5,3" opacity="0.6"
        markerEnd="url(#arrowR)">
        <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
      </line>

      {/* NCAOR Ground Gateway */}
      <ellipse cx={310} cy={140} rx={40} ry={20} fill="rgba(10,15,30,0.9)" stroke="#10b981" strokeWidth={1.5} />
      <text x={310} y={136} textAnchor="middle" fill="white" fontSize={8} fontFamily="monospace" fontWeight="bold">NCAOR GOA</text>
      <text x={310} y={148} textAnchor="middle" fill="#10b981" fontSize={7} fontFamily="monospace">15.49°N Gateway</text>
      <ellipse cx={310} cy={118} rx={12} ry={7} fill="none" stroke="#10b981" strokeWidth={1.5} />
      <line x1={310} y1={118} x2={310} y2={125} stroke="#10b981" strokeWidth={1.5} />

      {/* Metrics on the beam */}
      <rect x={100} y={68} width={60} height={38} rx={6} fill="rgba(5,10,25,0.9)" stroke="rgba(56,189,248,0.3)" strokeWidth={1} />
      <text x={130} y={80} textAnchor="middle" fill={bwColor} fontSize={8} fontFamily="monospace" fontWeight="bold">{bwMbps} Mbps</text>
      <text x={130} y={92} textAnchor="middle" fill="#94a3b8" fontSize={7} fontFamily="monospace">{latMs}ms latency</text>
      <text x={130} y={102} textAnchor="middle" fill={lossP > 1 ? '#ef4444' : '#10b981'} fontSize={7} fontFamily="monospace">{lossP}% loss</text>

      {/* Sync state badge */}
      <rect x={250} y={158} width={110} height={18} rx={4} fill={`${statusColor}22`} stroke={`${statusColor}55`} strokeWidth={1} />
      <text x={305} y={170} textAnchor="middle" fill={statusColor} fontSize={8} fontFamily="monospace" fontWeight="bold">
        ● {syncState}
      </text>
    </svg>
  );
};

// ── Domain Freshness Chip ───────────────────────────────────────────────────
const DomainFreshChip: React.FC<{ dom: any; stationId: string }> = ({ dom, stationId }) => {
  const navigate = useNavigate();
  const fc = dom.freshness_state === 'LIVE' ? '#10b981' : dom.freshness_state === 'DELAYED' ? '#f59e0b' : '#ef4444';
  return (
    <div onClick={() => navigate(`/station/${stationId}/${dom.route}`)}
      className="p-3 rounded-xl border cursor-pointer group transition-all hover:scale-[1.02]"
      style={{ borderColor: `${fc}33`, background: `${fc}07` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold text-white truncate pr-1 group-hover:text-sky-300 transition-colors">{dom.name?.split('&')[0]?.trim()}</span>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: fc }}>
          {dom.freshness_state === 'LIVE' && <span className="block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: fc }} />}
        </span>
      </div>
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-slate-500">{dom.last_update_sec}s ago</span>
        <span className="font-bold" style={{ color: fc }}>{dom.freshness_state}</span>
      </div>
      <div className="h-1 bg-polar-darker rounded-full overflow-hidden mt-1.5 border border-polar-border/30">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, 100 - dom.last_update_sec * 5)}%`, background: fc }} />
      </div>
    </div>
  );
};

// ── Modal ───────────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div className="relative z-10 glass-panel rounded-2xl border border-polar-border w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      {children}
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export const CommunicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [commData, setCommData] = useState<CommunicationDigitalTwin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'assets' | 'whatif'>('overview');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CommunicationAsset | null>(null);
  const [selectedFlowNode, setSelectedFlowNode] = useState<number | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  const fetchCommData = useCallback(async () => {
    try {
      const res = await resourcesApi.getCommunication(stationId);
      if (res?.communication) { setCommData(res.communication); }
    } catch {
      const snapComm = liveSnapshot[stationId]?.communication;
      if (snapComm && (snapComm as any).qos_tiers) setCommData(snapComm as any);
    } finally { setLoading(false); }
  }, [stationId, liveSnapshot]);

  useEffect(() => {
    setLoading(true); setCommData(null);
    setWhatIfResult(null); setActiveScenario(null);
    fetchCommData();
  }, [stationId]);

  useEffect(() => {
    const t = setInterval(fetchCommData, 10000);
    return () => clearInterval(t);
  }, [fetchCommData]);

  const runWhatIf = async (scenarioType: string, params: Record<string, any> = {}) => {
    setWhatIfLoading(true); setActiveScenario(scenarioType); setWhatIfResult(null);
    try {
      const res = await resourcesApi.communicationWhatIf(stationId, scenarioType, params);
      setWhatIfResult(res);
    } catch { setWhatIfResult(null); }
    finally { setWhatIfLoading(false); }
  };

  const comm = commData;
  const syncState = comm?.sync_state ?? 'SYNCHRONIZED';
  const syncColor = syncState === 'SYNCHRONIZED' ? '#10b981' : syncState === 'DEGRADED' ? '#f59e0b' : '#ef4444';
  const bwMbps = comm?.bandwidth_mbps ?? (isMaitri ? 118.5 : 157.2);
  const latMs = comm?.latency_ms ?? (isMaitri ? 78 : 62);
  const lossP = comm?.packet_loss_pct ?? (isMaitri ? 0.05 : 0.02);
  const freshSec = comm?.telemetry_freshness_sec ?? 1.4;
  const bwCapacity = comm?.bandwidth_capacity_mbps ?? (isMaitri ? 120 : 160);
  const utilPct = comm?.bandwidth_utilization_pct ?? Math.round((bwMbps / bwCapacity) * 100);
  const dataConfidence = comm?.data_confidence_pct ?? 99.4;
  const riskScore = comm?.communication_risk?.overall_risk_score ?? 2.0;
  const riskLevel = riskScore > 30 ? 'HIGH' : riskScore > 10 ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981';

  const mockHist = comm?.history ?? Array.from({ length: 20 }, (_, i) => ({
    t_minus_sec: (20 - i) * 30,
    bandwidth_mbps: bwMbps + (Math.random() - 0.5) * 10,
    latency_ms: latMs + (Math.random() - 0.5) * 8,
    packet_loss_pct: Math.max(0, lossP + (Math.random() - 0.5) * 0.1),
  }));

  const FLOW_STAGES = [
    { id: 1, title: 'Station Sensors', desc: '1,420 SCADA Points', status: 'NORMAL' },
    { id: 2, title: 'Edge Bus', desc: 'Real-time Broker', status: 'STREAMING' },
    { id: 3, title: 'Radome Uplink', desc: isMaitri ? '2.4m Dish' : 'Dual 3.0m', status: 'STREAMING' },
    { id: 4, title: 'LEO Satellite', desc: 'INSAT-4 / SES', status: 'STREAMING' },
    { id: 5, title: 'Gateway Rx', desc: 'NCAOR Goa', status: 'SYNCHRONIZED' },
    { id: 6, title: 'Digital Twin', desc: 'PolarTwin Engine', status: 'OPERATIONAL' },
  ];

  const WHAT_IF_PRESETS = [
    { id: 'primary_link_failure', title: '📡 Primary Link Failure', desc: 'LEO dish lock loss + backup failover', icon: CloudLightning, params: {} },
    { id: 'bandwidth_reduction', title: '📉 Bandwidth Throttle −65%', desc: 'Transponder orbital contention', icon: TrendingDown, params: { reduction_pct: 65 } },
    { id: 'high_packet_loss', title: '🌩️ Auroral Packet Loss 6.8%', desc: 'Solar flare ionospheric storm', icon: AlertTriangle, params: { packet_loss_pct: 6.8 } },
    { id: 'high_latency', title: '⏱️ Multi-Hop Relay 520ms', desc: 'Inter-satellite routing delay', icon: Clock, params: { latency_ms: 520 } },
    { id: 'backup_activation', title: '🔄 Backup Link Drill', desc: 'Inmarsat/Iridium switchover test', icon: Shield, params: {} },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 space-y-3">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm font-mono text-sky-300">Loading communication twin state…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 60%, #38bdf8 0%, transparent 60%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                <Radio className="w-3 h-3" /> Satellite Communications & Digital Twin Sync
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name} · {isMaitri ? 'Single 2.4m Radome' : 'Dual 3.0m Radomes'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold flex items-center gap-1"
                style={{ borderColor: `${syncColor}44`, background: `${syncColor}11`, color: syncColor }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: syncColor }} /> {syncState}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Signal className="w-8 h-8 text-sky-400" /> Communications Command Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {station.name} → INSAT-4 LEO Constellation → NCAOR Goa Ground Gateway · Real-time telemetry synchronization
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-polar-dark border border-emerald-500/30 text-[10px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">WEBSOCKET LIVE</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">{latMs}ms</span>
            </div>
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <Layers className="w-4 h-4 text-cyan-400" /> All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=communication`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Brain className="w-4 h-4 text-purple-400" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/communication' : '/station/maitri/communication')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-sky-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" /> Switch Station
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Link Bandwidth', val: `${bwMbps} Mbps`, sub: `${utilPct}% of ${bwCapacity} Mbps capacity`, color: '#38bdf8', icon: <Wifi className="w-4 h-4" />, modal: 'bandwidth' },
            { label: 'Ping Latency', val: `${latMs} ms`, sub: `Jitter: ±${comm?.latency_jitter_ms ?? 3}ms · ${comm?.latency_trend ?? 'STABLE'}`, color: '#10b981', icon: <Activity className="w-4 h-4" />, modal: 'latency' },
            { label: 'Packet Loss', val: `${lossP}%`, sub: `${comm?.packets_dropped ?? 422} dropped · ${comm?.packet_loss_status ?? 'OPTIMAL'}`, color: lossP < 0.5 ? '#10b981' : '#f59e0b', icon: <Signal className="w-4 h-4" />, modal: 'packet_loss' },
            { label: 'Twin Freshness', val: `${freshSec}s`, sub: `Confidence: ${dataConfidence}% · 16 domains synced`, color: '#818cf8', icon: <Clock className="w-4 h-4" />, modal: 'freshness' },
          ].map((kpi) => (
            <div key={kpi.label} onClick={() => setActiveModal(kpi.modal)}
              className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span className="flex items-center gap-1" style={{ color: kpi.color }}>
                  {kpi.icon} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 flex-wrap">
        {(['overview', 'pipeline', 'assets', 'whatif'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${activeTab === tab
              ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
              : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'}`}>
            {tab === 'overview' ? '📡 Link Overview' : tab === 'pipeline' ? '🔄 Data Pipeline' : tab === 'assets' ? '📻 Hardware Assets' : '🧪 What-If Sim'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Topology Visual */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
              <Globe className="w-4 h-4" /> Live Satellite Link Topology — Station to Ground Gateway
            </div>
            <SatelliteTopologyViz
              bwMbps={bwMbps} latMs={latMs} lossP={lossP}
              syncState={syncState} isMaitri={isMaitri}
            />
            {/* Link metrics */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-polar-border/40">
              <SignalArcGauge value={utilPct} max={100} label="Channel Util" unit="%" color="#38bdf8" size={110} />
              <SignalArcGauge value={Math.round(dataConfidence)} max={100} label="Data Confidence" unit="%" color="#10b981" size={110} />
              <SignalArcGauge value={Math.round(100 - riskScore)} max={100} label="Link Health" unit="%" color={riskColor} size={110} />
            </div>
          </div>

          {/* Sync status + risk */}
          <div className="space-y-4">
            {/* Sync state panel */}
            <div className="glass-panel p-5 rounded-2xl border shadow-xl space-y-3"
              style={{ borderColor: `${syncColor}33` }}>
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: syncColor }}>
                Digital Twin Synchronization
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border flex items-center justify-center"
                  style={{ borderColor: `${syncColor}44`, background: `${syncColor}11` }}>
                  <Globe className="w-6 h-6" style={{ color: syncColor }} />
                </div>
                <div>
                  <div className="text-sm font-black font-mono" style={{ color: syncColor }}>{syncState}</div>
                  <div className="text-[10px] font-mono text-slate-400">Gateway: {comm?.ground_gateway ?? 'NCAOR Goa'}</div>
                </div>
              </div>
              <div className="space-y-2 text-xs font-mono pt-2 border-t border-polar-border/40">
                {[
                  { label: 'Data Completeness', val: `${comm?.data_completeness_pct ?? 99.8}%`, color: '#10b981' },
                  { label: 'Stream Rate', val: `${comm?.stream_rate_samples_sec ?? 250} spl/s`, color: '#06b6d4' },
                  { label: 'Freshness', val: `${freshSec}s ago`, color: '#818cf8' },
                  { label: 'CRC Frame Pass', val: '99.98%', color: '#10b981' },
                  { label: 'Data Ingestion', val: '1.42 GB Today', color: '#94a3b8' },
                  { label: '30-Day Uptime', val: '99.94%', color: '#10b981' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center border-b border-polar-border/20 pb-1.5">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Score */}
            <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Communication Risk Score</div>
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 64 64" width="64" height="64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={riskColor} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 26 * (1 - riskScore / 100)} ${2 * Math.PI * 26}`}
                      style={{ filter: `drop-shadow(0 0 5px ${riskColor})` }} />
                    <text x="32" y="37" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="monospace">{riskScore}</text>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black font-mono" style={{ color: riskColor }}>{riskLevel}</div>
                  <div className="text-[10px] font-mono text-slate-400">Visibility Risk Level</div>
                </div>
              </div>
              {[
                { label: 'Link Health', val: `${comm?.communication_risk?.link_health_factor ?? 98.5}%` },
                { label: 'Freshness Factor', val: `${comm?.communication_risk?.freshness_factor ?? 99.0}%` },
                { label: 'Packet Integrity', val: `${comm?.communication_risk?.packet_integrity_factor ?? 99.8}%` },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-xs font-mono border-b border-polar-border/20 pb-1.5">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-bold text-emerald-300">{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Pipeline Tab ── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-5">
          {/* Flow stages */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
              <Network className="w-4 h-4" /> Operational Data Pipeline · Station → India Digital Twin Flow
            </div>
            <DataPipelineFlow stages={FLOW_STAGES} selected={selectedFlowNode} onSelect={setSelectedFlowNode} />
            {selectedFlowNode && (
              <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 text-xs font-mono text-slate-300 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Stage {selectedFlowNode}: {FLOW_STAGES[selectedFlowNode - 1].title} — </span>
                  <span>Real-time sensor telemetry processing at this stage with automated CRC validation and QoS priority tagging.</span>
                </div>
              </div>
            )}
          </div>

          {/* History chart + QoS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4" /> Link Performance History (Last 20 Telemetry Ticks)
              </div>
              <LinkPerformanceChart hist={mockHist} />
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                <Server className="w-4 h-4" /> QoS Traffic Matrix
              </div>
              <QoSStackedBar
                tiers={comm?.qos_tiers ?? [
                  { id: '1', short_name: 'Tier 1 — SCADA/Safety', description: 'Life support, microgrid, emergency', current_mbps: 32, allocation_pct: 35 },
                  { id: '2', short_name: 'Tier 2 — Science', description: 'Earth obs, research data', current_mbps: 48, allocation_pct: 45 },
                  { id: '3', short_name: 'Tier 3 — Crew Welfare', description: 'VoIP, video, personal comms', current_mbps: 22, allocation_pct: 20 },
                ]}
                totalBw={bwCapacity}
              />
              <div className="pt-3 border-t border-polar-border/40 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Active Bandwidth</span>
                  <span className="font-bold text-sky-300">{bwMbps} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Channel Utilization</span>
                  <span className="font-bold text-emerald-300">{utilPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Domain freshness matrix */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" /> 16-Domain Telemetry Freshness Matrix — Click to Inspect
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(comm?.domains_freshness ?? []).map((dom: any) => (
                <DomainFreshChip key={dom.domain_id} dom={dom} stationId={stationId} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Assets Tab ── */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold glass-panel px-4 py-3 rounded-2xl border border-sky-500/30">
            📻 Communication Hardware Subsystems — Click card to inspect
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(comm?.assets ?? []).map((asset) => {
              const isOk = asset.status.includes('ONLINE') || asset.status.includes('CONNECTED') || asset.status.includes('OPERATIONAL');
              const sc = isOk ? '#10b981' : '#f59e0b';
              const hp = asset.health_pct ?? 95;
              return (
                <div key={asset.id} onClick={() => setSelectedAsset(asset)}
                  className="glass-panel p-4 rounded-2xl border border-polar-border hover:border-sky-500/40 cursor-pointer transition-all group shadow-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-mono font-bold text-white group-hover:text-sky-300 transition-colors">{asset.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">{asset.subsystem}</div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold shrink-0"
                      style={{ borderColor: `${sc}44`, background: `${sc}11`, color: sc }}>
                      {asset.status.split(' ')[0]}
                    </span>
                  </div>
                  {/* Health arc */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                      <svg viewBox="0 0 48 48" width="48" height="48">
                        <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle cx="24" cy="24" r="18" fill="none" stroke={sc} strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 18 * (hp / 100)} ${2 * Math.PI * 18}`}
                          transform="rotate(-90 24 24)"
                          style={{ filter: `drop-shadow(0 0 3px ${sc})` }} />
                        <text x="24" y="28" textAnchor="middle" fill="white" fontSize="9" fontWeight="900" fontFamily="monospace">{hp}%</text>
                      </svg>
                    </div>
                    <div className="text-xs font-mono space-y-1">
                      <div className="text-slate-400">Power: <span className="font-bold text-amber-300">{asset.power_draw_kw} kW</span></div>
                      <div className="text-slate-400">Health: <span className="font-bold" style={{ color: sc }}>{hp}%</span></div>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 bg-polar-darker/60 px-2 py-1 rounded border border-polar-border/30 truncate">
                    {asset.source_provenance}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── What-If Tab ── */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Communication Link Scenario Sandbox
            </div>
            <p className="text-[10px] font-mono text-slate-500">
              Simulate link failures on an isolated cloned state. Live twin is never touched.
            </p>
            <div className="space-y-3">
              {WHAT_IF_PRESETS.map((sc) => {
                const isActive = activeScenario === sc.id;
                return (
                  <button key={sc.id} onClick={() => runWhatIf(sc.id, sc.params)} disabled={whatIfLoading}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-sky-500/10 border-sky-500/50' : 'bg-polar-dark/50 border-polar-border hover:border-white/20'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-white">{sc.title}</div>
                      {isActive && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-300">ACTIVE</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">{sc.desc}</div>
                  </button>
                );
              })}
            </div>
            {whatIfLoading && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                <span className="text-xs font-mono text-sky-300">Simulating communication perturbation…</span>
              </div>
            )}
          </div>

          {/* Result panel */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
            {!whatIfResult ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-sm font-mono text-center gap-3">
                <Signal className="w-12 h-12 opacity-20" />
                <p>Select a scenario and run simulation to see impact on the cloned Digital Twin state.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/40">
                  <div className="text-xs font-mono font-bold text-sky-300">{WHAT_IF_PRESETS.find(p => p.id === activeScenario)?.title}</div>
                  <div className="text-[10px] font-mono text-emerald-300 mt-1">✓ CLONED-STATE VERIFIED — LIVE STATE SAFE</div>
                </div>
                {/* Comparison metrics */}
                {whatIfResult.baseline && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-mono">
                      <thead>
                        <tr className="border-b border-polar-border">
                          <th className="text-left text-slate-500 pb-2 pr-3">Metric</th>
                          <th className="text-left text-slate-500 pb-2 pr-3">Baseline</th>
                          <th className="text-left text-slate-500 pb-2 pr-3">Projected</th>
                          <th className="text-left text-slate-500 pb-2">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-polar-border/20">
                        {[
                          { label: 'Bandwidth', base: `${whatIfResult.baseline.bandwidth_mbps} Mbps`, proj: `${whatIfResult.projected.bandwidth_mbps} Mbps`, delta: `${whatIfResult.delta.bandwidth_delta_mbps} Mbps`, bad: true },
                          { label: 'Latency', base: `${whatIfResult.baseline.latency_ms} ms`, proj: `${whatIfResult.projected.latency_ms} ms`, delta: `+${whatIfResult.delta.latency_delta_ms} ms`, bad: true },
                          { label: 'Packet Loss', base: `${whatIfResult.baseline.packet_loss_pct}%`, proj: `${whatIfResult.projected.packet_loss_pct}%`, delta: `+${whatIfResult.delta.packet_loss_delta_pct}%`, bad: true },
                          { label: 'Freshness', base: `${whatIfResult.baseline.telemetry_freshness_sec}s`, proj: `${whatIfResult.projected.telemetry_freshness_sec}s`, delta: `+${whatIfResult.delta.freshness_delta_sec}s`, bad: true },
                        ].map(r => (
                          <tr key={r.label}>
                            <td className="py-2 pr-3 text-slate-400">{r.label}</td>
                            <td className="py-2 pr-3 text-slate-300">{r.base}</td>
                            <td className="py-2 pr-3 font-bold text-amber-300">{r.proj}</td>
                            <td className="py-2 font-bold text-rose-400">{r.delta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {whatIfResult.recommendation && (
                  <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
                    <div className="text-[10px] font-mono font-bold text-sky-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {whatIfResult.recommendation.title}
                    </div>
                    <p className="text-[10px] font-mono text-slate-300 leading-relaxed">{whatIfResult.recommendation.rationale}</p>
                    <div className="space-y-1">
                      {(whatIfResult.recommendation.actions ?? []).map((act: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[9px] font-mono text-slate-300">
                          <span className="text-sky-400 font-bold shrink-0">✓</span><span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => { setWhatIfResult(null); setActiveScenario(null); }}
                  className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <X className="w-3.5 h-3.5" /> Clear Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Drilldown Modals ── */}
      {activeModal === 'bandwidth' && (
        <Modal title="Link Bandwidth & Throughput Breakdown" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Total Capacity', v: `${bwCapacity} Mbps`, c: '#94a3b8' },
              { l: 'Active Throughput', v: `${bwMbps} Mbps`, c: '#38bdf8' },
              { l: 'Channel Utilization', v: `${utilPct}%`, c: '#10b981' },
              { l: 'Available Headroom', v: `${(bwCapacity - bwMbps).toFixed(1)} Mbps`, c: '#06b6d4' },
              { l: 'Tier 1 (Safety/SCADA)', v: '35% — 32 Mbps', c: '#10b981' },
              { l: 'Tier 2 (Science)', v: '45% — 48 Mbps', c: '#06b6d4' },
              { l: 'Tier 3 (Crew)', v: '20% — 22 Mbps', c: '#64748b' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'latency' && (
        <Modal title="Round-Trip Ping Latency & Jitter Profile" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Current Latency', v: `${latMs} ms`, c: '#10b981' },
              { l: '24-Hour Average', v: `${comm?.latency_avg_ms ?? 76} ms`, c: '#94a3b8' },
              { l: 'Peak Observed', v: `${comm?.latency_peak_ms ?? 94} ms`, c: '#f59e0b' },
              { l: 'Jitter', v: `±${comm?.latency_jitter_ms ?? 3} ms`, c: '#06b6d4' },
              { l: 'Trend', v: comm?.latency_trend ?? 'STABLE', c: '#10b981' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'packet_loss' && (
        <Modal title="Packet Delivery & Frame Statistics" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Drop Rate', v: `${lossP}%`, c: lossP < 0.5 ? '#10b981' : '#f59e0b' },
              { l: 'Total Sent', v: (comm?.packets_sent ?? 842100).toLocaleString(), c: '#94a3b8' },
              { l: 'Received', v: (comm?.packets_received ?? 841678).toLocaleString(), c: '#10b981' },
              { l: 'Dropped', v: `${comm?.packets_dropped ?? 422}`, c: '#ef4444' },
              { l: 'Status', v: comm?.packet_loss_status ?? 'OPTIMAL', c: '#10b981' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'freshness' && (
        <Modal title="Digital Twin Telemetry Stream Health" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Current Freshness', v: `${freshSec}s`, c: '#818cf8' },
              { l: 'Expected Interval', v: `${comm?.expected_interval_sec ?? 2.0}s`, c: '#94a3b8' },
              { l: 'Data Confidence', v: `${dataConfidence}%`, c: '#10b981' },
              { l: 'Completeness', v: `${comm?.data_completeness_pct ?? 99.8}%`, c: '#06b6d4' },
              { l: 'Domains Synced', v: '16 of 16', c: '#10b981' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Asset detail modal */}
      {selectedAsset && (
        <Modal title={`Asset: ${selectedAsset.name}`} onClose={() => setSelectedAsset(null)}>
          <div className="space-y-3 text-xs font-mono text-slate-300">
            {[
              { l: 'Status', v: selectedAsset.status, c: '#10b981' },
              { l: 'Health Index', v: `${selectedAsset.health_pct}%`, c: '#10b981' },
              { l: 'Power Draw', v: `${selectedAsset.power_draw_kw} kW`, c: '#f59e0b' },
              { l: 'Power Source', v: selectedAsset.power_source, c: '#94a3b8' },
            ].map(r => (
              <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                <span className="text-slate-400">{r.l}</span>
                <span className="font-bold truncate max-w-[200px] text-right" style={{ color: r.c }}>{r.v}</span>
              </div>
            ))}
            <div className="p-2.5 rounded-lg bg-polar-dark border border-polar-border text-[10px] text-slate-400">
              <div className="font-bold text-slate-300 mb-1">Operating Condition</div>
              <p>{selectedAsset.operating_condition}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-polar-dark border border-sky-500/30 text-[10px] text-cyan-300">
              <div className="font-bold mb-1">Recent Event</div>
              <p>{selectedAsset.recent_event}</p>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      `}</style>
    </div>
  );
};

export default CommunicationPage;
