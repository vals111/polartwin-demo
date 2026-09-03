from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.all_schemas import UserOut
from app.simulation.engine import run_tick, get_current_state, step_all_domains, station_states
from app.intelligence.risk_engine import compute_risk
from app.security.auth import get_password_hash
from app.deps import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), admin = Depends(require_admin)):
    return db.query(User).all()

@router.get("/config")
def get_system_config(admin = Depends(require_admin)):
    return {
        "simulation_tick_interval_sec": 4,
        "supported_stations": ["maitri", "bharati"],
        "anomaly_detector": "Hybrid (Rule + Z-Score + Isolation Forest)",
        "forecasting_engine": "Ensemble (SARIMAX + HoltWinters + Random Forest)",
        "active_ticks": {
            "maitri": get_current_state("maitri").get("tick", 0),
            "bharati": get_current_state("bharati").get("tick", 0)
        }
    }

@router.post("/tick/{station_id}")
def trigger_manual_tick(station_id: str, admin = Depends(require_admin)):
    new_state = run_tick(station_id)
    risk = compute_risk(new_state)
    return {
        "status": "tick executed",
        "station_id": station_id,
        "tick": new_state["tick"],
        "readiness": new_state["station_ops"]["overall_readiness"],
        "risk_score": risk["score"]
    }
