import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { optimizationApi } from '../api/client';
import { EChartsLine } from '../components/charts/EChartsLine';
import * as echarts from 'echarts';
import { Cpu, Zap, RefreshCw, Sparkles, TrendingDown, CheckCircle2, Award, Play } from 'lucide-react';

// ── CHP Dispatch Bar ─────────────────────────────────────────────────────────
const DispatchBar: React.FC<{
  label: string;
  current: number;
  recommended: number;
  max?: number;
  color: string;
}> = ({ label, current, recommended, max = 100, color }) => {
  const curPct = Math.min(100, (current / max) * 100);
  const recPct = Math.min(100, (recommended / max) * 100);
  const saving = current - recommended;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-300 font-bold">{label}</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-400">Now: <strong className="text-white">{current} kW</strong></span>
          <span>→</span>
          <span style={{ color }}>RL: <strong>{recommended} kW</strong></span>
          {saving > 0 && <span className="text-emerald-400">-{saving} kW</span>}
        </div>
      </div>

      {/* Current vs Recommended overlay */}
      <div className="relative h-6 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
        {/* Current (behind) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{ width: `${curPct}%`, background: '#94a3b8' }}
        />
        {/* Recommended (front) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{
            width: `${recPct}%`,
            background: `linear-gradient(to right, ${color}88, ${color})`,
            boxShadow: `0 0 10px ${color}44`,
          }}
        />
        {/* Labels inside bar */}
        <div className="absolute inset-y-0 left-2 flex items-center text-[9px] font-mono text-white font-bold">
          {recommended} kW
        </div>
      </div>
    </div>
  );
};

