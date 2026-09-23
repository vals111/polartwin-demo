import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useLive dataStore } from '../store/live dataStore';
import { live dataApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Truck, Ship, Anchor, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, RefreshCw, Layers,
  Compass, MapPin, Wind, CheckCircle2, Activity,
  X, Gauge, Fuel, Package, Play, Sparkles,
  AlertOctagon, ArrowUpRight, ChevronRight, Brain, ArrowLeft
} from 'lucide-react';

// ── Journey Progress Arc ────────────────────────────────────────────────────
const VoyageProgressArc: React.FC<{
  voyageDay: number; totalDays: number; etaDays: number; weatherDelay: number;
}> = ({ voyageDay, totalDays, etaDays, weatherDelay }) => {
  const pct = Math.min(1, voyageDay / totalDays);
  const r = 72;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * pct;
  const delayPct = Math.min(1, weatherDelay / totalDays);
  const delayFilled = arcLen * delayPct;
  const color = pct < 0.4 ? '#10b981' : pct < 0.7 ? '#06b6d4' : '#f59e0b';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={180} height={180} viewBox="0 0 180 180">
        {/* Track */}
        <circle cx={90} cy={90} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={-(circ - arcLen) * 0.125}
          transform="rotate(135 90 90)" />
        {/* Weather delay overlay */}
        <circle cx={90} cy={90} r={r} fill="none" stroke="#ef444455" strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${delayFilled} ${circ - delayFilled}`}
          strokeDashoffset={-(circ - arcLen) * 0.125 + arcLen - filled - delayFilled}
          transform="rotate(135 90 90)" />
        {/* Progress */}
        <circle cx={90} cy={90} r={r} fill="none" stroke={color} strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={-(circ - arcLen) * 0.125 + arcLen - filled}
          transform="rotate(135 90 90)"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        {/* Ship icon position */}
        {(() => {
          const angle = (135 + pct * 270) * Math.PI / 180;
          const sx = 90 + r * Math.cos(angle);
          const sy = 90 + r * Math.sin(angle);
          return (
            <circle cx={sx} cy={sy} r={6} fill={color}>
              <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
            </circle>
          );
        })()}
        {/* Center text */}
        <text x="90" y="78" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="monospace">{voyageDay}</text>
        <text x="90" y="94" textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace">/ {totalDays} days</text>
        <text x="90" y="108" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">TRANSIT</text>
        <text x="90" y="130" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">+{weatherDelay}d delay</text>
      </svg>
      <div className="text-center">
        <div className="text-xs font-mono text-slate-400">ETA: <strong className="text-cyan-300">{etaDays} days</strong></div>
      </div>
    </div>
  );
};

// ── Route Timeline ──────────────────────────────────────────────────────────
const RouteTimeline: React.FC<{ waypoints: any[] }> = ({ waypoints }) => {
  const statusColor: Record<string, string> = {
    PASSED: '#10b981', ACTIVE: '#06b6d4', UPCOMING: '#64748b',
  };
  const riskColor: Record<string, string> = {
    NOMINAL: '#10b981', MODERATE: '#f59e0b', ELEVATED: '#f97316', HIGH: '#ef4444', CRITICAL: '#dc2626',
  };

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500 via-cyan-500 to-slate-600" />
      <div className="space-y-4">
        {waypoints.map((wp, i) => {
          const sc = statusColor[wp.status] || '#64748b';
          const rc = riskColor[wp.risk] || '#64748b';
          return (
            <div key={i} className="relative flex items-start gap-4 pl-10">
              {/* Node */}
              <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: sc, background: `${sc}11` }}>
                {wp.status === 'PASSED' ? <CheckCircle2 className="w-4 h-4" style={{ color: sc }} />
                  : wp.status === 'ACTIVE' ? <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: sc }} />
                    : <span className="w-2 h-2 rounded-full" style={{ background: '#334155' }} />}
              </div>
              <div className={`flex-1 p-3 rounded-xl border transition-all ${wp.status === 'ACTIVE' ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-polar-border bg-polar-dark/40'}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-xs font-mono font-bold" style={{ color: sc }}>{wp.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">{wp.weather}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {wp.delay_days > 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">+{wp.delay_days}d delay</span>
                    )}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold"
                      style={{ borderColor: `${rc}44`, background: `${rc}11`, color: rc }}>{wp.risk}</span>
                  </div>
                </div>
                {wp.distance_km > 0 && (
                  <div className="text-[9px] font-mono text-slate-600 mt-1">{wp.distance_km.toLocaleString()} km from origin</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Risk Radar EChart ───────────────────────────────────────────────────────
const RiskRadarChart: React.FC<{ riskFactors: any }> = ({ riskFactors }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const indicators = [
      { name: 'Weather Delay', max: 60 },
      { name: 'Route Exposure', max: 60 },
      { name: 'ETA Uncertainty', max: 60 },
      { name: 'Cargo Dependency', max: 60 },
      { name: 'Transport Readiness', max: 60 },
    ];

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        radius: '65%',
        center: ['50%', '50%'],
        nameGap: 6,
        name: { textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            riskFactors.weather_delay || 38,
            riskFactors.route_exposure || 24,
            riskFactors.eta_uncertainty || 18,
            riskFactors.cargo_dependency || 12,
            riskFactors.transport_readiness || 8,
          ],
          name: 'Logistics Risk',
          symbol: 'circle', symbolSize: 5,
          lineStyle: { color: '#06b6d4', width: 2 },
          areaStyle: { color: 'rgba(6,182,212,0.15)' },
          itemStyle: { color: '#06b6d4' },
        }],
      }],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [riskFactors]);

  return <div ref={ref} className="w-full h-56" />;
};

