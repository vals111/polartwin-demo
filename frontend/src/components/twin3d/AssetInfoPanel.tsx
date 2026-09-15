import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TelemetrySnapshot } from '../../types';
import { X, Activity, ArrowRight, Zap, Droplet, Radio, Thermometer, Sun, Flame, Recycle, Package, Truck, FlaskConical, Users, Building2 } from 'lucide-react';
import { OperationalDomainCard } from '../dashboard/OperationalDomainCard';
import {
  ALL_DOMAIN_NODES,
  FACILITY_TO_DOMAIN_MAP,
  getDomainCausalConduits,
  extractLiveDomainData
} from '../../utils/domainDataHelper';

interface Props {
  assetId: string | null;
  onClose: () => void;
  snapshot?: TelemetrySnapshot;
  stationId?: string;
  onSelectAsset?: (assetId: string) => void;
}

const FACILITY_LABELS: Record<string, string> = {
  main_station:    'Main Station Operations Complex',
  power_house:     'Power House & Diesel Generators',
  solar_array:     'Photovoltaic Solar PV Array',
  fuel_depot:      'AGO Polar Diesel Fuel Tank Farm',
  water_facility:  'Potable Water & RO Desalination',
  waste_management:'Waste Processing & Incinerator',
  research_lab:    'Atmospheric & Scientific Research Lab',
  communication:   'Satellite Radome & Comms Tower',
  personnel_area:  'Expedition Living Quarters & Habitat',
  storage:         'Heavy Logistics & Spares Warehouse',
  logistics_area:  'Traverse Staging & Supply Depot',
  environment:     'Meteorological Tower & Weather Sensors',
};

type IconFC = React.FC<{className?:string}>;

interface FacVisual {
  emoji: string;
  bgPos: string;
  accentFrom: string;
  accentTo: string;
  statLabel: string;
  statIcon: IconFC;
}

const FACILITY_VISUALS: Record<string, FacVisual> = {
  main_station:    { emoji:'🏛',  bgPos:'50% 30%', accentFrom:'rgba(2,132,199,0.88)',   accentTo:'rgba(2,132,199,0)',    statLabel:'Command Hub',       statIcon:Building2 as IconFC },
  power_house:     { emoji:'⚡',  bgPos:'70% 60%', accentFrom:'rgba(217,119,6,0.88)',   accentTo:'rgba(217,119,6,0)',    statLabel:'Power Generation',  statIcon:Zap as IconFC },
  solar_array:     { emoji:'☀️',  bgPos:'55% 20%', accentFrom:'rgba(245,158,11,0.88)',  accentTo:'rgba(245,158,11,0)',   statLabel:'Solar Output',      statIcon:Sun as IconFC },
  fuel_depot:      { emoji:'🛢',  bgPos:'80% 70%', accentFrom:'rgba(220,38,38,0.88)',   accentTo:'rgba(220,38,38,0)',    statLabel:'Fuel Reserve',      statIcon:Flame as IconFC },
  water_facility:  { emoji:'💧',  bgPos:'40% 45%', accentFrom:'rgba(14,165,233,0.88)',  accentTo:'rgba(14,165,233,0)',   statLabel:'Water Supply',      statIcon:Droplet as IconFC },
  waste_management:{ emoji:'♻️',  bgPos:'60% 75%', accentFrom:'rgba(5,150,105,0.88)',   accentTo:'rgba(5,150,105,0)',    statLabel:'Waste Processing',  statIcon:Recycle as IconFC },
  research_lab:    { emoji:'🔬',  bgPos:'35% 35%', accentFrom:'rgba(124,58,237,0.88)',  accentTo:'rgba(124,58,237,0)',   statLabel:'Research Active',   statIcon:FlaskConical as IconFC },
  communication:   { emoji:'📡',  bgPos:'20% 25%', accentFrom:'rgba(0,212,255,0.88)',   accentTo:'rgba(0,212,255,0)',    statLabel:'Comms Online',      statIcon:Radio as IconFC },
  personnel_area:  { emoji:'👥',  bgPos:'50% 50%', accentFrom:'rgba(37,99,235,0.88)',   accentTo:'rgba(37,99,235,0)',    statLabel:'Crew Habitat',      statIcon:Users as IconFC },
  storage:         { emoji:'📦',  bgPos:'75% 55%', accentFrom:'rgba(5,150,105,0.88)',   accentTo:'rgba(5,150,105,0)',    statLabel:'Storage Capacity',  statIcon:Package as IconFC },
  logistics_area:  { emoji:'🚛',  bgPos:'85% 65%', accentFrom:'rgba(249,115,22,0.88)',  accentTo:'rgba(249,115,22,0)',   statLabel:'Traverse Ops',      statIcon:Truck as IconFC },
  environment:     { emoji:'❄️',  bgPos:'25% 20%', accentFrom:'rgba(125,211,252,0.88)', accentTo:'rgba(125,211,252,0)', statLabel:'Weather Monitoring',statIcon:Thermometer as IconFC },
};

