import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TelemetrySnapshot, RiskData } from '../../types';
import { useStationStore } from '../../store/stationStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useAlertStore } from '../../store/alertStore';
import { SparklineChart } from './SparklineChart';
import {
  Wind, Zap, Cpu, Fuel, Truck, Shield, ArrowRight,
  GitCommit, HelpCircle, RefreshCw, ExternalLink, PlayCircle,
  Sliders, Layers, Activity, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Gauge, Clock, ChevronRight, X
} from 'lucide-react';

export type CausalCardId = 'env' | 'energy' | 'gen' | 'fuel' | 'logistics' | 'risk';

interface Props {
  snapshot?: TelemetrySnapshot;
  risk?: RiskData;
  stationId?: string;
}

interface CausalCardMeta {
  id: CausalCardId;
  index: number;
  name: string; // EXACT mandated title
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  glowColor: string;
  routePath: string;
  whatIfPreset: string;
}

const CAUSAL_CARDS: CausalCardMeta[] = [
  {
    id: 'env',
    index: 1,
    name: 'ENVIRONMENT',
    icon: Wind,
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.3)',
    routePath: 'environment',
    whatIfPreset: 'blizzard_approach'
  },
  {
    id: 'energy',
    index: 2,
    name: 'ENERGY DEMAND',
    icon: Zap,
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    routePath: 'resources',
    whatIfPreset: 'heating_surge'
  },
  {
    id: 'gen',
    index: 3,
    name: 'GENERATOR LOAD',
    icon: Cpu,
    color: '#fb923c',
    glowColor: 'rgba(251, 146, 60, 0.3)',
    routePath: 'equipment',
    whatIfPreset: 'generator_derate'
  },
  {
    id: 'fuel',
    index: 4,
    name: 'FUEL BURN & RESERVE',
    icon: Fuel,
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.3)',
    routePath: 'resources',
    whatIfPreset: 'fuel_leak'
  },
  {
    id: 'logistics',
    index: 5,
    name: 'LOGISTICS RESUPPLY',
    icon: Truck,
    color: '#818cf8',
    glowColor: 'rgba(129, 140, 248, 0.3)',
    routePath: 'resources',
    whatIfPreset: 'logistics_delay'
  },
  {
    id: 'risk',
    index: 6,
    name: 'COMPOSITE STATION RISK',
    icon: Shield,
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.3)',
    routePath: 'risk',
    whatIfPreset: 'compound_failure'
  }
];

