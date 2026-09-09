import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import {
  Users, Heart, Moon, Sun, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Activity, CheckCircle2, UserCheck, Coffee, Zap
} from 'lucide-react';

export const PersonnelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const isMaitri = stationId === 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();

  const station = stations.find((s) => s.station_id === stationId) || {
    station_id: stationId,
    name: isMaitri ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: isMaitri ? 'inland' : 'coastal',
  };

  const snapshot = liveSnapshot[stationId];
  const pers = snapshot?.personnel;

  const headcount = pers?.headcount ?? (isMaitri ? 25 : 30);
  const bedCapacity = isMaitri ? 30 : 47;
  const occupancyPct = Math.round((headcount / bedCapacity) * 100);

  const roles = isMaitri
    ? [
        { role: 'Research Scientists', count: 10, pct: 40, color: 'bg-pink-400', desc: 'Meteorology, seismology, glaciology' },
        { role: 'Engineers & Techs', count: 10, pct: 40, color: 'bg-cyan-400', desc: 'Generators, HVAC, electrical grid' },
        { role: 'Medical Officer', count: 1, pct: 4, color: 'bg-emerald-400', desc: 'Trauma & polar medicine bay' },
        { role: 'Logistics & Galley', count: 4, pct: 16, color: 'bg-amber-400', desc: 'Food rations & tracked tractors' }
      ]
    : [
        { role: 'Research Scientists', count: 12, pct: 40, color: 'bg-pink-400', desc: 'Atmospheric LiDAR, satellite telemetry' },
        { role: 'Engineers & Techs', count: 12, pct: 40, color: 'bg-cyan-400', desc: 'CHP plant, SWRO desalination' },
        { role: 'Medical Officer', count: 1, pct: 3.3, color: 'bg-emerald-400', desc: 'Surgical unit & telemedicine' },
        { role: 'Logistics & Galley', count: 5, pct: 16.7, color: 'bg-amber-400', desc: 'Barge ops & Ka-32 heli support' }
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Operational Domain • Crew Welfare & Life Support Demand
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {station.name} • {isMaitri ? '45th ISEA Winter-Over (Day 142)' : 'Winter-Over Expedition (Day 138)'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Personnel, Occupancy & Human Factors
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl">
              Expedition crew safety, circadian sleep rhythms, habitat occupancy load, domestic resource draw, and scheduled maintenance work shift coverage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-2 transition-all shadow-md"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>All 9 Domains</span>
            </button>
            <button
              onClick={() => navigate(isMaitri ? '/station/bharati/personnel' : '/station/maitri/personnel')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* Live Status KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Active Headcount</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{headcount} Crew</div>
            <div className="text-[10px] text-purple-300 mt-0.5">100% Accounted Inside Module</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Habitation Capacity</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{occupancyPct}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{headcount} / {bedCapacity} Total Berths</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Rest / Fatigue State</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{isMaitri ? '1 Alert' : '0 Alerts'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isMaitri ? '1 Operator <4.5h Rest' : 'All Shifts Nominal'}</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Resource Demand Factor</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{isMaitri ? '+2.4 kW' : '+2.5 kW'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Per-person energy & water load</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Expedition Roster & Roles */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-400" />
            Winter-Over Expedition Roster
          </h3>

          <div className="space-y-3">
            {roles.map((r) => (
              <div key={r.role} className="p-3 rounded-xl bg-polar-dark/70 border border-polar-border space-y-1.5">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="font-bold text-slate-200">{r.role}</span>
                  <span className="font-bold text-white">{r.count} personnel</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`${r.color} h-full rounded-full`} style={{ width: `${r.pct}%` }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Diurnal Shift Curves & Operational Coupling */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-400" />
            Diurnal Rhythm & Load Dynamics
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3 text-xs font-mono">
            <div className="text-slate-300 font-bold uppercase">Scheduled Routine Peaks</div>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Breakfast & Day Sync:</span>
                <span className="font-bold text-slate-200">07:00 – 08:30 (+8 kW)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Midday Galley & Labs:</span>
                <span className="font-bold text-cyan-300">12:30 – 14:00 (+14 kW)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Evening Dinner & Defrost:</span>
                <span className="font-bold text-amber-400">18:30 – 20:00 (+18 kW)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Night Watch Minimal:</span>
                <span className="font-bold text-emerald-400">23:00 – 06:00 (Base 35 kW)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Causal Matrix</div>
            <div className="text-xs font-mono p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-slate-300">
              <span className="text-cyan-400 font-bold">← Upstream:</span> Potable water supply and microgrid thermal stability sustain human habitation.
            </div>
            <div className="text-xs font-mono p-2 rounded bg-amber-950/30 border border-amber-500/30 text-slate-300">
              <span className="text-amber-400 font-bold">→ Downstream:</span> Crew schedules maintenance work orders, runs scientific labs, and drives diurnal energy surges.
            </div>
          </div>
        </div>

        {/* Right Column: Medical Bay Readiness & Protocols */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-4 h-4 text-emerald-400" />
            Medical Bay & Isolation Life Support
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3 text-xs font-mono">
            <div className="text-slate-300 font-bold uppercase">Medical Suite Status</div>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Medical Officer:</span>
                <span className="font-bold text-emerald-400">1 Doctor on active station watch</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Atmospheric O2 / CO2:</span>
                <span className="font-bold text-cyan-300">20.8% O2 • 440 ppm CO2 (Safe)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Telemedicine Link:</span>
                <span className="font-bold text-slate-200">Armed to AIIMS / NCAOR</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate(`/station/${stationId}/whatif`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Simulate Summer Personnel Increase (+12)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate(`/station/${stationId}/analytics`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-slate-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Open Analytics Overview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonnelPage;
