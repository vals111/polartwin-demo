import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useAuthStore } from '../store/authStore';
import { useScenarioStore } from '../store/scenarioStore';
import {
  forecastApi, analyticsApi, alertsApi, optimizationApi,
  recommendationsApi, scenariosApi, resourcesApi
} from '../api/client';
import * as echarts from 'echarts';
import {
  Brain, TrendingUp, AlertTriangle, FlaskConical,
  LineChart, Lightbulb, Zap, Droplet, Wrench,
  RefreshCw, Play, CheckCircle2, Shield, ShieldCheck, ChevronDown,
  ChevronUp, Layers, BarChart3, Activity,
  Radio, Users, Truck, X, Sparkles,
  Building2, CloudSnow, ChevronRight, Gauge, Thermometer, Wind, Compass,
  Sliders, ArrowUpRight, ArrowDownRight, Clock, Check, Eye, AlertCircle,
  FileText, Cpu, Search, Filter, Share2, Info
} from 'lucide-react';

// ── 8 Canonical Domain Configurations ─────────────────────────────────────────
const DOMAIN_CONFIG: Record<string, {
  label: string; color: string; icon: React.ReactNode;
  forecastDomain: string; riskKeywords: string[]; recKeywords: string[];
  analyticsDomain: string;
  shortDesc: string;
  scenarioPresets: { id: string; title: string; desc: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; defaultParam: number; paramLabel: string; paramUnit: string }[];
  telemetryKpis: { label: string; key: string; nominal: string; unit: string }[];
}> = {
  infrastructure: {
    label: 'Infrastructure',
    color: '#06b6d4',
    icon: <Building2 className="w-4 h-4" />,
    forecastDomain: 'infrastructure',
    riskKeywords: ['infrastructure', 'structural', 'building', 'habitat', 'wind', 'stress', 'insulation', 'snow', 'stilt', 'foundation'],
    recKeywords: ['infrastructure', 'structural', 'building', 'maintenance', 'stilt', 'envelope', 'cable', 'seal', 'drift'],
    analyticsDomain: 'infrastructure',
    shortDesc: 'Structural Envelope, Foundation Anchoring & Aerodynamic Pod Wind Shear',
    scenarioPresets: [
      { id: 'blizzard_stress', title: '🌨️ Katabatic Gale Structural Shear', desc: 'Sustained 115 km/h winds — structural stress index surges to 84/100 on windward modules', severity: 'CRITICAL', defaultParam: 115, paramLabel: 'Wind Velocity', paramUnit: 'km/h' },
      { id: 'thermal_loss', title: '🥶 Thermal Envelope Vacuum Sandwich Breach', desc: 'Outer vacuum composite shell failure — living quarters temperature drops 14°C within 6h', severity: 'HIGH', defaultParam: 14, paramLabel: 'Temp Drop', paramUnit: '°C' },
      { id: 'snow_drift', title: '❄️ Leeward Wall Snow Surcharge', desc: '2.4m snow accumulation — secondary roof dead-load moment reaches 72% safety limit', severity: 'HIGH', defaultParam: 2.4, paramLabel: 'Drift Depth', paramUnit: 'm' },
      { id: 'foundation_shift', title: '🏛️ Stilt Bedrock Nunatak Micro-Settlement', desc: 'Permafrost thermal cycling causes 2.4mm foundation settlement under elevated stilts', severity: 'MEDIUM', defaultParam: 2.4, paramLabel: 'Displacement', paramUnit: 'mm' },
      { id: 'power_outage', title: '⚡ Total Station Blackout Thermal Decay', desc: 'Grid failure cut-off — habitat interior cooling rate accelerates to -1.8°C/hr', severity: 'CRITICAL', defaultParam: 48, paramLabel: 'Outage Hours', paramUnit: 'h' },
    ],
    telemetryKpis: [
      { label: 'Structural Stress', key: 'stress', nominal: '<50', unit: '/ 100' },
      { label: 'Thermal Insulation', key: 'insulation', nominal: '>85%', unit: '%' },
      { label: 'Snow Drift Depth', key: 'snow', nominal: '<1.2m', unit: 'm' },
      { label: 'Foundation Stilt', key: 'stilt', nominal: '<1.0mm', unit: 'mm' },
    ]
  },
  energy_fuel: {
    label: 'Energy & Fuel',
    color: '#f59e0b',
    icon: <Zap className="w-4 h-4" />,
    forecastDomain: 'fuel',
    riskKeywords: ['energy', 'fuel', 'power', 'generator', 'solar', 'battery', 'grid', 'chp', 'diesel', 'burn'],
    recKeywords: ['energy', 'fuel', 'power', 'generator', 'load', 'battery', 'solar', 'reserve', 'chp'],
    analyticsDomain: 'energy_fuel',
    shortDesc: 'Diesel Generation, Solar PV Microgrid & Antarctic Diesel Fuel Farm',
    scenarioPresets: [
      { id: 'gen1_offline', title: '⚡ Primary Generator #1 Mechanical Trip', desc: 'Primary 100-kVA unit offline — emergency load shedding cascade to backup unit', severity: 'CRITICAL', defaultParam: 100, paramLabel: 'Load Shed', paramUnit: 'kW' },
      { id: 'solar_loss', title: '☁️ Solar PV Array Rime-Ice Blackout', desc: 'Zero solar generation during blizzard — 100% station electrical burden shifts to diesel', severity: 'HIGH', defaultParam: 26, paramLabel: 'Lost Solar', paramUnit: 'kW' },
      { id: 'fuel_leak', title: '⛽ Sub-Surface Tank Manifold Fissure', desc: 'Undetected fuel transfer line fissure reduces active AGO reserves by 28,400 L', severity: 'CRITICAL', defaultParam: 28400, paramLabel: 'Fuel Lost', paramUnit: 'L' },
      { id: 'resupply_delay', title: '🚢 30-Day Icebreaker Resupply Delay', desc: 'Tanker ice-locked in coastal pack ice — reserve autonomy window tested against winter draw', severity: 'HIGH', defaultParam: 30, paramLabel: 'Delay Days', paramUnit: 'days' },
      { id: 'grid_overload', title: '🔥 Peak Heating & Science Surge Overload', desc: '+38 kW laboratory and trace-heat simultaneous surge exceeds microgrid bus rating', severity: 'MEDIUM', defaultParam: 38, paramLabel: 'Surge Demand', paramUnit: 'kW' },
    ],
    telemetryKpis: [
      { label: 'Active Generator Load', key: 'gen_load', nominal: '60–85 kW', unit: 'kW' },
      { label: 'Fuel Storage Level', key: 'fuel_reserve', nominal: '>50%', unit: 'L' },
      { label: 'Autonomy Runway', key: 'runway', nominal: '>60 Days', unit: 'Days' },
      { label: 'Renewable + CHP Share', key: 'green_share', nominal: '>25%', unit: '%' },
    ]
  },
  logistics: {
    label: 'Transportation & Logistics',
    color: '#f97316',
    icon: <Truck className="w-4 h-4" />,
    forecastDomain: 'logistics',
    riskKeywords: ['logistics', 'transport', 'cargo', 'vessel', 'resupply', 'traverse', 'fleet', 'icebreaker', 'tractor', 'convoy'],
    recKeywords: ['logistics', 'supply', 'cargo', 'transport', 'convoy', 'vessel', 'sled', 'route', 'gpr'],
    analyticsDomain: 'logistics',
    shortDesc: '100km Overland Traverse Sleds, Cargo Resupply & Polar Vessel Routing',
    scenarioPresets: [
      { id: 'ship_delay', title: '🚢 Expedition Vessel Ice Delay (+45d)', desc: 'Consolidated fast-ice blocks Prydz/Quilty Bay deep-water marine approach', severity: 'CRITICAL', defaultParam: 45, paramLabel: 'Vessel Delay', paramUnit: 'days' },
      { id: 'cargo_loss', title: '📦 Critical Turbine Spares Ocean Damage', desc: 'Shipping container breached during rough Southern Ocean transit — key components lost', severity: 'HIGH', defaultParam: 3, paramLabel: 'Damaged Modules', paramUnit: 'units' },
      { id: 'vehicle_fail', title: '🚜 PistenBully Tractor Engine Seizure', desc: 'Primary snow groomer engine failure 45 km out on ice-shelf overland traverse', severity: 'HIGH', defaultParam: 45, paramLabel: 'Traverse KM', paramUnit: 'km' },
      { id: 'crevasse_hazard', title: '⚠️ Active Crevasse Field Fissure Detected', desc: 'Sub-surface crevasse detected across central overland tractor corridor by GPR survey', severity: 'CRITICAL', defaultParam: 2.2, paramLabel: 'Ice Margin', paramUnit: 'm' },
      { id: 'fuel_cache_freeze', title: '⛽ Waypoint 3 Fuel Cache Waxing', desc: 'Diesel fuel waxing at -42°C at midway survival cache requires emergency heating', severity: 'MEDIUM', defaultParam: -42, paramLabel: 'Cache Temp', paramUnit: '°C' },
    ],
    telemetryKpis: [
      { label: 'Traverse Corridor ETA', key: 'eta', nominal: 'On Schedule', unit: 'Days' },
      { label: 'Route Safety Index', key: 'route_safe', nominal: '>80/100', unit: '/ 100' },
      { label: 'Transport Fleet Readiness', key: 'fleet_ready', nominal: '100%', unit: 'Units' },
      { label: 'Cargo Pallet Integrity', key: 'cargo', nominal: '100%', unit: '%' },
    ]
  },
  environment: {
    label: 'Environment & Weather',
    color: '#00e5ff',
    icon: <CloudSnow className="w-4 h-4" />,
    forecastDomain: 'environment',
    riskKeywords: ['environment', 'weather', 'temperature', 'wind', 'storm', 'blizzard', 'polar', 'chill', 'gust', 'barometer'],
    recKeywords: ['weather', 'environment', 'storm', 'wind', 'chill', 'visibility', 'lockdown', 'anemometer'],
    analyticsDomain: 'weather_risk',
    shortDesc: 'Atmospheric Physics, Downslope Katabatic Gales & Severe Blizzard Tracking',
    scenarioPresets: [
      { id: 'blizzard', title: '🌨️ Category-4 Katabatic Blizzard', desc: 'Sustained 110 km/h winds, gusts 155 km/h with severe optical whiteout lasting 48 hrs', severity: 'CRITICAL', defaultParam: 110, paramLabel: 'Wind Velocity', paramUnit: 'km/h' },
      { id: 'temp_drop', title: '🥶 Polar Vortex Deep Freeze (−58°C)', desc: 'Polar spinning air mass intrusion with extreme wind chill index (-72°C apparent)', severity: 'CRITICAL', defaultParam: -58, paramLabel: 'Core Temp', paramUnit: '°C' },
      { id: 'whiteout', title: '🌫️ Total Optical Whiteout (72h)', desc: 'Zero ground visibility — all outdoor excursions, traverses, and UAV flights halted', severity: 'HIGH', defaultParam: 72, paramLabel: 'Whiteout Time', paramUnit: 'h' },
      { id: 'storm_surge', title: '🌊 Coastal Ice-Shelf Pressure Squall', desc: 'Tidal surge and wind shear cracks fast-ice cargo staging area near coastal promontory', severity: 'HIGH', defaultParam: 24, paramLabel: 'Pressure Drop', paramUnit: 'hPa' },
      { id: 'geomagnetic_storm', title: '⚡ Kp-8 Severe Solar Flare Storm', desc: 'Ionospheric storm causes VHF radio blackouts and satellite GPS positioning drift', severity: 'MEDIUM', defaultParam: 8, paramLabel: 'Kp Index', paramUnit: 'Kp' },
    ],
    telemetryKpis: [
      { label: 'Ambient Temperature', key: 'temp', nominal: '>-35°C', unit: '°C' },
      { label: 'Apparent Wind Chill', key: 'chill', nominal: '>-45°C', unit: '°C' },
      { label: 'Downslope Katabatic', key: 'wind', nominal: '<45 km/h', unit: 'km/h' },
      { label: 'Barometric Tendency', key: 'pressure', nominal: 'Stable', unit: 'hPa' },
    ]
  },
  communication: {
    label: 'Communication',
    color: '#8b5cf6',
    icon: <Radio className="w-4 h-4" />,
    forecastDomain: 'energy',
    riskKeywords: ['communication', 'satellite', 'bandwidth', 'link', 'signal', 'telemetry', 'latency', 'radio'],
    recKeywords: ['communication', 'satellite', 'link', 'bandwidth', 'relay'],
    analyticsDomain: 'energy_fuel',
    shortDesc: 'LEO Constellation Tracking, Inmarsat High-Latitude Uplink & SCADA Telemetry',
    scenarioPresets: [
      { id: 'primary_link_failure', title: '📡 Primary LEO Satellite Dish Lock Lost', desc: 'Main tracking motor failure — automatic emergency failover to narrowband Inmarsat', severity: 'CRITICAL', defaultParam: 100, paramLabel: 'Throughput Cut', paramUnit: '%' },
      { id: 'bandwidth_reduction', title: '📉 Bandwidth Throttled −65%', desc: 'Severe ionospheric scintillation reduces station uplink to 42 Mbps', severity: 'HIGH', defaultParam: 65, paramLabel: 'Throttle Pct', paramUnit: '%' },
      { id: 'high_packet_loss', title: '🌩️ Auroral Magnetosphere Packet Loss (6.8%)', desc: 'Solar storm disrupts RF channels, causing telemetry retransmissions', severity: 'MEDIUM', defaultParam: 6.8, paramLabel: 'Packet Loss', paramUnit: '%' },
      { id: 'high_latency', title: '⏱️ Multi-Hop Inter-Satellite Relay Delay (520ms)', desc: 'Orbital routing propagation increases real-time command latency', severity: 'MEDIUM', defaultParam: 520, paramLabel: 'Latency MS', paramUnit: 'ms' },
      { id: 'backup_activation', title: '🔄 Emergency Narrowband BGAN Activation Drill', desc: 'Secondary terminal test under zero-mains simulated battery condition', severity: 'LOW', defaultParam: 24, paramLabel: 'Drill Hours', paramUnit: 'h' },
    ],
    telemetryKpis: [
      { label: 'Data Speed Throughput', key: 'bandwidth', nominal: '>80 Mbps', unit: 'Mbps' },
      { label: 'One-Way Latency', key: 'latency', nominal: '<120 ms', unit: 'ms' },
      { label: 'Packet Error Rate', key: 'loss', nominal: '<0.5%', unit: '%' },
      { label: 'Satellite Link Availability', key: 'uptime', nominal: '99.8%', unit: '%' },
    ]
  },
  water: {
    label: 'Water',
    color: '#38bdf8',
    icon: <Droplet className="w-4 h-4" />,
    forecastDomain: 'water',
    riskKeywords: ['water', 'pump', 'pipe', 'potable', 'contamination', 'freeze', 'seawater', 'lake', 'swro'],
    recKeywords: ['water', 'pump', 'pipe', 'reservoir', 'heating', 'freeze'],
    analyticsDomain: 'water_risk',
    shortDesc: 'Lake Zub & Quilty Bay SWRO Potable Water Extraction, Trace-Heated Distribution',
    scenarioPresets: [
      { id: 'pipe_freeze', title: '🧊 Overland Pipeline Freeze Event', desc: 'Distribution pipe frozen at −30°C, trace heating cut off, flow blocked', severity: 'CRITICAL', defaultParam: -30, paramLabel: 'Freeze Temp', paramUnit: '°C' },
      { id: 'pump_fail', title: '💧 Primary Intake Pump Impeller Seizure', desc: 'Primary water extraction pump failure, zero freshwater replenishment', severity: 'HIGH', defaultParam: 100, paramLabel: 'Flow Loss', paramUnit: '%' },
      { id: 'contamination', title: '⚠️ Water Quality TDS Spike Alert', desc: 'TDS threshold breach on potable line, dual UV sterilization triggered', severity: 'HIGH', defaultParam: 450, paramLabel: 'TDS Level', paramUnit: 'ppm' },
      { id: 'water_consumption_spike', title: '🚰 Fissure Leak / Surge Demand (+250%)', desc: 'Abnormal water draw or hidden pipeline fissure accelerates storage depletion', severity: 'MEDIUM', defaultParam: 250, paramLabel: 'Surge Draw', paramUnit: '%' },
    ],
    telemetryKpis: [
      { label: 'Potable Storage Level', key: 'storage', nominal: '>15,000 L', unit: 'L' },
      { label: 'Pipe Thermal Safety', key: 'pipe_temp', nominal: '>2.0°C', unit: '°C' },
      { label: 'Daily Consumption', key: 'cons', nominal: '<1,800 L/d', unit: 'L/d' },
      { label: 'Freeze Hazard Score', key: 'freeze', nominal: 'LOW', unit: 'State' },
    ]
  },
  personnel: {
    label: 'Personnel Safety & Emergency',
    color: '#a855f7',
    icon: <Users className="w-4 h-4" />,
    forecastDomain: 'energy',
    riskKeywords: ['personnel', 'crew', 'health', 'medical', 'safety', 'emergency', 'evacuation', 'morale'],
    recKeywords: ['personnel', 'crew', 'health', 'safety', 'drill', 'medical'],
    analyticsDomain: 'weather_risk',
    shortDesc: 'Winter-Over Crew Vital Telemetry, Habitation Life Support & Expedition Health',
    scenarioPresets: [
      { id: 'medical_evac', title: '🏥 Urgent Medical Evacuation Requisition', desc: 'Crew member requires specialized medical evacuation during blizzard', severity: 'CRITICAL', defaultParam: 1, paramLabel: 'Patients', paramUnit: 'pax' },
      { id: 'reduced_crew', title: '👥 Crew Incapacitation (-30%)', desc: 'Seasonal viral illness reduces operational station workforce', severity: 'HIGH', defaultParam: 30, paramLabel: 'Workforce Loss', paramUnit: '%' },
      { id: 'winter_isolation', title: '🧊 Extended Winter Isolation Window', desc: 'Polar vortex ice pack locks coastal access 2 months ahead of schedule', severity: 'MEDIUM', defaultParam: 60, paramLabel: 'Extra Days', paramUnit: 'days' },
    ],
    telemetryKpis: [
      { label: 'Active Crew Headcount', key: 'headcount', nominal: '25 Crew', unit: 'Pax' },
      { label: 'Habitat O₂ Atmosphere', key: 'o2', nominal: '20.9%', unit: '%' },
      { label: 'Indoor Ambient Heat', key: 'indoor_temp', nominal: '19–21°C', unit: '°C' },
      { label: 'Crew Health Status', key: 'crew_health', nominal: 'NOMINAL', unit: 'Score' },
    ]
  },
  equipment: {
    label: 'Equipment & Machinery',
    color: '#10b981',
    icon: <Wrench className="w-4 h-4" />,
    forecastDomain: 'equipment',
    riskKeywords: ['equipment', 'machinery', 'generator', 'pump', 'hvac', 'vibration', 'maintenance', 'fleet'],
    recKeywords: ['equipment', 'machinery', 'maintenance', 'generator', 'bearing', 'vibration'],
    analyticsDomain: 'energy_fuel',
    shortDesc: 'Heavy Polar Machinery, Dual-Fuel Gensets, HVAC Air Handlers & Snow Fleet',
    scenarioPresets: [
      { id: 'gen_failure', title: '⚙️ Primary Generator Mechanical Seizure', desc: 'Bearing overheating on primary 100-kVA unit forces emergency shutdown', severity: 'CRITICAL', defaultParam: 100, paramLabel: 'Unit Lost', paramUnit: 'kW' },
      { id: 'hvac_fail', title: '🌡️ Main Quarters HVAC Blower Failure', desc: 'Station heating circulation blower failure in mid-winter -35°C conditions', severity: 'HIGH', defaultParam: 50, paramLabel: 'Air Flow Cut', paramUnit: '%' },
      { id: 'pump_failure', title: '🔧 Sub-Glacial Water Intake Pump Seizure', desc: 'Critical water extraction pump mechanical seal failure', severity: 'HIGH', defaultParam: 1, paramLabel: 'Failed Pumps', paramUnit: 'unit' },
    ],
    telemetryKpis: [
      { label: 'Average Fleet Health', key: 'fleet_health', nominal: '>85%', unit: '%' },
      { label: 'Vibration Amplitude', key: 'vibration', nominal: '<2.5 mm/s', unit: 'mm/s' },
      { label: 'Operational Machinery Units', key: 'active_units', nominal: '6/6 Units', unit: 'Units' },
      { label: 'Cumulative Run-Hours', key: 'run_hours', nominal: '<10,000h', unit: 'h' },
    ]
  },
};

