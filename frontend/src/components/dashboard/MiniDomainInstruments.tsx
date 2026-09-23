import React from 'react';

/** Circular Progress Ring */
export const MiniRing: React.FC<{
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}> = ({ pct, size = 56, strokeWidth = 6, color = '#06b6d4', label, sublabel }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circ * (1 - clamped / 100);
  const isLarge = size >= 50;

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
        {label && (
          <span className={`${isLarge ? 'text-sm font-black' : 'text-xs font-bold'} font-mono text-white leading-none`}>
            {label}
          </span>
        )}
        {sublabel && (
          <span className={`${isLarge ? 'text-[9.5px]' : 'text-[8.5px]'} font-mono text-slate-300 leading-tight mt-0.5 font-bold tracking-wider`}>
            {sublabel}
          </span>
        )}
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
}> = ({ pct, liters, color = '#06b6d4', height = 56, width = 42 }) => {
  const clamped = Math.max(0, Math.min(100, pct));
  const isLarge = height >= 50;
  return (
    <div className="flex flex-col items-center gap-0.5 select-none flex-shrink-0">
      <div
        className="relative rounded-lg overflow-hidden border border-white/20 flex flex-col justify-end shadow-sm"
        style={{
          width,
          height,
          background: 'rgba(15, 23, 42, 0.8)',
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.6)'
        }}
      >
        {/* Fill level */}
        <div
          className="w-full relative transition-all duration-700 ease-out"
          style={{
            height: `${clamped}%`,
            background: `linear-gradient(to top, ${color}dd, ${color}99)`,
          }}
        >
          {/* Surface Meniscus */}
          <div
            className="absolute top-0 left-0 right-0 h-1 opacity-90 animate-pulse"
            style={{ background: '#ffffff', filter: 'blur(0.5px)' }}
          />
        </div>

        {/* Level lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none opacity-25">
          <div className="w-full h-px bg-white" />
          <div className="w-full h-px bg-white" />
          <div className="w-full h-px bg-white" />
        </div>

        {/* Overlay % Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`${isLarge ? 'text-xs' : 'text-[10px]'} font-black font-mono text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
            {clamped.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className={`${isLarge ? 'text-[9.5px]' : 'text-[8.5px]'} font-mono text-slate-300 font-bold leading-none mt-0.5`}>
        {(liters / 1000).toFixed(0)}k L
      </span>
    </div>
  );
};

/** Compact Glass Mercury Thermometer */
export const MiniThermometer: React.FC<{ tempC: number; chillC: number; height?: number }> = ({ tempC, chillC, height = 56 }) => {
  const MIN = -50;
  const MAX = 5;
  const pct = Math.max(0, Math.min(100, ((tempC - MIN) / (MAX - MIN)) * 100));
  const color = tempC < -30 ? '#818cf8' : tempC < -15 ? '#06b6d4' : '#38bdf8';
  const isLarge = height >= 50;

  return (
    <div className="flex items-center gap-2 select-none flex-shrink-0">
      <svg width="20" height={height} viewBox="0 0 20 54">
        {/* Tube Outline */}
        <rect x="7" y="2" width="6" height="38" rx="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* Liquid Fill */}
        <rect
          x="8"
          y={2 + 38 - (pct / 100) * 38}
          width="4"
          height={(pct / 100) * 38}
          rx="2"
          fill={color}
          style={{ transition: 'all 0.8s ease-out' }}
        />
        {/* Bulb */}
        <circle cx="10" cy="45" r="7" fill={color} />
        <circle cx="10" cy="45" r="3.5" fill="rgba(255,255,255,0.3)" />
      </svg>
      <div className="flex flex-col font-mono leading-tight">
        <span className={`${isLarge ? 'text-sm' : 'text-xs'} font-black text-white`}>{tempC.toFixed(1)}°C</span>
        <span className={`${isLarge ? 'text-[10px]' : 'text-[9px]'} text-cyan-300 font-semibold mt-0.5`}>Chill {chillC.toFixed(1)}°</span>
      </div>
    </div>
  );
};

/** 360° Rotating Wind Vector Compass */
export const MiniWindCompass: React.FC<{ speedKmh: number; gustKmh: number; angleDeg?: number; size?: number }> = ({
  speedKmh, gustKmh, angleDeg = 145, size = 44
}) => {
  return (
    <div className="flex items-center gap-2.5 select-none flex-shrink-0">
      <div
        className="relative rounded-full border border-cyan-500/40 bg-slate-900/90 flex items-center justify-center shadow-inner"
        style={{ width: size, height: size }}
      >
        {/* Compass Cardinal Marks */}
        <span className="absolute top-0.5 text-[7px] font-mono text-slate-300 font-bold">N</span>
        <span className="absolute right-0.5 text-[7px] font-mono text-slate-300 font-bold">E</span>
        <span className="absolute bottom-0.5 text-[7px] font-mono text-slate-300 font-bold">S</span>
        <span className="absolute left-0.5 text-[7px] font-mono text-slate-300 font-bold">W</span>

        {/* Rotating Wind Arrow */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${angleDeg}deg)` }}
        >
          <div className="w-2 h-5 relative flex flex-col items-center">
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[8px] border-b-cyan-400" />
            <div className="w-0.5 h-3 bg-cyan-400" />
          </div>
        </div>
      </div>
      <div className="flex flex-col font-mono leading-tight">
        <span className="text-sm font-bold text-white">{speedKmh} km/h</span>
        <span className="text-[10px] text-amber-300 mt-0.5 font-semibold">Gust {gustKmh}</span>
      </div>
    </div>
  );
};

/** Visual Supply run / Shipping Journey Track */
export const MiniTraverseTrack: React.FC<{ progressPct: number; isMaitri: boolean; daysRemaining: number }> = ({
  progressPct, isMaitri, daysRemaining
}) => {
  return (
    <div className="w-full space-y-1 select-none font-mono">
      <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold">
        <span>{isMaitri ? 'Ice Edge' : 'Cape Town'}</span>
        <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">{daysRemaining}d ETA</span>
        <span>{isMaitri ? 'Maitri' : 'Quilty Bay'}</span>
      </div>
      <div className="relative w-full h-2.5 rounded-full bg-slate-800/90 overflow-hidden border border-white/10 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 transition-all duration-700"
          style={{ width: `${Math.max(15, Math.min(100, progressPct))}%` }}
        />
        {/* Animated Vehicle Dot */}
        <div
          className="absolute top-0 bottom-0 w-3 h-3 -mt-[1px] rounded-full bg-cyan-200 border border-cyan-400 shadow-[0_0_8px_#38bdf8]"
          style={{ left: `calc(${Math.max(15, Math.min(95, progressPct))}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
        <span>Departure Port</span>
        <span>Traverse In Progress</span>
        <span>Polar Base</span>
      </div>
    </div>
  );
};

/** Donut Distribution Ring */
export const MiniDonut: React.FC<{
  segments: { label: string; pct: number; color: string }[];
  centerLabel?: string;
  size?: number;
}> = ({ segments, centerLabel, size = 56 }) => {
  let accumulated = 0;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex items-center justify-center select-none flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6.5" />
        {segments.map((seg, i) => {
          const strokeLength = (seg.pct / 100) * circ;
          const strokeOffset = -accumulated;
          accumulated += strokeLength;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="6.5"
              strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              style={{ transition: 'all 0.6s ease-out' }}
            />
          );
        })}
      </svg>
      {centerLabel && (
        <span className="absolute text-xs font-black font-mono text-white pointer-events-none drop-shadow-sm">
          {centerLabel}
        </span>
      )}
    </div>
  );
};

