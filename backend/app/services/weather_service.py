"""
Norwegian Meteorological Institute (MET Norway) Live Weather Integration Service
Provides real-time observations and forecasts for Antarctic research stations (Maitri and Bharati).

API Specifications:
- Endpoint: https://api.met.no/weatherapi/locationforecast/2.0/compact
- User-Agent: POLARTWIN-Project/1.0 (antarctic-research@polartwin.org)
- Attribution: Weather data from the Norwegian Meteorological Institute
- Fair use caching: 10 minutes TTL
"""

import time
import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("polartwin.weather")

STATION_COORDINATES = {
    "maitri": {
        "name": "Maitri Station",
        "latitude": -70.766667,
        "longitude": 11.731944,
        "elevation_m": 130,
        "region": "Schirmacher Oasis, Queen Maud Land"
    },
    "bharati": {
        "name": "Bharati Station",
        "latitude": -69.40803,
        "longitude": 76.187361,
        "elevation_m": 35,
        "region": "Larsemann Hills, Prydz Bay"
    }
}

USER_AGENT = "POLARTWIN-Project/1.0 (antarctic-research@polartwin.org)"
CACHE_TTL_SECONDS = 600  # 10 minutes cache as recommended by MET Norway fair use

# In-memory weather cache
_weather_cache: Dict[str, Dict[str, Any]] = {}
_cache_timestamps: Dict[str, float] = {}

def _map_symbol_to_condition(symbol_code: str) -> str:
    """Translate MET Norway symbol_code into an operational condition description."""
    mapping = {
        "clearsky_day": "Clear Polar Day",
        "clearsky_night": "Clear Polar Night",
        "fair_day": "Fair Polar Sky",
        "fair_night": "Fair Conditions",
        "partlycloudy_day": "Partly Cloudy",
        "partlycloudy_night": "Partly Cloudy",
        "cloudy": "Overcast Antarctic Cloud",
        "lightrain": "Light Freezing Rain",
        "rain": "Freezing Rain",
        "heavyrain": "Heavy Freezing Rain",
        "rainandthunder": "Severe Storm / Rain",
        "lightsnow": "Light Powder Snow",
        "snow": "Steady Antarctic Snowfall",
        "heavysnow": "Heavy Blizzard Snowfall",
        "snowandthunder": "Severe Blizzard Electrical Storm",
        "fog": "Dense Polar Sea Smoke / Fog",
        "lightsleet": "Light Sleet",
        "sleet": "Polar Sleet",
        "heavysleet": "Heavy Sleet"
    }
    # Clean suffix like '_day' or '_polartwilight'
    base = symbol_code.split("_")[0] if "_" in symbol_code else symbol_code
    return mapping.get(symbol_code, mapping.get(base, symbol_code.replace("_", " ").title()))

