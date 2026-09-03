import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

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

# Ensure database and seeds are initialized
try:
    init_db_and_seed()
except Exception as e:
    logger.warning(f"Initial DB check warning: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing POLARTWIN Database and Domain Models...")
    init_db_and_seed()
    
    # Warm up state for both stations
    get_current_state("maitri")
    get_current_state("bharati")

    # Start simulation scheduler
    logger.info(f"Starting Simulation Engine (Interval: {settings.SIMULATION_TICK_SECONDS}s)...")
    scheduler.add_job(simulation_tick_job, "interval", seconds=settings.SIMULATION_TICK_SECONDS)
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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

# WebSocket Endpoint per Section 11
@app.websocket("/ws/{station_id}")
async def websocket_station_endpoint(websocket: WebSocket, station_id: str):
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
            # Listen for client messages / ping / requests
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, station_id)
    except Exception as e:
        logger.warning(f"WebSocket client error on {station_id}: {e}")
        ws_manager.disconnect(websocket, station_id)

@app.websocket("/ws/telemetry/{station_id}")
async def ws_telemetry(websocket: WebSocket, station_id: str):
    await websocket_station_endpoint(websocket, station_id)

@app.get("/")
def root_status():
    return {
        "system": "POLARTWIN Digital Twin API",
        "status": "operational",
        "stations": ["maitri", "bharati"],
        "docs_url": "/docs"
    }
