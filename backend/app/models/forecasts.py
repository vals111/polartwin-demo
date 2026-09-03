import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Forecast(Base):
    __tablename__ = "forecasts"

    forecast_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    domain = Column(String(64), nullable=False, index=True) # e.g. 'fuel', 'energy', 'water', 'equipment'
    horizon = Column(Integer, nullable=False) # forecast steps ahead
    value = Column(Float, nullable=False)
    confidence_low = Column(Float, nullable=False)
    confidence_high = Column(Float, nullable=False)

    station = relationship("Station", back_populates="forecasts")

    __table_args__ = (
        Index("idx_forecast_station_domain", "station_id", "domain"),
    )
