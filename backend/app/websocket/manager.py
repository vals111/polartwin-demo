import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger("polartwin.websocket")

class ConnectionManager:
    def __init__(self):
        # Maps station_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Global channels for alerts and risk
        self.global_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, station_id: str):
        await websocket.accept()
        if station_id not in self.active_connections:
            self.active_connections[station_id] = []
        self.active_connections[station_id].append(websocket)
        logger.info(f"WebSocket client connected to station '{station_id}'. Total clients: {len(self.active_connections[station_id])}")

    def disconnect(self, websocket: WebSocket, station_id: str):
        if station_id in self.active_connections:
            if websocket in self.active_connections[station_id]:
                self.active_connections[station_id].remove(websocket)
        logger.info(f"WebSocket client disconnected from station '{station_id}'")

    async def broadcast(self, station_id: str, event_type: str, payload: Any):
        """
        Broadcast an event to all connected clients for a specific station.
        """
        if station_id not in self.active_connections:
            return

        message = {
            "type": event_type,
            "station_id": station_id,
            "data": payload
        }
        text_data = json.dumps(message)

        dead_connections = []
        for connection in self.active_connections[station_id]:
            try:
                await connection.send_text(text_data)
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead, station_id)

ws_manager = ConnectionManager()
