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
  LogOut,
  ArrowLeft,
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
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'station' && pathParts[2]) {
      const sub = pathParts.slice(3).join('/');
      navigate(`/station/${stId}${sub ? `/${sub}` : ''}`);
    }
  };

  const getRiskBadgeStyle = (level?: string) => {
    switch (level) {
      case 'CRITICAL': return { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)' };
      case 'HIGH':     return { bg: 'rgba(251,146,60,0.12)', text: '#fb923c', border: 'rgba(251,146,60,0.3)' };
      case 'MEDIUM':   return { bg: 'rgba(250,204,21,0.12)', text: '#facc15', border: 'rgba(250,204,21,0.3)' };
      default:         return { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' };
    }
  };

  const riskStyle = getRiskBadgeStyle(currentRisk?.level);

  // Shared nav link style factory
  const navLinkClass = (isActive: boolean) =>
    `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer select-none ${
      isActive
        ? 'bg-blue-600/20 text-cyan-300 border border-cyan-500/40'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
    }`;

  const navIconColor = (isActive: boolean) =>
    isActive ? '#22d3ee' : '#64748b';

  return (
    <header
      className="h-16 sticky top-0 z-50 flex items-center justify-between px-5 select-none"
      style={{
        backgroundColor: 'var(--navbar-bg)',
        borderBottom: '1px solid var(--navbar-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* ── Left: Back Button, Brand & Station Selector ── */}
      <div className="flex items-center gap-3">
        {/* Universal Back Button */}
        <button
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate(`/station/${selectedStationId}`);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer group"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
          title="Navigate Back"
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" style={{ color: 'var(--accent)' }} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Brand Logo + Title */}
        <div
          onClick={() => navigate(`/station/${selectedStationId}`)}
          className="cursor-pointer flex items-center gap-2.5 group"
          title="POLARTWIN Antarctic Digital Twin"
        >
          <div
            className="flex items-center justify-center h-9 w-9 rounded-xl p-1 transition-all duration-200 group-hover:scale-105"
            style={{
              background: 'rgba(6,182,212,0.15)',
              border: '1px solid rgba(6,182,212,0.4)',
            }}
          >
            <img
              src="/logo.png"
              alt="POLARTWIN Logo"
              className="h-full w-full object-contain rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <span
              className="font-extrabold text-sm tracking-wide leading-none"
              style={{ color: 'var(--text-primary)' }}
            >
              POLARTWIN
            </span>
            <span
              className="text-[9px] font-mono tracking-widest uppercase mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Antarctic Twin
            </span>
          </div>
        </div>

        {/* Station Selector */}
        <div
          className="hidden sm:flex items-center p-1 rounded-xl ml-1"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {stations.map((st) => (
            <button
              key={st.station_id}
              onClick={() => handleStationChange(st.station_id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              style={
                selectedStationId === st.station_id
                  ? {
                      background: 'linear-gradient(to right,#2563eb,#06b6d4)',
                      color: '#ffffff',
                      fontWeight: 700,
                    }
                  : { color: 'var(--text-muted)' }
              }
            >
              <span>{st.name.replace(' Research Station', '').replace(' Antarctic Station', '')}</span>
              <span className="text-[9px] opacity-70 font-mono capitalize">
                ({st.location_type})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Center: Navigation Links ── */}
      <nav
        className="flex items-center gap-1 p-1 rounded-xl"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <NavLink
          to={`/station/${selectedStationId}`}
          end
          className={({ isActive }) => navLinkClass(isActive)}
          title="Dashboard"
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard className="w-4 h-4" style={{ color: navIconColor(isActive) }} />
              <span className="hidden md:inline">Dashboard</span>
            </>
          )}
        </NavLink>

        <NavLink
          to={`/station/${selectedStationId}/domains`}
          className={({ isActive }) => navLinkClass(isActive)}
          title="Domains"
        >
          {({ isActive }) => (
            <>
              <Layers className="w-4 h-4" style={{ color: navIconColor(isActive) }} />
              <span className="hidden md:inline">Domains</span>
            </>
          )}
        </NavLink>

        <NavLink
          to={`/station/${selectedStationId}/twin3d`}
          className={({ isActive }) => navLinkClass(isActive)}
          title="3D Station Twin"
        >
          {({ isActive }) => (
            <>
              <Box className="w-4 h-4" style={{ color: navIconColor(isActive) }} />
              <span className="hidden md:inline">3D Twin</span>
            </>
          )}
        </NavLink>

        {role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => navLinkClass(isActive)}
            title="Admin"
          >
            {({ isActive }) => (
              <>
                <ShieldAlert
                  className="w-4 h-4"
                  style={{ color: isActive ? '#f59e0b' : '#64748b' }}
                />
                <span className="hidden md:inline">Admin</span>
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* ── Right: Risk Badge, Profile ── */}
      <div className="flex items-center gap-3">
        {/* Live Risk Badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold"
          style={{
            backgroundColor: riskStyle.bg,
            color: riskStyle.text,
            borderColor: riskStyle.border,
          }}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>RISK: {currentRisk?.level || 'LOW'} ({currentRisk?.score || 18} pts)</span>
        </div>

        {/* User + Logout */}
        <div
          className="flex items-center gap-2.5 pl-3"
          style={{ borderLeft: '1px solid var(--border)' }}
        >
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user?.email?.split('@')[0] || 'Operator'}
            </div>
            <div className="text-[10px] font-mono uppercase" style={{ color: 'var(--accent)' }}>
              {role}
            </div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.12)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
