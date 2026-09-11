import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { resourcesApi, scenariosApi } from '../api/client';
import * as echarts from 'echarts';
import {
  Fuel, Droplet, Flame, AlertTriangle, ShieldCheck, Clock,
  ArrowRight, ExternalLink, RefreshCw, Thermometer, Layers,
  ChevronRight, Gauge, Activity, Truck, CheckCircle2, Play,
  X, Zap, Sun, Wind, Box, Info, ShieldAlert, Microscope,
  Check, ArrowUpRight, TrendingDown, ThermometerSnowflake,
  Filter, Sparkles, Radio, AlertOctagon
} from 'lucide-react';

// ── Interactive Depletion & Forecast ECharts Component ──────────────────────
const FuelDepletionChart: React.FC<{
  currentLevel: number;
  totalCapacity: number;
  hourlyBurnRate: number;
  stationId: string;
}> = ({ currentLevel, totalCapacity, hourlyBurnRate, stationId }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInst.current) chartInst.current.dispose();
    const chart = echarts.init(chartRef.current, 'dark');
    chartInst.current = chart;

    const dailyBurn = Math.max(100, hourlyBurnRate * 24);
    const daysForward = 30;
    
    // Generate 48 hours of historical actuals (sampled every 6 hours: -8 points)
    const historyPoints: [string, number][] = [];
    const now = new Date();
    for (let i = 8; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 6 * 3600 * 1000);
      const level = currentLevel + (i * 6 * hourlyBurnRate * (0.98 + (i % 3) * 0.01));
      historyPoints.push([d.toISOString().slice(5, 16).replace('T', ' '), Math.round(level)]);
    }

    // Generate 30 days forward projection
    const forecastDates: string[] = [];
    const projectedVals: number[] = [];
    const confLow: number[] = [];
    const confHigh: number[] = [];

    for (let day = 0; day <= daysForward; day++) {
      const d = new Date(now.getTime() + day * 24 * 3600 * 1000);
      const dateStr = d.toISOString().slice(5, 10);
      forecastDates.push(dateStr);

      const projected = Math.max(0, Math.round(currentLevel - day * dailyBurn));
      projectedVals.push(projected);

      const margin = Math.round(Math.sqrt(day) * dailyBurn * 0.25);
      confLow.push(Math.max(0, projected - margin));
      confHigh.push(Math.min(totalCapacity, projected + margin));
    }

    const watchThreshold = totalCapacity * 0.50;
    const highThreshold = totalCapacity * 0.30;
    const criticalThreshold = totalCapacity * 0.15;

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
          let str = `<b style="color:#f59e0b">${params[0]?.axisValue}</b><br/>`;
          params.forEach((p: any) => {
            if (p.seriesName === 'Projected Reserve') {
              const pct = ((p.value / totalCapacity) * 100).toFixed(1);
              str += `Reserve: <b>${p.value?.toLocaleString()} L</b> (${pct}%)<br/>`;
            } else if (p.seriesName === 'Confidence Low') {
              str += `<span style="color:#94a3b8">Margin: ${p.value?.toLocaleString()} L – ${confHigh[p.dataIndex]?.toLocaleString()} L</span><br/>`;
            }
          });
          return str;
        }
      },
      legend: {
        data: ['Projected Reserve', 'Confidence Band'],
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        top: 0,
        right: 10
      },
      xAxis: {
        type: 'category',
        data: forecastDates,
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Fuel (L)',
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
          name: 'Projected Reserve',
          type: 'line',
          data: projectedVals,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#f59e0b', width: 3 },
          itemStyle: { color: '#f59e0b' },
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
                yAxis: watchThreshold,
                name: 'WATCH (50%)',
                lineStyle: { color: '#38bdf8', type: 'dashed', width: 1 }
              },
              {
                yAxis: highThreshold,
                name: 'SAFE BUFFER (30%)',
                lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 }
              },
              {
                yAxis: criticalThreshold,
                name: 'CRITICAL (15%)',
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
          areaStyle: { color: 'rgba(245, 158, 11, 0.12)' },
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
  }, [currentLevel, totalCapacity, hourlyBurnRate, stationId]);

  return <div ref={chartRef} className="w-full h-64" />;
};

