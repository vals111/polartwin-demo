import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useLive dataStore } from '../store/live dataStore';
import { resourcesApi } from '../api/client';
import {
  Users, Heart, Moon, Sun, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Activity, CheckCircle2, UserCheck, Coffee, Zap, Droplet,
  Utensils, Trash2, Microscope, Wrench, Package, MapPin,
  ChevronRight, ChevronDown, Wind, Thermometer, Radio,
  TrendingUp, BarChart2, X, Info, AlertOctagon,
  FlaskConical, Shield, Truck, Play, ArrowUpRight,
  ArrowDownRight, Minus, Eye, Brain
} from 'lucide-react';
import * as echarts from 'echarts';

// ── Color helpers ─────────────────────────────────────────────────────────────
const roleColor: Record<string, string> = {
  pink: 'text-pink-400 bg-pink-500/15 border-pink-500/30',
  cyan: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  emerald: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  amber: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
};
const roleBorderColor: Record<string, string> = {
  pink: 'border-pink-500/40 hover:border-pink-400/70',
  cyan: 'border-cyan-500/40 hover:border-cyan-400/70',
  emerald: 'border-emerald-500/40 hover:border-emerald-400/70',
  amber: 'border-amber-500/40 hover:border-amber-400/70',
};
const activityBadge: Record<string, string> = {
  HIGH: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  PEAK: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  NORMAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  STANDBY: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  EMERGENCY: 'bg-red-500/20 text-red-300 border-red-500/40',
};
const riskColor: Record<string, string> = {
  LOW: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-400',
};
const exposureColor: Record<string, string> = {
  Low: 'text-emerald-400',
  Moderate: 'text-amber-400',
  High: 'text-orange-400',
  CRITICAL: 'text-red-400',
};
const coverageColor = (pct: number) =>
  pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400';
const coverageBg = (pct: number) =>
  pct >= 90 ? 'bg-emerald-500/20 border-emerald-500/30' : pct >= 70 ? 'bg-amber-500/20 border-amber-500/30' : 'bg-red-500/20 border-red-500/30';

const diurnalBlockColor: Record<string, string> = {
  indigo: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
  blue: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  amber: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  cyan: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
  teal: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
  orange: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  slate: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
};

// ── KPI Detail Modal ──────────────────────────────────────────────────────────
const KpiModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div
      className="relative z-10 glass-panel rounded-2xl border border-polar-border w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopSignal spread()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      {children}
    </div>
  </div>
);

// ── Role Group Intelligence Drawer ────────────────────────────────────────────
const RoleDrawer: React.FC<{ group: any; onClose: () => void }> = ({ group, onClose }) => {
  const color = roleColor[group.color] || roleColor.cyan;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 glass-panel rounded-2xl border border-polar-border w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopSignal spread()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${color}`}>{group.role}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${activityBadge[group.activity_level] ?? activityBadge.NORMAL}`}>
              {group.activity_level}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', value: group.count, unit: 'personnel' },
            { label: 'On Station', value: group.on_station, unit: 'inside' },
            { label: 'Field', value: group.field_deployed, unit: 'deployed' },
            { label: 'Rest / Maint.', value: group.in_rest + group.on_maintenance, unit: 'off-duty' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
              <div className="text-lg font-black text-white">{item.value}</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">{item.label}</div>
              <div className="text-[10px] font-mono text-slate-500">{item.unit}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border mb-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Current Activity</div>
          <div className="text-xs font-mono text-slate-200">{group.current_activity_desc}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Energy Draw', value: `${group.energy_contribution_kw} kW`, icon: Zap, color: 'text-yellow-400' },
            { label: 'Water Draw', value: `${group.water_contribution_l_day} L/day`, icon: Droplet, color: 'text-cyan-400' },
            { label: 'Food Demand', value: `${(group.food_demand_kcal_day / 1000).toFixed(1)} Mcal`, icon: Utensils, color: 'text-amber-400' },
            { label: 'Waste Gen.', value: `${group.waste_contribution_kg_day} kg/day`, icon: Trash2, color: 'text-slate-400' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
              <item.icon className={`w-3.5 h-3.5 ${item.color} mb-1`} />
              <div className="text-sm font-bold text-white">{item.value}</div>
              <div className="text-[10px] font-mono text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        {group.specializations?.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">Specializations</div>
            <div className="flex flex-wrap gap-1.5">
              {group.specializations.map((s: string) => (
                <span key={s} className="px-2 py-0.5 rounded bg-polar-navy/60 border border-polar-border text-[10px] font-mono text-slate-300">{s}</span>
              ))}
            </div>
          </div>
        )}

        {group.equipment_dependency?.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">Equipment Dependencies</div>
            <div className="flex flex-wrap gap-1.5">
              {group.equipment_dependency.map((eq: string) => (
                <span key={eq} className="px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">{eq}</span>
              ))}
            </div>
          </div>
        )}

        {group.active_projects !== undefined && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
              <div className="text-xs font-mono text-slate-400">Active Projects</div>
              <div className="text-lg font-black text-pink-400">{group.active_projects}</div>
            </div>
            <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
              <div className="text-xs font-mono text-slate-400">Research Readiness</div>
              <div className="text-lg font-black text-emerald-400">{group.research_readiness_pct?.toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Diurnal ECharts Bar Chart ─────────────────────────────────────────────────
const DiurnalChart: React.FC<{ schedule: any[]; currentHour: number; energyKw: number }> = ({ schedule, currentHour, energyKw }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !schedule?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const labels = schedule.map(b => b.label.split(' ').slice(0, 2).join(' '));
    const vals = schedule.map(b => +(energyKw * b.demand_mult).toFixed(1));
    const colors = schedule.map(b => {
      const isActive = currentHour >= b.hour_start && currentHour < b.hour_end;
      return isActive ? '#06b6d4' : 'rgba(100,116,139,0.5)';
    });

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      grid: { top: 12, bottom: 42, left: 52, right: 16 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: any) => {
          const i = params[0]?.dataIndex;
          const b = schedule[i];
          return `<b style="color:#06b6d4">${b?.label}</b><br/>${b?.hour_start}:00–${b?.hour_end}:00<br/>Demand ×${b?.demand_mult}<br/>Load: ${params[0]?.value} kW`;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace', interval: 0, rotate: 25 },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      },
      yAxis: {
        type: 'value',
        name: 'kW',
        nameTextStyle: { color: '#64748b', fontSize: 9 },
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
      },
      series: [{
        type: 'bar',
        data: vals.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [3, 3, 0, 0] } })),
        barMaxWidth: 32,
      }],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [schedule, currentHour, energyKw]);

  return <div ref={ref} style={{ height: 180, width: '100%' }} />;
};

