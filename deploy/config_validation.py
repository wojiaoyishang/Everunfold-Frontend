"""Input validation shared by the deployment tools."""

import ipaddress
import re
from urllib.parse import urlsplit
from uuid import UUID


def ip_address(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def valid_port(value: str) -> bool:
    return bool(re.fullmatch(r"[0-9]{1,5}", value)) and 1 <= int(value) <= 65535


def identifier(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", value))


def positive(value: str) -> bool:
    return bool(re.fullmatch(r"[1-9][0-9]*", value))


def origin(value: str) -> bool:
    try:
        url = urlsplit(value)
        return (
            url.scheme in {"http", "https"}
            and bool(url.hostname)
            and (url.port is None or url.port > 0)
            and url.username is None
            and url.password is None
            and not re.search(r"\s|[\\?#*]", value)
            and url.path in ("", "/")
        )
    except ValueError:
        return False


def public_url(value: str) -> bool:
    if not origin(value):
        return False
    url = urlsplit(value)
    host = url.hostname or ""
    local = host == "localhost"
    if ip_address(host):
        address = ipaddress.ip_address(host)
        if address.is_unspecified:
            return False
        local = address.is_loopback
    return url.scheme == "https" or local


def peer_list(value: str) -> bool:
    try:
        for item in value.split(",") if value else []:
            ipaddress.ip_network(item.strip(), strict=False)
        return True
    except ValueError:
        return False


def token(value: str) -> bool:
    return re.fullmatch(r"[!-~]{32,}", value) is not None


def redis_url(value: str) -> bool:
    try:
        url = urlsplit(value)
        return (
            url.scheme in {"redis", "rediss"}
            and bool(url.hostname)
            and (url.port is None or url.port > 0)
            and (url.path in ("", "/") or url.path[1:].isdigit())
        )
    except ValueError:
        return False


def db_url(value: str) -> bool:
    try:
        url = urlsplit(value)
        return (
            url.scheme == "postgresql+asyncpg"
            and bool(url.hostname and url.path.strip("/"))
            and (url.port is None or url.port > 0)
        )
    except ValueError:
        return False


def uuid_value(value: str) -> bool:
    try:
        return bool(UUID(value).int)
    except ValueError:
        return False
