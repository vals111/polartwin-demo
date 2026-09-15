import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../store/telemetryStore';
import { TankLevelBar } from '../components/charts/TankLevelBar';
import { IndustrialGauge } from '../components/charts/IndustrialGauge';
import { EChartsLine } from '../components/charts/EChartsLine';
import { EChartsBar } from '../components/charts/EChartsBar';
import { SparklineChart } from '../components/charts/SparklineChart';
import { Fuel, Droplet, BatteryCharging, Apple, Clock, AlertTriangle, CheckCircle, ShipWheel, Zap, Layers, RefreshCw, Brain } from 'lucide-react';

// ── Resupply Countdown Ring ────────────────────────────────────────────────
const ResupplyCountdown: React.FC<{ days: number; maxDays?: number }> = ({
  days,
  maxDays = 180,
}) => {
  const pct = Math.max(0, Math.min(1, days / maxDays));
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = days < 30 ? '#ef4444' : days < 60 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
          <circle
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out',  }}
          />
          <text x="65" y="60" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="monospace">
            {days}
          </text>
          <text x="65" y="74" textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace">
            DAYS LEFT
          </text>
          <text x="65" y="88" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
            TO RESUPPLY
          </text>
        </svg>
      </div>
    </div>
  );
};

// ── Burn Rate Trend (mini) ─────────────────────────────────────────────────
const genBurnTrend = (base: number, n = 30): { time: string; value: number }[] =>
  Array.from({ length: n }, (_, i) => ({
    time: `D-${n - i}`,
    value: Math.max(0, Number((base + Math.sin(i / 4) * base * 0.08 + Math.cos(i / 6) * base * 0.04).toFixed(1))),
  }));

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ResourceMonitoringPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stationId = id || 'maitri';
  const { liveSnapshot } = useTelemetryStore();
  const snapshot = liveSnapshot[stationId];
  const isMaitri = stationId === 'maitri';

  const fuel = snapshot?.fuel;
  const water = snapshot?.water;
  const supplies = snapshot?.supplies;
  const energy = snapshot?.energy;

  const fuelPct = fuel?.fuel_percentage ?? 77.0;
  const waterPct = water?.percentage ?? 82.0;
  const batteryPct = energy?.battery_level ?? 92.0;
  const foodPct = supplies?.food_days_remaining != null
    ? Math.min(100, (supplies.food_days_remaining / 365) * 100)
    : 68.0;

  const resupplyDays = fuel?.resupply_eta_days ?? 88;
  const fuelLiters = fuel?.current_level ?? 45200;
  const waterLiters = water?.storage_liters ?? 18400;
  const fuelBurnRate = fuel?.consumption_rate_l_per_hr ?? 42;
  const genLoad = energy?.generator_load ?? 68;
  const solarOut = energy?.solar_output ?? 22;

  // 30-day burn trends (memoized to keep chart stable)
  const fuelTrend = useMemo(() => genBurnTrend(fuelBurnRate, 30), [fuelBurnRate]);
  const waterTrend = useMemo(() => genBurnTrend(35, 30), []);

  // Daily consumption for bar chart
  const dailyConsumption = [
    { name: 'Gen-1', value: Math.round(fuelBurnRate * 0.6 * 24), color: '#f59e0b' },
    { name: 'Gen-2', value: Math.round(fuelBurnRate * 0.4 * 24), color: '#ef4444' },
    { name: 'Heating', value: Math.round(18 * 24), color: '#818cf8' },
    { name: 'Vehicles', value: Math.round(8 * 24), color: '#10b981' },
    { name: 'Kitchen', value: Math.round(6 * 24), color: '#06b6d4' },
  ];

  const accentColor = isMaitri ? '#06b6d4' : '#60a5fa';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Fuel className="w-4 h-4" />
              <span>Strategic Resource Surveillance — Life-Support Budget</span>
            </div>
            <h1 className="text-2xl font-black text-white capitalize">
              {stationId} Resources &amp; Energy Command
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Consumable life-support monitoring against the annual {isMaitri ? 'overland convoy' : 'marine vessel'} resupply window.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-polar-dark px-3 py-2 rounded-xl border border-polar-border text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>Resupply in <strong style={{ color: accentColor }}>{resupplyDays}d</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-polar-dark px-3 py-2 rounded-xl border border-polar-border text-xs font-mono text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Load: <strong className="text-amber-300">{genLoad} kW</strong></span>
            </div>
            <button onClick={() => navigate(`/station/${stationId}/domains`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-1.5 transition-all cursor-pointer">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> All Domains
            </button>
            <button onClick={() => navigate(`/station/${stationId}/decision?domain=energy`)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <Brain className="w-3.5 h-3.5 text-purple-400" /> Decision Intel
            </button>
            <button onClick={() => navigate(isMaitri ? '/station/bharati/energy' : '/station/maitri/energy')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-polar-dark/80 hover:bg-polar-dark border border-polar-border hover:border-cyan-400/50 text-white flex items-center gap-1.5 transition-all cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Switch Station
            </button>
          </div>
        </div>
      </div>

      {/* Tank Gauges Row */}
      <div className="glass-panel p-6 rounded-2xl border border-polar-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-5 font-bold">
          Tank Level Indicators — Real-Time Storage State
        </div>
        <div className="flex flex-wrap justify-around items-end gap-8">
          <div className="text-center space-y-3">
            <TankLevelBar
              percentage={fuelPct}
              label="FUEL STORAGE"
              sublabel={`${(fuelLiters / 1000).toFixed(1)}k L`}
              value={`${fuelPct.toFixed(1)}%`}
              color="#f59e0b"
              warningAt={25}
              criticalAt={10}
              height={220}
              width={72}
            />
            <div className="text-[9px] font-mono text-slate-500">
              ~{Math.floor(fuelLiters / (fuelBurnRate * 24))}d autonomy
            </div>
          </div>

          <div className="text-center space-y-3">
            <TankLevelBar
              percentage={waterPct}
              label="FRESHWATER"
              sublabel={`${(waterLiters / 1000).toFixed(1)}k L`}
              value={`${waterPct.toFixed(1)}%`}
              color="#06b6d4"
              warningAt={30}
              criticalAt={15}
              height={220}
              width={72}
            />
            <div className="text-[9px] font-mono text-slate-500">
              {isMaitri ? 'Lake Zub pipeline' : 'Quilty Bay RO'}
            </div>
          </div>

          <div className="text-center space-y-3">
            <TankLevelBar
              percentage={batteryPct}
              label="BATTERY BANK"
              sublabel="Emergency reserve"
              value={`${batteryPct.toFixed(1)}%`}
              color="#10b981"
              warningAt={40}
              criticalAt={20}
              height={220}
              width={72}
            />
            <div className="text-[9px] font-mono text-slate-500">
              {Math.round(batteryPct * 0.5)}h autonomy
            </div>
          </div>

          <div className="text-center space-y-3">
            <TankLevelBar
              percentage={foodPct}
              label="FOOD SUPPLIES"
              sublabel={`${supplies?.food_days_remaining ?? 248}d`}
              value={`${foodPct.toFixed(1)}%`}
              color="#a78bfa"
              warningAt={25}
              criticalAt={10}
              height={220}
              width={72}
            />
            <div className="text-[9px] font-mono text-slate-500">
              Annual ration cycle
            </div>
          </div>

          {/* Resupply countdown */}
          <div className="flex flex-col items-center gap-2">
            <ResupplyCountdown days={resupplyDays} maxDays={180} />
            <div className="text-[9px] font-mono text-slate-500 text-center">
              {isMaitri ? 'Convoy ETA' : 'Vessel ETA'}
            </div>
          </div>

          {/* Power gauges */}
          <div className="flex flex-col items-center gap-3">
            <IndustrialGauge
              value={genLoad}
              min={0}
              max={200}
              unit="kW"
              label="Generator Load"
              size={140}
              accentColor="#f59e0b"
              warningThreshold={160}
              criticalThreshold={190}
            />
            <IndustrialGauge
              value={solarOut}
              min={0}
              max={50}
              unit="kW"
              label="Solar PV Output"
              size={140}
              accentColor="#fbbf24"
            />
          </div>
        </div>
      </div>

      {/* Burn-rate charts + Daily breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel burn trend */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-polar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              Fuel Burn Rate — 30-Day History (L/h)
            </div>
            <div className="text-xs font-mono text-slate-400">
              Avg: <strong className="text-amber-300">{fuelBurnRate.toFixed(1)} L/h</strong>
            </div>
          </div>
          <EChartsLine
            data={fuelTrend}
            color="#f59e0b"
            showArea
            unit=" L/h"
            smooth
            height={220}
          />
        </div>

        {/* Daily fuel split by consumer */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3 font-bold">
            Daily Fuel Budget by Consumer (L/day)
          </div>
          <EChartsBar
            data={dailyConsumption}
            horizontal
            height={220}
            unit=" L"
          />
        </div>
      </div>

      {/* Water + supply breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Water consumption trend */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              Freshwater Consumption — 30-Day (L/h)
            </div>
          </div>
          <EChartsLine
            data={waterTrend}
            color="#06b6d4"
            showArea
            unit=" L/h"
            smooth
            height={180}
          />
        </div>

        {/* Supply critical KPIs */}
        <div className="glass-panel p-5 rounded-2xl border border-polar-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-4 font-bold">
            Supply Chain Critical Status
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'Diesel (AGO) Inventory',
                val: `${(fuelLiters / 1000).toFixed(1)}k L`,
                pct: fuelPct,
                warn: 25,
                color: '#f59e0b',
              },
              {
                label: 'Freshwater Storage',
                val: `${(waterLiters / 1000).toFixed(1)}k L`,
                pct: waterPct,
                warn: 30,
                color: '#06b6d4',
              },
              {
                label: 'Battery Reserve (UPS)',
                val: `${batteryPct.toFixed(0)}%`,
                pct: batteryPct,
                warn: 40,
                color: '#10b981',
              },
              {
                label: 'Food Rations Remaining',
                val: `${supplies?.food_days_remaining ?? 248} days`,
                pct: foodPct,
                warn: 25,
                color: '#a78bfa',
              },
              {
                label: isMaitri ? 'LPG (Cooking Gas)' : 'Propane Reserve',
                val: `${supplies?.lpg_percentage ?? 62}%`,
                pct: supplies?.lpg_percentage ?? 62,
                warn: 20,
                color: '#fb923c',
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: item.color }}>{item.val}</span>
                    {item.pct < item.warn && (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                    {item.pct >= item.warn && (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                </div>
                <div className="h-2.5 bg-polar-darker rounded-full overflow-hidden border border-polar-border/40">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${item.pct}%`,
                      background: `linear-gradient(to right, ${item.color}88, ${item.color})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