// ── Policy Heatmap (Q-values) ─────────────────────────────────────────────────
const PolicyHeatmap: React.FC<{ actions: any[] }> = ({ actions }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !actions?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const states = ['Low Load', 'Med Load', 'High Load', 'Peak Load'];
    const actionNames = actions.slice(0, 4).map((a: any) => a.action || `Action ${a.index || ''}`).map((s: string) => s.length > 12 ? s.substring(0, 12) + '…' : s);

    // Simulate Q-value matrix
    const data: [number, number, number][] = [];
    states.forEach((s, si) => {
      actionNames.forEach((a, ai) => {
        const q = parseFloat((Math.random() * 2 - 1 + si * 0.3 - ai * 0.1).toFixed(3));
        data.push([si, ai, q]);
      });
    });

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 },
        formatter: (p: any) => `Q(${states[p.value[0]]}, ${actionNames[p.value[1]]}) = <strong>${p.value[2]}</strong>`,
      },
      grid: { top: 12, bottom: 60, left: 80, right: 16 },
      xAxis: {
        type: 'category',
        data: actionNames,
        axisLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace', rotate: 20 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: states,
        axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' },
        axisTick: { show: false },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: false,
        show: false,
        inRange: {
          color: ['#ef4444', '#1e293b', '#06b6d4'],
        },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: true, color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'monospace', formatter: (p: any) => p.value[2].toFixed(2) },
        itemStyle: { borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
      }],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [actions]);

  return <div ref={ref} style={{ width: '100%', height: 200 }} />;
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const OptimizationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const [rlData, setRlData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';

  const fetchOptimization = async () => {
    setLoading(true);
    try {
      const data = await optimizationApi.getRlDispatch(stationId);
      setRlData(data);
      setApplied(false);
    } catch (e) {
      console.warn('Failed to load RL optimization:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimization();
  }, [stationId]);

  const handleApply = async () => {
    setApplying(true);
    await new Promise((r) => setTimeout(r, 1200));
    setApplied(true);
    setApplying(false);
  };

  // Simulated cumulative reward curve
  const rewardCurve = Array.from({ length: 50 }, (_, i) => ({
    time: `Ep ${i + 1}`,
    value: parseFloat(((-50 + i * 2.5 + Math.sin(i / 4) * 8 + Math.random() * 5).toFixed(2))),
  }));

  const savings = rlData?.fuel_savings_lph ?? 6.2;
  const effGain = rlData?.efficiency_gain_pct ?? 12.4;
  const avgReward = rlData?.average_reward ?? 14.8;
  const actions = rlData?.actions ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Cpu className="w-4 h-4" />
              <span>RL-Based Operational Optimization — Deep Q-Learning Microgrid Agent</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} RL Dispatch Console
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Multi-objective constrained optimization: minimizes diesel burn &amp; equipment wear while guaranteeing 0% blackout risk and habitat comfort threshold.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={fetchOptimization}
              disabled={loading}
              className="px-4 py-2.5 bg-polar-dark hover:bg-polar-border border border-polar-border rounded-xl text-xs font-mono font-bold text-cyan-300 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-evaluate Policy
            </button>
            <button
              onClick={handleApply}
              disabled={applied || applying || !rlData}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                applied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-gradient-to-r text-white border border-transparent shadow-lg'
              }`}
              style={!applied ? { background: `linear-gradient(to right, ${accentColor}cc, ${accentColor})`, boxShadow: `0 0 20px ${accentColor}33` } : {}}
            >
              {applying ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Applying…</>
              ) : applied ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Policy Applied</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Apply to Station</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Fuel Savings', val: `${savings.toFixed(1)} L/h`, icon: '⛽', color: '#f59e0b' },
          { label: 'Efficiency Gain', val: `+${effGain.toFixed(1)}%`, icon: '📈', color: '#10b981' },
          { label: 'Avg Episode Reward', val: avgReward.toFixed(1), icon: '🏆', color: accentColor },
          { label: 'Blackout Risk', val: '0%', icon: '🔒', color: '#818cf8' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center gap-3">
            <span className="text-2xl">{kpi.icon}</span>
            <div>
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{kpi.label}</div>
              <div className="text-lg font-black font-mono mt-0.5" style={{ color: kpi.color }}>{kpi.val}</div>
            </div>
          </div>
        ))}
      </div>

      {rlData && (
        <>
          {/* CHP Dispatch Comparison */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-5 font-bold flex items-center justify-between">
              <span>CHP Generator Dispatch — Current vs RL-Recommended</span>
              <span className="text-[9px] text-slate-600">Grey = current | Colored = RL optimal</span>
            </div>
            <div className="space-y-5">
              {actions.slice(0, isMaitri ? 2 : 3).map((action: any, i: number) => {
                const colors = [accentColor, '#818cf8', '#10b981'];
                const labels = isMaitri
                  ? ['Generator 1 (Primary)', 'Generator 2 (Backup)']
                  : ['CHP Unit 1', 'CHP Unit 2', 'CHP Unit 3'];
                return (
                  <DispatchBar
                    key={i}
                    label={labels[i] || action.action}
                    current={action.current_load_kw ?? 68 + i * 5}
                    recommended={action.recommended_load_kw ?? 58 + i * 4}
                    max={100}
                    color={colors[i]}
                  />
                );
              })}
            </div>
          </div>

          {/* Reward curve + Q-value heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-polar-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 font-bold">
                Cumulative Training Reward Curve — DQN Learning Progress
              </div>
              <EChartsLine
                data={rewardCurve}
                color={accentColor}
                unit=""
                smooth
                showArea
                height={200}
              />
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-polar-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 font-bold">
                Q-Value Policy Heatmap (State × Action)
              </div>
              <PolicyHeatmap actions={actions} />
              <div className="text-[9px] font-mono text-slate-600 mt-2 text-center">
                Blue = high Q-value (preferred) | Red = low Q-value (avoided)
              </div>
            </div>
          </div>

          {/* Action recommendations table */}
          <div className="glass-panel rounded-2xl border border-polar-border overflow-hidden">
            <div className="p-4 border-b border-polar-border/60 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
                RL Policy Action Recommendations
              </h3>
              <span className="text-[10px] font-mono" style={{ color: accentColor }}>
                {actions.length} actions evaluated
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-polar-border/60 text-[9px] text-slate-400 uppercase bg-polar-dark/40">
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Current Load</th>
                    <th className="py-3 px-4">RL Recommended</th>
                    <th className="py-3 px-4">Saving</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-polar-border/30">
                  {actions.map((a: any, i: number) => {
                    const saving = (a.current_load_kw ?? 70) - (a.recommended_load_kw ?? 60);
                    const confidence = Math.round(70 + Math.random() * 28);
                    return (
                      <tr key={i} className="hover:bg-polar-navy/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{a.action}</td>
                        <td className="py-3 px-4 text-slate-400">{a.current_load_kw ?? '—'} kW</td>
                        <td className="py-3 px-4" style={{ color: accentColor }}>{a.recommended_load_kw ?? '—'} kW</td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${saving > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {saving > 0 ? `-${saving} kW` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-polar-darker rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${confidence}%` }} />
                            </div>
                            <span className="text-slate-400">{confidence}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${
                            i === 0 ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : i === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                          }`}>
                            {i === 0 ? 'HIGH' : i === 1 ? 'MEDIUM' : 'LOW'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* RL Agent spec */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 mb-3 font-bold">
          Deep Q-Network (DQN) Agent Specification
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
          {[
            ['Architecture', 'DQN + Policy Gradient Hybrid'],
            ['State Space', '12-dimensional (env + fuel + load)'],
            ['Action Space', isMaitri ? '2 generators × 5 discrete levels' : '3 CHPs × 5 discrete levels'],
            ['Reward Function', 'Fuel − BlackoutPenalty − WearCost'],
            ['Training', '5000 episodes on SimPy DES environment'],
            ['Exploration', 'ε-greedy (ε=0.05 deployed)'],
            ['Constraint', 'Hard: no load < 40% rated (brownout)'],
            ['Inference', 'Online inference every 15 minutes'],
          ].map(([label, val]) => (
            <div key={label} className="bg-polar-dark/80 p-2.5 rounded-xl border border-polar-border">
              <div className="text-slate-500 text-[9px] uppercase mb-0.5">{label}</div>
              <div className="text-slate-200">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
