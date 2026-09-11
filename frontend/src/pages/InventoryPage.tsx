import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { telemetryApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Archive, Package, CheckCircle2, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, RefreshCw, Layers, Activity, Wrench,
  Shield, Search, Filter, AlertOctagon, TrendingDown,
  Box, Tag, Play, X, Sparkles, Flame, Droplets,
  HeartPulse, Microscope, Cpu, AlertCircle, Brain
} from 'lucide-react';

// ── Stock Level Hexagon Grid ─────────────────────────────────────────────────
const StockHexGrid: React.FC<{
  items: { label: string; pct: number; color: string; status: string }[];
}> = ({ items }) => {
  const hexW = 80, hexH = 70;
  const cols = Math.min(4, items.length);

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {items.map((item, i) => {
        const clamp = Math.max(0, Math.min(100, item.pct));
        const fillColor = clamp < 15 ? '#ef4444' : clamp < 30 ? '#f59e0b' : item.color;
        const pts = hexPoints(hexW / 2, hexH / 2, Math.min(hexW, hexH) / 2 - 4);
        const fillPts = hexPoints(hexW / 2, hexH / 2, (Math.min(hexW, hexH) / 2 - 4) * (clamp / 100));

        return (
          <div key={i} className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="relative" style={{ width: hexW, height: hexH }}>
              <svg width={hexW} height={hexH} viewBox={`0 0 ${hexW} ${hexH}`}>
                {/* Background hex */}
                <polygon points={pts} fill="rgba(10,15,30,0.8)" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
                {/* Fill hex (scaled from center) */}
                <polygon points={fillPts} fill={`${fillColor}33`} stroke={fillColor} strokeWidth={1.5}
                  style={{ filter: `drop-shadow(0 0 4px ${fillColor}88)` }} />
                {/* Percentage */}
                <text x={hexW / 2} y={hexH / 2 + 4} textAnchor="middle"
                  fill="white" fontSize="13" fontWeight="900" fontFamily="monospace">{clamp.toFixed(0)}%</text>
              </svg>
              {/* Status dot */}
              {item.status === 'CRITICAL' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-polar-dark animate-pulse" />
              )}
              {item.status === 'LOW' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border border-polar-dark" />
              )}
            </div>
            <div className="text-[9px] font-mono text-slate-400 text-center max-w-[88px] leading-tight group-hover:text-slate-200 transition-colors">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
};

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

// ── Inventory Treemap EChart ─────────────────────────────────────────────────
const InventoryTreemap: React.FC<{ categories: any[] }> = ({ categories }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: any) => `<b>${p.data.name}</b><br/>${p.data.value} items · ${p.data.pct?.toFixed(0) || 0}% stocked`,
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
      },
      series: [{
        type: 'treemap',
        data: categories.map(c => ({
          name: c.name,
          value: c.total_items,
          pct: c.stocked_pct,
          itemStyle: {
            color: c.stocked_pct < 20 ? '#ef444433' : c.stocked_pct < 40 ? '#f59e0b33' : `${c.color}33`,
            borderColor: c.stocked_pct < 20 ? '#ef4444' : c.stocked_pct < 40 ? '#f59e0b' : c.color,
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: `{b}\n{c} items`,
            color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace',
          },
        })),
        width: '100%', height: '100%',
        roam: false, breadcrumb: { show: false },
        nodeClick: false,
      }],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [categories]);

  return <div ref={ref} className="w-full h-64" />;
};

// ── Stock Level Bar Chart ────────────────────────────────────────────────────
const StockBarsChart: React.FC<{ items: any[] }> = ({ items }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const sorted = [...items].sort((a, b) => a.stock_pct - b.stock_pct).slice(0, 12);

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 10, bottom: 10, left: 140, right: 40 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (p: any) => `${p[0].name}: <b>${p[0].value.toFixed(1)}%</b>`,
      },
      xAxis: {
        type: 'value', max: 100,
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace', formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      yAxis: {
        type: 'category', data: sorted.map(i => i.name),
        axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar', barMaxWidth: 18,
        data: sorted.map(i => ({
          value: i.stock_pct,
          itemStyle: {
            color: i.stock_pct < 15 ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#ef444488' }, { offset: 1, color: '#ef4444' }])
              : i.stock_pct < 30 ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#f59e0b88' }, { offset: 1, color: '#f59e0b' }])
                : new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#10b98188' }, { offset: 1, color: '#10b981' }]),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        markLine: {
          silent: true,
          data: [{ xAxis: 20, lineStyle: { color: '#ef444466', type: 'dashed', width: 1 }, label: { formatter: 'Critical', color: '#ef4444', fontSize: 8, fontFamily: 'monospace' } }],
        },
      }],
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [items]);

  return <div ref={ref} className="w-full h-72" />;
};

