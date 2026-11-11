# 通知模板代码编辑器与 HTML 邮件验收

版本：notification-html-template-verification-5。日期：2026-11-11。后端HTML开关提交`a592e1c`、前端实现见STATUS。未向外部邮箱发送邮件。

## 已实现

- 通知模板正文由普通多行文本框改为共享编辑器；纯文本和 HTML 源码使用`CodeEditor`。
- 邮件平台使用独立“启用 HTML”开关；关闭时编辑纯文本，开启后可切换“可视化预览 / HTML源码”，关闭不会删除HTML内容，首次启用时从现有纯文本生成安全段落。
- 默认邮件模板改为后台风格的简约图形卡片：中性背景、细边框、小图形标识、评论摘要和单一操作入口。
- 可用变量插入当前代码编辑器光标位置；示例人物变量由“小林”改为“小灵”。
- 变量填充独立为右侧组件，只更新预览值，不修改模板源码；编辑器始终保留 `{{actor.name}}` 等占位符。
- “可视化预览”直接渲染当前HTML源码，与最终邮件共用同一份内容和清洗链路；下方不再维护重复“安全预览”。
- 后端对 HTML 变量值先转义，再过滤脚本、表单、iframe、SVG、事件属性和活动 URL。
- 邮件以`multipart/alternative`发送，纯文本正文始终保留为回退，HTML 为可选展示版本。

## 检查结果

- `notifications-v1 1.2.0`固定到后端提交和摘要；数据库已有 `notification_templates.html`，无新增迁移。
- 后端完整真实数据库套件：350 passed，352.74秒；Ruff、格式、`mypy app`通过。
- 前端`npm run check`：370 passed；`npm run verify:admin`生产隔离矩阵通过。
- 定向测试验证 HTML 注入值转义、脚本/事件属性清理、SMTP 多部分 MIME 和纯文本回退。
- 1440px与390px实页检查：HTML源码编辑器1个、可视化预览iframe1个、重复“安全预览”数量为0；“小灵”可见、旧“小林”不可见，无水平溢出和`pageerror`。
- HTML开关关闭后预览iframe数量为0、纯文本代码编辑器1个；再次开启后原HTML模板仍存在，内容未丢失。
- 将变量 `actor.name` 填为“测试用户”后预览立即更新，切回源码仍为 `{{actor.name}}`，未写入“测试用户”，模板保持同步状态。
- 保存链路使用浏览器请求夹具确认提交 `html`，未改开发环境中的真实通知模板。

## 证据

- [HTML 模板编辑器](../design/notification-html-template-editor.png)
- [默认简约邮件模板](../design/notification-default-email-template.png)
- `var/notification-template-qa/desktop-html.png`
- `var/notification-template-qa/mobile-html.png`
- `var/notification-template-qa/iframe-only.png`

## 边界

- HTML 仅适用于邮件平台；站内通知继续使用纯文本，不执行邮件 HTML。
- 清洗保证主动脚本和常见活动属性不进入生成 HTML，但邮件客户端对 CSS 的支持仍可能不同。
- 外链图片由邮件客户端直接加载，系统不代理或缓存。
