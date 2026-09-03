from typing import List
from fastapi import APIRouter, Depends
from app.schemas.all_schemas import RecommendationOut
from app.simulation.engine import get_current_state
from app.intelligence.recommendations import generate_recommendations
from app.deps import require_operator

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/{station_id}", response_model=List[RecommendationOut])
def get_station_recommendations(
    station_id: str,
    user = Depends(require_operator)
):
    state = get_current_state(station_id)
    recs = generate_recommendations(state)
    return recs
