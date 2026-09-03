import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useStationStore } from '../../store/stationStore';
import { useWebSocket } from '../../hooks/useWebSocket';

export const Layout: React.FC = () => {
  const { selectedStationId } = useStationStore();
  // Maintain active WebSocket connection to the currently selected station
  useWebSocket(selectedStationId);

  return (
    <div className="min-h-screen bg-polar-darker text-slate-100 flex flex-col font-ui">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-polar-dark to-polar-darker p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
