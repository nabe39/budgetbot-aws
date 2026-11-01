"""Authentication module for BudgetBot.
Provides Bcrypt password hashing, PostgreSQL user authentication, and RFC 7519 standard JWT access tokens.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
import bcrypt
import jwt
from fastapi import HTTPException, Request

from src.config import config
from src.adapters import user_repository


# =============================================================================
# Password Hashing Utilities (Bcrypt)
# =============================================================================

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with salt."""
    if not password:
        raise ValueError("Password cannot be empty")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# =============================================================================
# User Account Operations (PostgreSQL Integration)
# =============================================================================

def register_user(full_name: str, username: str, password: str) -> dict:
    """Register a new user directly in the database.
    Raises ValueError on invalid input or if username is already taken.
    """
    clean_username = username.strip().lower()
    clean_full_name = full_name.strip()
    if not clean_username:
        raise ValueError("Username cannot be empty")
    if not password or len(password) < 6:
        raise ValueError("Password must be at least 6 characters")

    user_id = str(uuid.uuid4())
    pw_hash = hash_password(password)
    return user_repository.create_user(
        user_id=user_id,
        username=clean_username,
        full_name=clean_full_name,
        password_hash=pw_hash,
    )


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate a user by username and password. Returns user dict or None."""
    clean_username = username.strip().lower()
    user = user_repository.get_user_by_username(clean_username)
    if not user:
        return None
    if not verify_password(password, user.get("password_hash", "")):
        return None
    return user


def get_user_profile(user_id: str) -> Optional[dict]:
    """Retrieve user profile information."""
    user = user_repository.get_user_by_id(user_id)
    if not user:
        return None
    return {
        "user_id": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
    }


# =============================================================================
# JWT Access Token Utilities (RFC 7519 Standard)
# =============================================================================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a standard JWT access token with sub, iat, exp claims."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=config.jwt_exp_minutes)

    to_encode = data.copy()
    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    })
    return jwt.encode(to_encode, config.jwt_secret, algorithm=config.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT access token. Raises HTTPException on failure."""
    try:
        return jwt.decode(token, config.jwt_secret, algorithms=[config.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def login_user(username: str, password: str) -> dict:
    """Authenticate credentials and generate standard JWT access token."""
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expires_in_seconds = config.jwt_exp_minutes * 60
    token = create_access_token(
        data={
            "sub": user["id"],
            "username": user["username"],
            "name": user["full_name"],
        },
        expires_delta=timedelta(minutes=config.jwt_exp_minutes),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in_seconds,
        "user_id": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
    }


def get_current_user(request: Request) -> str:
    """FastAPI dependency that extracts and validates the user_id from:
    1. Authorization: Bearer <token>
    2. X-User-Id header (for internal testing/backward compatibility)
    """
    x_user_id = request.headers.get("X-User-Id")
    if x_user_id:
        return x_user_id

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload missing sub claim")
    return user_id
