import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { resourcesApi } from '../api/client';
import {
  CommunicationDigitalTwin, CommunicationAsset,
} from '../types';
import {
  Radio, Wifi, Globe, ShieldCheck, AlertTriangle,
  Clock, ArrowRight, RefreshCw, Layers,
  Activity, CheckCircle2, Server, Signal, Zap, AlertOctagon,
  Shield, Play, TrendingUp, TrendingDown, Cpu,
  ArrowUpRight, BarChart2,
  HardDrive, X, CloudLightning, Flame, Droplet, Users,
  Wrench, Package, MapPin, Wind, Sparkles, Brain,
  Sun, Thermometer, Database, Lock, Satellite,
  Search, MessageSquare, ToggleLeft, ToggleRight,
  Gauge, Eye, ChevronRight, CheckCircle, AlertCircle, Network,
} from 'lucide-react';
import * as echarts from 'echarts';

// ── Shared mini primitives ────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const Pill: React.FC<{ label: string; color?: string; pulse?: boolean; small?: boolean }> = ({
  label, color = '#10b981', pulse, small,
}) => (
  <span className={`inline-flex items-center gap-1 ${small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'} rounded-full font-mono font-bold border`}
    style={{ background: `${color}15`, borderColor: `${color}44`, color }}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} style={{ background: color }} />
    {label}
  </span>
);

