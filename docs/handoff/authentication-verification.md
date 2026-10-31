# 认证后端交付验收

日期：2026-10-31（Asia/Shanghai）。范围限定为 `Everunfold-Backend`；前端登录页和空后台未在本仓库修改，也未进行跨仓库浏览器联调。

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
- 未启动或操作前端仓库，未用真实浏览器检查登录页、Cookie 持久化、重定向、CSRF 重试或空后台展示；前端契约生成与联调仍待完成。
- 未对现有 8001 开发进程执行热重载/重启，也未直接初始化或迁移实际 `everunfold_dev`；不能把测试库结果误称为正在运行的服务状态。
- 未执行改密、找回密码、注册、2FA、用户管理、细粒度资源权限或后台业务 CRUD。
- 默认 `admin` / `123456` 只能用于首次本地开发。当前没有改密界面，开放到任何可访问环境前必须通过初始化环境密码覆盖默认值，并使用 HTTPS。
- 不声称完整生产 P0、SLA 或部署就绪。公共 ADR、索引和架构约束已在后端更新，但前端公共文档同步仍待其独立提交。
