#!/usr/bin/env python3
"""Review and edit Docker instance configuration (Python 3.11+, POSIX terminal)."""

import ipaddress
import re
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

from config_files import Files, env_values, toml_text, update_env
from config_ui import Field, Menu

DOCKER = Path(__file__).resolve().parent
TOKEN_NAMES = ("NEXTJS_TO_FASTAPI_WEB_MAIN_TOKEN", "FASTAPI_TO_NEXTJS_WEB_MAIN_TOKEN")


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


def peer_list(value: str) -> bool:
    try:
        if not value:
            return False
        for item in value.split(","):
            ipaddress.ip_network(item.strip(), strict=False)
        return True
    except ValueError:
        return False


def token(value: str) -> bool:
    return re.fullmatch(r"[!-~]{32,}", value) is not None


def valid_port(value: str) -> bool:
    return bool(re.fullmatch(r"[0-9]{1,5}", value)) and 1 <= int(value) <= 65535


def uuid_value(value: str) -> bool:
    try:
        return bool(UUID(value).int)
    except ValueError:
        return False


def is_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def public_url(value: str) -> bool:
    if not origin(value):
        return False
    url = urlsplit(value)
    host = url.hostname or ""
    local = host == "localhost"
    if is_ip(host):
        address = ipaddress.ip_address(host)
        if address.is_unspecified:
            return False
        local = address.is_loopback
    return url.scheme == "https" or local


