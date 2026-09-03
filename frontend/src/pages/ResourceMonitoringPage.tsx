import React from 'react';
import { useParams } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { Zap, Fuel, Droplet, Apple, BatteryCharging, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const ResourceMonitoringPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const stationId = id || 'maitri';
  const { liveSnapshot } = useTelemetryStore();

  const snapshot = liveSnapshot[stationId];
  const fuel = snapshot?.fuel;
  const water = snapshot?.water;
  const supplies = snapshot?.supplies;
  const energy = snapshot?.energy;

  const fuelPct = fuel?.fuel_percentage ?? 77.0;
  const waterPct = water?.percentage ?? 82.0;
  const batteryPct = energy?.battery_level ?? 92.0;

  const getZoneBadge = (zone: string) => {
    switch (zone) {
      case 'Critical': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'High': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'Watch': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Fuel className="w-4 h-4" />
              <span>Life-Support Resource Surveillance</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Strategic Resources & Energy
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Monitors consumable supplies, fuel burn, water extraction, and battery reserves against the annual shipping resupply window.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-polar-dark px-3 py-1.5 rounded-lg border border-polar-border text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Resupply ETA: {fuel?.resupply_eta_days ?? 88} Days</span>
          </div>
        </div>
      </div>

      {/* 4 Major Key Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Fuel Card */}
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/40 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Fuel Reserve</h3>
                  <div className="text-[10px] text-slate-400 font-mono">Arctic Jet A-1 / ATF</div>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getZoneBadge(fuel?.reserve_zone || 'Normal')}`}>
                {fuel?.reserve_zone || 'Normal'}
              </span>
            </div>

            <div className="text-3xl font-black font-mono text-white tracking-tight my-2">
              {fuelPct}%
            </div>

            <div className="w-full bg-polar-darker h-2 rounded-full overflow-hidden my-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${fuelPct}%` }}
              />
            </div>

            <div className="space-y-1 text-xs font-mono text-slate-300 mt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Stored Fuel:</span>
                <span className="font-bold">{fuel?.current_level?.toLocaleString() ?? '140,000'} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Burn Rate:</span>
                <span>{fuel?.consumption_rate_l_per_hr ?? 17.5} L/hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Survival Days:</span>
                <span className="font-bold text-cyan-300">{fuel?.days_remaining ?? 19} Days</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-polar-border/60 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>Capacity: {fuel?.total_capacity?.toLocaleString() ?? '180,000'} L</span>
            <span className="text-emerald-400">Reserve Adequate</span>
          </div>
        </div>

        {/* 2. Water Card */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/40 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300">
                  <Droplet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Water Storage</h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {stationId === 'maitri' ? 'Zub Lake Intake' : 'Quilty Bay RO'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                {water?.freeze_risk === 'Low' ? 'Intake Active' : 'Freeze Hazard'}
              </span>
            </div>

            <div className="text-3xl font-black font-mono text-white tracking-tight my-2">
              {water?.storage_liters?.toLocaleString() ?? '18,500'} <span className="text-base text-slate-400 font-normal">L</span>
            </div>

            <div className="w-full bg-polar-darker h-2 rounded-full overflow-hidden my-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${waterPct}%` }}
              />
            </div>

            <div className="space-y-1 text-xs font-mono text-slate-300 mt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Pipe Temp:</span>
                <span className="font-bold text-emerald-400">{water?.pipe_temp_c ?? 3.8}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trace Heating:</span>
                <span className="text-cyan-300">Active (Heated)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consumption:</span>
                <span>{water?.daily_consumption_l ?? 1450} L/day</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-polar-border/60 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>Production: {water?.production_rate_l_hr ?? 120} L/hr</span>
            <span className="text-emerald-400">12 Days Margin</span>
          </div>
        </div>

        {/* 3. Food Card */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/40 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Food & Rations</h3>
                  <div className="text-[10px] text-slate-400 font-mono">Deep Freeze / Dry</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                185 Days
              </span>
            </div>

            <div className="text-3xl font-black font-mono text-white tracking-tight my-2">
              185 <span className="text-base text-slate-400 font-normal">Days</span>
            </div>

            <div className="w-full bg-polar-darker h-2 rounded-full overflow-hidden my-2">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full w-[85%]" />
            </div>

            <div className="space-y-1 text-xs font-mono text-slate-300 mt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Freezer Temp:</span>
                <span className="font-bold text-cyan-300">{supplies?.freezer_temp_c ?? -21.4}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Emergency Packs:</span>
                <span>{supplies?.emergency_iron_ration_packs ?? 150} Iron Rations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Depletion:</span>
                <span>{supplies?.daily_depletion_kg ?? 55} kg/day</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-polar-border/60 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>Perishables Health</span>
            <span className="text-emerald-400">Optimal (9+ Mo)</span>
          </div>
        </div>

        {/* 4. Battery / Grid Card */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/40 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Battery & Grid</h3>
                  <div className="text-[10px] text-slate-400 font-mono">LiFePO4 Storage Buffer</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Nominal
              </span>
            </div>

            <div className="text-3xl font-black font-mono text-white tracking-tight my-2">
              {batteryPct}%
            </div>

            <div className="w-full bg-polar-darker h-2 rounded-full overflow-hidden my-2">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${batteryPct}%` }}
              />
            </div>

            <div className="space-y-1 text-xs font-mono text-slate-300 mt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Station Demand:</span>
                <span className="font-bold">{energy?.total_demand ?? 85} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Solar PV Output:</span>
                <span className="text-cyan-300">{energy?.solar_output ?? 22} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Grid Frequency:</span>
                <span>{energy?.grid_frequency ?? 50.01} Hz</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-polar-border/60 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>Buffer Rating</span>
            <span className="text-emerald-400">120 kWh Bank</span>
          </div>
        </div>
      </div>

      {/* Fuel Reserve Zone Specification Guide per Master Report Section 8.2 */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <h3 className="text-sm font-bold font-mono tracking-wide text-white mb-3 uppercase">
          Fuel Reserve Graduation Zones (Antarctic Energy Security Standard)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="font-bold text-emerald-400 uppercase">&gt; 50% Normal</div>
            <p className="text-[11px] text-slate-400 mt-1">Full operational autonomy. Standard heating and scientific experiment schedules permitted.</p>
          </div>

          <div className="p-3 rounded-xl bg-yellow-950/40 border border-yellow-500/30">
            <div className="font-bold text-yellow-400 uppercase">30 – 50% Watch</div>
            <p className="text-[11px] text-slate-400 mt-1">Heightened monitoring. Non-critical heating throttled, track resupply ship progress daily.</p>
          </div>

          <div className="p-3 rounded-xl bg-orange-950/40 border border-orange-500/30">
            <div className="font-bold text-orange-400 uppercase">15 – 30% High</div>
            <p className="text-[11px] text-slate-400 mt-1">Conservation mode. Load-shed secondary laboratory power, restrict snow vehicle usage.</p>
          </div>

          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30">
            <div className="font-bold text-red-400 uppercase">&lt; 15% Critical</div>
            <p className="text-[11px] text-slate-400 mt-1">Emergency life-support only. Habitat consolidated into central insulated shelter module.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
