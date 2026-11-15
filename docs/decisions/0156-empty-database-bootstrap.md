# ADR 0156：部署助手的空库自动初始化

- 状态：已实现；真实 PostgreSQL / Redis 与原生多进程验收通过，Docker daemon 实机验收待执行
- 日期：2026-11-15
- 来源：用户要求“如果数据库为空就默认初始化”，并报告构建后不启动、初始化按钮无效果
- 衔接：ADR 0154、0155；仅更新首次空库部署规则，已有数据库仍显式迁移

## 原因

原启动准备把迁移 warning 当作失败，遇空库就退出，因而尚未创建服务容器。初始化按钮则以配置文件已存在推断“已有站点”，保存后重新打开就会被模式检查阻止；文件是否保存与数据库是否初始化没有等价关系。

## 决定

1. 后端总览新增“空库自动初始化”，根 YAML 的 `environment.EVERUNFOLD_AUTO_INIT_EMPTY_DB` 为 `"1"` 开启、`"0"` 关闭，默认开启，旧配置未写此字段也开启。Docker / 原生部署助手共用该项。`build` 只构建；`deploy` / 构建并启动 / `start` 先准备数据库再启动进程。业务 API、Worker、Scheduler 入口本身不执行 DDL。
2. 界面检测和 CLI `check` 保持只读。准备阶段先核对 PostgreSQL、Redis、Broker；通过后仅空库可初始化。使用 PostgreSQL 系统目录判断非系统 schema 的用户关系对象，包括表、分区表、视图、物化视图、序列、外部表和复合关系，避免将当前账号无权查看的表误判为空库。
3. 有对象但无迁移记录的数据库拒绝初始化；迁移版本落后要求显式 `migrate`。已同步数据库直接通过，不重新初始化或重设密码。初始化前校验管理员密码已配置且至少 12 位，不沿用底层兼容 CLI 的弱密码缺省。目标数据库须已创建，不申请 CREATEDB。
4. 初始化全程持有数据库级会话 advisory lock，获得锁后再次核对状态；即使迁移版本已写入，只要另一初始化尚持锁，启动仍被阻止，避免管理员或插件尚未完成。复用原核心迁移和管理员创建入口，再登记后端插件，最后重新检查依赖与迁移；每步实时输出日志。并发初始化、权限错误、子命令失败或复检未通过，都返回非零并阻止服务启动。
5. “初始化新库”移除部署类型限制，确认后同样按数据库实际状态执行。关闭自动初始化仍可手动初始化；已同步则跳过。它只完成初始化，结束时明确给出 `start` 命令。部署类型继续用于密钥输入规则，不用它猜测数据库状态。
6. 前后端共享的配置界面、检查模型、启动器同步，前端不增加数据库开关或数据库操作。既有容器在准备失败时保持运行。

## 验收

- 配置与 TUI 回归覆盖开关默认、关闭后保存、原密钥保留、保存过配置后仍可确认初始化、返回取消、80×24 布局及终端恢复。Docker 命令桩覆盖准备发生于服务容器创建前、初始化失败不启动、手动初始化的后续命令提示。
- 新增状态决策与锁内复检测试，覆盖只读、关闭、已有库、旧迁移、未知库、Redis 失败、锁占用、缺管理员密码及初始化失败。`tests/test_deployment_start_live.py` 可用隔离 PostgreSQL / Redis 重跑真实初始化和数据保留验证；只创建和删除随机命名的测试数据库，不重置所指定的维护库。重跑时显式设置 `EVERUNFOLD_DEPLOY_TEST_DATABASE_URL`（隔离服务的维护库，账号有 CREATEDB）和 `EVERUNFOLD_DEPLOY_TEST_REDIS_URL`，执行 `.venv/bin/pytest -q tests/test_deployment_start_live.py`。
- 新建隔离空库，通过根 `setup.sh --native start` 自动初始化并启动 API、Worker、Scheduler，`/health/ready` 返回 200，database/redis/schema 全部 ok。再次启动保持管理员密码及已有记录。另验收只读检查、关闭开关、显式初始化、旧版本、无权读取的已有表、并发锁及缺 CREATE 权限。
- 本环境无 Docker daemon；命令桩与原生验收不能替代真实镜像构建和容器网络验证。未修改用户实际数据库或运行实例。

系统目录与锁的行为依据 [PostgreSQL 17 pg_class](https://www.postgresql.org/docs/17/catalog-pg-class.html) 和 [会话 advisory lock](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS)。
