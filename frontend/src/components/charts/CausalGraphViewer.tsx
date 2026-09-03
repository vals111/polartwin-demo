import React, { useState } from 'react';
import { TelemetrySnapshot, RiskData } from '../../types';
import { ArrowRight, Info, AlertTriangle, Wind, Zap, Cpu, Fuel, Truck, Shield } from 'lucide-react';

interface Props {
  snapshot?: TelemetrySnapshot;
  risk?: RiskData;
}

export const CausalGraphViewer: React.FC<Props> = ({ snapshot, risk }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const fuel = snapshot?.fuel;
  const log = snapshot?.logistics;

  const nodes = [
    {
      id: 'env',
      title: '1. Environment',
      icon: Wind,
      value: `${env?.temperature ?? -25}°C • ${env?.wind_speed ?? 32} km/h`,
      detail: 'External weather driver. Cold temperature drives heating load, katabatic winds and blizzards obscure solar array.',
      color: 'border-blue-500/60 bg-blue-950/40 text-blue-300'
    },
    {
      id: 'energy',
      title: '2. Energy Demand',
      icon: Zap,
      value: `${eng?.total_demand ?? 85} kW Demand`,
      detail: 'Aggregated electrical and thermal demand (base habitat + heating + science lab + water trace-heating).',
      color: 'border-amber-500/60 bg-amber-950/40 text-amber-300'
    },
    {
      id: 'gen',
      title: '3. Generator Load',
      icon: Cpu,
      value: `${eng?.generator_load ?? 68} kW Generator`,
      detail: 'Generator dispatched to meet demand deficit after subtracting solar PV generation (Solar: ' + (eng?.solar_output ?? 18) + ' kW).',
      color: 'border-orange-500/60 bg-orange-950/40 text-orange-300'
    },
    {
      id: 'fuel',
      title: '4. Fuel Burn & Reserve',
      icon: Fuel,
      value: `${fuel?.consumption_rate_l_per_hr ?? 17.5} L/hr • ${fuel?.fuel_percentage ?? 77}%`,
      detail: 'Fuel consumed proportionally to generator load. Reserve depleted steadily towards annual resupply.',
      color: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300'
    },
    {
      id: 'logistics',
      title: '5. Logistics Resupply',
      icon: Truck,
      value: `${fuel?.days_remaining ?? 19}d reserve vs ${fuel?.resupply_eta_days ?? 88}d ETA`,
      detail: 'Annual icebreaker voyage window. Severe weather or sea ice delays extend the required survival window.',
      color: 'border-indigo-500/60 bg-indigo-950/40 text-indigo-300'
    },
    {
      id: 'risk',
      title: '6. Composite Station Risk',
      icon: Shield,
      value: `${risk?.level ?? 'LOW'} (${risk?.score ?? 18}/100 pts)`,
      detail: 'Multi-domain weighted risk index. Automatically escalates if fuel depletion rate exceeds safe resupply margin.',
      color: 'border-rose-500/60 bg-rose-950/40 text-rose-300'
    }
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border border-polar-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-polar-border/60 mb-6 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white tracking-wide">
              Cross-Domain Causal Propagation Graph
            </h3>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-500/30">
              Flagship Twin Architecture
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Every simulation tick propagates cause-and-effect across domains — variables are never generated as independent random numbers.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>REAL-TIME COUPLING ACTIVE</span>
        </div>
      </div>

      {/* Horizontal Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 relative">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          const isSelected = selectedNode === node.id;

          return (
            <div key={node.id} className="relative flex flex-col justify-between">
              <div
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer h-full flex flex-col justify-between ${node.color} ${
                  isSelected ? 'ring-2 ring-cyan-400 scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold font-mono tracking-tight uppercase">
                      {node.title}
                    </span>
                    <Icon className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="text-xs font-bold font-mono text-white mt-1">
                    {node.value}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-current/20 text-[10px] opacity-80">
                  Click to view causal logic
                </div>
              </div>

              {/* Connecting arrow for larger screens */}
              {index < nodes.length - 1 && (
                <div className="hidden xl:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-cyan-400/80">
                  <ArrowRight className="w-4 h-4 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Node Details Box */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-xl bg-polar-dark/90 border border-cyan-500/40 text-xs flex items-start space-x-3 animate-fadeIn">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white mb-0.5 font-mono">
              {nodes.find(n => n.id === selectedNode)?.title} Causal Mechanism:
            </div>
            <p className="text-slate-300">
              {nodes.find(n => n.id === selectedNode)?.detail}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
