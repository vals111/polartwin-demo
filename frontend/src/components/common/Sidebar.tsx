import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStationStore } from '../../store/stationStore';
import { useAuthStore } from '../../store/authStore';
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
  ShieldAlert
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { selectedStationId } = useStationStore();
  const { role } = useAuthStore();

  const navItems = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: `/station/${selectedStationId}`, label: '16-Domain Twin', icon: Cpu },
    { to: `/station/${selectedStationId}/twin3d`, label: '3D Spatial Twin', icon: Box, highlight: true },
    { to: `/station/${selectedStationId}/resources`, label: 'Fuel & Resources', icon: Zap },
    { to: `/station/${selectedStationId}/equipment`, label: 'Equipment Health', icon: Wrench },
    { to: `/station/${selectedStationId}/environment`, label: 'Polar Weather', icon: CloudSnow },
    { to: `/station/${selectedStationId}/forecast`, label: 'Predictive Horizons', icon: TrendingUp },
    { to: `/station/${selectedStationId}/risk`, label: 'Risk & Alerts', icon: AlertTriangle },
    { to: `/station/${selectedStationId}/whatif`, label: 'What-If Engine', icon: FlaskConical, roleRequired: 'operator' },
    { to: `/station/${selectedStationId}/analytics`, label: 'Actual vs Predicted', icon: LineChart },
    { to: `/station/${selectedStationId}/recommendations`, label: 'AI Decisions', icon: Lightbulb, roleRequired: 'operator' },
    { to: '/admin', label: 'Admin Console', icon: ShieldAlert, roleRequired: 'admin' },
  ];

  return (
    <aside className="w-64 bg-polar-darker/95 border-r border-polar-border flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Station Name Header in Sidebar */}
      <div className="p-4 border-b border-polar-border/60">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Current Station Context</div>
        <div className="text-sm font-bold text-cyan-300 capitalize flex items-center space-x-2 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{selectedStationId.toUpperCase()} Research Base</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navItems.map((item) => {
          // RBAC visibility
          if (item.roleRequired === 'admin' && role !== 'admin') return null;
          if (item.roleRequired === 'operator' && role === 'viewer') return null;

          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === `/station/${selectedStationId}`}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/40 text-cyan-200 border border-cyan-500/40 shadow-sm shadow-cyan-900/50'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-polar-navy/50'
                } ${item.highlight ? 'ring-1 ring-cyan-500/20' : ''}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-cyan-400" />
              <span className="truncate">{item.label}</span>
              {item.highlight && (
                <span className="ml-auto text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 py-0.5 rounded font-mono">3D</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-polar-border/60 bg-polar-dark/60 text-[10px] text-slate-500 font-mono">
        <div>POLARTWIN v1.0 • Autonomous Tick: 4s</div>
        <div className="text-slate-400">Indian Antarctic Programme</div>
      </div>
    </aside>
  );
};
