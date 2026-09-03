import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    severity = Column(String(32), nullable=False) # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    message = Column(String(512), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    station = relationship("Station", back_populates="alerts")

    __table_args__ = (
        Index("idx_alert_station_time", "station_id", "timestamp"),
    )

class Risk(Base):
    __tablename__ = "risks"

    risk_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    score = Column(Float, nullable=False) # 0-100
    level = Column(String(32), nullable=False) # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    station = relationship("Station", back_populates="risks")

    __table_args__ = (
        Index("idx_risk_station_time", "station_id", "timestamp"),
    )
