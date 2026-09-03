import uuid
from sqlalchemy import Column, String, Integer, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Personnel(Base):
    __tablename__ = "personnel"

    record_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    headcount = Column(Integer, nullable=False, default=25)
    date = Column(Date, nullable=False)

    station = relationship("Station", back_populates="personnel")

class ResearchOperation(Base):
    __tablename__ = "research_operations"

    op_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    equipment_used = Column(JSON, default=list)
    schedule = Column(JSON, default=dict)

    station = relationship("Station", back_populates="research_ops")
