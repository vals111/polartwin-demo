import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import {
  Zap, CloudSnow, Fuel, Wrench, Droplet, Truck, Users, Radio, Archive,
  Layers, RefreshCw, GitCompare, X
} from 'lucide-react';
import { CrossDomainCausalTree } from '../components/dashboard/CrossDomainCausalTree';

interface DomainRelationship {
  upstreamIds: string[];
  downstreamIds: string[];
  driverSummary: string;
  impactSummary: string;
}

interface DomainConfig {
  id: string;
  name: string;
  category: 'energy' | 'environment' | 'fuel' | 'equipment' | 'water' | 'logistics' | 'personnel' | 'comms' | 'inventory';
  icon: any;
  route: string;
  relationships: DomainRelationship;
}

// Exactly 9 interconnected operational domains in exact specified order
const NINE_DOMAINS: DomainConfig[] = [
  {
    id: 'energy',
    name: 'Energy & Power',
    category: 'energy',
    icon: Zap,
    route: 'resources',
    relationships: {
      upstreamIds: ['environment', 'fuel', 'equipment'],
      downstreamIds: ['water', 'logistics', 'communication'],
      driverSummary: 'Ambient temperature drives habitat heating; solar PV offsets diesel generation; generator mechanical health governs output reliability.',
      impactSummary: 'Powers critical water line trace heaters, communications radome, life support blowers, and science instrumentation.'
    }
  },
  {
    id: 'environment',
    name: 'Environment & Weather',
    category: 'environment',
    icon: CloudSnow,
    route: 'environment',
    relationships: {
      upstreamIds: [],
      downstreamIds: ['energy', 'water', 'logistics', 'communication'],
      driverSummary: 'Antarctic polar vortex and regional katabatic drafts dictating extreme temperature, barometric drops, and blizzard fronts.',
      impactSummary: 'Directly dictates heating power demand, water conduit freeze hazard, convoy/vessel arrival delays, and satellite tracking link attenuation.'
    }
  },
  {
    id: 'fuel',
    name: 'Fuel',
    category: 'fuel',
    icon: Fuel,
    route: 'fuel',
    relationships: {
      upstreamIds: ['logistics'],
      downstreamIds: ['energy', 'equipment'],
      driverSummary: 'Annual maritime polar expedition resupply delivers bulk Antarctic-grade low-freeze diesel (AGO).',
      impactSummary: 'Provides primary thermal and electrical lifeline for diesel generation and boiler loops; fuel purity affects filter life and injector wear.'
    }
  },
  {
    id: 'equipment',
    name: 'Equipment & Machinery',
    category: 'equipment',
    icon: Wrench,
    route: 'equipment',
    relationships: {
      upstreamIds: ['inventory', 'personnel'],
      downstreamIds: ['energy', 'water', 'fuel'],
      driverSummary: 'Preventive technician work orders and spare parts availability maintain MTBF and component health across generators and pumps.',
      impactSummary: 'Mechanical degradation directly risks generator continuous output, water pump flow, and fuel transfer pressurization.'
    }
  },
  {
    id: 'water',
    name: 'Water',
    category: 'water',
    icon: Droplet,
    route: 'water',
    relationships: {
      upstreamIds: ['environment', 'energy'],
      downstreamIds: ['personnel', 'equipment'],
      driverSummary: 'External ambient cold risks intake freeze; energy grid continuously powers 4.2 kW trace heating elements along intake lines.',
      impactSummary: 'Supplies expedition crew hydration, hygiene, kitchen galley, and closed-loop heating/boiler makeup water.'
    }
  },
  {
    id: 'logistics',
    name: 'Transportation & Logistics',
    category: 'logistics',
    icon: Truck,
    route: 'logistics',
    relationships: {
      upstreamIds: ['environment'],
      downstreamIds: ['fuel', 'inventory'],
      driverSummary: 'Maritime pack ice thickness, coastal gales, and overland crevasse routes determine vessel and convoy traverse speeds.',
      impactSummary: 'Critical replenishment pipeline for fuel reserves, food rations, equipment spare assemblies, and expedition personnel rotation.'
    }
  },
  {
    id: 'personnel',
    name: 'Personnel & Occupancy',
    category: 'personnel',
    icon: Users,
    route: 'personnel',
    relationships: {
      upstreamIds: ['water', 'energy'],
      downstreamIds: ['energy', 'water', 'equipment'],
      driverSummary: 'Living quarters thermal stability, oxygen/CO2 life support, and potable water sustain expedition crew health.',
      impactSummary: 'Occupancy patterns directly drive diurnal energy spikes (galley meal hours), domestic water draw, and maintenance task execution.'
    }
  },
  {
    id: 'communication',
    name: 'Communication',
    category: 'comms',
    icon: Radio,
    route: 'communication',
    relationships: {
      upstreamIds: ['energy', 'environment'],
      downstreamIds: [],
      driverSummary: 'Continuous microgrid power sustains radome de-icing heaters; blizzards and atmospheric ionization attenuate RF tracking links.',
      impactSummary: 'Ensures real-time Digital Twin SCADA telemetry streaming to NCAOR Goa, mission control coordination, and emergency telemedicine.'
    }
  },
  {
    id: 'storage',
    name: 'Storage & Inventory',
    category: 'inventory',
    icon: Archive,
    route: 'inventory',
    relationships: {
      upstreamIds: ['logistics'],
      downstreamIds: ['equipment', 'personnel'],
      driverSummary: 'Annual resupply manifests restock critical machine parts, consumable fluids, and polar medical kits.',
      impactSummary: 'Guarantees 100% parts readiness for corrective repairs, preventively averting equipment failure during winter isolation.'
    }
  }
];

