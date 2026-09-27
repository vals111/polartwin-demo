import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { telemetryApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Truck, Ship, Anchor, AlertTriangle, ShieldCheck,
  Clock, RefreshCw, Layers,
  Compass, MapPin, Wind, CheckCircle2, Activity,
  X, Gauge, Fuel, Package, Play, Sparkles,
  AlertOctagon, ArrowUpRight, Brain, ArrowLeft,
  Thermometer, Droplet, BarChart2, TrendingDown,
  TrendingUp, ChevronRight, Database, Zap,
  UtensilsCrossed, Wrench, ChevronDown, Flame,
} from 'lucide-react';

// ── Shared Primitives ─────────────────────────────────────────────────────────
const Pill: React.FC<{ label: string; color?: string; pulse?: boolean; small?: boolean }> = ({
  label, color = '#10b981', pulse, small,
}) => (
  <span className={`inline-flex items-center gap-1 ${small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'} rounded-full font-mono font-bold border flex-shrink-0`}
    style={{ background: `${color}15`, borderColor: `${color}44`, color }}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} style={{ background: color }} />
    {label}
  </span>
);

const SectionDivider: React.FC<{
  icon: React.ReactNode; title: string; subtitle: string; color: string; layer: string;
}> = ({ icon, title, subtitle, color, layer }) => (
  <div className="flex items-start gap-4 mb-6 pb-4 border-b border-white/8">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>{layer}</span>
      </div>
      <h2 className="text-base font-black text-white">{title}</h2>
      <p className="text-[10px] font-mono text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

const BarMeter: React.FC<{
  label: string; value: number; max: number; unit: string; color: string;
  sub?: string; reversed?: boolean; height?: string;
}> = ({ label, value, max, unit, color, sub, reversed, height = 'h-2' }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const displayColor = reversed
    ? (pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981')
    : (pct < 25 ? '#ef4444' : pct < 50 ? '#f59e0b' : color);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold" style={{ color: displayColor }}>{value}{unit}</span>
      </div>
      <div className={`${height} bg-white/5 rounded-full overflow-hidden border border-white/5`}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${displayColor}88, ${displayColor})`, boxShadow: `0 0 6px ${displayColor}44` }} />
      </div>
      {sub && <div className="text-[9px] font-mono text-slate-600">{sub}</div>}
    </div>
  );
};

// ── Tank Gauge ────────────────────────────────────────────────────────────────
const TankGauge: React.FC<{
  label: string; current: number; capacity: number; unit: string;
  color: string; criticalPct?: number; warningPct?: number;
  icon?: React.ReactNode; daysRemaining?: number;
}> = ({ label, current, capacity, unit, color, criticalPct = 15, warningPct = 30, icon, daysRemaining }) => {
  const pct = Math.max(0, Math.min(100, (current / capacity) * 100));
  const displayColor = pct <= criticalPct ? '#ef4444' : pct <= warningPct ? '#f59e0b' : color;
  const fillHeight = `${pct}%`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] font-mono font-bold text-white text-center">{label}</div>
      <div className="relative w-14" style={{ height: 110 }}>
        {/* Tank body */}
        <div className="absolute inset-0 rounded-xl border-2 overflow-hidden"
          style={{ borderColor: `${displayColor}55`, background: 'rgba(5,10,25,0.8)' }}>
          {/* Fill */}
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl transition-all duration-1500"
            style={{
              height: fillHeight,
              background: `linear-gradient(to top, ${displayColor}, ${displayColor}88)`,
              boxShadow: `0 -4px 12px ${displayColor}44`,
            }} />
          {/* Wave effect */}
          <div className="absolute w-full" style={{ bottom: fillHeight, height: 4 }}>
            <div className="w-full h-full opacity-60"
              style={{ background: `linear-gradient(to right, transparent, ${displayColor}88, transparent)`, animation: 'wave 2s ease-in-out infinite' }} />
          </div>
          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black font-mono" style={{ color: pct > 40 ? 'rgba(5,10,25,0.9)' : displayColor }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>
        {/* Level markers */}
        {[25, 50, 75].map(m => (
          <div key={m} className="absolute right-0 w-2 h-px" style={{ bottom: `${m}%`, background: 'rgba(255,255,255,0.2)' }} />
        ))}
        {/* Critical line */}
        <div className="absolute left-0 right-0 border-t border-dashed"
          style={{ bottom: `${criticalPct}%`, borderColor: '#ef444466' }} />
      </div>
      <div className="text-center space-y-0.5">
        <div className="text-[10px] font-mono font-bold" style={{ color: displayColor }}>
          {current.toLocaleString()} {unit}
        </div>
        <div className="text-[9px] font-mono text-slate-500">of {capacity.toLocaleString()} {unit}</div>
        {daysRemaining !== undefined && (
          <div className="text-[9px] font-mono font-bold" style={{ color: daysRemaining < 30 ? '#ef4444' : '#10b981' }}>
            ~{daysRemaining}d left
          </div>
        )}
      </div>
      {pct <= criticalPct && (
        <div className="text-[8px] font-mono font-bold text-red-400 animate-pulse text-center">⚠️ CRITICAL</div>
      )}
    </div>
  );
};

// ── Supply Vessel Radar ───────────────────────────────────────────────────────
const VesselRadar: React.FC<{
  vesselName: string; etaDays: number; distanceKm: number; totalDistKm: number;
  speedKnots: number; weatherState: string; isMaitri: boolean;
}> = ({ vesselName, etaDays, distanceKm, totalDistKm, speedKnots, weatherState, isMaitri }) => {
  const progress = Math.min(1, distanceKm / totalDistKm);
  // Station at center, vessel somewhere on the arc
  const angle = -90 + progress * 270; // sweeps from top-left to top-right
  const rad = (angle * Math.PI) / 180;
  const R = 70;
  const cx = 90, cy = 90;
  const vx = cx + R * Math.cos(rad);
  const vy = cy + R * Math.sin(rad);
  const weatherColor = weatherState === 'CALM' ? '#10b981' : weatherState === 'MODERATE' ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={180} height={180} viewBox="0 0 180 180">
        {/* Concentric rings */}
        {[28, 50, 70].map(r => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(56,189,248,0.08)" strokeWidth={1} strokeDasharray="3,3" />
        ))}
        {/* Range labels */}
        {[{ r: 28, label: '25%' }, { r: 50, label: '50%' }, { r: 70, label: '75%' }].map(item => (
          <text key={item.r} x={cx + item.r + 2} y={cy - 2}
            fill="rgba(100,116,139,0.5)" fontSize={5} fontFamily="monospace">{item.label}</text>
        ))}
        {/* Route arc (ghost) */}
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy}`}
          fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth={2} strokeDasharray="4,3" />
        {/* Progress arc */}
        {progress > 0 && (
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 ${progress > 0.5 ? 1 : 0} 1 ${vx.toFixed(1)} ${vy.toFixed(1)}`}
            fill="none" stroke="#38bdf8" strokeWidth={2.5} strokeLinecap="round" />
        )}
        {/* Origin (Cape Town) */}
        <circle cx={cx - R} cy={cy} r={5} fill="#10b981" />
        <text x={cx - R} y={cy - 9} textAnchor="middle" fill="#10b981" fontSize={6} fontFamily="monospace">Cape Town</text>
        {/* Station (destination) */}
        <circle cx={cx + R} cy={cy} r={6} fill="rgba(10,15,30,0.9)" stroke="#818cf8" strokeWidth={1.5} />
        <text x={cx + R} y={cy - 10} textAnchor="middle" fill="#818cf8" fontSize={5.5} fontFamily="monospace">
          {isMaitri ? 'MAITRI' : 'BHARATI'}
        </text>
        {/* Vessel dot */}
        <circle cx={vx} cy={vy} r={7} fill={weatherColor} style={{ filter: `drop-shadow(0 0 6px ${weatherColor}88)` }}>
          <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x={vx} y={vy - 12} textAnchor="middle" fill="white" fontSize={5.5} fontFamily="monospace" fontWeight="bold">⛴</text>
        {/* Center stats */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={12} fontWeight="900" fontFamily="monospace">{etaDays}d</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#38bdf8" fontSize={6} fontFamily="monospace">ETA</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#64748b" fontSize={5.5} fontFamily="monospace">{speedKnots}kn</text>
      </svg>
      <div className="text-center text-[10px] font-mono">
        <div className="text-white font-bold">{vesselName}</div>
        <div className="text-slate-400 mt-0.5">Sea state: <span style={{ color: weatherColor }}>{weatherState}</span></div>
      </div>
    </div>
  );
};

// ── Voyage Progress Arc ───────────────────────────────────────────────────────
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
        <circle cx={90} cy={90} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeDashoffset={-(circ - arcLen) * 0.125}
          transform="rotate(135 90 90)" />
        <circle cx={90} cy={90} r={r} fill="none" stroke="#ef444455" strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${delayFilled} ${circ - delayFilled}`}
          strokeDashoffset={-(circ - arcLen) * 0.125 + arcLen - filled - delayFilled}
          transform="rotate(135 90 90)" />
        <circle cx={90} cy={90} r={r} fill="none" stroke={color} strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={-(circ - arcLen) * 0.125 + arcLen - filled}
          transform="rotate(135 90 90)"
          style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 8px ${color}66)` }} />
        {(() => {
          const angle = (135 + pct * 270) * Math.PI / 180;
          const sx = 90 + r * Math.cos(angle);
          const sy = 90 + r * Math.sin(angle);
          return (
            <circle cx={sx} cy={sy} r={6} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
              <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
            </circle>
          );
        })()}
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

// ── Route Timeline ────────────────────────────────────────────────────────────
const RouteTimeline: React.FC<{ waypoints: any[] }> = ({ waypoints }) => {
  const statusColor: Record<string, string> = { PASSED: '#10b981', ACTIVE: '#06b6d4', UPCOMING: '#64748b' };
  const riskColor: Record<string, string> = {
    NOMINAL: '#10b981', MODERATE: '#f59e0b', ELEVATED: '#f97316', HIGH: '#ef4444', CRITICAL: '#dc2626',
  };
  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500 via-cyan-500 to-slate-600" />
      <div className="space-y-3">
        {waypoints.map((wp, i) => {
          const sc = statusColor[wp.status] || '#64748b';
          const rc = riskColor[wp.risk] || '#64748b';
          return (
            <div key={i} className="relative flex items-start gap-4 pl-10">
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
                  <div className="flex items-center gap-2 flex-wrap">
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

// ── Risk Radar EChart ─────────────────────────────────────────────────────────
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
      tooltip: { trigger: 'item', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 } },
      radar: {
        indicator: indicators, shape: 'polygon', radius: '65%', center: ['50%', '50%'], nameGap: 6,
        name: { textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            riskFactors.weather_delay || 38, riskFactors.route_exposure || 24,
            riskFactors.eta_uncertainty || 18, riskFactors.cargo_dependency || 12,
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

// ── Stock Consumption Timeline Chart ─────────────────────────────────────────
const ConsumptionChart: React.FC<{
  label: string; currentStock: number; dailyRate: number; color: string; etaDays: number;
}> = ({ label, currentStock, dailyRate, color, etaDays }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const days = Array.from({ length: 100 }, (_, i) => `D+${i}`);
    const stockLine = days.map((_, i) => Math.max(0, currentStock - dailyRate * i));
    const etaMarker = etaDays;
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, bottom: 20, left: 36, right: 10 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', textStyle: { color: '#e2e8f0', fontSize: 9, fontFamily: 'monospace' } },
      xAxis: { type: 'category', data: days, axisLabel: { color: '#374151', fontSize: 7, interval: 19 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
      series: [
        {
          type: 'line', data: stockLine, smooth: true, showSymbol: false,
          lineStyle: { width: 2, color },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}40` }, { offset: 1, color: 'transparent' }]) },
          markLine: {
            data: [
              { xAxis: etaMarker, name: 'Vessel ETA' },
              { yAxis: currentStock * 0.15, name: 'Critical Level' },
            ],
            lineStyle: { type: 'dashed', width: 1 },
            label: { color: '#94a3b8', fontSize: 7, fontFamily: 'monospace' },
            symbol: ['none', 'none'],
          },
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [currentStock, dailyRate, color, etaDays]);
  return <div ref={ref} style={{ height: 90, width: '100%' }} />;
};

