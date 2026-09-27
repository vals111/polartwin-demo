import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi } from '../api/client';
import {
  Users, ShieldCheck, Siren, HeartPulse, Clock, MapPin,
  AlertOctagon, Flame, Snowflake, Sun, Radio, Activity,
  CheckCircle, CheckCircle2, Wrench, Microscope, Sparkles,
  ShieldAlert, UserCheck, Shield, Brain, Droplets,
  Briefcase,
} from 'lucide-react';
import * as echarts from 'echarts';

// ── Pill Badge ─────────────────────────────────────────────────────────────────
const Pill: React.FC<{ label: string; color: string; pulse?: boolean }> = ({ label, color, pulse }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] rounded-full font-mono font-bold border"
    style={{ background: `${color}14`, borderColor: `${color}44`, color }}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-ping' : ''}`} style={{ background: color }} />
    {label}
  </span>
);

// ── Progress Bar ───────────────────────────────────────────────────────────────
const Bar: React.FC<{ pct: number; color: string; h?: string }> = ({ pct, color, h = 'h-1.5' }) => (
  <div className={`${h} rounded-full bg-white/8 overflow-hidden`}>
    <div className={`${h} rounded-full transition-all duration-700`}
      style={{ width: `${pct}%`, background: color }} />
  </div>
);


// ── 24-Hour Shift Rotation & Station Manning Chart ───────────────────────────
const ShiftRotationChart: React.FC<{ isMaitri: boolean }> = ({ isMaitri }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;

    const hours = [
      '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
    ];

    const scienceStaff = isMaitri ? 10 : 12;
    const engrStaff = isMaitri ? 10 : 12;
    const logisticsStaff = isMaitri ? 4 : 5;
    const nightStaff = 2;

    const scienceData = [0, 0, 0, 0, 0, 0, 0, 0, scienceStaff, scienceStaff, scienceStaff, scienceStaff, scienceStaff, scienceStaff, scienceStaff, scienceStaff, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const engrData = [0, 0, 0, 0, 0, 0, 0, Math.round(engrStaff * 0.5), engrStaff, engrStaff, engrStaff, engrStaff, engrStaff, engrStaff, engrStaff, Math.round(engrStaff * 0.5), 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const logData = [0, 0, 0, 0, 0, 0, logisticsStaff, logisticsStaff, logisticsStaff, logisticsStaff, logisticsStaff, logisticsStaff, logisticsStaff, logisticsStaff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const nightData = [nightStaff, nightStaff, nightStaff, nightStaff, nightStaff, nightStaff, nightStaff, Math.round(nightStaff * 0.5), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, nightStaff, nightStaff];

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        padding: [8, 12],
        textStyle: { color: '#f8fafc', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: any) => {
          let total = 0;
          let lines = params.map((p: any) => {
            total += Number(p.value || 0);
            return `<div style="display:flex; justify-content:space-between; gap:16px;">
              <span style="color:${p.color}; font-weight:bold;">${p.seriesName}:</span>
              <span style="font-weight:bold;">${p.value} crew</span>
            </div>`;
          }).join('');
          return `<div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px; color:#38bdf8;">
            🕒 ${params[0].axisValue} UTC · Total: ${total} on duty
          </div>${lines}`;
        },
      },
      legend: {
        top: 2,
        right: 10,
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        itemWidth: 8,
        itemHeight: 8,
        icon: 'circle',
      },
      grid: { top: 38, bottom: 25, left: 32, right: 20 },
      xAxis: {
        type: 'category',
        data: hours,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', interval: 2 },
      },
      yAxis: {
        type: 'value',
        name: 'Personnel',
        nameTextStyle: { color: '#64748b', fontSize: 9, fontFamily: 'monospace' },
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: [
        {
          name: 'Night Watch & Medical',
          type: 'line',
          stack: 'total',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#10b981', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.45)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
            ])
          },
          data: nightData,
        },
        {
          name: 'Logistics & Galley',
          type: 'line',
          stack: 'total',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 158, 11, 0.45)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' }
            ])
          },
          data: logData,
        },
        {
          name: 'Engineering & Genset',
          type: 'line',
          stack: 'total',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#06b6d4', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(6, 182, 212, 0.45)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.05)' }
            ])
          },
          data: engrData,
        },
        {
          name: 'Science & Labs',
          type: 'line',
          stack: 'total',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#a855f7', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(168, 85, 247, 0.45)' },
              { offset: 1, color: 'rgba(168, 85, 247, 0.05)' }
            ])
          },
          markLine: {
            silent: true,
            data: [{ xAxis: '11:00' }],
            lineStyle: { color: '#ffffff', width: 1.5, type: 'dashed' },
            label: {
              show: true,
              formatter: '11:30 NOW',
              color: '#ffffff',
              backgroundColor: '#a855f7',
              padding: [2, 6],
              borderRadius: 4,
              fontSize: 9,
              fontFamily: 'monospace',
              position: 'insideEndTop',
            },
            symbol: ['none', 'none'],
          },
          data: scienceData,
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [isMaitri]);

  return <div ref={ref} style={{ height: 180, width: '100%' }} />;
};