export const DomainsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);

  const currentStation = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  const otherStationId = isMaitri ? 'bharati' : 'maitri';
  const otherStation = stations.find((s) => s.station_id === otherStationId) || {
    station_id: otherStationId,
    name: isMaitri ? 'Bharati Antarctic Station' : 'Maitri Antarctic Station',
    location_type: isMaitri ? 'coastal' : 'inland',
  };

  const snapshot = liveSnapshot[stationId];
  const otherSnapshot = liveSnapshot[otherStationId];

  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';

  // Helper to extract domain-specific metrics for any station
  const getDomainData = (targetStationId: string) => {
    const isM = targetStationId === 'maitri';
    const snap = liveSnapshot[targetStationId];
    const env = snap?.environment;
    const eng = snap?.energy;
    const fl = snap?.fuel;
    const wt = snap?.water;
    const eq = snap?.equipment;
    const ops = snap?.station_ops;

    return {
      energy: {
        score: ops?.domain_readiness?.energy ?? (isM ? 94 : 97),
        status: isM ? 'Gen #1 Active (Optimal)' : 'Triple CHP Microgrid (Optimal)',
        healthBadge: isM ? 'Heritage Manual Switchgear' : 'Automated SCADA Sync',
        primaryKpi: `${eng?.generator_load ?? (isM ? 68 : 82)} kW`,
        primaryLabel: 'Generator Load',
        demandKw: eng?.total_demand ?? (isM ? 64 : 76),
        solarKw: eng?.solar_output ?? (isM ? 22 : 28),
        solarSharePct: Math.round(((eng?.solar_output ?? (isM ? 22 : 28)) / (eng?.generator_load ?? (isM ? 68 : 82))) * 100),
        batterySoc: eng?.battery_level ?? (isM ? 92 : 96),
        activeUnits: isM ? 'Gen #1 Active (8,420h) • Gen #2 Standby' : 'CHP #1 & #2 Active • CHP #3 Hot Standby',
        freqHz: eng?.grid_frequency ?? (isM ? 50.08 : 50.02),
        voltageV: isM ? 415.2 : 415.0,
        efficiencyKwhL: isM ? 3.88 : 4.12,
        forecastText: isM ? '+18 kW spike @ 18:30 (Galley & Science Lab)' : '+22 kW spike @ 19:00 (SWRO Desal & Cold Storage)',
        trend: isM ? [62, 64, 65, 68, 70, 68] : [74, 76, 78, 82, 84, 82],
        situation: isM
          ? 'Dual 100kVA Kirloskar diesel generators with Gen #1 currently carrying 68 kW baseline load. Rooftop solar PV is contributing 22 kW in 19.5h polar daylight, keeping the 120 kWh battery buffer at 92% state-of-charge.'
          : 'Triple 100kVA Combined Heat & Power (CHP) automation plant with exhaust heat recovery loop supplying 82 kW station microgrid. Integrated 35 kW bifacial PV array contributes 28 kW with 96% battery reserve.',
        drivers: [
          'Katabatic cold draft (-25.2°C ambient) sustains 32 kW habitat heating draw',
          'Summer solar elevation (+14.2°) provides 22 kW clean solar PV offset',
          'Galley preparation cycles generate periodic 15-20 kW load surges'
        ],
        impact: 'Powers life support atmosphere blowers, 800m water line trace heating, science laboratories, and high-frequency communication radomes.',
        action: isM ? 'Verify Gen #2 fuel day tank pre-heaters and auto-start sync relays.' : 'Inspect CHP heat exchanger differential pressure on thermal loop #2.'
      },
      environment: {
        score: ops?.domain_readiness?.environment ?? (isM ? 86 : 89),
        status: env?.condition ?? (isM ? 'Partly Cloudy • Katabatic Gale' : 'Coastal Squall • Low Vis'),
        healthBadge: isM ? 'Schirmacher Oasis Microclimate' : 'Larsemann Hills Maritime',
        primaryKpi: `${env?.temperature?.toFixed(1) ?? (isM ? -25.2 : -18.4)}°C`,
        primaryLabel: 'Ambient Temp',
        windSpeed: env?.wind_speed ?? (isM ? 32 : 44),
        windGust: env?.wind_gust ?? (isM ? 54 : 68),
        windChill: isM ? -38.4 : -31.2,
        pressureHpa: env?.pressure ?? (isM ? 984 : 992),
        humidityPct: env?.humidity ?? (isM ? 62 : 78),
        visibilityKm: env?.visibility ?? (isM ? 18 : 12),
        stormIndex: env?.storm_severity ?? (isM ? 0.28 : 0.38),
        sunElevation: isM ? '+14.2°' : '+16.0°',
        photoperiod: isM ? '19.5h daylight' : '20.2h daylight',
        forecastText: isM ? 'Katabatic gusts peaking 62 km/h at 22:00; blizzard probability < 15%' : 'Coastal fog bank rolling in from Prydz Bay in 4h; visibility dropping to 4 km',
        trend: isM ? [-23.5, -24.1, -24.8, -25.2, -25.0, -25.2] : [-16.8, -17.2, -18.0, -18.4, -18.2, -18.4],
        situation: isM
          ? 'Schirmacher Oasis cold desert climate with descending katabatic winds from the Antarctic ice sheet. Barometric pressure is steady at 984 hPa with clean visibility across the nunatak.'
          : 'Larsemann Hills coastal maritime environment facing oceanic gale squalls from Prydz Bay. Salt spray and blowing snow are causing intermittent surface icing on external catwalks.',
        drivers: [
          'Polar continental high-pressure cell driving katabatic drainage winds',
          'Summer Antarctic photoperiod with 19.5 hours continuous sun elevation',
          'Thermal delta between exposed bedrock oasis and glacial ice shelf'
        ],
        impact: 'Extreme wind chill (-38.4°C) elevates thermal transmission loss through habitat walls and accelerates freeze risks along external water supply piping.',
        action: 'Monitor barometric trend for sudden drops indicating polar plateau blizzard formation.'
      },
      fuel: {
        score: ops?.domain_readiness?.fuel ?? (isM ? 95 : 98),
        status: isM ? 'Bunded Tank Farm (Nominal)' : 'Automated SCADA Farm (Optimal)',
        healthBadge: `${fl?.reserve_zone ?? 'Watch'} Zone`,
        primaryKpi: `${fl?.fuel_percentage?.toFixed(1) ?? (isM ? 78.0 : 85.7)}%`,
        primaryLabel: 'Reserve Level',
        currentLiters: fl?.current_level ?? (isM ? 142000 : 180000),
        capacityLiters: fl?.total_capacity ?? (isM ? 182000 : 210000),
        burnRateLh: fl?.consumption_rate_l_per_hr ?? (isM ? 17.5 : 21.2),
        daysRemaining: fl?.days_remaining ?? (isM ? 18 : 24),
        safeBufferThresholdPct: 30,
        resupplyEtaDays: fl?.resupply_eta_days ?? (isM ? 88 : 102),
        gapDays: (fl?.days_remaining ?? (isM ? 18 : 24)) - (fl?.resupply_eta_days ?? (isM ? 88 : 102)),
        fuelTempC: fl?.fuel_temperature ?? (isM ? -4.2 : 2.1),
        forecastText: isM ? 'Current burn rate reaches 30% safety reserve in 18 days; bridging protocol active' : 'CHP thermal recovery loop maintains fuel temp at +2.1°C without electric heaters',
        trend: isM ? [80.2, 79.6, 79.1, 78.6, 78.2, 78.0] : [87.4, 87.0, 86.6, 86.2, 85.9, 85.7],
        situation: isM
          ? 'Antarctic Grade Low-Freeze Diesel (AGO) stored in 6 bunded steel tanks. Current inventory is 142,000 L (78% capacity). Operating burn rate of 17.5 L/hr leaves 18 days of runway before entering the critical 30% emergency reserve.'
          : 'Modern double-walled containerized fuel storage with automated SCADA valve routing matrix. 180,000 L in stock (85.7%) with jacket water heating maintaining positive fuel viscosity.',
        drivers: [
          'Dual generator operating demand drawing 420 L/day continuous fuel feed',
          'Sub-zero ambient temperature requiring tank suction pre-heaters',
          '88-day transit countdown until annual resupply vessel arrives at ice edge'
        ],
        impact: 'Fuel is the core survival commodity. Any unmitigated leak or surge in burn rate directly degrades the station bridging runway before summer resupply.',
        action: 'Conduct daily soundings of tank #3 bund; verify fuel return heater line circulation.'
      },
      equipment: {
        score: ops?.domain_readiness?.equipment ?? (isM ? 93.5 : 96.2),
        status: isM ? '5 Nominal • 1 Watch' : '7 Nominal • 1 Watch',
        healthBadge: isM ? '1 Critical Asset Watch' : 'Fleet Status Optimal',
        primaryKpi: `${eq?.avg_health ?? (isM ? 93.5 : 96.2)}%`,
        primaryLabel: 'Fleet Health',
        totalAssets: isM ? 6 : 8,
        nominalAssets: isM ? 5 : 7,
        watchAssets: 1,
        lowestAsset: isM ? 'Incinerator Draft Blower' : 'SWRO High-Pressure Pump #2',
        lowestHealth: isM ? 72 : 78,
        lowestIssue: isM ? 'Bearing vibration alert • replacement scheduled' : 'Intake filter cavitation indicator',
        mtbfHours: isM ? 4200 : 6100,
        activeTasks: isM ? 2 : 1,
        forecastText: isM ? 'Blower bearing swap scheduled tomorrow 09:00; spares 100% staged' : 'Routine filter cartridge backwash scheduled in 12 operating hours',
        trend: isM ? [95.0, 94.8, 94.2, 93.8, 93.6, 93.5] : [97.1, 96.8, 96.5, 96.4, 96.3, 96.2],
        situation: isM
          ? 'Continuous condition monitoring on diesel generator sets, HVAC blowers, air handlers, and fuel pumps. Overall fleet health is 93.5% with 5 units nominal and 1 asset on watch.'
          : 'Advanced digital asset telemetry tracking triple CHP engines, high-pressure desalination pumps, and air handling units with integrated vibration spectrum analysis.',
        drivers: [
          'Operating run hours on active primary machinery',
          'Continuous sub-zero thermal cycling stressing metallic seals',
          'Preventive CMMS maintenance execution on schedule'
        ],
        impact: 'Health degradation in active generators or water trace relays directly risks heat and potable water production.',
        action: 'Stage replacement bearings and puller kit for Incinerator Draft Blower maintenance window.'
      },
      water: {
        score: ops?.domain_readiness?.water ?? (isM ? 92 : 95),
        status: isM ? 'Lake Zub Melt Conduit (Active)' : 'SWRO Desalination (Active)',
        healthBadge: isM ? 'Trace Heaters Engaged' : 'Sub-Ice Seawater Intake',
        primaryKpi: `${wt?.storage_liters?.toLocaleString() ?? (isM ? '18,500' : '24,000')} L`,
        primaryLabel: 'Storage Reserve',
        capacityLiters: wt?.max_storage_liters ?? (isM ? 25000 : 32000),
        fillPct: wt?.percentage ?? (isM ? 74.0 : 75.0),
        dailyConsumptionL: wt?.daily_consumption_l ?? (isM ? 850 : 1100),
        pipeTempC: wt?.pipe_temp_c ?? (isM ? 3.8 : 8.5),
        freezeThresholdC: 0.0,
        freezeMarginC: isM ? 3.8 : 8.5,
        traceDrawKw: isM ? 4.2 : 2.8,
        daysBuffer: isM ? 21.8 : 21.8,
        intakeMode: isM ? '800m Heated Surface Line from Lake Zub' : 'Quilty Bay SWRO Desal (24 L/min)',
        forecastText: isM ? 'Pipe temperature stable at 3.8°C with 4.2 kW trace heat; freeze safety margin > 3.5°C' : 'SWRO batch cycle running at 1,440 L/hr; reservoir expected 100% full by 21:00',
        trend: isM ? [19200, 19000, 18800, 18650, 18550, 18500] : [22500, 22800, 23200, 23600, 23900, 24000],
        situation: isM
          ? 'Potable water is pumped from freshwater glacial melt at Priyadarshini (Lake Zub) through an insulated 800m surface pipe. Continuous 4.2 kW electrical trace heating maintains line temp at 3.8°C.'
          : 'High-pressure Seawater Reverse Osmosis (SWRO) plant draws below coastal ice pack in Quilty Bay. Produces 24 L/min of ultra-pure potable water with waste heat recovery.',
        drivers: [
          'External katabatic wind speed (-38.4°C wind chill) cooling exposed pipe run',
          'Expedition crew domestic demand (34 L/person/day across 25 personnel)',
          'Trace heating electrical reliability on microgrid bus #2'
        ],
        impact: 'Loss of trace heating power in -25°C ambient will cause irreversible pipe freeze and rupture within 45 minutes.',
        action: 'Verify secondary trace heating thermostat setpoint and inspect conduit anchor stilts.'
      },
      logistics: {
        score: ops?.domain_readiness?.logistics ?? (isM ? 88 : 92),
        status: isM ? 'On Schedule (+4.5d Delay)' : 'On Schedule (+2.0d Delay)',
        healthBadge: isM ? '100km Overland Convoy' : 'Direct Maritime Mooring',
        primaryKpi: isM ? '88 Days ETA' : '102 Days ETA',
        primaryLabel: 'Resupply Window',
        vesselName: 'MV Vasiliy Golovnin (Charter)',
        weatherDelayDays: isM ? 4.5 : 2.0,
        effectiveEtaDays: isM ? 92.5 : 104.0,
        routeType: isM ? 'Cape Town → Ice Shelf Barrier → 100km Overland PistenBully Convoy' : 'Cape Town → Prydz Bay → Direct Fast-Ice Barge Discharge',
        fleetReady: isM ? '3x PistenBully 300 Polar • 1x Ka-32 Heli' : '2x Cargo Barges • 1x Ka-32 Heli',
        riskScore: isM ? 24 : 16,
        fuelGapDays: isM ? -70 : -78,
        forecastText: isM ? 'Vessel departed Cape Town sea trials; overland ice shelf crevasse radar survey verified' : 'Prydz Bay sea-ice satellite imagery indicates optimal fast-ice thickness for direct berthing',
        trend: isM ? [98, 95, 92, 90, 89, 88] : [112, 109, 107, 105, 103, 102],
        situation: isM
          ? 'Annual expedition resupply relies on heavy ice-class charter vessel anchoring at the Princess Astrid Coast ice barrier, followed by 100 km overland traverse with PistenBully tractor trains.'
          : 'Bharati benefits from deep water coastal access in Quilty Bay, allowing cargo vessels to berth directly against stable fast ice with Ka-32 heavy helicopter sling support.',
        drivers: [
          'Southern Ocean sea-ice coverage and pack drift conditions',
          'Overland crevasse bridge stability across continental ice shelf',
          'Mechanical reliability of tracked overland transport fleet'
        ],
        impact: 'Delivers entire year replenishment of AGO fuel, dry rations, critical spare parts, and rotation scientists.',
        action: 'Review radar crevasse survey logs for northern approach sector.'
      },
      personnel: {
        score: ops?.domain_readiness?.personnel ?? (isM ? 98 : 100),
        status: isM ? 'All Accounted (1 Rest Alert)' : 'All Accounted (Nominal)',
        healthBadge: isM ? 'Day 142 Winter-Over' : 'Day 138 Winter-Over',
        primaryKpi: `${isM ? 25 : 30} Crew`,
        primaryLabel: 'Headcount',
        capacityBeds: isM ? 30 : 47,
        occupancyPct: Math.round(((isM ? 25 : 30) / (isM ? 30 : 47)) * 100),
        roleBreakdown: isM
          ? [
              { label: 'Science', count: 10, color: 'bg-pink-400' },
              { label: 'Engineering', count: 10, color: 'bg-cyan-400' },
              { label: 'Medical', count: 1, color: 'bg-emerald-400' },
              { label: 'Logistics/Galley', count: 4, color: 'bg-amber-400' }
            ]
          : [
              { label: 'Science', count: 12, color: 'bg-pink-400' },
              { label: 'Engineering', count: 12, color: 'bg-cyan-400' },
              { label: 'Medical', count: 1, color: 'bg-emerald-400' },
              { label: 'Logistics/Galley', count: 5, color: 'bg-amber-400' }
            ],
        activityMultiplier: isM ? 1.0 : 1.05,
        resourceImpactKw: isM ? '+2.4 kW/person' : '+2.5 kW/person',
        restAlert: isM ? '1 Tech <4.5h rest (duty relief active)' : '0 rest violations (100% nominal)',
        medicalBayStatus: 'Operational • 1 Doctor on Duty',
        forecastText: isM ? 'Diurnal kitchen prep spike expected 18:30; evening science instrumentation run 20:00' : 'Atmospheric LiDAR lab cycle running continuous night shift observations',
        trend: isM ? [25, 25, 25, 25, 25, 25] : [30, 30, 30, 30, 30, 30],
        situation: isM
          ? '25 personnel currently wintering over at Maitri (Day 142 of 45th ISEA). All 25 accounted inside main living module. 1 engineer flagged for fatigue relief after generator shift.'
          : '30 winter-over personnel at Bharati Station. Station operating at 64% bed capacity with optimal circadian rest cycles across all research and engineering teams.',
        drivers: [
          'Extreme Antarctic isolation and photoperiod regulation',
          'Scheduled maintenance shifts and scientific watch rotations',
          'Habitable atmospheric oxygen, CO2, and indoor heating levels'
        ],
        impact: 'Expedition personnel are the direct operational drivers of station maintenance, kitchen load, water draw, and research yield.',
        action: 'Enforce rest relief protocol for generator watch technician.'
      },
      communication: {
        score: ops?.domain_readiness?.communication ?? (isM ? 98 : 99),
        status: isM ? 'Online (QoS Priority)' : 'Online (Dual Radome High-Speed)',
        healthBadge: isM ? 'LEO Polar Constellation' : 'Dual LEO & Ku-Band Link',
        primaryKpi: isM ? '120 Mbps' : '160 Mbps',
        primaryLabel: 'Bandwidth',
        latencyMs: isM ? 78 : 65,
        packetLossPct: isM ? 0.05 : 0.02,
        uptimePct: 99.9,
        syncFreshness: '< 2.0s ago',
        qosTiers: [
          { name: 'Tier 1: Life Safety & SCADA', status: 'LIVE (100% Priority)', color: 'text-emerald-400' },
          { name: 'Tier 2: Science Data Uplink', status: 'Queued (Throttle Active)', color: 'text-cyan-400' },
          { name: 'Tier 3: Crew Welfare Voice/Data', status: 'Active (Bandwidth Capped)', color: 'text-slate-400' }
        ],
        radomeHeater: 'Active (Ice-Free)',
        backupSystem: 'Inmarsat BGAN & HF Radio Armed',
        forecastText: isM ? 'Next polar satellite constellation pass overhead in 14m; telemetry latency < 75ms' : 'Dual radomes provide seamless inter-satellite handoff with zero data drop',
        trend: isM ? [118, 120, 119, 121, 120, 120] : [158, 160, 162, 159, 161, 160],
        situation: isM
          ? 'Tracking radome on main module roof connected to high-inclination polar LEO constellation. 120 Mbps symmetrical link with 78ms latency streaming Digital Twin telemetry directly to NCAOR Goa.'
          : 'Bharati dual tracking radome installation providing 160 Mbps redundant satellite connectivity with automatic antenna switching and high-priority scientific streaming to ISRO.',
        drivers: [
          'Polar LEO satellite orbital constellation visibility',
          'Radome heating preventing blizzard snow and ice accumulation',
          'Quality of Service (QoS) bandwidth reservation for SCADA packets'
        ],
        impact: 'Enables remote mission control oversight, real-time Digital Twin synchronization, and emergency telemedicine uplink.',
        action: 'Verify radome heating amp draw before forecast 22:00 wind peak.'
      },
      storage: {
        score: ops?.domain_readiness?.inventory ?? (isM ? 94 : 97),
        status: isM ? 'Fully Stocked (0 Stockouts)' : 'Fully Stocked (0 Stockouts)',
        healthBadge: isM ? '1,420 Active SKUs' : '1,850 Active SKUs',
        primaryKpi: '0 Stockouts',
        primaryLabel: 'Depletion Risk',
        readinessScore: isM ? 94 : 97,
        totalSkus: isM ? 1420 : 1850,
        criticalItemsCount: isM ? 184 : 240,
        criticalSpares: [
          { name: 'Diesel Fuel Filter Cartridges', qty: 48, threshold: 12, unit: 'units', safe: true },
          { name: 'RO High-Pressure Membrane Seals', qty: 16, threshold: 4, unit: 'sets', safe: true },
          { name: 'PistenBully Track Pins & Links', qty: 24, threshold: 6, unit: 'units', safe: true }
        ],
        consumables: [
          { name: 'Polar Synthetic Engine Oil 5W-40', qty: 1200, unit: 'Liters' },
          { name: 'Sub-zero Glycol Antifreeze', qty: 650, unit: 'Liters' }
        ],
        jobPartsReadiness: '100% staged for active tasks',
        forecastText: isM ? 'All parts staged for tomorrow draft blower overhaul; 88-day supply buffer verified' : 'Autonomous RFID inventory matrix confirms zero items below critical reorder threshold',
        trend: isM ? [96, 95, 95, 94, 94, 94] : [98, 97, 97, 97, 97, 97],
        situation: isM
          ? '1,420 catalogued spare parts and consumables in heated storage modules. All critical spares are well above minimum safety thresholds with zero recorded stockouts.'
          : 'Automated RFID parts storage matrix at Bharati Station with 1,850 SKUs. Spares coverage includes full redundancy for CHP engines, desalination membranes, and HVAC units.',
        drivers: [
          'CMMS preventive maintenance demand scheduling',
          'Storage container temperature control preventing fluid freeze',
          'Annual resupply replenishment staging'
        ],
        impact: 'A stockout of specialized seals or filters during 9 months of winter isolation could cripple life support or electrical generation.',
        action: 'Conduct monthly physical cycle count on emergency generator injector nozzles.'
      }
    };
  };

  const currentData = useMemo(() => getDomainData(stationId), [stationId, snapshot]);
  const otherData = useMemo(() => getDomainData(otherStationId), [otherStationId, otherSnapshot]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Station Context & Control Bar */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: accentColor }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-polar-dark/80 text-slate-300 border border-polar-border">
                {isMaitri ? '70°45′S 11°44′E • Inland Schirmacher' : '69°24′S 76°11′E • Coastal Larsemann'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Layers className="w-7 h-7" style={{ color: accentColor }} />
              9 Interconnected Operational Domains
            </h1>
          </div>

          {/* Right Action Controls: Station Switcher & Compare Stations */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Station Switcher Pills */}
            <div className="bg-polar-dark/90 p-1 rounded-xl border border-polar-border flex items-center">
              <button
                onClick={() => navigate('/station/maitri/domains')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  isMaitri
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Maitri</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">Inland</span>
              </button>
              <button
                onClick={() => navigate('/station/bharati/domains')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  !isMaitri
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Bharati</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40">Coastal</span>
              </button>
            </div>

            {/* Compare Stations Button */}
            <button
              onClick={() => setCompareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all shadow-md group"
            >
              <GitCompare className="w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
              <span>Compare Stations</span>
            </button>
          </div>
        </div>

      </div>

      {/* Cross-Domain Causal Propagation Tree Graph */}
      <CrossDomainCausalTree stationId={stationId} />


      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-5xl rounded-3xl border border-cyan-500/40 bg-polar-navy/95 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-polar-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-polar-dark border border-cyan-500/40 text-cyan-400">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Station Operational Comparison • Maitri vs Bharati
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Side-by-side Digital Twin comparison across all 9 interconnected operational domains.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-2 rounded-xl bg-polar-dark border border-polar-border text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Station Summary Column Headers */}
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className={`p-4 rounded-xl border ${isMaitri ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-500/30' : 'border-polar-border bg-polar-dark/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-cyan-400">Maitri Station (Inland)</span>
                  {isMaitri && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">CURRENT ACTIVE</span>}
                </div>
                <div className="text-sm font-bold text-white mt-1">Schirmacher Oasis • Nunatak Bedrock</div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  1989 Heritage Architecture • Dual Kirloskar 100kVA • Lake Zub Heated Pipe • 100km Overland Convoy
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${!isMaitri ? 'border-blue-500/60 bg-blue-950/20 ring-1 ring-blue-500/30' : 'border-polar-border bg-polar-dark/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-blue-400">Bharati Station (Coastal)</span>
                  {!isMaitri && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">CURRENT ACTIVE</span>}
                </div>
                <div className="text-sm font-bold text-white mt-1">Larsemann Hills • Prydz Bay Promontory</div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  2012 Automated Architecture • Triple CHP Microgrid • Quilty Bay Desal • Direct Maritime Mooring
                </div>
              </div>
            </div>

            {/* 9-Domain Comparison Table */}
            <div className="mt-6 space-y-3">
              {NINE_DOMAINS.map((dom) => {
                const Icon = dom.icon;
                const mData = isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];
                const bData = !isMaitri ? (currentData as any)[dom.id] : (otherData as any)[dom.id];

                return (
                  <div key={dom.id} className="p-3.5 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">{dom.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      {/* Maitri column */}
                      <div className="p-2.5 rounded-lg bg-polar-navy/60 border border-polar-border/40">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[10px] text-slate-400 uppercase">Maitri KPI:</span>
                          <span className="text-sm font-bold text-cyan-300">{mData?.primaryKpi}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 mb-1">{mData?.status}</div>
                        <div className="text-[9px] text-slate-400">{mData?.healthBadge}</div>
                      </div>

                      {/* Bharati column */}
                      <div className="p-2.5 rounded-lg bg-polar-navy/60 border border-polar-border/40">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[10px] text-slate-400 uppercase">Bharati KPI:</span>
                          <span className="text-sm font-bold text-blue-300">{bData?.primaryKpi}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 mb-1">{bData?.status}</div>
                        <div className="text-[9px] text-slate-400">{bData?.healthBadge}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Controls */}
            <div className="mt-6 pt-4 border-t border-polar-border flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400">
                Switching active station updates all charts, models, and alerts application-wide.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigate(isMaitri ? '/station/bharati/domains' : '/station/maitri/domains');
                    setCompareModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch Active Station to {isMaitri ? 'Bharati' : 'Maitri'}</span>
                </button>
                <button
                  onClick={() => setCompareModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainsPage;
