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
    pressure?: number;
    wind_direction?: number;
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
    storage_architecture?: string;
    fuel_grade?: string;
    fuel_leak_detected?: boolean;
    tanks?: any[];
    total_tanks?: number;
    active_tanks_count?: number;
    transfer_loop?: any;
    drivers?: any;
    runway?: any;
    resupply?: any;
    anomaly?: any;
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
    source_description?: string;
    source_status?: string;
    source_temp_c?: number;
    intake_pipeline_length_m?: number;
    intake_pump?: any;
    treatment?: any;
    thermal_pipeline?: any;
    consumption_breakdown?: any;
    wastewater?: any;
    water_risk?: any;
    anomaly?: any;
    critical_reserve_liters?: number;
    usable_reserve_liters?: number;
    inflow_rate_l_hr?: number;
    hourly_consumption_l?: number;
    net_flow_l_hr?: number;
    trace_heating_draw_kw?: number;
    water_quality_index?: number;
  };
  waste?: any;
  supplies?: any;
  infrastructure?: any;
  equipment: {
    items: EquipmentItem[];
    avg_health: number;
  };
  logistics?: any;
  communication?: CommunicationDigitalTwin;
  personnel?: {
    station_id: string;
    station_name: string;
    location_type: string;
    expedition_day: number;
    headcount: number;
    bed_capacity: number;
    occupancy_pct: number;
    deployment_map: {
      station_interior: number;
      field_deployed: number;
      in_transit: number;
      in_rest: number;
      emergency_standby: number;
    };
    role_groups: Array<{
      role: string;
      abbrev: string;
      icon: string;
      color: string;
      count: number;
      on_station: number;
      field_deployed: number;
      in_transit: number;
      in_rest: number;
      on_maintenance: number;
      activity_level: string;
      specializations: string[];
      energy_contribution_kw: number;
      water_contribution_l_day: number;
      food_demand_kcal_day: number;
      waste_contribution_kg_day: number;
      current_activity_desc: string;
      domain_impact: string;
      availability: string;
      active_projects?: number;
      field_teams?: number;
      lab_teams?: number;
      research_readiness_pct?: number;
      equipment_required?: number;
      operator_coverage_pct?: number;
    }>;
    zone_map: Array<{
      zone: string;
      capacity: number;
      current: number;
      primary_use: string;
    }>;
    resource_demand_coupling: {
      energy_personnel_load_kw: number;
      water_demand_l_day: number;
      food_demand_kcal_day: number;
      waste_generation_kg_day: number;
      per_capita_energy_kw: number;
      per_capita_water_l_day: number;
      per_capita_kcal_day: number;
      per_capita_waste_kg_day: number;
      diurnal_multiplier?: number;
      research_energy_extra_kw?: number;
    };
    diurnal_block: {
      hour_start: number;
      hour_end: number;
      label: string;
      demand_mult: number;
      primary_activity: string;
      color: string;
    };
    diurnal_schedule: any[];
    current_hour: number;
    workforce_condition: {
      adequate_rest_count: number;
      watch_count: number;
      fatigue_alert_count: number;
      operational_coverage_pct: number;
      contributing_factors: string[];
      overall_status: string;
    };
    field_exposure: {
      field_team_count: number;
      field_team_deployed: boolean;
      exposure_risk: string;
      deployment_restriction: string;
      max_safe_exposure_min: number;
      current_conditions_desc: string;
      research_feasibility: string;
    };
    equipment_coverage: Array<{
      system: string;
      required: number;
      available: number;
      coverage_pct: number;
      status: string;
    }>;
    life_support: {
      o2_pct: number;
      co2_ppm: number;
      atmospheric_status: string;
      medical_officer_available: boolean;
      medical_facility_status: string;
      telemedicine_link: string;
      telemedicine_partner: string;
      emergency_response_readiness: string;
    };
    resupply_impact: {
      food_stock_days_current: number;
      water_autonomy_days: number;
      logistics_runway_days: number;
    };
    personnel_risk: {
      score: number;
      level: string;
      contributing_factors?: Array<{ factor: string; value: number; impact: number }>;
    };
    anomalies: Array<{
      type: string;
      severity: string;
      message: string;
      cause: string;
      operational_impact: string;
    }>;
    safety_status: string;
  };
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

// ── Communication Digital Twin Types ──────────────────────────────────────────
export interface CommunicationQoSTier {
  id: string;
  tier_number: number;
  name: string;
  short_name: string;
  priority: string;
  status: string;
  allocation_pct: number;
  current_mbps: number;
  guaranteed_mbps: number;
  packets_dropped: number;
  color: string;
  bg_color: string;
  description: string;
}

export interface CommunicationAsset {
  id: string;
  name: string;
  subsystem: string;
  status: string;
  health_pct: number;
  power_draw_kw: number;
  power_source: string;
  operating_condition: string;
  tracking_error_deg?: number;
  wind_limit_kmh?: number;
  switchover_time_sec?: number;
  bandwidth_cap_mbps?: number;
  rx_buffer_mb?: number;
  packets_received?: number;
  recent_event: string;
  maintenance_status: string;
  backup_available: boolean;
  source_provenance: 'REAL OBSERVATION' | 'SIMULATED' | 'ENGINEERING ASSUMPTION' | 'REFERENCE';
}

export interface DomainFreshnessItem {
  domain_id: string;
  name: string;
  route: string;
  last_update_sec: number;
  freshness_state: 'LIVE' | 'DELAYED' | 'STALE';
  samples_per_min: number;
  quality_score_pct: number;
  packet_arrival_rate: string;
  tier: number;
}

export interface CommunicationAnomaly {
  id: string;
  title: string;
  metric: string;
  threshold: string;
  severity: string;
  description: string;
  impact: string;
}

export interface CommunicationDigitalTwin {
  station_id: string;
  station_name: string;
  antenna_config: string;
  backup_config: string;
  ground_gateway: string;
  primary_link: string;
  backup_link: string;
  primary_status: string;
  backup_status: string;
  active_link: 'PRIMARY' | 'BACKUP';
  bandwidth_mbps: number;
  bandwidth_capacity_mbps: number;
  bandwidth_utilization_pct: number;
  available_capacity_mbps: number;
  traffic_trend: string;
  latency_ms: number;
  latency_avg_ms: number;
  latency_peak_ms: number;
  latency_jitter_ms: number;
  latency_trend: string;
  packet_loss_pct: number;
  packets_sent: number;
  packets_received: number;
  packets_dropped: number;
  packet_loss_status: string;
  telemetry_freshness_sec: number;
  expected_interval_sec: number;
  sync_state: 'SYNCHRONIZED' | 'DEGRADED' | 'STALE' | 'DISCONNECTED';
  data_completeness_pct: number;
  data_confidence_pct: number;
  link_health: string;
  stream_rate_samples_sec: number;
  last_sync_timestamp: string;
  radome_heater_active: boolean;
  power_draw_kw: number;
  radome_temp_c: number;
  tracking_error_deg: number;
  qos_tiers: CommunicationQoSTier[];
  assets: CommunicationAsset[];
  domains_freshness: DomainFreshnessItem[];
  history: Array<{
    t_minus_sec: number;
    bandwidth_mbps: number;
    latency_ms: number;
    packet_loss_pct: number;
    freshness_sec: number;
  }>;
  anomalies: CommunicationAnomaly[];
  communication_risk: {
    overall_risk_score: number;
    level: string;
    link_health_factor: number;
    freshness_factor: number;
    packet_integrity_factor: number;
    backup_readiness_factor: number;
    operational_visibility_impact: string;
    station_risk_contribution: number;
  };
}

