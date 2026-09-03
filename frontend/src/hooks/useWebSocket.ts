import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useAlertStore } from '../store/alertStore';
import { telemetryApi, riskApi } from '../api/client';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export function useWebSocket(stationId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const setConnected = useTelemetryStore((s) => s.setConnected);
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);
  const updateRisk = useTelemetryStore((s) => s.updateRisk);
  const setInitialState = useTelemetryStore((s) => s.setInitialState);
  const addAlert = useAlertStore((s) => s.addAlert);

  useEffect(() => {
    let reconnectTimeout: any = null;
    let pollInterval: any = null;

    const connect = () => {
      const url = `${WS_BASE}/ws/${stationId}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
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
        setConnected(false);
        // Retry connection in 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    // Fallback polling every 4 seconds to guarantee state always refreshes smoothly
    pollInterval = setInterval(async () => {
      try {
        const snap: any = await telemetryApi.getLiveSnapshot(stationId);
        if (snap && snap.telemetry) {
          updateTelemetry(stationId, snap.telemetry);
        }
        const r = await riskApi.get(stationId);
        if (r) {
          updateRisk(stationId, r);
        }
      } catch (e) {
        // Backend might be loading
      }
    }, 4000);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stationId, setConnected, updateTelemetry, updateRisk, setInitialState, addAlert]);
}
