from datetime import datetime, timezone
from typing import Dict, Any, List

WEIGHTS = {
    "fuel": 0.25,
    "energy": 0.20,
    "weather": 0.15,
    "equipment": 0.15,
    "logistics": 0.15,
    "anomaly": 0.10
}

def extract_domain_scores(state: dict, anomaly_score: float = 0.0) -> Dict[str, float]:
    fuel = state.get("fuel", {})
    energy = state.get("energy", {})
    env = state.get("environment", {})
    equip = state.get("equipment", {})
    log = state.get("logistics", {})

    # Fuel Risk: 0 (100% full) to 100 (empty)
    fuel_pct = fuel.get("fuel_percentage", 80.0)
    fuel_risk = max(0.0, min(100.0, 100.0 - fuel_pct))

    # Energy Risk: high load, overload or battery drain
    gen_load = energy.get("generator_load", 60.0)
    energy_risk = min(100.0, (gen_load / 130.0) * 80.0)
    if "Overload" in energy.get("status", "") or "Trip" in energy.get("status", ""):
        energy_risk = 92.0
    elif "Discharging" in energy.get("status", ""):
        energy_risk = max(energy_risk, 65.0)

    # Weather Risk: storm severity and extreme cold
    wind = env.get("wind_speed", 30.0)
    storm = env.get("storm_severity", 0.1)
    weather_risk = min(100.0, (storm * 60.0) + (wind / 130.0 * 40.0))

    # Equipment Risk: average health inverse
    avg_health = equip.get("avg_health", 90.0)
    equipment_risk = max(0.0, min(100.0, 100.0 - avg_health))

    # Logistics Risk
    logistics_risk = log.get("logistics_risk_score", 20.0)

    return {
        "fuel": round(fuel_risk, 1),
        "energy": round(energy_risk, 1),
        "weather": round(weather_risk, 1),
        "equipment": round(equipment_risk, 1),
        "logistics": round(logistics_risk, 1),
        "anomaly": round(min(100.0, anomaly_score * 100.0), 1)
    }

def compute_risk(state: dict, anomaly_score: float = 0.0) -> dict:
    domain_scores = extract_domain_scores(state, anomaly_score)
    station_id = state.get("station_id", "maitri")

    score = sum(domain_scores[k] * WEIGHTS[k] for k in WEIGHTS)
    score = round(min(100.0, max(0.0, score)), 1)

    if score <= 25.0:
        level = "LOW"
    elif score <= 50.0:
        level = "MEDIUM"
    elif score <= 75.0:
        level = "HIGH"
    else:
        level = "CRITICAL"

    # Human-readable factor naming
    factor_labels = {
        "fuel": "Low Fuel Reserve",
        "energy": "High Generator Load / Power Stress",
        "weather": "Severe Weather / Blizzard Exposure",
        "equipment": "Machinery Degradation",
        "logistics": "Resupply Logistics Delay",
        "anomaly": "Telemetry Anomaly Spike"
    }

    raw_factors = sorted(domain_scores.items(), key=lambda x: -x[1] * WEIGHTS[x[0]])
    total_weighted = sum(x[1] * WEIGHTS[x[0]] for x in raw_factors) or 1.0

    contributing_factors = []
    for k, v in raw_factors:
        effective_weight = round((v * WEIGHTS[k]) / total_weighted, 2)
        contributing_factors.append({
            "factor": factor_labels.get(k, k.capitalize()),
            "weight": effective_weight,
            "raw_score": v
        })

    return {
        "station_id": station_id,
        "score": score,
        "level": level,
        "contributing_factors": contributing_factors,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
