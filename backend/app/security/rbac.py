from fastapi import HTTPException, status

ROLE_HIERARCHY = {
    "admin": 3,
    "operator": 2,
    "viewer": 1
}

def has_required_role(user_role: str, min_role: str) -> bool:
    user_level = ROLE_HIERARCHY.get(user_role.lower(), 0)
    min_level = ROLE_HIERARCHY.get(min_role.lower(), 0)
    return user_level >= min_level

def check_role(user_role: str, min_role: str):
    if not has_required_role(user_role, min_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation not permitted. Required role: {min_role}+, your role: {user_role}"
        )