export const CausalGraphViewer: React.FC<Props> = ({
  snapshot: propSnapshot,
  risk: propRisk,
  stationId: propStationId
}) => {
  const navigate = useNavigate();
  const { selectedStationId, selectStation } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const currentStationId = propStationId || selectedStationId || 'maitri';
  const isMaitri = currentStationId === 'maitri';

  // Interactive States
  const [selectedCardId, setSelectedCardId] = useState<CausalCardId | null>('gen');
  const [isImpactTraceActive, setIsImpactTraceActive] = useState<boolean>(false);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);

  // Switch active station
  const handleStationToggle = (stId: string) => {
    selectStation(stId);
    navigate(`/station/${stId}`);
  };

  // Telemetry for both stations
  const maitriSnap = liveSnapshot['maitri'] || propSnapshot;
  const bharatiSnap = liveSnapshot['bharati'] || propSnapshot;
  const activeSnap = isMaitri ? maitriSnap : bharatiSnap;

  const maitriRisk = liveRisk['maitri'] || propRisk;
  const bharatiRisk = liveRisk['bharati'] || propRisk;
  const activeRisk = isMaitri ? maitriRisk : bharatiRisk;

  const maitriAlerts = alerts['maitri'] || [];
  const bharatiAlerts = alerts['bharati'] || [];
  const activeAlerts = isMaitri ? maitriAlerts : bharatiAlerts;

  // Station specific metrics with simulated fallback
  const maitriData = useMemo(() => {
    const env = maitriSnap?.environment;
    const eng = maitriSnap?.energy;
    const fuel = maitriSnap?.fuel;
    const log = maitriSnap?.logistics;

    return {
      temp: env?.temperature ?? -25.4,
      wind: env?.wind_speed ?? 34.2,
      gust: env?.wind_gust ?? 48.0,
      pressure: env?.pressure ?? 986.0,
      humidity: env?.humidity ?? 68.0,
      solarRad: env?.solar_radiation ?? 195.0,
      visibility: env?.visibility ?? 15.0,
      severity: env?.storm_severity ?? 0.15,

      totalDemand: eng?.total_demand ?? 85.0,
      baseLoad: eng?.base_load ?? 35.0,
      heatingLoad: eng?.heating_load ?? 32.0,
      scienceLoad: eng?.research_load ?? 12.0,
      waterHeatingLoad: eng?.water_heating_load ?? 6.0,
      solarOutput: eng?.solar_output ?? 22.0,

      genLoad: eng?.generator_load ?? 68.0,
      genLoadPct: ((eng?.generator_load ?? 68.0) / 100.0) * 100,
      genHealth: 91,
      genState: 'Unit A Lead • Unit B Standby',
      genHours: 4820,
      genFailRisk: 'LOW (0.04% / 24h)',

      fuelPct: fuel?.fuel_percentage ?? 77.2,
      fuelLiters: fuel?.current_level ?? 138600,
      fuelBurnRate: fuel?.consumption_rate_l_per_hr ?? 17.68,
      dailyFuelBurn: (fuel?.consumption_rate_l_per_hr ?? 17.68) * 24,
      daysRemaining: fuel?.days_remaining ?? 338.0,
      safeThresholdLiters: 45000,
      resupplyEtaDays: fuel?.resupply_eta_days ?? 115,

      logisticsStatus: 'Schedule On-Track',
      upcomingVessel: 'MV Vasiliy Golovnin',
      seaIceDelayRisk: 'Minimal (Maitri Ice Shelf Approach)',
      requiredSupplies: '120kL AGO Diesel + Polar Winter Rations',

      riskScore: maitriRisk?.score ?? 18,
      riskLevel: maitriRisk?.level ?? 'LOW',
      freshness: lastTickTime['maitri'] || 'Live Sync (4s)'
    };
  }, [maitriSnap, maitriRisk, lastTickTime]);

  const bharatiData = useMemo(() => {
    const env = bharatiSnap?.environment;
    const eng = bharatiSnap?.energy;
    const fuel = bharatiSnap?.fuel;
    const log = bharatiSnap?.logistics;

    return {
      temp: env?.temperature ?? -16.2,
      wind: env?.wind_speed ?? 28.5,
      gust: env?.wind_gust ?? 42.0,
      pressure: env?.pressure ?? 994.0,
      humidity: env?.humidity ?? 75.0,
      solarRad: env?.solar_radiation ?? 245.0,
      visibility: env?.visibility ?? 20.0,
      severity: env?.storm_severity ?? 0.10,

      totalDemand: eng?.total_demand ?? 110.0,
      baseLoad: eng?.base_load ?? 45.0,
      heatingLoad: eng?.heating_load ?? 38.0,
      scienceLoad: eng?.research_load ?? 18.0,
      waterHeatingLoad: eng?.water_heating_load ?? 9.0,
      solarOutput: eng?.solar_output ?? 34.0,

      genLoad: eng?.generator_load ?? 84.0,
      genLoadPct: ((eng?.generator_load ?? 84.0) / 200.0) * 100,
      genHealth: 94,
      genState: '3×100kVA Automated CHP Load-Share',
      genHours: 3240,
      genFailRisk: 'VERY LOW (0.01% / 24h)',

      fuelPct: fuel?.fuel_percentage ?? 84.5,
      fuelLiters: fuel?.current_level ?? 252000,
      fuelBurnRate: fuel?.consumption_rate_l_per_hr ?? 21.84,
      dailyFuelBurn: (fuel?.consumption_rate_l_per_hr ?? 21.84) * 24,
      daysRemaining: fuel?.days_remaining ?? 525.0,
      safeThresholdLiters: 60000,
      resupplyEtaDays: fuel?.resupply_eta_days ?? 125,

      logisticsStatus: 'Harbor Channel Monitored',
      upcomingVessel: 'MV Vasiliy Golovnin',
      seaIceDelayRisk: 'Moderate (Larsemann Hills Fast Ice)',
      requiredSupplies: 'ISO Tank Re-cert + Seawater Filter Plant Replacement Membranes',

      riskScore: bharatiRisk?.score ?? 14,
      riskLevel: bharatiRisk?.level ?? 'LOW',
      freshness: lastTickTime['bharati'] || 'Live Sync (4s)'
    };
  }, [bharatiSnap, bharatiRisk, lastTickTime]);

  const activeData = isMaitri ? maitriData : bharatiData;

  // Causal Relationships Definition: Upstream Causes & Downstream Consequences
  const getCausalRelationships = (cardId: CausalCardId) => {
    switch (cardId) {
      case 'env':
        return {
          upstream: [] as CausalCardId[],
          downstream: ['energy', 'gen', 'logistics', 'risk'] as CausalCardId[],
          summary: 'Ambient temperature, polar downslope winds, and solar radiation directly drive heating loads and resupply accessibility.'
        };
      case 'energy':
        return {
          upstream: ['env'] as CausalCardId[],
          downstream: ['gen', 'risk'] as CausalCardId[],
          summary: 'Aggregated base, HVAC, and lab demands dictate the net electrical generation target for the power grid.'
        };
      case 'gen':
        return {
          upstream: ['env', 'energy'] as CausalCardId[],
          downstream: ['fuel', 'risk'] as CausalCardId[],
          summary: 'Generator output satisfies net demand deficit after subtracting solar PV, consuming fuel proportionally.'
        };
      case 'fuel':
        return {
          upstream: ['gen'] as CausalCardId[],
          downstream: ['logistics', 'risk'] as CausalCardId[],
          summary: 'Generator load burns diesel from the bulk fuel reserve, advancing depletion toward annual resupply.'
        };
      case 'logistics':
        return {
          upstream: ['env', 'fuel'] as CausalCardId[],
          downstream: ['risk'] as CausalCardId[],
          summary: 'Reserve days remaining versus vessel arrival ETA dictates the station survival window.'
        };
      case 'risk':
        return {
          upstream: ['env', 'energy', 'gen', 'fuel', 'logistics'] as CausalCardId[],
          downstream: [] as CausalCardId[],
          summary: 'Multi-domain composite risk index synthesized from electrical headroom, thermal margins, and fuel safety.'
        };
    }
  };

  const activeRelationships = selectedCardId ? getCausalRelationships(selectedCardId) : null;

  // Detailed Intelligence Per Card
  const getCardIntelligence = (cardId: CausalCardId, stId: string) => {
    const isM = stId === 'maitri';
    const d = isM ? maitriData : bharatiData;

    switch (cardId) {
      case 'env':
        return {
          currentSummary: isM
            ? `Inland Antarctic plateau climate: -25.4°C ambient with 34.2 km/h polar downslope winds and 195 W/m² solar irradiance.`
            : `Maritime polar coastal climate: -16.2°C ambient with 28.5 km/h coastal winds and 245 W/m² solar irradiance.`,
          keyMetrics: [
            { label: 'Ambient Temperature', value: `${d.temp.toFixed(1)}°C`, sub: 'Target indoor: 21°C' },
            { label: 'Wind Velocity', value: `${d.wind.toFixed(0)} km/h`, sub: `Gusts to ${d.gust.toFixed(0)} km/h` },
            { label: 'Solar Irradiance', value: `${d.solarRad.toFixed(0)} W/m²`, sub: 'Double-sided insolation' },
            { label: 'Weather layer Pressure', value: `${d.pressure.toFixed(0)} hPa`, sub: 'Air pressure tendency: Stable' },
            { label: 'Relative Humidity', value: `${d.humidity.toFixed(0)}%`, sub: 'Ice crystallization point' },
            { label: 'Weather Severity', value: `${(d.severity * 100).toFixed(0)}%`, sub: isM ? 'Moderate Polar downslope wind' : 'Mild Coastal' },
          ],
          trend: [ -23, -24, -25, -25.4, -25.2, -25.6, -25.4 ],
          whyExplanation: isM
            ? `Polar downslope wind air currents spilling from the Polar Plateau across the Schirmacher Oasis create steady freezing conditions (-25.4°C). Every 1°C ambient drop increases habitat heating demand by approximately 1.35 kW.`
            : `Coastal Larsemann Hills geography moderates ambient cold (-16.2°C) via maritime thermal mass, but brings humid salt-fog and variable coastal storm fronts that affect solar panel generation.`,
          upstreamDrivers: ['Antarctic Polar Spinning air mass Circulation', 'Schirmacher Moraine Topography', 'Diurnal Polar Sun Elevation'],
          downstreamConsequences: [
            `Forces ${d.heatingLoad.toFixed(0)} kW of Habitat Heating draw across thermal loops`,
            `Supplies ${d.solarOutput.toFixed(0)} kW of supplemental Solar PV power to power grid`,
            `Dictates trace-heating requirement for overland water conduits`,
            `Governs air/tractor traverse logistics weather windows`
          ],
          forecast: 'Diurnal drift of ±1.5°C over next 12 hours. Wind expected to stay under 45 km/h blizzard threshold.',
          riskContribution: { score: isM ? 4 : 2, level: 'LOW', detail: 'Temperature well above emergency cold-soak threshold (-45°C).' },
          recommendedAction: 'Keep south-facing solar array snow deflector shields locked in position.',
          cardDisplayValue: `${d.temp.toFixed(0)}°C • ${d.wind.toFixed(0)} km/h`
        };

      case 'energy':
        return {
          currentSummary: isM
            ? `Total demand is 85.0 kW, dominated by habitat heating (32.0 kW) and base operations (35.0 kW).`
            : `Total demand is 110.0 kW, reflecting higher research satcom instrumentation (18.0 kW) and RO desal trace heating (9.0 kW).`,
          keyMetrics: [
            { label: 'Total Grid Demand', value: `${d.totalDemand.toFixed(1)} kW`, sub: 'Aggregated load' },
            { label: 'Base Habitat Load', value: `${d.baseLoad.toFixed(1)} kW`, sub: 'Galley, lighting, comms' },
            { label: 'Habitat Heating Draw', value: `${d.heatingLoad.toFixed(1)} kW`, sub: 'Hydronic glycol & HVAC' },
            { label: 'Science Instruments', value: `${d.scienceLoad.toFixed(1)} kW`, sub: 'Geomag, Seismo, Radar' },
            { label: 'Water Freeze Protection', value: `${d.waterHeatingLoad.toFixed(1)} kW`, sub: 'Line trace-heating' },
            { label: 'Solar Offset Capacity', value: `-${d.solarOutput.toFixed(1)} kW`, sub: 'Clean renewable power' },
          ],
          trend: [ 81, 83, 85, 84, 85, 86, 85 ],
          whyExplanation: isM
            ? `Demand is dominated by the 46.4°C thermal lift required between exterior (-25.4°C) and interior (21°C) temperatures, consuming 32.0 kW. Science and galley base operations contribute the remaining 53.0 kW.`
            : `Bharati operates higher baseload (45 kW) due to containerized modular architecture, earth-station tracking aerial motors (18 kW), and dual reverse-osmosis seawater purification pump heaters.`,
          upstreamDrivers: ['Environment (Exterior Cold Lift)', 'Crew Activity & Kitchen Meal Prep Cycles', 'Science Array Radar Transmissions'],
          downstreamConsequences: [
            `Directly sizes dispatch setpoint on Generator (${d.genLoad.toFixed(0)} kW load)`,
            `Governs battery bank charge/discharge buffering`,
            `Drives rate of fuel consumption in primary day tanks`
          ],
          forecast: 'Demand will rise +6 kW during evening meal prep and satellite link window.',
          riskContribution: { score: isM ? 3 : 2, level: 'LOW', detail: 'Demand is within 85% single-generator threshold.' },
          recommendedAction: 'Maintain non-essential lab equipment on staggered timer to avoid peak coincident spikes.',
          cardDisplayValue: `${d.totalDemand.toFixed(0)} kW Demand`
        };

      case 'gen':
        return {
          currentSummary: isM
            ? `Generator Unit A is supplying 68.0 kW (68% load factor) with Unit B on automated warm standby.`
            : `Automated 3×100kVA CHP array is supplying 84.0 kW with automated load sharing and thermal jacket capture.`,
          keyMetrics: [
            { label: 'Active Generator Load', value: `${d.genLoad.toFixed(1)} kW`, sub: `${d.genLoadPct.toFixed(0)}% rated capacity` },
            { label: 'Operating State', value: d.genState, sub: 'Powerhouse topology' },
            { label: 'Power Plant Health', value: `${d.genHealth}%`, sub: 'Vibration & temp nominal' },
            { label: 'Specific Fuel Burn', value: `${d.fuelBurnRate.toFixed(2)} L/hr`, sub: '0.26 L/kWh rate' },
            { label: 'Run Hours on Unit', value: `${d.genHours} hrs`, sub: 'Next lube service: 5,000 hrs' },
            { label: '24h Failure Risk', value: d.genFailRisk, sub: 'Predictive model' },
          ],
          trend: [ 64, 66, 68, 67, 68, 69, 68 ],
          whyExplanation: isM
            ? `Generator output equals Total Demand (85.0 kW) minus Solar PV output (22.0 kW) + charging overhead = 68.0 kW. Single-unit running preserves fuel while Unit B automated transfer switch stands ready.`
            : `Bharati's power grid synchronizer splits 84.0 kW load across two CHP units (42 kW each) to optimize engine thermal efficiency and harvest 64 kWt of jacket water heat directly into the living module hydronic radiators.`,
          upstreamDrivers: ['Energy Demand (Net Load Request)', 'Solar PV Contribution (Offset)', 'Generator Controller Governor'],
          downstreamConsequences: [
            `Burns ${d.fuelBurnRate.toFixed(2)} L/hr of Arctic Gas Oil from storage`,
            `Supplies 415V 3-phase power to central Power grid Bus`,
            `Provides exhaust and jacket thermal cogeneration for station heat`
          ],
          forecast: 'Diesel generator will continue at 65–75 kW throughout polar daylight window.',
          riskContribution: { score: isM ? 5 : 2, level: isM ? 'MODERATE' : 'LOW', detail: isM ? 'Single active generator without hot backup systems' : 'N+1 automated CHP array' },
          recommendedAction: isM ? 'Verify battery starter voltage on standby Unit B (minimum 25.4V).' : 'Inspect heat exchanger differential pressure on CHP unit 1.',
          cardDisplayValue: `${d.genLoad.toFixed(0)} kW Generator`
        };

      case 'fuel':
        return {
          currentSummary: isM
            ? `Fuel farm holds 138,600 L of Arctic Gas Oil (77.2%), delivering 338 days of autonomy at current burn rate.`
            : `Containerized ISO tank farm holds 252,000 L (84.5%), delivering 525 days of autonomy at current burn rate.`,
          keyMetrics: [
            { label: 'Fuel Reserve Level', value: `${d.fuelPct.toFixed(1)}%`, sub: `${d.fuelLiters.toLocaleString()} L usable` },
            { label: 'Instantaneous Burn', value: `${d.fuelBurnRate.toFixed(2)} L/hr`, sub: 'Directly coupled to Gen' },
            { label: 'Daily Consumption', value: `${d.dailyFuelBurn.toFixed(0)} L/day`, sub: '~13.2 kL / month' },
            { label: 'Days of Autonomy', value: `${Math.round(d.daysRemaining)} Days`, sub: 'Zero-resupply buffer' },
            { label: 'Safe Reserve Floor', value: `${d.safeThresholdLiters.toLocaleString()} L`, sub: '25% Madrid buffer' },
            { label: 'Resupply Dependency', value: `${d.resupplyEtaDays}d to Vessel`, sub: 'Relief vessel window' },
          ],
          trend: [ 77.8, 77.6, 77.5, 77.4, 77.3, 77.2 ],
          whyExplanation: isM
            ? `Diesel burn rate is directly coupled to generator load: 68.0 kW × 0.26 L/kWh = 17.68 L/hr. Fuel reserve depletion is steady and well within the seasonal polar replenishment schedule.`
            : `Bharati burns 21.84 L/hr across its CHP power plant. Thermal recovery displaces what would otherwise require an additional 95 L/day of auxiliary diesel heating, conserving approximately 34,000 L annually.`,
          upstreamDrivers: ['Generator Active kW Load', 'Fuel Farm Day-Tank Transfer Pump', 'Tank Heating Trace Circuit'],
          downstreamConsequences: [
            `Dictates Logistics Resupply urgency and vessel cargo manifests`,
            `Supplies emergency auxiliary heaters if electrical grid trips`,
            `Serves as the ultimate life-support baseline for the entire station`
          ],
          forecast: 'Projected reserve at start of polar winter: 112,000 L (comfortably exceeds safe threshold).',
          riskContribution: { score: 2, level: 'LOW', detail: `Autonomy of ${Math.round(d.daysRemaining)} days comfortably exceeds ${d.resupplyEtaDays}-day ETA.` },
          recommendedAction: 'Perform weekly fuel water-separator drain and day-tank level sensor calibration.',
          cardDisplayValue: `${d.fuelBurnRate.toFixed(1)} L/hr • ${d.fuelPct.toFixed(0)}%`
        };

      case 'logistics':
        return {
          currentSummary: isM
            ? `Resupply vessel MV Vasiliy Golovnin scheduled in 115 days. Current fuel buffer is 338 days (+223 days safety margin).`
            : `Vessel scheduled in 125 days. Fuel buffer is 525 days (+400 days safety margin). Harbor approach ice conditions nominal.`,
          keyMetrics: [
            { label: 'Reserve vs ETA', value: `${Math.round(d.daysRemaining)}d vs ${d.resupplyEtaDays}d`, sub: `+${Math.round(d.daysRemaining - d.resupplyEtaDays)}d safety margin` },
            { label: 'Logistics Status', value: d.logisticsStatus, sub: 'NCPOR Goa coordination' },
            { label: 'Next Scheduled Vessel', value: d.upcomingVessel, sub: '44th Indian Antarctic Expedition' },
            { label: 'Sea-Ice Delay Hazard', value: d.seaIceDelayRisk, sub: 'Satellite imagery analysis' },
            { label: 'Primary Cargo Manifest', value: d.requiredSupplies, sub: 'Scheduled offload' },
            { label: 'Shortage Probability', value: '< 0.01%', sub: 'Monte Carlo simulation' },
          ],
          trend: [ 120, 119, 118, 117, 116, 115 ],
          whyExplanation: isM
            ? `Maitri relies on overland supply run traverse from the coastal ice shelf (India Bay, 80 km distant). Fuel autonomy of 338 days provides complete isolation tolerance even if extreme sea-ice prevents ship docking for an entire season.`
            : `Bharati features a natural coastal harbor approach at Larsemann Hills. Direct ship-to-shore fuel hose pumping allows rapid replenishment, and its 300kL ISO capacity provides over 1.4 years of standalone autonomy.`,
          upstreamDrivers: ['Fuel Reserve Depletion Rate', 'Antarctic Fast-Ice Extent', 'Vessel Charter Itinerary'],
          downstreamConsequences: [
            `Ensures uninterrupted station survival through winter blackout months`,
            `Mitigates composite station risk against severe voyage cancellations`,
            `Provides strategic emergency reserves for adjacent international expeditions`
          ],
          forecast: 'Offload window opens in December during peak ice-melt access.',
          riskContribution: { score: 1, level: 'NOMINAL', detail: 'Safety margin exceeds Madrid Protocol emergency requirement.' },
          recommendedAction: 'Finalize summer heavy machinery maintenance and sled traverse route GPS survey.',
          cardDisplayValue: `${Math.round(d.daysRemaining)}d vs ${d.resupplyEtaDays}d ETA`
        };

      case 'risk':
        return {
          currentSummary: isM
            ? `Composite Station Risk is LOW (18/100 pts). Primary factor is overland Lake Zub water line freeze hazard.`
            : `Composite Station Risk is LOW (14/100 pts). High resilience due to triple CHP backup systems and extensive fuel farm.`,
          keyMetrics: [
            { label: 'Composite Risk Score', value: `${d.riskScore} / 100`, sub: `${d.riskLevel} Hazard Severity` },
            { label: 'Primary Risk Driver', value: isM ? 'Overland Pipe Freeze (6 pts)' : 'Marine Intake Icing (5 pts)', sub: 'Domain contribution' },
            { label: 'Generator Backup systems', value: isM ? 'Single Unit Active (5 pts)' : 'N+1 Backup (2 pts)', sub: 'Power risk factor' },
            { label: 'Fuel Autonomy Margin', value: 'Zero Risk (1 pt)', sub: `> ${Math.round(d.daysRemaining)} days autonomy` },
            { label: 'Weather Hazard Impact', value: isM ? 'Polar downslope wind Chill (4 pts)' : 'Maritime Winds (3 pts)', sub: 'Environmental score' },
            { label: 'Active Station Alerts', value: `${activeAlerts.length} Active`, sub: activeAlerts.length === 0 ? 'All nominal' : 'Advisories present' },
          ],
          trend: [ 17, 18, 18, 19, 18, 18, 18 ],
          whyExplanation: isM
            ? `Maitri's composite score (18 pts) is calculated from weighted cross-domain factors: Water Conduit Freeze Hazard (6 pts), Single-generator Run without hot standby (5 pts), and Polar downslope wind Wind Chill (4 pts). No safety-critical thresholds are breached.`
            : `Bharati's composite score (14 pts) reflects lower mechanical vulnerability thanks to modular 3×100kVA CHP backup systems, dual Seawater Filter Plant trains, and 525-day fuel autonomy. The 14 points originate primarily from Quilty Bay marine intake tidal exposure.`,
          upstreamDrivers: ['Environment (Polar downslope wind Freeze)', 'Power (Single Unit Running)', 'Logistics (Ice Shelf Distance)'],
          downstreamConsequences: [
            `Triggers automated safe-mode guidelines if score breaches 40 pts (MEDIUM)`,
            `Informs Mission Operations Centre (NCPOR Goa) daily operational readiness status`,
            `Drives preventive maintenance prioritizing pipe trace-heating and generator ATS`
          ],
          forecast: 'Risk expected to remain in LOW band (< 25 pts) throughout the next 72-hour forecast cycle.',
          riskContribution: { score: d.riskScore, level: d.riskLevel, detail: 'Composite health indicates full mission capability.' },
          recommendedAction: 'Maintain current operational posture; inspect trace-heating circuits on schedule.',
          cardDisplayValue: `${d.riskLevel} (${d.riskScore}/100 pts)`
        };
    }
  };

  const activeCardInfo = selectedCardId ? getCardIntelligence(selectedCardId, currentStationId) : null;

  // Keyboard navigation across cards
  const handleKeyDown = (e: React.KeyboardEvent, cardId: CausalCardId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedCardId(selectedCardId === cardId ? null : cardId);
    } else if (e.key === 'ArrowRight') {
      const idx = CAUSAL_CARDS.findIndex(c => c.id === cardId);
      if (idx < CAUSAL_CARDS.length - 1) {
        setSelectedCardId(CAUSAL_CARDS[idx + 1].id);
      }
    } else if (e.key === 'ArrowLeft') {
      const idx = CAUSAL_CARDS.findIndex(c => c.id === cardId);
      if (idx > 0) {
        setSelectedCardId(CAUSAL_CARDS[idx - 1].id);
      }
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden space-y-5">
      {/* ── TOP MISSION HEADER & OPERATIONAL CONTROLS ─────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-polar-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2 font-mono">
              <span>Cross-Domain Causal Flow Graph</span>
            </h3>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-500/30 font-semibold">
              Flagship Twin Architecture
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Every simulation tick models real-time physics and causal flow across all domains — parameters are tightly coupled, never isolated.
          </p>
        </div>

        {/* Operational Toolbar */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          {/* Station Context Indicator & Quick Switch */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
            <button
              onClick={() => handleStationToggle('maitri')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                isMaitri
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMaitri ? 'bg-cyan-300 animate-pulse' : 'bg-slate-500'}`} />
              Maitri Station
            </button>
            <button
              onClick={() => handleStationToggle('bharati')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                !isMaitri
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${!isMaitri ? 'bg-blue-300 animate-pulse' : 'bg-slate-500'}`} />
              Bharati Station
            </button>
          </div>

          {/* Impact Trace Button */}
          <button
            onClick={() => setIsImpactTraceActive(!isImpactTraceActive)}
            className={`px-3 py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1.5 ${
              isImpactTraceActive
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Highlight active cause-and-effect paths"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Impact Trace</span>
            {isImpactTraceActive && <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 font-bold">ON</span>}
          </button>

          {/* Compare Maitri / Bharati Mode Toggle */}
          <button
            onClick={() => setIsCompareMode(!isCompareMode)}
            className={`px-3 py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1.5 ${
              isCompareMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Compare selected causal card between Maitri and Bharati"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compare Stations</span>
            {isCompareMode && <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/30 font-bold">ON</span>}
          </button>

          {/* Reset View Button */}
          {selectedCardId && (
            <button
              onClick={() => {
                setSelectedCardId(null);
                setIsImpactTraceActive(false);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              title="Reset focus to neutral overview"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset View</span>
            </button>
          )}

          {/* Real-Time Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-cyan-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="hidden sm:inline">COUPLING ACTIVE</span>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE SIX-CARD HORIZONTAL CAUSAL OVERVIEW ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 relative">
        {CAUSAL_CARDS.map((card, index) => {
          const Icon = card.icon;
          const isSelected = selectedCardId === card.id;
          const isUpstream = activeRelationships?.upstream.includes(card.id);
          const isDownstream = activeRelationships?.downstream.includes(card.id);
          const isUnrelated = selectedCardId && !isSelected && !isUpstream && !isDownstream;

          const intel = getCardIntelligence(card.id, currentStationId);

          // Card role badge
          let roleBadge = null;
          if (isSelected) {
            roleBadge = <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400 font-bold">ACTIVE FOCUS</span>;
          } else if (isUpstream) {
            roleBadge = <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400 font-bold">UPSTREAM CAUSE</span>;
          } else if (isDownstream) {
            roleBadge = <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400 font-bold">DOWNSTREAM IMPACT</span>;
          }

          return (
            <div key={card.id} className="relative flex flex-col justify-between">
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Select ${card.name} causal domain`}
                onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                onKeyDown={(e) => handleKeyDown(e, card.id)}
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer h-full flex flex-col justify-between select-none relative focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  isSelected
                    ? 'border-cyan-400 bg-[#0c1f38] shadow-lg scale-[1.02] z-20'
                    : isUpstream
                    ? 'border-amber-400/80 bg-amber-950/25 shadow-md z-10'
                    : isDownstream
                    ? 'border-purple-400/80 bg-purple-950/25 shadow-md z-10'
                    : isUnrelated
                    ? 'border-slate-800/60 bg-[#07101d]/60 opacity-40 hover:opacity-80'
                    : 'border-slate-800 bg-[#071324]/80 hover:border-slate-700 hover:scale-[1.01]'
                }`}
              >
                {/* Top strip accent indicator */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl transition-all"
                  style={{
                    background: isSelected
                      ? '#38bdf8'
                      : isUpstream
                      ? '#f59e0b'
                      : isDownstream
                      ? '#a855f7'
                      : card.color,
                    opacity: isUnrelated ? 0.3 : 1
                  }}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold font-mono tracking-tight text-slate-300 uppercase">
                      {card.index}. {card.name}
                    </span>
                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>

                  {/* Primary live / simulated value */}
                  <div className="text-xs sm:text-sm font-bold font-mono text-white mt-1">
                    {intel.cardDisplayValue}
                  </div>
                </div>

                {/* Bottom status & interaction hint */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  {roleBadge ? (
                    roleBadge
                  ) : (
                    <span className="text-slate-400 group-hover:text-cyan-300 flex items-center gap-1">
                      <span>Inspect Causal Logic</span>
                      <ChevronRight className="w-3 h-3 opacity-70" />
                    </span>
                  )}
                </div>
              </div>

              {/* Directional Connecting Arrow (Communicates actual cause-and-effect flow) */}
              {index < CAUSAL_CARDS.length - 1 && (
                <div className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
                  <div className={`p-1 rounded-full transition-all duration-300 ${
                    isImpactTraceActive || (isSelected && isDownstream) || (isUpstream && isSelected)
                      ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400 shadow-md scale-110'
                      : 'text-slate-600'
                  }`}>
                    <ArrowRight className={`w-3.5 h-3.5 ${isImpactTraceActive ? 'animate-pulse text-cyan-300' : ''}`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── VISUAL LEGEND FOR RELATIONSHIP ROLES ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-300">CAUSAL TRACE ROLES:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
            <span className="text-cyan-300 font-semibold">Active Selection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
            <span className="text-amber-300 font-semibold">Direct Upstream Driver</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block" />
            <span className="text-purple-300 font-semibold">Downstream Consequence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 inline-block opacity-50" />
            <span>Unrelated (Subdued)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span>Click any card to inspect or press Enter/Arrow keys</span>
        </div>
      </div>

      {/* ── SELECTED DOMAIN INTELLIGENCE EXPANDED PANEL ────────────────────── */}
      {selectedCardId && activeCardInfo && (
        <div className="p-5 rounded-2xl bg-[#061122] border border-cyan-500/40 space-y-5 animate-fade-in shadow-2xl relative">
          {/* Panel Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-3.5 h-12 rounded-full"
                style={{ background: CAUSAL_CARDS.find(c => c.id === selectedCardId)?.color }}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    CARD #{CAUSAL_CARDS.find(c => c.id === selectedCardId)?.index}
                  </span>
                  <h4 className="text-lg font-black font-mono text-white tracking-wide">
                    {CAUSAL_CARDS.find(c => c.id === selectedCardId)?.name} INTELLIGENCE
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {isMaitri ? 'Maitri Inland Station' : 'Bharati Coastal Station'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    NOMINAL
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {activeCardInfo.currentSummary}
                </p>
              </div>
            </div>

            {/* Quick Actions (View Full Domain, What-If, Close) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* What-If Scenario Trigger */}
              <button
                onClick={() => {
                  const meta = CAUSAL_CARDS.find(c => c.id === selectedCardId);
                  navigate(`/station/${currentStationId}/whatif?preset=${meta?.whatIfPreset || 'blizzard_approach'}`);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-md"
                title="Launch what-if simulation using this domain state"
              >
                <PlayCircle className="w-3.5 h-3.5 text-purple-300" />
                <span>What-If Scenario</span>
              </button>

              {/* View Full Domain Page Navigation */}
              <button
                onClick={() => {
                  const meta = CAUSAL_CARDS.find(c => c.id === selectedCardId);
                  navigate(`/station/${currentStationId}/${meta?.routePath || 'dashboard'}`);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-md"
                title="Navigate to dedicated full domain dashboard"
              >
                <span>View Full Domain</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Close Intelligence Drawer */}
              <button
                onClick={() => setSelectedCardId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Collapse intelligence panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clear Operational Intelligence Hierarchy */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs font-mono">
            {/* 1. Key Metrics Table */}
            <div className="bg-[#030914] p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live State &amp; Key Metrics</span>
              </div>
              <div className="space-y-2">
                {activeCardInfo.keyMetrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-[11px] border-b border-slate-900 pb-1">
                    <span className="text-slate-400">{m.label}:</span>
                    <div className="text-right">
                      <div className="font-bold text-white">{m.value}</div>
                      <div className="text-[9px] text-slate-500">{m.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Compact 24h Trend Visualization */}
            <div className="bg-[#030914] p-3.5 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>24-Hour Trend Profile</span>
                  </div>
                  <span className="text-[9px] text-cyan-400">STABLE</span>
                </div>
                <div className="mt-3">
                  <SparklineChart
                    data={activeCardInfo.trend}
                    color={CAUSAL_CARDS.find(c => c.id === selectedCardId)?.color || '#06b6d4'}
                    height={58}
                    showArea
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Variance:</span>
                  <span className="text-white font-bold">±1.8% Diurnal Drift</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Continuity:</span>
                  <span className="text-emerald-400 font-bold">100% (No Packet Loss)</span>
                </div>
              </div>
            </div>

            {/* 3. Upstream Causes & Downstream Consequences */}
            <div className="bg-[#030914] p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                <span>Causal Flow Flow</span>
              </div>

              {/* Upstream */}
              <div>
                <span className="text-[9px] text-amber-400 uppercase font-semibold">Direct Upstream Causes:</span>
                <div className="mt-1 space-y-1">
                  {activeCardInfo.upstreamDrivers.map((u, i) => (
                    <div key={i} className="text-[10.5px] text-slate-300 flex items-start gap-1">
                      <span className="text-amber-400">•</span>
                      <span>{u}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Downstream */}
              <div className="pt-2 border-t border-slate-900">
                <span className="text-[9px] text-purple-400 uppercase font-semibold">Downstream Impact:</span>
                <div className="mt-1 space-y-1">
                  {activeCardInfo.downstreamConsequences.map((d, i) => (
                    <div key={i} className="text-[10.5px] text-slate-300 flex items-start gap-1">
                      <span className="text-purple-400">→</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Forecast, Risk Contribution & SOP Recommendation */}
            <div className="bg-[#030914] p-3.5 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>Forecast &amp; Risk Contribution</span>
                </div>

                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Risk Score Impact:</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                      +{activeCardInfo.riskContribution.score} pts ({activeCardInfo.riskContribution.level})
                    </span>
                  </div>

                  <div className="text-[10.5px] text-slate-300">
                    <span className="text-slate-500">6–12h Forecast: </span>
                    <span className="text-cyan-300">{activeCardInfo.forecast}</span>
                  </div>
                </div>
              </div>

              {/* SOP Action */}
              <div className="pt-2 border-t border-slate-900">
                <div className="text-[9px] text-blue-400 uppercase font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Recommended Operator Action:</span>
                </div>
                <p className="text-[10.5px] text-slate-300 mt-1 bg-blue-950/20 p-2 rounded border border-blue-500/20 leading-relaxed">
                  {activeCardInfo.recommendedAction}
                </p>
              </div>
            </div>
          </div>

          {/* "Why This Is Happening" Full Grounded Mechanism */}
          <div className="p-3.5 rounded-xl bg-[#020712] border border-slate-800 text-xs font-mono space-y-1.5">
            <div className="text-cyan-300 font-bold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Why Is This Happening? (Physics &amp; Simulation Causal Mechanism)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11.5px]">
              {activeCardInfo.whyExplanation}
            </p>
          </div>
        </div>
      )}

      {/* ── COMPARE MAITRI / BHARATI SIDE-BY-SIDE INTELLIGENCE ────────────── */}
      {isCompareMode && selectedCardId && (
        <div className="p-5 rounded-2xl bg-[#061021] border border-amber-500/40 space-y-4 animate-fade-in shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">
                  Comparative Causal Analysis for "{CAUSAL_CARDS.find(c => c.id === selectedCardId)?.name}"
                </h4>
                <p className="text-xs text-slate-400">
                  Side-by-side operational situation comparing Maitri Inland Station against Bharati Coastal Station for the same causal link.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold self-start sm:self-auto">
              PARALLEL TWIN EVALUATION
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Maitri State */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <span className="font-bold text-cyan-300 text-sm">Maitri Inland Station (70°45′S)</span>
                <span className="font-bold text-white font-mono text-sm">
                  {getCardIntelligence(selectedCardId, 'maitri').cardDisplayValue}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {getCardIntelligence(selectedCardId, 'maitri').currentSummary}
              </p>
              <div className="p-2.5 rounded bg-slate-900/80 text-[11px] text-slate-300 space-y-1">
                <div className="text-cyan-400 font-semibold">Causal Explanation:</div>
                <div className="text-slate-400">{getCardIntelligence(selectedCardId, 'maitri').whyExplanation}</div>
              </div>
            </div>

            {/* Bharati State */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-500/30 pb-2">
                <span className="font-bold text-blue-300 text-sm">Bharati Coastal Station (69°24′S)</span>
                <span className="font-bold text-white font-mono text-sm">
                  {getCardIntelligence(selectedCardId, 'bharati').cardDisplayValue}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {getCardIntelligence(selectedCardId, 'bharati').currentSummary}
              </p>
              <div className="p-2.5 rounded bg-slate-900/80 text-[11px] text-slate-300 space-y-1">
                <div className="text-blue-400 font-semibold">Causal Explanation:</div>
                <div className="text-slate-400">{getCardIntelligence(selectedCardId, 'bharati').whyExplanation}</div>
              </div>
            </div>
          </div>

          {/* Operational Pressure Assessment */}
          <div className="p-3 rounded-xl bg-[#030914] border border-slate-800 text-xs font-mono flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
              OPERATIONAL PRESSURE ASSESSMENT
            </span>
            <span className="text-slate-300 text-[11px]">
              {selectedCardId === 'env' && 'Maitri is under significantly greater thermal stress (-25.4°C vs -16.2°C) requiring continuous high-output heating.'}
              {selectedCardId === 'energy' && 'Bharati carries higher overall electrical demand (110 kW vs 85 kW) driven by earth station satcom and seawater RO pumps.'}
              {selectedCardId === 'gen' && 'Bharati benefits from N+1 triple-CHP backup systems; Maitri relies on a single active unit with automated switchover to warm standby.'}
              {selectedCardId === 'fuel' && 'Bharati possesses higher autonomy (525 days vs 338 days) with its 300kL containerized bulk farm.'}
              {selectedCardId === 'logistics' && 'Maitri requires an 80km overland snow traverse from India Bay; Bharati has direct coastal harbor access.'}
              {selectedCardId === 'risk' && 'Both stations remain safely within NOMINAL / LOW risk thresholds (< 20 pts).'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CausalGraphViewer;
