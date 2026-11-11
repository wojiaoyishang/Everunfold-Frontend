# 通知间距、登录态评论与主题资产清理验收

版本：theme-asset-cleanup-verification-1，2026-11-11。主题资源决定见[ADR0114](../decisions/0114-theme-owned-assets-and-legacy-cleanup.md)。

## 已完成

- 通知策略和模板页面统一使用顶部内容间距容器；筛选区、平台选择、编辑面板和保存栏保持18px垂直节奏。
- 已登录访客进入评论表单时，自动使用账号`display_name`（为空时使用用户名）作为评论昵称；昵称、邮箱和网站输入不再渲染，并显示账号身份说明。匿名访客保留完整身份表单。
- Argon/Paper主题的35个视觉资产已迁入各主题`assets`：1个WebM、2个WebP、2个SVG和30张贴纸，共1,997,320字节。
- 全局主题专属资源路径已替换为`/themes/argon/...`。旧设置路径保留Argon读取兼容，后台再次保存主题设置时归一为新路径。
- `tools/theme-assets.mjs`把主题assets派生到`public/themes/<主题ID>`；该目录由Git忽略，源文件只在主题目录维护。Next代理显式放行`/themes/`，不会把静态资源当文章404。
- 主题依赖扫描发现两个无引用后台组件：`collection-toolbar.tsx`、`preparation-state.tsx`。两文件已删除，并移除`admin-collection-toolbar`、`admin-segmented`、`admin-preparation`、`admin-empty-icon`、`admin-media-collection`等专属死样式。

## 验证

- `npm run check`：370项测试通过；lint、Next/TypeScript、Prettier、扩展构建、契约准备和主题资产准备均通过。
- 主题自有资产完整性测试逐字节核对`sources.json`中的SHA256。
- 实际请求`campfire.webm`、`campfire.webp`、`night-camp.webp`、两张预览SVG和贴纸均返回HTTP 200；视频分段请求返回206，媒体类型正确。
- 真实登录态浏览器检查：通知策略/模板间距已生效；主题设置显示两张主题预览图；文章评论表单显示“昵称已自动填写为 admin”，昵称和邮箱输入数量均为0；无`pageerror`、无原生弹窗。
- 六个运行时组件已全部重启，API/Worker/Scheduler/接收器/代理/前端保持运行，四端口监听和健康检查通过。

## 保留与边界

- `public/reference/sources.json`和`yishang-avatar.jpg`属于站点全局参考来源，不属于Argon/Paper主题，本轮未移动。
- 主题asset目录当前按可信源码处理；不允许符号链接。运行生成目录不提交Git。
