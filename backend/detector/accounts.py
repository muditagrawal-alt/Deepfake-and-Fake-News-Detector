"""Persistent account quota, API-key encryption, and recent detection history."""
import base64
import json
import os
import secrets
import threading
import time
from datetime import datetime, timezone

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine

from detector.config import BACKEND_DIR, Settings, get_settings

FREE_DETECTIONS = 3
HISTORY_LIMIT = 20
API_KEY_PROVIDERS = {"gemini", "openrouter", "tavily", "groq"}
_engine: Engine | None = None
_engine_url: str | None = None
_engine_lock = threading.Lock()
_initialized_url: str | None = None


class EncryptionUnavailable(RuntimeError):
    pass


class AccountDeleted(RuntimeError):
    pass


def _get_engine(settings: Settings | None = None) -> Engine:
    global _engine, _engine_url
    settings = settings or get_settings()
    if _engine is not None and _engine_url == settings.database_url:
        return _engine
    with _engine_lock:
        if _engine is not None and _engine_url == settings.database_url:
            return _engine
        url = settings.database_url
        driver_url = url
        if url.startswith("postgres://"):
            driver_url = "postgresql+psycopg://" + url.removeprefix("postgres://")
        elif url.startswith("postgresql://"):
            driver_url = "postgresql+psycopg://" + url.removeprefix("postgresql://")
        options = {"pool_pre_ping": True}
        if url.startswith("sqlite:"):
            db_path = url.removeprefix("sqlite:///")
            if db_path and db_path != ":memory:":
                os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
            options["connect_args"] = {"check_same_thread": False, "timeout": 30}
        engine = create_engine(driver_url, **options)
        if url.startswith("sqlite:"):
            @event.listens_for(engine, "connect")
            def _sqlite_pragmas(dbapi_connection, _):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.execute("PRAGMA busy_timeout=30000")
                cursor.close()
        _engine = engine
        _engine_url = url
        return engine


