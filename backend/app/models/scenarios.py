import uuid
from sqlalchemy import Column, String, BigInteger, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    definition = Column(JSON, nullable=False) # input scenario parameters
    result = Column(JSON, nullable=False) # projected state + impact

    station = relationship("Station", back_populates="scenarios")

class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    run_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    tick = Column(BigInteger, nullable=False, index=True)
    snapshot = Column(JSON, nullable=False) # full 16-domain state snapshot

    station = relationship("Station", back_populates="simulation_runs")
