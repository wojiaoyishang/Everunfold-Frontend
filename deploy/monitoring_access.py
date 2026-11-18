"""Validate monitoring source ranges and generate the Loki proxy include."""

import re
from ipaddress import ip_network

METRICS = "EVERUNFOLD_METRICS_"
LOKI = "EVERUNFOLD_LOKI_"
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


def add_loki_fields(add, env, lookup):
    for action, label in (
        ("query", "Loki 查询来源 IP/CIDR"),
        ("push", "Alloy 写入来源 IP/CIDR"),
    ):
        add_peer_field(
            add,
            "loki_" + action,
            label,
            env.get(LOKI + action.upper() + "_ALLOWED_PEERS", LOCAL),
            lookup=lookup,
            optional=True,
            hint="填写 Loki 反代实际看到的来源，逗号分隔。留空拒绝该方向访问。",
            empty="拒绝该方向访问",
        )


def loki_environment(value):
    return {
        LOKI + "QUERY_ALLOWED_PEERS": value("loki_query"),
        LOKI + "PUSH_ALLOWED_PEERS": value("loki_push"),
    }


def loki_proxy_include(env):
    def access(action):
        addresses = networks(env.get(LOKI + action + "_ALLOWED_PEERS", LOCAL), optional=True)
        return (
            "    satisfy all;\n"
            + "".join(f"    allow {address};\n" for address in addresses)
            + "    deny all;\n"
        )

    return (
        "# Include in a dedicated Loki server block. Define upstream everunfold_loki.\n"
        "location = /loki/api/v1/push {\n"
        + access("PUSH")
        + "    limit_except POST { deny all; }\n"
        "    proxy_pass http://everunfold_loki;\n"
        "}\n"
        "location ~ ^/(?:ready|loki/api/v1/(?:query|query_range|labels|series|"
        "label/[^/]+/values|index/(?:stats|volume|volume_range)|status/buildinfo|"
        "detected_fields|detected_labels|patterns))$ {\n"
        + access("QUERY")
        + "    limit_except GET POST { deny all; }\n"
        "    proxy_pass http://everunfold_loki;\n"
        "}\n"
        "location / { return 404; }\n"
    )
