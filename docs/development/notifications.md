# 通知系统与通知模板

版本：notifications-15，2026-11-13。架构决定见 [ADR0113](../decisions/0113-notification-events-platforms-and-templates.md)、[ADR0117](../decisions/0117-html-notification-templates.md)、[ADR0118](../decisions/0118-account-user-picker-and-policy-navigation.md)和[ADR0132](../decisions/0132-account-notification-events.md)。

## 概念

- **事件**：业务发生的事实，例如 `comment.pending_review`。
- **平台**：站内、邮件、短信、Webhook 等投递渠道。
- **通知模板**：某个事件在某个平台、某个语言下的展示变体。
- **路由**：哪个事件通知哪类接收人，并使用哪个平台和模板。
- **投递**：一个事件对一位接收人的一个平台记录。

后台统一使用“通知模板”，不再创建独立的“邮件模板”概念。邮件只是 `email` 平台。

## 第一版能力

- 事件目录由后端代码注册，插件可使用命名空间事件 ID。
- 内置平台 `in-app`、`email`；插件可注册其他平台。
- 普通事件的路由接收人支持指定用户、角色和权限；也可由事件固定为执行目标主体或管理员。
- 模板按事件、平台、语言保存；缺失平台变体回退到内置安全文案。
- 模板正文使用共享编辑器。站内通知只编辑纯文本；邮件平台通过独立“启用 HTML”开关控制HTML发送，开启后可切换“可视化 / HTML源码”，关闭时保留HTML内容。可视化复用文章富文本编辑器，正文可直接输入，变量保持原始占位符。启用 HTML 时收起纯文本模式，关闭后仍可修改用于纯文本回退的正文。只有下方安全预览代入示例。
- 默认邮件模板共用站点品牌布局，使用站点名称、可选图标、主题色和发信原因。邮件品牌配置可覆盖图标和主题色，并指定收件人可访问的站点地址与帮助链接。缺少站点地址时，内置 HTML 隐藏依赖该地址的按钮。
- 评论进入待审核状态时发布 `comment.pending_review`。
- 定时发布完成时发布 `content.scheduled_published`，计划发布失败时发布 `content.schedule_failed`；两者与发布状态、审计和去重键同事务。
- 设置或内容快照投递在达到最大尝试次数后发布一次 `settings.delivery_failed`。中间重试不逐个发布事件，避免一次节点离线产生通知风暴。
- 站内通知写入 Inbox；邮件平台复用现有 SMTP 配置。
- 投递记录区分 `pending`、`sending`、`sent`、`failed`、`unknown`、`suppressed`。

## 内置事件

| 事件 | 时机 | 建议用途 | 去重边界 |
| --- | --- | --- | --- |
| `comment.pending_review` | 评论进入待审核队列 | 即时站内；需要时邮件 | 评论操作 ID |
| `content.scheduled_published` | 定时内容成功发布 | 可选的成功确认 | 草稿、排期运行与事件类型 |
| `content.schedule_failed` | 权限失效、路径冲突或内容校验失败 | 优先邮件或站内告警 | 草稿、排期运行与事件类型 |
| `settings.delivery_failed` | 前端节点在最大重试次数后仍未应用快照 | 运维告警 | 单条同步投递记录 |
| `security.registration_verification`、`security.email_verification`、`security.password_recovery` | 认证流程需要验证码 | 发给流程验证的邮箱，必需 | 认证挑战 |
| `security.password_reset_completed` | 自助重置密码成功 | 发给原已验证邮箱，默认开启 | 认证挑战 |
| `security.email_verified` | 用户用验证码完成邮箱验证 | 发给通过验证的邮箱，可选 | 验证请求 |
| `security.two_factor_enabled`、`security.two_factor_disabled`、`security.two_factor_recovery_rotated`、`security.two_factor_recovery_used` | 两步验证启停、更新恢复码或用恢复码完成登录 | 发给操作涉及账号的已验证邮箱，可选 | 账号认证版本或登录事件 |
| `account.registration_succeeded`、`account.user_created` | 自行注册完成或管理员新建账号 | 默认向管理员发送站内通知，可加邮件 | 新账号 ID |

事件目录由后端注册，后台策略和模板自动出现。验证码事件可单独指定发信配置，也可继承「访问与安全」的默认配置。规则只控制发信配置，不能停用流程必需的验证码，也不能将收件人改成用户、角色或其他渠道。密码重置完成邮件默认沿用该次重置码的发信配置，可单独覆盖或停用。上述邮件由认证 Worker 投递，状态留在认证流程中；普通通知在通知投递记录中查看。

「注册成功」用于自行注册；「新增用户」用于后台建号。同一账号只触发其中一个。站内和邮件模板支持 `{{account.username}}`、`{{account.display_name}}` 和 `{{admin.url}}`。账号安全提醒没有模板变量能取到密码、验证码、TOTP 密钥或恢复码。编辑账号安全策略和模板需要 `settings:write` 与 `access:manage`。

