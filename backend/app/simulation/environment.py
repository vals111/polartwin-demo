import math
import random

def init_environment_state(station_id: str) -> dict:
    if station_id == "maitri":
        # Inland: colder, high katabatic winds
        return {
            "temperature": -28.5,       # °C
            "wind_speed": 34.0,         # km/h
            "wind_gust": 48.0,          # km/h
            "solar_radiation": 180.0,   # W/m2
            "visibility": 15.0,         # km
            "storm_severity": 0.15,     # 0.0 - 1.0
            "condition": "Partly Cloudy",
            "blizzard_active": False,
            "humidity": 68.0            # %
        }
    else:
        # Bharati: coastal, maritime polar, milder temp but variable coastal storms
        return {
            "temperature": -18.2,
            "wind_speed": 28.0,
            "wind_gust": 42.0,
            "solar_radiation": 220.0,
            "visibility": 20.0,
            "storm_severity": 0.10,
            "condition": "Clear Polar Day",
            "blizzard_active": False,
            "humidity": 75.0
        }

def step(state: dict, perturbation: dict = None) -> dict:
    env = dict(state.get("environment", {}))
    st_id = state.get("station_id", "maitri")
    
    # Base diurnal/random drift
    drift = random.uniform(-0.4, 0.4)
    env["temperature"] = round(env.get("temperature", -25.0) + drift, 2)
    
    # Wind dynamics
    wind_drift = random.uniform(-1.5, 1.5)
    env["wind_speed"] = max(2.0, round(env.get("wind_speed", 30.0) + wind_drift, 1))
    env["wind_gust"] = round(env["wind_speed"] * random.uniform(1.25, 1.5), 1)
    
    # Solar radiation with day/cloud fluctuation
    cloud_factor = 1.0 - (env.get("storm_severity", 0.1) * 0.75)
    base_solar = 250.0 if st_id == "bharati" else 210.0
    solar_var = random.uniform(-10.0, 10.0)
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
        env["condition"] = "Clear / Sub-zero Calm"
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
    env = dict(state.get("environment", {}))
    curr = live_weather.get("current", {})
    if curr:
        env["temperature"] = float(curr.get("temperature", env.get("temperature", -25.0)))
        env["wind_speed"] = float(curr.get("wind_speed_kmh", env.get("wind_speed", 30.0)))
        env["wind_gust"] = float(curr.get("wind_gust_kmh", env.get("wind_gust", 45.0)))
        env["humidity"] = float(curr.get("humidity", env.get("humidity", 65.0)))
        env["pressure"] = float(curr.get("pressure", env.get("pressure", 985.0)))
        env["wind_direction"] = float(curr.get("wind_direction", env.get("wind_direction", 180.0)))
        env["solar_radiation"] = float(curr.get("solar_radiation", env.get("solar_radiation", 180.0)))
        env["cloud_cover"] = float(curr.get("cloud_cover", 30.0))
        env["condition"] = str(curr.get("condition", env.get("condition", "Partly Cloudy")))
        env["blizzard_active"] = bool(curr.get("blizzard_active", False))
        env["weather_source"] = live_weather.get("source", "live_met_norway")
        env["weather_attribution"] = live_weather.get("attribution", "Weather data from the Norwegian Meteorological Institute")
        env["weather_updated_at"] = live_weather.get("updated_at")
    state["environment"] = env
    return state

