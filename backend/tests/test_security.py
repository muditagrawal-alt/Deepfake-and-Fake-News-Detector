import io
import pytest
from starlette.testclient import TestClient

from detector.main import app, safe_filename, validate_magic_bytes
from detector.auth import _decode_segment
from fastapi import HTTPException


@pytest.fixture
def client():
    return TestClient(app)


def test_security_headers_present_on_root(client):
    res = client.get("/")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in headers.get("permissions-policy", "")
    assert "strict-transport-security" in headers


def test_security_headers_sensitive_cache_control(client):
    res = client.get("/account")
    # Even on 401 unauthorized or 200, sensitive path must have no-store
    assert res.headers.get("cache-control") == "no-store, private, max-age=0"
    assert res.headers.get("pragma") == "no-cache"


def test_safe_filename_sanitization():
    # Path traversal attack
    assert safe_filename("../../etc/passwd.jpg") == "passwd.jpg"
    assert safe_filename("..\\..\\windows\\system32\\calc.exe") == "calc.exe"

    # Null bytes and control characters
    assert safe_filename("evil\x00file.png") == "evilfile.png"
    assert safe_filename("script\x1b[31m.jpg") == "script[31m.jpg"

    # HTML / injection characters
    assert safe_filename('<script>alert("xss").png') == "scriptalert(xss).png"
    assert safe_filename('<script>alert("xss")</script>.png') == "script.png"
    assert safe_filename("file;rm -rf /") == "file;rm -rf"

    # Empty fallback
    assert safe_filename("") == "file"
    assert safe_filename(None, default="fallback") == "fallback"


def test_validate_magic_bytes():
    # Valid JPEG
    validate_magic_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00", "image")

    # Valid PNG
    validate_magic_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", "image")

    # Valid WebP
    validate_magic_bytes(b"RIFF\x20\x00\x00\x00WEBPVP8 ", "image")

    # Spoofed executable pretending to be image
    with pytest.raises(HTTPException) as exc:
        validate_magic_bytes(b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00", "image")
    assert exc.value.status_code == 415

    # Spoofed PHP shell pretending to be image
    with pytest.raises(HTTPException) as exc:
        validate_magic_bytes(b"<?php system($_GET['cmd']); ?>", "image")
    assert exc.value.status_code == 415

    # Valid MP4 video
    validate_magic_bytes(b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00", "video")

    # Valid WebM video
    validate_magic_bytes(b"\x1a\x45\xdf\xa3\x93\x42\x82\x88matroska", "video")

    # Invalid video signature
    with pytest.raises(HTTPException) as exc:
        validate_magic_bytes(b"GIF89a\x01\x00\x01\x00\x80\x00\x00", "video")
    assert exc.value.status_code == 415


@pytest.mark.anyio
async def test_ssrf_protection_rejects_private_and_loopback_urls(client):
    from detector.forensics.safe_fetch import UnsafeURL, validate_public_url

    # Loopback
    with pytest.raises(UnsafeURL):
        await validate_public_url("http://127.0.0.1:8000/secret")
    with pytest.raises(UnsafeURL):
        await validate_public_url("http://localhost:3000/api")

    # AWS / GCP metadata service
    with pytest.raises(UnsafeURL):
        await validate_public_url("http://169.254.169.254/latest/meta-data/")

    # Private RFC1918 subnets
    with pytest.raises(UnsafeURL):
        await validate_public_url("http://10.0.0.1/admin")
    with pytest.raises(UnsafeURL):
        await validate_public_url("http://192.168.1.1/router")
    with pytest.raises(UnsafeURL):
        await validate_public_url("http://172.16.0.5/internal")
