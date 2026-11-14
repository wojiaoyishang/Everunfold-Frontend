# ADR 0148 · 后台插件页面与菜单

日期 2026-11-14。扩展 [后台字段钩子与 AI 写作](0147-admin-form-hooks-and-ai-writing.md)。用户要求插件配置可以从左侧菜单打开独立页面，也可沿用插件卡片上的配置弹窗。

后台插件在同步的 `setup` 中用 `adminPages.register` 关联页面 ID、已登记的组件、现有后台权限和菜单位置。菜单可以放进宿主分区，或用 `adminPages.registerGroup` 声明插件自己的分区。设置 `parent` 可在宿主分区下生成可折叠菜单组。桌面侧栏与手机导航使用同一组已按权限过滤的条目。页面地址为 `/admin/plugins/<插件 ID>/<页面 ID>`，由已确认会话的后台工作台解析。菜单声明只控制界面，插件业务接口继续执行自己的权限校验。

AI 写作助手的独立配置页来自插件自己的注册声明，放在「设置」分区。插件列表保留右侧配置按钮，弹窗与独立页复用同一配置组件及后端数据。前后端各自打包相同的扁平 WebP 特色图，后台可按部署来源读取相应资源。

```ts
components.register("example.writer.settings");
adminPages.register({
  id: "settings",
  label: "写作设置",
  component: "example.writer.settings",
  permission: "settings:write",
  menu: { group: "core.settings", order: 25 },
});
```
