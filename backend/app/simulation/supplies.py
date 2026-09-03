def init_supplies_state(station_id: str) -> dict:
    headcount = 25 if station_id == "maitri" else 30
    return {
        "rations_stock_days": 185.0,
        "frozen_food_kg": 4200.0,
        "dry_rations_kg": 6800.0,
        "freezer_temp_c": -21.4,
        "perishable_health": "Optimal",
        "daily_depletion_kg": headcount * 2.2,
        "emergency_iron_ration_packs": 150,
        "stock_status": "Adequate (9+ Months Margin)"
    }

def step(state: dict, perturbation: dict = None) -> dict:
    supplies = dict(state.get("supplies", {}))
    personnel = state.get("personnel", {})
    energy = state.get("energy", {})

    headcount = personnel.get("headcount", 25)
    daily_consumption = headcount * 2.2
    supplies["daily_depletion_kg"] = round(daily_consumption, 1)

    # Check freezer temperature depending on energy status
    if energy.get("status", "") == "High Demand Peak - Discharging Battery":
        supplies["freezer_temp_c"] = round(supplies["freezer_temp_c"] + 0.05, 1)
    else:
        supplies["freezer_temp_c"] = round(max(-22.0, min(-19.0, supplies["freezer_temp_c"] - 0.02)), 1)

    if supplies["freezer_temp_c"] > -12.0:
        supplies["perishable_health"] = "Warning: Freezer Temp Rising"
    else:
        supplies["perishable_health"] = "Optimal"

    state["supplies"] = supplies
    return state
