from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.simulation.engine import get_current_state
from app.deps import require_viewer

router = APIRouter(prefix="/equipment", tags=["Equipment"])

@router.get("/{asset_id}")
def get_equipment_detail(
    asset_id: str,
    station_id: str = "maitri",
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    items = state.get("equipment", {}).get("items", [])
    for it in items:
        if it["id"] == asset_id:
            return it
    
    # Return matched or default if queried by generic name
    return {
        "id": asset_id,
        "name": asset_id.replace("_", " ").title(),
        "health_score": 92.0,
        "status": "operational",
        "failure_risk_pct": 5.0,
        "operating_hours": 3200
    }

@router.get("/station/{station_id}")
def get_station_equipment(
    station_id: str,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    return {
        "station_id": station_id,
        "avg_health": state["equipment"]["avg_health"],
        "items": state["equipment"]["items"],
        "maintenance": state.get("maintenance", {})
    }

@router.get("/predictive-maintenance/{station_id}")
def get_predictive_maintenance_analytics(
    station_id: str,
    user = Depends(require_viewer)
):
    from app.intelligence.predictive_maintenance import compute_predictive_maintenance
    state = get_current_state(station_id)
    return compute_predictive_maintenance(state)
