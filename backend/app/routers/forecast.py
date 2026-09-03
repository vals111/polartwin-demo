from typing import Optional
from fastapi import APIRouter, Depends
from app.schemas.all_schemas import ForecastResponse
from app.simulation.engine import get_current_state
from app.intelligence.forecasting import forecast_domain
from app.deps import require_viewer

router = APIRouter(prefix="/forecast", tags=["Forecasting"])

@router.get("", response_model=ForecastResponse)
def get_forecast(
    station_id: Optional[str] = "maitri",
    domain: Optional[str] = "fuel",
    horizon: int = 24,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    result = forecast_domain(station_id, domain, state, horizon=horizon)
    return result
