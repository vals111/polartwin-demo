from fastapi import APIRouter, Depends
from app.schemas.all_schemas import RiskOut
from app.simulation.engine import get_current_state
from app.intelligence.risk_engine import compute_risk
from app.intelligence.explainability import explain_risk_score
from app.deps import require_viewer

router = APIRouter(prefix="/risk", tags=["Risk"])

@router.get("/{station_id}", response_model=RiskOut)
def get_station_risk(
    station_id: str,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    risk_data = compute_risk(state)
    explanation = explain_risk_score(risk_data)
    
    return {
        "station_id": station_id,
        "score": risk_data["score"],
        "level": risk_data["level"],
        "contributing_factors": risk_data["contributing_factors"],
        "timestamp": risk_data["timestamp"],
        "explanation": explanation
    }
