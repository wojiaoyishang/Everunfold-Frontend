# 通知策略用户选择器与快速导航验收

版本：notification-policy-user-picker-verification-4。日期：2026-11-11。对应[ADR0118](../decisions/0118-account-user-picker-and-policy-navigation.md)。

## 交付范围

- 新增共享`AccountUserPicker`，按姓名、用户名、邮箱或完整 UUID 搜索启用账号。
- 选择结果显示头像、显示名称、用户名、ID 前缀和完整 ID提示；通知策略保存稳定 UUID，不保存用户名或显示名称。
- 没有`users:manage`时保留手工稳定 ID 输入，不扩大账号目录读取权限。
- 通知策略四个事件卡加入稳定锚点；桌面右侧快速导航按“通知事件”生成，点击后滚动并聚焦目标卡片。
- 手机端隐藏快速导航，用户选择与接收规则保持单列并使用视口内弹层。

## 检查结果

- `npm run check`通过，包含lint、Next/TypeScript、格式、扩展构建和370项测试；`npm run verify:admin`生产构建及后台路由隔离矩阵通过。
- 真实后台验证姓名搜索、选择回显、完整 UUID 精确搜索、Escape关闭、快速导航链接和事件卡焦点。
- 修复用户弹层打开后重复刷新：翻译函数和打开回调不再作为不稳定的搜索副作用依赖，回调只在实际开关弹层时触发；输入不会在每次渲染后被清空。
- 请求计数验证弹层首次打开只发送1次目录查询，输入`admin`后只新增1次过滤查询；分别等待900ms后请求数保持不变，搜索框内容保持`admin`。
- 触发框固定为42px，与相邻下拉框实测41.69px误差小于1px；20用户夹具下桌面弹层高320px、结果区250px并独立滚动，移动端结果区不超过240px，弹层始终留在760px视口内。
- 用户行不再设置54px最大高度或裁切内容，改为按名称、账号邮箱和稳定ID三行自然撑开；桌面与手机实测行高61px，`scrollHeight`不超过`clientHeight`，稳定ID底边保留至少5px内边距。
- 1440px桌面显示“快速导航”，四个事件均可定位；390px无横向溢出，关闭后的用户弹层不占页面宽度。
- 验收未点击保存策略，通知写请求为0，无`pageerror`或原生弹窗。
- 临时QA会话已撤销。

## 证据

- [用户搜索与稳定 ID](../design/notification-policy-user-picker.png)
- [移动端限高与独立滚动](../design/notification-policy-user-picker-mobile.png)
- [通知策略快速导航](../design/notification-policy-quick-navigation.png)

## 边界

- 本组件依赖账号目录，不提供新的公开用户搜索接口。
- 目前只用于通知策略“指定用户”；其他业务可在保持相同回调值时复用。
