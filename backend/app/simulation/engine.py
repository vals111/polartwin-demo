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

# ── IsolationForest cache (issue #14) ────────────────────────────────────────
# Fitted periodically — not every tick — to avoid re-training overhead.
_iso_last_fitted: Dict[str, int] = {}  # station_id → tick at last fit

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


# Key telemetry parameters to persist on every tick
_PERSIST_PARAMS = [
    ("temperature",      lambda s: s["environment"]["temperature"]),
    ("wind_speed",       lambda s: s["environment"]["wind_speed"]),
    ("solar_radiation",  lambda s: s["environment"].get("solar_radiation", 0.0)),
    ("generator_load",   lambda s: s["energy"]["generator_load"]),
    ("solar_output",     lambda s: s["energy"]["solar_output"]),
    ("battery_level",    lambda s: s["energy"].get("battery_level", 0.0)),
    ("grid_frequency",   lambda s: s["energy"].get("grid_frequency", 50.0)),
    ("fuel_percentage",  lambda s: s["fuel"]["fuel_percentage"]),
    ("fuel_level_liters",lambda s: s["fuel"]["current_level"]),
    ("fuel_burn_rate",   lambda s: s["fuel"]["consumption_rate_l_per_hr"]),
    ("water_liters",     lambda s: s["water"]["storage_liters"]),
    ("pipe_temp_c",      lambda s: s["water"].get("pipe_temp_c", 3.0)),
    ("avg_equip_health", lambda s: s["equipment"].get("avg_health", 90.0)),
    ("station_readiness",lambda s: s["station_ops"]["overall_readiness"]),
]


def _persist_tick(station_id: str, state: dict) -> None:
    """
    Write one Telemetry row per parameter to the database.
    Uses a short-lived session — does NOT block the event loop.
    """
    from app.database import SessionLocal
    from app.models.telemetry import Telemetry

    ts = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        rows = []
        for param_name, extractor in _PERSIST_PARAMS:
            try:
                val = float(extractor(state))
            except (KeyError, TypeError, ValueError):
                continue
            rows.append(Telemetry(
                station_id=station_id,
                parameter=param_name,
                value=val,
                timestamp=ts,
            ))
        db.add_all(rows)
        db.commit()
    except Exception as exc:
        logger.error(f"Failed to persist telemetry tick for {station_id}: {exc}")
        db.rollback()
    finally:
        db.close()


def run_tick(station_id: str, db_session=None) -> dict:
    """
    Runs a live simulation tick for a station, persists telemetry to DB,
    and returns the updated state dict.
    """
    global station_states, current_ticks
    current_state = get_current_state(station_id)

    # Step simulation across all 16 domains
    next_state = step_all_domains(current_state)
    station_states[station_id] = next_state
    current_ticks[station_id] = next_state["tick"]

    # ── Persist to DB every tick (issue #4 fix) ───────────────────────────────
    _persist_tick(station_id, next_state)

    return next_state
