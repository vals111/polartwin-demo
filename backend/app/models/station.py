import uuid
from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Station(Base):
    __tablename__ = "stations"

    station_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location_type = Column(String(32), nullable=False) # 'inland' or 'coastal'

    assets = relationship("Asset", back_populates="station", cascade="all, delete-orphan")
    resources = relationship("Resource", back_populates="station", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="station", cascade="all, delete-orphan")
    personnel = relationship("Personnel", back_populates="station", cascade="all, delete-orphan")
    research_ops = relationship("ResearchOperation", back_populates="station", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="station", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="station", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="station", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="station", cascade="all, delete-orphan")
    simulation_runs = relationship("SimulationRun", back_populates="station", cascade="all, delete-orphan")

class Asset(Base):
    __tablename__ = "assets"

    asset_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    type = Column(String(64), nullable=False) # e.g. 'generator', 'building', 'pump_house'
    name = Column(String(128), nullable=False)

    station = relationship("Station", back_populates="assets")
    equipment = relationship("Equipment", back_populates="asset", cascade="all, delete-orphan")

class Equipment(Base):
    __tablename__ = "equipment"

    equipment_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String(64), ForeignKey("assets.asset_id"), nullable=False, index=True)
    health_score = Column(Float, default=100.0) # 0-100

    asset = relationship("Asset", back_populates="equipment")
    maintenance_tasks = relationship("Maintenance", back_populates="equipment", cascade="all, delete-orphan")
