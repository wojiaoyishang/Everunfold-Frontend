# 认证后端交付验收

日期：2026-10-31（Asia/Shanghai）。本记录以后端认证、数据库初始化和隔离测试为主；跨仓库前端交互与浏览器验收另见 [登录与空后台验收](authentication-frontend-verification.md)。

## 交付版本

- `23691fa`：发布 `auth-v0.1.schema.json` 0.1.0 与导出工具。
- `c771c81`：实现 PostgreSQL 用户/可撤销 Session、HttpOnly Cookie、CSRF、精确 Origin、管理员校验、登录限流、审计事件、`0003_auth_sessions` 和根 `init.database.py`。
- 端点：`GET /v1/auth/session`、`POST /v1/auth/login`、`POST /v1/auth/logout`、`GET /v1/admin/session`。
- 契约扩展明确带凭据请求、`X-CSRF-Token`、操作路径和认证错误码；公开 OpenAPI 已重新导出。

## 已实现边界

- 密码使用 Argon2id；Session token 使用 `secrets.token_urlsafe(32)`，数据库只保存 SHA-256 摘要。预会话用于登录前 CSRF，登录成功与退出均旋转 Session。
- 写认证请求同时要求允许的精确 Origin 和与会话绑定的 CSRF token；错误不回显账号存在性、密码或请求体。登录失败按账号和真实 socket peer 在 PostgreSQL 中跨进程限流。
- Cookie 为 HttpOnly，Secure/SameSite/Domain/有效期可配置；认证与管理响应为 `private, no-store`，并分别设置公开读取和带凭据认证的 CORS 策略。
- 管理员接口每次从 PostgreSQL 读取当前用户，停用、角色变化和过期/撤销 Session 会立即影响后续请求。
- `init.database.py` 可创建缺失目标库、串行显式迁移并创建首次管理员；重复执行保留已有内容、密码、角色和停用状态。默认管理员按用户要求为 `admin` / `123456`，可用 `EVERUNFOLD_ADMIN_PASSWORD` 提供其他初始密码。
- 审计发现并修复：非回环 `BACKEND_BASE_URL` 即使显式设置 `cookie_secure=true` 也不得使用明文 HTTP；现在除回环开发地址外强制 HTTPS。
- 实际开发库 `everunfold_dev` 已从 `0002_comment_likes` 显式升级到 `0003_auth_sessions`。迁移前后内容均为 87、评论均为 11、点赞均为 0；随后创建缺失的 `admin` 管理员，现有内容未被重置。

## 实际检查

以下命令均在项目根执行，退出码为 0：

```powershell
uv lock --check
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked mypy
uv run --locked pytest -q
$env:RUN_DATABASE_TESTS = "1"
uv run --locked pytest -q
Remove-Item Env:RUN_DATABASE_TESTS
$env:CONFIG_FILE = "config.test.local.toml"
uv run --locked alembic -c migrations/alembic.ini check
Remove-Item Env:CONFIG_FILE
uv run --locked python -m tools.export_auth_contract
uv run --locked python -m tools.export_contracts
```

- 锁文件：43 个包解析通过。
- Ruff：全部检查通过；纳入检查的文件均已符合目标格式。
- mypy strict：60 个源码文件通过。
- 默认测试：**45 passed, 12 skipped**；跳过项均为需要显式隔离 PostgreSQL 的数据库测试。
- 隔离 PostgreSQL 全量测试：**57 passed**，用时 34.32 秒。
- Alembic：`No new upgrade operations detected.`；ORM 与测试库迁移结构无漂移。
- 契约导出命令成功；认证 Schema 与 OpenAPI 未产生意外差异。

覆盖内容包括：空目标库创建/迁移/默认管理员、重复初始化、原内容和同类账号密码/角色/停用状态保留；错误密码统一响应和限流；Session 轮换、过期、撤销、停用用户、非管理员拒绝；提交失败不下发 Cookie；允许/拒绝 Origin、带凭据预检、请求体上限、no-store；跨独立 service 进程会话共享以及真实双 Uvicorn 进程通过 HTTP 跨源完成登录、管理员读取和退出撤销。

## 未执行与风险

- 未执行生产 HTTPS、Secure Cookie 实机、真实域名/父域 Cookie、反向代理或可信来源 IP 部署检查；当前真实 Uvicorn 验证使用回环 HTTP 和测试 Origin。
- 前端契约生成、跨源登录、Cookie 持久化、重定向、CSRF 轮换、失败重试和主题化空后台已在独立前端仓库及浏览器记录中验收；本后端记录不重复替代那些证据。
- 当前 8001 与前端 3000 已使用真实开发配置启动，浏览器登录使用开发库中的默认管理员。该状态只适用于本机开发，不是生产部署验证。
- 未执行改密、找回密码、注册、2FA、用户管理、细粒度资源权限或后台业务 CRUD。
- 默认 `admin` / `123456` 只能用于首次本地开发。当前没有改密界面，开放到任何可访问环境前必须通过初始化环境密码覆盖默认值，并使用 HTTPS。
- 不声称完整生产 P0、SLA 或部署就绪。公共 ADR、索引、架构约束和前后端验收记录已同步两仓库；根 `AGENTS.md` 的 Next.js 自动生成区块按前端工具专属例外处理。
