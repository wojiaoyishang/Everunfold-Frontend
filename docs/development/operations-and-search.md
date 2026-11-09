# 评论运营与搜索发现

版本：operations-search-3，2026-11-09。对应 ADR0088 第一批及评论界面、加载后定位补充交付。

## 使用入口

- 后台工作台读取真实待办：待审核评论、未发布草稿、定时发布、发布失败、译文待核对、最新节点投递失败，以及最近编辑和排期。
- 后台「评论管理」默认选择「全部」（查询 status 为 null），提供搜索、按状态筛选、分页、单条/批量通过审核、撤回审核、拒绝、垃圾评论、回收与恢复，支持编辑正文和管理员回复。新评论先待审核；通过审核后随公开快照同步显示。
- 站点设置保留原 SEO 标题模板、描述和全站允许收录开关，新增「站点地图与订阅」「分享与结构化数据」。设置保存并同步后生效。
- 文章和说说的 SEO 面板新增单篇允许收录开关；页面沿用原有 allow_indexing。关闭单篇收录不改变访问权限，也不删除正文。

## 评论界面与原文跳转

评论列表明确展示所属文章、说说或页面的类型、标题和当前公开路径。标题及「查看原文」均在新标签页打开；已通过评论使用 `#comment-<id>`，由既有评论组件查找对应分页并定位，其余状态使用 `#comments`，不为不可见评论伪造位置。后端没有提供公开路径时保留类型和标题，显示「原文未公开或已停用」，不生成跳转按钮。地址消费现有 `ModerationItem.content_path`，不由前端拼接标题或推断路由；改址后刷新列表读取最新地址。

类型和标题使用相同字号与行高，图标在类型行内居中；长标题换行时仍与类型的第一行对齐。该排布同时覆盖文章、说说和页面，不靠逐项偏移修正。

前台评论定位先等对应分页挂载，再等文档加载、正在使用的字体、目标上方图片及标记为加载中的插件/页面 iframe 完成，位置持续稳定300ms后重新计算滚动目标。目标上方尚未加载的懒加载图片会提前加载；不下载无关字体，不等待统计请求或长连接。自定义页面通过原有沙箱桥接报告 load 与字体就绪，不改变实时预览的首帧回执。滚动到达后才聚焦并高亮评论，减少动态时直接定位。

等待或滚动期间主动操作、离开页面、卸载目标或发起新定位会取消旧请求，避免迟到结果把页面拉回。等待最多15秒，超时不强行跳转，可再次点击评论入口。浏览器自身的原生片段跳转不在此拦截；上述规则控制应用的最终定位。插件内部未来的任意定时任务不等于页面加载；需要延后定位的异步组件可在布局影响区域保留 `data-anchor-pending="true"`，完成或失败后移除。沙箱内部的任意脚本任务及其后续懒加载不承诺全部提前完成。

编辑和回复窗口采用上方标签、下方完整输入框；显示作者、原文类型/标题，回复额外展示被回复内容。字数提示和等待状态可见，空白内容不可提交；冲突时保留输入，取消后清除该窗口的失败提示并回到触发按钮。列表查询失败后仍可刷新。

审核/恢复用绿色，编辑/回复用主题色，标记垃圾用警示色，回收/拒绝用红色；图标和文字同时保留，不只凭颜色辨识动作。确认窗口显示实际动作名称、图标与语义色，处理中用单个加载图标替换操作图标。窄屏保留可读的箭头分页名称，页码不换行，触控按钮保留44px高度。

开发时复用 `admin/components/action-button.tsx` 的 `AdminActionButton`、共享 `FormField` 和 `TextArea`；不要使用只在文章编辑器作用域内生效的表单类。`ConfirmDialog` 的 `confirmIcon` 及 `positive/warning` 意图均为可选，既有调用默认行为保持。目标信息集中在 `admin/comments/comment-target.tsx`，主题组件只消费权威契约字段，不承担审核或发布判断。样式仍隔离于后台，颜色来自统一主题变量。见[视觉与交互验收](../handoff/comment-ui-verification.md)。

## 评论边界

读取使用 comments:read，修改使用 comments:moderate，均为全站范围。管理员拥有全部权限，普通账户和已有 API Key 不自动增权；需要在用户授权与 Key 权限中显式添加。浏览器仍使用当前 Session、精确 Origin 与 CSRF；API Key 遵循所属用户的权限交集、应用范围和撤销围栏。后台工作台当前仅供浏览器会话使用。

| 接口 | 用途 |
| --- | --- |
| POST /v1/admin/comments/query | status/search/content_id/page/page_size 查询，最多每页100条 |
| POST /v1/admin/comments/moderate | operation_id、action、items[{id,revision}]，每批1至100条 |
| POST /v1/admin/comments/edit | operation_id、id、revision、body |
| POST /v1/admin/comments/reply | 同编辑参数；仅回复当前已通过审核的评论 |
| GET /v1/admin/workspace | 只返回当前用户可见的数量和内容标题 |

