import random

def init_energy_state(station_id: str) -> dict:
    if station_id == "maitri":
        return {
            "total_demand": 85.0,        # kW
            "base_load": 35.0,           # kW
            "heating_load": 32.0,        # kW
            "research_load": 12.0,       # kW
            "water_heating_load": 6.0,   # kW
            "solar_output": 18.0,        # kW
            "generator_load": 67.0,      # kW
            "battery_level": 92.0,       # %
            "grid_frequency": 50.02,     # Hz
            "generator_count_active": 2, # Active generators
            "status": "Nominal"
        }
    else:
        # Bharati: automated 3x100 kVA CHP units, trace-heated pipeline load
        return {
            "total_demand": 110.0,
            "base_load": 45.0,
            "heating_load": 38.0,
            "research_load": 18.0,
            "water_heating_load": 9.0,   # Trace heated pipeline & RO plant
            "solar_output": 26.0,
            "generator_load": 84.0,
            "battery_level": 95.0,
            "grid_frequency": 50.01,
            "generator_count_active": 2,
            "status": "Nominal"
        }

def step(state: dict, perturbation: dict = None) -> dict:
    eng = dict(state.get("energy", {}))
    env = state.get("environment", {})
    personnel = state.get("personnel", {})
    research = state.get("research", {})
    st_id = state.get("station_id", "maitri")

    temp = env.get("temperature", -25.0)
    solar_rad = env.get("solar_radiation", 200.0)
    headcount = personnel.get("headcount", 25)

    # 1. Calculate Demand
    # Cold drives heating demand non-linearly below 0°C
    delta_t = max(0.0, 18.0 - temp) # target indoor 18°C
    heating_coeff = 1.35 if st_id == "maitri" else 1.20 # older purpose-built vs modern insulated prefab
    eng["heating_load"] = round(delta_t * heating_coeff, 1)

    # Personnel load
    activity_factor = personnel.get("activity_level", 1.0)
    eng["base_load"] = round((25.0 if st_id == "maitri" else 32.0) + (headcount * 0.45 * activity_factor), 1)

    # Research load
    eng["research_load"] = round(research.get("power_draw_kw", 14.0), 1)

    # Water & freeze protection heating
    water_freeze_stress = 1.5 if temp < -20.0 else 1.0
    eng["water_heating_load"] = round((6.0 if st_id == "maitri" else 9.0) * water_freeze_stress, 1)

    total_demand = eng["base_load"] + eng["heating_load"] + eng["research_load"] + eng["water_heating_load"]
    eng["total_demand"] = round(total_demand, 1)

    # 2. Solar Generation
    pv_capacity = 35.0 if st_id == "maitri" else 50.0 # kW rating
    solar_deg = 1.0 - (env.get("storm_severity", 0.0) * 0.8)
    eng["solar_output"] = max(0.0, round((solar_rad / 1000.0) * pv_capacity * solar_deg, 1))

    # Apply scenario perturbation
    if perturbation and perturbation.get("type") == "solar_drop":
        eng["solar_output"] = round(eng["solar_output"] * (1.0 - perturbation.get("drop_fraction", 0.4)), 1)

    # 3. Generator Load & Dispatch
    gen_required = max(0.0, eng["total_demand"] - eng["solar_output"])
    
    # Check if a generator is offline in perturbation
    gen_offline = False
    if perturbation and perturbation.get("type") == "generator_failure":
        gen_offline = True
        eng["generator_count_active"] = 1
        # Generator 1 down, backup takes load or load-shedding occurs
        eng["status"] = "Generator Trip - Backup Overload"

    eng["generator_load"] = round(gen_required, 1)
    
    # Battery buffer logic
    if gen_required > (180.0 if st_id == "bharati" else 130.0):
        # Deficit
        eng["battery_level"] = max(15.0, round(eng.get("battery_level", 90.0) - 0.4, 1))
        eng["status"] = "High Demand Peak - Discharging Battery"
    else:
        eng["battery_level"] = min(100.0, round(eng.get("battery_level", 90.0) + 0.1, 1))
        if not gen_offline:
            eng["status"] = "Nominal"

    eng["grid_frequency"] = round(50.0 + random.uniform(-0.06, 0.06), 2)
    state["energy"] = eng
    return state
