import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useStationStore } from '../../store/stationStore';
import { useLive dataStore } from '../../store/live dataStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { live dataApi } from '../../api/client';
export const Layout: React.FC = () => {
  const { selectedStationId } = useStationStore();
  const updateLiveWeather = useLive dataStore((s) => s.updateLiveWeather);

  // Ensure any previous light mode attributes and storage are cleared
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.removeItem('polartwin-theme');
    } catch {
      // ignore
    }
  }, []);

  // Maintain active WebSocket connection to the currently selected station
  useWebSocket(selectedStationId);

  // Global live weather sync for both Maitri and Bharati across the entire digital twin
  useEffect(() => {
    let isMounted = true;
    const syncWeather = async () => {
      try {
        const [maitriWeather, bharatiWeather] = await Promise.all([
          live dataApi.getWeather('maitri'),
          live dataApi.getWeather('bharati'),
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
    <div
      className="h-screen w-screen text-[var(--text-primary)] flex flex-col font-ui overflow-hidden"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <Navbar />
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <main
          className="flex-1 w-full overflow-y-auto p-6 relative"
          style={{ backgroundColor: 'var(--bg-base)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
