import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import {
  Archive, Package, CheckCircle2, AlertTriangle, ShieldCheck,
  Clock, ArrowRight, ExternalLink, RefreshCw, Layers,
  Activity, Wrench, Shield, ShoppingCart
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
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
  const inv = snapshot?.inventory;

  const totalSkus = isMaitri ? 1420 : 1850;
  const readiness = isMaitri ? 94 : 97;
  const stockoutCount = inv?.critical_items_low ?? 0;

  const criticalSpares = [
    { name: 'Diesel Fuel Filter Cartridges', qty: 48, threshold: 12, unit: 'units', status: 'Optimal' },
    { name: 'RO High-Pressure Membrane Seals', qty: 16, threshold: 4, unit: 'sets', status: 'Optimal' },
    { name: 'PistenBully Track Pins & Bushings', qty: 24, threshold: 6, unit: 'units', status: 'Optimal' },
    { name: 'Incinerator Blower Bearings (6208-2RS)', qty: 8, threshold: 2, unit: 'sets', status: 'Ready for Task' }
  ];

  const consumables = [
    { name: 'Polar Synthetic Engine Oil 5W-40', qty: 1200, threshold: 300, unit: 'Liters' },
    { name: 'Sub-zero Hydronic Glycol Antifreeze', qty: 650, threshold: 150, unit: 'Liters' },
    { name: 'Emergency Trauma & Hypothermia Kits', qty: 30, threshold: 10, unit: 'kits' },
    { name: 'Polar Anti-infection Pharmaceuticals', qty: 150, threshold: 40, unit: 'courses' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Operational Domain • Critical Spares & Consumables
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {station.name} • {isMaitri ? 'Heated Module Store' : 'Automated RFID Matrix'}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <Archive className="w-8 h-8 text-emerald-400" />
              Storage, Spares & Parts Inventory
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-2 max-w-3xl">
              Winter-over equipment spare parts catalogs, safety threshold tracking, CMMS job parts staging, and fluid lubricant reserves for 9 months of polar isolation.
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
              onClick={() => navigate(isMaitri ? '/station/bharati/inventory' : '/station/maitri/inventory')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </button>
          </div>
        </div>

        {/* Live Status KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-polar-border/50 text-xs font-mono">
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Stockout Count</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stockoutCount} Stockouts</div>
            <div className="text-[10px] text-emerald-300 mt-0.5">100% Critical Coverage</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Total Active SKUs</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{totalSkus.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isMaitri ? 'Container Store' : 'RFID Smart Bins'}</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Parts Readiness</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{readiness}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">CMMS Job Parts 100% Staged</div>
          </div>
          <div className="p-3 rounded-xl bg-polar-dark/60 border border-polar-border">
            <div className="text-slate-400 text-[10px] uppercase">Upcoming Delivery</div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{isMaitri ? '88 Days' : '102 Days'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Annual Charter Vessel</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Critical Machinery Spares */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-400" />
            Critical Machine Spares & Seals
          </h3>

          <div className="space-y-3">
            {criticalSpares.map((spare) => (
              <div key={spare.name} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-200 truncate">{spare.name}</span>
                  <span className="font-bold text-emerald-400">{spare.qty} {spare.unit}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, (spare.qty / (spare.threshold * 4)) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Safe Threshold: {spare.threshold} {spare.unit}</span>
                  <span className="text-emerald-300">{spare.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Consumable Fluids & Medical Reserves */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            Consumable Fluids & Medical Kits
          </h3>

          <div className="space-y-3">
            {consumables.map((c) => (
              <div key={c.name} className="p-3.5 rounded-xl bg-polar-dark/70 border border-polar-border space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-200 truncate">{c.name}</span>
                  <span className="font-bold text-cyan-300">{c.qty} {c.unit}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${Math.min(100, (c.qty / (c.threshold * 4)) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Reorder Buffer: {c.threshold} {c.unit}</span>
                  <span className="text-emerald-400">Above Threshold</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-2.5">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">Causal Matrix</div>
            <div className="text-xs font-mono p-2 rounded bg-cyan-950/30 border border-cyan-500/30 text-slate-300">
              <span className="text-cyan-400 font-bold">← Upstream:</span> Annual resupply transport delivers entire container payload of catalogued items.
            </div>
            <div className="text-xs font-mono p-2 rounded bg-amber-950/30 border border-amber-500/30 text-slate-300">
              <span className="text-amber-400 font-bold">→ Downstream:</span> Directly supports Equipment & Machinery maintenance and Personnel medical bay.
            </div>
          </div>
        </div>

        {/* Right Column: Work Order Readiness & Actions */}
        <div className="glass-panel p-6 rounded-2xl border border-polar-border space-y-5">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            CMMS Maintenance Job Staging
          </h3>

          <div className="p-4 rounded-xl bg-polar-dark/70 border border-polar-border space-y-3 text-xs font-mono">
            <div className="text-slate-300 font-bold uppercase">Scheduled Task Parts Checklist</div>
            <div className="space-y-2">
              <div className="p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <div className="text-amber-300 font-bold">Task #1: Incinerator Draft Blower Bearing Swap</div>
                <div className="text-[11px] text-slate-300 mt-1">2x SKF 6208-2RS bearings + puller tool kit verified in bin A-14.</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Parts 100% Staged for Tech V. Raman</div>
              </div>
              <div className="p-2 rounded bg-polar-navy/60 border border-polar-border/40">
                <div className="text-cyan-300 font-bold">Task #2: Water Conduit Pump Seal Inspection</div>
                <div className="text-[11px] text-slate-300 mt-1">EPDM high-pressure gasket pack & silicone grease staged in bin W-02.</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Parts 100% Staged</div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate(`/station/${stationId}/equipment`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>View Equipment Subsystem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate(`/station/${stationId}/resources`)}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-polar-dark hover:bg-polar-dark/80 border border-polar-border text-slate-300 flex items-center justify-center gap-2 transition-all"
            >
              <span>Open Resources Overview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
