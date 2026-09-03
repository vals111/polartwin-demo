from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.station import Station, Asset
from app.schemas.all_schemas import StationOut, AssetOut
from app.simulation.engine import get_current_state
from app.deps import require_viewer

router = APIRouter(prefix="/stations", tags=["Stations"])

@router.get("", response_model=List[StationOut])
def get_stations(
    db: Session = Depends(get_db),
    user = Depends(require_viewer)
):
    stations = db.query(Station).all()
    if not stations:
        # Fallback to in-memory standard definitions if DB empty
        return [
            {"station_id": "maitri", "name": "Maitri Research Station", "location_type": "inland"},
            {"station_id": "bharati", "name": "Bharati Research Station", "location_type": "coastal"}
        ]
    return stations

@router.get("/{id}")
def get_station_by_id(
    id: str,
    db: Session = Depends(get_db),
    user = Depends(require_viewer)
):
    st = db.query(Station).filter(Station.station_id == id).first()
    state = get_current_state(id)
    return {
        "station_id": id,
        "name": st.name if st else ("Maitri Station" if id == "maitri" else "Bharati Station"),
        "location_type": st.location_type if st else ("inland" if id == "maitri" else "coastal"),
        "state": state
    }

@router.get("/{id}/assets", response_model=List[AssetOut])
def get_station_assets(
    id: str,
    db: Session = Depends(get_db),
    user = Depends(require_viewer)
):
    assets = db.query(Asset).filter(Asset.station_id == id).all()
    if not assets:
        # Seeded standard defaults
        if id == "maitri":
            return [
                {"asset_id": "ast_gen_01", "station_id": id, "type": "generator", "name": "Main Generator Block 100 kVA"},
                {"asset_id": "ast_fuel_01", "station_id": id, "type": "fuel_farm", "name": "Maitri Dedicated Fuel Farm"},
                {"asset_id": "ast_water_01", "station_id": id, "type": "pump_house", "name": "Zub Lake Pump Station"},
                {"asset_id": "ast_habitat_01", "station_id": id, "type": "building", "name": "Main Habitat Complex"},
                {"asset_id": "ast_sat_01", "station_id": id, "type": "satellite_array", "name": "Polar Satcom Radome"}
            ]
        else:
            return [
                {"asset_id": "ast_chp_01", "station_id": id, "type": "generator", "name": "3x100-kVA CHP Power Plant"},
                {"asset_id": "ast_fuel_02", "station_id": id, "type": "fuel_farm", "name": "Automated 300,000L Fuel Farm"},
                {"asset_id": "ast_water_02", "station_id": id, "type": "pump_house", "name": "Quilty Bay Seawater Intake & RO"},
                {"asset_id": "ast_habitat_02", "station_id": id, "type": "building", "name": "Prefabricated Container Main Complex"},
                {"asset_id": "ast_sat_02", "station_id": id, "type": "satellite_array", "name": "Tracking Satellite Earth Terminal"}
            ]
    return assets
