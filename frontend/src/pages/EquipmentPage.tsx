import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { equipmentApi } from '../api/client';
import { EquipmentItem } from '../types';
import { Wrench, Shield, AlertTriangle, CheckCircle, Activity, Clock, RefreshCw } from 'lucide-react';

export const EquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const { liveSnapshot } = useTelemetryStore();

  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [maintenance, setMaintenance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const snapshot = liveSnapshot[stationId];
  const items = snapshot?.equipment?.items || equipmentList;
  const avgHealth = snapshot?.equipment?.avg_health || 93.5;

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      try {
        const data = await equipmentApi.getStationEquipment(stationId);
        if (data.items) {
          setEquipmentList(data.items);
          setMaintenance(data.maintenance);
        }
      } catch (e) {
        console.warn('Failed to load equipment API:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [stationId]);

  const getHealthBadge = (health: number) => {
    if (health >= 85) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (health >= 70) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Wrench className="w-4 h-4" />
              <span>Machinery Health & Maintenance Lifecycle</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Equipment Fleet Telemetry
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Real-time vibration, run hours, thermal stress, and failure risk models for all station generators, pumps, and life-support assets.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-polar-dark p-3 rounded-xl border border-polar-border text-xs font-mono">
            <div>
              <div className="text-slate-400 text-[10px]">Fleet Avg Health</div>
              <div className="text-lg font-bold text-cyan-300">{avgHealth}%</div>
            </div>
            <div className="border-l border-polar-border pl-4">
              <div className="text-slate-400 text-[10px]">Active Units</div>
              <div className="text-lg font-bold text-emerald-400">{items.length} Units</div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Fleet Table */}
      <div className="glass-panel rounded-2xl border border-polar-border overflow-hidden">
        <div className="p-4 border-b border-polar-border/60 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
            Station Critical Machinery Roster
          </h3>
          <span className="text-[11px] font-mono text-cyan-400">Continuous Stress Evaluation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-polar-border/60 text-slate-400 uppercase text-[10px] bg-polar-dark/40">
                <th className="py-3 px-4">Equipment Unit</th>
                <th className="py-3 px-4">Subsystem Type</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Run Hours</th>
                <th className="py-3 px-4">Vibration</th>
                <th className="py-3 px-4">Failure Probability</th>
                <th className="py-3 px-4">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-polar-border/30">
              {items.map((eq) => (
                <tr key={eq.id} className="hover:bg-polar-navy/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {eq.name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 capitalize">
                    {eq.type}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getHealthBadge(eq.health_score)}`}>
                      {eq.health_score}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {eq.operating_hours?.toLocaleString()} hrs
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {eq.vibration_mm_s} mm/s
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`font-bold ${eq.failure_risk_pct > 20 ? 'text-red-400' : 'text-slate-300'}`}>
                      {eq.failure_risk_pct}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      eq.status === 'operational' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      eq.status === 'standby' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${eq.status === 'operational' ? 'bg-emerald-400' : eq.status === 'standby' ? 'bg-blue-400' : 'bg-red-400'}`} />
                      <span>{eq.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Tasks & Degradation Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-polar-border">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase mb-3">
            Active & Upcoming Maintenance Work Orders
          </h3>
          <div className="space-y-3">
            <div className="bg-polar-dark/80 p-3.5 rounded-xl border border-polar-border flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">500-Hour Generator Injector Inspection</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">Unit: Main Diesel Generator 1 • Spares in inventory: 48 filters</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 uppercase font-bold">
                Scheduled
              </span>
            </div>

            <div className="bg-polar-dark/80 p-3.5 rounded-xl border border-polar-border flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Intake Trace Heating Impeller Seal Check</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">Unit: Water Intake Pump • Spares in inventory: 16 seals</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-bold">
                In Progress
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-polar-border">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase mb-3">
            Governing Degradation Formula (Master Report Section 11)
          </h3>
          <div className="p-4 rounded-xl bg-polar-dark/90 font-mono text-xs text-cyan-300 border border-polar-border">
            Health(t+1) = Health(t) - (LoadStress(t) × DegradationRate) + MaintenanceReset(t)
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Equipment degradation follows actual generator electrical load and sub-zero thermal cycling. 
            When health score drops below 75%, an automated maintenance task is placed into the queue.
          </p>
        </div>
      </div>
    </div>
  );
};
