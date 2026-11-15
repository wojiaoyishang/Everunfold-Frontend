#!/usr/bin/env python3
"""Interactive Docker configuration for a new instance."""

import getpass
import ipaddress
import json
import os
import re
import sys
from collections.abc import Callable
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

DOCKER = Path(__file__).resolve().parent
DATA = DOCKER / "data"
TOKEN_NAMES = ("NEXTJS_TO_FASTAPI_WEB_MAIN_TOKEN", "FASTAPI_TO_NEXTJS_WEB_MAIN_TOKEN")


def section(title: str) -> None:
    print(f"\n── {title} ─────────────────────────────")


def ask(
    label: str,
    default: str = "",
    *,
    hidden: bool = False,
    valid: Callable[[str], bool] = bool,
) -> str:
    suffix = f" [{default}]" if default else ""
    while True:
        read = getpass.getpass if hidden else input
        value = read(f"  {label}{suffix}: ")
        if not hidden:
            value = value.strip()
        value = value or default
        if valid(value) and all(ord(char) >= 32 and ord(char) != 127 for char in value):
            return value
        print("  格式不正确，请重试。")


def origin(value: str, *, https: bool = False) -> bool:
    try:
        url = urlsplit(value)
        return (
            url.scheme in ({"https"} if https else {"http", "https"})
            and bool(url.hostname)
            and (url.port is None or url.port > 0)
            and not (url.username or url.password or url.query or url.fragment)
            and not re.search(r"\s|[\\?#]", value)
            and url.path in ("", "/")
        )
    except ValueError:
        return False


def peers(label: str) -> list[str]:
    def valid(value: str) -> bool:
        try:
            for item in value.split(","):
                ipaddress.ip_network(item.strip(), strict=False)
            return True
        except ValueError:
            return False

    return [item.strip() for item in ask(label, valid=valid).split(",")]


def token(value: str) -> bool:
    return re.fullmatch(r"[!-~]{32,}", value) is not None


def env_text(values: dict[str, str]) -> str:
    # Compose interprets $$ as a literal dollar sign in double-quoted values.
    return "".join(
        f"{name}={json.dumps(value.replace('$', '$$'), ensure_ascii=False)}\n"
        for name, value in values.items()
    )


def write_new(files: dict[Path, str]) -> None:
    written = []
    try:
        for file, content in files.items():
            file.parent.mkdir(parents=True, exist_ok=True)
            descriptor = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            written.append(file)
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                stream.write(content)
    except OSError:
        for file in written:
            file.unlink(missing_ok=True)
        raise
    for file in written:
        print(f"  已写入 {file.relative_to(DOCKER)}")


TARGETS = (DATA / "config.toml", DOCKER / "runtime.env", DOCKER / ".env")


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
    return "*" not in host and (url.scheme == "https" or local)


def read_tokens() -> dict[str, str]:
    print("  两端使用同一组令牌。可从后端向导生成的 runtime.env 导入。")
    while True:
        source = ask("后端 runtime.env 路径（留空则手输令牌）", valid=lambda _: True)
        if not source:
            break
        try:
            lines = Path(source).expanduser().read_text(encoding="utf-8").splitlines()
            values = {}
            for line in lines:
                name, _, raw = line.partition("=")
                if name.strip() in TOKEN_NAMES:
                    value = raw.strip()
                    if value.startswith('"') and value.endswith('"'):
                        value = json.loads(value).replace("$$", "$")
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1].replace("\\'", "'")
                    values[name.strip()] = value
            if all(token(values.get(name, "")) for name in TOKEN_NAMES):
                return {
                    name: ask(
                        f"{label}（留空使用导入值）",
                        hidden=True,
                        valid=lambda value: not value or token(value),
                    )
                    or values[name]
                    for label, name in zip(
                        ("前端 → 后端令牌", "后端 → 前端令牌"), TOKEN_NAMES, strict=True
                    )
                }
        except (OSError, UnicodeError, json.JSONDecodeError):
            pass
        print("  无法读取两项令牌，请检查文件路径或留空手输。")
    return {
        name: ask(label, hidden=True, valid=token)
        for label, name in zip(("前端 → 后端令牌", "后端 → 前端令牌"), TOKEN_NAMES, strict=True)
    }


