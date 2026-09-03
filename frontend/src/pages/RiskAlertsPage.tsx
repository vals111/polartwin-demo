import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { alertsApi } from '../api/client';
import { Shield, AlertTriangle, CheckCircle, Info, Filter, ArrowUpRight } from 'lucide-react';

export const RiskAlertsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';

  const { liveRisk } = useTelemetryStore();
  const { alerts, loadAlerts } = useAlertStore();
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    loadAlerts(stationId);
  }, [stationId, loadAlerts]);

  const currentRisk = liveRisk[stationId] || {
    station_id: stationId,
    score: 22.0,
    level: 'LOW',
    contributing_factors: [
      { factor: 'High Generator Load', weight: 0.35 },
      { factor: 'Low Solar Generation', weight: 0.25 },
      { factor: 'Low Fuel Reserve', weight: 0.20 },
      { factor: 'Severe Weather', weight: 0.15 }
    ],
    timestamp: new Date().toISOString(),
    explanation: 'Station operations nominal. All life support and fuel margins are within safe operational zones.'
  };

  const stationAlerts = alerts[stationId] || [];
  const filteredAlerts = severityFilter === 'ALL'
    ? stationAlerts
    : stationAlerts.filter(a => a.severity.toUpperCase() === severityFilter.toUpperCase());

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' };
      case 'HIGH': return { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40' };
      case 'MEDIUM': return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' };
      default: return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
    }
  };

  const riskStyle = getRiskColor(currentRisk.level);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Operational Risk Engine & Explainable Alerting</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Station Risk Surveillance
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Real-time multi-factor weighted risk scoring (0–100 scale). 
              Every score, alert, and recommendation carries human-readable causal reasoning — never a bare number.
            </p>
          </div>

          <div className={`p-4 rounded-xl border text-center font-mono ${riskStyle.bg} ${riskStyle.border}`}>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Risk Assessment</div>
            <div className={`text-2xl font-black ${riskStyle.text}`}>
              {currentRisk.level}
            </div>
            <div className="text-xs text-slate-300">{currentRisk.score} / 100 pts</div>
          </div>
        </div>
      </div>

      {/* Risk Decomposition & Contributing Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Explanation Card */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-polar-border flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase mb-3">
              Automated Plain-Language Causal Verdict
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed bg-polar-dark/80 p-4 rounded-xl border border-polar-border font-ui">
              {currentRisk.explanation || 'Station parameters within nominal operating bounds. Fuel reserve and generator electrical load are balanced against meteorological conditions.'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-polar-border/60 text-[11px] font-mono text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Risk Band Scale:</span>
              <span>0-25 Low, 26-50 Med, 51-75 High, 76-100 Crit</span>
            </div>
            <div className="flex justify-between">
              <span>Attribution Method:</span>
              <span className="text-cyan-300">SHAP / Multi-Domain Factor Weights</span>
            </div>
          </div>
        </div>

        {/* Contributing Factors Bar Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border">
          <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase mb-4">
            Risk Factor Attribution Weights
          </h3>
          <div className="space-y-4">
            {currentRisk.contributing_factors?.map((f, idx) => {
              const pct = Math.round(f.weight * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-semibold">{f.factor}</span>
                    <span className="text-cyan-400 font-bold">{pct}% Contribution</span>
                  </div>
                  <div className="w-full bg-polar-darker h-3 rounded-full overflow-hidden p-0.5 border border-polar-border/60">
                    <div
                      className="bg-gradient-to-r from-blue-600 via-cyan-500 to-amber-500 h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(5, pct * 2))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alert Feed Table */}
      <div className="glass-panel rounded-2xl border border-polar-border overflow-hidden">
        <div className="p-4 border-b border-polar-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
              Station Telemetry Alert Stream ({filteredAlerts.length})
            </h3>
          </div>

          {/* Severity Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-polar-dark/80 p-1 rounded-lg border border-polar-border text-[11px] font-mono">
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

        <div className="divide-y divide-polar-border/30">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              No active alerts matching severity filter "{severityFilter}".
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const style = getRiskColor(alert.severity);
              return (
                <div key={alert.alert_id} className="p-4 hover:bg-polar-navy/20 transition-colors flex items-start space-x-3 text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border flex-shrink-0 mt-0.5 ${style.bg} ${style.border} ${style.text}`}>
                    {alert.severity}
                  </span>
                  <div className="flex-1">
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {alert.message}
                    </p>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      Event ID: {alert.alert_id} • Detected at: {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
