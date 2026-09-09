import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useAlertStore } from '../../store/alertStore';
import {
  Activity, Shield, AlertTriangle, Droplet, Zap, Thermometer,
  ArrowRight, Radio, RefreshCw, Layers, HelpCircle, GitCommit,
  CheckCircle2, AlertOctagon, Info, ChevronRight, Gauge,
  Sliders, BatteryCharging, Flame, Cpu, Eye, ExternalLink
} from 'lucide-react';
import { SparklineChart } from '../charts/SparklineChart';

export type NodeId =
  | 'lake_zub'
  | 'water_treatment'
  | 'fuel_tank'
  | 'gen_set'
  | 'solar_pv'
  | 'battery_bank'
  | 'microgrid_bus'
  | 'habitat_heating'
  | 'science_labs'
  | 'waste_incinerator'
  | 'scada_monitor';

interface NodeDefinition {
  id: NodeId;
  name: string; // Exact mandated name
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const TOPOLOGY_NODES: NodeDefinition[] = [
  // Col 1: Primary Resource & Energy Sources
  { id: 'lake_zub', name: 'Lake Zub', x: 15, y: 22, w: 145, h: 68, color: '#06b6d4' },
  { id: 'fuel_tank', name: 'Fuel Tank', x: 15, y: 132, w: 145, h: 68, color: '#f59e0b' },
  { id: 'solar_pv', name: 'Solar PV', x: 15, y: 242, w: 145, h: 68, color: '#eab308' },

  // Col 2: Conditioning, Generation & Energy Buffers
  { id: 'water_treatment', name: 'Water Treatment', x: 215, y: 22, w: 145, h: 68, color: '#06b6d4' },
  { id: 'gen_set', name: '2×100kVA Gen', x: 215, y: 132, w: 145, h: 68, color: '#f59e0b' },
  { id: 'battery_bank', name: 'Battery Bank', x: 215, y: 242, w: 145, h: 68, color: '#10b981' },

  // Col 3: Central Microgrid Power Hub
  { id: 'microgrid_bus', name: 'Microgrid Bus', x: 415, y: 112, w: 165, h: 104, color: '#38bdf8' },

  // Col 4: Consumer Subsystems & Loads
  { id: 'habitat_heating', name: 'Habitat Heating', x: 635, y: 18, w: 145, h: 68, color: '#818cf8' },
  { id: 'science_labs', name: 'Science Labs', x: 635, y: 132, w: 145, h: 68, color: '#a78bfa' },
  { id: 'waste_incinerator', name: 'Waste Incinerator', x: 635, y: 242, w: 145, h: 68, color: '#fb923c' },

  // Col 5: Digital Twin Supervisory Control & Telemetry Concentrator
  { id: 'scada_monitor', name: 'SCADA Monitor', x: 835, y: 132, w: 135, h: 68, color: '#2dd4bf' },
];

export const StationFlowTopology: React.FC<{
  stationId?: string;
  onStationSelect?: (stId: string) => void;
}> = ({ stationId: propStationId, onStationSelect }) => {
  const navigate = useNavigate();
  const { selectedStationId, selectStation, stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const currentStationId = propStationId || selectedStationId || 'maitri';
  const isMaitri = currentStationId === 'maitri';

  // Interaction States
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>('microgrid_bus');
  const [isImpactTraceActive, setIsImpactTraceActive] = useState<boolean>(false);
  const [tracedNodeId, setTracedNodeId] = useState<NodeId | null>(null);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [isWhyDrawerOpen, setIsWhyDrawerOpen] = useState<boolean>(false);
  const [activeWhyTopic, setActiveWhyTopic] = useState<'gen' | 'fuel' | 'heat' | 'risk'>('gen');

  // Handle station change
  const handleStationSwitch = (stId: string) => {
    selectStation(stId);
    if (onStationSelect) {
      onStationSelect(stId);
    } else {
      navigate(`/station/${stId}`);
    }
  };

  // Station Snapshots & Telemetry
  const maitriSnap = liveSnapshot['maitri'];
  const bharatiSnap = liveSnapshot['bharati'];
  const activeSnap = isMaitri ? maitriSnap : bharatiSnap;

  const maitriRisk = liveRisk['maitri'];
  const bharatiRisk = liveRisk['bharati'];
  const activeRisk = isMaitri ? maitriRisk : bharatiRisk;

  const maitriAlerts = alerts['maitri'] || [];
  const bharatiAlerts = alerts['bharati'] || [];
  const activeAlerts = isMaitri ? maitriAlerts : bharatiAlerts;

  // Derived telemetry metrics with fallback cross-domain defaults
  const maitriMetrics = useMemo(() => {
    const env = maitriSnap?.environment;
    const eng = maitriSnap?.energy;
    const fuel = maitriSnap?.fuel;
    const water = maitriSnap?.water;
    const ops = maitriSnap?.station_ops;

    return {
      temp: env?.temperature ?? -25.4,
      wind: env?.wind_speed ?? 34.2,
      solarRad: env?.solar_radiation ?? 195.0,
      genLoad: eng?.generator_load ?? 68.0,
      solarOutput: eng?.solar_output ?? 22.0,
      batteryLevel: eng?.battery_level ?? 92.0,
      heatingLoad: eng?.heating_load ?? 32.0,
      fuelPct: fuel?.fuel_percentage ?? 77.2,
      fuelLiters: fuel?.current_level ?? 138600,
      fuelDays: fuel?.days_remaining ?? 338.0,
      fuelBurnRate: fuel?.consumption_rate_l_per_hr ?? 17.68,
      waterLevel: water?.storage_liters ? (water.storage_liters / 25000) * 100 : 82.0,
      waterTemp: water?.pipe_temp_c ?? 3.8,
      waterDaily: water?.daily_consumption_l ?? 1450.0,
      readiness: ops?.overall_readiness ?? 92.5,
      statusBand: ops?.status_band ?? 'Nominal',
      riskScore: maitriRisk?.score ?? 18,
      riskLevel: maitriRisk?.level ?? 'LOW',
      freshness: lastTickTime['maitri'] || 'Live Sync (4s)',
    };
  }, [maitriSnap, maitriRisk, lastTickTime]);

  const bharatiMetrics = useMemo(() => {
    const env = bharatiSnap?.environment;
    const eng = bharatiSnap?.energy;
    const fuel = bharatiSnap?.fuel;
    const water = bharatiSnap?.water;
    const ops = bharatiSnap?.station_ops;

    return {
      temp: env?.temperature ?? -16.2,
      wind: env?.wind_speed ?? 28.5,
      solarRad: env?.solar_radiation ?? 245.0,
      genLoad: eng?.generator_load ?? 84.0,
      solarOutput: eng?.solar_output ?? 34.0,
      batteryLevel: eng?.battery_level ?? 95.0,
      heatingLoad: eng?.heating_load ?? 38.0,
      fuelPct: fuel?.fuel_percentage ?? 84.5,
      fuelLiters: fuel?.current_level ?? 252000,
      fuelDays: fuel?.days_remaining ?? 525.0,
      fuelBurnRate: fuel?.consumption_rate_l_per_hr ?? 21.84,
      waterLevel: water?.storage_liters ? (water.storage_liters / 35000) * 100 : 88.0,
      waterTemp: water?.pipe_temp_c ?? 12.4, // SWRO permeate after thermal heat recovery
      waterDaily: water?.daily_consumption_l ?? 1950.0,
      readiness: ops?.overall_readiness ?? 94.8,
      statusBand: ops?.status_band ?? 'Nominal',
      riskScore: bharatiRisk?.score ?? 14,
      riskLevel: bharatiRisk?.level ?? 'LOW',
      freshness: lastTickTime['bharati'] || 'Live Sync (4s)',
    };
  }, [bharatiSnap, bharatiRisk, lastTickTime]);

  const activeMetrics = isMaitri ? maitriMetrics : bharatiMetrics;

  // Station Node Specific Telemetry & Details
  const getNodeDetails = (nodeId: NodeId, stId: string) => {
    const isM = stId === 'maitri';
    const m = isM ? maitriMetrics : bharatiMetrics;

    switch (nodeId) {
      case 'lake_zub':
        return {
          currentValue: `${m.waterLevel.toFixed(0)}%`,
          secondaryMetric: isM ? 'Flow: 28 L/min' : 'Intake: 42 L/min',
          sublabel: isM ? 'Priyadarshini Melt' : 'Quilty Bay SWRO Feed',
          status: (m.waterLevel > 25 ? 'normal' : 'warning') as 'normal' | 'warning' | 'critical',
          health: isM ? 98 : 96,
          statusText: isM ? 'Melt Intake Nominal' : 'Marine Intake Active',
          telemetry: [
            { label: 'Reservoir Level', value: `${m.waterLevel.toFixed(1)}%`, unit: 'volume' },
            { label: 'Intake Source Temp', value: isM ? '1.4°C' : '-1.8°C', unit: 'ambient' },
            { label: 'Pumping Velocity', value: isM ? '1.2 m/s' : '1.8 m/s', unit: 'line flow' },
            { label: 'Source Conductivity', value: isM ? '18 µS/cm' : '34.2 PSU', unit: 'purity' },
          ],
          trend: [80, 81, 82, 81, 82, 83, 82, 82],
          dependencies: isM
            ? ['Priyadarshini Glacial Melt', 'Lake Pump House', '800m Trace-Heated Conduit']
            : ['Quilty Bay Coastal Pier', 'Marine Intake Submersible Pumps', 'Intake Heat Trace'],
          affectedSystems: ['Water Treatment Plant', 'Habitat Potable Supply', 'Boiler Humidification'],
          riskContribution: { score: isM ? 3 : 2, level: 'LOW', detail: isM ? 'Overland freeze risk if trace heat drops' : 'Marine ice anchor clogging risk' },
          forecast: isM ? 'Stable melt reservoir through polar summer window.' : 'Stable marine intake with continuous heat tracing.',
          recommendedAction: isM ? 'Inspect trace-heating insulation along Lake Zub moraine crossing.' : 'Verify intake screen differential pressure during tidal fluctuation.',
          impactSummary: isM
            ? 'Lake Zub line feeds all freshwater. If heated conduit freeze occurs, emergency reserves deplete within 18 hours.'
            : 'Quilty Bay feeds desalination plant. If intake freezes, station switches to 28,000L internal buffer storage.',
          impactDownstream: ['water_treatment', 'habitat_heating', 'waste_incinerator']
        };

      case 'water_treatment':
        return {
          currentValue: `${m.waterTemp.toFixed(1)}°C`,
          secondaryMetric: isM ? 'Trace Heat: 4.8 kW' : 'SWRO Perm: 2.1 kL/d',
          sublabel: isM ? 'Filtration & UV' : 'Dual-Train SWRO Desal',
          status: 'normal' as const,
          health: isM ? 95 : 94,
          statusText: isM ? 'Recirculation Active' : 'RO Desal Nominal',
          telemetry: [
            { label: 'Conduit Temperature', value: `${m.waterTemp.toFixed(1)}°C`, unit: 'freeze margin' },
            { label: 'Daily Yield', value: `${m.waterDaily.toFixed(0)} L/d`, unit: 'potable' },
            { label: 'Filter Differential', value: isM ? '0.12 bar' : '1.45 bar (RO)', unit: 'head loss' },
            { label: 'Trace Heat Draw', value: isM ? '4.8 kW' : '7.2 kW', unit: 'anti-freeze' },
          ],
          trend: [3.6, 3.7, 3.8, 3.8, 3.9, 3.8, 3.8],
          dependencies: ['Lake Zub (Source Feed)', 'Microgrid Bus (Pump & UV Power)', 'Trace Heating Circuit'],
          affectedSystems: ['Habitat Living Modules', 'Kitchen & Hygiene Facilities', 'Medical Clinic'],
          riskContribution: { score: 2, level: 'LOW', detail: 'Conduit temp comfortably above 0.5°C threshold' },
          forecast: 'Zero freeze hazard under current ambient conditions.',
          recommendedAction: 'Monitor UV ballast lamp hours and filter cartridge differential pressure.',
          impactSummary: 'Treats and conditions raw water. Power disruption halts potable water circulation.',
          impactDownstream: ['habitat_heating']
        };

      case 'fuel_tank':
        return {
          currentValue: `${m.fuelPct.toFixed(0)}%`,
          secondaryMetric: `Autonomy: ${Math.round(m.fuelDays)}d`,
          sublabel: isM ? '180,000L AGO Farm' : '300,000L ISO Tank Farm',
          status: (m.fuelPct > 20 ? 'normal' : 'warning') as 'normal' | 'warning',
          health: 99,
          statusText: 'Reserves Secure',
          telemetry: [
            { label: 'Usable Bulk Volume', value: `${m.fuelLiters.toLocaleString()} L`, unit: 'AGO Diesel' },
            { label: 'Reserve Percentage', value: `${m.fuelPct.toFixed(1)}%`, unit: 'storage' },
            { label: 'Station Autonomy', value: `${Math.round(m.fuelDays)} Days`, unit: 'safety margin' },
            { label: 'Hourly Fuel Burn', value: `${m.fuelBurnRate.toFixed(2)} L/hr`, unit: 'generator rate' },
          ],
          trend: [78, 77.8, 77.5, 77.4, 77.2, 77.1],
          dependencies: ['Annual Resupply Vessel (MV Vasiliy Golovnin)', 'Fuel Day-Tank Transfer Pump', 'Tank Heating Trace'],
          affectedSystems: ['2×100kVA Gen', 'Emergency Generator Room', 'Auxiliary Boilers'],
          riskContribution: { score: 1, level: 'NOMINAL', detail: `Ample fuel reserve (${Math.round(m.fuelDays)} days remaining)` },
          forecast: 'Autonomy comfortably exceeds the 115-day winter resupply window.',
          recommendedAction: 'Perform bi-weekly fuel water-separator drain and tank sediment check.',
          impactSummary: 'Strategic diesel reserve. Supplies primary generators for 100% of station electricity and heating.',
          impactDownstream: ['gen_set', 'microgrid_bus', 'habitat_heating', 'science_labs', 'waste_incinerator']
        };

      case 'gen_set':
        return {
          currentValue: `${m.genLoad.toFixed(0)} kW`,
          secondaryMetric: isM ? 'Unit A (B: Standby)' : '3×CHP Synchronized',
          sublabel: isM ? 'Dual Kirloskar 100kVA' : '3×100kVA Automated CHP',
          status: (m.genLoad < 90 ? 'normal' : 'warning') as 'normal' | 'warning',
          health: isM ? 91 : 94,
          statusText: isM ? 'Unit A Lead • Unit B Standby' : 'Automated Load-Sharing',
          telemetry: [
            { label: 'Active Gen Output', value: `${m.genLoad.toFixed(1)} kW`, unit: 'electrical' },
            { label: 'Generator Load Factor', value: `${((m.genLoad / (isM ? 100 : 200)) * 100).toFixed(0)}%`, unit: 'rating' },
            { label: 'Grid Frequency', value: isM ? '50.12 Hz' : '50.04 Hz', unit: 'isochronous' },
            { label: 'Thermal Heat Recovery', value: isM ? 'Direct Exhaust' : '64.0 kWt (CHP)', unit: 'cogeneration' },
          ],
          trend: [64, 66, 68, 67, 68, 69, 68],
          dependencies: ['Fuel Tank (AGO Line)', 'Microgrid Bus (Voltage Sense)', 'Lube Oil Circulation'],
          affectedSystems: ['Microgrid Bus', 'Habitat Heating', 'Science Labs', 'Waste Incinerator'],
          riskContribution: { score: isM ? 4 : 2, level: 'LOW', detail: isM ? 'Single active generator with auto-crank standby' : 'N+1 redundant CHP array' },
          forecast: 'Load expected to peak at 78 kW during dinner/kitchen galley operations.',
          recommendedAction: isM ? 'Verify automatic transfer switch (ATS) battery starter charge.' : 'Monitor heat exchanger thermal transfer coefficient on Unit 1.',
          impactSummary: 'Primary prime mover. Any trip cascades to Battery Bank buffer and triggers standby generator start.',
          impactDownstream: ['microgrid_bus', 'habitat_heating', 'science_labs', 'waste_incinerator']
        };

      case 'solar_pv':
        return {
          currentValue: `${m.solarOutput.toFixed(0)} kW`,
          secondaryMetric: isM ? 'Albedo: +14% Boost' : 'Parapet Array 34 kW',
          sublabel: isM ? 'Moraine Bifacial Array' : 'High-Angle Coastal PV',
          status: 'normal' as const,
          health: isM ? 96 : 97,
          statusText: 'Inverting Nominal',
          telemetry: [
            { label: 'Instantaneous Solar Yield', value: `${m.solarOutput.toFixed(1)} kW`, unit: 'DC generation' },
            { label: 'Solar Irradiance', value: `${m.solarRad.toFixed(0)} W/m²`, unit: 'insolation' },
            { label: 'Inverter Efficiency', value: isM ? '96.8%' : '97.4%', unit: 'MPPT' },
            { label: 'Fuel Saved Today', value: isM ? '38.4 L' : '58.2 L', unit: 'offset' },
          ],
          trend: [14, 18, 22, 24, 22, 21, 22],
          dependencies: ['Solar Irradiance', 'Snow/Rime Free Panels', 'Inverter MPPT Controllers'],
          affectedSystems: ['Battery Bank (Charge)', 'Microgrid Bus (Load Offset)', 'Fuel Conservation'],
          riskContribution: { score: 1, level: 'NOMINAL', detail: 'Clean supplemental power reducing generator fuel burn' },
          forecast: 'Peak output available for next 5 hours before polar diurnal dip.',
          recommendedAction: 'Inspect south-facing brackets for wind-vibration looseness.',
          impactSummary: 'Solar PV directly offsets diesel fuel consumption. Drop in solar immediately increases generator load.',
          impactDownstream: ['battery_bank', 'microgrid_bus', 'gen_set', 'fuel_tank']
        };

      case 'battery_bank':
        return {
          currentValue: `${m.batteryLevel.toFixed(0)}%`,
          secondaryMetric: isM ? 'Float: 54.2V (AGM)' : '384V LiFePO4 ESS',
          sublabel: isM ? 'Deep-Cycle UPS Buffer' : 'Containerized LiFePO4 ESS',
          status: (m.batteryLevel > 70 ? 'normal' : 'warning') as 'normal' | 'warning',
          health: isM ? 94 : 98,
          statusText: 'Float Charging',
          telemetry: [
            { label: 'State of Charge (SOC)', value: `${m.batteryLevel.toFixed(1)}%`, unit: 'stored energy' },
            { label: 'DC Bus Voltage', value: isM ? '54.2 V' : '384.6 V', unit: 'nominal' },
            { label: 'Cell Balance Delta', value: isM ? '0.04 V' : '0.012 V', unit: 'dispersion' },
            { label: 'Enclosure Temp', value: isM ? '19.4°C' : '21.2°C', unit: 'conditioned' },
          ],
          trend: [91, 92, 92, 93, 92, 92, 92],
          dependencies: ['Solar PV (Charge Source)', 'Microgrid Bus (AC Rectifier)', 'Thermal Conditioning Duct'],
          affectedSystems: ['Microgrid Bus (Transient Stability)', 'Critical SCADA & Telemetry', 'Life Support UPS'],
          riskContribution: { score: 1, level: 'NOMINAL', detail: 'Reserve provides 4.2 hours of critical life support' },
          forecast: 'Capacity fully stabilized under float charge.',
          recommendedAction: 'Verify emergency DC lighting disconnect circuit quarterly.',
          impactSummary: 'Provides microgrid stabilization and un-interruptible power during generator transitions.',
          impactDownstream: ['microgrid_bus', 'scada_monitor']
        };

      case 'microgrid_bus':
        return {
          currentValue: `Load: ${m.genLoad.toFixed(0)} kW`,
          secondaryMetric: isM ? '415V 50Hz (PF: 0.94)' : '415V Smart Synchronized',
          sublabel: 'Power Distribution Hub',
          status: (m.genLoad < 90 ? 'normal' : 'warning') as 'normal' | 'warning',
          health: isM ? 98 : 99,
          statusText: 'Isochronous Stability',
          telemetry: [
            { label: 'Total Grid Demand', value: `${m.genLoad.toFixed(1)} kW`, unit: 'active power' },
            { label: 'System Voltage', value: isM ? '414.2 V' : '415.8 V', unit: '3-phase AC' },
            { label: 'Power Factor', value: isM ? '0.94' : '0.96', unit: 'inductive' },
            { label: 'Total Harmonic Dist.', value: isM ? '2.1%' : '1.6%', unit: 'THD' },
          ],
          trend: [64, 65, 68, 68, 67, 68, 69],
          dependencies: ['2×100kVA Gen', 'Battery Bank Inverter', 'Solar PV MPPT Array'],
          affectedSystems: ['Habitat Heating', 'Science Labs', 'Waste Incinerator', 'Water Pumps', 'SCADA Monitor'],
          riskContribution: { score: 2, level: 'LOW', detail: 'Load is 68% of single-generator rating' },
          forecast: 'Transient stability margin high. Standby generator available if load exceeds 85 kW.',
          recommendedAction: 'Maintain balanced phase distribution across Galley and Lab breaker panels.',
          impactSummary: 'Central electrical artery. Connects all power generation to life support and science operations.',
          impactDownstream: ['habitat_heating', 'science_labs', 'waste_incinerator', 'scada_monitor']
        };

      case 'habitat_heating':
        return {
          currentValue: `${m.heatingLoad.toFixed(0)} kW`,
          secondaryMetric: isM ? 'Indoor: 20.4°C' : 'Indoor: 21.8°C',
          sublabel: isM ? 'HVAC + Glycol Radiant' : 'CHP Thermal + HVAC Radiant',
          status: 'normal' as const,
          health: isM ? 93 : 96,
          statusText: 'Thermal Equilibrium',
          telemetry: [
            { label: 'Heating Thermal Demand', value: `${m.heatingLoad.toFixed(1)} kW`, unit: 'thermal/electric' },
            { label: 'Living Quarters Indoor Temp', value: isM ? '20.4°C' : '21.8°C', unit: 'target 21°C' },
            { label: 'Outside Ambient Delta', value: `${Math.abs(m.temp - 21).toFixed(1)}°C`, unit: 'temperature lift' },
            { label: 'Glycol Supply Temp', value: isM ? '62.5°C' : '68.0°C', unit: 'primary loop' },
          ],
          trend: [31, 32, 33, 32, 32, 33, 32],
          dependencies: ['Microgrid Bus (415V Feeder)', 'Hydronic Circulator Pumps', 'Exterior Insulation Envelope'],
          affectedSystems: ['Station Crew Comfort', 'Internal Plumbing Freeze Prevention', 'Medical Bay'],
          riskContribution: { score: 3, level: 'LOW', detail: isM ? 'Elevated demand due to -25.4°C inland chill' : 'Thermal jacket heat capture offsets electrical load' },
          forecast: 'Demand will rise +4 kW if night winds gust over 50 km/h.',
          recommendedAction: 'Check differential pressure across HVAC air handler filters.',
          impactSummary: 'Crucial life support. If heating drops below 12 kW, interior structures experience cold-soak.',
          impactDownstream: ['scada_monitor']
        };

      case 'science_labs':
        return {
          currentValue: isM ? '17 kW' : '26 kW',
          secondaryMetric: isM ? 'Clean Power: 100%' : 'Earth Station Satcom',
          sublabel: isM ? 'Geomagnetism & Met' : 'Satcom & Marine Radar',
          status: 'normal' as const,
          health: isM ? 99 : 98,
          statusText: 'All Research Racks Online',
          telemetry: [
            { label: 'Lab Power Draw', value: isM ? '17.0 kW' : '26.0 kW', unit: 'regulated AC' },
            { label: 'Dedicated UPS State', value: '100%', unit: 'isolated' },
            { label: 'Instruments Active', value: isM ? '14 Scientific Arrays' : '22 Sensors & Satcom', unit: 'payload' },
            { label: 'Telemetry Uplink', value: isM ? 'Ku-Band 256 kbps' : 'Ka/Ku 2 Mbps', unit: 'bandwidth' },
          ],
          trend: [16, 17, 17, 17, 18, 17, 17],
          dependencies: ['Microgrid Bus (Regulated Feeder)', 'Conditioned Room HVAC', 'Isolated Instrument Ground'],
          affectedSystems: ['SCADA Monitor', 'NCPOR Goa Earth Link', 'Real-Time Met Broadcast'],
          riskContribution: { score: 1, level: 'NOMINAL', detail: 'Non-critical payload can be load-shed if required' },
          forecast: 'Continuous data acquisition scheduled through the 24-hour cycle.',
          recommendedAction: 'Confirm seismology accelerometer zero-drift calibration.',
          impactSummary: 'Scientific mission payload. Can be autonomously shedding during emergency power conservation.',
          impactDownstream: ['scada_monitor']
        };

      case 'waste_incinerator':
        return {
          currentValue: isM ? '10 kW' : '18 kW',
          secondaryMetric: isM ? '850°C Chamber' : '890°C Eco-Burner',
          sublabel: isM ? 'Batch Incinerator' : 'Continuous Eco-Burner',
          status: 'normal' as const,
          health: isM ? 90 : 92,
          statusText: 'Madrid Protocol Compliant',
          telemetry: [
            { label: 'Burn Chamber Temperature', value: isM ? '852°C' : '894°C', unit: 'primary burn' },
            { label: 'Electrical Blower/Element', value: isM ? '10.0 kW' : '18.0 kW', unit: 'cyclonic draft' },
            { label: 'Exhaust Scrubber dP', value: isM ? '42 Pa' : '68 Pa', unit: 'particulate' },
            { label: 'Ash Residue Volume', value: isM ? '2.4 kg/batch' : '4.1 kg/batch', unit: 'sealed' },
          ],
          trend: [8, 9, 10, 10, 11, 10, 10],
          dependencies: ['Microgrid Bus (Draft Blower & Heaters)', 'Combustion Air Intake', 'Flue Scrubber'],
          affectedSystems: ['Waste Storage Vault', 'Environmental Madrid Protocol Compliance', 'Station Sanitation'],
          riskContribution: { score: 2, level: 'LOW', detail: 'Combustion filters and emissions within Antarctic Treaty limits' },
          forecast: 'Daily solid waste reduction burn cycle completed nominally.',
          recommendedAction: 'Clean flue gas temperature sensor probe before evening run.',
          impactSummary: 'Thermal waste destruction. Intermittent load; shedding has zero impact on life support.',
          impactDownstream: ['scada_monitor']
        };

      case 'scada_monitor':
        return {
          currentValue: 'LIVE',
          secondaryMetric: isM ? '4s Sync • Ku Uplink' : '4s Sync • Ka Dedicated',
          sublabel: 'Digital Twin Concentrator',
          status: 'normal' as const,
          health: 100,
          statusText: '16 Domains Synchronized',
          telemetry: [
            { label: 'Telemetry Ingestion Rate', value: '1,420 msgs/min', unit: 'MQTT/Modbus' },
            { label: 'Round-Trip Satellite Ping', value: isM ? '680 ms' : '490 ms', unit: 'latency' },
            { label: 'Anomaly Inference Engine', value: 'Active (IsolationForest)', unit: 'AI Model' },
            { label: 'Data Freshness', value: m.freshness, unit: 'real-time' },
          ],
          trend: [100, 100, 100, 100, 100, 100, 100],
          dependencies: ['All Subsystem Modbus RTUs', 'Satellite Dish Transceiver', 'UPS Control Power'],
          affectedSystems: ['NCPOR Mission Operations Centre', 'Autonomous Safe-Mode Failover', 'Historical Data Vault'],
          riskContribution: { score: 1, level: 'NOMINAL', detail: 'Full real-time visibility across all 16 domains' },
          forecast: 'Telemetry channel clear; zero packet loss recorded in last 240 ticks.',
          recommendedAction: 'Verify watchdog heartbeat counter and database backup replication.',
          impactSummary: 'Supervisory nervous system. Collects telemetry from all nodes and drives cross-domain simulation.',
          impactDownstream: []
        };
    }
  };

  const activeNodeDetails = selectedNodeId ? getNodeDetails(selectedNodeId, currentStationId) : null;
  const activeTracedDetails = tracedNodeId ? getNodeDetails(tracedNodeId, currentStationId) : null;

  // Impact trace downstream chain
  const getDownstreamCascade = (startNode: NodeId): NodeId[] => {
    switch (startNode) {
      case 'solar_pv':
        return ['solar_pv', 'battery_bank', 'microgrid_bus', 'gen_set', 'fuel_tank'];
      case 'lake_zub':
        return ['lake_zub', 'water_treatment', 'habitat_heating', 'waste_incinerator'];
      case 'water_treatment':
        return ['water_treatment', 'habitat_heating'];
      case 'fuel_tank':
        return ['fuel_tank', 'gen_set', 'microgrid_bus', 'habitat_heating', 'science_labs', 'waste_incinerator'];
      case 'gen_set':
        return ['gen_set', 'microgrid_bus', 'habitat_heating', 'science_labs', 'waste_incinerator', 'scada_monitor'];
      case 'battery_bank':
        return ['battery_bank', 'microgrid_bus', 'scada_monitor'];
      case 'microgrid_bus':
        return ['microgrid_bus', 'habitat_heating', 'science_labs', 'waste_incinerator', 'scada_monitor'];
      default:
        return [startNode, 'scada_monitor'];
    }
  };

  const activeHighlightedNodes = useMemo(() => {
    if (!isImpactTraceActive || !tracedNodeId) return [];
    return getDownstreamCascade(tracedNodeId);
  }, [isImpactTraceActive, tracedNodeId]);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden space-y-5">
      {/* Background ambient lighting */}
      <div
        className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
        style={{ background: isMaitri ? '#06b6d4' : '#3b82f6' }}
      />

      {/* ── TOP HEADER & CONTROLS ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMaitri ? 'bg-cyan-400' : 'bg-blue-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isMaitri ? 'bg-cyan-400' : 'bg-blue-400'}`} />
            </span>
            <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-slate-300">
              POLARTWIN P&amp;ID Schematic — {isMaitri ? 'Maitri Inland Station' : 'Bharati Coastal Station'} Flow Topology
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700">
              {isMaitri ? '70°45′S • 11°44′E (Schirmacher Moraine)' : '69°24′S • 76°11′E (Larsemann Hills)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic two-station digital twin flow topology with interconnected physical flows, operational influence, and downstream impact tracing.
          </p>
        </div>

        {/* Station Switcher & Mode Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Station Pills */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
            <button
              onClick={() => handleStationSwitch('maitri')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                isMaitri
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMaitri ? 'bg-cyan-300 animate-pulse' : 'bg-slate-500'}`} />
              Maitri (Inland)
            </button>
            <button
              onClick={() => handleStationSwitch('bharati')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                !isMaitri
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${!isMaitri ? 'bg-blue-300 animate-pulse' : 'bg-slate-500'}`} />
              Bharati (Coastal)
            </button>
          </div>

          {/* Compare Stations Mode Toggle */}
          <button
            onClick={() => setIsCompareMode(!isCompareMode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              isCompareMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Side-by-side comparative digital twin for both stations"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compare Stations</span>
            {isCompareMode && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 font-bold">ON</span>}
          </button>

          {/* "Why?" Operational Intelligence Toggle */}
          <button
            onClick={() => setIsWhyDrawerOpen(!isWhyDrawerOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              isWhyDrawerOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>"Why?" Explanation</span>
          </button>

          {/* Impact Trace Toggle */}
          <button
            onClick={() => {
              if (!isImpactTraceActive) {
                setIsImpactTraceActive(true);
                setTracedNodeId(selectedNodeId || 'solar_pv');
              } else {
                setIsImpactTraceActive(false);
                setTracedNodeId(null);
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              isImpactTraceActive
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Trace downstream consequences through the operational chain"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Impact Trace</span>
            {isImpactTraceActive && <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/30 font-bold">ACTIVE</span>}
          </button>
        </div>
      </div>

      {/* ── STATION-LEVEL SUMMARY STRIP ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5 text-xs font-mono">
        {/* 1. Station */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Station</span>
          <span className="text-white font-bold truncate mt-1">
            {isMaitri ? 'Maitri (Inland)' : 'Bharati (Coastal)'}
          </span>
          <span className="text-[9px] text-cyan-400 mt-0.5">{isMaitri ? 'Moraine Rock Base' : 'Modular Prefab'}</span>
        </div>

        {/* 2. Readiness */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Readiness</span>
          <span className="text-emerald-400 font-bold text-sm mt-1 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            {activeMetrics.readiness.toFixed(1)}%
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">{activeMetrics.statusBand}</span>
        </div>

        {/* 3. Risk Score */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Risk Score</span>
          <span className="text-cyan-300 font-bold text-sm mt-1 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            {activeMetrics.riskScore} pts
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">{activeMetrics.riskLevel} Hazard</span>
        </div>

        {/* 4. Active Alerts */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Active Alerts</span>
          <span className={`font-bold text-sm mt-1 flex items-center gap-1 ${
            activeAlerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {activeAlerts.length} Active
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">{activeAlerts.length === 0 ? 'All Systems OK' : 'Check Advisories'}</span>
        </div>

        {/* 5. Environment */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Environment</span>
          <span className="text-indigo-300 font-bold mt-1 flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
            {activeMetrics.temp.toFixed(1)}°C
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">Wind: {activeMetrics.wind.toFixed(0)} km/h</span>
        </div>

        {/* 6. Energy Status */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Energy Status</span>
          <span className="text-amber-300 font-bold mt-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {activeMetrics.genLoad.toFixed(0)} kW Load
          </span>
          <span className="text-[9px] text-emerald-400 mt-0.5">+{activeMetrics.solarOutput.toFixed(0)} kW Solar</span>
        </div>

        {/* 7. Fuel Reserve */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Fuel Reserve</span>
          <span className="text-cyan-300 font-bold mt-1 flex items-center gap-1">
            <Droplet className="w-3.5 h-3.5 text-cyan-400" />
            {activeMetrics.fuelPct.toFixed(0)}% ({Math.round(activeMetrics.fuelDays)}d)
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">{activeMetrics.fuelLiters.toLocaleString()} L</span>
        </div>

        {/* 8. Data Freshness */}
        <div className="bg-[#091526]/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-semibold">Data Freshness</span>
          <span className="text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            4s Loop
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5 truncate">{activeMetrics.freshness}</span>
        </div>
      </div>

      {/* ── IMPACT TRACE BANNER (IF ACTIVE) ────────────────────────────────── */}
      {isImpactTraceActive && activeTracedDetails && (
        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono shadow-lg shadow-purple-500/10 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <GitCommit className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-purple-300 font-bold flex items-center gap-2">
                <span>IMPACT TRACE ACTIVE: {TOPOLOGY_NODES.find(n => n.id === tracedNodeId)?.name.toUpperCase()}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 text-white">
                  {isMaitri ? 'Maitri Inland Model' : 'Bharati Coastal Model'}
                </span>
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                {activeTracedDetails.impactSummary}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="text-slate-400">Cascade Path:</span>
            {activeHighlightedNodes.map((nId, idx) => (
              <React.Fragment key={nId}>
                <span className={`px-2 py-0.5 rounded border font-semibold ${
                  nId === tracedNodeId
                    ? 'bg-purple-500/40 text-purple-200 border-purple-400'
                    : 'bg-slate-800/80 text-cyan-300 border-slate-700'
                }`}>
                  {TOPOLOGY_NODES.find(n => n.id === nId)?.name}
                </span>
                {idx < activeHighlightedNodes.length - 1 && <ChevronRight className="w-3 h-3 text-purple-400" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── INTERACTIVE TOPOLOGY GRAPH (SVG) ──────────────────────────────── */}
      <div className="relative overflow-x-auto bg-[#030914]/90 rounded-2xl border border-slate-800/80 p-2 shadow-2xl">
        <svg
          viewBox="0 0 990 330"
          className="w-full select-none"
          style={{ minWidth: 780, maxHeight: 340 }}
        >
          {/* Subtle Polar Blueprint Grid & Glow Defs */}
          <defs>
            <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />
            </pattern>

            {/* Marker definitions for directional flow arrows */}
            <marker id="arrow-cyan" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#06b6d4" />
            </marker>
            <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#f59e0b" />
            </marker>
            <marker id="arrow-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#eab308" />
            </marker>
            <marker id="arrow-emerald" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#10b981" />
            </marker>
            <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#38bdf8" />
            </marker>
            <marker id="arrow-purple" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#a78bfa" />
            </marker>

            {/* Glow Filter for Active Nodes */}
            <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width="990" height="330" fill="url(#grid-pattern)" rx="12" />

          {/* ── 1. RELATIONSHIP LINES & CHANNELS ────────────────────────────── */}
          {/* Physical Flow Lines (Solid with flowing animation) */}
          {/* Lake Zub -> Water Treatment */}
          <line
            x1={160} y1={56} x2={215} y2={56}
            stroke="#06b6d4" strokeWidth="2.5"
            strokeDasharray="6 3"
            markerEnd="url(#arrow-cyan)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('lake_zub') ? 0.9 : 0.25}
          >
            <animate attributeName="stroke-dashoffset" values="18;0" dur="1.5s" repeatCount="indefinite" />
          </line>

          {/* Water Treatment -> Microgrid (Operational Demand connection) */}
          <line
            x1={360} y1={56} x2={415} y2={130}
            stroke="#06b6d4" strokeWidth="1.8"
            strokeDasharray="4 4"
            markerEnd="url(#arrow-cyan)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('water_treatment') ? 0.8 : 0.2}
          >
            <animate attributeName="stroke-dashoffset" values="16;0" dur="2s" repeatCount="indefinite" />
          </line>

          {/* Fuel Tank -> 2x100kVA Gen */}
          <line
            x1={160} y1={166} x2={215} y2={166}
            stroke="#f59e0b" strokeWidth="2.5"
            strokeDasharray="6 3"
            markerEnd="url(#arrow-amber)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('fuel_tank') ? 0.9 : 0.25}
          >
            <animate attributeName="stroke-dashoffset" values="18;0" dur="1.4s" repeatCount="indefinite" />
          </line>

          {/* Solar PV -> Battery Bank */}
          <line
            x1={160} y1={276} x2={215} y2={276}
            stroke="#eab308" strokeWidth="2.5"
            strokeDasharray="6 3"
            markerEnd="url(#arrow-yellow)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('solar_pv') ? 0.9 : 0.25}
          >
            <animate attributeName="stroke-dashoffset" values="18;0" dur="1.2s" repeatCount="indefinite" />
          </line>

          {/* 2x100kVA Gen -> Microgrid Bus */}
          <line
            x1={360} y1={166} x2={415} y2={166}
            stroke="#f59e0b" strokeWidth="3"
            strokeDasharray="8 4"
            markerEnd="url(#arrow-amber)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('gen_set') ? 1 : 0.25}
          >
            <animate attributeName="stroke-dashoffset" values="24;0" dur="1s" repeatCount="indefinite" />
          </line>

          {/* Battery Bank -> Microgrid Bus (Operational Support - Dashed) */}
          <line
            x1={360} y1={276} x2={415} y2={190}
            stroke="#10b981" strokeWidth="2"
            strokeDasharray="5 5"
            markerEnd="url(#arrow-emerald)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('battery_bank') ? 0.85 : 0.2}
          >
            <animate attributeName="stroke-dashoffset" values="20;0" dur="2s" repeatCount="indefinite" />
          </line>

          {/* Microgrid Bus -> Habitat Heating */}
          <line
            x1={580} y1={140} x2={635} y2={52}
            stroke="#818cf8" strokeWidth="2.5"
            strokeDasharray="6 3"
            markerEnd="url(#arrow-blue)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('microgrid_bus') ? 0.9 : 0.25}
          >
            <animate attributeName="stroke-dashoffset" values="18;0" dur="1.5s" repeatCount="indefinite" />
          </line>

          {/* Microgrid Bus -> Science Labs */}
          <line
            x1={580} y1={166} x2={635} y2={166}
            stroke="#a78bfa" strokeWidth="2.5"
            strokeDasharray="6 3"
            markerEnd="url(#arrow-purple)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('microgrid_bus') ? 0.9 : 0.25}
          >
            <animate attributeName="stroke-dashoffset" values="18;0" dur="1.6s" repeatCount="indefinite" />
          </line>

          {/* Microgrid Bus -> Waste Incinerator */}
          <line
            x1={580} y1={190} x2={635} y2={276}
            stroke="#fb923c" strokeWidth="2.2"
            strokeDasharray="6 3"
            markerEnd="url(#arrow-amber)"
            opacity={activeHighlightedNodes.length === 0 || activeHighlightedNodes.includes('microgrid_bus') ? 0.85 : 0.25}
          >
            <animate attributeName="stroke-dashoffset" values="18;0" dur="1.8s" repeatCount="indefinite" />
          </line>

          {/* Monitoring / Data Lines into SCADA Monitor (Dotted with subtle data pulses) */}
          {/* Habitat Heating -> SCADA */}
          <path
            d="M 780 52 C 810 52, 810 150, 835 150"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            opacity="0.6"
          >
            <animate attributeName="stroke-dashoffset" values="28;0" dur="3s" repeatCount="indefinite" />
          </path>

          {/* Science Labs -> SCADA */}
          <line
            x1={780} y1={166} x2={835} y2={166}
            stroke="#2dd4bf" strokeWidth="1.5"
            strokeDasharray="3 4"
            opacity="0.7"
          >
            <animate attributeName="stroke-dashoffset" values="28;0" dur="2.5s" repeatCount="indefinite" />
          </line>

          {/* Waste Incinerator -> SCADA */}
          <path
            d="M 780 276 C 810 276, 810 180, 835 180"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            opacity="0.6"
          >
            <animate attributeName="stroke-dashoffset" values="28;0" dur="3.2s" repeatCount="indefinite" />
          </path>

          {/* ── 2. NODES (11 MANDATED CARDS) ────────────────────────────────── */}
          {TOPOLOGY_NODES.map((node) => {
            const details = getNodeDetails(node.id, currentStationId);
            const isSelected = selectedNodeId === node.id;
            const isTraced = tracedNodeId === node.id;
            const isDownstream = activeHighlightedNodes.includes(node.id);
            const isMuted = isImpactTraceActive && !isDownstream;

            const statusBadgeColor =
              details.status === 'normal' ? '#10b981' :
              details.status === 'warning' ? '#f59e0b' : '#ef4444';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  if (isImpactTraceActive) {
                    setTracedNodeId(node.id);
                  }
                }}
                className="cursor-pointer transition-all duration-300"
                style={{ opacity: isMuted ? 0.35 : 1 }}
              >
                {/* Node Outer Halo / Selection Indicator */}
                {(isSelected || isTraced) && (
                  <rect
                    x={-4} y={-4}
                    width={node.w + 8} height={node.h + 8}
                    rx={12}
                    fill="none"
                    stroke={isTraced ? '#a855f7' : '#38bdf8'}
                    strokeWidth="2"
                    strokeDasharray={isTraced ? '4 2' : undefined}
                    opacity="0.8"
                    filter="url(#node-glow)"
                  >
                    {isTraced && (
                      <animate attributeName="stroke-dashoffset" values="12;0" dur="1s" repeatCount="indefinite" />
                    )}
                  </rect>
                )}

                {/* Main Card Background */}
                <rect
                  x={0} y={0}
                  width={node.w} height={node.h}
                  rx={8}
                  fill={`${node.color}15`}
                  stroke={isSelected ? '#38bdf8' : isDownstream ? '#c084fc' : node.color}
                  strokeWidth={isSelected || isDownstream ? '2' : '1.2'}
                  strokeOpacity={isSelected ? 1 : 0.6}
                />

                {/* Top Accent Strip */}
                <rect
                  x={0} y={0}
                  width={node.w} height={3.5}
                  rx={1.5}
                  fill={isDownstream && isImpactTraceActive ? '#a855f7' : node.color}
                  fillOpacity="0.85"
                />

                {/* Status Indicator Beacon */}
                <circle cx={node.w - 12} cy={12} r={3.5} fill={statusBadgeColor} opacity="0.95">
                  {details.status !== 'normal' && (
                    <animate attributeName="opacity" values="0.95;0.2;0.95" dur="1.2s" repeatCount="indefinite" />
                  )}
                </circle>

                {/* Node Name (Mandated Exact String) */}
                <text
                  x={node.w / 2} y={18}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  letterSpacing="0.02em"
                >
                  {node.name}
                </text>

                {/* Station-specific Sublabel */}
                <text
                  x={node.w / 2} y={32}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {details.sublabel}
                </text>

                {/* Primary Live/Simulated Value */}
                <text
                  x={node.w / 2} y={48}
                  textAnchor="middle"
                  fill={node.color}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {details.currentValue}
                </text>

                {/* Secondary Meaningful Metric */}
                <text
                  x={node.w / 2} y={60}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="7.5"
                  fontFamily="monospace"
                  opacity="0.85"
                >
                  {details.secondaryMetric}
                </text>

                {/* Health Chip on Bottom Right */}
                <text
                  x={node.w - 6} y={node.h - 5}
                  textAnchor="end"
                  fill="#10b981"
                  fontSize="7"
                  fontFamily="monospace"
                  opacity="0.75"
                >
                  {details.health}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── GRAPH LEGEND & QUICK GUIDE ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-300">RELATIONSHIP TYPES:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-cyan-400 inline-block" />
            <span>Solid: Physical Resource / Energy Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-emerald-400 inline-block" />
            <span>Dashed: Operational Influence &amp; Demand</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dotted border-teal-300 inline-block" />
            <span>Dotted: SCADA Real-Time Telemetry</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>Standby / Offline</span>
          </div>
        </div>
      </div>

      {/* ── NODE INSPECTION DRAWER / SIDECARD ─────────────────────────────── */}
      {activeNodeDetails && selectedNodeId && (
        <div className="p-4 rounded-xl bg-[#071324] border border-cyan-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-10 rounded-full"
                style={{ background: TOPOLOGY_NODES.find(n => n.id === selectedNodeId)?.color || '#06b6d4' }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white font-mono tracking-wide">
                    {TOPOLOGY_NODES.find(n => n.id === selectedNodeId)?.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {isMaitri ? 'Maitri Station' : 'Bharati Station'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Health: {activeNodeDetails.health}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeNodeDetails.sublabel} • Operating State: <span className="text-white font-semibold">{activeNodeDetails.statusText}</span>
                </p>
              </div>
            </div>

            {/* Quick Action: Trace this node */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsImpactTraceActive(true);
                  setTracedNodeId(selectedNodeId);
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Trace Impact Path</span>
              </button>
            </div>
          </div>

          {/* Detailed Inspector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {/* Telemetry Block */}
            <div className="bg-[#040b17] p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Live Telemetry Channels
              </div>
              <div className="space-y-1.5">
                {activeNodeDetails.telemetry.map((ch) => (
                  <div key={ch.label} className="flex items-center justify-between text-[11px] border-b border-slate-900 pb-1">
                    <span className="text-slate-400">{ch.label}:</span>
                    <span className="font-bold text-white">
                      {ch.value} <span className="text-[9px] text-slate-500 font-normal">({ch.unit})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependencies & Affected Systems */}
            <div className="bg-[#040b17] p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                Dependencies &amp; Impact
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Upstream Inputs:</div>
                <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  {activeNodeDetails.dependencies.join(' • ')}
                </div>
              </div>
              <div className="pt-1 border-t border-slate-900">
                <div className="text-[10px] text-slate-500">Downstream Impact:</div>
                <div className="text-[11px] text-purple-300 mt-0.5 leading-snug">
                  {activeNodeDetails.affectedSystems.join(' • ')}
                </div>
              </div>
            </div>

            {/* Risk & 6-12h Forecast */}
            <div className="bg-[#040b17] p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Risk &amp; 6–12h Forecast
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Risk Contribution:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  {activeNodeDetails.riskContribution.score} pts ({activeNodeDetails.riskContribution.level})
                </span>
              </div>
              <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
                {activeNodeDetails.riskContribution.detail}
              </p>
              <div className="pt-1 border-t border-slate-900">
                <span className="text-[10px] text-slate-500">Forward Projection:</span>
                <p className="text-[10.5px] text-cyan-300 mt-0.5">
                  {activeNodeDetails.forecast}
                </p>
              </div>
            </div>

            {/* SOP Guidance & Recommended Action */}
            <div className="bg-[#040b17] p-3 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  Operator SOP Recommendation
                </div>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed bg-blue-950/20 p-2 rounded border border-blue-500/20">
                  {activeNodeDetails.recommendedAction}
                </p>
              </div>

              <div className="text-[9px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-900">
                <span>POLARTWIN SOP v3.4</span>
                <span className="text-cyan-400">Madrid Compliant</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── "WHY?" OPERATIONAL INTELLIGENCE DRAWER ────────────────────────── */}
      {isWhyDrawerOpen && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#061224] to-[#040a16] border border-cyan-500/40 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">
                  Operational "Why?" Root Cause Intelligence — {isMaitri ? 'Maitri' : 'Bharati'}
                </h4>
                <p className="text-xs text-slate-400">
                  Cross-domain physical causal explanations connecting weather, equipment degradation, and operational consumption.
                </p>
              </div>
            </div>

            {/* Topic Selector Tabs */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {[
                { id: 'gen', label: 'Generator Load', icon: Zap },
                { id: 'fuel', label: 'Fuel Burn Rate', icon: Droplet },
                { id: 'heat', label: 'Heating Demand', icon: Thermometer },
                { id: 'risk', label: 'Composite Risk', icon: Shield },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveWhyTopic(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 ${
                    activeWhyTopic === tab.id
                      ? 'bg-cyan-600 text-white font-bold shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Explanation Content Grounded in Cross-Domain Physics */}
          <div className="p-3.5 rounded-xl bg-[#020712] border border-slate-800 text-xs font-mono space-y-2">
            {activeWhyTopic === 'gen' && (
              <>
                <div className="text-cyan-300 font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Why is {isMaitri ? 'Maitri' : 'Bharati'} Generator Load at {activeMetrics.genLoad.toFixed(1)} kW?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isMaitri
                    ? `Maitri generator load is driven by the base station load (35 kW), HVAC heating load (32 kW due to -25.4°C ambient cold), and research instrumentation (12 kW), offset by +${activeMetrics.solarOutput.toFixed(0)} kW of bifacial solar PV generation. Because Unit A is the sole active generator, it operates at a healthy 68% of its 100kVA rating with Unit B on warm standby.`
                    : `Bharati generator load is 84 kW produced across its automated 3×100kVA CHP array. High demand is driven by the tracking earth station satellite dish (18 kW), RO desalination intake trace-heating (9 kW), and habitat HVAC (38 kW). The CHP units capture 64 kWt of jacket heat directly into the living module radiators, preventing electrical booster spikes.`}
                </p>
                <div className="p-2 rounded bg-slate-900 text-slate-400 text-[11px]">
                  Causal Formula: <span className="text-cyan-300 font-bold">Total Demand ({isMaitri ? '85' : '110'} kW) - Solar Contribution ({activeMetrics.solarOutput.toFixed(0)} kW) = {activeMetrics.genLoad.toFixed(0)} kW Net Generation</span>.
                </div>
              </>
            )}

            {activeWhyTopic === 'fuel' && (
              <>
                <div className="text-amber-300 font-bold flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-amber-400" />
                  <span>Why is Fuel Burn Rate at {activeMetrics.fuelBurnRate.toFixed(2)} L/hr?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isMaitri
                    ? `Maitri burns Arctic Gas Oil (AGO) at 0.26 L/kWh. With generator load stabilized at ${activeMetrics.genLoad.toFixed(0)} kW, hourly consumption is ${activeMetrics.fuelBurnRate.toFixed(2)} L/hr (~424 L/day). The 138,600 L remaining provides 338 days of autonomy, well beyond the December relief vessel voyage.`
                    : `Bharati burns ~21.84 L/hr to support its 84 kW generation load. Its vast 300,000L containerized fuel farm holds 252,000 L, yielding 525 days of autonomy. High thermal efficiency from CHP jacket heat recovery saves approximately 95 L of diesel heating equivalent every day.`}
                </p>
              </>
            )}

            {activeWhyTopic === 'heat' && (
              <>
                <div className="text-indigo-300 font-bold flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-indigo-400" />
                  <span>Why is Habitat Heating Load at {activeMetrics.heatingLoad.toFixed(1)} kW?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isMaitri
                    ? `Inland Maitri experiences harsh Katabatic wind gusts ({activeMetrics.wind.toFixed(0)} km/h) and -25.4°C ambient chill. Indoor target is 21°C, requiring a 46.4°C temperature lift. The older purpose-built insulation has a coefficient of 1.35 W/m²K, requiring 32 kW of continuous hydronic glycol circulation.`
                    : `Bharati is situated in coastal Larsemann Hills where temperatures are milder (-16.2°C) but humid maritime winds induce external freeze risk. Modern modular insulated panels maintain 21.8°C indoor warmth utilizing CHP thermal loops as the primary heat source.`}
                </p>
              </>
            )}

            {activeWhyTopic === 'risk' && (
              <>
                <div className="text-emerald-300 font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Why is Composite Risk Score at {activeMetrics.riskScore} pts ({activeMetrics.riskLevel})?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isMaitri
                    ? `Maitri composite risk is rated LOW (18 pts) because both generator units are fully operational, the Lake Zub heated pipeline is maintaining 3.8°C (above the 0.5°C freezing hazard threshold), and fuel reserves stand at 77%. The minor point contribution originates from overland line freezing exposure.`
                    : `Bharati composite risk is rated LOW (14 pts). Triple-redundant CHP generation, extensive 300kL fuel reserves, and dual RO desalination trains provide higher structural resilience against extreme weather disruptions.`}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── COMPARE STATIONS MODE (SIDE-BY-SIDE DIGITAL TWIN) ─────────────── */}
      {isCompareMode && (
        <div className="p-4 rounded-xl bg-[#061021] border border-amber-500/40 space-y-4 animate-fade-in shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">
                  Comparative Digital Twin Analysis — Maitri vs. Bharati
                </h4>
                <p className="text-xs text-slate-400">
                  Side-by-side operational matrix highlighting differences in energy, fuel, water, equipment resilience, and environmental constraints.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold self-start sm:self-auto">
              PARALLEL TWIN EVALUATION
            </span>
          </div>

          {/* Comparative Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-2 px-3">Operational Domain</th>
                  <th className="py-2 px-3 text-cyan-300">Maitri (Inland 70°45′S)</th>
                  <th className="py-2 px-3 text-blue-300">Bharati (Coastal 69°24′S)</th>
                  <th className="py-2 px-3 text-slate-300">Operational Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* 1. Environment */}
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-300 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
                    Environment &amp; Weather
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {maitriMetrics.temp.toFixed(1)}°C • Wind {maitriMetrics.wind.toFixed(0)} km/h
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {bharatiMetrics.temp.toFixed(1)}°C • Wind {bharatiMetrics.wind.toFixed(0)} km/h
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                      Bharati Milder (+9.2°C)
                    </span>
                  </td>
                </tr>

                {/* 2. Generation & Load */}
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Power Generation
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {maitriMetrics.genLoad.toFixed(0)} kW (Unit A Lead / B Standby)
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {bharatiMetrics.genLoad.toFixed(0)} kW (3×100kVA CHP Load-Share)
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Bharati N+1 CHP Advantage
                    </span>
                  </td>
                </tr>

                {/* 3. Solar Contribution */}
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    Renewable Solar Yield
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {maitriMetrics.solarOutput.toFixed(0)} kW (Bifacial Moraine)
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {bharatiMetrics.solarOutput.toFixed(0)} kW (Roof Parapet Array)
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      Bharati +12 kW Solar
                    </span>
                  </td>
                </tr>

                {/* 4. Strategic Fuel Reserves */}
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-300 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                    Fuel Reserves &amp; Autonomy
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {maitriMetrics.fuelPct.toFixed(0)}% ({Math.round(maitriMetrics.fuelDays)}d autonomy)
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {bharatiMetrics.fuelPct.toFixed(0)}% ({Math.round(bharatiMetrics.fuelDays)}d autonomy)
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Bharati Greater Autonomy (+187d)
                    </span>
                  </td>
                </tr>

                {/* 5. Water Infrastructure */}
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-300 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-blue-400" />
                    Water Source &amp; Risk
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    Lake Zub Glacial Melt (800m heated line • {maitriMetrics.waterTemp.toFixed(1)}°C)
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    Quilty Bay SWRO Desal ({bharatiMetrics.waterTemp.toFixed(1)}°C permeate)
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                      Maitri Freeze Sensitive
                    </span>
                  </td>
                </tr>

                {/* 6. Composite Station Risk */}
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    Composite Risk
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {maitriMetrics.riskScore} pts ({maitriMetrics.riskLevel})
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {bharatiMetrics.riskScore} pts ({bharatiMetrics.riskLevel})
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Both Nominal / Stable
                    </span>
                  </td>
                </tr>

                {/* 7. Overall Readiness */}
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Operational Readiness
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">
                    {maitriMetrics.readiness.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">
                    {bharatiMetrics.readiness.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Fully Mission Capable
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick Node-by-Node Side-by-Side Comparison for Selected Node */}
          {selectedNodeId && (
            <div className="p-3 bg-[#030914] rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="font-bold text-amber-300">
                  Node Comparison for "{TOPOLOGY_NODES.find(n => n.id === selectedNodeId)?.name}":
                </span>
                <span className="text-[10px] text-slate-400">Click any node on the graph to change comparison focus</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                {/* Maitri Node State */}
                <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                  <div className="text-cyan-300 font-bold flex items-center justify-between">
                    <span>Maitri Inland Station</span>
                    <span className="text-xs text-white">{getNodeDetails(selectedNodeId, 'maitri').currentValue}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    {getNodeDetails(selectedNodeId, 'maitri').sublabel} • {getNodeDetails(selectedNodeId, 'maitri').secondaryMetric}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Health: <span className="text-emerald-400 font-bold">{getNodeDetails(selectedNodeId, 'maitri').health}%</span> • Status: {getNodeDetails(selectedNodeId, 'maitri').statusText}
                  </div>
                </div>

                {/* Bharati Node State */}
                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30">
                  <div className="text-blue-300 font-bold flex items-center justify-between">
                    <span>Bharati Coastal Station</span>
                    <span className="text-xs text-white">{getNodeDetails(selectedNodeId, 'bharati').currentValue}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    {getNodeDetails(selectedNodeId, 'bharati').sublabel} • {getNodeDetails(selectedNodeId, 'bharati').secondaryMetric}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Health: <span className="text-emerald-400 font-bold">{getNodeDetails(selectedNodeId, 'bharati').health}%</span> • Status: {getNodeDetails(selectedNodeId, 'bharati').statusText}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default StationFlowTopology;
