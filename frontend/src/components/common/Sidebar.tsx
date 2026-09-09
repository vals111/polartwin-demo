import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import {
  LayoutDashboard,
  Cpu,
  LineChart,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  Box,
  Lightbulb,
  ShieldAlert,
  Layers,
  Sparkles
} from 'lucide-react';

interface NavEntry {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  roleRequired?: 'operator' | 'admin';
}

interface NavSection {
  title: string;
  items: NavEntry[];
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { selectedStationId } = useStationStore();
  const { role } = useAuthStore();
  const { isSidebarOpen } = useUiStore();

  const isMaitri = selectedStationId === 'maitri';

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

  const navSections: NavSection[] = [
    {
      title: 'Mission Control',
      items: [
        { to: `/station/${selectedStationId}`, label: 'Dashboard', icon: LayoutDashboard },
        {
          to: `/station/${selectedStationId}/domains`,
          label: 'Domains',
          icon: Layers,
          badge: '9 LIVE',
          badgeColor: isMaitri ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        },
        { to: `/station/${selectedStationId}/twin3d`, label: '3D Spatial View', icon: Box },
      ]
    },

    {
      title: 'Operations & Intelligence',
      items: [
        { to: `/station/${selectedStationId}/forecast`, label: 'Forecasting', icon: TrendingUp },
        { to: `/station/${selectedStationId}/risk`, label: 'Risk & Alerts', icon: AlertTriangle },
        {
          to: `/station/${selectedStationId}/optimization`,
          label: 'Power Optimization',
          icon: Cpu,
          badge: 'AI',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          roleRequired: 'operator'
        },
        { to: `/station/${selectedStationId}/whatif`, label: 'What-If Simulation', icon: FlaskConical, roleRequired: 'operator' },
        { to: `/station/${selectedStationId}/analytics`, label: 'Analytics', icon: LineChart },
        { to: `/station/${selectedStationId}/recommendations`, label: 'AI Recommendations', icon: Lightbulb, roleRequired: 'operator' },
        { to: '/admin', label: 'Admin Console', icon: ShieldAlert, roleRequired: 'admin' },
      ]
    }
  ];

  const accentGlow = isMaitri ? 'rgba(6, 182, 212, 0.12)' : 'rgba(59, 130, 246, 0.12)';

  return (
    <aside
      className={`bg-[#050a14] border-r border-slate-800/40 flex flex-col h-full flex-shrink-0 select-none transition-all duration-300 ease-in-out overflow-hidden z-30 shadow-[4px_0_24px_rgba(0,0,0,0.5)] ${
        isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'
      }`}
    >
      <div className="w-64 flex flex-col h-full relative">
        {/* Soft atmospheric gradient glow behind header */}
        <div
          className="absolute top-0 left-0 right-0 h-28 pointer-events-none opacity-40 blur-2xl"
          style={{ background: isMaitri ? 'radial-gradient(ellipse at top, #06b6d4, transparent)' : 'radial-gradient(ellipse at top, #3b82f6, transparent)' }}
        />

        {/* Station Identity Header */}
        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMaitri ? 'bg-cyan-400' : 'bg-blue-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isMaitri ? 'bg-cyan-400' : 'bg-blue-400'}`} />
              </span>
              <span className={`text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                isMaitri
                  ? 'text-cyan-300 bg-cyan-950/40 border-cyan-800/40'
                  : 'text-blue-300 bg-blue-950/40 border-blue-800/40'
              }`}>
                {isMaitri ? 'INLAND BASE • 1989' : 'COASTAL BASE • 2012'}
              </span>
            </div>
          </div>

          <div className="mt-2.5">
            <h2 className={`text-base font-black tracking-wider bg-clip-text text-transparent ${
              isMaitri
                ? 'bg-gradient-to-r from-white via-cyan-100 to-cyan-400'
                : 'bg-gradient-to-r from-white via-blue-100 to-blue-400'
            }`}>
              {isMaitri ? 'MAITRI STATION' : 'BHARATI STATION'}
            </h2>
            <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase mt-0.5">
              Antarctic Research Twin
            </div>
          </div>

          {/* Smooth Fading Divider — No harsh white lines */}
          <div className="mt-3.5 h-px w-full bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />
        </div>

        {/* Categorized Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 pb-4 space-y-4 scrollbar-none">
          {navSections.map((section) => {
            // Filter items by RBAC
            const visibleItems = section.items.filter((item) => {
              if (item.roleRequired === 'admin' && role !== 'admin') return false;
              if (item.roleRequired === 'operator' && role === 'viewer') return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {/* Section Header */}
                <div className="px-2.5 pt-1 pb-1 text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center space-x-1.5">
                  <span className={`w-1 h-1 rounded-full ${isMaitri ? 'bg-cyan-500/60' : 'bg-blue-500/60'}`} />
                  <span>{section.title}</span>
                </div>

                {/* Section Items */}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isItemActive = isPathActive(item.to);

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={() =>
                          `group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 ${
                            isItemActive
                              ? isMaitri
                                ? 'bg-gradient-to-r from-cyan-950/60 via-cyan-900/30 to-transparent text-cyan-200 border border-cyan-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_0_15px_rgba(6,182,212,0.1)] font-semibold'
                                : 'bg-gradient-to-r from-blue-950/60 via-blue-900/30 to-transparent text-blue-200 border border-blue-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_0_15px_rgba(59,130,246,0.1)] font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                          }`
                        }
                      >
                        {/* Left Active Glow Indicator */}
                        {isItemActive && (
                          <div
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${
                              isMaitri
                                ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                                : 'bg-blue-400 shadow-[0_0_10px_#60a5fa]'
                            }`}
                          />
                        )}

                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg transition-all duration-200 ${
                              isItemActive
                                ? isMaitri
                                  ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                  : 'bg-blue-500/20 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          </div>
                          <span className="truncate tracking-wide text-xs">{item.label}</span>
                        </div>

                        {/* Optional Glow Badge */}
                        {item.badge && (
                          <span
                            className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ml-1.5 tracking-wider ${
                              item.badgeColor || (isMaitri ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30')
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
