import copy
import uuid
from typing import Dict, Any, List
from app.simulation.engine import get_current_state, step_all_domains
from app.intelligence.risk_engine import compute_risk

SCENARIO_PRESETS = [
    {
        "id": "main_generator_failure",
        "name": "Main Generator Unit Failure",
        "category": "Equipment & Energy",
        "description": "Primary 100-kVA generator trips offline. Full load instantly shifts to secondary backup unit and battery storage.",
        "perturbation": {"type": "generator_failure"},
        "duration_ticks": 24,
        "expected_risk": "HIGH",
        "recommended_action": "Load-shed non-essential scientific experiments, spin up tertiary backup unit, and dispatch maintenance team."
    },
    {
        "id": "severe_storm",
        "name": "3-Day Severe Antarctic Blizzard",
        "category": "Climate & Logistics",
        "description": "Severe katabatic storm with winds > 100 km/h and zero visibility. Solar generation drops 85%, heating demand surges, and resupply route stalls.",
        "perturbation": {"type": "storm", "intensity": 0.6},
        "duration_ticks": 36,
        "expected_risk": "HIGH",
        "recommended_action": "Initiate habitat lockdown, shift heating to auxiliary loop, and monitor fuel burn rate continuously."
    },
    {
        "id": "solar_drop_40",
        "name": "Solar Output Drops 40%",
        "category": "Renewable Energy",
        "description": "Solar PV array obscured by rime ice accumulation and seasonal low sun angle. Generator reliance increases.",
        "perturbation": {"type": "solar_drop", "drop_fraction": 0.40},
        "duration_ticks": 24,
        "expected_risk": "MEDIUM",
        "recommended_action": "Schedule robotic/manual array de-icing sweep and adjust fuel replenishment schedule."
    },
    {
        "id": "resupply_delay_20",
        "name": "Expedition Resupply Delayed 20 Days",
        "category": "Logistics & Supply",
        "description": "Expedition icebreaker trapped in heavy coastal pack ice. Resupply delivery delayed by 20 days beyond planned window.",
        "perturbation": {"type": "resupply_delay", "days": 20},
        "duration_ticks": 48,
        "expected_risk": "HIGH",
        "recommended_action": "Ration fresh rations, throttle comfort heating setpoints by 1.5°C, and restrict vehicle excursions."
    },
    {
        "id": "personnel_increase",
        "name": "Visiting Science Expedition Influx (+12)",
        "category": "Personnel & Life Support",
        "description": "A field research party of 12 personnel arrives for summer glaciology campaign. Demands on power, water, and food increase.",
        "perturbation": {"type": "personnel_increase", "additional_people": 12},
        "duration_ticks": 24,
        "expected_risk": "MEDIUM",
        "recommended_action": "Increase freshwater RO pumping hours and expand daily food kitchen allocation."
    },
    {
        "id": "water_consumption_spike",
        "name": "Freshwater Pipe Leak / Consumption Surge",
        "category": "Water & Sanitation",
        "description": "Abnormal water draw or hidden pipeline fissure accelerates storage depletion by 250%.",
        "perturbation": {"type": "water_consumption_spike"},
        "duration_ticks": 24,
        "expected_risk": "MEDIUM",
        "recommended_action": "Isolate secondary distribution manifolds, verify trace heating on Zub Lake / Quilty Bay intake, and enforce water rationing."
    },
    {
        "id": "critical_equipment_failure",
        "name": "Primary Intake Pump Failure",
        "category": "Equipment",
        "description": "Primary water extraction pump suffers mechanical impeller seizure.",
        "perturbation": {"type": "equipment_failure", "asset_id": "pump_01"},
        "duration_ticks": 24,
        "expected_risk": "HIGH",
        "recommended_action": "Switch to redundant backup pump and pull replacement mechanical seal from station inventory."
    },
    {
        "id": "extreme_cold_wave",
        "name": "Polar Vortex Deep Freeze (-48°C)",
        "category": "Climate & Safety",
        "description": "Sudden plunge in ambient temperature with severe wind chill, maxing out heating systems and stressing fuel viscosity.",
        "perturbation": {"type": "extreme_cold", "drop_c": 16.0},
        "duration_ticks": 30,
        "expected_risk": "HIGH",
        "recommended_action": "Activate emergency glycol heating loop, boost trace-heating wattage, and maintain hot fuel recirculation."
    }
]

