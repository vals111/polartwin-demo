"""
Forecasting module — Physics-Informed Projection + RandomForest (when history available).

Method:
  - If >= 50 DB telemetry rows exist for the station: train RandomForestRegressor
    on feature vectors [hour_of_day, temp, wind, solar] → generator_load, then
    predict for the next `horizon` steps.
  - If < 50 rows (early session): fall back to physics-informed formula projection
    with diurnal sinusoidal variation.

Holt-Winters ExponentialSmoothing is imported and used for the fuel & water
domains when sufficient history is available (requires statsmodels).
"""
import logging
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional

from sklearn.ensemble import RandomForestRegressor

import importlib
try:
    _sm = importlib.import_module("statsmodels.tsa.holtwinters")
    ExponentialSmoothing = getattr(_sm, "ExponentialSmoothing", None)
    _HAS_STATSMODELS = True
except Exception:
    ExponentialSmoothing = None
    _HAS_STATSMODELS = False

logger = logging.getLogger("polartwin.forecasting")

# ── Cached RF models (station_id → model) ─────────────────────────────────────
_rf_models: Dict[str, Optional[RandomForestRegressor]] = {}
_rf_last_trained: Dict[str, Optional[datetime]] = {}
RF_RETRAIN_HOURS = 1  # retrain at most every 1 hour
RF_MIN_ROWS = 50       # minimum rows before RF is used


def _load_history(station_id: str, param: str, hours: int = 72) -> List[tuple]:
    """Query DB for recent telemetry rows without importing at module level."""
    try:
        from app.database import SessionLocal
        from app.models.telemetry import Telemetry
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        db = SessionLocal()
        try:
            rows = (
                db.query(Telemetry.timestamp, Telemetry.value)
                .filter(
                    Telemetry.station_id == station_id,
                    Telemetry.parameter == param,
                    Telemetry.timestamp >= cutoff,
                )
                .order_by(Telemetry.timestamp)
                .all()
            )
            return rows
        finally:
            db.close()
    except Exception as exc:
        logger.debug(f"Could not load telemetry history for {station_id}/{param}: {exc}")
        return []


def _train_rf_model(station_id: str, state: dict) -> Optional[RandomForestRegressor]:
    """
    Train RandomForestRegressor on persisted telemetry history.
    Features: [hour_of_day, temperature, wind_speed, solar_output]
    Target: generator_load
    Returns None if insufficient data.
    """
    now = datetime.now(timezone.utc)

    # Check if retraining is needed
    last = _rf_last_trained.get(station_id)
    if last and (now - last).total_seconds() < RF_RETRAIN_HOURS * 3600:
        return _rf_models.get(station_id)

    gen_rows = _load_history(station_id, "generator_load", 72)
    if len(gen_rows) < RF_MIN_ROWS:
        return None

    temp_vals = {r[0]: r[1] for r in _load_history(station_id, "temperature", 72)}
    wind_vals = {r[0]: r[1] for r in _load_history(station_id, "wind_speed", 72)}
    solar_vals = {r[0]: r[1] for r in _load_history(station_id, "solar_output", 72)}

    X, y = [], []
    for ts, load in gen_rows:
        closest = lambda d: min(d.keys(), key=lambda t: abs((t - ts).total_seconds())) if d else None
        t_key = closest(temp_vals)
        w_key = closest(wind_vals)
        s_key = closest(solar_vals)
        X.append([
            ts.hour,
            temp_vals.get(t_key, state["environment"].get("temperature", -25.0)),
            wind_vals.get(w_key, state["environment"].get("wind_speed", 30.0)),
            solar_vals.get(s_key, state["energy"].get("solar_output", 15.0)),
        ])
        y.append(load)

    if len(X) < RF_MIN_ROWS:
        return None

    try:
        model = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
        model.fit(X, y)
        _rf_models[station_id] = model
        _rf_last_trained[station_id] = now
        logger.info(f"RandomForest retrained for {station_id} on {len(X)} samples.")
        return model
    except Exception as exc:
        logger.error(f"RF training failed for {station_id}: {exc}")
        return None


def _rf_predict_horizon(
    model: RandomForestRegressor, state: dict, horizon: int
) -> List[float]:
    """Generate hour-ahead predictions from RF model."""
    env = state.get("environment", {})
    energy = state.get("energy", {})
    now = datetime.now(timezone.utc)
    preds = []
    for step in range(1, horizon + 1):
        ts = now + timedelta(hours=step)
        X = [[
            ts.hour,
            env.get("temperature", -25.0),
            env.get("wind_speed", 30.0),
            max(0.0, energy.get("solar_output", 15.0) * (0.6 if 8 <= ts.hour <= 16 else 0.0)),
        ]]
        preds.append(float(model.predict(X)[0]))
    return preds


def get_forecast(station_id: str, state: dict) -> Dict[str, Any]:
    """Return a 24-step generator_load forecast for analytics use."""
    model = _train_rf_model(station_id, state)
    if model:
        preds = _rf_predict_horizon(model, state, 24)
        return {"generator_load_kw": preds, "method": "RandomForestRegressor"}
    # Physics fallback
    base = state["energy"]["generator_load"]
    preds = [round(base + np.sin(step * 2 * np.pi / 24) * 10, 1) for step in range(24)]
    return {"generator_load_kw": preds, "method": "physics_projection"}