def configure() -> None:
    section("Everunfold Docker · 前端")
    section("对外发布 URL")
    print("  填写实际公开根 URL，反代部署填 HTTPS 入口；本机调试可用回环 HTTP。")
    print("  后端发布 URL 供浏览器调用 API，前端发布 URL 用于站点页面和 SEO 链接。")
    api = ask("后端发布 URL（与后端 BACKEND_BASE_URL 一致）", valid=public_url).rstrip("/")
    site = ask("前端发布 URL", valid=public_url).rstrip("/")
    section("前端服务端连接后端")
    internal = ask(
        "后端内部连接 URL（留空沿用后端发布 URL）", valid=lambda v: not v or origin(v)
    ).rstrip("/")
    node = ask(
        "前端节点 ID",
        "web-main",
        valid=lambda v: bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", v)),
    )
    print("  来源 UUID 由后端数据库生成，请按后端手册查询。")
    epoch = str(UUID(ask("后端来源 UUID", valid=uuid_value)))
    allowed = peers("接收器实际看到的 Worker 或内部代理 IP/CIDR，逗号分隔")

    section("部署令牌")
    env = read_tokens()
    if env[TOKEN_NAMES[0]] == env[TOKEN_NAMES[1]]:
        raise SystemExit("两个方向的令牌必须不同，配置未写入。")
    section("前端进程监听（容器内）")
    env["FRONTEND_HOST"] = ask("Web 绑定 IP", "0.0.0.0", valid=is_ip)
    port = ask("Web 监听端口", "3000", valid=valid_port)
    env["FRONTEND_RECEIVER_HOST"] = ask("接收器绑定 IP", "0.0.0.0", valid=is_ip)
    env["FRONTEND_RECEIVER_PORT"] = ask(
        "接收器监听端口（与 Web 端口不同）",
        "3001" if int(port) != 3001 else "3002",
        valid=lambda v: valid_port(v) and int(v) != int(port),
    )
    section("Docker 宿主端口映射")
    print("  映射 Web 端口；接收器仅通过部署网络访问。发布 URL 独立配置。")
    publish_host = ask("宿主机映射监听 IP", "127.0.0.1", valid=is_ip)
    publish_host = f"[{publish_host}]" if ":" in publish_host else publish_host
    publish_port = ask("宿主机映射端口", "3000", valid=valid_port)

    config = f"""# 浏览器调用 API 的公开根 URL，与后端发布 URL 一致。
BACKEND_BASE_URL = {json.dumps(api)}
# 本前端站点的发布根 URL，用于页面 canonical、站点地图和订阅链接。
PUBLIC_SITE_URL = {json.dumps(site)}
FRONTEND_NODE_ID = {json.dumps(node)}

[backend]
# 仅前端服务端连接后端使用，独立于公开 URL 和前端监听地址。
base_url = {json.dumps(internal or api)}
allowed_peer_ips = {json.dumps(allowed)}
nextjs_to_fastapi_token_env = "{TOKEN_NAMES[0]}"
fastapi_to_nextjs_token_env = "{TOKEN_NAMES[1]}"

[settings]
directory = "/data/settings"
source_epoch = "{epoch}"

[cache]
directory = "/data/public-snapshots"
"""

    section("保存")
    print(f"  前端发布 URL {site} · 后端发布 URL {api}")
    print(f"  后端内部连接 {internal or api} · 节点 {node}")
    print(f"  Web 监听 {env['FRONTEND_HOST']}:{port} · 宿主映射 {publish_host}:{publish_port}")
    print(f"  接收器监听 {env['FRONTEND_RECEIVER_HOST']}:{env['FRONTEND_RECEIVER_PORT']}")
    if ask("写入前端配置（y/N）", "n").lower() != "y":
        print("  已取消，未写入。")
        return
    (DATA / "plugins").mkdir(parents=True, exist_ok=True)
    (DOCKER / "output").mkdir(exist_ok=True)
    compose = env_text(
        {
            "FRONTEND_WEB_PORT": port,
            "FRONTEND_BIND_ADDRESS": publish_host,
            "FRONTEND_PUBLISH_PORT": publish_port,
        }
    )
    write_new(dict(zip(TARGETS, (config, env_text(env), compose), strict=True)))
    print("  按 docker/README.md 构建产物并启动，之后在后端完成节点同步。")


def run() -> None:
    if not sys.stdin.isatty():
        raise SystemExit("请从交互式终端运行此向导。")
    if any(file.exists() for file in TARGETS):
        raise SystemExit("检测到现有配置。请直接编辑已有文件，向导不会覆盖配置或轮换密钥。")
    try:
        configure()
    except (KeyboardInterrupt, EOFError):
        print("\n已取消配置。")
        raise SystemExit(1) from None
    except OSError as error:
        raise SystemExit(f"无法保存配置：{error.strerror}") from None


if __name__ == "__main__":
    run()
