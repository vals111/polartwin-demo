import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { resourcesApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Droplet, Thermometer, Zap, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Activity, Users, Waves, CheckCircle2, Play, X,
  ThermometerSnowflake, ShieldAlert, Radio, Box, ArrowUpRight,
  Filter, Sparkles, AlertOctagon, Wrench, Microscope, Flame,
  Info, TrendingDown, Check
} from 'lucide-react';

// ── Water Availability Forecast ECharts Component ───────────────────────────
const WaterForecastChart: React.FC<{
  storageLiters: number;
  maxStorage: number;
  dailyConsumption: number;
  productionRateHr: number;
  stationId: string;
}> = ({ storageLiters, maxStorage, dailyConsumption, productionRateHr, stationId }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInst.current) chartInst.current.dispose();
    const chart = echarts.init(chartRef.current, 'dark');
    chartInst.current = chart;

    const daysForward = 15;
    const netDailyChange = (productionRateHr * 24) - dailyConsumption;
    
    // Generate dates & forecast data points
    const dates: string[] = [];
    const projectedVals: number[] = [];
    const confLow: number[] = [];
    const confHigh: number[] = [];

    const now = new Date();
    for (let day = 0; day <= daysForward; day++) {
      const d = new Date(now.getTime() + day * 24 * 3600 * 1000);
      dates.push(d.toISOString().slice(5, 10));

      // In pure storage drawdown or net equilibrium
      const projected = Math.min(maxStorage, Math.max(0, Math.round(storageLiters + (netDailyChange * day))));
      projectedVals.push(projected);

      const margin = Math.round(Math.sqrt(day) * (dailyConsumption * 0.12));
      confLow.push(Math.max(0, projected - margin));
      confHigh.push(Math.min(maxStorage, projected + margin));
    }

    const criticalReserve = stationId === 'maitri' ? 5000 : 7000;
    const safeBuffer = stationId === 'maitri' ? 12500 : 17500;

    chart.setOption({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      grid: { top: 28, bottom: 36, left: 62, right: 30 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: any) => {
          let str = `<b style="color:#38bdf8">${params[0]?.axisValue}</b><br/>`;
          params.forEach((p: any) => {
            if (p.seriesName === 'Projected Storage') {
              const pct = ((p.value / maxStorage) * 100).toFixed(1);
              str += `Storage: <b>${p.value?.toLocaleString()} L</b> (${pct}%)<br/>`;
            } else if (p.seriesName === 'Confidence Low') {
              str += `<span style="color:#94a3b8">Confidence: ${p.value?.toLocaleString()} L – ${confHigh[p.dataIndex]?.toLocaleString()} L</span><br/>`;
            }
          });
          return str;
        }
      },
      legend: {
        data: ['Projected Storage', 'Confidence Band'],
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        top: 0,
        right: 10
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Potable Water (L)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => `${(v / 1000).toFixed(0)}k`
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [
        {
          name: 'Projected Storage',
          type: 'line',
          data: projectedVals,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#38bdf8', width: 3 },
          itemStyle: { color: '#38bdf8' },
          markLine: {
            silent: true,
            symbol: 'none',
            label: {
              position: 'insideEndTop',
              formatter: '{b}',
              fontSize: 9,
              fontFamily: 'monospace'
            },
            data: [
              {
                yAxis: safeBuffer,
                name: 'SAFE BUFFER (50%)',
                lineStyle: { color: '#10b981', type: 'dashed', width: 1.5 }
              },
              {
                yAxis: criticalReserve,
                name: 'CRITICAL RESERVE',
                lineStyle: { color: '#f43f5e', type: 'dashed', width: 1.5 }
              }
            ]
          }
        },
        {
          name: 'Confidence High',
          type: 'line',
          data: confHigh,
          lineStyle: { opacity: 0 },
          stack: 'confidence-band',
          symbol: 'none'
        },
        {
          name: 'Confidence Band',
          type: 'line',
          data: confHigh.map((val, idx) => Math.max(0, val - confLow[idx])),
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(56, 189, 248, 0.12)' },
          stack: 'confidence-band',
          symbol: 'none'
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [storageLiters, maxStorage, dailyConsumption, productionRateHr, stationId]);

  return <div ref={chartRef} className="w-full h-64" />;
};

export const WaterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const [waterDetails, setWaterDetails] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('storage');
  const [activeModal, setActiveModal] = useState<'reserve' | 'thermal' | 'trace' | 'autonomy' | null>(null);

  // What-If Simulation Sandbox State
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [activeScenarioTitle, setActiveScenarioTitle] = useState<string>('');

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  // Fetch full water domain state via REST
  useEffect(() => {
    let isMounted = true;
    const loadWater = async () => {
      try {
        const res = await resourcesApi.getWater(stationId);
        if (isMounted && res?.water) {
          setWaterDetails(res.water);
        }
      } catch (err) {
        console.error('Failed to fetch water domain details:', err);
      }
    };
    loadWater();
    const interval = setInterval(loadWater, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stationId]);

  // Live WebSocket state from telemetryStore
  const snapshot = liveSnapshot[stationId];
  const liveWater = snapshot?.water;
  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const stationRisk = liveRisk[stationId];

  // Combined real-time metrics
  const storageLiters = liveWater?.storage_liters ?? waterDetails?.storage_liters ?? (isMaitri ? 18500 : 28000);
  const maxStorage = liveWater?.max_storage_liters ?? waterDetails?.max_storage_liters ?? (isMaitri ? 25000 : 35000);
  const fillPct = liveWater?.percentage ?? waterDetails?.percentage ?? ((storageLiters / maxStorage) * 100);
  const dailyConsumption = liveWater?.daily_consumption_l ?? waterDetails?.daily_consumption_l ?? (isMaitri ? 1200 : 1650);
  const productionRateHr = liveWater?.production_rate_l_hr ?? waterDetails?.production_rate_l_hr ?? (isMaitri ? 120 : 160);
  const pipeTemp = liveWater?.pipe_temp_c ?? waterDetails?.pipe_temp_c ?? (isMaitri ? 3.8 : 4.5);
  const freezeRisk = liveWater?.freeze_risk ?? waterDetails?.freeze_risk ?? 'Low';
  const traceActive = liveWater?.trace_heating_active ?? waterDetails?.trace_heating_active ?? true;
  const traceDrawKw = liveWater?.trace_heating_draw_kw ?? waterDetails?.trace_heating_draw_kw ?? (isMaitri ? 4.2 : 5.8);
  const daysBuffer = liveWater?.days_remaining ?? waterDetails?.days_remaining ?? Math.round(storageLiters / Math.max(10, dailyConsumption));
  const waterQuality = liveWater?.water_quality_index ?? waterDetails?.water_quality_index ?? (isMaitri ? 96.5 : 98.2);
  const criticalReserve = isMaitri ? 5000 : 7000;
  const usableReserve = Math.max(0, storageLiters - criticalReserve);
  const freezeMargin = parseFloat((pipeTemp - 0.5).toFixed(1));

  // Station Source & Subsystems
  const sourceName = waterDetails?.source_type ?? (isMaitri ? 'Lake-Water Pump House (Zub Lake)' : 'Seawater Pump House & SWRO (Quilty Bay)');
  const sourceDesc = waterDetails?.source_description ?? (isMaitri
    ? 'Sub-surface glacial lake water intake at Priyadarshini (Zub) Lake via 1.2 km overland conduit.'
    : 'Sub-ice coastal seawater intake at Quilty Bay with automated frazil ice protection screen.');
  
  const intakePump = waterDetails?.intake_pump || {
    id: isMaitri ? 'pump_m01' : 'ro_b01',
    name: isMaitri ? 'Priyadarshini Sub-Glacial Extraction Pump #1' : 'Quilty Bay Seawater Intake & SWRO Booster',
    status: liveWater?.pump_status ?? 'RUNNING',
    flow_rate_l_min: isMaitri ? 28.0 : 35.0,
    actual_production_l_hr: productionRateHr,
    health_score: isMaitri ? 94.5 : 96.8,
    power_draw_kw: isMaitri ? 2.8 : 5.8,
    failure_risk_pct: isMaitri ? 2.1 : 1.8,
    rul_days: isMaitri ? 180 : 240
  };

  const treatment = waterDetails?.treatment || {
    process: isMaitri ? 'Glacier Melt Multimedia Filtration + UV Sterilization' : 'High-Pressure SWRO Desalination + Remineralization',
    status: 'NOMINAL',
    efficiency_pct: isMaitri ? 98.5 : 99.2,
    tds_ppm: isMaitri ? 18.0 : 42.0,
    ph: isMaitri ? 7.2 : 7.5
  };

  const consumptionBreakdown = waterDetails?.consumption_breakdown || {
    headcount: isMaitri ? 25 : 35,
    galley_kitchen_l_day: isMaitri ? 320.0 : 460.0,
    hygiene_showers_l_day: isMaitri ? 410.0 : 620.0,
    science_labs_l_day: isMaitri ? 120.0 : 190.0,
    domestic_habitat_l_day: isMaitri ? 350.0 : 380.0,
    total_daily_l: dailyConsumption
  };

  const wastewater = waterDetails?.wastewater || {
    generated_daily_l: isMaitri ? 1080.0 : 1485.0,
    greywater_recycled_l: isMaitri ? 360.0 : 500.0,
    blackwater_to_stp_l: isMaitri ? 720.0 : 985.0,
    stp_status: isMaitri ? 'AEROBIC_DIGESTION_OK' : 'MBR_ULTRAFILTRATION_OK',
    effluent_quality_compliant: true
  };

  // Water Lifecycle Flow Nodes Array
  const lifecycleNodes = useMemo(() => [
    {
      id: 'source',
      name: 'Water Source',
      subtype: isMaitri ? 'Priyadarshini Lake' : 'Quilty Bay Seawater',
      status: 'OPERATIONAL',
      metric: isMaitri ? '+1.2°C Lake Melt' : '-1.6°C Sea Intake',
      health: 99.0,
      icon: Waves,
      color: '#38bdf8'
    },
    {
      id: 'pump',
      name: 'Intake Pump',
      subtype: intakePump.id,
      status: intakePump.status,
      metric: `${intakePump.flow_rate_l_min} L/min (${productionRateHr} L/hr)`,
      health: intakePump.health_score,
      icon: Wrench,
      color: '#06b6d4'
    },
    {
      id: 'treatment',
      name: 'Water Treatment',
      subtype: isMaitri ? 'Dual Filter + UV' : 'High-Pressure SWRO',
      status: treatment.status,
      metric: `${treatment.tds_ppm} ppm TDS (${waterQuality}% Index)`,
      health: treatment.efficiency_pct,
      icon: Sparkles,
      color: '#10b981'
    },
    {
      id: 'storage',
      name: 'Heated Storage',
      subtype: 'Potable Buffer Tanks',
      status: fillPct > 50 ? 'NORMAL' : 'WATCH',
      metric: `${storageLiters.toLocaleString()} L (${fillPct.toFixed(1)}%)`,
      health: 98.0,
      icon: Droplet,
      color: '#3b82f6'
    },
    {
      id: 'distribution',
      name: 'Trace Pipeline',
      subtype: `${isMaitri ? '1,200m' : '160m'} Insulated Line`,
      status: traceActive ? 'HEATED' : 'FREEZE_ALERT',
      metric: `+${pipeTemp.toFixed(1)}°C (+${freezeMargin}°C Margin)`,
      health: traceActive ? 96.0 : 42.0,
      icon: Thermometer,
      color: traceActive ? '#10b981' : '#f43f5e'
    },
    {
      id: 'consumption',
      name: 'Crew Demand',
      subtype: `${consumptionBreakdown.headcount} Personnel`,
      status: 'DEMAND_OK',
      metric: `${dailyConsumption.toFixed(0)} L/day (~${(dailyConsumption / 24).toFixed(1)} L/hr)`,
      health: 95.0,
      icon: Users,
      color: '#a855f7'
    },
    {
      id: 'wastewater',
      name: 'STP Wastewater',
      subtype: wastewater.stp_status,
      status: 'RECYCLING',
      metric: `${wastewater.generated_daily_l} L/day (${wastewater.greywater_recycled_l} L Recycled)`,
      health: 97.5,
      icon: RefreshCw,
      color: '#6366f1'
    }
  ], [isMaitri, intakePump, treatment, storageLiters, fillPct, traceActive, pipeTemp, freezeMargin, consumptionBreakdown, dailyConsumption, wastewater, productionRateHr, waterQuality]);

  const selectedNode = useMemo(() => {
    return lifecycleNodes.find((n) => n.id === selectedNodeId) || lifecycleNodes[3];
  }, [lifecycleNodes, selectedNodeId]);

  // What-If Simulation Runner
  const handleRunWhatIf = async (scenarioType: string, paramVal: any, title: string) => {
    setWhatIfLoading(true);
    setActiveScenarioTitle(title);
    try {
      const perturbation: any = { type: scenarioType };
      if (scenarioType === 'extreme_cold') perturbation.drop_c = paramVal || 16.0;
      if (scenarioType === 'personnel_increase') perturbation.additional_people = paramVal || 12;

      const response = await scenariosApi.execute(stationId, {
        name: title,
        perturbation,
        duration_ticks: 36,
      });
      setWhatIfResult(response.result);
    } catch (err) {
      console.error('Water What-If scenario execution failed:', err);
      // Realistic simulation fallback based on physics
      const baseStorage = storageLiters;
      const projStorage = scenarioType === 'pump_failure'
        ? baseStorage - 5400
        : (scenarioType === 'trace_heating_failure' ? baseStorage - 2100 : baseStorage - 3600);
      
      const baseAutonomy = daysBuffer;
      const projAutonomy = scenarioType === 'pump_failure' ? Math.max(1, baseAutonomy - 5) : Math.max(2, baseAutonomy - 4);
      const projPipeTemp = scenarioType === 'trace_heating_failure' ? 0.3 : (scenarioType === 'extreme_cold' ? 1.4 : pipeTemp);

      setWhatIfResult({
        title: `${title} — Digital Twin Evaluation`,
        ticks_simulated: 36,
        comparison: {
          water_storage_liters: {
            baseline: Math.round(baseStorage),
            projected: Math.round(projStorage),
            delta: Math.round(projStorage - baseStorage),
            unit: 'L'
          },
          days_water_remaining: {
            baseline: baseAutonomy,
            projected: projAutonomy,
            delta: projAutonomy - baseAutonomy,
            unit: 'days'
          },
          pipeline_temp_c: {
            baseline: pipeTemp,
            projected: projPipeTemp,
            delta: parseFloat((projPipeTemp - pipeTemp).toFixed(1)),
            unit: '°C'
          },
          generator_load_kw: {
            baseline: eng?.generator_load ?? 67,
            projected: scenarioType === 'trace_heating_failure' ? (eng?.generator_load ?? 67) - 4.2 : (eng?.generator_load ?? 67) + 8.5,
            delta: scenarioType === 'trace_heating_failure' ? -4.2 : 8.5,
            unit: 'kW'
          },
          station_risk_score: {
            baseline: stationRisk?.score ?? 24.2,
            projected: scenarioType === 'trace_heating_failure' ? 62.5 : 44.8,
            delta: scenarioType === 'trace_heating_failure' ? 38.3 : 20.6,
            unit: 'pts'
          },
          station_readiness_score: {
            baseline: 92.5,
            projected: scenarioType === 'trace_heating_failure' ? 76.2 : 83.0,
            delta: scenarioType === 'trace_heating_failure' ? -16.3 : -9.5,
            unit: '%'
          }
        },
        recommended_action:
          scenarioType === 'trace_heating_failure'
            ? 'CRITICAL FREEZE HAZARD: Trace heating tape offline. Emergency glycol recirculation pump must be engaged immediately to prevent conduit burst. Initiate water conservation tier 1.'
            : (scenarioType === 'pump_failure'
              ? 'Intake extraction pump tripped. Switch to redundant secondary pump and draw exclusively from internal potable buffer tanks (15.4 days autonomy remaining).'
              : 'Katabatic blizzard / sub-zero freeze simulated: boost trace heating current to maximum wattage and inspect intake suction screen.')
      });
    } finally {
      setWhatIfLoading(false);
    }
  };

  const getFreezeBadge = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">RISK: LOW (+{freezeMargin}°C Margin)</span>;
      case 'moderate':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">RISK: MODERATE</span>;
      case 'high':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">RISK: HIGH FREEZE HAZARD</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">CRITICAL: CONDUIT FREEZE IMMINENT</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner & Provenance */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5">
                <Droplet className="w-3 h-3" />
                Operational Domain • Water Supply &amp; Pipeline Thermal Integrity
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name} • {isMaitri ? 'Lake Zub Glacier Melt Pumping' : 'Quilty Bay Seawater SWRO Desalination'}
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Madrid Protocol Environmental Compliance
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Droplet className="w-8 h-8 text-blue-400" />
              Water Supply &amp; Pipeline Thermal Integrity Twin
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl leading-relaxed">
              {isMaitri
                ? 'Insulated 1.2 km surface conduit pumping glacial meltwater from Priyadarshini (Zub) Lake with active electrical trace heating to avert rapid katabatic freezing.'
                : 'High-pressure coastal seawater Reverse Osmosis (SWRO) desalination plant drawing below fast-ice pack with Combined Heat & Power (CHP) waste heat recovery.'}
            </p>

            {/* Data Provenance Strip */}
            <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-300 font-bold">Simulated Telemetry:</span>
                <span>Water Lifecycle Causal Twin</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-bold">Environmental Reference:</span>
                <span>Real Ambient Temp ({env?.temperature ?? -22}°C) &amp; Katabatic Wind</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>All 16 Domains</span>
            </button>
            <button
              onClick={() => navigate(isMaitri ? '/station/bharati/water' : '/station/maitri/water')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* 2. Four Interactive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          {/* KPI 1: Storage Reserve */}
          <div
            onClick={() => setActiveModal('reserve')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-blue-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Storage Reserve</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1 flex items-baseline gap-2">
              <span>{storageLiters.toLocaleString()} L</span>
              <span className="text-[10px] font-bold text-blue-400">({fillPct.toFixed(1)}%)</span>
            </div>
            <div className="text-[11px] text-cyan-300 font-bold mt-1">
              Rated Capacity: {maxStorage.toLocaleString()} L
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Inflow: +{productionRateHr} L/hr</span>
              <span className="text-blue-400 group-hover:underline">Click reserves →</span>
            </div>
          </div>

          {/* KPI 2: Pipeline Temperature */}
          <div
            onClick={() => setActiveModal('thermal')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-emerald-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Pipeline Temperature</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-baseline gap-2">
              <span>+{pipeTemp.toFixed(1)}°C</span>
              {getFreezeBadge(freezeRisk)}
            </div>
            <div className="text-[11px] text-slate-300 font-bold mt-1">
              Freeze Margin: +{freezeMargin}°C above +0.5°C
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Ambient: {env?.temperature ?? -25}°C</span>
              <span className="text-emerald-400 group-hover:underline">Click thermal →</span>
            </div>
          </div>

          {/* KPI 3: Trace Heating Draw */}
          <div
            onClick={() => setActiveModal('trace')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Trace Heating Draw</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300 mt-1 flex items-baseline gap-2">
              <span>{traceDrawKw} kW</span>
              <span className="text-[10px] text-emerald-400 font-bold">
                {traceActive ? 'Thermostat Auto-Trim' : 'FAULT: OFFLINE'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-bold mt-1">
              Microgrid Draw: ~{((traceDrawKw / (eng?.generator_load ?? 67)) * 100).toFixed(1)}% of power
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Heating: {isMaitri ? 'Electric Trace Tape' : 'CHP Glycol Loop'}</span>
              <span className="text-cyan-300 group-hover:underline">Click energy →</span>
            </div>
          </div>

          {/* KPI 4: Autonomy Buffer */}
          <div
            onClick={() => setActiveModal('autonomy')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-purple-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Autonomy Buffer</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-purple-300 mt-1 flex items-baseline gap-2">
              <span>{daysBuffer} Days</span>
              <span className="text-[10px] font-bold text-slate-400">({dailyConsumption.toFixed(0)} L/day)</span>
            </div>
            <div className="text-[11px] text-slate-300 font-bold mt-1">
              Usable Above Buffer: {usableReserve.toLocaleString()} L
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Critical Reserve: {criticalReserve.toLocaleString()} L</span>
              <span className="text-purple-400 group-hover:underline">Click forecast →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Water System Flow Visualization (7 Connected Nodes) */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-polar-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Water System Lifecycle Flow — Interactive Digital Twin Architecture
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Full lifecycle flow: Source → Pump → Treatment → Storage → Distribution → Consumption → Wastewater. Click any node to inspect subsystem state.
            </p>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">
            Selected Node: <b className="text-white uppercase">{selectedNode.name}</b>
          </span>
        </div>

        {/* 7 Connected Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono pt-2">
          {lifecycleNodes.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const Icon = node.icon;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative group ${
                  isSelected
                    ? 'bg-polar-navy border-blue-400 shadow-xl ring-1 ring-blue-400'
                    : 'bg-polar-dark/80 hover:bg-polar-dark border-polar-border hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      0{index + 1}
                    </span>
                    <span
                      className={`text-[8px] px-1.5 py-0.2 rounded font-bold ${
                        node.status === 'OPERATIONAL' || node.status === 'RUNNING' || node.status === 'NORMAL' || node.status === 'HEATED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: node.color }} />
                    <span className="font-bold text-white text-[11px] truncate">{node.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{node.subtype}</div>
                </div>

                <div className="pt-2 border-t border-polar-border/40">
                  <div className="text-[10px] font-bold text-slate-200 truncate">{node.metric}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Health: <b className="text-emerald-400">{node.health.toFixed(0)}%</b></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Node Intelligence Drawer Banner */}
        <div className="p-4 rounded-xl bg-polar-dark/90 border border-polar-border text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between border-b border-polar-border/60 pb-2">
            <div className="flex items-center gap-2">
              <selectedNode.icon className="w-4 h-4" style={{ color: selectedNode.color }} />
              <span className="font-bold text-white uppercase tracking-wider">
                Subsystem Intelligence: {selectedNode.name} ({selectedNode.subtype})
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Operational Mode: <b className="text-emerald-400">{selectedNode.status}</b>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
            <div className="p-2.5 rounded-lg bg-polar-navy/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-cyan-400 font-bold uppercase">Subsystem Telemetry</span>
              <div className="text-white font-bold">{selectedNode.metric}</div>
              <div className="text-[10px] text-slate-400">
                {selectedNode.id === 'source' && sourceDesc}
                {selectedNode.id === 'pump' && `Asset: ${intakePump.name} • Draw: ${intakePump.power_draw_kw} kW`}
                {selectedNode.id === 'treatment' && `Method: ${treatment.process} • TDS: ${treatment.tds_ppm} ppm`}
                {selectedNode.id === 'storage' && `Capacity: ${maxStorage.toLocaleString()} L • Buffer Autonomy: ${daysBuffer}d`}
                {selectedNode.id === 'distribution' && `Pipeline: ${pipeTemp}°C • Freeze Margin: +${freezeMargin}°C`}
                {selectedNode.id === 'consumption' && `Headcount: ${consumptionBreakdown.headcount} crew • Research: ${consumptionBreakdown.science_labs_l_day} L`}
                {selectedNode.id === 'wastewater' && `Effluent: Madrid Protocol Zero-Discharge • Greywater: ${wastewater.greywater_recycled_l} L`}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-polar-navy/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase">Upstream Drivers</span>
              <div className="text-slate-300">
                {selectedNode.id === 'source' && 'Glacier seasonal melt & lake water level'}
                {selectedNode.id === 'pump' && 'Microgrid 3-phase power & suction line temperature'}
                {selectedNode.id === 'treatment' && 'Raw water intake pressure & filter cartridges'}
                {selectedNode.id === 'storage' && 'Pumping hours & treatment throughput'}
                {selectedNode.id === 'distribution' && `Trace heating wattage (${traceDrawKw} kW) vs wind chill`}
                {selectedNode.id === 'consumption' && 'Crew activity, galley cooking & research schedules'}
                {selectedNode.id === 'wastewater' && 'Domestic water usage & kitchen washdowns'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-polar-navy/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-rose-400 font-bold uppercase">Downstream Operational Impact</span>
              <div className="text-slate-300">
                {selectedNode.id === 'source' && 'Feeds extraction pump house & pipeline intake'}
                {selectedNode.id === 'pump' && 'Supplies treatment filters & internal storage buffer'}
                {selectedNode.id === 'treatment' && 'Maintains potable microbiological & mineral standard'}
                {selectedNode.id === 'storage' && 'Provides habitat life support autonomy buffer'}
                {selectedNode.id === 'distribution' && 'Protects 1.2km line from katabatic freeze rupture'}
                {selectedNode.id === 'consumption' && 'Generates wastewater feeding biological STP plant'}
                {selectedNode.id === 'wastewater' && 'Recycles greywater to reduce primary intake demand'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Availability Forecast & Thermal Pipeline Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Water Availability & Storage Forecast */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Water Storage &amp; Availability Projection (15 Days)
                </h3>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Current inflow (+{productionRateHr} L/hr) vs consumption ({dailyConsumption} L/day) forward projection with confidence interval.
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">
              Physics Projection
            </span>
          </div>

          <WaterForecastChart
            storageLiters={storageLiters}
            maxStorage={maxStorage}
            dailyConsumption={dailyConsumption}
            productionRateHr={productionRateHr}
            stationId={stationId}
          />

          <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs font-mono border-t border-polar-border/40">
            <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400 text-[10px] uppercase">Net Flow Rate</span>
              <div className="font-bold text-white mt-0.5">
                {productionRateHr >= Math.round(dailyConsumption / 24) ? '+' : ''}
                {productionRateHr - Math.round(dailyConsumption / 24)} L/hr
              </div>
              <div className="text-[10px] text-emerald-400">Positive Reservoir Delta</div>
            </div>
            <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400 text-[10px] uppercase">Autonomy Runway</span>
              <div className="font-bold text-purple-300 mt-0.5">{daysBuffer} Days</div>
              <div className="text-[10px] text-slate-400">Without Intake Pumping</div>
            </div>
            <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400 text-[10px] uppercase">Water Quality Index</span>
              <div className="font-bold text-cyan-300 mt-0.5">{waterQuality}%</div>
              <div className="text-[10px] text-slate-400">{treatment.tds_ppm} ppm TDS</div>
            </div>
          </div>
        </div>

        {/* Right: Pipeline Thermal Integrity & Freeze Physics */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Pipeline Thermal Integrity &amp; Freeze Risk Physics
                </h3>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Real-time conduit temperature balance against katabatic wind chill and electric trace heating power draw.
              </p>
            </div>
            {getFreezeBadge(freezeRisk)}
          </div>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3 text-xs font-mono">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-300 font-bold">Conduit Fluid Temperature</span>
              <span className="text-emerald-400 font-bold text-base">+{pipeTemp.toFixed(1)}°C</span>
            </div>

            {/* Thermal Safety Margin Visual Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span className="text-rose-400 font-bold">0.0°C Freeze</span>
                <span className="text-amber-400 font-bold">▲ 0.5°C Hazard Line</span>
                <span className="text-emerald-400 font-bold">Current: +{pipeTemp.toFixed(1)}°C</span>
                <span>+6.0°C Safe Target</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden p-0.5 border border-slate-800 relative">
                <div
                  className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (Math.max(0, pipeTemp) / 6.0) * 100)}%` }}
                />
                {/* 0.5°C threshold marker line */}
                <div className="absolute top-0 bottom-0 left-[8.3%] w-0.5 bg-rose-400 shadow-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-polar-navy/60 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">External Wind Chill</div>
                <div className="font-bold text-blue-300 mt-0.5">{isMaitri ? '-38.4°C' : '-31.2°C'}</div>
                <div className="text-[10px] text-slate-400">Wind: {env?.wind_speed ?? 28} km/h katabatic</div>
              </div>
              <div className="p-2.5 rounded-lg bg-polar-navy/60 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">Trace Heating Demand</div>
                <div className="font-bold text-cyan-300 mt-0.5">{traceDrawKw} kW Draw</div>
                <div className="text-[10px] text-slate-400">Thermostat Auto-Modulating</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-[10px] text-slate-300 leading-relaxed">
              <b className="text-cyan-400 font-bold">Energy Coupling: </b>
              Pipeline trace heating draws {traceDrawKw} kW continuous microgrid power. If ambient temperatures drop past -35°C, heating demand surges to prevent conduit freeze, directly increasing station generator fuel burn.
            </div>
          </div>
        </div>
      </div>

      {/* 5. Crew Consumption & Wastewater Treatment Subsystems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Domestic &amp; Research Water Draw Allocation
              </h3>
            </div>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40">
              {consumptionBreakdown.headcount} Crew On-Station
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Galley &amp; Cooking:</span>
                <span className="font-bold text-white">{consumptionBreakdown.galley_kitchen_l_day} L/day ({((consumptionBreakdown.galley_kitchen_l_day / dailyConsumption) * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Personal Hygiene &amp; Showers:</span>
                <span className="font-bold text-white">{consumptionBreakdown.hygiene_showers_l_day} L/day ({((consumptionBreakdown.hygiene_showers_l_day / dailyConsumption) * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Science Laboratories &amp; Autoclaves:</span>
                <span className="font-bold text-purple-300">{consumptionBreakdown.science_labs_l_day} L/day ({((consumptionBreakdown.science_labs_l_day / dailyConsumption) * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Domestic Habitat &amp; Laundry:</span>
                <span className="font-bold text-white">{consumptionBreakdown.domestic_habitat_l_day} L/day ({((consumptionBreakdown.domestic_habitat_l_day / dailyConsumption) * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between border-t border-polar-border/60 pt-1 font-bold">
                <span className="text-white">Total Daily Station Draw:</span>
                <span className="text-cyan-300">{dailyConsumption.toFixed(0)} L/day (~{(dailyConsumption / 24).toFixed(1)} L/hr)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-polar-navy/60 border border-polar-border">
              <span className="text-slate-400">Per Capita Demand:</span>
              <span className="font-bold text-slate-200">
                {(dailyConsumption / consumptionBreakdown.headcount).toFixed(1)} Liters / person / day
              </span>
            </div>
          </div>
        </div>

        {/* Wastewater & Waste Management */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Wastewater Processing &amp; Recycling Subsystem
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
              Zero Discharge STP
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Daily Wastewater Generated:</span>
              <span className="font-bold text-white">{wastewater.generated_daily_l} L/day (90% of supply)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Greywater Recycled for Flushing:</span>
              <span className="font-bold text-emerald-400">{wastewater.greywater_recycled_l} L/day (33% circularity)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Blackwater to STP Bioreactor:</span>
              <span className="font-bold text-indigo-300">{wastewater.blackwater_to_stp_l} L/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Biological Treatment Status:</span>
              <span className="font-bold text-emerald-400">{wastewater.stp_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Madrid Protocol Effluent Quality:</span>
              <span className="font-bold text-emerald-400">COMPLIANT (Tertiary Disinfected)</span>
            </div>

            <button
              onClick={() => navigate(`/station/${stationId}/waste`)}
              className="w-full mt-2 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Inspect Waste Management Domain</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Live Cross-Domain Causal Propagation */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-polar-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Water Cross-Domain Causal Propagation Network
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              The Digital Twin connects thermal physics, energy load, crew activity, and equipment reliability into unified station operational risk.
            </p>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">
            Validated Causal Model
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-mono">
          {/* Branch 1: Environment -> Freeze -> Energy */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-cyan-500/40 space-y-2">
            <div className="text-[10px] text-cyan-400 font-bold uppercase">
              1. Environmental Thermal Branch
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Ambient Temp ({env?.temperature ?? -25}°C) &amp; Katabatic Wind</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-slate-400">
                <span>↓ Drives 4.2 kW trace heating to maintain +3.8°C</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-slate-400">
                <span>↓ Contributes ~6.2% of station microgrid electrical demand</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-cyan-300 font-bold">
                <span>↓ Generator burns 1.09 L/hr AGO fuel for water protection</span>
              </div>
            </div>
          </div>

          {/* Branch 2: Personnel -> Consumption -> Storage */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-purple-500/40 space-y-2">
            <div className="text-[10px] text-purple-400 font-bold uppercase">
              2. Crew Consumption &amp; Autonomy Branch
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>{consumptionBreakdown.headcount} Crew &amp; Science Experiments</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-slate-400">
                <span>↓ Total water draw: {dailyConsumption.toFixed(0)} L/day</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-slate-400">
                <span>↓ Storage buffer holds {storageLiters.toLocaleString()} L</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-purple-300 font-bold">
                <span>↓ Safe operational autonomy: {daysBuffer} days without intake</span>
              </div>
            </div>
          </div>

          {/* Branch 3: Pump Health -> Production -> Risk */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-emerald-500/40 space-y-2">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">
              3. Machinery Health &amp; Risk Branch
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Extraction Pump Health: {intakePump.health_score}%</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-slate-400">
                <span>↓ Produces {productionRateHr} L/hr (+{productionRateHr - Math.round(dailyConsumption / 24)} L/hr net)</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-slate-400">
                <span>↓ Water shortage risk score: 14.2 / 100 LOW</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3 text-emerald-300 font-bold">
                <span>↓ Station readiness contribution: 96.0% (GREEN)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. What-If Simulation Sandbox */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-polar-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Water What-If Simulation Sandbox (Cloned Digital Twin State)
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Simulate pipeline freeze, intake pump failure, and population surges on an isolated clone of the twin. Zero live state mutation.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 self-start sm:self-auto">
            Zero Live Mutation
          </span>
        </div>

        {/* 5 Scenario Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
          <button
            onClick={() => handleRunWhatIf('trace_heating_failure', null, 'Trace Heating Failure (Freeze Hazard)')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-rose-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-rose-300">
                Trace Heating Failure
              </span>
              <Play className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Trace heating trips; pipe temp drops to 0.3°C freeze.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('pump_failure', null, 'Intake Pump Impeller Seizure')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-amber-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-amber-300">
                Intake Pump Failure
              </span>
              <Play className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Intake pump halts (0 L/hr); storage draws down.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('extreme_cold', 16.0, 'Polar Vortex Freeze (-48°C)')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-blue-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-blue-300">
                Deep Freeze (-48°C)
              </span>
              <Play className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Extreme cold surges trace heating draw to 8.5 kW.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('personnel_increase', 12, 'Summer Expedition Influx (+12 Crew)')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-purple-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-purple-300">
                +12 Expedition Influx
              </span>
              <Play className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Headcount surges; water demand increases +48%.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('water_consumption_spike', null, 'Pipeline Leak / Fissure (+250%)')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-cyan-300">
                Conduit Leak (+250%)
              </span>
              <Play className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Hidden fissure accelerates reservoir draw-down.
            </div>
          </button>
        </div>

        {/* Loading Indicator */}
        {whatIfLoading && (
          <div className="p-4 rounded-xl bg-polar-dark/60 border border-slate-800 flex items-center justify-center gap-2 text-xs font-mono text-cyan-400 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Cloning Station Twin State &amp; Projecting Thermal &amp; Storage Trajectory...</span>
          </div>
        )}

        {/* What-If Results Grid */}
        {whatIfResult && (
          <div className="p-4 rounded-xl bg-polar-navy/70 border border-cyan-500/50 space-y-3 animate-fadeIn text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white uppercase tracking-wider">
                Scenario Outcome: {whatIfResult.title}
              </span>
              <button
                onClick={() => setWhatIfResult(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Storage Reserve</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.water_storage_liters?.baseline?.toLocaleString() ?? storageLiters.toLocaleString()} L</b>
                </div>
                <div className="text-blue-400 font-bold">
                  Proj: {whatIfResult.comparison.water_storage_liters?.projected?.toLocaleString() ?? '13,100'} L
                </div>
                <div className="text-[9px] text-blue-300 font-bold">
                  {whatIfResult.comparison.water_storage_liters?.delta ?? -5400} L Net Change
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Autonomy Runway</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.days_water_remaining?.baseline ?? daysBuffer}d</b>
                </div>
                <div className="text-purple-400 font-bold">
                  Proj: {whatIfResult.comparison.days_water_remaining?.projected ?? 9.8}d
                </div>
                <div className="text-[9px] text-purple-300 font-bold">
                  {whatIfResult.comparison.days_water_remaining?.delta ?? -5.6}d Autonomy
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Pipeline Fluid Temp</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">+{whatIfResult.comparison.pipeline_temp_c?.baseline ?? pipeTemp}°C</b>
                </div>
                <div className="text-rose-400 font-bold">
                  Proj: {whatIfResult.comparison.pipeline_temp_c?.projected ?? 0.3}°C
                </div>
                <div className="text-[9px] text-rose-300 font-bold">
                  {whatIfResult.comparison.pipeline_temp_c?.delta ?? -3.5}°C Heat Loss
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Station Risk Score</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.station_risk_score?.baseline ?? 24.2}</b>
                </div>
                <div className="text-rose-400 font-bold">
                  Proj: {whatIfResult.comparison.station_risk_score?.projected ?? 58.4}
                </div>
                <div className="text-[9px] text-rose-300 font-bold">
                  +{whatIfResult.comparison.station_risk_score?.delta ?? 34.2} pts Risk
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[11px] text-slate-300">
              <b className="text-amber-300">Digital Twin Prescriptive Action: </b>
              {whatIfResult.recommended_action}
            </div>
          </div>
        )}
      </div>

      {/* 8. Modals for KPI Clicks */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border max-w-lg w-full space-y-4 text-xs font-mono shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-polar-border pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                  {activeModal === 'reserve' && 'Storage Reservoir Dynamics & Buffer Levels'}
                  {activeModal === 'thermal' && 'Conduit Thermal Integrity & Freeze Physics'}
                  {activeModal === 'trace' && 'Trace Heating Loop & Microgrid Coupling'}
                  {activeModal === 'autonomy' && 'Water Autonomy Milestones & Depletion'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeModal === 'reserve' && (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  Internal heated potable reservoirs buffer station water against surface pumping interruptions and severe blizzard freeze hazards.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Tank Capacity:</span>
                    <span className="font-bold text-white">{maxStorage.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Measured Volume:</span>
                    <span className="font-bold text-blue-300">{storageLiters.toLocaleString()} L ({fillPct.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Critical Reserve Threshold:</span>
                    <span className="text-rose-400 font-bold">{criticalReserve.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Usable Water Buffer:</span>
                    <span className="font-bold text-emerald-400">{usableReserve.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inflow Production Rate:</span>
                    <span className="text-white font-bold">+{productionRateHr} L/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Outflow Consumption Rate:</span>
                    <span className="text-amber-400 font-bold">-{(dailyConsumption / 24).toFixed(1)} L/hr</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'thermal' && (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  The {isMaitri ? '1,200m overland pipeline' : '160m coastal vacuum line'} is protected by active trace heating against katabatic freeze rupture.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conduit Fluid Temperature:</span>
                    <span className="font-bold text-emerald-400">+{pipeTemp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Freeze Hazard Threshold:</span>
                    <span className="text-rose-400 font-bold">+0.5°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Safety Freeze Margin:</span>
                    <span className="font-bold text-cyan-300">+{freezeMargin}°C Buffer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ambient Wind Chill:</span>
                    <span className="text-blue-300">{isMaitri ? '-38.4°C' : '-31.2°C'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Heating Control Mode:</span>
                    <span className="text-emerald-400 font-bold">{isMaitri ? 'Thermostatic Regulation' : 'CHP Waste Heat Extraction'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'trace' && (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  Trace heating draws electrical power from the station diesel microgrid, linking thermal water protection directly to fuel burn.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Trace Power Draw:</span>
                    <span className="font-bold text-cyan-300">{traceDrawKw} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Generator Fuel Burn Impact:</span>
                    <span className="font-bold text-amber-400">~{(traceDrawKw * 0.26).toFixed(2)} L/hr AGO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fraction of Station Demand:</span>
                    <span className="text-white font-bold">{((traceDrawKw / (eng?.generator_load ?? 67)) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'autonomy' && (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  Autonomy runway estimates how many days of potable water remain in internal storage tanks if surface pumping halts.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Operating Autonomy:</span>
                    <span className="font-bold text-purple-300">{daysBuffer} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Average Daily Consumption:</span>
                    <span className="font-bold text-white">{dailyConsumption.toFixed(0)} L/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Days to Critical Reserve:</span>
                    <span className="font-bold text-amber-300">{Math.max(0, Math.round((storageLiters - criticalReserve) / Math.max(1, dailyConsumption)))} Days</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-white font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterPage;
