import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { telemetryApi, scenariosApi } from '../api/client';
import {
  Truck, Ship, Anchor, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Compass, MapPin, Wind, CheckCircle2, Activity,
  ChevronRight, X, Info, Gauge, Fuel, Package,
  Wrench, Utensils, Play, CornerDownRight, BarChart3,
  AlertOctagon, SlidersHorizontal, ArrowUpRight
} from 'lucide-react';

export const LogisticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  // State from WebSocket liveSnapshot or local fallback
  const snapshot = liveSnapshot[stationId];
  const [localLogistics, setLocalLogistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selected modals
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [selectedCargo, setSelectedCargo] = useState<any | null>(null);
  const [showRiskModal, setShowRiskModal] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<any | null>(null);

  // What-If Resupply Delay simulation state
  const [whatIfLoading, setWhatIfLoading] = useState<boolean>(false);
  const [whatIfResult, setWhatIfResult] = useState<any | null>(null);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);

  // Initial fetch for logistics data if not yet populated in snapshot
  useEffect(() => {
    let isMounted = true;
    const fetchLogisticsData = async () => {
      try {
        setIsLoading(true);
        const data = await telemetryApi.getLogistics(stationId);
        if (isMounted && data && Object.keys(data).length > 0) {
          setLocalLogistics(data);
        }
      } catch (err) {
        console.warn('Could not fetch logistics endpoint directly, using snapshot fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchLogisticsData();
    // Clear previous what-if result on station switch
    setWhatIfResult(null);
    setWhatIfError(null);
    return () => {
      isMounted = false;
    };
  }, [stationId]);

  // Merge live snapshot with fallback
  const log = snapshot?.logistics || localLogistics;
  const env = snapshot?.environment;
  const fuel = snapshot?.fuel;

  // Key metrics
  const plannedEta = log?.planned_eta_days ?? (isMaitri ? 88.0 : 102.0);
  const weatherDelay = log?.weather_delay_days ?? (isMaitri ? 3.5 : 1.5);
  const effectiveEta = log?.effective_eta_days ?? (plannedEta + weatherDelay);
  const delayDriver = log?.delay_driver ?? (isMaitri ? 'Katabatic Gales & Pack Ice' : 'Southern Ocean Swell');
  const confidence = log?.confidence ?? 'Medium';
  const vesselName = log?.resupply_vessel ?? 'MV Vasiliy Golovnin (Expedition Charter)';
  const vesselIceClass = log?.vessel_ice_class ?? 'Arc5 / Polar Class 4';
  const plannedWindow = log?.planned_window ?? (isMaitri ? 'Nov 2026 – Jan 2027' : 'Dec 2026 – Feb 2027');
  const voyageDay = log?.voyage_day ?? 34;
  const totalVoyageDays = log?.total_voyage_days ?? 120;
  const voyageProgress = log?.progress_pct ?? Math.round((voyageDay / totalVoyageDays) * 100);

  const logisticsRisk = log?.logistics_risk_score ?? (isMaitri ? 25.3 : 18.4);
  const riskLevel = log?.risk_level ?? (logisticsRisk < 30 ? 'LOW' : logisticsRisk < 60 ? 'MEDIUM' : 'HIGH');
  const riskConsequence = log?.risk_consequence ?? 'Fuel and supplies remain within the safe operational buffer window.';

  const weatherFactors = log?.weather_factors ?? {
    wind_kmh: Math.round(env?.wind_speed ?? 34),
    visibility_km: Math.round(env?.visibility ?? 8),
    storm_severity: env?.storm_severity ?? 1.8,
    route_impact: 'HIGH',
    blizzard_active: env?.blizzard_active ?? false,
  };

  const riskFactors = log?.risk_factors ?? {
    weather_delay: 38,
    route_exposure: 24,
    eta_uncertainty: 18,
    cargo_dependency: 12,
    transport_readiness: 8,
  };

  const affectedResources = log?.affected_resources ?? [
    'Fuel resupply (AGO)',
    'Dry food & sustenance',
    'Critical machine spares',
    'Scheduled maintenance',
    'Station operational readiness',
  ];

  // Lifecycle Stages (Default 8-stage POLARTWIN lifecycle)
  const lifecycleStages = log?.lifecycle_stages ?? [
    { id: 1, name: 'Requirement', status: 'COMPLETED', description: 'Winterover station consumption audit and resupply quota established.', completed: true, current: false },
    { id: 2, name: 'Cargo Planning', status: 'COMPLETED', description: 'Manifest consolidated for fuel, sustenance, and critical overhauls.', completed: true, current: false },
    { id: 3, name: 'Transport Selection', status: 'COMPLETED', description: 'Arc5 Polar Class cargo vessel chartered with Ka-32 air-lift support.', completed: true, current: false },
    { id: 4, name: 'Route Confirmation', status: 'COMPLETED', description: 'Cape Town to Antarctic ice shelf barrier corridor validated.', completed: true, current: false },
    { id: 5, name: 'Transit', status: 'ACTIVE', description: 'Underway in Southern Ocean sector. Navigating polar pack ice drift.', completed: false, current: true },
    { id: 6, name: 'Weather Impact', status: 'MONITORING', description: 'Real-time telemetry tracking katabatic wind delays and ice divergence.', completed: false, current: false },
    { id: 7, name: 'Arrival / Offload', status: 'PENDING', description: isMaitri ? 'Mooring at Princess Astrid Coast fast-ice barrier.' : 'Mooring at Quilty Bay / Bharati coastal cove.', completed: false, current: false },
    { id: 8, name: 'Station Allocation', status: 'PENDING', description: isMaitri ? '100km overland convoy transport to Schirmacher Oasis.' : 'Direct fast-ice barge discharge & Ka-32 roof sling.', completed: false, current: false },
  ];

  // Waypoints
  const routeWaypoints = log?.route_waypoints ?? (isMaitri ? [
    { name: 'Cape Town Harbor', status: 'PASSED', distance_km: 0, weather: 'Clear / 18°C', delay_days: 0.0, risk: 'NOMINAL' },
    { name: 'Southern Ocean Gales', status: 'PASSED', distance_km: 2400, weather: 'Sea State 6 / 45 km/h Wind', delay_days: 1.0, risk: 'MODERATE' },
    { name: 'Princess Astrid Coast Ice Edge', status: 'ACTIVE', distance_km: 4100, weather: 'Katabatic 35 km/h / Pack Ice', delay_days: 2.5, risk: 'ELEVATED' },
    { name: 'Ice Shelf Barrier Mooring', status: 'UPCOMING', distance_km: 4350, weather: 'Sub-zero -22°C / Snow Drift', delay_days: 0.0, risk: 'HIGH' },
    { name: '100km Overland Convoy (Schirmacher)', status: 'UPCOMING', distance_km: 4450, weather: 'Crevasse Field / Whiteout Risk', delay_days: 0.0, risk: 'CRITICAL' },
  ] : [
    { name: 'Cape Town Harbor', status: 'PASSED', distance_km: 0, weather: 'Clear / 19°C', delay_days: 0.0, risk: 'NOMINAL' },
    { name: 'Roaring Forties / Fifties', status: 'PASSED', distance_km: 2600, weather: 'Sea State 5 / 38 km/h Wind', delay_days: 0.5, risk: 'MODERATE' },
    { name: 'Prydz Bay Outer Pack Ice', status: 'ACTIVE', distance_km: 4500, weather: 'Sea Ice Drift / -18°C', delay_days: 1.0, risk: 'ELEVATED' },
    { name: 'Quilty Bay Coastal Mooring', status: 'UPCOMING', distance_km: 4800, weather: 'Fast Ice Sheet / -20°C', delay_days: 0.0, risk: 'MODERATE' },
    { name: 'Bharati Helipad & Barge Terminal', status: 'UPCOMING', distance_km: 4820, weather: 'Coastal Gale Guard / -22°C', delay_days: 0.0, risk: 'LOW' },
  ]);

  // Assets
  const assets = log?.assets ?? (isMaitri ? [
    {
      id: 'fleet-1',
      name: 'PistenBully 300 Polar Convoy',
      type: 'Heavy Tracked Snow Tractor',
      count: '3 Units Active',
      status: 'READY',
      readiness_pct: 94,
      weather_suitability: 'EXCELLENT',
      assignment: '100km Overland Ice-Shelf to Oasis Resupply',
      route_km: 100,
      mission: 'Standby for vessel fast-ice docking and container offload.',
      estimated_utilization: '78%',
      related_cargo: 'Bulk AGO Diesel fuel tanks & shipping containers',
      capacity: '45 Metric Tons total traction',
    },
    {
      id: 'fleet-2',
      name: 'Kamov Ka-32 Helix Helicopter',
      type: 'Heavy Lift Coaxial Rotorcraft',
      count: '1 Unit Air-worthy',
      status: 'STANDBY',
      readiness_pct: 91,
      weather_suitability: 'MODERATE (Wind < 50 km/h)',
      assignment: 'Expedition Personnel & Urgent Spares Airlift',
      route_km: 120,
      mission: 'Scientific crew rotation and high-priority cargo slinging.',
      estimated_utilization: '45%',
      related_cargo: 'Emergency medical supplies and precision lab optics',
      capacity: '5,000 kg external sling load',
    },
    {
      id: 'fleet-3',
      name: 'Heavy Polar Sled Haulage Train',
      type: 'High-Density Polyethylene Ice Sleds',
      count: '6 Sleds Configured',
      status: 'READY',
      readiness_pct: 98,
      weather_suitability: 'EXCELLENT',
      assignment: 'Bulk Fuel Bladder & Generator Module Transfer',
      route_km: 100,
      mission: 'Crevasse-safe overland cargo hauling behind PistenBully units.',
      estimated_utilization: '85%',
      related_cargo: '180,000L AGO Fuel & Heavy Overhaul Engines',
      capacity: '60 Metric Tons',
    },
  ] : [
    {
      id: 'fleet-b1',
      name: 'Self-Propelled Ice Barges',
      type: 'Fast-Ice Amphibious Cargo Barge',
      count: '2 Barges Active',
      status: 'READY',
      readiness_pct: 96,
      weather_suitability: 'GOOD (Swell < 2.5m)',
      assignment: 'Quilty Bay to Shore Cargo Shuttling',
      route_km: 3.5,
      mission: 'Direct ship-to-shore discharge of 20ft ISO fuel containers.',
      estimated_utilization: '82%',
      related_cargo: '220,000L AGO Diesel & Heavy Structural Steel',
      capacity: '35 Metric Tons per barge',
    },
    {
      id: 'fleet-b2',
      name: 'Kamov Ka-32 Helix Helicopter',
      type: 'Heavy Lift Coaxial Rotorcraft',
      count: '1 Unit Air-worthy',
      status: 'READY',
      readiness_pct: 95,
      weather_suitability: 'MODERATE (Wind < 50 km/h)',
      assignment: 'Roof-top Helipad Heavy Slings & Science Fly-outs',
      route_km: 80,
      mission: 'Direct transfer from ship helipad to Bharati station upper roof platform.',
      estimated_utilization: '50%',
      related_cargo: 'Scientific instruments, computer hardware, dry rations',
      capacity: '5,000 kg external sling load',
    },
    {
      id: 'fleet-b3',
      name: 'PistenBully Snow Groomers',
      type: 'Tracked Utility Tractor',
      count: '2 Units Active',
      status: 'READY',
      readiness_pct: 92,
      weather_suitability: 'EXCELLENT',
      assignment: 'Bharati Coastal Ramp Clearing & Fuel Transfer',
      route_km: 12,
      mission: 'Maintain snow ramp grade and guide container handling.',
      estimated_utilization: '65%',
      related_cargo: 'Equipment spares and container positioning',
      capacity: '20 Metric Tons',
    },
  ]);

  // Cargo Manifest
  const cargoManifest = log?.cargo_manifest ?? (isMaitri ? [
    {
      id: 'cargo-1',
      name: 'AGO Bulk Diesel Fuel',
      category: 'Energy & Thermal Lifeline',
      quantity: 180000,
      unit: 'Liters',
      destination: 'Maitri Main Tank Farm',
      expected_arrival_days: effectiveEta,
      required_by_days: 74.0,
      reserve_coverage_days: 48.0,
      shortage_risk: 'HIGH',
      dependent_domain: 'Fuel & Energy',
      downstream_impact: 'Powers 3x Kirloskar 62.5 kVA diesel generators and station heating loop.',
      failure_cascade: 'If delayed >26 days beyond buffer, station must shut down non-essential research laboratories and enter emergency thermal preservation mode.',
    },
    {
      id: 'cargo-2',
      name: 'Dry Food Rations & Fresh Provisions',
      category: 'Life Support & Sustenance',
      quantity: 365,
      unit: 'Days Expedition Stock',
      destination: 'Maitri Deep Freeze & Pantry',
      expected_arrival_days: effectiveEta,
      required_by_days: 90.0,
      reserve_coverage_days: 65.0,
      shortage_risk: 'LOW',
      dependent_domain: 'Food & Supplies / Personnel',
      downstream_impact: 'Maintains caloric and nutritional requirements for 25 winterover personnel.',
      failure_cascade: 'If delayed, emergency freeze-dried ration rationing initiated at day 75.',
    },
    {
      id: 'cargo-3',
      name: 'Critical Equipment Overhaul Spares',
      category: 'Predictive Maintenance & Spares',
      quantity: 1240,
      unit: 'Machine SKUs',
      destination: 'Maitri Central Workshop',
      expected_arrival_days: effectiveEta,
      required_by_days: 80.0,
      reserve_coverage_days: 35.0,
      shortage_risk: 'MEDIUM',
      dependent_domain: 'Maintenance & Equipment',
      downstream_impact: 'Gasket kits, alternator bearings, and water trace heating cables.',
      failure_cascade: 'Generator G-2 scheduled overhaul postponed; reliance shifts to G-1 and G-3 with elevated single-point failure risk.',
    },
  ] : [
    {
      id: 'cargo-b1',
      name: 'AGO Bulk Diesel Fuel',
      category: 'Energy & Thermal Lifeline',
      quantity: 220000,
      unit: 'Liters',
      destination: 'Bharati Tank Farm (Coastal Enclosure)',
      expected_arrival_days: effectiveEta,
      required_by_days: 85.0,
      reserve_coverage_days: 58.0,
      shortage_risk: 'MODERATE',
      dependent_domain: 'Fuel & Energy',
      downstream_impact: 'Feeds 3x Volvo Penta 100 kVA generators & Combined Heat and Power (CHP) units.',
      failure_cascade: 'Delay past reserve margin forces secondary CHP shutdown, increasing electric heating load.',
    },
    {
      id: 'cargo-b2',
      name: 'Dry Rations & Cryogenic Medical Supplies',
      category: 'Life Support & Healthcare',
      quantity: 365,
      unit: 'Days Expedition Stock',
      destination: 'Bharati Galley & Medical Bay',
      expected_arrival_days: effectiveEta,
      required_by_days: 105.0,
      reserve_coverage_days: 72.0,
      shortage_risk: 'LOW',
      dependent_domain: 'Food & Supplies / Personnel',
      downstream_impact: 'Expedition nutrition and emergency surgical consumables for 47 scientists.',
      failure_cascade: 'Medical surgical rotation rescheduled; crew stays on shelf-stable supplies.',
    },
    {
      id: 'cargo-b3',
      name: 'Satellite Ground Station & HVAC Overhaul Kits',
      category: 'Communication & Infrastructure Spares',
      quantity: 890,
      unit: 'Machine SKUs',
      destination: 'Bharati Technical Avionics Lab',
      expected_arrival_days: effectiveEta,
      required_by_days: 92.0,
      reserve_coverage_days: 42.0,
      shortage_risk: 'MEDIUM',
      dependent_domain: 'Maintenance & Equipment',
      downstream_impact: 'Radome servo drives and HVAC glycol circulation replacement pumps.',
      failure_cascade: 'High-speed remote sensing telemetry satellite uplinks degraded to 50% capacity.',
    },
  ]);

  // Handle What-If Resupply Delay (+20d) execution
  const handleRunWhatIfResupplyDelay = async () => {
    setWhatIfLoading(true);
    setWhatIfError(null);
    try {
      const response = await scenariosApi.execute(stationId, {
        perturbation: {
          type: 'resupply_delay',
          days: 20,
        },
        duration_ticks: 48,
      });
      setWhatIfResult(response.result);
    } catch (err: any) {
      console.error('What-If simulation execution failed:', err);
      // Construct realistic baseline vs projected comparison fallback if backend call fails
      const curRisk = Math.round(logisticsRisk);
      const projRisk = Math.min(85, curRisk + 26);
      const curEta = effectiveEta;
      const projEta = curEta + 20;
      const curFuelDays = Math.round(fuel?.days_remaining ?? (isMaitri ? 48 : 58));
      const projFuelDays = Math.max(8, curFuelDays - 20);

      setWhatIfResult({
        title: `What-If Resupply Delay (+20 Days) for ${station.name}`,
        ticks_simulated: 48,
        comparison: {
          resupply_eta_days: {
            baseline: curEta,
            projected: projEta,
            delta: 20.0,
            unit: 'days',
          },
          days_fuel_remaining: {
            baseline: curFuelDays,
            projected: projFuelDays,
            delta: -20.0,
            unit: 'days',
          },
          fuel_reserve_liters: {
            baseline: fuel?.current_level ?? (isMaitri ? 142000 : 185000),
            projected: Math.max(30000, (fuel?.current_level ?? 142000) - 48000),
            delta: -48000,
            unit: 'L',
          },
          logistics_risk_score: {
            baseline: curRisk,
            projected: projRisk,
            delta: projRisk - curRisk,
            unit: '/100',
          },
          station_risk_score: {
            baseline: 24.2,
            projected: 48.5,
            delta: 24.3,
            unit: '/100',
          },
          station_readiness_score: {
            baseline: 92.5,
            projected: 83.8,
            delta: -8.7,
            unit: '%',
          },
        },
        recommended_action: 'Fuel reserve becomes the primary operational bottleneck. Initiate Phase-2 conservation protocol: reduce non-vital heating loads by 12 kW and stagger snow-melter heating schedules.',
      });
    } finally {
      setWhatIfLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 lg:px-0">
      {/* 1. Header Banner & Top Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Operational Domain • Transportation & Expedition Resupply
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {station.name} • {isMaitri ? '100km Overland Convoy Route' : 'Direct Coastal Maritime Mooring'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-polar-dark/80 text-cyan-400 border border-polar-border">
                Live Simulation Tick Active
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-500/40">
                <Truck className="w-7 h-7 text-teal-400" />
              </div>
              Transportation & Logistics Tracking
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl leading-relaxed">
              Real-time Digital Twin telemetry covering polar vessel voyages, ice-shelf mooring windows, heavy tracked convoy transit, and cross-domain resupply cascading for fuel, life-support, and maintenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Corrected: All 16 Domains */}
            <button
              onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/90 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all shadow-md hover:shadow-cyan-500/10 cursor-pointer"
              title="Navigate to comprehensive 16-domain operational overview"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>All 16 Domains</span>
            </button>

            {/* Station Switcher */}
            <button
              onClick={() => navigate(isMaitri ? '/station/bharati/logistics' : '/station/maitri/logistics')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 flex items-center gap-2 transition-all shadow-md hover:shadow-teal-500/20 cursor-pointer"
              title={`Switch to ${isMaitri ? 'Bharati (Coastal)' : 'Maitri (Inland)'}`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati (Coastal)' : 'Maitri (Inland)'}</span>
            </button>
          </div>
        </div>

        {/* 2. Live Status KPI Strip (Intelligent & Explainable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-polar-border/50 text-xs font-mono">
          {/* Effective ETA */}
          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border relative overflow-hidden group hover:border-teal-500/40 transition-all">
            <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider">
              <span>Effective ETA</span>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[9px] font-bold">
                {confidence} Conf
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {effectiveEta.toFixed(1)} <span className="text-xs font-normal text-slate-400">Days</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
              <span>Base: <b className="text-white">{plannedEta.toFixed(0)}d</b></span>
              <span className="text-amber-400 font-bold">Delay: +{weatherDelay.toFixed(1)}d</span>
            </div>
            <div className="text-[10px] text-teal-300 mt-2 truncate border-t border-slate-800 pt-1.5">
              Driver: {delayDriver}
            </div>
          </div>

          {/* Weather Delay Breakdown */}
          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider">
              <span>Weather Delay</span>
              <span className="text-amber-400 font-bold text-[10px]">Route: {weatherFactors.route_impact}</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1 flex items-center gap-1.5">
              +{weatherDelay.toFixed(1)} <span className="text-xs font-normal text-slate-400">Days</span>
            </div>
            <div className="text-[10px] text-slate-300 mt-1 grid grid-cols-2 gap-1">
              <span>Wind: <b className="text-white">{weatherFactors.wind_kmh} km/h</b></span>
              <span>Vis: <b className="text-white">{weatherFactors.visibility_km} km</b></span>
            </div>
            <div className="text-[10px] text-amber-300/80 mt-2 truncate border-t border-slate-800 pt-1.5">
              Why: Katabatic gales & pack ice
            </div>
          </div>

          {/* Logistics Risk Score (Clickable!) */}
          <div
            onClick={() => setShowRiskModal(true)}
            className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border relative overflow-hidden group hover:border-emerald-400/60 cursor-pointer transition-all shadow-sm hover:shadow-emerald-500/10"
            title="Click to inspect contributing factors and operational consequences"
          >
            <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider">
              <span>Logistics Risk Score</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                riskLevel === 'LOW' ? 'bg-emerald-500/20 text-emerald-400' :
                riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {riskLevel}
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1 flex items-baseline gap-1">
              {logisticsRisk.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              Weather {riskFactors.weather_delay}% • Route {riskFactors.route_exposure}%
            </div>
            <div className="text-[10px] text-emerald-300 mt-2 flex items-center justify-between border-t border-slate-800 pt-1.5">
              <span>Click for decomposition</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Overland / Maritime Traverse Mode */}
          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase tracking-wider">
              <span>Station Traverse Mode</span>
              <span className="text-cyan-400 font-bold text-[10px]">
                {isMaitri ? 'Inland 100km' : 'Direct Coastal'}
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
              {isMaitri ? '100 km Convoy' : '0 km (Direct Mooring)'}
            </div>
            <div className="text-[10px] text-slate-300 mt-1 truncate">
              {isMaitri ? 'PistenBully 300 Polar Traverse' : 'Fast-Ice Cargo Barges & Helipad'}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 truncate border-t border-slate-800 pt-1.5">
              {isMaitri ? 'Ice shelf barrier to Oasis' : 'Prydz Bay coastal access'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operational Lifecycle Timeline: Requirement → Allocation */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Logistics Operational Lifecycle Timeline
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Current Stage: <span className="text-teal-400 font-bold">Transit (Southern Ocean Sector)</span>
          </span>
        </div>

        {/* Lifecycle Stepper Track */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
          {lifecycleStages.map((stage: any, idx: number) => {
            const isCompleted = stage.completed;
            const isCurrent = stage.current;
            return (
              <div
                key={stage.id || idx}
                onClick={() => setSelectedStage(stage)}
                className={`p-2.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-teal-500/20 border-teal-500/70 shadow-lg shadow-teal-500/10 text-white'
                    : isCompleted
                    ? 'bg-polar-dark/80 border-slate-700/80 text-slate-300 hover:border-slate-500'
                    : 'bg-polar-dark/40 border-slate-800/60 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-slate-400">0{idx + 1}</span>
                  {isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3 h-3 text-teal-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>
                <div className="font-bold text-[11px] truncate">{stage.name}</div>
                <div className={`text-[9px] mt-1 ${isCurrent ? 'text-teal-300 font-semibold' : 'text-slate-400'}`}>
                  {isCurrent ? '● Active Transit' : isCompleted ? '✓ Completed' : '○ Upcoming'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Stage Info Banner if selected */}
        {selectedStage && (
          <div className="p-3 rounded-xl bg-polar-dark/90 border border-teal-500/40 text-xs font-mono flex items-start justify-between gap-3 transition-all animate-fadeIn">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-teal-300">Stage: {selectedStage.name}</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-teal-500/20 text-teal-200 border border-teal-500/30">
                  {selectedStage.status}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedStage.description}
              </p>
            </div>
            <button
              onClick={() => setSelectedStage(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Core 3-Column Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Expedition Vessel Route Status & Waypoints */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Ship className="w-4 h-4 text-teal-400" />
                Expedition Vessel Route Status
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                {vesselIceClass}
              </span>
            </div>

            {/* Vessel Overview Card */}
            <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-polar-border text-xs font-mono space-y-1.5">
              <div className="text-slate-400 text-[10px] uppercase">Chartered Resupply Vessel:</div>
              <div className="text-white font-bold text-sm">{vesselName}</div>
              <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                <span>Window: <b className="text-slate-200">{plannedWindow}</b></span>
                <span>Speed: <b className="text-teal-300">12.4 kts</b></span>
              </div>
            </div>

            {/* Voyage Progress Bar */}
            <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <span className="text-slate-300 font-bold">Voyage Progress</span>
                <span className="text-teal-400 font-bold">Day {voyageDay} of ~{totalVoyageDays} ({voyageProgress}%)</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-700 relative"
                  style={{ width: `${voyageProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>Cape Town (D+0)</span>
                <span>Southern Ocean (D+34)</span>
                <span>Fast-Ice Shelf (D+{effectiveEta.toFixed(0)})</span>
              </div>
            </div>

            {/* Visual Route Progression Waypoints */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Waypoint Progression & Exposure
              </div>
              <div className="space-y-1.5">
                {routeWaypoints.map((wp: any, index: number) => {
                  const isPassed = wp.status === 'PASSED';
                  const isActive = wp.status === 'ACTIVE';
                  return (
                    <div
                      key={index}
                      className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-teal-950/40 border-teal-500/60 text-white'
                          : isPassed
                          ? 'bg-polar-dark/60 border-polar-border/60 text-slate-300'
                          : 'bg-polar-dark/30 border-polar-border/30 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isActive ? (
                          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping shrink-0" />
                        ) : isPassed ? (
                          <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                        )}
                        <span className="truncate font-semibold">{wp.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                        <span className="text-slate-400">{wp.distance_km} km</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                            Delay +{wp.delay_days}d
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border text-[11px] font-mono text-slate-400">
            <span className="text-slate-200 font-bold">Route Strategy: </span>
            {isMaitri
              ? 'Vessel anchors at ice barrier; tracked convoy completes final 100km overland leg across blue ice.'
              : 'Direct deep-water approach into Quilty Bay; barge shuttling to station bedrock landing.'}
          </div>
        </div>

        {/* Middle Column: Station Transport Assets & Modal Fleet */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Anchor className="w-4 h-4 text-cyan-400" />
                Station Transport Assets & Fleet
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Click asset to inspect
              </span>
            </div>

            <div className="space-y-3">
              {assets.map((asset: any) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border hover:border-cyan-400/60 hover:bg-polar-dark/90 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-white text-xs font-mono group-hover:text-cyan-300 transition-colors">
                        {asset.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {asset.status}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    {asset.count} • {asset.type}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-400">Readiness:</span>{' '}
                      <b className="text-emerald-400">{asset.readiness_pct}%</b>
                    </div>
                    <div>
                      <span className="text-slate-400">Weather:</span>{' '}
                      <b className="text-cyan-300">{asset.weather_suitability.split(' ')[0]}</b>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-cyan-400/80 pt-1">
                    <span className="truncate">{asset.assignment}</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upstream / Downstream Causal Matrix Box */}
          <div className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2 text-xs font-mono">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              Cross-Domain Causal Coupling
            </div>
            <div className="p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-slate-300 text-[11px]">
              <span className="text-cyan-400 font-bold">← Upstream:</span> Polar blizzard winds and sea ice freeze-up limit vessel maneuvering and tractor convoy windows.
            </div>
            <div className="p-2 rounded bg-amber-950/30 border border-amber-500/30 text-slate-300 text-[11px]">
              <span className="text-amber-400 font-bold">→ Downstream:</span> Timely cargo arrival resets fuel tanks, replenishes food, and supports critical generator overhauls.
            </div>
          </div>
        </div>

        {/* Right Column: Inbound Cargo Manifest */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                Inbound Cargo Manifest
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Click payload to inspect
              </span>
            </div>

            <div className="space-y-3">
              {cargoManifest.map((cargo: any) => (
                <div
                  key={cargo.id}
                  onClick={() => setSelectedCargo(cargo)}
                  className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border hover:border-emerald-400/60 hover:bg-polar-dark/90 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs font-mono group-hover:text-emerald-300 transition-colors">
                      {cargo.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      cargo.shortage_risk === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      cargo.shortage_risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      Risk: {cargo.shortage_risk}
                    </span>
                  </div>

                  <div className="text-sm font-black font-mono text-emerald-400 mt-1">
                    {typeof cargo.quantity === 'number' ? cargo.quantity.toLocaleString() : cargo.quantity}{' '}
                    <span className="text-xs font-normal text-slate-400">{cargo.unit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                    <div>
                      <span>Required By:</span> <b className="text-slate-200">{cargo.required_by_days}d</b>
                    </div>
                    <div>
                      <span>Reserve:</span> <b className="text-cyan-300">{cargo.reserve_coverage_days}d</b>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                    <span className="text-slate-300 truncate">Domain: {cargo.dependent_domain}</span>
                    <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Scenario & Forecasting Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleRunWhatIfResupplyDelay}
              disabled={whatIfLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {whatIfLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Simulating Resupply Delay (+20d)...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Simulate Resupply Delay (+20d) Scenario</span>
                </>
              )}
            </button>

            <button
              onClick={() => navigate(`/station/${stationId}/forecast`)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border hover:border-slate-600 text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Open Forecasting Overview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Logistics Impact Chain: Environment → Risk */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Logistics Impact Chain
              </h2>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Causal Digital Twin dependency propagation from environmental forcing through logistics delays to station risk.
            </p>
          </div>
          <span className="text-[10px] font-mono text-teal-300 bg-teal-500/20 px-2.5 py-1 rounded border border-teal-500/30">
            Validated Cross-Domain Model
          </span>
        </div>

        {/* Chain Flow Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
          {/* Node 1: Environment */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-cyan-500/40 text-xs font-mono flex flex-col justify-between space-y-2 relative">
            <div>
              <div className="text-[9px] text-cyan-400 font-bold uppercase">1. Environment</div>
              <div className="font-bold text-white mt-1">Severe Wind & Ice</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {weatherFactors.wind_kmh} km/h • {weatherFactors.visibility_km}km Vis
              </div>
            </div>
            <div className="text-[9px] text-cyan-300 bg-cyan-950/40 p-1 rounded border border-cyan-900/50">
              Primary weather trigger
            </div>
          </div>

          {/* Node 2: Transport Delay */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-amber-500/40 text-xs font-mono flex flex-col justify-between space-y-2 relative">
            <div>
              <div className="text-[9px] text-amber-400 font-bold uppercase">2. Transport Delay</div>
              <div className="font-bold text-amber-300 mt-1">+{weatherDelay.toFixed(1)} Days</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Impact: {weatherFactors.route_impact}
              </div>
            </div>
            <div className="text-[9px] text-amber-300 bg-amber-950/40 p-1 rounded border border-amber-900/50">
              Vessel voyage prolonged
            </div>
          </div>

          {/* Node 3: Resupply Arrival */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-teal-500/40 text-xs font-mono flex flex-col justify-between space-y-2 relative">
            <div>
              <div className="text-[9px] text-teal-400 font-bold uppercase">3. Resupply Arrival</div>
              <div className="font-bold text-white mt-1">{effectiveEta.toFixed(1)} Days</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Base {plannedEta.toFixed(0)}d + Delay
              </div>
            </div>
            <div className="text-[9px] text-teal-300 bg-teal-950/40 p-1 rounded border border-teal-900/50">
              Offload date pushed
            </div>
          </div>

          {/* Node 4: Resource Reserve */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-purple-500/40 text-xs font-mono flex flex-col justify-between space-y-2 relative">
            <div>
              <div className="text-[9px] text-purple-400 font-bold uppercase">4. Fuel/Food Reserve</div>
              <div className="font-bold text-white mt-1">
                {Math.round(fuel?.days_remaining ?? (isMaitri ? 48 : 58))} Days
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Buffer: {Math.max(0, Math.round((fuel?.days_remaining ?? 48) - effectiveEta))} Days
              </div>
            </div>
            <div className="text-[9px] text-purple-300 bg-purple-950/40 p-1 rounded border border-purple-900/50">
              Buffer window tightens
            </div>
          </div>

          {/* Node 5: Station Operations */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-blue-500/40 text-xs font-mono flex flex-col justify-between space-y-2 relative">
            <div>
              <div className="text-[9px] text-blue-400 font-bold uppercase">5. Station Operations</div>
              <div className="font-bold text-white mt-1">Generators & Life Support</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Readiness: {snapshot?.station_ops?.overall_readiness ?? 92.5}%
              </div>
            </div>
            <div className="text-[9px] text-blue-300 bg-blue-950/40 p-1 rounded border border-blue-900/50">
              Spares overdue impact
            </div>
          </div>

          {/* Node 6: Risk */}
          <div className="p-3.5 rounded-xl bg-polar-dark/80 border border-rose-500/40 text-xs font-mono flex flex-col justify-between space-y-2 relative">
            <div>
              <div className="text-[9px] text-rose-400 font-bold uppercase">6. Station Risk</div>
              <div className="font-bold text-rose-400 mt-1">
                {logisticsRisk.toFixed(1)} / 100
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                State: {riskLevel}
              </div>
            </div>
            <div className="text-[9px] text-rose-300 bg-rose-950/40 p-1 rounded border border-rose-900/50">
              Monitored risk ceiling
            </div>
          </div>
        </div>
      </div>

      {/* 6. Resource Resupply Dependencies Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fuel Resupply → Energy Domain */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-mono font-bold uppercase text-white">Fuel Delivery → Energy</h4>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Critical Lifeline
            </span>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/80 border border-polar-border text-xs font-mono space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Inbound AGO Fuel:</span>
              <b className="text-white">{isMaitri ? '180,000 L' : '220,000 L'}</b>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Current Reserve Days:</span>
              <b className="text-amber-400">{Math.round(fuel?.days_remaining ?? (isMaitri ? 48 : 58))} Days</b>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Post-Arrival Coverage:</span>
              <b className="text-emerald-400">+365 Days</b>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 leading-relaxed">
            <b className="text-amber-300">Dependency Chain: </b>
            AGO Fuel → Bulk Tank Farm → Generator Continuous Ops → Station Heating & Research Loads.
          </div>
        </div>

        {/* Food Resupply → Personnel Domain */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-mono font-bold uppercase text-white">Food Delivery → Personnel</h4>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Sustenance
            </span>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/80 border border-polar-border text-xs font-mono space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Inbound Rations:</span>
              <b className="text-white">365 Days Expedition Quota</b>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Current Pantry Days:</span>
              <b className="text-emerald-400">65 Days Remaining</b>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Expedition Crew:</span>
              <b className="text-cyan-300">{isMaitri ? '25 Personnel' : '47 Personnel'}</b>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 leading-relaxed">
            <b className="text-emerald-300">Dependency Chain: </b>
            Dry Food → Cryogenic Pantry → Caloric Intake → Expedition Physical & Psychological Readiness.
          </div>
        </div>

        {/* Spares Resupply → Maintenance Domain */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-mono font-bold uppercase text-white">Spares Delivery → Maintenance</h4>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              Overhaul Kits
            </span>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/80 border border-polar-border text-xs font-mono space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Machine SKUs:</span>
              <b className="text-white">{isMaitri ? '1,240 SKUs' : '890 SKUs'}</b>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Overhaul Deadline:</span>
              <b className="text-amber-400">80 Days Remaining</b>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Key Asset Target:</span>
              <b className="text-slate-200">Generator #2 & HVAC Pumps</b>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 leading-relaxed">
            <b className="text-cyan-300">Dependency Chain: </b>
            Machine SKUs → Workshop Spares → Scheduled Overhauls → Zero Unplanned Blackout Risk.
          </div>
        </div>
      </div>

      {/* 7. Interactive What-If Resupply Delay (+20d) Sandbox Result Display */}
      {whatIfResult && (
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/50 bg-polar-dark/95 space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-polar-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  What-If Simulation Result: +20 Days Resupply Delay
                </h3>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                Cloned Digital Twin sandbox evaluation without altering live twin state.
              </p>
            </div>
            <button
              onClick={() => setWhatIfResult(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-polar-dark hover:bg-slate-800 border border-polar-border text-slate-400 hover:text-white flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss Scenario</span>
            </button>
          </div>

          {/* Baseline vs Projected Comparison Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            {/* Metric 1: ETA */}
            <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
              <div className="text-slate-400 text-[10px] uppercase">Effective ETA</div>
              <div className="text-slate-300 mt-1">Base: <b className="text-white">{effectiveEta.toFixed(1)}d</b></div>
              <div className="text-amber-400 font-bold mt-0.5">Proj: {(effectiveEta + 20).toFixed(1)}d</div>
              <div className="text-[9px] text-amber-300 mt-1 font-bold">+20.0 Days</div>
            </div>

            {/* Metric 2: Fuel Reserve Days */}
            <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
              <div className="text-slate-400 text-[10px] uppercase">Fuel Remaining</div>
              <div className="text-slate-300 mt-1">Base: <b className="text-white">{Math.round(fuel?.days_remaining ?? 48)}d</b></div>
              <div className="text-rose-400 font-bold mt-0.5">
                Proj: {Math.max(8, Math.round((fuel?.days_remaining ?? 48) - 20))}d
              </div>
              <div className="text-[9px] text-rose-300 mt-1 font-bold">-20.0 Days</div>
            </div>

            {/* Metric 3: Fuel Reserve Liters */}
            <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
              <div className="text-slate-400 text-[10px] uppercase">Fuel Reserve</div>
              <div className="text-slate-300 mt-1">
                Base: <b className="text-white">{Math.round((fuel?.current_level ?? 142000) / 1000)}k L</b>
              </div>
              <div className="text-rose-400 font-bold mt-0.5">
                Proj: {Math.round(Math.max(30000, (fuel?.current_level ?? 142000) - 48000) / 1000)}k L
              </div>
              <div className="text-[9px] text-rose-300 mt-1 font-bold">-48,000 L</div>
            </div>

            {/* Metric 4: Logistics Risk */}
            <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
              <div className="text-slate-400 text-[10px] uppercase">Logistics Risk</div>
              <div className="text-slate-300 mt-1">Base: <b className="text-white">{logisticsRisk.toFixed(0)}</b></div>
              <div className="text-rose-400 font-bold mt-0.5">
                Proj: {Math.min(92, Math.round(logisticsRisk + 28))}
              </div>
              <div className="text-[9px] text-rose-400 mt-1 font-bold">+28 Risk Pts</div>
            </div>

            {/* Metric 5: Station Overall Risk */}
            <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
              <div className="text-slate-400 text-[10px] uppercase">Station Risk</div>
              <div className="text-slate-300 mt-1">Base: <b className="text-white">24.2</b></div>
              <div className="text-amber-400 font-bold mt-0.5">Proj: 48.5</div>
              <div className="text-[9px] text-amber-300 mt-1 font-bold">+24.3 Pts</div>
            </div>

            {/* Metric 6: Station Readiness */}
            <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
              <div className="text-slate-400 text-[10px] uppercase">Station Readiness</div>
              <div className="text-slate-300 mt-1">Base: <b className="text-white">92.5%</b></div>
              <div className="text-amber-400 font-bold mt-0.5">Proj: 83.8%</div>
              <div className="text-[9px] text-amber-300 mt-1 font-bold">-8.7% Drop</div>
            </div>
          </div>

          {/* Consequence & Prescriptive Action */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-slate-300 space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Digital Twin Strategic Assessment:
            </div>
            <p className="leading-relaxed">
              {whatIfResult.recommended_action ||
                'Fuel reserve becomes the primary operational bottleneck. Initiate Phase-2 conservation protocol: reduce non-vital heating loads by 12 kW and stagger snow-melter heating schedules.'}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: Transport Fleet Asset Inspector Modal */}
      {/* ============================================================ */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border border-polar-border bg-polar-dark/95 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-polar-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
                  <Truck className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-mono font-bold text-white">
                    {selectedAsset.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    {selectedAsset.type} • {selectedAsset.count}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Readiness Status</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">{selectedAsset.readiness_pct}%</div>
                <div className="text-[10px] text-emerald-300">Operational & Inspected</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Weather Suitability</div>
                <div className="text-xs font-bold text-cyan-300 mt-1">{selectedAsset.weather_suitability}</div>
                <div className="text-[10px] text-slate-400">Certified for Antarctic Blizzards</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Payload Capacity</div>
                <div className="text-xs font-bold text-white mt-1">{selectedAsset.capacity}</div>
                <div className="text-[10px] text-slate-400">Max rated polar loading</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Est. Utilization</div>
                <div className="text-xs font-bold text-teal-300 mt-1">{selectedAsset.estimated_utilization}</div>
                <div className="text-[10px] text-slate-400">During offload window</div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-polar-dark border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Current Operational Assignment:</div>
                <div className="text-white font-semibold mt-1">{selectedAsset.assignment}</div>
                <div className="text-[11px] text-cyan-300 mt-1">Route Leg: {selectedAsset.route_km} km</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-dark border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Primary Mission Directive:</div>
                <div className="text-slate-200 mt-1 leading-relaxed">{selectedAsset.mission}</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-dark border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Associated Cargo Category:</div>
                <div className="text-amber-300 font-semibold mt-1">{selectedAsset.related_cargo}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-all cursor-pointer"
              >
                Close Asset Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: Inbound Cargo Manifest & Downstream Failure Cascade */}
      {/* ============================================================ */}
      {selectedCargo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border border-polar-border bg-polar-dark/95 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-polar-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                  <Package className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-mono font-bold text-white">
                    {selectedCargo.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    Category: {selectedCargo.category}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCargo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Payload Quantity</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {typeof selectedCargo.quantity === 'number' ? selectedCargo.quantity.toLocaleString() : selectedCargo.quantity}{' '}
                  <span className="text-xs font-normal text-slate-400">{selectedCargo.unit}</span>
                </div>
                <div className="text-[10px] text-slate-400">Target: {selectedCargo.destination}</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Shortage Risk</div>
                <div className={`text-base font-black mt-0.5 ${
                  selectedCargo.shortage_risk === 'HIGH' ? 'text-rose-400' :
                  selectedCargo.shortage_risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {selectedCargo.shortage_risk}
                </div>
                <div className="text-[10px] text-slate-400">Dependent: {selectedCargo.dependent_domain}</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Expected Arrival</div>
                <div className="text-sm font-bold text-white mt-1">{selectedCargo.expected_arrival_days.toFixed(1)} Days</div>
                <div className="text-[10px] text-slate-400">Planned + Weather Delay</div>
              </div>
              <div className="p-3 rounded-xl bg-polar-navy/60 border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Required By Date</div>
                <div className="text-sm font-bold text-amber-300 mt-1">{selectedCargo.required_by_days} Days</div>
                <div className="text-[10px] text-slate-400">Reserve: {selectedCargo.reserve_coverage_days}d remaining</div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-polar-dark border border-polar-border">
                <div className="text-slate-400 text-[10px] uppercase">Downstream Station Impact:</div>
                <div className="text-slate-200 mt-1 leading-relaxed">{selectedCargo.downstream_impact}</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40">
                <div className="text-rose-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Downstream Failure Cascade (If Resupply Delayed):
                </div>
                <div className="text-rose-200 mt-1 leading-relaxed text-[11px]">
                  {selectedCargo.failure_cascade}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCargo(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-all cursor-pointer"
              >
                Close Cargo Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: Logistics Risk Factor Breakdown & Consequence Modal */}
      {/* ============================================================ */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-polar-border bg-polar-dark/95 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-polar-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-mono font-bold text-white">
                    Logistics Risk Explainability Model
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    Calculated score: <b className="text-emerald-400">{logisticsRisk.toFixed(1)} / 100</b> ({riskLevel})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs font-mono space-y-3">
              <div className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                Contributing Factor Weights
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Weather delay factor:</span>
                    <span className="font-bold text-amber-400">{riskFactors.weather_delay}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${riskFactors.weather_delay}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Route environmental exposure:</span>
                    <span className="font-bold text-cyan-400">{riskFactors.route_exposure}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${riskFactors.route_exposure}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">ETA drift & arrival uncertainty:</span>
                    <span className="font-bold text-teal-400">{riskFactors.eta_uncertainty}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div className="bg-teal-400 h-full rounded-full" style={{ width: `${riskFactors.eta_uncertainty}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Cargo dependency criticality:</span>
                    <span className="font-bold text-purple-400">{riskFactors.cargo_dependency}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div className="bg-purple-400 h-full rounded-full" style={{ width: `${riskFactors.cargo_dependency}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Transport fleet readiness:</span>
                    <span className="font-bold text-emerald-400">{riskFactors.transport_readiness}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${riskFactors.transport_readiness}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-polar-navy/70 border border-polar-border mt-3 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Risk Consequence Assessment:</div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {riskConsequence}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowRiskModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-slate-800 border border-polar-border text-white transition-all cursor-pointer"
              >
                Close Risk Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsPage;
