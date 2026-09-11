from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.security.auth import decode_access_token
from app.security.rbac import check_role

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        # Fallback to demo operator user if available for seamless demo exploration
        demo_user = db.query(User).filter(User.email == "operator@polartwin.gov.in").first()
        if demo_user:
            return demo_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        # Fallback to demo operator user if available for seamless demo exploration
        demo_user = db.query(User).filter(User.email == "operator@polartwin.gov.in").first()
        if demo_user:
            return demo_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        demo_user = db.query(User).filter(User.email == "operator@polartwin.gov.in").first()
        if demo_user:
            return demo_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_role(min_role: str):
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        check_role(current_user.role, min_role)
        return current_user
    return role_dependency

require_viewer = require_role("viewer")
require_operator = require_role("operator")
require_admin = require_role("admin")