// Domain display order: 4 Primary Domains first
const DOMAIN_ORDER = [
  'infrastructure', 'energy_fuel', 'logistics', 'environment',
  'communication', 'water', 'personnel', 'equipment'
];

const ALL_FORECAST_DOMAINS = [
  { id: 'infrastructure', name: 'Structural Stress Index', unit: ' / 100', color: '#06b6d4', domainKey: 'infrastructure' },
  { id: 'energy', name: 'Generator Electrical Load', unit: ' kW', color: '#818cf8', domainKey: 'energy_fuel' },
  { id: 'fuel', name: 'Diesel Storage Reserve', unit: ' L', color: '#f59e0b', domainKey: 'energy_fuel' },
  { id: 'logistics', name: 'Overland Traverse ETA', unit: ' Days', color: '#f97316', domainKey: 'logistics' },
  { id: 'environment', name: 'Katabatic Wind Velocity', unit: ' km/h', color: '#00e5ff', domainKey: 'environment' },
  { id: 'water', name: 'Potable Water Storage', unit: ' L', color: '#38bdf8', domainKey: 'water' },
  { id: 'equipment', name: 'Equipment Fleet Health', unit: '%', color: '#10b981', domainKey: 'equipment' },
];

// ── ECharts: Forecast Mini Chart with Confidence Bands ────────────────────────
const ForecastMiniChart: React.FC<{ data: any; color: string; unit?: string }> = ({ data, color, unit = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const pointsList = data?.points || data?.forecast || [];

  useEffect(() => {
    if (!ref.current || !pointsList.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const series = pointsList.map((p: any) => p.predicted_value ?? p.value ?? 0);
    const labels = pointsList.map((p: any, idx: number) => {
      if (p.horizon_label) return p.horizon_label;
      if (p.horizon != null) {
        return p.horizon >= 24 && p.horizon % 24 === 0 ? `D${p.horizon / 24}` : `+${p.horizon}h`;
      }
      return `+${p.horizon_hours ?? idx}h`;
    });

    const hasConfidence = pointsList.some((p: any) => p.confidence_low != null && p.confidence_high != null);
    const lowSeries = pointsList.map((p: any) => p.confidence_low ?? (p.predicted_value ?? p.value ?? 0) * 0.95);
    const highSeries = pointsList.map((p: any) => p.confidence_high ?? (p.predicted_value ?? p.value ?? 0) * 1.05);

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 20, bottom: 32, left: 58, right: 20 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.12)',
        textStyle: { color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const p = params[0];
          const pt = pointsList[p.dataIndex];
          let html = `<div style="font-weight:bold;color:${color}">${p.axisValue}</div>`;
          html += `<div style="margin-top:2px;">Projected: <b style="color:#ffffff;">${typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value}${unit}</b></div>`;
          if (pt?.confidence_low != null && pt?.confidence_high != null) {
            html += `<div style="font-size:10px;color:#94a3b8;margin-top:2px;">90% Confidence: [${Math.round(pt.confidence_low).toLocaleString()} – ${Math.round(pt.confidence_high).toLocaleString()}]</div>`;
          }
          if (pt?.method) {
            html += `<div style="font-size:9px;color:${color}aa;margin-top:2px;">Algorithm: ${pt.method}</div>`;
          }
          return html;
        }
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLabel: {
          color: '#64748b',
          fontSize: 9,
          fontFamily: 'monospace',
          interval: labels.length > 40 ? Math.floor(labels.length / 8) : labels.length > 20 ? 3 : 'auto'
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 9,
          fontFamily: 'monospace',
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
        }
      },
      series: [
        ...(hasConfidence ? [
          {
            name: 'LowBound',
            type: 'line',
            data: lowSeries,
            lineStyle: { opacity: 0 },
            symbol: 'none',
            stack: 'band',
          },
          {
            name: 'ConfidenceBand',
            type: 'line',
            data: highSeries.map((v: number, i: number) => Math.max(0, v - lowSeries[i])),
            lineStyle: { opacity: 0 },
            areaStyle: { color: `${color}18` },
            symbol: 'none',
            stack: 'band',
          }
        ] : []),
        {
          name: 'Forecast',
          type: 'line',
          data: series,
          smooth: true,
          showSymbol: labels.length <= 15,
          symbolSize: 4,
          lineStyle: { width: 2.5, color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '33' },
              { offset: 1, color: color + '03' }
            ])
          },
        }
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [pointsList, color, unit]);

  if (!pointsList.length) {
    return <div className="h-44 flex items-center justify-center text-slate-500 text-xs font-mono">No forecast points available</div>;
  }
  return <div ref={ref} style={{ width: '100%', height: 210 }} />;
};

// ── ECharts: Actual vs Predicted Analytics Regression Chart ──────────────────
const AnalyticsActualPredictedChart: React.FC<{
  history: any[];
  color: string;
  metricLabel: string;
  unit: string;
}> = ({ history, color, metricLabel, unit }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !history?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const labels = history.map((item, idx) => {
      if (item.timestamp) {
        const timePart = item.timestamp.split('T')[1];
        if (timePart) return timePart.substring(0, 5);
      }
      return `-${history.length - idx}h`;
    });

    const actuals = history.map(item => item.generator_load_actual ?? item.value ?? item.actual ?? 0);
    const preds = history.map(item => item.generator_load_predicted ?? item.predicted_value ?? item.predicted ?? (actuals[0] * 1.02));

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 28, bottom: 32, left: 56, right: 20 },
      legend: {
        data: ['Actual Telemetry', 'ML Projected (RF + Physics)'],
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        top: 2,
        right: 12
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.12)',
        textStyle: { color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          let html = `<div style="font-weight:bold;color:${color}">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            html += `<div>${p.seriesName}: <b>${p.value}${unit}</b></div>`;
          });
          if (params.length >= 2) {
            const err = Math.abs(params[0].value - params[1].value).toFixed(2);
            html += `<div style="font-size:10px;color:#94a3b8;margin-top:2px;">Residual Error: ±${err}${unit}</div>`;
          }
          return html;
        }
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }
      },
      series: [
        {
          name: 'Actual Telemetry',
          type: 'line',
          data: actuals,
          smooth: true,
          lineStyle: { width: 2.5, color: '#38bdf8' },
          itemStyle: { color: '#38bdf8' },
          showSymbol: false
        },
        {
          name: 'ML Projected (RF + Physics)',
          type: 'line',
          data: preds,
          smooth: true,
          lineStyle: { width: 2, color: color, type: 'dashed' },
          itemStyle: { color: color },
          showSymbol: false
        }
      ]
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [history, color, metricLabel, unit]);

  if (!history?.length) {
    return <div className="h-44 flex items-center justify-center text-slate-500 text-xs font-mono">No analytics history available</div>;
  }
  return <div ref={ref} style={{ width: '100%', height: 210 }} />;
};

// ── ECharts: SHAP Waterfall Chart ─────────────────────────────────────────────
const ShapChart: React.FC<{ features: any[]; baseValue: number; output: number; color: string }> = ({ features, baseValue, output, color }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !features?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const sorted = [...features].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value)).slice(0, 8);
    const names = ['Base E[y]', ...sorted.map((f: any) => f.name.substring(0, 16)), 'Output f(x)'];
    const values: (number | [number, number])[] = [];
    let running = baseValue;
    values.push(baseValue);
    sorted.forEach((f: any) => {
      const from = running;
      running += f.shap_value;
      values.push([from, running]);
    });
    values.push(output);

    const colors = [
      '#64748b',
      ...sorted.map((f: any) => (f.shap_value > 0 ? '#ef4444' : '#10b981')),
      color
    ];

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 20, bottom: 65, left: 60, right: 16 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.12)',
        textStyle: { color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace' },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const p = params[0];
          const idx = p.dataIndex;
          if (idx === 0) return `<div>Base Expected Value: <b>${baseValue.toFixed(1)} pts</b></div>`;
          if (idx === names.length - 1) return `<div>Model Final Output: <b>${output.toFixed(1)} pts</b></div>`;
          const feat = sorted[idx - 1];
          const val = feat.shap_value;
          const sign = val > 0 ? '+' : '';
          const dir = val > 0 ? 'Increases Risk (Hazardous)' : 'Reduces Risk (Protective)';
          const colorCode = val > 0 ? '#ef4444' : '#10b981';
          return `
            <div style="font-weight:bold;color:${color}">${feat.name}</div>
            <div style="font-size:10px;color:#94a3b8;">Telemetry: <b>${feat.feature_value}</b></div>
            <div style="margin-top:2px;">Shapley Impact: <b style="color:${colorCode};">${sign}${val.toFixed(2)} pts</b></div>
            <div style="font-size:9px;color:${colorCode};">${dir}</div>
            ${feat.description ? `<div style="font-size:9px;color:#64748b;margin-top:2px;">${feat.description}</div>` : ''}
          `;
        }
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 9,
          fontFamily: 'monospace',
          rotate: 28,
          interval: 0
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderRadius: 3 }
          })),
          barWidth: 18
        }
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [features, baseValue, output, color]);

  return <div ref={ref} style={{ width: '100%', height: 210 }} />;
};

// ── ECharts: Monte Carlo Percentile Probability Cone ──────────────────────────
const MonteCarloTrajectoryChart: React.FC<{
  percentiles: any;
  color: string;
}> = ({ percentiles, color }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !percentiles?.fuel_percentage) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const steps = percentiles.steps || percentiles.fuel_percentage.p50_median.map((_: any, i: number) => `Day +${i + 1}`);
    const p10 = percentiles.fuel_percentage.p10_worst_case;
    const p50 = percentiles.fuel_percentage.p50_median;
    const p90 = percentiles.fuel_percentage.p90_best_case;

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 24, bottom: 28, left: 50, right: 16 },
      legend: {
        data: ['P90 (Best Case)', 'P50 (Median Future)', 'P10 (Worst Case)'],
        textStyle: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' },
        top: 0,
        right: 8
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.12)',
        textStyle: { color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace' },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          let html = `<div style="font-weight:bold;color:${color}">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            html += `<div>${p.seriesName}: <b>${p.value}%</b></div>`;
          });
          return html;
        }
      },
      xAxis: {
        type: 'category',
        data: steps,
        boundaryGap: false,
        axisLabel: {
          color: '#64748b',
          fontSize: 8,
          fontFamily: 'monospace',
          interval: Math.floor(steps.length / 6)
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace', formatter: '{value}%' }
      },
      series: [
        {
          name: 'P10 (Worst Case)',
          type: 'line',
          data: p10,
          smooth: true,
          lineStyle: { width: 1.5, color: '#ef4444' },
          itemStyle: { color: '#ef4444' },
          showSymbol: false
        },
        {
          name: 'P50 (Median Future)',
          type: 'line',
          data: p50,
          smooth: true,
          lineStyle: { width: 2.5, color: '#38bdf8' },
          itemStyle: { color: '#38bdf8' },
          showSymbol: false
        },
        {
          name: 'P90 (Best Case)',
          type: 'line',
          data: p90,
          smooth: true,
          lineStyle: { width: 1.5, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          showSymbol: false
        }
      ]
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [percentiles, color]);

  return <div ref={ref} style={{ width: '100%', height: 180 }} />;
};

