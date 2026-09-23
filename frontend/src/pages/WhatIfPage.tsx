import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useScenarioStore } from '../store/scenarioStore';
import { scenariosApi } from '../api/client';
import {
  FlaskConical, Play, CheckCircle, AlertTriangle,
  ArrowRight, TrendingDown, TrendingUp, Info, Dna, BarChart3
} from 'lucide-react';

export const WhatIfPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';

  const [activeTab, setActiveTab] = useState<'preset' | 'monte_carlo'>('preset');

  // Scenario Store
  const { presets, loadPresets, selectedPreset, selectPreset, runScenario, currentResult, isRunning } = useScenarioStore();
  const [customTicks, setCustomTicks] = useState(24);

  // Monte Carlo State
  const [mcIterations, setMcIterations] = useState(100);
  const [mcHorizonDays, setMcHorizonDays] = useState(30);
  const [mcScenarioType, setMcScenarioType] = useState('nominal');
  const [mcResult, setMcResult] = useState<any>(null);
  const [mcLoading, setMcLoading] = useState(false);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleRunPreset = async () => {
    if (!selectedPreset) return;
    const def = {
      ...selectedPreset,
      duration_ticks: customTicks
    };
    await runScenario(stationId, def);
  };

  const handleRunMonteCarlo = async () => {
    setMcLoading(true);
    try {
      const data = await scenariosApi.runMonteCarlo(stationId, mcIterations, mcHorizonDays, mcScenarioType);
      setMcResult(data);
    } catch (e) {
      console.warn('Monte Carlo run failed:', e);
    } finally {
      setMcLoading(false);
    }
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
              <span>Isolated Contingency & Stochastic Uncertainty Engine</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              What-If & Monte Carlo Simulation
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Simulate operational stress and climate shocks on a <strong>cloned twin state</strong>. 
              The live Digital Twin continues ticking undisturbed while multi-day stochastic futures 
              are evaluated and compared against baseline.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center space-x-2 bg-polar-dark/80 p-1 rounded-xl border border-polar-border">
            <button
              onClick={() => setActiveTab('preset')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'preset'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Preset Contingencies
            </button>
            <button
              onClick={() => setActiveTab('monte_carlo')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'monte_carlo'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monte Carlo Uncertainty
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'preset' ? (
        <>
          {/* Preset Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {presets.map((preset) => {
              const isSelected = selectedPreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-950/80 to-blue-950/60 border-cyan-400 text-white shadow-lg'
                      : 'glass-panel border-polar-border text-slate-400 hover:text-white hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase mb-1.5 opacity-70">
                      <span>{preset.category}</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        preset.expected_risk === 'HIGH' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {preset.expected_risk}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white leading-snug">{preset.name}</div>
                    <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{preset.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-polar-border/40 text-[10px] font-mono text-cyan-400 flex items-center justify-between">
                    <span>Default: {preset.duration_ticks} Ticks</span>
                    {isSelected && <span className="font-bold">Active Selection</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Execution Bar */}
          {selectedPreset && (
            <div className="glass-panel p-4 rounded-xl border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs">
                <span className="text-slate-400">Selected Scenario: </span>
                <strong className="text-white font-mono">{selectedPreset.name}</strong>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-mono">Sim Duration:</span>
                <input
                  type="range"
                  min="12"
                  max="96"
                  step="12"
                  value={customTicks}
                  onChange={(e) => setCustomTicks(Number(e.target.value))}
                  className="w-32 accent-cyan-400"
                />
                <span className="text-xs font-mono text-cyan-300 font-bold">{customTicks} Ticks</span>
                <button
                  onClick={handleRunPreset}
                  disabled={isRunning}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg text-xs font-bold font-mono transition-all disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isRunning ? 'Cloning & Simulating...' : 'Execute What-If'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Baseline vs Projected Comparison Results */}
          {comparison && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl border border-polar-border overflow-hidden">
                <div className="p-4 border-b border-polar-border/60 flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
                    Baseline vs Projected Impact Delta
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400">Section 12 Non-Destructive Projection</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-polar-border/60 text-slate-400 uppercase text-[10px] bg-polar-dark/40">
                        <th className="py-3 px-4">Subsystem Parameter</th>
                        <th className="py-3 px-4">Live Baseline</th>
                        <th className="py-3 px-4">Projected (+{currentResult?.ticks_simulated} Ticks)</th>
                        <th className="py-3 px-4">Impact Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-polar-border/30">
                      {Object.entries(comparison).map(([key, data]: [string, any]) => {
                        const isWorse = (key.includes('risk') || key.includes('load')) ? data.delta > 0 : data.delta < 0;
                        return (
                          <tr key={key} className="hover:bg-polar-navy/20">
                            <td className="py-3 px-4 font-bold text-white capitalize">{key.replace(/_/g, ' ')}</td>
                            <td className="py-3 px-4 text-slate-300">{data.baseline} {data.unit}</td>
                            <td className="py-3 px-4 text-white font-bold">{data.projected} {data.unit}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isWorse ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {data.delta > 0 ? `+${data.delta}` : data.delta} {data.unit}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attribution Factors & Recommended Action */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-polar-border">
                  <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase mb-3">
                    Factor Attribution Breakdown
                  </h3>
                  <div className="space-y-3">
                    {currentResult?.attribution?.map((attr: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-300">{attr.factor}</span>
                          <span className="text-cyan-400 font-bold">{attr.impact_pct}%</span>
                        </div>
                        <div className="w-full bg-polar-darker h-2 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${attr.impact_pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-polar-border flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase mb-3">
                      Recommended Mitigation Protocol
                    </h3>
                    <p className="text-xs text-slate-200 leading-relaxed bg-polar-dark/80 p-4 rounded-xl border border-polar-border font-ui">
                      {currentResult?.recommended_action}
                    </p>
                  </div>
                  <div className="mt-4 text-[10px] font-mono text-slate-500">
                    Calculated via Multi-Domain Constraint Signal spread Engine
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Monte Carlo Uncertainty Analysis Tab */
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-purple-500/40">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-purple-300 uppercase tracking-wider">
                  Stochastic Monte Carlo Uncertainty Engine
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Simulates 100+ stochastic futures with random polar downslope wind gusts, generator trip probabilities, 
                  and pack-ice logistics delays. Computes P10, P50, and P90 percentile confidence envelopes.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-polar-dark p-1 rounded-lg border border-polar-border text-xs font-mono">
                  <span className="text-slate-400 px-2">Runs:</span>
                  {[50, 100, 250].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMcIterations(n)}
                      className={`px-2.5 py-1 rounded transition-all ${
                        mcIterations === n ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRunMonteCarlo}
                  disabled={mcLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-mono font-bold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  <Dna className="w-4 h-4" />
                  <span>{mcLoading ? 'Sampling Distributions...' : 'Run Monte Carlo'}</span>
                </button>
              </div>
            </div>
          </div>

          {mcResult && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-center">
                <div className="bg-polar-dark/90 p-4 rounded-xl border border-purple-500/30">
                  <div className="text-[10px] text-slate-400 uppercase">Stochastic Iterations</div>
                  <div className="text-xl font-bold text-white mt-1">{mcResult.iterations} Runs</div>
                  <div className="text-[9px] text-slate-500">Stochastic Shocks</div>
                </div>

                <div className="bg-polar-dark/90 p-4 rounded-xl border border-purple-500/30">
                  <div className="text-[10px] text-slate-400 uppercase">Blackout Probability</div>
                  <div className={`text-xl font-bold mt-1 ${mcResult.blackout_probability_pct > 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {mcResult.blackout_probability_pct}%
                  </div>
                  <div className="text-[9px] text-slate-500">P(Unmet Essential Load)</div>
                </div>

                <div className="bg-polar-dark/90 p-4 rounded-xl border border-purple-500/30">
                  <div className="text-[10px] text-slate-400 uppercase">P50 Median Survival</div>
                  <div className="text-xl font-bold text-cyan-300 mt-1">{mcResult.mean_survival_days} Days</div>
                  <div className="text-[9px] text-slate-500">Expected Mean</div>
                </div>

                <div className="bg-polar-dark/90 p-4 rounded-xl border border-purple-500/30">
                  <div className="text-[10px] text-slate-400 uppercase">P10 Worst-Case Survival</div>
                  <div className="text-xl font-bold text-amber-300 mt-1">{mcResult.min_survival_days} Days</div>
                  <div className="text-[9px] text-slate-500">10th Percentile Bound</div>
                </div>
              </div>

              {/* Percentile Envelopes & Histogram */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-polar-border">
                  <h3 className="text-xs font-bold font-mono tracking-wider text-purple-300 uppercase mb-3">
                    Fuel Reserve Confidence Envelopes (P10 / P50 / P90)
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 bg-polar-dark rounded-xl border border-polar-border flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">P90 (Best Case Scenario):</span>
                      <span className="text-white">{mcResult.percentiles.fuel_percentage.p90_best_case.slice(-1)[0]}% Remaining</span>
                    </div>
                    <div className="p-3 bg-polar-dark rounded-xl border border-purple-500/40 flex items-center justify-between">
                      <span className="text-cyan-300 font-bold">P50 (Median Expected):</span>
                      <span className="text-white font-bold">{mcResult.percentiles.fuel_percentage.p50_median.slice(-1)[0]}% Remaining</span>
                    </div>
                    <div className="p-3 bg-polar-dark rounded-xl border border-red-500/40 flex items-center justify-between">
                      <span className="text-red-400 font-bold">P10 (Severe Worst Case):</span>
                      <span className="text-white">{mcResult.percentiles.fuel_percentage.p10_worst_case.slice(-1)[0]}% Remaining</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 leading-relaxed font-ui">
                    {mcResult.uncertainty_summary}
                  </p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-polar-border">
                  <h3 className="text-xs font-bold font-mono tracking-wider text-purple-300 uppercase mb-3">
                    Survival Days Frequency Distribution
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
                    {mcResult.survival_histogram?.map((bin: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300">{bin.bin}</span>
                          <span className="text-purple-300 font-bold">{bin.count} iterations</span>
                        </div>
                        <div className="w-full bg-polar-darker h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full"
                            style={{ width: `${Math.min(100, (bin.count / mcResult.iterations) * 100 * 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
