# ADR 0024：基本设置的保存、节点投递与应用

日期：2026-11-01。状态：**用户同意方案后实施，首批已验证**。本决定承接 ADR 0023，明确已实现范围；原始 v2.11/v0.14 不变。

## 决定与权威来源

- 站点/主题业务设置继续存于 PostgreSQL `site_settings.data`，沿用 `source_epoch/generation`；不新增第二个站点事实源。首期仅当前 Argon 主题的类型化设置，多个 theme_id/插件命名空间尚未实施。
- 节点可编辑策略存于 `frontend_node_policies`。本期只有已经接入动态请求的四项：刷新间隔、单次超时、一次重试间隔、浏览量批处理窗口。公开快照没有 TTL；页面当前按请求读取本地快照，没有伪造可配置的 Next.js 页面缓存过期功能。
- 部署身份、IP 白名单、连接地址、凭据引用、磁盘目录与存储实现仍来自本机服务端 TOML/环境变量。浏览器直接调用 FastAPI 的 `/v1/admin/*`；不让 Next.js BFF 成为第二套业务保存路径。
- 后端 `contracts/settings-v1.schema.json` 是 settings-1 的发布契约；前端从指定提交生成类型、校验器与客户端。本期来源提交 `a4237da`。增量更新字段时应重新发布契约并更新来源摘要。

## 保存与可靠交付

1. API 在同一数据库会话中校验真实管理员会话与写操作 CSRF/精确 Origin，按 `expected_revision` 加行锁；过期版本返回 HTTP 409，避免后保存覆盖他人修改。
2. 业务值、版本、审计和各目标节点的完整投递意图在同一事务提交。请求不等待外部网络，也不因节点离线丢失设置。
3. 单独运行的 Scheduler 持 Redis 带所有权的租约，只投递 tick；Celery Worker 领取 PostgreSQL 带租约的事件。外部 HTTP 在事务外，确认时必须仍拥有该事件租约。共享队列配置独立放在 `app/core/task_queue.py`，Scheduler 不从 Worker 导入对象，也不加载业务投递模块。没有 Celery Beat，Worker/Scheduler 不装配 API 模块。
4. 专用 Node 接收器按真实 socket 来源 IP **AND** Bearer token 鉴权，忽略转发头，不使用 Next Route Handler 猜来源。它校验协议、固定节点 ID、部署绑定的 source_epoch、资源类型/字段与完整版本；服务端凭据不进入浏览器、数据库事件、URL 或日志。
5. 内置 `FileSettingsStore` 先写临时文件并 flush，再通过原子硬链接发布不可变版本文件。最高完整版本是下一次读取的有效值；同版本相同内容幂等，不同内容拒绝；乱序不倒退；残留 staging 不参与读取；最新已发布文件损坏时失败关闭，不回退旧版本。
6. 接收器完成落盘后返回绑定节点/epoch/资源/版本/请求摘要的确认，Worker 才记录已应用。后台区分数据库已保存、等待同步、已应用、待重试和未配置接收；此状态是最后一次确认，不是实时节点健康心跳。
7. 重新同步会重发当前站点/策略版本，撤销旧投递租约，不递增业务版本；即使以前确认过，也可修复该节点后来丢失的副本。旧发送进程不能确认新租约。

接收设置副本与公开内容 `current.json` 是两个独立资源。读取公开页面时仅覆盖公开站点投影，不回写旧快照或数据库。本文不是完整文章发布、撤回、分布式 Next 缓存或全量补偿协议的交付声明；已有 `cache_receiver=false` 仍指未交付的完整内容接收能力。

## 前端架构与体验

- 页面通过既有可信管理菜单注册；路由在 `src/app`，请求/草稿在 `core/settings`，Node 存储和接收在 `server/settings`，展示在 `themes/argon/admin/settings`。页面控件使用项目封装，箭头使用图标。
- 顶栏/侧栏/移动菜单读取一棵明确配置的菜单树，当前支持两级。已配置空菜单就显示空，不再补回主题参考菜单。当前本机的原六个一级/七个二级入口已在启用新投影前保存，未修改 WordPress。
- `SettingsStore` 是实际使用的存储适配边界；核心校验/权限/版本语义不交给可关闭的插件。通用组件、编辑器、插件设置 Schema 和运行时加载器仍为设计。
- 共享设置 layout 保留站点/主题页之间的未保存草稿。移除后台父容器按路径重建整个子树的 key，使用新路由区块自身入场动画，避免动效清空表单。离开整个设置区不会持久保留草稿；浏览器卸载时提示未保存修改。
- 主题后台发布的是访客默认值；已有本地个人配色/模式/视频播放偏好继续优先。已打开阅读页不强制刷新，下一次完整页面访问/重新读取路由数据获取新配置。

## 依赖、限制与验证

- Celery 5.6.3 与 Kombu 5.6.2 的 Redis extra 要求 redis-py <6.5，锁定 Redis 客户端 6.4.0；原本 8.1.0 与该组合不相容。httpx2 2.16.0 用于真实投递，tsx 保留为接收器运行依赖。依赖清单与锁文件一起提交。
- 本机 Windows 使用 Celery solo 验证开发链路；不据此承诺 Windows 生产多进程 Worker、掉电持久性或跨文件系统/对象存储的原子性。生产适配器和服务守护需要单独验证。
- 没有自动目录回收/磁盘配额实现，没有节点心跳与文件丢失自动发现，没有全站浏览器热推送。完整版本历史暂保留；部署须备份目录并限制磁盘，不能直接删 `.next` 修复一致性。
- 实际数据库/多进程/生产 HTTP/浏览器范围见 [验证记录](../handoff/settings-verification.md)，运行方式见 [操作指南](../development/settings.md)。

官方兼容依据：Kombu `v5.6.2/requirements/extras/redis.txt`（GitHub celery/kombu）、Celery stable introduction。Next.js 行为核对当前安装 16.4.3 的 `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/` 与 self-hosting 指南；不依据旧版默认缓存语义。
