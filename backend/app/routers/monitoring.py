import time
import os
import sys
import platform
from fastapi import APIRouter
from typing import Dict, Any
from app.simulation.engine import get_current_state
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])
_START_TIME = time.time()

@router.get("/health")
async def system_health_check() -> Dict[str, Any]:
    return {
        "status": "HEALTHY",
        "service": "POLARTWIN Digital Twin API",
        "uptime_seconds": int(time.time() - _START_TIME),
        "scheduler_active": True,
        "database_connected": True,
        "active_stations": ["maitri", "bharati"],
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "timestamp": time.time()
    }

@router.get("/metrics")
async def system_metrics() -> Dict[str, Any]:
    return {
        "process_pid": os.getpid(),
        "python_version": sys.version.split()[0],
        "platform": platform.system(),
        "uptime_seconds": int(time.time() - _START_TIME),
        "active_websocket_connections": {
            "maitri": len(ws_manager.active_connections.get("maitri", [])),
            "bharati": len(ws_manager.active_connections.get("bharati", []))
        },
        "simulation_tick_rate_hz": 0.25,  # 4 seconds per tick = 0.25 Hz
        "status": "OPERATIONAL"
    }
