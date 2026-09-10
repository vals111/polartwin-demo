import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useAuthStore } from '../../store/authStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useUiStore } from '../../store/uiStore';
import { Shield, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStationId, selectStation, stations } = useStationStore();
  const { user, role, logout } = useAuthStore();
  const { liveRisk } = useTelemetryStore();
  const { isSidebarOpen, toggleSidebar } = useUiStore();

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

  return (
    <header className="h-16 bg-[#070e1a]/95 border-b border-slate-800/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
      {/* Brand & Mission Header */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          {/* POLARTWIN Brand Logo Button - Toggles Sidebar Vanish/Appear */}
          <button
            onClick={toggleSidebar}
            title={isSidebarOpen ? "Hide Sidebar (Vanish)" : "Show Sidebar (Appear)"}
            className={`cursor-pointer group select-none relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border shadow-lg transition-all duration-300 p-1 focus:outline-none hover:scale-105 active:scale-95 ${
              isSidebarOpen
                ? 'border-cyan-500/40 shadow-cyan-500/15 hover:border-cyan-400 hover:shadow-cyan-500/30'
                : 'border-amber-500/60 shadow-amber-500/20 ring-1 ring-amber-400/40 opacity-90 hover:opacity-100'
            }`}
          >
            <img
              src="/logo.png"
              alt="POLARTWIN Logo"
              className="h-full w-full object-contain rounded-lg drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-transform duration-300 group-hover:scale-110"
            />
          </button>

          {/* POLARTWIN Brand Title (navigates to dashboard) */}
          <div
            onClick={() => navigate(`/station/${selectedStationId}`)}
            className="cursor-pointer group select-none flex items-center space-x-1.5"
            title="Go to Station Dashboard"
          >
            <span className="font-extrabold text-lg tracking-wider text-white group-hover:text-cyan-300 transition-colors">
              POLARTWIN
            </span>
          </div>
        </div>

        {/* Station Selector Dropdown / Pills */}
        <div className="hidden md:flex items-center bg-slate-900/80 p-1 rounded-lg border border-slate-800/60 ml-4">
          {stations.map((st) => (
            <button
              key={st.station_id}
              onClick={() => handleStationChange(st.station_id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-2 ${selectedStationId === st.station_id
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <span>{st.name.replace(' Research Station', '').replace(' Antarctic Station', '')}</span>
              <span className="text-[10px] opacity-75 font-mono capitalize">({st.location_type})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live System Metrics & Connectivity */}
      <div className="flex items-center space-x-4">

        {/* Station Risk Pill */}
        <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-md border text-xs font-mono font-semibold ${getRiskBadgeColor(currentRisk?.level)}`}>
          <Shield className="w-3.5 h-3.5" />
          <span>RISK: {currentRisk?.level || 'LOW'} ({currentRisk?.score || 18} pts)</span>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-800/60">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">{user?.email?.split('@')[0] || 'Operator'}</div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase">{role}</div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
