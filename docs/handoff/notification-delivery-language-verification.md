# 通知投递诊断与语言旗帜验收

版本：notification-delivery-language-verification-1，2026-11-11。

## 实际投递诊断

- 评论事件：`comment.pending_review:82f45269-587c-4639-b88a-ca4a4fe13457`，已记录`dispatched_at`。
- 通知路由：事件`comment.pending_review`，接收策略`permission=comments:moderate`，平台`email`，状态启用。
- 匹配接收人：`admin`。账号`email=""`。
- 投递：平台`email`，语言`zh-CN`，尝试1次，状态`suppressed`，错误`missing_recipient`，目标地址为空。
- SMTP：启用、服务器/发件地址/认证信息和密码均存在，`mail_ready=true`。

结论：事件生成、Worker、路由和SMTP配置均正常；邮件因接收账号没有邮箱而被抑制。系统不会把发件地址当作收件人或猜测邮箱。

## 界面修复

- 投递记录行内直接显示“接收账号尚未配置邮箱”，不再只放在鼠标`title`中。
- 当前账号投递提供“配置邮箱”链接到账号中心；管理员查看其他成员时可进入成员详情。
- 其他常见原因映射为SMTP未就绪、平台不可用、插件未同步和租约中断；未知错误保留稳定错误码。
- 投递语言使用共享`LanguageLabel`，显示旗帜和语言代码；通知模板语言选择继续使用相同旗帜组件。

## 恢复步骤

1. 在“配置邮箱”入口填写管理员账号邮箱并保存。
2. 重新提交一条评论。通知按新事件生成新投递；既有`suppressed`记录不会自动重试。

## 检查

- lint、TypeScript和格式检查通过。
- 真实后台页面在1440px检查：抑制原因与“配置邮箱”入口可见，语言旗帜和`ZH-CN`可见，模板语言下拉旗帜可见。
- 浏览器结果无`pageerror`、无原生弹窗。
- api、worker、scheduler、receiver、proxy、frontend全部组件已重启，四端口和健康检查保持正常。
