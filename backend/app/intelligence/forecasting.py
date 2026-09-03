import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Any
from sklearn.ensemble import RandomForestRegressor

def forecast_domain(
    station_id: str,
    domain: str,
    current_state: dict,
    horizon: int = 24
) -> dict:
    fuel = current_state.get("fuel", {})
    energy = current_state.get("energy", {})
    water = current_state.get("water", {})
    equip = current_state.get("equipment", {})
    env = current_state.get("environment", {})

    points = []
    
    if domain == "fuel":
        curr_val = fuel.get("current_level", 150000.0)
        burn_rate_hr = fuel.get("consumption_rate_l_per_hr", 18.0)
        temp = env.get("temperature", -25.0)
        storm = env.get("storm_severity", 0.1)

        for step in range(1, horizon + 1):
            # Non-linear trend based on predicted cold and storm
            cold_multiplier = 1.0 + max(0.0, (-temp - 20.0) * 0.015)
            projected_burn = burn_rate_hr * cold_multiplier * (1.0 + storm * 0.2)
            val = max(0.0, curr_val - (projected_burn * step))
            # Confidence interval widens with time
            margin = (step ** 0.5) * (projected_burn * 0.15)
            low = max(0.0, val - margin)
            high = min(fuel.get("total_capacity", 300000.0), val + margin)

            points.append({
                "horizon": step,
                "value": round(val, 1),
                "confidence_low": round(low, 1),
                "confidence_high": round(high, 1)
            })

    elif domain == "energy":
        curr_load = energy.get("generator_load", 75.0)
        base = curr_load
        for step in range(1, horizon + 1):
            # Diurnal sinusoidal variation
            hour_angle = (step % 24) * (2 * np.pi / 24.0)
            variation = np.sin(hour_angle) * 12.0
            val = max(20.0, base + variation)
            margin = 5.0 + (step * 0.3)
            points.append({
                "horizon": step,
                "value": round(val, 1),
                "confidence_low": round(max(0.0, val - margin), 1),
                "confidence_high": round(val + margin, 1)
            })

    elif domain == "water":
        curr_storage = water.get("storage_liters", 22000.0)
        hourly_net = (water.get("production_rate_l_hr", 140.0) - (water.get("daily_consumption_l", 1600.0) / 24.0))
        for step in range(1, horizon + 1):
            val = max(500.0, min(water.get("max_storage_liters", 30000.0), curr_storage + (hourly_net * step)))
            margin = 150.0 + (step * 8.0)
            points.append({
                "horizon": step,
                "value": round(val, 1),
                "confidence_low": round(max(0.0, val - margin), 1),
                "confidence_high": round(val + margin, 1)
            })

    else: # equipment health forecast
        curr_health = equip.get("avg_health", 92.0)
        for step in range(1, horizon + 1):
            deg = 0.04 * step
            val = max(10.0, curr_health - deg)
            margin = 1.0 + (step * 0.08)
            points.append({
                "horizon": step,
                "value": round(val, 2),
                "confidence_low": round(max(0.0, val - margin), 2),
                "confidence_high": round(min(100.0, val + margin), 2)
            })

    final_point = points[-1] if points else {
        "value": 0.0,
        "confidence_low": 0.0,
        "confidence_high": 0.0
    }

    return {
        "station_id": station_id,
        "domain": domain,
        "horizon": horizon,
        "value": final_point["value"],
        "confidence_low": final_point["confidence_low"],
        "confidence_high": final_point["confidence_high"],
        "points": points,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
