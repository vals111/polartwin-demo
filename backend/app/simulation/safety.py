def init_safety_state(station_id: str) -> dict:
    return {
        "fire_suppression_status": "Armed & Ready",
        "lockdown_level": "Level 0 (Normal)",
        "freeze_out_hazard_index": 12.0, # 0-100
        "life_support_redundancy": "Triple Redundant (N+2)",
        "safety_score": 96.0, # 0-100
        "active_incidents": []
    }

def step(state: dict, perturbation: dict = None) -> dict:
    safe = dict(state.get("safety", {}))
    env = state.get("environment", {})
    equip = state.get("equipment", {})
    water = state.get("water", {})

    wind = env.get("wind_speed", 30.0)
    temp = env.get("temperature", -25.0)

    # Calculate freeze-out hazard
    freeze_hazard = max(5.0, min(95.0, abs(temp) * 1.5 + (wind / 3.0)))
    safe["freeze_out_hazard_index"] = round(freeze_hazard, 1)

    incidents = []
    if env.get("blizzard_active", False):
        safe["lockdown_level"] = "Level 2 (Station Habitat Lockdown)"
        incidents.append("Severe Blizzard: Outdoor Transit Prohibited")
    elif wind > 55.0:
        safe["lockdown_level"] = "Level 1 (Buddy System & Tethers Required)"
    else:
        safe["lockdown_level"] = "Level 0 (Normal)"

    if water.get("freeze_risk") == "CRITICAL - Pipe Freeze Hazard":
        incidents.append("Critical Freeze Alert on Main Water Extraction Pipeline")

    safe["active_incidents"] = incidents
    # Safety score
    penalty = len(incidents) * 15.0 + (freeze_hazard * 0.15)
    safe["safety_score"] = max(20.0, round(100.0 - penalty, 1))

    state["safety"] = safe
    return state
