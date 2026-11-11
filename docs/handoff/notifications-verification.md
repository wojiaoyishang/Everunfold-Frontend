# 通知系统与通知模板验收

版本：notifications-verification-3，2026-11-11。对应[ADR0113](../decisions/0113-notification-events-platforms-and-templates.md)与[开发指南](../development/notifications.md)。事件扩展的后续验收见[消息总线事件验收](notification-bus-events-verification.md)。

## 交付范围

- 后端`0cc5671`/`9efa412`，前端`bee1cf0`/`836f409`；契约`notifications-v1 1.0.0`与`settings-v1 1.31.0`固定到后端`0cc5671`。
- 第一版内置事件`comment.pending_review`，内置平台`in-app`、`email`；可信插件可注册其他异步投递平台。
- 接收人支持指定用户、角色和权限；同一个事件对同一用户、同一平台只生成一条投递。
- 评论待审核事件与评论、提交回执、去重键和审计同事务。站内通知写入 Inbox；邮件复用现有 SMTP 私有配置。
- 策略、模板、平台、投递记录和顶栏铃铛已进入后台；模板只做受限文本插值，第一版邮件为纯文本。

## 数据库与可靠性

- `0044_notifications`新增事件、策略、模板、投递、Inbox与单例修订；开发库已显式迁移到head，`alembic check`无差异。
- 外部网络副作用只在 Worker 执行。明确失败使用指数退避，最多5次；SMTP或插件结果未知、Worker租约过期均标记`unknown`且不自动重发。
- 模板和策略保存使用修订守卫并写`SettingsAudit`。Inbox未读数按数据库全部未读统计。
- 邮件 Subject 对换行做清理；模板不得执行JavaScript、Jinja或任意模板代码。账号邮箱验证由ADR0115交付；缺失目标时投递为`suppressed`。

## 自动检查

- 真实隔离 PostgreSQL通知测试3项通过：路由去重、模板与审计、Inbox全量未读、邮件关闭抑制、过期租约转未知；契约和插件注册2项通过。
- 完整后端套件首次运行347项通过，唯一失败是通知路由OpenAPI未声明500响应；补正后最终真实数据库全量348项在358.10秒内通过。
- Ruff、格式、定向mypy、`alembic check`通过。
- 前端`npm run check`369项通过；lint、Next.js typecheck、Prettier、契约准备及测试均通过。

## 实页验收

- 使用真实后台会话检查`/admin/notifications`、`/templates`、`/platforms`、`/deliveries`和顶栏通知Popover。
- 覆盖1440px桌面、390px窄屏、浅色和深色；检查未读徽标、单条/全部已读、策略规则、模板事件/平台/语言切换、变量和安全预览、平台状态及投递状态。
- 首次手机模板检查发现工具栏被拉伸且sticky保存栏遮挡，改为自然高度与静态保存栏后复验。页面无`pageerror`、无原生弹窗。
- 验收用临时通知、投递和会话已删除；未修改真实内容、WordPress或SMTP配置，未发送真实外部通知。

## 未实现

- 用户偏好、免打扰、摘要、退信抑制、模板导入导出、人工处理未知投递。
- 短信/Webhook/消息总线内置示例与配置界面、通用手机号Endpoint、邮箱验证。
- 可编辑HTML邮件、投递记录分页与超过最近50条的浏览。