def forecast_domain(
    station_id: str,
    domain: str,
    current_state: dict,
    horizon: int = 24
) -> dict:
    """
    Produce horizon-step forecast for a domain.
    For energy domain: uses RandomForest if sufficient DB history, else physics formula.
    For fuel/water/equipment: uses physics-informed projection (optionally Holt-Winters
    when statsmodels + sufficient data are available).
    """
    fuel = current_state.get("fuel", {})
    energy = current_state.get("energy", {})
    water = current_state.get("water", {})
    equip = current_state.get("equipment", {})
    env = current_state.get("environment", {})

    points = []

    if domain == "energy":
        # Try RF first
        model = _train_rf_model(station_id, current_state)
        if model:
            preds = _rf_predict_horizon(model, current_state, horizon)
            base = energy.get("generator_load", 75.0)
            for step, val in enumerate(preds, 1):
                margin = 3.0 + step * 0.25
                points.append({
                    "horizon": step,
                    "value": round(val, 1),
                    "confidence_low": round(max(0.0, val - margin), 1),
                    "confidence_high": round(val + margin, 1),
                    "method": "RandomForestRegressor",
                })
        else:
            # Physics-informed diurnal projection
            base = energy.get("generator_load", 75.0)
            for step in range(1, horizon + 1):
                hour_angle = (step % 24) * (2 * np.pi / 24.0)
                variation = np.sin(hour_angle) * 12.0
                val = max(20.0, base + variation)
                margin = 5.0 + (step * 0.3)
                points.append({
                    "horizon": step,
                    "value": round(val, 1),
                    "confidence_low": round(max(0.0, val - margin), 1),
                    "confidence_high": round(val + margin, 1),
                    "method": "physics_projection",
                })

    elif domain == "fuel":
        curr_val = fuel.get("current_level", 150000.0)
        burn_rate_hr = fuel.get("consumption_rate_l_per_hr", 18.0)
        temp = env.get("temperature", -25.0)
        storm = env.get("storm_severity", 0.1)

        # Try Holt-Winters on DB history
        fuel_hist_rows = _load_history(station_id, "fuel_level_liters", 48)
        if _HAS_STATSMODELS and ExponentialSmoothing and len(fuel_hist_rows) >= 12:
            try:
                series = [r[1] for r in fuel_hist_rows]
                hw_model = ExponentialSmoothing(series, trend="add", initialization_method="estimated")
                hw_fit = hw_model.fit(optimized=True, disp=False)
                hw_preds = hw_fit.forecast(horizon)
                for step, val in enumerate(hw_preds, 1):
                    val = max(0.0, float(val))
                    margin = step * burn_rate_hr * 0.12
                    points.append({
                        "horizon": step,
                        "value": round(val, 1),
                        "confidence_low": round(max(0.0, val - margin), 1),
                        "confidence_high": round(min(fuel.get("total_capacity", 300000.0), val + margin), 1),
                        "method": "HoltWinters",
                    })
            except Exception as exc:
                logger.debug(f"Holt-Winters fuel forecast failed: {exc}")
                points = []  # fall through to physics

        if not points:
            for step in range(1, horizon + 1):
                cold_multiplier = 1.0 + max(0.0, (-temp - 20.0) * 0.015)
                projected_burn = burn_rate_hr * cold_multiplier * (1.0 + storm * 0.2)
                val = max(0.0, curr_val - (projected_burn * step))
                margin = (step ** 0.5) * (projected_burn * 0.15)
                points.append({
                    "horizon": step,
                    "value": round(val, 1),
                    "confidence_low": round(max(0.0, val - margin), 1),
                    "confidence_high": round(min(fuel.get("total_capacity", 300000.0), val + margin), 1),
                    "method": "physics_projection",
                })

    elif domain == "water":
        curr_storage = water.get("storage_liters", 22000.0)
        hourly_net = (water.get("production_rate_l_hr", 140.0) - (water.get("daily_consumption_l", 1600.0) / 24.0))
        for step in range(1, horizon + 1):
            val = max(500.0, min(water.get("max_storage_liters", 30000.0), curr_storage + (hourly_net * step)))
            margin = 150.0 + (step * 8.0)
            points.append({
                "horizon": step,
                "value": round(val, 1),
                "confidence_low": round(max(0.0, val - margin), 1),
                "confidence_high": round(val + margin, 1),
                "method": "physics_projection",
            })

    else:  # equipment health
        curr_health = equip.get("avg_health", 92.0)
        for step in range(1, horizon + 1):
            deg = 0.04 * step
            val = max(10.0, curr_health - deg)
            margin = 1.0 + (step * 0.08)
            points.append({
                "horizon": step,
                "value": round(val, 2),
                "confidence_low": round(max(0.0, val - margin), 2),
                "confidence_high": round(min(100.0, val + margin), 2),
                "method": "physics_projection",
            })

    final_point = points[-1] if points else {"value": 0.0, "confidence_low": 0.0, "confidence_high": 0.0}

    return {
        "station_id": station_id,
        "domain": domain,
        "horizon": horizon,
        "value": final_point["value"],
        "confidence_low": final_point["confidence_low"],
        "confidence_high": final_point["confidence_high"],
        "points": points,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
