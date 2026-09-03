import uuid
from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    type = Column(String(64), nullable=False) # 'fuel', 'water', 'food', 'battery'
    level = Column(Float, nullable=False, default=0.0) # current quantity

    station = relationship("Station", back_populates="resources")

class Inventory(Base):
    __tablename__ = "inventory"

    item_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    category = Column(String(64), nullable=False) # 'food', 'medical', 'spares', 'filters', 'emergency'
    quantity = Column(Float, nullable=False, default=0.0)

    station = relationship("Station", back_populates="inventory")
