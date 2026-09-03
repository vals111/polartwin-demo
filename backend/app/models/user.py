import uuid
from sqlalchemy import Column, String
from app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(128), unique=True, nullable=False, index=True)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), nullable=False, default="viewer") # 'admin', 'operator', 'viewer'
