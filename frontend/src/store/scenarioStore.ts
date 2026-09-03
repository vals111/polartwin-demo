import { create } from 'zustand';
import { WhatIfPreset, WhatIfResult } from '../types';
import { scenariosApi } from '../api/client';

interface ScenarioState {
  presets: WhatIfPreset[];
  currentResult: WhatIfResult | null;
  isRunning: boolean;
  selectedPreset: WhatIfPreset | null;
  loadPresets: () => Promise<void>;
  selectPreset: (preset: WhatIfPreset) => void;
  runScenario: (stationId: string, definition: any) => Promise<WhatIfResult | null>;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  presets: [],
  currentResult: null,
  isRunning: false,
  selectedPreset: null,

  loadPresets: async () => {
    try {
      const presets = await scenariosApi.getPresets();
      set({ presets, selectedPreset: presets[0] || null });
    } catch (e) {
      console.warn('Failed to load presets:', e);
    }
  },

  selectPreset: (preset: WhatIfPreset) => {
    set({ selectedPreset: preset });
  },

  runScenario: async (stationId: string, definition: any) => {
    set({ isRunning: true });
    try {
      const res = await scenariosApi.execute(stationId, definition);
      set({ currentResult: res.result, isRunning: false });
      return res.result;
    } catch (e) {
      console.error('Scenario execution failed:', e);
      set({ isRunning: false });
      return null;
    }
  }
}));
