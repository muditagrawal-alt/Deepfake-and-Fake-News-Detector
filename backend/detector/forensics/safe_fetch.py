"""Bounded HTML fetches for user-supplied URLs and search results.

Only public HTTP(S) destinations are allowed. Redirects are checked one hop at
a time so a public page cannot redirect a server-side request to a private
address. Responses are streamed and capped before they reach the parser.
"""
import asyncio
import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import httpx


class UnsafeURL(ValueError):
    """The URL does not point to an allowed public web destination."""


async def validate_public_url(url: str) -> None:
    if not url or len(url) > 4096 or any(ord(char) <= 32 or ord(char) == 127 for char in url):
        raise UnsafeURL("Malformed URL.")
    try:
        parsed = urlsplit(url)
        scheme = parsed.scheme.lower()
        host = (parsed.hostname or "").rstrip(".").lower()
        port = parsed.port
    except ValueError as exc:
        raise UnsafeURL("Malformed URL.") from exc

    if scheme not in {"http", "https"} or not host or parsed.username is not None or parsed.password is not None:
        raise UnsafeURL("Only public HTTP(S) URLs are supported.")
    expected_port = 443 if scheme == "https" else 80
    if port not in (None, expected_port):
        raise UnsafeURL("Only the standard HTTP and HTTPS ports are supported.")

    try:
        addresses = {ipaddress.ip_address(host)}
    except ValueError:
        if host == "localhost" or host.endswith((".localhost", ".local", ".internal", ".test", ".invalid")):
            raise UnsafeURL("Local and reserved hostnames are not allowed.")
        try:
            loop = asyncio.get_running_loop()
            records = await asyncio.wait_for(
                loop.getaddrinfo(host.encode("idna").decode("ascii"), port or expected_port,
                                 type=socket.SOCK_STREAM),
                timeout=5.0,
            )
        except (OSError, UnicodeError, asyncio.TimeoutError) as exc:
            raise UnsafeURL("The hostname could not be resolved safely.") from exc
        try:
            addresses = {ipaddress.ip_address(record[4][0]) for record in records}
        except (IndexError, ValueError) as exc:
            raise UnsafeURL("The hostname resolved to an invalid address.") from exc

    if not addresses or any(not address.is_global for address in addresses):
        raise UnsafeURL("URLs resolving to private or reserved addresses are not allowed.")


async def fetch_html(client: httpx.AsyncClient, url: str, *, max_bytes: int) -> tuple[str, str] | None:
    """Fetch a bounded HTML response and return (final URL, decoded body)."""
    current = url
    for redirect in range(6):
        await validate_public_url(current)
        async with client.stream("GET", current) as response:
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("location")
                if not location or redirect == 5:
                    return None
                current = urljoin(str(response.url), location)
                continue
            if response.status_code != 200:
                return None
            content_type = response.headers.get("content-type", "").lower()
            if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
                return None
            try:
                content_length = int(response.headers.get("content-length", "0"))
            except ValueError:
                content_length = 0
            if content_length > max_bytes:
                return None

            body = bytearray()
            async for chunk in response.aiter_bytes():
                body.extend(chunk)
                if len(body) > max_bytes:
                    return None
            encoding = response.encoding or "utf-8"
            try:
                text = bytes(body).decode(encoding, errors="replace")
            except LookupError:
                text = bytes(body).decode("utf-8", errors="replace")
            return str(response.url), text
    return None
