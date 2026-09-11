from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.all_schemas import ResourceOut
from app.simulation.engine import get_current_state
from app.deps import require_viewer

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
