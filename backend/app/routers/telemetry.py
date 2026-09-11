from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.telemetry import Telemetry
from app.schemas.all_schemas import TelemetryReading
from app.simulation.engine import get_current_state
from app.deps import require_viewer
from app.services.weather_service import fetch_live_met_weather
from app.simulation.environment import apply_live_weather
from app.simulation import engine

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

@router.get("", response_model=List[TelemetryReading])
def get_telemetry(
    station_id: Optional[str] = "maitri",
    parameter: Optional[str] = None,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    user = Depends(require_viewer)
):
    query = db.query(Telemetry).filter(Telemetry.station_id == station_id)
    if parameter:
        query = query.filter(Telemetry.parameter == parameter)
    if from_time:
        query = query.filter(Telemetry.timestamp >= from_time)
    if to_time:
        query = query.filter(Telemetry.timestamp <= to_time)
    
    records = query.order_by(Telemetry.timestamp.desc()).limit(limit).all()
    
    if not records:
        # Generate representative recent telemetry from current simulation state
        state = get_current_state(station_id)
        now = datetime.now(timezone.utc)
        items = []
        
        # Values from state
        p_map = {
            "temperature": state["environment"]["temperature"],
            "wind_speed": state["environment"]["wind_speed"],
            "solar_output": state["energy"]["solar_output"],
            "generator_load": state["energy"]["generator_load"],
            "fuel_level": state["fuel"]["current_level"],
            "water_level": state["water"]["storage_liters"],
            "battery_level": state["energy"]["battery_level"],
            "grid_frequency": state["energy"]["grid_frequency"]
        }

        target_params = [parameter] if parameter and parameter in p_map else list(p_map.keys())
        for i in range(min(limit, 30)):
            t = now - timedelta(minutes=i * 5)
            for p in target_params:
                base_v = p_map.get(p, 50.0)
                # Slight variation over time
                var_v = base_v + (0.5 * (i % 5 - 2))
                items.append(TelemetryReading(
                    timestamp=t,
                    parameter=p,
                    value=round(var_v, 2)
                ))
        return items

    return records

@router.get("/live/{station_id}")
def get_live_telemetry_snapshot(
    station_id: str,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    return {
        "station_id": station_id,
        "timestamp": state.get("timestamp"),
        "tick": state.get("tick"),
        "environment": state.get("environment"),
        "energy": state.get("energy"),
        "fuel": state.get("fuel"),
        "water": state.get("water"),
        "equipment": state.get("equipment"),
        "station_ops": state.get("station_ops"),
        "logistics": state.get("logistics"),
        "inventory": state.get("inventory"),
        "telemetry": {
            "temperature": state["environment"]["temperature"],
            "wind_speed": state["environment"]["wind_speed"],
            "wind_gust": state["environment"]["wind_gust"],
            "solar_radiation": state["environment"]["solar_radiation"],
            "storm_severity": state["environment"]["storm_severity"],
            "visibility": state["environment"]["visibility"],
            "condition": state["environment"]["condition"],
            "total_energy_demand": state["energy"]["total_demand"],
            "solar_output": state["energy"]["solar_output"],
            "generator_load": state["energy"]["generator_load"],
            "battery_level": state["energy"]["battery_level"],
            "grid_frequency": state["energy"]["grid_frequency"],
            "fuel_level": state["fuel"]["current_level"],
            "fuel_percentage": state["fuel"]["fuel_percentage"],
            "fuel_consumption_rate": state["fuel"]["consumption_rate_l_per_hr"],
            "days_fuel_remaining": state["fuel"]["days_remaining"],
            "water_storage_liters": state["water"]["storage_liters"],
            "water_percentage": state["water"].get("percentage", 85.0),
            "water_pipe_temp": state["water"]["pipe_temp_c"],
            "freeze_risk": state["water"]["freeze_risk"],
            "overall_readiness": state["station_ops"]["overall_readiness"],
            "status_band": state["station_ops"]["status_band"]
        }
    }

@router.get("/weather/{station_id}")
def get_station_weather(
    station_id: str
):
    """
    Fetches real-time weather and 24h forecast from MET Norway API
    for Antarctic research stations (Maitri and Bharati).
    Attribution: Weather data from the Norwegian Meteorological Institute
    """
    data = fetch_live_met_weather(station_id)
    if station_id in engine.station_states:
        engine.station_states[station_id] = apply_live_weather(engine.station_states[station_id], data)
    return data

@router.post("/weather/{station_id}/refresh")
def refresh_station_weather(
    station_id: str
):
    """
    Forces a fresh fetch from the MET Norway API (respecting fair-use limits)
    and propagates live temperature, wind, and pressure through the simulation cascade.
    """
    data = fetch_live_met_weather(station_id, force_refresh=True)
    if station_id in engine.station_states:
        engine.station_states[station_id] = apply_live_weather(engine.station_states[station_id], data)
    return data

@router.get("/logistics/{station_id}")
def get_station_logistics(
    station_id: str,
    user = Depends(require_viewer)
):
    """
    Returns the real-time logistics, convoy fleet, inbound cargo,
    and route waypoint progression for the specified station.
    """
    state = get_current_state(station_id)
    return state.get("logistics", {})

@router.get("/inventory/{station_id}")
def get_station_inventory(
    station_id: str,
    user = Depends(require_viewer)
):
    """
    Returns the real-time physical inventory catalog, storage locations,
    depletion curves, threshold alerts, and maintenance job staging.
    """
    state = get_current_state(station_id)
    return state.get("inventory", {})