“指定用户”使用共享账号用户选择器，可搜索姓名、用户名、邮箱，也可粘贴完整稳定 UUID；显示名称和头像只用于识别，保存值始终是用户 ID。目录查询沿用`users:manage`边界。没有用户目录权限但具有通知设置权限的账号仍可手工填写稳定 ID。选择结果属于本地策略草稿，点击“保存策略”后才写入。

选择器只在弹层实际打开时加载目录，并在查询变化后防抖一次；单纯的界面重渲染、加载状态变化或翻译函数重建不得再次请求同一列表。

触发框与相邻下拉框保持同一高度。结果列表拥有独立滚动区并设置桌面与手机最大高度；用户数量增加时弹层不会继续向下增长，且必须保持在当前视口内。

单个用户行按名称、账号信息和稳定 ID 的自然行高展开，不设置会裁切文字的固定高度；限高只作用于结果列表容器。

桌面端右侧快速导航按事件生成，目录项与事件卡片使用同一标题；点击后定位并聚焦对应卡片。手机端不显示该目录，事件卡与接收规则改为单列。

## 告警节奏

- 即时事件用于“错过会阻碍运营”的故障，例如评论待审核、计划发布失败和节点持续同步失败。
- 成功确认适合可选订阅，不应默认向所有成员发送。
- 高频或可自愈的过程只记录运行状态；只有达到明确阈值后，才生成一次聚合事件。
- 普通保存、媒体上传、浏览量变化和每一次后台重试不发送提醒。

## 模板语法

通知模板使用受限双花括号变量：

```text
{{event.title}}
{{actor.name}}
{{resource.title}}
{{resource.url}}
```

渲染器只解析允许字段；字段缺失时渲染为空，平台模板或语言缺失时使用内置默认模板。HTML 变量先转义事件值，再清洗常见邮件标签、链接、图片和表格；脚本、表单、iframe、SVG、事件属性和活动 URL 被移除。

邮件通过 `multipart/alternative` 同时发送纯文本和 HTML；纯文本始终存在，作为不支持 HTML 的客户端回退。HTML开关关闭时不发送HTML，即使编辑器里仍保留草稿内容。站内 Inbox 继续只使用纯文本，不执行或展示邮件 HTML。

## 插件事件与平台

可信后端插件在 `setup` 中声明事件，并在业务事务内发布：

```python
from app.plugin_sdk import NotificationEventDefinition, publish_notification_event


def setup(registry):
    registry.notifications.register_event(
        NotificationEventDefinition(
            id="example.workflow.ready",
            title="处理完成",
            description="处理完成后提示结果。",
            variables=("workflow.name",),
            recipient_mode="subject",
        )
    )


async def on_ready(session, run, owner_id):
    await publish_notification_event(
        session,
        event_type="example.workflow.ready",
        dedupe_key=str(run.id),
        resource_type="workflow",
        resource_id=str(run.id),
        actor_id=None,
        subject_id=owner_id,
        data={"workflow": {"name": run.name}},
    )
```

事件 ID 必须以插件 ID 和点开头。接收人模式为 `configurable`、`subject` 或 `admins`；只有 `subject` 事件传入 `subject_id`，它与触发者 `actor_id` 独立。插件可声明 `email_only=True`。事件自带基础默认文案，管理员可按平台和语言保存模板。只有声明的点路径标量值会进入载荷；公共的 `event.*`、`site.*`、`recipient.*`、`mail.*` 和认证的 `verification.*` 保留给宿主。发布函数不提交事务，重复键或插件已停用时返回 `False`。

先部署相同插件代码到 API 和 Worker，再重启并显式同步插件清单。停用或卸载插件会隐藏该事件并保留历史规则和模板；待投递事件不会跨版本发送。修改插件的事件 ID 等同于新增一种事件。

平台插件只声明发送能力与投递语义，不负责接收人解析或权限：

```python
registry.notifications.register(
    NotificationPlatform(
        id="example.sms",
        title="短信通知",
        kind="direct",
        delivery_semantics="idempotent",
        deliver=send_sms,
    )
)
```

插件停用后，已有路由保留但投递为 `suppressed`；启用前必须完成部署清单同步。平台只能依据稳定用户 ID 解析自身目标，核心第一版不提供通用 Endpoint 存储。

## 安全与隐私

外部网络发送只在 Worker 中进行。SMTP 密码、插件凭据、未掩码收件地址和完整模板数据不写入普通日志或公开快照。事件模板数据只包含完成通知所需的公开或受限快照，不包含密码、令牌和完整正文。

站内通知与邮件可在同一事件上并存，但同一用户、同一平台在一次事件中至多生成一条投递。SMTP 结果未知、Worker 租约过期或插件异常都不自动重发，记录为 `unknown`。策略与模板每次保存都写设置审计。

“安全预览”使用无脚本、无同源权限的沙箱 iframe，启用 HTML 时可查看带品牌图标和无图标的效果，关闭 HTML 后显示纯文本。通知 Worker 对最终 HTML 清洗后发送。

模板编辑器始终保存 `{{variable.path}}` 占位符。右侧“变量填充”是独立安全预览组件，可临时填写示例值、恢复默认或清空输入；这些值不进入模板草稿、保存请求或通知数据。
