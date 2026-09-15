import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { StationScene } from '../components/twin3d/StationScene';
import { AssetInfoPanel } from '../components/twin3d/AssetInfoPanel';
import { OperationalDomainCard } from '../components/dashboard/OperationalDomainCard';
import {
  ALL_DOMAIN_NODES,
  FACILITY_TO_DOMAIN_MAP,
  getDomainCausalConduits,
  extractLiveDomainData
} from '../utils/domainDataHelper';
import {
  Zap, Droplet, Radio, Truck, LayoutGrid, X,
  Building2, LucideIcon
} from 'lucide-react';

// Domain cluster groupings for perfect alignment
interface DomainGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  facilities: Array<{
    id: string;
    label: string;
    icon: string;
    domainId: string;
  }>;
}

const DOMAIN_GROUPS: DomainGroup[] = [
  {
    id: 'energy',
    title: 'Energy & Power',
    icon: Zap,
    color: '#F4C430',
    facilities: [
      { id: 'power_house', label: 'Power House', icon: '⚡', domainId: 'energy' },
      { id: 'solar_array', label: 'Solar Array', icon: '☀️', domainId: 'energy' },
      { id: 'fuel_depot', label: 'Fuel Depot', icon: '🛢', domainId: 'fuel' },
    ],
  },
  {
    id: 'life_support',
    title: 'Life Support & Habitat',
    icon: Droplet,
    color: '#3882F6',
    facilities: [
      { id: 'water_facility', label: 'Water Facility', icon: '💧', domainId: 'water' },
      { id: 'waste_management', label: 'Waste Processing', icon: '♻️', domainId: 'water' },
      { id: 'personnel_area', label: 'Habitat Quarters', icon: '👥', domainId: 'personnel' },
    ],
  },
  {
    id: 'science_comms',
    title: 'Telemetry & Science',
    icon: Radio,
    color: '#00D4FF',
    facilities: [
      { id: 'communication', label: 'Comms Tower', icon: '📡', domainId: 'communication' },
      { id: 'research_lab', label: 'Research Lab', icon: '🔬', domainId: 'equipment' },
      { id: 'environment', label: 'Weather Tower', icon: '❄️', domainId: 'environment' },
    ],
  },
  {
    id: 'operations',
    title: 'Logistics & Command',
    icon: Truck,
    color: '#00E5FF',
    facilities: [
      { id: 'storage', label: 'Warehouse', icon: '📦', domainId: 'inventory' },
      { id: 'logistics_area', label: 'Traverse Staging', icon: '🚛', domainId: 'logistics' },
      { id: 'main_station', label: 'Station Command', icon: '🏛', domainId: 'main_station' },
    ],
  },
];

export const Twin3DPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rawId = id || 'maitri';

  const { liveSnapshot } = useTelemetryStore();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isGridOpen, setIsGridOpen] = useState<boolean>(false);

  // Clear selected asset if station changes
  useEffect(() => {
    setSelectedAsset(null);
  }, [rawId]);

  const snapshot = liveSnapshot[rawId];
  const allDomainData = useMemo(() => extractLiveDomainData(rawId, snapshot), [rawId, snapshot]);

  // Stable callback — never recreated so StationScene's useEffect never re-fires
  const handleSelectAsset = useCallback((assetId: string) => {
    setSelectedAsset(assetId);
    setIsGridOpen(false);
  }, []);

  return (
    <div className="w-full h-[calc(100vh-6.5rem)] relative rounded-2xl overflow-hidden border border-[rgba(30,58,95,0.8)] shadow-2xl bg-polar-dark">
      {/* 3D Scene Viewport */}
      <StationScene
        key={rawId}
        snapshot={snapshot}
        selectedAsset={selectedAsset}
        onSelectAsset={handleSelectAsset}
        stationId={rawId}
      />

      {/* Top Floating Controls Bar */}
      {selectedAsset && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setSelectedAsset(null)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1.5 shadow"
          >
            <X className="w-3 h-3" />
            <span>Deselect</span>
          </button>
        </div>
      )}

      {/* ── Active 2D Domain Card on Building Click ── */}
      <AssetInfoPanel
        assetId={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        snapshot={snapshot}
        stationId={rawId}
        onSelectAsset={setSelectedAsset}
      />



      {/* ── FULL ALIGNED DOMAIN CARDS GRID OVERLAY ── */}
      {isGridOpen && (
        <div className="absolute inset-0 z-50 bg-[#030919]/90 backdrop-blur-xl p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
          {/* Grid Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-cyan-400" />
                <span>OPERATIONAL DOMAIN CARDS • {rawId.toUpperCase()} STATION</span>
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                All 12 live operational cards aligned across power, life support, telemetry and logistics domains
              </p>
            </div>

            <button
              onClick={() => setIsGridOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer text-xs font-mono"
            >
              <X className="w-4 h-4" />
              <span>Back to 3D Twin</span>
            </button>
          </div>

          {/* Aligned 4-Column Domain Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {DOMAIN_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="flex flex-col gap-3">
                  {/* Category Banner */}
                  <div
                    className="px-3 py-2 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs uppercase"
                    style={{
                      borderColor: `${group.color}40`,
                      background: `linear-gradient(90deg, ${group.color}18 0%, transparent 100%)`,
                      color: group.color,
                    }}
                  >
                    <GroupIcon className="w-4 h-4" />
                    <span>{group.title}</span>
                  </div>

                  {/* Cards under this domain */}
                  {group.facilities.map((fac) => {
                    const domainNode = ALL_DOMAIN_NODES[fac.domainId] || ALL_DOMAIN_NODES['main_station'];
                    const domainData = (allDomainData as any)[fac.domainId] || allDomainData.main_station;
                    const causalConduits = getDomainCausalConduits(domainNode.id);
                    const isSelected = selectedAsset === fac.id;

                    return (
                      <div
                        key={fac.id}
                        className="relative transition-transform hover:-translate-y-0.5"
                      >
                        {/* Facility quick-target badge */}
                        <div className="flex items-center justify-between text-[11px] font-mono px-2 py-1 bg-slate-900/90 rounded-t-xl border-x border-t border-slate-700/60 text-slate-300">
                          <span className="flex items-center gap-1 font-semibold">
                            <span>{fac.icon}</span>
                            <span>{fac.label}</span>
                          </span>
                          <button
                            onClick={() => {
                              setSelectedAsset(fac.id);
                              setIsGridOpen(false);
                            }}
                            className="text-[10px] text-cyan-400 hover:text-cyan-200 font-bold underline cursor-pointer"
                          >
                            Focus in 3D →
                          </button>
                        </div>

                        {/* Exact Operational Domain Card */}
                        <OperationalDomainCard
                          node={domainNode}
                          data={domainData}
                          stationId={rawId}
                          isSelected={isSelected}
                          showFooterButtons={false}
                          causalConduits={{
                            incoming: causalConduits.incoming,
                            outgoing: causalConduits.outgoing,
                            onFocusDomain: (cd) => {
                              const target = Object.entries(FACILITY_TO_DOMAIN_MAP).find(
                                ([_, v]) => v.domainId === cd.id
                              );
                              if (target) {
                                setSelectedAsset(target[0]);
                                setIsGridOpen(false);
                              } else {
                                navigate(`/station/${rawId}/${cd.id}`);
                              }
                            },
                          }}
                          onClick={() => {
                            setSelectedAsset(fac.id);
                            setIsGridOpen(false);
                          }}
                          className="!rounded-t-none !border-t-0"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