def init_store(settings: Settings | None = None) -> None:
    global _initialized_url
    settings = settings or get_settings()
    if _initialized_url == settings.database_url:
        return
    engine = _get_engine(settings)
    statements = [
        """CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            image TEXT NOT NULL,
            created_at TEXT NOT NULL,
            free_used INTEGER NOT NULL DEFAULT 0,
            welcome_seen INTEGER NOT NULL DEFAULT 0,
            history_enabled INTEGER NOT NULL DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS user_keys (
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            nonce TEXT NOT NULL,
            ciphertext TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (user_id, provider),
            FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )""",
        """CREATE TABLE IF NOT EXISTS detections (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            modality TEXT NOT NULL,
            verdict TEXT NOT NULL,
            summary TEXT NOT NULL,
            confidence REAL NOT NULL,
            created_at TEXT NOT NULL,
            input_label TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )""",
        "CREATE INDEX IF NOT EXISTS detections_user_recent ON detections(user_id, created_at DESC)",
        """CREATE TABLE IF NOT EXISTS deleted_accounts (
            user_id TEXT PRIMARY KEY,
            deleted_at BIGINT NOT NULL
        )""",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
        columns = {column["name"] for column in inspect(connection).get_columns("users")}
        if "welcome_seen" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN welcome_seen INTEGER NOT NULL DEFAULT 0"))
        if "history_enabled" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN history_enabled INTEGER NOT NULL DEFAULT 0"))
            # Old deployments saved results without an explicit opt-in. Clear
            # those rows as the new default is intentionally private/off.
            connection.execute(text("DELETE FROM detections"))
        if connection.dialect.name == "postgresql":
            deleted_columns = inspect(connection).get_columns("deleted_accounts")
            deleted_at_type = next(column["type"] for column in deleted_columns if column["name"] == "deleted_at")
            if "bigint" not in str(deleted_at_type).lower():
                connection.execute(text("ALTER TABLE deleted_accounts ALTER COLUMN deleted_at TYPE BIGINT USING ROUND(deleted_at::numeric)::BIGINT"))
    _initialized_url = settings.database_url


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_user(connection, user: dict) -> None:
    deleted_at = connection.execute(text("SELECT deleted_at FROM deleted_accounts WHERE user_id=:uid"),
                                    {"uid": user["sub"]}).scalar()
    if deleted_at is not None and int(user.get("auth_iat", 0)) <= _deleted_at_ms(deleted_at):
        raise AccountDeleted("This account was deleted. Sign out and sign in again to create a new account.")
    connection.execute(text("""
        INSERT INTO users(user_id, email, name, image, created_at, free_used)
        VALUES(:user_id, :email, :name, :image, :created_at, 0)
        ON CONFLICT(user_id) DO UPDATE SET email=excluded.email, name=excluded.name, image=excluded.image
    """), {
        "user_id": user["sub"],
        "email": user.get("email") or "",
        "name": user.get("name") or "Veritas user",
        "image": user.get("picture") or "",
        "created_at": _now(),
    })


def _encryption_key(settings: Settings) -> bytes:
    value = settings.byok_encryption_key.strip()
    if not value:
        raise EncryptionUnavailable("BYOK_ENCRYPTION_KEY is not configured.")
    try:
        key = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except Exception as exc:
        raise EncryptionUnavailable("BYOK_ENCRYPTION_KEY must be a URL-safe base64 32-byte key.") from exc
    if len(key) != 32:
        raise EncryptionUnavailable("BYOK_ENCRYPTION_KEY must decode to exactly 32 bytes.")
    return key


def _encrypt_api_key(settings: Settings, user_id: str, provider: str, api_key: str) -> tuple[str, str]:
    nonce = secrets.token_bytes(12)
    aad = f"veritas:{user_id}:{provider}".encode()
    encrypted = AESGCM(_encryption_key(settings)).encrypt(nonce, api_key.encode(), aad)
    return base64.urlsafe_b64encode(nonce).decode(), base64.urlsafe_b64encode(encrypted).decode()


def _decrypt_api_key(settings: Settings, user_id: str, provider: str, nonce: str, ciphertext: str) -> str:
    aad = f"veritas:{user_id}:{provider}".encode()
    try:
        raw_nonce = base64.urlsafe_b64decode(nonce)
        encrypted = base64.urlsafe_b64decode(ciphertext)
        return AESGCM(_encryption_key(settings)).decrypt(raw_nonce, encrypted, aad).decode()
    except (InvalidTag, ValueError, UnicodeDecodeError) as exc:
        raise EncryptionUnavailable("A saved API key cannot be decrypted; re-enter it with the current encryption key.") from exc


def account_status(user: dict, settings: Settings | None = None) -> dict:
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        _ensure_user(connection, user)
        row = connection.execute(text("SELECT free_used, history_enabled FROM users WHERE user_id=:uid"), {"uid": user["sub"]}).one()
        first_workspace_visit = connection.execute(text("""
            UPDATE users SET welcome_seen=1 WHERE user_id=:uid AND welcome_seen=0
        """), {"uid": user["sub"]}).rowcount == 1
        providers = connection.execute(text("SELECT provider FROM user_keys WHERE user_id=:uid ORDER BY provider"),
                                       {"uid": user["sub"]}).scalars().all()
    try:
        _encryption_key(settings)
        encryption_ready = True
    except EncryptionUnavailable:
        encryption_ready = False
    return {
        "free_limit": FREE_DETECTIONS,
        "free_used": row.free_used,
        "free_remaining": max(0, FREE_DETECTIONS - row.free_used),
        "keys": providers,
        "byok_ready": encryption_ready,
        "history_limit": HISTORY_LIMIT,
        "history_enabled": bool(row.history_enabled),
        "is_new_user": first_workspace_visit,
    }


def reserve_detection(user: dict, settings: Settings | None = None) -> dict:
    """Atomically consume one free use, or require a saved model-provider key."""
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        _ensure_user(connection, user)
        changed = connection.execute(text("""
            UPDATE users SET free_used=free_used+1
            WHERE user_id=:uid AND free_used < :limit
        """), {"uid": user["sub"], "limit": FREE_DETECTIONS}).rowcount
        if changed:
            used = connection.execute(text("SELECT free_used FROM users WHERE user_id=:uid"),
                                      {"uid": user["sub"]}).scalar_one()
            return {"allowed": True, "use_byok": False, "free_used": used,
                    "free_remaining": max(0, FREE_DETECTIONS - used)}
        providers = set(connection.execute(text("SELECT provider FROM user_keys WHERE user_id=:uid"),
                                           {"uid": user["sub"]}).scalars().all())
    preferred = "gemini" if "gemini" in providers else "openrouter" if "openrouter" in providers else None
    if preferred:
        return {"allowed": True, "use_byok": True, "provider": preferred,
                "free_used": FREE_DETECTIONS, "free_remaining": 0}
    return {"allowed": False, "use_byok": False, "free_used": FREE_DETECTIONS,
            "free_remaining": 0}


def refund_free_detection(user_id: str, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    with _get_engine(settings).begin() as connection:
        connection.execute(text("UPDATE users SET free_used=CASE WHEN free_used > 0 THEN free_used - 1 ELSE 0 END WHERE user_id=:uid"),
                           {"uid": user_id})


def save_api_key(user: dict, provider: str, api_key: str, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    provider = provider.lower().strip()
    api_key = api_key.strip()
    if provider not in API_KEY_PROVIDERS:
        raise ValueError("Unsupported API-key provider.")
    if len(api_key) < 20 or len(api_key) > 1024 or any(ord(ch) < 32 for ch in api_key):
        raise ValueError("API key length must be between 20 and 1024 characters.")
    nonce, ciphertext = _encrypt_api_key(settings, user["sub"], provider, api_key)
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        _ensure_user(connection, user)
        connection.execute(text("""
            INSERT INTO user_keys(user_id, provider, nonce, ciphertext, updated_at)
            VALUES(:uid, :provider, :nonce, :ciphertext, :updated_at)
            ON CONFLICT(user_id, provider) DO UPDATE
            SET nonce=excluded.nonce, ciphertext=excluded.ciphertext, updated_at=excluded.updated_at
        """), {"uid": user["sub"], "provider": provider, "nonce": nonce,
              "ciphertext": ciphertext, "updated_at": _now()})


def get_api_keys(user_id: str, settings: Settings | None = None) -> dict[str, str]:
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        rows = connection.execute(text("SELECT provider, nonce, ciphertext FROM user_keys WHERE user_id=:uid"),
                                  {"uid": user_id}).mappings().all()
    return {row["provider"]: _decrypt_api_key(settings, user_id, row["provider"], row["nonce"], row["ciphertext"])
            for row in rows}


def delete_api_key(user_id: str, provider: str, settings: Settings | None = None) -> bool:
    if provider not in API_KEY_PROVIDERS:
        raise ValueError("Unsupported API-key provider.")
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        result = connection.execute(text("DELETE FROM user_keys WHERE user_id=:uid AND provider=:provider"),
                                    {"uid": user_id, "provider": provider})
        return bool(result.rowcount)
def save_detection(user: dict, result: dict, input_label: str, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    init_store(settings)
    engine = _get_engine(settings)
    created = result.get("created_at") or _now()
    entry_id = result["id"]
    with engine.begin() as connection:
        _ensure_user(connection, user)
        lock_suffix = " FOR UPDATE" if connection.dialect.name == "postgresql" else ""
        enabled = connection.execute(text(
            "SELECT history_enabled FROM users WHERE user_id=:uid" + lock_suffix
        ), {"uid": user["sub"]}).scalar_one()
        if not enabled:
            return
        payload = json.dumps(result, ensure_ascii=False, separators=(",", ":"))
        connection.execute(text("""
            INSERT INTO detections(id, user_id, modality, verdict, summary, confidence,
                                   created_at, input_label, payload_json)
            VALUES(:id, :uid, :modality, :verdict, :summary, :confidence, :created_at, :label, :payload)
        """), {"id": entry_id, "uid": user["sub"], "modality": result["modality"],
              "verdict": result["verdict"], "summary": result["summary"],
              "confidence": result["confidence"], "created_at": created,
              "label": (input_label or "").strip()[:300], "payload": payload})
        connection.execute(text("""
            DELETE FROM detections WHERE user_id=:uid AND id NOT IN (
                SELECT id FROM detections WHERE user_id=:uid ORDER BY created_at DESC LIMIT :keep
            )
        """), {"uid": user["sub"], "keep": HISTORY_LIMIT})


def get_history(user_id: str, settings: Settings | None = None) -> list[dict]:
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        rows = connection.execute(text("""
            SELECT id, modality, verdict, summary, confidence, created_at, input_label, payload_json
            FROM detections WHERE user_id=:uid
              AND EXISTS (SELECT 1 FROM users WHERE user_id=:uid AND history_enabled=1)
            ORDER BY created_at DESC LIMIT :keep
        """), {"uid": user_id, "keep": HISTORY_LIMIT}).mappings().all()
    return [{"id": row["id"], "modality": row["modality"], "verdict": row["verdict"],
             "summary": row["summary"], "confidence": row["confidence"], "created_at": row["created_at"],
             "input_label": row["input_label"], "result": json.loads(row["payload_json"])} for row in rows]


def set_history_enabled(user: dict, enabled: bool, settings: Settings | None = None) -> int:
    """Set the account's history opt-in; disabling it also deletes saved results."""
    settings = settings or get_settings()
    init_store(settings)
    engine = _get_engine(settings)
    with engine.begin() as connection:
        _ensure_user(connection, user)
        lock_suffix = " FOR UPDATE" if connection.dialect.name == "postgresql" else ""
        connection.execute(text("SELECT user_id FROM users WHERE user_id=:uid" + lock_suffix),
                           {"uid": user["sub"]}).scalar_one()
        connection.execute(text("UPDATE users SET history_enabled=:enabled WHERE user_id=:uid"),
                           {"uid": user["sub"], "enabled": int(enabled)})
        if not enabled:
            result = connection.execute(text("DELETE FROM detections WHERE user_id=:uid"),
                                        {"uid": user["sub"]})
            return result.rowcount
    return 0


def clear_history(user_id: str, settings: Settings | None = None) -> int:
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        result = connection.execute(text("DELETE FROM detections WHERE user_id=:uid"), {"uid": user_id})
        return result.rowcount


def is_token_active(user_id: str, auth_iat: int, settings: Settings | None = None) -> bool:
    """Reject API tokens issued before deletion; a fresh OAuth login may start over."""
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        deleted_at = connection.execute(text("SELECT deleted_at FROM deleted_accounts WHERE user_id=:uid"),
                                        {"uid": user_id}).scalar()
    return deleted_at is None or auth_iat > _deleted_at_ms(deleted_at)


def _deleted_at_ms(value: float | int) -> int:
    """Read millisecond tombstones and tolerate second-based values from early deployments."""
    timestamp = float(value)
    return int(timestamp * 1000) if timestamp < 100_000_000_000 else int(timestamp)


def delete_account(user_id: str, settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    init_store(settings)
    with _get_engine(settings).begin() as connection:
        connection.execute(text("""
            INSERT INTO deleted_accounts(user_id, deleted_at) VALUES(:uid, :deleted_at)
            ON CONFLICT(user_id) DO UPDATE SET deleted_at=excluded.deleted_at
        """), {"uid": user_id, "deleted_at": time.time_ns() // 1_000_000})
        result = connection.execute(text("DELETE FROM users WHERE user_id=:uid"), {"uid": user_id})
        return bool(result.rowcount)
