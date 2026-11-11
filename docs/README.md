# Everunfold 文档入口

[自定义翻译字符串](development/translations.md)、[ADR0111](decisions/0111-sparse-custom-translation-overrides.md)：只读基础语言 JSON 保持不变，数据库只保存稀疏覆盖；前台/后台/API 消息通过统一中间层回退，并随可靠设置修订发布。入口位于“外观”，列表展示键名、原文和译文，详情保留可过滤列表并用共享代码编辑器维护译文。

[主题与插件特色图](decisions/0110-theme-and-plugin-preview-artwork.md)、[插件开发](development/frontend-plugins.md)：主题详情预览满宽等比居中，插件列表和详情均支持 `preview` 特色图；无图或加载失败时保留稳定占位。

[插件管理搜索](decisions/0109-plugin-settings-search.md)与[开发指南](development/frontend-plugins.md)：按插件 ID、名称、说明、版本、作者和贡献能力即时过滤，保留原启停与详情操作。

[术语媒体虚拟引用](handoff/glossary-media-reference-verification.md)、[ADR0108](decisions/0108-virtual-media-references.md)：媒体库绑定统一展示 `site://media/<UUID>`，选择后立即回显；手动虚拟地址可重新绑定 ID，普通 URL 与媒体引用分离。后台术语保持左侧目录、右侧编辑器并填满内容区，公开特色图布局不变。

[后台侧栏滚动恢复](decisions/0107-admin-sidebar-scroll-restoration.md)、[导航架构](architecture/admin-navigation.md)：桌面侧栏按账号和当前后台路径保存内部滚动位置，刷新后恢复；若当前菜单仍不可见再做最小幅度对齐，移动端抽屉保持原行为。

[系统设置归并与分组快速导航](handoff/system-settings-captcha-navigation-verification.md)、[开发指南](development/settings.md)及[ADR0106](decisions/0106-system-settings-captcha-and-grouped-navigation.md)：验证码并入系统设置，左侧不再显示独立入口，设置组按插件管理、站点、邮件、系统、运行与任务、应用接入排列；右侧目录支持一级分组与二级分区，旧验证码地址继续定位到对应锚点。验证码保存栏位于部署配置之后，仍使用独立修订和保存接口。

[术语富文本编辑与弹层验收](handoff/glossary-rich-editor-verification.md)：术语后台接入文章式区块编辑器，保存栏与系统设置统一；Tooltip 和公开详情复用文章的安全 Markdown/HTML、代码、公式、媒体与短代码渲染。

[登录验证码布局验收](handoff/login-captcha-verification.md)：登录页把图片与输入合并为一个同行、等高的双段验证控件，刷新期间保留原布局并显示真实加载状态；桌面、390px 和 320px 实页检查通过，评论验证码弹窗保持原布局。

[术语管理菜单可见性修复](handoff/admin-glossary-menu-verification.md)：`/admin/glossary` 补齐 `content:read` 权限映射，术语页不再被后台导航当作未注册页面过滤。

[术语管理后台视觉重构](handoff/glossary-admin-workspace-verification.md)：编辑区改用设置分组和共享表单控件，目录增加搜索、状态筛选、徽标与选中态；浅色、深色、桌面和 390px 已实页检查。

[术语表与文章级 Tooltip](development/glossary.md)、[ADR0099](decisions/0099-article-scoped-glossary-tooltips.md)、[ADR0101](decisions/0101-glossary-rules-and-reader-ui.md)：后端按文章可见正文匹配并只返回实际命中的已发布词条，未命中文章返回空数组；正文继续缓存，前端空闲懒加载术语组件，命中/空结果均按内容修订缓存 5 分钟。后台以文章式区块维护 Markdown/HTML 正文，别名独立于额外匹配规则；首级 Tooltip 显示摘要或第一个非空正文区块，并保留查看详情和词条页面入口。术语目录不再单独搜索，公开词条同时进入全局搜索。

[主题私有设置](development/theme-settings.md)、[ADR0100](decisions/0100-theme-owned-settings-profiles.md)：`/admin/settings/theme` 只负责主题切换和宿主，Argon、Paper 的表单分别位于各自主题目录；`theme_options` 为每个主题保存独立 profile，顶层 `theme` 保留活动主题兼容投影。站点级页脚、作者格言和术语提示仍在站点设置。

[后端插件 HTTP 路由](development/backend-plugin-routes.md)、[ADR0098](decisions/0098-backend-plugin-http-routes.md)及[验收](handoff/backend-plugin-routes-verification.md)：原生FastAPI路由、命名空间、Session/Key授权、请求事务和动态启停，以及独立OpenAPI导出。

[评论发送时验证与账号弹窗](decisions/0097-demand-comment-verification-and-account-dialogs.md)、[验证码指南](development/captcha.md)及[验收](handoff/comment-submit-verification.md)：发送后按需验证小窗、颜文字结果横幅、离线保留输入，以及账号共享确认和同步菜单退出。

[页面评论与插件 SDK](development/page-comments.md)、[ADR0096](decisions/0096-managed-page-comments-and-plugin-sdk.md)及[验收](handoff/page-comments-verification.md)：HTML/注册页面独立评论开关、通用组件/正文定位、自定义评论客户端，以及验证码阅读回执和预览隔离。

