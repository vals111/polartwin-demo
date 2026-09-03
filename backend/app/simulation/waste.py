def init_waste_state(station_id: str) -> dict:
    if station_id == "maitri":
        # Incinerator toilets & solid compactor
        return {
            "tech_type": "Incinerator Toilets & Mechanical Compactor",
            "solid_waste_stored_kg": 420.0,
            "max_storage_kg": 2500.0,
            "incinerator_temp_c": 820.0,
            "incinerator_status": "Operational",
            "daily_waste_kg": 18.5,
            "storage_full_percentage": 16.8,
            "days_to_removal_limit": 112,
            "compliance_status": "Antarctic Treaty Annex III Compliant"
        }
    else:
        # Bharati: Biological wastewater treatment & vacuum collection
        return {
            "tech_type": "Biological Wastewater Treatment Plant & Compactors",
            "solid_waste_stored_kg": 580.0,
            "max_storage_kg": 3500.0,
            "wwtp_effluent_quality_ppm": 8.5, # Treated water
            "wwtp_status": "Operational",
            "daily_waste_kg": 24.0,
            "storage_full_percentage": 16.5,
            "days_to_removal_limit": 121,
            "compliance_status": "Antarctic Treaty Annex III Compliant"
        }

def step(state: dict, perturbation: dict = None) -> dict:
    waste = dict(state.get("waste", {}))
    personnel = state.get("personnel", {})
    headcount = personnel.get("headcount", 25)

    daily_kg = headcount * 0.75
    tick_kg = (daily_kg / 86400.0) * 80.0
    waste["solid_waste_stored_kg"] = round(waste["solid_waste_stored_kg"] + tick_kg, 2)
    waste["storage_full_percentage"] = round((waste["solid_waste_stored_kg"] / waste["max_storage_kg"]) * 100.0, 1)

    state["waste"] = waste
    return state
