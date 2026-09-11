"""
Fuel Storage & Burn Management Simulation Module for POLARTWIN
Implements the core Antarctic Digital Twin lifecycle:
Environment → Energy Demand → Generator Operation → Fuel Consumption → Fuel Reserve → Depletion Forecast → Resupply Requirement → Logistics Risk → Station Risk

Formulas implemented:
- Fuel(t+1) = Fuel(t) - FuelConsumption(t) + FuelResupply(t)
- GeneratorLoad = max(0, TotalDemand - SolarGeneration)
- FuelConsumption = GeneratorLoad * FuelBurnRate + AuxiliaryBoilerBurn
- UsableReserve = max(0, CurrentLevel - (TotalCapacity * 0.05)) [5% unpumpable dead bottom]
- DaysRemaining = UsableReserve / ExpectedDailyConsumption
- Reserve Zones: Normal (>50%), Watch (30-50%), High (15-30%), Critical (<15%)
"""
import copy
from typing import Dict, Any, List

def init_fuel_state(station_id: str) -> dict:
    is_maitri = (station_id == "maitri")
    
    if is_maitri:
        # Maitri: 180,000 Liters total capacity, Inland Schirmacher Oasis
        total_capacity = 180000.0
        current_level = 138000.0
        burn_rate_kwh = 0.26 # L per kWh
        base_hourly_burn = 17.5 # L/hr
        fuel_temp = -4.2 # Fuel farm heating trace
        resupply_eta = 88 # days until overland convoy window
        storage_arch = "Manual Bunded Tanks (6 Units)"
        fuel_grade = "Antarctic Gas Oil (AGO -50°C Pour Point)"
        
        tanks = [
            {
                "id": "tank_m01",
                "name": "Bulk Tank #1 (AGO North)",
                "capacity_l": 32000.0,
                "current_level_l": 25600.0,
                "level_pct": 80.0,
                "temperature_c": -3.8,
                "status": "ONLINE",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 850,
                "health_pct": 97.5,
                "location": "North Bund Field #1"
            },
            {
                "id": "tank_m02",
                "name": "Bulk Tank #2 (AGO North-East)",
                "capacity_l": 32000.0,
                "current_level_l": 24320.0,
                "level_pct": 76.0,
                "temperature_c": -4.1,
                "status": "TRANSFERRING",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 850,
                "health_pct": 96.0,
                "location": "North Bund Field #2"
            },
            {
                "id": "tank_m03",
                "name": "Bulk Tank #3 (AGO East)",
                "capacity_l": 30000.0,
                "current_level_l": 23100.0,
                "level_pct": 77.0,
                "temperature_c": -4.5,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 800,
                "health_pct": 95.2,
                "location": "East Bund Field #1"
            },
            {
                "id": "tank_m04",
                "name": "Bulk Tank #4 (AGO South-East)",
                "capacity_l": 30000.0,
                "current_level_l": 22800.0,
                "level_pct": 76.0,
                "temperature_c": -4.2,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 800,
                "health_pct": 94.8,
                "location": "East Bund Field #2"
            },
            {
                "id": "tank_m05",
                "name": "Bulk Tank #5 (AGO South)",
                "capacity_l": 28000.0,
                "current_level_l": 21280.0,
                "level_pct": 76.0,
                "temperature_c": -4.8,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 750,
                "health_pct": 98.1,
                "location": "South Reserve Bund"
            },
            {
                "id": "tank_m06",
                "name": "Bulk Tank #6 (AGO Reserve)",
                "capacity_l": 28000.0,
                "current_level_l": 20900.0,
                "level_pct": 74.6,
                "temperature_c": -4.0,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 750,
                "health_pct": 95.5,
                "location": "South Reserve Bund"
            }
        ]
        
        transfer_loop = {
            "pump_status": "RUNNING",
            "flow_rate_l_min": 4.8,
            "active_source_tank": "tank_m02",
            "source_tank_name": "Bulk Tank #2 (AGO North-East)",
            "destination": "Generator Day Tank #1 (4,000 L)",
            "day_tank_level_pct": 86.4,
            "line_pressure_bar": 2.8,
            "suction_temp_c": -4.2,
            "preheater_active": True,
            "preheater_status": "OK"
        }
        
        drivers = {
            "generator_load_kw": 67.0,
            "generator_burn_l_hr": 17.4,
            "heating_demand_kw": 32.0,
            "heating_burn_equiv_l_hr": 8.3,
            "science_load_kw": 12.0,
            "science_burn_equiv_l_hr": 3.1,
            "base_station_load_kw": 35.0,
            "solar_offset_kw": 18.0,
            "solar_fuel_saved_l_hr": 4.7,
            "auxiliary_boiler_l_hr": 2.7,
            "total_consumption_l_hr": 20.1,
            "electrical_yield_kwh_per_l": 3.88
        }
        
        recommendations = [
            {
                "action": "Engage Solar PV Prioritization",
                "explanation": "Shift peak water heating and battery charging to daylight hours to save ~4.7 L/hr.",
                "priority": "HIGH",
                "days_gained": 12
            },
            {
                "action": "Throttle Auxiliary Research Heating by 1.5°C",
                "explanation": "Reduces non-essential laboratory thermal load while keeping instruments within calibration.",
                "priority": "MEDIUM",
                "days_gained": 8
            },
            {
                "action": "Pre-heat Secondary Generator Manifold",
                "explanation": "Ensures cold-start fuel viscosity meets pour point specifications before load shift.",
                "priority": "LOW",
                "days_gained": 0
            }
        ]

    else:
        # Bharati: 300,000 Liters (~3 lakh litres), Coastal Larsemann Hills
        total_capacity = 300000.0
        current_level = 245000.0
        burn_rate_kwh = 0.26 # L per kWh
        base_hourly_burn = 21.8 # L/hr
        fuel_temp = 2.1 # Automated CHP loop heating trace
        resupply_eta = 102 # days until maritime icebreaker arrival
        storage_arch = "SCADA Containerized Matrix (8 Units)"
        fuel_grade = "Low-Sulfur Polar Gas Oil (CHP-Grade Aviation/AGO Blend)"
        
        tanks = [
            {
                "id": "tank_b01",
                "name": "Coastal Tank #1 (Larsemann North)",
                "capacity_l": 37500.0,
                "current_level_l": 31875.0,
                "level_pct": 85.0,
                "temperature_c": 2.4,
                "status": "ONLINE",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 920,
                "health_pct": 99.1,
                "location": "Larsemann Coastal Pod A"
            },
            {
                "id": "tank_b02",
                "name": "Coastal Tank #2 (Larsemann North)",
                "capacity_l": 37500.0,
                "current_level_l": 31125.0,
                "level_pct": 83.0,
                "temperature_c": 2.2,
                "status": "TRANSFERRING",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 920,
                "health_pct": 98.4,
                "location": "Larsemann Coastal Pod A"
            },
            {
                "id": "tank_b03",
                "name": "Coastal Tank #3 (Central Matrix)",
                "capacity_l": 37500.0,
                "current_level_l": 30750.0,
                "level_pct": 82.0,
                "temperature_c": 2.0,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 900,
                "health_pct": 97.2,
                "location": "Central Matrix Vault"
            },
            {
                "id": "tank_b04",
                "name": "Coastal Tank #4 (Central Matrix)",
                "capacity_l": 37500.0,
                "current_level_l": 30375.0,
                "level_pct": 81.0,
                "temperature_c": 2.1,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 900,
                "health_pct": 98.0,
                "location": "Central Matrix Vault"
            },
            {
                "id": "tank_b05",
                "name": "Coastal Tank #5 (South Bay)",
                "capacity_l": 37500.0,
                "current_level_l": 30000.0,
                "level_pct": 80.0,
                "temperature_c": 1.9,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 900,
                "health_pct": 96.5,
                "location": "South Bay Complex"
            },
            {
                "id": "tank_b06",
                "name": "Coastal Tank #6 (South Bay)",
                "capacity_l": 37500.0,
                "current_level_l": 30375.0,
                "level_pct": 81.0,
                "temperature_c": 2.2,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 900,
                "health_pct": 99.0,
                "location": "South Bay Complex"
            },
            {
                "id": "tank_b07",
                "name": "Coastal Tank #7 (Deep Winter Reserve)",
                "capacity_l": 37500.0,
                "current_level_l": 30750.0,
                "level_pct": 82.0,
                "temperature_c": 2.3,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 920,
                "health_pct": 98.3,
                "location": "Deep Winter Vault"
            },
            {
                "id": "tank_b08",
                "name": "Coastal Tank #8 (CHP Return Sump)",
                "capacity_l": 37500.0,
                "current_level_l": 29750.0,
                "level_pct": 79.3,
                "temperature_c": 2.5,
                "status": "STANDBY",
                "leak_detected": False,
                "trace_heating_active": True,
                "trace_heating_w": 920,
                "health_pct": 97.8,
                "location": "CHP Return Loop Sump"
            }
        ]
        
        transfer_loop = {
            "pump_status": "RUNNING",
            "flow_rate_l_min": 6.2,
            "active_source_tank": "tank_b02",
            "source_tank_name": "Coastal Tank #2 (Larsemann North)",
            "destination": "Combined Heat & Power Header Day Tank (6,000 L)",
            "day_tank_level_pct": 91.2,
            "line_pressure_bar": 3.2,
            "suction_temp_c": 2.1,
            "preheater_active": True,
            "preheater_status": "OPTIMAL"
        }
        
        drivers = {
            "generator_load_kw": 84.0,
            "generator_burn_l_hr": 21.8,
            "heating_demand_kw": 38.0,
            "heating_burn_equiv_l_hr": 9.9,
            "science_load_kw": 18.0,
            "science_burn_equiv_l_hr": 4.7,
            "base_station_load_kw": 45.0,
            "solar_offset_kw": 26.0,
            "solar_fuel_saved_l_hr": 6.8,
            "auxiliary_boiler_l_hr": 3.2,
            "total_consumption_l_hr": 25.0,
            "electrical_yield_kwh_per_l": 4.12
        }
        
        recommendations = [
            {
                "action": "Boost Waste Heat Extraction in CHP Loop",
                "explanation": "Max out glycol heat recovery to cut secondary auxiliary boiler diesel consumption by 3.2 L/hr.",
                "priority": "HIGH",
                "days_gained": 16
            },
            {
                "action": "Coordinate Coastal Satellite Uplink Power Profiling",
                "explanation": "Stagger high-power radar telemetry bursts outside peak station demand hours.",
                "priority": "MEDIUM",
                "days_gained": 6
            },
            {
                "action": "Verify Double-Wall Vacuum Barrier on Tanks #3-#6",
                "explanation": "Automated pressure transducer check confirms zero interstitial leakage.",
                "priority": "LOW",
                "days_gained": 0
            }
        ]

    # Calculate Usable Reserve and Days Remaining
    pct = round((current_level / total_capacity) * 100.0, 1)
    usable_reserve = max(0.0, current_level - (total_capacity * 0.05)) # 5% dead bottom
    expected_daily = base_hourly_burn * 24.0
    days_rem = round(usable_reserve / max(1.0, expected_daily), 1)
    bridging_gap = round(days_rem - resupply_eta, 1)

    # Zone calculation
    if pct > 50.0:
        reserve_zone = "Normal"
    elif pct > 30.0:
        reserve_zone = "Watch"
    elif pct > 15.0:
        reserve_zone = "High"
    else:
        reserve_zone = "Critical"

    return {
        "station_id": station_id,
        "total_capacity": total_capacity,
        "current_level": current_level,
        "fuel_percentage": pct,
        "consumption_rate_l_per_hr": base_hourly_burn,
        "burn_rate_l_per_kwh": burn_rate_kwh,
        "days_remaining": days_rem,
        "reserve_zone": reserve_zone,
        "resupply_eta_days": resupply_eta,
        "fuel_temperature": fuel_temp,
        "fuel_leak_detected": False,
        "storage_architecture": storage_arch,
        "fuel_grade": fuel_grade,
        
        # Physical Fuel Farm Asset Telemetry
        "tanks": tanks,
        "total_tanks": len(tanks),
        "active_tanks_count": len([t for t in tanks if t["status"] in ["ONLINE", "TRANSFERRING"]]),
        
        # Active Fuel Transfer Loop
        "transfer_loop": transfer_loop,
        
        # Consumption Drivers Breakdown
        "drivers": drivers,
        
        # Runway Metrics
        "runway": {
            "usable_liters": usable_reserve,
            "dead_bottom_buffer_liters": total_capacity * 0.05,
            "buffer_30pct_liters": total_capacity * 0.30,
            "critical_15pct_liters": total_capacity * 0.15,
            "daily_consumption_l": round(expected_daily, 1),
            "days_to_empty": round(current_level / max(1.0, expected_daily), 1),
            "days_to_buffer_30pct": round(max(0.0, current_level - (total_capacity * 0.30)) / max(1.0, expected_daily), 1),
            "days_to_critical_15pct": round(max(0.0, current_level - (total_capacity * 0.15)) / max(1.0, expected_daily), 1),
            "safe_runway_days": days_rem,
            "projected_critical_date": "2026-11-18" if is_maitri else "2026-12-04"
        },
        
        # Resupply & Bridging Protocol
        "resupply": {
            "resupply_eta_days": resupply_eta,
            "safe_runway_days": days_rem,
            "bridging_gap_days": bridging_gap,
            "status": "ON_SCHEDULE" if bridging_gap >= 0 else "CRITICAL_GAP",
            "logistics_risk": "LOW" if bridging_gap > 30 else ("MEDIUM" if bridging_gap >= 0 else "HIGH"),
            "recommendations": recommendations
        },
        
        # Anomaly Detection Telemetry
        "anomaly": {
            "expected_burn_rate_l_hr": round(base_hourly_burn * 1.02, 1),
            "deviation_pct": 0.0,
            "status": "NORMAL",
            "fuel_leak_detected": False,
            "trace_heating_fault": False
        }
    }

