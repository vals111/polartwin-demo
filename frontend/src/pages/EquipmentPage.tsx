import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { equipmentApi } from '../api/client';
import { EquipmentItem } from '../types';
import { EChartsLine } from '../components/charts/EChartsLine';
import { SparklineChart } from '../components/charts/SparklineChart';
import * as echarts from 'echarts';
import { Wrench, HeartPulse, AlertTriangle, CheckCircle, Clock, Timer, Sparkles } from 'lucide-react';

// ── Weibull Hazard Curve Chart ───────────────────────────────────────────────
const WeibullChart: React.FC<{
  shape: number;
  scale: number;
  currentHours: number;
  color?: string;
}> = ({ shape, scale, currentHours, color = '#f59e0b' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    // Build Weibull hazard h(t) = (beta/eta) * (t/eta)^(beta-1)
    const maxT = scale * 2.5;
    const pts = Array.from({ length: 60 }, (_, i) => {
      const t = ((i + 1) / 60) * maxT;
      const h = (shape / scale) * Math.pow(t / scale, shape - 1);
      return [Math.round(t), parseFloat(h.toFixed(5))];
    });

    const currentH = (shape / scale) * Math.pow(currentHours / scale, shape - 1);
    const markLineHours = Math.min(currentHours, maxT * 0.95);

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      grid: { top: 8, bottom: 28, left: 52, right: 12 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 10 },
        formatter: (p: any) => `h(${p[0].value[0]}h) = ${p[0].value[1].toFixed(5)}/hr`,
      },
      xAxis: {
        type: 'value',
        name: 'Hours',
        nameTextStyle: { color: '#475569', fontSize: 9 },
        axisLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      yAxis: {
        type: 'value',
        name: 'h(t)',
        nameTextStyle: { color: '#475569', fontSize: 9 },
        axisLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      series: [
        {
          type: 'line',
          data: pts,
          smooth: true,
          symbol: 'none',
          lineStyle: { color, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${color}44` },
              { offset: 1, color: `${color}05` },
            ]),
          },
          markLine: {
            data: [{ xAxis: markLineHours }],
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
            label: { color: '#ef4444', fontFamily: 'monospace', fontSize: 9, formatter: 'Now' },
            symbol: ['none', 'none'],
          },
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [shape, scale, currentHours, color]);

  return <div ref={ref} style={{ width: '100%', height: 130 }} />;
};

// ── RUL Countdown ─────────────────────────────────────────────────────────────
const RULCountdown: React.FC<{ days: number; urgency: string }> = ({ days, urgency }) => {
  const color =
    urgency === 'CRITICAL' ? '#ef4444'
    : urgency === 'ACTION_REQUIRED' ? '#f59e0b'
    : urgency === 'MONITOR' ? '#eab308'
    : '#10b981';
  return (
    <div className="text-center">
      <div className={`text-2xl font-black font-mono`} style={{ color }}>
        {days}d
      </div>
      <div className="text-[9px] font-mono text-slate-500 mt-0.5">RUL</div>
    </div>
  );
};

// ── Health Heatmap Cell ────────────────────────────────────────────────────────
const HealthCell: React.FC<{ health: number; name: string; onClick: () => void; selected: boolean }> = ({
  health,
  name,
  onClick,
  selected,
}) => {
  const bg =
    health >= 85 ? 'from-emerald-600/40 to-emerald-900/20 border-emerald-500/40'
    : health >= 70 ? 'from-yellow-600/40 to-yellow-900/20 border-yellow-500/40'
    : 'from-red-600/40 to-red-900/20 border-red-500/40';
  const textColor = health >= 85 ? 'text-emerald-300' : health >= 70 ? 'text-yellow-300' : 'text-red-300';

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border bg-gradient-to-b text-center transition-all hover:scale-105 ${bg} ${
        selected ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-polar-darker' : ''
      }`}
    >
      <div className={`text-lg font-black font-mono ${textColor}`}>{health}%</div>
      <div className="text-[9px] text-slate-400 font-mono mt-0.5 leading-tight truncate max-w-[72px]">{name}</div>
    </button>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const EquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';
  const { liveSnapshot } = useTelemetryStore();

  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [predictiveMaint, setPredictiveMaint] = useState<any>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  const snapshot = liveSnapshot[stationId];
  const items = snapshot?.equipment?.items || equipmentList;
  const avgHealth = snapshot?.equipment?.avg_health || 93.5;

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      try {
        const [data, pm] = await Promise.all([
          equipmentApi.getStationEquipment(stationId),
          equipmentApi.getPredictiveMaintenance(stationId),
        ]);
        if (data.items) setEquipmentList(data.items);
        setPredictiveMaint(pm);
      } catch (e) {
        console.warn('Failed to load equipment API:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [stationId]);

  const assets = predictiveMaint?.assets || [];
  const selectedAsset = assets[selectedIdx];
  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';

  // Generate fake health history for sparklines
  const genHistory = (base: number) =>
    Array.from({ length: 20 }, (_, i) =>
      Math.max(0, base - i * 0.3 + (Math.random() - 0.5) * 3)
    ).reverse();

  const getUrgencyBadgeClass = (u: string) => {
    switch (u) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'ACTION_REQUIRED': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'MONITOR': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Wrench className="w-4 h-4" />
              <span>Machinery Health &amp; Predictive Maintenance (RUL Prognostics)</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Equipment Fleet Monitoring
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time vibration, run hours, thermal stress, Weibull hazard curves, and Remaining Useful Life (RUL) models.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-polar-dark p-3 rounded-xl border border-polar-border text-xs font-mono">
            <div>
              <div className="text-slate-500 text-[9px] uppercase">Fleet Health</div>
              <div className="text-xl font-black text-cyan-300 mt-0.5">{avgHealth}%</div>
            </div>
            <div className="border-l border-polar-border pl-4">
              <div className="text-slate-500 text-[9px] uppercase">Fleet Avg RUL</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {predictiveMaint?.fleet_average_rul_days ?? 124}d
              </div>
            </div>
            <div className="border-l border-polar-border pl-4">
              <div className="text-slate-500 text-[9px] uppercase">Assets</div>
              <div className="text-xl font-black text-white mt-0.5">{items.length || assets.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Health Heatmap */}
      {items.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-polar-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-4 font-bold">
            Fleet Health Heatmap — Click Asset to Drill Down
          </div>
          <div className="flex flex-wrap gap-3">
            {items.map((eq, idx) => (
              <HealthCell
                key={eq.id || idx}
                health={eq.health_score}
                name={eq.name}
                selected={selectedIdx === idx}
                onClick={() => setSelectedIdx(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* RUL Asset Cards with Weibull */}
      {predictiveMaint && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset list */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 font-bold">
              RUL Prognostics — Weibull Model
            </div>
            {assets.map((asset: any, idx: number) => (
              <button
                key={asset.id}
                onClick={() => setSelectedIdx(idx)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  selectedIdx === idx
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-polar-dark/60 border-polar-border hover:border-polar-border/80 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{asset.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {asset.operating_hours?.toLocaleString()} hrs
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RULCountdown days={asset.remaining_useful_life_days} urgency={asset.urgency} />
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold uppercase ${getUrgencyBadgeClass(asset.urgency)}`}>
                    {asset.urgency?.replace('_', ' ').split(' ')[0]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Selected asset detail + Weibull */}
          {selectedAsset && (
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-panel p-5 rounded-2xl border border-cyan-500/40">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Asset Detail</div>
                    <h3 className="text-lg font-black text-white mt-0.5">{selectedAsset.name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded border text-xs font-mono font-bold uppercase ${getUrgencyBadgeClass(selectedAsset.urgency)}`}>
                    {selectedAsset.urgency?.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono mb-4">
                  {[
                    { label: 'RUL', val: `${selectedAsset.remaining_useful_life_days}d`, color: '#f59e0b' },
                    { label: 'Op Hours', val: `${selectedAsset.operating_hours?.toLocaleString()}h`, color: '#94a3b8' },
                    { label: 'Weibull R', val: `${selectedAsset.weibull_reliability_pct}%`, color: '#10b981' },
                    { label: 'Hazard h(t)', val: `${selectedAsset.hazard_rate_per_1k_hrs}/1k`, color: '#818cf8' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-polar-dark/80 p-3 rounded-xl border border-polar-border text-center">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">{stat.label}</div>
                      <div className="font-black" style={{ color: stat.color }}>{stat.val}</div>
                    </div>
                  ))}
                </div>

                {/* Weibull curve */}
                <div className="mt-2">
                  <div className="text-[10px] font-mono text-amber-400 mb-2 font-bold">
                    Weibull Hazard Rate h(t) — Failure Probability Density
                  </div>
                  <WeibullChart
                    shape={selectedAsset.weibull_beta ?? 2.2}
                    scale={selectedAsset.weibull_eta ?? (selectedAsset.operating_hours ? selectedAsset.operating_hours * 2.5 : 20000)}
                    currentHours={selectedAsset.operating_hours ?? 8500}
                    color="#f59e0b"
                  />
                </div>

                <div className="mt-3 p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-[11px] font-mono text-slate-400">
                  <span className="text-cyan-400 font-bold">Action: </span>
                  {selectedAsset.recommended_maintenance_action}
                </div>
              </div>

              {/* Health sparkline of selected item from fleet */}
              {items[selectedIdx] && (
                <div className="glass-panel p-4 rounded-2xl border border-polar-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Health Score Trend — {items[selectedIdx]?.name}
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Vibration: <strong className="text-white">{items[selectedIdx]?.vibration_mm_s} mm/s</strong>
                    </div>
                  </div>
                  <SparklineChart
                    data={genHistory(items[selectedIdx]?.health_score || 90)}
                    color={items[selectedIdx]?.health_score >= 85 ? '#10b981' : items[selectedIdx]?.health_score >= 70 ? '#f59e0b' : '#ef4444'}
                    height={72}
                    showArea
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fleet table with embedded sparklines */}
      <div className="glass-panel rounded-2xl border border-polar-border overflow-hidden">
        <div className="p-4 border-b border-polar-border/60 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
            Station Critical Machinery — Fleet Telemetry
          </h3>
          <span className="text-[11px] font-mono" style={{ color: accentColor }}>
            Continuous Stress Evaluation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-polar-border/60 text-slate-400 uppercase text-[9px] bg-polar-dark/40">
                <th className="py-3 px-4">Equipment</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Trend</th>
                <th className="py-3 px-4">Run Hours</th>
                <th className="py-3 px-4">Vibration</th>
                <th className="py-3 px-4">Failure P</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-polar-border/30">
              {items.map((eq, idx) => {
                const hColor = eq.health_score >= 85 ? '#10b981' : eq.health_score >= 70 ? '#f59e0b' : '#ef4444';
                return (
                  <tr
                    key={eq.id || idx}
                    className={`hover:bg-polar-navy/30 transition-colors cursor-pointer ${selectedIdx === idx ? 'bg-cyan-500/5' : ''}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <td className="py-2.5 px-4 font-bold text-white">{eq.name}</td>
                    <td className="py-2.5 px-4 text-slate-400 capitalize">{eq.type}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-black" style={{ color: hColor }}>{eq.health_score}%</span>
                    </td>
                    <td className="py-2.5 px-4 w-24">
                      <SparklineChart data={genHistory(eq.health_score)} color={hColor} height={30} showArea={false} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{eq.operating_hours?.toLocaleString()}h</td>
                    <td className="py-2.5 px-4 text-slate-300">{eq.vibration_mm_s} mm/s</td>
                    <td className="py-2.5 px-4">
                      <span className={`font-bold ${eq.failure_risk_pct > 20 ? 'text-red-400' : 'text-slate-300'}`}>
                        {eq.failure_risk_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border ${
                        eq.status === 'operational' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : eq.status === 'standby' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          eq.status === 'operational' ? 'bg-emerald-400 animate-pulse' : eq.status === 'standby' ? 'bg-blue-400' : 'bg-red-400 animate-pulse'
                        }`} />
                        {eq.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Degradation formula */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 mb-3 font-bold">
          Governing Degradation Formula — Master Report §11
        </div>
        <div className="p-4 rounded-xl bg-polar-dark/90 font-mono text-sm text-cyan-300 border border-polar-border tracking-wide">
          Health(t+1) = Health(t) − (LoadStress(t) × DegradationRate) + MaintenanceReset(t)
        </div>
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          Equipment degradation follows actual generator electrical load and sub-zero thermal cycling.
          When health score drops below <strong className="text-amber-300">75%</strong>, an automated maintenance
          task is placed into the queue. Weibull β{">"} 1 indicates wear-out failure mode.
        </p>
      </div>
    </div>
  );
};
