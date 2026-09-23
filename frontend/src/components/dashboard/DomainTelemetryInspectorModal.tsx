import React, { useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import {
  X, TrendingUp, ExternalLink, Brain, Activity, ArrowUpRight, ArrowDownRight,
  Zap, CloudSnow, Fuel, Droplet, Wrench, Truck, Users, Radio, Archive, Building2,
  LucideIcon
} from 'lucide-react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { extractLiveDomainData } from '../../utils/domainDataHelper';

export interface DomainConfig {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  route: string;
  color: string;
  accentRgb: string;
  shortDesc: string;
  upstream: string[];
  downstream: string[];
}

export const ALL_INSPECTOR_DOMAINS: DomainConfig[] = [
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    category: 'infrastructure',
    icon: Building2,
    route: 'infrastructure',
    color: '#06b6d4',
    accentRgb: '6, 182, 212',
    shortDesc: 'Structural Envelope, Foundation Anchoring & Polar downslope wind Wind Stress',
    upstream: ['environment', 'logistics'],
    downstream: ['equipment', 'personnel']
  },
  {
    id: 'energy_fuel',
    name: 'Energy & Fuel',
    category: 'energy',
    icon: Zap,
    route: 'energy',
    color: '#f59e0b',
    accentRgb: '245, 158, 11',
    shortDesc: 'Diesel Generation, Solar PV Power grid & Antarctic Diesel Fuel Farm',
    upstream: ['environment', 'equipment', 'logistics'],
    downstream: ['water', 'equipment', 'communication']
  },
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    category: 'logistics',
    icon: Truck,
    route: 'logistics',
    color: '#f97316',
    accentRgb: '249, 115, 22',
    shortDesc: 'Overland Traverse Supply runs, Cargo Resupply & Vessel ETA',
    upstream: ['environment'],
    downstream: ['energy_fuel', 'infrastructure']
  },
  {
    id: 'environment',
    name: 'Environment & Weather',
    category: 'environment',
    icon: CloudSnow,
    route: 'environment',
    color: '#00e5ff',
    accentRgb: '0, 229, 255',
    shortDesc: 'Polar Atmosphere, Polar downslope wind Wind Chill & Storm Severity',
    upstream: [],
    downstream: ['infrastructure', 'energy_fuel', 'water', 'logistics', 'communication']
  },
  {
    id: 'communication',
    name: 'Communication',
    category: 'comms',
    icon: Radio,
    route: 'communication',
    color: '#3b82f6',
    accentRgb: '59, 130, 246',
    shortDesc: 'LEO Polar Satellite Tracking, Data speed QoS & Telemetry Sync',
    upstream: ['energy_fuel', 'environment'],
    downstream: []
  },
  {
    id: 'water',
    name: 'Water',
    category: 'water',
    icon: Droplet,
    route: 'water',
    color: '#38bdf8',
    accentRgb: '56, 189, 248',
    shortDesc: 'Glacial Melt / Seawater RO Seawater purification & Pipe Trace Heating',
    upstream: ['environment', 'energy_fuel'],
    downstream: ['personnel', 'equipment']
  },
  {
    id: 'personnel',
    name: 'Personnel Safety & Emergency',
    category: 'personnel',
    icon: Users,
    route: 'personnel',
    color: '#a855f7',
    accentRgb: '168, 85, 247',
    shortDesc: 'Crew Headcount, Circadian Diurnal Demand & Life Support',
    upstream: ['water', 'energy_fuel', 'infrastructure'],
    downstream: ['equipment']
  },
  {
    id: 'equipment',
    name: 'Equipment & Machinery',
    category: 'equipment',
    icon: Wrench,
    route: 'equipment',
    color: '#10b981',
    accentRgb: '16, 185, 129',
    shortDesc: 'Mechanical Asset Health, Vibration Spectrum & Maintenance',
    upstream: ['infrastructure', 'personnel'],
    downstream: ['energy_fuel', 'water']
  }
];

export interface DomainTelemetryInspectorModalProps {
  domainId: string | null;
  stationId: string;
  onClose: () => void;
  domainData?: any;
  onSelectDomain?: (domainId: string) => void;
}

