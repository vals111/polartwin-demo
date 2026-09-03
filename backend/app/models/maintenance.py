import uuid
from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Maintenance(Base):
    __tablename__ = "maintenance"

    task_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = Column(String(64), ForeignKey("equipment.equipment_id"), nullable=False, index=True)
    status = Column(String(32), default="pending") # 'pending', 'in_progress', 'done'
    scheduled_date = Column(Date, nullable=False)

    equipment = relationship("Equipment", back_populates="maintenance_tasks")
