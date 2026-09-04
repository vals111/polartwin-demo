from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, ConfigDict

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
    model_config = ConfigDict(from_attributes=True)

    station_id: str
    name: str
    location_type: str

class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    station_id: str
    type: str
    name: str

class EquipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    equipment_id: str
    asset_id: str
    health_score: float
    status: Optional[str] = "operational"

# Telemetry & Resources
class TelemetryReading(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    parameter: str
    value: float

class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: str
    level: float

class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_id: str
    category: str
    quantity: float

# Alerts & Risks
class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: str
    severity: str
    message: str
    timestamp: datetime

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
