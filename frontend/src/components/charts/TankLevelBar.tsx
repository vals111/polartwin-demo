import React, { useEffect, useRef } from 'react';

interface TankLevelBarProps {
  percentage: number;
  label?: string;
  sublabel?: string;
  value?: string;
  color?: string;
  warningAt?: number;
  criticalAt?: number;
  height?: number;
  width?: number;
}

export const TankLevelBar: React.FC<TankLevelBarProps> = ({
  percentage,
  label = 'Tank Level',
  sublabel,
  value,
  color = '#06b6d4',
  warningAt = 30,
  criticalAt = 15,
  height = 200,
  width = 72,
}) => {
  const fillRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const clampedPct = Math.max(0, Math.min(100, percentage));

  const activeColor =
    clampedPct <= criticalAt
      ? '#ef4444'
      : clampedPct <= warningAt
      ? '#f59e0b'
      : color;

  const bgGlow =
    clampedPct <= criticalAt
      ? 'rgba(239,68,68,0.15)'
      : clampedPct <= warningAt
      ? 'rgba(245,158,11,0.15)'
      : 'rgba(6,182,212,0.10)';

  useEffect(() => {
    const fillEl = fillRef.current;
    if (fillEl) {
      fillEl.style.height = `${clampedPct}%`;
    }
  }, [clampedPct]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label */}
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center leading-tight">
        {label}
      </div>

      {/* Tank Body */}
      <div
        className="relative flex flex-col justify-end rounded-2xl overflow-hidden border border-white/10"
        style={{
          width,
          height,
          background: 'rgba(15,23,42,0.8)',
          boxShadow: `0 0 20px ${bgGlow}, inset 0 0 10px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Grid lines */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute left-0 right-0 border-t border-white/5"
            style={{ bottom: `${tick}%` }}
          />
        ))}

        {/* Percentage label on tank */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        >
          <span className="text-xs font-black font-mono text-white/60">
            {clampedPct.toFixed(0)}%
          </span>
        </div>

        {/* Animated liquid fill */}
        <div
          ref={fillRef}
          className="relative w-full transition-all duration-1000 ease-out rounded-xl"
          style={{
            height: `${clampedPct}%`,
            background: `linear-gradient(to top, ${activeColor}cc, ${activeColor}55)`,
            boxShadow: `0 -2px 16px ${activeColor}66`,
          }}
        >
          {/* Wave shimmer on top */}
          <div
            className="absolute top-0 left-0 right-0 h-2 animate-pulse"
            style={{
              background: `linear-gradient(to right, transparent, ${activeColor}88, transparent)`,
            }}
          />
          {/* Bubble animation */}
          <div
            ref={bubbleRef}
            className="absolute left-1/2 top-2 w-1.5 h-1.5 rounded-full opacity-60 animate-bounce"
            style={{ background: activeColor, transform: 'translateX(-50%)' }}
          />
        </div>
      </div>

      {/* Value display */}
      <div className="text-center">
        <div className="text-sm font-black font-mono" style={{ color: activeColor }}>
          {value || `${clampedPct.toFixed(1)}%`}
        </div>
        {sublabel && (
          <div className="text-[9px] font-mono text-slate-500 mt-0.5">{sublabel}</div>
        )}
      </div>
    </div>
  );
};
