# 文章与说说管理

版本：content-management-1，2026-11-01。决定见 [ADR 0030](../decisions/0030-registered-content-drafts.md)。

## 使用

登录管理员后，左侧「内容」分组分别进入 `/admin/content/article` 和 `/admin/content/shuoshuo`；原 `/admin/content` 是类型入口。文章有必填标题、可选摘要和正文；说说标题可选、以正文为主。当前正文编辑器支持 Markdown 与安全预览，保存后仍为草稿。

列表可按标题/摘要/正文搜索、分页、打开编辑；删除经过共享确认窗口移入回收站，可在回收站恢复。示例标有「示例」，与普通草稿一样能编辑/回收。没有永久删除、自动发布、定时发布、细化分类标签或 SEO 设置。

保存失败保留输入；结果不明时锁住当前输入并使用同一操作 ID 重试，避免重复创建。版本冲突时保留自己的文字，可查看最新服务器版本，再明确确认是否丢弃输入并读取最新。关闭有未保存内容会询问，刷新/关闭标签页由浏览器离开保护提示。尚无跨刷新本地草稿恢复。

「页面」是独立代码页面目录，本次只分离入口，不把它当可写文章类型。完整页面注册、暴露选项保存、启停和链接选择后续按 registered-pages.md 实现；目前不生成虚假页面或代码编辑器。

## 初始化与复现

后端目录执行（使用当前实际 config.toml，也可显式传 `--config`）：

```powershell
uv sync --frozen
uv run python init.database.py --no-create-database
uv run python -m tools.seed_content_drafts
uv run uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --no-proxy-headers
```

迁移 0009 增加工作草稿、完整修订、操作回执三张表，保留已有用户、公开内容与媒体。初始化不自动写入示例；seed 显式添加两篇文章和两则说说，重复执行不覆盖已改文字、不恢复被回收的示例。不要使用 WordPress 备份作为可写数据库。

前端在自身目录执行 `npm run dev`，通过已有配置直接请求 FastAPI。契约来自后端 content-admin 1.0.0，来源提交/摘要在 `src/generated/content-admin-source.json`。公开 public-v0.1 与 settings 1.6.0 不变。

## 扩展与目录

- 后端 `app/modules/content/type_registry.py`：可信类型注册，注册缺失不清库。
- `draft_schemas / draft_repository / draft_service / draft_router / draft_models`：私有 DTO、查询、事务、HTTP、持久层。只有模块 router_init 装配路由。
- `tools/export_content_admin_contract.py`：从权威注册与模型生成契约、操作和类型描述。先提交契约，再在前端运行 `npm run contract:sync -- <backend>/contracts/content-admin-v1.schema.json`。
- 前端 `core/content-management`：注册元数据、请求生命周期、冲突/未知结果处理；主题 `admin/content`：列表、编辑器注册、预览和确认；路由仅装配。
- 新类型复用后端用例及前端列表。新编辑器在主题 `content/editor-registry.tsx` 注册可信组件，键与后端描述对应；无法匹配时关闭编辑能力，不通过字符串加载远端代码。
- 普通 Modal 增加可选 closing/onExited，确认完毕再触发编辑窗口退场；共享 ConfirmDialog、动效/减少动态、图标与封装输入继续复用。

## 数据与下一步

本期工作草稿与公开发布内容分离，没有修改公开内容和快照。正式发布时要实现发布事务、访问策略、索引、可靠事件、节点应用与撤回墓碑，再让前台读取新内容；不得将草稿直接写入已有公开快照。

正文是带稳定 UUID 的有序 JSONB 块，当前编辑器只支持 Markdown。完整混合块编辑器、Y.Doc 协同和媒体插入器尚未实现；后续必须沿用本期草稿身份与事务边界。当前没有借此完成历史文章导入/正式迁移。
