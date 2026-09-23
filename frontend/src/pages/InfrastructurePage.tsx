import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import * as echarts from 'echarts';
import {
  Building2, Layers, RefreshCw, Wind, Thermometer,
  ShieldCheck, CloudSnow, Flame, Activity, Bed,
  Heart, FlaskConical, Truck, Tent, Wrench, Users,
  CheckCircle2, AlertTriangle, Zap, Droplet, Cpu,
  Navigation, Wifi, ChevronDown, ChevronUp, Star
} from 'lucide-react';

// ─── Reusable sub-components ───────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: 'Nominal' | 'Watch' | 'Critical' | 'Active' | 'Standby' | 'Offline' }> = ({ status }) => {
  const map: Record<string, string> = {
    Nominal: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Active:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Watch:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Critical:'bg-rose-500/15 text-rose-400 border-rose-500/30',
    Standby: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    Offline: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };
  return (
    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${map[status] ?? map.Nominal}`}>
      {status}
    </span>
  );
};

const HealthBar: React.FC<{ value: number; color?: string }> = ({ value, color }) => {
  const c = color ?? (value > 90 ? '#10b981' : value > 70 ? '#f59e0b' : '#ef4444');
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: c }} />
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; color: string }> = ({ icon, title, subtitle, color }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="p-2.5 rounded-xl border" style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}>
      {icon}
    </div>
    <div>
      <h2 className="text-base font-bold text-white">{title}</h2>
      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

// ─── Main Page ──────────────────────────────────────────────────────────────────
export const InfrastructurePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedStationId } = useStationStore();
  const stationId = id || selectedStationId || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { liveSnapshot } = useTelemetryStore();
  const snapshot = liveSnapshot[stationId];
  const env = snapshot?.environment;
  const infraData = snapshot?.infrastructure;
  const ops = snapshot?.station_ops;

  const [activeTab, setActiveTab] = useState<'structural' | 'quarters' | 'medical' | 'labs' | 'vehicles' | 'summer'>('structural');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [expandedLab, setExpandedLab] = useState<string | null>(null);

  // Live telemetry values
  const windSpeed = env?.wind_speed ?? (isMaitri ? 32 : 44);
  const ambientTemp = env?.temperature ?? (isMaitri ? -25.2 : -18.4);
  const windStress = Math.min(100, Math.round((windSpeed / 120) * 100 * 10) / 10);
  const thermalEff = useMemo(() => {
    const base = isMaitri ? 88.0 : 96.0;
    const penalty = Math.max(0, (windSpeed - 40) * 0.15) + Math.max(0, (-30 - ambientTemp) * 0.2);
    return Math.max(65, Math.round((base - penalty) * 10) / 10);
  }, [windSpeed, ambientTemp, isMaitri]);
  const snowDrift = infraData?.snow_drift_accumulation_m ?? (isMaitri ? 0.42 : 0.25);

  // Wind stress chart
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInst.current) chartInst.current.dispose();
    const chart = echarts.init(chartRef.current, 'dark');
    chartInst.current = chart;
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];
    const stressHist = isMaitri ? [14, 16, 22, 28, 24, 19, windStress] : [10, 12, 18, 22, 20, 15, windStress];
    const windHist = isMaitri ? [24, 28, 38, 48, 42, 34, windSpeed] : [32, 36, 45, 58, 52, 44, windSpeed];
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 30, right: 30, bottom: 25, left: 45 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)' },
      legend: { data: ['Stress Index', 'Wind (km/h)'], textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }, top: 0 },
      xAxis: { type: 'category', data: hours, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
      yAxis: [
        { type: 'value', name: 'Stress', max: 100, axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
        { type: 'value', name: 'Wind', axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' }, splitLine: { show: false } }
      ],
      series: [
        { name: 'Stress Index', type: 'line', yAxisIndex: 0, data: stressHist, smooth: true, lineStyle: { color: '#06b6d4', width: 2.5 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(6,182,212,0.35)' }, { offset: 1, color: 'rgba(6,182,212,0.02)' }]) }, itemStyle: { color: '#06b6d4' } },
        { name: 'Wind (km/h)', type: 'line', yAxisIndex: 1, data: windHist, smooth: true, lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' }, itemStyle: { color: '#f59e0b' } }
      ]
    });
    const ro = new ResizeObserver(() => chart.resize()); ro.observe(chartRef.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [windStress, windSpeed, isMaitri]);

  // ── Station-specific data definitions ────────────────────────────────────────

  const quartersData = isMaitri ? {
    desc: 'Maitri station (est. 1989) accommodates up to 40 personnel across interconnected prefabricated steel modules on Schirmacher Oasis nunatak bedrock.',
    capacity: 40, current: 25, rooms: 14,
    areas: [
      { name: 'Sleeping Cabins (Block A)', icon: Bed, detail: '7 × 4-person heated steel cabins. Each cabin has bunk beds, a small wardrobe, and reading light. Internal temp maintained at 19–21°C via ducted HVAC.', status: 'Nominal', health: 92, metric: '7 Cabins · 28 Beds', color: '#818cf8' },
      { name: 'Sleeping Cabins (Block B)', icon: Bed, detail: '6 × 2-person cabins reserved for senior scientists & station commander. Double-pane insulated walls for noise isolation.', status: 'Nominal', health: 96, metric: '6 Cabins · 12 Beds', color: '#818cf8' },
      { name: 'Bathrooms & Sanitation', icon: Droplet, detail: '3 shared bathroom blocks with composting toilets and grey water recycling. Hot water generated via diesel boiler with heat recovery. Water use limited to 25 L/day per person.', status: 'Nominal', health: 88, metric: '3 Blocks · 9 Showers', color: '#38bdf8' },
      { name: 'Main Galley & Dining Hall', icon: Star, detail: 'Central galley with 3 chef stations, industrial refrigeration, gas ranges, and a 40-seat dining area. Meals served 3× daily. Weekly Sunday feast tradition with full crew. Pantry stocked for 18 months.', status: 'Nominal', health: 97, metric: '40-seat · 3 Meals/Day', color: '#f59e0b' },
      { name: 'Common Room & Recreation', icon: Users, detail: 'TV lounge, ping pong table, small library with 600+ books, satellite radio, and board games. Critical for winter-over psychological wellbeing during 6-month polar night.', status: 'Nominal', health: 95, metric: '1 Common Room · 25 pax', color: '#a855f7' },
      { name: 'Radio Room & Communications', icon: Wifi, detail: 'HF/VHF radio room for emergency contact, crew personal welfare calls, and SAR coordination. Dual operator stations with full logging. Primary LEO satellite uplink located 8m from radio room.', status: 'Nominal', health: 99, metric: 'HF/VHF/Sat · 24×7', color: '#10b981' },
    ]
  } : {
    desc: 'Bharati station (est. 2012) features a modern aerodynamic containerized habitat elevated 4m on stilts at Larsemann Hills, capacity 47 personnel.',
    capacity: 47, current: 30, rooms: 20,
    areas: [
      { name: 'Sleeping Modules (Level 2)', icon: Bed, detail: '12 × 2-person insulated container modules, each with double-glazed porthole windows, adjustable climate control, USB charging, and individual storage lockers.', status: 'Nominal', health: 98, metric: '12 Modules · 24 Beds', color: '#818cf8' },
      { name: 'Sleeping Modules (Level 3 — Senior)', icon: Bed, detail: '6 × single-occupancy VIP modules for chief scientists and station commander. Acoustic insulation panels and independent HVAC zones.', status: 'Nominal', health: 99, metric: '6 Modules · 6 Beds', color: '#818cf8' },
      { name: 'Bathrooms & Sanitation (Dual Zone)', icon: Droplet, detail: 'Two fully plumbed bathroom zones with pressurized hot water from Seawater Filter Plant seawater purification + CHP heat recovery. Vacuum waste system minimizes polar environmental impact. 150 L/day max capacity.', status: 'Nominal', health: 97, metric: '2 Zones · 12 Showers', color: '#38bdf8' },
      { name: 'Galley, Dining & Pantry', icon: Star, detail: 'NCPOR-standard galley with automated dishwasher, walk-in freezers (−25°C), fresh produce hydroponics bay (lettuce, herbs), and 47-seat modular dining room with ocean panoramic view.', status: 'Nominal', health: 99, metric: '47-seat · Hydroponics', color: '#f59e0b' },
      { name: 'Lounge, Gym & Recreation', icon: Users, detail: 'Multi-purpose room with stationary bikes, resistance bands, yoga mats, 65" smart TV, PlayStation console, and a telescope for aurora viewing. Daily group exercise protocol at 07:30 hrs.', status: 'Nominal', health: 98, metric: 'Gym + AV Lounge · 47 pax', color: '#a855f7' },
      { name: 'Emergency Shelter Module', icon: ShieldCheck, detail: 'Dedicated 10-person emergency shelter pod at ground level with 30-day independent food/water/power supply. Auto-deploying thermal tent backup for evacuation scenarios.', status: 'Standby', health: 100, metric: '10-person · 30 Day Supply', color: '#10b981' },
    ]
  };

  const medicalData = isMaitri ? {
    desc: 'Maitri Medical Clinic — NCPOR standard. Staffed by 1 Medical Officer (MO) and 1 paramedic. Primary emergency treatment and remote doctor service-capable.',
    staff: '1 MO + 1 Paramedic',
    beds: 4,
    telemedicine: true,
    equipment: [
      { name: 'Emergency Resuscitation Unit', detail: 'AED defibrillator, manual bag-valve-mask, crash cart with ACLS medications. Last tested: 3 days ago.', status: 'Nominal', icon: Heart },
      { name: 'Surgical Theater (Minor Ops)', detail: 'Sterile field tent setup for minor surgeries: appendectomy, fracture reduction, wound closure. Ketamine anesthesia protocol for field conditions.', status: 'Nominal', icon: Zap },
      { name: 'Diagnostic Equipment', detail: '12-lead ECG, digital X-ray (portable), pulse oximetry, blood pressure monitors, glucometer, urine analyzer, and hemoglobin testing kit.', status: 'Nominal', icon: Activity },
      { name: 'Pharmacy & Drug Storage', detail: 'WHO essential medicines list plus Antarctic-specific stockpile: frostbite treatment (prostacyclin), altitude/hypoxia meds, antidepressants for winter-over protocol, and emergency IV fluids.', status: 'Nominal', icon: FlaskConical },
      { name: 'Remote doctor service Station', detail: 'Secure encrypted ISRO satellite video link to AIIMS Delhi trauma department and NCPOR medical board. 24×7 teleconsultation capability. Last session: 6 days ago.', status: 'Active', icon: Wifi },
      { name: 'Dental Chair', detail: 'Basic dental station with extraction tools, cavity fillers, and local anesthetic. All winter-over crew receive full dental clearance before deployment.', status: 'Nominal', icon: CheckCircle2 },
      { name: 'Physiotherapy Equipment', detail: 'TENS machine, ultrasound therapy unit, resistance bands, and foam rollers. Used weekly for ergonomic injury prevention in confined Antarctic working conditions.', status: 'Nominal', icon: Users },
      { name: 'Cold Injury Treatment Unit', detail: 'Warm-water rewarming tanks (38–42°C), frostbite assessment scales, vasodilator medication protocol. Highest-risk intervention for Antarctic outdoor operations.', status: 'Standby', icon: Thermometer },
    ]
  } : {
    desc: 'Bharati Medical Center — Advanced 2012 NCPOR facility. Staffed by 2 Medical Officers and 1 ICU-trained nurse. Superior equipment vs Maitri.',
    staff: '2 MOs + 1 ICU Nurse',
    beds: 6,
    telemedicine: true,
    equipment: [
      { name: 'ICU-Grade Monitoring Suite', detail: 'Bedside multi-parameter monitors for all 6 ICU-capable beds: SpO₂, NIBP, 12-lead ECG, capnography, temp. Powered by CHP UPS with 72-hr battery backup.', status: 'Nominal', icon: Heart },
      { name: 'Portable CT Scanner (Mini)', detail: 'Compact CT ring for head/chest/abdomen imaging — unique to Bharati, not available at Maitri. Critical for trauma triage and internal hemorrhage detection.', status: 'Nominal', icon: Cpu },
      { name: 'Full Surgical Theater', detail: '20 sq.m dedicated sterile surgical suite with OR table, shadowless surgical light, electrocautery, keyhole surgery equipy instruments, and orthopedic drill set for emergency operations.', status: 'Nominal', icon: Zap },
      { name: 'Advanced Diagnostics', detail: 'Portable ultrasound (POCUS), digital X-ray, full blood panel analyzer (CBC, CMP, coags), blood gas analyzer, and urinalysis auto-strip reader.', status: 'Nominal', icon: Activity },
      { name: 'Pharmacy & Blood Bank', detail: 'WHO essential drugs + Antarctic extended formulary. 8-unit refrigerated blood product storage (O-neg universal donor). Antarctic emergency transfusion protocol in place.', status: 'Nominal', icon: FlaskConical },
      { name: 'Remote doctor service Suite (Dual-Screen)', detail: 'Dual encrypted ISRO + Starlink video stations. Direct-link to AIIMS Delhi, INHS Nirvana, and ISRO Space Medicine. Sub-1s signal delay remote doctor service for complex cases.', status: 'Active', icon: Wifi },
      { name: 'Mental Health Room', detail: 'Dedicated private counseling room with calming lighting, soundproofing, and secure video sessions with NCPOR psychological support team. Used bi-weekly during winter-over.', status: 'Active', icon: Users },
      { name: 'Pressure treatment Chamber (1-Person)', detail: '1-person emergency pressure treatment oxygen therapy pod for decompression sickness from diving operations in Prydz Bay and carbon monoxide poisoning treatment.', status: 'Standby', icon: CheckCircle2 },
    ]
  };

  const labsData = isMaitri ? [
    { id: 'atmos', name: 'Weather layer & Ozone Science Lab', icon: '🌬️', color: '#00e5ff', status: 'Active' as const, running: 'Stratospheric ozone column measurement (ozone measuring instrument), aerosol optical depth, UV radiation monitoring', equipment: 'ozone measuring instrument, MICROTOPS II sun photometer, Brewer spectrophotometer, GM counter for cosmic rays', output: '24×7 ozone data transmitted to WMO Global Atmosphere Watch network', established: '1989' },
    { id: 'earth', name: 'Earth Sciences & Glaciology Observatory', icon: '⛰️', color: '#10b981', status: 'Active' as const, running: 'Ice core sample analysis, bedrock geophysics survey, GNSS monitoring of ice sheet movement at 4 mm/yr precision', equipment: 'GPR ground-penetrating radar, earthquake sensor network (4 nodes), ice core drilling rig, GNSS geodetic receivers', output: 'Annual ice velocity & mass balance reports for IPCC Antarctic assessment', established: '1992' },
    { id: 'biology', name: 'Biology & Microbiology Laboratory', icon: '🦠', color: '#a855f7', status: 'Active' as const, running: 'Extremophile microorganism culture from Schirmacher Oasis lakes, psychrophilic enzyme research, ocean micro-plants taxonomy', equipment: 'Cryo-microscope, PCR thermocycler, laminar flow hood, high-speed lab spinner, −80°C ultra-low freezer (6 units)', output: 'Research published in Journal of Antarctic Science; 3 active projects', established: '1998' },
    { id: 'met', name: 'Meteorology & Weather Observatory', icon: '🌡️', color: '#f59e0b', status: 'Active' as const, running: 'Continuous synoptic weather observations every 3 hours for WMO SYNOP, weather balloon probe balloon launch twice daily at 00Z & 12Z', equipment: 'Automatic Weather Station (AWS), RS41 weather balloon probe + balloon launcher, VAISALA weather sensors, Stevenson screen', output: 'SYNOP/TEMP data transmitted to India Meteorological Department & ECMWF', established: '1989' },
    { id: 'seismo', name: 'Geophysics & Seismology Station', icon: '📡', color: '#f97316', status: 'Standby' as const, running: 'Monitoring Antarctic micro-seismic activity and global P/S-wave teleseismic events. Currently in data-only mode (austral winter)', equipment: 'Broadband earthquake sensor (STS-2), MEMS accelerometer array, GPS timing unit, quiet vaulted installation on bedrock', output: 'Data shared with GEOFON global seismic network in real-time', established: '2003' },
  ] : [
    { id: 'ocean', name: 'Prydz Bay Marine & Oceanography Lab', icon: '🌊', color: '#38bdf8', status: 'Active' as const, running: 'Prydz Bay CTD sensor profiling (water temperature & salinity depth), ocean current measurement, sea-ice thickness sonar, krill biomass surveys', equipment: 'SEABIRD SBE19+ CTD sensor, ADCP current profiler, ROPOS ROV (500m depth), acoustic Doppler sonar, plankton nets', output: 'Southern Ocean circulation data for international CLIVAR program; 5 active research missions', established: '2012' },
    { id: 'cryo', name: 'Cryosphere & Ice Sheet Dynamics Lab', icon: '🧊', color: '#00e5ff', status: 'Active' as const, running: 'Larsemann Hills ice sheet mass balance using GNSS, InSAR satellite correlation, surface melting stake network monitoring across Prydz Bay glacier tributaries', equipment: 'Differential GNSS (mm-level accuracy), surface melting stake array (28 sites), ice thickness radar, drone photogrammetry (DJI M300)', output: 'Antarctic ice mass budget contribution to GRACE-FO satellite data validation', established: '2012' },
    { id: 'atmos', name: 'Weather layer Chemistry & Aerosol Lab', icon: '🌬️', color: '#10b981', status: 'Active' as const, running: 'Southern Ocean aerosol chemistry (sea-salt, DMS, black carbon), total column ozone (ozone meter), NOAA baseline weather layer CO₂/CH₄ monitoring', equipment: 'AERONET sun photometer, ozone ozone meter, DMA particle sizer, GC-FID trace gas analyzer, FTIR spectrum analyzer', output: 'India contribution to WMO GAW network; 3 published papers in last 12 months', established: '2012' },
    { id: 'bio', name: 'Biology, Ecology & Krill Lab', icon: '🦠', color: '#a855f7', status: 'Active' as const, running: 'Antarctic krill (Euphausia superba) breeding cycle study, coastal penguin colony monitoring via remote cameras, micro-plastic contamination analysis in fish tissue', equipment: 'Dissecting microscope, DNA sequencer (MinION portable), cold room (−30°C), GF/C filtration for microplastics, Nikon camera trap network', output: 'Krill biomass estimates fed to CCAMLR international fisheries management body', established: '2013' },
    { id: 'aurora', name: 'Space Weather & Aurora Observatory', icon: '🌠', color: '#f59e0b', status: 'Active' as const, running: 'Southern hemisphere aurora australis spectroscopy, solar wind-outer magnetic field region coupling, conjugate point ionospheric studies in coordination with Maitri station', equipment: 'All-sky imager (ASI), Light spectrum analyzer, fluxgate magnetic field sensor, VLF receiver aerial, radio atmosphere probe', output: 'Real-time aurora forecasts; data shared with Indian Institute of Geomagnetism (IIG)', established: '2012' },
    { id: 'geo', name: 'Geology & Rock Petrology Lab', icon: '⛰️', color: '#f97316', status: 'Standby' as const, running: 'Rock sample preparation and thin-section analysis from Prydz Bay coastline surveys. Currently reducing activity for winter season.', equipment: 'Thin-section grinder/polisher, polarizing petrographic microscope, XRF rock analyzer, sample archive (−20°C storage)', output: 'Prydz Bay geological evolution studies; collaboration with Australian Antarctic Division', established: '2014' },
  ];

  const vehiclesData = isMaitri ? {
    desc: 'Maitri Vehicle Fleet — 100 km ice-shelf traverse capability. All vehicles maintained in the heated workshop adjacent to main station block.',
    garage: { name: 'Main Technical Workshop & Garage', size: '600 m²', capacity: '6 heavy vehicles indoor', heating: 'Diesel-fired forced air, 18°C interior' },
    vehicles: [
      { id: 'pb1', name: 'PistenBully 300W Polar', type: 'Snow Groomer / Traverse Tractor', icon: '🚛', status: 'Nominal' as const, health: 94, hours: 2840, detail: 'Primary 100 km Maitri–coast traverse vehicle. Tracked snow groomer with pressurized heated cab (600cc, 4 crew). Equipped with GPS nav, VHF radio, and emergency bivouac kit. Last major service: 45 days ago.', color: '#06b6d4' },
      { id: 'pb2', name: 'PistenBully 300W Polar #2', type: 'Snow Groomer / Backup Traverse', icon: '🚛', status: 'Watch' as const, health: 78, hours: 4120, detail: 'Backup traverse vehicle. Currently flagged for engine bay oil cooler replacement. Operational for base operations but not cleared for long-range traverse. Maintenance scheduled within 7 days.', color: '#f59e0b' },
      { id: 'kasb', name: 'Kassbohrer SNO CAT 1', type: 'Heavy Cargo Hauler', icon: '🚜', status: 'Nominal' as const, health: 91, hours: 1980, detail: 'Pulls loaded fuel and cargo sledges across crevasse-bridged traverse route. Diesel with winch system for incline extraction. 15-tonne towing capacity. Fleet reserve fuel cache on board.', color: '#06b6d4' },
      { id: 't4', name: 'Mahindra Bolero 4×4 (Modified)', type: 'Station Ground Vehicle', icon: '🚙', status: 'Nominal' as const, health: 88, hours: 6200, detail: 'Studded all-season tires for Schirmacher Oasis rock terrain. Used for station perimeter checks, sensor maintenance runs, and lake area operations at Priyadarshini (3 km). Heated cab.', color: '#10b981' },
      { id: 'atv1', name: 'Polaris Sportsman 850 ATV', type: 'All-Terrain Vehicle', icon: '🏍️', status: 'Nominal' as const, health: 96, hours: 520, detail: 'Rapid single-operator field vehicle for emergency instrument checks and perimeter survey. Snow chains fitted. Spare battery pack onboard. Range: 80 km. Stored heated in workshop.', color: '#10b981' },
      { id: 'snow1', name: 'Yamaha SRViper Snowmobile ×2', type: 'Light Snowmobiles', icon: '🏂', status: 'Nominal' as const, health: 99, hours: 310, detail: 'Two 2-stroke snowmobiles for rapid 2-person operations on consolidated snow surfaces. Used for AWS sensor maintenance and emergency medical evacuation approach. Max speed: 120 km/h.', color: '#10b981' },
    ]
  } : {
    desc: 'Bharati Vehicle Fleet — Coastal marine and helicopter operations. Vehicle garage at ground level under the elevated main structure.',
    garage: { name: 'Integrated Vehicle & Cargo Apron Garage', size: '1,200 m²', capacity: '8 vehicles + helicopter apron', heating: 'CHP waste-heat floor heating, 15°C interior' },
    vehicles: [
      { id: 'heli', name: 'HAL Dhruv ALH / Ka-32 Helicopter Slot', type: 'Helicopter Landing & Servicing Pad', icon: '🚁', status: 'Standby' as const, health: 100, hours: 0, detail: 'Dedicated 20×20m helipad deck on station roof with tie-down anchors for HAL Dhruv Advanced Light Helicopter and Kamov Ka-32 cargo helicopter. Helipad lighting, fuel tank, and hover-boarding crane for cargo sling operations. Current season: awaiting November arrival of rotary wing assets.', color: '#38bdf8' },
      { id: 'zodiac', name: 'Zodiac Milpro FC470 RIB × 3', type: 'Rigid Inflatable Boats (Marine)', icon: '🚤', status: 'Active' as const, health: 97, hours: 245, detail: '3 × RHIB (Rigid Hull Inflatable Boats) for Prydz Bay coastal marine science, sensor deployment, krill trawl, and fast transfer to NCPOR research vessel MV SCI. Outfitted with 60HP Yamaha outboards, GPS chart plotter, dry suit storage, and ROV deployment frames.', color: '#38bdf8' },
      { id: 'pb1', name: 'PistenBully 600 Polar (Heavy)', type: 'Heavy Tracked Snow Machine', icon: '🚛', status: 'Nominal' as const, health: 97, hours: 1240, detail: 'Larsemann Hills terrain management, cargo movement from helipad to station, and peninsula traverse. Air-conditioned pressurized cab with 6-person capacity. Equipped with blade for snow clearance on helipad deck approach.', color: '#06b6d4' },
      { id: 'kassb', name: 'Kassbohrer All-Terrain Vehicle', type: 'Cargo Transport', icon: '🚜', status: 'Nominal' as const, health: 93, hours: 890, detail: 'Amphibious terrain vehicle used for movement of scientific equipment and cargo containers between coastal mooring area, fuel drum storage, and main station. 10-tonne payload capacity.', color: '#06b6d4' },
      { id: 'atv', name: 'Polaris Sportsman 1000 ATV × 2', type: 'All-Terrain Vehicles', icon: '🏍️', status: 'Nominal' as const, health: 99, hours: 180, detail: 'Two ATVs for rapid field access across rocky Larsemann Hills terrain. Extended-range fuel tanks (90 km range). Used for penguin colony monitoring, geological survey access, and emergency response.', color: '#10b981' },
      { id: 'sled', name: 'Dog Sled Heritage Display Unit', type: 'Historical Exhibit', icon: '🛷', status: 'Standby' as const, health: 100, hours: 0, detail: 'Non-operational historical dog sled — exhibit artifact from pre-mechanized Antarctic exploration era. Displayed in station entrance lobby. No sled dogs present under Antarctic Treaty animal protocol.', color: '#64748b' },
    ]
  };

  const summerData = isMaitri ? {
    season: 'November – March (Antarctic Summer)',
    hasExpansion: true,
    desc: 'During the austral summer, Maitri station capacity expands from 25 winter-over to a maximum of 40 personnel, accommodating seasonal science teams, logistics crews, and visiting dignitaries.',
    totalExtra: 15,
    camps: [
      { name: 'Summer Annex Module Block C', icon: '🏕️', color: '#f59e0b', capacity: 8, status: 'Active (Nov–Mar)' as const, detail: 'Pre-fabricated temporary steel modules deployed alongside main Block B for summer season. 4 × 2-person rooms with basic heating, shared bathroom access from main block. Deployed annually in October, demobilized in March.', features: ['4 × 2-person rooms', 'Shared bath from Block B', 'Basic heated steel panels', 'Oct–Mar deployment cycle'] },
      { name: 'Field Science Camp — Schirmacher Lake Area', icon: '⛺', color: '#10b981', capacity: 6, status: 'Active (Dec–Feb)' as const, detail: 'Remote camp 3 km from main station at Priyadarshini Lake site for glaciology and limnology fieldwork. Polar tents (Scott Polar tent design), sleeping bags rated to −55°C, portable stove, hand-held VHF radio, and emergency EPIRB beacon. Teams rotate weekly.', features: ['Scott Polar tents × 3', 'Rated to −55°C', 'Weekly crew rotation', '3 km from main station'] },
      { name: 'Aviation Forward Operating Camp', icon: '🚁', color: '#38bdf8', capacity: 4, status: 'Active (Nov–Jan)' as const, detail: 'Temporary camp at aircraft ingress zone for helicopter crews and aircraft engineers during NCPOR logistic air operations. Containerized unit with bunk beds, portable generator, satellite phone, and aviation fuel staging.', features: ['Aviation crew 4 pax', 'Containerized portable unit', 'Fuel staging area', 'Sat phone + VHF'] },
    ]
  } : {
    season: 'November – March (Antarctic Summer)',
    hasExpansion: true,
    desc: 'Bharati station summer expansion accommodates up to 47 personnel vs winter-over of 30, with additional researcher teams arriving by helicopter from vessel MV SCI.',
    totalExtra: 17,
    camps: [
      { name: 'Upper Deck Research Suite Extension', icon: '🏕️', color: '#38bdf8', capacity: 8, status: 'Active (Nov–Mar)' as const, detail: 'Level 4 rooftop container module block: 4 × 2-person climate-controlled lab/sleeping combo units deployed for summer season chief scientists. Panoramic views across Prydz Bay for aurora australis observation. Superior insulation (R-60).', features: ['4 × 2-person combo suites', 'Panoramic Prydz Bay view', 'R-60 insulation', 'Nov–Mar only'] },
      { name: 'Marine Field Camp — Quilty Bay Ice Edge', icon: '⛺', color: '#10b981', capacity: 6, status: 'Active (Dec–Feb)' as const, detail: 'Seasonal camp at Quilty Bay fast-ice edge for seal tagging, ice thickness drilling, and underwater ROV operations. Pyramid tents on sea ice with ice anchors. 500m communication cable back to station. Emergency dry suits stored on-site.', features: ['6-person pyramid tent camp', 'Sea-ice ice anchors', 'ROV deployment site', 'Emergency dry suits on-site'] },
      { name: 'Penguin Colony Monitoring Camp', icon: '🐧', color: '#a855f7', capacity: 3, status: 'Active (Nov–Feb)' as const, detail: 'Remote observation camp at Adelie & Emperor penguin colony rookery, 4 km east of station. 3 biologists, minimal-impact protocols. Observational hide with thermal cameras and microphone arrays. Zero-waste camp — all consumables returned to station.', features: ['3-person ecology team', 'Zero-waste protocol', 'Thermal camera hide', '4 km east of station'] },
      { name: 'Logistics Overflow Container Block', icon: '📦', color: '#f59e0b', capacity: 6, status: 'Active (Nov–Jan)' as const, detail: 'ISO container accommodation modules deployed at cargo apron area for logistics and vessel crew during resupply operations. Each container has 3 bunk beds, climate control, and shared sanitation unit. Used only during peak cargo handling periods.', features: ['ISO container bunkrooms', '6 logistics crew', 'Cargo apron proximity', 'Jan deployment peak'] },
    ]
  };

  const TABS = [
    { id: 'structural', label: '🏛 Structural', icon: Building2, color: '#06b6d4' },
    { id: 'quarters', label: '🛏 Living Quarters', icon: Bed, color: '#818cf8' },
    { id: 'medical', label: '🏥 Medical', icon: Heart, color: '#ef4444' },
    { id: 'labs', label: '🔬 Labs & Obs', icon: FlaskConical, color: '#10b981' },
    { id: 'vehicles', label: '🚛 Vehicles', icon: Truck, color: '#f97316' },
    { id: 'summer', label: '⛺ Summer Camps', icon: Tent, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">

      {/* ── HEADER ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5" style={{ background: 'radial-gradient(ellipse at 30% 60%, #06b6d4 0%, transparent 60%)' }} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                  Infrastructure Domain
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {isMaitri ? 'Nunatak Bedrock · Schirmacher Oasis' : 'Elevated Stilts · Larsemann Hills'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white">
                Infrastructure & Habitat Envelope · <span className="text-cyan-400">{isMaitri ? 'Maitri Station' : 'Bharati Station'}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(isMaitri ? '/station/bharati/infrastructure' : '/station/maitri/infrastructure')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 bg-polar-dark hover:bg-white/5 border border-polar-border text-slate-200 transition-all cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              {isMaitri ? 'Switch to Bharati' : 'Switch to Maitri'}
            </button>
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 bg-polar-dark hover:bg-white/5 border border-polar-border text-slate-400 hover:text-white transition-all cursor-pointer">
              <Layers className="w-3.5 h-3.5" /> All Domains
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI BAR ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Readiness', val: `${ops?.domain_readiness?.infrastructure ?? (isMaitri ? 94.0 : 97.2)}%`, icon: ShieldCheck, color: '#10b981', sub: `${isMaitri ? '4' : '4'} modules nominal` },
          { label: 'Wind Stress Index', val: `${windStress} / 100`, icon: Wind, color: '#06b6d4', sub: `${windSpeed} km/h Polar downslope wind` },
          { label: 'Thermal Envelope Eff.', val: `${thermalEff}%`, icon: Thermometer, color: '#f59e0b', sub: `Indoor 19–21°C target` },
          { label: 'Snow Drift Height', val: `${snowDrift.toFixed(2)} m`, icon: CloudSnow, color: '#818cf8', sub: `1.20 m critical threshold` },
        ].map(k => (
          <div key={k.label} className="glass-panel p-4 rounded-xl border border-polar-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{k.label}</span>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <div className="text-2xl font-black font-mono" style={{ color: k.color }}>{k.val}</div>
            <div className="text-[10px] font-mono text-slate-500 border-t border-polar-border/40 pt-1.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-2"
              style={isActive
                ? { background: `${tab.color}20`, borderColor: `${tab.color}60`, color: tab.color }
                : { background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.08)', color: '#64748b' }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════ STRUCTURAL TAB ══════════════════ */}
      {activeTab === 'structural' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Modules */}
            <div className="lg:col-span-2 space-y-4">
              <SectionHeader icon={<Building2 className="w-5 h-5" />} title="Station Building Modules Telemetry" subtitle="Click any module for full technical specification" color="#06b6d4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isMaitri ? [
                  { id: 'a', name: 'Main Living Block (A & B Wings)', integrity: infraData?.modules?.[0]?.integrity ?? 94.0, temp: infraData?.modules?.[0]?.temp_c ?? 19.4, status: 'Nominal' as const, r: 38, pressure: 1012, inspected: '2 days ago' },
                  { id: 'b', name: 'Priyadarshini Lake Zub Pump Station', integrity: infraData?.modules?.[1]?.integrity ?? 89.5, temp: infraData?.modules?.[1]?.temp_c ?? 8.2, status: 'Watch' as const, r: 28, pressure: 998, inspected: '6 hours ago' },
                  { id: 'c', name: 'Bulk AGO Fuel Tank Depot', integrity: infraData?.modules?.[2]?.integrity ?? 96.2, temp: infraData?.modules?.[2]?.temp_c ?? -11.5, status: 'Nominal' as const, r: 24, pressure: 1004, inspected: '12 hours ago' },
                  { id: 'd', name: 'Heavy Vehicle & Technical Workshop', integrity: infraData?.modules?.[3]?.integrity ?? 91.8, temp: infraData?.modules?.[3]?.temp_c ?? 16.2, status: 'Nominal' as const, r: 32, pressure: 1010, inspected: '1 day ago' },
                ] : [
                  { id: 'a', name: 'Elevated 3-Story Aerodynamic Habitat', integrity: infraData?.modules?.[0]?.integrity ?? 98.2, temp: infraData?.modules?.[0]?.temp_c ?? 20.8, status: 'Nominal' as const, r: 52, pressure: 1014, inspected: '1 day ago' },
                  { id: 'b', name: 'Quilty Bay Seawater Filter Plant Marine Intake', integrity: infraData?.modules?.[1]?.integrity ?? 94.5, temp: infraData?.modules?.[1]?.temp_c ?? 9.5, status: 'Nominal' as const, r: 35, pressure: 1002, inspected: '8 hours ago' },
                  { id: 'c', name: 'CHP Automated Power Plant', integrity: infraData?.modules?.[2]?.integrity ?? 97.4, temp: infraData?.modules?.[2]?.temp_c ?? 18.5, status: 'Nominal' as const, r: 44, pressure: 1015, inspected: '14 hours ago' },
                  { id: 'd', name: 'Helipad Deck & Cargo Apron', integrity: infraData?.modules?.[3]?.integrity ?? 95.0, temp: infraData?.modules?.[3]?.temp_c ?? -15.8, status: 'Nominal' as const, r: 20, pressure: 994, inspected: '4 hours ago' },
                ]).map(m => (
                  <div key={m.id} className="glass-panel p-4 rounded-xl border border-polar-border hover:border-cyan-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{m.name}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="flex items-baseline justify-between font-mono mb-2">
                      <span className="text-2xl font-black text-white">{m.integrity}%</span>
                      <span className="text-xs text-slate-400">Interior: <strong className="text-amber-400">{m.temp}°C</strong></span>
                    </div>
                    <HealthBar value={m.integrity} />
                    <div className="mt-3 pt-2 border-t border-polar-border/40 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>R-{m.r} insulation</span>
                      <span>{m.pressure} hPa</span>
                      <span>Inspected: {m.inspected}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] font-mono text-slate-400 leading-relaxed">
                <span className="text-cyan-400 font-bold block mb-1">Polar Architecture Specification</span>
                {isMaitri
                  ? 'Maitri (1989) — Nunatak bedrock foundation at Schirmacher Oasis. Heavy prefab steel sandwich panels with polyurethane core insulation (R-38). Heated piping connects main living module to Priyadarshini water pump house 800 m away across exposed rock plateau.'
                  : 'Bharati (2012) — Larsemann Hills coastal ridge. Aerodynamic containerized envelope elevated 4 m on high-tensile steel stilts, preventing Antarctic snow drift accumulation. Wind-tunnel shaped profile reduces structural load by ~35% during marine gale storms vs conventional ground-level design.'}
              </div>
            </div>

            {/* Wind Stress Chart */}
            <div className="glass-panel p-5 rounded-xl border border-polar-border flex flex-col">
              <h3 className="text-xs font-mono uppercase font-bold text-white tracking-wider flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-cyan-400" /> Wind Stress Telemetry (24h)
              </h3>
              <div ref={chartRef} className="w-full flex-1" style={{ minHeight: 200 }} />
              <div className="mt-3 pt-3 border-t border-polar-border/40 space-y-1.5 text-[10px] font-mono text-slate-400">
                {[
                  { l: 'Max Wind Recorded', v: `${isMaitri ? 58 : 72} km/h`, c: '#f59e0b' },
                  { l: 'Critical Threshold', v: '85 / 100 Index', c: '#ef4444' },
                  { l: 'Foundation Vibration', v: `${isMaitri ? 0.4 : 0.2} mm/s (Nominal)`, c: '#10b981' },
                  { l: 'Snow Drift Clearance', v: snowDrift > 0.8 ? 'PLOW REQUIRED' : 'Clear', c: snowDrift > 0.8 ? '#f59e0b' : '#10b981' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between">
                    <span>{r.l}:</span>
                    <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ LIVING QUARTERS TAB ══════════════════ */}
      {activeTab === 'quarters' && (
        <div className="space-y-5">
          <SectionHeader icon={<Bed className="w-5 h-5" />} title="Living Quarters & Habitat Facilities" subtitle={quartersData.desc} color="#818cf8" />

          {/* Occupancy summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Current Occupancy', val: `${quartersData.current} / ${quartersData.capacity}`, color: '#818cf8' },
              { label: 'Private Rooms', val: `${quartersData.rooms}`, color: '#38bdf8' },
              { label: 'Occupancy Rate', val: `${Math.round((quartersData.current / quartersData.capacity) * 100)}%`, color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="glass-panel p-4 rounded-xl border border-polar-border text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">{s.label}</div>
                <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Quarters area cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quartersData.areas.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.name} className="glass-panel p-5 rounded-2xl border transition-all hover:border-indigo-400/40"
                  style={{ borderColor: `${area.color}22` }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl border flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${area.color}15`, borderColor: `${area.color}40`, color: area.color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{area.name}</div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: area.color }}>{area.metric}</div>
                      </div>
                    </div>
                    <StatusBadge status={area.status as any} />
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 leading-relaxed">{area.detail}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
                      <span>Facility Health</span>
                      <span style={{ color: area.color }}>{area.health}%</span>
                    </div>
                    <HealthBar value={area.health} color={area.color} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ MEDICAL TAB ══════════════════ */}
      {activeTab === 'medical' && (
        <div className="space-y-5">
          <SectionHeader icon={<Heart className="w-5 h-5" />} title="Medical Facilities & Clinic" subtitle={medicalData.desc} color="#ef4444" />

          {/* Medical summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Medical Staff', val: medicalData.staff, color: '#ef4444' },
              { label: 'Hospital Beds', val: `${medicalData.beds} Beds`, color: '#f97316' },
              { label: 'Remote doctor service', val: medicalData.telemedicine ? 'ACTIVE' : 'OFFLINE', color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="glass-panel p-4 rounded-xl border border-polar-border text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">{s.label}</div>
                <div className="text-sm font-black font-mono" style={{ color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Equipment grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medicalData.equipment.map((eq) => {
              const Icon = eq.icon;
              const statusColor = eq.status === 'Active' ? '#10b981' : eq.status === 'Standby' ? '#64748b' : '#10b981';
              return (
                <div key={eq.name} className="glass-panel p-5 rounded-2xl border border-rose-500/10 hover:border-rose-500/25 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-white">{eq.name}</div>
                    </div>
                    <StatusBadge status={eq.status as any} />
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 leading-relaxed">{eq.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ LABS & OBSERVATORIES TAB ══════════════════ */}
      {activeTab === 'labs' && (
        <div className="space-y-5">
          <SectionHeader icon={<FlaskConical className="w-5 h-5" />}
            title={isMaitri ? 'Maitri Research Laboratories & Observatories' : 'Bharati Research Laboratories & Observatories'}
            subtitle={`${labsData.length} active science facilities · ${labsData.filter(l => l.status === 'Active').length} currently running experiments`}
            color="#10b981" />

          <div className="space-y-3">
            {labsData.map(lab => {
              const isExp = expandedLab === lab.id;
              return (
                <div key={lab.id} className="glass-panel rounded-2xl border overflow-hidden transition-all"
                  style={{ borderColor: `${lab.color}25` }}>
                  <div onClick={() => setExpandedLab(isExp ? null : lab.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-polar-dark/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{lab.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{lab.name}</div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: lab.color }}>Est. {lab.established} · {lab.running.substring(0, 70)}…</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={lab.status} />
                      {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-5 pb-5 border-t border-polar-border/40 bg-polar-dark/30 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="p-3 rounded-xl border bg-polar-dark/40" style={{ borderColor: `${lab.color}30` }}>
                          <div className="text-[9px] font-mono text-slate-500 uppercase mb-1.5">Current Research</div>
                          <p className="text-[11px] font-mono text-slate-300 leading-relaxed">{lab.running}</p>
                        </div>
                        <div className="p-3 rounded-xl border bg-polar-dark/40" style={{ borderColor: `${lab.color}30` }}>
                          <div className="text-[9px] font-mono text-slate-500 uppercase mb-1.5">Key Equipment</div>
                          <p className="text-[11px] font-mono text-slate-300 leading-relaxed">{lab.equipment}</p>
                        </div>
                        <div className="p-3 rounded-xl border bg-polar-dark/40" style={{ borderColor: `${lab.color}30` }}>
                          <div className="text-[9px] font-mono text-slate-500 uppercase mb-1.5">Data Output</div>
                          <p className="text-[11px] font-mono text-slate-300 leading-relaxed">{lab.output}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ VEHICLES TAB ══════════════════ */}
      {activeTab === 'vehicles' && (
        <div className="space-y-5">
          <SectionHeader icon={<Truck className="w-5 h-5" />}
            title={isMaitri ? 'Maitri Vehicle Fleet & Traverse Operations' : 'Bharati Vehicle Fleet & Marine Operations'}
            subtitle={vehiclesData.desc} color="#f97316" />

          {/* Garage spec */}
          <div className="glass-panel p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-white">{vehiclesData.garage.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-[11px] font-mono text-slate-400">
              <div><span className="text-slate-500 block">Floor Area</span><strong className="text-orange-400">{vehiclesData.garage.size}</strong></div>
              <div><span className="text-slate-500 block">Capacity</span><strong className="text-white">{vehiclesData.garage.capacity}</strong></div>
              <div><span className="text-slate-500 block">Heating</span><strong className="text-white">{vehiclesData.garage.heating}</strong></div>
            </div>
          </div>

          {/* Vehicle cards */}
          <div className="space-y-3">
            {vehiclesData.vehicles.map(v => {
              const isExp = expandedVehicle === v.id;
              return (
                <div key={v.id} className="glass-panel rounded-2xl border overflow-hidden transition-all"
                  style={{ borderColor: `${v.color}20` }}>
                  <div onClick={() => setExpandedVehicle(isExp ? null : v.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-polar-dark/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{v.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{v.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{v.type} · {v.hours > 0 ? `${v.hours.toLocaleString()} run hours` : 'Operational'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-[9px] font-mono text-slate-500 uppercase">Health</div>
                        <div className="text-sm font-black font-mono" style={{ color: v.color }}>{v.health}%</div>
                      </div>
                      <StatusBadge status={v.status} />
                      {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-5 pb-5 border-t border-polar-border/40 bg-polar-dark/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="md:col-span-2 p-3 rounded-xl border bg-polar-dark/40" style={{ borderColor: `${v.color}30` }}>
                          <p className="text-[11px] font-mono text-slate-300 leading-relaxed">{v.detail}</p>
                        </div>
                        <div className="p-3 rounded-xl border bg-polar-dark/40 space-y-2" style={{ borderColor: `${v.color}30` }}>
                          <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">System Health</div>
                          <HealthBar value={v.health} color={v.color} />
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-500">Health</span>
                            <span className="font-bold" style={{ color: v.color }}>{v.health}%</span>
                          </div>
                          {v.hours > 0 && (
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-500">Run Hours</span>
                              <span className="font-bold text-white">{v.hours.toLocaleString()} h</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ SUMMER CAMPS TAB ══════════════════ */}
      {activeTab === 'summer' && (
        <div className="space-y-5">
          <SectionHeader icon={<Tent className="w-5 h-5" />}
            title="Antarctic Summer Season Camps & Expansion"
            subtitle={`Season: ${summerData.season} · +${summerData.totalExtra} additional personnel capacity`}
            color="#f59e0b" />

          {/* Season overview */}
          <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Navigation className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Summer Season Overview — {isMaitri ? 'Maitri Station' : 'Bharati Station'}</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">{summerData.desc}</p>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-polar-border/40">
              {[
                { label: 'Winter-Over Crew', val: isMaitri ? '25' : '30', color: '#818cf8' },
                { label: 'Summer Capacity', val: isMaitri ? '40' : '47', color: '#f59e0b' },
                { label: 'Extra Staff Hosted', val: `+${summerData.totalExtra}`, color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">{s.label}</div>
                  <div className="text-xl font-black font-mono mt-1" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Camp cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {summerData.camps.map((camp, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl border transition-all hover:border-amber-400/30"
                style={{ borderColor: `${camp.color}25` }}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">{camp.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white mb-1">{camp.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold"
                        style={{ backgroundColor: `${camp.color}15`, borderColor: `${camp.color}40`, color: camp.color }}>
                        {camp.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {camp.capacity} personnel
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed mb-4">{camp.detail}</p>
                <div className="grid grid-cols-2 gap-2">
                  {camp.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: camp.color }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Antarctic Treaty note */}
          <div className="p-4 rounded-xl border border-polar-border bg-polar-dark/40 text-[11px] font-mono text-slate-400 leading-relaxed">
            <span className="text-cyan-400 font-bold block mb-1">Antarctic Treaty Protocol — Environmental Impact</span>
            All summer camps comply with the Protocol on Environmental Protection to the Antarctic Treaty (Madrid Protocol, 1991). Zero permanent structures beyond existing station footprint. All human waste, grey water, and waste materials are packaged and returned to India for disposal. Summer camp materials are fully demobilized before autumn sea-ice formation.
          </div>
        </div>
      )}
    </div>
  );
};

export default InfrastructurePage;
