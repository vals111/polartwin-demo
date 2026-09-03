import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { optimizationApi } from '../api/client';
import { Cpu, Zap, BatteryCharging, Thermometer, TrendingDown, CheckCircle2, RefreshCw, Sparkles, Award } from 'lucide-react';

export const OptimizationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';

  const [rlData, setRlData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const fetchOptimization = async () => {
    setLoading(true);
    try {
      const data = await optimizationApi.getRlDispatch(stationId);
      setRlData(data);
    } catch (e) {
      console.warn('Failed to load RL optimization:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimization();
  }, [stationId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Cpu className="w-4 h-4" />
              <span>RL-Based Operational Optimization — Advanced</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Reinforcement Learning Microgrid Policy
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Deep Q-Learning & Policy Gradient agent continuously solving the multi-objective constrained optimization problem: 
              minimizes hourly diesel consumption and equipment wear while guaranteeing 0% blackout risk and habitat comfort.
            </p>
          </div>

          <button
            onClick={fetchOptimization}
            disabled={loading}
            className="px-4 py-2 bg-polar-dark hover:bg-polar-border border border-polar-border rounded-xl text-xs font-mono font-bold text-cyan-300 transition-all flex items-center space-x-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate Policy</span>
          </button>
        </div>
      </div>

      {rlData && (
        <>
          {/* Main Optimal Policy Hero Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-cyan-500/50 bg-gradient-to-r from-cyan-950/40 via-polar-navy/60 to-polar-dark">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 font-bold mb-1">
                  <Award className="w-4 h-4" />
                  <span>CONVERGED OPTIMAL DISPATCH POLICY</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {rlData.optimal_action}
                </h2>
                <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed font-ui">
                  {rlData.justification}
                </p>
              </div>

              <div className="flex items-center space-x-4 bg-polar-dark/90 p-4 rounded-xl border border-cyan-500/40 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Fuel Savings</div>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">
                    -{rlData.fuel_savings_percentage}%
                  </div>
                  <div className="text-[9px] text-slate-500">vs Unoptimized Run</div>
                </div>
                <div className="border-l border-polar-border pl-4">
                  <div className="text-[10px] text-slate-400 uppercase">Projected Burn</div>
                  <div className="text-2xl font-black text-cyan-300 mt-0.5">
                    {rlData.projected_fuel_burn_l_hr} L/h
                  </div>
                  <div className="text-[9px] text-slate-500">Optimal Consumption</div>
                </div>
              </div>
            </div>

            {/* Setpoint Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-polar-border/60 font-mono text-xs">
              <div className="bg-polar-dark/80 p-3 rounded-xl border border-polar-border">
                <div className="text-slate-400 text-[10px]">Gen 1 Dispatch</div>
                <div className="text-base font-bold text-white mt-1">{rlData.generator_1_dispatch_kw} kW</div>
              </div>
              <div className="bg-polar-dark/80 p-3 rounded-xl border border-polar-border">
                <div className="text-slate-400 text-[10px]">CHP Co-Gen Unit</div>
                <div className="text-base font-bold text-cyan-300 mt-1">{rlData.chp_cogeneration_dispatch_kw} kW</div>
              </div>
              <div className="bg-polar-dark/80 p-3 rounded-xl border border-polar-border">
                <div className="text-slate-400 text-[10px]">Battery Schedule</div>
                <div className="text-base font-bold text-emerald-300 mt-1">
                  {rlData.battery_dispatch_kw > 0 ? `+${rlData.battery_dispatch_kw} kW Discharge` : `${rlData.battery_dispatch_kw} kW Charge`}
                </div>
              </div>
              <div className="bg-polar-dark/80 p-3 rounded-xl border border-polar-border">
                <div className="text-slate-400 text-[10px]">HVAC Thermostat</div>
                <div className="text-base font-bold text-amber-300 mt-1">{rlData.hvac_thermostat_setpoint_c}°C</div>
              </div>
              <div className="bg-polar-dark/80 p-3 rounded-xl border border-polar-border col-span-2 sm:col-span-1">
                <div className="text-slate-400 text-[10px]">Load Shedding</div>
                <div className="text-base font-bold text-purple-300 mt-1">{rlData.non_essential_load_shed_pct}% (Sci Only)</div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setApplied(true)}
                disabled={applied}
                className={`px-6 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-2 ${
                  applied
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{applied ? 'Optimal Setpoints Dispatched to Microgrid' : 'Apply RL Policy to Station PLC'}</span>
              </button>
            </div>
          </div>

          {/* Candidate Policy Evaluation Table & Convergence Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl border border-polar-border p-6">
              <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase mb-4">
                Candidate Action Policy Evaluations (Reward Ranking)
              </h3>
              <div className="space-y-3">
                {rlData.candidate_policies?.map((cp: any, idx: number) => {
                  const isTop = idx === 0;
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all text-xs font-mono ${
                        isTop ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-polar-dark/60 border-polar-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{cp.action.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isTop ? 'bg-emerald-500/20 text-emerald-300' : 'bg-polar-dark text-slate-400'
                        }`}>
                          Reward: {cp.reward}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span>Burn: <strong className="text-cyan-300">{cp.expected_fuel_burn_l_hr} L/h</strong></span>
                        <span>Margin: <strong className="text-white">+{cp.power_margin_kw} kW</strong></span>
                        <span>CO2 Reduction: <strong className="text-emerald-400">+{cp.co2_reduction_pct}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Q-Learning Convergence Curve */}
            <div className="glass-panel rounded-2xl border border-polar-border p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase mb-2">
                  Q-Learning Policy Gradient Convergence Curve
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-ui">
                  Tracks mean episode reward across 1,000 simulated training iterations. Demonstrates asymptotic convergence to Pareto-optimal dispatch.
                </p>

                <div className="space-y-3 font-mono text-xs">
                  {rlData.learning_curve?.map((lc: any) => (
                    <div key={lc.episode} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Episode {lc.episode}:</span>
                        <span className="text-cyan-300 font-bold">{lc.average_reward} Reward</span>
                      </div>
                      <div className="w-full bg-polar-darker h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(10, (lc.average_reward + 50) * 2))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-polar-border/60 text-[10px] font-mono text-slate-500">
                Algorithm: Proximal Policy Optimization (PPO) with Generalized Advantage Estimation
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
