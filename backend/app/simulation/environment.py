import math
import random

# In-memory baseline of latest real-time weather from MET Norway API
_live_weather_baseline: dict = {}

def init_environment_state(station_id: str) -> dict:
    base = _live_weather_baseline.get(station_id, {})
    if station_id == "maitri":
        # Inland: colder, high katabatic winds
        return {
            "temperature": base.get("temperature", -22.4),       # °C (MET Norway default)
            "wind_speed": base.get("wind_speed", 28.4),          # km/h
            "wind_gust": base.get("wind_gust", 38.0),           # km/h
            "solar_radiation": base.get("solar_radiation", 145.0),# W/m2
            "visibility": 15.0,         # km
            "storm_severity": 0.15,     # 0.0 - 1.0
            "condition": base.get("condition", "Partly Cloudy"),
            "blizzard_active": False,
            "humidity": base.get("humidity", 34.0),             # %
            "pressure": base.get("pressure", 984.0),
            "wind_direction": base.get("wind_direction", 153.0)
        }
    else:
        # Bharati: coastal, maritime polar
        return {
            "temperature": base.get("temperature", -19.6),
            "wind_speed": base.get("wind_speed", 14.0),
            "wind_gust": base.get("wind_gust", 22.0),
            "solar_radiation": base.get("solar_radiation", 95.0),
            "visibility": 20.0,
            "storm_severity": 0.10,
            "condition": base.get("condition", "Partly Cloudy"),
            "blizzard_active": False,
            "humidity": base.get("humidity", 65.0),
            "pressure": base.get("pressure", 983.0),
            "wind_direction": base.get("wind_direction", 182.0)
        }

def step(state: dict, perturbation: dict = None) -> dict:
    env = dict(state.get("environment", {}))
    st_id = state.get("station_id", "maitri")
    base = _live_weather_baseline.get(st_id, {})
    
    # Anchor to live weather baseline with realistic micro-jitter (+/- 0.15°C)
    base_temp = base.get("temperature", env.get("temperature", -22.4 if st_id == "maitri" else -19.6))
    micro_jitter = random.uniform(-0.15, 0.15)
    env["temperature"] = round(base_temp + micro_jitter, 1)
    
    # Wind dynamics
    base_wind = base.get("wind_speed", env.get("wind_speed", 28.4 if st_id == "maitri" else 14.0))
    wind_drift = random.uniform(-1.0, 1.0)
    env["wind_speed"] = max(2.0, round(base_wind + wind_drift, 1))
    env["wind_gust"] = base.get("wind_gust", round(env["wind_speed"] * random.uniform(1.25, 1.4), 1))
    
    # Solar radiation with day/cloud fluctuation
    cloud_factor = 1.0 - (env.get("storm_severity", 0.1) * 0.75)
    base_solar = base.get("solar_radiation", 95.0 if st_id == "bharati" else 145.0)
    solar_var = random.uniform(-5.0, 5.0)
    env["solar_radiation"] = max(0.0, round((base_solar + solar_var) * cloud_factor, 1))
    
    # Storm severity
    if env["wind_speed"] > 70.0:
        env["storm_severity"] = min(1.0, round(env.get("storm_severity", 0.2) + 0.05, 2))
        env["blizzard_active"] = True
        env["condition"] = "Severe Blizzard"
        env["visibility"] = max(0.1, round(env.get("visibility", 10.0) * 0.7, 1))
    elif env["wind_speed"] > 45.0:
        env["storm_severity"] = min(0.6, round(env.get("storm_severity", 0.1) + 0.02, 2))
        env["blizzard_active"] = False
        env["condition"] = "High Winds / Drifting Snow"
        env["visibility"] = round(min(12.0, max(2.0, env.get("visibility", 10.0))), 1)
    else:
        env["storm_severity"] = max(0.05, round(env.get("storm_severity", 0.1) - 0.01, 2))
        env["blizzard_active"] = False
        env["condition"] = base.get("condition", env.get("condition", "Partly Cloudy"))
        env["visibility"] = round(min(25.0, env.get("visibility", 15.0) + 0.5), 1)

    # Apply scenario perturbation if active
    if perturbation and perturbation.get("type") == "storm":
        env["storm_severity"] = min(1.0, env["storm_severity"] + perturbation.get("intensity", 0.4))
        env["wind_speed"] = max(85.0, env["wind_speed"] + 35.0)
        env["wind_gust"] = env["wind_speed"] * 1.45
        env["temperature"] -= 6.5
        env["visibility"] = 0.2
        env["blizzard_active"] = True
        env["condition"] = "Major Antarctic Storm (What-If)"
        env["solar_radiation"] = round(env["solar_radiation"] * 0.15, 1)

    if perturbation and perturbation.get("type") == "extreme_cold":
        env["temperature"] -= perturbation.get("drop_c", 15.0)
        env["condition"] = "Extreme Polar Freeze Wave"

    state["environment"] = env
    return state

def apply_live_weather(state: dict, live_weather: dict) -> dict:
    """
    Feeds real live weather from MET Norway API into the Environment state.
    Directly cascades into Energy (heating demand), Fuel (genset load),
    Water (freeze risk), and Logistics (traverse feasibility).
    """
    global _live_weather_baseline
    env = dict(state.get("environment", {}))
    st_id = state.get("station_id", "maitri")
    curr = live_weather.get("current", {})
    if curr:
        t_val = float(curr.get("temperature", env.get("temperature", -22.4)))
        w_val = float(curr.get("wind_speed_kmh", env.get("wind_speed", 28.4)))
        g_val = float(curr.get("wind_gust_kmh", env.get("wind_gust", 38.0)))
        h_val = float(curr.get("humidity", env.get("humidity", 34.0)))
        p_val = float(curr.get("pressure", env.get("pressure", 984.0)))
        d_val = float(curr.get("wind_direction", env.get("wind_direction", 153.0)))
        s_val = float(curr.get("solar_radiation", env.get("solar_radiation", 145.0)))
        c_val = str(curr.get("condition", env.get("condition", "Partly Cloudy")))

        _live_weather_baseline[st_id] = {
            "temperature": t_val,
            "wind_speed": w_val,
            "wind_gust": g_val,
            "humidity": h_val,
            "pressure": p_val,
            "wind_direction": d_val,
            "solar_radiation": s_val,
            "condition": c_val
        }

        env["temperature"] = t_val
        env["wind_speed"] = w_val
        env["wind_gust"] = g_val
        env["humidity"] = h_val
        env["pressure"] = p_val
        env["wind_direction"] = d_val
        env["solar_radiation"] = s_val
        env["cloud_cover"] = float(curr.get("cloud_cover", 30.0))
        env["condition"] = c_val
        env["blizzard_active"] = bool(curr.get("blizzard_active", False))
        env["weather_source"] = live_weather.get("source", "live_met_norway")
        env["weather_attribution"] = live_weather.get("attribution", "Weather data from the Norwegian Meteorological Institute")
        env["weather_updated_at"] = live_weather.get("updated_at")
    state["environment"] = env
    return state

