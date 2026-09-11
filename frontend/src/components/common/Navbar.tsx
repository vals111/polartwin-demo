import React from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useAuthStore } from '../../store/authStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import {
  LayoutDashboard,
  Layers,
  Box,
  ShieldAlert,
  Shield,
  LogOut
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStationId, selectStation, stations } = useStationStore();
  const { user, role, logout } = useAuthStore();
  const { liveRisk } = useTelemetryStore();

  const currentRisk = liveRisk[selectedStationId];

  const handleStationChange = (stId: string) => {
    selectStation(stId);
    // If on a station-specific subpath, preserve subpath
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'station' && pathParts[2]) {
      const sub = pathParts.slice(3).join('/');
      navigate(`/station/${stId}${sub ? `/${sub}` : ''}`);
    }
  };

  const getRiskBadgeColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const isMaitri = selectedStationId === 'maitri';

  return (
    <header className="h-16 bg-[#070e1a]/95 border-b border-slate-800/60 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 select-none">
      {/* ── Left: Brand Identity & Station Selector ── */}
      <div className="flex items-center space-x-4">
        <div
          onClick={() => navigate(`/station/${selectedStationId}`)}
          className="cursor-pointer group flex items-center space-x-3"
          title="POLARTWIN Antarctic Digital Twin"
        >
          {/* POLARTWIN Brand Logo */}
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-lg shadow-cyan-500/15 transition-all duration-300 p-1 group-hover:scale-105 group-hover:border-cyan-400 group-hover:shadow-cyan-500/30">
            <img
              src="/logo.png"
              alt="POLARTWIN Logo"
              className="h-full w-full object-contain rounded-lg drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-transform duration-300 group-hover:scale-110"
            />
          </div>

          {/* POLARTWIN Title */}
          <div className="flex flex-col">
            <span className="font-extrabold text-base lg:text-lg tracking-wider text-white group-hover:text-cyan-300 transition-colors leading-none">
              POLARTWIN
            </span>
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase mt-0.5">
              Antarctic Twin
            </span>
          </div>
        </div>

        {/* Station Selector Switcher (Maitri vs Bharati) */}
        <div className="hidden sm:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner ml-2">
          {stations.map((st) => (
            <button
              key={st.station_id}
              onClick={() => handleStationChange(st.station_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                selectedStationId === st.station_id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{st.name.replace(' Research Station', '').replace(' Antarctic Station', '')}</span>
              <span className="text-[9.5px] opacity-75 font-mono capitalize">({st.location_type})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Center: Mission Control Core Navigation Links ── */}
      <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
        {/* 1. Dashboard */}
        <NavLink
          to={`/station/${selectedStationId}`}
          end
          className={({ isActive }) =>
            `px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              isActive
                ? 'bg-gradient-to-r from-blue-600/30 to-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`
          }
          title="Station Real-Time Telemetry Dashboard"
        >
          <LayoutDashboard className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">Dashboard</span>
        </NavLink>

        {/* 2. Domains */}
        <NavLink
          to={`/station/${selectedStationId}/domains`}
          className={({ isActive }) =>
            `px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              isActive
                ? 'bg-gradient-to-r from-blue-600/30 to-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`
          }
          title="Inter-Domain Causal Architecture"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">Domains</span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border leading-tight ${
            isMaitri
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
          }`}>
            9 LIVE
          </span>
        </NavLink>

        {/* 3. 3D Spatial View */}
        <NavLink
          to={`/station/${selectedStationId}/twin3d`}
          className={({ isActive }) =>
            `px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              isActive
                ? 'bg-gradient-to-r from-blue-600/30 to-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`
          }
          title="Interactive 3D Digital Twin Constellation"
        >
          <Box className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">3D Spatial View</span>
        </NavLink>

        {/* Admin Console (RBAC protected) */}
        {role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-600/30 to-orange-500/30 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`
            }
            title="System Administration Console"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Admin</span>
          </NavLink>
        )}
      </nav>

      {/* ── Right: Live Station Risk & User Profile ── */}
      <div className="flex items-center space-x-4">
        {/* Station Risk Pill */}
        <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold ${getRiskBadgeColor(currentRisk?.level)}`}>
          <Shield className="w-3.5 h-3.5" />
          <span>RISK: {currentRisk?.level || 'LOW'} ({currentRisk?.score || 18} pts)</span>
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-800/60">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">{user?.email?.split('@')[0] || 'Operator'}</div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase">{role}</div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