// ── Category Icon Map ────────────────────────────────────────────────────────
const categoryIcon = (cat: string) => {
  const map: Record<string, React.ReactElement> = {
    'Energy': <Flame className="w-4 h-4" />,
    'Medical': <HeartPulse className="w-4 h-4" />,
    'Mechanical': <Wrench className="w-4 h-4" />,
    'Electronics': <Cpu className="w-4 h-4" />,
    'Science': <Microscope className="w-4 h-4" />,
    'Food': <Box className="w-4 h-4" />,
    'Safety': <Shield className="w-4 h-4" />,
    'Water': <Droplets className="w-4 h-4" />,
  };
  return map[cat] || <Package className="w-4 h-4" />;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const InventoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [localInventory, setLocalInventory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'critical' | 'whatif'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [scenarioType, setScenarioType] = useState('stockout');

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await telemetryApi.getInventory(stationId);
        if (mounted && data) setLocalInventory(data);
      } catch {} finally { if (mounted) setIsLoading(false); }
    };
    load();
    setWhatIfResult(null);
    return () => { mounted = false; };
  }, [stationId]);

  const snapshot = liveSnapshot[stationId];
  const inv = snapshot?.inventory || localInventory;

  const totalItems = inv?.total_items ?? (isMaitri ? 3840 : 4620);
  const criticalLow = inv?.critical_low_items ?? (isMaitri ? 12 : 8);
  const stockedPct = inv?.overall_stocked_pct ?? (isMaitri ? 78.4 : 82.1);
  const pendingReorder = inv?.pending_reorder ?? (isMaitri ? 34 : 28);
  const readinessScore = inv?.readiness_score ?? (isMaitri ? 87.2 : 91.4);

  // Inventory categories
  const categories = useMemo(() => inv?.categories || [
    { name: 'Energy & Thermal', total_items: isMaitri ? 320 : 410, stocked_pct: isMaitri ? 82 : 85, color: '#f59e0b', icon: 'Energy' },
    { name: 'Mechanical Spares', total_items: isMaitri ? 880 : 1050, stocked_pct: isMaitri ? 74 : 80, color: '#06b6d4', icon: 'Mechanical' },
    { name: 'Electronics & IT', total_items: isMaitri ? 560 : 680, stocked_pct: isMaitri ? 72 : 78, color: '#818cf8', icon: 'Electronics' },
    { name: 'Science Equipment', total_items: isMaitri ? 420 : 520, stocked_pct: isMaitri ? 91 : 93, color: '#10b981', icon: 'Science' },
    { name: 'Medical Supplies', total_items: isMaitri ? 310 : 360, stocked_pct: isMaitri ? 88 : 92, color: '#f43f5e', icon: 'Medical' },
    { name: 'Food & Sustenance', total_items: isMaitri ? 680 : 820, stocked_pct: isMaitri ? 76 : 79, color: '#a78bfa', icon: 'Food' },
    { name: 'Safety & PPE', total_items: isMaitri ? 280 : 340, stocked_pct: isMaitri ? 94 : 96, color: '#22c55e', icon: 'Safety' },
    { name: 'Water Consumables', total_items: isMaitri ? 390 : 440, stocked_pct: isMaitri ? 68 : 73, color: '#38bdf8', icon: 'Water' },
  ], [inv, isMaitri]);

  // Individual item list
  const items = useMemo(() => inv?.items || [
    { id: 'i01', name: 'AGO Diesel Fuel Additives', category: 'Energy & Thermal', stock_pct: 82, qty: 164, unit: 'drums', status: 'ADEQUATE', days_remaining: 90 },
    { id: 'i02', name: 'Generator Injector Kits', category: 'Mechanical Spares', stock_pct: 24, qty: 6, unit: 'sets', status: 'LOW', days_remaining: 28 },
    { id: 'i03', name: 'Trace Heating Cable (20m)', category: 'Water Consumables', stock_pct: 18, qty: 4, unit: 'rolls', status: 'CRITICAL', days_remaining: 12 },
    { id: 'i04', name: 'UV Steriliser Lamps', category: 'Water Consumables', stock_pct: 55, qty: 11, unit: 'lamps', status: 'ADEQUATE', days_remaining: 60 },
    { id: 'i05', name: 'Fire Suppression Charges', category: 'Safety & PPE', stock_pct: 95, qty: 38, unit: 'units', status: 'FULL', days_remaining: 365 },
    { id: 'i06', name: 'Medical Oxygen Cylinders', category: 'Medical Supplies', stock_pct: 88, qty: 22, unit: 'cylinders', status: 'ADEQUATE', days_remaining: 120 },
    { id: 'i07', name: 'Network Switch (Managed)', category: 'Electronics & IT', stock_pct: 40, qty: 2, unit: 'units', status: 'LOW', days_remaining: 45 },
    { id: 'i08', name: 'Atmospheric Sensor Modules', category: 'Science Equipment', stock_pct: 92, qty: 46, unit: 'modules', status: 'FULL', days_remaining: 200 },
    { id: 'i09', name: 'LPG Cooking Gas Cylinders', category: 'Energy & Thermal', stock_pct: 62, qty: 31, unit: 'cylinders', status: 'ADEQUATE', days_remaining: 75 },
    { id: 'i10', name: 'Freeze-Dried Ration Packs', category: 'Food & Sustenance', stock_pct: 76, qty: 912, unit: 'packs', status: 'ADEQUATE', days_remaining: 182 },
    { id: 'i11', name: 'Diesel Transfer Pump Seals', category: 'Mechanical Spares', stock_pct: 12, qty: 3, unit: 'kits', status: 'CRITICAL', days_remaining: 8 },
    { id: 'i12', name: 'Emergency Beacon (EPIRB)', category: 'Safety & PPE', stock_pct: 100, qty: 4, unit: 'units', status: 'FULL', days_remaining: 730 },
  ], [inv]);

  const hexItems = categories.map((c: any) => ({
    label: c.name.split(' ')[0] + (c.name.split(' ').length > 1 ? ' ' + c.name.split(' ')[1].slice(0, 4) : ''),
    pct: c.stocked_pct,
    color: c.color,
    status: c.stocked_pct < 20 ? 'CRITICAL' : c.stocked_pct < 30 ? 'LOW' : 'OK',
  }));

  const criticalItems = items.filter((i: any) => i.status === 'CRITICAL' || i.status === 'LOW');

  const filteredItems = items.filter((i: any) => {
    const matchSearch = searchQuery === '' || i.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'all' || i.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleWhatIf = async () => {
    setWhatIfLoading(true);
    try {
      const res = await scenariosApi.execute(stationId, { type: scenarioType, value: 2 });
      setWhatIfResult(res || {
        scenario_name: scenarioType === 'stockout' ? 'Critical Part Stockout Event' : 'Emergency Medical Supply Draw',
        impact: { items_affected: scenarioType === 'stockout' ? 8 : 3, readiness_delta: -12, procurement_lead_days: 45 },
        recommended_action: scenarioType === 'stockout'
          ? 'Initiate emergency procurement via air cargo. Cannibalize non-critical equipment spares. Notify logistics chain for priority resupply inclusion.'
          : 'Alert station medical officer. Request emergency medevac if required. Activate next-resupply medical priority flag.',
      });
    } catch { setWhatIfResult({ scenario_name: 'Error', recommended_action: 'Simulation unavailable.' }); }
    finally { setWhatIfLoading(false); }
  };

  const statusColor: Record<string, string> = {
    FULL: '#10b981', ADEQUATE: '#06b6d4', LOW: '#f59e0b', CRITICAL: '#ef4444',
  };
  const readinessColor = readinessScore > 90 ? '#10b981' : readinessScore > 75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 30%, #a78bfa 0%, transparent 60%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1.5">
                <Archive className="w-3 h-3" /> Inventory & Supply Chain Command
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name}
              </span>
              {criticalLow > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> {criticalLow} Critical-Low Items
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Archive className="w-8 h-8 text-violet-400" /> Inventory Command Digital Twin
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-2xl leading-relaxed">
              {totalItems.toLocaleString()} SKUs · {categories.length} categories · Station readiness: {readinessScore.toFixed(1)}%
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <Layers className="w-4 h-4 text-cyan-400" /> All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=inventory`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Brain className="w-4 h-4 text-purple-400" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/inventory' : '/station/maitri/inventory')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-violet-400/50 text-white flex items-center gap-2 transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" /> Switch Station
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Overall Stocked', val: `${stockedPct.toFixed(1)}%`, sub: `${totalItems.toLocaleString()} total SKUs`, color: stockedPct > 80 ? '#10b981' : '#f59e0b', icon: <Package className="w-4 h-4" /> },
            { label: 'Critical Low', val: criticalLow.toString(), sub: 'Items below 15% threshold', color: criticalLow > 5 ? '#ef4444' : criticalLow > 0 ? '#f59e0b' : '#10b981', icon: <AlertOctagon className="w-4 h-4" /> },
            { label: 'Readiness Score', val: `${readinessScore.toFixed(1)}%`, sub: `Operational preparedness`, color: readinessColor, icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'Pending Reorder', val: pendingReorder.toString(), sub: 'SKUs awaiting procurement', color: '#f59e0b', icon: <TrendingDown className="w-4 h-4" /> },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all">
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

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 flex-wrap">
        {(['overview', 'items', 'critical', 'whatif'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${activeTab === tab
              ? 'bg-violet-500/20 border-violet-500/60 text-violet-300'
              : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'}`}>
            {tab === 'overview' ? '🗂 Category Overview' : tab === 'items' ? '📋 Item Browser' : tab === 'critical' ? '🚨 Critical Stock' : '🧪 What-If Sim'}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Hex grid */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold mb-5">
              Stock Level by Category — Hex Grid
            </div>
            <StockHexGrid items={hexItems} />
            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-polar-border/40 text-[9px] font-mono">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />≥50% OK</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />15–30% LOW</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />&lt;15% CRITICAL</div>
            </div>
          </div>

          {/* Treemap */}
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
              Inventory Volume Distribution — Treemap
            </div>
            <InventoryTreemap categories={categories} />
            {/* Category summary */}
            <div className="mt-3 space-y-2">
              {categories.slice(0, 4).map((c: any) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <div className="text-[10px] font-mono text-slate-400 flex-1">{c.name}</div>
                  <div className="h-1.5 w-24 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40 shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${c.stocked_pct}%`, background: c.color }} />
                  </div>
                  <div className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: c.color }}>{c.stocked_pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Items Browser Tab ── */}
      {activeTab === 'items' && (
        <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search inventory items..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-polar-dark border border-polar-border text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-400/50 transition-colors"
              />
            </div>
            <select
              value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-xl bg-polar-dark border border-polar-border text-sm font-mono text-slate-300 focus:outline-none focus:border-violet-400/50 cursor-pointer">
              <option value="all">All Categories</option>
              {categories.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Stock bars chart */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
              Lowest Stock Items (sorted by % remaining)
            </div>
            <StockBarsChart items={filteredItems} />
          </div>

          {/* Item table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-polar-border">
                  {['Item Name', 'Category', 'Stock %', 'Qty', 'Days Remaining', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] uppercase text-slate-500 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => {
                  const sc = statusColor[item.status] || '#64748b';
                  return (
                    <tr key={item.id} className="border-b border-polar-border/20 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-4 text-white font-medium">{item.name}</td>
                      <td className="py-2 pr-4 text-slate-500">{item.category}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                            <div className="h-full rounded-full" style={{ width: `${item.stock_pct}%`, background: sc }} />
                          </div>
                          <span style={{ color: sc }}>{item.stock_pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-slate-300">{item.qty} {item.unit}</td>
                      <td className="py-2 pr-4 text-slate-300">{item.days_remaining}d</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold border"
                          style={{ borderColor: `${sc}44`, background: `${sc}11`, color: sc }}>{item.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Critical Stock Tab ── */}
      {activeTab === 'critical' && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold glass-panel px-4 py-3 rounded-2xl border border-rose-500/30 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" /> {criticalItems.length} Items Requiring Immediate Attention
          </div>
          {criticalItems.map((item: any) => {
            const sc = statusColor[item.status] || '#64748b';
            return (
              <div key={item.id} className="glass-panel p-5 rounded-2xl border shadow-xl"
                style={{ borderColor: `${sc}33` }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                      style={{ borderColor: `${sc}44`, background: `${sc}11`, color: sc }}>
                      {categoryIcon(item.category.split(' ')[0])}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.category}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded border font-bold shrink-0"
                    style={{ borderColor: `${sc}44`, background: `${sc}11`, color: sc }}>
                    {item.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 rounded-lg bg-polar-dark/60 border border-polar-border">
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Stock Level</div>
                    <div className="text-base font-black font-mono" style={{ color: sc }}>{item.stock_pct}%</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-polar-dark/60 border border-polar-border">
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Quantity</div>
                    <div className="text-base font-black font-mono text-white">{item.qty} {item.unit}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-polar-dark/60 border border-polar-border">
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Days Left</div>
                    <div className="text-base font-black font-mono" style={{ color: sc }}>{item.days_remaining}d</div>
                  </div>
                </div>
                <div className="h-2.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${item.stock_pct}%`, background: `linear-gradient(to right, ${sc}88, ${sc})`, boxShadow: `0 0 8px ${sc}44` }} />
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-2">
                  ⚡ Action: Include in next resupply manifest · Notify logistics chain
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── What-If Tab ── */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Inventory Disruption Simulator
            </div>
            <div className="space-y-3">
              {[
                { key: 'stockout', label: '📦 Critical Part Stockout', desc: 'Key spare runs to zero before resupply' },
                { key: 'medical_draw', label: '💊 Emergency Medical Draw', desc: 'Medical emergency requiring full supply depletion' },
                { key: 'delayed_resupply', label: '🚛 Resupply Delayed 45+ Days', desc: 'All categories enter depletion mode' },
              ].map(s => (
                <div key={s.key} onClick={() => setScenarioType(s.key)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${scenarioType === s.key
                    ? 'bg-violet-500/10 border-violet-500/50 text-violet-300'
                    : 'bg-polar-dark/50 border-polar-border text-slate-400 hover:border-white/20'}`}>
                  <div className="text-xs font-mono font-bold">{s.label}</div>
                  <div className="text-[10px] font-mono mt-0.5 opacity-70">{s.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={handleWhatIf} disabled={whatIfLoading}
              className="w-full py-3 rounded-xl text-sm font-mono font-bold bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50">
              {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {whatIfLoading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">Simulation Output</div>
            {!whatIfResult ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm font-mono text-center gap-3">
                <Archive className="w-10 h-10 opacity-20" />
                <p>Select a scenario and run simulation to see inventory impact analysis.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/40">
                  <div className="text-xs font-mono font-bold text-violet-300">{whatIfResult.scenario_name}</div>
                </div>
                {whatIfResult.impact && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-[9px] font-mono text-slate-400">Items Affected</div>
                      <div className="text-lg font-black font-mono text-rose-400 mt-1">{whatIfResult.impact.items_affected}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-[9px] font-mono text-slate-400">Readiness Drop</div>
                      <div className="text-lg font-black font-mono text-amber-400 mt-1">{whatIfResult.impact.readiness_delta}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-center">
                      <div className="text-[9px] font-mono text-slate-400">Procurement Lead</div>
                      <div className="text-lg font-black font-mono text-cyan-400 mt-1">{whatIfResult.impact.procurement_lead_days}d</div>
                    </div>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-2 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Recommended Action
                  </div>
                  <p className="text-xs font-mono text-slate-300 leading-relaxed">{whatIfResult.recommended_action}</p>
                </div>
                <button onClick={() => setWhatIfResult(null)}
                  className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <X className="w-3.5 h-3.5" /> Clear Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