// ── Wind Chill Calculator ──────────────────────────────────────────────────────
const ChillCalc: React.FC<{ initWind: number; initTemp: number }> = ({ initWind, initTemp }) => {
  const [wind, setWind] = useState(initWind);
  const [temp, setTemp] = useState(initTemp);
  const wc = 13.12 + 0.6215 * temp - 11.37 * Math.pow(wind, 0.16) + 0.3965 * temp * Math.pow(wind, 0.16);
  const wcR = Math.round(wc * 10) / 10;
  const safe = wc > -28 ? 60 : wc > -35 ? 30 : wc > -45 ? 15 : wc > -55 ? 10 : 5;
  const c = safe >= 30 ? '#10b981' : safe >= 15 ? '#f59e0b' : '#ef4444';
  const mandate = safe >= 30 ? 'Standard PPE · Rotate at 30 min' : safe >= 15 ? 'High Risk · 15 min max' : 'EXTREME · Halt non-emergency excursions';
  return (
    <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/05 space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
        <Snowflake className="w-4 h-4" /> Wind Chill & Frostbite Calculator
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/8 space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-200 font-medium">
            <span>Air Temp</span><span className="font-bold text-sky-300">{temp}°C</span>
          </div>
          <input type="range" min="-50" max="-5" value={temp} onChange={e => setTemp(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-sky-400" />
        </div>
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/8 space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-200 font-medium">
            <span>Wind</span><span className="font-bold text-cyan-300">{wind} km/h</span>
          </div>
          <input type="range" min="10" max="120" value={wind} onChange={e => setWind(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-cyan-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl border text-center" style={{ borderColor: `${c}40`, background: `${c}10` }}>
          <div className="text-[10px] font-mono text-slate-200 uppercase font-bold">Wind Chill</div>
          <div className="text-2xl font-black font-mono" style={{ color: c }}>{wcR}°C</div>
        </div>
        <div className="p-3 rounded-xl border text-center" style={{ borderColor: `${c}40`, background: `${c}10` }}>
          <div className="text-[10px] font-mono text-slate-200 uppercase font-bold">Max Safe Exposure</div>
          <div className="text-2xl font-black font-mono" style={{ color: c }}>{safe} <span className="text-sm font-normal">min</span></div>
        </div>
      </div>
      <div className="text-[10px] font-mono text-center font-bold" style={{ color: c }}>{mandate}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export const PersonnelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const station = stations.find(s => s.station_id === stationId) ?? {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'personnel' | 'safety' | 'emergency'>('personnel');
  const [sirenOn, setSirenOn] = useState(false);
  const [recallSent, setRecallSent] = useState(false);
  const { liveSnapshot } = useTelemetryStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await resourcesApi.getPersonnel(stationId);
      setData(res.personnel);
    } catch {
      const snap = liveSnapshot[stationId]?.personnel;
      if (snap && (snap as any).role_groups) setData(snap);
    } finally { setLoading(false); }
  }, [stationId, liveSnapshot]);

  useEffect(() => { setLoading(true); setData(null); fetchData(); }, [stationId]);
  useEffect(() => { const t = setInterval(fetchData, 15000); return () => clearInterval(t); }, [fetchData]);

  // ─── STATION NUMBERS ───────────────────────────────────────────
  const total = isMaitri ? 25 : 30;
  const capacity = isMaitri ? 40 : 47;
  const outdoor = isMaitri ? 4 : 5;
  const onDuty = isMaitri ? 18 : 22;
  const resting = isMaitri ? 6 : 7;

  // ─── PERSONNEL ROSTER (All station members & their work) ─────────────
  const roster = isMaitri ? [
    { id: 'p1',  name: 'Dr. Arvind Kumar',        role: 'Lead Glaciologist',             dept: 'science',     location: 'Glacier Stake S-12',        work: 'Ice sheet GPR radar sounding & ice core stratigraphic sampling' },
    { id: 'p2',  name: 'Eng. Rajesh Singh',        role: 'Lead Meteorologist',            dept: 'science',     location: 'Campbell AWS-3 Mast',        work: 'Automated weather station maintenance & radiosonde balloon launch' },
    { id: 'p3',  name: 'Dr. Preeti Nair',          role: 'Atmospheric Physicist',         dept: 'science',     location: 'Laser & Spectrometry Lab',   work: 'Stratospheric ozone inversion, UV spectrometry & solar radiation monitoring' },
    { id: 'p4',  name: 'Dr. Ananya Sen',           role: 'Geomagnetism Specialist',       dept: 'science',     location: 'Magnetic Observatory',       work: 'Earth magnetic field variometer logging & solar flare disturbance tracking' },
    { id: 'p5',  name: 'Dr. Sanjay Ghosh',         role: 'Cryo-Seismologist',             dept: 'science',     location: 'Seismic Vault Sector-4',     work: 'Continuous cryo-seismic network monitoring & glacier slip event analysis' },
    { id: 'p6',  name: 'Dr. Vikram Joshi',         role: 'Environmental Chemist',         dept: 'science',     location: 'Biogeochemistry Lab',        work: 'Lake Priyadarshini water chemistry & trace heavy metal baseline tracking' },
    { id: 'p7',  name: 'Dr. Kavita Raman',         role: 'Microbiologist',                dept: 'science',     location: 'Bio-Incubator Bay',          work: 'Extremophile psychrophilic bacteria culture isolation & DNA sequencing' },
    { id: 'p8',  name: 'Eng. Sunil Verma',         role: 'Satellite Comms Engineer',      dept: 'science',     location: 'Radome Ground Station',      work: 'Indian Antarctic satellite ground terminal tracking & telemetry uplink relay' },
    { id: 'p9',  name: 'Lt. Col. Vikram Sharma',   role: 'Chief Microgrid Engineer',      dept: 'engineering', location: 'Generator Bay & Workshop',   work: 'Diesel genset synchronization, turbo maintenance & microgrid power distribution' },
    { id: 'p10', name: 'Tech. Debashis Mukherjee', role: 'Thermal & Life Support Eng.',  dept: 'engineering', location: 'Lake Water Pump House',      work: 'Potable water pumping, pipeline trace-heating audit & boiler heat exchangers' },
    { id: 'p11', name: 'Eng. Amit Patel',          role: 'Electrical Systems Specialist', dept: 'engineering', location: 'Renewable Power Wing',      work: 'Solar PV inverters, wind turbine mechanical servicing & switchgear testing' },
    { id: 'p12', name: 'Tech. Suresh Reddy',       role: 'Mechanical Workshop Lead',      dept: 'engineering', location: 'Heavy Workshop Bay',         work: 'Hydraulic equipment rebuilds, lathe machining & custom replacement parts' },
    { id: 'p13', name: 'Tech. Manoj Tiwari',       role: 'HVAC & Life Systems Tech',      dept: 'engineering', location: 'Habitation Module Quarters', work: 'Central air handling units, dampers, thermal balancing & CO₂ scrubbing' },
    { id: 'p14', name: 'Dr. Shalini Pillai',       role: 'Expedition Flight Surgeon',     dept: 'medical',     location: 'Medical Ward & Clinic',      work: 'Comprehensive medical care, trauma response, hyperbaric safety & telemedicine' },
    { id: 'p15', name: 'Nurse Rohan Mehta',        role: 'Emergency Trauma Paramedic',    dept: 'medical',     location: 'Trauma & Emergency Bay',     work: 'Emergency medical triage, trauma kit readiness & patient vitals logging' },
    { id: 'p16', name: 'Chef Karan Chawla',        role: 'Galley & Hydroponics Lead',     dept: 'logistics',   location: 'Station Kitchen & Galley',   work: 'Expedition nutrition management, polar rations & fresh hydroponic greens' },
    { id: 'p17', name: 'Sgt. Manpreet Singh',       role: 'Heavy Transport Fleet Master',  dept: 'logistics',   location: 'Vehicle Maintenance Hangar', work: 'PistenBully 300 snowcat maintenance, track servicing & traverse fuel supply' },
    { id: 'p18', name: 'Officer Deepak Nair',      role: 'Fuel & Supplies Quartermaster', dept: 'logistics',   location: 'Bulk Fuel Depots & Stores',  work: 'Aviation turbine fuel inventory, cold-store audits & field expedition gear' },
  ] : [
    { id: 'p101', name: 'Cdr. Pradeep Iyer',       role: 'Station Commander',            dept: 'engineering', location: 'Central Control Bridge',     work: 'Overall station command, mission governance & automated SCADA dispatch' },
    { id: 'p102', name: 'Dr. Meera Joshi',         role: 'Marine Biologist',             dept: 'science',     location: 'Prydz Bay Coastal Lab',      work: 'Southern Ocean phytoplankton biodiversity & microplastic contamination surveys' },
    { id: 'p103', name: 'Dr. Tarun Menon',         role: 'Physical Oceanographer',       dept: 'science',     location: 'Coastline Tide Gauge Mast',  work: 'Sea-ice acoustic depth sounding, tidal transducer recovery & water temperature' },
    { id: 'p104', name: 'Eng. Kiran Rao',          role: 'AGEOS Earth Station Lead',     dept: 'science',     location: 'Radome Antenna Pad',         work: 'Remote sensing satellite pass reception, radome de-icing & high-speed uplink' },
    { id: 'p105', name: 'Dr. Alok Bhattacharya',   role: 'Atmospheric Chemist',          dept: 'science',     location: 'Atmospheric Optics Lab',     work: 'Polar vortex greenhouse gases, black carbon tracking & aerosol mass spectrometry' },
    { id: 'p106', name: 'Dr. Ritu Verma',          role: 'Cryosphere Geophysicist',       dept: 'science',     location: 'Larsemann Hills Field Site', work: 'Ice-sheet grounding line radar profiling & GPS satellite crevasse velocity map' },
    { id: 'p107', name: 'Dr. Sneha Kulkarni',      role: 'Polar Terrestrial Ecologist',  dept: 'science',     location: 'Field Survey Outpost',       work: 'Antarctic moss, lichen bed colonization & seabird population monitoring' },
    { id: 'p108', name: 'Eng. Aditya Deshmukh',    role: 'Space Weather Researcher',     dept: 'science',     location: 'Space Physics Lab',          work: 'Auroral imaging, riometer cosmic noise measurements & ionospheric absorption' },
    { id: 'p109', name: 'Eng. Rohit Kulkarni',     role: 'Power Plant Chief Engineer',   dept: 'engineering', location: 'Central Power Block',        work: 'Combined heat and power (CHP) genset grid, 500 kWh battery storage management' },
    { id: 'p110', name: 'Tech. Sandeep Nair',      role: 'Water Treatment Specialist',   dept: 'engineering', location: 'Water Desalination Plant',   work: 'Sea-water reverse osmosis filtration, UV sterilization & greywater recycling' },
    { id: 'p111', name: 'Tech. Vikas Sharma',      role: 'Fire & Life Safety Engineer',  dept: 'engineering', location: 'Safety Command Center',      work: 'Novec 1230 gas fire suppression, thermal fire loop sensors & airlock seals' },
    { id: 'p112', name: 'Eng. Harish Kumar',       role: 'Robotics & Avionics Engineer', dept: 'engineering', location: 'UAV Avionics Workshop',      work: 'Autonomous long-range aerial survey drone fleet servicing & sensor payloads' },
    { id: 'p113', name: 'Dr. Ajay Saxena',         role: 'Expedition Medical Officer',   dept: 'medical',     location: 'Bharati Station Clinic',     work: 'Crew medical evaluations, minor surgical procedures, hypothermia treatment' },
    { id: 'p114', name: 'Nurse Pooja Hegde',       role: 'Clinical Operations Assistant',dept: 'medical',     location: 'Diagnostic Laboratory',      work: 'Pathology testing, pharmaceutical stores inventory & field trauma kit support' },
    { id: 'p115', name: 'Chef Sanjeev Kapoor',     role: 'Galley Operations Lead',       dept: 'logistics',   location: 'Main Galley & Mess Hall',    work: 'Crew dietary requirements, deep-freeze storage rotation & daily meal logistics' },
    { id: 'p116', name: 'Sgt. Balwinder Singh',    role: 'Heavy Machinery Master',       dept: 'logistics',   location: 'Heavy Equipment Yard',       work: 'Crawler cranes, tracked transport vehicles & snow clearance operations' },
    { id: 'p117', name: 'Officer Gaurav Das',      role: 'Cargo Logistics Specialist',   dept: 'logistics',   location: 'Helipad & Cargo Storage',    work: 'Helicopter sling-load flight handling, polar ISO container stowage & tracking' },
    { id: 'p118', name: 'Tech. Rakesh Yadav',      role: 'Structural Integrity Tech',    dept: 'logistics',   location: 'Superstructure Maintenance', work: 'Building exterior composite cladding, thermal seals & window gasket integrity' },
  ];

  // ─── SAFETY ZONES ──────────────────────────────────────────────
  const safetyZones = [
    { id: 'z1', zone: 'Habitation Pods',      type: 'Living Quarters',   safe: true,  reading: '+21.4°C · 0 km/h',    hazard: null, status: 'All Nominal' },
    { id: 'z2', zone: 'Science Laboratories', type: 'Research Wing',     safe: true,  reading: '+20.0°C · 0 ppm CO',  hazard: null, status: 'Clean Controlled' },
    { id: 'z3', zone: 'Medical Ward',         type: 'Clinical Care',     safe: true,  reading: '+22.5°C · Sterile',   hazard: null, status: 'Nominal Ready' },
    { id: 'z4', zone: 'Lake Pump Station',    type: 'Utility Station',   safe: true,  reading: '-14°C · Trace-Heated',hazard: null, status: 'Protected Line' },
    { id: 'z5', zone: 'Glacier Field Sector', type: 'Exterior Field',    safe: false, reading: '-28°C · 62 km/h Wind',hazard: 'Wind Chill −48°C · Frostbite Risk', status: 'Extreme Chill' },
    { id: 'z6', zone: 'External Catwalks',    type: 'Exterior Transit',  safe: false, reading: '-24°C · 55 km/h Wind',hazard: 'Rime Ice · Slip Hazard 8.5/10',     status: 'Severe Slip' },
    { id: 'z7', zone: 'Atmospheric Obs. Pad', type: 'Outdoor Platform',  safe: false, reading: '-22°C · 48 km/h Wind',hazard: 'UV Index 9.2 Peak · High Radiation', status: 'Radiation Risk' },
    { id: 'z8', zone: 'Generator Bay B-01',   type: 'Power Plant',       safe: false, reading: '+38.5°C · 14 ppm CO', hazard: 'CO Gas Elevated · Noise 94 dBA',     status: 'Gas & Noise' },
  ];

  const hazardRemedies = [
    {
      id: 'h1',
      title: 'Extreme Wind Chill',
      location: 'Glacier Field & AWS',
      color: '#06b6d4',
      icon: '❄️',
      severity: '−48°C RISK',
      actions: [
        { icon: '⏱️', label: 'Max Exposure', val: '15 min rotation' },
        { icon: '👥', label: 'Safety Rule', val: '2-person buddy team' },
        { icon: '🚨', label: 'Emergency', val: 'Recall on 20 min' },
      ],
      gear: ['ECW Parka', 'Heated Gloves', '406MHz Beacon'],
    },
    {
      id: 'h2',
      title: 'Catwalk Rime Ice',
      location: 'External Gangways',
      color: '#f59e0b',
      icon: '🧊',
      severity: 'SLIP 8.5/10',
      actions: [
        { icon: '🔥', label: 'Trace Heat', val: '4.5 kW sub-floor ON' },
        { icon: '🪨', label: 'Surface', val: 'Volcanic basalt grit' },
        { icon: '🥾', label: 'Footwear', val: 'Carbide cleats required' },
      ],
      gear: ['Trace Heating', 'Basalt Grit', 'Boot Cleats'],
    },
    {
      id: 'h3',
      title: 'Solar UV Index Peak',
      location: 'Obs Pad & Snowfields',
      color: '#eab308',
      icon: '☀️',
      severity: 'UV 9.2 PEAK',
      actions: [
        { icon: '🕶️', label: 'Eye Shield', val: 'Cat-4 polarized goggles' },
        { icon: '🧴', label: 'Skin Barrier', val: 'SPF 50+ zinc barrier' },
        { icon: '⏱️', label: 'Window', val: '20 min max optical runs' },
      ],
      gear: ['Cat-4 Goggles', 'SPF 50+ Zinc', 'Quartz Covers'],
    },
    {
      id: 'h4',
      title: 'Generator Bay CO',
      location: 'Diesel Generator Bay',
      color: '#ef4444',
      icon: '⚠️',
      severity: '14 PPM CO',
      actions: [
        { icon: '💨', label: 'Extraction', val: 'Fan EF-02 at 60% speed' },
        { icon: '📟', label: 'Alarm Limit', val: 'Calibrated at 25 ppm' },
        { icon: '🎧', label: 'Acoustics', val: 'Class-5 ear defenders' },
      ],
      gear: ['Exhaust Fan EF-02', 'CO Detector', 'Ear Defenders'],
    },
  ];

  // ─── EMERGENCY INCIDENTS ───────────────────────────────────────
  const incidents = [
    {
      id: 'em1',
      title: 'Hypothermia Threshold Breach',
      severity: 'CRITICAL',
      color: '#ef4444',
      target: isMaitri ? 'Dr. Arvind Kumar' : 'Dr. Tarun Menon',
      location: isMaitri ? 'Glacier Stake S-12' : 'Prydz Bay Tide Mast',
      metric: 'Core Temp 34.8°C · HR 112 bpm (Critical Low)',
      action: 'Rescue Snowcat B-02 dispatched & en route',
      eta: 'ETA 8 min',
      pct: 65,
    },
    {
      id: 'em2',
      title: 'Outdoor Exposure Overrun',
      severity: 'HIGH ALERT',
      color: '#f97316',
      target: isMaitri ? 'Eng. Rajesh Singh' : 'Eng. Kiran Rao',
      location: isMaitri ? 'Campbell AWS-3 Mast' : 'Radome Antenna Pad',
      metric: '310 min outdoors (Exceeded 240m Limit)',
      action: 'VHF acoustic recall sounded · Navigating via lifeline',
      eta: 'Base arrival ~11 min',
      pct: 40,
    },
    {
      id: 'em3',
      title: 'Katabatic Blizzard Front',
      severity: 'WARNING',
      color: '#f59e0b',
      target: 'Station Perimeter',
      location: 'Polar Plateau · 38 km SW',
      metric: 'Sustained 75 km/h · Gusts 105 km/h · Drop 4.8 hPa/h',
      action: 'Storm shutters sealed · Traverses halted',
      eta: 'Front impact in 42 min',
      pct: 35,
    },
  ];



  const musterA = isMaitri ? 19 : 23;
  const musterB = isMaitri ? 4 : 5;
  const missingList = isMaitri
    ? [{ name: 'Dr. Arvind Kumar', loc: 'Glacier S-12', status: 'En route · Snowcat B-02', ping: '1 min ago' },
       { name: 'Eng. Rajesh Singh', loc: 'AWS-3 Mast', status: 'Walking via lifeline', ping: '2 min ago' }]
    : [{ name: 'Dr. Tarun Menon', loc: 'Coastline Mast', status: 'Rescue Snowcat en route', ping: 'Just now' },
       { name: 'Eng. Kiran Rao', loc: 'Radome Pad', status: 'Entering Airlock 2', ping: '1 min ago' }];

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs font-mono text-slate-200 font-medium">Loading personnel twin state…</div>
      </div>
    </div>
  );

  // ─── COLOR HELPERS ─────────────────────────────────────────────
  const sv = (c: string) => ({ background: `${c}14`, borderColor: `${c}40` } as const);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(168,85,247,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(239,68,68,0.08) 0%, transparent 50%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">{station.name} · SCADA Life Safety · Live</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3 mt-1">
              <Users className="w-7 h-7 text-purple-400" /> Personnel, Safety & Emergency
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=personnel`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 border border-purple-500/40 text-purple-300 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4" /> AI Decision Suite
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-polar-border/50">
          {[
            { label: 'Total Headcount', val: String(total),            sub: `/ ${capacity} berths`,           color: '#a855f7', icon: <Users className="w-4 h-4" /> },
            { label: 'On Active Duty',  val: String(onDuty),           sub: `${resting} in rest`,             color: '#10b981', icon: <UserCheck className="w-4 h-4" /> },
            { label: 'Field Deployed',  val: String(outdoor),          sub: 'Outside perimeter',              color: '#f59e0b', icon: <MapPin className="w-4 h-4" /> },
            { label: 'Active Hazards',  val: '3 Zones',                sub: 'Wind · Ice · UV',                color: '#f97316', icon: <ShieldAlert className="w-4 h-4" /> },
            { label: 'Incidents',       val: '3 Active',               sub: 'Hypothermia & Blizzard',         color: '#ef4444', icon: <Siren className="w-4 h-4" /> },
            { label: 'Wind Chill',      val: isMaitri ? '−48°C' : '−34°C', sub: `Max safe: ${isMaitri ? '10' : '20'} min`, color: '#06b6d4', icon: <Snowflake className="w-4 h-4" /> },
          ].map(kpi => (
            <div key={kpi.label} className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 font-bold mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-xl font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono text-slate-300 font-medium">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB NAVIGATION ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/10">
        {[
          { id: 'personnel' as const, label: 'Personnel & Tasks',         icon: <Users className="w-4 h-4" />,       color: '#a855f7', badge: `${onDuty} Active` },
          { id: 'safety'    as const, label: 'Safety & Remedies',         icon: <ShieldCheck className="w-4 h-4" />, color: '#10b981', badge: '3 Hazards' },
          { id: 'emergency' as const, label: 'Live Emergency Command',    icon: <Siren className="w-4 h-4" />,       color: '#ef4444', badge: '3 Active', pulse: true },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 border transition-all cursor-pointer"
            style={activeSection === tab.id
              ? { background: `${tab.color}18`, borderColor: `${tab.color}60` }
              : { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold flex items-center gap-2"
                style={{ color: activeSection === tab.id ? '#fff' : '#cbd5e1' }}>
                <span style={{ color: tab.color }}>{tab.icon}</span>
                {tab.label}
              </span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${tab.pulse ? 'animate-pulse' : ''}`}
              style={{ background: `${tab.color}15`, borderColor: `${tab.color}40`, color: tab.color }}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── SECTION 1: PERSONNEL ─────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeSection === 'personnel' && (
        <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-5">

          {/* 1A: Headcount Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Station Population', val: `${total} / ${capacity}`, sub: `Occupancy ${Math.round(total / capacity * 100)}%`, color: '#a855f7', bar: Math.round(total / capacity * 100) },
              { label: 'On Active Duty',      val: `${onDuty}`,             sub: `${resting} resting · 1 standby`,                  color: '#10b981', bar: Math.round(onDuty / total * 100) },
              { label: 'Field Deployed',      val: `${outdoor}`,            sub: `${total - outdoor} inside modules`,               color: '#f59e0b', bar: Math.round(outdoor / total * 100) },
              { label: 'Discipline Split',    val: null,                    sub: '',                                                  color: '#06b6d4', bar: 0 },
            ].map((c, ci) => (
              <div key={ci} className="p-4 rounded-xl border flex flex-col justify-between" style={sv(c.color)}>
                <div className="text-xs font-mono uppercase font-bold tracking-wider text-slate-100 mb-1.5">{c.label}</div>
                {ci === 3 ? (
                  <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-xs font-mono pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-purple-300">{isMaitri ? 10 : 12}</span>
                      <span className="text-white font-medium">Science</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-cyan-300">{isMaitri ? 10 : 12}</span>
                      <span className="text-white font-medium">Engr.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-emerald-300">1</span>
                      <span className="text-white font-medium">Medical</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-amber-300">{isMaitri ? 4 : 5}</span>
                      <span className="text-white font-medium">Logistics</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-black font-mono tracking-tight" style={{ color: c.color }}>{c.val}</div>
                    <div className="text-xs font-mono text-slate-200 mt-1 mb-2.5 font-medium">{c.sub}</div>
                    <Bar pct={c.bar} color={c.color} h="h-2" />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 1B: Shift Rotation Chart */}
          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>24-Hour Shift Rotation & Station Manning Curve</span>
                <span className="text-[10px] font-medium text-slate-200">· Coordinated Universal Time (UTC)</span>
              </div>
              <div className="flex items-center gap-2">
                <Pill label="DAY 142" color="#06b6d4" />
                <Pill label="NOW: 11:30 UTC" color="#a855f7" />
                <Pill label="POLAR WINTER ROSTER" color="#f59e0b" />
              </div>
            </div>

            {/* The ECharts Shift Rotation & Active Duty Manning Area Graph */}
            <div className="p-2 rounded-xl bg-white/[0.01] border border-white/5">
              <ShiftRotationChart isMaitri={isMaitri} />
            </div>

            {/* 4 Shift Cards / Legend Bar below the graph */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {[
                { label: 'Science & Labs', window: '08:00–16:00 UTC', staff: isMaitri ? '10 On Duty' : '12 On Duty', color: '#a855f7', active: true },
                { label: 'Engineering & Genset', window: '07:30–15:30 UTC', staff: isMaitri ? '10 On Duty' : '12 On Duty', color: '#06b6d4', active: true },
                { label: 'Logistics & Galley', window: '06:00–14:00 UTC', staff: isMaitri ? '4 On Duty' : '5 On Duty', color: '#f59e0b', active: true },
                { label: 'Night Watch & Medical', window: '23:00–07:30 UTC', staff: '2 On Standby', color: '#10b981', active: false },
              ].map(s => (
                <div key={s.label} className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[11px] font-mono font-bold text-white truncate">{s.label}</span>
                    </div>
                    <div className="text-[10px] font-mono font-semibold" style={{ color: s.color }}>{s.window}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        background: s.active ? `${s.color}20` : 'rgba(255,255,255,0.05)',
                        borderColor: s.active ? `${s.color}60` : 'rgba(255,255,255,0.1)',
                        color: s.active ? s.color : '#e2e8f0'
                      }}>
                      {s.staff}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1C: Station Personnel & Work Assignments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Station Personnel & Work Assignments</span>
                <span className="text-[10px] font-medium text-slate-200">· {roster.length} Personnel Listed</span>
              </div>
              <Pill label={`${roster.length} Station Personnel`} color="#a855f7" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roster.map(p => {
                const dc = p.dept === 'science' ? '#c084fc' : p.dept === 'engineering' ? '#22d3ee' : p.dept === 'medical' ? '#34d399' : '#fbbf24';
                return (
                  <div key={p.id} className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all flex flex-col justify-between gap-2.5">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-xs border flex-shrink-0"
                            style={{ background: `${dc}18`, borderColor: `${dc}45`, color: dc }}>
                            {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-mono font-bold text-white truncate">{p.name}</div>
                            <div className="text-[11px] font-mono text-cyan-200 font-medium truncate mt-0.5">{p.role}</div>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase flex-shrink-0"
                          style={{ background: `${dc}15`, borderColor: `${dc}40`, color: dc }}>
                          {p.dept}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                        <div className="text-[8px] font-mono uppercase tracking-wider text-purple-300 font-bold flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 text-purple-400" /> Station Work
                        </div>
                        <div className="text-[11px] font-mono font-medium text-white leading-snug">{p.work}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-[10px] font-mono text-slate-200 pt-1.5 border-t border-white/5">
                      <span className="flex items-center gap-1 text-sky-200 font-medium truncate">
                        <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{p.location}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── SECTION 2: SAFETY ────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeSection === 'safety' && (
        <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-5">

          {/* 2A: Zone Safety Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Zone Safety Status</span>
                <span className="text-[10px] font-medium text-slate-200">· 8 Monitored Station Sectors</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold">4 Safe</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 font-bold">4 Hazards</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {safetyZones.map(z => {
                const isSafe = z.safe;
                const c = isSafe ? '#10b981' : '#ef4444';
                return (
                  <div key={z.id} className="p-3.5 rounded-2xl border transition-all space-y-2.5 flex flex-col justify-between"
                    style={{
                      borderColor: isSafe ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.4)',
                      background: isSafe ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.06)'
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold text-white truncate">{z.zone}</div>
                          <div className="text-[10px] font-mono text-cyan-200 font-medium truncate mt-0.5">{z.type}</div>
                        </div>
                      </div>
                      <Pill label={isSafe ? 'SAFE' : 'HAZARD'} color={c} pulse={!isSafe} />
                    </div>

                    <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                      {isSafe ? (
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span>{z.status}</span>
                          </span>
                          <span className="text-white font-semibold">{z.reading}</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-bold text-red-300 flex items-center gap-1 truncate">
                            <AlertOctagon className="w-3 h-3 text-red-400 flex-shrink-0" />
                            <span className="truncate">{z.hazard}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-200 font-medium">{z.reading}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2B: Hazard Remedy Cards */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Active Hazard Remedies</span>
                <span className="text-[10px] font-medium text-slate-200">· Mandatory Protocols</span>
              </div>
              <Pill label="MANDATORY PROTOCOLS" color="#ef4444" pulse />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {hazardRemedies.map(h => (
                <div key={h.id} className="p-3.5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between"
                  style={{ borderColor: `${h.color}35`, background: `${h.color}08` }}>
                  
                  {/* Header: Icon + Title + Severity */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">{h.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold text-white truncate">{h.title}</div>
                          <div className="text-[10px] font-mono text-sky-200 font-medium flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
                            <span className="truncate">{h.location}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
                        style={{ background: `${h.color}20`, borderColor: `${h.color}50`, color: h.color }}>
                        {h.severity}
                      </span>
                    </div>

                    {/* Concise Action Tokens */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                      {h.actions.map((act, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-200 font-medium flex items-center gap-1.5">
                            <span>{act.icon}</span>
                            <span>{act.label}</span>
                          </span>
                          <span className="font-bold text-white text-right">{act.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gear Badges */}
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-white/5">
                    {h.gear.map((g, gi) => (
                      <span key={gi} className="px-2 py-0.5 rounded-md text-[8px] font-mono font-bold bg-white/5 border border-white/10 text-white">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2C: Wind Chill & Frostbite Exposure Calculator */}
          <div>
            <ChillCalc initWind={isMaitri ? 62 : 38} initTemp={isMaitri ? -28 : -18} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── SECTION 3: EMERGENCY ─────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeSection === 'emergency' && (
        <div className="glass-panel p-5 rounded-2xl border border-polar-border shadow-xl space-y-5">

          {/* 3A: Active Incidents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" />
                <span>Active Emergency Incidents</span>
                <span className="text-[10px] font-medium text-slate-200">· Real-time Emergency Response</span>
              </div>
              <Pill label="3 ACTIVE ALERTS" color="#ef4444" pulse />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {incidents.map(em => (
                <div key={em.id} className="p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between"
                  style={{ borderColor: `${em.color}45`, background: `${em.color}08` }}>
                  
                  <div className="space-y-2.5">
                    {/* Header: Title + Severity */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full animate-ping flex-shrink-0" style={{ background: em.color }} />
                        <span className="text-xs font-mono font-bold text-white leading-tight">{em.title}</span>
                      </div>
                      <Pill label={em.severity} color={em.color} pulse />
                    </div>

                    {/* Target & Location */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white">
                      <span className="text-white font-bold">{em.target}</span>
                      <span className="text-slate-300 font-bold">·</span>
                      <span className="text-sky-200 font-medium flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{em.location}</span>
                      </span>
                    </div>

                    {/* Trigger Telemetry */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-slate-200 font-bold">Trigger Telemetry</div>
                      <div className="text-[11px] font-mono font-bold leading-snug" style={{ color: em.color }}>{em.metric}</div>
                    </div>

                    {/* Emergency Response Action */}
                    <div className="text-[10px] font-mono text-emerald-300 flex items-start gap-1.5 font-medium leading-tight">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{em.action}</span>
                    </div>
                  </div>

                  {/* Progress + ETA */}
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-200 font-medium">{em.eta}</span>
                      <span className="font-bold text-white">{em.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${em.pct}%`, background: em.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* 3C: Muster Accounting + SAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Muster Panel */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/05 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Muster Accounting</div>
                <Pill label={`${total - musterA - musterB} In Field`} color="#f59e0b" pulse />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono text-white">{musterA + musterB}</span>
                <span className="text-sm font-mono text-slate-200 font-bold">/ {total}</span>
              </div>
              <Bar pct={Math.round((musterA + musterB) / total * 100)} color="#f59e0b" h="h-2" />
              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex justify-between"><span className="text-slate-200 font-medium">Muster Alpha (Main Mess)</span><span className="text-white font-bold">{musterA}</span></div>
                <div className="flex justify-between"><span className="text-slate-200 font-medium">Muster Beta (Emergency Bunk)</span><span className="text-white font-bold">{musterB}</span></div>
              </div>
            </div>

            {/* SAR Tracking */}
            <div className="lg:col-span-2 p-4 rounded-2xl border border-red-500/30 bg-red-500/05 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono font-bold text-red-400 flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> Exterior Crew GPS Tracking</div>
                <span className="text-[9px] font-mono text-emerald-300 font-bold">406 MHz Telemetry Active</span>
              </div>

              <div className="space-y-2">
                {missingList.map(m => (
                  <div key={m.name} className="p-2.5 rounded-xl bg-black/40 border border-red-500/25 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono font-bold text-white">{m.name}</div>
                      <div className="text-[10px] font-mono text-slate-200 font-medium">{m.loc} · <span className="text-amber-300 font-bold">{m.status}</span></div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[9px] font-mono text-slate-300 font-medium">Last GPS ping</div>
                      <div className="text-[10px] font-mono font-bold text-emerald-400">{m.ping}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-red-500/20">
                <button onClick={() => setSirenOn(s => !s)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${sirenOn ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-red-500/15 hover:bg-red-500/25 border-red-500/40 text-red-300'}`}>
                  <Siren className="w-3.5 h-3.5" /> {sirenOn ? '🚨 SIREN ACTIVE — Click to Silence' : 'Sound Station General Alarm'}
                </button>
                <button onClick={() => setRecallSent(true)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${recallSent ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'}`}>
                  <Radio className="w-3.5 h-3.5 text-cyan-400" /> {recallSent ? '✓ Field Recall Sent' : 'Broadcast Emergency Recall'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
