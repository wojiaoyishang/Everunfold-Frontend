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


def resolve_peers(value, lookup, *, optional):
    entries = []
    for item in (part.strip() for part in value.split(",")):
        if not item:
            continue
        try:
            ip_network(item, strict=False)
        except ValueError:
            if lookup is None or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", item):
                raise ValueError("请填写有效的 IP/CIDR，多个值用逗号分隔。") from None
            entries.extend(networks(lookup(item)))
        else:
            entries.append(item)
    return ",".join(networks(",".join(entries), optional=optional))


def add_peer_field(add, key, label, initial, *, lookup, hint, optional=False, **options):
    if lookup is not None:
        hint += " Docker 模式可输入已连接网络名，向导会换算为当前网段。"
    add(
        key,
        label,
        initial,
        valid=lambda text: valid_peers(text, optional=optional),
        resolve=lambda text: resolve_peers(text, lookup, optional=optional),
        hint=hint,
        group="监控",
        **options,
    )
