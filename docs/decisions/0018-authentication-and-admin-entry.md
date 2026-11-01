# ADR 0018：真实登录、后台入口与数据库初始化

日期：2026-10-31。来源：用户要求推送已有成果，正式进入后台/后端开发；本轮先完成登录页和简要空后台，由两个智能体分别负责前端与后端，并在后端根目录提供 `init.database.py`，默认管理员为 `admin` / `123456`。

状态：后端实现和本地验收已完成，代码提交 `c771c81`；完整检查与限制见 [登录交付验收](../handoff/authentication-verification.md)。前端登录/空后台由独立仓库负责，本 ADR 不声称前端已完成或已联调。媒体库/CDN 仍为 ADR 0017 的后续设计，不随本轮登录一起实现。

## 认证与契约

- PostgreSQL 存储真实用户和可撤销的不透明 Session，浏览器只有 HttpOnly Cookie。数据库不保存原始会话 token，密码使用 Argon2id 哈希；不使用历史演示访客身份授予后台权限。
- 后端发布 `auth-v0.1.schema.json`，前端从已提交版本生成类型、校验和客户端。浏览器直接访问配置的 FastAPI，使用带凭据请求；Next.js 不增加一套业务认证代理。
- `GET /v1/auth/session` 初始化/读取会话并返回绑定会话的 CSRF token。登录前也使用预会话；`POST /v1/auth/login` 和 `/logout` 同时验证精确 Origin 与 `X-CSRF-Token`，登录成功旋转会话，退出撤销原会话。
- `GET /v1/admin/session` 验证真实当前管理员；权限以数据库为准，前端路由门控只是体验。认证响应与管理页面不进入公开共享缓存，身份/CSRF 不写入浏览器持久存储、URL 或日志。
- 登录错误不透露账户是否存在；暴力尝试限制要跨进程生效。Cookie 的 Secure、SameSite、有效期与允许来源由后端显式配置，开发使用同一主机名的 3000/8001 联调。

这些选择沿用 v0.14 会话/CSRF 基线。登录时更换会话 ID、Cookie 保护与服务端撤销遵循 [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)；独立 CSRF token 与精确来源检查遵循 [OWASP CSRF 防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)。

## 前端边界

`/login` 和 `/admin` 与公开博客使用不同路由组，博客的现有 URL 保持不变。管理路由不读取公开内容快照，不经过正文预取/软导航缓存，避免新空数据库或公开缓存缺失使登录页面不可达。

登录页提供真实请求、提交中、失败及重试体验，复用项目封装控件、主题配色与减少动态策略。后台仅有结构、真实身份、退出和返回站点；不提供假统计、未实现的媒体/文章管理操作。后台必须等管理员校验成功再展示，断网不能使用本机保存的身份继续授权。

2026-10-31 后续界面修订：登录页和管理员身份确认共用同一张紧凑入口卡片，失败与重试不再撑满页面。管理员校验通过后才切换到顶部栏、左侧导航和右侧仪表盘工作区的后台排版；该结构参考 WordPress 后台的信息组织方式，但配色、字体、圆角、图标和交互全部沿用 Everunfold 主题，不复制 WordPress 的视觉皮肤。空后台只展示真实管理员身份、空工作区、返回站点和退出，不增加占位统计或业务入口。认证入口背景由星空营地场景承担，整个背景统一轻微模糊以降低细节干扰，登录卡片保持清晰；动态效果仍受项目“减少动态”偏好控制。

初版登录后的返回地址只允许预期的本站管理路径，拒绝外站及编码绕过。2026-11-01 用户明确登录需服务所有账号，入口文案与返回规则由 [ADR 0019](0019-shared-login-and-responsive-entry.md) 更新，并由 [ADR 0020](0020-login-handoff-and-session-check.md) 按后续用户要求修订：缺省按真实角色决定（管理员后台、普通账号前台），明确的安全返回地址优先；成功反馈完成后导航。公开 HTML 不包含用户身份；账号状态由浏览器向后端确认，管理响应为 private/no-store 并禁止索引。

## 初始化边界

后端根 `init.database.py` 是显式操作入口：读取现有配置，必要时创建指定目标数据库，运行已有和本轮迁移，再创建缺失的初始管理员。服务启动仍不自动建表或迁移。

默认 `admin` / `123456` 来自用户明确要求，仅用于首次创建；支持初始化参数覆盖。重复执行不得清库、改已有密码、重写内容或擅自提升已有账号权限。数据库连接/创建权限不足时明确失败，不回退到别的数据库或吞掉失败。密码、连接凭据和 token 不输出到日志。

本轮实现须验证空库、重复执行、原内容保留、真实 PostgreSQL 会话及跨进程撤销；不以单进程 mock 或页面成功跳转代替授权验收。注册、找回密码、改密界面、2FA、用户管理、完整审计/可靠任务系统留到后续阶段。

## 后端实现结果

- `0003_auth_sessions` 建立 `users`、`browser_sessions`、`auth_rate_limits` 与 `auth_audit_events`；密码只保存 Argon2id 哈希，Session 表只保存随机 token 的 SHA-256 摘要。
- `/v1/auth/session`、`/v1/auth/login`、`/v1/auth/logout` 与 `/v1/admin/session` 已装配；登录成功和退出均轮换 Session，写操作要求预会话绑定的 CSRF token 和精确 Origin，管理员身份每次从数据库当前用户状态复核。
- 登录失败使用统一错误且后台限流跨进程落 PostgreSQL；认证响应统一 `private, no-store`，Cookie 使用 HttpOnly、可配置 Secure/SameSite/Domain，不把身份或 CSRF 写入持久浏览器存储。
- 非回环 `BACKEND_BASE_URL` 必须使用 HTTPS，避免把 Secure Cookie 配置在仍然明文传输的部署上；回环 HTTP 只用于本地开发。
- `init.database.py` 的 PostgreSQL 临时空库测试覆盖创建数据库、迁移、首次创建 `admin` / `123456`、重复执行、内容保留，以及同名既有普通账号不被提升、停用状态和密码不被重写。

## 推送边界

早期初始化阶段曾有一次明确推送授权，但不延续为默认权限。2026-10-31 本轮收口要求只做本地提交且**代理不得 push**；本后端交付停在本地，远程推送由用户执行。
