import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useScenarioStore } from '../store/scenarioStore';
import { WhatIfPreset } from '../types';
import {
  FlaskConical, Play, CheckCircle, AlertTriangle,
  ArrowRight, TrendingDown, TrendingUp, Info, RotateCcw
} from 'lucide-react';

export const WhatIfPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';

  const { presets, loadPresets, selectedPreset, selectPreset, runScenario, currentResult, isRunning } = useScenarioStore();
  const [customTicks, setCustomTicks] = useState(24);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleRun = async () => {
    if (!selectedPreset) return;
    const def = {
      ...selectedPreset,
      duration_ticks: customTicks
    };
    await runScenario(stationId, def);
  };

  const comparison = currentResult?.comparison;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <FlaskConical className="w-4 h-4" />
              <span>Isolated Monte Carlo / Perturbation Engine</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              What-If Scenario Simulation
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Simulate operational stress and climate shocks on a <strong>cloned twin state</strong>. 
              The live Digital Twin continues ticking undisturbed while future multi-day outcomes 
              are evaluated and compared against baseline.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRun}
              disabled={isRunning || !selectedPreset}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
            >
              {isRunning ? (
                <span>Simulating Perturbation...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute What-If Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Library & Configuration */}
      <div>
        <h2 className="text-sm font-bold font-mono tracking-wider text-slate-300 uppercase mb-3">
          1. Select Contingency Preset (8 Built-in Scenarios)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {presets.map((p) => {
            const isSelected = selectedPreset?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  selectPreset(p);
                  setCustomTicks(p.duration_ticks || 24);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/40 shadow-md'
                    : 'glass-panel border-polar-border hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 uppercase mb-1.5">
                    <span>{p.category}</span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      p.expected_risk === 'HIGH' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {p.expected_risk}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1">{p.name}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{p.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-polar-border/40 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Duration: {p.duration_ticks} ticks</span>
                  <span className="text-cyan-400">{isSelected ? 'Selected' : 'Click to Pick'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Baseline vs Projected Comparison Results */}
      {comparison ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Comparison Summary Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-polar-border/60 gap-4 mb-6">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  Scenario Execution Output
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {currentResult.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Simulated across {currentResult.ticks_simulated} time-steps • Cloned state isolation confirmed
                </p>
              </div>

              {/* Risk comparison badges */}
              <div className="flex items-center space-x-4">
                <div className="bg-polar-dark p-3 rounded-xl border border-polar-border text-center">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Baseline Risk</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {currentResult.baseline_risk.level} ({currentResult.baseline_risk.score} pts)
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-cyan-400" />

                <div className="bg-polar-dark p-3 rounded-xl border border-red-500/40 text-center">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Projected Risk</div>
                  <div className="text-base font-bold font-mono text-red-400">
                    {currentResult.projected_risk.level} ({currentResult.projected_risk.score} pts)
                  </div>
                </div>
              </div>
            </div>

            {/* Baseline vs Projected Table per Section 10 & 26 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-polar-border/60 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Monitored Parameter</th>
                    <th className="py-2.5 px-3">Baseline (Current Trend)</th>
                    <th className="py-2.5 px-3">Projected (Under Scenario)</th>
                    <th className="py-2.5 px-3">Operational Delta</th>
                    <th className="py-2.5 px-3">Impact Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-polar-border/30">
                  {Object.entries(comparison).map(([key, item]) => {
                    const deltaVal = item.delta;
                    const isAdverse = key.includes('risk') || key.includes('load') ? deltaVal > 0 : deltaVal < 0;

                    const labelMap: Record<string, string> = {
                      fuel_reserve_liters: 'Usable Fuel Reserve',
                      fuel_percentage: 'Fuel Reserve Percentage',
                      days_fuel_remaining: 'Fuel Survival Margin',
                      generator_load_kw: 'Generator Power Stress',
                      water_storage_liters: 'Stored Water Reserve',
                      equipment_health_avg: 'Average Machinery Health',
                      station_readiness_score: 'Composite Station Readiness',
                      station_risk_score: 'Station Weighted Risk Index'
                    };

                    return (
                      <tr key={key} className="hover:bg-polar-navy/30 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {labelMap[key] || key}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {item.baseline.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-white font-bold">
                          {item.projected.toLocaleString()} {item.unit}
                        </td>
                        <td className={`py-3 px-3 font-bold ${isAdverse ? 'text-red-400' : 'text-emerald-400'}`}>
                          {deltaVal > 0 ? `+${deltaVal}` : deltaVal} {item.unit}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] ${
                            isAdverse ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {isAdverse ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            <span>{isAdverse ? 'Stress Elevated' : 'Favorable Margin'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Factor Attribution Breakdown per Section 12 & 27 */}
            <div className="mt-8 pt-6 border-t border-polar-border/60">
              <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider mb-3">
                Factor Attribution Breakdown (Explainable Reason for Delta)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {currentResult.attribution?.map((attr, idx) => (
                  <div key={idx} className="bg-polar-dark/80 border border-polar-border p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 truncate font-mono">{attr.factor}</div>
                    <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
                      {attr.impact_pct}%
                    </div>
                    <div className="w-full bg-polar-border/60 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-cyan-400 h-full rounded-full"
                        style={{ width: `${attr.impact_pct * 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action Box */}
            <div className="mt-6 p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-start space-x-3 text-xs">
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white font-mono uppercase tracking-wide">
                  Operator Decision Support Recommendation:
                </div>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {currentResult.recommended_action}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl border border-polar-border text-center">
          <FlaskConical className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white">Ready for What-If Execution</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Select one of the 8 contingency presets above and click Execute to view the multi-tick 
            baseline vs projected comparison on cloned state.
          </p>
          <button
            onClick={handleRun}
            disabled={!selectedPreset}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            Run Selected Scenario Now
          </button>
        </div>
      )}
    </div>
  );
};
