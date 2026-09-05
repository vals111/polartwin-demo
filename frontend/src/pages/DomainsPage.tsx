import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import {
  Zap, Fuel, Droplet, Trash2, Apple, Home, Wrench,
  Truck, CloudSnow, Radio, Users, Microscope, ShieldAlert,
  CalendarCheck, Archive, Activity, Layers,
  CheckCircle2, AlertTriangle, Cpu, ExternalLink,
  TrendingUp, TrendingDown, Minus, ArrowRight, X,
  Shield, Sparkles, Play, Flame, RefreshCw, AlertCircle, Wind
} from 'lucide-react';

interface DomainStationData {
  situation: string;
  metric: string;
  submetric: string;
  status: 'Normal' | 'Watch' | 'Warning' | 'Critical';
  score: number;
  trend: {
    direction: 'improving' | 'stable' | 'deteriorating';
    text: string;
  };
  cause: string;
  impact: string;
  forecast: string;
  risk: {
    points: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    note: string;
  };
  action: {
    label: string;
    description: string;
    simScenario: string;
  };
  specs: { label: string; value: string }[];
  anomalies?: string[];
  dependencies?: string[];
  impacts?: string[];
}

interface DomainConfig {
  id: string;
  number: number;
  name: string;
  category: 'resources' | 'infrastructure' | 'operations' | 'safety';
  icon: React.FC<{ className?: string }>;
  accentColor: string;
  borderHover: string;
  link: string;
  question: string;
  maitri: DomainStationData;
  bharati: DomainStationData;
}

