from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.simulation.engine import get_current_state
from app.intelligence.rl_optimizer import get_rl_optimization

router = APIRouter(prefix="/optimization", tags=["Optimization"])

@router.get("/rl/{station_id}")
async def get_rl_optimal_dispatch(station_id: str) -> Dict[str, Any]:
    station_id = station_id.lower()
    if station_id not in ["maitri", "bharati"]:
        raise HTTPException(status_code=404, detail="Station not found")
    state = get_current_state(station_id)
    return get_rl_optimization(state)
