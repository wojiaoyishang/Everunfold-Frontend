# Everunfold 文档入口

本目录是跨上下文、跨开发者的长期交接入口。当前已有公开阅读、按页面注册的动态请求、演示身份/浏览量、真实匿名历史评论点赞和阅读反馈，以及真实账号登录、独立后台壳、基本站点/主题/系统设置与内容/媒体准备页；完整博客/CMS 尚未全部实现。

## 先从这里读

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
11. [内容类型衔接](architecture/content-types.md)：0.2 展示草案与前台原型已实现，在线 0.1 类型迁移/整体导入后置。
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
22. [媒体上传与存储设计](architecture/media-storage.md) 与 [ADR 0017](decisions/0017-media-storage-and-upload-lifecycle.md)：后端媒体库、Base URL/Uploads Path、文件布局、上传确认及 CDN 扩展；本轮仅设计，尚未实现。
23. [真实登录与后台入口](decisions/0018-authentication-and-admin-entry.md)：PostgreSQL 用户/可撤销 Session、HttpOnly Cookie、CSRF/精确 Origin、管理员校验与 `init.database.py`。
24. [通用账号与自适应登录](decisions/0019-shared-login-and-responsive-entry.md)：通用账号文案、后台单独鉴权、简洁表单与等比营地背景；回跳规则随后由 ADR 0020 更新。
25. [登录过渡与会话校验](decisions/0020-login-handoff-and-session-check.md)：成功动画完成后导航、管理员缺省回后台、并发校验合并与有界失败反馈。

26. [后台样式调研](design/admin-reference-research.md)、[后台界面与主题架构](architecture/admin-ui.md) 与 [ADR 0021](decisions/0021-admin-theme-and-workspace.md)：简洁工作台、前台/登录/后台展示隔离、共享控件、缓存与目录拆分；第一期后台壳和准备页已实现，内容/媒体业务尚未接入。

27. [后台导航注册](architecture/admin-navigation.md) 与 [ADR 0022](decisions/0022-admin-navigation-and-motion.md)：可信模块菜单组装、系统/扩展职责、后台独立动效偏好；后端挂钩仍为设计。

28. [设置项盘点](design/settings-reference-inventory.md)、[站点/主题/系统设置设计](architecture/settings-design.md)、[前端扩展提案](architecture/frontend-extensions.md) 与 [ADR 0023](decisions/0023-settings-and-extension-boundaries.md)：Argon/WP 可配置项分类、SEO、配置存放与缓存分层、编辑器/页面/存储注册边界；保留调研与扩展提案，已实施子集和存放决定见 ADR 0024。

29. [基本设置实施](decisions/0024-versioned-settings-delivery.md)、[运行指南](development/settings.md) 与 [实际验证](handoff/settings-verification.md)：PostgreSQL 权威保存、审计/可靠事件、独立投递、节点完整副本及后台三页。

## 目录职责

本轮接入入口：[动态请求开发指南](development/reader-requests.md) 与 [验收记录](handoff/reader-requests-verification.md)。原始设计依据保留在 [动态数据盘点](handoff/public-dynamic-data-audit.md)。

最新补充：[阅读反馈与评论点赞验收](handoff/reader-feedback-verification.md)，包括真实后端确认、离线反馈与未完成的视觉核验边界。

最新界面检查：[悬浮层与错误页验收](handoff/failure-pages-verification.md)，包含最终生产构建、离线有/无缓存、错误边界、配对游戏及窄框检查；不会替代上一阶段尚未执行的其他验收。

最新认证交付：后端记录见 [认证后端验收](handoff/authentication-verification.md)，前端记录见 [登录与空后台验收](handoff/authentication-frontend-verification.md)。登录现为通用账号入口，未指定返回地址时管理员回后台、普通账号回前台，成功反馈完成后再切换；认证等待态复用宽松的响应式卡片，背景为等比自适应的柔焦星空营地；管理员验证后进入独立后台工作台。2026-11-01 用户批准样例后已按 ADR 0021 拆分 auth/admin，后台拥有独立配色与偏好；内容、媒体页面仅为准备结构，尚无编辑或上传业务。

| 目录 | 内容与维护时机 |
| --- | --- |
| `baseline/` | 两份原始附件的逐字节副本、来源和 SHA256；保留历史依据，不直接改写原件 |
| `architecture/` | 已落实的架构边界、模块与数据设计；明确区分已实现和计划 |
| `design/` | 官方参考调研与视觉方向；区分外部观察、建议和已验收界面 |
| `development/` | 开发协议、本地运行和检查方法；随工具或流程变化更新 |
| `decisions/` | 编号 ADR，记录决定、原因、后果和替代关系 |
| `handoff/` | 当前状态、验证记录和下一步；每次有意义交付更新 |

后续可新增 `api/`、`database/`、`migration/`、`operations/` 等子目录。只有实际产生对应文档时才扩展索引，避免大量没有内容的占位文档。

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