const SectionDivider: React.FC<{
  icon: React.ReactNode; title: string; subtitle?: string; color: string; layer?: string;
}> = ({ icon, title, subtitle, color, layer }) => (
  <div className="flex items-start gap-4 mb-6 pb-4 border-b border-white/8">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {icon}
    </div>
    <div className="flex-1">
      {layer && (
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold"
            style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>{layer}</span>
        </div>
      )}
      <h2 className="text-base font-black text-white">{title}</h2>
      {subtitle && <p className="text-[10px] font-mono text-cyan-200 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const BarMeter: React.FC<{
  label: string; value: number; max: number; unit: string; color: string; sub?: string; reversed?: boolean;
}> = ({ label, value, max, unit, color, sub, reversed }) => {
  const pct = clamp((value / max) * 100);
  const displayColor = reversed ? (pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981') : color;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-white font-semibold">{label}</span>
        <span className="font-bold" style={{ color: displayColor }}>{value}{unit}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${displayColor}88, ${displayColor})`, boxShadow: `0 0 6px ${displayColor}44` }} />
      </div>
      {sub && <div className="text-[9px] font-mono text-white/90 font-medium">{sub}</div>}
    </div>
  );
};

// ── Link Performance EChart ────────────────────────────────────────────────
const LinkPerformanceChart: React.FC<{ hist: any[] }> = ({ hist }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current || !hist?.length) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const labels = hist.map(h => `${h.t_minus_sec}s`);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#ffffff', fontFamily: 'monospace', fontSize: 10 } },
      legend: { data: ['Data speed', 'Signal delay', 'Packet Loss'], textStyle: { color: '#ffffff', fontSize: 10, fontFamily: 'monospace' }, top: 0, right: 10 },
      grid: { top: 28, bottom: 30, left: 50, right: 14 },
      xAxis: { type: 'category', data: labels, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, axisLabel: { color: '#ffffff', fontSize: 9, fontFamily: 'monospace' } },
      yAxis: [
        { type: 'value', name: 'Mbps', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }, axisLabel: { color: '#38bdf8', fontSize: 9, fontFamily: 'monospace' }, nameTextStyle: { color: '#38bdf8', fontSize: 9 } },
        { type: 'value', name: 'ms', splitLine: { show: false }, axisLabel: { color: '#34d399', fontSize: 9, fontFamily: 'monospace' }, nameTextStyle: { color: '#34d399', fontSize: 9 } },
      ],
      series: [
        { name: 'Data speed', type: 'line', data: hist.map(h => h.bandwidth_mbps), smooth: true, showSymbol: false, lineStyle: { width: 2.5, color: '#38bdf8' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(56,189,248,0.3)' }, { offset: 1, color: 'rgba(56,189,248,0.02)' }]) } },
        { name: 'Signal delay', type: 'line', yAxisIndex: 1, data: hist.map(h => h.latency_ms), smooth: true, showSymbol: false, lineStyle: { width: 2, color: '#34d399', type: 'dashed' } },
        { name: 'Packet Loss', type: 'bar', data: hist.map(h => h.packet_loss_pct), itemStyle: { color: 'rgba(239,68,68,0.45)', borderRadius: [2, 2, 0, 0] }, barWidth: 6 },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [hist]);
  return <div ref={ref} className="w-full h-64" />;
};

// ── WiFi Coverage Floor Plan ──────────────────────────────────────────────────
interface RoomDetails {
  id: string;
  name: string;
  dept: string;
  wing: string;
  x: number;
  y: number;
  w: number;
  h: number;
  signalMaitri: number;
  signalBharati: number;
  rssi: number;
  snr: number;
  ap: string;
  channel: string;
  band: string;
  devices: number;
  attenuation: string;
  clients: { name: string; ip: string; band: string; rate: string; status: 'optimal' | 'fair' | 'critical' }[];
  notes: string;
}

const WiFiFloorPlan: React.FC<{ isMaitri: boolean }> = ({ isMaitri }) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('lab-a');
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const viewMode = 'heatmap';

  const rooms: RoomDetails[] = [
    {
      id: 'lab-a',
      name: 'Science Lab A',
      dept: 'Oceanography & Ice Core',
      wing: 'West Science Module',
      x: 26, y: 38, w: 260, h: 138,
      signalMaitri: 92, signalBharati: 88,
      rssi: -45, snr: 38,
      ap: 'AP-01 (Science Deck)',
      channel: 'Ch 36 (5.18 GHz)',
      band: '5 GHz AX',
      devices: 6,
      attenuation: '-3 dB (Composite Cryo-Insulation)',
      clients: [
        { name: 'Spectrometer-Rig-Alpha', ip: '192.168.10.42', band: '5 GHz', rate: '420 Mbps', status: 'optimal' },
        { name: 'Cryo-Core-Temp-Logger', ip: '192.168.10.45', band: '2.4 GHz', rate: '18 Mbps', status: 'optimal' },
        { name: 'Research-Workstation-01', ip: '192.168.10.18', band: '5 GHz', rate: '780 Mbps', status: 'optimal' },
      ],
      notes: 'Direct line-of-sight to AP-01. Optimized for continuous high-throughput mass spectrometer data offload.',
    },
    {
      id: 'lab-b',
      name: 'Science Lab B',
      dept: 'Atmospheric & Geophysics',
      wing: 'West Science Module',
      x: 26, y: 206, w: 260, h: 138,
      signalMaitri: 76, signalBharati: 82,
      rssi: -58, snr: 29,
      ap: 'AP-01 (Science Deck)',
      channel: 'Ch 36 (5.18 GHz)',
      band: '5 GHz AX',
      devices: 4,
      attenuation: '-6 dB (Insulated Double Partition)',
      clients: [
        { name: 'Ozone-Sonde-Receiver', ip: '192.168.10.51', band: '5 GHz', rate: '240 Mbps', status: 'optimal' },
        { name: 'Seismograph-DAQ-Node', ip: '192.168.10.55', band: '2.4 GHz', rate: '24 Mbps', status: 'optimal' },
        { name: 'Met-Radar-Console', ip: '192.168.10.60', band: '5 GHz', rate: '480 Mbps', status: 'optimal' },
      ],
      notes: 'Strong RF link. Minor attenuation caused by magnetic sensor shielding enclosure.',
    },
    {
      id: 'med-bay',
      name: 'Medical Bay',
      dept: 'Telemedicine & Triage',
      wing: 'West Science Module',
      x: 26, y: 358, w: 260, h: 142,
      signalMaitri: 88, signalBharati: 91,
      rssi: -48, snr: 34,
      ap: 'AP-01 (Science Deck)',
      channel: 'Ch 36 (5.18 GHz)',
      band: '5 GHz AX',
      devices: 3,
      attenuation: '-4 dB (Acoustic Foam Partition)',
      clients: [
        { name: 'Telemedicine-HD-Cart', ip: '192.168.10.71', band: '5 GHz', rate: '520 Mbps', status: 'optimal' },
        { name: 'Patient-Vital-Monitor', ip: '192.168.10.74', band: '2.4 GHz', rate: '12 Mbps', status: 'optimal' },
      ],
      notes: 'Priority QoS allocated for telemedicine video consultations with mainland trauma surgeons.',
    },
    {
      id: 'control-room',
      name: 'Control & Comms Deck',
      dept: 'Station Mission Command',
      wing: 'Central Habitat Spine',
      x: 304, y: 38, w: 274, h: 138,
      signalMaitri: 95, signalBharati: 94,
      rssi: -38, snr: 44,
      ap: 'AP-02 (Central Hub)',
      channel: 'Ch 149 (5.74 GHz)',
      band: '5 GHz AX',
      devices: 7,
      attenuation: '-2 dB (Open Bridge Deck)',
      clients: [
        { name: 'SCADA-Command-Console', ip: '192.168.10.10', band: '5 GHz', rate: '866 Mbps', status: 'optimal' },
        { name: 'Tactical-Radio-Bridge', ip: '192.168.10.12', band: '5 GHz', rate: '350 Mbps', status: 'optimal' },
        { name: 'Comms-Officer-Tablet', ip: '192.168.10.15', band: '5 GHz', rate: '600 Mbps', status: 'optimal' },
      ],
      notes: 'Highest RF clarity on station. Zero packet loss observed on mission-critical bridge terminals.',
    },
    {
      id: 'galley',
      name: 'Station Galley & Mess',
      dept: 'Crew Dining & Rest Area',
      wing: 'Central Habitat Spine',
      x: 304, y: 206, w: 274, h: 138,
      signalMaitri: 54, signalBharati: 61,
      rssi: -72, snr: 18,
      ap: 'AP-02 (Central Hub)',
      channel: 'Ch 6 (2.43 GHz)',
      band: '2.4 GHz N',
      devices: 3,
      attenuation: '-14 dB (Stainless Steel Food-Grade Walls)',
      clients: [
        { name: 'Pantry-Inventory-Tablet', ip: '192.168.10.82', band: '2.4 GHz', rate: '45 Mbps', status: 'fair' },
        { name: 'Deep-Freezer-Telemetry', ip: '192.168.10.84', band: '2.4 GHz', rate: '6 Mbps', status: 'fair' },
      ],
      notes: 'Industrial refrigeration units and stainless steel wall panels create localized RF attenuation.',
    },
    {
      id: 'living-qtrs',
      name: 'Living Quarters',
      dept: 'Crew Berths & Habitat Pods',
      wing: 'Central Habitat Spine',
      x: 304, y: 358, w: 274, h: 142,
      signalMaitri: 48, signalBharati: 52,
      rssi: -75, snr: 15,
      ap: 'AP-02 (Central Hub)',
      channel: 'Ch 6 (2.43 GHz)',
      band: '2.4 GHz N',
      devices: 5,
      attenuation: '-12 dB (Sound-Damped Modular Pods)',
      clients: [
        { name: 'Crew-Personal-Phone-1', ip: '192.168.20.101', band: '2.4 GHz', rate: '28 Mbps', status: 'fair' },
        { name: 'Crew-Personal-Phone-2', ip: '192.168.20.104', band: '2.4 GHz', rate: '32 Mbps', status: 'fair' },
        { name: 'Habitat-HVAC-Monitor', ip: '192.168.10.92', band: '2.4 GHz', rate: '8 Mbps', status: 'fair' },
      ],
      notes: 'Acceptable for personal messaging and audio streaming; multi-wall damping limits 5 GHz reach.',
    },
    {
      id: 'server-room',
      name: 'Server & Core Rack',
      dept: 'Fiber Backbone & MUX Core',
      wing: 'East Engineering Wing',
      x: 598, y: 38, w: 294, h: 138,
      signalMaitri: 98, signalBharati: 97,
      rssi: -32, snr: 48,
      ap: 'AP-03 (Engineering Wing)',
      channel: 'Ch 44 (5.22 GHz)',
      band: '5 GHz AX',
      devices: 8,
      attenuation: '-1 dB (Direct AP-03 LOS)',
      clients: [
        { name: 'Main-NAS-Storage-Array', ip: '192.168.10.2', band: '5 GHz', rate: '1200 Mbps', status: 'optimal' },
        { name: 'Core-Switch-Management', ip: '192.168.10.1', band: '5 GHz', rate: '866 Mbps', status: 'optimal' },
        { name: 'Environmental-PLC-Master', ip: '192.168.10.5', band: '5 GHz', rate: '300 Mbps', status: 'optimal' },
      ],
      notes: 'Direct line-of-sight to ceiling-mounted AP-03. Serves as central backhaul node for all station APs.',
    },
    {
      id: 'workshop',
      name: 'Technical Workshop',
      dept: 'Mechanical & Vehicle Tooling',
      wing: 'East Engineering Wing',
      x: 598, y: 206, w: 294, h: 138,
      signalMaitri: 62, signalBharati: 68,
      rssi: -68, snr: 22,
      ap: 'AP-03 (Engineering Wing)',
      channel: 'Ch 11 (2.46 GHz)',
      band: '2.4 GHz N',
      devices: 2,
      attenuation: '-9 dB (Metal Storage Racks)',
      clients: [
        { name: 'CNC-Milling-Station', ip: '192.168.10.112', band: '2.4 GHz', rate: '54 Mbps', status: 'fair' },
        { name: 'Snowmobile-Diagnostic-Pad', ip: '192.168.10.118', band: '2.4 GHz', rate: '36 Mbps', status: 'fair' },
      ],
      notes: 'Minor multipath reflections off tooling machinery. 2.4 GHz IoT band delivers stable link.',
    },
    {
      id: 'generator-room',
      name: 'Generator Room',
      dept: 'Diesel Plant & Power Grid',
      wing: 'East Engineering Wing',
      x: 598, y: 358, w: 294, h: 142,
      signalMaitri: 34, signalBharati: 40,
      rssi: -88, snr: 8,
      ap: 'AP-03 (Engineering Wing)',
      channel: 'Ch 11 (2.46 GHz)',
      band: '2.4 GHz Weak',
      devices: 1,
      attenuation: '-22 dB (12mm Steel Acoustic Shielding)',
      clients: [
        { name: 'Genset-Modbus-PLC', ip: '192.168.10.125', band: '2.4 GHz', rate: '2.4 Mbps', status: 'critical' },
      ],
      notes: 'CRITICAL DEAD ZONE: 12mm sound-dampened steel acoustic enclosure causes -22 dB RF loss. Telemetry packet drops reach 24%.',
    },
  ];

  const getSignal = (r: RoomDetails) => isMaitri ? r.signalMaitri : r.signalBharati;
  const sigColor = (s: number) => (
    s >= 80 ? '#10b981' : s >= 60 ? '#06b6d4' : s >= 45 ? '#f59e0b' : '#ef4444'
  );

  const aps = [
    { id: 'ap-1', name: 'AP-01 (Science)', cx: 156, cy: 191, color: '#38bdf8', active: true },
    { id: 'ap-2', name: 'AP-02 (Central)', cx: 441, cy: 191, color: '#38bdf8', active: true },
    { id: 'ap-3', name: 'AP-03 (Engineering)', cx: 745, cy: 191, color: '#38bdf8', active: true },
  ];

  return (
    <div className="space-y-4">
      {/* Blueprint SVG Canvas */}
      <div className="relative rounded-2xl border border-polar-border bg-[#030914] p-3 shadow-2xl overflow-hidden">
        <svg width="100%" viewBox="0 0 920 530" className="rounded-xl overflow-hidden select-none">
          <defs>
            <pattern id="wf-blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56,189,248,0.06)" strokeWidth="0.8" />
            </pattern>

            <pattern id="wf-hazard-stripes" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(239,68,68,0.22)" strokeWidth="4" />
            </pattern>
          </defs>

          <rect width="920" height="530" fill="#040b17" rx="14" />
          <rect width="920" height="530" fill="url(#wf-blueprint-grid)" rx="14" />

          {/* Outer Hull */}
          <rect x="15" y="15" width="890" height="500" rx="16" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="2.5" />
          <rect x="20" y="20" width="880" height="490" rx="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="6 4" />

          {/* Dividers */}
          <line x1="295" y1="20" x2="295" y2="510" stroke="rgba(56,189,248,0.18)" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="588" y1="20" x2="588" y2="510" stroke="rgba(56,189,248,0.18)" strokeWidth="2" strokeDasharray="4 4" />

          {/* Fiber Conduit Lines */}
          <g opacity="0.6">
            <line x1="156" y1="191" x2="441" y2="191" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="441" y1="191" x2="745" y2="191" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>

          {/* Module Headers */}
          <g fontSize="10.5" fontFamily="monospace" fontWeight="bold" letterSpacing="1">
            <text x="28" y="28" fill="rgba(56,189,248,0.85)">MODULE 01 — SCIENCE & MEDICAL</text>
            <text x="305" y="28" fill="rgba(56,189,248,0.85)">MODULE 02 — COMMAND & HABITAT</text>
            <text x="598" y="28" fill="rgba(56,189,248,0.85)">MODULE 03 — POWER & UTILITIES</text>
          </g>

          {/* Room Boxes */}
          {rooms.map(r => {
            const sig = getSignal(r);
            const sc = sigColor(sig);
            const isHovered = hoveredRoomId === r.id;
            const isDeadZone = sig < 45;
            const cx = r.x + r.w / 2;

            return (
              <g
                key={r.id}
                onClick={() => setSelectedRoomId(r.id)}
                onMouseEnter={() => setHoveredRoomId(r.id)}
                onMouseLeave={() => setHoveredRoomId(null)}
                className="cursor-pointer transition-all duration-200">
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={8}
                  fill={isHovered ? '#081726' : '#050d18'}
                  stroke={isHovered ? `${sc}88` : `${sc}44`}
                  strokeWidth={1}
                />

                {isDeadZone && (
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={8}
                    fill="url(#wf-hazard-stripes)"
                    pointerEvents="none"
                  />
                )}

                {/* Top Row: AP Badge on Left, Signal Status on Right */}
                <rect
                  x={r.x + 14}
                  y={r.y + 12}
                  width={56}
                  height={21}
                  rx={4}
                  fill="rgba(56, 189, 248, 0.15)"
                  stroke="rgba(56, 189, 248, 0.4)"
                  strokeWidth={1}
                />
                <text
                  x={r.x + 42}
                  y={r.y + 27}
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="12"
                  fontWeight="800"
                  fontFamily="monospace">
                  {r.ap.split(' ')[0]}
                </text>

                <text
                  x={r.x + r.w - 14}
                  y={r.y + 28}
                  textAnchor="end"
                  fontFamily="monospace">
                  <tspan fill={sc} fontSize="19" fontWeight="900">{sig}%</tspan>
                  <tspan fill="rgba(255, 255, 255, 0.4)" fontSize="13"> · </tspan>
                  <tspan fill={isDeadZone ? '#ef4444' : '#ffffff'} fontSize="12.5" fontWeight="700">{r.rssi} dBm</tspan>
                </text>

                {/* Centered Room Name & Department */}
                <text
                  x={cx}
                  y={r.y + 59}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="17.5"
                  fontWeight="800"
                  fontFamily="system-ui, -apple-system, sans-serif">
                  {r.name}
                </text>
                <text
                  x={cx}
                  y={r.y + 79}
                  textAnchor="middle"
                  fill="#7dd3fc"
                  fontSize="12.5"
                  fontWeight="600"
                  fontFamily="monospace">
                  {r.dept}
                </text>

                {/* Signal Gauge Bar */}
                <rect
                  x={r.x + 18}
                  y={r.y + 96}
                  width={r.w - 36}
                  height={7}
                  rx={3.5}
                  fill="rgba(255, 255, 255, 0.12)"
                />
                <rect
                  x={r.x + 18}
                  y={r.y + 96}
                  width={(r.w - 36) * (sig / 100)}
                  height={7}
                  rx={3.5}
                  fill={sc}
                />

                {/* Centered Devices & AX Band */}
                <text
                  x={cx}
                  y={r.y + 124}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13.5"
                  fontWeight="800"
                  fontFamily="monospace">
                  {r.devices} {r.devices === 1 ? 'Node' : 'Nodes'} · {r.band}
                </text>
              </g>
            );
          })}

          {/* Access Points with Pulsing Radar Rings */}
          {aps.map(ap => {
            if (!ap.active) return null;
            return (
              <g key={ap.id} className="pointer-events-none">
                <circle cx={ap.cx} cy={ap.cy} r="5" fill="none" stroke={ap.color} strokeWidth="1.5">
                  <animate attributeName="r" from="5" to="20" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.9" to="0" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={ap.cx} cy={ap.cy} r="7" fill="#030712" stroke={ap.color} strokeWidth="2" />
                <circle cx={ap.cx} cy={ap.cy} r="3.5" fill={ap.color} />
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="pt-3.5 mt-2 border-t border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-white font-bold">Optimal</div>
                <div className="text-white/80 text-[11px] whitespace-nowrap">(&ge;80% · &gt;-60 dBm)</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-white font-bold">Good</div>
                <div className="text-white/80 text-[11px] whitespace-nowrap">(60-79% · -60 to -72 dBm)</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-white font-bold">Fair</div>
                <div className="text-white/80 text-[11px] whitespace-nowrap">(45-59% · -72 to -80 dBm)</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-white font-bold">Dead Zone</div>
                <div className="text-white/80 text-[11px] whitespace-nowrap">(&lt;45% · &lt;-80 dBm)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

// ── Fiber-Optic Backbone Health & OTDR Spectral Analyzer ──────────────────────
interface FiberLink {
  id: string;
  name: string;
  distance: string;
  baseAttn: number;
  baseTemp: number;
  ok: boolean;
  note: string;
}

const MAITRI_FIBER_LINKS: FiberLink[] = [
  { id: 'A', name: 'Station Core ↔ Science Wing', distance: '450m', baseAttn: 0.8, baseTemp: -12, ok: true, note: 'Signal optimal across indoor plenum run.' },
  { id: 'B', name: 'Station Core ↔ Living Qtrs', distance: '620m', baseAttn: 1.1, baseTemp: -14, ok: true, note: 'Normal attenuation through thermal conduit.' },
  { id: 'C', name: 'Station ↔ Magnetometer Hut', distance: '1,850m', baseAttn: 4.2, baseTemp: -31, ok: false, note: 'High attenuation — Ice displacement shear stress at 1,180m.' },
  { id: 'D', name: 'Station ↔ AWS Site 3', distance: '2,400m', baseAttn: 2.1, baseTemp: -22, ok: true, note: 'Within polar operating threshold for permafrost line.' },
];

const BHARATI_FIBER_LINKS: FiberLink[] = [
  { id: 'A', name: 'Main Hub ↔ Lab Module', distance: '320m', baseAttn: 0.6, baseTemp: -8, ok: true, note: 'Cryo-jacketed direct run operating at peak margin.' },
  { id: 'B', name: 'Main Hub ↔ AGEOS Pad', distance: '1,200m', baseAttn: 1.4, baseTemp: -11, ok: true, note: 'Optical return loss within nominal spec.' },
  { id: 'C', name: 'Main Hub ↔ Helipad Comms', distance: '850m', baseAttn: 0.9, baseTemp: -9, ok: true, note: 'Direct underground trunk with heat trace active.' },
  { id: 'D', name: 'Main Hub ↔ Ocean Instruments', distance: '1,950m', baseAttn: 1.8, baseTemp: -16, ok: true, note: 'Sub-ice marine tether maintaining stable throughput.' },
];

const FiberBackboneChart: React.FC<{ isMaitri: boolean }> = ({ isMaitri }) => {
  const [selectedTrunkId] = useState<string>('C');
  const [chartMode, setChartMode] = useState<'attenuation' | 'otdr'>('attenuation');
  const [animTick, setAnimTick] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);

  const baseLinks = isMaitri ? MAITRI_FIBER_LINKS : BHARATI_FIBER_LINKS;

  // Seamless live telemetry pulse interval — updates values without canvas re-creation
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimTick(t => (t + 1) % 360);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const links = useMemo(() => {
    return baseLinks.map((l, idx) => {
      const attnDelta = Math.sin(animTick * 0.4 + idx * 1.5) * 0.04;
      const tempDelta = Math.cos(animTick * 0.35 + idx * 1.2) * 0.35;
      return {
        ...l,
        attn: Number((l.baseAttn + attnDelta).toFixed(2)),
        temp: Number((l.baseTemp + tempDelta).toFixed(1)),
      };
    });
  }, [baseLinks, animTick]);

  const selectedLink = links.find(l => l.id === selectedTrunkId) || links[0];

  // 1. Initialize ECharts instance once on mount
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, 'dark');
    chartInst.current = chart;

    const ro = new ResizeObserver(() => {
      if (chart && !chart.isDisposed()) {
        chart.resize();
      }
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartInst.current = null;
    };
  }, []);

  // 2. Seamlessly update chart options with smooth morphing and zero flickering
  useEffect(() => {
    const chart = chartInst.current;
    if (!chart || chart.isDisposed()) return;

    if (chartMode === 'attenuation') {
      chart.setOption({
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 800,
        animationDurationUpdate: 1200,
        animationEasing: 'cubicInOut',
        animationEasingUpdate: 'cubicInOut',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(10,15,30,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          textStyle: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 },
          formatter: (params: any) => {
            const bar = params[0];
            const line = params[1];
            return `<div style="font-weight:bold;margin-bottom:4px;color:#fff">${bar.name}</div>
                    <div style="color:${bar.color}">Attenuation: <strong>${bar.value} dB/km</strong></div>
                    <div style="color:#38bdf8">Conduit Temp: <strong>${line?.value ?? '-'}°C</strong></div>`;
          },
        },
        grid: { top: 25, bottom: 25, left: 45, right: 35 },
        xAxis: {
          type: 'category',
          data: links.map(l => `Trunk ${l.id}`),
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
          axisLabel: { color: '#ffffff', fontSize: 10, fontFamily: 'monospace' },
        },
        yAxis: [
          {
            type: 'value',
            name: 'dB/km',
            nameTextStyle: { color: '#10b981', fontSize: 9, fontFamily: 'monospace' },
            min: 0,
            max: 5.0,
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
            axisLabel: { color: '#ffffff', fontSize: 9, fontFamily: 'monospace' },
          },
          {
            type: 'value',
            name: '°C',
            nameTextStyle: { color: '#38bdf8', fontSize: 9, fontFamily: 'monospace' },
            min: -40,
            max: 0,
            splitLine: { show: false },
            axisLabel: { color: '#38bdf8', fontSize: 9, fontFamily: 'monospace' },
          },
        ],
        series: [
          {
            name: 'Attenuation',
            type: 'bar',
            barWidth: 22,
            data: links.map(l => ({
              value: l.attn,
              itemStyle: {
                color: l.attn > 3.0 ? '#ef4444' : l.attn > 2.0 ? '#f59e0b' : '#10b981',
                borderRadius: [4, 4, 0, 0],
              },
            })),
            markLine: {
              symbol: 'none',
              data: [
                {
                  yAxis: 2.5,
                  lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
                  label: { formatter: 'Threshold: 2.5', position: 'insideEndTop', color: '#f59e0b', fontSize: 9, fontFamily: 'monospace' },
                },
              ],
            },
          },
          {
            name: 'Conduit Temp',
            type: 'line',
            yAxisIndex: 1,
            data: links.map(l => l.temp),
            smooth: true,
            lineStyle: { width: 2, color: '#38bdf8', type: 'dotted' },
            itemStyle: { color: '#38bdf8' },
            symbol: 'circle',
            symbolSize: 6,
          },
        ],
      }, { notMerge: false, lazyUpdate: true });
    } else {
      const distances = [0, 200, 400, 600, 800, 1000, 1180, 1200, 1400, 1600, 1850];
      const isFault = !selectedLink.ok;
      const traceData = distances.map((d, di) => {
        const noise = Math.sin(animTick * 0.5 + di) * 0.03;
        if (isFault) {
          if (d < 1180) return Number((0 - (d / 1000) * 0.9 + noise).toFixed(2));
          return Number((0 - (d / 1000) * 0.9 - 3.2 + noise).toFixed(2));
        }
        return Number((0 - (d / 1000) * selectedLink.attn + noise).toFixed(2));
      });

      chart.setOption({
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 800,
        animationDurationUpdate: 1200,
        animationEasing: 'cubicInOut',
        animationEasingUpdate: 'cubicInOut',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(10,15,30,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          textStyle: { color: '#ffffff', fontFamily: 'monospace', fontSize: 11 },
          formatter: (params: any) => {
            const p = params[0];
            return `<div style="font-weight:bold;margin-bottom:4px;color:#fff">${selectedLink.name}</div>
                    <div style="color:#ffffff">Distance: <strong>${p.name}m</strong></div>
                    <div style="color:#06b6d4">Relative Optical Power: <strong>${p.value} dB</strong></div>`;
          },
        },
        grid: { top: 28, bottom: 25, left: 45, right: 25 },
        xAxis: {
          type: 'category',
          data: distances,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
          axisLabel: { color: '#ffffff', fontSize: 9, fontFamily: 'monospace', formatter: '{value}m' },
        },
        yAxis: {
          type: 'value',
          name: 'Optical Power (dB)',
          nameTextStyle: { color: '#06b6d4', fontSize: 9, fontFamily: 'monospace' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
          axisLabel: { color: '#ffffff', fontSize: 9, fontFamily: 'monospace' },
        },
        series: [
          {
            name: 'OTDR Trace',
            type: 'line',
            data: traceData,
            smooth: false,
            lineStyle: { width: 2.5, color: isFault ? '#ef4444' : '#10b981' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: isFault ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)' },
                { offset: 1, color: 'rgba(0,0,0,0)' },
              ]),
            },
            markPoint: isFault ? {
              data: [
                {
                  name: 'Macro-bend Fault',
                  coord: ['1180', traceData[6]],
                  value: 'Ice Shear (-3.2dB)',
                  itemStyle: { color: '#ef4444' },
                  label: { fontSize: 9, fontFamily: 'monospace', color: '#fff', position: 'top' },
                },
              ],
            } : undefined,
          },
        ],
      }, { notMerge: true, lazyUpdate: true });
    }
  }, [links, chartMode, selectedTrunkId, selectedLink, animTick]);

  return (
    <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-500/06 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-teal-400 font-bold flex items-center gap-2">
          <Network className="w-4 h-4" /> Fiber-Optic Backbone Health
        </div>
        <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={() => setChartMode('attenuation')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${chartMode === 'attenuation' ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30' : 'text-white hover:text-teal-200'}`}>
            Attenuation Profile
          </button>
          <button
            onClick={() => setChartMode('otdr')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${chartMode === 'otdr' ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30' : 'text-white hover:text-teal-200'}`}>
            OTDR Trace
          </button>
        </div>
      </div>

      <div ref={chartRef} className="w-full h-64 rounded-xl bg-black/30 border border-white/5" />
    </div>
  );
};

// ── HF Propagation Chart ──────────────────────────────────────────────────────
const HFPropChart: React.FC<{ currentHour: number }> = ({ currentHour }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.dispose();
    const chart = echarts.init(ref.current, 'dark');
    inst.current = chart;
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const freq5 = hours.map((_, i) => i >= 6 && i <= 18 ? 85 + Math.sin(i * 0.5) * 10 : 35 + Math.random() * 10);
    const freq14 = hours.map((_, i) => i >= 8 && i <= 20 ? 90 + Math.sin(i * 0.4) * 8 : 50 + Math.random() * 10);
    const freq21 = hours.map((_, i) => i >= 4 && i <= 10 ? 80 + Math.random() * 12 : 45 + Math.random() * 10);
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { top: 28, bottom: 25, left: 45, right: 15 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#ffffff', fontSize: 10, fontFamily: 'monospace' },
      },
      legend: {
        data: ['5 MHz', '14 MHz', '21 MHz'],
        textStyle: { color: '#ffffff', fontSize: 10, fontFamily: 'monospace' },
        top: 0,
        right: 15,
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#ffffff', fontSize: 9, interval: 2, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        name: 'Signal %',
        max: 100,
        min: 0,
        axisLabel: { color: '#ffffff', fontSize: 9, fontFamily: 'monospace' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        nameTextStyle: { color: '#ffffff', fontSize: 9, fontFamily: 'monospace' },
      },
      series: [
        {
          name: '5 MHz',
          type: 'line',
          data: freq5,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#38bdf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56,189,248,0.22)' },
              { offset: 1, color: 'rgba(56,189,248,0.01)' },
            ]),
          },
        },
        {
          name: '14 MHz',
          type: 'line',
          data: freq14,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#f59e0b' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245,158,11,0.22)' },
              { offset: 1, color: 'rgba(245,158,11,0.01)' },
            ]),
          },
        },
        {
          name: '21 MHz',
          type: 'line',
          data: freq21,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#818cf8' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(129,140,248,0.22)' },
              { offset: 1, color: 'rgba(129,140,248,0.01)' },
            ]),
          },
        },
        {
          type: 'line',
          data: hours.map((_, i) => i === currentHour ? 100 : null),
          showSymbol: false,
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
          tooltip: { show: false },
        },
      ],
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [currentHour]);
  return <div ref={ref} className="w-full h-52" />;
};

