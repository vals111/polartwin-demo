import React from 'react';
import { TelemetrySnapshot } from '../../types';
import {
  Zap, Fuel, Droplet, Trash2, Apple, Home, Wrench,
  Truck, CloudSnow, Radio, Users, Microscope, ShieldAlert,
  CalendarCheck, Archive, Activity
} from 'lucide-react';

interface Props {
  snapshot?: TelemetrySnapshot;
  onSelectDomain?: (domainKey: string) => void;
}

export const DomainSummaryGrid: React.FC<Props> = ({ snapshot }) => {
  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const fuel = snapshot?.fuel;
  const water = snapshot?.water;
  const equip = snapshot?.equipment;
  const ops = snapshot?.station_ops;

  const domains = [
    {
      id: 'energy',
      name: 'Energy & Power',
      icon: Zap,
      metric: `${eng?.generator_load ?? 68} kW`,
      submetric: `Solar: ${eng?.solar_output ?? 22} kW | Batt: ${eng?.battery_level ?? 92}%`,
      status: eng?.status ?? 'Nominal',
      score: ops?.domain_readiness?.energy ?? 94,
      color: 'text-amber-400',
      bgColor: 'border-amber-500/30'
    },
    {
      id: 'fuel',
      name: 'Fuel Depot',
      icon: Fuel,
      metric: `${fuel?.fuel_percentage ?? 78}%`,
      submetric: `${fuel?.current_level?.toLocaleString() ?? '142,000'} L • ${fuel?.days_remaining ?? 18}d rem`,
      status: fuel?.reserve_zone ?? 'Normal',
      score: ops?.domain_readiness?.fuel ?? 96,
      color: 'text-cyan-400',
      bgColor: 'border-cyan-500/30'
    },
    {
      id: 'water',
      name: 'Water & Intake',
      icon: Droplet,
      metric: `${water?.storage_liters?.toLocaleString() ?? '18,500'} L`,
      submetric: `${water?.pipe_temp_c ?? 3.8}°C • Freeze: ${water?.freeze_risk ?? 'Low'}`,
      status: water?.freeze_risk === 'Low' ? 'Nominal' : 'Freeze Risk',
      score: ops?.domain_readiness?.water ?? 92,
      color: 'text-blue-400',
      bgColor: 'border-blue-500/30'
    },
    {
      id: 'environment',
      name: 'Polar Environment',
      icon: CloudSnow,
      metric: `${env?.temperature ?? -25.2}°C`,
      submetric: `Wind: ${env?.wind_speed ?? 32} km/h • Vis: ${env?.visibility ?? 18}km`,
      status: env?.condition ?? 'Partly Cloudy',
      score: ops?.domain_readiness?.environment ?? 85,
      color: 'text-indigo-400',
      bgColor: 'border-indigo-500/30'
    },
    {
      id: 'equipment',
      name: 'Equipment Health',
      icon: Wrench,
      metric: `${equip?.avg_health ?? 93.5}%`,
      submetric: `${equip?.items?.length ?? 6} active machines • 0 critical trips`,
      status: 'Operational',
      score: ops?.domain_readiness?.equipment ?? 93.5,
      color: 'text-emerald-400',
      bgColor: 'border-emerald-500/30'
    },
    {
      id: 'safety',
      name: 'Safety & Emergency',
      icon: ShieldAlert,
      metric: 'Level 0',
      submetric: 'Fire armed • Redundancy N+2',
      status: 'Secure',
      score: ops?.domain_readiness?.safety ?? 96,
      color: 'text-rose-400',
      bgColor: 'border-rose-500/30'
    },
    {
      id: 'logistics',
      name: 'Logistics & Resupply',
      icon: Truck,
      metric: '88 Days ETA',
      submetric: 'MV Vasiliy Golovnin • Nov-Jan window',
      status: 'On Schedule',
      score: ops?.domain_readiness?.logistics ?? 88,
      color: 'text-teal-400',
      bgColor: 'border-teal-500/30'
    },
    {
      id: 'communication',
      name: 'Satellite Links',
      icon: Radio,
      metric: '120 Mbps',
      submetric: 'LEO Polar link • Latency 78ms',
      status: 'Online',
      score: ops?.domain_readiness?.communication ?? 98,
      color: 'text-sky-400',
      bgColor: 'border-sky-500/30'
    },
    {
      id: 'personnel',
      name: 'Personnel & Crew',
      icon: Users,
      metric: '25 Personnel',
      submetric: '10 Sci, 10 Tech, 1 Med, 4 Ops',
      status: 'Accounted',
      score: ops?.domain_readiness?.personnel ?? 100,
      color: 'text-purple-400',
      bgColor: 'border-purple-500/30'
    },
    {
      id: 'research',
      name: 'Research Operations',
      icon: Microscope,
      metric: '4 Active Labs',
      submetric: '16.5 kW load • 48.2 GB/day output',
      status: 'Running',
      score: ops?.domain_readiness?.research ?? 95,
      color: 'text-pink-400',
      bgColor: 'border-pink-500/30'
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure',
      icon: Home,
      metric: 'Stress 18%',
      submetric: 'Main habitat & Zub/Quilty pump houses',
      status: 'Intact',
      score: ops?.domain_readiness?.infrastructure ?? 93,
      color: 'text-orange-400',
      bgColor: 'border-orange-500/30'
    },
    {
      id: 'waste',
      name: 'Waste Systems',
      icon: Trash2,
      metric: '16.8% Full',
      submetric: 'Incinerator / WWTP Compliant',
      status: 'Treaty Compliant',
      score: ops?.domain_readiness?.waste ?? 90,
      color: 'text-lime-400',
      bgColor: 'border-lime-500/30'
    },
    {
      id: 'supplies',
      name: 'Food & Rations',
      icon: Apple,
      metric: '185 Days Stock',
      submetric: 'Freezer -21°C • Deep freeze intact',
      status: 'Optimal Margin',
      score: ops?.domain_readiness?.supplies ?? 95,
      color: 'text-emerald-400',
      bgColor: 'border-emerald-500/30'
    },
    {
      id: 'maintenance',
      name: 'Maintenance Queue',
      icon: CalendarCheck,
      metric: '2 Work Orders',
      submetric: '1 in-progress • 1 scheduled preventive',
      status: 'Spares In Stock',
      score: ops?.domain_readiness?.maintenance ?? 90,
      color: 'text-yellow-400',
      bgColor: 'border-yellow-500/30'
    },
    {
      id: 'inventory',
      name: 'Critical Inventory',
      icon: Archive,
      metric: '0 Stockouts',
      submetric: 'Filters, synthetic oils, pump seals',
      status: 'Healthy',
      score: ops?.domain_readiness?.inventory ?? 94,
      color: 'text-blue-400',
      bgColor: 'border-blue-500/30'
    },
    {
      id: 'station_ops',
      name: 'Station Readiness',
      icon: Activity,
      metric: `${ops?.overall_readiness ?? 92.5}%`,
      submetric: '45th Indian Scientific Expedition',
      status: ops?.status_band ?? 'Nominal',
      score: ops?.overall_readiness ?? 92.5,
      color: 'text-cyan-400',
      bgColor: 'border-cyan-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {domains.map((dom) => {
        const Icon = dom.icon;
        return (
          <div
            key={dom.id}
            className={`glass-panel p-4 rounded-xl border ${dom.bgColor} hover:border-cyan-400/50 transition-all duration-200 group flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-polar-dark/80 text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {dom.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-polar-dark/80 text-slate-300 border border-polar-border">
                  {dom.score}%
                </span>
              </div>

              <div className="text-lg font-bold font-mono text-white tracking-tight mt-1">
                {dom.metric}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                {dom.submetric}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-polar-border/40 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Condition</span>
              <span className={`font-mono font-semibold ${dom.color}`}>{dom.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
