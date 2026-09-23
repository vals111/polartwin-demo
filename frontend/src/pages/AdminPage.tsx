import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/client';
import { ShieldAlert, Users, Cpu, Play, RefreshCw, CheckCircle2, Settings, Key } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [tickStatus, setTickStatus] = useState<string | null>(null);
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const u = await adminApi.getUsers();
      setUsers(u);
      const c = await adminApi.getConfig();
      setConfig(c);
    } catch (e) {
      console.warn('Failed to load admin data:', e);
    }
  };

  const handleManualTick = async (stationId: string) => {
    setTicking(true);
    setTickStatus(null);
    try {
      const res = await adminApi.triggerTick(stationId);
      setTickStatus(`Manual tick executed on ${stationId.toUpperCase()}! Tick: ${res.tick}, Readiness: ${res.readiness}%`);
      loadAdminData();
    } catch (e) {
      setTickStatus('Failed to trigger manual tick.');
    } finally {
      setTicking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-purple-400 uppercase tracking-wider">
              System Administration & Core Parameters
            </div>
            <h1 className="text-2xl font-black text-white">
              POLARTWIN Security & Governance Console
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Manage platform role-based access control (RBAC), view live data tick loops, and configure simulator parameters.
            </p>
          </div>
        </div>
      </div>

      {tickStatus && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{tickStatus}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <div className="glass-panel rounded-2xl border border-polar-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                System Access Personas (RBAC)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Section 24 Architecture</span>
          </div>

          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="text-xs text-slate-400 font-mono">Loading users...</div>
            ) : (
              users.map((u) => (
                <div key={u.user_id} className="p-3.5 rounded-xl bg-polar-dark/80 border border-polar-border flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white font-mono">{u.email}</div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {u.user_id.slice(0, 16)}...</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border ${
                    u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                    u.role === 'operator' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {u.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Simulation Engine Controls */}
        <div className="glass-panel rounded-2xl border border-polar-border p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  Self-operating Simulation Engine
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ACTIVE (APScheduler)</span>
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                <span className="text-slate-400">Self-operating Interval:</span>
                <span className="font-bold text-white">4 Seconds per Tick</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                <span className="text-slate-400">Active Domains per Station:</span>
                <span className="font-bold text-cyan-300">16 Domains (Synchronous)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                <span className="text-slate-400">Maitri Tick Counter:</span>
                <span className="font-bold text-white">{config?.active_ticks?.maitri ?? 0}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-polar-dark/60 border border-polar-border">
                <span className="text-slate-400">Bharati Tick Counter:</span>
                <span className="font-bold text-white">{config?.active_ticks?.bharati ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-polar-border/60">
            <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase">Manual Step Triggers:</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleManualTick('maitri')}
                disabled={ticking}
                className="py-2.5 px-3 bg-polar-navy hover:bg-polar-border border border-polar-border rounded-xl text-xs font-mono font-bold text-cyan-300 transition-colors flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Step Maitri (+1 Tick)</span>
              </button>

              <button
                onClick={() => handleManualTick('bharati')}
                disabled={ticking}
                className="py-2.5 px-3 bg-polar-navy hover:bg-polar-border border border-polar-border rounded-xl text-xs font-mono font-bold text-cyan-300 transition-colors flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Step Bharati (+1 Tick)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