// ── Data Queue Donut ──────────────────────────────────────────────────────────
const DataQueueDonut: React.FC<{ uploadedGb: number; pendingGb: number; color: string }> = ({ uploadedGb, pendingGb, color }) => {
  const total = uploadedGb + pendingGb;
  const pct = total > 0 ? Math.round((uploadedGb / total) * 100) : 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 6px ${color}66)` }} />
        <text x={50} y={46} textAnchor="middle" fill="white" fontSize={13} fontWeight="900" fontFamily="monospace">{pct}%</text>
        <text x={50} y={60} textAnchor="middle" fill={color} fontSize={7} fontFamily="monospace">uploaded</text>
      </svg>
    </div>
  );
};





// ── Modal ───────────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div className="relative z-10 glass-panel rounded-2xl border border-polar-border w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{title}</h3>
        <button onClick={onClose} className="text-white hover:text-sky-300 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      {children}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export const CommunicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const [commData, setCommData] = useState<CommunicationDigitalTwin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<'lan' | 'radio' | 'datapipe'>('lan');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CommunicationAsset | null>(null);
  const [qosThrottled, setQosThrottled] = useState(false);

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
  };

  const fetchCommData = useCallback(async () => {
    try {
      const res = await resourcesApi.getCommunication(stationId);
      if (res?.communication) { setCommData(res.communication); }
    } catch {
      const snapComm = liveSnapshot[stationId]?.communication;
      if (snapComm && (snapComm as any).qos_tiers) setCommData(snapComm as any);
    } finally { setLoading(false); }
  }, [stationId, liveSnapshot]);

  useEffect(() => {
    setLoading(true); setCommData(null);
    fetchCommData();
  }, [stationId]);
  useEffect(() => { const t = setInterval(fetchCommData, 10000); return () => clearInterval(t); }, [fetchCommData]);

  const currentHour = new Date().getHours();

  const comm = commData;
  const syncState = comm?.sync_state ?? 'SYNCHRONIZED';
  const syncColor = syncState === 'SYNCHRONIZED' ? '#10b981' : syncState === 'DEGRADED' ? '#f59e0b' : '#ef4444';
  const bwMbps = comm?.bandwidth_mbps ?? (isMaitri ? 118.5 : 157.2);
  const latMs = comm?.latency_ms ?? (isMaitri ? 78 : 62);
  const lossP = comm?.packet_loss_pct ?? (isMaitri ? 0.05 : 0.02);
  const freshSec = comm?.telemetry_freshness_sec ?? 1.4;
  const bwCapacity = comm?.bandwidth_capacity_mbps ?? (isMaitri ? 120 : 160);
  const utilPct = comm?.bandwidth_utilization_pct ?? Math.round((bwMbps / bwCapacity) * 100);
  const dataConfidence = comm?.data_confidence_pct ?? 99.4;
  const riskScore = comm?.communication_risk?.overall_risk_score ?? 2.0;
  const riskLevel = riskScore > 30 ? 'HIGH' : riskScore > 10 ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? '#ef4444' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981';

  // Environmental parameters
  const snrDb = isMaitri ? 12.4 : 14.8;
  const kIndex = isMaitri ? 3 : 1;
  const kColor = kIndex >= 5 ? '#ef4444' : kIndex >= 3 ? '#f59e0b' : '#10b981';

  // Radio repeater data
  const repeaters = isMaitri ? [
    { name: 'Repeater 1 — Station Roof', battery: 94, solar: 88, status: 'ONLINE', lastComm: '2min', pos: 'Maitri HQ' },
    { name: 'Repeater 2 — Glacier Tip', battery: 28, solar: 42, status: 'LOW BATTERY', lastComm: '8min', pos: '12km NE' },
    { name: 'Repeater 3 — Schirmacher Oasis', battery: 76, solar: 71, status: 'ONLINE', lastComm: '4min', pos: '6km SE' },
  ] : [
    { name: 'Repeater 1 — Helipad Mast', battery: 91, solar: 95, status: 'ONLINE', lastComm: '1min', pos: 'Bharati HQ' },
    { name: 'Repeater 2 — Coastal Ridge', battery: 67, solar: 62, status: 'ONLINE', lastComm: '3min', pos: '8km W' },
    { name: 'Repeater 3 — Ocean Buoy', battery: 45, solar: 38, status: 'DEGRADED', lastComm: '14min', pos: '3km offshore' },
  ];

  // Data pipeline
  const uploadedGb = isMaitri ? 120 : 890;
  const pendingGb = isMaitri ? 42 : 450;
  const etaHrs = Math.round(pendingGb / (bwMbps * 0.125 * 0.6));

  const mockHist = comm?.history ?? Array.from({ length: 20 }, (_, i) => ({
    t_minus_sec: (20 - i) * 30,
    bandwidth_mbps: bwMbps + (Math.random() - 0.5) * 10,
    latency_ms: latMs + (Math.random() - 0.5) * 8,
    packet_loss_pct: Math.max(0, lossP + (Math.random() - 0.5) * 0.1),
  }));

  const layers = [
    { id: 'lan' as const, label: 'LAN & WiFi', icon: <Wifi className="w-4 h-4" />, color: '#10b981' },
    { id: 'radio' as const, label: 'Tactical Radio HF/VHF', icon: <Radio className="w-4 h-4" />, color: '#f59e0b' },
    { id: 'datapipe' as const, label: 'Data Science Pipeline', icon: <Database className="w-4 h-4" />, color: '#f97316' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm font-mono text-sky-300">Loading communication twin state…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 70%, #38bdf808 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, #818cf808 0%, transparent 50%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Signal className="w-8 h-8 text-sky-400" /> Communications
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=communication`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition-all cursor-pointer">
              <Brain className="w-4 h-4" /> Decision Intel
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Bandwidth', val: `${bwMbps} Mbps`, sub: `${utilPct}% of ${bwCapacity}Mbps`, color: '#38bdf8', icon: <Wifi className="w-4 h-4" />, modal: 'data speed' },
            { label: 'Signal Delay', val: `${latMs} ms`, sub: `Jitter ±${comm?.latency_jitter_ms ?? 3}ms`, color: '#10b981', icon: <Activity className="w-4 h-4" />, modal: 'signal delay' },
            { label: 'Packet Loss', val: `${lossP}%`, sub: `${comm?.packets_dropped ?? 422} dropped`, color: lossP < 0.5 ? '#10b981' : '#f59e0b', icon: <Signal className="w-4 h-4" />, modal: 'packet_loss' },
            { label: 'SNR', val: `${snrDb} dB`, sub: snrDb < 8 ? '⚠️ Below threshold' : 'Signal quality good', color: snrDb < 8 ? '#ef4444' : '#10b981', icon: <Gauge className="w-4 h-4" />, modal: 'snr' },
          ].map(kpi => (
            <div key={kpi.label} onClick={() => setActiveModal(kpi.modal)}
              className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center justify-between text-[10px] font-mono text-white font-bold mb-1">
                <span className="uppercase">{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div className="text-lg font-black font-mono" style={{ color: kpi.color }}>{kpi.val}</div>
              <div className="text-[10px] font-mono text-white/90 font-medium mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Layer Navigation ── */}
      <div className="flex gap-2 flex-wrap">
        {layers.map(l => (
          <button key={l.id} onClick={() => setActiveLayer(l.id)}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all border cursor-pointer"
            style={activeLayer === l.id
              ? { background: `${l.color}22`, borderColor: `${l.color}66`, color: l.color }
              : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LAN & WiFi
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'lan' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Wifi className="w-6 h-6" />}
              title="Local Area Network — LAN & WiFi Coverage Command"
              color="#10b981"
              layer="LAN & WiFi"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* WiFi Floor Plan */}
              <div className="lg:col-span-2">
                <WiFiFloorPlan isMaitri={isMaitri} />
              </div>

              {/* Server Room + Fiber */}
              <div className="space-y-4">
                {/* Server Room Monitor */}
                <div className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/06 space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                    <Server className="w-4 h-4" /> Server Room Environmental Monitor
                  </div>
                  {[
                    { label: 'Rack Temperature', val: isMaitri ? 19 : 21, max: 35, unit: '°C', color: '#06b6d4', warnAt: 25 },
                    { label: 'Relative Humidity', val: isMaitri ? 42 : 48, max: 80, unit: '%', color: '#818cf8', warnAt: 70 },
                    { label: 'Power Load', val: isMaitri ? 68 : 74, max: 100, unit: '%', color: '#10b981', warnAt: 85 },
                    { label: 'UPS Battery', val: isMaitri ? 94 : 98, max: 100, unit: '%', color: '#10b981', warnAt: 20 },
                  ].map(m => {
                    const warn = m.label.includes('Battery') ? m.val < m.warnAt : m.val > m.warnAt;
                    return (
                      <div key={m.label} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-white font-bold">{m.label}</span>
                          <span className="font-bold" style={{ color: warn ? '#ef4444' : m.color }}>{m.val}{m.unit}{warn ? ' ⚠️' : ''}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(m.val / m.max) * 100}%`, background: warn ? '#ef4444' : m.color }} />
                        </div>
                      </div>
                    );
                  })}
                  {(isMaitri ? 19 : 21) > 25 && (
                    <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-500/12 text-[9px] font-mono text-red-300 font-bold">
                      🌡 Server room temperature critical — Emergency cooling fans activated
                    </div>
                  )}
                </div>

                {/* Fiber-Optic Backbone Health & OTDR Spectral Analyzer */}
                <FiberBackboneChart isMaitri={isMaitri} />
              </div>
            </div>

            {/* LAN Hardware Assets */}
            {(comm?.assets ?? []).length > 0 && (
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> Communication Hardware Subsystems — Click to Inspect
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(comm?.assets ?? []).map(asset => {
                    const isOk = asset.status.includes('ONLINE') || asset.status.includes('CONNECTED') || asset.status.includes('OPERATIONAL');
                    const sc = isOk ? '#10b981' : '#f59e0b';
                    const hp = asset.health_pct ?? 95;
                    return (
                      <div key={asset.id} onClick={() => setSelectedAsset(asset)}
                        className="glass-panel p-4 rounded-2xl border border-polar-border hover:border-sky-500/40 cursor-pointer transition-all shadow-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-mono font-bold text-white">{asset.name}</div>
                            <div className="text-[10px] font-mono text-sky-300 font-medium mt-0.5">{asset.subsystem}</div>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold shrink-0"
                            style={{ borderColor: `${sc}44`, background: `${sc}11`, color: sc }}>
                            {asset.status.split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg viewBox="0 0 48 48" width="48" height="48">
                            <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <circle cx="24" cy="24" r="18" fill="none" stroke={sc} strokeWidth="6" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 18 * (hp / 100)} ${2 * Math.PI * 18}`}
                              transform="rotate(-90 24 24)" />
                            <text x="24" y="28" textAnchor="middle" fill="white" fontSize="9" fontWeight="900" fontFamily="monospace">{hp}%</text>
                          </svg>
                          <div className="text-xs font-mono space-y-1">
                            <div className="text-white font-medium">Power: <span className="font-bold text-amber-300">{asset.power_draw_kw} kW</span></div>
                            <div className="text-white font-medium">Health: <span className="font-bold" style={{ color: sc }}>{hp}%</span></div>
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-white bg-polar-darker/80 px-2 py-1 rounded border border-polar-border/50 truncate">
                          {asset.source_provenance}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TACTICAL RADIO HF/VHF
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'radio' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Radio className="w-6 h-6" />}
              title="Tactical Radio — HF/VHF Field Communications"
              color="#f59e0b"
              layer="Tactical Radio"
            />

            <div className="space-y-6 mb-5">
              {/* 1. HF Propagation Forecast & VHF Field Operations (Horizontal Section) */}
              <div className="p-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/06 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/8">
                  <div className="text-xs font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4" /> HF Propagation Forecast
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-white font-semibold">Current Station Time:</span>
                    <span className="font-bold text-yellow-300">{currentHour}:00 UTC</span>
                    <span className="text-white/40">|</span>
                    <span className="text-yellow-300 font-bold">
                      {currentHour >= 6 && currentHour <= 18 ? 'Daytime (F2-Layer Active)' : 'Nighttime (F-Layer Collapse)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Wide HF Curve & Physics Banner (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <HFPropChart currentHour={currentHour} />
                    <div className="p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/08 text-xs font-mono text-yellow-300 flex items-center gap-2.5">
                      <Radio className="w-4 h-4 flex-shrink-0 text-yellow-400" />
                      <span>
                        <strong>Ionosphere:</strong> {currentHour >= 6 && currentHour <= 18 ? 'Daytime — F2 layer active — Higher frequencies (14 MHz) preferred for trans-continental links.' : 'Nighttime — F layer collapses — Shift to lower frequencies (5MHz)'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Best Frequencies & VHF Field Teams (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    {/* Best Frequencies */}
                    <div className="p-4 rounded-xl border border-yellow-500/25 bg-black/40 space-y-2.5">
                      <div className="text-xs font-mono font-bold text-yellow-300 flex items-center justify-between">
                        <span>Best Frequencies Right Now:</span>
                        <span className="text-[10px] text-amber-300 font-bold">SNR Ranking</span>
                      </div>
                      {[
                        { freq: '5 MHz', quality: currentHour >= 6 && currentHour <= 18 ? 85 : 35, use: 'Medium range — Daytime' },
                        { freq: '14 MHz', quality: currentHour >= 8 && currentHour <= 20 ? 90 : 50, use: 'Long range — Day/Dusk' },
                        { freq: '21 MHz', quality: currentHour >= 4 && currentHour <= 10 ? 80 : 45, use: 'ISRO/Cape Town backup' },
                      ].map(f => (
                        <div key={f.freq} className="flex items-center justify-between border-b border-white/5 pb-2 text-xs font-mono">
                          <div>
                            <span className="font-bold text-white text-[13px]">{f.freq}</span>
                            <span className="text-white ml-2 text-[11px] font-medium">{f.use}</span>
                          </div>
                          <Pill label={f.quality > 70 ? 'BEST' : f.quality > 50 ? 'OK' : 'POOR'} color={f.quality > 70 ? '#10b981' : f.quality > 50 ? '#f59e0b' : '#ef4444'} small />
                        </div>
                      ))}
                    </div>

                    {/* VHF field team status */}
                    <div className="p-4 rounded-xl border border-polar-border bg-black/40 space-y-2.5">
                      <div className="text-[11px] font-mono font-bold text-white flex items-center justify-between uppercase">
                        <span>VHF Field Team Radio Status</span>
                        <span className="text-[10px] text-sky-300 font-bold">Active Handhelds</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { team: 'Team Alpha', freq: 'VHF Ch.1', status: 'CLEAR', last: '2min' },
                          { team: 'Team Beta', freq: 'VHF Ch.2', status: 'RECOVERING', last: '12min' },
                          { team: 'Team Gamma', freq: 'VHF Ch.3', status: 'CLEAR', last: '5min' },
                        ].map(t => (
                          <div key={t.team} className="p-2.5 rounded-lg border border-polar-border bg-polar-dark/60 text-xs font-mono space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-bold text-[11px]">{t.team}</span>
                              <span className="w-2 h-2 rounded-full" style={{ background: t.status === 'CLEAR' ? '#10b981' : '#f59e0b' }} />
                            </div>
                            <div className="text-white text-[10px] font-semibold">{t.freq}</div>
                            <Pill label={t.status} color={t.status === 'CLEAR' ? '#10b981' : '#f59e0b'} small />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Remote Repeater Station Status & Inter-Station Links (Horizontal Section below Section 1) */}
              <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/06 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/8">
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                    <Signal className="w-4 h-4" /> Remote Repeater Station Status
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-white font-medium">
                    <span>Repeaters: <strong className="text-white">3 Nodes Online</strong></span>
                    <span className="text-white/40">|</span>
                    <span>Status: <strong className="text-amber-400">1 Low Battery Warning</strong></span>
                  </div>
                </div>

                {/* 3 Repeaters arranged horizontally side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {repeaters.map(r => {
                    const battColor = r.battery < 30 ? '#ef4444' : r.battery < 60 ? '#f59e0b' : '#10b981';
                    const statColor = r.status === 'ONLINE' ? '#10b981' : r.status === 'DEGRADED' ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={r.name} className={`p-4 rounded-xl border transition-all space-y-3 ${r.battery < 30 ? 'border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/10' : 'border-polar-border bg-polar-dark/50'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-mono font-bold text-white">{r.name}</div>
                            <div className="text-[10px] font-mono text-white/90 font-medium">{r.pos} · Last: {r.lastComm} ago</div>
                          </div>
                          <Pill label={r.status} color={statColor} pulse={r.status !== 'ONLINE'} small />
                        </div>
                        <div className="space-y-2">
                          <BarMeter label="Battery" value={r.battery} max={100} unit="%" color={battColor} />
                          <BarMeter label="Solar Charge" value={r.solar} max={100} unit="%" color="#f59e0b" />
                        </div>
                        {r.battery < 30 && (
                          <div className="text-[10px] font-mono text-red-300 font-bold border border-red-500/40 bg-red-500/15 px-2.5 py-1.5 rounded-lg animate-pulse">
                            ⚠️ LOW BATTERY — Field team will lose contact in ~{Math.round(r.battery / 5)} hours
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DATA SCIENCE PIPELINE
      ══════════════════════════════════════════════════════════════════ */}
      {activeLayer === 'datapipe' && (
        <div className="space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-polar-border shadow-xl">
            <SectionDivider
              icon={<Database className="w-6 h-6" />}
              title={isMaitri ? 'Scientific Data Pipeline — Maitri AWS/Seismic Uplink' : 'AGEOS Data Pipeline — ISRO Satellite Downlink & Upload'}
              color="#f97316"
              layer="Data Science Pipeline"
            />


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* Upload Queue */}
              <div className="p-5 rounded-2xl border border-orange-500/30 bg-orange-500/06 space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Data-to-Go Upload Queue
                </div>
                <div className="flex items-center justify-center gap-6">
                  <DataQueueDonut uploadedGb={uploadedGb} pendingGb={pendingGb} color="#f97316" />
                  <div className="space-y-2 text-[10px] font-mono">
                    <div><span className="text-white font-bold">Uploaded Today</span><div className="text-lg font-black text-emerald-400">{uploadedGb} GB</div></div>
                    <div><span className="text-white font-bold">In Queue</span><div className="text-lg font-black text-orange-400">{pendingGb} GB</div></div>
                    <div><span className="text-white font-bold">ETA to Clear</span><div className="text-sm font-black text-amber-300">{etaHrs}h</div></div>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/08 text-[9px] font-mono text-orange-300">
                  Upload Queue: <span className="font-bold">{pendingGb} GB</span> · ETA to clear at current bandwidth: <span className="font-bold">{etaHrs} Hours</span>
                </div>
                <BarMeter label="Upload Progress" value={uploadedGb} max={uploadedGb + pendingGb} unit=" GB" color="#f97316" sub={`${Math.round((uploadedGb / (uploadedGb + pendingGb)) * 100)}% of daily quota uploaded`} />
                <div className="space-y-1.5">
                  {(isMaitri ? [
                    { type: 'AWS Telemetry', size: 12, status: 'UPLOADING' },
                    { type: 'Seismic Data', size: 8, status: 'QUEUED' },
                    { type: 'Magnetometer Logs', size: 4, status: 'QUEUED' },
                    { type: 'Ice Core Images', size: 18, status: 'QUEUED' },
                  ] : [
                    { type: 'IRS-P6 Imagery (AGEOS)', size: 280, status: 'DOWNLOADING' },
                    { type: 'Resourcesat-3 Data', size: 150, status: 'QUEUED' },
                    { type: 'Ocean Colour Monitor', size: 20, status: 'UPLOADING' },
                    { type: 'Chlorophyll Dataset', size: 0.4, status: 'DONE' },
                  ]).map(item => (
                    <div key={item.type} className="flex items-center justify-between text-[9px] font-mono border-b border-white/5 pb-1">
                      <span className="text-white font-bold">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-extrabold">{item.size}GB</span>
                        <Pill label={item.status} color={item.status === 'DONE' ? '#10b981' : item.status === 'UPLOADING' || item.status === 'DOWNLOADING' ? '#06b6d4' : '#38bdf8'} pulse={item.status === 'UPLOADING' || item.status === 'DOWNLOADING'} small />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Link Performance History (placed in the space of the 2 removed sections) */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-polar-border space-y-3 flex flex-col justify-between">
                <div className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-400" /> Link Performance History (Last 20 Telemetry Ticks)
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <LinkPerformanceChart hist={mockHist} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* ── KPI Drilldown Modals ── */}
          {activeModal === 'data speed' && (
            <Modal title="Link Bandwidth & Throughput Breakdown" onClose={() => setActiveModal(null)}>
              <div className="space-y-3 text-xs font-mono text-white">
                {[
                  { l: 'Total Capacity', v: `${bwCapacity} Mbps`, c: '#ffffff' },
                  { l: 'Active Throughput', v: `${bwMbps} Mbps`, c: '#38bdf8' },
                  { l: 'Channel Utilization', v: `${utilPct}%`, c: '#10b981' },
                  { l: 'Available Headroom', v: `${(bwCapacity - bwMbps).toFixed(1)} Mbps`, c: '#06b6d4' },
                  { l: 'Tier 1 (Safety/ACS)', v: '35% — 32 Mbps', c: '#10b981' },
                  { l: 'Tier 2 (Science)', v: '45% — 48 Mbps', c: '#06b6d4' },
                  { l: 'Tier 3 (Crew)', v: `20% — ${qosThrottled ? 6 : 22} Mbps`, c: qosThrottled ? '#ef4444' : '#ffffff' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                    <span className="text-white font-semibold">{r.l}</span>
                    <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Modal>
          )}
          {activeModal === 'signal delay' && (
            <Modal title="Round-Trip Signal Delay & Jitter Profile" onClose={() => setActiveModal(null)}>
              <div className="space-y-3 text-xs font-mono text-white">
                {[
                  { l: 'Current Delay', v: `${latMs} ms`, c: '#10b981' },
                  { l: '24-Hour Average', v: `${comm?.latency_avg_ms ?? 76} ms`, c: '#ffffff' },
                  { l: 'Peak Observed', v: `${comm?.latency_peak_ms ?? 94} ms`, c: '#f59e0b' },
                  { l: 'Jitter', v: `±${comm?.latency_jitter_ms ?? 3} ms`, c: '#06b6d4' },
                  { l: 'Trend', v: comm?.latency_trend ?? 'STABLE', c: '#10b981' },
                  { l: 'Satellite Altitude', v: '35,786 km (GEO)', c: '#818cf8' },
                  { l: 'Speed-of-light one-way', v: '~119 ms', c: '#ffffff' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                    <span className="text-white font-semibold">{r.l}</span>
                    <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Modal>
          )}
          {activeModal === 'packet_loss' && (
            <Modal title="Packet Delivery & Frame Statistics" onClose={() => setActiveModal(null)}>
              <div className="space-y-3 text-xs font-mono text-white">
                {[
                  { l: 'Drop Rate', v: `${lossP}%`, c: lossP < 0.5 ? '#10b981' : '#f59e0b' },
                  { l: 'Total Sent', v: (comm?.packets_sent ?? 842100).toLocaleString(), c: '#ffffff' },
                  { l: 'Received', v: (comm?.packets_received ?? 841678).toLocaleString(), c: '#10b981' },
                  { l: 'Dropped', v: `${comm?.packets_dropped ?? 422}`, c: '#ef4444' },
                  { l: 'Status', v: comm?.packet_loss_status ?? 'OPTIMAL', c: '#10b981' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                    <span className="text-white font-semibold">{r.l}</span>
                    <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Modal>
          )}
          {activeModal === 'snr' && (
            <Modal title="Signal-to-Noise Ratio Analysis" onClose={() => setActiveModal(null)}>
              <div className="space-y-3 text-xs font-mono text-white">
                {[
                  { l: 'Current SNR', v: `${snrDb} dB`, c: snrDb < 8 ? '#ef4444' : '#10b981' },
                  { l: 'Alert Threshold', v: '8.0 dB', c: '#f59e0b' },
                  { l: 'Band', v: isMaitri ? 'C-Band (uplink)' : 'Ku-Band (AGEOS primary)', c: '#818cf8' },
                  { l: 'Dish Size', v: isMaitri ? '2.4m Radome' : 'Dual 3.0m Radomes', c: '#ffffff' },
                  { l: 'Cause if low', v: 'Snow on radome, rain fade, misalignment', c: '#f59e0b' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                    <span className="text-white font-semibold">{r.l}</span>
                    <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Modal>
          )}
          {activeModal === 'solar' && (
            <Modal title="Solar Weather & Geomagnetic Conditions" onClose={() => setActiveModal(null)}>
              <div className="space-y-3 text-xs font-mono text-white">
                {[
                  { l: 'K-Index', v: `${kIndex} (${kIndex >= 5 ? 'Storm' : kIndex >= 3 ? 'Active' : 'Quiet'})`, c: kColor },
                  { l: 'Geomagnetic Activity', v: kIndex >= 5 ? 'STORM' : kIndex >= 3 ? 'ACTIVE' : 'QUIET', c: kColor },
                  { l: 'Radio Blackout Risk', v: kIndex >= 6 ? 'R3 HIGH' : kIndex >= 4 ? 'R1 MINOR' : 'None', c: kIndex >= 4 ? '#ef4444' : '#10b981' },
                  { l: 'Satcom Disruption', v: kIndex >= 5 ? 'Expected 3–4 hours' : 'None expected', c: kIndex >= 5 ? '#ef4444' : '#10b981' },
                  { l: 'HF Impact', v: kIndex >= 5 ? 'Blackout risk on HF' : 'Propagation normal', c: kIndex >= 5 ? '#f97316' : '#10b981' },
                  { l: 'Aurora Probability', v: kIndex >= 5 ? 'Very High (visible even at station)' : 'Low', c: '#818cf8' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                    <span className="text-white font-semibold">{r.l}</span>
                    <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Modal>
          )}
          {activeModal === 'freshness' && (
            <Modal title="Digital Twin Telemetry Stream Health" onClose={() => setActiveModal(null)}>
              <div className="space-y-3 text-xs font-mono text-white">
                {[
                  { l: 'Current Freshness', v: `${freshSec}s`, c: '#818cf8' },
                  { l: 'Expected Interval', v: `${comm?.expected_interval_sec ?? 2.0}s`, c: '#ffffff' },
                  { l: 'Data Confidence', v: `${dataConfidence}%`, c: '#10b981' },
                  { l: 'Completeness', v: `${comm?.data_completeness_pct ?? 99.8}%`, c: '#06b6d4' },
                  { l: 'Domains Synced', v: '16 of 16', c: '#10b981' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                    <span className="text-white font-semibold">{r.l}</span>
                    <span className="font-bold" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Modal>
          )}

          {/* Asset detail modal */}
          {selectedAsset && (
            <Modal title={`Asset: ${selectedAsset.name}`} onClose={() => setSelectedAsset(null)}>
              <div className="space-y-3 text-xs font-mono text-white">
                {[
                  { l: 'Status', v: selectedAsset.status, c: '#10b981' },
                  { l: 'Health Index', v: `${selectedAsset.health_pct}%`, c: '#10b981' },
                  { l: 'Power Draw', v: `${selectedAsset.power_draw_kw} kW`, c: '#f59e0b' },
                  { l: 'Power Source', v: selectedAsset.power_source, c: '#ffffff' },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-polar-border/30 pb-2">
                    <span className="text-white font-semibold">{r.l}</span>
                    <span className="font-bold truncate max-w-[200px] text-right" style={{ color: r.c }}>{r.v}</span>
                  </div>
                ))}
                <div className="p-2.5 rounded-lg bg-polar-dark border border-polar-border text-[10px] text-white">
                  <div className="font-bold text-sky-300 mb-1">Operating Condition</div>
                  <p>{selectedAsset.operating_condition}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-polar-dark border border-sky-500/30 text-[10px] text-cyan-300">
                  <div className="font-bold mb-1">Recent Event</div>
                  <p>{selectedAsset.recent_event}</p>
                </div>
              </div>
            </Modal>
          )}

          <style>{`
        @keyframes flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      `}</style>
        </div>
      );
};

      export default CommunicationPage;
