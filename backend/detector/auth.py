"""Validate short-lived bearer tokens issued by the first-party Next.js app."""
import base64
import hashlib
import hmac
import json
import time

from fastapi import Header, HTTPException

from detector import accounts
from detector.config import get_settings


def _decode_segment(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def require_user(authorization: str | None = Header(default=None)) -> dict:
    settings = get_settings()
    secret = settings.backend_token_secret.encode()
    if len(secret) < 32:
        raise HTTPException(503, "Backend authentication is not configured.")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in to use Veritas.")

    token = authorization[7:].strip()
    if len(token) > 8192:
        raise HTTPException(401, "Invalid session token.")
    try:
        header, payload, signature = token.split(".")
        header_data = json.loads(_decode_segment(header))
        claims = json.loads(_decode_segment(payload))
        supplied = _decode_segment(signature)
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(401, "Invalid session token.") from None

    if header_data.get("alg") != "HS256" or header_data.get("typ") != "JWT":
        raise HTTPException(401, "Invalid session token.")
    signing_input = f"{header}.{payload}".encode()
    expected = hmac.new(secret, signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(401, "Invalid session token.")

    now = int(time.time())
    if (claims.get("iss") != "veritas-web" or claims.get("aud") != "veritas-api"
            or not isinstance(claims.get("exp"), int) or claims["exp"] <= now
            or not isinstance(claims.get("iat"), int) or claims["iat"] > now + 30
            or claims["exp"] - claims["iat"] > 600):
        raise HTTPException(401, "Session expired. Refresh and try again.")
    auth_iat = claims.get("auth_iat")
    if not isinstance(auth_iat, int) or auth_iat > (now + 30) * 1000:
        raise HTTPException(401, "Invalid session age.")
    if not isinstance(claims.get("sub"), str) or not claims["sub"].isalnum() or len(claims["sub"]) != 64:
        raise HTTPException(401, "Invalid session identity.")
    if not isinstance(claims.get("email"), str) or not claims["email"].strip():
        raise HTTPException(401, "A verified email address is required.")
    if not accounts.is_token_active(claims["sub"], auth_iat, settings):
        raise HTTPException(401, "This account was deleted. Sign in again to create a new account.")

    return {key: claims.get(key, "") for key in ("sub", "email", "name", "picture")} | {"auth_iat": auth_iat}
