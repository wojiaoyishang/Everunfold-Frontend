#!/usr/bin/env python3
"""Everunfold frontend deployment configuration."""

import argparse
import copy
import json
import os
import re
from pathlib import Path
from uuid import UUID

from config_context import Context
from config_files import env_values, toml_text, update_env
from config_model import Configuration, Field
from config_probes import frontend_checks
from config_validation import (
    identifier,
    internal_url,
    ip_address,
    peer_list,
    positive,
    public_url,
    token,
    uuid_value,
    valid_port,
)
from connection_bundle import decode_bundle, validate_bundle
from container_fields import add_container_fields
from node_console_fields import add_node_console_fields

DOCKER = Path(__file__).resolve().parents[1] / "docker"
TOKEN_NAMES = ("NEXTJS_TO_FASTAPI_WEB_MAIN_TOKEN", "FASTAPI_TO_NEXTJS_WEB_MAIN_TOKEN")


def configure(native: bool = False) -> Configuration:
    ctx = Context(DOCKER, "frontend", native)
    config, env, compose = ctx.config, ctx.env, ctx.compose
    profile_path = None
    profiles = None
    connection = config
    if "connection_profiles" in ctx.document or config.get("backend_node_file"):
        if config.get("backend_node_file"):
            profile_path = ctx.connection_profile()
            if not native:
                config["backend_node_file"] = str(profile_path.relative_to(ctx.data))
        profiles = ctx.read_profiles(profile_path or ctx.data / "backend-nodes.toml")
        connection = profiles.get("profiles", {}).get(profiles.get("active"))
        if not isinstance(connection, dict):
            raise ValueError("独立后端连接文件缺少有效的 active 配置。")
        connection = copy.deepcopy(connection)
        profiles["profiles"][profiles["active"]] = connection
        if "BACKEND_BASE_URL" in env:
            raise ValueError("独立连接文件启用时，请先移除 runtime.env 的 BACKEND_BASE_URL 覆盖。")
    backend = connection.get("backend", {})
    settings = config.get("settings", {})
    names = [
        backend.get("nextjs_to_fastapi_token_env", TOKEN_NAMES[0]),
        backend.get("fastapi_to_nextjs_token_env", TOKEN_NAMES[1]),
    ]
    fields: list[Field] = []
    by_key: dict[str, Field] = {}

    def add(key: str, label: str, value: str = "", **kwargs) -> Field:
        item = Field(key, label, str(value), **kwargs)
        fields.append(item)
        by_key[key] = item
        return item

    def value(key: str) -> str:
        return by_key[key].value

    def apply_bundle(bundle: dict) -> None:
        incoming, outgoing = bundle["tokens"]["inbound"], bundle["tokens"]["outbound"]
        proposed = {
            "api": bundle["backend_public_url"],
            "epoch": bundle["source_epoch"],
            "node": bundle["node_id"],
            "inbound": incoming["value"],
            "outbound": outgoing["value"],
        }
        for key, text in proposed.items():
            by_key[key].value = text
        names[:] = [incoming["name"], outgoing["name"]]

    def import_base64(source: str) -> str:
        if source.strip():
            apply_bundle(decode_bundle(source))
        return ""  # Keep credentials in their fields, not a second encoded copy.

    def import_connection(source: str) -> str:
        if not source:
            return ""
        try:
            path = Path(source).expanduser()
            if path.stat().st_size > 65536:
                raise ValueError
            text = path.read_text()
            if text.lstrip().startswith("{"):
                bundle = validate_bundle(json.loads(text))
                incoming, outgoing = bundle["tokens"]["inbound"], bundle["tokens"]["outbound"]
                proposed = {
                    "api": bundle["backend_public_url"],
                    "epoch": bundle["source_epoch"],
                    "node": bundle["node_id"],
                    "inbound": incoming["value"],
                    "outbound": outgoing["value"],
                }
                references = [incoming["name"], outgoing["name"]]
                if bundle.get("format") != "everunfold-node-connection/v1":
                    raise ValueError
                if not all(
                    isinstance(v, str) and re.fullmatch(r"[A-Z_][A-Z0-9_]*", v) for v in references
                ):
                    raise ValueError
            else:
                imported = env_values(text)
                proposed = {
                    "inbound": imported.get(names[0], imported.get(TOKEN_NAMES[0], "")),
                    "outbound": imported.get(names[1], imported.get(TOKEN_NAMES[1], "")),
                }
                references = list(names)
            if not all(
                isinstance(text, str) and by_key[key].valid(text) for key, text in proposed.items()
            ):
                raise ValueError
            if proposed["inbound"] == proposed["outbound"] or references[0] == references[1]:
                raise ValueError
        except FileNotFoundError:
            hint = (
                ""
                if native
                else "；宿主文件请用 ./setup.sh --docker --connection-file 文件绝对路径 导入"
            )
            raise ValueError("当前环境找不到该连接文件" + hint) from None
        except PermissionError:
            raise ValueError("当前运行用户没有读取该连接文件的权限。") from None
        except (OSError, ValueError, KeyError, TypeError):
            raise ValueError("连接文件无效：请检查格式、大小、来源 UUID 和双向令牌。") from None
        for key, text in proposed.items():
            by_key[key].value = text
        names[:] = references
        return source

    container_mapping, container_errors, pending_network = add_container_fields(ctx, add, value)

    add(
        "connection_base64",
        "粘贴后端连接 Base64",
        valid=lambda _: True,
        resolve=import_base64,
        secret=True,
        empty="选中后粘贴导入；也可逐项填写",
        hint="直接粘贴后端导出的完整编码，无需共享文件。导入后检查内部 URL 和来源 IP，再保存。",
    )
    add(
        "connection_file",
        "导入旧连接文件（可选）",
        valid=lambda _: True,
        resolve=import_connection,
        empty="选中后导入；也可逐项填写",
        hint="填写后端导出的 connections/节点ID.json 路径；旧 runtime.env 仅导入令牌。"
        "Docker 宿主文件可用 ./setup.sh --docker --connection-file 文件绝对路径 只读导入。",
    )
    add(
        "api",
        "后端发布 URL",
        env.get("BACKEND_BASE_URL", connection.get("BACKEND_BASE_URL", "")),
        valid=public_url,
        resolve=lambda v: v.rstrip("/"),
        hint="浏览器访问 API 的公开入口。粘贴 Base64 可自动填写。",
    )
    add(
        "site",
        "前端发布 URL",
        env.get("PUBLIC_SITE_URL", config.get("PUBLIC_SITE_URL", "http://127.0.0.1:3000")),
        valid=public_url,
        resolve=lambda v: v.rstrip("/"),
        hint="本站页面、canonical、站点地图的公开根地址；与进程监听独立。",
    )
    add(
        "internal",
        "后端内部连接 URL",
        backend.get("base_url", ""),
        valid=lambda v: not v or internal_url(v),
        resolve=lambda v: v.rstrip("/"),
        empty="沿用后端发布 URL",
        hint="前端服务端访问后端。支持容器内网 HTTP/HTTPS，例如 http://everunfold-backend:8001；检测只访问此地址。",
    )
    add(
        "node",
        "前端节点 ID",
        env.get(
            "FRONTEND_NODE_ID",
            connection.get("FRONTEND_NODE_ID", config.get("FRONTEND_NODE_ID", "web-main")),
        ),
        valid=identifier,
        group="节点",
    )
    add(
        "epoch",
        "后端来源 UUID",
        connection.get("source_epoch", "")
        if profiles is not None
        else settings.get("source_epoch", ""),
        valid=uuid_value,
        group="节点",
        hint="由后端初始化数据库后导出，粘贴 Base64 自动填写。",
    )
    add(
        "peers",
        "后端调用前端接收器的来源 IP/CIDR",
        ", ".join(backend.get("allowed_peer_ips", ctx.peers())),
        valid=lambda v: bool(v) and peer_list(v),
        group="节点",
        hint=(
            "填写接收器实际看到的 Worker 或内部代理来源。"
            "容器设置可自动追加所选网络 CIDR；仍须对应节点令牌。"
        ),
    )
    for key, label, name in zip(
        ("inbound", "outbound"), ("前端 → 后端令牌", "后端 → 前端令牌"), names, strict=True
    ):
        add(
            key,
            label,
            env.get(name, ""),
            valid=token,
            secret=True,
            group="节点",
            hint="粘贴该节点的后端连接 Base64 自动填写，可查看或修改。",
        )
    save_console = add_node_console_fields(ctx, add, value)
    add(
        "host",
        "前端绑定 IP",
        env.get("FRONTEND_HOST", "127.0.0.1" if native else "0.0.0.0"),
        valid=ip_address,
        group="进程",
    )
    add(
        "port",
        "前端监听端口",
        env.get("FRONTEND_PORT", compose.get("FRONTEND_WEB_PORT", "3000")),
        valid=valid_port,
        group="进程",
    )
    add(
        "publish_host",
        "宿主映射绑定 IP",
        compose.get("FRONTEND_BIND_ADDRESS", "127.0.0.1").strip("[]"),
        valid=lambda s: "%" not in s and ip_address(s),
        hint="127.0.0.1 供宿主反代；0.0.0.0 绑定全部 IPv4 接口；也可填宿主具体 IPv4 或 IPv6。",
        active=lambda: not native,
        group="Docker",
    )
    add(
        "publish_port",
        "宿主映射端口",
        compose.get("FRONTEND_PUBLISH_PORT", "3000"),
        valid=valid_port,
        active=lambda: not native,
        group="Docker",
    )
    add(
        "image",
        "镜像名称",
        compose.get("FRONTEND_IMAGE", "everunfold-frontend:node22"),
        valid=lambda v: bool(re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._/:@-]+", v)),
        active=lambda: not native,
        group="Docker",
    )
    add(
        "build_workers",
        "编译 worker 数量",
        compose.get("FRONTEND_BUILD_WORKERS", "2"),
        valid=positive,
        group="构建",
    )
    add(
        "memory",
        "编译 Node 内存上限（MiB）",
        ctx.meta.get("build_memory", "3072"),
        valid=positive,
        group="构建",
    )

    def check() -> list[str]:
        errors = container_errors()
        if value("inbound") == value("outbound"):
            errors.append("两个方向的节点令牌必须不同。")
        return errors

    async def probe():
        if pending_network():
            return pending_network()
        return await frontend_checks(value("api"), value("internal"))

    def save() -> None:
        config["PUBLIC_SITE_URL"] = value("site")
        if profiles is not None:
            connection["FRONTEND_NODE_ID"] = value("node")
        else:
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
        local_settings.setdefault("directory", ctx.runtime_path("settings"))
        if profiles is not None:
            connection["source_epoch"] = str(UUID(value("epoch")))
        else:
            local_settings["source_epoch"] = str(UUID(value("epoch")))
        for key in ("receiver_host", "receiver_port"):
            local_settings.pop(key, None)
        config.setdefault("cache", {}).setdefault("directory", ctx.runtime_path("public-snapshots"))
        environment = {
            names[0]: value("inbound"),
            names[1]: value("outbound"),
            "FRONTEND_HOST": value("host"),
            "FRONTEND_PORT": value("port"),
        }
        save_console(environment)
        for name, key in (
            ("PUBLIC_SITE_URL", "site"),
            ("BACKEND_BASE_URL", "api"),
            ("FRONTEND_NODE_ID", "node"),
        ):
            if name in env:
                environment[name] = value(key)
        host = value("publish_host")
        mapping = {
            "FRONTEND_BUILD_WORKERS": value("build_workers"),
            "FRONTEND_BUILD_NODE_OPTIONS": "--max-old-space-size=" + value("memory"),
        }
        if not native:
            mapping.update(
                {
                    "FRONTEND_WEB_PORT": value("port"),
                    "FRONTEND_BIND_ADDRESS": f"[{host}]" if ":" in host else host,
                    "FRONTEND_PUBLISH_PORT": value("publish_port"),
                    "FRONTEND_IMAGE": value("image"),
                }
            )
        if not native:
            mapping.setdefault("EVERUNFOLD_UID", compose.get("EVERUNFOLD_UID", str(os.getuid())))
            mapping.setdefault("EVERUNFOLD_GID", compose.get("EVERUNFOLD_GID", str(os.getgid())))
        outputs = {
            ctx.config_path: toml_text(config),
            ctx.env_path: update_env(ctx.env_source, environment),
            ctx.compose_path: update_env(ctx.compose_source, mapping),
            ctx.meta_path: json.dumps({"build_memory": value("memory")}, indent=2) + "\n",
        }
        if profile_path and profiles is not None:
            outputs[profile_path] = toml_text(profiles)
        outputs[ctx.compose_path] = update_env(outputs[ctx.compose_path], container_mapping())
        ctx.write(outputs, connection_profiles=profiles)

    notice = ""
    encoded = os.environ.pop("EVERUNFOLD_CONNECTION_BASE64", "")
    selected_file = os.environ.get("EVERUNFOLD_CONNECTION_FILE", "")
    if encoded and selected_file:
        notice = "请仅选择 Base64 或旧连接文件中的一种导入方式。"
    elif encoded:
        try:
            import_base64(encoded)
            notice = "Base64 已导入，请检查内部 URL 和来源 IP，确认后保存。"
        except ValueError as error:
            notice = str(error)
    elif selected_file:
        by_key["connection_file"].value = selected_file
        try:
            import_connection(selected_file)
            notice = "连接文件已导入，可检查并修改后保存。"
        except ValueError as error:
            notice = str(error)

    return Configuration(
        "Everunfold Frontend",
        fields,
        save=save,
        check=check,
        probe=probe,
        native=native,
        location=str(ctx.root_path),
        notice=notice,
    )


def run() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native", action="store_true")
    args = parser.parse_args()
    try:
        from config_ui import run as ui_run

        raise SystemExit(ui_run(configure(args.native)))
    except (KeyboardInterrupt, EOFError):
        raise SystemExit(10) from None
    except (OSError, ValueError) as error:
        detail = error.strerror if isinstance(error, OSError) else str(error)
        raise SystemExit(f"无法配置：{detail}") from None


if __name__ == "__main__":
    run()
