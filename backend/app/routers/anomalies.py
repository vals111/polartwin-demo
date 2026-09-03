from typing import List, Optional
from fastapi import APIRouter, Depends
from app.schemas.all_schemas import AnomalyOut
from app.simulation.engine import get_current_state
from app.intelligence.anomaly import scan_state_anomalies
from app.deps import require_operator

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("", response_model=List[AnomalyOut])
def get_anomalies(
    station_id: Optional[str] = "maitri",
    user = Depends(require_operator)
):
    state = get_current_state(station_id)
    anomalies = scan_state_anomalies(state)
    return anomalies
