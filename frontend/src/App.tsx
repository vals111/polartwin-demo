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
          <Route path="/station/:id/resources" element={<ResourceMonitoringPage />} />
          <Route path="/station/:id/equipment" element={<EquipmentPage />} />
          <Route path="/station/:id/environment" element={<EnvironmentPage />} />
          <Route path="/station/:id/analytics" element={<AnalyticsPage />} />
          <Route path="/station/:id/forecast" element={<ForecastPage />} />
          <Route path="/station/:id/risk" element={<RiskAlertsPage />} />
          <Route path="/station/:id/twin3d" element={<Twin3DPage />} />

          {/* Operator+ Restricted Routes */}
          <Route
            path="/station/:id/whatif"
            element={
              <ProtectedRoute minRole="operator">
                <WhatIfPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/station/:id/optimization"
            element={
              <ProtectedRoute minRole="operator">
                <OptimizationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/station/:id/recommendations"
            element={
              <ProtectedRoute minRole="operator">
                <RecommendationsPage />
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