[Worker参数与触发按钮](handoff/worker-parameters-verification.md)、[任务开发](development/runtime-tasks.md)及[ADR0095](decisions/0095-typed-worker-invocation-parameters.md)：注册参数模型，表单/JSON填写，私有持久化并由Worker二次校验；同参复用、异参冲突，手动触发与刷新并排。

[后台标签词云与手动Worker测试](handoff/admin-cloud-manual-verification.md)：标签管理的最多100词密排、少词放大、旋转及搜索/列表切换，菜单背景统一；[任务指南](development/runtime-tasks.md)与[ADR0094](decisions/0094-manual-worker-dispatch.md)说明按已注册名称/函数手动入队并展开进度。

[统一任务进度与邮件诊断](development/task-progress.md)、[ADR0093](decisions/0093-unified-task-progress-and-smtp-transcripts.md)及[验收](handoff/task-progress-verification.md)：Worker/插件统一进度上报、游标长轮询、断线与刷新恢复；运行记录和邮件测试复用监控面板，SMTP命令/响应/MIME可查看，认证报文脱敏。

[设置导航与邮件测试](development/mail.md)、[ADR0092](decisions/0092-settings-hover-and-test-mail.md)及[验收](handoff/navigation-mail-verification.md)：主题独立、其余配置归类；桌面悬停与点击固定、手机手风琴。SMTP私有配置、必填标记和Worker测试发件已实现，保存不发送，未知结果不自动重发；通用通知仍按指南推进。

[Scheduler、Worker与运行管理](development/runtime-tasks.md)、[ADR0090](decisions/0090-scheduler-owned-residents-and-runtime-monitoring.md)及[验收](handoff/runtime-tasks-verification.md)：Scheduler统一指派常驻子进程，插件任务SDK、可靠执行与后台存活状态；同期完善插件来源/详情、标签词云和登录留白。

[内容运营与拖拽上传](development/content-operations.md)、[ADR0089](decisions/0089-content-management-workflows.md)及[验收](handoff/content-operations-verification.md)：列表精确筛选/排序、协作快速编辑、原子批量操作、分类标签管理；统一拖放进入原上传队列，并补齐验证码页面解锁后的评论和点赞。

[评论管理、工作台与SEO](development/operations-and-search.md)、[ADR0088](decisions/0088-operations-workflows-and-search-discovery.md)及[验收](handoff/operations-search-verification.md)：正式评论审核/回复/回收与可靠投递、按权限裁剪的真实待办；全站/单篇收录、站点地图、RSS/Atom、canonical/hreflang、分享图/JSON-LD与站长验证。批量编辑已由 ADR0089 交付，通知邮件和迁移恢复演练仍留在后续。

[评论界面补充验收](handoff/comment-ui-verification.md)：修复编辑/回复窗口间距，统一操作图标和语义色；列表默认「全部」，所属文章/说说/页面的类型与标题对齐，支持新窗口查看原文。前台评论等待页面资源与布局稳定后定位，主动操作可取消；保留冲突输入与取消回焦。

