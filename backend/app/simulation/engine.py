import copy
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from app.simulation import (
    environment,
    energy,
    fuel,
    water,
    waste,
    supplies,
    infrastructure,
    equipment_sim,
    logistics,
    communication,
    personnel,
    research,
    safety,
    maintenance_sim,
    inventory,
    station_ops,
)

logger = logging.getLogger("polartwin.simulation")

# Active in-memory state for both stations
station_states: Dict[str, Dict[str, Any]] = {}
current_ticks: Dict[str, int] = {"maitri": 0, "bharati": 0}

def initialize_station_state(station_id: str) -> dict:
    state = {
        "station_id": station_id,
        "environment": environment.init_environment_state(station_id),
        "energy": energy.init_energy_state(station_id),
        "fuel": fuel.init_fuel_state(station_id),
        "water": water.init_water_state(station_id),
        "waste": waste.init_waste_state(station_id),
        "supplies": supplies.init_supplies_state(station_id),
        "infrastructure": infrastructure.init_infrastructure_state(station_id),
        "equipment": equipment_sim.init_equipment_state(station_id),
        "logistics": logistics.init_logistics_state(station_id),
        "communication": communication.init_communication_state(station_id),
        "personnel": personnel.init_personnel_state(station_id),
        "research": research.init_research_state(station_id),
        "safety": safety.init_safety_state(station_id),
        "maintenance": maintenance_sim.init_maintenance_state(station_id),
        "inventory": inventory.init_inventory_state(station_id),
        "station_ops": station_ops.init_station_ops_state(station_id),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tick": 0
    }
    return state

def get_current_state(station_id: str) -> dict:
    global station_states
    if station_id not in station_states:
        station_states[station_id] = initialize_station_state(station_id)
    return station_states[station_id]

def step_all_domains(state: dict, perturbation: dict = None) -> dict:
    """
    Pure functional step across all 16 domains in dependency-resolved order.
    Can be run on live state or cloned What-If state!
    """
    s = copy.deepcopy(state)
    
    # 1. Environment (Root external driver)
    s = environment.step(s, perturbation)
    
    # 2. Personnel (Drives base consumption & activity)
    s = personnel.step(s, perturbation)

    # 3. Research (Adds instrumentation power draw)
    s = research.step(s, perturbation)

    # 4. Energy (Computed from Environment + Personnel + Research)
    s = energy.step(s, perturbation)

    # 5. Fuel (Depends directly on Energy generator load)
    s = fuel.step(s, perturbation)

    # 6. Water (Pumping power + heating + freeze risk from environment)
    s = water.step(s, perturbation)

    # 7. Waste (Driven by personnel & wastewater)
    s = waste.step(s, perturbation)

    # 8. Food & Supplies (Headcount consumption & cold storage power)
    s = supplies.step(s, perturbation)

    # 9. Infrastructure (Wind stress & thermal envelope)
    s = infrastructure.step(s, perturbation)

    # 10. Equipment & Machinery (Degradation from generator load & hours)
    s = equipment_sim.step(s, perturbation)

    # 11. Transportation & Logistics (Weather delay factor)
    s = logistics.step(s, perturbation)

    # 12. Communication (Antenna weather attenuation & power)
    s = communication.step(s, perturbation)

    # 13. Safety & Emergency (Freeze hazard, incidents, blizzard lockdown)
    s = safety.step(s, perturbation)

    # 14. Maintenance (Health monitoring & work orders)
    s = maintenance_sim.step(s, perturbation)

    # 15. Storage & Inventory (Parts, consumables, stock levels)
    s = inventory.step(s, perturbation)

    # 16. Station Operations (Rolls up all 15 into composite readiness score)
    s = station_ops.step(s, perturbation)

    s["timestamp"] = datetime.now(timezone.utc).isoformat()
    s["tick"] = s.get("tick", 0) + 1
    return s

def run_tick(station_id: str, db_session = None) -> dict:
    """
    Runs a live simulation tick for a station, updates database and triggers intelligence.
    """
    global station_states, current_ticks
    current_state = get_current_state(station_id)
    
    # Step simulation
    next_state = step_all_domains(current_state)
    station_states[station_id] = next_state
    current_ticks[station_id] = next_state["tick"]

    return next_state
