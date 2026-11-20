"""Validate monitoring source ranges."""

import re
from ipaddress import ip_network

METRICS = "EVERUNFOLD_METRICS_"
LOCAL = "127.0.0.1,::1"
NODE_PEERS = METRICS + "NODE_ALLOWED_PEERS"


def networks(value, *, optional=False):
    if "%" in value:
        raise ValueError("IP/CIDR 不接受网卡作用域。")
    items = [ip_network(item.strip(), strict=False) for item in value.split(",") if item.strip()]
    if (not items and not optional) or any(item.prefixlen == 0 for item in items):
        raise ValueError("请填写有效的受限 IP/CIDR 列表。")
    return list(dict.fromkeys(str(item) for item in items))


def valid_peers(value, optional=False):
    try:
        networks(value, optional=optional)
        return True
    except ValueError:
        return False


def add_peer_field(add, key, label, initial, *, hint, optional=False, **options):
    add(
        key,
        label,
        initial,
        valid=lambda text: valid_peers(text, optional=optional),
        resolve=lambda text: ",".join(networks(text, optional=optional)),
        hint=hint,
        group="监控",
        **options,
    )


def resolve_sources(value, lookup):
    """Resolve Docker names while keeping ordinary IP literals readable."""
    from ipaddress import ip_address

    entries = []
    for item in (part.strip() for part in value.split(",") if part.strip()):
        if "%" in item:
            raise ValueError("IP/CIDR 不接受网卡作用域。")
        try:
            entries.append(str(ip_address(item)) if "/" not in item else str(ip_network(item, strict=False)))
        except ValueError:
            if lookup is None or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", item):
                raise ValueError("请填写 IP/CIDR 或 Docker 网络名。") from None
            entries.extend(networks(lookup(item)))
    return list(dict.fromkeys(entries))


def resolve_gateways(value, lookup, *, single=False):
    """A name in an IP-only field means the bridge's actual host gateway."""
    from ipaddress import ip_address

    entries = []
    for item in (part.strip() for part in value.split(",") if part.strip()):
        if "%" in item:
            raise ValueError("IP 地址不接受网卡作用域。")
        try:
            entries.append(ip_address(item))
        except ValueError:
            if lookup is None or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", item):
                raise ValueError("请填写 IP 地址或 Docker 网桥名称。") from None
            try:
                entries.extend(ip_address(part) for part in lookup(item).strip(",").split(","))
            except ValueError:
                raise ValueError(f"Docker 网络 {item} 没有有效的网桥网关。") from None
    entries = list(dict.fromkeys(entries))
    if single:
        preferred = [item for item in entries if item.version == 4] or entries
        if len(preferred) > 1:
            raise ValueError("有多个可用网关，请填写具体的绑定 IP。")
        return str(preferred[0]) if preferred else ""
    return ",".join(str(item) for item in entries)