[单入口后端插件SDK](development/backend-plugins.md)、[ADR0087](decisions/0087-single-entry-backend-plugins.md)与[验收](handoff/backend-plugins-verification.md)：只固定app/plugins/*/plugin.py，函数或类统一注册短代码、验证码与文案；示例卡片/标签、后台启停、显式部署与可靠目录投递。后端模板不再编译进前端主体，其他文件布局自由。

[验证码配置与插件](development/captcha.md)、[ADR0086](decisions/0086-captcha-providers-and-content-policies.md)与[验收](handoff/captcha-verification.md)：本地图片、Google/Turnstile、登录/阅读/评论全局规则和文章/说说/页面覆盖，后端一次性验证与受限投影，API Key独立豁免授权、每Key限流与撤销围栏。后端插件统一app/plugins，根目录旧占位已删除；评论提交为待审核。

[主题详情、卡片/列表与Paper](decisions/0084-theme-cards-metadata-and-settings-scroll.md)、[开发指南](development/child-themes.md)及[最新验收](handoff/theme-browser-paper-fonts-verification.md)：横向卡片/纵向列表、详情中启用并保留其他草稿；Paper按特色图形成纸白左文右栏、简约阅读工具，提供三篇业务示例。[主题/插件统一字体注册](development/font-registration.md)与[ADR0085](decisions/0085-shared-font-registration.md)提供共用声明、独立字体打包和按需引用。原平滑导航/元数据见[阶段验收](handoff/theme-cards-and-navigation-verification.md)，证书置底见[记录](handoff/honors-page-verification.md)。

[插件启停使用提示](decisions/0083-plugin-activation-usage-confirmation.md)及[验收](handoff/plugin-activation-usage-verification.md)：隐藏不可用插件的注册页，保存启停前检查已应用页面、已发布/定时正文引用，提醒后可继续；取消还原本批次开关，保留其他设置修改与原页面配置。

[我的荣誉注册页面](development/honors-page.md)、[ADR0082](decisions/0082-honors-registered-page-plugin.md)及[验收](handoff/honors-page-verification.md)：独立插件荣誉墙、筛选/时间线、媒体选图与证书弹窗，原页内容定向导入本实例业务配置。

[页面脚本执行位置](development/pages.md)、[ADR0081](decisions/0081-authored-page-script-position.md)及[验收](handoff/page-script-position-verification.md)：自定义页面可选Head或Body末尾，随草稿/应用保存，前台与两种预览保持一致。

[Paper精简主题](development/child-themes.md)、[ADR0080](decisions/0080-minimal-paper-starter-theme.md)及[验收](handoff/paper-starter-verification.md)：Paper仅保留主题声明和CSS，完整继承Argon，作为二次开发的起点。

[独立插件运行规范](architecture/frontend-plugin-runtime.md)、[插件/SDK开发指南](development/frontend-plugins.md)、[ADR0079](decisions/0079-runtime-plugin-packages-and-var-cache.md)与[验收](handoff/independent-plugins-verification.md)：var/cache统一派生产物；主题随主体构建后动态选择，插件独立打包、透明开发更新与部署后启停。

[父子主题规范](architecture/frontend-themes.md)、[子主题指南](development/child-themes.md)与[ADR0078](decisions/0078-parent-child-themes-and-public-hooks.md)：Argon作为默认父主题，子主题局部覆盖模板、组件、样式并使用前台钩子；具体实现验收见STATUS。

[定时发布与阅读进度](decisions/0073-scheduled-content-publication.md)、[操作指南](development/content-management.md)及[本轮验收](handoff/scheduled-publication-verification.md)：冻结排期版本、可靠Worker发布及取消，页面移除通用读取按钮、列表前台入口和铅笔、右下阅读进度填充。

[编辑操作组随滚动进入顶栏](handoff/editor-actions-dock-verification.md)：文章/说说保存与发布加入预览组，页面预览/保存合并并将返回列表左置；同步修复已有协作回执拥有者字段遗漏导致的保存误报。

[页面管理与独立实时预览](development/pages.md)、[架构与私有元数据](architecture/registered-pages.md)、[ADR0072](decisions/0072-managed-pages-and-people-messages.md)及[验收](handoff/pages-live-preview-verification.md)：自定义HTML/CSS/可选隔离JS、注册人物分组/寄语、页面私有元数据，以及页面/文章/说说共用的左编辑右预览、三设备视图、拖动分隔和顶部原保存控件。

[可配置用户身份预设](decisions/0071-user-permission-presets.md)、[操作指南](development/accounts.md)及[验收](handoff/user-presets-verification.md)：用户管理新增“身份预设”入口，初始编辑/审稿人可增删改，在用户创建/编辑时应用；变更模板不自动覆盖既有用户权限。头像限制密码标签统一为“当前管理员密码”。

[云端账号入口与头像就绪动效](decisions/0070-header-account-entry-and-avatar-readiness.md)及[实页验收](handoff/header-account-entry-verification.md)：账号中心移入右上角云端面板，头像加载后先打钩再显现；后台统一为“应用程序接入”。

[账号中心与用户管理](development/accounts.md)、[API Key应用接入指南](development/api-key-applications.md)及[真实验收](handoff/accounts-verification.md)：资料/密码/会话、普通用户受限头像库、细分授权、Key与应用签名双向接入；含桌面/窄屏与独立子项目检查。

[账号管理与双向API Key接入决定](decisions/0069-accounts-api-keys-and-signed-callbacks.md)：主项目统一签发/校验，子项目签名查询，主项目按管理员登记URL签名回调；实际范围与限制见指南和STATUS。

[统一国旗字体](decisions/0068-local-language-flag-font.md)与[验收](handoff/language-flag-font-verification.md)：前后台语言标志使用同源按需彩色字体，覆盖270种旗帜，保留自定义标志和系统回退。

本目录是跨上下文、跨开发者的长期交接入口。当前已有公开阅读、按页面注册的动态请求、演示身份/浏览量、真实匿名历史评论点赞和阅读反馈，以及真实账号登录、独立后台壳、基本站点/主题/系统设置、图标库、图片/视频/通用附件媒体库、统一多文件上传/同哈希复用/安全删除、附件资料/图片编辑、注册式文章/说说管理、独立编辑页、发布/撤回及可靠内容同步、多块编辑/属性、分类标签、密码访问/定时开放与独立页面目录；现在还提供 Markdown/HTML 插件编辑与整篇协同试用；完整博客/CMS 尚未全部实现。

## 先从这里读

[大量语言的正文切换](decisions/0067-large-language-pickers-and-header-order.md)及[50语言模拟验收](handoff/language-overflow-verification.md)：少量平铺，大量收进可搜索弹层；手机只显示当前语言和+数量。前台顶栏为连接状态、纯语言图标、搜索。

[可配置多语言与原文合并列表](architecture/multilingual-content.md)、[ADR0066](decisions/0066-configurable-languages-and-grouped-translations.md)及[实际验收](handoff/multilingual-verification.md)：文章/说说独立译文与原文共用一行入口，语言数量可扩展；设置支持默认语言、中文前缀、国旗搜索/自定义及备选/自定义语言。内容语言与程序界面包分离，初始中英文不构成语言上限。

[顶部版本选择与HTML可视化差异](decisions/0062-revision-pairs-and-html-visual-diff.md)、[操作指南](development/draft-versions.md)及[本轮验收](handoff/version-revision-layout-verification.md)：编辑页式顶部双选、左右区块/行内高亮、HTML默认可视化和逐块切换。

[版本对比与离线恢复](development/draft-versions.md)记录最新使用方式；[ADR0061](decisions/0061-cursors-offline-branches-and-version-merges.md)替代旧的正文整篇显式保存阶段，[验收](handoff/cursor-versions-verification.md)记录双窗口、输入法、真实多进程及独立版本页。

[编辑器工具栏、视频、HTML颜色和滚动定位](decisions/0059-editor-inline-insertion-and-sticky-blocks.md)、[保存修订同步修复](decisions/0060-collaborative-draft-revision-refresh.md)及[本轮验收](handoff/editor-inline-tools-verification.md)：短代码在当前区块插入，视频使用原生Markdown扩展，切换保留光标，标题栏避让导航吸顶；接入协同修订通知并保留真实冲突守卫。

[原生短代码与后台短代码库](architecture/shortcodes.md)、[ADR0057](decisions/0057-native-shortcode-implementation.md)及[验收](handoff/native-shortcodes-verification.md)：采用`{{< … >}}`原生调用，已移除旧兼容，支持真实模板草稿/应用、代码注册项只读与文章插入。[ADR0058](decisions/0058-preserved-html-visual-editing.md)记录源码HTML的可视化修改与源文保留。

[本容器临时连通性验收](handoff/remote-address-verification.md)：登录、媒体、投递和协同WS通过；只记录本次容器测试，不约定长期部署地址。[运行说明4](development/container-deployment.md)保留通用步骤，实际IP与临时URL仅在本地忽略配置中维护。

[Markdown源码高亮](decisions/0055-markdown-source-highlighting.md)及[实页验收](handoff/markdown-source-highlighting-verification.md)：标记分色、浅深色与窄屏、代码围栏按语言加载，211项检查通过。

[编辑器预览操作随滚动进入顶栏](decisions/0054-scroll-editor-preview-actions.md)及[实页验收](handoff/editor-preview-dock-verification.md)：单组预览操作、双向动效、焦点保留与窄屏导航第二行。

[功能测试长文与本地验收](handoff/feature-lab-article-verification.md)：7 个混合区块、代码/公式/媒体/字体/阅读交互，文章已发布并保留。

新设备部署入口：[Docker 容器与 HTTP 运行指南](development/container-deployment.md)、[ADR0053](decisions/0053-container-http-development.md)、[部署验收](handoff/container-deployment-verification.md)。

1. [当前状态与下一步](handoff/STATUS.md)：本仓库实际完成了什么、验证结果、限制及接续任务。
2. [开发协议](development/protocol.md)：协作、代码、依赖、Git、检查和交接规则。
3. [架构约束](architecture/constraints.md)：已确认边界、工程提案与待决事项。
4. [基线来源及校验](baseline/README.md)：原始附件、权威顺序和双仓库同步规则。
5. [初始化决定](decisions/0001-bootstrap.md)：本步工程选型及其适用范围。
6. [公开阅读决定](decisions/0002-public-reading.md)：当前交付、数据链路与尚未实现边界。
7. [持久前台决定](decisions/0003-persistent-ui-motion.md) 与 [前台组件架构](architecture/frontend-ui.md)：公共壳、导航、视频及有序样式职责。
8. [原站复刻决定](decisions/0004-reference-fidelity.md)：连续阅读、共享滚动/工具列、安全展示短代码。
9. [整站动效决定](decisions/0005-site-motion-policy.md)：本站完整动效默认值、连续滚轮、非模态设置与双向过渡，更新 ADR 0004 的相关细节。
10. [前台功能决定](decisions/0006-public-ui-completion.md)：二级导航、文章头图、评论预览、整卡点击和保存背景偏好。
11. [内容类型衔接](architecture/content-types.md)：前台展示适配、后台类型注册、草稿和发布/撤回同步已实现；整体历史导入后置。
12. [说说与阅读工具决定](decisions/0007-shuoshuo-and-reader-features.md)：后端草案、前端适配、共享评论/图片/正文工具与偏好边界。
13. [主题优化决定](decisions/0008-theme-polish-and-configuration.md) 与 [主题配置/缓存边界](architecture/theme-configuration.md)：首页偏好、紧凑卡片、横向推荐、品牌色联动；后台首批设置现由 ADR 0024 落地。
14. [导航就绪与反馈决定](decisions/0009-navigation-readiness-and-feedback.md)：完整页面准备、切换后定位、5 秒导航延伸横幅、20 秒超时和竞争请求处理。
15. [自动反馈与倒计时](decisions/0010-navigation-feedback-countdown.md)：无按钮的单行横幅、哭哭失败表情、10 秒整幅倒计时和气泡装饰，更新 ADR 0009 的展示部分。
16. [评论焦点与主题滚动条](decisions/0011-comment-focus-and-scrollbars.md)：完整颜文字排版、轻量选中/键盘焦点、全站原生滚动条共用主题色。
17. [统一控件与配色](decisions/0012-shared-controls-and-theme-consistency.md)：强制共享控件、完整配色联动、滚轮横向推荐、导航轨道衔接与评论到达反馈。
18. [公开首屏与动态数据设计](architecture/public-dynamic-data.md) 与 [ADR 0013](decisions/0013-public-dynamic-data.md)：SEO/独立阅读、指标渐进显示、评论快照更新、请求与缓存边界；区分设计与已实现子集。
19. [按页面注册的请求基线](decisions/0014-page-registered-reader-requests.md)：通用状态面板与页面插槽、生成客户端、取消/去重/重试、假身份/浏览量、真实离线有/无缓存验证；不是生产认证或持久计数。
20. [阅读反馈与评论点赞](decisions/0015-reader-feedback-and-comment-likes.md)：404/同步失败、页面请求圆周进度、真实匿名点赞确认，不扩展账户权限。
21. [悬浮层与主题错误页](decisions/0016-anchored-popovers-and-failure-pages.md)：水合/定位就绪门控、共享 404/503/错误边界、离线翻牌小游戏与构建产物。
22. [媒体上传与存储设计](architecture/media-storage.md) 与 [ADR 0017](decisions/0017-media-storage-and-upload-lifecycle.md)：后端媒体库、Base URL/Uploads Path、文件布局、上传确认及 CDN 扩展；完整媒体生命周期仍为设计；基础媒体上传/查询/字段选择与本地分发由 ADR 0025 落地。
23. [真实登录与后台入口](decisions/0018-authentication-and-admin-entry.md)：PostgreSQL 用户/可撤销 Session、HttpOnly Cookie、CSRF/精确 Origin、管理员校验与 `init.database.py`。
24. [通用账号与自适应登录](decisions/0019-shared-login-and-responsive-entry.md)：通用账号文案、后台单独鉴权、简洁表单与等比营地背景；回跳规则随后由 ADR 0020 更新。
25. [登录过渡与会话校验](decisions/0020-login-handoff-and-session-check.md)：成功动画完成后导航、管理员缺省回后台、并发校验合并与有界失败反馈。

26. [后台样式调研](design/admin-reference-research.md)、[后台界面与主题架构](architecture/admin-ui.md) 与 [ADR 0021](decisions/0021-admin-theme-and-workspace.md)：简洁工作台、前台/登录/后台展示隔离、共享控件、缓存与目录拆分；第一期后台壳已实现，媒体基础业务现由 ADR 0025 接入，文章/说说基础草稿编辑现由 ADR 0030 实施。

27. [后台导航注册](architecture/admin-navigation.md) 与 [ADR 0022](decisions/0022-admin-navigation-and-motion.md)：可信模块菜单组装、系统/扩展职责、后台独立动效偏好；后端挂钩仍为设计。

28. [设置项盘点](design/settings-reference-inventory.md)、[站点/主题/系统设置设计](architecture/settings-design.md)、[前端扩展提案](architecture/frontend-extensions.md) 与 [ADR 0023](decisions/0023-settings-and-extension-boundaries.md)：Argon/WP 可配置项分类、SEO、配置存放与缓存分层、编辑器/页面/存储注册边界；保留调研与扩展提案，已实施子集和存放决定见 ADR 0024。

29. [基本设置实施](decisions/0024-versioned-settings-delivery.md)、[运行指南](development/settings.md) 与 [实际验证](handoff/settings-verification.md)：PostgreSQL 权威保存、审计/可靠事件、独立投递、节点完整副本及后台三页。

30. [递归菜单与图标库](decisions/0025-recursive-menus-and-icon-library.md)、[使用指南](development/menu-icons.md) 与 [验证](handoff/menu-icons-verification.md)：树形编辑、共享图标浏览/上传、公开导航递归及资源地址版本化。
31. [自定义代码页面与链接选择](architecture/registered-pages.md)：已确认的页面注册/公开选项边界，以及待实施内容选择接口；无在线代码编辑。
32. [媒体详情与图片编辑](decisions/0026-media-details-and-image-editing.md)、[操作指南](development/media-library.md) 与 [实际验收](handoff/media-editor-verification.md)：元数据持久化、版本冲突保护、原件不覆盖的裁剪/旋转/翻转/缩小。
33. [统一上传与安全删除](decisions/0027-shared-upload-queue-and-safe-removal.md) 与 [实际验收](handoff/media-uploads-verification.md)：多文件进度/降级、内容复用、回收站、同哈希安全/整组删除与冻结范围重试。
34. [基础媒体库运行指南](development/media-library.md)：图片/视频/通用附件、多文件上传选择、稳定媒体绑定、紧凑预览与当前限制。

35. [共享确认弹窗](decisions/0028-shared-confirmation-dialog.md)：全局可复用 ConfirmDialog、媒体删除范围、未保存修改提醒及嵌套焦点隔离。
36. [交互动效生命周期](decisions/0029-interaction-motion-lifecycle.md)：共享控件反馈、确认弹窗双向动画、退场后关闭及减少动态兼容。

37. [注册式内容草稿](decisions/0030-registered-content-drafts.md)、[使用与开发指南](development/content-management.md) 与 [验收记录](handoff/content-management-verification.md)：独立文章/说说入口、持久 CRUD、版本冲突、回收恢复及公开边界。

38. [真实发布与独立编辑页](decisions/0031-content-publication-and-editor-pages.md)、[使用指南](development/content-management.md) 与 [验收](handoff/content-publication-verification.md)：后端真实数据、独立编辑、发布/撤回、可靠投递、离线阅读和旧版本防回退。
39. [功能联调数据与同步区域](decisions/0032-functional-test-data-and-sync-status.md) 与 [验收](handoff/content-test-data-verification.md)：旧 WordPress 数据退出开发环境公开测试、后台测试内容独立验证、紧凑同步状态与窄屏排版。

## 目录职责

本轮接入入口：[动态请求开发指南](development/reader-requests.md) 与 [验收记录](handoff/reader-requests-verification.md)。原始设计依据保留在 [动态数据盘点](handoff/public-dynamic-data-audit.md)。

最新补充：[阅读反馈与评论点赞验收](handoff/reader-feedback-verification.md)，包括真实后端确认、离线反馈与未完成的视觉核验边界。

最新界面检查：[悬浮层与错误页验收](handoff/failure-pages-verification.md)，包含最终生产构建、离线有/无缓存、错误边界、配对游戏及窄框检查；不会替代上一阶段尚未执行的其他验收。

最新认证交付：后端记录见 [认证后端验收](handoff/authentication-verification.md)，前端记录见 [登录与空后台验收](handoff/authentication-frontend-verification.md)。登录现为通用账号入口，未指定返回地址时管理员回后台、普通账号回前台，成功反馈完成后再切换；认证等待态复用宽松的响应式卡片，背景为等比自适应的柔焦星空营地；管理员验证后进入独立后台工作台。2026-11-01 用户批准样例后已按 ADR 0021 拆分 auth/admin，后台拥有独立配色与偏好；文章/说说基础 CRUD、发布/撤回与完整快照同步已由 ADR 0031 接通；媒体库上传、资料和基本图片编辑已由 ADR 0025/0026 实施。

| 目录            | 内容与维护时机                                                        |
| --------------- | --------------------------------------------------------------------- |
| `baseline/`     | 两份原始附件的逐字节副本、来源和 SHA256；保留历史依据，不直接改写原件 |
| `architecture/` | 已落实的架构边界、模块与数据设计；明确区分已实现和计划                |
| `design/`       | 官方参考调研与视觉方向；区分外部观察、建议和已验收界面                |
| `development/`  | 开发协议、本地运行和检查方法；随工具或流程变化更新                    |
| `decisions/`    | 编号 ADR，记录决定、原因、后果和替代关系                              |
| `handoff/`      | 当前状态、验证记录和下一步；每次有意义交付更新                        |

后续可新增 `api/`、`database/`、`migration/`、`operations/` 等子目录。只有实际产生对应文档时才扩展索引，避免大量没有内容的占位文档。

40. [基本多块编辑](decisions/0033-content-editor-workspace.md)、[访问和分类](decisions/0034-wordpress-editor-access-and-taxonomy.md)、[后台面板/日期控件](decisions/0035-admin-panels-and-editor-controls.md) 与 [验收](handoff/editor-workspace-verification.md)：标题置顶、根级固定链接、分类标签、密码与定时开放、日历、统一后台表面和逐组件浏览器验证。

41. [就地确认与编辑入口](decisions/0036-inline-confirmation-and-authorized-editor-links.md)：本地块删除气泡、顶部操作整理、真实权限确认后的前台编辑链接，以及后台有效文案规则。

## 操作与验证记录

- [后台工作空间](development/admin-workspace.md) 与 [后台验证](handoff/admin-workspace-verification.md)：页面入口、独立外观、主题目录、认证回归及实际未交付范围。

- [开发环境](development/environment.md)：本机工具、安装方式和项目运行说明。
- [公开阅读运行指南](development/public-reading.md)：8001/3000 启动命令、数据刷新与手工验收。
- [动态请求开发与联调](development/reader-requests.md)：页面请求/面板注册、演示开关、契约生成、独立生产与断线测试。
- [动效开发与验证](development/frontend-motion.md)：保留热更新时的独立生产构建、交互检查和资源规则。
- [WordPress 只读清点](migration/wordpress-inventory.md)：源备份范围与迁移前置事实；不是导入结果。
- [初始化验证](handoff/bootstrap-verification.md)：本步实际执行的检查、结果与限制。
- [公开阅读验证](handoff/public-reading-verification.md)：当前阶段实际检查与已知限制；初始化记录保留为历史。
- [认证后端验证](handoff/authentication-verification.md)：契约、初始化、Session/CSRF/Origin、管理员校验、真实多进程与实际未执行项。
- [登录与空后台验证](handoff/authentication-frontend-verification.md)：生成客户端、跨源登录/退出、返回地址限制、共享入口卡片、主题化后台排版、错误恢复和响应式检查。
- [前台交互动效验证](handoff/frontend-motion-verification.md)：上一阶段浏览器、视频、软导航和窄屏交互证据。
- [原站前台复刻审阅](handoff/original-site-ui-audit.md)：实施前的用户反馈与原站对照；保留为历史依据。
- [原站复刻验证](handoff/frontend-fidelity-verification.md)：上一轮版式、慢加载中间态、目录/图片/手机交互的历史证据。
- [整站动效验证](handoff/frontend-global-motion-verification.md)：上一轮实际 Edge 根因、完整动效、设置滚动条、滚轮尾程和双向交互验证。
- [前台功能验证](handoff/frontend-interaction-verification.md)：本轮菜单、卡片、文章、评论、阅读偏好、桌面/窄屏与构建检查。
- [前台差异盘点（2026-10-31）](handoff/frontend-gap-audit-2026-10-31.md)：说说及 Argon 通用功能，含评论、图片、正文工具、访问状态与分享预览；区分已启用/可选/已有。自定义页面另排，先完善前端，再整体导入。
- [说说与通用阅读验证](handoff/frontend-reader-verification.md)：本轮实际源码/HTTP/构建结果、手工验证入口、浏览器验证中止及未接后端范围。
- [主题优化验证](handoff/frontend-theme-polish-verification.md)：最新截图反馈、主题色联动、内置浏览器桌面/窄屏、检查结果与复查入口。
- [导航慢网复查](development/navigation-network-preview.md) 与 [导航交付验证](handoff/frontend-navigation-verification.md)：临时本地故障代理、就绪与失败反馈、位置恢复和实际验证边界。
- [评论与滚动条验证](handoff/frontend-comment-scroll-verification.md)：本轮截图修正、桌面/窄屏、表情预览、焦点与深浅色滚动条检查。

## 两仓库分工

- `Everunfold-Backend`：FastAPI、Celery Worker、Scheduler 共用 Python 项目；发布版本化 API/WS/事件契约。
- `Everunfold-Frontend`：独立 Next.js 项目；消费指定版本契约，维护可信主题、页面和节点缓存。
- 本页及公共规范在两仓库保持一致；运行说明、状态、功能设计按所属仓库维护。接口契约仍以后端为唯一权威，不把文档副本当成第二个契约源。
- 根目录 `README.md` 是本仓库运行入口；根目录 `AGENTS.md` 是开发协作规则。实际版本和命令以它们及锁文件为准。

## 记录状态的约定

文档必须明确写出“已确认需求 / 工程提案 / 已实现 / 已验证 / 未实现 / 未执行”。原文存在配置示例和验收计划，不表示参数或生产能力自动生效。当前已做本地公开内容试导入，未执行线上切换或生产部署；远程推送由用户执行。

## 当前编辑器与协同交接

- [ADR 0037](decisions/0037-plugin-editors-and-collaborative-drafts.md)：单篇 Y.Doc、可信编辑插件、持久确认和发布截点。
- [协同架构](architecture/collaborative-editing.md)：数据库/WS/Redis/本机缓存及权限边界。
- [插件开发与试用](development/editor-plugins.md)：注册入口、启动及两页面验证。
- [实际验收](handoff/collaborative-editing-verification.md)：双进程故障、浏览器离线/多窗口/恢复、截图与后续。

- [源码工具与场景快捷键](decisions/0038-source-editor-interactions-and-shortcuts.md) 与 [本轮界面验收](handoff/source-editor-verification.md)：行号/折行对齐、内容高度、格式/插入、搜索补全与快捷保存。

- [区块库与按ID拖放](decisions/0039-block-library-and-anchored-dragging.md) 与 [实际验收](handoff/block-composer-verification.md)：注册卡片、手柄/键盘排序、协同撤销与窄屏弹层。

- [编辑留白与十行高度](decisions/0040-source-editor-spacing-and-minimum-height.md)：用户最新排版要求、CSS规则、浏览器检查与截图。

- [添加区块反馈修复](decisions/0041-block-insert-picker-feedback.md)：所有添加入口弹出类型选择、明确插入位置与浏览器验收。

- [可视化编辑器与字体库](decisions/0042-visual-editors-and-font-library.md)、[字体按需加载指南](development/font-library.md) 与 [本轮验收](handoff/visual-editor-font-verification.md)：HTML默认可视化/受保护源码、Markdown预览分屏、轻量工具栏及字体注册/上传/选择。

- [富文本实例与位置历史修复](decisions/0043-rich-editor-lifetime-and-position-history.md)及[本轮验收](handoff/editor-lifecycle-fix-verification.md)：编辑页空实例保护、真实结构协同与只追加辅助元数据。

- [源码底稿与整篇保存](decisions/0044-source-first-blocks-and-whole-draft-save.md)、[图片上传与工具栏](decisions/0045-inline-image-upload-and-editor-controls.md)及[逐组件验收](handoff/source-first-editor-verification.md)记录当前2.1插件的即时切换、完整元素选区、正文保存事务、图片对齐/粘贴上传与中性编辑区。
- [透明编辑区与锚定表单](decisions/0046-editor-canvas-and-anchored-forms.md)及[回归验收](handoff/editor-canvas-popover-verification.md)记录外层栏移除、链接/图片弹层的实际尺寸与焦点、可视化表格结构修复。
- [紧凑视图与大媒体窗口](decisions/0047-compact-editor-views-and-media-picker.md)、[新增 HTML 分行](decisions/0048-new-html-fragment-line-formatting.md)及[实际验收](handoff/editor-media-picker-verification.md)记录单图标直接切换、共享大媒体选择器、局部新增结构整理与真实保存；对应指南 editor-plugins-10、media-library-runtime-6。
- [统一代码与公式](decisions/0049-shared-code-and-formula-features.md)、[使用/资源指南](development/content-features.md)及[验收](handoff/content-features-verification.md)：两格式共用插入窗口、高亮/公式SSR、按引用加载CSS/字体、HTML公式窗口和Markdown分屏共用底栏；当前编辑器指南11、开发协议13。

- [结构化公式与主题吐司](decisions/0050-structured-formula-editor-and-theme-toasts.md)、[指南](development/formula-editor-and-toasts.md)及[验收](handoff/formula-editor-verification.md)：MathLive/CodeMirror共用窗口、模板/矩阵/键盘、保留LaTeX、按打开加载资源及统一上传通知。当前功能指南2、编辑器指南12、开发协议14。
- [私有前台预览](decisions/0051-private-frontend-content-preview.md)及[验收](handoff/content-frontend-preview-verification.md)：文章/说说保存并预览、共用正式主题展示、独立鉴权、no-store/noindex与匿名SSR隔离。
- [共享代码框与片段参数](decisions/0052-shared-code-frames-and-source-options.md)、[代码指南](development/code-blocks.md)及[验收](handoff/code-blocks-verification.md)：单编辑框、theme.code默认值、源码参数、行号/重点行、底部半透明展开和代码字体按需。当前开发协议16、编辑器指南13、功能指南3、设置指南7。

最新交付：[光标、离线分支与独立版本页](decisions/0061-cursors-offline-branches-and-version-merges.md)、[操作指南](development/draft-versions.md)及[真实验收](handoff/cursor-versions-verification.md)：正文实时保存、块内成员选区、独立可视化/源码差异、版本保护与持久合并锁。

最新界面交付：[紧凑内容列表与编辑工具](decisions/0063-compact-content-lists-and-editor-tools.md)、[操作指南](development/content-management.md)及[实际验收](handoff/content-list-tools-verification.md)：封面缩略图、作者/分类/标签/评论/日期、明确搜索，以及链接弹层和统一短代码入口。

当前设置交付：[桌面分区导航](decisions/0064-desktop-settings-section-navigation.md)、[系统设置归并](decisions/0106-system-settings-captcha-and-grouped-navigation.md)、[运行指南](development/settings.md)与[实页验收](handoff/system-settings-captcha-navigation-verification.md)：验证码并入系统设置；站点/主题/系统设置共用右侧目录、锚点、滚动高亮及可选两级分组。

最新多语言交付：[内容与设置指南](architecture/multilingual-content.md)、[ADR0066](decisions/0066-configurable-languages-and-grouped-translations.md)及[验收](handoff/multilingual-verification.md)已替代[ADR0065历史提案](decisions/0065-multilingual-content-entry-design.md)。语言数量可扩展，默认/中文前缀和标志可配置，译文与原文合并列表，前后台切换及独立发布已接通；程序包与内容语言仍分开管理。

- [页面语言、关联菜单与预览回执](decisions/0074-page-languages-linked-navigation-and-live-preview.md)：自定义页面独立译文、已应用源文启停、稳定内容导航及隔离预览确认；实施与验收以STATUS为准。

本轮交付：[页面多语言、自动关联菜单与预览更新](decisions/0074-page-languages-linked-navigation-and-live-preview.md)、[页面指南4](development/pages.md)、[设置指南10](development/settings.md)与[验收](handoff/page-languages-preview-verification.md)：语言组/独立启用、代码注册页语言路径、稳定ID菜单、主题离开与渲染回执、人物弹窗、启停去重及语言计数对齐。

最新调整：[脚本/头像限制提示与侧栏高亮](decisions/0075-admin-page-script-and-avatar-policy-warnings.md)：这两个入口去掉密码输入、保留权限，移动/桌面行高与选中背景统一；验收见[本轮记录](handoff/admin-warnings-navigation-verification.md)。

当前交付：[统一插件与主题运行规范](architecture/frontend-plugin-runtime.md)、[插件/模型控件开发](development/frontend-plugins.md)、[数据拉取与Callback接口](development/plugin-data-protocol.md)及[ADR0077](decisions/0077-unified-plugin-theme-schema-and-artifact-boundaries.md)：页面/短代码由插件贡献，原生目录发现主题/插件，具名控件与占位、开放JSON、精确锁文件与忽略产物。

本轮完整检查与部署边界见[统一插件验收](handoff/plugin-runtime-verification.md)。

最新 SEO 交付：[ADR0102](decisions/0102-static-seo-content-and-dynamic-enhancements.md)、[前台组件架构](architecture/frontend-ui.md)与[搜索发现指南](development/operations-and-search.md)：文章标题、摘要与正文直接进入首次 HTML；静态主题注册与客户端水合注册分离，原始正文块不再重复进入 RSC props，中文以 UTF-8 输出；术语 Tooltip、浏览量及其他交互继续按需加载。

最新术语交付：[ADR0103](decisions/0103-dynamic-glossary-footnotes.md)与[术语表指南](development/glossary.md)：文章/说说正文结束后按需加载本页命中的术语脚注，摘要优先、富文本首块回退、单行省略；两类脚注可分别关闭并复用同一匹配缓存。

最新多语言与钩子交付：[ADR0104](decisions/0104-localized-navigation-and-glossary-hooks.md)与[术语表指南](development/glossary.md)：导航名称可按语言稀疏覆盖并使用旗帜；术语专搜、逐内容 Tooltip/脚注开关、术语内页面选择器钩子及管理员 JavaScript 挂载已接通。新建术语可暂存页面触发并在首次保存时一并创建，`glossary.mount(element)`接受原生 DOM 节点。

最新后台结构交付：[ADR0105](decisions/0105-admin-navigation-and-glossary-media.md)：后台按概览、内容、内容工具、资源、外观、成员与互动、设置重排；导航归当前主题并保留旧站点导航回退，长自定义标志使用固定槽内滚动，术语新增媒体库特色图片。
