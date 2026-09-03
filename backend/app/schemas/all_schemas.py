from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr

# Auth
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    email: str

class UserOut(BaseModel):
    user_id: str
    email: str
    role: str

# Station & Assets
class StationOut(BaseModel):
    station_id: str
    name: str
    location_type: str

    class Config:
        from_attributes = True

class AssetOut(BaseModel):
    asset_id: str
    station_id: str
    type: str
    name: str

    class Config:
        from_attributes = True

class EquipmentOut(BaseModel):
    equipment_id: str
    asset_id: str
    health_score: float
    status: Optional[str] = "operational"

    class Config:
        from_attributes = True

# Telemetry & Resources
class TelemetryReading(BaseModel):
    timestamp: datetime
    parameter: str
    value: float

    class Config:
        from_attributes = True

class ResourceOut(BaseModel):
    type: str
    level: float

    class Config:
        from_attributes = True

class InventoryOut(BaseModel):
    item_id: str
    category: str
    quantity: float

    class Config:
        from_attributes = True

# Alerts & Risks
class AlertOut(BaseModel):
    alert_id: str
    severity: str
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ContributingFactor(BaseModel):
    factor: str
    weight: float

class RiskOut(BaseModel):
    station_id: str
    score: float
    level: str
    contributing_factors: List[ContributingFactor]
    timestamp: datetime

# Forecast
class ForecastPoint(BaseModel):
    horizon: int
    value: float
    confidence_low: float
    confidence_high: float

class ForecastResponse(BaseModel):
    station_id: str
    domain: str
    value: float
    confidence_low: float
    confidence_high: float
    points: List[ForecastPoint] = []

# Anomaly
class AnomalyOut(BaseModel):
    parameter: str
    value: float
    score: float
    is_anomaly: bool
    explanation: Optional[str] = None
    timestamp: datetime

# Scenario / What-If
class ScenarioCreate(BaseModel):
    station_id: str
    definition: Dict[str, Any]

class ScenarioResponse(BaseModel):
    scenario_id: str
    station_id: str
    definition: Dict[str, Any]
    result: Dict[str, Any]

# Recommendations
class RecommendationOut(BaseModel):
    action: str
    explanation: str
    priority: str
    domain: Optional[str] = "operations"