def configure() -> None:
    files = Files()
    compose_path = DOCKER / ".env"
    compose_source = files.read(compose_path)
    compose = env_values(compose_source)
    data = (DOCKER / compose.get("FRONTEND_DATA_DIR", "data")).resolve()
    config_path = data / "config.toml"
    env_path = (DOCKER / compose.get("FRONTEND_ENV_FILE", "runtime.env")).resolve()
    config = files.toml(config_path)
    env_source = files.read(env_path)
    env = env_values(env_source)
    profile_path = None
    profiles = None
    connection = config
    if config.get("backend_node_file"):
        profile_path = (data / config["backend_node_file"]).resolve()
        profiles = files.toml(profile_path)
        connection = profiles.get("profiles", {}).get(profiles.get("active"))
        if not isinstance(connection, dict):
            raise ValueError("独立后端连接文件缺少有效的 active 配置。")
        if "BACKEND_BASE_URL" in env:
            raise ValueError("独立连接文件启用时，请先移除 runtime.env 的 BACKEND_BASE_URL 覆盖。")
    backend = connection.get("backend", {})
    settings = config.get("settings", {})
    names = (
        backend.get("nextjs_to_fastapi_token_env", TOKEN_NAMES[0]),
        backend.get("fastapi_to_nextjs_token_env", TOKEN_NAMES[1]),
    )
    fields: list[Field] = []
    by_key: dict[str, Field] = {}

    def add(key: str, label: str, value: str = "", **kwargs) -> None:
        field = Field(key, label, str(value), **kwargs)
        fields.append(field)
        by_key[key] = field

    def value(key: str) -> str:
        return by_key[key].value

    def import_tokens(source: str) -> str:
        if not source:
            return ""
        try:
            imported = env_values(Path(source).expanduser().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            raise ValueError("无法读取令牌文件，请检查路径和文件格式。") from None
        tokens = [
            imported.get(name, imported.get(default, ""))
            for name, default in zip(names, TOKEN_NAMES, strict=True)
        ]
        if not all(token(item) for item in tokens) or tokens[0] == tokens[1]:
            raise ValueError("文件需要包含两个不同且有效的节点令牌。")
        for name, text in zip(names, tokens, strict=True):
            by_key[name].value = text
        return source

    add(
        "api",
        "后端发布 URL",
        env.get("BACKEND_BASE_URL", connection.get("BACKEND_BASE_URL", "")),
        valid=public_url,
        resolve=lambda v: v.rstrip("/"),
        hint="浏览器调用 API 的公开根 URL，与后端 BACKEND_BASE_URL 一致。",
    )
    add(
        "site",
        "前端发布 URL",
        env.get("PUBLIC_SITE_URL", config.get("PUBLIC_SITE_URL", "")),
        valid=public_url,
        resolve=lambda v: v.rstrip("/"),
        hint="本站页面、canonical、站点地图和订阅的公开根 URL。",
    )
    add(
        "internal",
        "后端内部连接 URL",
        backend.get("base_url", ""),
        valid=lambda v: not v or origin(v),
        resolve=lambda v: v.rstrip("/"),
        empty="沿用后端发布 URL",
        hint="只供前端服务端连接后端；清空后沿用后端发布 URL。",
    )
    add(
        "node",
        "前端节点 ID",
        env.get("FRONTEND_NODE_ID", config.get("FRONTEND_NODE_ID", "web-main")),
        valid=lambda v: bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", v)),
    )
    add(
        "epoch",
        "后端来源 UUID",
        connection.get("source_epoch", "") if profile_path else settings.get("source_epoch", ""),
        valid=uuid_value,
        hint="使用后端数据库生成的 source_epoch，查询命令见后端 Docker 教程。",
    )
    add(
        "peers",
        "后端调用前端接收器的来源 IP/CIDR",
        ", ".join(backend.get("allowed_peer_ips", [])),
        valid=peer_list,
        hint="填写接收器实际看到的 Worker 或内部代理 IP/CIDR，逗号分隔。",
    )
    add(
        "tokens_file",
        "导入后端令牌文件路径",
        valid=lambda _: True,
        resolve=import_tokens,
        empty="不导入，逐项填写下方令牌",
        hint="可读取后端 runtime.env 中的两项令牌；清空路径保留当前令牌。",
    )
    for label, name in zip(("前端 → 后端令牌", "后端 → 前端令牌"), names, strict=True):
        add(
            name,
            label,
            env.get(name, ""),
            valid=token,
            secret=True,
            hint="与后端对应方向的令牌一致。输入回显，可直接编辑，回车保留已有值。",
        )
    add("host", "Web 绑定 IP（容器内）", env.get("FRONTEND_HOST", "0.0.0.0"), valid=is_ip)
    add(
        "port", "Web 监听端口（容器内）", compose.get("FRONTEND_WEB_PORT", "3000"), valid=valid_port
    )
    add(
        "receiver_host",
        "接收器绑定 IP（容器内）",
        env.get("FRONTEND_RECEIVER_HOST", settings.get("receiver_host", "0.0.0.0")),
        valid=is_ip,
    )
    add(
        "receiver_port",
        "接收器监听端口（容器内）",
        env.get("FRONTEND_RECEIVER_PORT", settings.get("receiver_port", 3001)),
        valid=valid_port,
        hint="与 Web 使用不同端口。",
    )
    add(
        "publish_host",
        "宿主机映射监听 IP",
        compose.get("FRONTEND_BIND_ADDRESS", "127.0.0.1").strip("[]"),
        valid=is_ip,
    )
    add(
        "publish_port",
        "宿主机映射端口",
        compose.get("FRONTEND_PUBLISH_PORT", "3000"),
        valid=valid_port,
    )

    def check() -> list[str]:
        errors = []
        if value(names[0]) == value(names[1]):
            errors.append("两个方向的节点令牌必须不同。")
        if (
            valid_port(value("port"))
            and valid_port(value("receiver_port"))
            and int(value("port")) == int(value("receiver_port"))
        ):
            errors.append("Web 与接收器必须使用不同端口。")
        return errors

    def save() -> None:
        config["PUBLIC_SITE_URL"] = value("site")
        config["FRONTEND_NODE_ID"] = value("node")
        connection["BACKEND_BASE_URL"] = value("api")
        backend_config = connection.setdefault("backend", {})
        if value("internal"):
            backend_config["base_url"] = value("internal")
        else:
            backend_config.pop("base_url", None)
        backend_config["allowed_peer_ips"] = [item.strip() for item in value("peers").split(",")]
        (
            backend_config["nextjs_to_fastapi_token_env"],
            backend_config["fastapi_to_nextjs_token_env"],
        ) = names
        local_settings = config.setdefault("settings", {})
        local_settings.setdefault("directory", "/data/settings")
        if profile_path:
            connection["source_epoch"] = str(UUID(value("epoch")))
        else:
            local_settings["source_epoch"] = str(UUID(value("epoch")))
        for key in ("receiver_host", "receiver_port"):
            if key in local_settings:
                local_settings[key] = int(value(key)) if key == "receiver_port" else value(key)
        config.setdefault("cache", {}).setdefault("directory", "/data/public-snapshots")
        environment = {
            **{name: value(name) for name in names},
            "FRONTEND_HOST": value("host"),
            "FRONTEND_RECEIVER_HOST": value("receiver_host"),
            "FRONTEND_RECEIVER_PORT": value("receiver_port"),
        }
        for name, field in (
            ("PUBLIC_SITE_URL", "site"),
            ("BACKEND_BASE_URL", "api"),
            ("FRONTEND_NODE_ID", "node"),
        ):
            if name in env:
                environment[name] = value(field)
        host = value("publish_host")
        mapping = {
            "FRONTEND_WEB_PORT": value("port"),
            "FRONTEND_BIND_ADDRESS": f"[{host}]" if ":" in host else host,
            "FRONTEND_PUBLISH_PORT": value("publish_port"),
        }
        outputs = {
            config_path: toml_text(config),
            env_path: update_env(env_source, environment),
            compose_path: update_env(compose_source, mapping),
        }
        if profile_path and profiles is not None:
            outputs[profile_path] = toml_text(profiles)
        (data / "plugins").mkdir(parents=True, exist_ok=True)
        (DOCKER / compose.get("FRONTEND_OUTPUT_DIR", "output")).mkdir(parents=True, exist_ok=True)
        files.write(outputs)
        print("  配置已保存。按 docker/README.md 构建产物或重新创建运行容器。")

    Menu("Everunfold Docker · 前端", fields, save=save, check=check).run()


def run() -> None:
    try:
        configure()
    except (KeyboardInterrupt, EOFError):
        print("\n已取消，未保存当前修改。")
        raise SystemExit(1) from None
    except (OSError, ValueError) as error:
        detail = error.strerror if isinstance(error, OSError) else str(error)
        raise SystemExit(f"无法配置：{detail}") from None


if __name__ == "__main__":
    run()
