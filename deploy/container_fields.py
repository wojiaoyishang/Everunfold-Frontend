"""Container settings shared by both project configuration assistants."""

import re
from pathlib import Path

from config_model import Check


def network_name(value: str) -> bool:
    return value not in {"host", "none", "default"} and bool(
        re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", value)
    )


def mount_path(value: str) -> bool:
    return bool(value) and not any(char in value for char in (",", "\n", "\r", "\x00"))


def add_container_fields(ctx, add, value):
    prefix = ctx.role.upper()
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
                else (lambda v: all(network_name(n.strip()) for n in v.split(",")) if v else True)
                if key == "extra_networks"
                else network_name
            ),
            resolve=(lambda v: str((ctx.docker / Path(v).expanduser()).resolve()) if v else "")
            if is_path
            else lambda v: v.strip(),
            empty="不接入额外网络" if key == "extra_networks" else "待填写",
            hint=(
                "例如 1panel-network；保存后重新打开助手，连接检测才会使用新网络。"
                if key in {"network", "extra_networks"}
                else "宿主目录；容器内路径固定。修改数据目录不会搬运原有媒体。"
                if is_path
                else "启动时重新创建此容器，挂载数据保留。"
            ),
        )

    def mapping():
        return {name: value(key) for key, _, name, _ in fields} if not ctx.native else {}

    def errors():
        if not ctx.native and value("source_dir") == value("data_dir"):
            return ["代码目录和数据目录必须不同。"]
        return []

    def pending_network():
        if ctx.native:
            return []
        if (value("network"), value("extra_networks")) != (
            ctx.compose.get("EVERUNFOLD_NETWORK", "bridge"),
            ctx.compose.get("EVERUNFOLD_EXTRA_NETWORKS", ""),
        ):
            return [Check("容器网络", "warning", "请先仅保存并重新打开助手，再从新网络检测连接。")]
        return []

    return mapping, errors, pending_network
