import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
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
  onSeleocean depth probeomain?: (domainId: string) => void;
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
  onSeleocean depth probeomain,
  onMouseEnter,
  onMouseLeave,
  className = '',
  style
}) => {
  const navigate = useNavigate();
  const Icon = node.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/station/${stationId}/${node.route}`);
    }
  };

  // Build border/background based on state
  const getCardStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      transition: 'all 0.2s ease',
      ...style,
    };

    if (isDimmed) {
      return { ...base, opacity: 0.35 };
    }
    if (isSelected) {
      return {
        ...base,
        border: `2px solid ${node.color}`,
        boxShadow: `0 0 0 3px ${node.color}22, 0 4px 16px rgba(0,0,0,0.1)`,
      };
    }
    if (isHovered) {
      return {
        ...base,
        border: `2px solid ${node.color}`,
        boxShadow: 'var(--shadow-md)',
      };
    }
    if (isUpstream) {
      return {
        ...base,
        border: `2px solid ${node.color}99`,
        boxShadow: 'var(--shadow-sm)',
      };
    }
    if (isDownstream) {
      return {
        ...base,
        border: '2px solid #d97706',
        boxShadow: 'var(--shadow-sm)',
      };
    }
    return base;
  };

  // Extract fuel percentage safely
  const fuelPct = useMemo(() => {
    if (!t) return 78;
    if (typeof t?.fuelPercentage === 'number') return t.fuelPercentage;
    if (typeof t?.primaryKpi === 'string') {
      const match = t.primaryKpi.match(/(\d+(\.\d+)?)%/);
      if (match) return parseFloat(match[1]);
    }
    return 78;
  }, [t]);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={getCardStyle()}
      className={`rounded-2xl p-4 sm:p-4.5 select-none flex flex-col justify-between group overflow-hidden relative cursor-pointer ${className}`}
    >
      {/* Top Accent Stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[3.5px]"
        style={{ backgroundColor: node.color, borderRadius: '14px 14px 0 0' }}
      />

      {/* ── SECTION 1: HEADER (Identity + Tier + Score + Action) ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-md"
            style={{
              backgroundColor: `${node.color}1c`,
              borderColor: `${node.color}55`,
              color: node.color,
            }}
          >
            <Icon className="w-5 h-5" />
          </div>
          {/* Name */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm sm:text-base font-bold tracking-wide truncate leading-tight"
              style={{ color: 'var(--text-primary)' }}
              title={node.name}
            >
              {node.name}
            </span>
          </div>
        </div>

        {/* Readiness % */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm"
            style={{
              backgroundColor: (t?.score ?? 95) >= 90 ? 'rgba(34, 197, 94, 0.14)' : 'rgba(234, 179, 8, 0.14)',
              color: (t?.score ?? 95) >= 90 ? '#22c55e' : '#eab308',
              border: `1px solid ${(t?.score ?? 95) >= 90 ? 'rgba(34, 197, 94, 0.35)' : 'rgba(234, 179, 8, 0.35)'}`,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (t?.score ?? 95) >= 90 ? '#22c55e' : '#eab308' }} />
            {t?.score ?? 95}%
          </span>
        </div>
      </div>

      {/* ── SECTION 2: HERO PRIMARY KPI + OPERATIONAL STATUS ── */}
      <div
        className="flex items-baseline justify-between pt-2 pb-1 font-mono"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span
            className="text-xl sm:text-2xl font-black tracking-tight leading-none truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {t?.primaryKpi ?? 'Nominal'}
          </span>
          <span
            className="text-[11px] uppercase font-bold tracking-wider truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            {t?.primaryLabel ?? 'Operational'}
          </span>
        </div>
        <div
          className="flex items-center gap-2 text-[11px] font-mono flex-shrink-0"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0 shadow-sm"
            style={{ backgroundColor: node.color }}
          />
          <span className="font-bold uppercase tracking-wider">{t?.status ?? 'ONLINE'}</span>
        </div>
      </div>

      {/* ── SECTION 3: VISUAL INSTRUMENT BAY (Enhanced Scale & Readability) ── */}
      <div className="my-1.5 flex-1 flex flex-col justify-center">
        {/* 1. INFRASTRUCTURE */}
        {node.id === 'infrastructure' && t && (
          <div className="flex items-center justify-between gap-4 font-mono">
            <MiniRing
              pct={t?.stressIndex ?? 18}
              size={58}
              strokeWidth={5.5}
              color={(t?.stressIndex ?? 18) > 75 ? '#ef4444' : (t?.stressIndex ?? 18) > 40 ? '#f59e0b' : '#06b6d4'}
              label={`${t?.stressIndex ?? 18}%`}
              sublabel="STRESS"
            />
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Wind Stress Index</span>
                <span className="font-bold text-cyan-400 text-sm">{t?.stressIndex ?? 18} / 100</span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{
                    width: `${Math.min(100, ((t?.stressIndex ?? 18) / 85) * 100)}%`,
                    backgroundColor: (t?.stressIndex ?? 18) > 75 ? '#ef4444' : '#06b6d4'
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] pt-0.5" style={{ color: 'var(--text-secondary)' }}>
                <span>Thermal Eff: <strong className="text-amber-400 font-bold">{t?.thermalEff ?? 88}%</strong></span>
                <span>Snow Drift: <strong className="text-blue-300 font-bold">{t?.snowDriftM ?? 0.42}m</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* 2. ENERGY & FUEL (Central Powerhouse Dual-Bay Layout) */}
        {node.id === 'energy_fuel' && t && (
          <div className="grid grid-cols-2 gap-4 font-mono">
            {/* Bay 1: Power grid Generation */}
            <div className="flex items-center gap-3 pr-3 border-r border-white/10">
              <MiniRing
                pct={t?.batterySoc ?? 92}
                size={54}
                strokeWidth={5}
                color="#16a34a"
                label={`${t?.batterySoc ?? 92}%`}
                sublabel="BATT"
              />
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Solar Output</span>
                  <span className="font-bold text-amber-400 text-xs sm:text-sm">{t?.solarKw ?? 22} kW</span>
                </div>
                <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 shadow-sm"
                    style={{ width: `${Math.min(100, ((t?.solarKw ?? 22) / 40) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10.5px] text-slate-300">
                  <span>Grid Frequency</span>
                  <span className="font-bold text-blue-400">{t?.freqHz ?? 50.08} Hz</span>
                </div>
              </div>
            </div>
            {/* Bay 2: Bulk Fuel Storage */}
            <div className="flex items-center gap-3">
              <MiniFluidTank
                pct={fuelPct}
                liters={t?.currentLiters ?? 142000}
                color="#dc2626"
                height={54}
                width={42}
              />
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Burn Rate</span>
                  <span className="font-bold text-amber-400">{t?.burnRateLh ?? 17.5} L/h</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Autonomy</span>
                  <span className="font-bold text-cyan-400">{t?.daysRemaining ?? 18} Days</span>
                </div>
                <div className="flex justify-between text-[10.5px] text-slate-300">
                  <span>Reserve Tank</span>
                  <span className="font-bold text-emerald-400">AGO POLAR</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. LOGISTICS */}
        {node.id === 'logistics' && t && (
          <div className="space-y-2 font-mono">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Overland Traverse Status</span>
              <span className="font-bold text-amber-400">{t?.journeyProgressPct ?? 65}% En Route</span>
            </div>
            <MiniTraverseTrack
              progressPct={t?.journeyProgressPct ?? 65}
              isMaitri={stationId === 'maitri'}
              daysRemaining={parseInt(t?.primaryKpi) || 88}
            />
            <div className="flex justify-between items-center text-[11px] pt-0.5 text-slate-300">
              <span className="truncate font-medium">{t?.transportMode ?? 'Overland PistenBully'}</span>
              <span className="font-bold text-cyan-400 text-xs">{parseInt(t?.primaryKpi) || 88}d Resupply ETA</span>
            </div>
          </div>
        )}

        {/* 4. ENVIRONMENT */}
        {node.id === 'environment' && t && (
          <div className="flex items-center justify-between gap-3 font-mono">
            <MiniThermometer
              tempC={parseFloat(t?.primaryKpi) || -25}
              chillC={t?.chillC ?? -38.4}
              height={56}
            />
            <div className="w-px h-11 bg-white/10 flex-shrink-0" />
            <MiniWindCompass
              speedKmh={t?.windSpeed ?? 32}
              gustKmh={t?.windGust ?? 54}
              angleDeg={220}
              size={46}
            />
            <div className="w-px h-11 bg-white/10 flex-shrink-0" />
            <div className="flex flex-col text-xs space-y-1 leading-tight flex-shrink-0">
              <div className="flex justify-between gap-2">
                <span style={{ color: 'var(--text-muted)' }}>Pressure</span>
                <span className="font-bold text-cyan-300">{t?.pressureHpa ?? 984} hPa</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: 'var(--text-muted)' }}>Storm Risk</span>
                <span className="font-bold text-amber-400">{t?.stormIndex ? Math.round(t.stormIndex * 100) : 28}% Index</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[85px]">
                {t?.status ?? 'Partly Cloudy'}
              </div>
            </div>
          </div>
        )}

        {/* 5. COMMUNICATION */}
        {node.id === 'communication' && t && (
          <div className="flex items-center justify-between gap-4 font-mono">
            <MiniRing
              pct={98}
              size={58}
              strokeWidth={5.5}
              color="#3b82f6"
              label="98%"
              sublabel="LINK QoS"
            />
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Data speed</span>
                  <span className="font-bold text-blue-400">{t?.data speedMbps ?? 120} Mbps</span>
                </div>
                <div className="flex justify-between px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Signal delay</span>
                  <span className="font-bold text-emerald-400">{t?.signal delayMs ?? 78}ms</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10.5px] px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Constellation Status</span>
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm" />
                  {t?.syncState ?? 'LEO SYNCED'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 6. WATER */}
        {node.id === 'water' && t && (
          <div className="flex items-center justify-between gap-4 font-mono">
            <MiniFluidTank
              pct={t?.percentage ?? 82}
              liters={typeof t?.primaryKpi === 'string' ? parseInt(t?.primaryKpi.replace(/[^0-9]/g, '')) || 18500 : 18500}
              color="#2563eb"
              height={56}
              width={42}
            />
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Potable Storage Reserve</span>
                <span className="font-bold text-blue-400 text-sm">{t?.percentage ?? 82}%</span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div className="bg-blue-500 h-full rounded-full shadow-sm" style={{ width: `${t?.percentage ?? 82}%` }} />
              </div>
              <div className="flex justify-between text-[11px] pt-0.5">
                <span>Trace Line: <strong className="text-emerald-400 font-bold">+{t?.pipeTempC ?? 3.8}°C</strong></span>
                <span>Freeze Risk: <strong className="text-cyan-300 font-bold">{t?.freezeRisk ?? 'LOW'}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* 7. PERSONNEL SAFETY & EMERGENCY */}
        {node.id === 'personnel' && t && (
          <div className="flex items-center justify-between gap-4 font-mono">
            <MiniRing
              pct={t?.occupancyPct ?? 62}
              size={58}
              strokeWidth={5.5}
              color="#a855f7"
              label={`${t?.occupancyPct ?? 62}%`}
              sublabel="CREW"
            />
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Station Headcount</span>
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{t?.onDutyCount ?? 18} / {t?.totalPersonnel ?? 25} Crew</span>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden w-full shadow-inner" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                {(t?.roleBreakdown || [
                  { label: 'Sci', pct: 40, color: '#38bdf8' },
                  { label: 'Eng', pct: 32, color: '#10b981' },
                  { label: 'Med', pct: 12, color: '#ec4899' },
                  { label: 'Gal', pct: 16, color: '#f59e0b' }
                ]).map((r: any, idx: number) => (
                  <div key={idx} style={{ width: `${r.pct}%`, backgroundColor: r.color }} title={`${r.label}: ${r.pct}%`} />
                ))}
              </div>
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span>Life Support: <strong className="text-emerald-400">Nominal</strong></span>
                <span className="text-purple-300 font-bold">N+2 Shelter Safe</span>
              </div>
            </div>
          </div>
        )}

        {/* 8. EQUIPMENT & MACHINERY */}
        {node.id === 'equipment' && t && (
          <div className="flex items-center justify-between gap-4 font-mono">
            <MiniDonut
              segments={[
                { label: 'Operational', pct: 88, color: '#16a34a' },
                { label: 'Watch', pct: 12, color: '#d97706' }
              ]}
              centerLabel={t?.primaryKpi ?? '93%'}
              size={58}
            />
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Fleet Reliability</span>
                <span className="font-bold text-emerald-400 text-sm">{t?.activeMachinesCount ?? 6} Active Units</span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div className="bg-emerald-500 h-full rounded-full shadow-sm" style={{ width: '93%' }} />
              </div>
              <div className="flex justify-between text-[11px] pt-0.5">
                <span>Vibration: <strong className="text-emerald-400 font-bold">{t?.vibrationMmS ?? 2.1} mm/s</strong></span>
                <span className="text-slate-300 font-semibold">0 Critical Trips</span>
              </div>
            </div>
          </div>
        )}

        {/* Legacy aliases (storage/inventory/fuel/energy fallback) */}
        {(node.id === 'storage' || node.id === 'inventory') && t && (
          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Spares Buffer</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{t?.medicalStockDays ?? 180} days</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="bg-teal-500 h-full rounded-full" style={{ width: '75%' }} />
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Engine Oil</span>
              <span className="font-bold text-amber-400">{t?.oilStockLiters ?? 1200} L</span>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD BOTTOM ACCENT ROW (Click Indicator & Micro-Live data) ── */}
      <div
        className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-white/10"
      >
        <span className="truncate flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Domain Route:</span>
          <span className="text-slate-200 font-bold uppercase tracking-wider">/{node.route}</span>
        </span>
        <span
          className="flex items-center gap-1 font-bold transition-transform group-hover:translate-x-1"
          style={{ color: node.color }}
        >
          <span>Explore Studio</span>
          <span className="text-base leading-none">›</span>
        </span>
      </div>

      {/* ── SECTION 4: CAUSAL CONDUITS ── */}
      {causalConduits && (
        <div
          className="mt-2.5 pt-2 flex flex-col gap-1.5 font-mono"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-bold uppercase tracking-wide flex-shrink-0"
              style={{ color: '#2563eb' }}
            >
              ▲ Drivers:
            </span>
            <div className="flex flex-wrap gap-1">
              {causalConduits.incoming.length > 0 ? (
                causalConduits.incoming.map((d) => (
                  <button
                    key={d.id}
                    onClick={(e) => {
                      e.stopSignal spread();
                      causalConduits.onFocusDomain?.(d);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#2563eb',
                    }}
                  >
                    {d.shortName || d.name}
                  </button>
                ))
              ) : (
                <span className="text-[9px] italic" style={{ color: 'var(--text-muted)' }}>Root Primary Driver</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-bold uppercase tracking-wide flex-shrink-0"
              style={{ color: '#d97706' }}
            >
              ▼ Impacts:
            </span>
            <div className="flex flex-wrap gap-1">
              {causalConduits.outgoing.length > 0 ? (
                causalConduits.outgoing.map((d) => (
                  <button
                    key={d.id}
                    onClick={(e) => {
                      e.stopSignal spread();
                      causalConduits.onFocusDomain?.(d);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                    style={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#d97706',
                    }}
                  >
                    {d.shortName || d.name}
                  </button>
                ))
              ) : (
                <span className="text-[9px] italic" style={{ color: 'var(--text-muted)' }}>Terminal Live data Sink</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: FOOTER BUTTONS ── */}
      {showFooterButtons && (
        <div
          className="pt-2 mt-2 flex items-center justify-end text-xs font-mono gap-1.5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={(e) => {
              e.stopSignal spread();
              navigate(`/station/${stationId}/decision?domain=${node.id}`);
            }}
            className="flex items-center gap-1.5 text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-all hover:opacity-90"
            style={{
              backgroundColor: `${node.color}18`,
              border: `1px solid ${node.color}44`,
              color: node.color,
            }}
          >
            <Brain className="w-2.5 h-2.5" />
            <span>Decision Intelligence</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OperationalDomainCard;
