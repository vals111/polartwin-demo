def init_fuel_state(station_id: str) -> dict:
    if station_id == "maitri":
        total_capacity = 180000.0 # Liters
        current_level = 138000.0
    else:
        # Bharati: ~3 lakh litres per documented research
        total_capacity = 300000.0
        current_level = 245000.0

    burn_rate = 0.26 # L per kWh
    avg_daily_burn = 420.0 # L / day
    days_rem = (current_level - (total_capacity * 0.05)) / avg_daily_burn

    return {
        "total_capacity": total_capacity,
        "current_level": current_level,
        "fuel_percentage": round((current_level / total_capacity) * 100.0, 1),
        "consumption_rate_l_per_hr": 17.5,
        "burn_rate_l_per_kwh": burn_rate,
        "days_remaining": round(days_rem, 1),
        "reserve_zone": "Normal",
        "resupply_eta_days": 115,
        "fuel_temperature": -8.5, # Fuel farm heating trace
        "fuel_leak_detected": False
    }

def step(state: dict, perturbation: dict = None) -> dict:
    fuel = dict(state.get("fuel", {}))
    energy = state.get("energy", {})
    gen_load_kw = energy.get("generator_load", 70.0)
    burn_rate = fuel.get("burn_rate_l_per_kwh", 0.26)
    
    # Consumption per hour
    hourly_consumption = gen_load_kw * burn_rate
    fuel["consumption_rate_l_per_hr"] = round(hourly_consumption, 2)

    # In each simulation tick (e.g. represents a simulated increment):
    # Tick burns a realistic proportion, say equivalent to ~0.8 - 1.5 liters
    tick_burn = hourly_consumption * (5.0 / 3600.0 * 20.0) # slightly accelerated for live twin demonstration
    if perturbation and perturbation.get("type") == "storm":
        tick_burn *= 1.35 # cold and no solar burns significantly more fuel

    fuel["current_level"] = max(0.0, round(fuel["current_level"] - tick_burn, 1))
    total_cap = fuel["total_capacity"]
    pct = round((fuel["current_level"] / total_cap) * 100.0, 1)
    fuel["fuel_percentage"] = pct

    # Days remaining formula: usable reserve / expected daily consumption
    expected_daily = hourly_consumption * 24.0
    usable = max(0.0, fuel["current_level"] - (total_cap * 0.05))
    days_rem = usable / max(1.0, expected_daily)
    fuel["days_remaining"] = round(days_rem, 1)

    # Determine Zone
    if pct > 50.0:
        fuel["reserve_zone"] = "Normal"
    elif pct > 30.0:
        fuel["reserve_zone"] = "Watch"
    elif pct > 15.0:
        fuel["reserve_zone"] = "High"
    else:
        fuel["reserve_zone"] = "Critical"

    state["fuel"] = fuel
    return state
