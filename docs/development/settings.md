# 基本设置运行指南

版本：settings-runtime-16，2026-11-10。实现决定见 [ADR0024](../decisions/0024-versioned-settings-delivery.md)、[ADR0066](../decisions/0066-configurable-languages-and-grouped-translations.md)、[ADR0099](../decisions/0099-article-scoped-glossary-tooltips.md)、[ADR0100](../decisions/0100-theme-owned-settings-profiles.md)与[ADR0105](../decisions/0105-admin-navigation-and-glossary-media.md)。本地前端 3000、API 8001、内部设置接收器 3001；旧 WordPress 仅作参考。

## 使用入口

管理员登录后在侧栏「设置」进入：

| 页面                      | 已实现                                                                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/settings`         | 站点名称/简介/作者/作者格言/头像/公告；版权与结构化页脚链接；术语自动匹配、提示数和内容来源；语言目录/默认语言/标志/前缀/界面回退；递归导航结构树/父级调整/排序/删除；SEO 描述、标题模板、允许索引 |
| `/admin/icons`            | 全部内置图标、上传图标搜索/分页与安全上传；菜单选择器复用                                                                                                                                          |
| `/admin/media`            | 图片/视频网格/列表、上传、类型与标题/文件名搜索；独立详情、元数据保存、图片编辑另存；表单仍直接选取                                                                                                |
| `/admin/settings/theme`   | 公共宿主保留已安装主题切换；具体设置由当前主题目录的 `theme-settings.tsx` 动态提供。Argon 包含外观/横幅/字体/首页/文章显示/代码/背景，Paper 包含自己的纸张底色；不同主题分别保存                   |
| `/admin/settings/captcha` | 本地图片/Google/Turnstile、登录与阅读/评论全局规则、API Key明确授权豁免和阅读侧请求限额；单篇覆盖见各编辑器                                                                                        |
| `/admin/settings/system`  | 按稳定节点 ID 保存动态请求刷新间隔、超时、重试间隔、批处理窗口；查看期望/确认版本、重新同步；部署来源脱敏展示                                                                                      |

settings契约1.25.0新增`theme_options`、文章显示/首页默认值/代码与背景的主题 profile、`site.footer`、`site.author_tagline`和`site.glossary`，沿用PATCH /v1/admin/settings及expected_revision，不新建前端配置数据库；旧设置JSON在读取时补默认值，文章内容和术语匹配结果不进入设置或正文快照。顶层`theme`是活动主题的兼容投影，权威分主题值在`theme_options[themeId]`。主题表单见[主题设置指南](theme-settings.md)，代码字体继续只保存媒体ID，font_url/font_info由后端解析，拒绝无效字体且禁止伪造派生URL。参数和加载规则见[代码指南](code-blocks.md)。

现导航菜单也归主题 profile：`theme_options[themeId].navigation` 是当前主题的独立菜单；`site.navigation` 仅为旧数据兼容回退。外观分组中的“导航菜单”页面编辑当前主题，保存空数组也会作为明确选择保留，不退回到旧导航。后台“设置”组直接列出站点、验证码、邮件、应用接入、插件、运行和系统设置，不再使用二级抽屉；媒体/图标/字体归资源，术语和短代码归内容工具。

语言分区支持默认语言和中文前缀修改；标志小按钮打开可搜索国旗/自定义标志弹窗，“添加语言”分备选和自定义。只有默认语言可留空前缀，更换默认值不批量修改已有文章地址。已有本语言程序包显示“本语言界面”，只有缺包项选择界面回退。被内容使用的语言不可删除，可禁用；新增语言不自动翻译正文。完整约束见[多语言指南](../architecture/multilingual-content.md)，更改后仍需点击“保存更改”并等待节点确认。

头像/背景图片/背景视频均可从媒体库上传或选择，也可手填地址。小缩略图与输入框同行，点击查看大图/视频；选择后按稳定媒体 ID保存，服务端派生地址，手动改地址会解除关联。见 [媒体指南](media-library.md) 和 [菜单与图标指南](menu-icons.md)。公告分为可选标题和内容（原 notice 字段），保存并同步后显示在首页内容列表上方。无标题时显示内容；超过一行或标题下有正文时可点击「展开更多」原位展开，保留动画并可收起。两项都清空隐藏公告，当前不使用首次弹窗或导航栏公告入口。讨论/注册/邮件/媒体提供器及高级 SEO 尚未实现；正式站点地址仍由 `PUBLIC_SITE_URL` 部署配置确定。标题模板保留一个 `%s` 文章标题，可用 `%site%` 站点名；不允许索引生成页面 robots noindex，后台始终 private/no-store/noindex。

一般“保存更改”把整份站点与主题草稿作为一个版本提交。已安装主题先通过卡片/列表打开详情，右下角启用按钮只保存主题选择，并保留其他未保存输入；可从实例默认的详情中恢复部署默认。提交成功后节点状态可能仍是等待同步，收到落盘确认才显示已应用。若提示版本冲突，当前草稿仍在；先保留你的修改，再使用明确标注的「放弃本地修改并载入服务器版本」合并。写请求不自动重试，未知结果先读取核对。节点策略按节点单独保存，切换选择不会覆盖该页其它节点草稿。

验证码使用独立的私有配置和修订，不把 Secret 放到普通站点设置或公开快照。首次规则全部关闭；机器调用豁免还须在Key创建时授予对应权限。见[验证码指南](captcha.md)。

## 保存与读取端点

全部浏览器管理请求直达配置的 FastAPI，使用已有 HttpOnly 会话；写请求附 `X-CSRF-Token`，不在 URL 传凭据。

| 方法与路径                                                  | 作用                                                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GET/PATCH `/v1/admin/captcha`                               | 独立验证码修订、提供方与写入式密钥、用途规则、API Key策略，见[指南](captcha.md)                                       |
| GET `/v1/admin/settings`                                    | 当前站点/主题值、source_epoch、revision、节点状态                                                                     |
| PATCH `/v1/admin/settings`                                  | `{expected_revision, value: {site, theme, theme_options}}` 保存整份配置；活动主题投影由后端按 `extensions.theme` 重算 |
| GET `/v1/admin/frontend-nodes`                              | 已配置的节点、各自策略与状态                                                                                          |
| GET/PATCH `/v1/admin/frontend-nodes/{node_id}/cache-policy` | 读取/以 expected_revision 保存该节点策略                                                                              |
| POST `/v1/admin/frontend-nodes/{node_id}/sync`              | 重发当前版本；若派生媒体 URL 变化则发布新的公共设置修订                                                               |

公开响应保持 success/code/msg/data 和真实状态码。401/403 表示身份/权限/CSRF，409 表示修订冲突，422 表示字段无效。完整字段/约束以当前settings1.25.0生成契约为准；被内容使用的语言移除为42292，导航路径冲突为42294。公共value包含site、活动 theme、theme_options 与后端派生的icon_urls；客户端映射不作为保存事实源。Node内部接收路径为 `POST /internal/settings/apply`，不供浏览器使用。

## 初次启动与配置

1. 后端执行 `uv sync --locked`，再显式执行 `uv run python init.database.py`。已有数据库可加 `--no-create-database`。迁移 `0004_settings` 建立节点策略、审计、投递表，`0005_icon_media` 增加媒体原件记录，`0006_media_details` 增加附件资料与编辑来源，`0007_media_library` / `0008_media_safe_delete` 增加上传复用及安全删除回执；仅为空站点插入初值，不重置现有账号/文章。API 启动不做迁移。
2. 后端 `config.toml` 的 `[frontends.web-main]` 设置 `enabled=true`、`settings_receiver_url="http://127.0.0.1:3001"`；两个方向的 token 仍只填写环境变量名称。非回环地址必须 HTTPS。
3. 前端 `config.toml` 增加 `[settings]`：`directory="./var/settings"`、`receiver_host="127.0.0.1"`、`receiver_port=3001`、`source_epoch="实际后端 UUID"`。从已鉴权 GET 设置响应的 `data.source_epoch` 或 SQL `SELECT source_epoch FROM site_settings WHERE id=1` 获取，不从未经认证请求自动认领 epoch。
4. 前端 `[backend]` 配置允许的真实 peer IP/CIDR、FastAPI → Next.js token 环境变量名称，与后端目标节点一致。接收器不信任 X-Forwarded-For；TLS/反代部署须重新评估真实连接来源边界。
5. 继续正常启动 API 和 Next.js。本机开发可在后端项目额外运行：

```powershell
uv run python -m tools.run_settings_dev --frontend-root E:/Programming/Node/Everunfold-Frontend
```

此辅助程序启动三个独立子进程：Node 接收器、Celery solo Worker、自研 Scheduler。Ctrl+C 只停止它启动的子进程，不停止 3000/8001；仅适用于单个已启用节点的本机联调。它为两个发送/接收进程提供同一份随机凭据，保存在被忽略的 `var/settings-dev-secrets.json`，不输出、不提交；不是生产密钥管理器。不要重复启动第二套相同 namespace 的 Scheduler。

独立部署的入口分别是：前端 `npm run settings:receiver`；后端 `uv run celery -A app.entrypoints.worker:celery_app worker` 和 `uv run python -m app.entrypoints.scheduler`。凭据由各服务的运行环境注入；进程监督、TLS、生产 Worker pool/权限和磁盘策略另行部署验证。Scheduler 不需要发送密钥，只有真正投递的 Worker 读取凭据。

修改实际 TOML/环境变量后需重启相应 API/接收器/Worker/Scheduler；后台保存业务设置无需重启。完成部署后在系统页点当前节点「重新同步」，确认站点和策略均已应用。只保存数据库而未运行接收/Worker/Scheduler 时，前台会继续保留原已应用版本，不能把「已保存」当所有节点已更新。

## 副本结构与恢复

```text
settings.directory/
  <node-id>/<source-epoch>/
    public-settings.<revision>.json
    cache-policy.<revision>.json
    .*.staging   # 未完成写入不可见
