import { create } from 'zustand';
import { AlertItem } from '../types';
import { alertsApi } from '../api/client';

interface AlertState {
  alerts: Record<string, AlertItem[]>;
  isLoading: boolean;
  addAlert: (stationId: string, alert: AlertItem) => void;
  loadAlerts: (stationId: string) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: {},
  isLoading: false,

  addAlert: (stationId: string, alert: AlertItem) => {
    set((state) => {
      const current = state.alerts[stationId] || [];
      // avoid duplicates
      if (current.some((a) => a.message === alert.message)) {
        return state;
      }
      return {
        alerts: {
          ...state.alerts,
          [stationId]: [alert, ...current].slice(0, 20)
        }
      };
    });
  },

  loadAlerts: async (stationId: string) => {
    set({ isLoading: true });
    try {
      const list = await alertsApi.list(stationId);
      set((state) => ({
        alerts: { ...state.alerts, [stationId]: list }
      }));
    } catch (e) {
      console.warn('Failed to fetch alerts:', e);
    } finally {
      set({ isLoading: false });
    }
  }
}));