// ── Asset Card ──────────────────────────────────────────────────────────────
const AssetCard: React.FC<{ asset: any; selected: boolean; onClick: () => void }> = ({ asset, selected, onClick }) => {
  const statusColor = asset.status === 'READY' ? '#10b981' : asset.status === 'STANDBY' ? '#f59e0b' : '#ef4444';
  return (
    <div onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${selected ? 'border-cyan-500/60 bg-cyan-500/5' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-xs font-mono font-bold text-white">{asset.name}</div>
          <div className="text-[10px] font-mono text-slate-500">{asset.type}</div>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold shrink-0"
          style={{ borderColor: `${statusColor}44`, background: `${statusColor}11`, color: statusColor }}>
          {asset.status}
        </span>
      </div>
      {/* Readiness bar */}
      <div className="h-1.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40 mb-2">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${asset.readiness_pct}%`, background: `linear-gradient(to right, ${statusColor}88, ${statusColor})` }} />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-slate-500">
        <span>Readiness: <strong style={{ color: statusColor }}>{asset.readiness_pct}%</strong></span>
        <span>{asset.count}</span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const LogisticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useLive dataStore();

  const [localLogistics, setLocalLogistics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'voyage' | 'assets' | 'cargo' | 'risk'>('voyage');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [delayDays, setDelayDays] = useState(30);

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await live dataApi.getLogistics(stationId);
        if (mounted && data) setLocalLogistics(data);
      } catch {}
    };
    load();
    setWhatIfResult(null);
    return () => { mounted = false; };
  }, [stationId]);

  const snapshot = liveSnapshot[stationId];
  const log = snapshot?.logistics || localLogistics;
  const env = snapshot?.environment;

  const plannedEta = log?.planned_eta_days ?? (isMaitri ? 88.0 : 102.0);
  const weatherDelay = log?.weather_delay_days ?? (isMaitri ? 3.5 : 1.5);
  const effectiveEta = log?.effective_eta_days ?? (plannedEta + weatherDelay);
  const voyageDay = log?.voyage_day ?? 34;
  const totalVoyageDays = log?.total_voyage_days ?? 120;
  const voyageProgress = Math.round((voyageDay / totalVoyageDays) * 100);
  const logisticsRisk = log?.logistics_risk_score ?? (isMaitri ? 25.3 : 18.4);
  const riskLevel = logisticsRisk < 30 ? 'LOW' : logisticsRisk < 60 ? 'MEDIUM' : 'HIGH';
  const riskLevelColor = riskLevel === 'LOW' ? '#10b981' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444';
  const vesselName = log?.resupply_vessel ?? 'MV Vasiliy Golovnin';
  const confidence = log?.confidence ?? 'Medium';

  const riskFactors = log?.risk_factors ?? {
    weather_delay: 38, route_exposure: 24, eta_uncertainty: 18,
    cargo_dependency: 12, transport_readiness: 8,
  };

  const routeWaypoints = log?.route_waypoints ?? (isMaitri ? [
    { name: 'Cape Town Harbor', status: 'PASSED', distance_km: 0, weather: 'Clear / 18°C', delay_days: 0, risk: 'NOMINAL' },
    { name: 'Southern Ocean Gales', status: 'PASSED', distance_km: 2400, weather: 'Sea State 6 / 45 km/h Wind', delay_days: 1.0, risk: 'MODERATE' },
    { name: 'Princess Astrid Ice Edge', status: 'ACTIVE', distance_km: 4100, weather: 'Polar downslope wind 35 km/h / Pack Ice', delay_days: 2.5, risk: 'ELEVATED' },
    { name: 'Ice Shelf Barrier Mooring', status: 'UPCOMING', distance_km: 4350, weather: '-22°C / Snow Drift', delay_days: 0, risk: 'HIGH' },
    { name: '100km Overland Supply run', status: 'UPCOMING', distance_km: 4450, weather: 'Crevasse / Whiteout Risk', delay_days: 0, risk: 'CRITICAL' },
  ] : [
    { name: 'Cape Town Harbor', status: 'PASSED', distance_km: 0, weather: 'Clear / 19°C', delay_days: 0, risk: 'NOMINAL' },
    { name: 'Roaring Forties / Fifties', status: 'PASSED', distance_km: 2600, weather: 'Sea State 5 / 38 km/h', delay_days: 0.5, risk: 'MODERATE' },
    { name: 'Prydz Bay Pack Ice', status: 'ACTIVE', distance_km: 4500, weather: 'Sea Ice Drift / -18°C', delay_days: 1.0, risk: 'ELEVATED' },
    { name: 'Quilty Bay Mooring', status: 'UPCOMING', distance_km: 4800, weather: 'Fast Ice / -20°C', delay_days: 0, risk: 'MODERATE' },
    { name: 'Bharati Terminal', status: 'UPCOMING', distance_km: 4820, weather: 'Coastal Gale / -22°C', delay_days: 0, risk: 'LOW' },
  ]);

  const assets = log?.assets ?? (isMaitri ? [
    { id: 'fleet-1', name: 'PistenBully 300 Polar Supply run', type: 'Heavy Tracked Snow Tractor', count: '3 Units', status: 'READY', readiness_pct: 94, capacity: '45 MT', assignment: '100km Overland Ice-Shelf Resupply', weather_suitability: 'EXCELLENT' },
    { id: 'fleet-2', name: 'Kamov Ka-32 Helix', type: 'Heavy Lift Rotorcraft', count: '1 Unit', status: 'STANDBY', readiness_pct: 91, capacity: '5,000 kg sling', assignment: 'Airlift / Crew Rotation', weather_suitability: 'MODERATE' },
    { id: 'fleet-3', name: 'Heavy Polar Sled Train', type: 'HDPE Ice Sleds', count: '6 Sleds', status: 'READY', readiness_pct: 98, capacity: '60 MT', assignment: 'Bulk Fuel & Generator Transfer', weather_suitability: 'EXCELLENT' },
  ] : [
    { id: 'fleet-b1', name: 'Self-Propelled Ice Barges', type: 'Amphibious Cargo Barge', count: '2 Barges', status: 'READY', readiness_pct: 96, capacity: '35 MT each', assignment: 'Quilty Bay Shore Shuttle', weather_suitability: 'GOOD' },
    { id: 'fleet-b2', name: 'Kamov Ka-32 Helix', type: 'Heavy Lift Rotorcraft', count: '1 Unit', status: 'READY', readiness_pct: 95, capacity: '5,000 kg sling', assignment: 'Roof Helipad Slings', weather_suitability: 'MODERATE' },
    { id: 'fleet-b3', name: 'PistenBully Groomers', type: 'Tracked Utility Tractor', count: '2 Units', status: 'READY', readiness_pct: 92, capacity: '20 MT', assignment: 'Coastal Ramp Clearing', weather_suitability: 'EXCELLENT' },
  ]);

  const cargoManifest = log?.cargo_manifest ?? [
    { id: 'c1', name: isMaitri ? 'AGO Bulk Diesel (180,000 L)' : 'AGO Bulk Diesel (220,000 L)', category: 'Energy & Thermal', shortage_risk: 'HIGH', required_by_days: isMaitri ? 74 : 85, reserve_days: isMaitri ? 48 : 58, dependent_domain: 'Fuel & Energy' },
    { id: 'c2', name: 'Dry Rations & Fresh Provisions', category: 'Life Support', shortage_risk: 'LOW', required_by_days: 90, reserve_days: 65, dependent_domain: 'Personnel' },
    { id: 'c3', name: 'Equipment Overhaul Spares', category: 'Maintenance', shortage_risk: 'MEDIUM', required_by_days: 80, reserve_days: 35, dependent_domain: 'Equipment & Systems' },
  ];

  const selectedAsset = assets.find((a: any) => a.id === selectedAssetId) || assets[0];

  const handleWhatIf = async () => {
    setWhatIfLoading(true);
    try {
      const res = await scenariosApi.execute(stationId, { type: 'resupply_delay', value: delayDays });
      setWhatIfResult(res || {
        scenario_name: `Resupply Delay +${delayDays} Days`,
        impact: {
          fuel_days_lost: Math.round(delayDays * 0.9),
          risk_score_delta: delayDays * 0.6,
          runway_remaining: Math.max(0, 48 - delayDays),
        },
        recommended_action: delayDays > 20
          ? 'Initiate Tier-2 fuel rationing. Reduce non-residential heating by 2°C. Prioritize solar battery charging during daylight.'
          : 'Monitor situation. Increase consumption audit frequency. Pre-position emergency fuel from reserve bund.',
      });
    } catch { setWhatIfResult({ scenario_name: 'Error', recommended_action: 'Simulation unavailable.' }); }
    finally { setWhatIfLoading(false); }
  };

  // Reusable theme-aware panel style
  const panelStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
  };
  const btnStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="p-5 rounded-2xl" style={panelStyle}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold flex items-center gap-1.5"
                style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
              >
                <Truck className="w-3 h-3" /> Logistics, Resupply & Route Intelligence
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {station.name}
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold"
                style={{ borderColor: `${riskLevelColor}55`, background: `${riskLevelColor}14`, color: riskLevelColor }}
              >
                RISK: {riskLevel}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <Ship className="w-8 h-8" style={{ color: '#2563eb' }} /> Logistics Command Digital Twin
            </h1>
            <p className="text-xs font-mono mt-2 max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {vesselName} · {isMaitri ? 'Cape Town → Princess Astrid → Schirmacher Oasis Overland' : 'Cape Town → Prydz Bay → Quilty Bay Direct'} · {totalVoyageDays}-day mission
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(-1)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer group"
              style={btnStyle}
              title="Navigate Back">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" style={{ color: '#2563eb' }} /> Back
            </button>
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
              style={btnStyle}>
              <Layers className="w-4 h-4" style={{ color: '#2563eb' }} /> All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=logistics`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
              style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed' }}>
              <Brain className="w-4 h-4" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/logistics' : '/station/maitri/logistics')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
              style={btnStyle}>
              <RefreshCw className="w-4 h-4" style={{ color: '#2563eb' }} /> Switch Station
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Voyage Progress', val: `${voyageProgress}%`, sub: `Day ${voyageDay} of ${totalVoyageDays}`, color: '#2563eb', icon: <Compass className="w-4 h-4" /> },
            { label: 'Effective ETA', val: `${effectiveEta.toFixed(0)} Days`, sub: `+${weatherDelay}d weather delay`, color: '#d97706', icon: <Clock className="w-4 h-4" /> },
            { label: 'Logistics Risk', val: `${logisticsRisk.toFixed(1)} pts`, sub: `Level: ${riskLevel}`, color: riskLevelColor, icon: <AlertTriangle className="w-4 h-4" /> },
            { label: 'ETA Confidence', val: confidence, sub: `Vessel: ${vesselName.split(' ')[0]} ${vesselName.split(' ')[1] || ''}`, color: confidence === 'High' ? '#16a34a' : confidence === 'Medium' ? '#d97706' : '#dc2626', icon: <ShieldCheck className="w-4 h-4" /> },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-xl transition-all" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between text-[10px] font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 flex-wrap">
        {(['voyage', 'assets', 'cargo', 'risk'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer"
            style={activeTab === tab
              ? { backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#2563eb' }
              : { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-muted)' }
            }>
            {tab === 'voyage' ? '🚢 Voyage Status' : tab === 'assets' ? '🚛 Transport Assets' : tab === 'cargo' ? '📦 Cargo Manifest' : '⚡ Risk & What-If'}
          </button>
        ))}
      </div>

      {/* ── Voyage Tab ── */}
      {activeTab === 'voyage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Voyage arc */}
          <div className="p-6 rounded-2xl flex flex-col items-center gap-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold self-start w-full" style={{ color: '#2563eb' }}>
              Voyage Progress — {isMaitri ? 'Antarctic Resupply Expedition' : 'Bharati Marine Mission'}
            </div>
            <VoyageProgressArc
              voyageDay={voyageDay} totalDays={totalVoyageDays}
              etaDays={Math.round(effectiveEta)} weatherDelay={weatherDelay}
            />
            <div className="w-full space-y-2 text-xs font-mono">
              {[
                { label: 'Vessel', val: vesselName, color: '#2563eb' },
                { label: 'Ice Class', val: isMaitri ? 'Arc5 / Polar Class 4' : 'Arc4 / Polar Class 5', color: 'var(--text-secondary)' },
                { label: 'Departure', val: 'Cape Town', color: '#16a34a' },
                { label: 'Destination', val: isMaitri ? 'Princess Astrid Coast' : 'Quilty Bay, Bharati', color: '#d97706' },
                { label: 'Planned Window', val: isMaitri ? 'Nov 2026 – Jan 2027' : 'Dec 2026 – Feb 2027', color: 'var(--text-secondary)' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center pb-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Route timeline */}
          <div className="lg:col-span-2 p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-4" style={{ color: 'var(--text-muted)' }}>
              Route Waypoints — Real-Time Progress & Delay Tracking
            </div>
            <RouteTimeline waypoints={routeWaypoints} />
          </div>
        </div>
      )}

      {/* ── Assets Tab ── */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold px-4 py-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {isMaitri ? 'Maitri Overland Resupply Fleet' : 'Bharati Coastal Discharge Fleet'}
            </div>
            {assets.map((asset: any) => (
              <AssetCard
                key={asset.id} asset={asset}
                selected={selectedAssetId === asset.id || (!selectedAssetId && asset.id === assets[0]?.id)}
                onClick={() => setSelectedAssetId(asset.id)}
              />
            ))}
          </div>
          {/* Asset detail */}
          <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Asset Intelligence</div>
            {selectedAsset && (
              <div className="space-y-3">
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedAsset.name}</div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{selectedAsset.type}</div>
                {/* Readiness gauge */}
                <div className="relative flex justify-center my-2">
                  <svg width={120} height={70} viewBox="0 0 120 70">
                    <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
                    <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#16a34a" strokeWidth={10} strokeLinecap="round"
                      strokeDasharray={`${Math.PI * 50 * (selectedAsset.readiness_pct / 100)} ${Math.PI * 50}`} />
                    <text x="60" y="55" textAnchor="middle" fill="var(--text-primary)" fontSize="16" fontWeight="900" fontFamily="monospace">{selectedAsset.readiness_pct}%</text>
                    <text x="60" y="68" textAnchor="middle" fill="#16a34a" fontSize="8" fontFamily="monospace">READINESS</text>
                  </svg>
                </div>
                {[
                  { label: 'Status', val: selectedAsset.status, color: selectedAsset.status === 'READY' ? '#16a34a' : '#d97706' },
                  { label: 'Capacity', val: selectedAsset.capacity, color: '#2563eb' },
                  { label: 'Assignment', val: selectedAsset.assignment, color: 'var(--text-secondary)' },
                  { label: 'Weather Fit', val: selectedAsset.weather_suitability, color: selectedAsset.weather_suitability === 'EXCELLENT' ? '#16a34a' : '#d97706' },
                  { label: 'Count', val: selectedAsset.count, color: 'var(--text-muted)' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-start text-xs font-mono pb-1.5 gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }} className="shrink-0">{r.label}</span>
                    <span className="font-bold text-right" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cargo Tab ── */}
      {activeTab === 'cargo' && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider font-bold px-4 py-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Resupply Cargo Manifest — Critical Dependency Analysis
          </div>
          {cargoManifest.map((cargo: any) => {
            const risk = cargo.shortage_risk;
            const rc = risk === 'HIGH' ? '#dc2626' : risk === 'MEDIUM' ? '#d97706' : '#16a34a';
            const urgency = Math.max(0, Math.min(100, 100 - (cargo.reserve_days / cargo.required_by_days) * 100));
            return (
              <div key={cargo.id} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{cargo.name}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{cargo.category} · {cargo.dependent_domain}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded border font-bold shrink-0"
                    style={{ borderColor: `${rc}55`, background: `${rc}12`, color: rc }}>
                    {risk} RISK
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Required By</div>
                    <div className="text-base font-black font-mono" style={{ color: 'var(--text-primary)' }}>{cargo.required_by_days}d</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Reserve Buffer</div>
                    <div className="text-base font-black font-mono" style={{ color: rc }}>{cargo.reserve_days}d</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>ETA</div>
                    <div className="text-base font-black font-mono" style={{ color: '#2563eb' }}>{Math.round(effectiveEta)}d</div>
                  </div>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${urgency}%`, background: `linear-gradient(to right, ${rc}88, ${rc})` }} />
                </div>
                <div className="text-[9px] font-mono mt-1 text-right" style={{ color: 'var(--text-muted)' }}>Urgency: {urgency.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Risk & What-If Tab ── */}
      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Risk Radar */}
          <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Logistics Risk Factor Radar</div>
            <RiskRadarChart riskFactors={riskFactors} />
            <div className="space-y-2 mt-2">
              {Object.entries(riskFactors).map(([key, val]: [string, any]) => (
                <div key={key} className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{key.replace(/_/g, ' ')}</span>
                    <span className="font-bold" style={{ color: '#2563eb' }}>{val}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(val / 60) * 100}%`, background: 'linear-gradient(to right, #93c5fd, #2563eb)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What-If */}
          <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: '#2563eb' }}>
              <Sparkles className="w-4 h-4" /> Resupply Delay Simulator
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>Delay Duration: <strong style={{ color: '#d97706' }}>{delayDays} days</strong></div>
                <input type="range" min={5} max={90} value={delayDays} onChange={e => setDelayDays(+e.target.value)}
                  className="w-full accent-blue-500 cursor-pointer" />
                <div className="flex justify-between text-[9px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <span>5d</span><span>30d critical</span><span>90d max</span>
                </div>
              </div>
              <button onClick={handleWhatIf} disabled={whatIfLoading}
                className="w-full py-3 rounded-xl text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}>
                {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {whatIfLoading ? 'Simulating...' : 'Run Impact Analysis'}
              </button>
            </div>
            {whatIfResult && (
              <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-xs font-mono font-bold" style={{ color: '#d97706' }}>{whatIfResult.scenario_name}</div>
                {whatIfResult.impact && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
                      <div className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Fuel Days Lost</div>
                      <div className="text-sm font-black font-mono mt-1" style={{ color: '#dc2626' }}>−{whatIfResult.impact.fuel_days_lost}d</div>
                    </div>
                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                      <div className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Risk Delta</div>
                      <div className="text-sm font-black font-mono mt-1" style={{ color: '#d97706' }}>+{whatIfResult.impact.risk_score_delta?.toFixed(1)}pts</div>
                    </div>
                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                      <div className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Runway Left</div>
                      <div className="text-sm font-black font-mono mt-1" style={{ color: '#16a34a' }}>{whatIfResult.impact.runway_remaining}d</div>
                    </div>
                  </div>
                )}
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="text-[9px] font-mono uppercase tracking-wider font-bold mb-1.5" style={{ color: '#16a34a' }}>Recommended Action</div>
                  <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{whatIfResult.recommended_action}</p>
                </div>
                <button onClick={() => setWhatIfResult(null)}
                  className="w-full py-2 rounded-xl text-xs font-mono border flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
