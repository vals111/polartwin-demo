from typing import List, Dict, Any

def generate_recommendations(state: dict) -> List[Dict[str, Any]]:
    fuel = state.get("fuel", {})
    energy = state.get("energy", {})
    env = state.get("environment", {})
    water = state.get("water", {})
    equipment = state.get("equipment", {})
    maint = state.get("maintenance", {})

    recs = []

    # Fuel / Energy
    if fuel.get("fuel_percentage", 100.0) < 35.0:
        recs.append({
            "action": "Enforce Fuel Conservation Tier 2",
            "explanation": f"Fuel reserve is at {fuel.get('fuel_percentage')}%. Reduce heating in non-residential research wings by 2.0°C to stretch reserves by 14 days.",
            "priority": "HIGH",
            "domain": "fuel"
        })
    elif energy.get("generator_load", 0.0) > 105.0:
        recs.append({
            "action": "Pre-heat Secondary Generator Unit 2",
            "explanation": f"Generator load ({energy.get('generator_load')} kW) approaching rated single-unit continuous threshold. Warm up secondary unit for synchronisation.",
            "priority": "MEDIUM",
            "domain": "energy"
        })

    # Weather / Environment
    if env.get("blizzard_active", False) or env.get("wind_speed", 0.0) > 70.0:
        recs.append({
            "action": "Maintain Station Habitat Lockdown Protocol",
            "explanation": f"Katabatic storm producing {env.get('wind_speed')} km/h winds and zero visibility. Recall all outdoor research parties and secure fuel transfer couplings.",
            "priority": "CRITICAL",
            "domain": "safety"
        })

    # Water Freeze
    if water.get("freeze_risk") != "Low":
        recs.append({
            "action": "Boost Trace-Heating Line Wattage",
            "explanation": f"Pipeline temperature is {water.get('pipe_temp_c')}°C. Increase trace-heating current by 15% to prevent ice nucleation in supply line.",
            "priority": "HIGH",
            "domain": "water"
        })

    # Equipment
    for item in equipment.get("items", []):
        if item["health_score"] < 75.0:
            recs.append({
                "action": f"Schedule Overhaul on {item['name']}",
                "explanation": f"Equipment health is {item['health_score']}% with failure probability of {item['failure_risk_pct']}%. Spares confirmed available in inventory.",
                "priority": "HIGH",
                "domain": "equipment"
            })

    if not recs:
        recs.append({
            "action": "Maintain Standard Operating Protocol",
            "explanation": "All primary and auxiliary systems are functioning within normal operational bounds. Next scheduled preventive inspection in 48 hours.",
            "priority": "LOW",
            "domain": "operations"
        })

    return recs
