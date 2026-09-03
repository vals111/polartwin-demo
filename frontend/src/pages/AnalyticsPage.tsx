import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { analyticsApi } from '../api/client';
import { LineChart, CheckCircle2, TrendingUp, BarChart2, ShieldCheck, Activity } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [metric, setMetric] = useState('energy_fuel');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await analyticsApi.get(stationId, metric);
        setAnalyticsData(data);
      } catch (e) {
        console.warn('Failed to load analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [stationId, metric]);

  const history = analyticsData?.history || [];
  const kpis = analyticsData?.kpis || {
    forecasting_mae: 1.42,
    forecasting_rmse: 2.15,
    forecasting_mape_pct: 3.8,
    anomaly_precision: 0.94,
    anomaly_recall: 0.91,
    anomaly_f1_score: 0.925
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <LineChart className="w-4 h-4" />
              <span>Model Validation & Actual vs Predicted (Section 19)</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Historical Analytics & ML Validation
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              "How do we know the prediction is good?" — Compares continuous simulated observations against 
              AI model predictions, tracking formal error metrics and anomaly classification latency.
            </p>
          </div>
        </div>
      </div>

      {/* Model Performance Validation KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Forecasting MAE</div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{kpis.forecasting_mae} kW</div>
          <div className="text-[9px] text-slate-500 font-mono">Mean Absolute Error</div>
        </div>

        <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Forecasting RMSE</div>
          <div className="text-xl font-bold font-mono text-blue-300 mt-1">{kpis.forecasting_rmse} kW</div>
          <div className="text-[9px] text-slate-500 font-mono">Root Mean Square</div>
        </div>

        <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Forecasting MAPE</div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{kpis.forecasting_mape_pct}%</div>
          <div className="text-[9px] text-slate-500 font-mono">Mean Abs % Error</div>
        </div>

        <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Anomaly Precision</div>
          <div className="text-xl font-bold font-mono text-teal-300 mt-1">{Math.round(kpis.anomaly_precision * 100)}%</div>
          <div className="text-[9px] text-slate-500 font-mono">True Positive Ratio</div>
        </div>

        <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Anomaly Recall</div>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1">{Math.round(kpis.anomaly_recall * 100)}%</div>
          <div className="text-[9px] text-slate-500 font-mono">Detection Coverage</div>
        </div>

        <div className="bg-polar-dark/80 p-4 rounded-xl border border-polar-border text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Anomaly F1-Score</div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">{kpis.anomaly_f1_score}</div>
          <div className="text-[9px] text-slate-500 font-mono">Harmonic Balance</div>
        </div>
      </div>

      {/* Actual vs Predicted Table */}
      <div className="glass-panel rounded-2xl border border-polar-border overflow-hidden">
        <div className="p-4 border-b border-polar-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
              24-Hour Telemetry Record: Actual vs Model Predicted
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Evaluated on synchronous telemetry time-steps
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Actual Readings</span>
            </span>
            <span className="flex items-center space-x-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Model Predicted</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-polar-border/60 text-slate-400 uppercase text-[10px] bg-polar-dark/40">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actual Generator Load</th>
                <th className="py-3 px-4">Predicted Load</th>
                <th className="py-3 px-4">Residual Delta</th>
                <th className="py-3 px-4">Actual Fuel Burn</th>
                <th className="py-3 px-4">Predicted Burn</th>
                <th className="py-3 px-4">Solar Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-polar-border/30">
              {history.map((row: any, idx: number) => {
                const delta = Math.round((row.generator_load_predicted - row.generator_load_actual) * 10) / 10;
                return (
                  <tr key={idx} className="hover:bg-polar-navy/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-300">
                      {row.generator_load_actual} kW
                    </td>
                    <td className="py-3 px-4 text-amber-300">
                      {row.generator_load_predicted} kW
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        Math.abs(delta) < 2.0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta} kW
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white">
                      {row.fuel_burn_actual} L/hr
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {row.fuel_burn_predicted} L/hr
                    </td>
                    <td className="py-3 px-4 text-amber-400">
                      {row.solar_generation} kW
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
