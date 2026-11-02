# 文章与说说管理

版本：content-management-4，2026-11-02。当前：注册式独立文章/说说、多块编辑、属性、发布同步、密码访问与定时开放。依据为 ADR 0030–0035；[本次验收](../handoff/editor-workspace-verification.md) 记录实际检查与限制。

## 数据范围

功能测试只使用新后台创建并发布的内容。旧 WordPress 78篇文章/9个页面已撤回，原行/媒体/评论保留；不恢复或重新导入来填充界面。本期保留原有两篇文章、两则说说，以及新建「编辑功能验证」「密码保护阅读验证」供联调，均由后端产生，前端没有硬编码内容。示例数量随管理操作变化。

显式开发工具 `uv run python -m tools.withdraw_wordpress_preview` 默认预检，`--apply` 才撤回；只接受本机开发/专用测试库，业务、审计、release和Outbox同事务，重复执行不升版。恢复历史内容需用户明确调整范围，不手工删除快照或过滤前端。

## 编辑与发布

入口 `/admin/content/article`、`/admin/content/shuoshuo` 分别管理注册类型。新建 `/admin/content/{type}/new`，编辑 `/admin/content/{type}/{id}/edit`，不使用弹窗。代码页面目录独立，不提供在线代码编辑。

1. 右上操作区提供保存/发布/查看前台；标题及固定链接位于正文上方。首次保存生成根级 `/{标题别名}.html`，无 posts 前缀；同名加序号，无标题说说使用稳定 ID。保存后修改标题不自动改址，点「编辑」手改路径；系统保留路径/占用路径拒绝。改址不创建历史重定向。
2. 正文可添加多个 Markdown/HTML 文本块，稳定 ID，支持排序、删除确认、安全预览和共享媒体库插入；完整富文本工具以后细化。正文媒体存 `site://media/{id}`，不用磁盘路径；封面选择稳定媒体 ID。
3. 右侧属性包含显示时间、置顶、可见性、定时开放、封面、分类、标签、评论和 SEO。窄屏切换「正文 / 内容设置」。显示时间使用日历/时分控件；留空保留原时间，新的内容使用发布时间，未来显示时间拒绝（不等同定时发布）。界面按浏览器本地时区选择，提交带时区 UTC。
4. 分类为勾选树，可切所有/最多使用，新增分类可选父级，成功后自动选中。名称在同类型内唯一，暂不移动已有分类或建立同名不同分支。标签支持逗号分隔、移除和展开常用标签云，字号来自新系统已发布内容的实际关联数，不伪造热度。
5. 「保存草稿」只保存工作版本；「发布 / 更新发布」使用当前输入更新公开投影。正文、属性、索引、审计、不可变 release 和 Outbox 同事务。已发布后保存的新修改只进入工作稿，前台保留上一发布版本；列表标记有未发布修改。
6. 「前台内容已同步」仅表示配置节点最后一次持久 ACK；「重新同步」可以重发最高版本。已打开的其他浏览器标签需要刷新或重新导航，没有主动广播全端刷新。
7. 「撤回」在同步后返回404；垃圾桶移入可恢复回收站并撤回已发布内容，恢复仍是草稿，需要再次发布。列表支持筛选、搜索和分页，预览为纯文本而非 HTML/Markdown 源码。

保存失败保留输入；未知结果用固定操作 ID 重试，版本冲突保留本地修改并允许重读。离开弹窗、确认、保存和弹层继承统一动效。刷新/关闭使用浏览器离开保护；尚无跨刷新本地草稿恢复、全面历史后退拦截或协同。

## 密码与开放时间

可见性选择「密码保护」后设置文章密码，后续留空保留已有密码。密码以 Argon2 私有列保存，不返回原文、哈希或回执中的密码字段；审计修订不含秘密。

定时开放仅在密码保护下设置；开放之前可用密码提前阅读，到点按后端时间公开。访问策略即时判断，Worker 负责刷新派生快照；投递停止时前台仍可动态检查到点状态，公开 SSR 在进程恢复后更新。这不是定时发布草稿。

未解锁正文、摘要、媒体、封面、自定义 SEO 和正文统计不进入公开快照。阅读页 POST `/v1/reader/access`，private/no-store，校验精确 Origin、真实来源 IP 限流；成功正文只存在当前页面内存，刷新重新输入，没有长期授权 Cookie。公开静态文件仍可直接访问，文章密码不使文件本身保密。受限内容正式评论与浏览量待做，本期不发起未接通的私有指标请求。

## 启动与检查

新环境先显式初始化（当前 head 为0012_content_access），服务不自动迁移：

```powershell
uv sync --frozen
uv run python init.database.py --no-create-database
uv run uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --no-proxy-headers
```

另开终端运行投递辅助命令，Next3000可持续保留：

```powershell
uv run python -m tools.run_settings_dev --frontend-root E:\Programming\Node\Everunfold-Frontend
```

辅助命令运行独立 Node3001 接收器、Celery Worker 和 Scheduler，不替代 API/Next。配置沿用 frontends.<node>.settings_receiver_url 和稳定节点凭据；生产分别部署，浏览器不配置内部Token。详见设置指南。

后端端点包括：GET `/v1/admin/content/editor-options`；POST `/v1/admin/content/categories`、`create`、`detail`、`save`、`publish`、`withdraw`、`trash`、`restore`；读公开受限正文使用单独 reader/access，所有类型和客户端从契约生成，不复制字段定义。

后端完整检查仅使用专用测试库：

```powershell
uv run python init.database.py --config config.test.local.toml --no-create-database
$env:RUN_DATABASE_TESTS = '1'
uv run pytest -q --tb=short
```

前端 `npm run check`、`npm run verify:admin` 在临时副本生产验证，不覆盖正在使用的 `.next`。每完成一个可见组件立即在内置浏览器实测，见开发协议。

## 架构与剩余边界

content-admin1.4 的生成来源是后端提交 d31b359；public0.4/content-access1.0仍固定fe1a651；public历史文件名保留 public-v0.1.schema.json，接受0.1/0.2/0.3。settings1.6.0不变。0011增加工作/公开编辑属性，0012增加私有密码哈希、开放标记与分类父级，保留旧数据。

后端 draft_* 处理工作版本，editor_schema/editor_service/content_paths 隔离属性和路径，publication 负责公开投影，access_policy/access_router/timed_projection 处理读取和到点刷新。前端 core/content-management 管请求/状态，themes/argon/admin/content 管展示；标题、正文、分类、标签、属性独立，DateTimeField复用共享控件。媒体删除守卫覆盖当前草稿、修订与发布引用。

未实现完整富文本/拖拽/Y.Doc、历史导入、代码页面选项保存、定时发布、完整分类管理、受限互动和自动插入媒体替代文本/说明。完整快照8MiB，无增量、磁盘GC、心跳，最高版本损坏/已知撤回后不回退旧正文；不能把当前交付当完整生产缓存系统。

## 就地删除和前台编辑入口

块垃圾桶打开旁边的确认气泡，取消/点外/Escape不改变正文，确认退场后只移除当前草稿中的块；最后一块不可删除。数据库删除、撤回及放弃未保存仍为全局确认窗口。

前台文章/密码壳/说说详情在浏览器调用GET `/v1/admin/content/actions?id={UUID}` 后，如后端当前账户确有此内容编辑权，则渐显编辑链接。当前仅管理员具备编辑权，普通用户、匿名、未知目标或网络失败不显示；不使用演示身份，不写公开快照。重新回到标签页会复核，后台入口和写接口还会重新授权。
