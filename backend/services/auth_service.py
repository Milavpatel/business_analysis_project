import os
import json
import hashlib
import hmac
import base64
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

# ─── Config ───────────────────────────────────────────────────────────────────
SECRET_KEY = "nexus-ai-dashboard-secret-key-change-in-production-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Simple file-based user store (swap for a real DB in production)
USERS_FILE = os.path.join(os.path.dirname(__file__), "users_db.json")


# ─── User Store Helpers ────────────────────────────────────────────────────────
def _load_users() -> dict:
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def _save_users(users: dict):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


# ─── Password Hashing (PBKDF2-SHA256, no external deps) ───────────────────────
# Uses Python's built-in hashlib — no passlib/bcrypt version conflicts.
# PBKDF2 with 260,000 iterations matches Django's default security level.

_ITERATIONS = 260_000
_HASH_NAME   = "sha256"

def hash_password(password: str) -> str:
    """Hash a password of any length using PBKDF2-SHA256 + a random salt."""
    salt = secrets.token_bytes(32)
    dk = hashlib.pbkdf2_hmac(_HASH_NAME, password.encode("utf-8"), salt, _ITERATIONS)
    # Store as "iterations$salt_b64$hash_b64" so we can verify later
    return f"{_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"

def verify_password(plain: str, stored: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    try:
        iters_str, salt_b64, hash_b64 = stored.split("$")
        iters  = int(iters_str)
        salt   = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac(_HASH_NAME, plain.encode("utf-8"), salt, iters)
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# ─── JWT Utils ─────────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[str]:
    """Returns the email from the token, or None if invalid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ─── Auth Operations ───────────────────────────────────────────────────────────
def register_user(name: str, email: str, password: str) -> dict:
    """Register a new user. Returns user dict or raises ValueError."""
    users = _load_users()
    if email in users:
        raise ValueError("An account with this email already exists.")

    users[email] = {
        "name": name,
        "email": email,
        "hashed_password": hash_password(password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    _save_users(users)
    return {"name": name, "email": email}


def authenticate_user(email: str, password: str) -> dict:
    """Verify credentials. Returns user dict or raises ValueError."""
    users = _load_users()
    user = users.get(email)
    if not user or not verify_password(password, user["hashed_password"]):
        raise ValueError("Invalid email or password.")
    return {"name": user["name"], "email": user["email"]}
