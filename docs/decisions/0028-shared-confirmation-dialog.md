# ADR 0028：共享确认弹窗

状态：已实现；2026-11-01。来源：用户要求点击删除后弹窗提醒，并封装为全局可复用组件。继承 ADR 0012 的控件边界，更新 ADR 0027 的删除确认展示，删除业务规则及后端契约不变。

关闭/成功生命周期与交互动效已于同日由 [ADR 0029](0029-interaction-motion-lifecycle.md) 细化，以下示例已更新。

## 决定

- 共享入口为前端 `src/themes/argon/components/ui/confirm-dialog.tsx` 的 `ConfirmDialog`，随 shared.css 加载样式。公共页、后台及可信插件均可显式导入，继承所在展示区的主题变量；不引入全局命令总线或第二套请求状态。
- 组件接收受控 `open`、标题、说明、图标、普通/危险意图、确认/取消文案，以及 `busy`、`confirmDisabled`、`error`、内容/辅助动作插槽。业务调用者提供确认和取消动作；`onConfirm` 返回成功布尔值，成功后的关闭/导航放在退场后执行的 `onConfirmed`。异步确认期间统一锁定动作和选项，阻止重复点击；意外拒绝显示通用错误，正常业务错误由调用者提供。
- 开始渲染即打开也必须等到水合完成再创建 Portal。底层复用封装 Dialog 与共享 `useDialogSurface`，使用原生顶层模态、读屏标题/描述、默认聚焦取消、关闭恢复触发点。Escape/遮罩事件不冒泡到下层详情；处理中不能通过取消、Escape 或遮罩关闭。
- 样式采用紧凑居中布局、双向淡入/淡出与位移动画和柔化遮罩，手机限宽/限高，遵循减少动态偏好。动作按钮继续使用封装 Button，危险色属于语义色。
- 媒体库点击「删除文件」打开此弹窗，显示资源名称、删除实际文件/安全删除选项，以及后端预览的范围；读取失败在弹窗内展示错误并提供重新读取。没有有效预览不能确认；重试仍使用既有固定操作 ID 与范围摘要。
- 每次重新打开恢复安全初值：普通记录默认可恢复删除，回收站记录默认实际删除，安全删除始终默认开启；已有待恢复删除以服务端返回的冻结范围为准。
- 「放弃未保存修改」同时复用该组件，说明文案和动作由附件编辑页提供；继续编辑保留草稿。

## 使用约定

```tsx
<ConfirmDialog
  open={confirmOpen}
  title="确认这次操作？"
  description="简要说明实际影响。"
  intent="danger"
  confirmLabel="确认操作"
  error={requestError}
  onCancel={() => setConfirmOpen(false)}
  onConfirm={() => executeAction()} // Promise<boolean>；失败返回 false
  onConfirmed={() => setConfirmOpen(false)} // 退场完成后执行
/>
```

这是展示层组件，不执行鉴权、读取影响范围或决定删除对象；这些仍由 core 用例与后端负责。组件仅将 `true` 视为确认成功；返回 `false` 或抛错保持打开。`onConfirmed` 必须完成受控关闭或导航，取消回调同样等待退场。操作进行中如业务强制卸载，组件不会自行重发或取消已受理请求。

## 验证范围

- 浏览器验证了独立弹窗、默认取消焦点、Escape/遮罩仅关闭顶层、回到删除按钮、安全/整组范围文案、重新打开的安全初值；未对既有用户文件执行实际删除。
- 1280px 桌面及 320px 窄屏验证无横向溢出，未保存修改的取消保留临时草稿，测试后恢复原输入。截图见 [桌面](../design/media-removal-confirm-dialog.png) 与 [手机](../design/media-removal-confirm-mobile.png)。
- 服务端渲染回归覆盖初始 open=true/false，不访问 DOM 或执行动作；检查及构建的最终结果见两仓库 STATUS。未新增依赖、API、数据库迁移，不重复变更已验收的删除业务。
