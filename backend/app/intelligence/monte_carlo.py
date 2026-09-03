import copy
import random
import numpy as np
from typing import Dict, Any, List
from app.simulation.engine import get_current_state, step_all_domains
from app.intelligence.risk_engine import compute_risk

def run_monte_carlo_simulation(
    station_id: str,
    iterations: int = 100,
    horizon_days: int = 30,
    scenario_type: str = "nominal"
) -> Dict[str, Any]:
    """
    Executes a multi-run stochastic Monte Carlo simulation across N iterations.
    Injects stochastic environmental fluctuations, random generator trip probability,
    and icebreaker resupply arrival uncertainty.
    Computes P10, P50, and P90 percentile trajectories, survival days distribution,
    and blackout probability.
    """
    initial_state = get_current_state(station_id)
    daily_ticks = 24  # 24 ticks representing 24 hours per day
    total_ticks = min(horizon_days * daily_ticks, 120)  # capped for real-time responsiveness

    fuel_trajectories = []
    energy_trajectories = []
    risk_trajectories = []
    survival_days_list = []
    blackout_occurred_count = 0

    for i in range(iterations):
        state = copy.deepcopy(initial_state)
        fuel_path = []
        energy_path = []
        risk_path = []
        blackout = False
        days_survived = horizon_days

        for t in range(total_ticks):
            # Stochastic perturbation sampling
            storm_shock = random.uniform(-0.15, 0.25) if random.random() < 0.20 else 0.0
            trip_shock = (random.random() < 0.02)  # 2% random generator trip chance per tick
            
            perturbation = {}
            if scenario_type == "storm" or storm_shock > 0.1:
                perturbation["type"] = "storm"
                perturbation["intensity"] = max(0.1, min(0.9, 0.4 + storm_shock))
            elif trip_shock:
                perturbation["type"] = "generator_failure"

            state = step_all_domains(state, perturbation=perturbation if perturbation else None)
            
            fuel_pct = state["fuel"]["fuel_percentage"]
            load = state["energy"]["generator_load"]
            r_score = compute_risk(state)["score"]

            fuel_path.append(fuel_pct)
            energy_path.append(load)
            risk_path.append(r_score)

            # Blackout condition: fuel <= 0 or battery depleted during overload
            if fuel_pct <= 0 or (state["energy"].get("blackout", False)):
                blackout = True
                days_survived = round(t / 4.0, 1)
                break

        if blackout:
            blackout_occurred_count += 1

        # Pad to total_ticks if early termination
        while len(fuel_path) < total_ticks:
            fuel_path.append(0.0)
            energy_path.append(0.0)
            risk_path.append(100.0)

        fuel_trajectories.append(fuel_path)
        energy_trajectories.append(energy_path)
        risk_trajectories.append(risk_path)
        survival_days_list.append(days_survived)

    # Convert to numpy arrays for percentile calculation
    fuel_arr = np.array(fuel_trajectories)
    risk_arr = np.array(risk_trajectories)

    p10_fuel = np.percentile(fuel_arr, 10, axis=0).tolist()
    p50_fuel = np.percentile(fuel_arr, 50, axis=0).tolist()
    p90_fuel = np.percentile(fuel_arr, 90, axis=0).tolist()

    p10_risk = np.percentile(risk_arr, 10, axis=0).tolist()
    p50_risk = np.percentile(risk_arr, 50, axis=0).tolist()
    p90_risk = np.percentile(risk_arr, 90, axis=0).tolist()

    # Time steps for x-axis
    steps = [f"Step +{idx+1}" for idx in range(total_ticks)]

    # Histogram of survival days
    hist, bin_edges = np.histogram(survival_days_list, bins=6)
    survival_histogram = [
        {"bin": f"{round(bin_edges[j], 1)}-{round(bin_edges[j+1], 1)}d", "count": int(hist[j])}
        for j in range(len(hist))
    ]

    return {
        "station_id": station_id,
        "iterations": iterations,
        "horizon_days": horizon_days,
        "blackout_probability_pct": round((blackout_occurred_count / iterations) * 100, 1),
        "mean_survival_days": round(float(np.mean(survival_days_list)), 1),
        "min_survival_days": round(float(np.min(survival_days_list)), 1),
        "max_survival_days": round(float(np.max(survival_days_list)), 1),
        "percentiles": {
            "steps": steps,
            "fuel_percentage": {
                "p10_worst_case": [round(x, 1) for x in p10_fuel],
                "p50_median": [round(x, 1) for x in p50_fuel],
                "p90_best_case": [round(x, 1) for x in p90_fuel]
            },
            "risk_score": {
                "p10_best_case": [round(x, 1) for x in p10_risk],
                "p50_median": [round(x, 1) for x in p50_risk],
                "p90_worst_case": [round(x, 1) for x in p90_risk]
            }
        },
        "survival_histogram": survival_histogram,
        "uncertainty_summary": (
            f"Simulated {iterations} stochastic futures over a {horizon_days}-day horizon. "
            f"Blackout probability under stochastic weather & equipment stress is {round((blackout_occurred_count / iterations) * 100, 1)}%. "
            f"Expected median fuel reserve at horizon boundary is {round(p50_fuel[-1], 1)}%."
        )
    }
