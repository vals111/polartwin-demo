import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLive dataStore } from '../store/live dataStore';
import { StationScene } from '../components/twin3d/StationScene';
import { OperationalDomainCard } from '../components/dashboard/OperationalDomainCard';
import { DomainLive dataInspectorModal } from '../components/dashboard/DomainLive dataInspectorModal';
import {
  ALL_DOMAIN_NODES,
  FACILITY_TO_DOMAIN_MAP,
  getDomainCausalConduits,
  extractLiveDomainData
} from '../utils/domainDataHelper';
import {
  Zap, Droplet, Radio, Truck, LayoutGrid, X,
  Building2, LucideIcon, ArrowLeft, Maximize, Minimize
} from 'lucide-react';

const FACILITY_LABELS: Record<string, string> = {
  main_station:    'Central Command & Habitation Pod',
  power_house:     'Primary Power House (Diesel Diesel generators)',
  solar_array:     'Double-sided Solar panel Solar Array',
  fuel_depot:      'Fuel Storage Tanks & AGO Reserve',
  water_facility:  'Water Treatment & Trace-Heated Conduit',
  waste_management:'Waste Processing & Incineration Unit',
  research_lab:    'Weather layer & Cryospheric Research Lab',
  communication:   'Satellite Earth Terminal & Radome Tower',
  personnel_area:  'Expedition Living Quarters & Habitat',
  storage:         'Heavy Logistics & Spares Warehouse',
  logistics_area:  'Traverse Staging & Supply Depot',
  environment:     'Meteorological Tower & Weather Sensors',
};

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
    title: 'Live data & Science',
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

  const { liveSnapshot } = useLive dataStore();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isGridOpen, setIsGridOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [inspectorDomainId, setInspectorDomainId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen state with document events (e.g. Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, []);

  // Clear selected asset if station changes
  useEffect(() => {
    setSelectedAsset(null);
  }, [rawId]);

  const snapshot = liveSnapshot[rawId];
  const allDomainData = useMemo(() => extractLiveDomainData(rawId, snapshot), [rawId, snapshot]);

  // Active selected facility to domain node mapping
  const activeDomainMapping = useMemo(() => {
    if (!selectedAsset) return null;
    return FACILITY_TO_DOMAIN_MAP[selectedAsset] || { domainId: selectedAsset };
  }, [selectedAsset]);

  const activeDomainId = activeDomainMapping?.domainId || selectedAsset;
  const activeDomainNode = useMemo(() => {
    if (!activeDomainId) return null;
    return ALL_DOMAIN_NODES[activeDomainId] || ALL_DOMAIN_NODES['main_station'];
  }, [activeDomainId]);

  const activeDomainData = useMemo(() => {
    if (!activeDomainId) return null;
    return (allDomainData as any)[activeDomainId] || allDomainData.main_station;
  }, [activeDomainId, allDomainData]);

  const activeCausalConduits = useMemo(() => {
    if (!activeDomainNode) return null;
    return getDomainCausalConduits(activeDomainNode.id);
  }, [activeDomainNode]);

  // Stable callback — never recreated so StationScene's useEffect never re-fires
  const handleSelectAsset = useCallback((assetId: string) => {
    setSelectedAsset(assetId);
    setIsGridOpen(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-0'
          : 'h-[calc(100vh-6.5rem)] relative rounded-2xl overflow-hidden border border-[rgba(30,58,95,0.8)] shadow-2xl'
      } bg-polar-dark transition-all duration-300`}
    >
      {/* 3D Scene Viewport */}
      <StationScene
        key={rawId}
        snapshot={snapshot}
        selectedAsset={selectedAsset}
        onSelectAsset={handleSelectAsset}
        stationId={rawId}
      />

      {/* Top Left Navigation & Controls Bar */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/60 transition-all cursor-pointer shadow-lg backdrop-blur-md"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
          <span>Back</span>
        </button>

        {selectedAsset && (
          <button
            onClick={() => setSelectedAsset(null)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1.5 shadow"
          >
            <X className="w-3 h-3" />
            <span>Deselect</span>
          </button>
        )}
      </div>

      {/* Bottom Right Fullscreen Toggle */}
      <div className="absolute bottom-3.5 right-3.5 z-30 pointer-events-auto">
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/60 shadow-lg backdrop-blur-md cursor-pointer transition-all"
          title={isFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fullscreen</span>
            </>
          )}
        </button>
      </div>

      {/* ── Active Domain Card on Building Click (Exact Replicate of Inter-Domain Causal Flow Architecture) ── */}
      {selectedAsset && activeDomainNode && (
        <div className="absolute top-4 right-4 z-40 w-[350px] max-w-[calc(100vw-2rem)] flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
          {/* Top facility title header bar with close button */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#071326] border border-[#1e3a5f] shadow-xl">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold text-white truncate">
                  {FACILITY_LABELS[selectedAsset] || activeDomainNode.name}
                </div>
                <div className="text-[10px] font-mono text-cyan-400/80 uppercase">
                  {rawId.toUpperCase()} BASE • {activeDomainNode.tier}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedAsset(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer flex-shrink-0"
              title="Close Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exact OperationalDomainCard from Inter-Domain Causal Flow Architecture */}
          <OperationalDomainCard
            node={activeDomainNode}
            data={activeDomainData}
            stationId={rawId}
            isSelected={false}
            showFooterButtons={false}
            causalConduits={{
              incoming: activeCausalConduits?.incoming || [],
              outgoing: activeCausalConduits?.outgoing || [],
              onFocusDomain: (cd) => {
                const targetFac = Object.entries(FACILITY_TO_DOMAIN_MAP).find(
                  ([_, v]) => v.domainId === cd.id
                );
                if (targetFac) {
                  setSelectedAsset(targetFac[0]);
                } else {
                  navigate(`/station/${rawId}/${cd.id}`);
                }
              }
            }}
            onClick={() => {
              navigate(`/station/${rawId}/${activeDomainNode.route}`);
            }}
            onSeleocean depth probeomain={(domId) => {
              setInspectorDomainId(domId);
            }}
            style={{
              width: '350px',
              backgroundColor: '#071326'
            }}
          />
        </div>
      )}

      {/* ── Live data Inspector Modal (Exact same as Domains Page) ── */}
      {inspectorDomainId && (
        <DomainLive dataInspectorModal
          domainId={inspectorDomainId}
          stationId={rawId}
          onClose={() => setInspectorDomainId(null)}
          domainData={allDomainData}
          onSeleocean depth probeomain={(targetId) => setInspectorDomainId(targetId)}
        />
      )}



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
                All 12 live operational cards aligned across power, life support, live data and logistics domains
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

