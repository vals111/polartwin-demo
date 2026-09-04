import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import {
  LayoutDashboard,
  Cpu,
  Zap,
  Wrench,
  CloudSnow,
  LineChart,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  Box,
  Lightbulb,
  ShieldAlert,
  ArrowLeftRight,
  Layers
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedStationId, selectStation } = useStationStore();
  const { role } = useAuthStore();
  const { isSidebarOpen } = useUiStore();

  const isMaitri = selectedStationId === 'maitri';

  const handleSwitchStation = () => {
    const nextStation = isMaitri ? 'bharati' : 'maitri';
    selectStation(nextStation);
    navigate(`/station/${nextStation}`);
  };

  const isPathActive = (to: string) => {
    if (to === `/station/${selectedStationId}`) {
      return (
        location.pathname === `/station/${selectedStationId}` ||
        location.pathname === `/station/${selectedStationId}/` ||
        location.pathname === `/station/${selectedStationId}/dashboard`
      );
    }
    return location.pathname === to;
  };

  // Station-specific tailored navigation titles with Dashboard & 16 Domain
  const navItems = isMaitri
    ? [
        { to: `/station/maitri`, label: 'Dashboard', icon: LayoutDashboard },
        { to: `/station/maitri/domains`, label: '16 Domain', icon: Layers, highlight: true },
        { to: `/station/maitri/twin3d`, label: 'Maitri 3D Spatial Twin', icon: Box },
        { to: `/station/maitri/resources`, label: 'Fuel & Lake Zub Water', icon: Zap },
        { to: `/station/maitri/equipment`, label: '2x Gen & Incinerator Health', icon: Wrench },
        { to: `/station/maitri/environment`, label: 'Schirmacher Polar Weather', icon: CloudSnow },
        { to: `/station/maitri/forecast`, label: 'Predictive Horizons', icon: TrendingUp },
        { to: `/station/maitri/risk`, label: 'Maitri Risk & Alerts', icon: AlertTriangle },
        { to: `/station/maitri/optimization`, label: 'RL Microgrid Optimization', icon: Cpu, roleRequired: 'operator' },
        { to: `/station/maitri/whatif`, label: 'What-If & Monte Carlo', icon: FlaskConical, roleRequired: 'operator' },
        { to: `/station/maitri/analytics`, label: 'Analytics & SHAP Values', icon: LineChart },
        { to: `/station/maitri/recommendations`, label: 'NCPOR AI Decisions', icon: Lightbulb, roleRequired: 'operator' },
        { to: '/admin', label: 'Station Admin Console', icon: ShieldAlert, roleRequired: 'admin' },
      ]
    : [
        { to: `/station/bharati`, label: 'Dashboard', icon: LayoutDashboard },
        { to: `/station/bharati/domains`, label: '16 Domain', icon: Layers, highlight: true },
        { to: `/station/bharati/twin3d`, label: 'Bharati 3D Spatial Twin', icon: Box },
        { to: `/station/bharati/resources`, label: 'Fuel & Quilty Bay RO Desal', icon: Zap },
        { to: `/station/bharati/equipment`, label: '3x CHP Plant & Stilts', icon: Wrench },
        { to: `/station/bharati/environment`, label: 'Larsemann Maritime Weather', icon: CloudSnow },
        { to: `/station/bharati/forecast`, label: 'Predictive Horizons', icon: TrendingUp },
        { to: `/station/bharati/risk`, label: 'Bharati Risk & Sea-Ice Alerts', icon: AlertTriangle },
        { to: `/station/bharati/optimization`, label: 'RL Microgrid Optimization', icon: Cpu, roleRequired: 'operator' },
        { to: `/station/bharati/whatif`, label: 'What-If & Monte Carlo', icon: FlaskConical, roleRequired: 'operator' },
        { to: `/station/bharati/analytics`, label: 'Analytics & SHAP Values', icon: LineChart },
        { to: `/station/bharati/recommendations`, label: 'NCPOR AI Decisions', icon: Lightbulb, roleRequired: 'operator' },
        { to: '/admin', label: 'Station Admin Console', icon: ShieldAlert, roleRequired: 'admin' },
      ];

  return (
    <aside
      className={`bg-polar-darker/95 border-r border-polar-border flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none transition-all duration-300 ease-in-out overflow-hidden z-40 ${
        isSidebarOpen ? 'w-64 opacity-100 shadow-2xl' : 'w-0 opacity-0 border-r-0 pointer-events-none'
      }`}
    >
      <div className="w-64 flex flex-col h-full">
        {/* Station-Unique Personalized Header */}
        <div className={`p-4 border-b border-polar-border/60 ${isMaitri ? 'bg-gradient-to-r from-cyan-950/40 to-transparent' : 'bg-gradient-to-r from-blue-950/40 to-transparent'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-bold border ${
              isMaitri ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}>
              {isMaitri ? 'Inland Base • 1989' : 'Coastal Base • 2012'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isMaitri ? 'bg-cyan-400' : 'bg-blue-400'} animate-pulse`} />
          </div>

          <div className="mt-2">
            <div className={`text-base font-black tracking-wide ${isMaitri ? 'text-cyan-300' : 'text-blue-300'}`}>
              {isMaitri ? 'MAITRI STATION' : 'BHARATI STATION'}
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {navItems.map((item) => {
            // RBAC visibility
            if (item.roleRequired === 'admin' && role !== 'admin') return null;
            if (item.roleRequired === 'operator' && role === 'viewer') return null;

            const Icon = item.icon;
            const isItemActive = isPathActive(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={() =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isItemActive
                      ? isMaitri
                        ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/40 text-cyan-200 border border-cyan-500/40 shadow-sm shadow-cyan-900/50 font-bold'
                        : 'bg-gradient-to-r from-blue-900/70 to-indigo-900/40 text-blue-200 border border-blue-500/40 shadow-sm shadow-blue-900/50 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-polar-navy/50'
                  } ${item.highlight ? (isMaitri ? 'ring-1 ring-cyan-500/25' : 'ring-1 ring-blue-500/25') : ''}`
                }
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isMaitri ? 'text-cyan-400' : 'text-blue-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.highlight && (
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                    isMaitri
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  }`}>
                    HOT
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Station Switching Actions in Sidebar Footer */}
        <div className="p-3 border-t border-polar-border/60 bg-polar-dark/90 space-y-2">
          {/* Direct Switcher to Counterpart Station */}
          <button
            onClick={handleSwitchStation}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
              isMaitri
                ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
                : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/30'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Switch to {isMaitri ? 'Bharati' : 'Maitri'}</span>
            </div>
            <span className="text-[10px] opacity-75">→</span>
          </button>

          {/* Station Switching Actions in Sidebar Footer */}
          <div className="pt-1 text-center text-[9px] text-slate-500 font-mono">
            NCPOR • MoES Digital Twin System
          </div>
        </div>
      </div>
    </aside>
  );
};