// ── Asset Card ────────────────────────────────────────────────────────────────
const AssetCard: React.FC<{ asset: any; selected: boolean; onClick: () => void }> = ({ asset, selected, onClick }) => {
  const statusColor = asset.status === 'READY' ? '#10b981' : asset.status === 'STANDBY' ? '#f59e0b' : '#ef4444';
  const weatherColor: Record<string, string> = { EXCELLENT: '#10b981', GOOD: '#06b6d4', MODERATE: '#f59e0b', POOR: '#ef4444' };
  const wc = weatherColor[asset.weather_suitability] || '#64748b';
  return (
    <div onClick={onClick}
      className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xl ${selected ? 'border-cyan-500/60 bg-cyan-500/06' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-mono font-bold text-white">{asset.name}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">{asset.type} · {asset.count}</div>
        </div>
        <Pill label={asset.status} color={statusColor} small />
      </div>
      <BarMeter label="Readiness" value={asset.readiness_pct} max={100} unit="%" color={statusColor} height="h-2" />
      <div className="flex items-center justify-between mt-2 text-[9px] font-mono">
        <span className="text-slate-500">Capacity: <span className="text-sky-300">{asset.capacity}</span></span>
        <span style={{ color: wc }}>Weather: {asset.weather_suitability}</span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const LogisticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [localLogistics, setLocalLogistics] = useState<any>(null);
  const [activeLayer, setActiveLayer] = useState<'overview' | 'vessel' | 'stock' | 'cargo' | 'fleet' | 'whatif'>('overview');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [delayDays, setDelayDays] = useState(30);
  const [expandedCargo, setExpandedCargo] = useState<string | null>(null);

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await telemetryApi.getLogistics(stationId);
        if (mounted && data) setLocalLogistics(data);
      } catch { }
    };
    load();
    setWhatIfResult(null);
    return () => { mounted = false; };
  }, [stationId]);

  const snapshot = liveSnapshot[stationId];
  const log = snapshot?.logistics || localLogistics;

  // Voyage / vessel data
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
    { name: 'Princess Astrid Ice Edge', status: 'ACTIVE', distance_km: 4100, weather: 'Polar downslope 35 km/h / Pack Ice', delay_days: 2.5, risk: 'ELEVATED' },
    { name: 'Ice Shelf Barrier Mooring', status: 'UPCOMING', distance_km: 4350, weather: '-22°C / Snow Drift', delay_days: 0, risk: 'HIGH' },
    { name: '100km Overland Supply Run', status: 'UPCOMING', distance_km: 4450, weather: 'Crevasse / Whiteout Risk', delay_days: 0, risk: 'CRITICAL' },
  ] : [
    { name: 'Cape Town Harbor', status: 'PASSED', distance_km: 0, weather: 'Clear / 19°C', delay_days: 0, risk: 'NOMINAL' },
    { name: 'Roaring Forties / Fifties', status: 'PASSED', distance_km: 2600, weather: 'Sea State 5 / 38 km/h', delay_days: 0.5, risk: 'MODERATE' },
    { name: 'Prydz Bay Pack Ice', status: 'ACTIVE', distance_km: 4500, weather: 'Sea Ice Drift / -18°C', delay_days: 1.0, risk: 'ELEVATED' },
    { name: 'Quilty Bay Mooring', status: 'UPCOMING', distance_km: 4800, weather: 'Fast Ice / -20°C', delay_days: 0, risk: 'MODERATE' },
    { name: 'Bharati Terminal', status: 'UPCOMING', distance_km: 4820, weather: 'Coastal Gale / -22°C', delay_days: 0, risk: 'LOW' },
  ]);

  const assets = log?.assets ?? (isMaitri ? [
    { id: 'fleet-1', name: 'PistenBully 300 Polar', type: 'Heavy Tracked Snow Tractor', count: '3 Units', status: 'READY', readiness_pct: 94, capacity: '45 MT', assignment: '100km Overland Ice-Shelf Resupply', weather_suitability: 'EXCELLENT' },
    { id: 'fleet-2', name: 'Kamov Ka-32 Helix', type: 'Heavy Lift Rotorcraft', count: '1 Unit', status: 'STANDBY', readiness_pct: 91, capacity: '5,000 kg sling', assignment: 'Airlift / Crew Rotation', weather_suitability: 'MODERATE' },
    { id: 'fleet-3', name: 'Heavy Polar Sled Train', type: 'HDPE Ice Sleds', count: '6 Sleds', status: 'READY', readiness_pct: 98, capacity: '60 MT', assignment: 'Bulk Fuel & Generator Transfer', weather_suitability: 'EXCELLENT' },
  ] : [
    { id: 'fleet-b1', name: 'Self-Propelled Ice Barges', type: 'Amphibious Cargo Barge', count: '2 Barges', status: 'READY', readiness_pct: 96, capacity: '35 MT each', assignment: 'Quilty Bay Shore Shuttle', weather_suitability: 'GOOD' },
    { id: 'fleet-b2', name: 'Kamov Ka-32 Helix', type: 'Heavy Lift Rotorcraft', count: '1 Unit', status: 'READY', readiness_pct: 95, capacity: '5,000 kg sling', assignment: 'Roof Helipad Slings', weather_suitability: 'MODERATE' },
    { id: 'fleet-b3', name: 'PistenBully Groomers', type: 'Tracked Utility Tractor', count: '2 Units', status: 'READY', readiness_pct: 92, capacity: '20 MT', assignment: 'Coastal Ramp Clearing', weather_suitability: 'EXCELLENT' },
  ]);

  const cargoManifest = log?.cargo_manifest ?? [
    { id: 'c1', name: isMaitri ? 'AGO Bulk Diesel (180,000 L)' : 'AGO Bulk Diesel (220,000 L)', category: 'Energy & Thermal', shortage_risk: 'HIGH', required_by_days: isMaitri ? 74 : 85, reserve_days: isMaitri ? 48 : 58, dependent_domain: 'Fuel & Energy', weight_mt: isMaitri ? 152 : 185, volume_m3: 190, priority: 1 },
    { id: 'c2', name: 'Dry Rations & Fresh Provisions', category: 'Life Support', shortage_risk: 'LOW', required_by_days: 90, reserve_days: 65, dependent_domain: 'Personnel', weight_mt: 12, volume_m3: 28, priority: 2 },
    { id: 'c3', name: 'Equipment Overhaul Spares', category: 'Maintenance', shortage_risk: 'MEDIUM', required_by_days: 80, reserve_days: 35, dependent_domain: 'Equipment & Systems', weight_mt: 8, volume_m3: 15, priority: 3 },
    { id: 'c4', name: 'Medical & Lab Consumables', category: 'Life Support', shortage_risk: 'LOW', required_by_days: 120, reserve_days: 90, dependent_domain: 'Personnel/Safety', weight_mt: 1.2, volume_m3: 3, priority: 4 },
    { id: 'c5', name: isMaitri ? 'LPG Cylinders (Heating)' : 'Methanol & Antifreeze Chemicals', category: 'Thermal Management', shortage_risk: 'MEDIUM', required_by_days: 60, reserve_days: 40, dependent_domain: 'Infrastructure', weight_mt: 4.5, volume_m3: 8, priority: 2 },
  ];

  // Stock inventory — per station
  const stocks = isMaitri ? [
    { id: 'diesel', label: 'HSD Diesel', icon: <Fuel className="w-5 h-5" />, current: 82000, capacity: 200000, unit: 'L', color: '#f59e0b', criticalPct: 20, warningPct: 35, dailyRate: 1800, daysRemaining: 46 },
    { id: 'lpg', label: 'LPG (Heating)', icon: <Flame className="w-5 h-5" />, current: 3200, capacity: 8000, unit: 'kg', color: '#f97316', criticalPct: 15, warningPct: 30, dailyRate: 42, daysRemaining: 76 },
    { id: 'water', label: 'Fresh Water', icon: <Droplet className="w-5 h-5" />, current: 28000, capacity: 60000, unit: 'L', color: '#38bdf8', criticalPct: 20, warningPct: 40, dailyRate: 800, daysRemaining: 35 },
    { id: 'food', label: 'Dry Rations', icon: <UtensilsCrossed className="w-5 h-5" />, current: 4200, capacity: 8000, unit: 'kg', color: '#10b981', criticalPct: 15, warningPct: 30, dailyRate: 40, daysRemaining: 105 },
    { id: 'oxygen', label: 'Medical O₂', icon: <Activity className="w-5 h-5" />, current: 420, capacity: 800, unit: 'kg', color: '#818cf8', criticalPct: 20, warningPct: 40, dailyRate: 3, daysRemaining: 140 },
    { id: 'spares', label: 'Maint. Spares', icon: <Wrench className="w-5 h-5" />, current: 62, capacity: 100, unit: '%', color: '#06b6d4', criticalPct: 20, warningPct: 40, dailyRate: 0.4, daysRemaining: 55 },
  ] : [
    { id: 'diesel', label: 'HSD Diesel', icon: <Fuel className="w-5 h-5" />, current: 138000, capacity: 280000, unit: 'L', color: '#f59e0b', criticalPct: 20, warningPct: 35, dailyRate: 2200, daysRemaining: 63 },
    { id: 'lpg', label: 'LPG (Heating)', icon: <Flame className="w-5 h-5" />, current: 5800, capacity: 12000, unit: 'kg', color: '#f97316', criticalPct: 15, warningPct: 30, dailyRate: 58, daysRemaining: 100 },
    { id: 'water', label: 'Fresh Water', icon: <Droplet className="w-5 h-5" />, current: 42000, capacity: 80000, unit: 'L', color: '#38bdf8', criticalPct: 20, warningPct: 40, dailyRate: 1000, daysRemaining: 42 },
    { id: 'food', label: 'Dry Rations', icon: <UtensilsCrossed className="w-5 h-5" />, current: 5800, capacity: 10000, unit: 'kg', color: '#10b981', criticalPct: 15, warningPct: 30, dailyRate: 52, daysRemaining: 112 },
    { id: 'oxygen', label: 'Medical O₂', icon: <Activity className="w-5 h-5" />, current: 580, capacity: 1000, unit: 'kg', color: '#818cf8', criticalPct: 20, warningPct: 40, dailyRate: 4, daysRemaining: 145 },
    { id: 'spares', label: 'Maint. Spares', icon: <Wrench className="w-5 h-5" />, current: 74, capacity: 100, unit: '%', color: '#06b6d4', criticalPct: 20, warningPct: 40, dailyRate: 0.3, daysRemaining: 80 },
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
          food_risk: delayDays > 60 ? 'CRITICAL' : delayDays > 30 ? 'MODERATE' : 'LOW',
          water_risk: delayDays > 50 ? 'HIGH' : 'LOW',
        },
        recommended_action: delayDays > 20
          ? 'Initiate Tier-2 fuel rationing. Reduce non-residential heating by 2°C. Prioritize solar battery charging during daylight. Request emergency airlift for critical cargo.'
          : 'Monitor situation. Increase consumption audit frequency. Pre-position emergency fuel from reserve bund.',
      });
    } catch { setWhatIfResult({ scenario_name: 'Error', recommended_action: 'Simulation unavailable.' }); }
    finally { setWhatIfLoading(false); }
  };

  const layers = [
    { id: 'overview' as const, label: 'Overview', icon: <Compass className="w-4 h-4" />, color: '#38bdf8' },
    { id: 'vessel' as const, label: 'Vessel Tracking', icon: <Ship className="w-4 h-4" />, color: '#06b6d4' },
    { id: 'stock' as const, label: 'Stock Inventory', icon: <Database className="w-4 h-4" />, color: '#f59e0b' },
    { id: 'cargo' as const, label: 'Cargo Manifest', icon: <Package className="w-4 h-4" />, color: '#10b981' },
    { id: 'fleet' as const, label: 'Transport Fleet', icon: <Truck className="w-4 h-4" />, color: '#818cf8' },
    { id: 'whatif' as const, label: 'Delay Simulator', icon: <Sparkles className="w-4 h-4" />, color: '#f97316' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 60%, #06b6d408 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, #f59e0b08 0%, transparent 50%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                <Truck className="w-3 h-3" /> Logistics, Resupply & Route Intelligence
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {station.name}
              </span>
              <Pill label={`RISK: ${riskLevel}`} color={riskLevelColor} pulse={riskLevel === 'HIGH'} />
              {stocks.some(s => (s.current / s.capacity) * 100 <= s.criticalPct) && (
                <Pill label="⚠️ CRITICAL STOCK" color="#ef4444" pulse />
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Ship className="w-8 h-8 text-cyan-400" /> Logistics Command Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl leading-relaxed">
              {vesselName} · {isMaitri ? 'Cape Town → Princess Astrid → Schirmacher Oasis Overland' : 'Cape Town → Prydz Bay → Quilty Bay Direct'} · {totalVoyageDays}-day mission · Stock Inventory · Cargo Manifest · Fleet Intelligence
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-polar-dark border border-cyan-500/30 text-[10px] font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-bold">DAY {voyageDay}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">ETA {Math.round(effectiveEta)}d</span>
            </div>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=logistics`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4" /> Decision Intel
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Voyage Day', val: `D+${voyageDay}`, sub: `${voyageProgress}% of ${totalVoyageDays}d`, color: '#38bdf8', icon: <Compass className="w-4 h-4" /> },
            { label: 'ETA', val: `${Math.round(effectiveEta)}d`, sub: `+${weatherDelay}d weather delay`, color: '#f59e0b', icon: <Clock className="w-4 h-4" /> },
            { label: 'Logistics Risk', val: `${logisticsRisk.toFixed(1)}`, sub: `Level: ${riskLevel}`, color: riskLevelColor, icon: <AlertTriangle className="w-4 h-4" /> },
            { label: 'Confidence', val: confidence, sub: `Vessel: ${vesselName.split(' ').slice(0, 2).join(' ')}`, color: confidence === 'High' ? '#10b981' : confidence === 'Medium' ? '#f59e0b' : '#ef4444', icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'Diesel Left', val: `${Math.round(stocks[0].current / 1000)}kL`, sub: `~${stocks[0].daysRemaining}d remaining`, color: stocks[0].daysRemaining < 30 ? '#ef4444' : '#f59e0b', icon: <Fuel className="w-4 h-4" /> },
            { label: 'Food Stock', val: `${stocks[3].current}kg`, sub: `~${stocks[3].daysRemaining}d remaining`, color: '#10b981', icon: <UtensilsCrossed className="w-4 h-4" /> },
          ].map(kpi => (
            <div key={kpi.label}
              className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all group">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Layer Navigation ── */}
      <div className="flex gap-2 flex-wrap">
        {layers.map(l => (
          <button key={l.id} onClick={() => setActiveLayer(l.id)}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border cursor-pointer"
            style={activeLayer === l.id
              ? { background: `${l.color}22`, borderColor: `${l.color}66`, color: l.color }
              : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#64748b' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: OVERVIEW
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Vessel Radar snapshot */}
            <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl flex flex-col items-center gap-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold self-start flex items-center gap-2">
                <Ship className="w-4 h-4" /> Supply Vessel Position
              </div>
              <VesselRadar
                vesselName={vesselName}
                etaDays={Math.round(effectiveEta)}
                distanceKm={routeWaypoints.find((w: any) => w.status === 'ACTIVE')?.distance_km ?? 4100}
                totalDistKm={routeWaypoints[routeWaypoints.length - 1]?.distance_km ?? 4800}
                speedKnots={isMaitri ? 12.4 : 14.2}
                weatherState={isMaitri ? 'ROUGH' : 'MODERATE'}
                isMaitri={isMaitri}
              />
            </div>

            {/* Voyage arc + vessel info */}
            <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl flex flex-col items-center gap-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold self-start flex items-center gap-2">
                <Compass className="w-4 h-4" /> Voyage Progress
              </div>
              <VoyageProgressArc
                voyageDay={voyageDay} totalDays={totalVoyageDays}
                etaDays={Math.round(effectiveEta)} weatherDelay={weatherDelay}
              />
              <div className="w-full space-y-1.5 text-xs font-mono">
                {[
                  { label: 'Vessel', val: vesselName, color: '#38bdf8' },
                  { label: 'Ice Class', val: isMaitri ? 'Arc5 / Polar Class 4' : 'Arc4 / Polar Class 5', color: '#94a3b8' },
                  { label: 'Departure', val: 'Cape Town', color: '#10b981' },
                  { label: 'Destination', val: isMaitri ? 'Princess Astrid Coast' : 'Quilty Bay, Bharati', color: '#f59e0b' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-polar-border/20 pb-1">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical stock snapshot */}
            <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                <Database className="w-4 h-4" /> Critical Stock Snapshot
              </div>
              {stocks.map(s => {
                const pct = (s.current / s.capacity) * 100;
                const isCrit = pct <= s.criticalPct;
                const isWarn = pct <= s.warningPct && !isCrit;
                const sc = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : s.color;
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="flex items-center gap-1" style={{ color: sc }}>
                        <span className="text-[8px]">{isCrit ? '🔴' : isWarn ? '🟡' : '🟢'}</span>
                        {s.label}
                      </span>
                      <span className="font-bold" style={{ color: sc }}>{Math.round(pct)}% · {s.daysRemaining}d</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sc }} />
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setActiveLayer('stock')}
                className="w-full mt-2 py-2 rounded-xl text-[10px] font-mono font-bold border border-amber-500/30 bg-amber-500/08 text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                View Full Inventory <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Route timeline */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Route Waypoints — Real-Time Progress & Delay Tracking
            </div>
            <RouteTimeline waypoints={routeWaypoints} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: VESSEL TRACKING
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'vessel' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Ship className="w-6 h-6" />}
              title="Supply Vessel Tracking & Route Intelligence"
              subtitle="Live vessel position · Waypoint progress · Weather sea-state · ETA prediction · Ice route risk assessment"
              color="#06b6d4"
              layer="Layer 1 · Vessel Tracking"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* Big radar */}
              <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/06 flex flex-col items-center gap-4">
                <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold self-start">Live Vessel Position Radar</div>
                <VesselRadar
                  vesselName={vesselName}
                  etaDays={Math.round(effectiveEta)}
                  distanceKm={routeWaypoints.find((w: any) => w.status === 'ACTIVE')?.distance_km ?? 4100}
                  totalDistKm={routeWaypoints[routeWaypoints.length - 1]?.distance_km ?? 4800}
                  speedKnots={isMaitri ? 12.4 : 14.2}
                  weatherState={isMaitri ? 'ROUGH' : 'MODERATE'}
                  isMaitri={isMaitri}
                />
                {/* Live vessel KPIs */}
                <div className="w-full grid grid-cols-2 gap-2">
                  {[
                    { label: 'Speed', val: `${isMaitri ? 12.4 : 14.2} kn`, color: '#06b6d4' },
                    { label: 'Heading', val: isMaitri ? '174°S' : '162°SE', color: '#818cf8' },
                    { label: 'Sea State', val: isMaitri ? 'State 5 (Rough)' : 'State 4 (Moderate)', color: isMaitri ? '#ef4444' : '#f59e0b' },
                    { label: 'Wind', val: isMaitri ? '42 km/h WSW' : '28 km/h SW', color: '#f59e0b' },
                    { label: 'Ice Coverage', val: isMaitri ? '35% pack' : '20% pack', color: '#38bdf8' },
                    { label: 'Icebreaker?', val: isMaitri ? 'YES — escort' : 'NO', color: isMaitri ? '#10b981' : '#64748b' },
                  ].map(m => (
                    <div key={m.label} className="p-2 rounded-xl bg-polar-dark/50 border border-polar-border text-center text-[9px] font-mono">
                      <div className="text-slate-500">{m.label}</div>
                      <div className="font-bold mt-0.5" style={{ color: m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voyage arc */}
              <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-500/06 flex flex-col items-center gap-3">
                <div className="text-[10px] font-mono uppercase text-sky-400 font-bold self-start">Mission Voyage Progress</div>
                <VoyageProgressArc
                  voyageDay={voyageDay} totalDays={totalVoyageDays}
                  etaDays={Math.round(effectiveEta)} weatherDelay={weatherDelay}
                />
                <div className="w-full space-y-2 text-xs font-mono">
                  {[
                    { label: 'Vessel', val: vesselName, color: '#38bdf8' },
                    { label: 'Ice Class', val: isMaitri ? 'Arc5 / Polar Class 4' : 'Arc4 / Polar Class 5', color: '#94a3b8' },
                    { label: 'Departure Port', val: 'Cape Town (CTIA)', color: '#10b981' },
                    { label: 'Destination', val: isMaitri ? 'Princess Astrid Coast' : 'Quilty Bay, Bharati', color: '#f59e0b' },
                    { label: 'Planned Window', val: isMaitri ? 'Nov 2026 – Jan 2027' : 'Dec 2026 – Feb 2027', color: '#94a3b8' },
                    { label: 'ETA Confidence', val: confidence, color: confidence === 'High' ? '#10b981' : confidence === 'Medium' ? '#f59e0b' : '#ef4444' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between border-b border-polar-border/20 pb-1">
                      <span className="text-slate-400">{r.label}</span>
                      <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Route timeline */}
              <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/06 space-y-3">
                <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Route Waypoints</div>
                <RouteTimeline waypoints={routeWaypoints} />
              </div>
            </div>

            {/* Weather corridor strip */}
            <div className="p-4 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                <Wind className="w-4 h-4" /> Weather Corridor Strip — Cape Town → Antarctica
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(isMaitri ? [
                  { zone: 'Cape Town', state: 'CLEAR', wind: '15 km/h', temp: '+18°C', color: '#10b981' },
                  { zone: 'Roaring 40s', state: 'STRONG', wind: '55 km/h', temp: '+8°C', color: '#f59e0b' },
                  { zone: 'Screaming 50s', state: 'GALE', wind: '70 km/h', temp: '-4°C', color: '#ef4444' },
                  { zone: 'Ice Edge', state: 'PACK', wind: '35 km/h', temp: '-18°C', color: '#f97316' },
                  { zone: 'Station', state: 'BLIZZARD', wind: '88 km/h', temp: '-32°C', color: '#dc2626' },
                ] : [
                  { zone: 'Cape Town', state: 'CLEAR', wind: '12 km/h', temp: '+19°C', color: '#10b981' },
                  { zone: 'Roaring 40s', state: 'BRISK', wind: '42 km/h', temp: '+10°C', color: '#f59e0b' },
                  { zone: 'Screaming 50s', state: 'STRONG', wind: '58 km/h', temp: '-2°C', color: '#f97316' },
                  { zone: 'Prydz Bay Ice', state: 'PACK', wind: '28 km/h', temp: '-15°C', color: '#f59e0b' },
                  { zone: 'Quilty Bay', state: 'MODERATE', wind: '35 km/h', temp: '-22°C', color: '#10b981' },
                ]).map(z => (
                  <div key={z.zone} className="p-3 rounded-xl text-center space-y-1 border"
                    style={{ borderColor: `${z.color}44`, background: `${z.color}08` }}>
                    <div className="text-[8px] font-mono text-slate-500">{z.zone}</div>
                    <div className="text-[9px] font-mono font-bold" style={{ color: z.color }}>{z.state}</div>
                    <div className="text-[8px] font-mono text-slate-400">{z.wind}</div>
                    <div className="text-[8px] font-mono text-sky-300">{z.temp}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: STOCK INVENTORY
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'stock' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Database className="w-6 h-6" />}
              title="Station Stock Inventory — Consumption & Runway Dashboard"
              subtitle="Fuel · Food · Water · Medical O₂ · LPG · Maintenance Spares — Live tank levels with consumption forecast"
              color="#f59e0b"
              layer="Layer 2 · Stock Inventory"
            />

            {/* Tank Gauges */}
            <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/06 mb-5">
              <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Tank Level Gauges — Live Stock Levels
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {stocks.map(s => (
                  <TankGauge key={s.id}
                    label={s.label}
                    current={s.current}
                    capacity={s.capacity}
                    unit={s.unit}
                    color={s.color}
                    criticalPct={s.criticalPct}
                    warningPct={s.warningPct}
                    daysRemaining={s.daysRemaining}
                  />
                ))}
              </div>
              {stocks.some(s => (s.current / s.capacity) * 100 <= s.criticalPct) && (
                <div className="mt-4 p-3 rounded-xl border border-red-500/60 bg-red-500/12 text-[9px] font-mono text-red-300 font-bold animate-pulse">
                  🚨 CRITICAL STOCK LEVEL ALERT — {stocks.filter(s => (s.current / s.capacity) * 100 <= s.criticalPct).map(s => s.label).join(', ')} below critical threshold. Vessel resupply priority elevated.
                </div>
              )}
            </div>

            {/* Consumption Forecasts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              {stocks.slice(0, 4).map(s => {
                const pct = (s.current / s.capacity) * 100;
                const sc = pct <= s.criticalPct ? '#ef4444' : pct <= s.warningPct ? '#f59e0b' : s.color;
                return (
                  <div key={s.id} className="p-4 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-white">
                        <span style={{ color: sc }}>{s.icon}</span> {s.label} Consumption Forecast
                      </div>
                      <Pill label={`${s.daysRemaining}d runway`} color={s.daysRemaining < 30 ? '#ef4444' : '#10b981'} small />
                    </div>
                    <ConsumptionChart
                      label={s.label}
                      currentStock={s.current}
                      dailyRate={s.dailyRate}
                      color={sc}
                      etaDays={Math.round(effectiveEta)}
                    />
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                      <div className="text-center">
                        <div className="text-slate-500">Current</div>
                        <div className="font-bold" style={{ color: sc }}>{s.current.toLocaleString()} {s.unit}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500">Daily Rate</div>
                        <div className="font-bold text-white">{s.dailyRate} {s.unit}/d</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500">Vessel ETA</div>
                        <div className="font-bold text-amber-300">{Math.round(effectiveEta)}d</div>
                      </div>
                    </div>
                    {s.daysRemaining < Math.round(effectiveEta) && (
                      <div className="p-2 rounded-lg border border-red-500/40 bg-red-500/10 text-[8px] font-mono text-red-300 font-bold">
                        ⚠️ RUNWAY SHORTER THAN ETA — Stock will run out before vessel arrives. Request emergency airlift.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detailed stock table */}
            <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-3">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Detailed Inventory Table</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[9px] font-mono">
                  <thead>
                    <tr className="border-b border-polar-border">
                      {['Item', 'Current', 'Capacity', 'Level %', 'Daily Use', 'Runway', 'vs ETA', 'Status'].map(h => (
                        <th key={h} className="text-left text-slate-500 pb-2 pr-3 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-polar-border/20">
                    {stocks.map(s => {
                      const pct = (s.current / s.capacity) * 100;
                      const sc = pct <= s.criticalPct ? '#ef4444' : pct <= s.warningPct ? '#f59e0b' : s.color;
                      const vsEta = s.daysRemaining - Math.round(effectiveEta);
                      return (
                        <tr key={s.id}>
                          <td className="py-2 pr-3 text-white font-bold">{s.label}</td>
                          <td className="py-2 pr-3" style={{ color: sc }}>{s.current.toLocaleString()} {s.unit}</td>
                          <td className="py-2 pr-3 text-slate-400">{s.capacity.toLocaleString()} {s.unit}</td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sc }} />
                              </div>
                              <span style={{ color: sc }}>{Math.round(pct)}%</span>
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-slate-300">{s.dailyRate} {s.unit}/d</td>
                          <td className="py-2 pr-3 font-bold" style={{ color: s.daysRemaining < 30 ? '#ef4444' : '#10b981' }}>{s.daysRemaining}d</td>
                          <td className="py-2 pr-3 font-bold" style={{ color: vsEta < 0 ? '#ef4444' : '#10b981' }}>{vsEta >= 0 ? `+${vsEta}d buffer` : `${vsEta}d DEFICIT`}</td>
                          <td className="py-2">
                            <Pill label={pct <= s.criticalPct ? 'CRITICAL' : pct <= s.warningPct ? 'WARNING' : 'OK'}
                              color={sc} small pulse={pct <= s.criticalPct} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: CARGO MANIFEST
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'cargo' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Package className="w-6 h-6" />}
              title="Resupply Cargo Manifest — Critical Dependency Analysis"
              subtitle="Cargo priority · Shortage risk matrix · Domain dependency · Weight & volume · Required-by countdown"
              color="#10b981"
              layer="Layer 3 · Cargo Manifest"
            />

            {/* Priority heat matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              {cargoManifest.map((cargo: any) => {
                const risk = cargo.shortage_risk;
                const rc = risk === 'HIGH' ? '#ef4444' : risk === 'MEDIUM' ? '#f59e0b' : '#10b981';
                const urgency = Math.max(0, Math.min(100, 100 - (cargo.reserve_days / cargo.required_by_days) * 100));
                return (
                  <div key={cargo.id}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${expandedCargo === cargo.id ? 'border-white/30' : 'border-polar-border/60 hover:border-white/20'}`}
                    style={{ background: `${rc}08` }}
                    onClick={() => setExpandedCargo(expandedCargo === cargo.id ? null : cargo.id)}>
                    <div className="flex items-start justify-between gap-1 mb-3">
                      <span className="text-[9px] font-mono font-bold text-white leading-tight">{cargo.name}</span>
                      <Pill label={risk} color={rc} small />
                    </div>
                    {/* Urgency ring */}
                    <div className="flex justify-center mb-2">
                      <svg width={60} height={60} viewBox="0 0 60 60">
                        <circle cx={30} cy={30} r={22} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
                        <circle cx={30} cy={30} r={22} fill="none" stroke={rc} strokeWidth={6}
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 22 * (urgency / 100)} ${2 * Math.PI * 22}`}
                          transform="rotate(-90 30 30)"
                          style={{ filter: `drop-shadow(0 0 4px ${rc}66)` }} />
                        <text x={30} y={34} textAnchor="middle" fill="white" fontSize={9} fontWeight="900" fontFamily="monospace">{Math.round(urgency)}%</text>
                      </svg>
                    </div>
                    <div className="text-[8px] font-mono text-slate-500 text-center">{cargo.category}</div>
                    <div className="flex items-center justify-between mt-2 text-[8px] font-mono">
                      <span className="text-slate-600">P{cargo.priority}</span>
                      <span className="text-slate-400">Need in {cargo.required_by_days}d</span>
                    </div>
                    {expandedCargo === cargo.id && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-[8px] font-mono">
                        <div className="flex justify-between"><span className="text-slate-500">Reserve Buffer</span><span style={{ color: rc }} className="font-bold">{cargo.reserve_days}d</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Domain</span><span className="text-white">{cargo.dependent_domain}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Weight</span><span className="text-sky-300">{cargo.weight_mt} MT</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Volume</span><span className="text-purple-300">{cargo.volume_m3} m³</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detailed cargo cards */}
            <div className="space-y-3">
              {cargoManifest.map((cargo: any) => {
                const risk = cargo.shortage_risk;
                const rc = risk === 'HIGH' ? '#ef4444' : risk === 'MEDIUM' ? '#f59e0b' : '#10b981';
                const urgency = Math.max(0, Math.min(100, 100 - (cargo.reserve_days / cargo.required_by_days) * 100));
                return (
                  <div key={cargo.id} className="p-5 rounded-2xl border border-polar-border bg-polar-dark/40 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                            style={{ borderColor: `${rc}44`, background: `${rc}11`, color: rc }}>P{cargo.priority}</span>
                          <span className="text-sm font-bold text-white">{cargo.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{cargo.category} · Depends: {cargo.dependent_domain}</div>
                      </div>
                      <Pill label={`${risk} RISK`} color={rc} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                      {[
                        { label: 'Required By', val: `${cargo.required_by_days}d`, color: '#f59e0b' },
                        { label: 'Reserve Buffer', val: `${cargo.reserve_days}d`, color: rc },
                        { label: 'Vessel ETA', val: `${Math.round(effectiveEta)}d`, color: '#38bdf8' },
                        { label: 'Weight', val: `${cargo.weight_mt} MT`, color: '#818cf8' },
                        { label: 'Volume', val: `${cargo.volume_m3} m³`, color: '#06b6d4' },
                      ].map(m => (
                        <div key={m.label} className="p-2.5 rounded-xl bg-white/5 border border-white/8 text-center">
                          <div className="text-[8px] font-mono text-slate-500 uppercase">{m.label}</div>
                          <div className="text-sm font-black font-mono mt-0.5" style={{ color: m.color }}>{m.val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="h-2.5 rounded-full overflow-hidden bg-white/5 border border-white/5">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${urgency}%`, background: `linear-gradient(to right, ${rc}88, ${rc})` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono mt-1.5 text-slate-500">
                      <span>Urgency: {urgency.toFixed(0)}%</span>
                      {cargo.reserve_days < Math.round(effectiveEta) && (
                        <span className="text-red-400 font-bold">⚠️ Will run short before vessel arrives</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: TRANSPORT FLEET
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'fleet' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Truck className="w-6 h-6" />}
              title={isMaitri ? 'Maitri Overland Resupply Fleet' : 'Bharati Coastal Discharge Fleet'}
              subtitle="PistenBully tractors · Helicopter airlift · Ice sled trains · Barges — Readiness, capacity & assignment status"
              color="#818cf8"
              layer="Layer 4 · Transport Fleet"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-3">
                {assets.map((asset: any) => (
                  <div key={asset.id} onClick={() => setSelectedAssetId(asset.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-xl ${selectedAssetId === asset.id || (!selectedAssetId && asset.id === assets[0]?.id) ? 'border-indigo-500/60 bg-indigo-500/06' : 'border-polar-border bg-polar-dark/40 hover:border-white/20'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-bold text-white">{asset.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{asset.type} · {asset.count}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill label={asset.status}
                          color={asset.status === 'READY' ? '#10b981' : asset.status === 'STANDBY' ? '#f59e0b' : '#ef4444'} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      {[
                        { label: 'Capacity', val: asset.capacity, color: '#818cf8' },
                        { label: 'Readiness', val: `${asset.readiness_pct}%`, color: asset.readiness_pct > 80 ? '#10b981' : '#f59e0b' },
                        { label: 'Weather Fit', val: asset.weather_suitability, color: asset.weather_suitability === 'EXCELLENT' ? '#10b981' : asset.weather_suitability === 'GOOD' ? '#06b6d4' : '#f59e0b' },
                        { label: 'Assignment', val: asset.assignment, color: '#94a3b8' },
                      ].map(m => (
                        <div key={m.label} className="text-[9px] font-mono">
                          <div className="text-slate-500 uppercase mb-0.5">{m.label}</div>
                          <div className="font-bold leading-tight" style={{ color: m.color }}>{m.val}</div>
                        </div>
                      ))}
                    </div>
                    <BarMeter label="Mission Readiness" value={asset.readiness_pct} max={100} unit="%" color="#818cf8" height="h-2.5" />
                  </div>
                ))}
              </div>

              {/* Asset detail panel */}
              <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/06 space-y-4">
                <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Asset Intelligence Detail</div>
                {(() => {
                  const a = assets.find((x: any) => x.id === selectedAssetId) || assets[0];
                  const sc = a.status === 'READY' ? '#10b981' : a.status === 'STANDBY' ? '#f59e0b' : '#ef4444';
                  return (
                    <div className="space-y-4">
                      <div className="text-sm font-bold text-white">{a.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{a.type}</div>
                      {/* Readiness half-gauge */}
                      <div className="flex justify-center">
                        <svg width={140} height={80} viewBox="0 0 140 80">
                          <path d="M 14 70 A 56 56 0 0 1 126 70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12} strokeLinecap="round" />
                          <path d="M 14 70 A 56 56 0 0 1 126 70" fill="none" stroke={sc} strokeWidth={12} strokeLinecap="round"
                            strokeDasharray={`${Math.PI * 56 * (a.readiness_pct / 100)} ${Math.PI * 56}`}
                            style={{ filter: `drop-shadow(0 0 6px ${sc}66)` }} />
                          <text x="70" y="62" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="monospace">{a.readiness_pct}%</text>
                          <text x="70" y="76" textAnchor="middle" fill={sc} fontSize="8" fontFamily="monospace">READINESS</text>
                        </svg>
                      </div>
                      <div className="space-y-2 text-xs font-mono">
                        {[
                          { label: 'Status', val: a.status, color: sc },
                          { label: 'Capacity', val: a.capacity, color: '#818cf8' },
                          { label: 'Assignment', val: a.assignment, color: '#94a3b8' },
                          { label: 'Weather Fit', val: a.weather_suitability, color: a.weather_suitability === 'EXCELLENT' ? '#10b981' : '#f59e0b' },
                          { label: 'Unit Count', val: a.count, color: '#64748b' },
                        ].map(r => (
                          <div key={r.label} className="flex justify-between border-b border-polar-border/20 pb-1.5">
                            <span className="text-slate-400">{r.label}</span>
                            <span className="font-bold" style={{ color: r.color }}>{r.val}</span>
                          </div>
                        ))}
                      </div>
                      {/* Deployment checklist */}
                      <div className="space-y-1.5">
                        <div className="text-[9px] font-mono text-slate-500 uppercase font-bold">Deployment Checklist</div>
                        {['Fuel topped up', 'Cold-weather start verified', 'Safety kit on-board', 'Comms check passed', 'Ice route cleared'].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-[9px] font-mono">
                            <span className={i < 4 ? 'text-emerald-400' : 'text-slate-500'}>{i < 4 ? '✓' : '○'}</span>
                            <span className={i < 4 ? 'text-slate-300' : 'text-slate-600'}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LAYER: DELAY SIMULATOR (What-If)
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'whatif' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Sparkles className="w-6 h-6" />}
              title="Resupply Delay Impact Simulator"
              subtitle="Simulate vessel delay scenarios · Cross-domain cascade impact analysis · Rationing recommendations"
              color="#f97316"
              layer="What-If Simulator"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Controls */}
              <div className="p-5 rounded-2xl border border-orange-500/30 bg-orange-500/06 space-y-5">
                <div className="text-[10px] font-mono uppercase text-orange-400 font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Scenario Configuration
                </div>

                {/* Delay slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Delay Duration</span>
                    <span className="font-bold text-amber-300">{delayDays} days</span>
                  </div>
                  <div className="relative">
                    <input type="range" min={5} max={90} value={delayDays} onChange={e => setDelayDays(+e.target.value)}
                      className="w-full cursor-pointer" style={{ accentColor: '#f97316' }} />
                    {/* Risk zones beneath slider */}
                    <div className="flex mt-1 text-[8px] font-mono">
                      <div className="flex-1 text-center text-emerald-400">Safe (5-14d)</div>
                      <div className="flex-1 text-center text-amber-400">Caution (15-30d)</div>
                      <div className="flex-1 text-center text-red-400">Critical (31-90d)</div>
                    </div>
                  </div>
                  {/* Scenario presets */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '15d Moderate', val: 15, color: '#f59e0b' },
                      { label: '30d Critical', val: 30, color: '#f97316' },
                      { label: '60d Extreme', val: 60, color: '#ef4444' },
                    ].map(p => (
                      <button key={p.val} onClick={() => setDelayDays(p.val)}
                        className={`px-2 py-2 rounded-xl text-[9px] font-mono font-bold border transition-all cursor-pointer ${delayDays === p.val ? 'text-white' : 'text-slate-400 border-polar-border hover:border-white/20'}`}
                        style={delayDays === p.val ? { background: `${p.color}22`, borderColor: `${p.color}66`, color: p.color } : {}}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk factors panel */}
                <div className="space-y-3">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Logistics Risk Factor Radar</div>
                  <RiskRadarChart riskFactors={riskFactors} />
                  <div className="space-y-1.5">
                    {Object.entries(riskFactors).map(([key, val]: [string, any]) => (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="capitalize text-slate-400">{key.replace(/_/g, ' ')}</span>
                          <span className="font-bold text-cyan-300">{val}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(val / 60) * 100}%`, background: 'linear-gradient(to right, #06b6d488, #06b6d4)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleWhatIf} disabled={whatIfLoading}
                  className="w-full py-3.5 rounded-xl text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 border border-orange-500/50"
                  style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(239,68,68,0.2))', color: '#fdba74' }}>
                  {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {whatIfLoading ? 'Simulating Impact...' : 'Run Cascade Impact Analysis'}
                </button>
              </div>

              {/* Results */}
              <div className="p-5 rounded-2xl border border-polar-border bg-polar-dark/40 space-y-4">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Cascade Impact Analysis Results</div>
                {!whatIfResult ? (
                  <div className="flex flex-col items-center justify-center h-80 text-slate-500 text-sm font-mono text-center gap-3">
                    <Ship className="w-14 h-14 opacity-20" />
                    <p className="text-[11px]">Configure a delay scenario and run analysis to see cross-domain impact cascade on the cloned Digital Twin state.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl border border-orange-500/40 bg-orange-500/10">
                      <div className="text-xs font-mono font-bold text-orange-300">{whatIfResult.scenario_name}</div>
                      <div className="text-[10px] font-mono text-emerald-300 mt-1">✓ Cloned state analysis — Live twin unaffected</div>
                    </div>

                    {whatIfResult.impact && (
                      <>
                        {/* Impact grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Fuel Days Lost', val: `−${whatIfResult.impact.fuel_days_lost}d`, color: '#ef4444' },
                            { label: 'Risk Delta', val: `+${whatIfResult.impact.risk_score_delta?.toFixed(1)}pts`, color: '#f97316' },
                            { label: 'Runway Left', val: `${whatIfResult.impact.runway_remaining}d`, color: whatIfResult.impact.runway_remaining < 10 ? '#ef4444' : '#10b981' },
                          ].map(m => (
                            <div key={m.label} className="p-3 rounded-xl text-center border border-polar-border bg-polar-dark/60">
                              <div className="text-[8px] font-mono text-slate-500 uppercase">{m.label}</div>
                              <div className="text-xl font-black font-mono mt-1" style={{ color: m.color }}>{m.val}</div>
                            </div>
                          ))}
                        </div>

                        {/* Cascade table */}
                        <div className="space-y-2">
                          <div className="text-[9px] font-mono uppercase text-slate-500 font-bold">Domain Cascade Impact</div>
                          {[
                            { domain: 'Fuel & Energy', impact: delayDays > 20 ? 'CRITICAL — Rationing required' : 'MANAGEABLE', color: delayDays > 20 ? '#ef4444' : '#10b981' },
                            { domain: 'Personnel Safety', impact: whatIfResult.impact.food_risk ?? (delayDays > 60 ? 'HIGH RISK' : 'LOW'), color: delayDays > 60 ? '#ef4444' : '#10b981' },
                            { domain: 'Infrastructure', impact: 'Reduced heating — +2°C setpoint raise', color: '#f59e0b' },
                            { domain: 'Water Supply', impact: whatIfResult.impact.water_risk ?? (delayDays > 50 ? 'HIGH RISK' : 'STABLE'), color: delayDays > 50 ? '#ef4444' : '#10b981' },
                            { domain: 'Equipment', impact: delayDays > 30 ? 'Deferred maintenance — Risk elevated' : 'Minimal impact', color: delayDays > 30 ? '#f59e0b' : '#10b981' },
                          ].map(d => (
                            <div key={d.domain} className="flex items-center justify-between p-2.5 rounded-xl border border-polar-border bg-polar-dark/40 text-[9px] font-mono">
                              <span className="text-white font-bold">{d.domain}</span>
                              <span style={{ color: d.color }} className="font-bold">{d.impact}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Recommendation */}
                    <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/08 space-y-2">
                      <div className="text-[10px] font-mono font-bold text-sky-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Recommended Action
                      </div>
                      <p className="text-[10px] font-mono text-slate-300 leading-relaxed">{whatIfResult.recommended_action}</p>
                    </div>

                    <button onClick={() => setWhatIfResult(null)}
                      className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" /> Clear Results
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wave { 0%, 100% { opacity: 0.4; transform: scaleX(1); } 50% { opacity: 0.8; transform: scaleX(1.2); } }
      `}</style>
    </div>
  );
};

export default LogisticsPage;
