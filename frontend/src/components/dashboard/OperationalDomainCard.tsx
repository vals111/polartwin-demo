import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Brain, ChevronRight } from 'lucide-react';
import {
  MiniRing,
  MiniFluidTank,
  MiniThermometer,
  MiniWindCompass,
  MiniTraverseTrack,
  MiniDonut
} from './MiniDomainInstruments';

export interface DomainCardNode {
  id: string;
  name: string;
  shortDesc?: string;
  tier?: string;
  tierNumber: number;
  route: string;
  icon: any;
  color: string;
  accentRgb: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface CausalConduitsDef {
  incoming: { id: string; name: string; shortName?: string }[];
  outgoing: { id: string; name: string; shortName?: string }[];
  onFocusDomain?: (domain: any) => void;
}

interface Props {
  node: DomainCardNode;
  data: any;
  stationId: string;
  isSelected?: boolean;
  isHovered?: boolean;
  isUpstream?: boolean;
  isDownstream?: boolean;
  isDimmed?: boolean;
  showFooterButtons?: boolean;
  causalConduits?: CausalConduitsDef;
  onClick?: () => void;
  onSelectDomain?: (domainId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const OperationalDomainCard: React.FC<Props> = ({
  node,
  data: t,
  stationId,
  isSelected,
  isHovered,
  isUpstream,
  isDownstream,
  isDimmed,
  showFooterButtons = false,
  causalConduits,
  onClick,
  onSelectDomain,
  onMouseEnter,
  onMouseLeave,
  className = '',
  style
}) => {
  const navigate = useNavigate();
  const Icon = node.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/station/${stationId}/${node.route}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      className={`rounded-2xl px-4 py-3 select-none transition-all duration-200 flex flex-col justify-between group overflow-hidden relative cursor-pointer ${
        isSelected
          ? 'ring-1 ring-cyan-400 border border-cyan-400 bg-polar-navy/95 shadow-xl z-25'
          : isHovered
          ? 'bg-polar-navy/95 border-2 shadow-xl z-20 scale-[1.01]'
          : isUpstream
          ? 'bg-cyan-950/50 border-2 border-cyan-400/80 shadow-md z-10'
          : isDownstream
          ? 'bg-amber-950/50 border-2 border-amber-400/80 shadow-md z-10'
          : isDimmed
          ? 'opacity-25 bg-polar-dark/40 border border-polar-border/40 z-0'
          : 'glass-panel bg-polar-dark/90 hover:bg-polar-navy/80 border border-polar-border/80 hover:border-cyan-500/50 shadow-md z-0'
      } ${className}`}
    >
      {/* Top Color Accent Stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
        style={{ background: node.color }}
      />

      {/* ── SECTION 1: HEADER (Identity, Tier Tag, Readiness & Quick Action) ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm"
            style={{
              background: `rgba(${node.accentRgb}, 0.18)`,
              borderColor: `rgba(${node.accentRgb}, 0.45)`,
              color: node.color
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13.5px] font-bold text-white tracking-wide group-hover:text-cyan-200 transition-colors truncate leading-tight">
              {node.name}
            </span>
            <span
              className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 leading-tight"
              style={{
                background: `rgba(${node.accentRgb}, 0.15)`,
                borderColor: `rgba(${node.accentRgb}, 0.4)`,
                color: node.color
              }}
            >
              T{node.tierNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-300">
            {t?.score ?? 95}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectDomain) {
                onSelectDomain(node.id);
              } else {
                navigate(`/station/${stationId}/${node.route}`);
              }
            }}
            title={`Open ${node.name} Telemetry Inspector`}
            className="p-1 rounded-lg bg-polar-dark/80 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-polar-border transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── SECTION 2: HERO METRIC & OPERATIONAL STATUS ── */}
      <div className="flex items-baseline justify-between mt-1.5 pt-1.5 border-t border-white/[0.08] font-mono">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-xl font-black text-white tracking-tight leading-none">
            {t?.primaryKpi ?? 'Nominal'}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider truncate">
            {t?.primaryLabel ?? 'Operational'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300 flex-shrink-0">
          <span
            className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
            style={{ background: node.color }}
          />
          <span className="font-semibold text-slate-200">{t?.status ?? 'ONLINE'}</span>
        </div>
      </div>

      {/* ── SECTION 3: VISUAL INSTRUMENT & TELEMETRY GAUGES (Airy & Unboxed) ── */}
      <div className="mt-2">
        {node.id === 'energy' && t && (
          <div className="flex items-center justify-between gap-4">
            <MiniRing pct={t?.batterySoc ?? 92} size={48} strokeWidth={5} color="#10b981" label={`${t?.batterySoc ?? 92}%`} sublabel="BATTERY" />
            <div className="flex-1 space-y-1 font-mono">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">Solar PV Share</span>
                <span className="text-amber-400 font-bold">{t?.solarKw ?? 22} kW</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${Math.min(100, ((t?.solarKw ?? 22) / 40) * 100)}%` }} />
              </div>
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="text-slate-400">Grid Frequency</span>
                <span className="text-cyan-300 font-bold">{t?.freqHz ?? 50.08} Hz</span>
              </div>
            </div>
          </div>
        )}

        {node.id === 'environment' && t && (
          <div className="flex items-center justify-around gap-3 py-0.5">
            <MiniThermometer tempC={parseFloat(t?.primaryKpi) || -25} chillC={t?.chillC ?? -38.4} height={48} />
            <div className="w-px h-9 bg-white/10" />
            <MiniWindCompass speedKmh={t?.windSpeed ?? 32} gustKmh={t?.windGust ?? 54} angleDeg={220} />
          </div>
        )}

        {node.id === 'fuel' && t && (
          <div className="flex items-center justify-between gap-4">
            <MiniFluidTank pct={parseFloat(t?.primaryKpi) || 78} liters={t?.currentLiters ?? 142000} color="#ef4444" height={48} width={42} />
            <div className="flex-1 space-y-1 font-mono">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">Burn Rate</span>
                <span className="text-amber-400 font-bold">{t?.burnRateLh ?? 17.5} L/h</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-full" style={{ width: `${parseFloat(t?.primaryKpi) || 78}%` }} />
              </div>
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">Autonomy</span>
                <span className="text-rose-400 font-bold">{t?.daysRemaining ?? 18} Days</span>
              </div>
            </div>
          </div>
        )}

        {node.id === 'water' && t && (
          <div className="flex items-center justify-between gap-4">
            <MiniFluidTank pct={t?.percentage ?? 82} liters={typeof t?.primaryKpi === 'string' ? parseInt(t?.primaryKpi.replace(/[^0-9]/g, '')) || 18500 : 18500} color="#38bdf8" height={48} width={42} />
            <div className="flex-1 space-y-1 font-mono">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">Trace Heat</span>
                <span className="text-emerald-400 font-bold">+{t?.pipeTempC ?? 3.8}°C</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-sky-400 h-full" style={{ width: `${t?.percentage ?? 82}%` }} />
              </div>
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">Freeze Hazard</span>
                <span className="text-cyan-300 font-bold">{t?.freezeRisk ?? 'LOW'}</span>
              </div>
            </div>
          </div>
        )}

        {node.id === 'logistics' && t && (
          <div className="space-y-1 font-mono">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-slate-400">Convoy Progress</span>
              <span className="text-amber-400 font-bold">{t?.journeyProgressPct ?? 65}%</span>
            </div>
            <MiniTraverseTrack progressPct={t?.journeyProgressPct ?? 65} isMaitri={stationId === 'maitri'} daysRemaining={parseInt(t?.primaryKpi) || 88} />
            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
              <span className="truncate">{t?.transportMode ?? 'Overland PistenBully'}</span>
              <span className="text-cyan-300 font-bold">{parseInt(t?.primaryKpi) || 88}d to resupply</span>
            </div>
          </div>
        )}

        {node.id === 'equipment' && t && (
          <div className="flex items-center justify-between gap-4">
            <MiniDonut
              segments={[
                { label: 'Operational', pct: 88, color: '#22c55e' },
                { label: 'Watch', pct: 12, color: '#f59e0b' }
              ]}
              centerLabel={t?.primaryKpi ?? '93%'}
              size={48}
            />
            <div className="flex-1 space-y-1 font-mono">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">Active Machinery</span>
                <span className="text-white font-bold">{t?.activeMachinesCount ?? 6} units</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-full" style={{ width: '93%' }} />
              </div>
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">Avg Vibration</span>
                <span className="text-emerald-400 font-bold">{t?.vibrationMmS ?? 2.1} mm/s</span>
              </div>
            </div>
          </div>
        )}

        {node.id === 'personnel' && t && (
          <div className="flex items-center justify-between gap-4">
            <MiniRing pct={t?.occupancyPct ?? 62} size={48} strokeWidth={5} color="#ec4899" label={`${t?.occupancyPct ?? 62}%`} sublabel="CREW" />
            <div className="flex-1 space-y-1 font-mono">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-400">On Duty</span>
                <span className="text-white font-bold">{t?.onDutyCount ?? 18} / {t?.totalPersonnel ?? 25}</span>
              </div>
              <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-full bg-slate-800/80">
                {t?.roleBreakdown?.map((r: any, idx: number) => (
                  <div key={idx} style={{ width: `${r.pct}%`, backgroundColor: r.color }} title={`${r.label}: ${r.pct}%`} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Medical Fit</span>
                <span className="text-emerald-400 font-bold">100% Nominal</span>
              </div>
            </div>
          </div>
        )}

        {node.id === 'communication' && t && (
          <div className="space-y-1.5 font-mono">
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="flex justify-between bg-white/5 px-2.5 py-1 rounded-lg">
                <span className="text-slate-400">Bandwidth</span>
                <span className="text-cyan-300 font-bold">{t?.bandwidthMbps ?? 120} Mbps</span>
              </div>
              <div className="flex justify-between bg-white/5 px-2.5 py-1 rounded-lg">
                <span className="text-slate-400">Latency</span>
                <span className="text-emerald-400 font-bold">{t?.latencyMs ?? 78}ms</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] bg-white/5 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400">Constellation Sync</span>
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {t?.syncState ?? 'LEO SYNCED'}
              </span>
            </div>
          </div>
        )}

        {node.id === 'inventory' && t && (
          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-slate-400">Medical Spares Buffer</span>
              <span className="text-white font-bold">{t?.medicalStockDays ?? 180} days</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div className="bg-teal-400 h-full" style={{ width: '75%' }} />
            </div>
            <div className="flex justify-between text-[10.5px]">
              <span className="text-slate-400">Engine Oil (5W-40)</span>
              <span className="text-amber-400 font-bold">{t?.oilStockLiters ?? 1200} L</span>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 4: OPTIONAL INTEGRATED CAUSAL CONDUITS (For 3D / HUD) ── */}
      {causalConduits && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex flex-col gap-1.5 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wide flex-shrink-0">
              ▲ Drivers:
            </span>
            <div className="flex flex-wrap gap-1">
              {causalConduits.incoming.length > 0 ? (
                causalConduits.incoming.map((d) => (
                  <button
                    key={d.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      causalConduits.onFocusDomain?.(d);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    {d.shortName || d.name}
                  </button>
                ))
              ) : (
                <span className="text-[9px] text-slate-500 italic">Root Primary Driver</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wide flex-shrink-0">
              ▼ Impacts:
            </span>
            <div className="flex flex-wrap gap-1">
              {causalConduits.outgoing.length > 0 ? (
                causalConduits.outgoing.map((d) => (
                  <button
                    key={d.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      causalConduits.onFocusDomain?.(d);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded bg-amber-950/70 hover:bg-amber-800 text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    {d.shortName || d.name}
                  </button>
                ))
              ) : (
                <span className="text-[9px] text-slate-500 italic">Terminal Telemetry Sink</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: OPTIONAL CARD FOOTER BUTTONS ── */}
      {showFooterButtons && (
        <div className="pt-2 mt-2 border-t border-polar-border/40 flex items-center justify-between text-xs font-mono gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/station/${stationId}/decision?domain=${node.id}`);
            }}
            className="flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all cursor-pointer"
          >
            <Brain className="w-2.5 h-2.5" />
            <span>Decision Intel</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectDomain?.(node.id);
            }}
            className="text-cyan-400 group-hover:text-cyan-300 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
          >
            <span>Inspect Studio</span>
            <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default OperationalDomainCard;
