import React from 'react';
import { TelemetrySnapshot } from '../../types';
import { X, Activity, Wrench, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  assetId: string | null;
  onClose: () => void;
  snapshot?: TelemetrySnapshot;
}

export const AssetInfoPanel: React.FC<Props> = ({ assetId, onClose, snapshot }) => {
  if (!assetId) return null;

  const env = snapshot?.environment;
  const eng = snapshot?.energy;
  const fuel = snapshot?.fuel;
  const water = snapshot?.water;
  const equip = snapshot?.equipment;

  let title = 'Selected Station Asset';
  let category = 'Operational Module';
  let details: Array<{ label: string; value: string | number; color?: string }> = [];

  if (assetId === 'generator') {
    title = snapshot?.station_id === 'maitri' ? 'Main Diesel Generator Block' : '3x100-kVA CHP Power Plant';
    category = 'Power Generation & Heat Recovery';
    details = [
      { label: 'Current Generator Load', value: `${eng?.generator_load ?? 68} kW`, color: 'text-amber-400' },
      { label: 'Active Generator Units', value: `${eng?.generator_count_active ?? 2} Units Online` },
      { label: 'Grid Frequency', value: `${eng?.grid_frequency ?? 50.02} Hz` },
      { label: 'Fuel Consumption Rate', value: `${fuel?.consumption_rate_l_per_hr ?? 17.5} L/hr` },
      { label: 'Estimated Health Score', value: `${equip?.items[0]?.health_score ?? 94.5}%`, color: 'text-emerald-400' },
      { label: 'Operational Status', value: eng?.status ?? 'Nominal' }
    ];
  } else if (assetId === 'fuel_tank') {
    title = snapshot?.station_id === 'maitri' ? 'Maitri Fuel Depot' : 'Bharati 300,000L Automated Fuel Farm';
    category = 'Energy Storage & Life Reserve';
    details = [
      { label: 'Storage Level', value: `${fuel?.current_level?.toLocaleString() ?? '140,000'} Liters` },
      { label: 'Total Capacity', value: `${fuel?.total_capacity?.toLocaleString() ?? '180,000'} Liters` },
      { label: 'Reserve Percentage', value: `${fuel?.fuel_percentage ?? 78}%`, color: 'text-cyan-400' },
      { label: 'Days Remaining Margin', value: `${fuel?.days_remaining ?? 19} Days`, color: 'text-emerald-400' },
      { label: 'Reserve Zone', value: fuel?.reserve_zone ?? 'Normal' },
      { label: 'Resupply Window ETA', value: `${fuel?.resupply_eta_days ?? 88} Days` }
    ];
  } else if (assetId === 'water_pump') {
    title = snapshot?.station_id === 'maitri' ? 'Priyadarshini (Zub) Lake Pump House' : 'Quilty Bay Seawater RO Intake';
    category = 'Water Extraction & Treatment';
    details = [
      { label: 'Source Architecture', value: water?.source_type ?? 'Lake Extraction' },
      { label: 'Stored Freshwater', value: `${water?.storage_liters?.toLocaleString() ?? '18,500'} L` },
      { label: 'Pipeline Temperature', value: `${water?.pipe_temp_c ?? 3.8}°C` },
      { label: 'Freeze Hazard Risk', value: water?.freeze_risk ?? 'Low', color: water?.freeze_risk === 'Low' ? 'text-emerald-400' : 'text-red-400' },
      { label: 'Trace Heating Status', value: water?.trace_heating_active ? 'Active (Energized)' : 'Standby' },
      { label: 'Daily Consumption', value: `${water?.daily_consumption_l ?? 1450} L/day` }
    ];
  } else if (assetId === 'habitat') {
    title = snapshot?.station_id === 'maitri' ? 'Main Station Habitat Block' : 'Modular Container Complex';
    category = 'Life Support & Crew Quarters';
    details = [
      { label: 'Indoor Temperature', value: '19.4°C' },
      { label: 'Expedition Headcount', value: '25 Personnel (Winter Over)' },
      { label: 'HVAC Air Exchange', value: '4,200 m³/hr (Nominal)' },
      { label: 'Structural Wind Stress', value: '18% Capacity' },
      { label: 'Lockdown Protocol', value: env?.blizzard_active ? 'Level 2 Lockdown' : 'Level 0 Normal' }
    ];
  } else if (assetId === 'satcom') {
    title = 'Polar Tracking Satcom Terminal';
    category = 'Long-Range Communication Array';
    details = [
      { label: 'Primary Link Bandwidth', value: '120.0 Mbps (LEO Polar Satellite)' },
      { label: 'Round-Trip Latency', value: '78 ms' },
      { label: 'Packet Loss', value: '0.2%' },
      { label: 'Radome De-Icing Heater', value: 'Active (Preventing Rime Ice)' },
      { label: 'Backup Channel', value: 'Inmarsat BGAN / Iridium L-Band Standby' }
    ];
  }

  return (
    <div className="absolute top-4 right-4 w-80 glass-panel-glow rounded-xl p-5 border border-cyan-500/50 shadow-2xl z-20 animate-fadeIn">
      <div className="flex items-start justify-between pb-3 border-b border-polar-border">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">{category}</span>
          <h4 className="text-sm font-bold text-white mt-0.5">{title}</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-polar-navy transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="py-3 space-y-2.5">
        {details.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{item.label}:</span>
            <span className={`font-mono font-semibold ${item.color || 'text-slate-100'}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-polar-border flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center space-x-1.5 text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Synchronized with Live Twin</span>
        </span>
      </div>
    </div>
  );
};
