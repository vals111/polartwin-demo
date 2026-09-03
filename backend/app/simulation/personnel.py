def init_personnel_state(station_id: str) -> dict:
    if station_id == "maitri":
        return {
            "headcount": 25,
            "roles": {
                "scientists": 10,
                "engineers_technicians": 10,
                "medical_officer": 1,
                "logistics_cooks": 4
            },
            "activity_level": 1.0, # Multiplier
            "field_team_outside": False,
            "safety_status": "All Personnel Accounted Inside"
        }
    else:
        return {
            "headcount": 22,
            "roles": {
                "scientists": 9,
                "engineers_technicians": 9,
                "medical_officer": 1,
                "logistics_cooks": 3
            },
            "activity_level": 1.0,
            "field_team_outside": False,
            "safety_status": "All Personnel Accounted Inside"
        }

def step(state: dict, perturbation: dict = None) -> dict:
    pers = dict(state.get("personnel", {}))
    env = state.get("environment", {})

    if perturbation and perturbation.get("type") == "personnel_increase":
        pers["headcount"] += perturbation.get("additional_people", 12)
        pers["roles"]["scientists"] += perturbation.get("additional_people", 12)

    # If severe storm, field activities strictly recalled
    if env.get("blizzard_active", False) or env.get("wind_speed", 30.0) > 65.0:
        pers["field_team_outside"] = False
        pers["safety_status"] = "Blizzard Protocol: All Personnel Confined to Habitat"
    else:
        pers["safety_status"] = "Nominal Station Movement"

    state["personnel"] = pers
    return state
