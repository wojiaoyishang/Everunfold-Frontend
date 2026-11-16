"""Container settings shared by both project configuration assistants."""

import os
import re
from pathlib import Path

from config_model import Check


def network_name(value: str) -> bool:
    return value not in {"host", "none", "default"} and bool(
        re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", value)
    )


def network_list(value: str) -> bool:
    return not value or all(network_name(name.strip()) for name in value.split(","))


def access_networks(primary: str, extra: str, internal: str, proxy: str) -> tuple[str, str]:
    """Validate the names against the networks attached by the launcher."""
    internal, proxy = internal.strip(), proxy.strip()
    if not network_list(internal) or (proxy and not network_name(proxy)):
        raise ValueError("内部调用或宿主机反代的 Docker 网络名称无效。")
    peer_names = (
        list(dict.fromkeys(name.strip() for name in internal.split(","))) if internal else []
    )
    attached = {primary, *(name.strip() for name in extra.split(","))}
    missing = set(peer_names + ([proxy] if proxy else [])) - attached
    if missing:
        raise ValueError("请将这些网络加入主网络或额外网络：" + "、".join(sorted(missing)))
    return ",".join(peer_names), proxy


def mount_path(value: str) -> bool:
    return bool(value) and not any(char in value for char in (",", "\n", "\r", "\x00"))


def network_alias(value: str) -> bool:
    return bool(re.fullmatch(r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?", value))


def add_container_fields(ctx, add, value):
    prefix = ctx.role.upper()
    attached_networks = (
        ctx.compose.get("EVERUNFOLD_NETWORK", "bridge"),
        ctx.compose.get("EVERUNFOLD_EXTRA_NETWORKS", ""),
        ctx.compose.get("EVERUNFOLD_HOST_GATEWAY", "0"),
    )
    fields = [
        (
            "source_dir",
            "代码目录" if ctx.role == "frontend" else "代码目录 → /workspace",
            prefix + "_SOURCE_DIR",
            str(ctx.docker.parent),
        ),
        ("data_dir", "数据目录 → /data", prefix + "_DATA_DIR", str(ctx.data)),
        ("container_name", "容器名称", prefix + "_CONTAINER_NAME", "everunfold-" + ctx.role),
        ("network", "主网络（默认桥接填 bridge）", "EVERUNFOLD_NETWORK", "bridge"),
        ("extra_networks", "额外网络（逗号分隔）", "EVERUNFOLD_EXTRA_NETWORKS", ""),
        ("network_alias", "网络别名（推荐）", "EVERUNFOLD_NETWORK_ALIAS", "everunfold-" + ctx.role),
        ("host_gateway", "映射 host.docker.internal（1/0）", "EVERUNFOLD_HOST_GATEWAY", "0"),
        ("network_peers", "自动允许所选网络内部调用（1/0）", "EVERUNFOLD_ALLOW_NETWORK_PEERS", "1"),
        (
            "internal_peer_networks",
            "允许内部调用的 Docker 网络",
            "EVERUNFOLD_INTERNAL_PEER_NETWORKS",
            "",
        ),
        ("tls_proxy_network", "宿主机反代所在的 Docker 网络", "EVERUNFOLD_TLS_PROXY_NETWORK", ""),
    ]
    if ctx.role == "frontend":
        fields.append(
            ("output_dir", "编译产物输出目录", "FRONTEND_OUTPUT_DIR", str(ctx.docker / "output"))
        )
    for key, label, name, default in fields:
        is_path = key.endswith("_dir")
        initial = ctx.compose.get(name, default)
        if is_path:
            initial = str((ctx.docker / initial).resolve())
        add(
            key,
            label,
            initial,
            group="容器设置",
            active=lambda: not ctx.native,
            valid=(
                mount_path
                if is_path
                else (lambda v: v in {"0", "1"})
                if key in {"host_gateway", "network_peers"}
                else (lambda v: not v or network_alias(v))
                if key == "network_alias"
                else network_list
                if key in {"extra_networks", "internal_peer_networks"}
                else (lambda v: not v or network_name(v))
                if key == "tls_proxy_network"
                else network_name
            ),
            resolve=(lambda v: str((ctx.docker / Path(v).expanduser()).resolve()) if v else "")
            if is_path
            else lambda v: v.strip(),
            empty={
                "extra_networks": "不接入额外网络",
                "internal_peer_networks": "沿用自动允许开关",
                "tls_proxy_network": "仅使用手填代理 IP",
            }.get(key, "待填写"),
            hint=(
                (
                    "自定义网络上的名称，如 everunfold-backend。两端须加入同一网络，"
                    "使用容器内部端口；默认 bridge 不支持别名。"
                )
                if key == "network_alias"
                else (
                    "1 开启、0 关闭。映射到宿主网关，使用宿主映射端口（例如 3434）；"
                    "仅绑定 127.0.0.1 的宿主服务不能从此地址访问。"
                )
                if key == "host_gateway"
                else (
                    "未指定内部调用网络时生效。1 允许已连接网络、0 仅用手填来源。"
                    "仍需令牌。已连接网络范围："
                )
                + (os.environ.get("EVERUNFOLD_NETWORK_CIDRS", "").strip(",") or "启动时读取")
                if key == "network_peers"
                else (
                    ("后端 → 前端。" if ctx.role == "frontend" else "前端 → 后端。")
                    + "逗号分隔，例如 1panel-network。填写后只追加这些网络的来源范围。"
                )
                if key == "internal_peer_networks"
                else "例如 1panel-network。信任该网桥的宿主网关，用于节点控制台 HTTPS。"
                if key == "tls_proxy_network"
                else "例如 1panel-network；保存后重新打开助手，连接检测才会使用新网络。"
                if key in {"network", "extra_networks"}
                else "宿主目录；容器内路径固定。修改数据目录不会搬运原有媒体。"
                if is_path
                else "启动时重新创建此容器，挂载数据保留。"
            ),
        )

    def mapping():
        return {name: value(key) for key, _, name, _ in fields} if not ctx.native else {}

    def errors():
        if ctx.native:
            return []
        errors = []
        if value("source_dir") == value("data_dir"):
            errors.append("代码目录和数据目录必须不同。")
        try:
            access_networks(
                value("network"),
                value("extra_networks"),
                value("internal_peer_networks"),
                value("tls_proxy_network"),
            )
        except ValueError as error:
            errors.append(str(error))
        return errors

    def pending_network():
        if ctx.native:
            return []
        if (value("network"), value("extra_networks"), value("host_gateway")) != attached_networks:
            return [Check("容器网络", "warning", "请先仅保存并重新打开助手，再从新网络检测连接。")]
        return []

    return mapping, errors, pending_network