export const DomainsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeStationId = id || 'maitri';

  const { stations, selectStation } = useStationStore();
  const { liveSnapshot, liveRisk } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const [viewMode, setViewMode] = useState<'selected' | 'compare'>('selected');
  const [currentStationId, setCurrentStationId] = useState<string>(activeStationId);
  const [selectedDomain, setSelectedDomain] = useState<DomainConfig | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [showCausalChain, setShowCausalChain] = useState<boolean>(true);

  const isMaitri = currentStationId === 'maitri';

  const maitriSnap = liveSnapshot['maitri'];
  const bharatiSnap = liveSnapshot['bharati'];
  const maitriRisk = liveRisk['maitri'];
  const bharatiRisk = liveRisk['bharati'];

  const maitriAlerts = alerts['maitri'] || [];
  const bharatiAlerts = alerts['bharati'] || [];

  // 16 Official POLARTWIN Domains with complete Situation -> Cause -> Impact -> Forecast -> Risk -> Action data
  const domains: DomainConfig[] = [
    // 1. Energy & Power
    {
      id: 'energy',
      number: 1,
      name: 'Energy & Power',
      category: 'resources',
      icon: Zap,
      accentColor: 'text-amber-400',
      borderHover: 'hover:border-amber-500/50',
      link: `/station/${currentStationId}/resources`,
      question: 'Is the station currently producing enough energy to sustain critical thermal & research loads?',
      maitri: {
        situation: 'Dual 100kVA Kirloskar generators (Gen #1 active @ 68% load, Gen #2 standby). 22 kW roof PV offsetting daylight load; battery bank at 92%.',
        metric: `${maitriSnap?.energy?.generator_load ?? 68} kW`,
        submetric: 'Gen #1 Active (8,420h) • Standby: Gen #2 (Hot Ready)',
        status: 'Normal',
        score: 94,
        trend: { direction: 'stable', text: 'Steady (Solar buffer optimal)' },
        cause: 'Solar generation at 22 kW offsets daytime generator burn; kitchen and science centrifuge cycles drive 18:30 peak.',
        impact: 'Modulates diesel fuel burn rate at 17.5 L/h; provides steady base power to Habitat thermal convectors.',
        forecast: '+18 kW spike expected at 18:30 (Galley cooking + Lab cycles), peak demand ~86 kW.',
        risk: { points: 8, level: 'LOW', note: 'Adequate spinning reserve with Gen #2 in hot standby.' },
        action: {
          label: 'Verify Switchgear & Standby',
          description: 'Acknowledge load forecast curve and confirm automatic transfer switch (ATS) sensor polling.',
          simScenario: 'Simulate Generator #1 Trip during Evening Peak'
        },
        specs: [
          { label: 'Active/Standby', value: 'Gen #1 / Gen #2' },
          { label: 'Generation/Demand', value: '68 kW / 61 kW' },
          { label: 'Fuel Efficiency', value: '3.88 kWh/L' }
        ],
        anomalies: ['None detected; voltage variance ±0.8V within class 1 specs.'],
        dependencies: ['Environment & Weather (Solar irradiance)', 'Personnel & Occupancy (Galley cooking)'],
        impacts: ['Fuel (Hourly burn rate)', 'Infrastructure & Buildings (Thermal convectors)']
      },
      bharati: {
        situation: 'Triple 100kVA Combined Heat & Power (CHP) automation plant. CHP Unit #2 operating under high load (81%); Unit #1 undergoing intercooler servicing.',
        metric: `${bharatiSnap?.energy?.generator_load ?? 54} kW`,
        submetric: 'CHP Unit #2 Active (81% Load) • Standby: Degraded',
        status: 'Warning',
        score: 84,
        trend: { direction: 'deteriorating', text: 'Load ↑ 12% (Storm overcast)' },
        cause: 'Severe coastal overcast reduced solar generation to 11 kW (-32%), forcing CHP Gen load to 81%.',
        impact: 'Elevated generator load increases AGO burn rate to 21.2 L/h (510 L/day), steepening fuel depletion.',
        forecast: 'Generation margin tightens to <3 kW reserve if science lab chillers start simultaneously.',
        risk: { points: 24, level: 'HIGH', note: 'Operating with zero N+1 spinning redundancy during storm.' },
        action: {
          label: 'Initiate Load-Shedding Tier 1',
          description: 'Curtail non-critical secondary lab circuits (-8 kW) to restore safe 15 kW reserve margin.',
          simScenario: 'Simulate Prolonged Storm Overcast & Standby Gen Failure'
        },
        specs: [
          { label: 'Active/Standby', value: 'CHP #2 / CHP #1 (Hold)' },
          { label: 'Generation/Demand', value: '54 kW / 52 kW' },
          { label: 'Fuel Efficiency', value: '3.52 kWh/L' }
        ],
        anomalies: ['Intercooler ΔP across Unit #1 exceeded 0.35 bar limit.'],
        dependencies: ['Environment & Weather (Cyclone wind & cloud cover)', 'Research Operations (Lab loads)'],
        impacts: ['Fuel (Accelerated burn rate)', 'Station Operations (Composite risk spike)']
      }
    },

    // 2. Fuel
    {
      id: 'fuel',
      number: 2,
      name: 'Fuel',
      category: 'resources',
      icon: Fuel,
      accentColor: 'text-amber-500',
      borderHover: 'hover:border-amber-500/50',
      link: `/station/${currentStationId}/resources`,
      question: 'How long can this station continue operating with the fuel available?',
      maitri: {
        situation: '142,000 Litres of Antarctic Gas Oil (AGO) across double-walled bunded tanks. Current daily consumption: 420 L/day.',
        metric: `${maitriSnap?.fuel?.fuel_percentage?.toFixed(1) ?? 78}%`,
        submetric: '142,000 L • 18 days safe reserve @ current burn',
        status: 'Normal',
        score: 96,
        trend: { direction: 'stable', text: 'Consumption steady (420 L/day)' },
        cause: 'Generator load balanced at 68% with daytime solar PV offset preserving AGO depot reserves.',
        impact: 'Life support heating and primary power guaranteed through intermediate DROMLAN flight cycle.',
        forecast: '18.0 days remaining under current load; drops to 14.2 days if sustained blizzard forces 24h heating.',
        risk: { points: 12, level: 'LOW', note: 'Buffer sufficient for scheduled summer overland resupply.' },
        action: {
          label: 'Audit Bund Temperatures',
          description: 'Verify trace-heating elements on exterior AGO fuel manifold lines.',
          simScenario: 'Simulate 14-Day Resupply Convoy Delay'
        },
        specs: [
          { label: 'Current Level', value: '142,000 L (78%)' },
          { label: 'Daily Burn Rate', value: '420 L/day' },
          { label: 'Days Remaining', value: '18 Days' }
        ],
        anomalies: ['Tank 2B bun temp stable at -8°C (anti-freeze additive active).'],
        dependencies: ['Energy & Power (Gen load)', 'Environment & Weather (Ambient cold)'],
        impacts: ['Transportation & Logistics (Resupply threshold)', 'Station Operations (Readiness)']
      },
      bharati: {
        situation: '86,000 Litres remaining in bulk ISO tank farm. Accelerated burn rate: 510 L/day (+17% above nominal).',
        metric: `${bharatiSnap?.fuel?.fuel_percentage?.toFixed(1) ?? 43}%`,
        submetric: '86,000 L • 7 days remaining vs 12d Ship ETA',
        status: 'Warning',
        score: 78,
        trend: { direction: 'deteriorating', text: 'Burn Rate ↑ 17% (510 L/day)' },
        cause: 'High CHP load (81%) and cold maritime gale (-31°C) accelerating hourly consumption to 21.2 L/h.',
        impact: 'Safe operating reserve threshold (10 days) breached; critical resupply deficit of -5 days emerges.',
        forecast: 'Fuel reserve will breach emergency life-support threshold in 2.1 days without load reduction.',
        risk: { points: 38, level: 'CRITICAL', note: 'Resupply ship delayed by pack ice: 7d fuel vs 12d ETA.' },
        action: {
          label: 'Enact Fuel Conservation Protocol',
          description: 'Reduce habitat non-essential thermal loops and prepare helicopter sling fuel drum transfer.',
          simScenario: 'Simulate 5-Day Extended Storm & Helicopter Fuel Transfer'
        },
        specs: [
          { label: 'Current Level', value: '86,000 L (43%)' },
          { label: 'Daily Burn Rate', value: '510 L/day' },
          { label: 'Days Remaining', value: '7.0 Days' }
        ],
        anomalies: ['Fuel flow differential sensor indicates +2.4 L/h above baseline schedule.'],
        dependencies: ['Energy & Power (CHP Unit #2 load)', 'Environment & Weather (Storm chill)'],
        impacts: ['Transportation & Logistics (Emergency airlift)', 'Station Operations (Critical risk)']
      }
    },

    // 3. Water
    {
      id: 'water',
      number: 3,
      name: 'Water',
      category: 'resources',
      icon: Droplet,
      accentColor: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50',
      link: `/station/${currentStationId}/resources`,
      question: 'Does the station have enough usable water for its current population and operating conditions?',
      maitri: {
        situation: 'Lake Priyadarshini (Zub) intake pump line fully operational. 16,400 L stored in heated domestic buffer tanks.',
        metric: `${maitriSnap?.water?.percentage?.toFixed(0) ?? 82}%`,
        submetric: '16,400 L • 13.5 days reserve (1,210 L/day consumption)',
        status: 'Normal',
        score: 92,
        trend: { direction: 'stable', text: 'Intake flow balanced (1,420 L/day)' },
        cause: 'Summer melt sustains positive hydrostatic pressure at intake point; 45W/m line trace heating prevents freezing.',
        impact: 'Domestic galley, laundry, and fire deluge headers maintained at nominal 3.4 bar pressure.',
        forecast: 'Intake line surface temp dropping to -0.2°C tonight; automated trace-heating boost will trigger at 03:00.',
        risk: { points: 6, level: 'LOW', note: 'Backup snowmelt autoclave unit primed in standby.' },
        action: {
          label: 'Inspect Pipeline Trace Heat',
          description: 'Verify electrical continuity along the 850m insulated overland pipe trace from Lake Zub.',
          simScenario: 'Simulate Lake Zub Intake Pipeline Freeze'
        },
        specs: [
          { label: 'Storage Level', value: '16,400 L (82%)' },
          { label: 'Intake / Burn', value: '1,420 L / 1,210 L' },
          { label: 'Freeze Risk', value: 'Minimal (+2.8°C)' }
        ],
        anomalies: ['Minor flow pulsation on pump intake strainer (0.05 bar).'],
        dependencies: ['Environment & Weather (Ambient air temp)', 'Personnel & Occupancy (25 crew demand)'],
        impacts: ['Infrastructure & Buildings (Domestic plumbing)', 'Safety & Emergency (Fire deluge)']
      },
      bharati: {
        situation: 'Reverse Osmosis (RO) desalinator drawing coastal seawater. 12,800 L potable reserve for 31 personnel.',
        metric: '69%',
        submetric: '12,800 L • 8.6 days reserve (1,480 L/day consumption)',
        status: 'Watch',
        score: 88,
        trend: { direction: 'deteriorating', text: 'RO intake restricted by frazil ice' },
        cause: 'Sub-zero seawater (-1.8°C) and coastal surf generating frazil ice crystals on submerged intake strainer.',
        impact: 'RO membrane inlet differential pressure up by 0.4 bar; automatic backwash cycles doubled.',
        forecast: 'Intake strainer risks complete ice blockage if coastal gale exceeds 45 knots tonight.',
        risk: { points: 16, level: 'MEDIUM', note: 'Freshwater generation rate dropped from 2,100 L/d to 1,550 L/d.' },
        action: {
          label: 'Activate Seawater Strainer Heater',
          description: 'Engage thermal de-icing coils on seawater intake well and throttle RO feed pump to 75%.',
          simScenario: 'Simulate Coastal Seawater Frazil Ice Ingestion'
        },
        specs: [
          { label: 'Storage Level', value: '12,800 L (69%)' },
          { label: 'Intake / Burn', value: '1,550 L / 1,480 L' },
          { label: 'Freeze Risk', value: 'Elevated (Frazil Ice)' }
        ],
        anomalies: ['RO pre-filter ΔP spike at 14:15.'],
        dependencies: ['Environment & Weather (Coastal surf & temp)', 'Personnel & Occupancy (31 crew demand)'],
        impacts: ['Waste Management (MBR greywater feed)', 'Equipment & Machinery (RO high-pressure pump)']
      }
    },

    // 4. Waste Management
    {
      id: 'waste',
      number: 4,
      name: 'Waste Management',
      category: 'operations',
      icon: Trash2,
      accentColor: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/50',
      link: `/station/${currentStationId}/resources`,
      question: 'Is waste being generated and processed safely without reaching storage or treatment limits?',
      maitri: {
        situation: 'Dual-stage high-temperature incinerator (850°C primary / 1,100°C secondary). Ash containerized for retrograde cargo.',
        metric: '48 kg/day',
        submetric: '310 kg stored (62% bin capacity) • 100% Treaty Compliant',
        status: 'Normal',
        score: 91,
        trend: { direction: 'stable', text: 'Daily burn cycle nominal' },
        cause: 'Summer scientific expedition generating standard paper, food prep, and combustible packaging waste.',
        impact: 'Scheduled batch burn consumes 18 L AGO fuel per cycle; heat recovery coil supplements boiler room.',
        forecast: 'Solid waste accumulation will hit 80% bin threshold in 4.5 days unless incineration batch runs tomorrow.',
        risk: { points: 5, level: 'LOW', note: 'Flue gas scrubber emissions well within Madrid Protocol limits.' },
        action: {
          label: 'Schedule Batch Incineration',
          description: 'Arm secondary burner preheat cycle for 06:00 tomorrow morning.',
          simScenario: 'Simulate Incinerator Scrubber Failure'
        },
        specs: [
          { label: 'Generation Rate', value: '48 kg/day' },
          { label: 'Storage Utilization', value: '62% (310 kg)' },
          { label: 'Chamber Temp', value: '850°C / 1,100°C' }
        ],
        anomalies: ['None; exhaust opacity detector reading 0.02%.'],
        dependencies: ['Personnel & Occupancy (Crew waste)', 'Fuel (Burner AGO fuel supply)'],
        impacts: ['Environment & Weather (Zero discharge treaty)', 'Storage & Inventory (Retrograde cargo pallets)']
      },
      bharati: {
        situation: 'Biological Membrane Bioreactor (MBR) for wastewater; containerized solid waste compactor.',
        metric: '64 kg/day',
        submetric: '420 kg stored (70% containerized) • Effluent <10mg/L BOD',
        status: 'Normal',
        score: 86,
        trend: { direction: 'stable', text: 'MBR bioreactor active' },
        cause: 'High crew headcount (31 personnel) and biological research lab wash effluent entering treatment stream.',
        impact: 'Recycled greywater routed to toilet flushing and utility washing, reducing fresh RO demand by 28%.',
        forecast: 'Solid waste containers will require palletization for retrograde cargo ship in 12 days.',
        risk: { points: 10, level: 'LOW', note: 'Biological sludge tank at 68% capacity.' },
        action: {
          label: 'Inspect MBR Sludge Density',
          description: 'Perform optical sludge density calibration and verify UV sterilizer bulb output.',
          simScenario: 'Simulate MBR Biological Culture Freeze'
        },
        specs: [
          { label: 'Generation Rate', value: '64 kg/day' },
          { label: 'Storage Utilization', value: '70% (420 kg)' },
          { label: 'Effluent BOD', value: '6.4 mg/L' }
        ],
        anomalies: ['Bio-filter aeration blower running 8% above baseline speed.'],
        dependencies: ['Personnel & Occupancy (31 personnel)', 'Research Operations (Lab wash)'],
        impacts: ['Water (Greywater recycling)', 'Transportation & Logistics (Retrograde ship loading)']
      }
    },

    // 5. Food & Supplies
    {
      id: 'food',
      number: 5,
      name: 'Food & Supplies',
      category: 'resources',
      icon: Apple,
      accentColor: 'text-orange-400',
      borderHover: 'hover:border-orange-500/50',
      link: `/station/${currentStationId}/resources`,
      question: 'Can the station sustain its current crew until the next resupply window?',
      maitri: {
        situation: 'Fully winterized ration containers audited. 185 days dry food reserves; deep-freeze locker at -22.4°C.',
        metric: '185 Days',
        submetric: 'Food: 185d • Medical: 43d • Essential supplies: 71d',
        status: 'Normal',
        score: 95,
        trend: { direction: 'stable', text: '3,400 kcal/person/day target met' },
        cause: 'Summer induction cargo containers fully unloaded and shelved in temperature-controlled habitat stores.',
        impact: 'Zero dependency on immediate flight windows; high resilience against multi-week polar vortex locks.',
        forecast: 'Deep freeze thermal stability nominal; shelf-stable dry rations intact through November 2026.',
        risk: { points: 4, level: 'LOW', note: 'Medical consumable buffer exceeds mandatory 30-day expedition guideline.' },
        action: {
          label: 'Audit Pharmaceutical Expiries',
          description: 'Run barcode scan check on emergency antibiotics and surgical anesthesia stocks.',
          simScenario: 'Simulate Habitat Cold Storage Compressor Failure'
        },
        specs: [
          { label: 'Food Stock', value: '185 Days' },
          { label: 'Medical Buffer', value: '43 Days' },
          { label: 'Freezer Temp', value: '-22.4°C' }
        ],
        anomalies: ['None; humidity inside dry store sealed at 35%.'],
        dependencies: ['Personnel & Occupancy (Daily burn)', 'Infrastructure & Buildings (Freezer power)'],
        impacts: ['Waste Management (Organic packaging)', 'Transportation & Logistics (Resupply manifest)']
      },
      bharati: {
        situation: '114 days dry stores remaining. 31 personnel consuming fresh rations; walk-in freezer at -20.1°C.',
        metric: '114 Days',
        submetric: 'Food: 114d • Medical: 29d • Essential supplies: 48d',
        status: 'Watch',
        score: 90,
        trend: { direction: 'deteriorating', text: 'Fresh produce depleted in 6d' },
        cause: 'High summer transit activity with 31 researchers consuming fresh stores at accelerated rate.',
        impact: 'Medical consumable re-order triggered for IV fluids and cold-injury trauma dressings ahead of winter.',
        forecast: 'Transitioning to blast-frozen and dehydrated stores in 6 days upon fresh stock exhaustion.',
        risk: { points: 14, level: 'MEDIUM', note: 'Medical stock buffer nearing 28-day threshold.' },
        action: {
          label: 'Prioritize Medical Manifest',
          description: 'Confirm emergency medical supplies prioritized in MV Vasiliy Golovnin air-cargo sling list.',
          simScenario: 'Simulate Prolonged Resupply Vessel Ice Lock'
        },
        specs: [
          { label: 'Food Stock', value: '114 Days' },
          { label: 'Medical Buffer', value: '29 Days' },
          { label: 'Freezer Temp', value: '-20.1°C' }
        ],
        anomalies: ['Walk-in freezer door gasket micro-leak detected.'],
        dependencies: ['Personnel & Occupancy (31 personnel)', 'Transportation & Logistics (Ship ETA)'],
        impacts: ['Personnel & Occupancy (Nutrition & health)', 'Storage & Inventory (Inventory reserves)']
      }
    },

    // 6. Infrastructure & Buildings
    {
      id: 'infrastructure',
      number: 6,
      name: 'Infrastructure & Buildings',
      category: 'infrastructure',
      icon: Home,
      accentColor: 'text-indigo-400',
      borderHover: 'hover:border-indigo-500/50',
      link: `/station/${currentStationId}/twin3d`,
      question: 'Are the station buildings safe, thermally stable, and structurally sound?',
      maitri: {
        situation: 'Heritage steel truss on jack-up pylons (1989). Thermal envelope maintained at +20.8°C against -25°C ambient.',
        metric: '91% Health',
        submetric: 'Indoor: +20.8°C • Pylons inspected • Convectors: 24 kW draw',
        status: 'Normal',
        score: 93,
        trend: { direction: 'stable', text: 'Envelope ΔT (+45.8°C) holding' },
        cause: 'Electric thermal convector array maintaining positive gradient against polar katabatic breeze.',
        impact: 'Continuous 24 kW electrical heating base load drawn from station energy bus.',
        forecast: 'North-facing corridor temp expected to drop 1.8°C during 45-knot blizzard event tonight.',
        risk: { points: 7, level: 'LOW', note: 'All outer airlock seals seated with zero drift infiltration.' },
        action: {
          label: 'Review North Wall IR Thermography',
          description: 'Scan junction seams of container block #4 for microscopic insulation settling.',
          simScenario: 'Simulate Habitat Convector Bus Circuit Breaker Trip'
        },
        specs: [
          { label: 'Structural Integrity', value: '91% (Pylons OK)' },
          { label: 'Indoor Temp / RH', value: '+20.8°C / 42%' },
          { label: 'Heating Load', value: '24 kW Continuous' }
        ],
        anomalies: ['Corridor 3 south door seal draft sensor reading 1.2 m/s.'],
        dependencies: ['Energy & Power (Thermal bus power)', 'Environment & Weather (Wind chill & temp)'],
        impacts: ['Personnel & Occupancy (Crew thermal safety)', 'Safety & Emergency (Airlock integrity)']
      },
      bharati: {
        situation: 'Aerodynamic stilted superstructure (134 ISO container modules). Automated HVAC circulating CHP waste heat.',
        metric: '88% Health',
        submetric: 'Indoor: +21.4°C • Stilted chassis • Heat recovery: 82%',
        status: 'Watch',
        score: 89,
        trend: { direction: 'stable', text: 'Aerodynamic wind shed nominal' },
        cause: 'Elevated chassis sheds snowdrifts beneath building; hydronic loop efficiently captures CHP jacket heat.',
        impact: 'Saves 12 kW electrical heating compared to direct resistive elements.',
        forecast: 'Windward expansion joint sensor showing 1.2 mm thermal contraction due to -49.6°C wind chill gusts.',
        risk: { points: 15, level: 'MEDIUM', note: 'Windward expansion joint stress monitored in storm.' },
        action: {
          label: 'Calibrate Chassis Expansion Sensors',
          description: 'Check strain gauges on windward stilt column 4B in 3D digital twin spatial view.',
          simScenario: 'Simulate 60-Knot Storm Stilt Structural Loading'
        },
        specs: [
          { label: 'Structural Integrity', value: '88% (Stilts OK)' },
          { label: 'Indoor Temp / RH', value: '+21.4°C / 38%' },
          { label: 'CHP Heat Recovery', value: '18.4 kW Thermal' }
        ],
        anomalies: ['Expansion joint 4B displacement +0.3mm above nominal.'],
        dependencies: ['Environment & Weather (62 kt gusts)', 'Energy & Power (CHP thermal output)'],
        impacts: ['Equipment & Machinery (HVAC blowers)', 'Station Operations (Structural readiness)']
      }
    },

    // 7. Equipment & Machinery
    {
      id: 'equipment',
      number: 7,
      name: 'Equipment & Machinery',
      category: 'infrastructure',
      icon: Wrench,
      accentColor: 'text-yellow-400',
      borderHover: 'hover:border-yellow-500/50',
      link: `/station/${currentStationId}/equipment`,
      question: 'Which equipment is healthy, which is degrading, and which could fail soon?',
      maitri: {
        situation: '14 critical electromechanical assets online. Gen #1 (94% health), Gen #2 (72% health), Water Pump #1 (61% health - degrading).',
        metric: '94% Fleet Health',
        submetric: '14/14 Online • Warning: Pump #1 Bearing (61% Health)',
        status: 'Watch',
        score: 89,
        trend: { direction: 'deteriorating', text: 'Pump #1 vibration harmonic ↑' },
        cause: 'Bearing race fatigue on Water Intake Pump #1 (4,820 operating hours) causing harmonic peak at 1,450 RPM.',
        impact: 'If Pump #1 trips, backup Pump #2 auto-transfer valve must cycle within 45 seconds to avoid pipe icing.',
        forecast: 'Remaining Useful Life (RUL) on Pump #1 estimated at 92 operating hours before bearing seizure.',
        risk: { points: 18, level: 'MEDIUM', note: 'High failure risk on primary intake pump; backup pump operational.' },
        action: {
          label: 'Issue Work Order: Pump #1 Bearing',
          description: 'Assign mechanical technician to stage replacement SKF 6308 bearings and execute swap.',
          simScenario: 'Simulate Water Pump #1 Seizure Under Freezing Temp'
        },
        specs: [
          { label: 'Gen #1 Health', value: '94% (8,420h)' },
          { label: 'Gen #2 Health', value: '72% (9,110h)' },
          { label: 'Pump #1 Health', value: '61% (RUL 92h)' }
        ],
        anomalies: ['Vibration velocity on Pump #1: 4.8 mm/s (Warning threshold: 4.5 mm/s).'],
        dependencies: ['Maintenance (Technician roster)', 'Storage & Inventory (Spare bearing kit)'],
        impacts: ['Water (Intake reliability)', 'Station Operations (Asset availability)']
      },
      bharati: {
        situation: '16/18 critical assets operational. CHP Unit #2 (89%), CHP Unit #1 (68% - turbocharger derated), RO Pump (74%).',
        metric: '87% Fleet Health',
        submetric: '16/18 Online • CHP #1 Intercooler Derated (68% Health)',
        status: 'Warning',
        score: 85,
        trend: { direction: 'deteriorating', text: 'Standby redundancy downgraded' },
        cause: 'CHP Unit #1 turbocharger pressure ratio dropped to 1.62 bar due to intercooler soot fouling.',
        impact: 'Station currently running exclusively on Unit #2 without instant N+1 spinning redundancy.',
        forecast: 'Maintenance required within 48 operating hours to prevent hot-spot shutoff during load transitions.',
        risk: { points: 26, level: 'HIGH', note: 'Turbine standby offline leaves station vulnerable to single-point trip.' },
        action: {
          label: 'Schedule CHP #1 Intercooler Wash',
          description: 'Pre-warm backup auxiliary generator and initiate 6-hour servicing shutdown.',
          simScenario: 'Simulate CHP #2 Failure with CHP #1 Derated'
        },
        specs: [
          { label: 'CHP #2 Health', value: '89% (Optimal)' },
          { label: 'CHP #1 Health', value: '68% (Derated)' },
          { label: 'RO Desal Pump', value: '74% (Nominal)' }
        ],
        anomalies: ['CHP Unit #1 turbocharger boost pressure -0.23 bar below target.'],
        dependencies: ['Energy & Power (Generation demands)', 'Maintenance (Specialized technician)'],
        impacts: ['Energy & Power (Spinning reserve)', 'Fuel (Burn efficiency)']
      }
    },

    // 8. Transportation & Logistics
    {
      id: 'logistics',
      number: 8,
      name: 'Transportation & Logistics',
      category: 'operations',
      icon: Truck,
      accentColor: 'text-blue-400',
      borderHover: 'hover:border-blue-500/50',
      link: `/station/${currentStationId}/forecast`,
      question: 'Will required supplies and resources arrive before the station needs them?',
      maitri: {
        situation: 'Winter lockdown protocol active. Blue Ice Runway (Novo airfield, 98 km away) closed for regular IL-76 flights.',
        metric: 'Winter Lockdown',
        submetric: 'Next DROMLAN Flight: 42d • PistenBully Convoy: Pre-staged',
        status: 'Normal',
        score: 91,
        trend: { direction: 'stable', text: 'Depot reserves self-sufficient' },
        cause: 'Intercontinental flight operations paused during regular winter storm cycles; station fully autonomous.',
        impact: 'Non-critical spare requisitions queued; station relying on internal inventory.',
        forecast: '3-day intermediate weather window opens in 6 days, permitting ski-equipped Twin Otter emergency sortie if needed.',
        risk: { points: 11, level: 'LOW', note: 'All primary consumable reserves exceed 40-day buffer.' },
        action: {
          label: 'Inspect PistenBully Snowcats',
          description: 'Run block-heater checks on Kassbohrer fleet for potential overland traverse.',
          simScenario: 'Simulate 30-Day Airbridge Closure'
        },
        specs: [
          { label: 'Next Scheduled Flight', value: '42 Days' },
          { label: 'Airfield Status', value: 'Novo Blue Ice (Standby)' },
          { label: 'Traverse Fleet', value: '4 PistenBully 300s' }
        ],
        anomalies: ['Novo runway crosswind forecast at 38 kt.'],
        dependencies: ['Environment & Weather (Airfield visibility & blizzards)', 'Fuel (Vehicle fuel)'],
        impacts: ['Food & Supplies (Incoming fresh items)', 'Storage & Inventory (Depot replenishment)']
      },
      bharati: {
        situation: 'Resupply vessel MV Vasiliy Golovnin delayed in heavy pack ice (480 nm out, speed down to 4.5 kt). ETA: 12 days.',
        metric: 'Ship Delayed',
        submetric: 'Fuel Reserve: 7d vs Resupply ETA: 12d (-5d Deficit Gap)',
        status: 'Critical',
        score: 76,
        trend: { direction: 'deteriorating', text: 'Pack ice slows ship to 4.5 kt' },
        cause: 'Heavy multi-year pack ice concentration (8/10) off Larsmann Hills delaying maritime approach.',
        impact: 'Fuel reserves (7 days) will be exhausted before ship arrival without drastic load conservation.',
        forecast: 'Icebreaker escort required; emergency helicopter sling-load operations needed to ferry fuel drums.',
        risk: { points: 42, level: 'CRITICAL', note: 'Severe resupply gap requires immediate mission control intervention.' },
        action: {
          label: 'Mobilize Helicopter Fuel Sling Ops',
          description: 'Alert Kamov Ka-32 crew at landing zone and stage 200L AGO fuel drum receiving pads.',
          simScenario: 'Simulate 10-Day Resupply Vessel Stall in Pack Ice'
        },
        specs: [
          { label: 'Resupply Vessel', value: 'MV Vasiliy Golovnin' },
          { label: 'Distance / Speed', value: '480 nm / 4.5 kt' },
          { label: 'ETA Window', value: '12.0 Days' }
        ],
        anomalies: ['Coastal satellite SAR radar confirms 8/10 pack ice pressure ridges.'],
        dependencies: ['Environment & Weather (Pack ice movement)', 'Fuel (Depot depletion rate)'],
        impacts: ['Station Operations (Emergency fuel rationing)', 'Safety & Emergency (Readiness)']
      }
    },

    // 9. Environment & Weather
    {
      id: 'weather',
      number: 9,
      name: 'Environment & Weather',
      category: 'operations',
      icon: CloudSnow,
      accentColor: 'text-cyan-300',
      borderHover: 'hover:border-cyan-500/50',
      link: `/station/${currentStationId}/environment`,
      question: 'What is the polar weather going to do to station energy, structures, and life support?',
      maitri: {
        situation: 'Katabatic wind flow off polar ice cap. Ambient temp: -25.4°C, Wind: 28 kt NE, Wind Chill: -39.1°C.',
        metric: '-25.4°C',
        submetric: 'Wind: 28 kt NE (Gusts 38 kt) • Chill: -39.1°C • 984 hPa',
        status: 'Normal',
        score: 94,
        trend: { direction: 'stable', text: 'Barometer steady (984 hPa)' },
        cause: 'Stable cold air mass descending from Antarctic high-plateau across Schirmacher Oasis.',
        impact: 'Imposes 24 kW baseline heating load; fine drift snow accumulating on outer fuel bund windbreak.',
        forecast: 'Barometer slowly falling (-1.2 hPa/3h); blizzard conditions predicted in 36 hours with gusts >55 kt.',
        risk: { points: 14, level: 'LOW', note: 'Outdoor movements permitted under standard tether protocol.' },
        action: {
          label: 'Check Lifeline Tether Arrays',
          description: 'Verify tension on high-visibility guide wires connecting main habitat to generator block.',
          simScenario: 'Simulate 65-Knot Blizzard & Whiteout'
        },
        specs: [
          { label: 'Air Temperature', value: '-25.4°C' },
          { label: 'Wind Speed & Dir', value: '28 kt NE (Gusts 38)' },
          { label: 'Atmospheric Pressure', value: '984.2 hPa' }
        ],
        anomalies: ['Micro-drifting along Generator House door 2.'],
        dependencies: ['None (External primary driving forcing function)'],
        impacts: ['Energy & Power (Solar & heating demand)', 'Infrastructure & Buildings (Thermal stress)']
      },
      bharati: {
        situation: 'Severe maritime polar cyclone impacting coastal boundary. Temp: -31.2°C, Sustained Wind: 44 kt, Gusts: 62 kt.',
        metric: '-31.2°C Storm',
        submetric: 'Wind: 44 kt (Gusts 62 kt) • Wind Chill: -49.6°C • Condition 1',
        status: 'Critical',
        score: 74,
        trend: { direction: 'deteriorating', text: 'Cyclone peak in 6 hours' },
        cause: 'Deep circum-polar low-pressure cyclone (968 hPa) pushing gale-force easterly winds off Prydz Bay.',
        impact: 'Stripped solar generation down 32% (to 11 kW) and drove generator load up 21%, spiking hourly fuel burn.',
        forecast: 'Peak gusts up to 72 kt expected over next 18 hours; zero outdoor movement permitted (Condition 1 Lockdown).',
        risk: { points: 34, level: 'HIGH', note: 'Severe storm driving cross-domain energy, fuel, and logistics cascade.' },
        action: {
          label: 'Enforce Station Condition 1',
          description: 'Seal outer emergency hatches, disable external lighting, and secure radome azimuth motors.',
          simScenario: 'Simulate 75-Knot Coastal Cyclone with Storm Surge'
        },
        specs: [
          { label: 'Air Temperature', value: '-31.2°C' },
          { label: 'Wind Speed & Dir', value: '44 kt ESE (Gusts 62)' },
          { label: 'Wind Chill Index', value: '-49.6°C' }
        ],
        anomalies: ['Barometric plunge: -4.8 hPa over last 3 hours.'],
        dependencies: ['None (Primary external forcing function)'],
        impacts: ['Energy & Power (Solar reduction)', 'Fuel (Consumption spike)', 'Transportation & Logistics (Ship stall)']
      }
    },

    // 10. Communication
    {
      id: 'communication',
      number: 10,
      name: 'Communication',
      category: 'operations',
      icon: Radio,
      accentColor: 'text-violet-400',
      borderHover: 'hover:border-violet-500/50',
      link: `/station/${currentStationId}/twin3d`,
      question: 'Can the station reliably communicate operational telemetry with NCPOR mission control?',
      maitri: {
        situation: 'Dual Ku/C-band GSAT-7A satellite link with automated Iridium Certus fallback. Freshness: 1.2s.',
        metric: '8.4 Mbps',
        submetric: 'GSAT-7A Locked • Latency: 580ms • Packet Loss: 0.8%',
        status: 'Normal',
        score: 97,
        trend: { direction: 'stable', text: 'Signal C/N: 14.8 dB (Optimal)' },
        cause: 'De-iced antenna radome heater maintaining 18.4° elevation angle lock to Indian geostationary satellite.',
        impact: 'Full bi-directional Digital Twin live synchronization with NCPOR Goa mission control.',
        forecast: '8-minute brief solar transit outage expected tomorrow at 14:22 UTC; automatic Iridium failover armed.',
        risk: { points: 3, level: 'LOW', note: 'Triple redundancy (Ku-band, C-band, Iridium satellite network).' },
        action: {
          label: 'Run Iridium SBD Heartbeat Test',
          description: 'Verify burst telemetry packet reception across backup polar low-earth orbit link.',
          simScenario: 'Simulate Satellite Link Blackout'
        },
        specs: [
          { label: 'Primary Link', value: 'GSAT-7A (Ku-band)' },
          { label: 'Bandwidth / Latency', value: '8.4 Mbps / 580ms' },
          { label: 'Packet Integrity', value: '99.2% (0.8% loss)' }
        ],
        anomalies: ['None; jitter below 12ms.'],
        dependencies: ['Energy & Power (UPS communications power)', 'Environment & Weather (Radome icing)'],
        impacts: ['Station Operations (Twin telemetry freshness)', 'Safety & Emergency (Emergency comms)']
      },
      bharati: {
        situation: 'Maritime tracking Ku-band dish throttled due to 62 kt gale gusts inducing servo micro-deflection. Freshness: 4.8s.',
        metric: '2.1 Mbps',
        submetric: 'Degraded • Latency: 840ms • Packet Loss: 6.4%',
        status: 'Warning',
        score: 82,
        trend: { direction: 'deteriorating', text: 'Wind gust jitter on dish servo' },
        cause: 'Severe coastal gusts causing dish azimuth motor vibration; ionospheric atmospheric scatter.',
        impact: 'High-bandwidth video compressed to conserve critical telemetry data stream.',
        forecast: 'Link will degrade further if freezing sea-spray causes radome icing tonight.',
        risk: { points: 18, level: 'MEDIUM', note: 'Digital Twin data freshness reduced; command link intact.' },
        action: {
          label: 'Switch to Low-Bandwidth Telemetry Stream',
          description: 'Enable compact binary encoding on telemetry socket and activate secondary dish heater.',
          simScenario: 'Simulate Radome Icing & Complete Comms Loss'
        },
        specs: [
          { label: 'Primary Link', value: 'Maritime Ku-band (Servo tracking)' },
          { label: 'Bandwidth / Latency', value: '2.1 Mbps / 840ms' },
          { label: 'Packet Integrity', value: '93.6% (6.4% loss)' }
        ],
        anomalies: ['Azimuth servo error count: 14 per minute.'],
        dependencies: ['Environment & Weather (62 kt gale)', 'Energy & Power (Servo heating)'],
        impacts: ['Station Operations (Telemetry latency)', 'Research Operations (Science data upload)']
      }
    },

    // 11. Personnel & Occupancy
    {
      id: 'personnel',
      number: 11,
      name: 'Personnel & Occupancy',
      category: 'operations',
      icon: Users,
      accentColor: 'text-emerald-300',
      borderHover: 'hover:border-emerald-500/50',
      link: `/station/${currentStationId}/dashboard`,
      question: 'How many people are at the station and how does their activity affect station resources?',
      maitri: {
        situation: '25 personnel on station (16 wintering core team + 9 summer scientific researchers). 18 on duty, 7 rest cycle.',
        metric: '25 Personnel',
        submetric: '18 Active Duty • 7 Rest Cycle • 0 Outside • Health: 100%',
        status: 'Normal',
        score: 98,
        trend: { direction: 'stable', text: 'Medical vitals nominal' },
        cause: 'Controlled indoor work roster; regular biometric telemetry and medical checkups normal.',
        impact: 'Generates daily domestic water consumption of 1,210 L and baseline habitat electrical draw of 61 kW.',
        forecast: '9 summer researchers scheduled for rotation on next flight window, which will reduce water burn by 36%.',
        risk: { points: 2, level: 'LOW', note: 'Zero active medical cases or cold injuries recorded.' },
        action: {
          label: 'Review Crew Work-Rest Roster',
          description: 'Log sleep cycle compliance and verify medical officer oxygen saturation records.',
          simScenario: 'Simulate Crew Surge (+15 Personnel Resupply Team)'
        },
        specs: [
          { label: 'Headcount (Crew / Sci)', value: '16 Winter / 9 Summer' },
          { label: 'Resource Impact', value: '1,210 L water / 48 L AGO' },
          { label: 'Duty Status', value: '18 Active / 7 Rest' }
        ],
        anomalies: ['None; cabin atmospheric CO2 steady at 520 ppm.'],
        dependencies: ['Food & Supplies (Nutrition)', 'Infrastructure & Buildings (Habitat heating)'],
        impacts: ['Water (Domestic consumption)', 'Waste Management (Generation rate)', 'Energy & Power (Peak demand)']
      },
      bharati: {
        situation: '31 personnel confined inside due to Condition 1 Storm. 24 on shift, 7 resting. Station at 100% bunk capacity.',
        metric: '31 Personnel',
        submetric: '24 Shift • 7 Rest • 0 Outside (Condition 1 Lockdown)',
        status: 'Watch',
        score: 93,
        trend: { direction: 'stable', text: 'Condition 1 lockdown roster active' },
        cause: 'High summer research load occupying all 4 laboratories and workshop bays simultaneously.',
        impact: 'Elevates water usage to 1,480 L/day and accelerates galley dry stores consumption.',
        forecast: 'Confined quarters during active storm cycle requires monitoring of air recirculation and cabin CO2 levels.',
        risk: { points: 9, level: 'LOW', note: 'All personnel accounted for in interior muster stations.' },
        action: {
          label: 'Monitor Air Recirculation & CO2',
          description: 'Increase fresh air intake damper to 25% to keep dormitory CO2 below 800 ppm.',
          simScenario: 'Simulate Medical Emergency During Storm Lockdown'
        },
        specs: [
          { label: 'Headcount (Crew / Sci)', value: '9 Logistics / 22 Sci' },
          { label: 'Resource Impact', value: '1,480 L water / 56 L AGO' },
          { label: 'Cabin CO2 Level', value: '780 ppm (Nominal)' }
        ],
        anomalies: ['Dormitory C CO2 reached 810 ppm during shift overlap.'],
        dependencies: ['Environment & Weather (Storm lockdown)', 'Food & Supplies (Caloric intake)'],
        impacts: ['Water (RO consumption)', 'Waste Management (Greywater loading)', 'Energy & Power (Kitchen/HVAC demand)']
      }
    },

    // 12. Research Operations
    {
      id: 'research',
      number: 12,
      name: 'Research Operations',
      category: 'operations',
      icon: Microscope,
      accentColor: 'text-purple-400',
      borderHover: 'hover:border-purple-500/50',
      link: `/station/${currentStationId}/analytics`,
      question: 'What research is currently running, what resources is it consuming, and could station conditions affect it?',
      maitri: {
        situation: '3 active research labs: Atmospheric Geophysics, Fluxgate Geomagnetism, and Limnology. Continuous sensor telemetry.',
        metric: '3 Labs Active',
        submetric: 'Power: 11.2 kW • Data: 38.4 GB/day • Magnetometer: Online',
        status: 'Normal',
        score: 95,
        trend: { direction: 'stable', text: 'Sensor baseline noise <0.2 nT' },
        cause: 'Fluxgate magnetometer and Brewer spectrophotometer recording continuous polar ozone & magnetosphere data.',
        impact: 'Draws steady 11.2 kW from UPS-conditioned lab bus; voltage harmonics must remain below 3%.',
        forecast: 'Clean baseline recording expected; auroral substorm predicted tonight (Kp index 5.2).',
        risk: { points: 4, level: 'LOW', note: 'High scientific payload integrity with isolated ground bus.' },
        action: {
          label: 'Verify Magnetometer UPS Isolation',
          description: 'Ensure inverter filtering active ahead of tonight\'s predicted geomagnetic substorm.',
          simScenario: 'Simulate Clean Lab Power Bus Brownout'
        },
        specs: [
          { label: 'Active Facilities', value: 'Geophys, Mag, Limno' },
          { label: 'Electrical Draw', value: '11.2 kW Continuous' },
          { label: 'Science Data Output', value: '38.4 GB / Day' }
        ],
        anomalies: ['None; magnetic sensor drift 0.04 nT/h.'],
        dependencies: ['Energy & Power (Clean harmonic UPS power)', 'Communication (Data upload)'],
        impacts: ['Energy & Power (11.2 kW demand)', 'Station Operations (Science mission accomplishment)']
      },
      bharati: {
        situation: '4 active laboratories: Satellite Ground Station (ISRO polar orbits), Glaciology, Marine Bio, Upper Atmosphere.',
        metric: '4 Labs Active',
        submetric: 'Power: 16.5 kW • Data: 54.8 GB/day • ISRO Pass: in 42 min',
        status: 'Normal',
        score: 91,
        trend: { direction: 'stable', text: 'ISRO ground antenna locked' },
        cause: 'Real-time polar tracking ground station receiving telemetry downloads for ISRO satellite constellations.',
        impact: 'Draws 16.5 kW continuous power; if generator load reaches 85%, lab non-essential heaters will be auto-shed.',
        forecast: 'Next Cartosat/Oceansat satellite pass scheduled in 42 minutes; command link prioritized on power bus.',
        risk: { points: 12, level: 'LOW', note: 'High mission value; auto-shedding will protect critical telemetry.' },
        action: {
          label: 'Confirm Priority Pass Window',
          description: 'Arm antenna radome de-icing blowers for upcoming satellite downlink pass.',
          simScenario: 'Simulate Satellite Tracking Antenna Servo Trip'
        },
        specs: [
          { label: 'Active Facilities', value: 'ISRO Ground, Glaciol, Marine, Atmos' },
          { label: 'Electrical Draw', value: '16.5 kW Continuous' },
          { label: 'Science Data Output', value: '54.8 GB / Day' }
        ],
        anomalies: ['High wind causing 0.08° dish elevation jitter.'],
        dependencies: ['Energy & Power (16.5 kW load)', 'Communication (Antenna tracking)'],
        impacts: ['Energy & Power (CHP generator load)', 'Fuel (Proportional fuel burn)']
      }
    },

    // 13. Safety & Emergency
    {
      id: 'safety',
      number: 13,
      name: 'Safety & Emergency',
      category: 'safety',
      icon: ShieldAlert,
      accentColor: 'text-red-400',
      borderHover: 'hover:border-red-500/50',
      link: `/station/${currentStationId}/risk`,
      question: 'Is there any immediate threat to personnel or station survival?',
      maitri: {
        situation: 'All 64 optical and aspirating smoke detection loops green. Gas monitors: CO2 480 ppm, O2 20.9%, Halon/Inergen armed.',
        metric: '98% Readiness',
        submetric: '64/64 Smoke Loops Green • O2: 20.9% • Inergen: Armed',
        status: 'Normal',
        score: 99,
        trend: { direction: 'improving', text: 'Daily diagnostic self-test passed' },
        cause: 'Daily loop continuity check completed; zero combustible breaches across habitat and generator house.',
        impact: 'Full autonomous life support operation without manual fire suppression intervention.',
        forecast: 'Scheduled fire drill in 4 days; winter survival shelters A and B stocked with 30-day survival packs.',
        risk: { points: 2, level: 'LOW', note: 'Optimal fire and life support readiness.' },
        action: {
          label: 'Acknowledge Daily Safety Green',
          description: 'Log verified status of emergency exit seals and survival shelter battery packs.',
          simScenario: 'Simulate Generator House Fire Detection'
        },
        specs: [
          { label: 'Fire Detection Loops', value: '64 / 64 Operational' },
          { label: 'Cabin Atmosphere', value: 'O2: 20.9% / CO2: 480ppm' },
          { label: 'Survival Shelters', value: 'Shelter A & B Ready' }
        ],
        anomalies: ['None; loop resistance nominal across all sectors.'],
        dependencies: ['Infrastructure & Buildings (Airlock fire doors)', 'Water (Fire deluge header pressure)'],
        impacts: ['Station Operations (Operational clearance)', 'Personnel & Occupancy (Life preservation)']
      },
      bharati: {
        situation: '88 optical smoke detectors online. Condition 1 storm protocol engaged; minor jitter on external perimeter gas sensor 3B.',
        metric: '94% Readiness',
        submetric: '88 Sensors Active • Watch: Perimeter Sensor 3B Jitter',
        status: 'Watch',
        score: 92,
        trend: { direction: 'stable', text: 'Sensor loop 3B polling increased' },
        cause: 'Heavy wind vibration causing occasional micro-interruption on external perimeter gas line sensor.',
        impact: 'Sensor remains functional; poll rate increased to prevent spurious false alarm trips.',
        forecast: 'Emergency survival pod ready; automated fire doors set to fail-safe auto-seal mode during Condition 1 storm.',
        risk: { points: 8, level: 'LOW', note: 'Life support systems 100% intact; minor sensor noise.' },
        action: {
          label: 'Reset Gas Sensor Diagnostic Loop',
          description: 'Acknowledge sensor 3B noise filter and verify interior cabin aspirating detectors.',
          simScenario: 'Simulate Habitat Airlock Breach During Gale'
        },
        specs: [
          { label: 'Fire Detection Loops', value: '88 / 88 Operational' },
          { label: 'Cabin Atmosphere', value: 'O2: 20.8% / CO2: 520ppm' },
          { label: 'Emergency Readiness', value: 'Survival Pod Locked' }
        ],
        anomalies: ['Loop 3B line resistance flutter (0.3 ohm variance).'],
        dependencies: ['Environment & Weather (Wind vibration)', 'Communication (Emergency alarm sirens)'],
        impacts: ['Infrastructure & Buildings (Auto fire dampers)', 'Station Operations (Risk level)']
      }
    },

    // 14. Maintenance
    {
      id: 'maintenance',
      number: 14,
      name: 'Maintenance',
      category: 'safety',
      icon: CalendarCheck,
      accentColor: 'text-amber-300',
      borderHover: 'hover:border-amber-500/50',
      link: `/station/${currentStationId}/equipment`,
      question: 'What needs to be repaired or serviced, and what should be prioritized first?',
      maitri: {
        situation: '2 active maintenance tasks in queue. 1 high-priority task: Water Intake Pump #1 bearing replacement (4,820h).',
        metric: '2 Tasks Active',
        submetric: 'Priority: Pump #1 Bearing Replacement • Next Service: 3d',
        status: 'Watch',
        score: 90,
        trend: { direction: 'stable', text: 'Parts staged in workshop' },
        cause: 'Operating hour thresholds reached on rotating machinery (Pump #1 bearing vibration rising).',
        impact: 'Technician assigned; replacement SKF bearings and synthetic low-temp grease pulled from store.',
        forecast: 'Postponing Pump #1 repair beyond 96 hours increases catastrophic bearing seizure probability to 64%.',
        risk: { points: 16, level: 'MEDIUM', note: 'Preventive service will avert unplanned water intake outage.' },
        action: {
          label: 'Authorize Pump #1 Service Window',
          description: 'Lock in 4-hour scheduled maintenance window for Tuesday morning.',
          simScenario: 'Simulate Deferred Maintenance Breakdown'
        },
        specs: [
          { label: 'Queue Summary', value: '2 Active / 0 Overdue' },
          { label: 'Assigned Technicians', value: '1 Mech / 1 Elec Eng' },
          { label: 'Next Scheduled PM', value: 'Gen #1 Lube (in 3d)' }
        ],
        anomalies: ['Pump #1 bearing vibration velocity: 4.8 mm/s.'],
        dependencies: ['Storage & Inventory (Spare bearings & grease)', 'Equipment & Machinery (Asset schedule)'],
        impacts: ['Water (Intake availability)', 'Equipment & Machinery (Asset health)']
      },
      bharati: {
        situation: '3 active maintenance tasks. 1 critical priority: CHP Unit #1 turbocharger descaling & intercooler wash.',
        metric: '3 Tasks Active',
        submetric: 'Critical: CHP #1 Intercooler Wash (Standby unit)',
        status: 'Warning',
        score: 84,
        trend: { direction: 'deteriorating', text: 'Standby generator derated' },
        cause: 'Differential pressure rise across turbocharger intercooler after 1,200 continuous running hours.',
        impact: 'Requires taking Unit #1 off standby for 6 hours; during this time station lacks instant backup generator.',
        forecast: 'Service scheduled for 09:00 tomorrow during lull in storm wind to minimize station load volatility.',
        risk: { points: 24, level: 'HIGH', note: 'Executing service restores full N+1 generation redundancy.' },
        action: {
          label: 'Pre-warm Backup Auxiliary Gen',
          description: 'Engage block heater on tertiary backup unit before opening CHP #1 turbo housing.',
          simScenario: 'Simulate Main CHP Failure During Standby Overhaul'
        },
        specs: [
          { label: 'Queue Summary', value: '3 Active / 1 Critical' },
          { label: 'Downtime Window', value: '6 Hours Planned' },
          { label: 'Next Scheduled PM', value: 'RO Desal Filter Wash' }
        ],
        anomalies: ['CHP #1 turbo boost derated by 12%.'],
        dependencies: ['Energy & Power (Generation bus stability)', 'Storage & Inventory (Gasket kit)'],
        impacts: ['Energy & Power (Redundancy margin)', 'Station Operations (Readiness score)']
      }
    },

    // 15. Storage & Inventory
    {
      id: 'inventory',
      number: 15,
      name: 'Storage & Inventory',
      category: 'resources',
      icon: Archive,
      accentColor: 'text-teal-400',
      borderHover: 'hover:border-teal-500/50',
      link: `/station/${currentStationId}/resources`,
      question: 'Do we have the physical spare parts and consumables required to keep the station operational?',
      maitri: {
        situation: '3,420 catalogued SKU items with RFID tracking. All 48 mission-critical spare parts in stock with 3x redundancy.',
        metric: '3,420 SKUs',
        submetric: '48 Critical Spares • Stockout Risk: 0 • Lube Stock: 4,200 L',
        status: 'Normal',
        score: 96,
        trend: { direction: 'improving', text: 'Reconciliation complete' },
        cause: 'Comprehensive summer inventory audit and RFID re-tagging across technical stores.',
        impact: 'Immediate parts availability for scheduled Pump #1 bearing replacement and generator servicing.',
        forecast: 'Zero critical stockouts projected throughout the 2026-2027 polar wintering season.',
        risk: { points: 4, level: 'LOW', note: 'Triple-redundant stock on all life-support components.' },
        action: {
          label: 'Audit Fuel Line Replacement Seals',
          description: 'Confirm moisture barrier packaging on high-pressure diesel injection spare seals.',
          simScenario: 'Simulate Critical Filter Stockout'
        },
        specs: [
          { label: 'Total Catalog SKUs', value: '3,420 Items' },
          { label: 'Critical Spares Stock', value: '48 / 48 Available' },
          { label: 'Filter / Lube Reserve', value: '18 Months Supply' }
        ],
        anomalies: ['None; temperature in parts store container maintained at +12°C.'],
        dependencies: ['Transportation & Logistics (Resupply shipments)'],
        impacts: ['Maintenance (Work order completion)', 'Equipment & Machinery (Uptime)']
      },
      bharati: {
        situation: '4,110 catalogued items. 54 critical spares; 1 stockout risk item (CHP secondary exhaust thermocouple probe).',
        metric: '4,110 SKUs',
        submetric: '54 Critical Spares • Watch: 1 Exhaust Probe Left',
        status: 'Watch',
        score: 87,
        trend: { direction: 'stable', text: 'Reorder placed on supply ship' },
        cause: 'Consumption of two spare thermocouples during winter startup; only 1 spare remains on site.',
        impact: 'Reorder placed on incoming MV Vasiliy Golovnin; if remaining probe fails, manual pyrometer checks required.',
        forecast: 'Part expected on incoming resupply ship (12 days ETA); currently installed probes reading nominal.',
        risk: { points: 16, level: 'MEDIUM', note: 'Thermocouple stockout risk if active probe suffers thermal fatigue.' },
        action: {
          label: 'Verify Ship Manifest for Thermocouples',
          description: 'Confirm 4x K-type high-temp exhaust thermocouple probes packed in ship container #A12.',
          simScenario: 'Simulate Immediate Thermocouple Failure with Zero Spares'
        },
        specs: [
          { label: 'Total Catalog SKUs', value: '4,110 Items' },
          { label: 'Critical Spares Stock', value: '53 / 54 (1 Watch)' },
          { label: 'Filter / Lube Reserve', value: '12 Months Supply' }
        ],
        anomalies: ['Inventory count on Part #TC-9800 matches minimum reserve threshold.'],
        dependencies: ['Transportation & Logistics (Ship arrival)', 'Maintenance (Parts issuance)'],
        impacts: ['Equipment & Machinery (CHP sensor instrumentation)', 'Station Operations (Readiness)']
      }
    },

    // 16. Station Operations
    {
      id: 'operations',
      number: 16,
      name: 'Station Operations',
      category: 'safety',
      icon: Activity,
      accentColor: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50',
      link: `/station/${currentStationId}/dashboard`,
      question: 'How ready is the entire station to continue operating, and what is the composite risk?',
      maitri: {
        situation: 'Composite digital twin synthesis indicates optimal health. All 16 domains stable; zero active critical alerts.',
        metric: '92.5% Readiness',
        submetric: 'Station Risk: LOW (18 pts) • 15/16 Nominal • 0 Alerts',
        status: 'Normal',
        score: 93,
        trend: { direction: 'stable', text: 'System equilibrium optimal' },
        cause: 'Stable inland weather, adequate solar offset, 18-day fuel buffer, and complete crew routine compliance.',
        impact: 'Station operates with high autonomy and wide safety margins across all life-support envelopes.',
        forecast: 'Stable operations for next 72 hours; scheduled preventive maintenance on Pump #1 will preserve water intake.',
        risk: { points: 18, level: 'LOW', note: 'Composite: Weather (+4), Solar (+3), Fuel (+5), Equipment (+4), Logistics (+2).' },
        action: {
          label: 'Maintain Standard Operational Watch',
          description: 'Authorize scheduled Tuesday water intake pump maintenance and continue telemetry monitoring.',
          simScenario: 'Simulate Composite Winter Storm Surge'
        },
        specs: [
          { label: 'Overall Readiness', value: '92.5% (High)' },
          { label: 'Station Risk Score', value: 'LOW 18 / 100' },
          { label: 'Domain Health', value: '15 Nominal, 1 Watch' }
        ],
        anomalies: ['None; all cross-domain causal coupling within stable operational envelopes.'],
        dependencies: ['All 15 Upstream Domains (Cross-domain synthesis)'],
        impacts: ['National Center for Polar & Ocean Research (Mission success)']
      },
      bharati: {
        situation: 'CRITICAL CROSS-DOMAIN PROPAGATION DETECTED: Storm has depressed solar, spiked CHP load, and accelerated fuel burn.',
        metric: '87.1% Readiness',
        submetric: 'Station Risk: MEDIUM-HIGH (42 pts) • 3 Active Alerts',
        status: 'Warning',
        score: 87,
        trend: { direction: 'deteriorating', text: 'Causal cascade active' },
        cause: 'Severe coastal cyclone (44kt gusts 62kt) stripped solar generation (-32%) -> Generator load ↑ to 81% -> AGO fuel consumption ↑ 17% (510 L/d) -> Pack ice delayed resupply vessel to 12 days -> 7-day fuel deficit.',
        impact: 'Fuel reserve will breach minimum life-support operating threshold in 2.1 days if consumption continues unchecked.',
        forecast: 'Fuel shortage probability reaches 74% in 6.2 days under current storm scenario without intervention.',
        risk: { points: 42, level: 'HIGH', note: 'Composite: Storm (+18), Low Solar (+14), CHP Load (+12), Fuel Gap (+10), Logistics (+6).' },
        action: {
          label: 'Initiate Energy Conservation Tier 2',
          description: 'Curtail non-critical research loads (-8 kW) to extend fuel reserve to 11.4 days and alert helicopter sling crew.',
          simScenario: 'Simulate Causal Cascade: 5-Day Storm & Fuel Depletion'
        },
        specs: [
          { label: 'Overall Readiness', value: '87.1% (Degraded)' },
          { label: 'Station Risk Score', value: 'MEDIUM-HIGH 42 / 100' },
          { label: 'Domain Health', value: '11 Nominal, 4 Watch, 1 Warn' }
        ],
        anomalies: ['3 Cross-domain alarms active: Solar Deficit, Fuel Burn Acceleration, Standby Unit Derated.'],
        dependencies: ['All 15 Upstream Domains (Cross-domain propagation)'],
        impacts: ['Station Survival & Life Support Safety']
      }
    }
  ];

  // Helper function to return active station data for a domain
  const getDomainData = (dom: DomainConfig, stationId: string): DomainStationData => {
    return stationId === 'maitri' ? dom.maitri : dom.bharati;
  };

  const getStatusBadge = (status: DomainStationData['status']) => {
    switch (status) {
      case 'Normal':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Watch':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      case 'Warning':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Critical':
        return 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
    }
  };

  const getTrendIcon = (trend: DomainStationData['trend']) => {
    if (trend.direction === 'improving') {
      return <TrendingDown className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />;
    }
    if (trend.direction === 'deteriorating') {
      return <TrendingUp className="w-3.5 h-3.5 text-red-400 inline mr-1" />;
    }
    return <Minus className="w-3.5 h-3.5 text-slate-400 inline mr-1" />;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'MEDIUM':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'HIGH':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'CRITICAL':
        return 'text-red-400 border-red-500/30 bg-red-500/10';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  const filteredDomains = domains.filter((d) => {
    if (activeCategory === 'all') return true;
    return d.category === activeCategory;
  });

  const handleExecuteAction = (actionLabel: string) => {
    setActionSuccessMsg(`Action Executed: "${actionLabel}" dispatched to station SCADA matrix.`);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#02070f] text-slate-100 p-4 lg:p-8 font-ui">
      {/* Top Breadcrumb & Live Time Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
            <span>POLARTWIN</span>
            <span>/</span>
            <span className="text-slate-400 uppercase">{currentStationId} Station</span>
            <span>/</span>
            <span className="text-white">16 Interconnected Operational Domains</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-wider text-white flex items-center gap-3">
            <span>OPERATIONAL DOMAINS</span>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              16 LIVE DIGITAL TWIN MODELS
            </span>
          </h1>
        </div>

        {/* Station Mode Toggle: Maitri, Bharati, or Compare Both */}
        <div className="flex items-center space-x-2 bg-polar-dark/80 p-1.5 rounded-xl border border-polar-border">
          <button
            onClick={() => {
              setCurrentStationId('maitri');
              selectStation('maitri');
              setViewMode('selected');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              currentStationId === 'maitri' && viewMode === 'selected'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Maitri Base
          </button>
          <button
            onClick={() => {
              setCurrentStationId('bharati');
              selectStation('bharati');
              setViewMode('selected');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              currentStationId === 'bharati' && viewMode === 'selected'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bharati Base
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'compare' ? 'selected' : 'compare')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'compare'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <span>Compare Both Stations</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200">Side-by-Side</span>
          </button>
        </div>
      </div>

      {/* Action Execution Flash Toast */}
      {actionSuccessMsg && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 1: GLOBAL STATION COMPARISON MATRIX                                  */}
      {/* ========================================================================= */}
      <div className="mb-8 glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-polar-border/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Level 1 — Global Station Comparison Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Simultaneous situational awareness across Maitri (Inland Base, 1989) and Bharati (Coastal Base, 2012)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCausalChain(!showCausalChain)}
              className="text-xs font-mono px-3 py-1 rounded-lg bg-polar-dark hover:bg-slate-800 text-slate-300 border border-polar-border transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showCausalChain ? 'Hide Causal Propagation Chain' : 'Show Causal Propagation Chain'}</span>
            </button>
          </div>
        </div>

        {/* Global Comparison Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3 font-semibold uppercase tracking-wider text-[11px]">System Metric</th>
                <th className="py-2 px-3 font-semibold uppercase tracking-wider text-[11px] text-cyan-300">
                  MAITRI (Inland Oasis)
                </th>
                <th className="py-2 px-3 font-semibold uppercase tracking-wider text-[11px] text-blue-300">
                  BHARATI (Coastal Bay)
                </th>
                <th className="py-2 px-3 font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                  Operational Variance & Situational Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Readiness Score</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                    92.5% (Optimal)
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                    87.1% (Degraded)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  Bharati operates with reduced margin due to cyclone weather and single generator standby hold.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Risk Assessment</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">LOW 18 / 100</td>
                <td className="py-2.5 px-3 text-amber-400 font-bold">MEDIUM-HIGH 42 / 100</td>
                <td className="py-2.5 px-3 text-slate-400">
                  Severe wind gusts, low solar, and fuel depletion gap elevate Bharati composite risk.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Power Generation</td>
                <td className="py-2.5 px-3 text-slate-200">
                  <span className="text-white font-bold">68 kW</span> (Demand: 61 kW, Load: 68%, Solar: 22 kW)
                </td>
                <td className="py-2.5 px-3 text-slate-200">
                  <span className="text-white font-bold">54 kW</span> (Demand: 52 kW, Load: 81%, Solar: 11 kW)
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  Bharati has less spinning margin (2 kW reserve vs 7 kW at Maitri); Solar down 32% under storm clouds.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Fuel Reserves (AGO)</td>
                <td className="py-2.5 px-3 text-slate-200">
                  <span className="text-white font-bold">78%</span> (18 days remaining, 420 L/day)
                </td>
                <td className="py-2.5 px-3 text-amber-300">
                  <span className="text-amber-400 font-bold">43%</span> (7.0 days remaining, 510 L/day)
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  <span className="text-red-300 font-semibold">Deficit Gap:</span> Bharati has 7d fuel vs 12d ship ETA (-5d window). Maitri self-sufficient.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Potable Water</td>
                <td className="py-2.5 px-3 text-slate-200">82% (16,400 L • Lake Zub intake)</td>
                <td className="py-2.5 px-3 text-slate-200">69% (12,800 L • Coastal RO desalinator)</td>
                <td className="py-2.5 px-3 text-slate-400">
                  Bharati coastal RO intake restricted by sub-zero frazil ice crystals.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Crew / Occupancy</td>
                <td className="py-2.5 px-3 text-slate-200">25 personnel (16 winter / 9 summer)</td>
                <td className="py-2.5 px-3 text-slate-200">31 personnel (9 logistics / 22 science)</td>
                <td className="py-2.5 px-3 text-slate-400">
                  Higher research headcount at Bharati drives elevated galley and electrical load.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Polar Weather</td>
                <td className="py-2.5 px-3 text-slate-200">-25.4°C • Wind 28 kt NE (Chill -39°C)</td>
                <td className="py-2.5 px-3 text-red-300">
                  -31.2°C • Wind 44 kt ESE (Gusts 62 kt, Chill -49.6°C)
                </td>
                <td className="py-2.5 px-3 text-slate-400">
                  <span className="text-red-400 font-bold">Cyclone Condition 1:</span> Bharati in emergency storm lockdown. Maitri under standard watch.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-bold text-slate-200">Active Alarms</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">0 Active Alarms</td>
                <td className="py-2.5 px-3 text-amber-400 font-bold">3 Active Alarms</td>
                <td className="py-2.5 px-3 text-slate-400">
                  Bharati alarms: Solar Generation Depressed, Fuel Resupply Deficit, CHP #1 Standby Derated.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 3: CROSS-DOMAIN CAUSAL PROPAGATION CHAIN BANNER                      */}
      {/* ========================================================================= */}
      {showCausalChain && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-red-950/30 via-polar-navy to-polar-dark border border-red-500/30 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-red-300 uppercase tracking-wider">
                Level 3 — Digital Twin Real-Time Causal Propagation Flow (Bharati Storm Cascade)
              </span>
            </div>
            <button
              onClick={() => navigate(`/station/${currentStationId}/whatif`)}
              className="text-[11px] font-mono px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>Launch What-If Simulation Engine</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 mb-4 font-mono leading-relaxed">
            The Digital Twin links physics across domains. Notice how a meteorological event cascades through power, fuel, logistics, and composite risk:
          </p>

          {/* Flow nodes */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center font-mono">
            {/* Node 1 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <div className="text-[9px] text-slate-400 uppercase">1. Environment</div>
              <div className="text-xs font-bold text-cyan-300 mt-1">Severe Cyclone</div>
              <div className="text-[10px] text-slate-400 mt-0.5">44kt, Gusts 62kt</div>
            </div>

            {/* Node 2 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <div className="text-[9px] text-slate-400 uppercase">2. Solar PV</div>
              <div className="text-xs font-bold text-amber-300 mt-1">Output ↓ 32%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Cloud overcast (11kW)</div>
            </div>

            {/* Node 3 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <div className="text-[9px] text-slate-400 uppercase">3. Energy Bus</div>
              <div className="text-xs font-bold text-amber-400 mt-1">Gen Load ↑ 21%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">CHP Unit #2 @ 81%</div>
            </div>

            {/* Node 4 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <div className="text-[9px] text-slate-400 uppercase">4. Fuel Depot</div>
              <div className="text-xs font-bold text-red-300 mt-1">Burn ↑ 17%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">510 L/day (21.2 L/h)</div>
            </div>

            {/* Node 5 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <div className="text-[9px] text-slate-400 uppercase">5. Fuel Reserve</div>
              <div className="text-xs font-bold text-red-400 mt-1">Days Rem. ↓</div>
              <div className="text-[10px] text-slate-400 mt-0.5">7.0 Days Available</div>
            </div>

            {/* Node 6 */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <div className="text-[9px] text-slate-400 uppercase">6. Logistics</div>
              <div className="text-xs font-bold text-orange-300 mt-1">Ship Delayed</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Pack Ice (ETA: 12d)</div>
            </div>

            {/* Node 7 */}
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/60">
              <div className="text-[9px] text-red-300 uppercase">7. Composite Risk</div>
              <div className="text-xs font-black text-red-300 mt-1">HIGH (42 Pts)</div>
              <div className="text-[10px] text-red-400 mt-0.5">Shortage in 2.1d</div>
            </div>

            {/* Node 8 */}
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/60">
              <div className="text-[9px] text-cyan-300 uppercase">8. Decision Action</div>
              <div className="text-xs font-bold text-cyan-200 mt-1">Tier 2 Shedding</div>
              <div className="text-[10px] text-cyan-400 mt-0.5">-8kW + Heli Sling</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOMAIN CATEGORY FILTER BAR                                                */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-polar-border">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All 16 Operational Domains' },
            { id: 'resources', label: 'Life Support & Resources' },
            { id: 'infrastructure', label: 'Infrastructure & Power' },
            { id: 'operations', label: 'Operations & Research' },
            { id: 'safety', label: 'Safety & Emergency' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                activeCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-polar-dark text-slate-400 hover:text-white border border-polar-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-slate-400">
          Viewing: <span className="text-white font-bold">{filteredDomains.length}</span> of 16 Domains
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 16 DOMAINS OPERATIONAL ENTRY POINT CARDS                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredDomains.map((dom) => {
          const Icon = dom.icon;
          const data = getDomainData(dom, currentStationId);
          const maitriData = dom.maitri;
          const bharatiData = dom.bharati;

          return (
            <div
              key={dom.id}
              onClick={() => setSelectedDomain(dom)}
              className={`glass-panel p-5 rounded-2xl border border-polar-border ${dom.borderHover} transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
            >
              {/* Subtle top ambient glow */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none group-hover:opacity-25 transition-opacity"
                style={{ background: currentStationId === 'maitri' ? '#06b6d4' : '#3b82f6' }}
              />

              <div>
                {/* Header: Domain Name, Status, and Readiness */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl bg-polar-dark border border-polar-border ${dom.accentColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-slate-400 font-bold">{dom.number}.</span>
                        <h3 className="text-sm font-black tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                          {dom.name}
                        </h3>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {currentStationId.toUpperCase()} BASE
                      </div>
                    </div>
                  </div>

                  {/* Readiness Pill */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-polar-dark text-white border border-polar-border">
                      {data.score}%
                    </span>
                  </div>
                </div>

                {/* Primary Measurement & Trend */}
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-xl font-black font-mono text-white tracking-tight">
                    {data.metric}
                  </div>
                  <div className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold ${getStatusBadge(data.status)}`}>
                    {data.status}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono mt-0.5 leading-snug">
                  {data.submetric}
                </div>

                {/* Trend indicator line */}
                <div className="mt-2 text-[10px] font-mono flex items-center text-slate-300">
                  <span className="text-slate-500 mr-1.5 uppercase">Trend:</span>
                  {getTrendIcon(data.trend)}
                  <span>{data.trend.text}</span>
                </div>

                {/* Compare Mode Side-by-Side Comparison Snippet */}
                {viewMode === 'compare' ? (
                  <div className="mt-3 p-2 rounded-lg bg-polar-dark/80 border border-polar-border text-[10px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-cyan-400 font-bold">Maitri:</span>
                      <span className="text-slate-200">{maitriData.metric} ({maitriData.score}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400 font-bold">Bharati:</span>
                      <span className="text-slate-200">{bharatiData.metric} ({bharatiData.score}%)</span>
                    </div>
                  </div>
                ) : (
                  /* Situation -> Cause -> Impact -> Forecast flow cards */
                  <div className="mt-3 space-y-2 border-t border-polar-border/50 pt-2.5">
                    {/* Cause */}
                    <div className="text-[10px] font-mono bg-polar-dark/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                      <span className="text-cyan-400 font-bold uppercase mr-1">Cause:</span>
                      <span className="text-slate-300 line-clamp-2">{data.cause}</span>
                    </div>

                    {/* Impact */}
                    <div className="text-[10px] font-mono bg-polar-dark/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                      <span className="text-amber-400 font-bold uppercase mr-1">Impact:</span>
                      <span className="text-slate-300 line-clamp-2">{data.impact}</span>
                    </div>

                    {/* Forecast */}
                    <div className="text-[10px] font-mono bg-polar-dark/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                      <span className="text-purple-400 font-bold uppercase mr-1">Forecast:</span>
                      <span className="text-slate-300 line-clamp-2">{data.forecast}</span>
                    </div>
                  </div>
                )}

                {/* Specs Pill Grid */}
                <div className="grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-polar-border/40 text-center">
                  {data.specs.map((spec) => (
                    <div key={spec.label} className="bg-polar-dark/40 rounded p-1">
                      <div className="text-[8px] font-mono text-slate-500 uppercase truncate">{spec.label}</div>
                      <div className="text-[9px] font-mono font-bold text-slate-200 truncate">{spec.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer: Risk Score & Action Entry Point */}
              <div className="mt-4 pt-3 border-t border-polar-border/50 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Risk:</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${getRiskColor(data.risk.level)}`}>
                    {data.risk.level} (+{data.risk.points} pts)
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDomain(dom);
                    }}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-cyan-500/10"
                  >
                    <span>Drill-Down</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* OPERATIONAL DRILL-DOWN MODAL (COMMON 12-POINT OPERATOR STRUCTURE)         */}
      {/* ========================================================================= */}
      {selectedDomain && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#040914] border border-polar-border w-full max-w-4xl rounded-3xl p-6 lg:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto font-ui text-slate-100">
            {/* Close button */}
            <button
              onClick={() => setSelectedDomain(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-polar-dark text-slate-400 hover:text-white border border-polar-border transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start space-x-4 mb-6 pb-4 border-b border-polar-border">
              <div className={`p-3 rounded-2xl bg-polar-dark border border-polar-border ${selectedDomain.accentColor}`}>
                <selectedDomain.icon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
                  <span>DOMAIN #{selectedDomain.number}</span>
                  <span>•</span>
                  <span className="uppercase text-slate-400">{selectedDomain.category}</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-wide mt-0.5">
                  {selectedDomain.name}
                </h2>
                <p className="text-xs text-slate-300 font-mono italic mt-1">
                  "{selectedDomain.question}"
                </p>
              </div>
            </div>

            {/* Station Selector inside Modal */}
            <div className="flex items-center justify-between bg-polar-dark p-2 rounded-xl border border-polar-border mb-6">
              <span className="text-xs font-mono text-slate-400 px-2">Focus Station:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentStationId('maitri')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    currentStationId === 'maitri'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Maitri Base
                </button>
                <button
                  onClick={() => setCurrentStationId('bharati')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    currentStationId === 'bharati'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bharati Base
                </button>
              </div>
            </div>

            {/* 12-Point Operator Structure */}
            {(() => {
              const domData = getDomainData(selectedDomain, currentStationId);
              const mData = selectedDomain.maitri;
              const bData = selectedDomain.bharati;

              return (
                <div className="space-y-6">
                  {/* A. Current Situation & Live Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs font-mono text-cyan-400 font-bold uppercase mb-1">
                        A. Current Situation ({currentStationId.toUpperCase()})
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {domData.situation}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-mono text-slate-400 uppercase">Live Metric</div>
                        <div className="text-2xl font-black font-mono text-white mt-1">
                          {domData.metric}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {domData.submetric}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-mono text-slate-400">Readiness:</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {domData.score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* B. Maitri vs Bharati Side-by-Side Comparison */}
                  <div className="p-4 rounded-xl bg-polar-dark/60 border border-polar-border">
                    <div className="text-xs font-mono text-cyan-400 font-bold uppercase mb-3">
                      B. Live Dual-Station Cross-Comparison
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                        <div className="text-cyan-300 font-bold mb-1">MAITRI STATION</div>
                        <div className="text-white font-bold text-base">{mData.metric}</div>
                        <div className="text-slate-300 mt-1">{mData.situation}</div>
                        <div className="mt-2 text-[10px] text-emerald-300">
                          Status: {mData.status} • Risk: {mData.risk.level} (+{mData.risk.points} pts)
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/30">
                        <div className="text-blue-300 font-bold mb-1">BHARATI STATION</div>
                        <div className="text-white font-bold text-base">{bData.metric}</div>
                        <div className="text-slate-300 mt-1">{bData.situation}</div>
                        <div className="mt-2 text-[10px] text-amber-300">
                          Status: {bData.status} • Risk: {bData.risk.level} (+{bData.risk.points} pts)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* C, D, E: Trend, Forecast, Health */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[11px] font-mono text-slate-400 uppercase">C. Historical Trend</div>
                      <div className="text-xs font-mono font-bold text-white mt-1 flex items-center">
                        {getTrendIcon(domData.trend)}
                        <span>{domData.trend.text}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[11px] font-mono text-purple-400 uppercase">D. Predictive Forecast</div>
                      <div className="text-xs font-mono text-slate-200 mt-1">
                        {domData.forecast}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[11px] font-mono text-slate-400 uppercase">E. Domain Health</div>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getStatusBadge(domData.status)}`}>
                          {domData.status}
                        </span>
                        <span className="text-xs font-mono text-slate-300">{domData.score}% Readiness</span>
                      </div>
                    </div>
                  </div>

                  {/* G & H: Causal Dependencies & Downstream Impact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs font-mono text-cyan-400 font-bold uppercase mb-1">
                        G. Causal Dependencies (Why is it happening?)
                      </div>
                      <p className="text-xs font-mono text-slate-300 leading-relaxed">
                        {domData.cause}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs font-mono text-amber-400 font-bold uppercase mb-1">
                        H. Downstream System Impact (What else is affected?)
                      </div>
                      <p className="text-xs font-mono text-slate-300 leading-relaxed">
                        {domData.impact}
                      </p>
                    </div>
                  </div>

                  {/* I & J: Risk Contribution & Anomalies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs font-mono text-slate-400 uppercase mb-1">
                        I. Risk Contribution to Station Risk
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getRiskColor(domData.risk.level)}`}>
                          {domData.risk.level} (+{domData.risk.points} pts)
                        </span>
                        <span className="text-xs font-mono text-slate-300">{domData.risk.note}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs font-mono text-slate-400 uppercase mb-1">
                        F & J. Anomalies & Diagnostic Signals
                      </div>
                      <ul className="text-xs font-mono text-slate-300 space-y-1 mt-1">
                        {domData.anomalies?.map((anom, i) => (
                          <li key={i} className="flex items-start space-x-1.5">
                            <span className="text-cyan-400">•</span>
                            <span>{anom}</span>
                          </li>
                        )) || <li>No active telemetry deviations.</li>}
                      </ul>
                    </div>
                  </div>

                  {/* K & L: Recommended Operator Action & What-If Trigger */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-polar-navy to-polar-dark border border-cyan-500/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-mono text-cyan-400 font-bold uppercase mb-1">
                          K. Recommended Operator Action
                        </div>
                        <div className="text-sm font-bold text-white font-mono">
                          {domData.action.label}
                        </div>
                        <p className="text-xs text-slate-300 font-mono mt-1 max-w-xl">
                          {domData.action.description}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleExecuteAction(domData.action.label)}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-cyan-500/20 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Dispatch Action</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDomain(null);
                            navigate(`/station/${currentStationId}/whatif`);
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-bold text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                          <span>Simulate Scenario</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainsPage;
