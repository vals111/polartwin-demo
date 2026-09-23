import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Station, TelemetrySnapshot, RiskData } from '../../types';
import { StationHealthGauge } from './StationHealthGauge';
import { Compass, Thermometer, Wind, Zap, Fuel, ArrowRight } from 'lucide-react';

interface Props {
  station: Station;
  snapshot?: TelemetrySnapshot;
  risk?: RiskData;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const StationCard: React.FC<Props> = ({
  station,
  snapshot,
  risk,
  isSelected,
  onSelect
}) => {
  const navigate = useNavigate();
  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const fuel = snapshot?.fuel;
  const ops = snapshot?.station_ops;

  const readiness = ops?.overall_readiness ?? (station.station_id === 'maitri' ? 92.0 : 94.5);
  const statusBand = ops?.status_band ?? 'Nominal';

  return (
    <div className={`glass-panel rounded-2xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
      isSelected ? 'border-cyan-400 ring-1 ring-cyan-400/40 shadow-xl shadow-cyan-950/40' : 'hover:border-slate-600'
    }`}>
      {/* Background subtle radial glow */}
      

      <div>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                Antarctic Station
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-polar-navy text-slate-300 font-mono capitalize border border-polar-border">
                {station.location_type}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{station.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {station.station_id === 'maitri'
                ? 'Schirmacher Oasis • ~100 km Inland • Zub Lake Pump House'
                : 'Larsemann Hills • Coastal Prydz Bay • 3x100 kVA CHP Plant'}
            </p>
          </div>

          <div className="flex-shrink-0">
            <StationHealthGauge
              score={readiness}
              size={120}
              statusBand={statusBand}
              label="Readiness"
            />
          </div>
        </div>

        {/* Live Operational Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-polar-dark/70 border border-polar-border/60 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
              <Thermometer className="w-3.5 h-3.5 text-blue-400" />
              <span>Temp</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {env?.temperature ?? -25.0}°C
            </div>
            <div className="text-[10px] text-slate-400 truncate">{env?.condition ?? 'Partly Cloudy'}</div>
          </div>

          <div className="bg-polar-dark/70 border border-polar-border/60 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
              <Wind className="w-3.5 h-3.5 text-indigo-400" />
              <span>Wind</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {env?.wind_speed ?? 32} km/h
            </div>
            <div className="text-[10px] text-slate-400 truncate">Gust {env?.wind_gust ?? 45} km/h</div>
          </div>

          <div className="bg-polar-dark/70 border border-polar-border/60 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Power Load</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {eng?.generator_load ?? 68} kW
            </div>
            <div className="text-[10px] text-slate-400 truncate">Solar {eng?.solar_output ?? 20} kW</div>
          </div>

          <div className="bg-polar-dark/70 border border-polar-border/60 rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
              <Fuel className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fuel Reserve</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {fuel?.fuel_percentage ?? 78}%
            </div>
            <div className="text-[10px] text-slate-400 truncate">{fuel?.days_remaining ?? 19} days rem</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-polar-border/60 mt-2">
        <div className="text-xs font-mono">
          <span className="text-slate-400">Risk Level: </span>
          <span className={`font-bold ${
            risk?.level === 'CRITICAL' ? 'text-red-400' :
            risk?.level === 'HIGH' ? 'text-orange-400' :
            risk?.level === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400'
          }`}>
            {risk?.level ?? 'LOW'} ({risk?.score ?? 18} pts)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onSelect && (
            <button
              onClick={onSelect}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-300 hover:text-white bg-polar-navy/60 hover:bg-polar-navy border border-polar-border'
              }`}
            >
              {isSelected ? 'Active Selection' : 'Select'}
            </button>
          )}

          <button
            onClick={() => navigate(`/station/${station.station_id}`)}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all group"
          >
            <span>Launch Twin</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
