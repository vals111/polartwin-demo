import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import {
  Truck, Ship, Anchor, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Compass, MapPin, Wind, CheckCircle2, Activity
} from 'lucide-react';

export const LogisticsPage: React.FC = () => {
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
  const log = snapshot?.logistics;
  const env = snapshot?.environment;
  const fuel = snapshot?.fuel;

  const plannedEta = log?.planned_eta_days ?? (isMaitri ? 88 : 102);
  const weatherDelay = log?.weather_delay_days ?? (isMaitri ? 4.5 : 2.0);
  const effectiveEta = log?.effective_eta_days ?? (plannedEta + weatherDelay);
  const vesselName = log?.resupply_vessel ?? 'MV Vasiliy Golovnin (Expedition Charter)';
  const logisticsRisk = log?.logistics_risk_score ?? (isMaitri ? 24 : 16);

  const routeDescription = isMaitri
    ? 'Cape Town → Southern Ocean → Princess Astrid Coast Ice Shelf → 100km Overland PistenBully Convoy to Schirmacher Oasis'
    : 'Cape Town → Prydz Bay / Quilty Bay → Direct Fast-Ice Barge Discharge & Ka-32 Helicopter Sling to Bharati Helipad';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Operational Domain • Transportation & Expedition Resupply
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {station.name} • {isMaitri ? 'Overland Convoy Route' : 'Direct Maritime Mooring'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Truck className="w-8 h-8 text-teal-400" />
              Transportation & Logistics Tracking
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl">
              Ice-class cargo vessel voyages, sea-ice barrier mooring windows, overland tracked convoy readiness, and expedition personnel rotation lifelines.
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
              onClick={() => navigate(isMaitri ? '/station/bharati/logistics' : '/station/maitri/logistics')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* Live Status KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Effective ETA</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{effectiveEta.toFixed(1)} Days</div>
            <div className="text-[10px] text-teal-300 mt-0.5">{vesselName.split(' ')[0]} {vesselName.split(' ')[1]}</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Weather Delay</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">+{weatherDelay} Days</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Southern Ocean Katabatic Gales</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Logistics Risk Score</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{logisticsRisk} / 100</div>
            <div className="text-[10px] text-emerald-300 mt-0.5">Route Feasibility Verified</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Overland Traverse</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{isMaitri ? '100 km Convoy' : '0 km (Direct Mooring)'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isMaitri ? '3x PistenBully 300 Polar' : 'Coastal Barge Discharge'}</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Voyage Progress & Timeline */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Ship className="w-4 h-4 text-teal-400" />
            Expedition Vessel Route Status
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="flex justify-between items-baseline text-xs font-mono">
              <span className="text-slate-300 font-bold">Voyage Progress</span>
              <span className="text-teal-400 font-bold">Day 32 of ~120</span>
            </div>
            <div className="w-full bg-slate-800 rounded-2xl h-4 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-xl transition-all duration-700"
                style={{ width: `${Math.max(15, 100 - (effectiveEta / 120) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>Cape Town Departure</span>
              <span>Southern Ocean</span>
              <span>Fast-Ice Edge</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <div className="text-slate-400 text-[10px] uppercase">Route Waypoint Mapping:</div>
              <div className="text-slate-200 font-semibold mt-1 leading-relaxed">{routeDescription}</div>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Ice Class Standard:</span>
              <span className="font-bold text-cyan-300">Arc5 / Polar Class 4</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
              <span className="text-slate-400">Planned Window:</span>
              <span className="font-bold text-amber-300">{isMaitri ? 'Nov 2026 – Jan 2027' : 'Dec 2026 – Feb 2027'}</span>
            </div>
          </div>
        </div>

        {/* Middle Column: Transport Modal Fleet & Route Hazards */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Anchor className="w-4 h-4 text-cyan-400" />
            Station Transport Assets & Modal Fleet
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Available Mobile Fleet</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Tracked Convoy Tractors:</span>
                <span className="font-bold text-emerald-400">{isMaitri ? '3x PistenBully 300 Polar' : '2x PistenBully Snow Groomers'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Heavy Lift Helicopter:</span>
                <span className="font-bold text-cyan-300">1x Ka-32 Helix (5-ton sling ready)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Fast-Ice Cargo Barges:</span>
                <span className="font-bold text-slate-200">{isMaitri ? 'N/A (Inland Oasis)' : '2x Self-Propelled Barges'}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Causal Matrix</div>
            <div className="text-xs font-mono p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-slate-300">
              <span className="text-cyan-400 font-bold">← Upstream:</span> Blizzard winds and polar pack ice drift dictate voyage arrival timeline.
            </div>
            <div className="text-xs font-mono p-2 rounded bg-amber-950/30 border border-amber-500/30 text-slate-300">
              <span className="text-amber-400 font-bold">→ Downstream:</span> Delivers annual fuel replenish, dry rations, and equipment maintenance parts.
            </div>
          </div>
        </div>

        {/* Right Column: Cargo Manifest & What-If Actions */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            Inbound Cargo Manifest
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Payload Consignments</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">AGO Bulk Diesel Fuel:</span>
                <span className="font-bold text-amber-300">{isMaitri ? '180,000 Liters' : '220,000 Liters'}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Dry Food & Supplies:</span>
                <span className="font-bold text-emerald-300">365 Days expedition stock</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <span className="text-slate-400">Equipment Overhaul Parts:</span>
                <span className="font-bold text-cyan-300">1,240 Machine SKUs</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate(`/station/${stationId}/whatif`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Simulate Resupply Delay (+20d) Scenario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate(`/station/${stationId}/forecast`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-slate-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Open Forecasting Overview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsPage;
