import React from 'react';

/** Circular Progress Ring */
export const MiniRing: React.FC<{
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}> = ({ pct, size = 52, strokeWidth = 5.5, color = '#06b6d4', label, sublabel }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circ * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center justify-center relative select-none flex-shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {label && <span className="text-xs font-black font-mono text-white leading-none">{label}</span>}
        {sublabel && <span className="text-[8.5px] font-mono text-slate-400 leading-tight mt-0.5 font-semibold">{sublabel}</span>}
      </div>
    </div>
  );
};

/** Animated Liquid Fluid Cylinder */
export const MiniFluidTank: React.FC<{
  pct: number;
  liters: number;
  color?: string;
  height?: number;
  width?: number;
}> = ({ pct, liters, color = '#06b6d4', height = 50, width = 40 }) => {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center gap-0.5 select-none flex-shrink-0">
      <div
        className="relative rounded-lg overflow-hidden border border-white/15 flex flex-col justify-end"
        style={{
          width,
          height,
          background: 'rgba(15, 23, 42, 0.7)',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)'
        }}
      >
        {/* Fill level */}
        <div
          className="w-full relative transition-all duration-700 ease-out"
          style={{
            height: `${clamped}%`,
            background: `linear-gradient(to top, ${color}cc, ${color}88)`,
          }}
        >
          {/* Surface Meniscus */}
          <div
            className="absolute top-0 left-0 right-0 h-1 opacity-90 animate-pulse"
            style={{ background: '#ffffff', filter: 'blur(0.5px)' }}
          />
        </div>

        {/* Level lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none opacity-20">
          <div className="w-full h-px bg-white" />
          <div className="w-full h-px bg-white" />
          <div className="w-full h-px bg-white" />
        </div>

        {/* Overlay % Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black font-mono text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {clamped.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-[8.5px] font-mono text-slate-400 font-semibold leading-none mt-0.5">
        {(liters / 1000).toFixed(0)}k L
      </span>
    </div>
  );
};

/** Compact Glass Mercury Thermometer */
export const MiniThermometer: React.FC<{ tempC: number; chillC: number; height?: number }> = ({ tempC, chillC, height = 50 }) => {
  const MIN = -50;
  const MAX = 5;
  const pct = Math.max(0, Math.min(100, ((tempC - MIN) / (MAX - MIN)) * 100));
  const color = tempC < -30 ? '#818cf8' : tempC < -15 ? '#06b6d4' : '#38bdf8';

  return (
    <div className="flex items-center gap-2 select-none flex-shrink-0">
      <svg width="18" height={height} viewBox="0 0 18 50">
        {/* Tube Outline */}
        <rect x="6" y="2" width="6" height="35" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {/* Liquid Fill */}
        <rect
          x="7"
          y={2 + 35 - (pct / 100) * 35}
          width="4"
          height={(pct / 100) * 35}
          rx="2"
          fill={color}
          style={{ transition: 'all 0.8s ease-out' }}
        />
        {/* Bulb */}
        <circle cx="9" cy="42" r="6" fill={color} />
        <circle cx="9" cy="42" r="3" fill="rgba(255,255,255,0.25)" />
      </svg>
      <div className="flex flex-col font-mono leading-tight">
        <span className="text-xs font-black text-white">{tempC.toFixed(1)}°C</span>
        <span className="text-[9px] text-slate-400 mt-0.5">Chill {chillC.toFixed(1)}°</span>
      </div>
    </div>
  );
};

/** 360° Rotating Wind Vector Compass */
export const MiniWindCompass: React.FC<{ speedKmh: number; gustKmh: number; angleDeg?: number }> = ({
  speedKmh, gustKmh, angleDeg = 145
}) => {
  return (
    <div className="flex items-center gap-2 select-none flex-shrink-0">
      <div className="relative w-9 h-9 rounded-full border border-cyan-500/30 bg-polar-dark/90 flex items-center justify-center shadow-inner">
        {/* Compass Cardinal Marks */}
        <span className="absolute top-0.5 text-[6px] font-mono text-slate-400 font-bold">N</span>
        <span className="absolute right-0.5 text-[6px] font-mono text-slate-400 font-bold">E</span>
        <span className="absolute bottom-0.5 text-[6px] font-mono text-slate-400 font-bold">S</span>
        <span className="absolute left-0.5 text-[6px] font-mono text-slate-400 font-bold">W</span>

        {/* Rotating Wind Arrow */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${angleDeg}deg)` }}
        >
          <div className="w-1.5 h-4.5 relative flex flex-col items-center">
            <div className="w-0 h-0 border-l-[2.5px] border-l-transparent border-r-[2.5px] border-r-transparent border-b-[6px] border-b-cyan-400" />
            <div className="w-0.5 h-2.5 bg-cyan-400" />
          </div>
        </div>
      </div>
      <div className="flex flex-col font-mono leading-tight">
        <span className="text-xs font-bold text-white">{speedKmh} km/h</span>
        <span className="text-[8.5px] text-amber-300 mt-0.5 font-semibold">Gust {gustKmh}</span>
      </div>
    </div>
  );
};

/** Visual Convoy / Shipping Journey Track */
export const MiniTraverseTrack: React.FC<{ progressPct: number; isMaitri: boolean; daysRemaining: number }> = ({
  progressPct, isMaitri, daysRemaining
}) => {
  return (
    <div className="w-full space-y-0.5 select-none font-mono">
      <div className="flex items-center justify-between text-[8.5px] text-slate-300 font-medium">
        <span>{isMaitri ? 'Ice Edge' : 'Cape Town'}</span>
        <span className="text-amber-400 font-bold">{daysRemaining}d ETA</span>
        <span>{isMaitri ? 'Maitri' : 'Quilty Bay'}</span>
      </div>
      <div className="relative w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all duration-700"
          style={{ width: `${Math.max(15, Math.min(100, progressPct))}%` }}
        />
        {/* Animated Vehicle Dot */}
        <div
          className="absolute top-0 bottom-0 w-2 h-2 -mt-[1px] rounded-full bg-cyan-300"
          style={{ left: `calc(${Math.max(15, Math.min(95, progressPct))}% - 4px)` }}
        />
      </div>
      <div className="flex justify-between text-[7.5px] text-slate-500 font-semibold">
        <span>Departure</span>
        <span>En Route</span>
        <span>Base</span>
      </div>
    </div>
  );
};

/** Donut Distribution Ring */
export const MiniDonut: React.FC<{
  segments: { label: string; pct: number; color: string }[];
  centerLabel?: string;
  size?: number;
}> = ({ segments, centerLabel, size = 52 }) => {
  let accumulated = 0;
  const r = 20;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex items-center justify-center select-none flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 56 56" className="transform -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        {segments.map((seg, i) => {
          const strokeLength = (seg.pct / 100) * circ;
          const strokeOffset = -accumulated;
          accumulated += strokeLength;

          return (
            <circle
              key={i}
              cx="28"
              cy="28"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="6"
              strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              style={{ transition: 'all 0.6s ease-out' }}
            />
          );
        })}
      </svg>
      {centerLabel && (
        <span className="absolute text-[10px] font-black font-mono text-white pointer-events-none">
          {centerLabel}
        </span>
      )}
    </div>
  );
};
