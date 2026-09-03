def init_logistics_state(station_id: str) -> dict:
    if station_id == "maitri":
        # Inland: 100 km overland traverse from shelf ice edge
        return {
            "resupply_vessel": "MV Vasiliy Golovnin (Expedition Charter)",
            "planned_window": "Nov 2026 – Jan 2027",
            "days_to_window": 82,
            "planned_eta_days": 88,
            "weather_delay_days": 0,
            "effective_eta_days": 88,
            "logistics_route": "Cape Town -> Princess Astrid Coast -> 100km Overland PistenBully Convoy to Schirmacher Oasis",
            "convoy_status": "Pre-positioning Staging Equipment",
            "berth_access": "Ice Shelf Barrier Anchorage",
            "logistics_risk_score": 24.0 # 0-100
        }
    else:
        # Bharati: Direct coastal harbor approach at Larsemann Hills
        return {
            "resupply_vessel": "MV Vasiliy Golovnin (Expedition Charter)",
            "planned_window": "Dec 2026 – Feb 2027",
            "days_to_window": 95,
            "planned_eta_days": 102,
            "weather_delay_days": 0,
            "effective_eta_days": 102,
            "logistics_route": "Cape Town -> Prydz Bay / Quilty Bay -> Direct Fast Ice Barge Discharge",
            "convoy_status": "Coastal Landing Pad Operational",
            "berth_access": "Deep Water Sea Approach",
            "logistics_risk_score": 16.0
        }

def step(state: dict, perturbation: dict = None) -> dict:
    log = dict(state.get("logistics", {}))
    env = state.get("environment", {})

    # Weather impact on resupply route
    wind = env.get("wind_speed", 30.0)
    storm = env.get("storm_severity", 0.1)

    if storm > 0.6 or wind > 75.0:
        log["weather_delay_days"] = min(35, log.get("weather_delay_days", 0) + 1)
        log["logistics_risk_score"] = min(95.0, round(log.get("logistics_risk_score", 20.0) + 5.0, 1))
    else:
        log["logistics_risk_score"] = max(15.0, round(log.get("logistics_risk_score", 20.0) - 0.2, 1))

    if perturbation and perturbation.get("type") == "resupply_delay":
        delay = perturbation.get("days", 20)
        log["weather_delay_days"] += delay
        log["logistics_risk_score"] = min(95.0, log["logistics_risk_score"] + 40.0)

    log["effective_eta_days"] = log["planned_eta_days"] + log["weather_delay_days"]
    state["logistics"] = log
    return state
