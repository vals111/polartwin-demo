import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import {
  Zap, Fuel, Droplet, Trash2, Apple, Home, Wrench,
  Truck, CloudSnow, Radio, Users, Microscope, ShieldAlert,
  CalendarCheck, Archive, Activity, Layers,
  CheckCircle2, AlertTriangle, Cpu, ExternalLink
} from 'lucide-react';

export const DomainsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot, liveRisk, lastTickTime } = useTelemetryStore();
  const { alerts } = useAlertStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  const snapshot = liveSnapshot[stationId];
  const risk = liveRisk[stationId];
  const stationAlerts = alerts[stationId] || [];

  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const fuel = snapshot?.fuel;
  const water = snapshot?.water;
  const equip = snapshot?.equipment;
  const ops = snapshot?.station_ops;

  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';

  const allDomains = [
    {
      id: 'energy',
      category: 'critical',
      name: 'Energy & Power',
      icon: Zap,
      metric: `${eng?.generator_load ?? 68} kW`,
      submetric: 'Active: Gen #1 (8,420h) • Standby: Gen #2 (Hot Ready)',
      badge: {
        text: isMaitri ? 'Heritage Gen House (1989)' : 'CHP Automation (2012)',
        color: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      },
      highlight: {
        label: '6-12h Forecast',
        text: '+18 kW spike @ 18:30 (Galley kitchen + Lab cycles)',
        color: 'bg-amber-500/10 text-amber-300 border-amber-500/25'
      },
      status: 'Gen #1 Active (Optimal)',
      score: ops?.domain_readiness?.energy ?? 94,
      color: 'text-amber-400',
      bgColor: 'border-amber-500/30',
      tagColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      description: isMaitri
        ? 'Dual 100kVA Kirloskar diesel generators (1989 manual switchgear) with 22 kW roof PV and 92% battery reserve.'
        : 'Triple 100kVA Combined Heat and Power (CHP) automation plant with intelligent thermal recovery and battery reserve.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Energy Telemetry',
      specs: [
        { label: 'Active/Standby', value: 'Gen #1 / Gen #2' },
        { label: 'Efficiency', value: '3.88 kWh/L' },
        { label: '6h Peak Load', value: '86 kW (+18)' }
      ]
    },
    {
      id: 'fuel',
      category: 'critical',
      name: 'Fuel Depot & AGO',
      icon: Fuel,
      metric: `${fuel?.fuel_percentage?.toFixed(1) ?? 78}%`,
      submetric: `${fuel?.current_level?.toLocaleString() ?? '142,000'} L • ${fuel?.days_remaining ?? 18}d remaining`,
      badge: {
        text: `${fuel?.reserve_zone ?? 'Watch'} Zone`,
        color: fuel?.reserve_zone === 'Critical'
          ? 'bg-red-500/20 text-red-300 border-red-500/40'
          : fuel?.reserve_zone === 'High'
            ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
            : fuel?.reserve_zone === 'Watch'
              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      },
      highlight: {
        label: 'Resupply Deficit',
        text: '18d fuel vs 88d resupply = -70d gap (Rationing protocol primed)',
        color: 'bg-red-500/10 text-red-300 border-red-500/25'
      },
      status: isMaitri ? 'Manual Bunded (Active)' : 'Auto SCADA Matrix (Active)',
      score: ops?.domain_readiness?.fuel ?? 96,
      color: 'text-cyan-400',
      bgColor: 'border-cyan-500/30',
      tagColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      description: isMaitri
        ? 'Manual bunded Antarctic Grade Low-Freeze Diesel (AGO) tanks with temperature-stabilized line preheaters.'
        : 'Automated SCADA fuel farm with valve routing matrix and temperature-stabilized fuel preheaters.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Fuel Depot',
      specs: [
        { label: 'Burn Rate', value: '17.5 L/hr' },
        { label: 'Resupply Gap', value: '-70 Days' },
        { label: 'Farm Mode', value: isMaitri ? 'Manual' : 'Automated' }
      ]
    },
    {
      id: 'water',
      category: 'critical',
      name: isMaitri ? 'Water Intake & Lake Zub' : 'Quilty Bay RO Desalination',
      icon: Droplet,
      metric: `${water?.storage_liters?.toLocaleString() ?? '18,500'} L`,
      submetric: `${water?.pipe_temp_c ?? 3.8}°C • Trace Draw: 4.2 kW continuous`,
      badge: {
        text: isMaitri ? 'Lake Zub Surface Conduit' : 'Quilty Bay SWRO Desal',
        color: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      },
      highlight: {
        label: 'Process Stage',
        text: isMaitri
          ? 'Lake Zub Melt → Lake Pump House → 800m Heated Line → Storage'
          : 'Quilty Bay Sub-ice Intake → SWRO Desalination (24 L/min) → Storage',
        color: 'bg-blue-500/10 text-blue-300 border-blue-500/25'
      },
      status: 'Nominal • Trace Active',
      score: ops?.domain_readiness?.water ?? 92,
      color: 'text-blue-400',
      bgColor: 'border-blue-500/30',
      tagColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      description: isMaitri
        ? 'Heated surface water conduit drawing fresh glacial meltwater from Priyadarshini (Lake Zub) 800m away.'
        : 'High-pressure seawater Reverse Osmosis (SWRO) desalination membranes drawing below coastal sea-ice pack.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Water Systems',
      specs: [
        { label: 'Process Stage', value: isMaitri ? 'Lake Zub Melt' : 'SWRO Desal' },
        { label: 'Trace Draw', value: '4.2 kW' },
        { label: 'Freeze Risk', value: 'Low (3.8°C)' }
      ]
    },
    {
      id: 'environment',
      category: 'operations',
      name: 'Polar Environment',
      icon: CloudSnow,
      metric: `${env?.temperature?.toFixed(1) ?? -25.2}°C`,
      submetric: `Wind: ${env?.wind_speed ?? 32} km/h • Vis: ${env?.visibility ?? 18} km`,
      badge: {
        text: 'Storm Index: 0.28 / 1.0',
        color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      },
      highlight: {
        label: 'Sun Elevation',
        text: '+14.2° (19.5h daylight driving 22 kW solar PV array)',
        color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
      },
      status: env?.condition ?? 'Partly Cloudy',
      score: ops?.domain_readiness?.environment ?? 85,
      color: 'text-indigo-400',
      bgColor: 'border-indigo-500/30',
      tagColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      description: isMaitri
        ? 'Schirmacher Oasis micro-climate with extreme katabatic winds and rapid barometric pressure drops.'
        : 'Larsemann Hills coastal maritime polar climate influenced by Prydz Bay storm systems and blizzard fronts.',
      link: `/station/${stationId}/environment`,
      linkLabel: 'View Environment Lab',
      specs: [
        { label: 'Storm Index', value: '0.28 (Mild)' },
        { label: 'Sun Elevation', value: '+14.2°' },
        { label: 'Wind Chill', value: '-38.4°C' }
      ]
    },
    {
      id: 'equipment',
      category: 'infrastructure',
      name: 'Equipment & Machinery',
      icon: Wrench,
      metric: `${equip?.avg_health ?? 93.5}% Health`,
      submetric: '6 Active Units (5 Nominal, 1 Watch)',
      badge: {
        text: '1 Unit on Watch',
        color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
      },
      highlight: {
        label: 'Lowest Asset',
        text: 'Incinerator Draft Blower (72% • Bearing wear warning)',
        color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25'
      },
      status: 'Operational (1 At-Risk)',
      score: ops?.domain_readiness?.equipment ?? 93.5,
      color: 'text-emerald-400',
      bgColor: 'border-emerald-500/30',
      tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      description: 'Continuous condition monitoring on generators, HVAC blowers, air handlers, and fuel transfer pumps.',
      link: `/station/${stationId}/equipment`,
      linkLabel: 'View Machine Health',
      specs: [
        { label: 'Lowest Unit', value: 'Draft Blower 72%' },
        { label: 'Fleet Status', value: '5 Nom / 1 Watch' },
        { label: 'Mean TTBF', value: '4,200 hrs' }
      ]
    },
    {
      id: 'safety',
      category: 'critical',
      name: 'Safety & Life Support',
      icon: ShieldAlert,
      metric: 'Level 0 Secure',
      submetric: 'CO2: 440 ppm • O2: 20.8% • Fire: Armed',
      badge: {
        text: 'Safety Bands Nominal',
        color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      },
      highlight: {
        label: 'Safety Bands',
        text: 'CO2 <1000 ppm OK • O2 19.5–23.5% OK | Field: 2 in Oasis (Radio OK)',
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
      },
      status: 'Atmosphere Nominal',
      score: ops?.domain_readiness?.safety ?? 96,
      color: 'text-rose-400',
      bgColor: 'border-rose-500/30',
      tagColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      description: 'VESDA laser smoke detection, FM-200 gas suppression, and life-critical atmospheric scrubbers.',
      link: `/station/${stationId}/risk`,
      linkLabel: 'View Safety Protocols',
      specs: [
        { label: 'CO2 Band', value: '<1000 ppm' },
        { label: 'O2 Band', value: '20.8% Safe' },
        { label: 'Field Teams', value: '2 in Field (OK)' }
      ]
    },
    {
      id: 'logistics',
      category: 'operations',
      name: 'Logistics & Resupply',
      icon: Truck,
      metric: '88 Days ETA',
      submetric: 'MV Vasiliy Golovnin • Nov-Jan window',
      badge: {
        text: 'Weather Delay: +4.5d',
        color: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      },
      highlight: {
        label: 'Resupply Gap',
        text: '18d fuel stock vs 88d vessel arrival (-70d gap to bridging)',
        color: 'bg-teal-500/10 text-teal-300 border-teal-500/25'
      },
      status: 'On Schedule (+4.5d Delay)',
      score: ops?.domain_readiness?.logistics ?? 88,
      color: 'text-teal-400',
      bgColor: 'border-teal-500/30',
      tagColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      description: 'Voyage planning, ice-strengthened cargo vessels, helicopter sling payloads, and overland convoys.',
      link: `/station/${stationId}/forecast`,
      linkLabel: 'View Resupply Tracking',
      specs: [
        { label: 'Weather Delay', value: '+4.5 days' },
        { label: 'Fuel Gap', value: '-70 Days' },
        { label: 'Heli Ops', value: 'Ka-32 Ready' }
      ]
    },
    {
      id: 'communication',
      category: 'infrastructure',
      name: 'Satellite Communications',
      icon: Radio,
      metric: '120 Mbps',
      submetric: 'LEO Polar link • Latency 78ms • 99.9% Up',
      badge: {
        text: 'Priority QoS Active',
        color: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      },
      highlight: {
        label: 'Priority Queue',
        text: 'Safety & Telemetry LIVE (Tier 1) | Bulk Science QUEUED (Tier 2)',
        color: 'bg-sky-500/10 text-sky-300 border-sky-500/25'
      },
      status: 'Online (QoS Active)',
      score: ops?.domain_readiness?.communication ?? 98,
      color: 'text-sky-400',
      bgColor: 'border-sky-500/30',
      tagColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      description: 'Radome enclosed C-band/Ku-band tracking dishes and high-throughput LEO satellite constellation.',
      link: `/station/${stationId}/analytics`,
      linkLabel: 'View Comms Telemetry',
      specs: [
        { label: 'QoS Priority', value: 'Safety Tier-1' },
        { label: 'Packet Loss', value: '< 0.05%' },
        { label: 'HF Backup', value: 'Armed' }
      ]
    },
    {
      id: 'personnel',
      category: 'operations',
      name: 'Personnel & Crew Welfare',
      icon: Users,
      metric: '25 Personnel',
      submetric: 'Day 142 of 45th ISEA • 10 Sci, 10 Tech, 1 Doc, 4 Ops',
      badge: {
        text: 'Day 142 Winter-Over',
        color: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      },
      highlight: {
        label: 'Rest Alert',
        text: '24/25 Nominal • 1 Operator <4.5h rest (Flagged for duty relief)',
        color: 'bg-purple-500/10 text-purple-300 border-purple-500/25'
      },
      status: 'All Accounted (1 Flagged)',
      score: ops?.domain_readiness?.personnel ?? 100,
      color: 'text-purple-400',
      bgColor: 'border-purple-500/30',
      tagColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      description: 'Expedition winter-over crew status, circadian tracking, medical triage, and isolation shift rotation.',
      link: `/station/${stationId}/analytics`,
      linkLabel: 'View Crew Roster',
      specs: [
        { label: 'Expedition', value: 'Day 142 ISEA' },
        { label: 'Rest Alert', value: '1 Flagged (<4.5h)' },
        { label: 'Medical Bay', value: 'Ready (1 MO)' }
      ]
    },
    {
      id: 'research',
      category: 'operations',
      name: 'Scientific Labs & Payload',
      icon: Microscope,
      metric: '4 Active Labs',
      submetric: '16.5 kW load • 48.2 GB/day scientific output',
      badge: {
        text: '24.3% Station Power',
        color: 'bg-pink-500/15 text-pink-300 border-pink-500/30'
      },
      highlight: {
        label: 'Power Share',
        text: 'Consuming 16.5 kW (24.3% of total 68 kW station generation load)',
        color: 'bg-pink-500/10 text-pink-300 border-pink-500/25'
      },
      status: 'Experiments Active',
      score: ops?.domain_readiness?.research ?? 95,
      color: 'text-pink-400',
      bgColor: 'border-pink-500/30',
      tagColor: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
      description: 'Meteorology, seismology, atmospheric chemistry, geomagnetism, and glaciology ice core chambers.',
      link: `/station/${stationId}/analytics`,
      linkLabel: 'View Science Metrics',
      specs: [
        { label: 'Power Load', value: '16.5 kW (24%)' },
        { label: 'Daily Data', value: '48.2 GB/day' },
        { label: 'Instruments', value: 'Online' }
      ]
    },
    {
      id: 'infrastructure',
      category: 'infrastructure',
      name: 'Habitat & Thermal Envelope',
      icon: Home,
      metric: '18% Stress',
      submetric: 'Indoor 21.5°C • Exterior insulation nominal',
      badge: {
        text: isMaitri ? 'Bedrock Stilt (1989)' : 'Modular Pod (2012)',
        color: 'bg-orange-500/15 text-orange-300 border-orange-500/30'
      },
      highlight: {
        label: 'Architecture',
        text: isMaitri
          ? 'Heritage main module on bedrock footings with heated corridors'
          : 'Aerodynamic container assembly on 3-storey pilings (scour-tested)',
        color: 'bg-orange-500/10 text-orange-300 border-orange-500/25'
      },
      status: 'Structurally Intact',
      score: ops?.domain_readiness?.infrastructure ?? 93,
      color: 'text-orange-400',
      bgColor: 'border-orange-500/30',
      tagColor: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      description: isMaitri
        ? 'Main structural living module on bedrock footings with heated inter-block access corridors.'
        : 'Aerodynamic steel frame on elevated pilings to allow drifting snow to scour harmlessly underneath.',
      link: `/station/${stationId}/twin3d`,
      linkLabel: 'View 3D Spatial Envelope',
      specs: [
        { label: 'Construction', value: isMaitri ? 'Bedrock Stilt' : 'Modular Pod' },
        { label: 'Indoor Temp', value: '21.5°C' },
        { label: 'Stilt Strain', value: '2.1 MPa' }
      ]
    },
    {
      id: 'waste',
      category: 'operations',
      name: isMaitri ? 'Waste & 850°C Incinerator' : 'WWTP & Waste Autoclave',
      icon: Trash2,
      metric: '16.8% Bin Fill',
      submetric: 'Madrid Protocol Annex III • 0 Discharge',
      badge: {
        text: 'Annex III Compliant',
        color: 'bg-lime-500/15 text-lime-300 border-lime-500/30'
      },
      highlight: {
        label: 'Segregation',
        text: 'Incinerable 16.8% | Batteries & Heavy Waste 100% packed for vessel removal (88d)',
        color: 'bg-lime-500/10 text-lime-300 border-lime-500/25'
      },
      status: 'Madrid Protocol OK',
      score: ops?.domain_readiness?.waste ?? 90,
      color: 'text-lime-400',
      bgColor: 'border-lime-500/30',
      tagColor: 'bg-lime-500/10 text-lime-300 border-lime-500/30',
      description: 'Antarctic Environmental Protocol Annex III zero-harm waste segregation, shredding, and return to mainland.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Waste Handling',
      specs: [
        { label: 'Burn Chamber', value: '850°C (Org)' },
        { label: 'Hazardous', value: '0% Burn (Sealed)' },
        { label: 'Shipment ETA', value: '88 Days' }
      ]
    },
    {
      id: 'supplies',
      category: 'critical',
      name: 'Rations & Cold Storage',
      icon: Apple,
      metric: '185 Days Stock',
      submetric: 'Deep freeze -21°C • Dry storage 15°C',
      badge: {
        text: '14d Fresh vs 185d Dry',
        color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      },
      highlight: {
        label: 'Shelf Life',
        text: 'Fresh/Perishables: 14 days remaining | Dry Rations: 185 days remaining',
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
      },
      status: 'Rations Calibrated',
      score: ops?.domain_readiness?.supplies ?? 95,
      color: 'text-emerald-400',
      bgColor: 'border-emerald-500/30',
      tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      description: 'Calibrated long-duration dry grains, vacuum sealed proteins, freeze-dried rations, and vitamin stores.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Rations Depot',
      specs: [
        { label: 'Fresh Stock', value: '14 Days' },
        { label: 'Dry Rations', value: '185 Days' },
        { label: 'Calorie Target', value: '3,800 kcal' }
      ]
    },
    {
      id: 'maintenance',
      category: 'infrastructure',
      name: 'Maintenance Queue',
      icon: CalendarCheck,
      metric: '2 Active Tasks',
      submetric: '1 in-progress • 1 scheduled preventive check',
      badge: {
        text: 'Asset #4 Triggered',
        color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
      },
      highlight: {
        label: 'Trigger Asset',
        text: 'Task #1: Incinerator Draft Blower (Triggered by Asset #4 Low Health 72%)',
        color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25'
      },
      status: 'Tasks In Progress',
      score: ops?.domain_readiness?.maintenance ?? 90,
      color: 'text-yellow-400',
      bgColor: 'border-yellow-500/30',
      tagColor: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      description: 'Computerized Maintenance Management System (CMMS) scheduling filter replacements and valve checks.',
      link: `/station/${stationId}/equipment`,
      linkLabel: 'View Maintenance Log',
      specs: [
        { label: 'Trigger Asset', value: 'Blower (72%)' },
        { label: 'Spares Status', value: '100% In Stock' },
        { label: 'Tech Assigned', value: 'V. Raman' }
      ]
    },
    {
      id: 'inventory',
      category: 'infrastructure',
      name: 'Critical Spares Inventory',
      icon: Archive,
      metric: '0 Stockouts',
      submetric: '1,420 SKUs • 184 critical items in stock',
      badge: {
        text: 'Job Parts 100% Ready',
        color: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      },
      highlight: {
        label: 'Task Readiness',
        text: 'All replacement parts for 2 active maintenance tasks verified in stock',
        color: 'bg-sky-500/10 text-sky-300 border-sky-500/25'
      },
      status: 'Fully Stocked',
      score: ops?.domain_readiness?.inventory ?? 94,
      color: 'text-sky-400',
      bgColor: 'border-sky-500/30',
      tagColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      description: 'Categorized spare parts container store with RFID tagging and automated re-order thresholds.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Inventory Store',
      specs: [
        { label: 'Job Parts', value: '100% Stocked' },
        { label: 'Critical SKUs', value: '184 units' },
        { label: 'Discrepancies', value: '0' }
      ]
    },
    {
      id: 'station_ops',
      category: 'critical',
      name: 'Station Synthesis & Readiness',
      icon: Activity,
      metric: `${ops?.overall_readiness ?? 92.5}% Readiness`,
      submetric: '45th Indian Scientific Expedition • Full Coupling',
      badge: {
        text: 'Composite Nominal',
        color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
      },
      highlight: {
        label: 'Key Risk Driver',
        text: 'Resupply Gap (-70d) & Katabatic Freeze Risk on Water Line (-28°C Wind Chill)',
        color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
      },
      status: ops?.status_band ?? 'Nominal Band',
      score: ops?.overall_readiness ?? 92.5,
      color: 'text-cyan-400',
      bgColor: 'border-cyan-500/30',
      tagColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      description: 'Composite multi-domain health index calculated across all 16 domains with cross-propagation weights.',
      link: `/station/${stationId}`,
      linkLabel: 'Open Station Twin Dashboard',
      specs: [
        { label: 'Top Risk Driver', value: 'Resupply Gap' },
        { label: 'Risk Score', value: `${risk?.score ?? 18}/100` },
        { label: 'Tick Interval', value: '4.0s' }
      ]
    }
  ];

  const avgReadiness = Math.round(
    allDomains.reduce((acc, d) => acc + d.score, 0) / allDomains.length
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner & Context Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: accentColor }}
        />

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold border"
              style={{ background: `${accentColor}18`, color: accentColor, borderColor: `${accentColor}44` }}
            >
              16-Domain Digital Architecture
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {station.name} • {station.location_type.toUpperCase()}
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
            <Layers className="w-7 h-7" style={{ color: accentColor }} />
            16 Interconnected Operational Domains
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              16/16 Domains Live Synchronized
            </span>
            <span>•</span>
            <span>Average Readiness: <strong className="text-cyan-300">{avgReadiness}%</strong></span>
            <span>•</span>
            <span>Station Risk: <strong style={{ color: accentColor }}>{risk?.level || 'LOW'}</strong> ({risk?.score || 18} pts)</span>
            <span>•</span>
            <span>Alerts: <strong className="text-amber-300">{stationAlerts.length}</strong> active</span>
          </div>
        </div>
      </div>

      {/* 16 Domains Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {allDomains.map((dom) => {
          const Icon = dom.icon;
          const isSelected = selectedDomainId === dom.id;

          return (
            <div
              key={dom.id}
              onClick={() => setSelectedDomainId(isSelected ? null : dom.id)}
              className={`glass-panel p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:shadow-xl relative overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-cyan-400 border-cyan-400 bg-polar-navy/80 shadow-cyan-500/20'
                  : `${dom.bgColor} hover:border-cyan-400/50 hover:-translate-y-0.5`
              }`}
            >
              {/* Subtle top indicator bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 opacity-70"
                style={{
                  background: dom.score > 90 ? '#10b981' : dom.score > 80 ? '#06b6d4' : '#f59e0b'
                }}
              />

              <div>
                {/* Header with Icon, Title & Score */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-polar-dark/80 text-cyan-400 border border-polar-border group-hover:scale-110 transition-transform flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                        {dom.name}
                      </div>
                      {dom.badge && (
                        <div className="mt-0.5">
                          <span className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${dom.badge.color}`}>
                            {dom.badge.text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-polar-dark/80 text-white border border-polar-border">
                      {dom.score}%
                    </span>
                  </div>
                </div>

                {/* Primary Metric & Submetric */}
                <div className="text-xl font-black font-mono text-white tracking-tight mt-1.5">
                  {dom.metric}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 leading-snug">
                  {dom.submetric}
                </div>

                {/* Operational Callout / Highlight */}
                {dom.highlight && (
                  <div className={`mt-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono border leading-snug ${dom.highlight.color}`}>
                    <span className="font-bold mr-1.5 uppercase tracking-wide">{dom.highlight.label}:</span>
                    <span className="opacity-90">{dom.highlight.text}</span>
                  </div>
                )}

                {/* Description snippet */}
                <p className="text-[11px] text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                  {dom.description}
                </p>

                {/* Micro Spec Badges */}
                <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-polar-border/40">
                  {dom.specs.map((spec) => (
                    <div key={spec.label} className="bg-polar-dark/50 rounded p-1 text-center">
                      <div className="text-[8px] font-mono text-slate-500 uppercase">{spec.label}</div>
                      <div className="text-[9px] font-mono font-bold text-slate-200 truncate">{spec.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer: Condition & Navigation Link */}
              <div className="mt-4 pt-3 border-t border-polar-border/50 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">Status:</span>
                  <span className={`text-[10px] font-mono font-bold ${dom.color}`}>
                    {dom.status}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(dom.link);
                  }}
                  className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-200 transition-colors"
                >
                  <span>Details</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DomainsPage;
