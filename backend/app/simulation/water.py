"""
Water Supply & Pipeline Thermal Integrity Simulation Module for POLARTWIN
Implements the core Antarctic Digital Twin lifecycle:
Water Source → Pump / Intake → Production / Treatment → Storage → Distribution / Pipeline → Consumption → Wastewater → Risk

Formulas & Models:
- NetStorage(t+1) = NetStorage(t) + Production(t) - Consumption(t)
- Autonomy = Storage / DailyConsumption
- FreezeMargin = PipeTemp - FreezeThreshold (0.5°C)
- TraceHeating modulates based on ambient heat loss: Q_loss = h_conv * Area * (T_pipe - T_ambient)
- Energy Coupling: TraceHeatingDraw directly impacts microgrid electrical load & generator fuel burn.
"""
import copy
from typing import Dict, Any, List

def init_water_state(station_id: str) -> dict:
    is_maitri = (station_id == "maitri")

    if is_maitri:
        # Maitri: Inland Schirmacher Oasis, Priyadarshini (Zub) Lake sub-glacial intake
        source_type = "Lake-Water Pump House (Zub / Priyadarshini Lake)"
        source_desc = "Freshwater glacial melt sub-surface lake intake, 1.2 km distant overland insulated pipeline."
        source_status = "OPERATIONAL"
        source_temp_c = 1.2
        intake_pipeline_length_m = 1200.0

        intake_pump = {
            "id": "pump_m01",
            "name": "Priyadarshini Sub-Glacial Extraction Pump #1",
            "status": "RUNNING",
            "flow_rate_l_min": 28.0,
            "rated_flow_l_hr": 1680.0,
            "actual_production_l_hr": 120.0,
            "health_score": 94.5,
            "load_pct": 42.0,
            "power_draw_kw": 2.8,
            "failure_risk_pct": 2.1,
            "rul_days": 180,
            "maintenance_status": "NOMINAL"
        }

        treatment_subsystem = {
            "process": "Glacier Melt Dual Multimedia Filtration + UV Sterilization",
            "status": "NOMINAL",
            "efficiency_pct": 98.5,
            "water_quality_index": 96.5,
            "tds_ppm": 18.0, # Pristine glacier melt reference
            "ph": 7.2,
            "uv_lamp_intensity_pct": 99.0,
            "filter_differential_bar": 0.35
        }

        storage_liters = 18500.0
        max_storage_liters = 25000.0
        critical_reserve_liters = 5000.0
        headcount = 25
        daily_consumption = 1200.0
        hourly_consumption = round(daily_consumption / 24.0, 1)

        thermal_pipeline = {
            "pipe_temp_c": 3.8,
            "freeze_threshold_c": 0.5,
            "freeze_margin_c": 3.3,
            "freeze_risk": "Low",
            "trace_heating_active": True,
            "trace_heating_draw_kw": 4.2,
            "heating_mode": "Thermostatic Auto-Trim (Active)",
            "ambient_exposure_temp_c": -25.0,
            "wind_chill_equivalent_c": -38.4,
            "insulation_integrity_pct": 96.0
        }

        consumption_breakdown = {
            "headcount": headcount,
            "galley_kitchen_l_day": 320.0,
            "hygiene_showers_l_day": 410.0,
            "science_labs_l_day": 120.0,
            "domestic_habitat_l_day": 350.0,
            "total_daily_l": daily_consumption
        }

        wastewater_subsystem = {
            "generated_daily_l": 1080.0,
            "greywater_recycled_l": 360.0,
            "blackwater_to_stp_l": 720.0,
            "stp_status": "AEROBIC_DIGESTION_OK",
            "effluent_quality_compliant": True
        }

        water_risk = {
            "score": 14.2,
            "level": "LOW",
            "contributing_factors": [
                {"factor": "Pipeline Freeze Margin", "weight": 0.35, "status": "NOMINAL (+3.3°C margin)"},
                {"factor": "Storage Autonomy Runway", "weight": 0.30, "status": "SAFE (15.4 days buffer)"},
                {"factor": "Intake Pump Health", "weight": 0.25, "status": "HEALTHY (94.5%)"},
                {"factor": "Wastewater STP Processing", "weight": 0.10, "status": "COMPLIANT (Zero Discharge)"}
            ]
        }

    else:
        # Bharati: Coastal Larsemann Hills, Quilty Bay Seawater intake & SWRO Desalination
        source_type = "Seawater Pump House & SWRO Desalination (Quilty Bay)"
        source_desc = "Sub-ice seawater intake at Quilty Bay with multi-stage Reverse Osmosis desalination & mineralizer."
        source_status = "OPERATIONAL"
        source_temp_c = -1.6
        intake_pipeline_length_m = 160.0

        intake_pump = {
            "id": "ro_b01",
            "name": "Quilty Bay Seawater Intake Submersible & SWRO Booster",
            "status": "RUNNING",
            "flow_rate_l_min": 35.0,
            "rated_flow_l_hr": 2100.0,
            "actual_production_l_hr": 160.0,
            "health_score": 96.8,
            "load_pct": 48.0,
            "power_draw_kw": 5.8,
            "failure_risk_pct": 1.8,
            "rul_days": 240,
            "maintenance_status": "NOMINAL"
        }

        treatment_subsystem = {
            "process": "High-Pressure Seawater Reverse Osmosis (SWRO) + Remineralization",
            "status": "NOMINAL",
            "efficiency_pct": 99.2,
            "water_quality_index": 98.2,
            "tds_ppm": 42.0, # Desalinated potable mineralized standard
            "ph": 7.5,
            "uv_lamp_intensity_pct": 100.0,
            "filter_differential_bar": 0.28
        }

        storage_liters = 28000.0
        max_storage_liters = 35000.0
        critical_reserve_liters = 7000.0
        headcount = 35
        daily_consumption = 1650.0
        hourly_consumption = round(daily_consumption / 24.0, 1)

        thermal_pipeline = {
            "pipe_temp_c": 4.5,
            "freeze_threshold_c": 0.5,
            "freeze_margin_c": 4.0,
            "freeze_risk": "Low",
            "trace_heating_active": True,
            "trace_heating_draw_kw": 5.8,
            "heating_mode": "CHP Glycol Waste Heat Loop + Electric Backup",
            "ambient_exposure_temp_c": -20.0,
            "wind_chill_equivalent_c": -31.2,
            "insulation_integrity_pct": 98.5
        }

        consumption_breakdown = {
            "headcount": headcount,
            "galley_kitchen_l_day": 460.0,
            "hygiene_showers_l_day": 620.0,
            "science_labs_l_day": 190.0,
            "domestic_habitat_l_day": 380.0,
            "total_daily_l": daily_consumption
        }

        wastewater_subsystem = {
            "generated_daily_l": 1485.0,
            "greywater_recycled_l": 500.0,
            "blackwater_to_stp_l": 985.0,
            "stp_status": "MBR_ULTRAFILTRATION_OK",
            "effluent_quality_compliant": True
        }

        water_risk = {
            "score": 11.5,
            "level": "LOW",
            "contributing_factors": [
                {"factor": "Pipeline Freeze Margin", "weight": 0.35, "status": "NOMINAL (+4.0°C margin)"},
                {"factor": "Storage Autonomy Runway", "weight": 0.30, "status": "SAFE (17.0 days buffer)"},
                {"factor": "SWRO Intake Pump Health", "weight": 0.25, "status": "HEALTHY (96.8%)"},
                {"factor": "Wastewater MBR Processing", "weight": 0.10, "status": "COMPLIANT (Zero Discharge)"}
            ]
        }

    pct = round((storage_liters / max_storage_liters) * 100.0, 1)
    days_rem = round(storage_liters / max(10.0, daily_consumption), 1)

    return {
        "station_id": station_id,
        "source_type": source_type,
        "source_description": source_desc,
        "source_status": source_status,
        "source_temp_c": source_temp_c,
        "intake_pipeline_length_m": intake_pipeline_length_m,
        
        # Pump / Intake Subsystem
        "intake_pump": intake_pump,
        "pump_status": intake_pump["status"],
        "production_rate_l_hr": intake_pump["actual_production_l_hr"],
        
        # Treatment Subsystem
        "treatment": treatment_subsystem,
        "water_quality_index": treatment_subsystem["water_quality_index"],
        
        # Storage Subsystem
        "storage_liters": storage_liters,
        "max_storage_liters": max_storage_liters,
        "critical_reserve_liters": critical_reserve_liters,
        "usable_reserve_liters": max(0.0, storage_liters - critical_reserve_liters),
        "percentage": pct,
        "days_remaining": days_rem,
        "inflow_rate_l_hr": intake_pump["actual_production_l_hr"],
        "daily_consumption_l": daily_consumption,
        "hourly_consumption_l": hourly_consumption,
        "net_flow_l_hr": round(intake_pump["actual_production_l_hr"] - hourly_consumption, 1),
        
        # Thermal Pipeline Subsystem
        "thermal_pipeline": thermal_pipeline,
        "pipe_temp_c": thermal_pipeline["pipe_temp_c"],
        "freeze_risk": thermal_pipeline["freeze_risk"],
        "trace_heating_active": thermal_pipeline["trace_heating_active"],
        "trace_heating_draw_kw": thermal_pipeline["trace_heating_draw_kw"],
        
        # Consumption Breakdown
        "consumption_breakdown": consumption_breakdown,
        
        # Wastewater Subsystem
        "wastewater": wastewater_subsystem,
        
        # Water Risk Engine
        "water_risk": water_risk,
        
        # Anomaly State
        "anomaly": {
            "status": "NORMAL",
            "consumption_deviation_pct": 0.0,
            "freeze_warning": False,
            "pump_anomaly": False
        }
    }

