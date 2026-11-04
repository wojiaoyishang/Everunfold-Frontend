# ADR 0053：新设备容器与内网 HTTP 开发

状态：按用户 2026-11-04 当前要求实施。限定为新的 Docker 开发设备；更新 ADR0018 的非回环开发地址限制，不变更生产默认。

## 来源与决定

用户要求在新 Docker 容器部署已有博客、服务监听 `0.0.0.0`，远程使用宿主机 `172.16.3.2:3000`，随后明确“不要 https”。此前配置加载器只允许回环 HTTP，不能满足该要求，因此增加默认关闭的 `[auth].allow_private_http`。

该配置只对字面 RFC1918 IPv4 / IPv6 ULA 地址启用 HTTP Cookie；不接受公网地址、链路本地地址或以 DNS 名称推断内网。保留 HTTPS 必须 Secure、SameSite=None 必须 Secure 的规则。精确 Origin、CSRF、HttpOnly、真实 socket IP AND 内部 Token 校验不变，非回环内部凭据传输仍需 HTTPS。

Nginx 在 3000 提供单个 HTTP 入口，按原路径分发页面、API、媒体和 WS，公开入口封锁内部路径。Next.js 在 3100、FastAPI 在 8001、Node 接收器在 3001；独立 Supervisor 管理上述进程及 Worker、单进程 Scheduler。宿主机映射由用户管理，不从容器重建宿主机服务。

HTTP 下没有安全上下文专用 Web Crypto 接口，前端提供共享 UUID/SHA-256 适配器，使用现有 lib0 和安全随机数，保持协同操作 ID 与源文截点校验。无新依赖、SQL 迁移或公开契约版本变化。

## 验证和边界

验证私有地址必须显式启用、禁止其它地址、原 Cookie 规则、HTTP 浏览器真实登录/编辑和原多进程投递。运行记录见[验收](../handoff/container-deployment-verification.md)，操作见[指南](../development/container-deployment.md)。

本轮只部署开发实例，WordPress 备份只读保留，旧站生产切换和全量导入继续后置。后续公网部署仍使用默认 HTTPS 配置；现有高层缓存/协同容量限制以原交接为准。
