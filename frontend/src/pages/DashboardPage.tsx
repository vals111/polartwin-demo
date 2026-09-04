import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { SparklineChart } from '../components/charts/SparklineChart';
import {
  Compass, ArrowRight, Thermometer, Wind, Zap, Droplet,
  Flame, Waves, Cpu, Layers, Box, Activity, Anchor, PlaneTakeoff,
  Shield, AlertTriangle, TrendingUp, Globe
} from 'lucide-react';





// ── Station Card (Industrial HMI Style) ───────────────────────────────────────
const StationCard: React.FC<{
  stationId: string;
  name: string;
  subtitle: string;
  founded: string;
  locationType: string;
  coords: string;
  locDesc: string;
  desc: string;
  systems: Array<{ icon: React.ComponentType<any>; title: string; detail: string; color: string }>;
  telemetry: Array<{ label: string; value: string; color: string }>;
  riskLevel: string;
  riskScore: number;
  alertCount: number;
  accentColor: string;
  borderColor: string;
  shadowColor: string;
  genHistory: number[];
  fuelHistory: number[];
  onLaunch: () => void;
}> = ({
  stationId, name, subtitle, founded, locationType, coords, locDesc, desc,
  systems, telemetry, riskLevel, riskScore, alertCount,
  accentColor, borderColor, shadowColor, genHistory, fuelHistory, onLaunch,
}) => {
  return (
    <div
      className="glass-panel rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-2xl group"
      style={{ border: `2px solid ${borderColor}`, boxShadow: `0 0 40px ${shadowColor}` }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-15 group-hover:opacity-25 transition-opacity"
        style={{ background: accentColor }}
      />

      {/* Top scan line animation */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-50"
        style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`, animation: 'shimmer 3s ease-in-out infinite' }}
      />

      <div className="p-6 flex flex-col gap-5 flex-1">
        {/* Identity row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md font-bold"
                style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}
              >
                {locationType}
              </span>
              <span className="text-[9px] font-mono text-slate-500 bg-polar-dark px-2 py-0.5 rounded border border-polar-border">Est. {founded}</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase mt-1 group-hover:text-opacity-90 transition-all" style={{ letterSpacing: '0.05em' }}>
              {name}
            </h2>
            <div className="text-[10px] font-mono mt-0.5 flex items-center gap-1.5" style={{ color: accentColor }}>
              <span>{coords}</span>
              <span>•</span>
              <span>{locDesc}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: accentColor }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
              <span>LIVE</span>
            </div>
            {alertCount > 0 && (
              <div className="flex items-center gap-1 text-[9px] font-mono text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>{alertCount} alerts</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>

        {/* Engineering systems */}
        <div
          className="p-3.5 rounded-2xl border space-y-2"
          style={{ background: 'rgba(7,19,34,0.8)', borderColor: `${accentColor}22` }}
        >
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex justify-between">
            <span>Engineering Architecture</span>
            <span style={{ color: accentColor }}>Unique Systems</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {systems.map((sys) => {
              const Icon = sys.icon;
              return (
                <div key={sys.title} className="flex items-center gap-2 bg-polar-navy/40 p-2 rounded-xl border border-polar-border/30">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sys.color }} />
                  <div>
                    <div className="text-[10px] font-bold text-white leading-tight">{sys.title}</div>
                    <div className="text-[9px] text-slate-500 leading-tight">{sys.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live telemetry readout */}
        <div className="grid grid-cols-2 gap-2">
          {telemetry.map((t) => (
            <div
              key={t.label}
              className="rounded-xl p-2.5 text-center border"
              style={{ background: 'rgba(3,10,18,0.9)', borderColor: `${accentColor}20` }}
            >
              <div className="text-[9px] text-slate-500 font-mono">{t.label}</div>
              <div className="text-base font-black font-mono mt-0.5" style={{ color: t.color }}>{t.value}</div>
            </div>
          ))}
        </div>

        {/* Sparkline mini-charts */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-mono text-slate-500 mb-1 flex justify-between">
              <span>Gen Load</span>
              <span style={{ color: '#f59e0b' }}>{genHistory[genHistory.length - 1]?.toFixed(0)} kW</span>
            </div>
            <SparklineChart data={genHistory} color="#f59e0b" height={36} showArea />
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-500 mb-1 flex justify-between">
              <span>Fuel Level</span>
              <span style={{ color: accentColor }}>{fuelHistory[fuelHistory.length - 1]?.toFixed(0)}%</span>
            </div>
            <SparklineChart data={fuelHistory} color={accentColor} height={36} showArea />
          </div>
        </div>
      </div>

      {/* Footer action row */}
      <div
        className="px-6 py-4 border-t flex items-center justify-between"
        style={{ borderColor: `${accentColor}20` }}
      >
        <div className="text-xs font-mono">
          <span className="text-slate-500">Risk: </span>
          <span className="font-bold" style={{ color: riskLevel === 'LOW' ? '#10b981' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444' }}>
            {riskLevel}
          </span>
          <span className="text-slate-600 ml-1">({riskScore} pts)</span>
        </div>

        <button
          onClick={onLaunch}
          className="flex items-center gap-2 px-5 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-[1.03] active:scale-[0.97]"
          style={{
            background: `linear-gradient(to right, ${accentColor}cc, ${accentColor})`,
            boxShadow: `0 0 24px ${shadowColor}`,
          }}
        >
          <span>Launch Twin</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectStation, loadStations } = useStationStore();
  const { liveSnapshot, liveRisk } = useTelemetryStore();
  const { alerts, loadAlerts } = useAlertStore();
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  useEffect(() => {
    loadStations();
    loadAlerts('maitri');
    loadAlerts('bharati');
  }, [loadStations, loadAlerts]);

  const activeAlerts = [
    ...(alerts['maitri'] || []),
    ...(alerts['bharati'] || []),
  ];

  const handleLaunchStation = (stationId: string) => {
    selectStation(stationId);
    navigate(`/station/${stationId}`);
  };

  const maitriSnap = liveSnapshot['maitri'];
  const maitriRisk = liveRisk['maitri'];
  const bharatiSnap = liveSnapshot['bharati'];
  const bharatiRisk = liveRisk['bharati'];

  const genHist = (base: number) =>
    Array.from({ length: 20 }, () => base + (Math.random() - 0.5) * 15);
  const fuelHist = (base: number) =>
    Array.from({ length: 20 }, (_, i) => Math.max(0, base - i * 0.4 + (Math.random() - 0.5))).reverse();

  return (
    <div className="space-y-0 max-w-7xl mx-auto">
      <div className="py-6 space-y-8">
        {/* Command Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-widest uppercase">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>National Centre for Polar and Ocean Research (NCPOR)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase" style={{ letterSpacing: '0.06em' }}>
            Mission Command Center
          </h1>
        </div>

        {/* Station Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <StationCard
            stationId="maitri"
            name="Maitri Station"
            subtitle="Inland Research Base"
            founded="1989"
            locationType="Inland Research Base"
            coords="70°45′57″S 11°44′09″E"
            locDesc="Schirmacher Oasis · 130m · ~100km Inland"
            desc="Situated on rocky ice-free terrain surrounded by the Antarctic ice sheet. Features the heated freshwater pipeline from Priyadarshini (Zub) Lake, high-temperature waste incinerators, and overland tracked convoys navigating blue ice moraines."
            systems={[
              { icon: Droplet, title: 'Lake Zub Pipeline', detail: 'Trace-Heated Overland', color: '#06b6d4' },
              { icon: Flame, title: 'Waste Incinerator', detail: 'High-Temp Zero-Discharge', color: '#f59e0b' },
              { icon: Zap, title: '2×100 kVA Microgrid', detail: 'Diesel + Heat Recovery', color: '#fbbf24' },
              { icon: PlaneTakeoff, title: 'Blue Ice Runway', detail: 'DROMLAN Aviation', color: '#818cf8' },
            ]}
            telemetry={[
              { label: 'Ambient Temp', value: `${maitriSnap?.environment?.temperature?.toFixed(1) ?? -25.4}°C`, color: '#06b6d4' },
              { label: 'Katabatic Wind', value: `${maitriSnap?.environment?.wind_speed ?? 34} km/h`, color: '#e2e8f0' },
              { label: 'Generator Load', value: `${maitriSnap?.energy?.generator_load ?? 68} kW`, color: '#f59e0b' },
              { label: 'Fuel Autonomy', value: `${maitriSnap?.fuel?.days_remaining ?? 19}d`, color: '#10b981' },
            ]}
            riskLevel={maitriRisk?.level || 'LOW'}
            riskScore={maitriRisk?.score || 18}
            alertCount={(alerts['maitri'] || []).length}
            accentColor="#06b6d4"
            borderColor="rgba(6,182,212,0.4)"
            shadowColor="rgba(6,182,212,0.12)"
            genHistory={genHist(maitriSnap?.energy?.generator_load ?? 68)}
            fuelHistory={fuelHist(maitriSnap?.fuel?.fuel_percentage ?? 77)}
            onLaunch={() => handleLaunchStation('maitri')}
          />

          <StationCard
            stationId="bharati"
            name="Bharati Station"
            subtitle="Coastal Marine Base"
            founded="2012"
            locationType="Coastal Marine Base"
            coords="69°24′28″S 76°11′14″E"
            locDesc="Larsemann Hills · Prydz Bay Promontory"
            desc="State-of-the-art modular container station raised on aerodynamic hydraulic stilts between Thala Fjord and Quilty Bay. Features seawater RO desalination, automated CHP co-generation, and marine resupply logistics."
            systems={[
              { icon: Waves, title: 'Quilty Bay RO Desal', detail: 'Seawater Desalination', color: '#60a5fa' },
              { icon: Cpu, title: '3×100 kVA Auto CHP', detail: 'Co-Generation Thermal', color: '#10b981' },
              { icon: Layers, title: '134-Container Frame', detail: 'Aerodynamic Stilt Lift', color: '#818cf8' },
              { icon: Anchor, title: 'Prydz Bay Berthing', detail: 'Vessel Resupply Channel', color: '#2dd4bf' },
            ]}
            telemetry={[
              { label: 'Ambient Temp', value: `${bharatiSnap?.environment?.temperature?.toFixed(1) ?? -18.2}°C`, color: '#60a5fa' },
              { label: 'Maritime Wind', value: `${bharatiSnap?.environment?.wind_speed ?? 28} km/h`, color: '#e2e8f0' },
              { label: 'CHP Load', value: `${bharatiSnap?.energy?.generator_load ?? 74} kW`, color: '#f59e0b' },
              { label: 'Fuel Autonomy', value: `${bharatiSnap?.fuel?.days_remaining ?? 21}d`, color: '#10b981' },
            ]}
            riskLevel={bharatiRisk?.level || 'LOW'}
            riskScore={bharatiRisk?.score || 16}
            alertCount={(alerts['bharati'] || []).length}
            accentColor="#60a5fa"
            borderColor="rgba(96,165,250,0.4)"
            shadowColor="rgba(96,165,250,0.12)"
            genHistory={genHist(bharatiSnap?.energy?.generator_load ?? 74)}
            fuelHistory={fuelHist(bharatiSnap?.fuel?.fuel_percentage ?? 74)}
            onLaunch={() => handleLaunchStation('bharati')}
          />
        </div>
      </div>
    </div>
  );
};
