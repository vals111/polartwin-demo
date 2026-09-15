import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TelemetrySnapshot } from '../../types';
import { X, ChevronLeft, ChevronRight, Activity, Layers, ArrowRight } from 'lucide-react';
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

// Ordered facility list aligned with causal domain hierarchy
const ORDERED_FACILITIES: string[] = [
  'main_station',
  'power_house',
  'solar_array',
  'fuel_depot',
  'water_facility',
  'waste_management',
  'personnel_area',
  'communication',
  'research_lab',
  'environment',
  'storage',
  'logistics_area'
];

// Human readable facility titles for the 3D twin
const FACILITY_LABELS: Record<string, string> = {
  main_station: 'Main Station Operations Complex',
  power_house: 'Power House & Diesel Generators',
  solar_array: 'Photovoltaic Solar PV Array',
  fuel_depot: 'AGO Polar Diesel Fuel Tank Farm',
  water_facility: 'Potable Water & RO Desalination',
  waste_management: 'Waste Processing & Incinerator',
  research_lab: 'Atmospheric & Scientific Research Lab',
  communication: 'Satellite Radome & Comms Tower',
  personnel_area: 'Expedition Living Quarters & Habitat',
  storage: 'Heavy Logistics & Spares Warehouse',
  logistics_area: 'Traverse Staging & Supply Depot',
  environment: 'Meteorological Tower & Weather Sensors',
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

  const currentIndex = ORDERED_FACILITIES.indexOf(assetId);
  const prevFacility = currentIndex > 0 ? ORDERED_FACILITIES[currentIndex - 1] : ORDERED_FACILITIES[ORDERED_FACILITIES.length - 1];
  const nextFacility = currentIndex < ORDERED_FACILITIES.length - 1 ? ORDERED_FACILITIES[currentIndex + 1] : ORDERED_FACILITIES[0];

  const mapping = FACILITY_TO_DOMAIN_MAP[assetId] || { domainId: 'main_station' };
  const domainNode = ALL_DOMAIN_NODES[mapping.domainId] || ALL_DOMAIN_NODES['main_station'];
  const allDomainData = extractLiveDomainData(stationId, snapshot);
  const domainData = (allDomainData as any)[mapping.domainId] || allDomainData.main_station;
  const causalConduits = getDomainCausalConduits(domainNode.id);
  const facilityTitle = FACILITY_LABELS[assetId] || domainNode.name;

  const handleDomainFocus = (conduitDomain: { id: string }) => {
    // If a conduit domain is clicked, reverse-map to the 3D building if onSelectAsset provided
    if (onSelectAsset) {
      // Find facility mapped to this domain
      const targetFac = Object.entries(FACILITY_TO_DOMAIN_MAP).find(
        ([_, v]) => v.domainId === conduitDomain.id
      );
      if (targetFac) {
        onSelectAsset(targetFac[0]);
        return;
      }
    }
    navigate(`/station/${stationId}/${conduitDomain.id}`);
  };

  return (
    <div
      className="absolute top-4 right-4 z-40 w-[385px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7.5rem)] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto"
      style={{
        filter: 'drop-shadow(0 12px 36px rgba(0, 0, 0, 0.75))',
      }}
    >
      {/* Container Frame with domain-colored top glow */}
      <div
        className="rounded-2xl border flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl"
        style={{
          background: 'rgba(5, 15, 36, 0.94)',
          borderColor: `rgba(${domainNode.accentRgb}, 0.5)`,
          boxShadow: `0 0 35px rgba(${domainNode.accentRgb}, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
        }}
      >
        {/* Top Header Strip with Domain Badge & Prev/Next Facility Navigator */}
        <div
          className="px-3.5 py-2.5 flex items-center justify-between border-b flex-shrink-0"
          style={{
            borderColor: `rgba(${domainNode.accentRgb}, 0.25)`,
            background: `linear-gradient(90deg, rgba(${domainNode.accentRgb}, 0.2) 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
              style={{
                background: domainNode.color,
                boxShadow: `0 0 12px ${domainNode.color}`,
              }}
            />
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-wider truncate"
              style={{ color: domainNode.color }}
            >
              {domainNode.tier}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Prev / Next Facility Navigator */}
            {onSelectAsset && (
              <div className="flex items-center bg-slate-900/80 border border-slate-700/60 rounded-lg overflow-hidden mr-1">
                <button
                  onClick={() => onSelectAsset(prevFacility)}
                  className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Previous Facility"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 px-1 border-x border-slate-800">
                  {currentIndex + 1}/{ORDERED_FACILITIES.length}
                </span>
                <button
                  onClick={() => onSelectAsset(nextFacility)}
                  className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Next Facility"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-polar-dark/90 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700/50 transition-colors cursor-pointer"
              title="Close Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected 3D Building Context Bar */}
        <div className="px-4 pt-2 pb-1 flex items-center justify-between text-xs flex-shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-1.5 min-w-0 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="font-semibold text-slate-200 truncate">{facilityTitle}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex-shrink-0">
            {stationId.toUpperCase()} BASE
          </span>
        </div>

        {/* Scrollable Container for 2D Operational Domain Card */}
        <div className="p-3 pt-2 overflow-y-auto max-h-[calc(100vh-14rem)] space-y-2 custom-scrollbar">
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
            onClick={() => navigate(`/station/${stationId}/${domainNode.route}`)}
            className="!shadow-none !border-cyan-500/40"
          />
        </div>

        {/* Bottom Quick Cockpit Bar */}
        <div
          className="px-4 py-2 border-t flex items-center justify-between text-[11px] font-mono bg-black/30"
          style={{ borderColor: `rgba(${domainNode.accentRgb}, 0.2)` }}
        >
          <span className="text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400" />
            Live Telemetry Synced
          </span>

          <button
            onClick={() => navigate(`/station/${stationId}/${domainNode.route}`)}
            className="flex items-center gap-1 font-bold text-cyan-300 hover:text-cyan-100 hover:underline transition-colors cursor-pointer"
          >
            <span>Open Domain Cockpit</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