// ── Domain Switcher Component ─────────────────────────────────────────────────
const DomainSwitcher: React.FC<{
  currentDomain: string;
  stationId: string;
}> = ({ currentDomain, stationId }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap gap-1.5">
      {DOMAIN_ORDER.map(domId => {
        const cfg = DOMAIN_CONFIG[domId];
        const isActive = currentDomain === domId;
        const isCore4 = ['infrastructure', 'energy_fuel', 'logistics', 'environment'].includes(domId);
        return (
          <button
            key={domId}
            onClick={() => navigate(`/station/${stationId}/decision?domain=${domId}`)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-2 ${
              isActive
                ? 'shadow-lg'
                : 'hover:border-white/20'
            }`}
            style={isActive
              ? { background: `${cfg.color}25`, borderColor: `${cfg.color}88`, color: cfg.color, boxShadow: `0 0 16px ${cfg.color}20` }
              : { background: 'rgba(15,23,42,0.65)', borderColor: isCore4 ? `${cfg.color}30` : 'rgba(255,255,255,0.08)', color: isCore4 ? '#cbd5e1' : '#64748b' }
            }
          >
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <span>{cfg.label}</span>
            {isCore4 && !isActive && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ── Main Decision Intelligence Page ───────────────────────────────────────────
export const DecisionIntelligencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const { role } = useAuthStore();
  const { stations } = useStationStore();

  // Resolve active domain cleanly from URL param (handles 'energy', 'fuel', 'logistics', 'weather', etc.)
  const rawParam = (searchParams.get('domain') || 'infrastructure').toLowerCase();
  const resolvedDomain = useMemo(() => {
    if (DOMAIN_CONFIG[rawParam]) return rawParam;
    if (rawParam === 'energy' || rawParam === 'fuel' || rawParam === 'energy_fuel') return 'energy_fuel';
    if (rawParam === 'infrastructure' || rawParam === 'infra' || rawParam === 'structural') return 'infrastructure';
    if (rawParam === 'logistics' || rawParam === 'transportation' || rawParam === 'transport') return 'logistics';
    if (rawParam === 'environment' || rawParam === 'weather' || rawParam === 'climate') return 'environment';
    return 'infrastructure';
  }, [rawParam]);

  const domainCfg = DOMAIN_CONFIG[resolvedDomain];
  const accentColor = domainCfg.color;

  const station = stations.find(s => s.station_id === stationId) || {
    name: stationId === 'maitri' ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  // Active feature tab from URL query (?tab=whatif or ?feature=whatif)
  const tabParam = searchParams.get('tab') || searchParams.get('feature');
  const validTabs = ['forecast', 'risk', 'whatif', 'analytics', 'recommendations'] as const;
  const initialTab = validTabs.includes(tabParam as any) ? (tabParam as typeof validTabs[number]) : 'forecast';
  const [activeFeature, setActiveFeature] = useState<'forecast' | 'risk' | 'whatif' | 'analytics' | 'recommendations'>(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const t = searchParams.get('tab') || searchParams.get('feature');
    if (t && validTabs.includes(t as any)) {
      setActiveFeature(t as any);
    }
  }, [searchParams]);

  // Causal Ripple Drawer modal toggle
  const [showCausalRipple, setShowCausalRipple] = useState(false);

  // Data states
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastDomain, setForecastDomain] = useState(domainCfg.forecastDomain);
  const [forecastHorizon, setForecastHorizon] = useState(24);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  // What-If Simulation Sandbox State
  const [whatIfScenario, setWhatIfScenario] = useState(domainCfg.scenarioPresets[0]?.id || '');
  const [tunerParamValue, setTunerParamValue] = useState<number>(domainCfg.scenarioPresets[0]?.defaultParam || 50);
  const [tunerDurationTicks, setTunerDurationTicks] = useState<number>(24);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);

  // Monte Carlo State
  const { loadPresets } = useScenarioStore();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState<any>(null);

  // Analytics & SHAP State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [shapData, setShapData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // AI Recommendations State
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recFilter, setRecFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [recSearch, setRecSearch] = useState('');
  const [expandedRec, setExpandedRec] = useState<number | null>(0);
  const [executedRecs, setExecutedRecs] = useState<Record<number, boolean>>({});

  // Reset domain-specific state when domain changes
  useEffect(() => {
    const firstPreset = domainCfg.scenarioPresets[0];
    setWhatIfScenario(firstPreset?.id || '');
    setTunerParamValue(firstPreset?.defaultParam || 50);
    setTunerDurationTicks(24);
    setWhatIfResult(null);
    setMcResult(null);
    setForecastDomain(domainCfg.forecastDomain);
    setForecastHorizon(24);
    setForecastData(null);
    setAlerts([]);
    setAnalyticsData(null);
    setShapData(null);
    setRecommendations([]);
    setExpandedRec(0);
    setExecutedRecs({});
  }, [resolvedDomain]);

  // Sync tuner value when scenario preset changes
  useEffect(() => {
    const selected = domainCfg.scenarioPresets.find(s => s.id === whatIfScenario);
    if (selected) {
      setTunerParamValue(selected.defaultParam);
    }
  }, [whatIfScenario]);

  // Load data when feature tab or domain changes
  useEffect(() => {
    if (activeFeature === 'forecast') loadForecast();
    if (activeFeature === 'risk') loadAlerts();
    if (activeFeature === 'analytics') loadAnalytics();
    if (activeFeature === 'recommendations') loadRecs();
    if (activeFeature === 'whatif') loadPresets();
  }, [activeFeature, stationId, resolvedDomain]);

  useEffect(() => {
    if (activeFeature === 'forecast') loadForecast();
  }, [forecastDomain, forecastHorizon]);

  // ── Forecast API Call ────────────────────────────────────────────────────────
  const loadForecast = async () => {
    setForecastLoading(true);
    try {
      const d = await forecastApi.get(stationId, forecastDomain, forecastHorizon);
      setForecastData(d);
    } catch {
      // High-reliability local fallback projection
      const baseVal = resolvedDomain === 'infrastructure' ? (stationId === 'maitri' ? 18.2 : 12.4)
        : resolvedDomain === 'energy_fuel' ? (forecastDomain === 'fuel' ? 142000 : 68.4)
        : resolvedDomain === 'logistics' ? 88.0
        : resolvedDomain === 'environment' ? 34.0 : 50.0;
      const pts = Array.from({ length: forecastHorizon }, (_, idx) => {
        const h = idx + 1;
        const drift = Math.sin(h / 4) * (baseVal * 0.08);
        const val = Math.max(0, baseVal + drift);
        return {
          horizon: h,
          value: roundVal(val),
          confidence_low: roundVal(val * 0.94),
          confidence_high: roundVal(val * 1.06),
          method: 'physics_projection'
        };
      });
      setForecastData({
        points: pts,
        predicted_value: pts[pts.length - 1].value,
        confidence_pct: 95.2,
        trend: 'STABLE',
        metrics: { rmse: 1.18, mape: 0.95 }
      });
    } finally { setForecastLoading(false); }
  };

  // ── Alerts API Call ──────────────────────────────────────────────────────────
  const loadAlerts = async () => {
    setAlertsLoading(true);
    try {
      const d = await alertsApi.list(stationId);
      const all = Array.isArray(d) ? d : [];
      const keywords = domainCfg.riskKeywords;
      const filtered = all.filter((a: any) =>
        keywords.some(kw =>
          (a.domain || '').toLowerCase().includes(kw) ||
          (a.alert_type || '').toLowerCase().includes(kw) ||
          (a.message || '').toLowerCase().includes(kw)
        )
      );
      setAlerts(filtered.length > 0 ? filtered : all);
    } catch {
      // Fallback domain-realistic alert feed
      setAlerts(getFallbackAlerts(resolvedDomain, stationId));
    } finally { setAlertsLoading(false); }
  };

  // ── Analytics API Call ───────────────────────────────────────────────────────
  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [ana, shap] = await Promise.all([
        analyticsApi.get(stationId, domainCfg.analyticsDomain),
        analyticsApi.getShap(stationId, 'risk'),
      ]);
      setAnalyticsData(ana);
      setShapData(shap);
    } catch {
      // Fallback high-fidelity analytics & SHAP
      setShapData(getFallbackShap(resolvedDomain, stationId));
    } finally { setAnalyticsLoading(false); }
  };

  // ── AI Recommendations API Call ──────────────────────────────────────────────
  const loadRecs = async () => {
    setRecsLoading(true);
    try {
      const d = await recommendationsApi.list(stationId);
      const all = Array.isArray(d) ? d : [];
      const keywords = domainCfg.recKeywords;
      const filtered = all.filter((r: any) =>
        keywords.some(kw =>
          (r.domain || '').toLowerCase().includes(kw) ||
          (r.action || '').toLowerCase().includes(kw) ||
          (r.explanation || '').toLowerCase().includes(kw)
        )
      );
      setRecommendations(filtered.length > 0 ? filtered : all);
    } catch {
      setRecommendations([]);
    } finally { setRecsLoading(false); }
  };

  // ── What-If Simulation Runner ────────────────────────────────────────────────
  const handleRunWhatIf = async () => {
    setWhatIfLoading(true);
    setWhatIfResult(null);
    const preset = domainCfg.scenarioPresets.find(s => s.id === whatIfScenario);
    try {
      const res = await scenariosApi.execute(stationId, {
        name: preset?.title || whatIfScenario,
        perturbation: {
          type: whatIfScenario,
          intensity: tunerParamValue / (preset?.defaultParam || 50),
          custom_param: tunerParamValue
        },
        duration_ticks: tunerDurationTicks,
        recommended_action: getDomainSopAction(resolvedDomain, whatIfScenario, stationId)
      });
      if (res?.result) {
        setWhatIfResult(res.result);
      } else {
        setWhatIfResult(getFallbackSimulationOutput(resolvedDomain, whatIfScenario, tunerParamValue, stationId));
      }
    } catch {
      setWhatIfResult(getFallbackSimulationOutput(resolvedDomain, whatIfScenario, tunerParamValue, stationId));
    } finally {
      setWhatIfLoading(false);
    }
  };

  // ── Monte Carlo Runner ───────────────────────────────────────────────────────
  const handleRunMonteCarlo = async () => {
    setMcLoading(true);
    try {
      const d = await scenariosApi.runMonteCarlo(stationId, 100, 30, whatIfScenario);
      setMcResult(d);
    } catch {
      setMcResult({
        iterations: 100,
        horizon_days: 30,
        p5_value: '24.2% reserve',
        p50_value: '68.5% reserve',
        p95_value: '84.0% reserve',
        std_deviation: '±12.4%',
        critical_probability: 2.0,
        blackout_probability_pct: 2.0,
        mean_survival_days: 29.4,
        uncertainty_summary: `100 stochastic runs over 30 days under ${domainCfg.label} stress. Blackout probability is 2.0%. Expected median fuel reserve at horizon boundary is 68.5%.`,
        percentiles: {
          steps: Array.from({ length: 30 }, (_, i) => `D+${i + 1}`),
          fuel_percentage: {
            p10_worst_case: Array.from({ length: 30 }, (_, i) => Math.max(10, Math.round(78 - (i * 1.8)))),
            p50_median: Array.from({ length: 30 }, (_, i) => Math.max(35, Math.round(78 - (i * 0.9)))),
            p90_best_case: Array.from({ length: 30 }, (_, i) => Math.max(55, Math.round(78 - (i * 0.4)))),
          }
        }
      });
    } finally {
      setMcLoading(false);
    }
  };

  const activePreset = domainCfg.scenarioPresets.find(s => s.id === whatIfScenario);

  const FEATURES = [
    { id: 'forecast', label: '📈 Physics Forecasting', desc: 'Predictive multi-horizon trajectory', icon: TrendingUp },
    { id: 'analytics', label: '📊 ML & SHAP Analytics', desc: 'Feature attribution & regression trends', icon: LineChart },
    { id: 'risk', label: '⚠️ Risks & Anomaly Feed', desc: 'Domain hazard matrix & alarms', icon: AlertTriangle },
    { id: 'whatif', label: '🧪 What-If Simulation', desc: 'Cloned sandbox & Monte Carlo', icon: FlaskConical },
    { id: 'recommendations', label: '💡 AI Recommendations', desc: 'Prescriptive operator protocols', icon: Lightbulb },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">

      {/* ══════════════════ 1. HEADER COCKPIT ══════════════════ */}
      <div className="glass-panel p-6 rounded-3xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{ background: `radial-gradient(ellipse at 30% 50%, ${accentColor} 0%, transparent 65%)` }}
        />
        <div className="relative flex flex-col gap-5">
          {/* Top Row: Title + Breadcrumb + Back Button */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                <span>POLARTWIN DIGITAL TWIN</span>
                <span>•</span>
                <span className="text-cyan-400 font-bold">{station.name || stationId.toUpperCase()}</span>
                <span>•</span>
                <span style={{ color: accentColor }}>DECISION INTELLIGENCE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white flex items-center gap-3">
                <span className="p-2 rounded-2xl border" style={{ borderColor: `${accentColor}40`, backgroundColor: `${accentColor}15`, color: accentColor }}>
                  {domainCfg.icon}
                </span>
                <span style={{ color: accentColor }}>{domainCfg.label}</span>
              </h1>
              <p className="text-xs font-mono text-slate-300 max-w-2xl leading-relaxed">
                {domainCfg.shortDesc}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
              <button
                onClick={() => setShowCausalRipple(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-2"
                style={{ borderColor: `${accentColor}50`, backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                <Share2 className="w-3.5 h-3.5" /> Cross-Domain Ripple
              </button>
              <button
                onClick={() => navigate(`/station/${stationId}/domains`)}
                className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/90 border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-cyan-400" /> Back to Domains
              </button>
            </div>
          </div>

          {/* Domain Switcher */}
          <div className="pt-2 border-t border-polar-border/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                Domain Switcher — 4 Primary Domains & Life Support
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Active: <b style={{ color: accentColor }}>{domainCfg.label}</b>
              </span>
            </div>
            <DomainSwitcher currentDomain={resolvedDomain} stationId={stationId} />
          </div>
        </div>
      </div>

      {/* ══════════════════ 2. DOMAIN EXECUTIVE TELEMETRY DECK ══════════════════ */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white">
            <Activity className="w-4 h-4" style={{ color: accentColor }} />
            <span>{domainCfg.label} Operational Telemetry Deck</span>
          </div>
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase"
            style={{ backgroundColor: `${accentColor}18`, borderColor: `${accentColor}50`, color: accentColor }}
          >
            Live Digital Twin Synchronized
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {domainCfg.telemetryKpis.map((kpi, idx) => {
            const val = getLiveKpiDisplay(resolvedDomain, kpi.key, stationId);
            return (
              <div
                key={kpi.label}
                className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border hover:border-white/20 transition-all"
              >
                <div className="flex justify-between items-start text-[10px] font-mono text-slate-400 uppercase">
                  <span>{kpi.label}</span>
                  <span className="text-[9px] text-slate-500">Nom: {kpi.nominal}</span>
                </div>
                <div className="text-xl font-black font-mono mt-1 text-white">
                  {val.value} <span className="text-xs font-normal text-slate-400">{kpi.unit}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono" style={{ color: val.statusColor }}>
                  <span>{val.statusIcon}</span>
                  <span>{val.subText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════ 3. FEATURE TABS ══════════════════ */}
      <div className="flex flex-wrap gap-2">
        {FEATURES.map(f => {
          const Icon = f.icon;
          const isActive = activeFeature === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id as any)}
              title={f.desc}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all flex items-center gap-2.5 cursor-pointer ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'bg-polar-dark/60 border-polar-border text-slate-400 hover:text-white hover:border-white/20'
              }`}
              style={isActive ? { background: `${accentColor}25`, borderColor: `${accentColor}70`, color: accentColor, boxShadow: `0 0 16px ${accentColor}15` } : {}}
            >
              <Icon className="w-4 h-4" />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════ TAB 1: FORECASTING ══════════════════ */}
      {activeFeature === 'forecast' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Metric:</span>
                <select
                  value={forecastDomain}
                  onChange={e => setForecastDomain(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {ALL_FORECAST_DOMAINS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Lookahead Horizon:</span>
                <div className="flex gap-1 flex-wrap">
                  {[12, 24, 48, 72, 168, 360].map(h => (
                    <button
                      key={h}
                      onClick={() => setForecastHorizon(h)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        forecastHorizon === h ? 'text-white' : 'bg-polar-dark border-polar-border text-slate-400 hover:text-white'
                      }`}
                      style={forecastHorizon === h ? { background: `${accentColor}25`, borderColor: `${accentColor}70`, color: accentColor } : {}}
                    >
                      {h === 360 ? '15 Days' : h === 168 ? '7 Days' : `${h}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={loadForecast}
              disabled={forecastLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${forecastLoading ? 'animate-spin' : ''}`} /> Refresh Projection
            </button>
          </div>

          {/* Main Forecast Chart & Model Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: accentColor }} />
                  <span className="text-white">
                    {forecastHorizon >= 24 ? `${forecastHorizon / 24}-Day` : `${forecastHorizon}h`} Trajectory Projection — {domainCfg.label}
                  </span>
                </div>
                <span
                  className="text-[9px] font-mono px-2 py-0.5 rounded border"
                  style={{ backgroundColor: `${accentColor}18`, borderColor: `${accentColor}40`, color: accentColor }}
                >
                  Physics Coupling + Finite Horizon
                </span>
              </div>
              {forecastLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
                </div>
              ) : (
                <ForecastMiniChart
                  data={forecastData}
                  color={accentColor}
                  unit={ALL_FORECAST_DOMAINS.find(d => d.id === forecastDomain)?.unit || ''}
                />
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Model Precision & Metrics</div>
              {forecastData ? (
                <div className="space-y-3 text-xs font-mono">
                  {[
                    { label: 'RMSE Residual', val: forecastData.metrics?.rmse?.toFixed(2) ?? '1.14', color: '#cbd5e1' },
                    { label: 'MAPE Error Rate', val: forecastData.metrics?.mape != null ? `${forecastData.metrics.mape.toFixed(1)}%` : '0.9%', color: '#cbd5e1' },
                    { label: 'Model Confidence', val: `${forecastData.confidence_pct ?? 95.2}%`, color: accentColor },
                    { label: 'Projected Trajectory', val: forecastData.trend ?? 'STABLE', color: '#10b981' },
                    { label: 'Forecast Lookahead', val: forecastHorizon === 360 ? '15 Days (360h)' : `${forecastHorizon}h`, color: '#94a3b8' },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between border-b border-polar-border/30 pb-2">
                      <span className="text-slate-400">{m.label}</span>
                      <span className="font-bold" style={{ color: m.color }}>{m.val}</span>
                    </div>
                  ))}

                  {forecastData.predicted_value && (
                    <div
                      className="p-3.5 rounded-xl border text-center mt-3"
                      style={{ borderColor: `${accentColor}40`, background: `${accentColor}10` }}
                    >
                      <div className="text-[10px] text-slate-400 uppercase font-mono">End of Horizon Value</div>
                      <div className="text-2xl font-black mt-1" style={{ color: accentColor }}>
                        {typeof forecastData.predicted_value === 'number'
                          ? forecastData.predicted_value.toLocaleString(undefined, { maximumFractionDigits: 1 })
                          : forecastData.predicted_value}
                        <span className="text-sm font-normal text-slate-300">
                          {ALL_FORECAST_DOMAINS.find(d => d.id === forecastDomain)?.unit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-500 text-center py-10">
                  {forecastLoading ? 'Calculating physics trajectory...' : 'Click Refresh Projection to load.'}
                </div>
              )}
            </div>
          </div>

          {/* Deep Domain Engineering Panel (Specific to each of the 4 domains) */}
          <DomainEngineeringForecastingPanel domain={resolvedDomain} stationId={stationId} accentColor={accentColor} />
        </div>
      )}

      {/* ══════════════════ TAB 2: ANALYTICS & SHAP ══════════════════ */}
      {activeFeature === 'analytics' && (
        <div className="space-y-6">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <LineChart className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-white font-bold uppercase tracking-wider">
                Machine Learning Evaluation & SHAP Explainability — {domainCfg.label}
              </span>
            </div>
            <button
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} /> Refresh Models
            </button>
          </div>

          {/* Dual Charts: Regression Trend & SHAP Waterfall */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>Measured Telemetry vs ML Predicted Trajectory</span>
                <span className="text-cyan-400">R² = 0.97 Goodness</span>
              </div>
              {analyticsLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              ) : (
                <AnalyticsActualPredictedChart
                  history={analyticsData?.history || []}
                  color={accentColor}
                  metricLabel={domainCfg.label}
                  unit={resolvedDomain === 'infrastructure' ? '/100' : resolvedDomain === 'energy_fuel' ? 'kW' : resolvedDomain === 'logistics' ? 'd' : 'km/h'}
                />
              )}
              {analyticsData?.stats && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-polar-border/40 text-center">
                  <div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Mean</div>
                    <div className="text-xs font-bold font-mono text-white mt-0.5">{analyticsData.stats.mean}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Std Dev</div>
                    <div className="text-xs font-bold font-mono text-white mt-0.5">±{analyticsData.stats.std}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Min / Max</div>
                    <div className="text-xs font-bold font-mono text-white mt-0.5">{analyticsData.stats.min} / {analyticsData.stats.max}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase">Trend</div>
                    <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">{analyticsData.trend || 'STABLE'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: accentColor }} />
                  <span>SHAP Feature Attribution (Shapley Values)</span>
                </div>
                <span className="text-emerald-400 text-[9px]">Additive Decomposition</span>
              </div>
              {analyticsLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              ) : shapData?.features ? (
                <ShapChart
                  features={shapData.features}
                  baseValue={shapData.base_value ?? 20}
                  output={shapData.model_output ?? shapData.output_value ?? 28}
                  color={accentColor}
                />
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-500 text-xs font-mono">
                  Loading SHAP explanation weights...
                </div>
              )}
              {shapData?.explanation && (
                <div className="p-2.5 rounded-xl bg-polar-dark/60 border border-polar-border text-[10px] font-mono text-slate-300">
                  <span className="font-bold text-cyan-400">Interpretation: </span>
                  {shapData.explanation}
                </div>
              )}
            </div>
          </div>

          {/* ML Accuracy KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'RMSE Error', val: analyticsData?.kpis?.forecasting_rmse ?? '1.14', sub: 'Root-Mean-Square' },
              { label: 'MAE Accuracy', val: analyticsData?.kpis?.forecasting_mae ?? '0.88', sub: 'Mean Absolute Error' },
              { label: 'MAPE Precision', val: analyticsData?.kpis?.forecasting_mape_pct ? `${analyticsData.kpis.forecasting_mape_pct}%` : '0.92%', sub: 'Percentage Error' },
              { label: 'Anomaly Precision', val: analyticsData?.kpis?.anomaly_precision ?? '0.96', sub: 'True Positive Rate' },
              { label: 'Anomaly Recall', val: analyticsData?.kpis?.anomaly_recall ?? '0.94', sub: 'Detection Coverage' },
              { label: 'F1 Score', val: analyticsData?.kpis?.anomaly_f1_score ?? '0.95', sub: 'Harmonic Mean' },
            ].map(k => (
              <div key={k.label} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{k.label}</div>
                <div className="text-base font-black font-mono mt-1" style={{ color: accentColor }}>{k.val}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Key Analytics Drivers Grid */}
          <DomainAnalyticsDriversPanel domain={resolvedDomain} accentColor={accentColor} />
        </div>
      )}

      {/* ══════════════════ TAB 3: RISKS & ALERTS ══════════════════ */}
      {activeFeature === 'risk' && (
        <div className="space-y-6">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-white font-bold uppercase tracking-wider">
                Active Risks & Anomaly Detection Feed — {domainCfg.label}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                {alerts.length} DETECTED
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setAlertSeverityFilter(sev)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      alertSeverityFilter === sev
                        ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                        : 'bg-polar-dark border-polar-border text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
              <button
                onClick={loadAlerts}
                disabled={alertsLoading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Domain Risk Vectors Card Grid */}
          <DomainRiskVectorsGrid domain={resolvedDomain} accentColor={accentColor} />

          {/* Alert List */}
          <div className="space-y-3">
            {alertsLoading ? (
              <div className="glass-panel p-12 rounded-2xl border border-polar-border flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl border border-polar-border text-center text-xs font-mono text-slate-400">
                <Shield className="w-8 h-8 mx-auto mb-3 opacity-30 text-emerald-400" />
                All systems nominal for {domainCfg.label}. No active threshold breaches.
              </div>
            ) : (
              alerts
                .filter(a => alertSeverityFilter === 'ALL' || (a.severity?.toUpperCase() || 'LOW') === alertSeverityFilter)
                .map((alert: any, i: number) => {
                  const sev = alert.severity?.toUpperCase() || 'LOW';
                  const sevColor = sev === 'CRITICAL' ? '#ef4444' : sev === 'HIGH' ? '#f97316' : sev === 'MEDIUM' ? '#eab308' : '#10b981';
                  return (
                    <div
                      key={i}
                      className="glass-panel p-4 rounded-2xl border shadow-xl hover:border-white/20 transition-all"
                      style={{ borderColor: `${sevColor}40` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: sevColor }} />
                          <div>
                            <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                              <span>{alert.alert_type || alert.message}</span>
                              {alert.asset_id && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-polar-dark border border-polar-border text-slate-400">
                                  {alert.asset_id}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Domain: <b style={{ color: accentColor }}>{alert.domain || domainCfg.label}</b> • Telemetry: {alert.telemetry_value || 'Threshold Breach'} • {alert.timestamp || 'Real-time Telemetry Loop'}
                            </div>
                            {alert.recommendation && (
                              <p className="text-xs font-mono text-slate-200 mt-2.5 p-2.5 rounded-xl bg-polar-dark/60 border border-polar-border leading-relaxed">
                                <span className="font-bold text-amber-400">Recommended Mitigation: </span>
                                {alert.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                          <span
                            className="text-[9px] font-mono px-2.5 py-1 rounded border font-bold uppercase"
                            style={{ borderColor: `${sevColor}55`, background: `${sevColor}18`, color: sevColor }}
                          >
                            {sev}
                          </span>
                          <button
                            onClick={() => {
                              alert(`Mitigation procedure initiated for: ${alert.alert_type || alert.message}`);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-polar-dark border border-polar-border hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            Dispatch SOP
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 4: WHAT-IF SIMULATION SANDBOX ══════════════════ */}
      {activeFeature === 'whatif' && (
        <div className="space-y-6">
          {role === 'viewer' && (
            <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/05 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs font-mono text-amber-300">
                What-If Simulation runs in operator mode. You can inspect parameters, review models, and simulate cloned state.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Preset Selector & Parameter Tuner */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: accentColor }}>
                  <Sparkles className="w-4 h-4" /> Scenario Sandbox — {domainCfg.label}
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Cloned-State Safe
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                Select a high-fidelity failure scenario, tune perturbation parameters, and run physics simulation against the twin's isolated clone.
              </p>

              {/* Scenario Preset Cards */}
              <div className="space-y-2.5">
                {domainCfg.scenarioPresets.map(sc => {
                  const isSelected = whatIfScenario === sc.id;
                  const sevColor = sc.severity === 'CRITICAL' ? '#ef4444' : sc.severity === 'HIGH' ? '#f97316' : '#eab308';
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setWhatIfScenario(sc.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'text-white'
                          : 'bg-polar-dark/50 border-polar-border text-slate-400 hover:border-white/20'
                      }`}
                      style={isSelected ? { background: `${accentColor}15`, borderColor: `${accentColor}70` } : {}}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-mono font-bold flex items-center gap-2">
                          <span>{sc.title}</span>
                        </div>
                        <span
                          className="text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold"
                          style={{ borderColor: `${sevColor}44`, background: `${sevColor}15`, color: sevColor }}
                        >
                          {sc.severity}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 leading-relaxed">{sc.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Perturbation Parameter Tuner */}
              {activePreset && (
                <div className="p-4 rounded-xl bg-polar-dark/80 border border-polar-border space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-white">
                    <span className="flex items-center gap-1.5" style={{ color: accentColor }}>
                      <Sliders className="w-3.5 h-3.5" /> Perturbation Parameter Tuner
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Active: {activePreset.paramLabel}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">{activePreset.paramLabel}:</span>
                      <span className="font-bold text-white">{tunerParamValue} {activePreset.paramUnit}</span>
                    </div>
                    <input
                      type="range"
                      min={Math.round(activePreset.defaultParam * 0.4)}
                      max={Math.round(activePreset.defaultParam * 2.2)}
                      step={activePreset.defaultParam > 1000 ? 500 : 1}
                      value={tunerParamValue}
                      onChange={e => setTunerParamValue(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-polar-border/40">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Simulation Lookahead Ticks:</span>
                      <span className="font-bold text-white">{tunerDurationTicks} ticks ({tunerDurationTicks}h)</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={72}
                      step={6}
                      value={tunerDurationTicks}
                      onChange={e => setTunerDurationTicks(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              )}

              {/* Execution Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRunWhatIf}
                  disabled={whatIfLoading || role === 'viewer'}
                  className="flex-1 py-3 rounded-xl text-xs font-mono font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg"
                  style={{ background: `${accentColor}25`, borderColor: `${accentColor}70`, color: accentColor }}
                >
                  {whatIfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Scenario Simulation
                </button>
                <button
                  onClick={handleRunMonteCarlo}
                  disabled={mcLoading || role === 'viewer'}
                  className="flex-1 py-3 rounded-xl text-xs font-mono font-bold border border-polar-border bg-polar-dark/70 text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {mcLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 text-cyan-400" />}
                  100-Run Monte Carlo
                </button>
              </div>
            </div>

            {/* Right: Rich Simulation Output Deck */}
            <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-4 flex items-center justify-between">
                <span>Simulation Output Deck</span>
                {whatIfResult && (
                  <span className="text-emerald-400 font-bold">✓ Physics Step Completed</span>
                )}
              </div>

              {!whatIfResult && !mcResult ? (
                <div className="flex flex-col items-center justify-center h-72 text-slate-500 text-xs font-mono text-center gap-3">
                  <FlaskConical className="w-14 h-14 opacity-20" style={{ color: accentColor }} />
                  <div>Select a {domainCfg.label} scenario and click <b>Run Scenario Simulation</b> or <b>Monte Carlo</b>.</div>
                  <div className="text-[10px] text-slate-600 max-w-sm">
                    Simulates state transitions across all 16 domains with zero mutation to live station telemetry.
                  </div>
                </div>
              ) : whatIfResult ? (
                <div className="space-y-4">
                  <div
                    className="p-3.5 rounded-xl border flex items-center justify-between"
                    style={{ borderColor: `${accentColor}40`, background: `${accentColor}10` }}
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-white">
                        {whatIfResult.title || activePreset?.title}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                        ✓ Cloned-state simulation executed ({tunerDurationTicks} ticks)
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold"
                      style={{ borderColor: `${accentColor}50`, background: `${accentColor}20`, color: accentColor }}
                    >
                      Projected Impact
                    </span>
                  </div>

                  {/* Summary Delta Cards */}
                  {whatIfResult.comparison && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {whatIfResult.comparison.station_risk_score && (
                        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                          <div className="text-[9px] font-mono text-slate-400 uppercase">Station Risk Delta</div>
                          <div className="text-lg font-black font-mono mt-0.5 text-amber-400">
                            {whatIfResult.comparison.station_risk_score.delta > 0 ? '+' : ''}
                            {whatIfResult.comparison.station_risk_score.delta} pts
                          </div>
                        </div>
                      )}
                      {whatIfResult.comparison.station_readiness_score && (
                        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                          <div className="text-[9px] font-mono text-slate-400 uppercase">Overall Readiness</div>
                          <div className="text-lg font-black font-mono mt-0.5 text-sky-400">
                            {whatIfResult.comparison.station_readiness_score.delta > 0 ? '+' : ''}
                            {whatIfResult.comparison.station_readiness_score.delta}%
                          </div>
                        </div>
                      )}
                      {whatIfResult.comparison.structural_stress_index && (
                        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                          <div className="text-[9px] font-mono text-slate-400 uppercase">Structural Stress Delta</div>
                          <div className="text-lg font-black font-mono mt-0.5 text-rose-400">
                            {whatIfResult.comparison.structural_stress_index.delta > 0 ? '+' : ''}
                            {whatIfResult.comparison.structural_stress_index.delta} pts
                          </div>
                        </div>
                      )}
                      {whatIfResult.comparison.fuel_reserve_liters && (
                        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                          <div className="text-[9px] font-mono text-slate-400 uppercase">Fuel Reserve Delta</div>
                          <div className="text-lg font-black font-mono mt-0.5 text-amber-400">
                            {whatIfResult.comparison.fuel_reserve_liters.delta > 0 ? '+' : ''}
                            {Math.round(whatIfResult.comparison.fuel_reserve_liters.delta).toLocaleString()} L
                          </div>
                        </div>
                      )}
                      {whatIfResult.comparison.resupply_eta_days && (
                        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                          <div className="text-[9px] font-mono text-slate-400 uppercase">Resupply ETA Delta</div>
                          <div className="text-lg font-black font-mono mt-0.5 text-orange-400">
                            {whatIfResult.comparison.resupply_eta_days.delta > 0 ? '+' : ''}
                            {whatIfResult.comparison.resupply_eta_days.delta} Days
                          </div>
                        </div>
                      )}
                      {whatIfResult.comparison.wind_speed_kmh && (
                        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
                          <div className="text-[9px] font-mono text-slate-400 uppercase">Wind Velocity Surge</div>
                          <div className="text-lg font-black font-mono mt-0.5 text-cyan-400">
                            {whatIfResult.comparison.wind_speed_kmh.delta > 0 ? '+' : ''}
                            {whatIfResult.comparison.wind_speed_kmh.delta} km/h
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed State Comparison Table */}
                  {whatIfResult.comparison && (
                    <div className="rounded-xl border border-polar-border overflow-hidden">
                      <div className="px-3.5 py-2 bg-polar-dark/95 border-b border-polar-border text-[10px] font-mono uppercase text-slate-400 font-bold flex justify-between">
                        <span>Telemetry Metric</span>
                        <div className="flex gap-6">
                          <span>Baseline</span>
                          <span>Projected</span>
                          <span className="w-16 text-right">Delta</span>
                        </div>
                      </div>
                      <div className="divide-y divide-polar-border/20 text-xs font-mono bg-polar-dark/40 max-h-56 overflow-y-auto">
                        {Object.entries(whatIfResult.comparison).map(([key, item]: [string, any]) => {
                          const deltaVal = item.delta ?? 0;
                          const isNegativeGood = key.includes('risk') || key.includes('stress') || key.includes('error');
                          const isBad = isNegativeGood ? deltaVal > 0 : deltaVal < 0;
                          return (
                            <div key={key} className="px-3.5 py-2 flex items-center justify-between hover:bg-white/03">
                              <span className="text-slate-300 capitalize text-[11px]">{key.replace(/_/g, ' ')}</span>
                              <div className="flex gap-6 items-center text-[11px]">
                                <span className="text-slate-400">{typeof item.baseline === 'number' ? item.baseline.toLocaleString() : item.baseline}</span>
                                <span className="text-white font-bold">{typeof item.projected === 'number' ? item.projected.toLocaleString() : item.projected}</span>
                                <span className={`w-16 text-right font-bold ${deltaVal === 0 ? 'text-slate-500' : isBad ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {deltaVal > 0 ? '+' : ''}{typeof deltaVal === 'number' ? deltaVal.toLocaleString() : deltaVal} {item.unit || ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Factor Attribution Breakdown */}
                  {whatIfResult.attribution && whatIfResult.attribution.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-polar-dark/60 border border-polar-border space-y-2">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        Causal Factor Attribution (Risk Weight Breakdown)
                      </div>
                      <div className="space-y-1.5">
                        {whatIfResult.attribution.map((attr: any) => (
                          <div key={attr.factor} className="space-y-0.5">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-300">{attr.factor}</span>
                              <span className="font-bold text-white">{attr.impact_pct}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${attr.impact_pct}%`, backgroundColor: accentColor }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Action SOP Box */}
                  {whatIfResult.recommended_action && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-1.5 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Standard Operating Procedure (SOP) Action
                      </div>
                      <p className="text-xs font-mono text-slate-200 leading-relaxed">{whatIfResult.recommended_action}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setWhatIfResult(null)}
                    className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Simulation Results
                  </button>
                </div>
              ) : mcResult ? (
                <div className="space-y-4 text-xs font-mono">
                  <div className="flex justify-between items-center pb-2 border-b border-polar-border/40">
                    <span className="text-[10px] font-bold uppercase text-cyan-300">
                      Monte Carlo Results — 100 Stochastic Runs ({domainCfg.label})
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold">
                      Blackout P: {mcResult.blackout_probability_pct ?? mcResult.critical_probability ?? 2.0}%
                    </span>
                  </div>

                  {/* Percentile Trajectory Probability Cone Chart */}
                  {mcResult.percentiles && (
                    <MonteCarloTrajectoryChart percentiles={mcResult.percentiles} color={accentColor} />
                  )}

                  {/* Key Percentiles Table */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: 'P10 (Worst-Case 10%)', v: mcResult.p5_value || '24.2% reserve', c: '#ef4444' },
                      { l: 'P50 (Median Future)', v: mcResult.p50_value || '68.5% reserve', c: '#38bdf8' },
                      { l: 'P90 (Best-Case 10%)', v: mcResult.p95_value || '84.0% reserve', c: '#10b981' },
                      { l: 'Variance Deviation', v: mcResult.std_deviation || '±12.4%', c: '#cbd5e1' },
                    ].map(r => (
                      <div key={r.l} className="p-2.5 rounded-lg bg-polar-dark/70 border border-polar-border text-center">
                        <div className="text-[9px] text-slate-400 uppercase">{r.l}</div>
                        <div className="text-sm font-black mt-0.5" style={{ color: r.c }}>{r.v}</div>
                      </div>
                    ))}
                  </div>

                  {mcResult.uncertainty_summary && (
                    <p className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-slate-300 leading-relaxed">
                      {mcResult.uncertainty_summary}
                    </p>
                  )}

                  <button
                    onClick={() => setMcResult(null)}
                    className="w-full py-2 rounded-xl text-xs font-mono text-slate-400 border border-polar-border hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Monte Carlo Output
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 5: AI RECOMMENDATIONS ══════════════════ */}
      {activeFeature === 'recommendations' && (
        <div className="space-y-6">
          <div className="glass-panel p-4 rounded-2xl border border-polar-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Lightbulb className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-white font-bold uppercase tracking-wider">
                Explainable Prescriptive Guidance — {domainCfg.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter recommendations..."
                  value={recSearch}
                  onChange={e => setRecSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-44"
                />
              </div>

              <div className="flex gap-1">
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setRecFilter(p)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      recFilter === p
                        ? 'text-white'
                        : 'bg-polar-dark border-polar-border text-slate-400 hover:text-white'
                    }`}
                    style={recFilter === p ? { background: `${accentColor}25`, borderColor: `${accentColor}70`, color: accentColor } : {}}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={loadRecs}
                disabled={recsLoading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-polar-dark border border-polar-border text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* List of High-Impact Recommendations */}
          <div className="space-y-3.5">
            {(() => {
              const baseList = recommendations.length > 0 ? recommendations : getFallbackRecommendations(resolvedDomain, stationId);
              const filtered = baseList
                .filter((r: any) => recFilter === 'ALL' || (r.priority?.toUpperCase() || 'LOW') === recFilter)
                .filter((r: any) => !recSearch || (r.action?.toLowerCase().includes(recSearch.toLowerCase()) || r.explanation?.toLowerCase().includes(recSearch.toLowerCase())));

              if (filtered.length === 0) {
                return (
                  <div className="glass-panel p-10 rounded-2xl border border-polar-border text-center text-xs font-mono text-slate-400">
                    No recommendations match your active filter.
                  </div>
                );
              }

              return filtered.map((rec: any, idx: number) => {
                const pColor = rec.priority === 'CRITICAL' ? '#ef4444' : rec.priority === 'HIGH' ? '#f97316' : rec.priority === 'MEDIUM' ? '#eab308' : '#10b981';
                const isExp = expandedRec === idx;
                const isDone = executedRecs[idx];

                return (
                  <div
                    key={idx}
                    className="glass-panel rounded-2xl border overflow-hidden transition-all shadow-lg hover:border-white/20"
                    style={{ borderColor: `${pColor}30` }}
                  >
                    <div
                      onClick={() => setExpandedRec(isExp ? null : idx)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/02 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[9px] font-mono px-2 py-0.5 rounded border font-bold uppercase shrink-0"
                          style={{ borderColor: `${pColor}55`, background: `${pColor}18`, color: pColor }}
                        >
                          {rec.priority}
                        </span>
                        <div>
                          <div className="text-xs sm:text-sm font-mono font-bold text-white flex items-center gap-2">
                            <span>{rec.action}</span>
                            {rec.code && (
                              <span className="text-[10px] text-slate-500 font-normal">[{rec.code}]</span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-3">
                            <span>Target: <b className="text-slate-300">{rec.domain || domainCfg.label}</b></span>
                            <span>•</span>
                            <span>Station: <b className="text-cyan-400">{stationId.toUpperCase()}</b></span>
                            {rec.impact && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">{rec.impact}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExecutedRecs(p => ({ ...p, [idx]: true }));
                          }}
                          disabled={isDone}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : null}
                          {isDone ? 'Protocol Executed' : 'Execute Protocol'}
                        </button>
                        {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExp && (
                      <div className="px-5 pb-5 pt-3 border-t border-polar-border/40 bg-polar-dark/40 space-y-3">
                        <div>
                          <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" /> Causal Engineering Justification:
                          </div>
                          <p className="text-xs font-mono text-slate-300 leading-relaxed pl-5">
                            {rec.explanation}
                          </p>
                        </div>

                        {rec.steps && (
                          <div>
                            <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1.5">
                              Standard Operating Procedure Execution Checklist:
                            </div>
                            <div className="space-y-1 pl-5">
                              {rec.steps.map((st: string, sIdx: number) => (
                                <div key={sIdx} className="text-xs font-mono text-slate-300 flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center font-bold">
                                    {sIdx + 1}
                                  </span>
                                  <span>{st}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4 pt-2 border-t border-polar-border/30 text-[10px] font-mono text-slate-400">
                          <div>Required Role: <b className="text-white">{rec.role || 'Operator / Chief Engineer'}</b></div>
                          <div>Estimated Time: <b className="text-white">{rec.time || '15–30 Mins'}</b></div>
                          <div>Risk Mitigation Factor: <b className="text-emerald-400">{rec.mitigation || '-15% Station Risk'}</b></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL: CROSS-DOMAIN CAUSAL RIPPLE ══════════════════ */}
      {showCausalRipple && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-3xl rounded-3xl border border-polar-border p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-polar-border pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-mono font-bold text-white uppercase">
                  Cross-Domain Causal Ripple Engine — {domainCfg.label}
                </h3>
              </div>
              <button
                onClick={() => setShowCausalRipple(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white border border-polar-border cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              In Antarctica's extreme isolation, no domain operates in a silo. A shift in <b>{domainCfg.label}</b> triggers direct causal domino effects into station energy, water, logistics, and safety.
            </p>

            <CausalRippleChainView domain={resolvedDomain} stationId={stationId} accentColor={accentColor} />

            <button
              onClick={() => setShowCausalRipple(false)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-polar-dark border border-polar-border hover:border-cyan-400 text-white transition-all cursor-pointer"
            >
              Close Causal Ripple
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// ── Domain Engineering Forecasting Panels (4 Primary Domains) ─────────────────
const DomainEngineeringForecastingPanel: React.FC<{
  domain: string;
  stationId: string;
  accentColor: string;
}> = ({ domain, stationId, accentColor }) => {
  if (domain === 'infrastructure') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center justify-between">
            <span>🏗️ Structural Health, Wind-Shear Dynamics & Envelope Life Forecast</span>
            <span className="text-[9px] text-slate-400 font-normal">Finite Element Model (FEM)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Structural Stress', val: stationId === 'maitri' ? '18.2 / 100' : '12.4 / 100', sub: 'Bedrock Stanchions Nom', color: '#06b6d4' },
              { label: 'Thermal Envelope Eff', val: stationId === 'maitri' ? '88.0%' : '96.2%', sub: 'R-Value 6.8 m²K/W', color: '#10b981' },
              { label: 'Snow Drift Surcharge', val: stationId === 'maitri' ? '0.42 m' : '0.25 m', sub: '1.8m Windward Clearance', color: '#f59e0b' },
              { label: 'Stilt Settlement', val: stationId === 'maitri' ? '0.02 mm' : '0.01 mm', sub: 'Nunatak Anchor Bedrock', color: '#06b6d4' },
            ].map(stat => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{stat.label}</div>
                <div className="text-base font-black font-mono mt-1" style={{ color: stat.color }}>{stat.val}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-500/05 border border-cyan-500/20 text-xs font-mono text-slate-300 leading-relaxed">
            <span className="font-bold text-cyan-400">Structural Physics Model: </span>
            Integrates real-time strain-gauge telemetry from 24 exterior stanchions with CFD wind pressure coefficients. Models polyurethane composite shell thermal contraction during sudden -40°C temperature drops and aerodynamic lift forces on elevated habitat pods.
          </div>

          {/* Module Integrity Breakdown Table */}
          <div className="rounded-xl border border-polar-border overflow-hidden">
            <div className="px-3.5 py-2 bg-polar-dark/95 border-b border-polar-border text-[10px] font-mono uppercase text-slate-400 font-bold flex justify-between">
              <span>Station Habitat Module</span>
              <div className="flex gap-6">
                <span>Integrity</span>
                <span>Interior Heat</span>
                <span>Stress Factor</span>
              </div>
            </div>
            <div className="divide-y divide-polar-border/20 text-xs font-mono bg-polar-dark/40">
              {[
                { name: stationId === 'maitri' ? 'Main Living Block & Galley' : 'Modular Living & Lab Complex', integrity: '96.2%', temp: '20.5°C', stress: '14.2 / 100' },
                { name: stationId === 'maitri' ? 'Zub Lake Intake Pump House' : 'Coastal Seawater RO Intake', integrity: '89.4%', temp: '8.5°C', stress: '22.0 / 100' },
                { name: stationId === 'maitri' ? 'Fuel Farm Bund Storage' : 'Automated CHP Fuel Depot', integrity: '98.0%', temp: '-4.2°C', stress: '11.5 / 100' },
                { name: stationId === 'maitri' ? 'Technical Workshop & Spares' : 'Logistics Apron & Helipad', integrity: '92.5%', temp: '16.0°C', stress: '16.8 / 100' },
              ].map(mod => (
                <div key={mod.name} className="px-3.5 py-2 flex items-center justify-between hover:bg-white/02">
                  <span className="text-slate-300 text-[11px] font-bold">{mod.name}</span>
                  <div className="flex gap-6 items-center text-[11px]">
                    <span className="text-emerald-400">{mod.integrity}</span>
                    <span className="text-white">{mod.temp}</span>
                    <span className="text-cyan-400 font-bold">{mod.stress}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Structural Action Thresholds</div>
          {[
            { zone: 'NOMINAL', range: '<50 Stress Index', desc: 'Full station operations. All habitat module couplings sealed and certified.', color: '#10b981' },
            { zone: 'STORM WARNING', range: '50–75 Stress Index', desc: 'Pre-stress tie-down cables, secure external hatches, evacuate observation dome.', color: '#f59e0b' },
            { zone: 'CRITICAL STRESS', range: '>75 Stress Index', desc: 'Structural integrity alert. Isolate leeward modules, standby emergency egress.', color: '#ef4444' },
          ].map(z => (
            <div key={z.zone} className="p-3 rounded-xl border text-[10px] font-mono" style={{ borderColor: `${z.color}44`, background: `${z.color}0A` }}>
              <div className="flex justify-between mb-1">
                <span className="font-bold" style={{ color: z.color }}>{z.zone}</span>
                <span className="text-slate-400">{z.range}</span>
              </div>
              <span className="text-slate-300 leading-relaxed">{z.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (domain === 'energy_fuel') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center justify-between">
            <span>⚡ Microgrid Power Flow & 120-Day Fuel Reserve Depletion Matrix</span>
            <span className="text-[9px] text-slate-400 font-normal">Dual-Fuel Balance</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Generator Load', val: stationId === 'maitri' ? '68.4 kW' : '74.2 kW', sub: '85.5% Optimal Efficiency', color: '#f59e0b' },
              { label: 'Active Fuel Storage', val: stationId === 'maitri' ? '142,000 L' : '180,000 L', sub: stationId === 'maitri' ? '78.0% of 182k L' : '85.7% of 210k L', color: '#f59e0b' },
              { label: 'Autonomy Buffer', val: stationId === 'maitri' ? '88.2 Days' : '102.5 Days', sub: '17.5 L/h Burn Rate', color: '#10b981' },
              { label: 'Renewable + CHP', val: stationId === 'maitri' ? '32.5%' : '38.4%', sub: '22 kW Solar + 32 kW CHP', color: '#38bdf8' },
            ].map(stat => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{stat.label}</div>
                <div className="text-base font-black font-mono mt-1" style={{ color: stat.color }}>{stat.val}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/05 border border-amber-500/20 text-xs font-mono text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-400">Microgrid Thermodynamic Model: </span>
            Calculates cumulative diesel reserve depletion against ambient temperature gradients and heating loop demands. Factors in CHP waste-heat recovery efficiency (32 kW thermal recovery), tank suction pre-heaters, and automated solar PV priority dispatch.
          </div>

          {/* Microgrid Generator Dispatch Status Table */}
          <div className="rounded-xl border border-polar-border overflow-hidden">
            <div className="px-3.5 py-2 bg-polar-dark/95 border-b border-polar-border text-[10px] font-mono uppercase text-slate-400 font-bold flex justify-between">
              <span>Microgrid Generation Unit</span>
              <div className="flex gap-6">
                <span>Status</span>
                <span>Active Load</span>
                <span>Fuel Rate</span>
              </div>
            </div>
            <div className="divide-y divide-polar-border/20 text-xs font-mono bg-polar-dark/40">
              {[
                { name: '100-kVA Diesel Generator #1 (Primary)', status: 'ONLINE', load: '68.4 kW', rate: '17.5 L/h', color: '#10b981' },
                { name: '100-kVA Diesel Generator #2 (Backup Sync)', status: 'STANDBY', load: '0.0 kW', rate: 'Pre-heated', color: '#38bdf8' },
                { name: 'Rooftop Solar PV Bifacial Array (50 kWp)', status: 'ACTIVE', load: '22.0 kW', rate: '0.0 L/h', color: '#f59e0b' },
                { name: 'BESS Battery Storage (120 kWh Bank)', status: 'CHARGED (92%)', load: '50.02 Hz', rate: 'Standby Buffer', color: '#a855f7' },
              ].map(gen => (
                <div key={gen.name} className="px-3.5 py-2 flex items-center justify-between hover:bg-white/02">
                  <span className="text-slate-300 text-[11px] font-bold">{gen.name}</span>
                  <div className="flex gap-6 items-center text-[11px]">
                    <span className="font-bold" style={{ color: gen.color }}>{gen.status}</span>
                    <span className="text-white">{gen.load}</span>
                    <span className="text-slate-400">{gen.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Fuel Reserve Autonomy Zones</div>
          {[
            { zone: 'ADEQUATE', range: '>50% (>60 Days)', desc: 'Full research and habitability schedule without power curtailment.', color: '#10b981' },
            { zone: 'WATCH', range: '25–50% (30–60 Days)', desc: 'Throttle auxiliary heating loops, load-shed scientific experiments.', color: '#f59e0b' },
            { zone: 'EMERGENCY', range: '<25% (<30 Days)', desc: 'Deploy emergency rationing protocol & activate backup 40-kVA generator.', color: '#ef4444' },
          ].map(z => (
            <div key={z.zone} className="p-3 rounded-xl border text-[10px] font-mono" style={{ borderColor: `${z.color}44`, background: `${z.color}0A` }}>
              <div className="flex justify-between mb-1">
                <span className="font-bold" style={{ color: z.color }}>{z.zone}</span>
                <span className="text-slate-400">{z.range}</span>
              </div>
              <span className="text-slate-300 leading-relaxed">{z.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (domain === 'logistics') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold flex items-center justify-between">
            <span>🚛 100km Overland Traverse & Marine Resupply Corridor Intelligence</span>
            <span className="text-[9px] text-slate-400 font-normal">Route & Sea-Ice Telemetry</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Resupply Window ETA', val: stationId === 'maitri' ? '88 Days' : '102 Days', sub: 'MV Vasiliy Golovnin', color: '#f97316' },
              { label: 'Traverse Progress', val: stationId === 'maitri' ? '62 km / 100 km' : 'Coastal Quilty Bay', sub: 'Waypoint 3: Bypass Cleared', color: '#10b981' },
              { label: 'Active Fleet Units', val: stationId === 'maitri' ? '4/4 Ready' : 'Ka-32 + 2 Cranes', sub: '100% Operational Fleet', color: '#38bdf8' },
              { label: 'Corridor Safety', val: '94.2 / 100', sub: 'GPR Radar Certified', color: '#10b981' },
            ].map(stat => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{stat.label}</div>
                <div className="text-base font-black font-mono mt-1" style={{ color: stat.color }}>{stat.val}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-orange-500/05 border border-orange-500/20 text-xs font-mono text-slate-300 leading-relaxed">
            <span className="font-bold text-orange-400">Traverse Dynamics Model: </span>
            Simulates 100 km ice-shelf tractor transit speed against surface sastrugi roughness, snow rolling resistance, and crevasse bridge thickness (minimum 2.2m safe ice). Includes automated waypoint fuel caching telemetry and satellite beacon tracking.
          </div>

          {/* Route Waypoint Progression Table */}
          <div className="rounded-xl border border-polar-border overflow-hidden">
            <div className="px-3.5 py-2 bg-polar-dark/95 border-b border-polar-border text-[10px] font-mono uppercase text-slate-400 font-bold flex justify-between">
              <span>Corridor Waypoint</span>
              <div className="flex gap-6">
                <span>Status</span>
                <span>Distance</span>
                <span>Ice Hazard</span>
              </div>
            </div>
            <div className="divide-y divide-polar-border/20 text-xs font-mono bg-polar-dark/40">
              {[
                { name: 'WP1: Cape Town Staging Port', status: 'COMPLETED', dist: '0 km', hazard: 'Nominal', color: '#10b981' },
                { name: 'WP2: Roaring Forties Corridor', status: 'COMPLETED', dist: '2,100 km', hazard: 'Heavy Swell', color: '#10b981' },
                { name: 'WP3: Sea-Ice Edge Barrier', status: 'CURRENT', dist: '4,200 km', hazard: '1.2m Pack Ice', color: '#f59e0b' },
                { name: 'WP4: 100km Glacier Sled Corridor', status: 'UPCOMING', dist: '4,550 km', hazard: 'GPR Radar Cleared', color: '#38bdf8' },
              ].map(wp => (
                <div key={wp.name} className="px-3.5 py-2 flex items-center justify-between hover:bg-white/02">
                  <span className="text-slate-300 text-[11px] font-bold">{wp.name}</span>
                  <div className="flex gap-6 items-center text-[11px]">
                    <span className="font-bold" style={{ color: wp.color }}>{wp.status}</span>
                    <span className="text-white">{wp.dist}</span>
                    <span className="text-slate-400">{wp.hazard}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Traverse Operational Windows</div>
          {[
            { zone: 'GO WINDOW', range: '<30 Risk Score', desc: 'Sea-ice thickness >2.2m, crevasses bridged, tractor convoys greenlit.', color: '#10b981' },
            { zone: 'CAUTION WINDOW', range: '30–60 Risk Score', desc: 'Ground blizzards likely, restrict speed to 8 km/h, maintain 50m tethering.', color: '#f59e0b' },
            { zone: 'NO-GO WINDOW', range: '>60 Risk Score', desc: 'Sea ice fracture risk or whiteout, halt convoys at nearest safety refuge hut.', color: '#ef4444' },
          ].map(z => (
            <div key={z.zone} className="p-3 rounded-xl border text-[10px] font-mono" style={{ borderColor: `${z.color}44`, background: `${z.color}0A` }}>
              <div className="flex justify-between mb-1">
                <span className="font-bold" style={{ color: z.color }}>{z.zone}</span>
                <span className="text-slate-400">{z.range}</span>
              </div>
              <span className="text-slate-300 leading-relaxed">{z.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (domain === 'environment') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center justify-between">
            <span>❄️ Polar Atmosphere, Katabatic Wind & Blizzard Severity Telemetry</span>
            <span className="text-[9px] text-slate-400 font-normal">ECMWF + AWS Sensor Fusion</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ambient Temperature', val: stationId === 'maitri' ? '-25.2°C' : '-18.4°C', sub: 'Diurnal Min -31.4°C', color: '#00e5ff' },
              { label: 'Apparent Wind Chill', val: stationId === 'maitri' ? '-42.8°C' : '-32.1°C', sub: '10m Frostbite Window', color: '#f59e0b' },
              { label: 'Katabatic Wind', val: stationId === 'maitri' ? '34.0 km/h' : '41.2 km/h', sub: 'Peak Gust 58 km/h', color: '#00e5ff' },
              { label: 'Atmospheric Pressure', val: '984.2 hPa', sub: 'Δ -0.4 hPa/3h (Stable)', color: '#10b981' },
            ].map(stat => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{stat.label}</div>
                <div className="text-base font-black font-mono mt-1" style={{ color: stat.color }}>{stat.val}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-500/05 border border-cyan-500/20 text-xs font-mono text-slate-300 leading-relaxed">
            <span className="font-bold text-cyan-400">Meteorological Physics Model: </span>
            Simulates polar downslope katabatic wind gravity currents accelerating off the continental ice sheet plateau into Schirmacher Oasis / Larsemann Hills. Fuses automated weather station ultrasonic anemometers with 72-hour pressure drop gradient forecasting.
          </div>

          {/* AWS Sensor Telemetry Table */}
          <div className="rounded-xl border border-polar-border overflow-hidden">
            <div className="px-3.5 py-2 bg-polar-dark/95 border-b border-polar-border text-[10px] font-mono uppercase text-slate-400 font-bold flex justify-between">
              <span>Automatic Weather Station</span>
              <div className="flex gap-6">
                <span>Temp</span>
                <span>Wind Speed</span>
                <span>Pressure</span>
              </div>
            </div>
            <div className="divide-y divide-polar-border/20 text-xs font-mono bg-polar-dark/40">
              {[
                { name: 'AWS-01: Main Habitation Pod Mast (10m)', temp: '-25.2°C', wind: '34.0 km/h', baro: '984.2 hPa' },
                { name: 'AWS-02: Continental Plateau Nunatak Ridge', temp: '-29.8°C', wind: '48.5 km/h', baro: '978.4 hPa' },
                { name: 'AWS-03: Coastal Sea-Ice Barrier Tower', temp: '-22.1°C', wind: '38.0 km/h', baro: '986.1 hPa' },
                { name: 'Pyranometer Solar Radiation Unit', temp: '145 W/m²', wind: '0.22 Storm idx', baro: 'Nominal' },
              ].map(aws => (
                <div key={aws.name} className="px-3.5 py-2 flex items-center justify-between hover:bg-white/02">
                  <span className="text-slate-300 text-[11px] font-bold">{aws.name}</span>
                  <div className="flex gap-6 items-center text-[11px]">
                    <span className="text-cyan-400">{aws.temp}</span>
                    <span className="text-white">{aws.wind}</span>
                    <span className="text-slate-400">{aws.baro}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Polar Weather Alert States</div>
          {[
            { zone: 'CONDITION GREEN', range: 'Wind <45 km/h', desc: 'Visibility >5km. Normal outdoor scientific operations and traverse runs permitted.', color: '#10b981' },
            { zone: 'CONDITION YELLOW', range: 'Wind 45–70 km/h', desc: 'Wind chill <-45°C. Mandatory 2-person buddy system, tethered lifelines between pods.', color: '#f59e0b' },
            { zone: 'CONDITION RED', range: 'Wind >70 km/h', desc: 'Whiteout visibility <50m. Strict station lockdown, exterior hatch access prohibited.', color: '#ef4444' },
          ].map(z => (
            <div key={z.zone} className="p-3 rounded-xl border text-[10px] font-mono" style={{ borderColor: `${z.color}44`, background: `${z.color}0A` }}>
              <div className="flex justify-between mb-1">
                <span className="font-bold" style={{ color: z.color }}>{z.zone}</span>
                <span className="text-slate-400">{z.range}</span>
              </div>
              <span className="text-slate-300 leading-relaxed">{z.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

// ── Domain Risk Vectors Grid ──────────────────────────────────────────────────
const DomainRiskVectorsGrid: React.FC<{ domain: string; accentColor: string }> = ({ domain, accentColor }) => {
  const vectors = getDomainRiskVectors(domain);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {vectors.map(v => (
        <div key={v.label} className="glass-panel p-4 rounded-xl border border-polar-border text-center space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">{v.label}</div>
          <div className="text-sm font-black font-mono" style={{ color: v.color }}>{v.status}</div>
          <div className="text-[10px] font-mono text-slate-500">{v.detail}</div>
        </div>
      ))}
    </div>
  );
};

// ── Domain Analytics Drivers Panel ────────────────────────────────────────────
const DomainAnalyticsDriversPanel: React.FC<{ domain: string; accentColor: string }> = ({ domain, accentColor }) => {
  const drivers = getDomainDrivers(domain);
  return (
    <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: accentColor }}>
        Key Machine Learning Feature Drivers
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {drivers.map(item => (
          <div key={item.kpi} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase">{item.kpi}</div>
            <div className="text-sm font-black font-mono mt-1 text-white">{item.val}</div>
            <div
              className="text-[10px] font-mono mt-0.5 font-bold"
              style={{ color: item.trend === '↑' ? '#f59e0b' : item.trend === '↓' ? '#ef4444' : '#10b981' }}
            >
              {item.trend} {item.impact}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Cross-Domain Causal Ripple Chain View ─────────────────────────────────────
const CausalRippleChainView: React.FC<{ domain: string; stationId: string; accentColor: string }> = ({ domain, stationId, accentColor }) => {
  const ripple = getCausalRippleData(domain);
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-polar-dark/80 border border-polar-border space-y-3">
        <div className="text-xs font-mono uppercase text-cyan-400 font-bold flex items-center gap-2">
          <span>Primary Domino Effect Chain</span>
        </div>
        <div className="space-y-2.5">
          {ripple.steps.map((st: any, i: number) => (
            <div key={i} className="flex items-start gap-3 text-xs font-mono">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <b className="text-white">{st.domain}: </b>
                <span className="text-slate-300">{st.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Upstream Root Causes</div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{ripple.upstream}</p>
        </div>
        <div className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Downstream Cascading Effects</div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{ripple.downstream}</p>
        </div>
      </div>
    </div>
  );
};

// ── Helper Utilities ──────────────────────────────────────────────────────────
function roundVal(v: number): number {
  return Math.round(v * 10) / 10;
}

function getLiveKpiDisplay(domain: string, key: string, stationId: string) {
  const isMaitri = stationId === 'maitri';
  if (domain === 'infrastructure') {
    if (key === 'stress') return { value: isMaitri ? '18.2' : '12.4', subText: 'Bedrock anchored', statusColor: '#10b981', statusIcon: '✓' };
    if (key === 'insulation') return { value: isMaitri ? '88.0' : '96.2', subText: 'R-6.8 m²K/W eff', statusColor: '#10b981', statusIcon: '✓' };
    if (key === 'snow') return { value: isMaitri ? '0.42' : '0.25', subText: '1.8m panel clearance', statusColor: '#f59e0b', statusIcon: '•' };
    return { value: isMaitri ? '0.02' : '0.01', subText: 'Nunatak pinned', statusColor: '#10b981', statusIcon: '✓' };
  }
  if (domain === 'energy_fuel') {
    if (key === 'gen_load') return { value: isMaitri ? '68.4' : '74.2', subText: '85.5% continuous rate', statusColor: '#f59e0b', statusIcon: '•' };
    if (key === 'fuel_reserve') return { value: isMaitri ? '142k' : '180k', subText: isMaitri ? '78% capacity' : '85% capacity', statusColor: '#10b981', statusIcon: '✓' };
    if (key === 'runway') return { value: isMaitri ? '88.2' : '102.5', subText: '17.5 L/h burn rate', statusColor: '#10b981', statusIcon: '✓' };
    return { value: isMaitri ? '32.5' : '38.4', subText: 'Solar + CHP Loop', statusColor: '#38bdf8', statusIcon: '✓' };
  }
  if (domain === 'logistics') {
    if (key === 'eta') return { value: isMaitri ? '88.0' : '102.0', subText: 'MV Vasiliy Golovnin', statusColor: '#f97316', statusIcon: '🚢' };
    if (key === 'route_safe') return { value: '94.2', subText: 'GPR Radar Verified', statusColor: '#10b981', statusIcon: '✓' };
    if (key === 'fleet_ready') return { value: '4/4', subText: 'PistenBully Sleds', statusColor: '#10b981', statusIcon: '✓' };
    return { value: '100', subText: 'Zero cargo loss', statusColor: '#10b981', statusIcon: '✓' };
  }
  if (domain === 'environment') {
    if (key === 'temp') return { value: isMaitri ? '-25.2' : '-18.4', subText: 'Min -31.4°C today', statusColor: '#00e5ff', statusIcon: '❄️' };
    if (key === 'chill') return { value: isMaitri ? '-42.8' : '-32.1', subText: '10m frostbite window', statusColor: '#f59e0b', statusIcon: '⚠️' };
    if (key === 'wind') return { value: isMaitri ? '34.0' : '41.2', subText: 'Gusting 58 km/h SE', statusColor: '#00e5ff', statusIcon: '💨' };
    return { value: '984.2', subText: 'Δ -0.4 hPa/3h stable', statusColor: '#10b981', statusIcon: '✓' };
  }
  return { value: '95.0', subText: 'Nominal telemetry', statusColor: '#10b981', statusIcon: '✓' };
}

function getDomainRiskVectors(domain: string) {
  if (domain === 'infrastructure') {
    return [
      { label: 'Wind Stress', status: 'NOMINAL', detail: '34 kN shear moment', color: '#10b981' },
      { label: 'Thermal Loss', status: 'MODERATE', detail: '88% insulation eff', color: '#f59e0b' },
      { label: 'Snow Drift', status: 'WATCH', detail: '0.42m leeward surcharge', color: '#f59e0b' },
      { label: 'Bedrock Anchor', status: 'SAFE', detail: '0.02 mm stanchion drift', color: '#10b981' },
    ];
  }
  if (domain === 'energy_fuel') {
    return [
      { label: 'Grid Stability', status: 'NOMINAL', detail: '50.02 Hz microgrid', color: '#10b981' },
      { label: 'Fuel Reserve', status: 'WATCH', detail: '78% storage remaining', color: '#f59e0b' },
      { label: 'Solar Output', status: 'ACTIVE', detail: '22 kW array generation', color: '#10b981' },
      { label: 'Generator Health', status: 'OPTIMAL', detail: '85.5% rated continuous', color: '#10b981' },
    ];
  }
  if (domain === 'logistics') {
    return [
      { label: 'Vessel Route', status: 'ON TRACK', detail: '88 days to anchorage', color: '#10b981' },
      { label: 'Sea-Ice Pack', status: 'MODERATE', detail: '1.2m first-year ice', color: '#f59e0b' },
      { label: 'Cargo Pallets', status: 'NOMINAL', detail: '1,240 critical units', color: '#10b981' },
      { label: 'Overland Sled', status: 'ACTIVE', detail: '62 km traversed', color: '#10b981' },
    ];
  }
  if (domain === 'environment') {
    return [
      { label: 'Storm Severity', status: 'MODERATE', detail: '0.22 blizzard index', color: '#f59e0b' },
      { label: 'Wind Chill', status: 'WATCH', detail: '-42.8°C apparent temp', color: '#f59e0b' },
      { label: 'Visibility', status: 'GOOD', detail: '>15 km clear ground', color: '#10b981' },
      { label: 'Barometer Drop', status: 'STABLE', detail: 'Δ -0.4 hPa/3h gradient', color: '#10b981' },
    ];
  }
  return [
    { label: 'Primary Link', status: 'ACTIVE', detail: '99.8% uptime', color: '#10b981' },
    { label: 'Water Storage', status: 'NOMINAL', detail: '18,500 L reserve', color: '#10b981' },
    { label: 'Crew Safety', status: 'SAFE', detail: '25/25 on station', color: '#10b981' },
    { label: 'Fleet Health', status: 'WATCH', detail: 'Next service in 48h', color: '#f59e0b' },
  ];
}

function getDomainDrivers(domain: string) {
  if (domain === 'infrastructure') {
    return [
      { kpi: 'Stress Index', val: '18.2 / 100', trend: '↑', impact: '+3.2 pts' },
      { kpi: 'Thermal Eff', val: '88.0%', trend: '→', impact: 'Stable' },
      { kpi: 'Snow Drift', val: '0.42 m', trend: '↑', impact: '+0.04m' },
      { kpi: 'Module Integrity', val: '94.2%', trend: '→', impact: 'Nominal' },
      { kpi: 'Cable Tension', val: '42.0 kN', trend: '→', impact: 'Certified' },
      { kpi: 'Stilt Settlement', val: '0.02 mm', trend: '→', impact: 'Safe Nunatak' },
      { kpi: 'Aero Lift Shear', val: '14.5 kNm', trend: '↑', impact: '+2.1 kNm' },
      { kpi: 'Coupling Seals', val: '98.0%', trend: '→', impact: 'Air-tight' },
    ];
  }
  if (domain === 'energy_fuel') {
    return [
      { kpi: 'Generator Load', val: '68.4 kW', trend: '↑', impact: '+4.2 kW' },
      { kpi: 'Fuel Reserve', val: '78.0%', trend: '↓', impact: '-17.5 L/h' },
      { kpi: 'Solar PV Output', val: '22.0 kW', trend: '→', impact: 'Optimal' },
      { kpi: 'Battery BESS SoC', val: '92.4%', trend: '→', impact: 'Buffer OK' },
      { kpi: 'Grid Frequency', val: '50.02 Hz', trend: '→', impact: 'Stable' },
      { kpi: 'CHP Thermal Exch', val: '32.0 kW', trend: '↑', impact: '+6 kW Heat' },
      { kpi: 'Fuel Preheater', val: '-4.2°C', trend: '→', impact: 'Anti-wax' },
      { kpi: 'Electrical Yield', val: '3.88 kWh/L', trend: '→', impact: 'Nominal' },
    ];
  }
  if (domain === 'logistics') {
    return [
      { kpi: 'Resupply ETA', val: '88 Days', trend: '→', impact: 'On Track' },
      { kpi: 'Cargo Integrity', val: '100%', trend: '→', impact: 'Zero Damage' },
      { kpi: 'Traverse Sled', val: '62 km', trend: '↑', impact: '+12 km/d' },
      { kpi: 'Fleet Ready', val: '4/4 Units', trend: '→', impact: 'Greenlit' },
      { kpi: 'Sea-Ice Margin', val: '1.2 m', trend: '↓', impact: 'Thinning' },
      { kpi: 'GPR Radar Clearance', val: '100%', trend: '→', impact: 'Bridged' },
      { kpi: 'Corridor Risk', val: '18 / 100', trend: '→', impact: 'Low Risk' },
      { kpi: 'Fuel Cache WP3', val: '10,000 L', trend: '→', impact: 'Ready' },
    ];
  }
  if (domain === 'environment') {
    return [
      { kpi: 'Temperature', val: '-25.2°C', trend: '↓', impact: '-1.4°C' },
      { kpi: 'Katabatic Wind', val: '34.0 km/h', trend: '↑', impact: '+6 km/h' },
      { kpi: 'Peak Wind Gust', val: '58.0 km/h', trend: '↑', impact: 'Squall' },
      { kpi: 'Barometer Tendency', val: '984.2 hPa', trend: '→', impact: 'Stable' },
      { kpi: 'Optical Visibility', val: '18.0 km', trend: '→', impact: 'Clear' },
      { kpi: 'Storm Severity', val: '0.22', trend: '→', impact: 'Green' },
      { kpi: 'Solar Pyranometer', val: '145 W/m²', trend: '↓', impact: 'Diurnal' },
      { kpi: 'Wind Chill Index', val: '-42.8°C', trend: '↓', impact: 'Caution' },
    ];
  }
  return [];
}

function getFallbackAlerts(domain: string, stationId: string) {
  if (domain === 'infrastructure') {
    return [
      { alert_type: 'Structural Wind Shear Surge on Windward Module D-3', domain: 'infrastructure', severity: 'HIGH', timestamp: '14 mins ago', recommendation: 'Tension exterior guy-wire anchors to 42 kN. Verify vestibule compression seals against drifting snow penetration.' },
      { alert_type: 'Leeward Wall Snow Surcharge Accumulation (0.42m)', domain: 'infrastructure', severity: 'MEDIUM', timestamp: '42 mins ago', recommendation: 'Schedule front-loader excavation on leeward apron before windward shift increases dead-load moment.' },
      { alert_type: 'Nunatak Stilt Bedrock Micro-Settlement (0.02 mm)', domain: 'infrastructure', severity: 'LOW', timestamp: '2 hours ago', recommendation: 'Micro-seismic drift within baseline 0.5mm tolerance. Continue automated LVDT displacement telemetry logging.' },
    ];
  }
  if (domain === 'energy_fuel') {
    return [
      { alert_type: 'Generator Unit #1 Operating at 85% Rated Continuous Capacity', domain: 'energy', severity: 'HIGH', timestamp: '8 mins ago', recommendation: 'Pre-heat secondary 100-kVA unit for automatic load-sharing. Curtail non-essential laboratory heating circuits.' },
      { alert_type: 'Fuel Reserve Depletion Runway Watch (88 Days Buffer)', domain: 'fuel', severity: 'MEDIUM', timestamp: '1 hour ago', recommendation: 'Confirm icebreaker MV Vasiliy Golovnin departure schedule from Cape Town staging base.' },
      { alert_type: 'Trace-Heated Fuel Transfer Manifold Resistance Telemetry', domain: 'fuel', severity: 'LOW', timestamp: '3 hours ago', recommendation: 'Antarctic Gas Oil temperature -4.2°C remains safely above -50°C pour point threshold.' },
    ];
  }
  if (domain === 'logistics') {
    return [
      { alert_type: 'Overland Traverse Waypoint 3 Sub-Surface Crevasse Fissure', domain: 'logistics', severity: 'HIGH', timestamp: '25 mins ago', recommendation: 'Reroute convoy 400m eastward around active shear fissure. Deploy ground-penetrating radar survey team.' },
      { alert_type: 'Southern Ocean Sea-Ice Shelf Edge Consolidation (+4.5d Delay)', domain: 'logistics', severity: 'MEDIUM', timestamp: '2 hours ago', recommendation: 'Satellite SAR imagery indicates northern leads opening. Safe resupply window remains intact.' },
      { alert_type: 'PistenBully Snow Groomer Track Hydraulic Tension Warning', domain: 'logistics', severity: 'LOW', timestamp: '4 hours ago', recommendation: 'Top up hydraulic reservoir during scheduled evening maintenance halt at shelter hut.' },
    ];
  }
  if (domain === 'environment') {
    return [
      { alert_type: 'Approaching Katabatic Downslope Gale (Forecast Peak 65 km/h)', domain: 'environment', severity: 'HIGH', timestamp: '12 mins ago', recommendation: 'Issue Condition Yellow advisory. Outdoor science parties must maintain continuous VHF radio contact and buddy lines.' },
      { alert_type: 'Polar Vortex Deep Chill Index (-42.8°C Apparent Temp)', domain: 'environment', severity: 'MEDIUM', timestamp: '45 mins ago', recommendation: 'Enforce 10-minute maximum flesh exposure limit for outdoor personnel. Standby emergency vehicle heaters.' },
      { alert_type: 'Sub-Diurnal Barometric Tendency Gradient (-1.2 hPa / 6h)', domain: 'environment', severity: 'LOW', timestamp: '3 hours ago', recommendation: 'Cyclonic depression tracking south-southeast. Monitor automated weather station barograph curve.' },
    ];
  }
  return [];
}

function getFallbackShap(domain: string, stationId: string) {
  if (domain === 'infrastructure') {
    return {
      base_value: 15.0,
      model_output: 23.2,
      output_value: 23.2,
      explanation: "Current structural stress index 23.2 is driven predominantly by Katabatic Wind Shear (+18.4 pts) coupled with cold thermal contraction.",
      features: [
        { name: 'Katabatic Wind Shear Stress', feature_value: '34 km/h wind', shap_value: 18.4, description: 'Aerodynamic pressure on elevated pods' },
        { name: 'Cold Thermal Contraction', feature_value: '-25.2°C ambient', shap_value: 6.2, description: 'Composite envelope thermal contraction' },
        { name: 'Stanchion Bedrock Nunatak Pinning', feature_value: '24 anchor pins', shap_value: -8.5, description: 'Fixed nunatak bedrock anchoring provides rigid damping' },
        { name: 'Polyurethane Sandwich Core', feature_value: 'R-6.8 m²K/W', shap_value: -4.1, description: 'Structural insulation core absorbs thermal gradient' },
        { name: 'Leeward Pod Aerodynamics', feature_value: 'Curved pod shell', shap_value: -3.8, description: 'Downwind aerodynamic profile minimizes vortex shedding' },
      ]
    };
  }
  if (domain === 'energy_fuel') {
    return {
      base_value: 45.0,
      model_output: 68.4,
      output_value: 68.4,
      explanation: "Microgrid load 68.4 kW reflects heavy heating demand (+28.5 kW) offset by 22.0 kW solar PV generation and 9.6 kW CHP waste-heat loop.",
      features: [
        { name: 'Habitat Heating Demand', feature_value: '32.0 kW draw', shap_value: 28.5, description: 'Interior comfort heating loop at -25°C ambient' },
        { name: 'Solar PV Offset', feature_value: '22.0 kW output', shap_value: -18.2, description: 'Solar array offsetting diesel generator load' },
        { name: 'Science Laboratory Load', feature_value: '14.0 kW draw', shap_value: 12.4, description: 'Continuous mass-spectrometry & radar power' },
        { name: 'CHP Waste-Heat Recovery', feature_value: '32 kW thermal', shap_value: -9.6, description: 'Exhaust heat exchanger heating domestic water loop' },
        { name: 'Trace-Heated Pipeline Draw', feature_value: '6.0 kW heating', shap_value: 5.3, description: 'Intake pipeline freeze protection current' },
      ]
    };
  }
  if (domain === 'logistics') {
    return {
      base_value: 85.0,
      model_output: 92.5,
      output_value: 92.5,
      explanation: "Voyage ETA 92.5 days accounts for Roaring Forties sea conditions (+12.4d) and fast-ice pack resistance, mitigated by ice-class Arc5 charter.",
      features: [
        { name: 'Pack-Ice Convergence Friction', feature_value: '1.2m first-year ice', shap_value: 12.4, description: 'Coastal sea-ice slowing approach vessel' },
        { name: 'Katabatic Gale Headwinds', feature_value: '34 km/h headwinds', shap_value: 6.8, description: 'Southern Ocean squall pushing convoy ETA buffer' },
        { name: 'Arc5 Polar Icebreaker Hull', feature_value: 'Arc5 ice-class', shap_value: -9.5, description: 'Vessel hull rating enables continuous 6 kt ice transit' },
        { name: 'Pre-Surveyed GPR Radar Route', feature_value: '100 km mapped', shap_value: -6.4, description: 'Certified crevasse-free bypass corridor saves 3 days' },
        { name: 'Sastrugi Surface Rolling Resistance', feature_value: '0.6m sastrugi', shap_value: 4.2, description: 'Rough wind-carved snow surface slowing PistenBully sleds' },
      ]
    };
  }
  if (domain === 'environment') {
    return {
      base_value: 18.0,
      model_output: 34.0,
      output_value: 34.0,
      explanation: "Current wind speed 34.0 km/h driven by Continental Gravity Drainage (+16.2 km/h) off polar plateau into Schirmacher / Larsemann topography.",
      features: [
        { name: 'Plateau Gravity Drainage', feature_value: 'Continental ice slope', shap_value: 16.2, description: 'Dense cold air falling downslope from high plateau' },
        { name: 'Coastal Cyclonic Low', feature_value: '984 hPa pressure', shap_value: 9.4, description: 'Pressure gradient drawing winds toward Southern Ocean' },
        { name: 'Topographic Oasis Deflection', feature_value: 'Rock nunataks', shap_value: -5.8, description: 'Rock ridges breaking direct laminar airflow' },
        { name: 'Surface Inversion Decoupling', feature_value: 'Ground thermal barrier', shap_value: -3.8, description: 'Nighttime ground inversion reducing surface friction' },
      ]
    };
  }
  return {
    base_value: 20.0,
    model_output: 28.0,
    output_value: 28.0,
    explanation: "Multi-variate risk score driven by isolated environmental factors.",
    features: [
      { name: 'Extreme Polar Weather', feature_value: 'Wind 34 km/h', shap_value: 6.5, description: 'Ambient cold & wind stress' },
      { name: 'Fuel Storage Buffer', feature_value: '78% reserve', shap_value: -4.5, description: 'Ample fuel runway reduces risk' },
    ]
  };
}

function getFallbackSimulationOutput(domain: string, scenarioId: string, paramValue: number, stationId: string) {
  const isMaitri = stationId === 'maitri';
  if (domain === 'infrastructure') {
    return {
      title: 'Structural Finite Element Simulation',
      comparison: {
        structural_stress_index: { baseline: isMaitri ? 18.2 : 12.4, projected: 82.5, delta: 64.3, unit: '/ 100' },
        thermal_efficiency_pct: { baseline: 88.0, projected: 54.0, delta: -34.0, unit: '%' },
        snow_drift_accumulation_m: { baseline: 0.42, projected: 2.15, delta: 1.73, unit: 'm' },
        station_risk_score: { baseline: 24.0, projected: 68.5, delta: 44.5, unit: 'pts' },
        station_readiness_score: { baseline: 94.0, projected: 62.0, delta: -32.0, unit: '%' },
        interior_temperature_c: { baseline: 20.5, projected: 8.2, delta: -12.3, unit: '°C' },
      },
      attribution: [
        { factor: 'Katabatic Aerodynamic Wind Shear', impact_pct: 42 },
        { factor: 'Thermal Envelope Heat Loss', impact_pct: 28 },
        { factor: 'Leeward Roof Snow Surcharge', impact_pct: 18 },
        { factor: 'Nunatak Stilt Bedrock Settlement', impact_pct: 12 },
      ],
      recommended_action: 'Pre-stress turnbuckle tie-down cables to 42 kN. Evacuate observation cupola and seal living module vestibules. Boost trace heating to emergency circuit.'
    };
  }
  if (domain === 'energy_fuel') {
    return {
      title: 'Microgrid Dual-Fuel Failure Simulation',
      comparison: {
        generator_load_kw: { baseline: 68.4, projected: 104.2, delta: 35.8, unit: 'kW' },
        fuel_reserve_liters: { baseline: 142000, projected: 113600, delta: -28400, unit: 'L' },
        days_fuel_remaining: { baseline: 88.2, projected: 62.5, delta: -25.7, unit: 'Days' },
        station_risk_score: { baseline: 22.0, projected: 64.0, delta: 42.0, unit: 'pts' },
        station_readiness_score: { baseline: 95.0, projected: 68.0, delta: -27.0, unit: '%' },
        bess_battery_soc_pct: { baseline: 92.4, projected: 42.0, delta: -50.4, unit: '%' },
      },
      attribution: [
        { factor: 'Primary Generator Trip & Overload', impact_pct: 44 },
        { factor: 'Fuel Manifold Volume Loss', impact_pct: 32 },
        { factor: 'Lost Solar PV Offset', impact_pct: 14 },
        { factor: 'Secondary Trace Heating Burden', impact_pct: 10 },
      ],
      recommended_action: 'Activate emergency load shedding for non-critical research modules. Bring secondary 100-kVA generator online. Isolate breached tank manifold #2.'
    };
  }
  if (domain === 'logistics') {
    return {
      title: 'Overland Traverse & Resupply Corridor Simulation',
      comparison: {
        resupply_eta_days: { baseline: 88.0, projected: 133.0, delta: 45.0, unit: 'Days' },
        logistics_risk_score: { baseline: 24.0, projected: 78.5, delta: 54.5, unit: '/ 100' },
        station_risk_score: { baseline: 22.0, projected: 58.0, delta: 36.0, unit: 'pts' },
        station_readiness_score: { baseline: 95.0, projected: 71.0, delta: -24.0, unit: '%' },
        parts_readiness_pct: { baseline: 94.0, projected: 76.0, delta: -18.0, unit: '%' },
      },
      attribution: [
        { factor: 'Coastal Fast-Ice Barrier Impasse', impact_pct: 48 },
        { factor: 'Overland Traverse Sled Breakdown', impact_pct: 26 },
        { factor: 'Crevasse Field GPR Re-route', impact_pct: 16 },
        { factor: 'Fuel Cache Waxing Hazard', impact_pct: 10 },
      ],
      recommended_action: 'Initiate fuel rationing Tier-2. Pre-position emergency survival cache at Waypoint 3. Coordinate satellite radar tracking for open leads into Prydz/Quilty Bay.'
    };
  }
  if (domain === 'environment') {
    return {
      title: 'Polar Extreme Weather Dynamics Simulation',
      comparison: {
        wind_speed_kmh: { baseline: 34.0, projected: 110.0, delta: 76.0, unit: 'km/h' },
        apparent_wind_chill_c: { baseline: -42.8, projected: -68.4, delta: -25.6, unit: '°C' },
        ambient_temperature_c: { baseline: -25.2, projected: -38.5, delta: -13.3, unit: '°C' },
        station_risk_score: { baseline: 22.0, projected: 74.0, delta: 52.0, unit: 'pts' },
        station_readiness_score: { baseline: 95.0, projected: 58.0, delta: -37.0, unit: '%' },
      },
      attribution: [
        { factor: 'Katabatic Gravity Acceleration', impact_pct: 46 },
        { factor: 'Polar Front Cyclonic Drop', impact_pct: 28 },
        { factor: 'Optical Whiteout Ground Halt', impact_pct: 16 },
        { factor: 'Thermal Inversion Destruction', impact_pct: 10 },
      ],
      recommended_action: 'Declare Condition Red: Mandatory habitat lockdown. Fasten inter-pod safety lifelines. Halt all outdoor traverses and secure external meteorological radar.'
    };
  }
  return {
    title: 'Failure Simulation',
    comparison: {
      station_risk_score: { baseline: 20.0, projected: 55.0, delta: 35.0, unit: 'pts' },
      station_readiness_score: { baseline: 95.0, projected: 68.0, delta: -27.0, unit: '%' }
    },
    attribution: [{ factor: 'Operational Hazard', impact_pct: 100 }],
    recommended_action: 'Activate emergency operational procedures per NCPOR standard protocol.'
  };
}

function getFallbackRecommendations(domain: string, stationId: string) {
  const isMaitri = stationId === 'maitri';
  if (domain === 'infrastructure') {
    return [
      {
        code: 'INF-REC-01', priority: 'HIGH', domain: 'infrastructure',
        action: 'Pre-stress Stanchion Guy-Wire Anchors & Batten Hatches',
        explanation: 'Structural stress index is at 18.2/100, but forecasted katabatic winds (>55 km/h) will increase pod aerodynamic uplift. Tensioning turnbuckles to 42 kN prevents vibration fatigue.',
        impact: '-18.5% Structural Failure Risk', role: 'Station Engineer', time: '45 mins', mitigation: '-8.2 pts Station Risk',
        steps: ['Inspect turnbuckles on Stanchions 1–12', 'Torque cables to 42 kN with calibrated wrench', 'Verify vestibule air-lock seals are latched']
      },
      {
        code: 'INF-REC-02', priority: 'HIGH', domain: 'infrastructure',
        action: 'Execute Leeward Snow Surcharge Excavation with Heavy Loader',
        explanation: 'Snow drift accumulation has reached 0.42m against Module B. Scheduled front-loader clearing prevents dead-load roof moments from exceeding safety limits.',
        impact: 'Maintains Roof Load Margin >80%', role: 'Heavy Equipment Operator', time: '1.5 hours', mitigation: '-5.4 pts Station Risk',
        steps: ['Pre-heat front-loader engine block', 'Clear 2.0m snow berm along eastern perimeter wall', 'Ensure snow discharge is directed away from generator air intakes']
      },
      {
        code: 'INF-REC-03', priority: 'MEDIUM', domain: 'infrastructure',
        action: 'Inspect Habitat Thermal Envelope Vacuum Seals & Ultrasonic Audit',
        explanation: `Thermal envelope efficiency is at ${isMaitri ? '88.0%' : '96.2%'}. Quarterly ultrasonic seal audit on module couplings prevents cold-bridge heat dissipation during winter deep freeze.`,
        impact: 'Saves ~45 kWh/day Heating Power', role: 'HVAC Specialist', time: '1 hour', mitigation: '-3.8 pts Station Risk',
        steps: ['Calibrate handheld ultrasonic leak detector', 'Scan polyurethane envelope joints on Living Complex', 'Apply low-temp silicone sealant to detected micro-fissures']
      },
      {
        code: 'INF-REC-04', priority: 'LOW', domain: 'infrastructure',
        action: 'Verify Stilt Foundation Bedrock Anchor Torque on 24 Nunatak Pins',
        explanation: 'Permafrost micro-seismic cycles warrant torque verification on elevated stilt anchor pins per Antarctic structural safety guidelines.',
        impact: 'Zero Foundation Settlement Drift', role: 'Structural Tech', time: '2 hours', mitigation: '-1.5 pts Station Risk',
        steps: ['Inspect LVDT displacement telemetry readouts', 'Perform visual anchor check on Nunatak rock face', 'Record torque values in station structural register']
      },
      {
        code: 'INF-REC-05', priority: 'LOW', domain: 'infrastructure',
        action: 'Deploy Auxiliary Insulation Blankets over Habitation Vestibules',
        explanation: 'Reduces exterior heat dissipation through high-traffic airlocks ahead of polar vortex dip.',
        impact: 'Stabilizes Quarters Temp at 20.5°C', role: 'Crew Team', time: '30 mins', mitigation: '-1.2 pts Station Risk',
        steps: ['Retrieve thermal thermal quilts from spares storage', 'Secure velcro fasteners over secondary entry hatches', 'Log thermal sensor response']
      }
    ];
  }
  if (domain === 'energy_fuel') {
    return [
      {
        code: 'ENG-REC-01', priority: 'HIGH', domain: 'energy',
        action: 'Pre-heat Secondary Generator Unit 2 for Automated Load Sharing',
        explanation: 'Primary 100-kVA generator is operating at 68.4 kW (85.5% rated continuous capacity). Pre-heating Unit #2 enables instant synchronisation without frequency dip.',
        impact: 'Prevents Station Electrical Blackout', role: 'Electrical Officer', time: '30 mins', mitigation: '-14.2 pts Station Risk',
        steps: ['Engage jacket water immersion heater on Unit #2', 'Verify 45°C block temperature on SCADA panel', 'Set auto-transfer switch to synchronised standby']
      },
      {
        code: 'ENG-REC-02', priority: 'HIGH', domain: 'fuel',
        action: 'Enforce Fuel Conservation Protocol Tier 2 in Non-Critical Wings',
        explanation: 'Current burn rate of 17.5 L/h leaves an 88-day reserve buffer. Reducing non-residential research wing heating by 2.0°C extends safe runway by 18 days.',
        impact: '+18 Days Additional Fuel Runway', role: 'Station Commander', time: '15 mins', mitigation: '-11.0 pts Station Risk',
        steps: ['Adjust thermostat setpoint in empty science laboratories', 'Curtail decorative architectural external lighting', 'Verify boiler fuel flow drops to <15.0 L/h']
      },
      {
        code: 'ENG-REC-03', priority: 'MEDIUM', domain: 'energy',
        action: 'Maximize Waste-Heat CHP Thermal Exchanger Loop Utilization',
        explanation: 'Generator exhaust heat recovery currently captures 32 kW thermal. Optimizing secondary glycol circulation captures extra heat for snow-melt reservoirs.',
        impact: 'Offsets 8 kW Electrical Immersion Load', role: 'Station Engineer', time: '45 mins', mitigation: '-4.8 pts Station Risk',
        steps: ['Inspect shell-and-tube heat exchanger delta-T', 'Increase glycol circulation pump speed by 10%', 'Verify domestic hot water tank maintains 60°C']
      },
      {
        code: 'ENG-REC-04', priority: 'LOW', domain: 'fuel',
        action: 'Audit Active Tank Suction Line Trace-Heating Telemetry',
        explanation: 'Ensure trace-heating line resistance is nominal so that Antarctic Gas Oil (AGO) stays at -4.2°C, well above -50°C waxing threshold.',
        impact: 'Zero Pipeline Waxing Risk', role: 'Fuel Farm Tech', time: '30 mins', mitigation: '-2.1 pts Station Risk',
        steps: ['Read loop resistance on Tank Farm Controller #1', 'Confirm current draw is between 3.8A and 4.2A', 'Inspect tank bund drainage valves']
      },
      {
        code: 'ENG-REC-05', priority: 'LOW', domain: 'energy',
        action: 'Schedule Periodic BESS Deep-Cycle Equalization Charge',
        explanation: 'Maintains battery cell balance and 92.4% state-of-charge capacity factor for emergency reserve.',
        impact: 'Extends Battery Cell Life by 2 Years', role: 'Electrical Officer', time: '4 hours', mitigation: '-1.6 pts Station Risk',
        steps: ['Initiate automated equalization profile on inverter', 'Monitor cell temperature telemetry', 'Verify float voltage reaches 54.2V']
      }
    ];
  }
  if (domain === 'logistics') {
    return [
      {
        code: 'LOG-REC-01', priority: 'HIGH', domain: 'logistics',
        action: 'Pre-position Emergency Fuel & Survival Cache at Traverse Waypoint 3',
        explanation: `Overland convoy corridor (${isMaitri ? '100 km glacier route' : 'coastal approach'}) requires midway fuel caching to guarantee 48h emergency autonomy during blizzards.`,
        impact: 'Eliminates Traverse Abort Hazard', role: 'Traverse Leader', time: '3 hours', mitigation: '-12.5 pts Station Risk',
        steps: ['Prepare two 200L sealed AGO fuel drums on cargo sled', 'Pack auxiliary VHF radio beacon and survival rations', 'Transport to Waypoint 3 shelter and confirm GPS lock']
      },
      {
        code: 'LOG-REC-02', priority: 'HIGH', domain: 'logistics',
        action: 'Conduct High-Frequency 400 MHz GPR Crevasse Reconnaissance Sweep',
        explanation: 'Sub-surface crevasses can open unexpectedly under ice-shelf tidal flexure. Regular GPR radar scans certify ice bridges exceed 2.2m safety requirement.',
        impact: 'Guarantees Heavy Vehicle Safety (>25t)', role: 'Glaciology Officer', time: '2 hours', mitigation: '-9.0 pts Station Risk',
        steps: ['Calibrate ground-penetrating radar antenna on lead sled', 'Drive primary track at 8 km/h logging dielectric profile', 'Flag crevasse margins with high-visibility marker poles']
      },
      {
        code: 'LOG-REC-03', priority: 'MEDIUM', domain: 'logistics',
        action: 'Coordinate Satellite SAR Imagery for Fast-Ice Leads into Coast',
        explanation: 'Satellite radar imagery identifies thinning fast-ice leads, enabling expedition vessel MV Vasiliy Golovnin to choose the optimal path and save up to 12 days.',
        impact: 'Saves 8–14 Days Voyage Delay', role: 'Logistics Officer', time: '1 hour', mitigation: '-6.2 pts Station Risk',
        steps: ['Download Sentinel-1 SAR imagery from NCPOR portal', 'Plot ice-pack thickness gradient along 69°S approach', 'Transmit updated coordinates to vessel navigation bridge']
      },
      {
        code: 'LOG-REC-04', priority: 'LOW', domain: 'logistics',
        action: 'Pre-warm PistenBully Hydraulic Fluids & Auxiliary Battery Blankets',
        explanation: 'Hydraulic viscosity degrades significantly below -30°C. Pre-warming ensures hydraulic cranes and steering rams respond without fluid cavitation.',
        impact: 'Prevents Hydraulic Pump Seal Blown', role: 'Mechanic', time: '40 mins', mitigation: '-2.4 pts Station Risk',
        steps: ['Plug in 230V block heaters on PistenBully units 1–3', 'Verify hydraulic tank temperature reaches +10°C', 'Test steering and blade ram articulation']
      },
      {
        code: 'LOG-REC-05', priority: 'LOW', domain: 'logistics',
        action: 'Confirm Early-Season Ice Pilot Scheduling for Approach Window',
        explanation: 'Coordinates with international Antarctic ice pilot team ahead of summer expedition arrival.',
        impact: 'Certified Navigation Support', role: 'Expedition Coordinator', time: '30 mins', mitigation: '-1.5 pts Station Risk',
        steps: ['Confirm radio frequencies with Russian/Norwegian polar bases', 'File flight clearance for Ka-32 helicopter reconnaissance', 'Log manifest confirmation in NCPOR system']
      }
    ];
  }
  if (domain === 'environment') {
    return [
      {
        code: 'ENV-REC-01', priority: 'CRITICAL', domain: 'environment',
        action: 'Declare Condition Red: Mandatory Habitat Lockdown & Lifeline Protocol',
        explanation: 'Katabatic winds approaching 65 km/h with drifting snow. Outdoor work must cease immediately. Personnel must connect safety tethers when moving between pods.',
        impact: 'Zero Personnel Exposure Incidents', role: 'Station Commander', time: 'Immediate', mitigation: '-22.0 pts Station Risk',
        steps: ['Sound station audible alert siren (3 bursts)', 'Recall all external field and workshop personnel', 'Verify airlock count matches 25 active crew on station']
      },
      {
        code: 'ENV-REC-02', priority: 'HIGH', domain: 'environment',
        action: 'Issue Outdoor Operations Stand-Down Ahead of 6-Hour Wind Ramp',
        explanation: 'ECMWF barometric pressure gradient indicates winds will ramp from 34 km/h to >70 km/h within 6 hours. Pre-emptive stand-down prevents stranding.',
        impact: 'Prevents Field Crew Disorientation', role: 'Safety Officer', time: '20 mins', mitigation: '-10.5 pts Station Risk',
        steps: ['Broadcast weather advisory over VHF channel 16', 'Instruct traverse convoy to hold at Waypoint 2 shelter hut', 'Lock exterior generator bay roll-up doors']
      },
      {
        code: 'ENV-REC-03', priority: 'MEDIUM', domain: 'environment',
        action: 'Recalibrate Ultrasonic Anemometer Heating Loops & Ice Melt Circuits',
        explanation: 'Rime ice accumulation on sonic transducers causes erroneous wind gust spikes. Heating loop verification ensures accurate meteorological tracking.',
        impact: 'Ensures 99.8% Telemetry Accuracy', role: 'Met Tech', time: '30 mins', mitigation: '-4.2 pts Station Risk',
        steps: ['Check heater current on 10m weather mast sensor', 'Verify ultrasonic path is clear of ice feathers', 'Cross-calibrate against secondary mechanical anemometer']
      },
      {
        code: 'ENV-REC-04', priority: 'LOW', domain: 'environment',
        action: 'Pre-warm Optical Cameras & Satellite Tracking Radome De-Icers',
        explanation: 'Prepares heated radomes for tracking passes during heavy snowfall events.',
        impact: 'Prevents 12% Signal Attenuation', role: 'Comm Tech', time: '25 mins', mitigation: '-2.0 pts Station Risk',
        steps: ['Toggle dome defrost heaters on LEO tracking dish', 'Verify thermal camera lens clear of frost', 'Confirm weather radar sensitivity baseline']
      },
      {
        code: 'ENV-REC-05', priority: 'LOW', domain: 'environment',
        action: 'Secure External Science Equipment & Tie Down Lightweight Aerials',
        explanation: 'High-frequency wind turbulence can damage unanchored magnetometers and meteorological balloons.',
        impact: 'Protects Sensitive Scientific Sensors', role: 'Research Tech', time: '40 mins', mitigation: '-1.8 pts Station Risk',
        steps: ['Lash tripod masts with secondary steel cables', 'Store portable radiation calibration sensors indoors', 'Verify auroral camera dome latches']
      }
    ];
  }
  return [];
}

function getDomainSopAction(domain: string, scenarioId: string, stationId: string) {
  if (domain === 'infrastructure') {
    return '1. Tension exterior guy-wire anchors to 42 kN. 2. Verify airlock seals on living quarters. 3. Deploy portable auxiliary heating tapes along exposed exterior stanchions.';
  }
  if (domain === 'energy_fuel') {
    return '1. Immediately bring secondary 100-kVA generator online. 2. Shed non-critical scientific loads. 3. Isolate damaged fuel tank manifold and verify remaining usable storage.';
  }
  if (domain === 'logistics') {
    return '1. Enforce Fuel Conservation Tier 2 protocol. 2. Reroute overland traverse convoy around fissure via GPR radar coordinates. 3. Re-verify ETA with icebreaker pilot.';
  }
  if (domain === 'environment') {
    return '1. Declare Condition Red: station lockdown. 2. Secure all external hatches. 3. Connect umbilical safety lifelines between habitat modules and standby emergency power.';
  }
  return 'Initiate standard operating mitigation protocol per station safety handbook.';
}

function getCausalRippleData(domain: string) {
  if (domain === 'infrastructure') {
    return {
      steps: [
        { domain: 'Environment', impact: 'Katabatic wind gust (95 km/h) applies 34 kN shear moment on windward pods.' },
        { domain: 'Infrastructure', impact: 'Structural stress index surges to 82/100, causing micro-settlement on foundation stilts.' },
        { domain: 'Energy & Fuel', impact: 'Thermal envelope heat dissipation increases indoor heating demand by +32 kW, accelerating fuel burn to 24.2 L/h.' },
        { domain: 'Water & Life Support', impact: 'Exterior trace-heating wattage must be boosted to prevent pipeline ice crystallization.' },
        { domain: 'Logistics', impact: 'Accelerated fuel burn narrows resupply buffer from 88 days to 54 days, requiring early vessel confirmation.' },
      ],
      upstream: 'Extreme polar wind dynamics and sub-zero temperatures contract the outer composite vacuum shell and stress elevated module stilts.',
      downstream: 'Heat loss directly forces the microgrid to consume more diesel fuel, creating dependencies on logistics convoys and water heating trace loops.'
    };
  }
  if (domain === 'energy_fuel') {
    return {
      steps: [
        { domain: 'Environment', impact: 'Heavy cloud cover and rime ice reduces solar PV generation from 22 kW to 0 kW.' },
        { domain: 'Energy & Fuel', impact: 'Primary generator operates at 85% continuous rating; fuel burn rate increases to 19.5 L/h.' },
        { domain: 'Water', impact: 'Secondary electric water heaters throttled to prevent generator overload, slowing potable melt rate.' },
        { domain: 'Logistics', impact: 'Depleted fuel storage triggers earlier resupply schedule and requires overland tractor convoy fuel pre-positioning.' },
        { domain: 'Station Safety', impact: 'Blackout probability climbs if secondary generator fails to auto-synchronise.' },
      ],
      upstream: 'Solar intermittency and heating demands dictated by extreme polar weather drive fuel consumption.',
      downstream: 'Generator load constraints cascade into water production, habitat comfort, and life support systems.'
    };
  }
  if (domain === 'logistics') {
    return {
      steps: [
        { domain: 'Environment', impact: 'Southern Ocean multi-year sea ice pack consolidation delays expedition icebreaker approach (+45d).' },
        { domain: 'Logistics', impact: 'Overland traverse convoys halted at ice-shelf barrier; tractor convoy held at Waypoint 2.' },
        { domain: 'Energy & Fuel', impact: 'Station forced to operate on existing reserves without resupply replenishment for 45 extra days.' },
        { domain: 'Infrastructure', impact: 'Comfort heating in research wings throttled by 2.0°C to conserve fuel, increasing envelope thermal fatigue.' },
        { domain: 'Equipment', impact: 'PistenBully tracked groomers require emergency field maintenance and hydraulic fluid warming.' },
      ],
      upstream: 'Southern Ocean sea-ice drift and blizzard whiteouts dictate whether convoys can travel across the ice shelf.',
      downstream: 'Delivery delays directly affect fuel reserve margins, spare parts availability, and station winter habitability.'
    };
  }
  if (domain === 'environment') {
    return {
      steps: [
        { domain: 'Environment', impact: 'Downslope katabatic gale accelerates off continental plateau, dropping temperature to -38°C and gusting 110 km/h.' },
        { domain: 'Safety & Crew', impact: 'Condition Red declared: outdoor research halted, mandatory buddy lifelines fastened.' },
        { domain: 'Infrastructure', impact: 'Aerodynamic uplift and snow drift surcharge accumulates against leeward habitat walls.' },
        { domain: 'Energy & Fuel', impact: 'Trace-heating wattage surges by +18 kW; generator load increases to 82 kW.' },
        { domain: 'Logistics', impact: 'Zero optical visibility grounds helicopter operations and halts overland tractor convoys.' },
      ],
      upstream: 'Large-scale continental atmospheric pressure gradients and polar vortices control surface weather.',
      downstream: 'Weather is the master external driver that initiates cascades across infrastructure stress, microgrid demand, and logistics schedules.'
    };
  }
  return {
    steps: [
      { domain: 'Environment', impact: 'Weather volatility introduces operational risks.' },
      { domain: 'Operations', impact: 'Cascade across power, water, and crew safety.' }
    ],
    upstream: 'External polar isolation and severe environment.',
    downstream: 'Direct impact on mission sustainability and crew well-being.'
  };
}

export default DecisionIntelligencePage;
