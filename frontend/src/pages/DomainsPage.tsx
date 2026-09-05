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
      submetric: `Solar: ${eng?.solar_output ?? 22} kW | Batt: ${eng?.battery_level ?? 92}%`,
      status: eng?.status ?? 'Nominal',
      score: ops?.domain_readiness?.energy ?? 94,
      color: 'text-amber-400',
      bgColor: 'border-amber-500/30',
      tagColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      description: isMaitri
        ? 'Dual 100kVA Kirloskar diesel generators coupled with 22 kW roof PV and 92% UPS battery reserve.'
        : 'Triple 100kVA Combined Heat and Power (CHP) plant with intelligent thermal energy recovery and battery storage.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Energy Telemetry',
      specs: [
        { label: 'Bus Frequency', value: '50.1 Hz' },
        { label: 'Voltage Stability', value: '415V ±0.8%' },
        { label: 'Gen Load Factor', value: `${((eng?.generator_load ?? 68) / 100 * 100).toFixed(0)}%` }
      ]
    },
    {
      id: 'fuel',
      category: 'critical',
      name: 'Fuel Depot & AGO',
      icon: Fuel,
      metric: `${fuel?.fuel_percentage?.toFixed(1) ?? 78}%`,
      submetric: `${fuel?.current_level?.toLocaleString() ?? '142,000'} L • ${fuel?.days_remaining ?? 18}d remaining`,
      status: fuel?.reserve_zone ?? 'Normal',
      score: ops?.domain_readiness?.fuel ?? 96,
      color: 'text-cyan-400',
      bgColor: 'border-cyan-500/30',
      tagColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      description: 'Antarctic Grade Low-Freeze Diesel (AGO) bunded tanks with temperature-stabilized fuel preheaters.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Fuel Depot',
      specs: [
        { label: 'Burn Rate', value: `${fuel?.consumption_rate_l_per_hr ?? 17.5} L/hr` },
        { label: 'Daily Draw', value: '420 L/day' },
        { label: 'Tank Temp', value: '-8.5°C' }
      ]
    },
    {
      id: 'water',
      category: 'critical',
      name: isMaitri ? 'Water Intake & Lake Zub' : 'Quilty Bay RO Desalination',
      icon: Droplet,
      metric: `${water?.storage_liters?.toLocaleString() ?? '18,500'} L`,
      submetric: `${water?.pipe_temp_c ?? 3.8}°C • Freeze Risk: ${water?.freeze_risk ?? 'Low'}`,
      status: water?.freeze_risk === 'Low' ? 'Nominal' : 'Freeze Risk',
      score: ops?.domain_readiness?.water ?? 92,
      color: 'text-blue-400',
      bgColor: 'border-blue-500/30',
      tagColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      description: isMaitri
        ? 'Heated surface water conduit drawing fresh glacial meltwater from Priyadarshini (Lake Zub) 800m away.'
        : 'High-pressure seawater Reverse Osmosis (RO) membranes drawing from Quilty Bay intake below sea-ice pack.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Water Systems',
      specs: [
        { label: 'Pump Flow', value: '28 L/min' },
        { label: 'Line Trace Temp', value: `${water?.pipe_temp_c ?? 3.8}°C` },
        { label: 'Water Reserve', value: `${water?.percentage ?? 82}%` }
      ]
    },
    {
      id: 'environment',
      category: 'operations',
      name: 'Polar Environment',
      icon: CloudSnow,
      metric: `${env?.temperature?.toFixed(1) ?? -25.2}°C`,
      submetric: `Wind: ${env?.wind_speed ?? 32} km/h • Vis: ${env?.visibility ?? 18} km`,
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
        { label: 'Wind Chill', value: '-38.4°C' },
        { label: 'Pressure', value: `${env?.pressure ?? 988} hPa` },
        { label: 'Solar Radiation', value: `${env?.solar_radiation ?? 210} W/m²` }
      ]
    },
    {
      id: 'equipment',
      category: 'infrastructure',
      name: 'Equipment & Machinery',
      icon: Wrench,
      metric: `${equip?.avg_health ?? 93.5}% Health`,
      submetric: `${equip?.items?.length ?? 6} active units • 0 critical trips`,
      status: 'Operational',
      score: ops?.domain_readiness?.equipment ?? 93.5,
      color: 'text-emerald-400',
      bgColor: 'border-emerald-500/30',
      tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      description: 'Continuous condition monitoring on generators, HVAC blowers, air handlers, and transfer pumps.',
      link: `/station/${stationId}/equipment`,
      linkLabel: 'View Machine Health',
      specs: [
        { label: 'Vibration Alert', value: 'None' },
        { label: 'Lubrication', value: 'Good' },
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
      status: 'Secure',
      score: ops?.domain_readiness?.safety ?? 96,
      color: 'text-rose-400',
      bgColor: 'border-rose-500/30',
      tagColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      description: 'VESDA laser smoke detection, FM-200 gas suppression, and life-critical atmospheric scrubbers.',
      link: `/station/${stationId}/risk`,
      linkLabel: 'View Safety Protocols',
      specs: [
        { label: 'CO Level', value: '< 2 ppm' },
        { label: 'Sprinklers', value: 'Standby' },
        { label: 'Escape Hatches', value: 'Clear' }
      ]
    },
    {
      id: 'logistics',
      category: 'operations',
      name: 'Logistics & Resupply',
      icon: Truck,
      metric: '88 Days ETA',
      submetric: 'MV Vasiliy Golovnin • Nov-Jan window',
      status: 'On Schedule',
      score: ops?.domain_readiness?.logistics ?? 88,
      color: 'text-teal-400',
      bgColor: 'border-teal-500/30',
      tagColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      description: 'Voyage planning, ice-strengthened cargo vessels, helicopter sling payloads, and overland convoys.',
      link: `/station/${stationId}/forecast`,
      linkLabel: 'View Resupply Tracking',
      specs: [
        { label: 'Next Vessel', value: 'MV Golovnin' },
        { label: 'Heli Ops', value: 'Ka-32 Ready' },
        { label: 'Convoy PistenBully', value: '3 Active' }
      ]
    },
    {
      id: 'communication',
      category: 'infrastructure',
      name: 'Satellite Communications',
      icon: Radio,
      metric: '120 Mbps',
      submetric: 'LEO Polar link • Latency 78ms • 99.9% Up',
      status: 'Online',
      score: ops?.domain_readiness?.communication ?? 98,
      color: 'text-sky-400',
      bgColor: 'border-sky-500/30',
      tagColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      description: 'Radome enclosed C-band/Ku-band tracking dishes and high-throughput LEO satellite constellation.',
      link: `/station/${stationId}/analytics`,
      linkLabel: 'View Comms Telemetry',
      specs: [
        { label: 'Uplink Signal', value: '-62 dBm' },
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
      submetric: '10 Sci, 10 Tech, 1 Medical Officer, 4 Ops',
      status: 'All Accounted',
      score: ops?.domain_readiness?.personnel ?? 100,
      color: 'text-purple-400',
      bgColor: 'border-purple-500/30',
      tagColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      description: 'Expedition winter-over crew status, psychological monitoring, medical triage, and shift scheduling.',
      link: `/station/${stationId}/analytics`,
      linkLabel: 'View Crew Roster',
      specs: [
        { label: 'Medical Bay', value: 'Ready' },
        { label: 'Rest Cycles', value: '8.2 hrs avg' },
        { label: 'Outdoor Teams', value: '2 in Oasis' }
      ]
    },
    {
      id: 'research',
      category: 'operations',
      name: 'Scientific Labs & Payload',
      icon: Microscope,
      metric: '4 Active Labs',
      submetric: '16.5 kW load • 48.2 GB/day scientific output',
      status: 'Experiment Running',
      score: ops?.domain_readiness?.research ?? 95,
      color: 'text-pink-400',
      bgColor: 'border-pink-500/30',
      tagColor: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
      description: 'Meteorology, seismology, atmospheric chemistry, geomagnetism, and glaciology ice core chambers.',
      link: `/station/${stationId}/analytics`,
      linkLabel: 'View Science Metrics',
      specs: [
        { label: 'Seismograph', value: 'Online' },
        { label: 'Spectrometer', value: 'Calibrated' },
        { label: 'Data Uplink', value: 'Active' }
      ]
    },
    {
      id: 'infrastructure',
      category: 'infrastructure',
      name: 'Habitat & Thermal Envelope',
      icon: Home,
      metric: '18% Stress',
      submetric: 'Internal 21.5°C • Exterior insulation nominal',
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
        { label: 'Indoor Temp', value: '21.5°C' },
        { label: 'Humidity', value: '38% RH' },
        { label: 'Stilt Strain', value: '2.1 MPa' }
      ]
    },
    {
      id: 'waste',
      category: 'operations',
      name: isMaitri ? 'Waste & 850°C Incinerator' : 'WWTP & Waste Autoclave',
      icon: Trash2,
      metric: '16.8% Bin Fill',
      submetric: 'Treaty protocol compliant • 0 discharge',
      status: 'Madrid Compliant',
      score: ops?.domain_readiness?.waste ?? 90,
      color: 'text-lime-400',
      bgColor: 'border-lime-500/30',
      tagColor: 'bg-lime-500/10 text-lime-300 border-lime-500/30',
      description: 'Antarctic Environmental Protocol Annex III zero-harm waste segregation, shredding, and return to mainland.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Waste Handling',
      specs: [
        { label: 'Chamber Temp', value: '850°C' },
        { label: 'Scrubber Filter', value: '98% Eff.' },
        { label: 'Ash Sealed', value: '100%' }
      ]
    },
    {
      id: 'supplies',
      category: 'critical',
      name: 'Rations & Cold Storage',
      icon: Apple,
      metric: '185 Days Stock',
      submetric: 'Deep freeze -21°C • Dry storage 15°C',
      status: 'Optimal Margin',
      score: ops?.domain_readiness?.supplies ?? 95,
      color: 'text-emerald-400',
      bgColor: 'border-emerald-500/30',
      tagColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      description: 'Calibrated long-duration dry grains, vacuum sealed proteins, freeze-dried rations, and vitamin stores.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Rations Depot',
      specs: [
        { label: 'Freezer 1 Temp', value: '-21.2°C' },
        { label: 'Freezer 2 Temp', value: '-20.8°C' },
        { label: 'Daily Cal/Person', value: '3,800 kcal' }
      ]
    },
    {
      id: 'maintenance',
      category: 'infrastructure',
      name: 'Maintenance Queue',
      icon: CalendarCheck,
      metric: '2 Active Tasks',
      submetric: '1 in-progress • 1 scheduled preventive check',
      status: 'Spares In Stock',
      score: ops?.domain_readiness?.maintenance ?? 90,
      color: 'text-yellow-400',
      bgColor: 'border-yellow-500/30',
      tagColor: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      description: 'Computerized Maintenance Management System (CMMS) scheduling filter replacements and valve checks.',
      link: `/station/${stationId}/equipment`,
      linkLabel: 'View Maintenance Log',
      specs: [
        { label: 'Overdue Jobs', value: '0' },
        { label: 'Next Service', value: '3 days' },
        { label: 'Tech Assigned', value: 'V. Raman' }
      ]
    },
    {
      id: 'inventory',
      category: 'infrastructure',
      name: 'Critical Spares Inventory',
      icon: Archive,
      metric: '0 Stockouts',
      submetric: 'Filters, synthetic oils, pump seals, heating coils',
      status: 'Fully Stocked',
      score: ops?.domain_readiness?.inventory ?? 94,
      color: 'text-sky-400',
      bgColor: 'border-sky-500/30',
      tagColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      description: 'Categorized spare parts container store with RFID tagging and automated re-order thresholds.',
      link: `/station/${stationId}/resources`,
      linkLabel: 'View Inventory Store',
      specs: [
        { label: 'Total SKUs', value: '1,420' },
        { label: 'Critical Items', value: '184 in stock' },
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
      status: ops?.status_band ?? 'Nominal',
      score: ops?.overall_readiness ?? 92.5,
      color: 'text-cyan-400',
      bgColor: 'border-cyan-500/30',
      tagColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      description: 'Composite multi-domain health index calculated across all 16 domains with cross-propagation weights.',
      link: `/station/${stationId}`,
      linkLabel: 'Open Station Twin Dashboard',
      specs: [
        { label: 'Status Band', value: ops?.status_band ?? 'Nominal' },
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-polar-dark/80 text-cyan-400 border border-polar-border group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                        {dom.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-polar-dark/80 text-white border border-polar-border">
                      {dom.score}%
                    </span>
                  </div>
                </div>

                {/* Primary Metric & Submetric */}
                <div className="text-xl font-black font-mono text-white tracking-tight mt-2">
                  {dom.metric}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1 leading-snug">
                  {dom.submetric}
                </div>

                {/* Description snippet */}
                <p className="text-[11px] text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
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