def step(state: dict, perturbation: dict = None) -> dict:
    state = copy.deepcopy(state)
    water = dict(state.get("water", {}))
    env = state.get("environment", {})
    personnel = state.get("personnel", {})
    research = state.get("research", {})
    equip = state.get("equipment", {})
    st_id = state.get("station_id", "maitri")
    is_maitri = (st_id == "maitri")

    # 1. Dynamic Water Demand Calculation
    base_headcount = personnel.get("headcount", 25 if is_maitri else 35)
    per_capita_day = 48.0 if is_maitri else 47.1 # L/person/day
    
    # Research lab water draw (ice core processing, autoclave, spectrometers)
    research_draw_day = 120.0 if is_maitri else 190.0
    if research.get("active_experiments_count", 0) > 4:
        research_draw_day *= 1.35
    
    daily_demand = (base_headcount * per_capita_day) + research_draw_day

    # 2. Thermal Physics for Pipeline
    temp = env.get("temperature", -25.0 if is_maitri else -20.0)
    wind = env.get("wind_speed", 28.0 if is_maitri else 22.0)
    
    # Calculate heat loss rate from ambient delta and wind chill
    wind_chill = temp - (wind * 0.25)
    
    pipe_temp = water.get("pipe_temp_c", 3.8 if is_maitri else 4.5)
    trace_active = water.get("trace_heating_active", True)
    trace_draw_kw = 4.2 if is_maitri else 5.8
    
    # Apply Perturbations
    if perturbation:
        p_type = perturbation.get("type", "")
        if p_type == "trace_heating_failure":
            trace_active = False
            trace_draw_kw = 0.0
        elif p_type == "extreme_cold":
            temp -= perturbation.get("drop_c", 16.0)
            wind_chill -= 20.0
            if trace_active:
                trace_draw_kw *= 1.45 # Boost wattage to fight freeze
        elif p_type == "personnel_increase":
            base_headcount += perturbation.get("additional_people", 12)
            daily_demand = (base_headcount * per_capita_day) + research_draw_day
        elif p_type == "water_consumption_spike":
            daily_demand *= 2.5 # Simulated fissure / stuck valve
        elif p_type == "pump_failure" or (p_type == "equipment_failure" and "pump" in perturbation.get("asset_id", "")):
            water["pump_status"] = "TRIPPED"
            water["production_rate_l_hr"] = 0.0

    # Pipeline fluid temperature dynamics
    if trace_active:
        # Thermostat trim keeps pipe in target band [3.5°C, 4.8°C]
        if temp < -30.0:
            pipe_temp = max(1.2, pipe_temp - 0.1)
        else:
            pipe_temp = min(4.8, pipe_temp + 0.05)
    else:
        # Trace heating OFF: rapid heat loss toward freezing
        heat_loss_delta = max(0.4, abs(temp - pipe_temp) * 0.03)
        pipe_temp = max(-5.0, round(pipe_temp - heat_loss_delta, 1))

    freeze_threshold = 0.5
    freeze_margin = round(pipe_temp - freeze_threshold, 1)

    if freeze_margin > 3.0:
        freeze_risk = "Low"
    elif freeze_margin > 1.5:
        freeze_risk = "Moderate"
    elif freeze_margin > 0.0:
        freeze_risk = "High"
    else:
        freeze_risk = "CRITICAL - Pipe Freeze Hazard"

    # 3. Water Production & Pumping Logic
    production_rate = water.get("production_rate_l_hr", 120.0 if is_maitri else 160.0)
    
    # Check equipment domain pump health if available
    pump_asset = next((it for it in equip.get("items", []) if "pump" in it.get("id", "") or "ro" in it.get("id", "")), None)
    if pump_asset:
        if pump_asset.get("status") in ["offline", "failed", "tripped"]:
            production_rate = 0.0
            water["pump_status"] = "OFFLINE"
        elif pump_asset.get("health_score", 100) < 60:
            production_rate *= 0.65
            water["pump_status"] = "DEGRADED"

    # If pipeline freezes or freeze hazard is critical, halt pumping immediately to prevent rupture!
    if freeze_risk == "CRITICAL - Pipe Freeze Hazard":
        production_rate = 0.0
        water["pump_status"] = "HALTED_FREEZE_PROTECT"

    # 4. Storage Volumetric Step
    hourly_consumption = daily_demand / 24.0
    net_flow_hourly = production_rate - hourly_consumption
    
    # Tick scaling (scaled for live twin demonstration)
    tick_net = net_flow_hourly * (5.0 / 3600.0 * 20.0)
    
    curr_storage = max(0.0, round(water.get("storage_liters", 18500.0) + tick_net, 1))
    max_storage = water.get("max_storage_liters", 25000.0 if is_maitri else 35000.0)
    curr_storage = min(max_storage, curr_storage)
    
    pct = round((curr_storage / max_storage) * 100.0, 1)
    days_rem = round(curr_storage / max(10.0, daily_demand), 1)

    # 5. Update Subsystem Structures
    water["storage_liters"] = curr_storage
    water["percentage"] = pct
    water["days_remaining"] = days_rem
    water["daily_consumption_l"] = round(daily_demand, 1)
    water["hourly_consumption_l"] = round(hourly_consumption, 1)
    water["production_rate_l_hr"] = round(production_rate, 1)
    water["inflow_rate_l_hr"] = round(production_rate, 1)
    water["net_flow_l_hr"] = round(net_flow_hourly, 1)
    water["pipe_temp_c"] = round(pipe_temp, 1)
    water["freeze_risk"] = freeze_risk
    water["trace_heating_active"] = trace_active
    water["trace_heating_draw_kw"] = round(trace_draw_kw, 2)

    # Thermal pipeline structure update
    water["thermal_pipeline"] = {
        "pipe_temp_c": round(pipe_temp, 1),
        "freeze_threshold_c": freeze_threshold,
        "freeze_margin_c": freeze_margin,
        "freeze_risk": freeze_risk,
        "trace_heating_active": trace_active,
        "trace_heating_draw_kw": round(trace_draw_kw, 2),
        "heating_mode": "Active Heating" if trace_active else "HEATING_FAULT_OFFLINE",
        "ambient_exposure_temp_c": round(temp, 1),
        "wind_chill_equivalent_c": round(wind_chill, 1),
        "insulation_integrity_pct": 96.0 if is_maitri else 98.5
    }

    # Intake pump structure update
    pump = copy.deepcopy(water.get("intake_pump", {}))
    pump["status"] = water.get("pump_status", "RUNNING")
    pump["actual_production_l_hr"] = round(production_rate, 1)
    pump["power_draw_kw"] = round(2.8 if is_maitri else 5.8, 1) if production_rate > 0 else 0.0
    water["intake_pump"] = pump

    # Consumption breakdown update
    water["consumption_breakdown"] = {
        "headcount": base_headcount,
        "galley_kitchen_l_day": round(daily_demand * 0.27, 1),
        "hygiene_showers_l_day": round(daily_demand * 0.35, 1),
        "science_labs_l_day": round(research_draw_day, 1),
        "domestic_habitat_l_day": round(daily_demand * 0.25, 1),
        "total_daily_l": round(daily_demand, 1)
    }

    # Wastewater update
    gen_waste = round(daily_demand * 0.90, 1)
    water["wastewater"] = {
        "generated_daily_l": gen_waste,
        "greywater_recycled_l": round(gen_waste * 0.33, 1),
        "blackwater_to_stp_l": round(gen_waste * 0.67, 1),
        "stp_status": "AEROBIC_DIGESTION_OK" if is_maitri else "MBR_ULTRAFILTRATION_OK",
        "effluent_quality_compliant": True
    }

    # Water risk score update
    risk_score = 10.0
    if freeze_risk == "CRITICAL - Pipe Freeze Hazard":
        risk_score += 65.0
    elif freeze_risk == "High":
        risk_score += 35.0
    elif freeze_risk == "Moderate":
        risk_score += 15.0

    if days_rem < 5.0:
        risk_score += 40.0
    elif days_rem < 10.0:
        risk_score += 20.0

    if production_rate == 0.0:
        risk_score += 25.0

    risk_score = min(100.0, round(risk_score, 1))
    risk_level = "CRITICAL" if risk_score > 75 else ("HIGH" if risk_score > 50 else ("MEDIUM" if risk_score > 25 else "LOW"))

    water["water_risk"] = {
        "score": risk_score,
        "level": risk_level,
        "contributing_factors": [
            {"factor": "Pipeline Freeze Margin", "weight": 0.35, "status": f"{freeze_risk} ({freeze_margin}°C margin)"},
            {"factor": "Storage Autonomy Runway", "weight": 0.30, "status": f"{days_rem} days autonomy"},
            {"factor": "Intake Pump Health", "weight": 0.25, "status": f"{water['pump_status']} ({round(production_rate)} L/hr)"},
            {"factor": "Wastewater Processing", "weight": 0.10, "status": "COMPLIANT"}
        ]
    }

    # Anomaly detection
    expected_daily = (25 * 48.0 + 120.0) if is_maitri else (35 * 47.1 + 190.0)
    dev_pct = round(((daily_demand - expected_daily) / max(1.0, expected_daily)) * 100.0, 1)
    
    anomaly_status = "CRITICAL" if (freeze_risk == "CRITICAL - Pipe Freeze Hazard" or abs(dev_pct) > 50) else ("WARNING" if abs(dev_pct) > 20 else "NORMAL")
    water["anomaly"] = {
        "status": anomaly_status,
        "consumption_deviation_pct": dev_pct,
        "freeze_warning": (freeze_risk in ["High", "CRITICAL - Pipe Freeze Hazard"]),
        "pump_anomaly": (production_rate == 0.0 and water["pump_status"] != "RUNNING")
    }

    state["water"] = water
    return state