export const DomainTelemetryInspectorModal: React.FC<DomainTelemetryInspectorModalProps> = ({
  domainId,
  stationId,
  onClose,
  domainData,
  onSelectDomain
}) => {
  const navigate = useNavigate();
  const { liveSnapshot } = useTelemetryStore();
  const isMaitri = stationId !== 'bharati';

  // Normalize domain ID (e.g. 'energy' or 'fuel' -> 'energy_fuel')
  const normalizedId = useMemo(() => {
    if (!domainId) return null;
    if (domainId === 'energy' || domainId === 'fuel') return 'energy_fuel';
    if (domainId === 'storage') return 'infrastructure';
    return domainId;
  }, [domainId]);

  const activeDomainConfig = useMemo(() => {
    if (!normalizedId) return null;
    return ALL_INSPECTOR_DOMAINS.find((d) => d.id === normalizedId) || null;
  }, [normalizedId]);

  // Telemetry data source
  const currentTelemetry = useMemo(() => {
    if (!activeDomainConfig) return null;
    if (domainData && domainData[activeDomainConfig.id]) {
      return domainData[activeDomainConfig.id];
    }
    const snap = liveSnapshot[stationId];
    const liveDict = extractLiveDomainData(stationId, snap);
    return (liveDict as any)[activeDomainConfig.id] || (liveDict as any).main_station;
  }, [activeDomainConfig, domainData, liveSnapshot, stationId]);

  // Chart ref
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!activeDomainConfig || !chartRef.current || !currentTelemetry) return;

    if (chartInst.current) chartInst.current.dispose();
    const chart = echarts.init(chartRef.current, 'dark');
    chartInst.current = chart;

    const dataPoints = currentTelemetry.trend || [80, 82, 85, 84, 88, 86];
    const timeLabels = ['04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 40, right: 20, top: 20, bottom: 25 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [
        {
          name: activeDomainConfig.name,
          type: 'line',
          data: dataPoints,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: activeDomainConfig.color, width: 3 },
          itemStyle: { color: activeDomainConfig.color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${activeDomainConfig.color}55` },
              { offset: 1, color: `${activeDomainConfig.color}05` }
            ])
          }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [activeDomainConfig, currentTelemetry]);

  if (!domainId || !activeDomainConfig) return null;

  const Icon = activeDomainConfig.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl p-6 relative max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl border flex-shrink-0"
              style={{
                background: `rgba(${activeDomainConfig.accentRgb}, 0.12)`,
                borderColor: activeDomainConfig.color,
                color: activeDomainConfig.color
              }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                  style={{
                    background: `rgba(${activeDomainConfig.accentRgb}, 0.12)`,
                    borderColor: activeDomainConfig.color,
                    color: activeDomainConfig.color
                  }}
                >
                  LIVE DOMAIN STUDIO
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {isMaitri ? 'Maitri Station (Inland)' : 'Bharati Station (Coastal)'}
                </span>
              </div>
              <h3 className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {activeDomainConfig.name} Operational Telemetry
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            title="Close Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-6 mt-6">
          {/* Telemetry Curve & Key KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: 24-Hour Telemetry Curve */}
            <div className="lg:col-span-2 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  24-Hour Trend Telemetry Curve
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded border"
                  style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}
                >
                  Real-Time Physics Engine
                </span>
              </div>
              <div ref={chartRef} style={{ height: 210, width: '100%' }} />
            </div>

            {/* Right: Quick KPI Card */}
            <div className="p-4 rounded-2xl flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div>
                <div className="text-[10px] font-mono uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                  Primary Operational State
                </div>
                <div className="text-3xl font-black font-mono" style={{ color: 'var(--text-primary)' }}>
                  {currentTelemetry?.primaryKpi ?? 'Nominal'}
                </div>
                <div className="text-xs font-mono mt-1" style={{ color: activeDomainConfig.color }}>
                  {currentTelemetry?.primaryLabel ?? 'Operational'}
                </div>

                <div className="mt-4 pt-3 space-y-2 text-xs font-mono" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Readiness Score:</span>
                    <span className="font-bold" style={{ color: '#16a34a' }}>{currentTelemetry?.score ?? 95}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span className="font-bold truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>
                      {currentTelemetry?.status ?? 'Operational'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Domain page + Decision Intelligence buttons */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => { onClose(); navigate(`/station/${stationId}/${activeDomainConfig.route}`); }}
                  className="w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}
                >
                  <span>Launch Full Domain Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { onClose(); navigate(`/station/${stationId}/decision?domain=${activeDomainConfig.id}`); }}
                  className="w-full py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed' }}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Decision Intelligence</span>
                </button>
              </div>
            </div>
          </div>

          {/* Visual Causal Coupling Conduits */}
          <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Activity className="w-4 h-4" style={{ color: '#d97706' }} />
                Cross-Domain Causal Dependency Conduits
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                Causal Drivers &amp; Downstream Consumers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upstream Drivers */}
              <div className="p-3.5 rounded-xl" style={{ backgroundColor: '#f0fdfa', border: '1px solid #5eead4' }}>
                <div className="text-[10px] font-mono uppercase font-bold mb-2 flex items-center gap-1.5" style={{ color: '#0d9488' }}>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Upstream Feeder Domains (Drivers)
                </div>
                {activeDomainConfig.upstream.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeDomainConfig.upstream.map((upId) => {
                      const upCfg = ALL_INSPECTOR_DOMAINS.find((d) => d.id === upId);
                      return (
                        <button
                          key={upId}
                          onClick={() => onSelectDomain ? onSelectDomain(upId) : null}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                          style={{ backgroundColor: '#ccfbf1', border: '1px solid #5eead4', color: '#0d9488' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#0d9488' }} />
                          {upCfg?.name || upId}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    Root External Driver (No upstream station dependencies)
                  </span>
                )}
              </div>

              {/* Downstream Consumers */}
              <div className="p-3.5 rounded-xl" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                <div className="text-[10px] font-mono uppercase font-bold mb-2 flex items-center gap-1.5" style={{ color: '#d97706' }}>
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Downstream Dependent Domains (Impacted)
                </div>
                {activeDomainConfig.downstream.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeDomainConfig.downstream.map((downId) => {
                      const downCfg = ALL_INSPECTOR_DOMAINS.find((d) => d.id === downId);
                      return (
                        <button
                          key={downId}
                          onClick={() => onSelectDomain ? onSelectDomain(downId) : null}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                          style={{ backgroundColor: '#fef9c3', border: '1px solid #fde68a', color: '#d97706' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d97706' }} />
                          {downCfg?.name || downId}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    Terminal Telemetry Sink (Feeds Mission Control Oversight)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Station Architecture Blueprint */}
          <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <span className="text-[10px] font-mono uppercase font-bold" style={{ color: 'var(--text-muted)' }}>
              Antarctic Architectural Implementation • {isMaitri ? 'Maitri Inland Base' : 'Bharati Coastal Base'}
            </span>
            <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {currentTelemetry?.architecture ||
                (isMaitri
                  ? 'Schirmacher Oasis Bedrock Plateau • Polar downslope wind Drafts'
                  : 'Larsemann Hills Coastal Ridge • Marine Gale Squalls')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainTelemetryInspectorModal;
