import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import jwt

from app.config import settings
from app.seed import init_db_and_seed
from app.websocket.manager import ws_manager
from app.simulation.engine import run_tick, get_current_state
from app.intelligence.risk_engine import compute_risk
from app.intelligence.anomaly import scan_state_anomalies
from app.intelligence.explainability import explain_risk_score

from app.routers import (
    auth,
    stations,
    telemetry,
    resources,
    equipment,
    alerts,
    forecast,
    anomalies,
    risk,
    scenarios,
    analytics,
    recommendations,
    admin,
    optimization,
    monitoring
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("polartwin.main")

# Sentry Exception Tracking & Performance Monitoring
try:
    import importlib
    sentry_sdk = importlib.import_module("sentry_sdk")
    sentry_fastapi = importlib.import_module("sentry_sdk.integrations.fastapi")
    FastApiIntegration = getattr(sentry_fastapi, "FastApiIntegration", None)
    sentry_dsn = getattr(settings, "SENTRY_DSN", None)
    if sentry_dsn and FastApiIntegration:
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=1.0,
            environment="production"
        )
        logger.info("Sentry monitoring initialized successfully.")
except Exception:
    pass

scheduler = AsyncIOScheduler()

async def simulation_tick_job():
    """
    Periodic background job ticking both Maitri and Bharati,
    evaluating risk & anomalies, and broadcasting over WebSockets.
    """
    for station_id in ["maitri", "bharati"]:
        try:
            # 1. Run simulation tick across all 16 domains
            state = run_tick(station_id)
            
            # 2. Run Intelligence Layer
            risk_data = compute_risk(state)
            anoms = scan_state_anomalies(state)
            
            # 3. Broadcast real-time telemetry update
            await ws_manager.broadcast(station_id, "telemetry_update", {
                "station_id": station_id,
                "timestamp": state["timestamp"],
                "tick": state["tick"],
                "environment": state["environment"],
                "energy": state["energy"],
                "fuel": state["fuel"],
                "water": state["water"],
                "equipment": state["equipment"],
                "station_ops": state["station_ops"]
            })

            # 4. Broadcast risk update
            await ws_manager.broadcast(station_id, "risk_update", {
                "station_id": station_id,
                "score": risk_data["score"],
                "level": risk_data["level"],
                "contributing_factors": risk_data["contributing_factors"],
                "timestamp": risk_data["timestamp"]
            })

            # 5. Broadcast alerts if anomalies detected
            if anoms:
                for anom in anoms:
                    await ws_manager.broadcast(station_id, "alert_new", {
                        "station_id": station_id,
                        "severity": "HIGH" if anom.get("rule_flag") else "MEDIUM",
                        "message": anom.get("explanation", f"Anomaly detected in {anom['parameter']}"),
                        "parameter": anom["parameter"],
                        "timestamp": anom["timestamp"]
                    })
        except Exception as e:
            logger.error(f"Error in simulation tick for station {station_id}: {e}")

# Validate JWT secret before anything else
try:
    settings.validate_secrets()
except RuntimeError as e:
    logger.critical(str(e))
    # Allow startup in local dev with a generated fallback (warn loudly)
    import secrets as _secrets
    _dev_secret = _secrets.token_hex(48)
    settings.JWT_SECRET = _dev_secret
    logger.warning(f"DEV MODE: Generated ephemeral JWT_SECRET for this session. Set JWT_SECRET in .env to persist.")

# Ensure database and seeds are initialized
try:
    init_db_and_seed()
except Exception as e:
    logger.error(f"Initial DB check error: {e}", exc_info=True)

async def weather_sync_job():
    """
    Syncs live real-time Antarctic weather from Norwegian Meteorological Institute (MET Norway)
    every 10 minutes, cascading live temperature, wind, and solar into the simulation engine.
    """
    from app.services.weather_service import fetch_live_met_weather
    from app.simulation.environment import apply_live_weather
    from app.simulation import engine

    for st_id in ["maitri", "bharati"]:
        try:
            weather_data = fetch_live_met_weather(st_id)
            if st_id in engine.station_states:
                engine.station_states[st_id] = apply_live_weather(engine.station_states[st_id], weather_data)
                logger.info(f"Synchronized {st_id} state with live MET Norway weather: {weather_data['current']['temperature']}°C")
        except Exception as e:
            logger.warning(f"Error syncing MET Norway weather for {st_id}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing POLARTWIN Database and Domain Models...")
    init_db_and_seed()
    
    # Warm up state for both stations
    get_current_state("maitri")
    get_current_state("bharati")

    # Initial MET Norway live weather synchronization
    await weather_sync_job()

    # Start simulation scheduler (4s tick) and weather sync (10m interval)
    logger.info(f"Starting Simulation Engine (Interval: {settings.SIMULATION_TICK_SECONDS}s)...")
    scheduler.add_job(simulation_tick_job, "interval", seconds=settings.SIMULATION_TICK_SECONDS)
    scheduler.add_job(weather_sync_job, "interval", minutes=10)
    scheduler.start()
    
    yield
    
    logger.info("Shutting down simulation scheduler...")
    scheduler.shutdown()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="POLARTWIN — Antarctic Research Station Digital Twin (Maitri & Bharati)",
    lifespan=lifespan
)

# CORS — no wildcard; credentials requires explicit origin list
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in settings.CORS_ORIGINS if o != "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers under /api
api_prefix = settings.API_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(stations.router, prefix=api_prefix)
app.include_router(telemetry.router, prefix=api_prefix)
app.include_router(resources.router, prefix=api_prefix)
app.include_router(equipment.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(forecast.router, prefix=api_prefix)
app.include_router(anomalies.router, prefix=api_prefix)
app.include_router(risk.router, prefix=api_prefix)
app.include_router(scenarios.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(recommendations.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(optimization.router, prefix=api_prefix)
app.include_router(monitoring.router, prefix=api_prefix)

# WebSocket Endpoint — requires JWT token query param for authentication
@app.websocket("/ws/{station_id}")
async def websocket_station_endpoint(
    websocket: WebSocket,
    station_id: str,
    token: str = Query(default=""),
):
    # ── Authenticate before accept ───────────────────────────────────────────
    # Pass JWT as query param: /ws/{station_id}?token=<JWT>
    # Anonymous / missing token connections are rejected with code 4001.
    if not token:
        await websocket.close(code=4001)
        logger.warning(f"WS rejected for {station_id}: no token provided")
        return
    try:
        jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as e:
        await websocket.close(code=4001)
        logger.warning(f"WS rejected for {station_id}: invalid token — {e}")
        return

    await ws_manager.connect(websocket, station_id)
    # Send initial state immediately upon connection
    initial_state = get_current_state(station_id)
    initial_risk = compute_risk(initial_state)

    await websocket.send_json({
        "type": "initial_state",
        "station_id": station_id,
        "data": {
            "state": initial_state,
            "risk": initial_risk
        }
    })

    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, station_id)
    except Exception as e:
        logger.warning(f"WebSocket client error on {station_id}: {e}")
        ws_manager.disconnect(websocket, station_id)

@app.websocket("/ws/telemetry/{station_id}")
async def ws_telemetry(websocket: WebSocket, station_id: str, token: str = Query(default="")):
    await websocket_station_endpoint(websocket, station_id, token)

@app.get("/")
def root_status():
    return {
        "system": "POLARTWIN Digital Twin API",
        "status": "operational",
        "stations": ["maitri", "bharati"],
        "docs_url": "/docs"
    }
