import React, { useEffect, useRef } from 'react';

interface Alert {
  alert_id?: string;
  id?: string;
  severity: string;
  message: string;
  timestamp?: string;
  domain?: string;
}

interface RealTimeAlertFeedProps {
  alerts: Alert[];
  maxVisible?: number;
  stationColor?: string;
}

const SEV_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/40', dot: 'bg-red-400' },
  HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/40', dot: 'bg-orange-400' },
  MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/40', dot: 'bg-yellow-400' },
  LOW: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  INFO: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/40', dot: 'bg-blue-400' },
};

const getSev = (sev: string) =>
  SEV_STYLE[sev.toUpperCase()] || SEV_STYLE.INFO;

export const RealTimeAlertFeed: React.FC<RealTimeAlertFeedProps> = ({
  alerts,
  maxVisible = 8,
  stationColor = '#06b6d4',
}) => {
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new alerts arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  const displayed = alerts.slice(0, maxVisible);

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="text-xs font-mono text-emerald-400 font-bold">ALL SYSTEMS NOMINAL</div>
        <div className="text-[10px] text-slate-500 font-mono">No active alerts in the telemetry stream</div>
      </div>
    );
  }

  return (
    <div ref={feedRef} className="space-y-2 max-h-96 overflow-y-auto pr-1 styled-scroll">
      {displayed.map((alert, idx) => {
        const s = getSev(alert.severity);
        const id = alert.alert_id || alert.id || String(idx);
        return (
          <div
            key={id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${s.bg} ${s.border} transition-all animate-fadeIn`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {/* Severity dot with pulse */}
            <div className="flex-shrink-0 mt-0.5 relative">
              <span className={`w-2.5 h-2.5 rounded-full block ${s.dot}`} />
              {(alert.severity === 'CRITICAL' || alert.severity === 'HIGH') && (
                <span
                  className={`absolute inset-0 rounded-full ${s.dot} opacity-40 animate-ping`}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className={`text-[9px] font-black font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${s.bg} ${s.border} ${s.text}`}>
                  {alert.severity}
                </span>
                {alert.domain && (
                  <span className="text-[9px] font-mono text-slate-500 truncate">
                    {alert.domain}
                  </span>
                )}
                <span className="text-[9px] font-mono text-slate-600 ml-auto whitespace-nowrap">
                  {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'now'}
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${s.text} font-medium`}>{alert.message}</p>
            </div>
          </div>
        );
      })}

      {alerts.length > maxVisible && (
        <div className="text-center text-[10px] font-mono text-slate-500 py-2">
          + {alerts.length - maxVisible} more alerts not shown
        </div>
      )}
    </div>
  );
};
