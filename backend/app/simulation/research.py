def init_research_state(station_id: str) -> dict:
    if station_id == "maitri":
        projects = [
            {"name": "Geomagnetic Induction & Riometer", "status": "Active", "priority": "High"},
            {"name": "Schirmacher Oasis Ice Core Drilling", "status": "Active", "priority": "Medium"},
            {"name": "Brewer Spectrophotometer Ozone Profiling", "status": "Active", "priority": "Critical"},
            {"name": "Broadband Seismological Observatory", "status": "Active", "priority": "High"}
        ]
    else:
        projects = [
            {"name": "Prydz Bay Coastal Physical Oceanography", "status": "Active", "priority": "High"},
            {"name": "Micro-Lidar Cloud & Aerosol Profiling", "status": "Active", "priority": "High"},
            {"name": "Larsemann Hills Tectonic Movement GPS", "status": "Active", "priority": "Medium"},
            {"name": "Antarctic Extremophile Microbiology Lab", "status": "Active", "priority": "High"}
        ]

    return {
        "active_projects": projects,
        "power_draw_kw": 16.5,
        "daily_data_gb": 48.2,
        "readiness_pct": 95.0
    }

def step(state: dict, perturbation: dict = None) -> dict:
    res = dict(state.get("research", {}))
    env = state.get("environment", {})
    energy = state.get("energy", {})

    # If storm or energy emergency, non-critical experiments paused
    if env.get("blizzard_active", False) or "Overload" in energy.get("status", ""):
        res["readiness_pct"] = 62.0
        res["power_draw_kw"] = 8.5 # reduced load
    else:
        res["readiness_pct"] = 96.0
        res["power_draw_kw"] = 16.5

    state["research"] = res
    return state
