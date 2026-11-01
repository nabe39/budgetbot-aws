"""Pytest global configuration and fixtures."""
import os
import tempfile
from pathlib import Path

# Setup isolated test environment variables before modules are imported
os.environ["AI_BACKEND"] = "local"
os.environ["STORAGE_BACKEND"] = "local"
os.environ["USERSTORE_BACKEND"] = "sqlite"

_tmp = tempfile.mkdtemp(prefix="budgetbot-pytest-")
os.environ["STORAGE_LOCAL_DIR"] = str(Path(_tmp) / "uploads")
os.environ["USERSTORE_SQLITE_PATH"] = str(Path(_tmp) / "transactions.db")

