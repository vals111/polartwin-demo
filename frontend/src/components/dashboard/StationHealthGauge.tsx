import React from 'react';

interface Props {
  score: number;
  size?: number;
  label?: string;
  statusBand?: string;
}

export const StationHealthGauge: React.FC<Props> = ({
  score = 92.5,
  size = 180,
  label = 'Overall Readiness',
  statusBand = 'Nominal'
}) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 80) return '#10b981'; // green
    if (val >= 65) return '#06b6d4'; // cyan
    if (val >= 50) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e3a5f"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="opacity-40"
          />
          {/* Animated Value circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black font-mono tracking-tight text-white">
            {score}%
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color }}>
            {statusBand}
          </span>
        </div>
      </div>

      <div className="text-xs text-slate-400 font-medium mt-2 tracking-wide uppercase">{label}</div>
    </div>
  );
};
