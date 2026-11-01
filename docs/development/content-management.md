# 文章与说说管理

版本：content-management-3，2026-11-02。基础 CRUD 见 ADR 0030；发布、同步与独立编辑页见 [ADR 0031](../decisions/0031-content-publication-and-editor-pages.md)。当前联调数据范围见 [ADR 0032](../decisions/0032-functional-test-data-and-sync-status.md)。

## 当前功能测试数据

当前阶段只展示新后台创建并发布的内容。2026-11-02 已将开发库旧博客试导入的 78 篇文章和 9 个页面撤回，前台只剩两篇后台测试文章和两则说说；后续测试围绕这些内容及新建数据验证，不再次导入或恢复旧博客内容填充页面。正文、媒体、历史评论和分类关系仍保留在库中，恢复需用户明确调整本阶段范围。

后端开发工具默认预检，实际撤回显式传 `--apply`：

```powershell
uv run python -m tools.withdraw_wordpress_preview
uv run python -m tools.withdraw_wordpress_preview --apply
```

工具只接受本机开发库或专用隔离测试库；按有效管理员记录审计。撤回、审计、完整 release 与 Outbox 同事务，失败回滚，重复执行不产生版本；不用删快照或改前端过滤器。普通「重新同步」只重发当前最高版本，不会重新引入已撤回内容。

## 使用

管理员在 `/admin/content/article` 和 `/admin/content/shuoshuo` 分别管理两种注册类型。新建进入 `/admin/content/{type}/new`，编辑进入 `/admin/content/{type}/{id}/edit`，不再使用编辑弹窗。文章标题必填、摘要可选；说说标题可选。正文暂为 Markdown，可切换安全预览。

1. 新建后先「保存草稿」，获得固定编辑地址。保存草稿只保存工作版本，不会改动前台。
2. 准备好后点击「发布」；已发布内容修改后可「保存草稿」或「更新发布」。发布使用页面当前输入，并保留稳定的块 ID。
3. 页面下方「前台内容已同步」表示配置节点已确认完整快照落盘；它与「内容已发布」分别表示两个阶段。失败时内容仍在后端，可「重新同步」。
4. 「查看前台」打开公开地址。已打开的旧标签页需要刷新或发起新的页面导航；当前没有向所有浏览器主动推送刷新。
5. 「撤回」使前台在同步后返回 404。垃圾桶按钮将内容移至回收站，同时撤回已发布版本；恢复只恢复工作草稿，需要再次发布才公开。

列表支持全部、草稿、已发布、回收站、搜索和分页。已发布后又保存工作稿，会标记「有未发布修改」。代码「页面」入口独立；完整页面注册、暴露选项/启停保存仍按 registered-pages.md 后续实现。

保存失败保留输入；未知结果使用固定操作 ID 重试，版本冲突保留本地输入并允许读取最新版本。返回按钮和普通页面链接对未保存内容弹出确认，刷新/关闭标签页使用浏览器离开保护。尚无跨刷新本地草稿恢复、浏览器历史后退的全面拦截或协同编辑。

## 本地启动

后端目录先显式初始化，服务启动不自动迁移：

```powershell
uv sync --frozen
uv run python init.database.py --no-create-database
uv run uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --no-proxy-headers
```

另一个终端启动本地投递辅助进程（保留前端 `npm run dev`）：

```powershell
uv run python -m tools.run_settings_dev --frontend-root E:\Programming\Node\Everunfold-Frontend
```

该命令同时启动独立 Node 接收器、Celery Worker 和 Scheduler，现同时处理设置与内容；不是启动 API/Next 的替代。本机接收器端口为 3001。服务运行后，无历史 release 的节点可在内容页点击「重新同步」初始化公开版本；正常发布自动登记同步。

实际配置复用后端 `frontends.<node>.settings_receiver_url` 和对应 Token 环境变量；前端 `FRONTEND_NODE_ID`、`settings.source_epoch`、`backend.allowed_peer_ips` 必须匹配。生产分别部署这三个进程并提供凭据，不使用本地辅助命令生成的开发凭据。不要在浏览器配置内部 Token。

`tools.seed_content_drafts` 是可选显式示例命令，重复执行不覆盖已编辑内容，**不自动发布**。本机原有两篇文章、两则说说已用于本轮正式发布联调；不提交这些数据库数据，不重新导入 WordPress。

## 结构与契约

- 0010 迁移增加草稿发布信息、独立内容代次和不可变 `content_releases`；原用户、媒体和公开文章保留。
- 后端 `type_registry` / `draft_*` 提供注册与私有 CRUD；`publication.py` 负责公开投影、索引、release 与 Outbox。业务、审计、回执和可靠事件同事务提交，网络投递在事务外。
- 公开首发地址为 `/posts/{id}.html` 或 `/shuoshuo/{id}.html`，修改标题不会改地址；暂不提供自定义 slug。
- content-admin **1.1.0** 与 public 快照 **0.2.0** 来源提交 **a86479b**，前端生成目录记录提交与 SHA256。公开契约历史文件名仍是 `public-v0.1.schema.json`，接受旧 0.1 与新 0.2，类型新增 shuoshuo；settings 1.6.0 不变。
- 前端 `core/content-management` 处理请求/编辑状态，`themes/argon/admin/content` 负责展示，路由仅装配；类型与页面匹配在可信注册处声明，不开放任意未知后台子路径。
- `server/content/store.ts` 与设置存储共用不可变 JSON 写入原语。内容版本存放在 `cache.directory/releases/{node}/{epoch}/`，`managed.json` 标识受管缓存。完整数据 ACK 前写入版本意图与完整文件；最高已知版本损坏/缺失时返回 503，不回退旧正文。

## 检查与边界

后端测试必须先迁移专用测试库，不能用开发库运行集成测试：

```powershell
uv run python init.database.py --config config.test.local.toml --no-create-database
$env:RUN_DATABASE_TESTS = '1'
uv run pytest -q --tb=short
```

前端 `npm run check`、`npm run verify:admin`；生产验收在临时副本构建，保持正在运行的 `.next` 不变。验证结果见 [本轮验收](../handoff/content-publication-verification.md)。

当前只发布公开文章/说说。暂未实现受限/密码内容、定时发布、完整分类标签/SEO 编辑、封面/媒体插入器、Y.Doc、混合块编辑器、历史导入和完整代码页面配置。完整快照上限 8 MiB，没有增量分片/磁盘 GC/节点心跳；目录保留旧版本供诊断，但读取只认最高已知版本。跨仓库协议的完整生产缓存体系仍未完成。
