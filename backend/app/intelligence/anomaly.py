import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Any
from sklearn.ensemble import IsolationForest

HARD_LIMITS = {
    "temperature": (-60.0, 10.0),
    "wind_speed": (0.0, 140.0),
    "generator_load": (0.0, 135.0),
    "fuel_consumption_rate": (0.0, 42.0),
    "fuel_percentage": (10.0, 100.0),
    "pipe_temp_c": (0.5, 30.0),
    "battery_level": (20.0, 100.0),
    "grid_frequency": (49.0, 51.0),
    "vibration_mm_s": (0.0, 5.0)
}

# In-memory circular history buffer for telemetry per station
telemetry_history: Dict[str, Dict[str, List[float]]] = {}

def record_history(station_id: str, parameter: str, value: float, max_len: int = 60):
    if station_id not in telemetry_history:
        telemetry_history[station_id] = {}
    if parameter not in telemetry_history[station_id]:
        telemetry_history[station_id][parameter] = []
    
    buf = telemetry_history[station_id][parameter]
    buf.append(value)
    if len(buf) > max_len:
        buf.pop(0)

def assess(station_id: str, parameter: str, value: float) -> dict:
    record_history(station_id, parameter, value)
    history = telemetry_history[station_id][parameter]

    # 1. Rule Check
    rule_flag = False
    explanation = None
    if parameter in HARD_LIMITS:
        min_v, max_v = HARD_LIMITS[parameter]
        if value < min_v:
            rule_flag = True
            explanation = f"Critical Low Violation: {parameter} ({value}) below safe minimum ({min_v})"
        elif value > max_v:
            rule_flag = True
            explanation = f"Critical High Violation: {parameter} ({value}) above safe maximum ({max_v})"

    # 2. Statistical Z-Score
    z_score = 0.0
    statistical_flag = False
    if len(history) >= 10:
        arr = np.array(history)
        mean = np.mean(arr)
        std = np.std(arr)
        if std > 1e-4:
            z_score = float((value - mean) / std)
            statistical_flag = abs(z_score) > 3.0

    # 3. Isolation Forest Check
    iso_flag = False
    if len(history) >= 15:
        try:
            arr = np.array(history).reshape(-1, 1)
            clf = IsolationForest(contamination=0.05, random_state=42)
            clf.fit(arr)
            pred = clf.predict([[value]])[0]
            iso_flag = (pred == -1)
        except Exception:
            iso_flag = False

    # Combined assessment per Section 14:
    # rule_flag OR (statistical_flag AND iso_flag)
    is_anomaly = rule_flag or (statistical_flag and iso_flag)

    if is_anomaly and not explanation:
        explanation = f"Multi-Model Telemetry Outlier: Z-score {z_score:.2f} confirmed by Isolation Forest"

    return {
        "station_id": station_id,
        "parameter": parameter,
        "value": value,
        "is_anomaly": is_anomaly,
        "score": round(min(1.0, max(0.0, abs(z_score) / 4.0 if statistical_flag else (1.0 if rule_flag else 0.0))), 2),
        "z_score": round(z_score, 2),
        "rule_flag": rule_flag,
        "iso_flag": iso_flag,
        "explanation": explanation,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

def scan_state_anomalies(state: dict) -> List[dict]:
    station_id = state.get("station_id", "maitri")
    anomalies = []
    
    # Extract key parameters
    checks = [
        ("temperature", state.get("environment", {}).get("temperature")),
        ("wind_speed", state.get("environment", {}).get("wind_speed")),
        ("generator_load", state.get("energy", {}).get("generator_load")),
        ("fuel_consumption_rate", state.get("fuel", {}).get("consumption_rate_l_per_hr")),
        ("fuel_percentage", state.get("fuel", {}).get("fuel_percentage")),
        ("pipe_temp_c", state.get("water", {}).get("pipe_temp_c")),
        ("battery_level", state.get("energy", {}).get("battery_level")),
        ("grid_frequency", state.get("energy", {}).get("grid_frequency"))
    ]

    for param, val in checks:
        if val is not None:
            res = assess(station_id, param, float(val))
            if res["is_anomaly"]:
                anomalies.append(res)

    return anomalies
