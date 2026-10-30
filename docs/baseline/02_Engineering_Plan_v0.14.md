# Everunfold — 四项工程规范与验收计划（v0.14）

> 导出说明：正式代码仓库已统一为 `everunfold-frontend`、`everunfold-backend`，其余技术约定与原版一致。`lovepikachu.top` 为站点域名，`lovepikachu` 为原 Redis 主键示例。

版本：v0.14（2026-10-29）；状态：**既有方案已确认，本轮补充工程细则与建议初值，尚待实现和验证**。目标是把产品决策转化为可实现、可测试的数据库、接口、缓存和故障验收规范。需求权威来源为 [《lovepikachu.top 博客重构设计基线》](https://chatgpt.com/space/page_cc95a38adfc08191a7fb646999b6268c) v2.11。用户已认可此前的项目拆分、响应模板与配置结构；本轮新增内容集中在第四项之后的工程约束。字段、完整端点与索引仍需在实现阶段定稿，文档及配置示例不代表代码已实现或生产已验证。

## 前置工程边界

- **已调整为两个独立项目：**`everunfold-backend`（Python）和 `everunfold-frontend`（Next.js）分别拥有自己的项目根目录、依赖文件、虚拟环境或 `node_modules`、测试、部署配置与 Git 仓库，可分别在 IDE 中打开、运行和发布。后端内部仍是共享 Python 代码体系的模块化单体，包含相互独立启动的 FastAPI、Celery Worker 与单进程 Scheduler；前端独立负责公开网站、管理界面、可信组件与缓存。**拆开代码仓库不改变已确定的运行进程和业务职责。**

- PostgreSQL 是内容、版本、任务计划与投递状态的权威存储；Redis 只承担 Celery Broker、协同更新实时广播、FastAPI 一般广播、Scheduler 定向唤醒及运行中任务展示等明确划分的职责。

- 用户要求的云端离线只读镜像、Cloudflare 自动清理功能保留接口，首版不依赖它们才能运行；数据库与源代码备份属于独立运维服务，不纳入 CMS 内建功能。

### Redis 项目主键与统一命名空间

**已确定：**在后端配置文件中声明唯一的项目主键 `project.key`，默认示例为 `lovepikachu`。所有由本项目自行管理的 Redis Key、锁、临时状态、Pub/Sub 频道以及 Stream（若使用）统一以 `lovepikachu:` 开头。项目名不是鉴权凭据，也不能替代 Redis ACL。

配置文件示例（位于后端项目根目录；由显式加载器读取，加载顺序与严格校验规则见本轮补充。末尾运行参数为建议初值，待压测）：

```toml
# everunfold-backend/config.example.toml
# 配置结构示例：服务域名按部署替换，数据库与 Redis 地址为本地开发示例
# 不设固定生产基地址；实际凭据通过部署配置或环境变量注入

# 根级地址配置；不得放入某个无关的 TOML 分组中
BACKEND_BASE_URL = "https://api.example.com"

[project]
key = "lovepikachu"            # 唯一项目标识，前缀根为 lovepikachu:

[database]
url = "postgresql+asyncpg://postgres:123456@localhost:5432/test"
# 可由环境变量 DATABASE_URL 覆盖（上面仅为本地开发示例）

[redis]
url = "redis://127.0.0.1:6379/0"   # 项目临时 Key 与 Pub/Sub
namespace_scope = ""          # 可选：dev / staging / prod；空值不加环境层

[celery]
broker_url = "redis://127.0.0.1:6379/1"
result_backend_url = "redis://127.0.0.1:6379/2"  # 按需使用 Redis 结果后端

# Next.js -> FastAPI：由 FastAPI 校验自己的入站内部请求
[internal_auth]
# 以下仅为本机联调；部署时填写校验入口实际观察到的来源 IP/CIDR
allowed_peer_ips = ["127.0.0.1", "::1"]

# 每个分组的键就是稳定节点 ID；地址与两个方向的 Token 引用集中配置
# *_token_env 的值是环境变量名，不是 Token 本身；由服务端加载器读取密钥
[frontends.web-main]
base_url = "https://frontend-a.example.com"
enabled = true                 # 是否参与后端定向投递
# Next.js -> FastAPI：后端接收并校验
nextjs_to_fastapi_token_env = "NEXTJS_TO_FASTAPI_WEB_MAIN_TOKEN"
# FastAPI/Celery Worker -> Next.js：后端发送时使用
fastapi_to_nextjs_token_env = "FASTAPI_TO_NEXTJS_WEB_MAIN_TOKEN"

[frontends.web-mirror]
base_url = "https://frontend-b.example.com"
enabled = true
nextjs_to_fastapi_token_env = "NEXTJS_TO_FASTAPI_WEB_MIRROR_TOKEN"
fastapi_to_nextjs_token_env = "FASTAPI_TO_NEXTJS_WEB_MIRROR_TOKEN"

# 以下为本轮补充的建议初值，待实现配置加载与压测
[runtime]
health_check_timeout_seconds = 2
http_shutdown_grace_seconds = 30
worker_shutdown_warn_after_seconds = 120  # 仅报警阈值，不代表可无损强杀

[http]
default_page_size = 20
max_page_size = 100
idempotency_retention_seconds = 86400

[limits]
json_body_max_bytes = 8388608
upload_max_bytes = 33554432
ws_update_max_bytes = 1048576
ws_pending_max_bytes_per_connection = 4194304
ws_auth_timeout_seconds = 5

[outbox]
poll_interval_seconds = 1
batch_size = 50
connect_timeout_seconds = 2
request_timeout_seconds = 15
max_attempts = 8
retry_max_delay_seconds = 900
lease_seconds = 60  # 投递租约，须大于单次受控投递时限

```

- **配置文件安排：**代码仓库提交 `config.example.toml`，实际部署复制为 `config.toml`（加入 `.gitignore`），并允许环境变量 `DATABASE_URL` 覆盖 `[database].url`，并可覆盖 Redis 地址、密码及其他敏感配置。三个后端进程通过 `app.core.config` 读取同一份项目主键和 Redis 配置；不要在 FastAPI、Worker、Scheduler 中分别写死 `lovepikachu`。 服务地址统一使用根级 `BACKEND_BASE_URL` 与按稳定节点 ID 分组的 `frontends.<node_id>.base_url`；示例域名只展示配置结构，不作为生产默认值。前端地址、投递启用状态和两个方向的 Token 引用在同一节点分组中维护，不另配置无身份的地址数组或后端节点凭据表。节点配置仅由管理员维护，不接受普通业务请求动态提供任意回调目标。 后端 `frontends.<node_id>.nextjs_to_fastapi_token_env`、`frontends.<node_id>.fastapi_to_nextjs_token_env`，以及前端的 `backend.nextjs_to_fastapi_token_env`、`backend.fastapi_to_nextjs_token_env` 仅保存环境变量名，加载器必须解析其实际值；未配置所引用密钥或仍为示例占位值时不启用相关内部服务。前端项目采用独立的仅服务端配置模板，与后端通信的地址、实际来源 IP 允许列表及双向 Token 引用统一置于 `[backend]`，不另设前端 `[internal_auth]` 分组。实际配置同样忽略提交，不将整个 `backend` 对象、密钥或内部认证配置注入浏览器。

- **从配置自动派生：**`namespace_scope = ""` 时 `prefix = f"{project.key}:"`；非空时 `prefix = f"{project.key}:{namespace_scope}:"`。业务 Key 与频道、Celery Broker 的 `global_keyprefix`（`{prefix}celery:broker:`）及 Redis Result Backend 的 `global_keyprefix`（`{prefix}celery:result:`）都由此唯一来源生成，不要求在 TOML 里重复写多份前缀。Celery 的实际前缀配置仍须按选定的 Celery/Kombu 版本确认。

- **示例配置的用途：**上方 Redis DB 编号和本机地址只是便于本地联调的示例，不决定生产是否共用一个 Redis 实例或编号；Redis Pub/Sub 频道仍依完整名称隔离，而非 DB 编号。

- **前缀规则：**`namespace_scope` 为空时为 `lovepikachu:`；非空（例如 `prod`）时为 `lovepikachu:prod:`。同一部署内的 FastAPI 各 Worker、Celery Worker 和 Scheduler 必须使用完全一致的 `project.key` 与环境标识，不同开发/测试/生产部署不得共用同一完整前缀。

- **集中生成：**由 `app.core.redis_keys` 等统一入口提供 `redis_key(...)` 与 `redis_channel(...)`；业务模块不得各自手写或再重复拼接项目前缀。项目主键应校验为安全、稳定的短标识，避免包含冒号、通配符或空白字符；已有运行队列的项目不应在未迁移时直接改名。

| 用途 | `namespace_scope` 为空时的示例 | 规则 |
| --- | --- | --- |
| Celery 任务实时进度 | `lovepikachu:task:{task_id}:progress` | 运行中更新，终态写 PostgreSQL，Redis TTL 或清理 |
| FastAPI 跨进程广播 | `lovepikachu:broadcast:api` | Pub/Sub 频道；仍按 `emit(scope=...)`、`on(at=...)` 过滤，不承担任务分发 |
| 协同编辑跨 Worker 消息 | `lovepikachu:collab:{draft_id}:updates` | Pub/Sub 频道；正文权威增量持久化 PostgreSQL |
| 协同在线状态 | `lovepikachu:collab:{draft_id}:awareness` | 临时状态/频道；光标不入正式修订 |
| Scheduler 唤醒 | `lovepikachu:scheduler:wakeup` | 与广播隔离的定向唤醒频道，仅通知重载数据库计划 |
| 短期锁 | `lovepikachu:lock:{resource}` | 必须带合理 TTL；不得作为唯一业务幂等保障 |
| Celery Broker / Result | `lovepikachu:celery:broker:*`、`lovepikachu:celery:result:*` | 中间件自管键需单独配置兼容的前缀机制 |

- **Celery 自管键：**Broker 与 Redis Result Backend 的配置入口不同；最终选定的 Celery/Kombu 版本应分别核验 `broker_transport_options.global_keyprefix` 和 `result_backend_transport_options.global_keyprefix` 的支持情况。示意：`{"global_keyprefix": "lovepikachu:celery:broker:"}` 与 `{"global_keyprefix": "lovepikachu:celery:result:"}`；不对 Celery 管理的队列名再次手动加项目总前缀。若某部署版本不能可靠处理 Broker 前缀，应隔离 Broker Redis 实例/DB 并记录例外，不能宣称所有内部键都已按同一规则命名。参考 [Celery Redis 配置](https://docs.celeryq.dev/en/v5.6.2/getting-started/backends-and-brokers/redis.html) 与实际选用版本文档。

- **Pub/Sub 特性：**Redis 不按 DB 编号隔离频道；即使应用选择不同 Redis DB，也必须为广播、协同和 Scheduler 频道使用不同的完整命名空间。Pub/Sub 消息可能丢失，仍须按原有设计从 PostgreSQL 同步和恢复。参考 [Redis Pub/Sub 作用域](https://redis.io/docs/latest/develop/pubsub/)。

- **运维与测试：**禁止用共享 Redis 上的 `FLUSHDB`/`FLUSHALL` 清理单一项目；清理只对经确认的本项目临时数据使用命名空间范围的安全扫描，不能删除 Celery 待处理队列。集成测试检查所有自管 Key/频道的前缀、不同环境隔离、跨 Worker 接收以及终态任务落库后 Redis 临时键的回收。

### 两个独立项目的建议目录（已按 IDE 使用方式调整）

```text
everunfold-backend/                   # 独立 Python 项目及 Git 仓库
├── pyproject.toml                    # 依赖、构建与开发工具配置
├── config.example.toml               # 提交到版本库的配置模板
├── config.toml                       # 部署实例配置，忽略提交
├── app/                              # 后端主 Python 包（无额外 src/cms 嵌套）
│   ├── __init__.py
│   ├── entrypoints/
│   │   ├── __init__.py
│   │   ├── api.py                    # FastAPI ASGI app
│   │   ├── celery_app.py             # Celery app / Worker 入口
│   │   └── scheduler.py              # 独立单进程 Scheduler 入口
│   ├── core/                         # config, database, auth, i18n, registry
│   │                                 # broadcast, outbox, task_ui, collab, media
│   └── modules/                      # articles, pages, users, comments, search...
├── plugins/                          # 后端扩展，部署时加载
├── migrations/                       # 核心及插件的迁移入口
├── contracts/                        # OpenAPI、内部事件 JSON Schema 的权威定义/导出
├── tools/wordpress_import/
├── deploy/                           # 后端服务与数据库部署示例
└── tests/

everunfold-frontend/                  # 独立 Next.js 项目及 Git 仓库
├── package.json
├── config.example.toml               # 仅服务端配置模板，含内部请求校验
├── config.toml                       # 节点实际配置，忽略提交，不公开给浏览器
├── src/app/                          # 公开路由、管理路由、内部缓存接收路由
├── src/core/                         # backend client、snapshot_store、rendering
├── src/themes/                       # 可信主题
├── src/custom_pages/                 # 可信自定义页面
├── src/plugins/                      # 可信前端插件与块渲染器
├── src/generated/                    # 按后端契约生成的 TypeScript 类型与客户端
├── deploy/                           # Next.js 独立部署示例
└── tests/
```

### 后端导入路径与多进程启动约定

- **导入根统一为 `app`：**后端应用代码使用 `from app.core.config import settings`、`from app.core.i18n import i18n` 等形式；不再出现 `from cms...` 或将后端 `src/` 标记为源码根目录的要求。Next.js 自身的 `src/app/` 是前端路由目录，不受此更改影响。

- **三个进程共用 `everunfold-backend` 项目：**FastAPI、Celery Worker、Scheduler 分别以模块入口启动，但都从 `app` 以及按规范装载的后端插件中复用必要代码；Worker 和 Scheduler 不为此初始化 FastAPI 的 `router_init(ctx)`，Scheduler 仍不执行业务任务；本轮建议在其基础设施循环中兼任持久 Outbox 的扫描与 Celery 投递，具体边界见补充第 4 项。

- **工作目录与 IDE：**以下命令均以 `everunfold-backend/` 为工作目录，使用同一个 Python 虚拟环境和 `pyproject.toml` 依赖；在 PyCharm 中分别建立三个运行配置即可。作为项目型应用，首版不需要为了源代码导入而额外配置 `PYTHONPATH=src`。

```bash
# FastAPI：api.py 暴露名为 app 的 ASGI 对象
python -m uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8000

# Celery：celery_app.py 暴露名为 celery_app 的 Celery 实例
celery -A app.entrypoints.celery_app:celery_app worker --loglevel=info

# Scheduler：scheduler.py 的 __main__ 入口仅启动一个调度进程
python -m app.entrypoints.scheduler
```

以上命令是用于统一目录和导入路径的**规划示例**；具体应用对象名、运行参数、进程数量和生产服务管理方式在落地代码与部署配置中确定。

### 双项目之间如何保持协议一致

- **后端是接口契约的权威发布者。**公共 API 由 FastAPI 导出版本化 OpenAPI；WebSocket、Redis 事件和缓存回调的载荷由后端维护 JSON Schema 或其他明确的版本化 Schema。生成或发布的契约文件属于后端发布产物，不要求额外建立第三个长期维护的代码仓库。 公开业务端点的 OpenAPI `paths` 统一为 `/v1/...`；服务基地址读取 `BACKEND_BASE_URL`，不绑定具体域名，开发代理的 `/api` 不写入后端路由定义。

- **前端只消费契约。**在构建或更新依赖时，从指定的后端版本/发布产物生成 TypeScript 类型和客户端代码并提交锁定版本；前端不得再手工维护一套相互独立的字段定义。不同仓库之间通过版本号、兼容性检查和集成测试防止接口漂移。

- **分别运行与部署。**FastAPI、Celery Worker、Scheduler 仍来自同一后端项目但各用独立入口和服务进程；Next.js 是另一个独立项目。生产浏览器业务请求直接发送到 `BACKEND_BASE_URL`；Next.js 服务端的 `backend` 连接对象默认也从该项取得地址，并单独持有服务端 Token 与超时设置。确有私网访问需求时，可通过 `backend.base_url` 显式覆盖服务端连接地址，覆盖项和 Token 均不进入浏览器产物。

- **插件边界同样独立。**后端插件和前端可信插件分别随各自项目部署。双方依据稳定的插件/块类型 ID、Schema 版本和兼容范围对接，不能假设同时修改两个项目的文件或运行时热安装。插件移除后后端数据继续保留，前端缺失渲染组件时安全降级。

- **联调方式：**两个项目可放在本地同一父目录下分别用 IDE 打开。生产浏览器直接请求 `BACKEND_BASE_URL` 下的 `/v1/*`；开发可直连该配置地址，也可通过同源代理访问 `/api/v1/*`，由代理剥离 `/api` 后转发至 `BACKEND_BASE_URL` 下的 `/v1/*`。`BACKEND_BASE_URL` 始终是绝对后端地址，不能因为启用代理而改成相对 `/api`。跨项目集成测试同时覆盖相容版本、开发代理及生产跨源访问。

### 装配约束

- 每个后端模块声明**可预检的静态 Manifest**（建议 `manifest.toml`：模块 ID、版本、依赖、路由入口、Celery task 模块、权限、前端组件兼容要求），在部署启动阶段校验依赖与顺序；不支持运行时热安装。

- FastAPI 启动时调用模块唯一 `router_init(ctx)`；函数可同步或异步，完成**本 FastAPI 进程**的服务/事件监听注册并返回路由对象。必须在开始接受请求前完成装配；普通路由不接受 `ctx`，通过正式运行时服务入口或依赖注入获取资源。

- Celery Worker 根据静态任务模块清单导入 `tasks.py`，只执行具名业务任务；不调用 `router_init(ctx)`。Scheduler 仅导入基础配置、DB 模型、计划调度与 Outbox 投递能力，不导入业务路由或任务实现。本轮补充的 relay 只认领已登记事件并使用 Celery 原生 API 投递；计划扫描和 relay 分开运行，不执行 HTTP 缓存回调、邮件或渲染。

- 后端全局 `i18n.t('key', **params)` 使用请求级语言上下文；异步后台任务必须显式传入语言或使用默认语言；数据库 `AsyncSession` 按请求/任务分别创建，不跨并发任务共享。

- 核心/插件数据库迁移均采用显式部署命令，任何运行进程都不在启动时自动执行结构迁移。插件代码被移除不删除历史数据。

# 第一项：PostgreSQL Schema 草案

## 内容和发布主模型

| 建议表 | 关键字段或关联 | 不变量 |
| --- | --- | --- |
| `contents` | `id`, `kind`, `language`, `translation_group_id`, `published_revision_id`, `route_path`, `publication_state`, `access_policy_id`, `row_version`, `public_generation` | 每个语言版本是独立内容 ID；公开状态和访问策略分离 |
| `content_drafts` | `id`, `content_id`, `body_jsonb`, `metadata_jsonb`, `updated_at` | 同一语言内容默认只有一份共享工作草稿 |
| `content_revisions` | `id`, `content_id`, `body_jsonb`, `metadata_jsonb`, `review_status`, `author_id`, `source_draft_id`, `source_committed_seq` | 提交审核的修订不可变；一次修订包含完整有序块列表及元信息 |
| `content_reviews` | `revision_id`, `reviewer_id`, `decision`, `created_at` | 与内容状态机分开留痕，按操作权限判断 |
| `content_routes`（或内容当前字段） | `path`, `language`, `content_id`, `revision_id` | 只维护当前生效路径；代码路由优先，**不记录历史 URL、无自动 301** |
| `categories`, `tags`, `content_taxonomy_links` | 稳定实体 ID、语言展示名、内容关联 | 正式 Revision 保留当时分类/标签 ID 集合 |

## 协同编辑与安全模型

| 建议表 | 关键字段或关联 | 不变量 |
| --- | --- | --- |
| `collab_updates` | `document_id`, `update_id`, `committed_seq`, `payload_binary`, `payload_hash`, `actor_id`, `created_at` | `(document_id, update_id)` 唯一；按文档维护连续持久水位，提交后 ACK，重复 ACK 合法 |
| `collab_snapshots` | `document_id`, `state_binary`, `state_vector`, `last_update_seq` | 快照可加后续日志恢复；Presence/Awareness 不落正式 Revision |
| `collab_update_receipts`（或等效独立结构） | `document_id`, `update_id`, `payload_hash`, `committed_seq` | 压缩 payload 后仍可识别已确认更新，首版不自动过期 |
| `operation_receipts` | 主体/预会话、方法、路径、幂等键、请求指纹、结果关联 | HTTP 重试与业务提交协调，同键不同请求拒绝，重试重新鉴权 |
| `users`, `sessions`, `api_keys` | 用户身份、会话、密钥及撤销信息 | API Key 不突破所属用户权限范围 |
| `roles`, `capabilities`, `grants` | 操作能力及资源范围 | 发布、审核、编辑权限独立；默认关闭自行注册 |
| `audit_events` | `actor_id`, `action`, `target`, `occurred_at`, `change_summary` | 对高风险操作保留独立审计记录 |

## 媒体、搜索与可靠任务模型

| 建议表 | 关键字段或关联 | 不变量 |
| --- | --- | --- |
| `media`, `media_variants`, `media_locations` | 资源 ID、原文件/派生版本、存储后端、公开 URL | 原始资源不可变；首版文件存本地，媒体默认公开 |
| `search_documents` | `content_id`, `language`, `published_revision_id`, `text`, `tags`, `categories`, `visibility` | 仅索引允许公开搜索的信息；索引可重建 |
| `scheduled_jobs`, `schedule_firings` | 计划定义、`planned_run_at`, `firing_id` | `(schedule_id, planned_run_at)` 唯一防重复触发 |
| `task_runs`, `task_attempts`, `task_results` | Celery 任务关联、逻辑 ID、尝试/租约、错误类别、终态 JSON/组件快照 | 活动期展示在 Redis；终态写 PostgreSQL；支持 `persist=False` |
| `outbox_events`, `delivery_attempts` | 事件 ID、`source_epoch`、资源版本、目标节点/存储实例、认领租约、重试状态 | 业务更新与 Outbox 原子提交；逐节点确认且具备幂等重试 |
| `frontend_nodes`, `module_migrations` | 稳定 `node_id` 的配置引用、`cache_instance_id`、插件迁移记录 | 节点 ID 对应 `frontends` 的配置键，URL/凭据不另设数据库配置源；历史回执按节点及存储实例归属保留；存储实例由受保护引导登记，不是第二份可编辑地址配置。服务密钥只在部署配置中引用，不回传到浏览器；插件卸载不清除数据 |
| `site_runtime_state`（或等效核心状态） | `source_epoch`、恢复状态 | 正常重启不换代，数据库回档后经管理员恢复流程显式换代 |

## 数据库必须保证的约束

- 一组翻译关联中同一语言不重复；文章语言版本各自拥有独立审核、发布和历史。

- 内容发布时，在同一事务中更新 `published_revision_id`、当前 URL/访问状态、单调递增的 `public_generation`、缓存事件 Outbox；提交后才异步向 Next.js 投递。授权规则由服务端校验。

- 正式正文与快照 `content` 采用 `JSONB` 的 `[{id,type,content}, ...]` 有序块结构；不强制逐块独立表。Yjs 更新日志/检查点与正式修订快照分开。

- 同一个资源更新事件具有稳定 `event_id` 和 `public_generation`；接收方不能用较老事件覆盖较新内容或撤回标记。

- 任务表/Outbox 表的唯一索引用于防止重复调度、重复登记和重复激活；执行代码仍须保持幂等，唯一索引不自动防止外部副作用重复。

### 数据库待定稿字段

- 主键类型（UUID/自增数字）、内容类型枚举与扩展策略、全文索引方式、历史修订快照字段、权限作用域、软删除与 404/410 行为；这些应在编写 DDL 时一次性定义。

- `collab_updates` 的日志压缩策略、状态快照频率和保留周期需结合真实编辑吞吐做压测，不在本草案虚构固定数字。

# 第二项：接口与内部消息协议草案

## 通信面与安全边界

| 接口族 | 调用方和用途 | 授权模型 |
| - | - | - |
| `/v1/*` | 基地址由 `BACKEND_BASE_URL` 配置；浏览器直接使用的业务 API：身份、文章编辑、媒体、评论、任务等 | FastAPI Session Cookie/API Key，权限校验、CORS 与 CSRF |
| `/internal/v1/*` | Next.js 服务器从 FastAPI 读取权威公开快照、媒体映射、版本 Manifest | 原始 socket peer IP 允许列表 AND 对应服务身份 Token，随后检查最小权限；仅服务端可用 |
| Next.js `/internal/cache/v1/*` | Celery Worker 按稳定节点 ID 读取 `frontends.<node_id>`，向启用目标定向发送 invalidate/refresh/preload、撤回等 | 原始 socket peer IP 允许列表 AND 该节点接收 Token，随后检查缓存权限与请求幂等 |
| `/ws/v1/collab/{draft_id}` | 浏览器与 FastAPI 协同编辑 Yjs 文档及在线光标 | 连接建立和写入时均校验身份/编辑权限；权限收回须断开连接 |
| Redis 独立频道 | `lovepikachu:broadcast:api`、`lovepikachu:collab:*`、`lovepikachu:scheduler:wakeup`（均由 `project.key` 派生） | 内网隔离/Redis ACL；Pub/Sub 消息不作为持久事实，也不与业务任务投递混淆 |
| Celery Broker | FastAPI/Scheduler 用 Celery 原生 API 投递任务 | Worker 按具名任务加载；业务重试由任务机制负责 |

## 内部请求双重校验

内部请求必须同时通过实际 socket 对端 IP 允许列表和接收方 Token 校验，再检查服务身份对应的最小权限。两项是 AND，不是二选一；不改变浏览器业务 API 的 Session、CORS 与 CSRF 机制。

| 请求方向 | 配置与校验位置 | 允许的实际来源 | 发送方使用的凭据 |
| --- | --- | --- | --- |
| Next.js → FastAPI `/internal/v1/*` | 后端 `internal_auth.allowed_peer_ips` 与 `frontends.<node_id>.nextjs_to_fastapi_token_env` | Next.js 节点实际连接到校验入口的来源 IP | Next.js 服务端 `backend.nextjs_to_fastapi_token_env` 指向该节点对应的后端接收 Token |
| FastAPI/Celery Worker → Next.js `/internal/cache/v1/*` | 每个前端节点自己的 `backend.allowed_peer_ips` 与 `backend.fastapi_to_nextjs_token_env` | 实际发起通知的后端进程出口 IP，必须考虑 Celery Worker | 后端从 `frontends.<node_id>.fastapi_to_nextjs_token_env` 取得该前端的接收 Token，地址从同组 `base_url` 取得 |

### 配置含义与凭据配对

- `allowed_peer_ips` 接受单个 IPv4/IPv6 地址或 CIDR；使用 IP 地址解析与网段包含关系判断，并规范化 IPv4-mapped IPv6，不做字符串前缀匹配。不根据服务基地址的 DNS 自动生成允许列表，不自动放行所有来源；空列表表示全部拒绝。

- 后端由 `frontends.<node_id>.nextjs_to_fastapi_token_env` 解析各节点的入站校验 Token，并建立凭据到稳定节点 ID 的运行时认证索引；不另维护节点 Token 表或回退读取旧字段。前端接收后端请求时使用自身 `backend.fastapi_to_nextjs_token_env`，发送时使用 `backend.nextjs_to_fastapi_token_env`；不再从前端 `internal_auth` 读取凭据。配置加载器读取真正的 Token，不能直接把环境变量名当作 Token；不同节点的入站 Token 不能重复，以免身份歧义。密钥由安全随机源生成，两个方向及不同节点使用独立值；只有同一条调用关系的发送端和接收端持有相同值。

- 单节点可仅保留 `web-main`。后端 `frontends.web-main.nextjs_to_fastapi_token_env` 与该前端 `backend.nextjs_to_fastapi_token_env` 解析出的实际 Token 值相同；后端 `frontends.web-main.fastapi_to_nextjs_token_env` 与该前端 `backend.fastapi_to_nextjs_token_env` 解析出的实际值相同。这两组值彼此不同，`web-mirror` 按自身节点 ID 同样配对。环境变量名是各部署的密钥引用，不要求跨部署同名；配对依据是相同调用关系和实际值。前端 `FRONTEND_NODE_ID` 必须与后端 `frontends` 的对应键一致，不靠地址、声明顺序或列表下标推断身份。

### 前端仅服务端配置示例

新增 `everunfold-frontend/config.example.toml` 规划模板，下面以 `web-main` 节点为例。与后端通信的设置全部归入 `[backend]`；`FRONTEND_NODE_ID` 是前端自身的节点身份，仍放在根级。`backend.base_url` 是仅服务端的连接覆盖项，可省略，省略时沿用部署已配置的公开 `BACKEND_BASE_URL`；最终须得到绝对 HTTP/HTTPS 地址，不能使用浏览器开发代理的相对 `/api`。浏览器公开地址仍由独立配置提供，不能把可能含私网地址的 `backend` 对象整体公开。内部接口不能经公开地址到达时，应填写受保护通道的连接地址，不为此开放公网内部接口。它由 Next.js 的 Node 服务端配置加载层读取；实际 `config.toml` 与密钥不提交 Git。模板格式和字段须由实现提供显式加载器，不假定框架会自动加载 TOML。 部署镜像节点时，将 `FRONTEND_NODE_ID` 设置为 `web-mirror`，并分别配置该节点入站和出站的密钥引用；其余结构相同，不复制主站凭据。 本轮补充的连接超时也放在 `[backend]`；`[cache]` 只描述本节点本地快照存储，不属于后端连接设置。数值是建议初值，需加载器实现和压测验证。

```toml
# everunfold-frontend/config.example.toml
# 仅在服务端加载；地址仅为可替换示例
# 前端自身身份，必须与后端 frontends 的对应配置键一致
FRONTEND_NODE_ID = "web-main"

[backend]
# Next.js 服务端访问 FastAPI 的连接地址
# 可省略：省略时使用部署已配置的公开 BACKEND_BASE_URL
# 显式覆盖仅作用于服务端，不替代浏览器的公开 API 地址
base_url = "https://api.example.com"
# 本轮建议初值：仅服务端连接超时，待压测
connect_timeout_seconds = 2
request_timeout_seconds = 15

# FastAPI/Celery Worker -> Next.js：接收请求时允许的实际 socket 来源
# 以下仅为本机联调；生产填写实际连接来源 IP/CIDR，不从 base_url 推导
allowed_peer_ips = ["127.0.0.1", "::1"]

# Next.js -> FastAPI：前端发送时使用
# 与后端 frontends.web-main 下同名字段解析出的实际 Token 值一致
nextjs_to_fastapi_token_env = "NEXTJS_TO_FASTAPI_WEB_MAIN_TOKEN"

# FastAPI/Celery Worker -> Next.js：前端接收并校验
# 与后端 frontends.web-main 下同名字段解析出的实际 Token 值一致
fastapi_to_nextjs_token_env = "FASTAPI_TO_NEXTJS_WEB_MAIN_TOKEN"

# 本地快照设置，与后端连接设置分开；仍为仅服务端配置
# 本轮建议初值，待压测；相对目录以本项目配置根解析
[cache]
directory = "./var/public-snapshots"
max_snapshot_bytes = 8388608
max_concurrent_fetches = 4
max_total_bytes = 2147483648
min_free_bytes = 536870912
rebuild_concurrency = 2
```

### 原始套接字 IP 与反向代理

- `peer_ip` 必须来自负责校验的网络入口所接受连接的原始 socket 对端，不来自请求参数或 `X-Forwarded-For`、`X-Real-IP`、`Forwarded`、`CF-Connecting-IP` 等头。实际经过反代时，应用观察到的是代理 IP；仅把代理 IP 加入白名单不能证明原始发送者也在白名单中。

- 如需约束原始发送端而应用前有代理，应由直接接受发送端连接的受控内部入口执行同一允许列表检查，应用继续验证 Token，并限制应用监听地址/网络访问以阻断绕过入口。两个条件即使分层执行也都必须成立。内部请求优先使用可观察实际来源的私有通道，公网入口继续阻断内部路径；不能因为从本机代理转发就自动视为内部请求。

- **FastAPI 落地约束：**不能未经核验就把 `request.client.host` 当作原始 peer。[Uvicorn 的代理头设置](https://uvicorn.dev/settings/#http) 可以根据转发头填充远端地址信息；应在代理头改写前取得原始连接信息，或在内部专用监听/可信入口关闭此类改写。用于来源校验的原始 peer 与普通展示/日志中的转发客户端 IP 分开，不能在改写完成后再保存一个所谓原始值。

- **Next.js 落地约束：**[NextRequest](https://nextjs.org/docs/app/api-reference/functions/next-request) 基于 Web Request，不能假定 App Router 的请求对象暴露底层 socket。内部接收入口须使用能够访问真实 Node 请求/套接字的适配层，或在受控网关完成 IP 校验并防止旁路；[Node 的 socket.remoteAddress](https://nodejs.org/api/net.html#socketremoteaddress) 提供实际套接字对端地址。无法获得可信 peer 时拒绝或使内部入口不就绪，不能用转发头或仅校验 Token 来替代。

### 请求拒绝与密钥保护

- 请求继续使用 `Authorization: Bearer ...`。IP 检查通过后对 Token 做安全比较，从匹配的已配置凭据确定服务身份，再按接口检查 `resource:read`、`manifest:read`、`cache:read`、`cache:write` 等权限；请求体里的节点 ID 不能冒充已认证身份。缺失/错误 Token 返回 HTTP 401，来源不允许或权限不足返回 HTTP 403；应用层错误沿用已确认的 JSON 响应模板，网络入口在到达应用前的拒绝不强求应用响应外壳。

- 无效 IP/CIDR、启用目标的密钥引用未配置或仍是示例占位值时，配置校验失败；空允许列表和无法取得可信 peer 均不放行。Token 不放入 URL、公开运行时配置、浏览器产物或日志；跨主机连接使用受保护传输，轮换时同步更新相应发送/接收端。这里不新增第三种请求认证机制，原有请求幂等、事件版本与节点回执规则继续生效。

## 公开业务 API 地址与开发代理（已确认）

后端基地址统一从 `BACKEND_BASE_URL` 读取，前端节点基地址按稳定节点 ID 从 `frontends.<node_id>.base_url` 读取。设计规则、接口表和验收项不固定具体域名，域名或 IP 只在配置示例和部署配置中出现。公开业务接口的规范路径统一为 `/v1/*`；`/api` 只作为可选开发代理入口，不属于后端基地址，也不写入 FastAPI 路由。

| 场景 | 浏览器请求或代理目标 | FastAPI 收到的业务路径 |
| --- | --- | --- |
| 生产独立后端 | `BACKEND_BASE_URL + "/v1/articles"` | `/v1/articles` |
| 开发直连后端 | 开发配置中的 `BACKEND_BASE_URL + "/v1/articles"` | `/v1/articles` |
| 开发同源反向代理 | 浏览器请求 `/api/v1/articles`；代理目标为 `BACKEND_BASE_URL + "/v1/articles"` | `/v1/articles`；代理剥离最前面的 `/api` |

### 服务地址配置示例

完整配置结构见前面的 `config.example.toml`，地址项为根级 `BACKEND_BASE_URL` 与各 `frontends.<node_id>` 分组内的 `base_url`。两个独立项目通过各自配置加载层读取所需信息；前端只显式公开浏览器所需的后端地址或开发代理入口，不公开内部连接覆盖项、前端接收节点清单或任何服务凭据。以下是开发环境的地址配置示例：

```toml
# 开发环境地址配置片段；与完整模板的认证配置配套
BACKEND_BASE_URL = "http://127.0.0.1:8000"

[frontends.web-main]
base_url = "http://localhost:3000"
enabled = true
nextjs_to_fastapi_token_env = "NEXTJS_TO_FASTAPI_WEB_MAIN_TOKEN"
fastapi_to_nextjs_token_env = "FASTAPI_TO_NEXTJS_WEB_MAIN_TOKEN"

# 若启用开发同源代理：浏览器使用 /api，代理上游仍取 BACKEND_BASE_URL
# /api/v1/articles -> BACKEND_BASE_URL + "/v1/articles"
```

- **前端节点配置：**`frontends` 是以稳定节点 ID 为键的映射；每项包含 `base_url`、`enabled`、`nextjs_to_fastapi_token_env` 和 `fastapi_to_nextjs_token_env`，分别表示该节点的基地址、是否参与后端定向投递、后端校验该节点来访时的密钥引用，以及后端调用该节点时的密钥引用。`web-main`、`web-mirror` 仅为示例 ID，不按名字或声明顺序隐含自动主备切换规则。`frontend_nodes` 引用同一 ID，回执、重试与幂等也按该 ID 记录；更换域名不改变身份，停用或移除节点不删除历史记录，也不将历史或待投递记录自动转交另一节点。地址、凭据和投递启用状态以部署配置为准，不维护第二份可编辑地址清单。此映射不替代独立的 CORS、CSRF 或内部认证配置，`enabled` 不作为入站访问授权。

- **地址连接规则：**`BACKEND_BASE_URL` 是无凭据的绝对 HTTP/HTTPS 地址，不包含业务版本 `/v1` 或开发代理入口 `/api`；业务端点统一写 `/v1/...`。统一客户端规范化分隔斜线并连接地址与端点；启用开发代理时，仅浏览器请求使用 `/api` 入口，代理仍连接绝对后端地址。前端回调先以目标 `node_id` 取对应 `frontends.<node_id>.base_url`，再与既有回调路径连接；查询参数独立处理，避免遗漏或重复前缀。

- **开发代理规则：**只将对外 `/api/v1/*` 映射至后端 `/v1/*`，方法、查询参数、请求体及必要认证头/Cookie 按联调配置透传。FastAPI 本身不再挂载 `/api` 前缀；生产部署不要求兼容开发入口。代理转发不是新增 Next.js 业务 BFF，不在 Next.js 重复实现业务授权。

- **服务端与 WS 边界：**Next.js 的 `backend` 默认从 `BACKEND_BASE_URL` 装配绝对连接地址；必要时可通过 `backend.base_url` 明确覆盖服务端连接地址，Token 始终留在服务端。FastAPI `/internal/v1/*`、Next.js `/internal/cache/v1/*` 和协同 `/ws/v1/collab/{draft_id}` 保持独立。生产协同 WS 地址从后端基地址按 HTTP/HTTPS 对应 WS/WSS 的规则派生，并使用既有协同路径；开发如代理 WS，须单独定义路径映射并支持连接升级，不将内部服务接口纳入公开代理。

- **跨源安全规则：**生产网站与 API 主机按跨源访问设计，继续沿用精确 `CORS_ALLOWED_ORIGINS`、带凭据请求、独立 CSRF 校验和可配置 `SESSION_COOKIE_DOMAIN`。开发同源代理只是联调便利，不能替代生产跨源验收，服务端密钥也不能注入浏览器配置。

## 统一 HTTP JSON 响应（已确认的项目模板）

```json
{
  "success": true,
  "code": 200,
  "msg": "请求成功",
  "data": {"id": "content-123"}
}
```

`success` 是布尔值，`code` 是整数业务码，`msg` 是已经按请求语言本地化的展示文本；`data` 仅在不为 `None` 时返回。未指定 `code` 时，默认取实际 HTTP `status_code`。三个封装类的默认 HTTP 状态分别为 `JSONResponseSuccess=200`、`JSONResponseFail=400`、`JSONResponseError=500`，调用方可以指定与语义相符的 `201/202/401/403/404/409/422/429/503` 等状态。不要改用 `data/meta/error` 或嵌套 `message:{code,text}` 作为通用外壳；请求追踪 ID 放入响应头（例如 `X-Request-ID`），不强制加入 JSON 对象。

### 失败与服务端异常的响应示例

业务失败（HTTP `404`，业务码 `40401`）：

```json
{
  "success": false,
  "code": 40401,
  "msg": "文章不存在"
}
```

服务端异常（HTTP `500`）：

```json
{
  "success": false,
  "code": 500,
  "msg": "处理失败"
}
```

### Python 封装参考模板

沿用此前使用的三个响应类，均继承 `JSONResponse`（可以通过共同基类间接继承），并保留 `success`、`code`、`msg`、`data` 实例属性。下例作为签名和行为参考；实际模块路径、异常处理器和翻译键可在编码时统一整理：

```python
from typing import Any, Mapping

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse


class _BaseJSONResponse(JSONResponse):
    default_success: bool = False
    default_status_code: int = 200
    default_msg: str = ''

    def __init__(
        self,
        data: Any = None,
        msg: str | None = None,
        code: int | None = None,
        *,
        status_code: int | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        http_status = self.default_status_code if status_code is None else status_code
        self.success = self.default_success
        self.code = http_status if code is None else code
        self.msg = self.default_msg if msg is None else msg
        self.data = data

        payload = {
            'success': self.success,
            'code': self.code,
            'msg': self.msg,
        }
        if data is not None:
            payload['data'] = jsonable_encoder(data)

        super().__init__(
            content=payload, status_code=http_status, headers=headers
        )


class JSONResponseSuccess(_BaseJSONResponse):
    default_success = True
    default_status_code = 200
    default_msg = '请求成功'


class JSONResponseFail(_BaseJSONResponse):
    default_success = False
    default_status_code = 400
    default_msg = '请求失败'


class JSONResponseError(_BaseJSONResponse):
    default_success = False
    default_status_code = 500
    default_msg = '处理失败'
```

路由调用示例：

```python
return JSONResponseSuccess(data={'id': 'content-123'})
return JSONResponseFail(msg='文章不存在', code=40401, status_code=404)
return JSONResponseError(msg='处理失败')
```

普通业务 JSON 统一使用该外壳；FastAPI 参数校验错误、认证错误与捕获的服务异常也应通过对应异常处理器映射为同一格式。文件、流、WebSocket 帧，以及 `204`、`304` 等不应包含响应体的 HTTP 响应除外。不要在错误 `msg` 中暴露 Python 堆栈和内部凭据。

## WebSocket 消息草案

- `sync_request {state_vector}` / `sync_response {update}`：首连/重连按差异同步。

- `update {update_id,payload}`：客户端发送二进制 Yjs 增量。接收 Worker 验权并在当前 `source_epoch` 内处理，PostgreSQL 提交成功后发送 `ack {update_id,persisted:true,committed_seq}`，再本地分发并通过独立 Redis `collab` 通道跨 Worker 传播。同 ID、同 payload 重传只持久化一次，但可重发原 ACK；同 ID、不同 payload 拒绝。

- `awareness {...}`：在线状态及光标消息，独立于持久正文；不进入正式 Revision。

- `error {code,update_id?}`、`resync_required`、`permission_revoked`：明确失败、恢复和权限收回语义。IndexedDB 本地未确认更新在重连重新鉴权后重传。

- Redis 包携带 `document_id`、`update_id`、`origin_instance_id`、`protocol_version`、`source_epoch` 与相应持久水位，发送方忽略自身回环；Redis 频道不替代 PostgreSQL 更新日志。WS 会话协商并绑定源代际，旧代际的自动重传不能绕过恢复流程。

## 一次内容发布的可靠事件

```json
{
  "event_id": "evt-123",
  "protocol_version": 1,
  "source_epoch": "source-epoch-example",
  "action": "refresh",
  "resource": {
    "kind": "content",
    "id": "content-123",
    "public_generation": 17
  },
  "affected_urls": [
    "/zh/post/hello"
  ],
  "target_node_id": "web-main",
  "target_cache_instance_id": "cache-instance-example"
}
```

业务写操作由单个 FastAPI 请求进程完成，并在数据库事务内登记 Outbox；Celery Worker 按目标 `node_id` 从 `frontends` 读取该节点的 `base_url` 和 `fastapi_to_nextjs_token_env`，再逐节点投递。Next.js 接收端在通过既有认证后，核对 `target_node_id` 与本机 `FRONTEND_NODE_ID` 一致，不匹配则拒绝执行；回执关联原目标节点，不能以请求体中的 ID 冒充认证身份。接收端仍以 `event_id` 幂等、以 `public_generation` 判定新旧。FastAPI 的 `broadcast.emit(scope='local'|'process')` 只调用已注册的同进程或其他 FastAPI 进程监听器，不承担唯一必须执行的副作用；Scheduler 的 `notify_plan_changed` 是另外一条仅用于唤醒的通道。 本轮补充：稳态回调另核对 `source_epoch` 与 `target_cache_instance_id`，并将目标存储实例纳入去重和回执归属。来源换代或目标存储被替换时拒绝旧请求、转受保护的重新引导；补投只更新当前凭据，不擅自改写旧事件的源代际或目标实例。

# 第三项：Next.js 缓存与撤回草案

## 将缓存拆成三层

| 层次 | 作用 | 更新/撤回机制 |
| --- | --- | --- |
| **公开快照存储（自定义）** | Next.js 节点本地文件系统保存文章 JSON、标签、搜索公开快照和 `media_urls`；无时间 TTL | 按 ID/版本原子替换；撤回删除正文文件并保留更高版本的 tombstone 标记 |
| **Next.js 框架缓存** | 页面渲染结果、服务器数据与标记缓存；是快照的派生结果 | 通过与实际 Next.js 版本匹配的 revalidate/自定义 cache handler 接口清理，不直接随机删除 `.next` 内部文件 |
| **Cloudflare CDN（后续插件）** | 缓存公开页面和静态资源 | 由业务变更的可靠任务触发 URL 反推与 CDN purge；Next.js 自身缓存失效不能替代 CDN purge |

## 缓存处理的协议约束

1. FastAPI 是权威内容源；Next.js 服务端的 `backend` 对象默认从 `BACKEND_BASE_URL` 装配连接地址，必要时采用仅服务端的 `backend.base_url` 连接覆盖项，在本地未命中时获取完整公开快照和媒体 URL 映射；浏览器不接触内部地址覆盖项或服务端 Token。

2. Worker 处理 Outbox 事件，按前端节点逐个投递，接收端校验 `public_generation` 并在本地创建临时快照、校验、原子替换、更新版本指针，再处理渲染缓存失效；成功后才返回已应用状态。

3. 撤回/转私有：立即禁止旧公开正文继续被读取，删除自定义快照磁盘文件、清理相应框架缓存，并保留该版本的不可见 tombstone，防止乱序旧事件重新发布。相关搜索、列表、分类与标签缓存同步更新。

4. 网络断开时，没有收到撤回的远端节点无法即时知晓主库变化；恢复后通过资源 Manifest/版本主动校对。公开页面可以沿用最近**已确认有效**的缓存，但已经获知撤回的节点绝不能将旧正文作为失败回退。

5. 草稿、待审核内容、登录/密码受限正文不能进入公开共享快照；需要预览时浏览器带权限经 FastAPI 受保护 API 获取数据，Next.js 只负责可信组件渲染。

## Next.js 技术验收前提

- 固定 Next.js 运行版本后，验证自托管单实例与多实例的缓存处理器、缓存标记传播和浏览器端导航缓存行为；多个 Next.js 实例各有本地缓存时必须逐个投递/确认，或显式设计共享存储与 Tag 协调。

- URL 反查由后端内容 ID + 当前有效路由与派生索引提供，**不创建历史 URL 301**；未来 Cloudflare 插件对当前可能受影响 URL 执行清理，不能宣称索引绝对完整。

- 参考官方资料：[Next.js 自托管缓存](https://nextjs.org/docs/app/guides/self-hosting)、[Next.js CDN 缓存](https://nextjs.org/docs/app/guides/cdn-caching)。

# 第四项：故障验证与交付门槛

| 场景 | 验证方法 | 必须达到的结果 |
| --- | --- | --- |
| FastAPI 多 Worker 协同 | 两个 WS 客户端分别连接不同进程同时改同一 Y.Doc | 所有在线光标及正文最终一致；同一更新只持久化一次，成功 ACK 允许重发 |
| PostgreSQL 在 WS 写入中失败 | 在持久化提交前终止接收 Worker | 未持久化更新不能收到成功 ACK；客户端重试后不产生重复日志 |
| Redis Pub/Sub 丢包或重启 | 断开某个 Worker 的订阅后恢复 | State Vector + PostgreSQL 日志/快照补齐，没有永久数据缺失 |
| Scheduler 进程重启与误双启动 | 同一计划触发前后重启，或启动第二实例 | 同一 `schedule_id + planned_run_at` 不重复产生有效业务触发 |
| Celery 重试/重复执行 | 人工投递同一逻辑事件两次 | Outbox/节点回调幂等，已成功外部效果不重复破坏数据 |
| Next.js 节点掉线 | 发布及撤回时禁用一个前端节点 | 主库记录未确认状态；恢复后校对并更新；已收到撤回的节点绝不兜底旧正文 |
| 乱序缓存事件 | 先投递新版本，再投递旧刷新事件 | `public_generation` 阻止内容回滚，撤回 tombstone 不被旧版本覆盖 |
| 文件系统写入中断 | 快照写入过程中断电/磁盘满 | 不返回“已应用”成功；旧完整公开快照可用或明确不可见，不暴露半截 JSON |
| 权限撤销与离线编辑 | 编辑时撤销账号权限并重连 | WS/HTTP 拒绝未授权写入；浏览器仍可安全导出个人未同步文本 |
| 插件被移除 | 删除插件代码并重新部署 | 核心服务可安全启动；插件历史数据与数据库表保留 |
| 生产 API 路径与契约 | 在独立 API 主机联调并检查公开业务 OpenAPI `paths` | 浏览器请求由 `BACKEND_BASE_URL` 与 `/v1/*` 连接得到的地址；FastAPI 仅注册 `/v1/*`，不存在为开发代理增加的 `/api/v1/*` 业务路由 |
| 开发代理路径重写 | 对 `/api/v1/*` 测试查询参数、请求体、Cookie 与响应透传 | 仅剥离一次 `/api` 后转发到 `/v1/*`，不出现 `/api/api` 或 `/v1/v1`；不代理内部服务接口 |
| 生产跨源身份验证 | 从配置中的网站 Origin 登录并访问受保护 API，同时测试未授权 Origin/缺少 CSRF 校验材料的请求 | Cookie、精确 CORS 白名单与独立 CSRF 防护按配置生效；不能以开发同源代理通过测试代替生产跨源验证 |
| 服务地址与节点配置 | 更换基地址、增减/停用节点或重排 `frontends` 分组；保持节点 ID 不变更换域名 | 地址与双向 Token 引用从同一节点分组读取；声明顺序和域名变更不改变回执归属；历史记录不因节点移除而转给其他节点；启用节点缺少地址或任一方向所需密钥引用时配置校验失败 |
| 内部请求双重校验 | 分别测试允许/不允许的实际连接 IP 与正确/错误 Token 的四种组合 | 仅 IP 允许且 Token 正确、权限满足时通过；允许 IP 不免 Token，正确 Token 不绕过 IP 检查 |
| 伪造来源头与代理部署 | 从未允许的实际来源携带正确 Token，伪造 X-Forwarded-For、X-Real-IP、Forwarded 与 Cloudflare 来源头；测试绕过入口直连 | 伪造头不能使请求通过；真实 peer 的采集不受代理头改写；网关校验模式下无法绕过网关 |
| Token 方向及节点隔离 | 将读后端 Token 用于前端缓存接口、交换两个节点的 Token，或发送不匹配本机的 `target_node_id` | 均拒绝执行；认证身份由 Token 决定，目标 ID 必须等于本机 `FRONTEND_NODE_ID`；逐节点回执和重试不混淆 |
| 内部认证配置异常 | 空 IP 列表、非法 CIDR、缺失密钥引用、示例占位值、无法取得可信 peer IP | 空列表或未知 peer 拒绝请求；非法配置及缺失密钥阻止相关内部服务就绪，不降级成单项校验 |
| 前端配置保密与 Worker 来源 | 检查浏览器构建产物和公开运行时配置；由真实 Celery Worker 触发缓存通知 | 不包含内部 Token/密钥引用配置；Worker 的实际来源按前端允许列表检查，不以 FastAPI 地址替代 |

## 统一诊断字段与测试环境

- HTTP/WS/任务/缓存投递统一记录 `request_id`、`event_id`、`content_id`、`task_id` 等有关联的标识；敏感 Token 和会话凭据绝不进入日志。 内部请求额外记录校验入口实际取得的 `peer_ip`、认证后的服务身份和拒绝原因类别；不记录完整 Authorization 头或任何 Token 值。

- 集成测试至少运行两个 FastAPI 进程、两个 Celery 执行单元、一个 Scheduler、一个 PostgreSQL、一个 Redis、两个逻辑 Next.js 接收节点；模拟网络丢包、进程终止及重复消息。

- 核心功能在其对应 P0 场景通过后进入生产试运行；新增 P0 编号和具体故障见下方补充。未来云端镜像、CDN purge 与自动故障切换按原阶段单独验收，不因当前文档讨论了其边界而视为首版已实现。

## 本轮补充：实现前必须明确的工程约束

现有架构、项目拆分、HTTP 响应模板和配置归属已获用户认可。以下为补齐可靠性与安全闭环的工程提案，不增加新的业务模块。标为 P0 的行为应在相应功能上线前验收；参数示例是待压测的建议初值，不是框架默认值或已验证的生产容量。云端自动周期校对、CDN 插件和自动故障切换仍保持原有后续阶段边界。

### 1. 配置加载、校验与凭据轮换

- **加载优先级：**内置非敏感默认值 → 明确指定的 `config.toml` → 文档列明的环境变量覆盖。建议两个项目分别以 `CONFIG_FILE` 指定文件；未指定时读取本项目根目录的 `config.toml`，相对路径也以项目根目录解析，不依赖启动时的工作目录。`config.example.toml` 不是生产回退配置；生产不自动搜索未知 `.env`。

- **显式覆盖表：**后端保留 `DATABASE_URL` → `database.url`；`BACKEND_BASE_URL`、`REDIS_URL`、`CELERY_BROKER_URL`、`CELERY_RESULT_BACKEND_URL` 分别覆盖对应已声明字段。前端的公开 `BACKEND_BASE_URL` 和自身 `FRONTEND_NODE_ID` 独立读取；内部连接覆盖项、来源允许列表、双向 Token 引用继续全部位于前端 `[backend]`。新增环境变量须进入配置 Schema，不做任意字符串到嵌套字段的隐式猜测。

- **合并后验证：**拒绝核心配置的未知字段、拼写错误、类型错误、无效 URL/IP/CIDR、重复节点身份与凭据歧义，再解析 `*_token_env` 引用。显式空值不能静默回退到旧密钥。插件配置由对应 Manifest/Schema 校验。输出有效配置摘要时脱敏连接串及凭据，不打印 Token；首版不承诺配置热更新，修改后显式重启相关进程。

- **轮换流程：**首版沿用每节点、每方向一个有效 Token。管理员暂停受影响的发送，保留待投递记录，更新接收端及发送端配置并重启，验证双向调用后恢复投递；短暂认证失败按暂停/重试处理，不额外要求零停机双密钥机制。轮换必须覆盖实际发请求的 Celery Worker，旧 Token 不自动回退。

- **不把秘密固化进任务：**Outbox/Celery 参数只保存稳定目标节点 ID 和业务载荷，不保存 Token 实际值。每次执行从当前已加载配置取得凭据；不通过改 `node_id`、删节点或清空 Outbox 完成轮换。节点的 `enabled` 仍只控制定向投递，不自动撤销入站身份。

### 2. 浏览器会话、CSRF 与协同连接

- **跨源不等于跨站：**建议默认主机专用 Session Cookie、`HttpOnly`，生产 `Secure`；同站子域场景可用 `SameSite=Lax`。真正跨站部署若需 `SameSite=None; Secure`，必须单独验证目标浏览器的第三方 Cookie 限制，不能靠扩大 Cookie Domain 解决。仍不让 Next.js 公共 SSR 获取或混入用户态。

- **CSRF 协议：**使用 Session 的写操作及登录/退出流程，必须验证精确来源和会话绑定的 CSRF 令牌。建议通过 `no-store` 的会话初始化响应在 `data` 中返回令牌，写请求携带 `X-CSRF-Token`；登录前使用预会话，登录成功后更新会话及令牌。令牌不得进入 URL、公开快照或日志。明确使用 API Key 的端点按独立认证规则处理，不能因请求含任意 `Authorization` 头就跳过 CSRF。

- **WS 入房前校验：**每次浏览器握手精确匹配允许的 Origin；缺失、`null` 或未授权来源均拒绝，CORS 中间件不能替代 WS Origin 校验。建议在会话验证后用第一条消息提交 CSRF 令牌，5 秒内未完成即关闭；完成前不加入协同房间、不发送正文或 Awareness、不接受更新。不把认证材料放在 WS 查询字符串。

- **长连接失效：**会话过期、退出或资源权限撤销后，所有相关进程停止该连接的受保护读写；控制通知仅加速失效，写入仍以权威权限状态为准。未授权的本地未同步稿保留导出能力，不因拒绝上传而直接删除。登录、密码验证、匿名评论和 WS 连接数/消息量分别限流；共享配额不能只存在于单个 Worker 内存中。

### 3. HTTP 重试、分页与非协同状态并发

- **请求幂等不等于事件幂等：**创建内容/评论、发布和人工触发任务等有重复副作用的端点，在契约中声明是否要求 `Idempotency-Key`。作用域为认证主体、HTTP 方法、规范资源路径与键，并保存影响业务语义的请求指纹。同键同请求复用原业务结果；同键不同请求返回 409；同键仍处理中返回明确的处理中状态，不再执行一次。游客评论/表单使用已有预会话 ID 界定作用域，不能把所有游客合并为同一个 anonymous 主体。

- **持久与授权：**幂等登记、业务写入及相关 Outbox 在 PostgreSQL 事务中协调，不用 Redis 锁或 Celery `task_id` 代替。重试处理顺序为重新鉴权 → 校验幂等键/请求指纹 → 已成功则复用原结果 → 仅首次新执行进入版本前置条件与业务操作；否则首次成功后的版本增长会使合法重试误报冲突。不凭幂等键绕过已撤销的权限。建议请求幂等记录至少覆盖 24 小时客户端重试窗口；超过窗口后的长期重复风险仍由业务唯一约束处理。HTTP 超时表示结果未知，客户端只对契约明确支持的操作自动重试。

- **非协同状态使用期待版本：**发布/撤回、审核决定、访问策略和任务计划等修改携带 `expected_version`，服务端通过 `row_version` 条件更新或必要行锁重新校验；冲突返回 HTTP 409，不能静默覆盖。正文、标题、摘要等已经进入 Yjs 的字段仍走同一协同写入链路，不能另开整份 JSON 最后写入覆盖入口。

- **分页默认：**普通列表使用 `page=1`、`page_size=20`，建议页大小范围 1～100；非法参数返回 422，超出最后一页返回空 `items`。固定排序规则并以稳定 ID 兜底；评论维持 `(created_at, id)` 从早到晚。分页不承诺跨多次请求的一致快照；需要稳定全量扫描的导出/Manifest 使用自己的快照游标协议。

- **不改变响应外壳：**仍为 `success/code/msg/data`，`code` 保持整数及原有 HTTP 状态约定。分页在 `data` 中放 `items/page/page_size/total`；错误机器标识放 `data.reason`，字段错误放 `data.errors`，前端不解析本地化 `msg` 作判断。禁止新增顶层 `error/meta` 或返回堆栈、密钥、敏感原始输入。

- `X-Request-ID` 用于跟踪，不是鉴权或幂等键。按需将该头与 `Retry-After` 加入 CORS 暴露头清单；允许的请求头应包含已采用的 CSRF/幂等字段。前端分别处理网络失败、401、409、422、429 和 503，不把网络不可达自动解释为退出登录。

示例仍使用已有响应模板：

```json
{
  "success": true,
  "code": 200,
  "msg": "请求成功",
  "data": {
    "items": [],
    "page": 1,
    "page_size": 20,
    "total": 0
  }
}
```

```json
{
  "success": false,
  "code": 409,
  "msg": "内容已被其他操作更新，请刷新后重试",
  "data": {
    "reason": "version_conflict",
    "current_version": 8
  }
}
```

### 4. Outbox 扫描、重试终态与异常恢复

- **事务边界：**应用服务层统一提交业务、必要审计与 Outbox，仓储函数不私自提交半个业务事务；事务内不发送邮件、HTTP 回调或其他外部效果。对要求可靠的任务，不能只靠事务提交后的单次 `delay()` 调用保证投递。

- **补充 Scheduler 的基础设施职责：**首版建议由既有独立 Scheduler 内的 Outbox relay 循环扫描、认领已持久化事件，并经 Celery 原生 API 投递。它仍不加载 `tasks.py`/`router_init(ctx)`，不发缓存 HTTP 回调、不发邮件、不执行业务。计划扫描与 relay 各有独立超时、退避及有界并发；Broker 故障不能堵住计划触发及 Outbox 的事务登记。启动扫描、周期扫描负责恢复，通知仅提速，不依赖先收到一条 Broker 任务才能启动 relay。

- **明确运行依赖：**Scheduler 停机将同时延迟计划调度和 Outbox 可靠投递。API 可返回业务已提交及任务待投递，但不能声称已发送或已完成。后台必须展示 relay 心跳、积压数量与最老积压时间。普通无需可靠性的任务仍可按既有 Celery 原生 API 直接投递。

- **短事务认领：**记录 `lease_owner`、`lease_until`、`attempt_id`，释放数据库锁后再做网络 I/O；租约超过单次受控投递时限，过期可接管，旧领取者不得覆盖新领取者的结果。区分 Broker 已接受、Worker 已领取、业务效果已确认；重复消息沿用原逻辑任务/事件 ID。

- **状态与错误分类：**业务任务、目标节点投递和单次尝试分别记账。连接中断、限流、临时 5xx 可指数退避加抖动；认证/配置错误、协议不兼容暂停并报警；不可恢复输入错误终止。自动尝试有次数和时间预算，耗尽持久标为待处理。管理员按原逻辑 ID 补投、保留尝试历史，不新造事件绕过幂等。

- **结果未知不是失败：**外部效果完成而回执丢失时，优先用对端幂等键/查询接口核对。不能核对又不能幂等的效果标为未知，须按任务类别决定是否允许重复或人工确认；不承诺跨服务恰好一次。Worker 被杀、Redis 心跳消失或 Broker 丢消息后，须核对持久任务记录，不能无限卡在 running，也不能据此断言从未执行。`acks_late` 等设置仅用于已验证可重入的任务，并配合持久尝试预算。

- **保留既定计划语义：**停机错过且尚未登记的计划默认跳过；已经原子登记的执行/Outbox 属于必须恢复的待完成工作，不受“跳过错过计划”影响。取消计划不等于撤销已登记或正在执行的任务，取消规则必须在任务契约中明确。紧急撤回的未确认节点即使重试耗尽也持续展示和告警。

### 5. 协同持久水位、审核截点与背压

- **修正 ACK 验收：**同一 `(document_id, update_id)` 只落库一次，但成功 ACK 可以重发。重传同一 ID、同一 payload 时返回原持久结果；同 ID 不同 payload 哈希拒绝。客户端只在收到持久 ACK 后清除对应待发送记录。

- **安全水位：**首版建议在文档行短事务锁下分配和提交递增 `committed_seq`，以文档内连续已提交前缀为检查点水位 N。全局自增 ID 的最大值不等于提交顺序，不能据此删除较小编号的日志。`row_version`、协同 `committed_seq` 与公开 `public_generation` 各司其职。

- **初始化与重建：**同一草稿的 CRDT 初始状态只建立一次，由数据库唯一约束/事务协调；其他 Worker 从已存 Yjs 二进制状态及后续日志恢复，不各自从普通 JSON 重新播种相同文本。JSONB 草稿投影可以重建，但不能与 Yjs 持久状态形成两套互相覆盖的权威源。

- **提交审核截点：**提交者先等待自己的本地修改持久 ACK；服务端选定已提交水位 N，从一致的持久状态冻结完整正文与协同元信息，验证块结构、URL、分类/标签等业务约束，创建不可变 Revision 并记录来源草稿和 N。N 之后的编辑只影响工作草稿，不混进该修订；不能直接冻结某个 Worker 可能落后的内存副本。客户端明确提示未同步修改未被纳入。

- **安全压缩：**新检查点验证可恢复并原子激活后，才清理其确实覆盖的日志；保留上一有效检查点和恢复所需后缀。更新去重回执与被压缩 payload 分开，首版不自动过期去重回执。不能把 Yjs 压缩变成丢失 CRDT 身份的纯文本重建；压缩后旧离线客户端仍须通过 State Vector 重连。压缩频率待压测，安全条件不待定。

- **断线以外也要补齐：**跨 Worker 订阅恢复、检测到水位差异或必要的周期校对时，从 PostgreSQL 检查点/日志恢复并向在线客户端重同步。必须覆盖数据库已提交、但进程在 Redis 发布前崩溃的窗口，不能等待所有客户端主动重连才发现缺失。

- **有界队列：**限制单更新、单连接/房间待持久与待发送字节、连接数及消息率；慢客户端超限时明确要求重同步或断开，已持久正文可从数据库补齐，未持久更新不 ACK。大初始同步须分片或采用受限传输，不通过无限提高单帧上限解决。Awareness 可合并陈旧光标更新，但不能把正文静默丢弃当作成功。

- **在线身份和光标：**新连接需要取得当前房间的 Awareness 初始状态，而不只是未来事件。身份显示由已认证会话绑定；光标/选区使用兼容的相对位置与稳定块 ID。不同标签页/设备各有连接身份，断开一个连接不能抹掉同用户其他在线连接；进程失效或心跳超时应清除幽灵光标。

- **跨语言互操作门槛：**正式选定浏览器 Yjs、编辑器绑定及 Python 兼容实现版本后，保存二进制测试样本，验证中文输入法、撤销/重做、多块增删排序、断线重传和压缩后重连；不能只证明两个浏览器在单个 Worker 上能同步。

### 6. 媒体文件与数据库的一致可见性

- 上传采用 `staging/ready/failed` 状态；只有 `ready` 资源进入正式媒体映射。先写非公开临时目录，验证实际文件类型、大小、解码完整性和哈希，再落盘并移入唯一目标，最后提交 ready 元数据及必要的派生/映射变更 Outbox。临时与最终目录应位于支持该原子操作的同一文件系统；不覆盖已存在的原始媒体。

- 文件系统与 PostgreSQL 不是同一个事务。允许失败留下可识别、可隔离的临时/孤儿文件，但不允许确认 ready 时文件尚未可靠落盘。恢复检查根据记录、路径和哈希核对；Linux 文件及父目录同步等持久性条件须在实际部署文件系统验证，不能把原子 rename 等同于断电不丢数据。

- 路径由服务端稳定媒体 ID 生成，不信任用户文件名/路径，不允许目录穿越。限制图片尺寸/解码资源；HTML/SVG 等主动内容不能未经策略检查直接在应用同源执行。正文 HTML、实时预览及插件缺失的降级也维持既有安全过滤规则。

- WebP 派生以媒体 ID、规格和转换器版本作为幂等依据，失败不破坏原图，不提前返回不存在的派生 URL。只对确认无活跃写入的临时残留做隔离/清理；原始媒体、软删除资源和历史修订引用仍由管理员明确决定物理删除，不借孤儿清理改变 Q62。

### 7. 运行就绪、磁盘压力与缓存重建

- **活性不等于就绪：**live 判断进程/事件循环是否正常；ready 按角色报告配置、Schema 和依赖能力，不因远端暂时不可达触发全系统重启循环。Next.js 分开报告公开读取和缓存接收能力；已有完整且允许公开的快照可继续读，未命中且源站不可达返回临时不可用，不伪装成 404。

- **退出顺序：**取消相应就绪状态、停止接收新工作、完成或回滚已开始的事务/快照切换，再释放连接。WS 未持久化更新不 ACK；Worker 采用正常排空退出，超过等待预算要报警并标出可能未知的工作，不声称强杀必然无损。服务管理器等待时间与应用排空预算配套。

- **磁盘和回源限额：**限制快照大小、总缓存预算、临时文件空间及回源并发；同一资源/版本的并发未命中合并处理。磁盘压力下先清理已判定无用的临时文件/失败 staging/旧渲染产物，不按年龄删除当前有效公开快照，不引入 TTL，也不自动删除媒体原文件。达到容量预算停止新增缓存写入并报警。

- **撤回写入失败：**普通刷新失败可保留仍允许公开的完整旧版；已收到撤回则立刻阻止目标正文继续被服务，不返回 applied。节点进入可服务状态前先持久化并确认本次运行的 dirty 标记；仅正常退出且全部安全状态已落盘时标为 clean，不能等磁盘满后才试图记录故障。启动时若上次为非干净退出或安全状态无法确认，须取得并验证权威 Manifest/撤回状态后才能重新服务旧缓存；管理员恢复也不能只清除标记。首次引导、磁盘满、只读挂载及重启组合必须验收；该异常场景下宁可暂不可用，也不盲目离线回退旧正文。

- **首版显式管理操作：**提供受保护的缓存检查、按资源重建、整节点重建命令/操作，沿用既有内部接口与任务，不新增服务或云端周期校对。重建使用 staging、Manifest 与资源版本核验再激活；并发收到的更新/撤回优先参与最终版本比较，失败不覆盖仍合法的完整缓存。

- **节点身份与存储身份分开：**首版一个 `FRONTEND_NODE_ID` 对应一个可定向到达的独立缓存实例。磁盘保存 `cache_instance_id`，换盘/清空后生成新值，受保护引导流程更新后端的存储实例记录；回调携带固定的 `target_cache_instance_id`，该值进入去重与回执归属；旧存储目标不匹配则拒绝并标记需重新引导，不能在重试时自动换成新实例。新存储通过显式引导生成当前权威同步，旧 applied 回执不代表新磁盘已同步。稳定 `node_id` 不因此改变。将同一地址负载均衡到多份互不共享的磁盘，不能用一次回执声称全部成功；未来共享缓存/多实例必须先验证失效协调。

- 日志轮转和告警覆盖：数据库连接失败、relay 最老积压、任务未知/耗尽、WS 待持久队列、缓存落后/未确认撤回、磁盘空间和恢复阻断。正式修订与关键审计记录不与临时运行日志采用同一自动清理策略；告警应聚合，避免故障时日志反过来耗尽磁盘。

### 8. 发布迁移与外部备份恢复

- 发布清单记录后端/契约/数据库 Schema/插件版本、前端 build ID、快照格式和渲染器版本。首版不兼容升级采用管理员维护窗口；后端 API、Worker、Scheduler 使用同一后端发布批次，迁移通过显式命令及数据库级互斥执行。启动只检查兼容性，不自动迁移。

- 代码回退必须先确认旧代码兼容当前 Schema；不自动执行破坏性数据库 downgrade。前端同一发布批次复用构建产物，验证旧浏览器部署后的资源和导航兼容。主题/安全过滤器变化可使渲染缓存失效，不能只看文章版本不变就保留旧 HTML。

- **外部恢复清单补齐媒体：**除 PostgreSQL 和对应代码/插件版本，还须由外部备份方案覆盖不可重建的原媒体、必要部署配置与受控密钥保管。CMS 仅提供恢复前后检查与管理接口，不新增内建备份调度服务，也不把公开镜像当数据库备份。

- **恢复代际：**协议补充持久的 `source_epoch`。正常发布和进程重启不改变它；权威数据库回档前，管理员进入维护模式，排空或停止相关 API、Worker、Scheduler，并关闭旧 WS；随后恢复数据库、显式换代并重新引导节点，不做复杂的在线热回档。缓存只在同 epoch 内比较 `public_generation`，新 epoch 必须经受保护的恢复流程接受，不能看见任意不同值就自动重置。事件/任务/WS 会话保留创建时的 epoch，在执行及提交前核验；旧 epoch 的回调、队列任务和 WS 自动重传须被隔离，不能在补投时把旧载荷重新包装为当前 epoch。该机制防止旧任务复活内容或旧高版本永久挡住新发布，但不能撤销已经发生的外部副作用。

- 恢复后先校验数据库/文件与代码版本，再处理队列和派生数据。可重建的缓存/搜索重新生成；可能已发出的邮件和通知先核对，不无条件重放旧 Outbox。旧浏览器的 IndexedDB 草稿先保留恢复副本，重新鉴权和同步后由用户明确处理，不自动把恢复前状态灌回新权威库。恢复上线必须显式解除维护状态。

- 备份可能早于某次撤回、权限修改或删除，恢复本身可能回退这些事实；上线前必须核对这种回退风险，不能靠缓存版本机制声称自动恢复到备份之后。首版上线前做一次真实的隔离恢复演练并记录可恢复时间点与恢复耗时；不在尚未测量时承诺 RPO/RTO 数字。

### 配置初值与实现约束

本轮建议参数已合并进前面两份 `config.example.toml` 完整示例，不再重复建立一份配置源。时间单位为秒，大小单位为字节；示例值用于开始联调，正式部署前须结合资源与压测调整。

| 参数组 | 建议初值 | 边界 |
| --- | --- | --- |
| 后端 `runtime` | 健康检查 2 秒；HTTP 排空 30 秒；Worker 等待 120 秒后报警 | 报警阈值不是强杀安全保证 |
| 后端 `http` | 默认 20 条/页、最多 100 条；请求幂等记录 24 小时 | 不替代长期业务唯一约束 |
| 后端 `limits` | JSON 8 MiB；上传 32 MiB；WS 更新 1 MiB；每连接待处理 4 MiB；认证 5 秒 | WS 更新大小不是整篇文档上限，大同步另有受限传输 |
| 后端 `outbox` | 每秒扫描，批次 50；连接 2 秒、单请求总时限 15 秒；最多 8 次，退避上限 900 秒；投递租约 60 秒 | 网络发送在数据库事务外，租约大于受控单次投递时限 |
| 前端 `backend` | 连接 2 秒、单请求总时限 15 秒 | 继续置于现有 `[backend]`，不公开给浏览器 |
| 前端 `cache` | 单快照 8 MiB；并发回源 4、重建 2；容量 2 GiB，至少保留 512 MiB 空闲 | 本地快照配置，不是后端连接；达到容量报警/停新增写入，不删除有效正文 |

后端 `outbox` 网络时限须明确映射到 Celery Broker 发布与节点回调各自的客户端。投递租约不是业务任务最大执行时间；长任务另设时限、心跳和尝试策略。房间总量、连接数、消息率、图片解码等限额必须在实现配置 Schema 中补齐并给出实际值，不以示例中未列出为无限制。

前端 `cache.directory` 相对前端项目配置根目录解析，生产挂载持久目录；`cache_instance_id`、`source_epoch`、事件回执是受控运行状态，不由用户在模板里反复手填。新增配置均须由显式加载器和启动验证支持；文档示例不是框架自动生效的选项。

### 新增 P0 验收用例

| 编号 | 故障或边界 | 通过条件 |
| --- | --- | --- |
| P0-CFG | 不同工作目录启动、空环境覆盖、拼错字段、轮换后重试旧任务 | 配置结果确定；错误配置拒绝就绪；原节点 ID 不变，新密钥有效、旧密钥无效 |
| P0-AUTH | 正确 Cookie 配恶意 Origin、错误 CSRF、WS 首帧超时、会话撤销 | 不产生写入、不泄漏协同正文；其他 Worker 同样拒绝未授权操作 |
| P0-HTTP | HTTP 提交成功后断线，并发同键重试及同键改载荷 | 一个业务结果及一组逻辑事件；不同载荷 409；重新鉴权不可绕过 |
| P0-STATE | 并发发布/撤回、抢同一 URL、写入与提交审核同时发生 | 合法状态或明确冲突；Revision 精确对应完整持久截点 |
| P0-OUTBOX | 提交后发送前、Broker 接受后、对端生效后分别终止进程 | 工作可追踪、可幂等恢复或进入明确未知态，不丢弃为已完成 |
| P0-RETRY | 持续 503、认证失败、Worker 异常退出、人工补投 | 有界自动重试及持久终态；尝试记录可审计，紧急撤回未确认项不消失 |
| P0-COLLAB | ACK 丢失、较小序号晚提交、压缩中崩溃、慢客户端、旧离线客户端重连 | 入库一次但 ACK 可重发；所有已确认更新可恢复；不无界堆内存 |
| P0-FILE | 上传磁盘满、文件完成但 DB 失败、重复 WebP 任务 | 无半文件成功状态、原文件不覆盖、临时残留可隔离 |
| P0-CACHE | 清空缓存但保留后端 applied 回执、重建期间撤回、撤回写盘失败后重启 | 识别新存储实例；不能重激活旧正文；不靠 TTL 或删除原媒体解决 |
| P0-OPS | 依赖断线、正常排空、迁移后应用失败、旧备份恢复且保留旧队列/缓存 | 能力降级可解释；不提前确认；不盲目 downgrade；旧代际工作隔离后才恢复写入 |

这些用例按实际交付功能执行：首版单节点的缓存恢复和真实多 FastAPI Worker 协同必须通过；增加镜像/多缓存实例时再加对应部署用例。云端自动追赶与 CDN 插件仍在各自上线前另行验收，不因本节而自动列入首版交付。

# 实施顺序与交付物

| 顺序 | 交付物 | 完成判据 |
| --- | --- | --- |
| 1 | 完整 SQLAlchemy 模型、约束清单、Alembic 显式迁移 | 空库建立、约束失败测试、内容版本事务测试通过 |
| 2 | API/WS/事件 OpenAPI 与 JSON Schema、错误码/Token/版本规范 | 后端发布契约、前端按版本生成类型，Python 与 TypeScript 跨仓库契约测试、幂等和鉴权测试通过 |
| 3 | Next.js 自定义快照存储、框架缓存适配器、接收端回调 | 发布、刷新、撤回、乱序与节点断连用例通过 |
| 4 | 故障注入与联调报告 | 表中 P0 场景可自动复现并全部通过 |

## 已确认的工程选择与后续交付边界

1. **已按用户意见改为两个独立项目。**`everunfold-backend` 与 `everunfold-frontend` 各自为 IDE 可单独打开、构建和部署的 Git 仓库；接口契约由后端版本化导出，前端生成 TypeScript 客户端并锁定兼容版本。项目名已确定为 Everunfold，正式 Git 托管地址在创建代码仓库时再定。

2. **现有方案已认可：**静态 `manifest.toml` 预检模块，FastAPI 只装配自身服务；Worker 按 Manifest 的任务模块清单加载任务；Scheduler 不执行业务。本轮新增的 Outbox relay 落位是工程细化建议，明确为扫描/认领/投递能力，而不是新增业务执行角色。

3. **现有方案已认可：**Next.js 自定义磁盘公开快照是该节点可持久化的缓存副本，框架缓存为可清理的派生层；不直接删除 `.next` 内部文件实现一致性。业务事实的权威来源始终是 PostgreSQL/FastAPI，公开缓存不能反向覆盖主库。

4. **现有模型方向已认可：**按核心表关系展开具体字段、索引及 PostgreSQL DDL。当前仍须交付完整迁移、API/WS/ICP 契约、真实缓存与协同适配器以及故障测试报告；新增工程约束和建议参数不等于上述产物已经完成。无需为原有配置与架构重新发起一轮产品选择题。

## 参考依据

- [FastAPI 生命周期与启动管理](https://fastapi.tiangolo.com/advanced/events/)

- [SQLAlchemy 2.0 Session 与并发约束](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)

- [Next.js 自托管与缓存协调](https://nextjs.org/docs/app/guides/self-hosting)

- [Redis Pub/Sub 投递语义](https://redis.io/docs/latest/develop/pubsub/)

- [Celery 任务发现接口](https://docs.celeryq.dev/en/latest/reference/celery.html)

- [RFC 9110：HTTP 方法与重试语义](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

- [OWASP：CSRF 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

- [OWASP：WebSocket 安全](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)

- [OWASP：文件上传防护](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

- [PostgreSQL：事务隔离与序列的事务边界](https://www.postgresql.org/docs/current/transaction-iso.html)

- [Yjs：Document Updates 与 State Vector](https://docs.yjs.dev/api/document-updates)

- [Celery：任务幂等、确认与重试](https://docs.celeryq.dev/en/stable/userguide/tasks.html)

- [Celery：Worker 排空与终止](https://docs.celeryq.dev/en/stable/userguide/workers.html)

- [Linux：fsync 与目录项持久性](https://man7.org/linux/man-pages/man2/fsync.2.html)

以上官方资料用于核验底层行为；配置数字、Outbox 承载位置、恢复代际与验收用例是针对本项目的工程建议。实现时须锁定实际依赖版本并复核，不将浮动文档版本视为已选定的软件版本。
