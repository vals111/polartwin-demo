import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends
from app.schemas.all_schemas import AlertOut
from app.simulation.engine import get_current_state
from app.intelligence.anomaly import scan_state_anomalies
from app.intelligence.explainability import explain_alert
from app.deps import require_viewer

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertOut])
def get_alerts(
    station_id: Optional[str] = "maitri",
    severity: Optional[str] = None,
    user = Depends(require_viewer)
):
    state = get_current_state(station_id)
    alerts = []

    # Dynamic alerts from live telemetry conditions
    fuel = state.get("fuel", {})
    if fuel.get("fuel_percentage", 100.0) < 30.0:
        alerts.append(AlertOut(
            alert_id=f"alt_fuel_{station_id}",
            severity="CRITICAL" if fuel.get("fuel_percentage") < 15.0 else "HIGH",
            message=explain_alert("fuel_low", {
                "pct": fuel.get("fuel_percentage"),
                "burn": fuel.get("consumption_rate_l_per_hr"),
                "days": fuel.get("days_remaining")
            }),
            timestamp=datetime.now(timezone.utc)
        ))

    env = state.get("environment", {})
    if env.get("blizzard_active", False) or env.get("wind_speed", 0.0) > 70.0:
        alerts.append(AlertOut(
            alert_id=f"alt_storm_{station_id}",
            severity="HIGH",
            message=explain_alert("blizzard", {
                "storm": env.get("storm_severity", 0.7),
                "wind": env.get("wind_speed")
            }),
            timestamp=datetime.now(timezone.utc)
        ))

    water = state.get("water", {})
    if water.get("freeze_risk") != "Low":
        alerts.append(AlertOut(
            alert_id=f"alt_water_{station_id}",
            severity="CRITICAL" if "CRITICAL" in water.get("freeze_risk") else "MEDIUM",
            message=explain_alert("water_freeze", {
                "pipe_temp": water.get("pipe_temp_c")
            }),
            timestamp=datetime.now(timezone.utc)
        ))

    energy = state.get("energy", {})
    if "Overload" in energy.get("status", "") or "Trip" in energy.get("status", ""):
        alerts.append(AlertOut(
            alert_id=f"alt_energy_{station_id}",
            severity="CRITICAL",
            message=explain_alert("generator_overload", {
                "load": energy.get("generator_load"),
                "temp": env.get("temperature")
            }),
            timestamp=datetime.now(timezone.utc)
        ))

    # Add scan anomalies if any
    anomalies = scan_state_anomalies(state)
    for anom in anomalies:
        alerts.append(AlertOut(
            alert_id=str(uuid.uuid4())[:8],
            severity="HIGH" if anom.get("rule_flag") else "MEDIUM",
            message=anom.get("explanation", f"Anomaly detected in {anom.get('parameter')}"),
            timestamp=datetime.now(timezone.utc)
        ))

    # If no severe alerts, provide nominal watch status
    if not alerts:
        alerts.append(AlertOut(
            alert_id=f"alt_nom_{station_id}",
            severity="LOW",
            message=f"All monitored station parameters within normal operating envelopes for {station_id.capitalize()}.",
            timestamp=datetime.now(timezone.utc)
        ))

    if severity:
        alerts = [a for a in alerts if a.severity.upper() == severity.upper()]

    return alerts
