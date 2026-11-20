"""Container settings shared by both project configuration assistants."""

import re
from pathlib import Path

from config_model import Check


def network_name(value: str) -> bool:
    return value not in {"host", "none", "default"} and bool(
        re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", value)
    )


def network_list(value: str) -> bool:
    return not value or all(network_name(name.strip()) for name in value.split(","))


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
                if key == "host_gateway"
                else (lambda v: not v or network_alias(v))
                if key == "network_alias"
                else network_list
                if key == "extra_networks"
                else network_name
            ),
            resolve=(lambda v: str((ctx.docker / Path(v).expanduser()).resolve()) if v else "")
            if is_path
            else lambda v: v.strip(),
            empty={
                "extra_networks": "不接入额外网络",
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
        return errors

    def pending_network():
        if ctx.native:
            return []
        if (value("network"), value("extra_networks"), value("host_gateway")) != attached_networks:
            return [Check("容器网络", "warning", "请先仅保存并重新打开助手，再从新网络检测连接。")]
        return []

    return mapping, errors, pending_network
