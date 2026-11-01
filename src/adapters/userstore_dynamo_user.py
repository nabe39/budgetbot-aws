"""[DEPRECATED] Compatibility shim for legacy code.
Authentication logic has been migrated to `src.auth` and `src.adapters.user_repository`.
Budget caps logic has been migrated to `src.adapters.caps`.
"""
import warnings

from src.auth import (
    hash_password as _hash_password,
    verify_password as _check_password,
    register_user as _register_user,
    authenticate_user,
)
from src.adapters import user_repository
from src.adapters import caps

warnings.warn(
    "userstore_dynamo_user is deprecated. Use src.auth and src.adapters.caps instead.",
    DeprecationWarning,
    stacklevel=2,
)


def create_user(full_name: str, username: str, password: str) -> dict:
    return _register_user(full_name=full_name, username=username, password=password)


def verify_password(username: str, password: str) -> dict | None:
    return authenticate_user(username=username, password=password)


def get_user_by_id(user_id: str) -> dict | None:
    return user_repository.get_user_by_id(user_id)


def get_user_by_username(username: str) -> dict | None:
    return user_repository.get_user_by_username(username)


def get_caps(user_id: str) -> dict:
    return caps.get_caps(user_id)


def set_cap(user_id: str, category: str, amount: float) -> dict:
    return caps.set_cap(user_id, category, amount)


def delete_cap(user_id: str, category: str) -> dict:
    return caps.delete_cap(user_id, category)
