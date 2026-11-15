"""Bounded, read-only connection checks; errors never include credentials."""

import ast
import asyncio
import socket
import ssl
import urllib.error
import urllib.request
from pathlib import Path

import asyncpg
from config_model import Check
from config_validation import db_url, internal_url, redis_url
from redis.asyncio import Redis


def failure(error: Exception) -> str:
    if isinstance(
        error, (asyncpg.InvalidPasswordError, asyncpg.InvalidAuthorizationSpecificationError)
    ):
        return "认证失败，请检查用户名、密码和访问规则"
    if isinstance(error, asyncpg.InvalidCatalogNameError):
        return "数据库不存在，请先创建数据库"
    if isinstance(error, asyncpg.InsufficientPrivilegeError):
        return "权限不足"
    if isinstance(error, (TimeoutError, asyncio.TimeoutError)):
        return "连接超时，请检查网络或防火墙"
    if isinstance(error, socket.gaierror):
        return "主机名无法解析"
    if isinstance(error, ssl.SSLError):
        return "TLS 验证失败"
    if isinstance(error, ConnectionRefusedError):
        return "连接被拒绝，请检查服务和端口"
    if type(error).__name__ in {"AuthenticationError", "AuthorizationError"}:
        return "认证失败，请检查用户名、密码和访问规则"
    return "连接失败，请检查地址、网络、TLS 和服务权限"


def expected_revision(root: Path) -> str:
    tree = ast.parse((root / "app/core/database.py").read_text())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "SCHEMA_REVISION"
            for target in node.targets
        ):
            return str(ast.literal_eval(node.value))
    raise ValueError("无法确定代码的数据库迁移版本。")


async def database_is_empty(connection) -> bool:
    # pg_class also sees objects inaccessible to the deployment role. Do not mistake
    # a database with somebody else's tables, views or sequences for a new database.
    return not await connection.fetchval(
        "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_class c "
        "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace "
        "WHERE n.nspname <> 'information_schema' AND n.nspname !~ '^pg_' "
        "AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f', 'c'))"
    )


async def database_state(connection, root: Path) -> Check:
    if await database_is_empty(connection):
        return Check("数据库迁移", "warning", "数据库为空，尚未初始化", "empty")
    if not await connection.fetchval("SELECT to_regclass('alembic_version')"):
        return Check(
            "数据库迁移", "error", "数据库已有对象但无迁移记录，拒绝按空库初始化", "unmanaged"
        )
    rows = await connection.fetch("SELECT version_num FROM alembic_version")
    expected = expected_revision(root)
    current = {str(row["version_num"]) for row in rows}
    if current == {expected}:
        return Check("数据库迁移", "ok", "已同步：" + expected, "current")
    return Check(
        "数据库迁移", "warning", "已有数据库需要显式升级迁移；代码要求 " + expected, "migration"
    )


async def postgres(url: str, root: Path) -> list[Check]:
    if not db_url(url):
        return [Check("PostgreSQL", "error", "请先填写有效的 PostgreSQL URL")]
    connection = None
    try:
        connection = await asyncpg.connect(
            url.replace("postgresql+asyncpg://", "postgresql://", 1),
            timeout=5,
            command_timeout=5,
        )
        async with connection.transaction(readonly=True):
            await connection.fetchval("SELECT 1")
            return [
                Check("PostgreSQL", "ok", "连接、认证和查询通过"),
                await database_state(connection, root),
            ]
    except Exception as error:
        return [Check("PostgreSQL", "error", failure(error))]
    finally:
        if connection:
            await connection.close(timeout=2)


async def redis_check(name: str, url: str) -> Check:
    if not redis_url(url):
        return Check(name, "error", "请先填写有效的 Redis URL")
    client = Redis.from_url(url, socket_connect_timeout=5, socket_timeout=5)
    try:
        await client.ping()
        return Check(name, "ok", "连接、认证和 PING 通过")
    except Exception as error:
        return Check(name, "error", failure(error))
    finally:
        await client.aclose()


async def backend_checks(database: str, redis: str, broker: str, root: Path) -> list[Check]:
    database_results, runtime, queue = await asyncio.gather(
        postgres(database, root),
        redis_check("运行 Redis", redis),
        redis_check("Celery Broker", broker),
    )
    return [*database_results, runtime, queue]


async def frontend_checks(api: str, internal: str) -> list[Check]:
    def check(name: str, url: str) -> Check:
        if not internal_url(url):
            return Check(name, "error", "请填写有效的后端内部 HTTP/HTTPS 地址")
        try:
            with urllib.request.urlopen(url.rstrip("/") + "/health/ready", timeout=5) as response:
                if response.status == 200:
                    return Check(name, "ok", "后端就绪接口通过")
        except urllib.error.HTTPError as error:
            return Check(name, "error", f"后端返回 HTTP {error.code}")
        except Exception:
            return Check(name, "error", "连接失败，请检查网络、证书和后端状态")
        return Check(name, "error", "后端尚未就绪")

    return [await asyncio.to_thread(check, "后端内部入口", internal or api)]
