import os
import json
import hashlib
from datetime import datetime, timezone

UPLOADS_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads')


def _user_dir(email: str) -> str:
    """Each user gets a private directory named after a hash of their email."""
    user_hash = hashlib.sha256(email.lower().encode()).hexdigest()[:20]
    path = os.path.join(UPLOADS_BASE, user_hash)
    os.makedirs(path, exist_ok=True)
    return path


def _meta_path(email: str) -> str:
    return os.path.join(_user_dir(email), '_meta.json')


def _load_meta(email: str) -> dict:
    p = _meta_path(email)
    if not os.path.exists(p):
        return {}
    with open(p, 'r') as f:
        return json.load(f)


def _save_meta(email: str, meta: dict):
    with open(_meta_path(email), 'w') as f:
        json.dump(meta, f, indent=2)


def save_file(email: str, filename: str, data: bytes) -> dict:
    """Save an uploaded file and update the metadata index."""
    # Sanitize filename
    safe_name = os.path.basename(filename).replace('..', '').strip()
    filepath = os.path.join(_user_dir(email), safe_name)
    with open(filepath, 'wb') as f:
        f.write(data)
    meta = _load_meta(email)
    meta[safe_name] = {
        'filename': safe_name,
        'size_bytes': len(data),
        'uploaded_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
    }
    _save_meta(email, meta)
    return meta[safe_name]


def list_files(email: str) -> list:
    """Return all files for a user, sorted newest first."""
    meta = _load_meta(email)
    files = list(meta.values())
    files.sort(key=lambda f: f.get('uploaded_at', ''), reverse=True)
    return files


def get_file_path(email: str, filename: str) -> str:
    """Return the absolute path to a user's file, or raise if not found."""
    safe_name = os.path.basename(filename).replace('..', '').strip()
    path = os.path.join(_user_dir(email), safe_name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"File '{safe_name}' not found for this user.")
    return path


def delete_file(email: str, filename: str):
    """Remove a file and its metadata entry."""
    path = get_file_path(email, filename)
    os.remove(path)
    meta = _load_meta(email)
    safe_name = os.path.basename(filename).replace('..', '').strip()
    meta.pop(safe_name, None)
    _save_meta(email, meta)