export const AssetInfoPanel: React.FC<Props> = ({
  assetId,
  onClose,
  snapshot,
  stationId = 'maitri',
  onSelectAsset
}) => {
  const navigate = useNavigate();
  if (!assetId) return null;

  const mapping    = FACILITY_TO_DOMAIN_MAP[assetId] || { domainId: 'main_station' };
  const domainNode = ALL_DOMAIN_NODES[mapping.domainId] || ALL_DOMAIN_NODES['main_station'];
  const allDomainData = extractLiveDomainData(stationId, snapshot);
  const domainData = (allDomainData as any)[mapping.domainId] || allDomainData.main_station;
  const causalConduits = getDomainCausalConduits(domainNode.id);
  const facilityTitle  = FACILITY_LABELS[assetId] || domainNode.name;
  const vis = FACILITY_VISUALS[assetId] ?? FACILITY_VISUALS['main_station'];
  const StatIcon = vis.statIcon;

  const handleDomainFocus = (conduitDomain: { id: string }) => {
    if (onSelectAsset) {
      const targetFac = Object.entries(FACILITY_TO_DOMAIN_MAP).find(
        ([_, v]) => v.domainId === conduitDomain.id
      );
      if (targetFac) { onSelectAsset(targetFac[0]); return; }
    }
    navigate(`/station/${stationId}/${conduitDomain.id}`);
  };

  return (
    <div
      className="absolute top-4 right-4 z-40 w-[390px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7.5rem)] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto"
      style={{ filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.82))' }}
    >
      <div
        className="rounded-2xl border flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(4,12,30,0.96)',
          borderColor: `rgba(${domainNode.accentRgb},0.55)`,
          boxShadow: `0 0 0 1px rgba(${domainNode.accentRgb},0.12), 0 8px 32px rgba(0,0,0,0.75)`,
        }}
      >
        {/* FACILITY IMAGE BANNER */}
        <div className="relative w-full h-[148px] overflow-hidden flex-shrink-0">
          <img
            src="/station_banner.jpg"
            alt={facilityTitle}
            className="w-full h-full object-cover"
            style={{ objectPosition: vis.bgPos }}
            draggable={false}
          />
          <div
            className="absolute inset-0"
            style={{
              background:`linear-gradient(135deg,${vis.accentFrom} 0%,${vis.accentTo} 55%,rgba(0,0,0,0.45) 100%)`,
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-14"
            style={{ background:'linear-gradient(to bottom,transparent,rgba(4,12,30,0.96))' }}
          />
          <div className="absolute top-3 left-3 flex items-center gap-2.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl border shadow-lg"
              style={{
                background:`rgba(${domainNode.accentRgb},0.22)`,
                borderColor:`rgba(${domainNode.accentRgb},0.6)`,
                backdropFilter:'blur(8px)',
              }}
            >
              {vis.emoji}
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1" style={{color:domainNode.color}}>
                <StatIcon className="w-3 h-3" />
                <span>{vis.statLabel}</span>
              </div>
              <div className="text-[10px] font-mono text-white/55 mt-0.5">{stationId.toUpperCase()} BASE</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/70 hover:text-white border border-white/20 hover:border-white/50 transition-colors cursor-pointer"
            style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)' }}
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-2.5 left-3 right-12">
            <div
              className="text-[13px] font-mono font-bold leading-snug"
              style={{ color:'#fff', textShadow:'0 1px 8px rgba(0,0,0,0.95)' }}
            >
              {facilityTitle}
            </div>
          </div>
        </div>

        {/* SCROLLABLE DOMAIN CARD */}
        <div
          className="p-3 pt-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar"
          style={{ maxHeight:'calc(100vh - 19rem)' }}
        >
          <OperationalDomainCard
            node={domainNode}
            data={domainData}
            stationId={stationId}
            isSelected={true}
            showFooterButtons={true}
            causalConduits={{
              incoming: causalConduits.incoming,
              outgoing: causalConduits.outgoing,
              onFocusDomain: handleDomainFocus,
            }}
            onClick={()=>navigate(`/station/${stationId}/${domainNode.route}`)}
            className="!shadow-none !border-cyan-500/40"
          />
        </div>

        {/* BOTTOM ACTION BAR */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-[11px] font-mono bg-black/40 flex-shrink-0"
          style={{ borderColor:`rgba(${domainNode.accentRgb},0.25)` }}
        >
          <span className="text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400" />
            Live Telemetry Synced
          </span>
          <button
            onClick={()=>navigate(`/station/${stationId}/${domainNode.route}`)}
            className="flex items-center gap-1 font-bold hover:underline transition-colors cursor-pointer"
            style={{ color:domainNode.color }}
          >
            <span>Open Full Cockpit</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
