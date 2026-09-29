import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { StationScene } from '../components/twin3d/StationScene';
import { OperationalDomainCard } from '../components/dashboard/OperationalDomainCard';
import { DomainTelemetryInspectorModal } from '../components/dashboard/DomainTelemetryInspectorModal';
import {
  ALL_DOMAIN_NODES,
  FACILITY_TO_DOMAIN_MAP,
  getDomainCausalConduits,
  extractLiveDomainData
} from '../utils/domainDataHelper';
import {
  X, ArrowLeft, Maximize, Minimize
} from 'lucide-react';

const FACILITY_LABELS: Record<string, string> = {
  infrastructure: 'Infrastructure & Structural Habitat',
  energy_fuel: 'Energy, Power & Bulk Fuel Depot',
  logistics: 'Transportation & Traverse Logistics',
  environment: 'Environment & Meteorological Sensors',
  communication: 'Satellite Earth Terminal & Comms',
  water: 'Water Supply & Pipe Trace Heating',
  personnel: 'Personnel Safety & Emergency Habitat',
  // Backward compatibility
  main_station: 'Infrastructure & Structural Habitat',
  power_house: 'Energy, Power & Bulk Fuel Depot',
  solar_array: 'Energy, Power & Bulk Fuel Depot',
  fuel_depot: 'Energy, Power & Bulk Fuel Depot',
  water_facility: 'Water Supply & Pipe Trace Heating',
  waste_management: 'Water Supply & Waste Processing',
  research_lab: 'Infrastructure & Structural Habitat',
  personnel_area: 'Personnel Safety & Emergency Habitat',
  storage: 'Transportation & Traverse Logistics',
  logistics_area: 'Transportation & Traverse Logistics',
};

export const Twin3DPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rawId = id || 'maitri';

  const { liveSnapshot } = useTelemetryStore();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
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
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full ${isFullscreen
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

      {/* Top Left Navigation Bar */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/60 transition-all cursor-pointer shadow-lg backdrop-blur-md"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
          <span>Back</span>
        </button>
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
            onSelectDomain={(domId) => {
              setInspectorDomainId(domId);
            }}
            style={{
              width: '350px',
              backgroundColor: '#071326'
            }}
          />
        </div>
      )}

      {/* ── Telemetry Inspector Modal (Exact same as Domains Page) ── */}
      {inspectorDomainId && (
        <DomainTelemetryInspectorModal
          domainId={inspectorDomainId}
          stationId={rawId}
          onClose={() => setInspectorDomainId(null)}
          domainData={allDomainData}
          onSelectDomain={(targetId) => setInspectorDomainId(targetId)}
        />
      )}
    </div>
  );
};
