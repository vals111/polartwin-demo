def init_station_ops_state(station_id: str) -> dict:
    return {
        "overall_readiness": 92.5, # 0 - 100%
        "status_band": "Nominal",
        "domain_readiness": {
            "energy": 94.0,
            "fuel": 96.0,
            "water": 92.0,
            "waste": 90.0,
            "supplies": 95.0,
            "infrastructure": 93.0,
            "equipment": 93.5,
            "logistics": 88.0,
            "environment": 85.0,
            "communication": 98.0,
            "personnel": 100.0,
            "research": 95.0,
            "safety": 96.0,
            "maintenance": 90.0,
            "inventory": 94.0
        },
        "active_mission_day": 248,
        "expedition_number": "45th Indian Scientific Expedition to Antarctica (ISEA)"
    }

def step(state: dict, perturbation: dict = None) -> dict:
    ops = dict(state.get("station_ops", {}))
    fuel = state.get("fuel", {})
    energy = state.get("energy", {})
    water = state.get("water", {})
    equipment = state.get("equipment", {})
    env = state.get("environment", {})
    safety = state.get("safety", {})
    logistics = state.get("logistics", {})
    comm = state.get("communication", {})

    dr = dict(ops.get("domain_readiness", {}))
    
    # Calculate domain scores
    dr["fuel"] = min(100.0, fuel.get("fuel_percentage", 80.0) * 1.1)
    dr["energy"] = 45.0 if "Overload" in energy.get("status", "") else (80.0 if "Discharging" in energy.get("status", "") else 95.0)
    dr["water"] = 40.0 if "CRITICAL" in water.get("freeze_risk", "") else (75.0 if water.get("freeze_risk") == "High" else 94.0)
    dr["equipment"] = equipment.get("avg_health", 90.0)
    dr["environment"] = max(20.0, round(100.0 - (env.get("storm_severity", 0.1) * 80.0), 1))
    dr["safety"] = safety.get("safety_score", 95.0)
    dr["logistics"] = max(10.0, round(100.0 - logistics.get("logistics_risk_score", 20.0), 1))
    dr["communication"] = 60.0 if comm.get("packet_loss_pct", 0.0) > 5.0 else 98.0

    # Composite weighted readiness score
    # Foundational weights: Fuel (0.2), Energy (0.2), Safety (0.15), Water (0.1), Equipment (0.1), Environment (0.1), Others (0.15)
    composite = (
        dr["fuel"] * 0.20 +
        dr["energy"] * 0.20 +
        dr["safety"] * 0.15 +
        dr["water"] * 0.10 +
        dr["equipment"] * 0.10 +
        dr["environment"] * 0.10 +
        (dr["logistics"] + dr["communication"]) * 0.075
    )
    overall = round(min(100.0, max(0.0, composite)), 1)
    ops["overall_readiness"] = overall
    ops["domain_readiness"] = dr

    if overall >= 80.0:
        ops["status_band"] = "Nominal"
    elif overall >= 65.0:
        ops["status_band"] = "Watch"
    elif overall >= 50.0:
        ops["status_band"] = "Degraded"
    else:
        ops["status_band"] = "Critical"

    state["station_ops"] = ops
    return state