def run_whatif_scenario(
    station_id: str,
    definition: dict,
    duration_ticks: int = 24
) -> dict:
    """
    Simulates a What-If scenario on an isolated CLONE of the state.
    Guarantees the live twin is never modified or corrupted!
    """
    # 1. Clone baseline state
    live_state = get_current_state(station_id)
    baseline_clone = copy.deepcopy(live_state)
    projected_state = copy.deepcopy(live_state)

    perturbation = definition.get("perturbation", {})
    ticks = definition.get("duration_ticks", duration_ticks)

    # 2. Run simulation forward on projected clone
    trajectory_baseline = []
    trajectory_projected = []

    curr_base = baseline_clone
    curr_proj = projected_state

    for t in range(ticks):
        # Step baseline without perturbation
        curr_base = step_all_domains(curr_base, perturbation=None)
        # Step projected WITH perturbation
        curr_proj = step_all_domains(curr_proj, perturbation=perturbation)

        trajectory_baseline.append({
            "tick": t + 1,
            "fuel_level": curr_base["fuel"]["current_level"],
            "fuel_pct": curr_base["fuel"]["fuel_percentage"],
            "energy_load": curr_base["energy"]["generator_load"],
            "readiness": curr_base["station_ops"]["overall_readiness"],
            "water_level": curr_base["water"]["storage_liters"]
        })

        trajectory_projected.append({
            "tick": t + 1,
            "fuel_level": curr_proj["fuel"]["current_level"],
            "fuel_pct": curr_proj["fuel"]["fuel_percentage"],
            "energy_load": curr_proj["energy"]["generator_load"],
            "readiness": curr_proj["station_ops"]["overall_readiness"],
            "water_level": curr_proj["water"]["storage_liters"]
        })

    # 3. Calculate Risk on both outcomes
    base_risk = compute_risk(curr_base)
    proj_risk = compute_risk(curr_proj)

    # 4. Compare Baseline vs Projected
    comparison = {
        "fuel_reserve_liters": {
            "baseline": curr_base["fuel"]["current_level"],
            "projected": curr_proj["fuel"]["current_level"],
            "delta": round(curr_proj["fuel"]["current_level"] - curr_base["fuel"]["current_level"], 1),
            "unit": "L"
        },
        "fuel_percentage": {
            "baseline": curr_base["fuel"]["fuel_percentage"],
            "projected": curr_proj["fuel"]["fuel_percentage"],
            "delta": round(curr_proj["fuel"]["fuel_percentage"] - curr_base["fuel"]["fuel_percentage"], 1),
            "unit": "%"
        },
        "days_fuel_remaining": {
            "baseline": curr_base["fuel"]["days_remaining"],
            "projected": curr_proj["fuel"]["days_remaining"],
            "delta": round(curr_proj["fuel"]["days_remaining"] - curr_base["fuel"]["days_remaining"], 1),
            "unit": "days"
        },
        "generator_load_kw": {
            "baseline": curr_base["energy"]["generator_load"],
            "projected": curr_proj["energy"]["generator_load"],
            "delta": round(curr_proj["energy"]["generator_load"] - curr_base["energy"]["generator_load"], 1),
            "unit": "kW"
        },
        "water_storage_liters": {
            "baseline": curr_base["water"]["storage_liters"],
            "projected": curr_proj["water"]["storage_liters"],
            "delta": round(curr_proj["water"]["storage_liters"] - curr_base["water"]["storage_liters"], 1),
            "unit": "L"
        },
        "equipment_health_avg": {
            "baseline": curr_base["equipment"]["avg_health"],
            "projected": curr_proj["equipment"]["avg_health"],
            "delta": round(curr_proj["equipment"]["avg_health"] - curr_base["equipment"]["avg_health"], 1),
            "unit": "%"
        },
        "station_readiness_score": {
            "baseline": curr_base["station_ops"]["overall_readiness"],
            "projected": curr_proj["station_ops"]["overall_readiness"],
            "delta": round(curr_proj["station_ops"]["overall_readiness"] - curr_base["station_ops"]["overall_readiness"], 1),
            "unit": "%"
        },
        "station_risk_score": {
            "baseline": base_risk["score"],
            "projected": proj_risk["score"],
            "delta": round(proj_risk["score"] - base_risk["score"], 1),
            "unit": "pts"
        },
        "resupply_eta_days": {
            "baseline": curr_base.get("logistics", {}).get("effective_eta_days", 92.5),
            "projected": curr_proj.get("logistics", {}).get("effective_eta_days", 112.5),
            "delta": round(curr_proj.get("logistics", {}).get("effective_eta_days", 112.5) - curr_base.get("logistics", {}).get("effective_eta_days", 92.5), 1),
            "unit": "days"
        },
        "logistics_risk_score": {
            "baseline": curr_base.get("logistics", {}).get("logistics_risk_score", 24.0),
            "projected": curr_proj.get("logistics", {}).get("logistics_risk_score", 64.0),
            "delta": round(curr_proj.get("logistics", {}).get("logistics_risk_score", 64.0) - curr_base.get("logistics", {}).get("logistics_risk_score", 24.0), 1),
            "unit": "pts"
        },
        "parts_readiness_pct": {
            "baseline": curr_base.get("inventory", {}).get("parts_readiness_pct", 94.0),
            "projected": curr_proj.get("inventory", {}).get("parts_readiness_pct", 82.5),
            "delta": round(curr_proj.get("inventory", {}).get("parts_readiness_pct", 82.5) - curr_base.get("inventory", {}).get("parts_readiness_pct", 94.0), 1),
            "unit": "%"
        },
        "critical_items_low": {
            "baseline": curr_base.get("inventory", {}).get("critical_items_low", 0),
            "projected": curr_proj.get("inventory", {}).get("critical_items_low", 3),
            "delta": curr_proj.get("inventory", {}).get("critical_items_low", 3) - curr_base.get("inventory", {}).get("critical_items_low", 0),
            "unit": "items"
        },
        "stockout_count": {
            "baseline": curr_base.get("inventory", {}).get("stockout_count", 0),
            "projected": curr_proj.get("inventory", {}).get("stockout_count", 1),
            "delta": curr_proj.get("inventory", {}).get("stockout_count", 1) - curr_base.get("inventory", {}).get("stockout_count", 0),
            "unit": "items"
        }
    }

    # 5. Factor Attribution — computed from real per-domain risk deltas
    # Compare baseline vs projected across key domains, normalise to 100%.
    # This replaces the hardcoded illustrative example from the Master Report.
    domain_deltas = {
        "Logistics & Resupply": abs(
            curr_proj["logistics"].get("weather_delay_days", 0)
            - curr_base["logistics"].get("weather_delay_days", 0)
        ) * 3.0,
        "Fuel Depletion Risk": abs(
            curr_base["fuel"]["fuel_percentage"] - curr_proj["fuel"]["fuel_percentage"]
        ) * 1.5,
        "Equipment Stress & Degradation": abs(
            curr_base["equipment"]["avg_health"] - curr_proj["equipment"]["avg_health"]
        ) * 2.0,
        "Weather / Cold Exposure": abs(
            curr_base["environment"]["temperature"] - curr_proj["environment"]["temperature"]
        ) * 0.8 + abs(
            curr_base["environment"]["wind_speed"] - curr_proj["environment"]["wind_speed"]
        ) * 0.4,
        "Life Support & Auxiliary Margin": abs(
            curr_base["station_ops"]["overall_readiness"]
            - curr_proj["station_ops"]["overall_readiness"]
        ) * 1.2,
    }
    total_delta = sum(domain_deltas.values()) or 1.0  # avoid div by zero
    attribution = [
        {"factor": factor, "impact_pct": round(val / total_delta * 100)}
        for factor, val in sorted(domain_deltas.items(), key=lambda x: -x[1])
    ]
    # Ensure impact_pct sums to 100 (fix rounding)
    diff = 100 - sum(a["impact_pct"] for a in attribution)
    if attribution:
        attribution[0]["impact_pct"] += diff

    return {
        "scenario_id": str(uuid.uuid4()),
        "station_id": station_id,
        "title": definition.get("name", "Custom What-If Run"),
        "ticks_simulated": ticks,
        "comparison": comparison,
        "baseline_risk": base_risk,
        "projected_risk": proj_risk,
        "attribution": attribution,
        "trajectory_baseline": trajectory_baseline,
        "trajectory_projected": trajectory_projected,
        "recommended_action": definition.get("recommended_action", "Review projected resource margins and adjust preventive maintenance schedules.")
    }
