def init_water_state(station_id: str) -> dict:
    if station_id == "maitri":
        # Zub Lake pump house (freshwater lake, 1.2 km distant pipe)
        return {
            "source_type": "Lake-Water Pump House (Zub Lake)",
            "storage_liters": 18500.0,
            "max_storage_liters": 25000.0,
            "daily_consumption_l": 1450.0,
            "pump_status": "Running",
            "trace_heating_active": True,
            "pipe_temp_c": 3.8,
            "freeze_risk": "Low",
            "production_rate_l_hr": 120.0,
            "water_quality_index": 96.5 # Pristine glacier melt
        }
    else:
        # Bharati: Seawater pump house (Quilty Bay, Larsemann Hills) + Reverse Osmosis Desalination
        return {
            "source_type": "Seawater Pump House & RO Desalination (Quilty Bay)",
            "storage_liters": 28000.0,
            "max_storage_liters": 35000.0,
            "daily_consumption_l": 1950.0,
            "pump_status": "Running",
            "trace_heating_active": True,
            "pipe_temp_c": 4.5,
            "freeze_risk": "Low",
            "production_rate_l_hr": 160.0,
            "water_quality_index": 98.2 # Multi-stage RO filtered
        }

def step(state: dict, perturbation: dict = None) -> dict:
    water = dict(state.get("water", {}))
    env = state.get("environment", {})
    personnel = state.get("personnel", {})
    st_id = state.get("station_id", "maitri")

    headcount = personnel.get("headcount", 25)
    per_capita = 58.0 if st_id == "bharati" else 52.0 # Liters per person per day
    daily_demand = headcount * per_capita

    # Check freeze risk based on temperature and wind
    temp = env.get("temperature", -25.0)
    if temp < -35.0 or (temp < -25.0 and env.get("wind_speed", 30.0) > 60.0):
        water["freeze_risk"] = "High"
        water["pipe_temp_c"] = round(max(0.2, water["pipe_temp_c"] - 0.2), 1)
        if water["pipe_temp_c"] <= 0.5:
            water["freeze_risk"] = "CRITICAL - Pipe Freeze Hazard"
    else:
        water["freeze_risk"] = "Low"
        water["pipe_temp_c"] = round(min(5.0, water["pipe_temp_c"] + 0.1), 1)

    # Water usage tick
    consumption_tick = (daily_demand / 86400.0) * 100.0
    if perturbation and perturbation.get("type") == "water_consumption_spike":
        consumption_tick *= 2.5

    production_tick = (water["production_rate_l_hr"] / 3600.0) * 100.0
    if water["freeze_risk"] == "CRITICAL - Pipe Freeze Hazard":
        production_tick = 0.0 # Pumping halted to prevent line burst

    net_change = production_tick - consumption_tick
    water["storage_liters"] = min(
        water["max_storage_liters"],
        max(100.0, round(water["storage_liters"] + net_change, 1))
    )
    water["percentage"] = round((water["storage_liters"] / water["max_storage_liters"]) * 100.0, 1)
    water["days_remaining"] = round(water["storage_liters"] / max(10.0, daily_demand), 1)

    state["water"] = water
    return state
