"""Node console settings shared by Docker and native deployment assistants."""

import hashlib
import re
import secrets

from config_context import Context
from config_validation import ip_address


def add_node_console_fields(ctx: Context, add, value):
    frontend = ctx.role == "frontend"
    monitor = ctx.config.get("nodes_monitor", {})
    password_hash = monitor.get("password_hash")
    password_key = (
        "EVERUNFOLD_SETUP_FRONTEND_NODES_PASSWORD"
        if frontend
        else "EVERUNFOLD_SETUP_NODES_PASSWORD"
    )
    secret_key = monitor.get(
        "session_secret_env",
        "EVERUNFOLD_FRONTEND_NODES_SESSION_SECRET"
        if frontend
        else "EVERUNFOLD_NODES_SESSION_SECRET",
    )
    saved_password = ctx.env.get(password_key, "")
    password = saved_password or ("" if password_hash else secrets.token_urlsafe(24))
    add(
        "monitor_enabled",
        "启用节点控制台（1/0）",
        "1" if monitor.get("enabled", True) else "0",
        valid=lambda v: v in {"0", "1"},
        group="节点控制台",
        hint=(
            "/admin/_nodes，使用前端发布 URL；本机密码管理本机连接，全站状态需后端管理员验证。"
            if frontend
            else "/_nodes，使用后端发布 URL；独立密码登录，不使用管理员账户密码。"
        ),
    )
    add(
        "monitor_password",
        "节点控制台密码" if not frontend else "节点控制台本机密码",
        password,
        secret=True,
        valid=lambda v: 12 <= len(v) <= 1024 or (not v and bool(password_hash)),
        resolve=lambda v: v or ("" if password_hash else secrets.token_urlsafe(24)),
        generate=lambda: secrets.token_urlsafe(24),
        empty="保留原密码哈希" if password_hash else "自动生成",
        group="节点控制台",
        hint="12–1024 字符，可查看、复制或修改。已有密码只有哈希时，留空保持；生成按钮可重置。",
    )
    add(
        "monitor_secret",
        "节点控制台会话密钥",
        ctx.env.get(secret_key) or secrets.token_urlsafe(32),
        secret=True,
        valid=lambda v: bool(re.fullmatch(r"[A-Za-z0-9_-]{43,128}", v)),
        resolve=lambda v: v or secrets.token_urlsafe(32),
        generate=lambda: secrets.token_urlsafe(32),
        group="节点控制台",
        hint="留空自动生成；更换密码或会话密钥后，已有控制台登录失效。",
    )
    add(
        "tls_peers",
        "HTTPS 反向代理的直接来源 IP",
        ", ".join(monitor.get("trusted_tls_proxy_ips", [])),
        group="节点控制台",
        valid=lambda v: not v or all(ip_address(address.strip()) for address in v.split(",")),
        empty="未手动指定",
        hint="可填逗号分隔的直连 IP。Docker 宿主机反代也可在容器设置中按网络选择。",
    )

    def save(environment: dict[str, str]) -> None:
        nonlocal password_hash, saved_password
        current = ctx.config.setdefault("nodes_monitor", {})
        current["enabled"] = value("monitor_enabled") == "1"
        # The deployment's published URL is authoritative; never pin an old listener URL.
        current.pop("origin", None)
        current["session_secret_env"] = secret_key
        manual_proxies = [
            address.strip() for address in value("tls_peers").split(",") if address.strip()
        ]
        if manual_proxies:
            current["trusted_tls_proxy_ips"] = manual_proxies
        else:
            current.pop("trusted_tls_proxy_ips", None)
        environment[secret_key] = value("monitor_secret")
        password = value("monitor_password")
        if password:
            if password != saved_password or not password_hash:
                if frontend:
                    salt = secrets.token_bytes(16)
                    digest = hashlib.scrypt(
                        password.encode(), salt=salt, n=16384, r=8, p=1, dklen=32
                    )
                    password_hash = f"scrypt${salt.hex()}${digest.hex()}"
                else:
                    from argon2 import PasswordHasher

                    password_hash = PasswordHasher().hash(password)
                current["password_hash"] = password_hash
                saved_password = password
            environment[password_key] = password

    return save