```

内容分发现按 ADR 0031 使用 `cache.directory/managed.json` 与 `releases/{node}/{epoch}`；接收第一份受管 release 之前才兼容读取 `current.json`，之后禁止回退。设置与内容复用同一监听器/投递基础设施，但版本与文件目录独立。所有路径在服务器解析，相对路径相对前端配置根；浏览器不接收实际文件路径或服务端凭据。

- 后端离线、有公开快照/设置：直接使用本地完整版本，无定时过期，正文/菜单/SEO 仍可输出；动态请求按既有渐进失败行为隐藏失败字段。
- 无公开快照：公开页面为可恢复 503，不能拿空配置伪装正常；登录/后台壳可打开，身份校验失败会提示连接异常。
- 最新设置文件损坏：失败关闭，禁止悄悄回退旧设置；修复文件或使用正确版本重新配置节点。对于完整丢失的副本，系统页「重新同步」可以重发当前已确认版本。没有自动损坏修复/文件巡检。
- 网络失败：Worker 有界重试，后台可手动重新同步；未知发送结果可以幂等重发。同版本不同内容不覆盖。
- 数据库还原：必须维护 source_epoch 变更流程，分别调整节点绑定并重新发布，不能把新库旧版本当原库更高版本接受。
- 新菜单已设置但仍见旧页面：检查节点状态后发起一次新的页面访问。现阶段不强制刷新已打开标签，也没有跨节点框架派生缓存失效器。
- 已有访客颜色没有随后台改变：个人阅读偏好优先，这是预期行为；用无个人偏好的浏览器验证站点默认值。

## 检查命令

后端执行 Ruff、mypy、pytest；真实数据库/多进程用例需 `RUN_DATABASE_TESTS=1`，并有显式 `config.test.local.toml` 指向 `everunfold_test`、PostgreSQL/Redis 和配套前端依赖。该用例创建/销毁自己命名的临时数据库，两个 API、独立 Worker/Scheduler、Node 接收器互相验证，不访问原 WordPress。

前端 `npm run check` 与 `npm run verify:admin`。后者在临时复制目录构建真实生产 Next，验证匿名后台壳、后端不可用/无缓存、有完整设置副本、SEO 与损坏版本行为；不会替换运行中的 `.next`。结果见 [验证记录](../handoff/settings-verification.md)。

## 桌面分区导航（2026-11-05）

站点、主题、系统三个设置页在1200px及以上提供右侧“快速导航”，点击跳到相应分区，滚动时高亮当前项。目录按页面实际分区生成；主题包含代码块。较窄屏幕隐藏目录，保留原表单。保存/撤销栏位于左侧正文列，目录不会遮挡设置。

链接使用稳定hash，可复制带分区的地址、刷新及前进后退，键盘Enter可定位并把焦点移到目标。导航不会保存设置或清空未保存输入；离开页面继续沿原有修改保护。新增分区需在SettingsSection提供唯一且稳定的id。具体展示、顶栏留白和页底短分区处理见[ADR0064](../decisions/0064-desktop-settings-section-navigation.md)，实页范围见[验收](../handoff/settings-section-navigation-verification.md)。

## 按内容关联菜单

菜单编辑的“链接类型”可选手动链接、关联文章、关联说说、关联页面。资源选择器支持搜索与翻页，只显示已发布文章/说说和已启用页面；选择后显示当前关联标题与应用路径，也可重新选择。修改设置仍需点击保存，可撤销未保存的选择。

关联保存资源类型与稳定ID，链接随目标发布/应用后的路径变化。当前阅读语言有同组公开版本时优先使用该版本，否则使用关联项；注册页面使用实现显式声明的语言路由。目标未发布、停用、撤回、转私有或回收后隐藏该菜单及其子树，不能回退到旧URL。手动链接不自动跟随。

后端`POST /v1/admin/settings/navigation-resources`要求`settings:read`，浏览器仍检查精确Origin/CSRF。请求含kind、可选id、search、page、page_size，返回最小ID/标题/当前公开路径/语言，不返回草稿、正文或内部元数据。允许管理员和被明确授予读取设置能力的调用方选择已公开资源；此接口不授予页面或内容写入权限。

## 后端插件目录

插件管理合并已登记前端包与后端单入口插件，展示来源、版本和作者，使用同一extensions.disabled_plugins保存启停偏好。后端目录由部署命令写入私有_backend_plugins，不能由浏览器设置修改；PublicSettings.shortcodes仅投影启用的代码模板及用户已应用模板。普通设置保存由服务端按开关重算目录，拒绝伪造代码模板。

后端代码与登记目录不一致时显示部署提示；重新启用需先完成同步，依赖须同时满足。验证码提供方也纳入引用提示和实际服务端启停守卫。操作流程和开发接口见[后端插件](backend-plugins.md)，实际验收见[本轮记录](../handoff/backend-plugins-verification.md)。

## 页脚、作者格言与术语提示（2026-11-10）

站点设置新增版权说明、最多 8 个有稳定 ID 的页脚链接和作者格言。链接只接受站内/HTTP(S) 安全地址，空名称或空地址在后端校验时拒绝；页脚不执行自定义 HTML。作者格言留空时沿用站点简介，页脚版权留空时使用“© 年份 作者 · 站点名称”。

“术语提示”只控制正文中的提示行为：自动匹配开关、每页最多提示数（1 至 100）和弹层内容来源（简短提示或完整词条说明）。词条本身在 `/admin/glossary` 维护，文章接口只返回实际命中的已发布词条；未命中文章返回空数组。正文仍是原缓存，空闲后才按内容 ID 和修订加载，详见[术语表指南](glossary.md)。

## 搜索发现设置（2026-11-09）

settings 1.17.0新增site.discovery：站点地图、RSS/Atom、条数、分享图、JSON-LD与Google/Bing站长验证。站点设置新增两组表单及快速导航；全站关闭收录时地图为空、订阅404，同时页面输出noindex, follow。文章/说说新增单篇allow_indexing，页面沿用原值。配置使用原revision保存、审计和可靠投递；升级前端接收器契约后再同步。具体字段、默认值和边界见[运营与搜索指南](operations-and-search.md)。
