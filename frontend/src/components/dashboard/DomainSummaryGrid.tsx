import React from 'react';
import { Live dataSnapshot } from '../../types';
import {
  Zap, Droplet, Wrench, Truck, CloudSnow, Radio, Users, Building2
} from 'lucide-react';

interface Props {
  snapshot?: Live dataSnapshot;
  onSeleocean depth probeomain?: (domainKey: string) => void;
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
      id: 'infrastructure',
      name: 'Infrastructure',
      icon: Building2,
      metric: `Stress ${snapshot?.infrastructure?.structural_stress_index ?? 18}%`,
      submetric: `Eff: ${snapshot?.infrastructure?.thermal_insulation_eff ?? 88}% • Drift: ${snapshot?.infrastructure?.snow_drift_accumulation_m ?? 0.42}m`,
      status: (snapshot?.infrastructure?.structural_stress_index ?? 18) > 75 ? 'Watch' : 'Nominal',
      score: ops?.domain_readiness?.infrastructure ?? 94,
      color: 'text-cyan-400',
      bgColor: 'border-cyan-500/30'
    },
    {
      id: 'energy_fuel',
      name: 'Energy & Fuel',
      icon: Zap,
      metric: `${eng?.generator_load ?? 68} kW • ${fuel?.fuel_percentage ?? 78}%`,
      submetric: `Solar: ${eng?.solar_output ?? 22} kW | Batt: ${eng?.battery_level ?? 92}% | Fuel: ${fuel?.days_remaining ?? 18}d rem`,
      status: `${eng?.status ?? 'Nominal'} / ${fuel?.reserve_zone ?? 'Normal'}`,
      score: Math.round(((ops?.domain_readiness?.energy ?? 94) + (ops?.domain_readiness?.fuel ?? 96)) / 2),
      color: 'text-amber-400',
      bgColor: 'border-amber-500/30'
    },
    {
      id: 'logistics',
      name: 'Transportation & Logistics',
      icon: Truck,
      metric: '88 Days ETA',
      submetric: 'MV Vasiliy Golovnin • Nov-Jan window',
      status: 'On Schedule',
      score: ops?.domain_readiness?.logistics ?? 88,
      color: 'text-teal-400',
      bgColor: 'border-teal-500/30'
    },
    {
      id: 'environment',
      name: 'Environment & Weather',
      icon: CloudSnow,
      metric: `${env?.temperature ?? -25.2}°C`,
      submetric: `Wind: ${env?.wind_speed ?? 32} km/h • Vis: ${env?.visibility ?? 18}km`,
      status: env?.condition ?? 'Partly Cloudy',
      score: ops?.domain_readiness?.environment ?? 85,
      color: 'text-indigo-400',
      bgColor: 'border-indigo-500/30'
    },
    {
      id: 'communication',
      name: 'Communication',
      icon: Radio,
      metric: '120 Mbps',
      submetric: 'LEO Polar link • Signal delay 78ms',
      status: 'Online',
      score: ops?.domain_readiness?.communication ?? 98,
      color: 'text-sky-400',
      bgColor: 'border-sky-500/30'
    },
    {
      id: 'water',
      name: 'Water',
      icon: Droplet,
      metric: `${water?.storage_liters?.toLocaleString() ?? '18,500'} L`,
      submetric: `${water?.pipe_temp_c ?? 3.8}°C • Freeze: ${water?.freeze_risk ?? 'Low'}`,
      status: water?.freeze_risk === 'Low' ? 'Nominal' : 'Freeze Risk',
      score: ops?.domain_readiness?.water ?? 92,
      color: 'text-blue-400',
      bgColor: 'border-blue-500/30'
    },
    {
      id: 'personnel',
      name: 'Personnel Safety & Emergency',
      icon: Users,
      metric: '25 Personnel',
      submetric: 'Fire armed • Backup systems N+2 • All Safe',
      status: 'Nominal',
      score: Math.round(((ops?.domain_readiness?.personnel ?? 100) + (ops?.domain_readiness?.safety ?? 96)) / 2),
      color: 'text-purple-400',
      bgColor: 'border-purple-500/30'
    },
    {
      id: 'equipment',
      name: 'Equipment & Machinery',
      icon: Wrench,
      metric: `${equip?.avg_health ?? 93.5}%`,
      submetric: `${equip?.items?.length ?? 6} active machines • 0 critical trips`,
      status: 'Operational',
      score: ops?.domain_readiness?.equipment ?? 93.5,
      color: 'text-emerald-400',
      bgColor: 'border-emerald-500/30'
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
