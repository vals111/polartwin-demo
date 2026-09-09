import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useStationStore } from '../../store/stationStore';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { telemetryApi } from '../../api/client';

export const Layout: React.FC = () => {
  const { selectedStationId } = useStationStore();
  const updateLiveWeather = useTelemetryStore((s) => s.updateLiveWeather);

  // Maintain active WebSocket connection to the currently selected station
  useWebSocket(selectedStationId);

  // Global live weather sync for both Maitri and Bharati across the entire digital twin
  useEffect(() => {
    let isMounted = true;
    const syncWeather = async () => {
      try {
        const [maitriWeather, bharatiWeather] = await Promise.all([
          telemetryApi.getWeather('maitri'),
          telemetryApi.getWeather('bharati'),
        ]);
        if (isMounted) {
          if (maitriWeather) updateLiveWeather('maitri', maitriWeather);
          if (bharatiWeather) updateLiveWeather('bharati', bharatiWeather);
        }
      } catch (err) {
        console.warn('Live weather multi-station sync error:', err);
      }
    };

    // Immediate sync on load
    syncWeather();

    // 4-second interval ensuring seamless real-time syncing across all project pages
    const timer = setInterval(syncWeather, 4000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [updateLiveWeather]);

  return (
    <div className="h-screen w-screen bg-[#040812] text-slate-100 flex flex-col font-ui overflow-hidden">
      <Navbar />
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#060c18] via-[#040812] to-[#020509] p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
