# ADR 0022：后台导航注册与轻量动效

日期：2026-11-01。来源：用户要求后台切换也有动画，并提出前端注册大部分菜单、后端通过挂钩显示特定页面。

状态：前端导航注册及动效已实现；后端挂钩仅设计，未新增 API/数据库/插件执行能力。

## 决定

1. 用显式可信模块组合替代单一导航数组。注册表只含可在服务端与浏览器共同使用的页面元信息；Next 路由和主题组件仍由实际代码提供。桌面/移动菜单、面包屑和安全返回路径使用同一份目录。
2. 装配时检查命名空间、重复条目/路径、分组及规范路径，产生冻结只读结果。不用按请求改变全局注册表的副作用式 register，不将注册状态当作授权。
3. 后端将来通过唯一模块装配入口登记页面声明提供器，鉴权后输出已知页面 ID 和受限展示描述。浏览器只映射到打包的可信组件，不执行数据库或接口返回的脚本。契约必须由后端发布再生成前端；详见 [注册设计](../architecture/admin-navigation.md)。
4. 后台保持简洁专业：页面区块约 300ms 淡入/轻移，最多 95ms 错峰；侧栏宽度、内容偏移和导航选中背景约 240ms 过渡；按钮/快捷入口轻微按压和悬停反馈。移动抽屉在支持的浏览器通过原生离散过渡出入，保留原生 Escape、焦点与滚动恢复。
5. 导航 pending 复用 Next 的 `useLinkStatus`，从封装 `RouteLink` 显示局部圆环及顶栏细线；只延迟视觉提示 120ms 避免快速请求闪烁，不延迟实际导航，不伪造百分比，不隐藏未完成请求期间的旧页面，也不保存旧私有页面副本。
6. 浏览器实测 `prefers-reduced-motion: reduce` 为真，旧后台因完全跟随系统而没有动画。按用户本轮明确希望动画的要求，后台外观新增独立 `motion: full/system/reduced`，默认 full（界面名称“轻量动效”）；用户可改为跟随系统或减少动态，且在后台偏好中保存。显式 reduced / system+系统 reduce 均停用移动/旋转动画，以静态状态反馈加载。未确认身份的访问检查仍跟随系统。

## 更新既有决定

本 ADR 替代 admin-ui-2/admin-workspace-1 中“后台只跟随系统减少动态”的限制；前台阅读设置和登录成功交接策略不变。后台独立外观存储仍为 v1 命名空间，新增字段向后兼容：旧记录缺字段时取 full，损坏/未知值经白名单清理，身份/权限不会写入其中。

注册表没有引入新的后端事实来源，也没有实现动态参数路由、后端扩展 provider 或媒体/内容管理。原始 v2.11/v0.14、auth-v0.1、development-5、依赖及锁文件保持不变。

## 官方实现依据

- Next.js 现装版本文档 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`；[官方 useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status)。
- [MDN dialog 过渡说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#animating_dialogs)：`@starting-style`、display/overlay allow-discrete；不支持时回退到原有打开动画/即时关闭，功能仍可用。

实际检查与限制追加至 [后台验证记录](../handoff/admin-workspace-verification.md)。