def fetch_live_met_weather(station_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches real-time weather and 24h forecast from the MET Norway API.
    Respects rate limits with 10-minute caching and returns realistic fallbacks if network fails.
    """
    st_id = station_id.lower()
    coords = STATION_COORDINATES.get(st_id, STATION_COORDINATES["maitri"])
    now = time.time()

    # Check cache freshness
    if not force_refresh and st_id in _weather_cache:
        age = now - _cache_timestamps.get(st_id, 0)
        if age < CACHE_TTL_SECONDS:
            cached = dict(_weather_cache[st_id])
            cached["cached_age_seconds"] = round(age, 1)
            cached["is_cached"] = True
            return cached

    url = (
        f"https://api.met.no/weatherapi/locationforecast/2.0/compact"
        f"?lat={coords['latitude']}&lon={coords['longitude']}"
    )
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        raw = response.json()

        timeseries = raw.get("properties", {}).get("timeseries", [])
        if not timeseries:
            raise ValueError("No timeseries returned from MET Norway API")

        current_entry = timeseries[0]
        details = current_entry.get("data", {}).get("instant", {}).get("details", {})
        next_1h = current_entry.get("data", {}).get("next_1_hours", {})
        symbol_code = next_1h.get("summary", {}).get("symbol_code", "partlycloudy_day")

        temp = float(details.get("air_temperature", -25.0))
        wind_ms = float(details.get("wind_speed", 8.0))
        wind_kmh = round(wind_ms * 3.6, 1)
        wind_gust_kmh = round(wind_kmh * 1.35, 1)
        wind_dir = float(details.get("wind_from_direction", 180.0))
        humidity = float(details.get("relative_humidity", 65.0))
        pressure = float(details.get("air_pressure_at_sea_level", 985.0))
        cloud_cover = float(details.get("cloud_area_fraction", 30.0))
        condition = _map_symbol_to_condition(symbol_code)

        # Derived polar solar radiation (accounting for cloud obstruction)
        solar_max = 240.0 if st_id == "bharati" else 200.0
        solar_radiation = max(0.0, round(solar_max * (1.0 - (cloud_cover / 100.0) * 0.75), 1))

        # Build 24-hour hourly forecast
        forecast_24h = []
        for entry in timeseries[:24]:
            t_str = entry.get("time")
            d = entry.get("data", {}).get("instant", {}).get("details", {})
            sym = entry.get("data", {}).get("next_1_hours", {}).get("summary", {}).get("symbol_code", symbol_code)
            w_ms = float(d.get("wind_speed", wind_ms))
            forecast_24h.append({
                "time": t_str,
                "temperature": float(d.get("air_temperature", temp)),
                "wind_speed_kmh": round(w_ms * 3.6, 1),
                "wind_speed_ms": w_ms,
                "wind_direction": float(d.get("wind_from_direction", wind_dir)),
                "humidity": float(d.get("relative_humidity", humidity)),
                "pressure": float(d.get("air_pressure_at_sea_level", pressure)),
                "cloud_cover": float(d.get("cloud_area_fraction", cloud_cover)),
                "symbol_code": sym,
                "condition": _map_symbol_to_condition(sym)
            })

        result = {
            "station_id": st_id,
            "station_name": coords["name"],
            "coordinates": {
                "latitude": coords["latitude"],
                "longitude": coords["longitude"],
                "elevation_m": coords["elevation_m"]
            },
            "source": "live_met_norway",
            "provider": "Norwegian Meteorological Institute",
            "attribution": "Weather data from the Norwegian Meteorological Institute",
            "api_endpoint": url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_cached": False,
            "current": {
                "temperature": temp,
                "wind_speed_kmh": wind_kmh,
                "wind_speed_ms": wind_ms,
                "wind_gust_kmh": wind_gust_kmh,
                "wind_direction": wind_dir,
                "humidity": humidity,
                "pressure": pressure,
                "cloud_cover": cloud_cover,
                "solar_radiation": solar_radiation,
                "symbol_code": symbol_code,
                "condition": condition,
                "blizzard_active": wind_kmh > 70.0
            },
            "forecast_24h": forecast_24h
        }

        # Update cache
        _weather_cache[st_id] = result
        _cache_timestamps[st_id] = now
        logger.info(f"Successfully fetched live MET Norway weather for {coords['name']}: {temp}°C, {wind_kmh} km/h")
        return result

    except Exception as e:
        logger.warning(f"MET Norway API request failed for {st_id}: {e}. Utilizing cached or simulation fallback.")
        if st_id in _weather_cache:
            cached = dict(_weather_cache[st_id])
            cached["source"] = "cached_fallback"
            cached["warning"] = f"Live fetch failed: {str(e)}"
            return cached

        # Synthetic fallback
        default_temp = -28.5 if st_id == "maitri" else -18.2
        default_wind = 34.0 if st_id == "maitri" else 28.0
        return {
            "station_id": st_id,
            "station_name": coords["name"],
            "coordinates": {
                "latitude": coords["latitude"],
                "longitude": coords["longitude"],
                "elevation_m": coords["elevation_m"]
            },
            "source": "simulation_fallback",
            "provider": "Norwegian Meteorological Institute (Fallback)",
            "attribution": "Weather data from the Norwegian Meteorological Institute",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_cached": False,
            "current": {
                "temperature": default_temp,
                "wind_speed_kmh": default_wind,
                "wind_speed_ms": round(default_wind / 3.6, 1),
                "wind_gust_kmh": round(default_wind * 1.4, 1),
                "wind_direction": 220.0 if st_id == "maitri" else 310.0,
                "humidity": 68.0,
                "pressure": 985.0,
                "cloud_cover": 30.0,
                "solar_radiation": 190.0,
                "symbol_code": "partlycloudy_day",
                "condition": "Partly Cloudy (Simulated)",
                "blizzard_active": False
            },
            "forecast_24h": []
        }
