# 验证码配置与提供方开发

版本：captcha-1，2026-11-09。决定见[ADR0086](../decisions/0086-captcha-providers-and-content-policies.md)，检查见[实际验收](../handoff/captcha-verification.md)。

## 配置和使用

后台入口为“设置 → 验证码设置”。初始选择本地图片验证码，所有应用规则默认关闭。可分别开启登录、文章/说说/页面的阅读或评论验证。文章、说说的内容属性“验证码”面板，以及页面编辑器，提供“跟随全局 / 必须验证 / 无需验证”；保存草稿保留设置，发布或应用后生效。各语言内容沿既有独立发布规则，注册页面的同一配置覆盖其所有语言入口。

本地验证无需密钥。外部提供方目前有 Google reCAPTCHA v2 Checkbox 和 Cloudflare Turnstile，须填写对应 Site Key、Secret、允许的主机名，并启用前端“第三方验证码”插件。主机名每行一个，不包含协议、端口或通配符。Secret 写入后只显示“已配置”；留空保留原值，API 的 `clear_secret` 可明确清除，`remove_providers` 可移除未选中的完整配置。外部服务配置不完整不能保存；故障、插件缺失、过期或校验失败均不放行，不自动切换到本地。

全局设置改变后，后端校验立即使用新规则，公开阅读通过既有可靠投递更新节点；界面会提示等待节点同步。部署新契约时先升级全部接收器、前端与协同/API进程，再启用规则。单篇发布/页面应用同样更新完整快照。公开 HTML、搜索正文和共享缓存只携带受限占位信息；解锁响应使用 private/no-store，只在当前页面内存中使用。

当前评论提交会写入独立的待审核记录，验证通过不代表公开。历史已批准评论的读取/点赞保持；本次没有新增评论审核管理界面。自定义页面/注册页可通过统一评论提交接口使用其单篇规则，页面不会因此自动插入评论区。

## 接口和暂存

后端权威契约为 `contracts/captcha-v1.schema.json`，前端从精确锁定提交生成 `core/contracts/captcha` 的客户端和类型。不要自行复制 DTO。主要接口：

| 接口 | 用途 |
| --- | --- |
| GET/PATCH `/v1/admin/captcha` | settings:read/write、CSRF、期待修订；私有配置与提供方目录 |
| POST `/v1/reader/captcha/challenge` | action=`login/read/comment`、client_id、阅读/评论的 content_id |
| POST `/v1/auth/login` | 原登录接口增加可选 captcha，原会话/CSRF/Origin校验保持 |
| POST `/v1/reader/access` | 原密码阅读增加可选 captcha，两种条件分别校验 |
| POST `/v1/reader/access-page` | 校验后取得启用页面的源码/配置 |
| POST `/v1/reader/comments` | CAPTCHA、阅读回执、评论开关与稳定 operation_id；成功为 pending |

`captcha` 为 `{challenge_id, client_id, answer}`。本地 answer 是图片文字，第三方是组件返回的令牌。挑战绑定用途、内容、策略修订、发布代次、浏览器随机 ID 和真实 socket peer；Redis GETDEL 原子消费，一次尝试后需刷新。业务提交前再次核对规则，防止校验过程中规则/内容变化。评论重试使用同一 operation_id 和原输入，已有提交返回原回执，不重复落库。

PostgreSQL 的 `site_settings.data._captcha_private` 是策略/密钥事实，只经专有私有接口输出过滤后的配置；不进入公共设置、业务审计差异、队列或公开快照。`contents.captcha_read_required` 是事务内更新的阅读投影，供搜索/评论过滤。`reader_comment_submissions` 保存待审核提交。

Redis 仅保存按项目/环境隔离的短时状态：图片答案只存随机盐摘要，挑战有效180秒；阅读回执有效30分钟；每真实 peer 固定窗口挑战40次/分钟、验证60次/分钟、匿名评论提交10次/分钟。未要求验证码的匿名挑战查询不依赖 Redis。挑战、答案、令牌、回执和私有正文不进入共享前端缓存或 IndexedDB。读取回执不会授予账号权限。

## API Key 与机器调用

机器接口不适合每次要求人工完成验证码。后台“API Key 请求”提供明确授权豁免开关及每 Key 的阅读侧请求额度，默认允许明确授权的 Key 豁免、每分钟60次（可配置1–1000）。用户中心创建 Key 时，可独立选择 `captcha:read_bypass`（阅读免验证码）和 `captcha:comment_bypass`（评论免验证码）。现有 Key 不自动获得新授权；Key 的权限仍与所属用户当前授权、应用目录及 audience 取交集。关闭全局豁免后，需要验证码的阅读/评论恢复正常挑战流程。

四个阅读侧 POST 接口（challenge、access、access-page、comments）可使用 `Authorization: Bearer <API Key>`。仅接受面向 `everunfold` 的有效 Key；服务端调用可不带 Origin，带 Origin 时仍须在允许列表中。无效、过期、撤销、所属用户失效或授权已撤回都直接拒绝，不回退匿名；不接受 URL 中的 Key。有效 Key 的上述请求共用每 Key 的 Redis 预算，达到上限返回429和Retry-After；Redis不可用时机器请求拒绝放行。

豁免只替代指定用途的验证码，不授予草稿/非公开内容访问权，不绕过文章密码、评论关闭、阅读前置条件或审核。调用评论前，受限正文/页面仍须通过access取得阅读回执；回执和挑战绑定该 Key，不能拿到匿名请求或另一把 Key 下使用。读取后提交前会锁定并重新校验 Key、用户和应用，处理验证过程中撤销/缩权；成功访问更新last_used_at，实际豁免另有不含密钥明文的审计。创建/撤销 Key 沿既有用户中心功能，不额外索取验证码。

登录禁止使用Key代替浏览器身份，也不支持“登录免验证码”。管理业务 API 的原有最小权限鉴权，以及应用查询的 HMAC签名/时间戳/nonce、过期与撤销 Callback 协议保持，不强加人工验证码。外部子项目是否缓存鉴权结果及多久失效仍按[接入规范](api-key-applications.md)实施；此处的Key额度仅覆盖阅读侧四个入口，不是全站机器接口的统一限额。

## 增加提供方

后端统一使用 `app/plugins/<目录>/captcha.py`，导出 `CaptchaProvider` 实例 `provider`。API的 `captcha.router_init(ctx)` 自动发现并拒绝重复 ID；可信 Python 源码部署后重启 API 生效。已删除后端根 `plugins/` 的旧占位目录；工程原始附件中的旧目录图保留为历史资料。

```python
from app.modules.captcha.providers import CaptchaProvider
from .verification import verify_token

provider = CaptchaProvider(
    id="example.captcha",
    title="Example CAPTCHA",
    widget="example.captcha.widget",
    verify=verify_token,
)
```

`verify_token(token: str, settings: StoredProvider) -> bool` 必须是异步函数，执行实际服务端校验。`settings` 只提供给后端，包含 site_key、secret、hostnames。兼容 `success/hostname` 响应的服务可复用 `verify_site_token`；其他协议自行检查签名、时效、用途/主机名，设置超时并拒绝失败。固定可信服务端点写在插件代码中，浏览器不提交校验 URL。外部 HTTP 在业务事务之外执行；不能用总是返回 True 的占位实现。

前端在其独立仓库的 `src/plugins/<目录>/plugin.ts` 通过 `components.register("example.captcha.widget")` 注册，再在 components.tsx 导出组件。SDK提供 `CaptchaWidgetProps`：siteKey、challengeId、onChange(token)、onError。验证成功/过期时分别传令牌/空字符串，失败调用 onError；清理 iframe/事件、按需加载脚本，并支持重复挂载。宿主负责刷新、提交与错误展示。随项目交付的 `src/plugins/captcha` 是完整示例：Google使用ready；异步加载的Turnstile在script.onload后直接显式render。

前端沿原有独立构建、开发热更新和部署启停机制；其根 `plugins/<目录>` 是前端产物目录。后端的 `app/plugins` 是 Python 源码，两者各自归属，不共用根路径。停用被验证码配置引用的前端插件会显示确认提示；取消还原开关，继续则保留配置并阻止无法完成的验证。

## 部署与范围

本次显式迁移为0028_captcha，服务启动不自动执行：后端 `uv run --locked alembic -c migrations/alembic.ini upgrade head`。更新所有受影响的嵌套契约，包括 content-admin 的投递图和 collaboration 的 EditorSettings，提交权威产物后再同步前端锁文件。不要手改生成文件或提交 var/cache。

阅读保护针对后端后续正文读取；独立公开媒体、前端程序包和已经下载的副本沿原权限保留。插件源码及公开默认配置不能包含需要保密的正文，受保护数据应保存在后端页面配置中。现有内容权限、密码、定时开放、评论关闭和审核均继续生效。API Key查询/签名接入不因登录验证码而增加人工验证。

官方参考：[OWASP机器接口与限流](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)、[Google验证](https://developers.google.com/recaptcha/docs/verify)、[Google测试](https://developers.google.com/recaptcha/docs/faq)、[Turnstile验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)、[Turnstile测试](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)。官方测试密钥仅用于隔离测试，不能作为正式配置。
