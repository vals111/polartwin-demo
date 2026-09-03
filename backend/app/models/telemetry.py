from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from app.database import Base

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    asset_id = Column(String(64), ForeignKey("assets.asset_id"), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    parameter = Column(String(64), nullable=False, index=True)
    value = Column(Float, nullable=False)

    __table_args__ = (
        Index("idx_station_param_time", "station_id", "parameter", "timestamp"),
    )
