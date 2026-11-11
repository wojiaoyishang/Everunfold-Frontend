# 通知系统与通知模板

版本：notifications-9，2026-11-11。架构决定见 [ADR0113](../decisions/0113-notification-events-platforms-and-templates.md)与[ADR0117](../decisions/0117-html-notification-templates.md)。

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
- 路由接收人支持指定用户、角色和权限。
- 模板按事件、平台、语言保存；缺失平台变体回退到内置安全文案。
- 模板正文使用共享编辑器。站内通知只编辑纯文本；邮件平台通过独立“启用 HTML”开关控制HTML发送，开启后可切换“可视化 / HTML源码”，关闭时保留HTML内容。可视化编辑器始终显示变量占位符。
- 默认邮件模板采用后台一致的简约卡片：中性背景、细分隔线、小图形标识和少量主题色，不依赖外链图片；HTML源码按层级缩进并逐行展开，便于直接维护。
- 评论进入待审核状态时发布 `comment.pending_review`。
- 站内通知写入 Inbox；邮件平台复用现有 SMTP 配置。
- 投递记录区分 `pending`、`sending`、`sent`、`failed`、`unknown`、`suppressed`。

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

## 平台插件

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

“安全预览”与最终邮件共用同一份HTML和清洗链路，使用无脚本、无同源权限的沙箱 iframe；它负责变量填充、转义和最终排版效果，不代表所有邮件客户端都支持相同 CSS。

模板编辑器和可视化画布始终保存 `{{variable.path}}` 占位符。右侧“变量填充”是独立安全预览组件，可临时填写示例值、恢复默认或清空输入；这些值不进入模板草稿、保存请求或通知数据。
