"""Noninteractive setup helpers; output never contains credentials."""

import argparse
import os
import re
import shutil
import tempfile
from pathlib import Path

from config_context import Context
from config_files import update_env

DOCKER = Path(__file__).resolve().parents[1] / "docker"
ROLE = "backend" if (DOCKER.parent / "app").is_dir() else "frontend"


def paths() -> None:
    context = Context(DOCKER, ROLE)
    values = context.compose
    prefix = ROLE.upper()
    network = values.get("EVERUNFOLD_NETWORK", "bridge")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", network):
        raise ValueError("EVERUNFOLD_NETWORK 名称无效。")
    data = (DOCKER / values.get(prefix + "_DATA_DIR", "data")).resolve()
    env = (DOCKER / values.get(prefix + "_ENV_FILE", "runtime.env")).resolve()
    output = (DOCKER / values.get("FRONTEND_OUTPUT_DIR", "output")).resolve()
    source = (DOCKER / values.get(prefix + "_SOURCE_DIR", "..")).resolve()
    profile = data
    config_file = data / "config.toml"
    if (config_file.exists() or context.document) and ROLE == "frontend":
        context = Context(DOCKER, ROLE)
        if context.config.get("backend_node_file"):
            profile = context.connection_profile().parent
    from container_fields import network_alias, network_name

    extra = ",".join(
        n.strip() for n in values.get("EVERUNFOLD_EXTRA_NETWORKS", "").split(",") if n.strip()
    )
    if not network_name(network) or any(
        not network_name(n.strip()) for n in extra.split(",") if n.strip()
    ):
        raise ValueError("容器网络名称无效。")
    container = values.get(prefix + "_CONTAINER_NAME", "everunfold-" + ROLE)
    if not network_name(container):
        raise ValueError("容器名称无效。")
    alias = values.get("EVERUNFOLD_NETWORK_ALIAS", "everunfold-" + ROLE)
    gateway = values.get("EVERUNFOLD_HOST_GATEWAY", "0")
    peers = values.get("EVERUNFOLD_ALLOW_NETWORK_PEERS", "1")
    if (alias and not network_alias(alias)) or gateway not in {"0", "1"} or peers not in {"0", "1"}:
        raise ValueError("网络别名或网络开关无效。")
    image = values.get(
        prefix + "_IMAGE", "everunfold-" + ROLE + (":python312" if ROLE == "backend" else ":node22")
    )
    port = values.get(
        "BACKEND_API_PORT" if ROLE == "backend" else "FRONTEND_WEB_PORT",
        "8001" if ROLE == "backend" else "3000",
    )
    port = context.env.get("API_PORT" if ROLE == "backend" else "FRONTEND_PORT", port)
    published = values.get(prefix + "_PUBLISH_PORT", port)
    binding = values.get(prefix + "_BIND_ADDRESS", "127.0.0.1")
    uid = values.get("EVERUNFOLD_UID", str(os.getuid()))
    gid = values.get("EVERUNFOLD_GID", str(os.getgid()))
    artifact = (DOCKER / values.get("FRONTEND_ARTIFACT_DIR", "output/pre-1")).resolve()
    host = context.env.get("API_HOST" if ROLE == "backend" else "FRONTEND_HOST", "0.0.0.0")
    resolved = (
        network,
        data,
        env.parent,
        output,
        source,
        profile,
        container,
        extra,
        image,
        binding,
        published,
        port,
        env,
        uid + ":" + gid,
        artifact,
        host,
        context.config_path,
        alias,
        gateway,
        peers,
    )
    if any(
        any(char in str(value) for char in ("\n", "\r", ","))
        for i, value in enumerate(resolved)
        if i != 7
    ):
        raise ValueError("挂载路径不能包含逗号或换行。")
    for value in resolved:
        print(value)


def activate(release: str) -> None:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,79}", release):
        raise ValueError("构建版本名称无效。")
    ctx = Context(DOCKER, "frontend")
    output = (DOCKER / ctx.compose.get("FRONTEND_OUTPUT_DIR", "output")).resolve()
    artifact = output / release
    if not (artifact / ".next/BUILD_ID").is_file():
        raise ValueError("构建产物未完成，保留原部署版本。")
    staging = ctx.data / "plugin-builds" / release
    plugins = ctx.data / "plugins"
    plugins.mkdir(parents=True, exist_ok=True)
    rollback = Path(tempfile.mkdtemp(prefix=".plugins-backup-", dir=ctx.data))
    previous: list[tuple[Path, Path | None]] = []
    try:
        for candidate in staging.iterdir():
            if not candidate.is_dir() or not (candidate / "manifest.json").is_file():
                raise ValueError("插件构建未完成，保留原部署版本。")
            target = plugins / candidate.name
            old = rollback / candidate.name if target.exists() else None
            if old:
                os.replace(target, old)
            previous.append((target, old))
            ready = rollback / (candidate.name + ".new")
            shutil.copytree(candidate, ready)
            os.replace(ready, target)
        ctx.write(
            {
                ctx.compose_path: update_env(
                    ctx.compose_source, {"FRONTEND_ARTIFACT_DIR": str(artifact)}
                )
            }
        )
    except BaseException:
        for target, old in reversed(previous):
            if target.exists():
                shutil.rmtree(target)
            if old:
                os.replace(old, target)
        raise
    finally:
        shutil.rmtree(rollback)
    print(f"已选择前端产物：{artifact}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action", choices=("paths", "activate", "render", "connection-path", "import-command")
    )
    parser.add_argument("release", nargs="?")
    args = parser.parse_args()
    try:
        if args.action == "paths":
            paths()
        elif args.action in {"connection-path", "import-command"}:
            from config_validation import identifier

            context = Context(DOCKER, ROLE)
            node = context.meta.get("node", "")
            if ROLE != "backend" or not identifier(node):
                raise ValueError("节点 ID 无效。")
            path = str((context.data / "connections" / (node + ".json")).resolve())
            if args.action == "import-command":
                from config_copy import frontend_import_command

                print("在前端项目根目录执行（跨主机请先传输文件并替换路径）：")
                print(frontend_import_command(path, False))
            else:
                print(path)
        elif args.action == "render":
            context = Context(DOCKER, ROLE)
            if not context.document:
                raise ValueError("请先在项目根目录运行 ./setup.sh --docker 并保存 config.yaml。")
            context.materialize()
        else:
            activate(args.release or "")
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from None


if __name__ == "__main__":
    main()
