import React from 'react';
import { AlertItem } from '../../types';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface Props {
  alerts: AlertItem[];
  onDismiss?: (id: string) => void;
}

export const GlobalAlertBanner: React.FC<Props> = ({ alerts }) => {
  const criticalOrHigh = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');

  if (criticalOrHigh.length === 0) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Self-operating Twin Status: All life-support, fuel margins, and power loops operating normally.</span>
        </div>
        <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">NOMINAL</span>
      </div>
    );
  }

  const latest = criticalOrHigh[0];
  const isCritical = latest.severity === 'CRITICAL';

  return (
    <div className={`${isCritical ? 'bg-red-950/60 border-red-500/50 text-red-200' : 'bg-orange-950/60 border-orange-500/50 text-orange-200'} border rounded-xl p-3 px-4 flex items-center justify-between text-xs shadow-lg animate-pulse`}>
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className={`p-1.5 rounded-lg ${isCritical ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="truncate">
          <span className="font-bold mr-2 uppercase tracking-wide">[{latest.severity} ALERT]:</span>
          <span>{latest.message}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0 ml-4 font-mono text-[10px]">
        <span className={`${isCritical ? 'bg-red-500/30 text-red-300' : 'bg-orange-500/30 text-orange-300'} px-2 py-0.5 rounded border border-current`}>
          {new Date(latest.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};
