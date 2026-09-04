import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { telemetryApi, riskApi } from '../api/client';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

/** Retrieve the JWT that the auth layer stored after login. */
function getAuthToken(): string {
  return (
    localStorage.getItem('polartwin_token') ||
    sessionStorage.getItem('polartwin_token') ||
    ''
  );
}

export function useWebSocket(stationId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const connectedRef = useRef(false);

  const setConnected = useTelemetryStore((s) => s.setConnected);
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);
  const updateRisk = useTelemetryStore((s) => s.updateRisk);
  const setInitialState = useTelemetryStore((s) => s.setInitialState);
  const addAlert = useAlertStore((s) => s.addAlert);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const startFallbackPolling = () => {
      if (pollInterval) return; // already running
      pollInterval = setInterval(async () => {
        // Only poll when WS is NOT connected (issue #15 fix)
        if (connectedRef.current) return;
        try {
          const snap: any = await telemetryApi.getLiveSnapshot(stationId);
          if (snap?.telemetry) {
            updateTelemetry(stationId, snap.telemetry);
          }
          const r = await riskApi.get(stationId);
          if (r) {
            updateRisk(stationId, r);
          }
        } catch {
          // Backend might be loading — silent retry
        }
      }, 4000);
    };

    const stopFallbackPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const connect = () => {
      // Attach JWT as query param — server validates before accept() (issue #2 fix)
      const token = getAuthToken();
      const url = `${WS_BASE}/ws/${stationId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedRef.current = true;
        setConnected(true);
        stopFallbackPolling(); // WS healthy — no need to poll
        console.log(`Connected to POLARTWIN Live Twin WebSocket (${stationId})`);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'initial_state') {
            setInitialState(stationId, message.data.state, message.data.risk);
          } else if (message.type === 'telemetry_update') {
            updateTelemetry(stationId, message.data);
          } else if (message.type === 'risk_update') {
            updateRisk(stationId, message.data);
          } else if (message.type === 'alert_new') {
            addAlert(stationId, message.data);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket error, will retry...', e);
      };

      ws.onclose = () => {
        connectedRef.current = false;
        setConnected(false);
        // Start REST fallback while we try to reconnect
        startFallbackPolling();
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    // Kick off the initial connection + start polling as safety net
    // (polling exits immediately if WS comes up quickly)
    startFallbackPolling();
    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      stopFallbackPolling();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stationId, setConnected, updateTelemetry, updateRisk, setInitialState, addAlert]);
}
