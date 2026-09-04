import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { alertsApi } from '../api/client';
import { RadarRiskChart } from '../components/charts/RadarRiskChart';
import { RealTimeAlertFeed } from '../components/charts/RealTimeAlertFeed';
import { EChartsBar } from '../components/charts/EChartsBar';
import { Shield, AlertTriangle, CheckCircle, Filter } from 'lucide-react';

// ── Animated Risk Score Ring ──────────────────────────────────────────────
const RiskScoreRing: React.FC<{ score: number; level: string; accentColor: string }> = ({
  score,
  level,
  accentColor,
}) => {
  const pct = Math.max(0, Math.min(100, score));
  const r = 68;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = score >= 76 ? '#ef4444' : score >= 51 ? '#f59e0b' : score >= 26 ? '#eab308' : '#10b981';
  const label = score >= 76 ? 'CRITICAL' : score >= 51 ? 'HIGH' : score >= 26 ? 'MEDIUM' : 'LOW';
  const gradId = `risk-grad-${score}`;

  // Tick marks at 25, 50, 75
  const getTick = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    const cx = 90, cy = 90;
    return {
      x1: cx + Math.cos(rad) * (r - 8),
      y1: cy + Math.sin(rad) * (r - 8),
      x2: cx + Math.cos(rad) * (r + 2),
      y2: cy + Math.sin(rad) * (r + 2),
    };
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`${color}88`} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        {/* Zone colors (background sectors) */}
        {[
          { from: 0, to: 25, c: '#10b98122' },
          { from: 25, to: 50, c: '#eab30822' },
          { from: 50, to: 75, c: '#f59e0b22' },
          { from: 75, to: 100, c: '#ef444422' },
        ].map((zone) => {
          const startOff = circ * (1 - zone.to / 100);
          const endOff = circ * (1 - zone.from / 100);
          return (
            <circle
              key={zone.from}
              cx="90" cy="90" r={r}
              fill="none" stroke={zone.c} strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={`${endOff - startOff} ${circ - (endOff - startOff)}`}
              strokeDashoffset={startOff}
              transform="rotate(-90 90 90)"
            />
          );
        })}
        {/* Active fill */}
        <circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 10px ${color})` }}
        />
        {/* Threshold ticks */}
        {[25, 50, 75].map((t) => {
          const angle = -90 + t * 3.6;
          const tk = getTick(angle);
          return <line key={t} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />;
        })}
        {/* Center labels */}
        <text x="90" y="80" textAnchor="middle" fill="white" fontSize="30" fontWeight="900" fontFamily="monospace">{score}</text>
        <text x="90" y="96" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">/ 100 pts</text>
        <text x="90" y="116" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold" fontFamily="monospace">{label}</text>
      </svg>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const RiskAlertsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { liveRisk } = useTelemetryStore();
  const { alerts, loadAlerts } = useAlertStore();
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadAlerts(stationId);
  }, [stationId, loadAlerts]);

  const currentRisk = liveRisk[stationId] || {
    station_id: stationId,
    score: 22.0,
    level: 'LOW',
    contributing_factors: [
      { factor: 'Generator Electrical Load', weight: 0.35 },
      { factor: 'Solar Generation Deficit', weight: 0.25 },
      { factor: 'Fuel Reserve Level', weight: 0.20 },
      { factor: 'Severe Weather Events', weight: 0.15 },
      { factor: 'Equipment Degradation', weight: 0.05 },
    ],
    timestamp: new Date().toISOString(),
    explanation:
      'Station operations nominal. All life-support and fuel margins are within safe operational zones. No critical cascades detected.',
  };

  const stationAlerts = alerts[stationId] || [];
  const filteredAlerts =
    severityFilter === 'ALL'
      ? stationAlerts
      : stationAlerts.filter((a) => a.severity.toUpperCase() === severityFilter.toUpperCase());

  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';
  const riskScore = typeof currentRisk.score === 'number' ? currentRisk.score : 22;

  // Radar dimensions — 6 risk domains
  const radarDimensions = [
    { name: 'Energy', max: 100, value: Math.min(100, (currentRisk.contributing_factors?.find((f: any) => f.factor.toLowerCase().includes('load') || f.factor.toLowerCase().includes('energy'))?.weight ?? 0.35) * 200) },
    { name: 'Fuel', max: 100, value: Math.min(100, (currentRisk.contributing_factors?.find((f: any) => f.factor.toLowerCase().includes('fuel'))?.weight ?? 0.2) * 250) },
    { name: 'Weather', max: 100, value: Math.min(100, (currentRisk.contributing_factors?.find((f: any) => f.factor.toLowerCase().includes('weather') || f.factor.toLowerCase().includes('storm'))?.weight ?? 0.15) * 300) },
    { name: 'Equipment', max: 100, value: Math.min(100, (currentRisk.contributing_factors?.find((f: any) => f.factor.toLowerCase().includes('equipment') || f.factor.toLowerCase().includes('degrad'))?.weight ?? 0.1) * 400) },
    { name: 'Water', max: 100, value: Math.min(100, riskScore * 0.3) },
    { name: 'Comms', max: 100, value: Math.min(100, riskScore * 0.15) },
  ];

  // Bar chart of contributing factors
  const factorBars = (currentRisk.contributing_factors || []).map((f: any, i: number) => ({
    name: f.factor.replace(/[^a-zA-Z\s]/g, '').trim().substring(0, 20),
    value: Math.round(f.weight * 100),
    color: ['#06b6d4', '#818cf8', '#f59e0b', '#ef4444', '#10b981'][i % 5],
  }));

  // Alert summary counts
  const alertCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  stationAlerts.forEach((a) => {
    const sev = (a.severity || '').toUpperCase();
    if (sev in alertCounts) alertCounts[sev as keyof typeof alertCounts]++;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Security Operations Center — Risk Surveillance &amp; Telemetry Alerting</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Station Risk Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Multi-factor weighted scoring (0–100). Every score &amp; alert carries explainable causal reasoning — never a bare number.
            </p>
          </div>

          {/* Alert count pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(alertCounts).map(([sev, count]) => {
              const colors: Record<string, string> = {
                CRITICAL: 'bg-red-500/20 text-red-300 border-red-500/40',
                HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                MEDIUM: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                LOW: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              };
              return (
                <div key={sev} className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 ${colors[sev]}`}>
                  <span>{count}</span>
                  <span>{sev}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Risk Ring + Explanation */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border flex flex-col items-center gap-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 self-start">
            Composite Risk Score
          </div>
          <RiskScoreRing
            score={riskScore}
            level={currentRisk.level}
            accentColor={accentColor}
          />

          <div className="w-full bg-polar-dark/80 p-4 rounded-xl border border-polar-border text-xs font-ui leading-relaxed text-slate-300">
            {currentRisk.explanation}
          </div>

          <div className="w-full pt-3 border-t border-polar-border/60 space-y-1.5 text-[10px] font-mono text-slate-500">
            <div className="flex justify-between">
              <span>Scale:</span>
              <span>0–25 Low | 26–50 Med | 51–75 High | 76+ Crit</span>
            </div>
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="text-cyan-400">SHAP / Multi-Domain Weights</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="text-slate-400">{new Date(currentRisk.timestamp || Date.now()).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Center: Radar Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border flex flex-col">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-bold">
            6-Domain Risk Radar
          </div>
          <div className="flex-1">
            <RadarRiskChart
              dimensions={radarDimensions}
              height={290}
              accentColor={accentColor}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-500 text-center mt-2">
            Higher value = higher contribution to composite risk
          </div>
        </div>

        {/* Right: Factor Attribution Bars */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border flex flex-col">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-bold">
            Risk Factor Attribution (%)
          </div>
          <EChartsBar
            data={factorBars}
            horizontal
            height={200}
            unit="%"
            maxValue={100}
          />

          {/* Factor Legend */}
          <div className="mt-4 space-y-2">
            {factorBars.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: f.color }} />
                  <span className="text-slate-400">{f.name}</span>
                </div>
                <span className="font-bold" style={{ color: f.color }}>{f.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Alert Feed */}
      <div className="glass-panel rounded-2xl border border-polar-border overflow-hidden">
        <div className="p-4 border-b border-polar-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
              Live Telemetry Alert Stream ({filteredAlerts.length} active)
            </h3>
          </div>

          {/* Severity filter pills */}
          <div className="flex items-center gap-1 bg-polar-dark/80 p-1 rounded-lg border border-polar-border text-[11px] font-mono">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded transition-all ${
                  severityFilter === s
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <RealTimeAlertFeed alerts={filteredAlerts} maxVisible={showAll ? 50 : 8} />
          {filteredAlerts.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 w-full text-center text-[10px] font-mono text-cyan-400 hover:text-cyan-300 py-2 border border-polar-border/60 rounded-lg hover:bg-polar-navy/30 transition-all"
            >
              {showAll ? '▲ Show Less' : `▼ Show All ${filteredAlerts.length} Alerts`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
