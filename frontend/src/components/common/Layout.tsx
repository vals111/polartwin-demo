import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useStationStore } from '../../store/stationStore';
import { useWebSocket } from '../../hooks/useWebSocket';

export const Layout: React.FC = () => {
  const { selectedStationId } = useStationStore();
  const location = useLocation();
  const isLandingSelector = location.pathname === '/';

  // Maintain active WebSocket connection to the currently selected station
  useWebSocket(selectedStationId);

  return (
    <div className="min-h-screen bg-polar-darker text-slate-100 flex flex-col font-ui">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {!isLandingSelector && <Sidebar />}
        <main className={`flex-1 overflow-y-auto bg-gradient-to-b from-polar-dark to-polar-darker ${isLandingSelector ? 'p-6 lg:p-10' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
