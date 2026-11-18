"""Independent scrape access for one frontend instance."""

import re
import secrets

from monitoring_access import LOCAL, add_peer_field

DIRECT = "EVERUNFOLD_FRONTEND_METRICS_"


def add_direct_metrics_fields(add, value, env, lookup):
    add(
        "frontend_metrics_enabled",
        "前端独立 Prometheus 指标（1/0）",
        "1" if env.get(DIRECT + "TOKEN") else "0",
        valid=lambda text: text in {"0", "1"},
        group="监控",
    )

    def enabled():
        return value("frontend_metrics_enabled") == "1"

    add(
        "frontend_direct_token",
        "前端独立指标令牌",
        env.get(DIRECT + "TOKEN") or secrets.token_urlsafe(32),
        valid=lambda text: bool(re.fullmatch(r"[!-~]{32,256}", text)),
        generate=lambda: secrets.token_urlsafe(32),
        secret=True,
        group="监控",
        active=enabled,
        hint="Prometheus 直连当前前端的 /metrics 时使用。",
    )
    add_peer_field(
        add,
        "frontend_direct_peers",
        "前端独立指标来源 IP/CIDR",
        env.get(DIRECT + "ALLOWED_PEERS", LOCAL),
        lookup=lookup,
        active=enabled,
        hint="填写 Prometheus 实际直连前端的来源，逗号分隔。",
    )


def direct_metrics_environment(value):
    return {
        DIRECT + "TOKEN": (
            value("frontend_direct_token") if value("frontend_metrics_enabled") == "1" else ""
        ),
        DIRECT + "ALLOWED_PEERS": value("frontend_direct_peers"),
    }


def direct_metrics_errors(value, *other_tokens):
    if value("frontend_metrics_enabled") == "1" and value("frontend_direct_token") in other_tokens:
        return ["前端独立指标令牌须与聚合采集和前端内部指标令牌分别配置。"]
    return []