// ── Causal Chain Node ─────────────────────────────────────────────────────────
const CausalNode: React.FC<{
  label: string;
  value?: string;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}> = ({ label, value, color = 'cyan', onClick, active }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-xl border text-xs font-mono text-center transition-all ${
      active
        ? `bg-${color}-500/30 border-${color}-400/80 text-${color}-200 shadow-lg`
        : `bg-polar-dark/60 border-polar-border hover:border-${color}-500/50 text-slate-300`
    }`}
  >
    <div className="font-bold text-white text-[11px]">{label}</div>
    {value && <div className={`text-[10px] text-${color}-300 mt-0.5`}>{value}</div>}
  </button>
);

const Arrow: React.FC = () => (
  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export const PersonnelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const station = stations.find(s => s.station_id === stationId) ?? {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  // ── Data state ─────────────────────────────────────────────────────────────
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [selectedCausal, setSelectedCausal] = useState<string | null>(null);
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);

  // What-If state
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any | null>(null);
  const [whatIfScenario, setWhatIfScenario] = useState<string | null>(null);

  const { liveSnapshot } = useLive dataStore();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await resourcesApi.getPersonnel(stationId);
      setData(res.personnel);
      setError(null);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        localStorage.removeItem('polartwin_token');
        try {
          const retryRes = await resourcesApi.getPersonnel(stationId);
          setData(retryRes.personnel);
          setError(null);
          return;
        } catch {
          // fall through to snapshot fallback
        }
      }
      const snapPers = liveSnapshot[stationId]?.personnel;
      if (snapPers && (snapPers as any).role_groups) {
        setData(snapPers);
        setError(null);
      } else {
        setError(e?.message ?? 'Failed to load personnel data');
      }
    } finally {
      setLoading(false);
    }
  }, [stationId, liveSnapshot]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setWhatIfResult(null);
    setWhatIfScenario(null);
    fetchData();
  }, [stationId]);

  useEffect(() => {
    const t = setInterval(fetchData, 15000);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── What-If execution ──────────────────────────────────────────────────────
  const runWhatIf = async (scenarioType: string, params: Record<string, any> = {}) => {
    setWhatIfLoading(true);
    setWhatIfScenario(scenarioType);
    setWhatIfResult(null);
    try {
      const res = await resourcesApi.personnelWhatIf(stationId, scenarioType, params);
      setWhatIfResult(res);
    } catch {
      setWhatIfResult(null);
    } finally {
      setWhatIfLoading(false);
    }
  };

  // ── Convenience aliases ────────────────────────────────────────────────────
  const pers = data;
  const rc = pers?.resource_demand_coupling ?? {};
  const dm = pers?.deployment_map ?? {};
  const wc = pers?.workforce_condition ?? {};
  const fe = pers?.field_exposure ?? {};
  const ls = pers?.life_support ?? {};
  const pr = pers?.personnel_risk ?? {};
  const ri = pers?.resupply_impact ?? {};

  const WHAT_IF_SCENARIOS = [
    {
      id: 'personnel_increase',
      label: 'Personnel Increase +12',
      desc: 'Summer expedition surge — additional crew arrives',
      icon: TrendingUp,
      color: 'cyan',
      params: { additional_people: 12 },
    },
    {
      id: 'research_increase',
      label: 'Research Activity Spike',
      desc: 'Full science campaign with all lab instruments active',
      icon: FlaskConical,
      color: 'pink',
      params: { extra_kw: 14.0 },
    },
    {
      id: 'field_deployment',
      label: 'Full Field Deployment (6 outside)',
      desc: 'Extended field team deployment — exposure and coverage tradeoff',
      icon: MapPin,
      color: 'amber',
      params: { extra_field_personnel: 6 },
    },
    {
      id: 'severe_weather',
      label: 'Severe Weather — Blizzard Protocol',
      desc: 'All exterior activity halted; field teams recalled; labs closed',
      icon: Wind,
      color: 'orange',
      params: {},
    },
  ];

  const CAUSAL_CHAINS = [
    {
      id: 'resource_chain',
      label: 'Resource Demand Chain',
      nodes: [
        { label: 'Personnel', value: `${pers?.headcount ?? '--'} crew`, color: 'purple' },
        { label: 'Activity Level', value: pers?.diurnal_block?.label ?? '--', color: 'cyan' },
        { label: 'Energy Demand', value: `${rc.energy_personnel_load_kw?.toFixed(1) ?? '--'} kW`, color: 'yellow' },
        { label: 'Water / Food', value: `${rc.water_demand_l_day?.toFixed(0) ?? '--'} L/day`, color: 'blue' },
        { label: 'Waste Generated', value: `${rc.waste_generation_kg_day?.toFixed(1) ?? '--'} kg/day`, color: 'slate' },
        { label: 'Station Risk', value: pr.level ?? '--', color: 'red' },
      ],
      explanation: `${pers?.headcount ?? '--'} crew at ${pers?.diurnal_block?.label ?? 'current'} activity level (×${pers?.diurnal_block?.demand_mult ?? '--'}) drives ${rc.energy_personnel_load_kw?.toFixed(1) ?? '--'} kW personnel-origin electrical demand. This cascades to water consumption (${rc.water_demand_l_day?.toFixed(0) ?? '--'} L/day), food requirement (${((rc.food_demand_kcal_day ?? 0) / 1000).toFixed(1)} Mcal/day), and ${rc.waste_generation_kg_day?.toFixed(1) ?? '--'} kg/day waste requiring processing. At elevated occupancy, station risk factor increases proportionally.`,
    },
    {
      id: 'research_chain',
      label: 'Research → Equipment → Energy',
      nodes: [
        { label: 'Scientists', value: `${pers?.role_groups?.[0]?.count ?? '--'}`, color: 'pink' },
        { label: 'Research Activity', value: `${pers?.role_groups?.[0]?.active_projects ?? '--'} projects`, color: 'fuchsia' },
        { label: 'Lab Equipment', value: `${pers?.role_groups?.[0]?.equipment_required ?? '--'} systems`, color: 'cyan' },
        { label: 'Energy Load', value: `${pers?.role_groups?.[0]?.energy_contribution_kw?.toFixed(1) ?? '--'} kW`, color: 'yellow' },
        { label: 'Fuel Burn ↑', value: 'Generator Load', color: 'orange' },
      ],
      explanation: `${pers?.role_groups?.[0]?.count ?? '--'} research scientists running ${pers?.role_groups?.[0]?.active_projects ?? '--'} active projects require ${pers?.role_groups?.[0]?.equipment_required ?? '--'} laboratory systems. Each active experiment draws additional power — collectively adding ${pers?.role_groups?.[0]?.energy_contribution_kw?.toFixed(1) ?? '--'} kW to the power grid load, directly increasing generator runtime and fuel consumption.`,
    },
    {
      id: 'environment_chain',
      label: 'Environment → Field Exposure → Research',
      nodes: [
        { label: 'Environment', value: fe.current_conditions_desc?.split('.')[0] ?? '--', color: 'blue' },
        { label: 'Field Exposure Risk', value: fe.exposure_risk ?? '--', color: 'amber' },
        { label: 'Field Deployment', value: `${fe.field_team_count ?? '--'} teams`, color: 'orange' },
        { label: 'Research Feasibility', value: fe.research_feasibility ?? '--', color: 'cyan' },
        { label: 'Mission Impact', value: fe.deployment_restriction === 'None' ? 'None' : 'RESTRICTED', color: 'red' },
      ],
      explanation: `Current weather (${fe.current_conditions_desc?.split('.')[0] ?? '--'}) sets the field exposure risk at ${fe.exposure_risk ?? '--'}. With ${fe.field_team_count ?? 0} team${fe.field_team_count !== 1 ? 's' : ''} deployed outside, maximum safe exposure is ${fe.max_safe_exposure_min ?? '--'} minutes. This determines research feasibility (currently ${fe.research_feasibility ?? '--'}). Under blizzard conditions, all exterior activity is prohibited and research is restricted to station-only operations.`,
    },
  ];

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-mono text-slate-400">Loading personnel twin state…</div>
        </div>
      </div>
    );
  }

  if (!pers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <div className="text-xs font-mono text-amber-300">{error ?? 'No personnel data available'}</div>
          <button
            onClick={() => {
              localStorage.removeItem('polartwin_token');
              fetchData();
            }}
            className="px-4 py-2 rounded-lg text-xs font-mono bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Socio-Technical Domain • Human Factors & Operational Impact
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {pers.station_name} • Expedition Day {pers.expedition_day}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Personnel, Occupancy &amp; Human Factors
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl">
              Lifecycle: Personnel → Role → Location → Activity → Occupancy → Resource Demand → Operational Impact → Safety/Risk. Personnel activity drives Energy, Water, Food, Waste, Equipment Coverage, and Research Operations.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all">
              <Layers className="w-4 h-4 text-cyan-400" />
              All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=personnel`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <Brain className="w-4 h-4 text-purple-400" />
              Decision Intel
            </button>
            <button
              onClick={() => navigate(isMaitri ? '/station/bharati/personnel' : '/station/maitri/personnel')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-purple-400/50 text-white flex items-center gap-2 transition-all">
              <RefreshCw className="w-4 h-4" />
              Switch to {isMaitri ? 'Bharati' : 'Maitri'}
            </button>
          </div>
        </div>

        {/* ── Top KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50">
          {/* Active Headcount */}
          <button
            onClick={() => setActiveModal('headcount')}
            className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-purple-400/50 text-left transition-all group relative overflow-hidden"
          >
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-purple-400" /> Active Headcount</span>
              <span className="text-purple-300 font-bold">{pers.occupancy_pct}%</span>
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {pers.headcount} <span className="text-slate-400 text-sm">/ {pers.bed_capacity}</span>
            </div>
            {/* Visual Headcount Track */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
              <div className="bg-emerald-400 h-full" style={{ width: `${(dm.station_interior / pers.headcount) * 100}%` }} title="Interior" />
              <div className="bg-amber-400 h-full" style={{ width: `${(dm.field_deployed / pers.headcount) * 100}%` }} title="Field" />
            </div>
            <div className="mt-2 flex justify-between text-[9px] font-mono text-slate-400">
              <span className="text-emerald-400 font-semibold">{dm.station_interior} Station</span>
              <span className="text-amber-400 font-semibold">{dm.field_deployed} Field</span>
            </div>
          </button>

          {/* Habitation Capacity */}
          <button
            onClick={() => setActiveModal('habitation')}
            className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-emerald-400/50 text-left transition-all group relative overflow-hidden"
          >
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-emerald-400" /> Berths Occupied</span>
              <span className="text-emerald-400 font-bold">{pers.zone_map?.length} Zones</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{pers.occupancy_pct}%</div>
            {/* Visual Bed Capacity Progress */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ width: `${pers.occupancy_pct}%` }}
              />
            </div>
            <div className="mt-2 text-[9px] font-mono text-slate-400">
              {pers.headcount} of {pers.bed_capacity} berths assigned
            </div>
          </button>

          {/* Workforce Condition */}
          <button
            onClick={() => setActiveModal('workforce')}
            className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-amber-400/50 text-left transition-all group relative overflow-hidden"
          >
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-amber-400" /> Workforce Coverage</span>
              <span className="text-emerald-400 font-bold">{wc.operational_coverage_pct}%</span>
            </div>
            <div className={`text-2xl font-black mt-1 font-mono ${wc.fatigue_alert_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {wc.fatigue_alert_count > 0 ? `${wc.fatigue_alert_count} Alert${wc.fatigue_alert_count > 1 ? 's' : ''}` : '100% Nominal'}
            </div>
            {/* Visual Fatigue Distribution Track */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
              <div className="bg-emerald-400 h-full" style={{ width: `${(wc.adequate_rest_count / pers.headcount) * 100}%` }} title="Rest Nominal" />
              <div className="bg-amber-400 h-full" style={{ width: `${(wc.watch_count / pers.headcount) * 100}%` }} title="Watch" />
              <div className="bg-red-400 h-full" style={{ width: `${(wc.fatigue_alert_count / pers.headcount) * 100}%` }} title="Fatigue Alert" />
            </div>
            <div className="mt-2 flex justify-between text-[9px] font-mono text-slate-400">
              <span className="text-emerald-400">{wc.adequate_rest_count} Rested</span>
              {wc.fatigue_alert_count > 0 && <span className="text-amber-400">{wc.fatigue_alert_count} Duty Relief</span>}
            </div>
          </button>

          {/* Resource Demand */}
          <button
            onClick={() => setActiveModal('resource_demand')}
            className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-cyan-400/50 text-left transition-all group relative overflow-hidden"
          >
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><BarChart2 className="w-3 h-3 text-cyan-400" /> Crew Energy Draw</span>
              <span className="text-cyan-300 font-bold">×{rc.diurnal_multiplier?.toFixed(2) ?? '1.0'} diurnal</span>
            </div>
            <div className="text-2xl font-black text-cyan-300 mt-1 font-mono">{rc.energy_personnel_load_kw?.toFixed(1)} kW</div>
            {/* Visual Demand Progress */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400"
                style={{ width: `${Math.min(100, (rc.energy_personnel_load_kw / 50) * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[9px] font-mono text-slate-400">
              <span className="text-blue-300">{rc.water_demand_l_day?.toFixed(0)} L/day</span>
              <span className="text-amber-300">{((rc.food_demand_kcal_day ?? 0) / 1000).toFixed(1)} Mcal/d</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── KPI Modals ──────────────────────────────────────────────────────── */}
      {activeModal === 'headcount' && (
        <KpiModal title="Active Headcount — Deployment Breakdown" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            {[
              { label: 'Station Interior', value: dm.station_interior, total: pers.headcount, color: 'text-emerald-400', desc: 'Inside station buildings and modules' },
              { label: 'Field Deployed', value: dm.field_deployed, total: pers.headcount, color: 'text-amber-400', desc: 'Outside: AWS sites, field camps, sampling' },
              { label: 'In Transit', value: dm.in_transit, total: pers.headcount, color: 'text-blue-400', desc: 'Vehicle transit between locations' },
              { label: 'Off-duty / Rest', value: dm.in_rest, total: pers.headcount, color: 'text-slate-400', desc: 'Scheduled rest and personal time' },
              { label: 'Emergency Standby', value: dm.emergency_standby, total: pers.headcount, color: 'text-red-400', desc: 'Emergency response readiness' },
            ].map(row => (
              <div key={row.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-mono text-slate-300">{row.label}</span>
                  <span className={`text-sm font-black ${row.color}`}>{row.value} <span className="text-slate-500 text-[10px]">personnel</span></span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className={`h-full rounded-full transition-all ${row.color.replace('text', 'bg')}`}
                    style={{ width: `${row.total > 0 ? (row.value / row.total) * 100 : 0}%` }} />
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">{row.desc}</div>
              </div>
            ))}
          </div>
        </KpiModal>
      )}

      {activeModal === 'habitation' && (
        <KpiModal title="Habitation Capacity — Zone Occupancy" onClose={() => setActiveModal(null)}>
          <div className="space-y-2.5">
            {pers.zone_map?.map((zone: any) => {
              const pct = Math.round((zone.current / zone.capacity) * 100);
              return (
                <div key={zone.zone} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-mono text-slate-200">{zone.zone}</span>
                    <span className="text-xs font-mono text-white">{zone.current} / {zone.capacity} <span className="text-slate-500">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">{zone.primary_use}</div>
                </div>
              );
            })}
          </div>
        </KpiModal>
      )}

      {activeModal === 'workforce' && (
        <KpiModal title="Workforce Condition — Aggregate State" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                <div className="text-lg font-black text-emerald-400">{wc.adequate_rest_count}</div>
                <div className="text-[10px] font-mono text-slate-400">Adequate Rest</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-center">
                <div className="text-lg font-black text-amber-400">{wc.watch_count}</div>
                <div className="text-[10px] font-mono text-slate-400">Watch</div>
              </div>
              <div className="p-3 rounded-xl bg-orange-950/30 border border-orange-500/30 text-center">
                <div className="text-lg font-black text-orange-400">{wc.fatigue_alert_count}</div>
                <div className="text-[10px] font-mono text-slate-400">Fatigue Alert</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
              <div className="text-xs font-mono text-slate-400 mb-2">Operational Coverage</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{wc.operational_coverage_pct}%</span>
                <span className="text-xs font-mono text-slate-400">of required shifts covered</span>
              </div>
            </div>
            {wc.contributing_factors?.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                <div className="text-xs font-mono text-amber-400 mb-2">Contributing Factors</div>
                <ul className="space-y-1">
                  {wc.contributing_factors.map((f: string, i: number) => (
                    <li key={i} className="text-[11px] font-mono text-slate-300 flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-[10px] font-mono text-slate-400">
              Operational aggregate only — no individual medical records. Data represents shift coverage and scheduling state.
            </div>
          </div>
        </KpiModal>
      )}

      {activeModal === 'resource_demand' && (
        <KpiModal title="Personnel Resource Demand — Cross-Domain Impact" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            {[
              { label: 'Energy Load', value: `${rc.energy_personnel_load_kw?.toFixed(1)} kW`, sub: `${rc.per_capita_energy_kw} kW/person × ${pers.headcount} crew × ×${rc.diurnal_multiplier?.toFixed(2) ?? '1.00'} diurnal`, icon: Zap, color: 'text-yellow-400', borderColor: 'border-yellow-500/30' },
              { label: 'Water Demand', value: `${rc.water_demand_l_day?.toFixed(0)} L/day`, sub: `${rc.per_capita_water_l_day} L/person/day × ${pers.headcount} crew`, icon: Droplet, color: 'text-cyan-400', borderColor: 'border-cyan-500/30' },
              { label: 'Food Demand', value: `${((rc.food_demand_kcal_day ?? 0) / 1000).toFixed(1)} Mcal/day`, sub: `${(rc.per_capita_kcal_day / 1000).toFixed(2)} Mcal/person × ${pers.headcount} crew`, icon: Utensils, color: 'text-amber-400', borderColor: 'border-amber-500/30' },
              { label: 'Waste Generation', value: `${rc.waste_generation_kg_day?.toFixed(1)} kg/day`, sub: `${rc.per_capita_waste_kg_day} kg/person × ${pers.headcount} crew`, icon: Trash2, color: 'text-slate-400', borderColor: 'border-slate-500/30' },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-xl bg-polar-dark/70 border ${item.borderColor} flex items-center gap-3`}>
                <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-base font-black ${item.color}`}>{item.value}</span>
                    <span className="text-xs font-mono text-slate-400">{item.label}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">{item.sub}</div>
                </div>
              </div>
            ))}
            {rc.research_energy_extra_kw !== undefined && rc.research_energy_extra_kw !== 0 && (
              <div className="p-3 rounded-xl bg-pink-950/20 border border-pink-500/30">
                <div className="text-[10px] font-mono text-pink-400">Research Energy Extra</div>
                <div className="text-sm font-bold text-pink-300">+{rc.research_energy_extra_kw} kW from active experiments</div>
              </div>
            )}
          </div>
        </KpiModal>
      )}

      {/* ── Role Drawer ─────────────────────────────────────────────────────── */}
      {selectedRole && <RoleDrawer group={selectedRole} onClose={() => setSelectedRole(null)} />}

      {/* ── Main Content Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Expedition Roster ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              Expedition Roster — Role Groups
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Click group for intelligence</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pers.role_groups?.map((rg: any) => (
              <button
                key={rg.role}
                onClick={() => setSelectedRole(rg)}
                className={`p-4 rounded-xl bg-polar-dark/70 border transition-all text-left ${roleBorderColor[rg.color] ?? 'border-polar-border hover:border-cyan-400/70'} group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${roleColor[rg.color] ?? roleColor.cyan}`}>
                    {rg.role}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${activityBadge[rg.activity_level] ?? activityBadge.NORMAL}`}>
                    {rg.activity_level}
                  </span>
                </div>

                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-black text-white">{rg.count}</span>
                  <span className="text-xs font-mono text-slate-400 mb-0.5">personnel</span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono mb-2">
                  <span className="text-emerald-400">In: {rg.on_station}</span>
                  <span className="text-amber-400">Field: {rg.field_deployed}</span>
                  <span className="text-slate-400">Rest: {rg.in_rest}</span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <span className="text-yellow-300 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{rg.energy_contribution_kw} kW</span>
                  <span className="text-cyan-300 flex items-center gap-0.5"><Droplet className="w-2.5 h-2.5" />{rg.water_contribution_l_day} L/d</span>
                </div>

                <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">{rg.current_activity_desc}</div>

                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 mt-2 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Zone Occupancy & Deployment ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Live Deployment */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Personnel Deployment
            </h3>
            {[
              { label: 'Station Interior', value: dm.station_interior, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
              { label: 'Field Deployed', value: dm.field_deployed, color: 'bg-amber-500', textColor: 'text-amber-400' },
              { label: 'In Transit', value: dm.in_transit, color: 'bg-blue-500', textColor: 'text-blue-400' },
              { label: 'Off-duty / Rest', value: dm.in_rest, color: 'bg-slate-500', textColor: 'text-slate-400' },
              { label: 'Emergency Standby', value: dm.emergency_standby, color: 'bg-red-500', textColor: 'text-red-400' },
            ].map(row => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">{row.label}</span>
                  <span className={row.textColor}>{row.value}</span>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-1.5">
                  <div className={`${row.color} h-full rounded-full transition-all`}
                    style={{ width: `${pers.headcount > 0 ? (row.value / pers.headcount) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Zone Occupancy Heatmap */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Zone Occupancy
            </h3>
            {pers.zone_map?.map((zone: any) => {
              const pct = zone.capacity > 0 ? Math.round((zone.current / zone.capacity) * 100) : 0;
              return (
                <div key={zone.zone} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-300 truncate max-w-[65%]">{zone.zone.replace('Module ', '').replace('& ', '')}</span>
                    <span className="text-white">{zone.current}/{zone.capacity}</span>
                  </div>
                  <div className="w-full bg-slate-800/60 rounded-full h-1.5">
                    <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Diurnal Rhythm & Live Activity Timeline ──────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Live Diurnal Activity &amp; Load Dynamics
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-slate-400">Current block:</span>
            <span className={`px-2 py-0.5 rounded border font-bold ${diurnalBlockColor[pers.diurnal_block?.color ?? 'slate']}`}>
              {pers.diurnal_block?.label}
            </span>
            <span className="text-slate-400">×{pers.diurnal_block?.demand_mult} demand multiplier</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Active block detail */}
          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Current Activity Block</div>
            <div className={`px-3 py-2 rounded-lg border text-xs font-mono ${diurnalBlockColor[pers.diurnal_block?.color ?? 'slate']}`}>
              <div className="font-bold text-sm">{pers.diurnal_block?.label}</div>
              <div className="text-[10px] mt-0.5">{pers.diurnal_block?.hour_start}:00 – {pers.diurnal_block?.hour_end}:00</div>
            </div>
            <div className="text-xs font-mono text-slate-300">{pers.diurnal_block?.primary_activity}</div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <div className="text-slate-400">Energy Now</div>
                <div className="text-yellow-400 font-bold">{rc.energy_personnel_load_kw?.toFixed(1)} kW</div>
              </div>
              <div>
                <div className="text-slate-400">Multiplier</div>
                <div className="text-cyan-400 font-bold">×{pers.diurnal_block?.demand_mult}</div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-2">
            <DiurnalChart
              schedule={pers.diurnal_schedule ?? []}
              currentHour={pers.current_hour ?? new Date().getHours()}
              energyKw={rc.per_capita_energy_kw * pers.headcount}
            />
            <div className="text-[10px] font-mono text-slate-500 mt-1 text-center">Personnel-origin energy demand by time-of-day (active block highlighted in cyan)</div>
          </div>
        </div>
      </div>

      {/* ── Personnel Resource Demand ────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Personnel Resource Demand — Cross-Domain Coupling
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Energy Demand', icon: Zap, value: `${rc.energy_personnel_load_kw?.toFixed(1)} kW`, sub: `${rc.per_capita_energy_kw} kW/person`, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/25', link: 'energy', linkLabel: '→ Energy Domain' },
            { label: 'Water Demand', icon: Droplet, value: `${rc.water_demand_l_day?.toFixed(0)} L/day`, sub: `${rc.per_capita_water_l_day} L/person`, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/25', link: 'water', linkLabel: '→ Water Domain' },
            { label: 'Food Required', icon: Utensils, value: `${((rc.food_demand_kcal_day ?? 0) / 1000).toFixed(1)} Mcal`, sub: `${(rc.per_capita_kcal_day / 1000).toFixed(2)} Mcal/person`, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/25', link: 'inventory', linkLabel: '→ Inventory' },
            { label: 'Waste Output', icon: Trash2, value: `${rc.waste_generation_kg_day?.toFixed(1)} kg/day`, sub: `${rc.per_capita_waste_kg_day} kg/person`, color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/25', link: 'waste', linkLabel: '→ Waste Domain' },
          ].map(item => (
            <div key={item.label} className={`p-4 rounded-xl border ${item.bgColor} ${item.borderColor} space-y-2`}>
              <div className="flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-[10px] font-mono text-slate-400 uppercase">{item.label}</span>
              </div>
              <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
              <div className="text-[10px] font-mono text-slate-500">{item.sub}/day × {pers.headcount} crew</div>
              <button
                onClick={() => navigate(`/station/${stationId}/${item.link}`)}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
              >
                {item.linkLabel}
              </button>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[10px] font-mono text-slate-400">
          All values calculated from simulation engine. Changing headcount or activity level propagates changes to Energy, Water, Food Supply, and Waste domains in real-time.
        </div>
      </div>

      {/* ── Equipment Coverage & Research Workforce ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Operator Coverage */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            Equipment Operator Coverage
          </h3>
          <div className="space-y-2.5">
            {pers.equipment_coverage?.map((ec: any) => (
              <div key={ec.system} className={`p-3 rounded-xl border ${coverageBg(ec.coverage_pct)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-slate-200">{ec.system}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">{ec.available}/{ec.required}</span>
                    <span className={`text-xs font-mono font-bold ${coverageColor(ec.coverage_pct)}`}>{ec.coverage_pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800/60 rounded-full h-1.5">
                  <div className={`h-full rounded-full transition-all ${ec.coverage_pct >= 90 ? 'bg-emerald-500' : ec.coverage_pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${ec.coverage_pct}%` }} />
                </div>
                {ec.status !== 'FULL' && (
                  <div className="text-[10px] font-mono text-amber-400 mt-1">⚠ {ec.status}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Research Workforce + Field Exposure */}
        <div className="space-y-4">
          {/* Research Workforce */}
          {pers.role_groups?.[0] && (
            <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Microscope className="w-4 h-4 text-pink-400" />
                Research Workforce State
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Scientists', value: pers.role_groups[0].count, color: 'text-pink-400' },
                  { label: 'Active Projects', value: pers.role_groups[0].active_projects, color: 'text-fuchsia-400' },
                  { label: 'Readiness', value: `${pers.role_groups[0].research_readiness_pct?.toFixed(0)}%`, color: 'text-emerald-400' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                    <div className={`text-lg font-black ${item.color}`}>{item.value}</div>
                    <div className="text-[10px] font-mono text-slate-400">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div className="p-2 rounded-lg bg-polar-dark/70 border border-polar-border">
                  <div className="text-slate-400">Field Teams</div>
                  <div className="text-amber-400 font-bold">{pers.role_groups[0].field_teams} deployed</div>
                </div>
                <div className="p-2 rounded-lg bg-polar-dark/70 border border-polar-border">
                  <div className="text-slate-400">Lab Teams</div>
                  <div className="text-cyan-400 font-bold">{pers.role_groups[0].lab_teams} active</div>
                </div>
              </div>
            </div>
          )}

          {/* Field Exposure */}
          <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-400" />
              Field Exposure &amp; Deployment
            </h3>
            <div className={`p-3 rounded-xl border text-xs font-mono ${
              fe.exposure_risk === 'CRITICAL' ? 'bg-red-950/30 border-red-500/40' :
              fe.exposure_risk === 'High' ? 'bg-orange-950/30 border-orange-500/40' :
              fe.exposure_risk === 'Moderate' ? 'bg-amber-950/30 border-amber-500/40' :
              'bg-emerald-950/20 border-emerald-500/30'
            }`}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-400">Exposure Risk</span>
                <span className={`font-bold ${exposureColor[fe.exposure_risk] ?? 'text-slate-400'}`}>{fe.exposure_risk}</span>
              </div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-400">Field Teams Out</span>
                <span className="text-white font-bold">{fe.field_team_count}</span>
              </div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-400">Max Safe Exposure</span>
                <span className="text-cyan-300">{fe.max_safe_exposure_min} min</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400">Research Feasibility</span>
                <span className={fe.research_feasibility === 'FULL' ? 'text-emerald-400' : 'text-amber-400'}>{fe.research_feasibility}</span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400">{fe.current_conditions_desc}</div>
            {fe.deployment_restriction !== 'None' && (
              <div className="p-2 rounded-lg bg-red-950/30 border border-red-500/30 text-[10px] font-mono text-red-300">
                ⚠ {fe.deployment_restriction}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Life Support & Anomalies Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Life Support */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-4 h-4 text-emerald-400" />
            Life Support &amp; Medical Coverage
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'O₂ Level', value: `${ls.o2_pct}%`, status: ls.o2_pct > 19.5 ? 'NORMAL' : 'LOW', color: ls.o2_pct > 19.5 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'CO₂ Level', value: `${ls.co2_ppm} ppm`, status: ls.co2_ppm < 1000 ? 'SAFE' : 'ELEVATED', color: ls.co2_ppm < 1000 ? 'text-emerald-400' : 'text-amber-400' },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                <div className={`text-lg font-black ${item.color}`}>{item.value}</div>
                <div className="text-[10px] font-mono text-slate-400">{item.label}</div>
                <div className={`text-[9px] font-mono ${item.color}`}>{item.status}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { label: 'Medical Officer', value: ls.medical_officer_available ? 'AVAILABLE' : 'UNAVAILABLE', good: ls.medical_officer_available },
              { label: 'Medical Facility', value: ls.medical_facility_status, good: ls.medical_facility_status === 'OPERATIONAL' },
              { label: 'Remote doctor service', value: `${ls.remote doctor service_link} — ${ls.remote doctor service_partner}`, good: ls.remote doctor service_link === 'CONNECTED' },
              { label: 'Emergency Response', value: ls.emergency_response_readiness, good: ls.emergency_response_readiness === 'READY' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-polar-border/30 text-xs font-mono">
                <span className="text-slate-400">{item.label}</span>
                <span className={item.good ? 'text-emerald-400' : 'text-amber-400'}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="p-2 rounded bg-polar-dark/40 border border-polar-border text-[10px] font-mono text-slate-500">
            Station-level aggregate operational state only. No individual medical records displayed.
          </div>
        </div>

        {/* Anomalies & Alerts */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            Anomalies &amp; Personnel Alerts
          </h3>
          {pers.anomalies?.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div className="text-xs font-mono text-emerald-300">No active personnel anomalies detected</div>
            </div>
          ) : (
            pers.anomalies?.map((anomaly: any) => (
              <div
                key={anomaly.type}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  anomaly.severity === 'HIGH' ? 'bg-red-950/20 border-red-500/30 hover:border-red-400/60' :
                  'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/60'
                }`}
                onClick={() => setExpandedAnomaly(expandedAnomaly === anomaly.type ? null : anomaly.type)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${anomaly.severity === 'HIGH' ? 'text-red-400' : 'text-amber-400'}`} />
                    <span className="text-xs font-mono text-slate-200 font-bold">{anomaly.message}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedAnomaly === anomaly.type ? 'rotate-180' : ''}`} />
                </div>
                {expandedAnomaly === anomaly.type && (
                  <div className="mt-3 space-y-2 text-[10px] font-mono">
                    <div className="p-2 rounded bg-polar-dark/60">
                      <span className="text-slate-400">Cause: </span>
                      <span className="text-slate-200">{anomaly.cause}</span>
                    </div>
                    <div className="p-2 rounded bg-polar-dark/60">
                      <span className="text-slate-400">Impact: </span>
                      <span className="text-amber-300">{anomaly.operational_impact}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Personnel Risk Score */}
          <div className={`p-4 rounded-xl border ${
            pr.level === 'LOW' ? 'bg-emerald-950/20 border-emerald-500/20' :
            pr.level === 'MEDIUM' ? 'bg-amber-950/20 border-amber-500/20' :
            'bg-red-950/20 border-red-500/20'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase">Personnel Risk Contribution</span>
              <span className={`text-sm font-black ${riskColor[pr.level] ?? 'text-slate-400'}`}>{pr.level} ({pr.score?.toFixed(1)})</span>
            </div>
            <div className="space-y-1.5">
              {pr.contributing_factors?.map((cf: any) => (
                <div key={cf.factor} className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">{cf.factor}</span>
                  <span className={cf.impact > 0 ? 'text-amber-400' : 'text-emerald-400'}>+{cf.impact.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cross-Domain Causal Flow ────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-cyan-400" />
          Cross-Domain Causal Flow
        </h3>

        <div className="space-y-4">
          {CAUSAL_CHAINS.map(chain => (
            <div key={chain.id} className="space-y-2">
              <div className="text-[10px] font-mono text-slate-500 uppercase">{chain.label}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {chain.nodes.map((node, i) => (
                  <React.Fragment key={i}>
                    <CausalNode
                      label={node.label}
                      value={node.value}
                      color={node.color}
                      active={selectedCausal === `${chain.id}-${i}`}
                      onClick={() => setSelectedCausal(selectedCausal === `${chain.id}-${i}` ? null : `${chain.id}-${i}`)}
                    />
                    {i < chain.nodes.length - 1 && <Arrow />}
                  </React.Fragment>
                ))}
              </div>
              {/* Visual Signal spread Studio appears when any node in this chain is selected */}
              {chain.nodes.some((_, i) => selectedCausal === `${chain.id}-${i}`) && (
                <div className="p-4 rounded-xl bg-polar-dark/90 border border-cyan-500/30 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Dynamic Causal Cascade Breakdown
                    </span>
                    <span className="text-[9px] text-slate-400">Live Physics Interconnection</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {chain.nodes.slice(0, 4).map((n, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-polar-navy/80 border border-polar-border">
                        <div className="text-[9px] text-slate-400 uppercase truncate">{n.label}</div>
                        <div className="text-sm font-black text-white mt-0.5">{n.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed border-t border-polar-border/40 pt-2 flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>{chain.explanation}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── What-If Simulation Sandbox ────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" />
            What-If Simulation Sandbox
          </h3>
          {whatIfResult && (
            <button onClick={() => { setWhatIfResult(null); setWhatIfScenario(null); }}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Clear Results
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {WHAT_IF_SCENARIOS.map(sc => (
            <button
              key={sc.id}
              onClick={() => runWhatIf(sc.id, sc.params)}
              disabled={whatIfLoading}
              className={`p-4 rounded-xl border text-left transition-all ${
                whatIfScenario === sc.id
                  ? `bg-${sc.color}-500/20 border-${sc.color}-400/70 shadow-lg`
                  : `bg-polar-dark/60 border-polar-border hover:border-${sc.color}-500/50`
              } ${whatIfLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <sc.icon className={`w-5 h-5 mb-2 text-${sc.color}-400`} />
              <div className="text-xs font-mono font-bold text-white">{sc.label}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">{sc.desc}</div>
              {whatIfLoading && whatIfScenario === sc.id && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                  <div className="w-2.5 h-2.5 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  Simulating…
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Baseline vs Projected comparison */}
        {whatIfResult && (
          <div className="space-y-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              Baseline vs Projected — Isolated Clone-State Simulation (Live state not mutated)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-polar-border">
                    <th className="text-left text-slate-400 py-2 pr-4 font-normal uppercase text-[10px]">Metric</th>
                    <th className="text-right text-slate-400 py-2 px-3 font-normal uppercase text-[10px]">Baseline</th>
                    <th className="text-right text-slate-400 py-2 px-3 font-normal uppercase text-[10px]">Projected</th>
                    <th className="text-right text-slate-400 py-2 pl-3 font-normal uppercase text-[10px]">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'headcount', label: 'Personnel', unit: 'crew', icon: Users },
                    { key: 'occupancy_pct', label: 'Occupancy', unit: '%', icon: MapPin },
                    { key: 'energy_kw', label: 'Energy Demand', unit: 'kW', icon: Zap },
                    { key: 'water_l_day', label: 'Water Demand', unit: 'L/day', icon: Droplet },
                    { key: 'food_kcal_day', label: 'Food Demand', unit: 'kcal/day', icon: Utensils },
                    { key: 'waste_kg_day', label: 'Waste Generation', unit: 'kg/day', icon: Trash2 },
                    { key: 'research_readiness_pct', label: 'Research Readiness', unit: '%', icon: Microscope },
                    { key: 'operator_coverage_pct', label: 'Operator Coverage', unit: '%', icon: Wrench },
                    { key: 'field_deployed', label: 'Field Deployed', unit: 'personnel', icon: MapPin },
                    { key: 'food_stock_days', label: 'Food Stock Runway', unit: 'days', icon: Package },
                    { key: 'personnel_risk_score', label: 'Personnel Risk', unit: '/100', icon: Shield },
                  ].map(row => {
                    const b = whatIfResult.baseline?.[row.key];
                    const p = whatIfResult.projected?.[row.key];
                    const d = whatIfResult.delta?.[row.key];
                    const isUp = d > 0;
                    const isDown = d < 0;
                    const isGoodUp = ['research_readiness_pct', 'operator_coverage_pct', 'food_stock_days'].includes(row.key);
                    const isGoodDown = ['waste_kg_day', 'personnel_risk_score'].includes(row.key);
                    const deltaColor = d === 0 ? 'text-slate-400' :
                      ((isUp && !isGoodUp && !isGoodDown) || (isDown && isGoodUp)) ? 'text-orange-400' :
                      ((isDown && isGoodDown) || (isUp && isGoodUp)) ? 'text-emerald-400' : 'text-amber-400';

                    return (
                      <tr key={row.key} className="border-b border-polar-border/30 hover:bg-polar-dark/30 transition-colors">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <row.icon className="w-3 h-3 text-slate-500" />
                            {row.label}
                          </div>
                        </td>
                        <td className="text-right py-2 px-3 text-slate-400">
                          {typeof b === 'number' ? b.toFixed(b % 1 !== 0 ? 1 : 0) : b ?? '--'} <span className="text-slate-600 text-[9px]">{row.unit}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-bold text-white">
                          {typeof p === 'number' ? p.toFixed(p % 1 !== 0 ? 1 : 0) : p ?? '--'} <span className="text-slate-500 text-[9px]">{row.unit}</span>
                        </td>
                        <td className={`text-right py-2 pl-3 font-bold ${deltaColor}`}>
                          {d === 0 ? (
                            <Minus className="w-3 h-3 inline" />
                          ) : isUp ? (
                            <><ArrowUpRight className="w-3 h-3 inline" /> +{typeof d === 'number' ? d.toFixed(1) : d}</>
                          ) : (
                            <><ArrowDownRight className="w-3 h-3 inline" /> {typeof d === 'number' ? d.toFixed(1) : d}</>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Scenario anomalies */}
            {whatIfResult.scenario_anomalies?.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Projected Scenario Alerts</div>
                {whatIfResult.scenario_anomalies.map((a: any) => (
                  <div key={a.type} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs font-mono">
                    <div className="text-amber-300 font-bold">{a.message}</div>
                    <div className="text-slate-400 mt-1">{a.operational_impact}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Resupply Impact ───────────────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-amber-400" />
          Resupply &amp; Inventory Impact — Personnel-Driven
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Food Stock Runway', value: `${ri.food_stock_days_current} days`, icon: Utensils, color: ri.food_stock_days_current > 30 ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'Water Autonomy', value: `${ri.water_autonomy_days} days`, icon: Droplet, color: ri.water_autonomy_days > 10 ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'Logistics Runway', value: `${ri.logistics_runway_days} days`, icon: Truck, color: ri.logistics_runway_days > 60 ? 'text-emerald-400' : 'text-amber-400' },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
              <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
              <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-[10px] font-mono text-slate-400">
          Increasing headcount or activity level reduces these runways proportionally. Changes cascade to Storage &amp; Inventory domain and trigger Logistics resupply re-scheduling.
        </div>
      </div>

    </div>
  );
};

export default PersonnelPage;
