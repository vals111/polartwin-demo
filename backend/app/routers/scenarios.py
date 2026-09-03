import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scenarios import Scenario
from app.schemas.all_schemas import ScenarioCreate, ScenarioResponse
from app.intelligence.whatif_engine import SCENARIO_PRESETS, run_whatif_scenario
from app.deps import require_viewer, require_operator

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

# In-memory storage for scenario runs
scenario_run_cache: Dict[str, dict] = {}

@router.get("/presets")
def get_scenario_presets(user = Depends(require_viewer)):
    return SCENARIO_PRESETS

@router.post("", response_model=ScenarioResponse)
def execute_scenario(
    payload: ScenarioCreate,
    db: Session = Depends(get_db),
    user = Depends(require_operator)
):
    station_id = payload.station_id
    definition = payload.definition
    
    # Run What-If on cloned state (never mutates live twin!)
    result = run_whatif_scenario(station_id, definition)
    scenario_id = result["scenario_id"]
    scenario_run_cache[scenario_id] = result

    # Persist in DB
    try:
        sc = Scenario(
            scenario_id=scenario_id,
            station_id=station_id,
            definition=definition,
            result=result
        )
        db.add(sc)
        db.commit()
    except Exception:
        db.rollback()

    return {
        "scenario_id": scenario_id,
        "station_id": station_id,
        "definition": definition,
        "result": result
    }

@router.get("/{id}")
def get_scenario_run(
    id: str,
    db: Session = Depends(get_db),
    user = Depends(require_viewer)
):
    if id in scenario_run_cache:
        return scenario_run_cache[id]
    
    sc = db.query(Scenario).filter(Scenario.scenario_id == id).first()
    if sc:
        return {
            "scenario_id": sc.scenario_id,
            "station_id": sc.station_id,
            "definition": sc.definition,
            "result": sc.result
        }
    
    raise HTTPException(status_code=404, detail="Scenario run not found")