def step(state: dict, perturbation: dict = None) -> dict:
    state = copy.deepcopy(state)
    fuel = dict(state.get("fuel", {}))
    energy = state.get("energy", {})
    env = state.get("environment", {})
    station_id = state.get("station_id", "maitri")
    is_maitri = (station_id == "maitri")

    # 1. Compute Causal Generator Burn from Energy Domain
    # Formula: GeneratorLoad = TotalDemand - SolarGeneration clamped at zero
    gen_load_kw = energy.get("generator_load", 67.0 if is_maitri else 84.0)
    burn_rate_kwh = fuel.get("burn_rate_l_per_kwh", 0.26)
    
    # Consumption per hour for generator
    generator_consumption = gen_load_kw * burn_rate_kwh
    
    # Auxiliary consumption (snow-melt heating, waste incinerator pilot, trace heat)
    temp = env.get("temperature", -22.4 if is_maitri else -19.6)
    auxiliary_burn = 2.7 if is_maitri else 3.2
    if temp < -30.0:
        auxiliary_burn += abs(temp + 30.0) * 0.08
    
    total_hourly_consumption = generator_consumption + auxiliary_burn

    # 2. Apply Perturbations
    resupply_delay_days = 0
    leak_detected = False
    
    if perturbation:
        p_type = perturbation.get("type", "")
        if p_type == "storm":
            total_hourly_consumption *= 1.35 # Cold and dark surges heating
        elif p_type == "extreme_cold":
            total_hourly_consumption *= 1.25 # Cold surges trace heating & fuel preheaters
        elif p_type == "fuel_leak":
            total_hourly_consumption *= 2.5 # Sudden volumetric drop
            leak_detected = True
        elif p_type == "generator_failure":
            total_hourly_consumption *= 1.15 # Secondary generator less optimal point
        elif p_type == "solar_drop":
            total_hourly_consumption *= 1.12 # Lost solar offset shifts to generator
        elif p_type == "resupply_delay":
            resupply_delay_days = perturbation.get("days", 20)

    fuel["consumption_rate_l_per_hr"] = round(total_hourly_consumption, 2)
    fuel["fuel_leak_detected"] = leak_detected

    # 3. Time Step Burn Increment (scaled for live twin demonstration)
    tick_burn = total_hourly_consumption * (5.0 / 3600.0 * 20.0)
    fuel["current_level"] = max(0.0, round(fuel.get("current_level", 138000.0) - tick_burn, 1))
    
    total_cap = fuel.get("total_capacity", 180000.0 if is_maitri else 300000.0)
    pct = round((fuel["current_level"] / total_cap) * 100.0, 1)
    fuel["fuel_percentage"] = pct

    # 4. Usable Reserve & Days Remaining
    expected_daily = total_hourly_consumption * 24.0
    usable = max(0.0, fuel["current_level"] - (total_cap * 0.05))
    days_rem = round(usable / max(1.0, expected_daily), 1)
    fuel["days_remaining"] = days_rem

    # Update Resupply ETA
    base_resupply_eta = fuel.get("resupply", {}).get("resupply_eta_days", 88 if is_maitri else 102)
    current_resupply_eta = base_resupply_eta + resupply_delay_days
    fuel["resupply_eta_days"] = current_resupply_eta
    bridging_gap = round(days_rem - current_resupply_eta, 1)

    # 5. Determine Reserve Zone
    if pct > 50.0:
        fuel["reserve_zone"] = "Normal"
    elif pct > 30.0:
        fuel["reserve_zone"] = "Watch"
    elif pct > 15.0:
        fuel["reserve_zone"] = "High"
    else:
        fuel["reserve_zone"] = "Critical"

    # 6. Update Individual Tank Levels Causally
    tanks = copy.deepcopy(fuel.get("tanks", []))
    if tanks:
        # Find active transferring tank and drain from it first
        active_tank = next((t for t in tanks if t["status"] == "TRANSFERRING"), tanks[0])
        active_tank["current_level_l"] = max(500.0, round(active_tank["current_level_l"] - tick_burn, 1))
        active_tank["level_pct"] = round((active_tank["current_level_l"] / active_tank["capacity_l"]) * 100.0, 1)
        active_tank["leak_detected"] = leak_detected
        
        # Temperature fluctuates slightly around setpoint
        trace_target = -4.2 if is_maitri else 2.1
        active_tank["temperature_c"] = round(trace_target + (0.1 if temp > -20 else -0.2), 1)
        
        fuel["tanks"] = tanks
        fuel["active_tanks_count"] = len([t for t in tanks if t["status"] in ["ONLINE", "TRANSFERRING"]])

    # 7. Update Consumption Drivers
    solar_offset = energy.get("solar_output", 18.0 if is_maitri else 26.0)
    solar_saved = round(solar_offset * burn_rate_kwh, 2)
    
    fuel["drivers"] = {
        "generator_load_kw": gen_load_kw,
        "generator_burn_l_hr": round(generator_consumption, 2),
        "heating_demand_kw": energy.get("heating_load", 32.0 if is_maitri else 38.0),
        "heating_burn_equiv_l_hr": round(energy.get("heating_load", 32.0) * burn_rate_kwh, 2),
        "science_load_kw": energy.get("research_load", 12.0 if is_maitri else 18.0),
        "science_burn_equiv_l_hr": round(energy.get("research_load", 12.0) * burn_rate_kwh, 2),
        "base_station_load_kw": energy.get("base_load", 35.0 if is_maitri else 45.0),
        "solar_offset_kw": solar_offset,
        "solar_fuel_saved_l_hr": solar_saved,
        "auxiliary_boiler_l_hr": round(auxiliary_burn, 2),
        "total_consumption_l_hr": round(total_hourly_consumption, 2),
        "electrical_yield_kwh_per_l": 3.88 if is_maitri else 4.12
    }

    # 8. Update Runway Structure
    fuel["runway"] = {
        "usable_liters": round(usable, 1),
        "dead_bottom_buffer_liters": total_cap * 0.05,
        "buffer_30pct_liters": total_cap * 0.30,
        "critical_15pct_liters": total_cap * 0.15,
        "daily_consumption_l": round(expected_daily, 1),
        "days_to_empty": round(fuel["current_level"] / max(1.0, expected_daily), 1),
        "days_to_buffer_30pct": round(max(0.0, fuel["current_level"] - (total_cap * 0.30)) / max(1.0, expected_daily), 1),
        "days_to_critical_15pct": round(max(0.0, fuel["current_level"] - (total_cap * 0.15)) / max(1.0, expected_daily), 1),
        "safe_runway_days": days_rem,
        "projected_critical_date": "2026-11-18" if is_maitri else "2026-12-04"
    }

    # 9. Update Resupply Structure
    logistics_risk = "LOW" if bridging_gap > 30 else ("MEDIUM" if bridging_gap >= 0 else ("CRITICAL" if bridging_gap < -30 else "HIGH"))
    fuel["resupply"] = {
        "resupply_eta_days": current_resupply_eta,
        "safe_runway_days": days_rem,
        "bridging_gap_days": bridging_gap,
        "status": "ON_SCHEDULE" if bridging_gap >= 0 else "CRITICAL_GAP",
        "logistics_risk": logistics_risk,
        "recommendations": fuel.get("resupply", {}).get("recommendations", [])
    }

    # 10. Update Anomaly Structure
    expected_burn = round((gen_load_kw * burn_rate_kwh) + auxiliary_burn, 2)
    dev_pct = round(((total_hourly_consumption - expected_burn) / max(0.1, expected_burn)) * 100.0, 1)
    
    anomaly_status = "CRITICAL" if leak_detected else ("WARNING" if abs(dev_pct) > 15.0 else "NORMAL")
    fuel["anomaly"] = {
        "expected_burn_rate_l_hr": expected_burn,
        "deviation_pct": dev_pct,
        "status": anomaly_status,
        "fuel_leak_detected": leak_detected,
        "trace_heating_fault": temp < -35.0 and fuel.get("fuel_temperature", -4.2) < -12.0
    }

    state["fuel"] = fuel
    return state
