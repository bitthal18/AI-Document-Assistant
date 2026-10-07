from jose import jwt, JWTError
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


SECRET_KEY = "my-super-secret-key"
ALGORITHM = "HS256"

security = HTTPBearer()


# -----------------------------
# CREATE JWT TOKEN
# -----------------------------

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=60)

    to_encode["exp"] = expire

    token = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# -----------------------------
# VERIFY JWT TOKEN
# -----------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")
        role = payload.get("role")

        if user_id is None or role is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return {
            "id": int(user_id),
            "role": role
        }

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )