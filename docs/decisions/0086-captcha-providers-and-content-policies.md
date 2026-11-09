# 0086：验证码提供方、应用规则与私有阅读

日期：2026-11-09。状态：已实施；接口、部署与限制见[指南](../development/captcha.md)，实际检查见[验收](../handoff/captcha-verification.md)。

用户要求：可选 Google 或插件提供的验证码；没有外部提供方时自行生成。登录、评论、阅读可全局启用，文章、说说、页面可分别覆盖。

追加要求：API Key也提供对应设置；机器调用采用明确授权豁免和每Key限流，原有Key不自动升级。

## 接口与规则

- 私有 `/v1/admin/captcha` GET/PATCH：版本保护、settings 权限；提供方、公开 Site Key、写入式 Secret、精确允许的 hostname 与登录/各内容类型阅读/评论规则。密钥不回显、不进入公开设置、快照、审计差异或日志。空 Secret 保留，显式清除单独操作。默认规则全部关闭，不改变现有访问方式。
- `/v1/reader/captcha/challenge` POST：action=`login|read|comment`、可选内容 UUID、浏览器随机 client_id；只针对已发布/启用内容。返回 required、提供方的公开渲染配置、短时 challenge_id，本地额外返回 PNG data URL。no-store、精确 Origin、频率限制。
- 提交时携带 `{challenge_id,client_id,answer}`。Redis 原子取出后校验，不可重放；绑定动作、内容、策略版本和发布代次。本地图片只存加盐答案摘要；错误须刷新图片。第三方响应必须经后端验证，检查 hostname，超时/插件缺失不放行。只有显式选择本地时使用本地；外部服务故障不静默降级。
- 登录及受限阅读在原有接口上增加可选 captcha 字段。评论提交采用 `/v1/reader/comments`，真实落库为待审核，不能因验证通过自动公开。API 成功只表示提交，不表示审核通过。
- 单篇 `captcha_read/captcha_comment=inherit|required|off`，保留在草稿/协同文档/修订/排期中，发布后生效；注册页面也可配置阅读规则。验证码不能替代原有密码、权限、评论关闭或 CSRF。
- 阅读规则变化和公开投影/可靠 Outbox 同事务：受保护正文、摘要、媒体映射、页面源码/配置不进入共享快照；搜索/评论查询不泄露受保护正文。通过验证的正文只在当前浏览器挂载页面内存中保留，不回写共享缓存。
- 机器访问通过新增 `captcha:read_bypass/comment_bypass` 独立授权及全局开关豁免对应验证码，原有Key不增权；所有阅读侧Key请求仍实时校验用户/Key/应用权限交集，事务前重查并围栏撤销，按Key限流和审计。挑战及读取回执绑定凭据摘要，禁止跨Key/匿名复用。不提供登录豁免，也不豁免密码、内容可见性和评论审核。

## 提供方扩展

本地图片属于核心。可信后端插件 `app/plugins/<目录>/captcha.py` 导出类型化 `provider`（稳定 ID、标题、前端组件名和异步 verify 方法）；目录发现拒绝重复 ID。Google reCAPTCHA v2 Checkbox、Cloudflare Turnstile 作为随项目交付的适配器。插件可以自定义验证协议，不允许浏览器提交任意校验 URL。

对应前端组件由独立 `src/plugins/<目录>/plugin.ts` 使用 components.register 注册；复用已有插件编译、启停及缺失占位，不引入第二套安装机制。组件接收公开 siteKey、challengeId、onChange(token)、onError；宿主处理生命周期、刷新及业务提交。密钥只在后端 verifier 使用。第三方组件只按实际需要加载脚本。

2026-11-09用户明确删除后端根plugins：旧占位目录已移除，后端统一app/plugins。前端独立产物目录仍按原约定维护。提供方配置引用进入插件启停确认，取消保留其他设置并还原本批次开关。评论只新增待审核提交入口，本次不提供审核管理界面。

## 依据

[Google 后端验证](https://developers.google.com/recaptcha/docs/verify)要求短时且一次性的响应；[Turnstile 验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)也要求服务端验证并处理过期/重放。本站仍按用户要求以 HTTP 调试；第三方校验端点由后端通过 HTTPS 调用。
