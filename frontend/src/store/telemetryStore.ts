import { create } from 'zustand';
import { TelemetrySnapshot, RiskData } from '../types';

interface TelemetryState {
  liveSnapshot: Record<string, TelemetrySnapshot>; // keyed by station_id
  liveRisk: Record<string, RiskData>;
  isConnected: boolean;
  lastTickTime: Record<string, string>;
  setConnected: (status: boolean) => void;
  updateTelemetry: (stationId: string, data: any) => void;
  updateRisk: (stationId: string, risk: RiskData) => void;
  setInitialState: (stationId: string, state: any, risk: RiskData) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  liveSnapshot: {},
  liveRisk: {},
  isConnected: false,
  lastTickTime: {},

  setConnected: (status: boolean) => set({ isConnected: status }),

  updateTelemetry: (stationId: string, data: any) => {
    set((state) => {
      const prevSnap = state.liveSnapshot[stationId] || {};
      const newSnap = {
        ...prevSnap,
        station_id: stationId,
        timestamp: data.timestamp || new Date().toISOString(),
        tick: data.tick || (prevSnap.tick || 0) + 1,
        environment: data.environment || prevSnap.environment,
        energy: data.energy || prevSnap.energy,
        fuel: data.fuel || prevSnap.fuel,
        water: data.water || prevSnap.water,
        equipment: data.equipment || prevSnap.equipment,
        station_ops: data.station_ops || prevSnap.station_ops
      };
      return {
        liveSnapshot: { ...state.liveSnapshot, [stationId]: newSnap as TelemetrySnapshot },
        lastTickTime: { ...state.lastTickTime, [stationId]: new Date().toLocaleTimeString() }
      };
    });
  },

  updateRisk: (stationId: string, risk: RiskData) => {
    set((state) => ({
      liveRisk: { ...state.liveRisk, [stationId]: risk }
    }));
  },

  setInitialState: (stationId: string, stateData: any, risk: RiskData) => {
    set((state) => ({
      liveSnapshot: { ...state.liveSnapshot, [stationId]: stateData },
      liveRisk: { ...state.liveRisk, [stationId]: risk },
      lastTickTime: { ...state.lastTickTime, [stationId]: new Date().toLocaleTimeString() }
    }));
  }
}));
