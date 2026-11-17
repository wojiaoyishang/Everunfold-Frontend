# 工作台卡片与后台加载模板

版本：workspace-cards-1，2026-11-17。

工作台右上“自定义布局”进入草稿编辑。拖动手柄或上下箭头排序；底栏调整宽度；右上叉号移除，添加窗口重新放回。点击“完成布局”才存入当前账号，取消丢弃本次调整。恢复默认也是草稿操作，仍需完成保存。两个标签同时编辑时后保存者收到冲突，刷新后重新修改。

时段选项影响访问趋势、热门榜和审计列表，累计榜保持总量。日报以 UTC 自然日聚合，操作时间按浏览器时区展示。新增统计从迁移日起积累，历史累计量不等于历史日报总和。

## 注册插件卡片

主程序在 `src/core/workspace/registry.ts` 声明；插件通过公开 SDK，在 plugin.ts 的同步 setup 中注册。定义只含纯数据，不导入 React 或宿主私有目录。

```ts
import { definePlugin } from "@everunfold/plugin-sdk";
export default definePlugin({
  id: "example.tools", title: "示例工具", version: "1.0.0", surface: "admin",
  setup({ components, workspaceCards }) {
    components.register("example.tools.summary");
    workspaceCards.register({
      id: "example.tools.summary",
      label: "工具概览",
      component: "example.tools.summary",
      permission: "content:read",
      icon: "grid",
      width: 3,
      defaultVisible: false,
    });
  },
});
```

id 与组件名必须以插件 ID 加点开头；组件需要同插件声明。宽度只接受 1、2、3、6，分别是小、三分之一、半行、整行。defaultVisible 默认为 true，仅影响尚未自定义的默认布局；通常扩展卡片设为 false，让用户主动添加。不修改已有 ID 来强行重置布局。权限不足或插件禁用时隐藏显示，宿主保留用户布局中的位置。

```tsx
import type { WorkspaceCardProps } from "@everunfold/plugin-sdk";
import { AdminLoadingState, RouteLink } from "@everunfold/plugin-sdk/client";
function Summary({ data }: WorkspaceCardProps) {
  if (!data) return <AdminLoadingState compact />;
  return <RouteLink href="/admin/content/article">草稿：{data.drafts}</RouteLink>;
}
export default { "example.tools.summary": Summary };
```

组件收到 cardId、days、data（WorkspaceSummary）、analytics（WorkspaceAnalytics）、refreshing。异步数据可能为 null。复用宿主卡片外壳，不另写整张卡片的 padding 或编辑控件；内部合理使用自身排版。后台跳转使用 RouteLink，前台阅读导航才用 AppLink。不要把鉴权数据放到公开页面或缓存；插件自己的请求仍需登录、CSRF 和业务权限。

第一方 `src/plugins/ai-writing` 提供可添加的完整示例。修改 SDK 后重启开发协调进程；发布时同时构建主体和插件 `npm run build`，或分开执行 `npm run build:host`、`npm run plugins:build`。

## 共享加载与排序

后台初次读取统一使用 AdminLoadingState；label 仅作读屏状态，视觉为进度动画，compact 用于卡片/局部区域。保留原有内容的后台刷新不应抹掉内容，错误和空结果分别表达。避免页面自己添加“正在读取…”段落或定时模拟百分比；组件遵循减少动态偏好。

程序从 `themes/argon/admin/components/loading-state` 导入，插件从 SDK/client 导入。普通排序列表使用 `themes/argon/components/ui/reorder-list` 的 ReorderList；网格卡片共享其中的 ReorderButtons，必须传 label 和首尾状态保证键盘和读屏可用。
