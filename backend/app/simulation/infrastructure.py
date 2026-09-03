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

    # Wind stress
    stress = min(100.0, max(5.0, round((wind / 120.0) * 100.0, 1)))
    infra["structural_stress_index"] = stress

    if env.get("blizzard_active", False):
        infra["snow_drift_accumulation_m"] = round(infra.get("snow_drift_accumulation_m", 0.3) + 0.02, 2)
    else:
        infra["snow_drift_accumulation_m"] = max(0.1, round(infra.get("snow_drift_accumulation_m", 0.3) - 0.005, 2))

    state["infrastructure"] = infra
    return state
