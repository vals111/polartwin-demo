from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.all_schemas import ResourceOut
from app.simulation.engine import get_current_state
from app.simulation import personnel as personnel_sim
from app.simulation import communication as comm_sim
from app.deps import require_viewer
import copy

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.get("/{station_id}", response_model=List[ResourceOut])
def get_resources(
    station_id: str,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    return [
        {"type": "fuel", "level": state["fuel"]["current_level"]},
        {"type": "water", "level": state["water"]["storage_liters"]},
        {"type": "food_rations_days", "level": state["supplies"]["rations_stock_days"]},
        {"type": "battery_storage_pct", "level": state["energy"]["battery_level"]}
    ]

@router.get("/{station_id}/inventory")
def get_inventory_details(
    station_id: str,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    return {
        "station_id": station_id,
        "supplies": state.get("supplies", {}),
        "inventory": state.get("inventory", {}),
        "fuel_details": state.get("fuel", {}),
        "water_details": state.get("water", {})
    }

@router.get("/{station_id}/fuel")
def get_fuel_details(
    station_id: str,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    return {
        "station_id": station_id,
        "fuel": state.get("fuel", {})
    }

@router.get("/{station_id}/water")
def get_water_details(
    station_id: str,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    return {
        "station_id": station_id,
        "water": state.get("water", {})
    }

@router.get("/{station_id}/personnel")
def get_personnel_details(
    station_id: str,
    user = Depends(require_viewer)
):
    """
    Returns the full Personnel Digital Twin state for the given station.
    Includes headcount, deployment map, role groups, zone occupancy,
    resource demand coupling, diurnal state, workforce condition,
    field exposure, equipment coverage, life support, and risk.
    """
    state = get_current_state(station_id)
    pers = state.get("personnel", {})

    # If personnel state is sparse (from old simulation), re-initialize with rich state
    if not pers.get("role_groups"):
        pers = personnel_sim.init_personnel_state(station_id)

    return {
        "station_id": station_id,
        "personnel": pers,
    }

@router.post("/{station_id}/personnel/whatif")
def run_personnel_whatif(
    station_id: str,
    payload: Dict[str, Any],
    user = Depends(require_viewer)
):
    """
    Execute a Personnel What-If scenario on an isolated clone of station state.
    Never mutates the live twin state.

    Payload:
      { "scenario_type": str, "params": dict }

    Returns:
      { "baseline": dict, "projected": dict, "delta": dict }
    """
    scenario_type = payload.get("scenario_type", "personnel_increase")
    params = payload.get("params", {})

    # Get live state — deep copy it to protect from mutation
    live_state = get_current_state(station_id)
    base_state = copy.deepcopy(live_state)
    base_pers = base_state.get("personnel", {})
    if not base_pers.get("role_groups"):
        base_pers = personnel_sim.init_personnel_state(station_id)
        base_state["personnel"] = base_pers

    # Run What-If on the clone
    projected_state = personnel_sim._compute_what_if_state(base_state, scenario_type, params)
    proj_pers = projected_state.get("personnel", {})

    # Pull key comparison values
    base_rc = base_pers.get("resource_demand_coupling", {})
    proj_rc = proj_pers.get("resource_demand_coupling", {})

    baseline = {
        "headcount": base_pers.get("headcount", 25),
        "occupancy_pct": base_pers.get("occupancy_pct", 83.0),
        "energy_kw": base_rc.get("energy_personnel_load_kw", 0.0),
        "water_l_day": base_rc.get("water_demand_l_day", 0.0),
        "food_kcal_day": base_rc.get("food_demand_kcal_day", 0.0),
        "waste_kg_day": base_rc.get("waste_generation_kg_day", 0.0),
        "research_readiness_pct": next(
            (rg.get("research_readiness_pct", 88.0) for rg in base_pers.get("role_groups", []) if rg.get("role") == "Research Scientists"),
            88.0
        ),
        "operator_coverage_pct": min(
            (ec.get("coverage_pct", 100.0) for ec in base_pers.get("equipment_coverage", [])),
            default=100.0
        ),
        "field_deployed": base_pers.get("deployment_map", {}).get("field_deployed", 0),
        "field_exposure_risk": base_pers.get("field_exposure", {}).get("exposure_risk", "Low"),
        "personnel_risk_score": base_pers.get("personnel_risk", {}).get("score", 8.0),
        "personnel_risk_level": base_pers.get("personnel_risk", {}).get("level", "LOW"),
        "food_stock_days": base_pers.get("resupply_impact", {}).get("food_stock_days_current", 42),
    }

    projected = {
        "headcount": proj_pers.get("headcount", 25),
        "occupancy_pct": proj_pers.get("occupancy_pct", 83.0),
        "energy_kw": proj_rc.get("energy_personnel_load_kw", 0.0),
        "water_l_day": proj_rc.get("water_demand_l_day", 0.0),
        "food_kcal_day": proj_rc.get("food_demand_kcal_day", 0.0),
        "waste_kg_day": proj_rc.get("waste_generation_kg_day", 0.0),
        "research_readiness_pct": next(
            (rg.get("research_readiness_pct", 88.0) for rg in proj_pers.get("role_groups", []) if rg.get("role") == "Research Scientists"),
            88.0
        ),
        "operator_coverage_pct": min(
            (ec.get("coverage_pct", 100.0) for ec in proj_pers.get("equipment_coverage", [])),
            default=100.0
        ),
        "field_deployed": proj_pers.get("deployment_map", {}).get("field_deployed", 0),
        "field_exposure_risk": proj_pers.get("field_exposure", {}).get("exposure_risk", "Low"),
        "personnel_risk_score": proj_pers.get("personnel_risk", {}).get("score", 8.0),
        "personnel_risk_level": proj_pers.get("personnel_risk", {}).get("level", "LOW"),
        "food_stock_days": max(
            0,
            base_pers.get("resupply_impact", {}).get("food_stock_days_current", 42) - round(
                (proj_pers.get("headcount", 25) - base_pers.get("headcount", 25)) * 0.5
            )
        ),
    }

    # Delta
    delta = {}
    for k in baseline:
        bv = baseline[k]
        pv = projected[k]
        if isinstance(bv, (int, float)) and isinstance(pv, (int, float)):
            delta[k] = round(pv - bv, 2)
        else:
            delta[k] = None

    return {
        "station_id": station_id,
        "scenario_type": scenario_type,
        "params": params,
        "baseline": baseline,
        "projected": projected,
        "delta": delta,
        "scenario_anomalies": proj_pers.get("anomalies", []),
    }


@router.get("/{station_id}/communication")
def get_communication_details(
    station_id: str,
    user = Depends(require_viewer)
):
    """
    Returns the full Communication & Telemetry Link Digital Twin state for the given station.
    Includes bandwidth, latency, packet loss, telemetry freshness, Digital Twin sync state,
    QoS traffic queue matrix, communication assets, 16-domain freshness, and operational visibility risk.
    """
    state = get_current_state(station_id)
    comm = state.get("communication", {})

    # Auto-upgrade sparse old state if missing rich fields
    if not comm.get("qos_tiers"):
        comm = comm_sim.init_communication_state(station_id)
        state["communication"] = comm

    return {
        "station_id": station_id,
        "communication": comm,
    }


@router.post("/{station_id}/communication/whatif")
def run_communication_whatif(
    station_id: str,
    payload: Dict[str, Any],
    user = Depends(require_viewer)
):
    """
    Execute a Communication What-If scenario on an isolated clone of station state.
    Never mutates the live Digital Twin state.

    Payload:
      { "scenario_type": str, "params": dict }

    Returns:
      { "station_id": str, "scenario_type": str, "baseline": dict, "projected": dict, "delta": dict, "recommendation": dict }
    """
    scenario_type = payload.get("scenario_type", "primary_link_failure")
    params = payload.get("params", {})

    live_state = get_current_state(station_id)
    base_state = copy.deepcopy(live_state)
    base_comm = base_state.get("communication", {})
    if not base_comm.get("qos_tiers"):
        base_comm = comm_sim.init_communication_state(station_id)
        base_state["communication"] = base_comm

    result = comm_sim._compute_what_if_state(base_state, scenario_type, params)
    result["station_id"] = station_id
    return result