修改先核对整批 revision，任一过期返回409且整批回滚；重试使用原 operation_id。状态、审计、操作回执和公开快照 Outbox 在同一个事务提交，前端不把HTTP成功误当成所有节点已应用。回收保留 previous_status，恢复回收前的审核状态。编辑/恢复不会绕过原文可见性。父评论不可见时，可见回复作为顶层显示，不输出隐藏父正文。

Comment 以 content_id/page_id 二选一关联原文。历史评论保持身份；0029_comments 将已有读者提交回执补入审核目录，保留原 ID、正文、作者、时间与合法父子关系。文章、说说和页面共用审核和点赞，当前公开页面提供评论区；验证码页面解锁后的评论交互尚未补齐。

数据库升级必须显式执行 `.venv/bin/alembic -c migrations/alembic.ini upgrade head`，启动不自动迁移。降级遇到页面评论或新审核状态会拒绝，需先导出并处理，不能静默丢弃。

## 站点地图、订阅与元数据

| 设置或入口 | 行为 |
| --- | --- |
| site.allow_indexing | 全站关闭时输出 noindex, follow 和相应 X-Robots-Tag；地图为空、订阅404 |
| site.discovery.sitemap_enabled | 默认开启；/sitemap.xml 包含语言首页、文章、说说和有可用实现的启用页面 |
| site.discovery.feeds_enabled | 默认开启；/feed.xml 为 RSS 2.0，/atom.xml 为 Atom |
| site.discovery.feed_limit | 默认30，允许1至100；按发布时间倒序输出标题、摘要、原文链接 |
| language 查询参数 | 例如 /feed.xml?language=en；使用配置中的语言代码，无效或禁用语言返回404 |
| site.discovery.structured_data | 默认开启；可收录文章输出 BlogPosting，说说输出 CreativeWork JSON-LD |
| site.discovery.share_image | 默认分享图；文章优先使用自身封面，页面使用站点默认图 |
| google_verification / bing_verification | 只填站长验证标签的 content 值，禁止整段HTML；输出标准meta标签 |

发现入口只读取已应用的公开快照，不查询草稿，不解锁受保护内容。验证码/密码/未列出内容、撤回内容、禁止收录的内容及不可用插件页面不会被列入。hreflang 仅引用真实可收录的语言版本。文章 lastmod 来自实际内容更新时间；管理页面没有可信更新时间时省略 lastmod。RSS/Atom 使用稳定内容ID，XML及JSON-LD按上下文转义。

canonical、站点地图和分享地址使用前端服务端部署配置 publicSiteUrl 对应的公开站点地址，不使用任意请求 Host。缺少该配置时不伪造正式域名。后台、登录、账号与内部地址由 robots.txt 排除；全站禁止收录时仍允许爬虫读取 noindex，robots.txt 本身不承担权限控制。每个页面保留 RSS/Atom 自动发现链接，避免子页面 alternates 覆盖布局而丢失订阅入口。

没有自动向搜索引擎提交站点地图或验证网站所有权。配置后在搜索引擎站长平台提交 /sitemap.xml；收录/展示由搜索引擎决定。本轮不引入排名分数、虚构统计、重定向历史或关键词堆砌。当前是单份站点地图，大体量站点的拆分索引与压力验收另行推进。

## 开发位置与发布

- 后端 app/modules/comments 负责审核与工作台，通过已有 content.router_init(ctx) 装配。权限、迁移、事务与公开投影属于宿主。
- 前端 src/core/operations 负责请求；管理主题在 src/themes/argon/admin/comments 和 admin/pages/overview.tsx 展示。搜索发现规则位于 src/core/seo，与主题样式无关。
- operations 1.0.0、settings 1.17.0、content-admin 1.15.0、content-access 1.4.0、collaboration 2.4.0、presentation 0.2.0-preview.3、public 0.11.0。前端 contracts.lock.json 固定后端6f39606及SHA，生成物仍只写忽略的var/cache。
- 部署次序：显式迁移，更新/重启API与Worker，更新前端接收器及主体；旧接收器仍加载旧契约时可能拒绝新公开设置，升级后通过既有同步重试恢复。业务写入不回滚为旧快照。

后续批次：内容多维筛选/快速编辑/批量操作与分类标签管理；隔离迁移/恢复演练；邮件验证、找回密码、通知和真实阅读统计。上述尚未由本轮交付，不因 ADR 路线图存在而视为已实现。

官方参考：[Next.js JSON-LD](https://nextjs.org/docs/app/guides/json-ld)、[Google 站点地图](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)、[网站所有权验证](https://support.google.com/webmasters/answer/9012289/)。
