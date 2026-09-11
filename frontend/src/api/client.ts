import axios from 'axios';
import {
  Station, Asset, EquipmentItem, RiskData,
  AlertItem, TelemetrySnapshot, WhatIfPreset,
  WhatIfResult, RecommendationItem
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('polartwin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  }
};

// Stations
export const stationsApi = {
  list: async (): Promise<Station[]> => {
    const res = await apiClient.get('/stations');
    return res.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get(`/stations/${id}`);
    return res.data;
  },
  getAssets: async (id: string): Promise<Asset[]> => {
    const res = await apiClient.get(`/stations/${id}/assets`);
    return res.data;
  }
};

// Telemetry & Resources
export const telemetryApi = {
  getReadings: async (stationId = 'maitri', parameter?: string) => {
    const params: any = { station_id: stationId };
    if (parameter) params.parameter = parameter;
    const res = await apiClient.get('/telemetry', { params });
    return res.data;
  },
  getLiveSnapshot: async (stationId = 'maitri'): Promise<TelemetrySnapshot> => {
    const res = await apiClient.get(`/telemetry/live/${stationId}`);
    return res.data;
  },
  getLogistics: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/telemetry/logistics/${stationId}`);
    return res.data;
  },
  getInventory: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/telemetry/inventory/${stationId}`);
    return res.data;
  },
  getWeather: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/telemetry/weather/${stationId}`);
    return res.data;
  },
  refreshWeather: async (stationId = 'maitri') => {
    const res = await apiClient.post(`/telemetry/weather/${stationId}/refresh`);
    return res.data;
  }
};

export const resourcesApi = {
  list: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/resources/${stationId}`);
    return res.data;
  },
  getInventory: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/resources/${stationId}/inventory`);
    return res.data;
  }
};

// Equipment
export const equipmentApi = {
  getStationEquipment: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/equipment/station/${stationId}`);
    return res.data;
  },
  getEquipmentItem: async (assetId: string, stationId = 'maitri'): Promise<EquipmentItem> => {
    const res = await apiClient.get(`/equipment/${assetId}`, { params: { station_id: stationId } });
    return res.data;
  },
  getPredictiveMaintenance: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/equipment/predictive-maintenance/${stationId}`);
    return res.data;
  }
};

// Risk & Alerts
export const riskApi = {
  get: async (stationId = 'maitri'): Promise<RiskData> => {
    const res = await apiClient.get(`/risk/${stationId}`);
    return res.data;
  }
};

export const alertsApi = {
  list: async (stationId = 'maitri', severity?: string): Promise<AlertItem[]> => {
    const params: any = { station_id: stationId };
    if (severity) params.severity = severity;
    const res = await apiClient.get('/alerts', { params });
    return res.data;
  }
};

// Forecasting & Anomalies
export const forecastApi = {
  get: async (stationId = 'maitri', domain = 'fuel', horizon = 24) => {
    const res = await apiClient.get('/forecast', {
      params: { station_id: stationId, domain, horizon }
    });
    return res.data;
  }
};

export const anomaliesApi = {
  list: async (stationId = 'maitri') => {
    const res = await apiClient.get('/anomalies', { params: { station_id: stationId } });
    return res.data;
  }
};

export const recommendationsApi = {
  list: async (stationId = 'maitri'): Promise<RecommendationItem[]> => {
    const res = await apiClient.get(`/recommendations/${stationId}`);
    return res.data;
  }
};

// Scenarios & What-If
export const scenariosApi = {
  getPresets: async (): Promise<WhatIfPreset[]> => {
    const res = await apiClient.get('/scenarios/presets');
    return res.data;
  },
  execute: async (stationId: string, definition: any): Promise<{ scenario_id: string; result: WhatIfResult }> => {
    const res = await apiClient.post('/scenarios', { station_id: stationId, definition });
    return res.data;
  },
  getRun: async (id: string): Promise<WhatIfResult> => {
    const res = await apiClient.get(`/scenarios/${id}`);
    return res.data;
  },
  runMonteCarlo: async (stationId: string, iterations = 100, horizonDays = 30, scenarioType = 'nominal') => {
    const res = await apiClient.post(`/scenarios/monte-carlo/${stationId}`, null, {
      params: { iterations, horizon_days: horizonDays, scenario_type: scenarioType }
    });
    return res.data;
  }
};

// Analytics & Recommendations
export const analyticsApi = {
  get: async (stationId = 'maitri', metric = 'energy_fuel') => {
    const res = await apiClient.get('/analytics', { params: { station_id: stationId, metric } });
    return res.data;
  },
  getShap: async (stationId = 'maitri', target = 'risk') => {
    const res = await apiClient.get(`/analytics/shap/${stationId}`, { params: { target } });
    return res.data;
  }
};

// Optimization (RL)
export const optimizationApi = {
  getRlDispatch: async (stationId = 'maitri') => {
    const res = await apiClient.get(`/optimization/rl/${stationId}`);
    return res.data;
  }
};

// Monitoring & Logging
export const monitoringApi = {
  getHealth: async () => {
    const res = await apiClient.get('/monitoring/health');
    return res.data;
  },
  getMetrics: async () => {
    const res = await apiClient.get('/monitoring/metrics');
    return res.data;
  }
};

// Admin
export const adminApi = {
  getUsers: async () => {
    const res = await apiClient.get('/admin/users');
    return res.data;
  },
  getConfig: async () => {
    const res = await apiClient.get('/admin/config');
    return res.data;
  },
  triggerTick: async (stationId: string) => {
    const res = await apiClient.post(`/admin/tick/${stationId}`);
    return res.data;
  }
};
