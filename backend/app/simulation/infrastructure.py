def init_infrastructure_state(station_id: str) -> dict:
    if station_id == "maitri":
        return {
            "modules": [
                {"id": "main_block", "name": "Main Station Block", "integrity": 94.0, "temp_c": 19.2},
                {"id": "zub_pump_house", "name": "Zub Lake Pump Station", "integrity": 89.0, "temp_c": 8.5},
                {"id": "fuel_farm", "name": "Maitri Fuel Depot", "integrity": 96.0, "temp_c": -12.0},
                {"id": "tech_workshop", "name": "Technical Workshop", "integrity": 91.0, "temp_c": 16.5}
            ],
            "structural_stress_index": 18.0, # 0-100
            "thermal_insulation_eff": 88.0,
            "snow_drift_accumulation_m": 0.42
        }
    else:
        return {
            "modules": [
                {"id": "main_complex", "name": "Modular Living & Lab Complex", "integrity": 98.0, "temp_c": 20.5},
                {"id": "coastal_pump_house", "name": "Quilty Bay Seawater Intake", "integrity": 94.0, "temp_c": 9.2},
                {"id": "chp_farm", "name": "CHP Power & Automated Fuel Plant", "integrity": 97.0, "temp_c": 18.0},
                {"id": "helipad", "name": "Helipad & Logistics Apron", "integrity": 95.0, "temp_c": -16.0}
            ],
            "structural_stress_index": 12.0,
            "thermal_insulation_eff": 96.0,
            "snow_drift_accumulation_m": 0.25
        }

def step(state: dict, perturbation: dict = None) -> dict:
    infra = dict(state.get("infrastructure", {}))
    env = state.get("environment", {})
    wind = env.get("wind_speed", 30.0)

    # Base wind stress calculation (0-100)
    stress = min(100.0, max(5.0, round((wind / 120.0) * 100.0, 1)))
    thermal_eff = infra.get("thermal_insulation_eff", 88.0)
    snow_drift = infra.get("snow_drift_accumulation_m", 0.42)

    if env.get("blizzard_active", False):
        snow_drift = round(snow_drift + 0.02, 2)
    else:
        snow_drift = max(0.1, round(snow_drift - 0.005, 2))

    # Apply What-If Perturbations
    if perturbation:
        p_type = perturbation.get("type", "")
        if p_type in ["blizzard_stress", "storm", "severe_storm"]:
            stress = min(98.0, max(stress, 82.0 + (wind * 0.12)))
            snow_drift = round(snow_drift + 1.25, 2)
        elif p_type == "thermal_loss":
            thermal_eff = max(40.0, thermal_eff - 36.0)
            stress = min(100.0, stress + 18.0)
        elif p_type == "snow_drift":
            snow_drift = round(snow_drift + 2.15, 2)
            stress = min(100.0, stress + 24.0)
        elif p_type == "foundation_shift":
            stress = min(100.0, stress + 32.0)
        elif p_type == "power_outage":
            thermal_eff = max(35.0, thermal_eff - 42.0)

    infra["structural_stress_index"] = round(stress, 1)
    infra["thermal_insulation_eff"] = round(thermal_eff, 1)
    infra["snow_drift_accumulation_m"] = round(snow_drift, 2)

    state["infrastructure"] = infra
    return state

