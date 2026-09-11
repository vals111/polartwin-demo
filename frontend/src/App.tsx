import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { StationTwinPage } from './pages/StationTwinPage';
import { DomainsPage } from './pages/DomainsPage';
import { ResourceMonitoringPage } from './pages/ResourceMonitoringPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ForecastPage } from './pages/ForecastPage';
import { RiskAlertsPage } from './pages/RiskAlertsPage';
import { WhatIfPage } from './pages/WhatIfPage';
import { Twin3DPage } from './pages/Twin3DPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { OptimizationPage } from './pages/OptimizationPage';
import { AdminPage } from './pages/AdminPage';
import { FuelPage } from './pages/FuelPage';
import { WaterPage } from './pages/WaterPage';
import { LogisticsPage } from './pages/LogisticsPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { InventoryPage } from './pages/InventoryPage';
import { DecisionIntelligencePage } from './pages/DecisionIntelligencePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Application Frame */}
        <Route element={<Layout />}>
          {/* Main Station Dashboard & Redirect */}
          <Route path="/" element={<Navigate to="/station/maitri" replace />} />

          {/* Station Twin Views */}
          <Route path="/station/:id" element={<StationTwinPage />} />
          <Route path="/station/:id/dashboard" element={<StationTwinPage />} />
          <Route path="/station/:id/domains" element={<DomainsPage />} />
          
          {/* 9 Dedicated Domain Feature Pages */}
          <Route path="/station/:id/energy" element={<ResourceMonitoringPage />} />
          <Route path="/station/:id/resources" element={<ResourceMonitoringPage />} />
          <Route path="/station/:id/environment" element={<EnvironmentPage />} />
          <Route path="/station/:id/fuel" element={<FuelPage />} />
          <Route path="/station/:id/equipment" element={<EquipmentPage />} />
          <Route path="/station/:id/water" element={<WaterPage />} />
          <Route path="/station/:id/logistics" element={<LogisticsPage />} />
          <Route path="/station/:id/personnel" element={<PersonnelPage />} />
          <Route path="/station/:id/communication" element={<CommunicationPage />} />
          <Route path="/station/:id/inventory" element={<InventoryPage />} />

          <Route path="/station/:id/analytics" element={<DecisionIntelligencePage />} />
          <Route path="/station/:id/forecast" element={<DecisionIntelligencePage />} />
          <Route path="/station/:id/risk" element={<DecisionIntelligencePage />} />
          <Route path="/station/:id/decision" element={<DecisionIntelligencePage />} />
          <Route path="/station/:id/twin3d" element={<Twin3DPage />} />

          <Route
            path="/station/:id/whatif"
            element={
              <ProtectedRoute minRole="operator">
                <DecisionIntelligencePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/station/:id/optimization"
            element={
              <ProtectedRoute minRole="operator">
                <DecisionIntelligencePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/station/:id/recommendations"
            element={
              <ProtectedRoute minRole="operator">
                <DecisionIntelligencePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Restricted Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute minRole="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
