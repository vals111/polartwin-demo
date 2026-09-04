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
