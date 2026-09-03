import { create } from 'zustand';
import { Station } from '../types';
import { stationsApi } from '../api/client';

interface StationState {
  selectedStationId: string;
  stations: Station[];
  isLoading: boolean;
  selectStation: (stationId: string) => void;
  loadStations: () => Promise<void>;
}

export const useStationStore = create<StationState>((set) => ({
  selectedStationId: 'maitri',
  stations: [
    { station_id: 'maitri', name: 'Maitri Antarctic Station', location_type: 'inland' },
    { station_id: 'bharati', name: 'Bharati Antarctic Station', location_type: 'coastal' }
  ],
  isLoading: false,

  selectStation: (stationId: string) => {
    set({ selectedStationId: stationId });
  },

  loadStations: async () => {
    set({ isLoading: true });
    try {
      const list = await stationsApi.list();
      if (list && list.length > 0) {
        set({ stations: list });
      }
    } catch (e) {
      console.warn('Failed to load stations, using defaults:', e);
    } finally {
      set({ isLoading: false });
    }
  }
}));
