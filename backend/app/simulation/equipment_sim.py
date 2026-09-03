import random

def init_equipment_state(station_id: str) -> dict:
    return {
        "items": [
            {
                "id": "gen_01",
                "name": "Main Diesel Generator Unit 1",
                "type": "generator",
                "health_score": 94.5,
                "operating_hours": 4120,
                "status": "operational",
                "vibration_mm_s": 2.1,
                "temp_c": 82.5,
                "failure_risk_pct": 3.2
            },
            {
                "id": "gen_02",
                "name": "Secondary Generator Unit 2",
                "type": "generator",
                "health_score": 91.0,
                "operating_hours": 3890,
                "status": "operational",
                "vibration_mm_s": 2.4,
                "temp_c": 80.1,
                "failure_risk_pct": 5.1
            },
            {
                "id": "gen_03",
                "name": "Emergency Standby Generator 3",
                "type": "generator",
                "health_score": 98.0,
                "operating_hours": 450,
                "status": "standby",
                "vibration_mm_s": 0.5,
                "temp_c": 24.0,
                "failure_risk_pct": 1.0
            },
            {
                "id": "pump_01",
                "name": "Primary Water Extraction Pump",
                "type": "pump",
                "health_score": 88.0,
                "operating_hours": 6120,
                "status": "operational",
                "vibration_mm_s": 3.1,
                "temp_c": 45.0,
                "failure_risk_pct": 7.8
            },
            {
                "id": "hvac_01",
                "name": "Central Habitat HVAC & Heat Recovery",
                "type": "hvac",
                "health_score": 93.0,
                "operating_hours": 5800,
                "status": "operational",
                "vibration_mm_s": 1.8,
                "temp_c": 38.0,
                "failure_risk_pct": 4.0
            },
            {
                "id": "spec_01",
                "name": "FTIR Atmospheric Trace-Gas Spectrometer",
                "type": "scientific",
                "health_score": 97.0,
                "operating_hours": 1900,
                "status": "operational",
                "vibration_mm_s": 0.4,
                "temp_c": 18.0,
                "failure_risk_pct": 1.5
            }
        ],
        "avg_health": 93.6
    }

def step(state: dict, perturbation: dict = None) -> dict:
    equip = dict(state.get("equipment", {}))
    items = [dict(it) for it in equip.get("items", [])]
    energy = state.get("energy", {})
    gen_load = energy.get("generator_load", 65.0)

    for item in items:
        # Check perturbation
        if perturbation and perturbation.get("type") == "generator_failure" and item["id"] == "gen_01":
            item["status"] = "tripped"
            item["health_score"] = 28.0
            item["failure_risk_pct"] = 92.0
            continue
        elif perturbation and perturbation.get("type") == "equipment_failure" and item["id"] == perturbation.get("asset_id", "pump_01"):
            item["status"] = "failed"
            item["health_score"] = 35.0
            item["failure_risk_pct"] = 85.0
            continue

        if item["status"] == "operational":
            # Degradation calculation: load stress * base rate
            stress = 1.0 + (gen_load / 100.0) if item["type"] == "generator" else 1.0
            deg = 0.005 * stress
            item["health_score"] = max(20.0, round(item["health_score"] - deg, 2))
            item["operating_hours"] += 1
            # Failure risk formula
            item["failure_risk_pct"] = round(max(1.0, (100.0 - item["health_score"]) * 0.9), 1)

    equip["items"] = items
    equip["avg_health"] = round(sum(it["health_score"] for it in items) / max(1, len(items)), 1)
    state["equipment"] = equip
    return state
