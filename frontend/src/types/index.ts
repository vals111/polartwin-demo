export interface User {
  user_id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface Station {
  station_id: string;
  name: string;
  location_type: 'inland' | 'coastal';
}

export interface Asset {
  asset_id: string;
  station_id: string;
  type: string;
  name: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  health_score: number;
  operating_hours: number;
  status: string;
  vibration_mm_s: number;
  temp_c: number;
  failure_risk_pct: number;
}

export interface ContributingFactor {
  factor: string;
  weight: number;
  raw_score?: number;
}

export interface RiskData {
  station_id: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contributing_factors: ContributingFactor[];
  timestamp: string;
  explanation?: string;
}

export interface AlertItem {
  alert_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  parameter?: string;
  timestamp: string;
}

export interface TelemetrySnapshot {
  station_id: string;
  timestamp: string;
  tick: number;
  environment: {
    temperature: number;
    wind_speed: number;
    wind_gust: number;
    solar_radiation: number;
    storm_severity: number;
    visibility: number;
    condition: string;
    blizzard_active: boolean;
    humidity: number;
  };
  energy: {
    total_demand: number;
    base_load: number;
    heating_load: number;
    research_load: number;
    water_heating_load: number;
    solar_output: number;
    generator_load: number;
    battery_level: number;
    grid_frequency: number;
    generator_count_active: number;
    status: string;
  };
  fuel: {
    total_capacity: number;
    current_level: number;
    fuel_percentage: number;
    consumption_rate_l_per_hr: number;
    burn_rate_l_per_kwh: number;
    days_remaining: number;
    reserve_zone: string;
    resupply_eta_days: number;
    fuel_temperature: number;
  };
  water: {
    source_type: string;
    storage_liters: number;
    max_storage_liters: number;
    daily_consumption_l: number;
    pump_status: string;
    trace_heating_active: boolean;
    pipe_temp_c: number;
    freeze_risk: string;
    production_rate_l_hr: number;
    percentage: number;
    days_remaining: number;
  };
  waste?: any;
  supplies?: any;
  infrastructure?: any;
  equipment: {
    items: EquipmentItem[];
    avg_health: number;
  };
  logistics?: any;
  communication?: any;
  personnel?: any;
  research?: any;
  safety?: any;
  maintenance?: any;
  inventory?: any;
  station_ops: {
    overall_readiness: number;
    status_band: string;
    domain_readiness: Record<string, number>;
  };
}

export interface WhatIfPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  perturbation: Record<string, any>;
  duration_ticks: number;
  expected_risk: string;
  recommended_action: string;
}

export interface WhatIfResult {
  scenario_id: string;
  station_id: string;
  title: string;
  ticks_simulated: number;
  comparison: Record<string, {
    baseline: number;
    projected: number;
    delta: number;
    unit: string;
  }>;
  baseline_risk: RiskData;
  projected_risk: RiskData;
  attribution: Array<{ factor: string; impact_pct: number }>;
  trajectory_baseline: Array<any>;
  trajectory_projected: Array<any>;
  recommended_action: string;
}

export interface RecommendationItem {
  action: string;
  explanation: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  domain: string;
}