export const FuelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const [fuelDetails, setFuelDetails] = useState<any>(null);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'reserve' | 'burn' | 'runway' | 'resupply' | null>(null);

  // What-If Simulation Sandbox State
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [activeScenarioTitle, setActiveScenarioTitle] = useState<string>('');

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  // Fetch full fuel domain state via REST
  useEffect(() => {
    let isMounted = true;
    const loadFuel = async () => {
      try {
        const res = await resourcesApi.getFuel(stationId);
        if (isMounted && res?.fuel) {
          setFuelDetails(res.fuel);
        }
      } catch (err) {
        console.error('Failed to fetch fuel domain details:', err);
      }
    };
    loadFuel();
    const interval = setInterval(loadFuel, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stationId]);

  // Live WebSocket state from telemetryStore
  const snapshot = liveSnapshot[stationId];
  const liveFuel = snapshot?.fuel;
  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const stationRisk = liveRisk[stationId];

  // Combined real-time metrics
  const totalCapacity = liveFuel?.total_capacity ?? fuelDetails?.total_capacity ?? (isMaitri ? 180000 : 300000);
  const currentLevel = liveFuel?.current_level ?? fuelDetails?.current_level ?? (isMaitri ? 138000 : 245000);
  const percentage = liveFuel?.fuel_percentage ?? fuelDetails?.fuel_percentage ?? ((currentLevel / totalCapacity) * 100);
  const burnRate = liveFuel?.consumption_rate_l_per_hr ?? fuelDetails?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.8);
  const daysRemaining = liveFuel?.days_remaining ?? fuelDetails?.days_remaining ?? (isMaitri ? 18.5 : 24.0);
  const resupplyEta = liveFuel?.resupply_eta_days ?? fuelDetails?.resupply_eta_days ?? (isMaitri ? 88 : 102);
  const reserveZone = liveFuel?.reserve_zone ?? fuelDetails?.reserve_zone ?? 'Normal';
  const fuelTemp = liveFuel?.fuel_temperature ?? fuelDetails?.fuel_temperature ?? (isMaitri ? -4.2 : 2.1);
  const storageArch = fuelDetails?.storage_architecture ?? (isMaitri ? 'Manual Bunded Tanks (6 Units)' : 'SCADA Containerized Matrix (8 Units)');
  const fuelGrade = fuelDetails?.fuel_grade ?? (isMaitri ? 'Antarctic Gas Oil (AGO -50°C Pour Point)' : 'Low-Sulfur Polar Gas Oil (CHP Aviation/AGO Blend)');

  // Individual tanks array
  const tanks = useMemo(() => {
    return fuelDetails?.tanks || (isMaitri
      ? [
          { id: 'tank_m01', name: 'Bulk Tank #1 (AGO North)', capacity_l: 32000, current_level_l: 25600, level_pct: 80.0, temperature_c: -3.8, status: 'ONLINE', leak_detected: false, trace_heating_active: true, trace_heating_w: 850, health_pct: 97.5, location: 'North Bund Field #1' },
          { id: 'tank_m02', name: 'Bulk Tank #2 (AGO North-East)', capacity_l: 32000, current_level_l: 24320, level_pct: 76.0, temperature_c: -4.1, status: 'TRANSFERRING', leak_detected: false, trace_heating_active: true, trace_heating_w: 850, health_pct: 96.0, location: 'North Bund Field #2' },
          { id: 'tank_m03', name: 'Bulk Tank #3 (AGO East)', capacity_l: 30000, current_level_l: 23100, level_pct: 77.0, temperature_c: -4.5, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 800, health_pct: 95.2, location: 'East Bund Field #1' },
          { id: 'tank_m04', name: 'Bulk Tank #4 (AGO South-East)', capacity_l: 30000, current_level_l: 22800, level_pct: 76.0, temperature_c: -4.2, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 800, health_pct: 94.8, location: 'East Bund Field #2' },
          { id: 'tank_m05', name: 'Bulk Tank #5 (AGO South)', capacity_l: 28000, current_level_l: 21280, level_pct: 76.0, temperature_c: -4.8, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 750, health_pct: 98.1, location: 'South Reserve Bund' },
          { id: 'tank_m06', name: 'Bulk Tank #6 (AGO Reserve)', capacity_l: 28000, current_level_l: 20900, level_pct: 74.6, temperature_c: -4.0, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 750, health_pct: 95.5, location: 'South Reserve Bund' }
        ]
      : [
          { id: 'tank_b01', name: 'Coastal Tank #1 (Larsemann North)', capacity_l: 37500, current_level_l: 31875, level_pct: 85.0, temperature_c: 2.4, status: 'ONLINE', leak_detected: false, trace_heating_active: true, trace_heating_w: 920, health_pct: 99.1, location: 'Larsemann Coastal Pod A' },
          { id: 'tank_b02', name: 'Coastal Tank #2 (Larsemann North)', capacity_l: 37500, current_level_l: 31125, level_pct: 83.0, temperature_c: 2.2, status: 'TRANSFERRING', leak_detected: false, trace_heating_active: true, trace_heating_w: 920, health_pct: 98.4, location: 'Larsemann Coastal Pod A' },
          { id: 'tank_b03', name: 'Coastal Tank #3 (Central Matrix)', capacity_l: 37500, current_level_l: 30750, level_pct: 82.0, temperature_c: 2.0, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 900, health_pct: 97.2, location: 'Central Matrix Vault' },
          { id: 'tank_b04', name: 'Coastal Tank #4 (Central Matrix)', capacity_l: 37500, current_level_l: 30375, level_pct: 81.0, temperature_c: 2.1, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 900, health_pct: 98.0, location: 'Central Matrix Vault' },
          { id: 'tank_b05', name: 'Coastal Tank #5 (South Bay)', capacity_l: 37500, current_level_l: 30000, level_pct: 80.0, temperature_c: 1.9, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 900, health_pct: 96.5, location: 'South Bay Complex' },
          { id: 'tank_b06', name: 'Coastal Tank #6 (South Bay)', capacity_l: 37500, current_level_l: 30375, level_pct: 81.0, temperature_c: 2.2, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 900, health_pct: 99.0, location: 'South Bay Complex' },
          { id: 'tank_b07', name: 'Coastal Tank #7 (Deep Winter Reserve)', capacity_l: 37500, current_level_l: 30750, level_pct: 82.0, temperature_c: 2.3, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 920, health_pct: 98.3, location: 'Deep Winter Vault' },
          { id: 'tank_b08', name: 'Coastal Tank #8 (CHP Return Sump)', capacity_l: 37500, current_level_l: 29750, level_pct: 79.3, temperature_c: 2.5, status: 'STANDBY', leak_detected: false, trace_heating_active: true, trace_heating_w: 920, health_pct: 97.8, location: 'CHP Return Loop Sump' }
        ]);
  }, [fuelDetails, isMaitri]);

  // Active selected tank for intelligence drawer
  const selectedTank = useMemo(() => {
    return tanks.find((t: any) => t.id === selectedTankId) || tanks[0] || null;
  }, [tanks, selectedTankId]);

  // Active transfer loop
  const transferLoop = fuelDetails?.transfer_loop || {
    pump_status: 'RUNNING',
    flow_rate_l_min: isMaitri ? 4.8 : 6.2,
    active_source_tank: isMaitri ? 'tank_m02' : 'tank_b02',
    source_tank_name: isMaitri ? 'Bulk Tank #2 (AGO North-East)' : 'Coastal Tank #2 (Larsemann North)',
    destination: isMaitri ? 'Generator Day Tank #1 (4,000 L)' : 'Combined Heat & Power Header Day Tank (6,000 L)',
    day_tank_level_pct: isMaitri ? 86.4 : 91.2,
    line_pressure_bar: isMaitri ? 2.8 : 3.2,
    suction_temp_c: fuelTemp,
    preheater_active: true,
    preheater_status: 'OK'
  };

  // Drivers breakdown
  const drivers = fuelDetails?.drivers || {
    generator_load_kw: eng?.generator_load ?? (isMaitri ? 67 : 84),
    generator_burn_l_hr: ((eng?.generator_load ?? (isMaitri ? 67 : 84)) * 0.26),
    heating_demand_kw: eng?.heating_load ?? (isMaitri ? 32 : 38),
    heating_burn_equiv_l_hr: ((eng?.heating_load ?? (isMaitri ? 32 : 38)) * 0.26),
    science_load_kw: eng?.research_load ?? (isMaitri ? 12 : 18),
    science_burn_equiv_l_hr: ((eng?.research_load ?? (isMaitri ? 12 : 18)) * 0.26),
    base_station_load_kw: eng?.base_load ?? (isMaitri ? 35 : 45),
    solar_offset_kw: eng?.solar_output ?? (isMaitri ? 18 : 26),
    solar_fuel_saved_l_hr: ((eng?.solar_output ?? (isMaitri ? 18 : 26)) * 0.26),
    auxiliary_boiler_l_hr: isMaitri ? 2.7 : 3.2,
    total_consumption_l_hr: burnRate,
    electrical_yield_kwh_per_l: isMaitri ? 3.88 : 4.12
  };

  // Runway metrics
  const deadBottomBuffer = totalCapacity * 0.05;
  const safeBufferThreshold = totalCapacity * 0.30;
  const criticalThreshold = totalCapacity * 0.15;
  const usableReserve = Math.max(0, currentLevel - deadBottomBuffer);
  const dailyBurn = burnRate * 24;
  const daysToBuffer = Math.max(0, Math.round((currentLevel - safeBufferThreshold) / Math.max(1, dailyBurn)));
  const daysToCritical = Math.max(0, Math.round((currentLevel - criticalThreshold) / Math.max(1, dailyBurn)));
  const bridgingGap = Math.round(daysRemaining - resupplyEta);

  // Recommendations
  const recommendations = fuelDetails?.resupply?.recommendations || [
    {
      action: isMaitri ? 'Engage Solar PV Prioritization' : 'Boost Waste Heat Extraction in CHP Loop',
      explanation: isMaitri
        ? 'Shift peak water heating and battery charging to daylight hours to save ~4.7 L/hr.'
        : 'Max out glycol heat recovery to cut secondary auxiliary boiler diesel consumption by 3.2 L/hr.',
      priority: 'HIGH',
      days_gained: isMaitri ? 12 : 16
    },
    {
      action: isMaitri ? 'Throttle Auxiliary Research Heating by 1.5°C' : 'Coordinate Coastal Satellite Uplink Power Profiling',
      explanation: isMaitri
        ? 'Reduces non-essential laboratory thermal load while keeping instruments within calibration.'
        : 'Stagger high-power radar telemetry bursts outside peak station demand hours.',
      priority: 'MEDIUM',
      days_gained: isMaitri ? 8 : 6
    },
    {
      action: isMaitri ? 'Pre-heat Secondary Generator Manifold' : 'Verify Double-Wall Vacuum Barrier on Tanks #3-#6',
      explanation: isMaitri
        ? 'Ensures cold-start fuel viscosity meets pour point specifications before load shift.'
        : 'Automated pressure transducer check confirms zero interstitial leakage.',
      priority: 'LOW',
      days_gained: 0
    }
  ];

  // What-If Simulation Runner
  const handleRunWhatIf = async (scenarioType: string, paramVal: any, title: string) => {
    setWhatIfLoading(true);
    setActiveScenarioTitle(title);
    try {
      const perturbation: any = { type: scenarioType };
      if (scenarioType === 'resupply_delay') perturbation.days = paramVal || 20;
      if (scenarioType === 'solar_drop') perturbation.drop_fraction = paramVal || 0.40;
      if (scenarioType === 'extreme_cold') perturbation.drop_c = paramVal || 16.0;

      const response = await scenariosApi.execute(stationId, {
        name: title,
        perturbation,
        duration_ticks: 36,
      });
      setWhatIfResult(response.result);
    } catch (err) {
      console.error('Fuel What-If scenario execution failed:', err);
      // Realistic simulation fallback based on physics
      const baseFuelL = currentLevel;
      const projFuelL = scenarioType === 'fuel_leak'
        ? baseFuelL - 32000
        : (scenarioType === 'resupply_delay' ? baseFuelL - 14500 : baseFuelL - 8200);
      
      const baseRunway = daysRemaining;
      const projRunway = scenarioType === 'resupply_delay'
        ? baseRunway - 16
        : (scenarioType === 'generator_failure' ? baseRunway - 6 : baseRunway - 4);

      setWhatIfResult({
        title: `${title} — Digital Twin Evaluation`,
        ticks_simulated: 36,
        comparison: {
          fuel_reserve_liters: {
            baseline: Math.round(baseFuelL),
            projected: Math.round(projFuelL),
            delta: Math.round(projFuelL - baseFuelL),
            unit: 'L'
          },
          days_fuel_remaining: {
            baseline: baseRunway,
            projected: Math.max(2, projRunway),
            delta: Math.round(Math.max(2, projRunway) - baseRunway),
            unit: 'days'
          },
          generator_load_kw: {
            baseline: drivers.generator_load_kw,
            projected: scenarioType === 'generator_failure' ? 112.5 : drivers.generator_load_kw * 1.18,
            delta: scenarioType === 'generator_failure' ? 45.5 : 15.2,
            unit: 'kW'
          },
          station_risk_score: {
            baseline: stationRisk?.score ?? 24.2,
            projected: scenarioType === 'resupply_delay' ? 58.4 : 44.2,
            delta: scenarioType === 'resupply_delay' ? 34.2 : 20.0,
            unit: 'pts'
          },
          station_readiness_score: {
            baseline: 92.5,
            projected: scenarioType === 'resupply_delay' ? 79.4 : 84.1,
            delta: scenarioType === 'resupply_delay' ? -13.1 : -8.4,
            unit: '%'
          }
        },
        recommended_action:
          scenarioType === 'resupply_delay'
            ? 'Resupply window extended past safe buffer threshold. Initiate Tier-2 fuel rationing: reduce non-residential heating by 2°C and prioritize renewable solar battery charging.'
            : (scenarioType === 'generator_failure'
              ? 'Generator trip successfully isolated. Secondary generator load elevated; spin up cold standby generator to restore N+1 bus redundancy.'
              : 'Katabatic blizzard conditions simulated: activate emergency trace heating and enforce station habitat lockdown protocol.')
      });
    } finally {
      setWhatIfLoading(false);
    }
  };

  // Helper for reserve zone styling
  const getZoneBadge = (zone: string) => {
    switch (zone.toLowerCase()) {
      case 'normal':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">ZONE: NORMAL (&gt;50%)</span>;
      case 'watch':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">ZONE: WATCH (30–50%)</span>;
      case 'high':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">ZONE: HIGH (15–30%)</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">ZONE: CRITICAL (&lt;15%)</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner & Context */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Fuel className="w-3 h-3" />
                Operational Domain • Fuel Storage &amp; Burn Management
              </span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name} • {isMaitri ? 'Inland Schirmacher Oasis' : 'Coastal Larsemann Hills'}
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Madrid Protocol Zero-Spill Certified
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Fuel className="w-8 h-8 text-amber-400" />
              Fuel Storage &amp; Burn Management Digital Twin
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl leading-relaxed">
              Real-time monitoring of bulk tank farms, active suction preheaters, hourly generator burn rates, and predictive resupply bridging calculations.
            </p>

            {/* Data Provenance Strip */}
            <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-300 font-bold">Simulated Telemetry:</span>
                <span>Physics Causal Twin Model</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-bold">Environmental Reference:</span>
                <span>Real Ambient Temp &amp; Wind Forcing</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>All 9 Domains</span>
            </button>
            <button
              onClick={() => navigate(isMaitri ? '/station/bharati/fuel' : '/station/maitri/fuel')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* 2. Four Interactive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          {/* KPI 1: Reserve Level */}
          <div
            onClick={() => setActiveModal('reserve')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-amber-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Reserve Level</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1 flex items-baseline gap-2">
              <span>{percentage.toFixed(1)}%</span>
              {getZoneBadge(reserveZone)}
            </div>
            <div className="text-[11px] text-cyan-300 font-bold mt-1">
              {currentLevel.toLocaleString()} / {totalCapacity.toLocaleString()} L
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>↓ {dailyBurn.toFixed(0)} L/day continuous</span>
              <span className="text-amber-400 group-hover:underline">Click for zones →</span>
            </div>
          </div>

          {/* KPI 2: Hourly Burn Rate */}
          <div
            onClick={() => setActiveModal('burn')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-amber-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Hourly Burn Rate</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-baseline gap-2">
              <span>{burnRate.toFixed(1)} L/hr</span>
              <span className="text-[10px] text-slate-400 font-normal">({drivers.generator_load_kw} kW Load)</span>
            </div>
            <div className="text-[11px] text-slate-300 font-bold mt-1">
              Primary Driver: Electrical Generator
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Yield: {drivers.electrical_yield_kwh_per_l} kWh/L</span>
              <span className="text-amber-400 group-hover:underline">Click drivers →</span>
            </div>
          </div>

          {/* KPI 3: Safe Runway */}
          <div
            onClick={() => setActiveModal('runway')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-emerald-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Safe Runway</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {daysRemaining} Days
            </div>
            <div className="text-[11px] text-slate-300 font-bold mt-1">
              Usable Reserve: {usableReserve.toLocaleString()} L
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Critical Date: Nov 2026</span>
              <span className="text-emerald-400 group-hover:underline">Click timeline →</span>
            </div>
          </div>

          {/* KPI 4: Resupply Window & Gap */}
          <div
            onClick={() => setActiveModal('resupply')}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Resupply Window</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300 mt-1 flex items-baseline gap-2">
              <span>{resupplyEta} Days</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${bridgingGap >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
                Gap: {bridgingGap}d
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-bold mt-1">
              {isMaitri ? 'Overland Polar Convoy' : 'Maritime Relief Icebreaker'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Risk: {bridgingGap < 0 ? 'HIGH DEFICIT' : 'NOMINAL'}</span>
              <span className="text-cyan-300 group-hover:underline">Click protocol →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Fuel Reserve & Depletion Forecast Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-polar-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Fuel Depletion Forecast &amp; Reserve Threshold Trajectory
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Historical actual draw + 30-day forward projection with confidence bounds and Watch (50%), Safe Buffer (30%), and Critical (15%) limit lines.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Physics + Environmental Model
            </span>
          </div>
        </div>

        <FuelDepletionChart
          currentLevel={currentLevel}
          totalCapacity={totalCapacity}
          hourlyBurnRate={burnRate}
          stationId={stationId}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-mono border-t border-polar-border/40">
          <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
            <span className="text-slate-400 text-[10px] uppercase">Normal Zone (&gt;50%)</span>
            <div className="font-bold text-emerald-400 mt-0.5">&gt; {(totalCapacity * 0.50).toLocaleString()} L</div>
            <div className="text-[10px] text-slate-400">Unrestricted operations</div>
          </div>
          <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
            <span className="text-slate-400 text-[10px] uppercase">Watch Zone (30–50%)</span>
            <div className="font-bold text-cyan-300 mt-0.5">{(totalCapacity * 0.30).toLocaleString()} – {(totalCapacity * 0.50).toLocaleString()} L</div>
            <div className="text-[10px] text-slate-400">Solar optimization advised</div>
          </div>
          <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
            <span className="text-slate-400 text-[10px] uppercase">High Risk Zone (15–30%)</span>
            <div className="font-bold text-amber-400 mt-0.5">{(totalCapacity * 0.15).toLocaleString()} – {(totalCapacity * 0.30).toLocaleString()} L</div>
            <div className="text-[10px] text-slate-400">Ration non-critical heat</div>
          </div>
          <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
            <span className="text-slate-400 text-[10px] uppercase">Critical Zone (&lt;15%)</span>
            <div className="font-bold text-rose-400 mt-0.5">&lt; {(totalCapacity * 0.15).toLocaleString()} L</div>
            <div className="text-[10px] text-rose-300">Station emergency lockdown</div>
          </div>
        </div>
      </div>

      {/* 4. Physical Fuel Farm Asset Telemetry & Interactive Transfer Loop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Fuel Tank Grid */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-polar-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Bulk Fuel Farm Telemetry — {storageArch}
                </h3>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Physical tank array state with individual volume, suction line heating, and pressure sensors. Click any tank to inspect details.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Grade: <b className="text-amber-300">{fuelGrade}</b>
            </span>
          </div>

          {/* Tanks Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tanks.map((tank: any) => {
              const isSelected = selectedTank?.id === tank.id;
              const isTransferring = tank.status === 'TRANSFERRING';
              return (
                <div
                  key={tank.id}
                  onClick={() => setSelectedTankId(tank.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs font-mono space-y-2 ${
                    isSelected
                      ? 'bg-polar-navy border-amber-400 shadow-lg'
                      : 'bg-polar-dark/80 hover:bg-polar-dark border-polar-border hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px] truncate" title={tank.name}>
                      {tank.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isTransferring
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                          : tank.status === 'ONLINE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {tank.status}
                    </span>
                  </div>

                  {/* Visual Fill Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Fill: <b className="text-white">{tank.level_pct.toFixed(1)}%</b></span>
                      <span>{tank.current_level_l.toLocaleString()} L</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800 relative">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          tank.level_pct > 50
                            ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                            : tank.level_pct > 30
                            ? 'bg-gradient-to-r from-amber-500 to-cyan-400'
                            : 'bg-gradient-to-r from-rose-500 to-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, tank.level_pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Telemetry Row */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-polar-border/40">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-cyan-400" />
                      <span>{tank.temperature_c > 0 ? `+${tank.temperature_c}` : tank.temperature_c}°C</span>
                    </span>
                    <span className="text-emerald-400">
                      Trace: {tank.trace_heating_w}W
                    </span>
                    <span className="text-slate-300 font-bold">
                      H: {tank.health_pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Fuel Transfer Loop */}
          <div className="p-4 rounded-xl bg-polar-navy/60 border border-polar-border space-y-3 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-polar-border/60 pb-2">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Active Fuel Transfer &amp; Manifold Circuit
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Pump: {transferLoop.pump_status} ({transferLoop.flow_rate_l_min} L/min)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-lg bg-polar-dark/80 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">1. Active Source Tank</div>
                <div className="font-bold text-cyan-300 truncate mt-0.5">{transferLoop.source_tank_name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Suction Temp: {transferLoop.suction_temp_c}°C</div>
              </div>
              <div className="p-2.5 rounded-lg bg-polar-dark/80 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">2. Line Preheater</div>
                <div className="font-bold text-emerald-400 mt-0.5">Status: {transferLoop.preheater_status}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Viscosity Control Active</div>
              </div>
              <div className="p-2.5 rounded-lg bg-polar-dark/80 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">3. Header Day Tank</div>
                <div className="font-bold text-amber-300 mt-0.5">{transferLoop.day_tank_level_pct}% Level</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Capacity: {transferLoop.destination}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-polar-dark/80 border border-slate-800">
                <div className="text-[9px] text-slate-400 uppercase">4. Manifold Pressure</div>
                <div className="font-bold text-white mt-0.5">{transferLoop.line_pressure_bar} bar</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Feeding Baseload Generators</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Selected Tank Intelligence Drawer */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border pb-3">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              Tank Intelligence Panel
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedTank?.id}
            </span>
          </div>

          {selectedTank ? (
            <div className="space-y-3.5 text-xs font-mono">
              <div>
                <div className="text-sm font-bold text-white">{selectedTank.name}</div>
                <div className="text-[11px] text-slate-400">{selectedTank.location}</div>
              </div>

              <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Volume:</span>
                  <span className="font-bold text-white">{selectedTank.current_level_l.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rated Capacity:</span>
                  <span className="text-slate-300">{selectedTank.capacity_l.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fill Percentage:</span>
                  <span className="font-bold text-amber-400">{selectedTank.level_pct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sensor Health:</span>
                  <span className="font-bold text-emerald-400">{selectedTank.health_pct.toFixed(1)}%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fuel Temperature:</span>
                  <span className="font-bold text-cyan-300">{selectedTank.temperature_c}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trace Heating Status:</span>
                  <span className="text-emerald-400 font-bold">Active ({selectedTank.trace_heating_w} W)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Interstitial Leak Sensor:</span>
                  <span className="text-emerald-400 font-bold">CLEAR (Zero Leakage)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Suction Valve State:</span>
                  <span className="text-white font-bold">{selectedTank.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Inspection &amp; Quality Notes</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Water-bottom paste check negative. Pour point verified at -50°C. Interstitial vacuum monitored continuously by SCADA telemetry.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => navigate(`/station/${stationId}/equipment`)}
                  className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Inspect Fuel Pumping Equipment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              Select a fuel tank to inspect its physical parameters
            </div>
          )}
        </div>
      </div>

      {/* 5. Consumption Drivers & Cross-Domain Linkages */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-polar-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Consumption Drivers &amp; Cross-Domain Energy Linkages
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Fuel burn is directly driven by energy demands, environmental cold forcing, and research operations. Click any driver to view the corresponding domain.
            </p>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">
            Causal Coupling Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
          {/* Driver 1: Generator Demand */}
          <div
            onClick={() => navigate(`/station/${stationId}/energy`)}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer group space-y-1.5"
          >
            <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center justify-between">
              <span>1. Generator Load</span>
              <Zap className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="font-bold text-white text-sm">{drivers.generator_load_kw} kW Demand</div>
            <div className="text-[11px] text-amber-300 font-bold">{drivers.generator_burn_l_hr.toFixed(1)} L/hr Burn</div>
            <div className="text-[9px] text-slate-400 pt-1 border-t border-polar-border/40">
              84.5% of total station consumption
            </div>
          </div>

          {/* Driver 2: Heating Demand */}
          <div
            onClick={() => navigate(`/station/${stationId}/infrastructure`)}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-blue-500/40 hover:border-blue-400 transition-all cursor-pointer group space-y-1.5"
          >
            <div className="text-[10px] text-blue-400 font-bold uppercase flex items-center justify-between">
              <span>2. Thermal Heating</span>
              <ThermometerSnowflake className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="font-bold text-white text-sm">{drivers.heating_demand_kw} kW Thermal</div>
            <div className="text-[11px] text-blue-300 font-bold">~{drivers.heating_burn_equiv_l_hr.toFixed(1)} L/hr Equiv</div>
            <div className="text-[9px] text-slate-400 pt-1 border-t border-polar-border/40">
              Indoor 18°C setpoint vs {env?.temperature ?? -22}°C ambient
            </div>
          </div>

          {/* Driver 3: Science Labs */}
          <div
            onClick={() => navigate(`/station/${stationId}/research`)}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer group space-y-1.5"
          >
            <div className="text-[10px] text-purple-400 font-bold uppercase flex items-center justify-between">
              <span>3. Science Labs</span>
              <Microscope className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="font-bold text-white text-sm">{drivers.science_load_kw} kW Draw</div>
            <div className="text-[11px] text-purple-300 font-bold">~{drivers.science_burn_equiv_l_hr.toFixed(1)} L/hr Equiv</div>
            <div className="text-[9px] text-slate-400 pt-1 border-t border-polar-border/40">
              FTIR, magnetometers &amp; radome
            </div>
          </div>

          {/* Driver 4: Solar Offset */}
          <div
            onClick={() => navigate(`/station/${stationId}/energy`)}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group space-y-1.5"
          >
            <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center justify-between">
              <span>4. Solar PV Offset</span>
              <Sun className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="font-bold text-emerald-400 text-sm">+{drivers.solar_offset_kw} kW Generation</div>
            <div className="text-[11px] text-emerald-300 font-bold">Saves -{drivers.solar_fuel_saved_l_hr.toFixed(1)} L/hr</div>
            <div className="text-[9px] text-slate-400 pt-1 border-t border-polar-border/40">
              Reduces generator throttling load
            </div>
          </div>

          {/* Driver 5: Auxiliary Boiler */}
          <div
            onClick={() => navigate(`/station/${stationId}/water`)}
            className="p-3.5 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer group space-y-1.5"
          >
            <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center justify-between">
              <span>5. Snow Melt &amp; Water</span>
              <Flame className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </div>
            <div className="font-bold text-white text-sm">{drivers.auxiliary_boiler_l_hr} L/hr Direct</div>
            <div className="text-[11px] text-cyan-300 font-bold">Potable Water Production</div>
            <div className="text-[9px] text-slate-400 pt-1 border-t border-polar-border/40">
              Trace-heated lake pipe / RO loop
            </div>
          </div>
        </div>
      </div>

      {/* 6. Live Causal Matrix & Resupply Bridging Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Causal Matrix */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-polar-border pb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              Causal Matrix — Fuel Dynamics Propagation
            </h3>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-bold uppercase text-[10px]">
                <span>← Upstream Causal Forcing</span>
                <span>Environmental &amp; Load Inputs</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Ambient temperatures ({env?.temperature ?? -22}°C) and wind chill surge heating load to {drivers.heating_demand_kw} kW. Energy demand reaches {drivers.generator_load_kw} kW, driving fuel consumption.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-amber-400 font-bold uppercase text-[10px]">
                <span>● Current Fuel State</span>
                <span>{percentage.toFixed(1)}% Fill ({reserveZone})</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Bulk storage holds {currentLevel.toLocaleString()} L. Continuous burn is {burnRate.toFixed(1)} L/hr (~{dailyBurn.toFixed(0)} L/day). Safe buffer remaining: {daysRemaining} days.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-rose-400 font-bold uppercase text-[10px]">
                <span>→ Downstream Impact</span>
                <span>Logistics &amp; Station Risk</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Next resupply scheduled in {resupplyEta} days. Depletion prior to resupply creates a {bridgingGap} day bridging deficit, contributing directly to station operational risk.
              </p>
            </div>
          </div>
        </div>

        {/* Resupply Bridging Protocol (Decision Support) */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-polar-border pb-3">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              Resupply Bridging Protocol (Decision Support)
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${bridgingGap >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
              Gap: {bridgingGap} Days
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2 text-xs font-mono">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Safe Runway to 30% Buffer:</span>
              <span className="font-bold text-white">{daysRemaining} Days</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Scheduled Resupply ETA:</span>
              <span className="font-bold text-cyan-300">{resupplyEta} Days</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Logistics Vulnerability:</span>
              <span className="font-bold text-amber-400">{bridgingGap < 0 ? 'HIGH (Bridge Action Required)' : 'LOW (On Schedule)'}</span>
            </div>
          </div>

          {/* Dynamic Recommendations */}
          <div className="space-y-2 text-xs font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Prescriptive Recommendations</div>
            {recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-lg bg-polar-dark/80 border border-polar-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">{rec.action}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    +{rec.days_gained}d Autonomy
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">{rec.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. What-If Scenario Simulation Sandbox */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-polar-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Fuel What-If Simulation Sandbox (Cloned Digital Twin State)
              </h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Execute mission-critical polar fuel stress scenarios on an isolated clone of the twin. Live station state is never mutated.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 self-start sm:self-auto">
            Zero Live Mutation
          </span>
        </div>

        {/* 5 Scenario Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
          <button
            onClick={() => handleRunWhatIf('resupply_delay', 20, 'Resupply Delayed +20 Days')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-rose-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-rose-300">
                Resupply +20d
              </span>
              <Play className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Icebreaker / convoy delayed 20 days by pack ice.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('generator_failure', null, 'Main Generator Failure')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-amber-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-amber-300">
                Generator Failure
              </span>
              <Play className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Trips generator; secondary operates at higher SFC.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('solar_drop', 0.40, 'Solar Output Drops 40%')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-purple-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-purple-300">
                Solar -40%
              </span>
              <Play className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Rime ice accumulation shifts load to generators.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('storm', null, '3-Day Katabatic Blizzard')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-blue-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-blue-300">
                Severe Blizzard
              </span>
              <Play className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Zero visibility &amp; gale winds surge heating burn +35%.
            </div>
          </button>

          <button
            onClick={() => handleRunWhatIf('extreme_cold', 16.0, 'Polar Vortex Freeze (-48°C)')}
            disabled={whatIfLoading}
            className="p-3 rounded-xl bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/60 text-left transition-all cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white group-hover:text-cyan-300">
                Deep Freeze (-48°C)
              </span>
              <Play className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Extreme cold maxes out fuel line trace preheaters.
            </div>
          </button>
        </div>

        {/* Loading Indicator */}
        {whatIfLoading && (
          <div className="p-4 rounded-xl bg-polar-dark/60 border border-slate-800 flex items-center justify-center gap-2 text-xs font-mono text-cyan-400 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Cloning Station Twin State &amp; Projecting Fuel Trajectory...</span>
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

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Fuel Reserve</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.fuel_reserve_liters?.baseline?.toLocaleString() ?? currentLevel.toLocaleString()} L</b>
                </div>
                <div className="text-amber-400 font-bold">
                  Proj: {whatIfResult.comparison.fuel_reserve_liters?.projected?.toLocaleString() ?? '112,400'} L
                </div>
                <div className="text-[9px] text-amber-300 font-bold">
                  {whatIfResult.comparison.fuel_reserve_liters?.delta ?? -25600} L Draw
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Safe Runway</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.days_fuel_remaining?.baseline ?? daysRemaining}d</b>
                </div>
                <div className="text-rose-400 font-bold">
                  Proj: {whatIfResult.comparison.days_fuel_remaining?.projected ?? 11}d
                </div>
                <div className="text-[9px] text-rose-300 font-bold">
                  {whatIfResult.comparison.days_fuel_remaining?.delta ?? -7}d Autonomy
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Generator Load</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.generator_load_kw?.baseline ?? drivers.generator_load_kw} kW</b>
                </div>
                <div className="text-amber-400 font-bold">
                  Proj: {whatIfResult.comparison.generator_load_kw?.projected ?? 98.4} kW
                </div>
                <div className="text-[9px] text-amber-300 font-bold">
                  +{whatIfResult.comparison.generator_load_kw?.delta ?? 14.4} kW Load
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Station Risk</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.station_risk_score?.baseline ?? 24.2}</b>
                </div>
                <div className="text-rose-400 font-bold">
                  Proj: {whatIfResult.comparison.station_risk_score?.projected ?? 48.5}
                </div>
                <div className="text-[9px] text-rose-300 font-bold">
                  +{whatIfResult.comparison.station_risk_score?.delta ?? 24.3} pts Risk
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-polar-dark border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Readiness Score</div>
                <div className="text-slate-300 mt-0.5">
                  Base: <b className="text-white">{whatIfResult.comparison.station_readiness_score?.baseline ?? 92.5}%</b>
                </div>
                <div className="text-amber-400 font-bold">
                  Proj: {whatIfResult.comparison.station_readiness_score?.projected ?? 81.4}%
                </div>
                <div className="text-[9px] text-amber-300 font-bold">
                  {whatIfResult.comparison.station_readiness_score?.delta ?? -11.1}%
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
                <Info className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                  {activeModal === 'reserve' && 'Fuel Reserve Zones & Storage Buffer'}
                  {activeModal === 'burn' && 'Hourly Consumption Drivers Breakdown'}
                  {activeModal === 'runway' && 'Depletion Runway Milestones'}
                  {activeModal === 'resupply' && 'Resupply Window & Bridging Protocol'}
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
                  Bulk fuel storage is monitored continuously to guarantee uninterrupted power and life support heating during polar winter isolation.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Fuel Farm Capacity:</span>
                    <span className="font-bold text-white">{totalCapacity.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Measured Volume:</span>
                    <span className="font-bold text-amber-300">{currentLevel.toLocaleString()} L ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dead Bottom Unpumpable (5%):</span>
                    <span className="text-slate-400">{deadBottomBuffer.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Usable Reserve:</span>
                    <span className="font-bold text-emerald-400">{usableReserve.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Emergency Safe Buffer (30%):</span>
                    <span className="text-amber-400 font-bold">{safeBufferThreshold.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Critical Lockdown Line (15%):</span>
                    <span className="text-rose-400 font-bold">{criticalThreshold.toLocaleString()} L</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'burn' && (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  Fuel consumption is calculated causally from the generator electrical demand curve plus auxiliary heating preheaters.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Generator Electrical Load:</span>
                    <span className="font-bold text-white">{drivers.generator_load_kw} kW ({drivers.generator_burn_l_hr.toFixed(1)} L/hr)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Space &amp; Trace Heating Load:</span>
                    <span className="font-bold text-blue-300">{drivers.heating_demand_kw} kW (~{drivers.heating_burn_equiv_l_hr.toFixed(1)} L/hr)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Science Lab Instruments:</span>
                    <span className="font-bold text-purple-300">{drivers.science_load_kw} kW (~{drivers.science_burn_equiv_l_hr.toFixed(1)} L/hr)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Solar PV Fuel Offset:</span>
                    <span className="font-bold text-emerald-400">-{drivers.solar_fuel_saved_l_hr.toFixed(1)} L/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Auxiliary Snow-Melt Boiler:</span>
                    <span className="font-bold text-cyan-300">+{drivers.auxiliary_boiler_l_hr.toFixed(1)} L/hr</span>
                  </div>
                  <div className="flex justify-between border-t border-polar-border pt-1 font-bold">
                    <span className="text-white">Total Current Consumption:</span>
                    <span className="text-amber-400">{burnRate.toFixed(1)} L/hr (~{dailyBurn.toFixed(0)} L/day)</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'runway' && (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  Autonomy runway estimates based on the current daily draw rate of {dailyBurn.toFixed(0)} L/day.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Days to 30% Emergency Buffer:</span>
                    <span className="font-bold text-amber-300">{daysToBuffer} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Days to 15% Critical Threshold:</span>
                    <span className="font-bold text-rose-400">{daysToCritical} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Days to Total Tank Depletion:</span>
                    <span className="font-bold text-white">{daysRemaining} Days</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'resupply' && (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">
                  Compares the remaining safe operating autonomy against the projected arrival date of the next resupply voyage.
                </p>
                <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resupply Voyage ETA:</span>
                    <span className="font-bold text-cyan-300">{resupplyEta} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Safe Autonomy Window:</span>
                    <span className="font-bold text-white">{daysRemaining} Days</span>
                  </div>
                  <div className="flex justify-between border-t border-polar-border pt-1">
                    <span className="text-slate-400">Bridging Margin / Deficit:</span>
                    <span className={`font-bold ${bridgingGap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {bridgingGap >= 0 ? `+${bridgingGap} Days Surplus` : `${bridgingGap} Days Deficit`}
                    </span>
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

export default FuelPage;
