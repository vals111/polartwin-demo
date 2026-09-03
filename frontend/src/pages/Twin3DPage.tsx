import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStationStore } from '../store/stationStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { StationScene } from '../components/twin3d/StationScene';
import { AssetInfoPanel } from '../components/twin3d/AssetInfoPanel';
import { Box, Layers, Radio, Compass, ArrowLeft, RefreshCw } from 'lucide-react';

export const Twin3DPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';

  const { stations } = useStationStore();
  const { liveSnapshot } = useTelemetryStore();
  const [selectedAsset, setSelectedAsset] = useState<string | null>('generator');

  const station = stations.find(s => s.station_id === stationId) || {
    station_id: stationId,
    name: stationId === 'maitri' ? 'Maitri Antarctic Station' : 'Bharati Antarctic Station',
    location_type: stationId === 'maitri' ? 'inland' : 'coastal'
  };

  const snapshot = liveSnapshot[stationId];

  const assetsList = [
    { id: 'generator', name: 'Power Plant', label: stationId === 'maitri' ? 'Main Gen Block' : '3x100kVA CHP' },
    { id: 'fuel_tank', name: 'Fuel Farm', label: 'Fuel Storage Depot' },
    { id: 'water_pump', name: 'Water Intake', label: stationId === 'maitri' ? 'Zub Lake Pump' : 'Quilty Bay RO' },
    { id: 'habitat', name: 'Habitat Complex', label: 'Living & Lab Complex' },
    { id: 'satcom', name: 'Satellite Dome', label: 'Satcom Terminal' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between glass-panel px-4 py-3 rounded-xl border border-polar-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/station/${stationId}`)}
            className="p-1.5 rounded-lg bg-polar-dark hover:bg-polar-navy border border-polar-border text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">3D Spatial Digital Twin</span>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                {station.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Interactive WebGL canvas • Click physical station meshes or select below
            </div>
          </div>
        </div>

        {/* Quick Asset Filter Pills */}
        <div className="hidden md:flex items-center space-x-2 bg-polar-dark/80 p-1 rounded-lg border border-polar-border">
          {assetsList.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAsset(a.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                selectedAsset === a.id
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Viewport Area */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-polar-border shadow-2xl">
        <StationScene
          snapshot={snapshot}
          selectedAsset={selectedAsset}
          onSelectAsset={(id) => setSelectedAsset(id)}
        />

        {/* Floating Asset Live Data Overlay Panel */}
        <AssetInfoPanel
          assetId={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          snapshot={snapshot}
        />

        {/* Bottom Control Hint */}
        <div className="absolute bottom-4 left-4 glass-panel px-3 py-1.5 rounded-lg border border-polar-border text-[11px] font-mono text-slate-400 pointer-events-none flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Left click + drag to rotate • Scroll to zoom • Right click to pan</span>
        </div>
      </div>
    </div>
  );
};
