# Everunfold Frontend

新 Docker 设备运行方式见[容器开发部署指南](docs/development/container-deployment.md)：当前本地联调通过 `http://127.0.0.1:3000` 访问，监听仍为 `0.0.0.0`；Nginx 统一转发页面、API 和 WebSocket，Next 开发进程在 3100。当前状态以最新交接为准。

当前功能联调仅展示新后台发布的测试文章/说说；旧 WordPress 试导入内容已撤回。开发工具与恢复边界见 [内容管理指南](docs/development/content-management.md)。

Everunfold 博客重构的独立前端仓库，使用 Next.js App Router、React 和 TypeScript。
当前已实现公开阅读前台、真实账号登录和独立后台工作台：星空背景、紫色 Argon 风格两栏、二级导航，首页整卡点击、文章头图/普通页面、归档、分类、标签、搜索、分页和目录。历史评论来自真实公开快照；其点赞已接后端真实确认与匿名持久状态。评论回复/预览/表情及添加到本页仍是明确标注的界面演示，不会发布到后端；示例留言不支持真实点赞。

`/login` 直接连接配置的 FastAPI，使用 HttpOnly Cookie Session、CSRF、提交中/失败/重试和减少动态策略。后端确认管理员后进入 `/admin` 工作台、注册式文章/说说草稿管理、媒体库与设置页面；共用持久布局、可收起侧栏、手机抽屉与独立外观。内容支持独立页面编辑/预览/发布/撤回/回收/恢复与同步状态，媒体支持多文件上传、元数据与基础图片处理。管理路由与公开博客分离，无公开快照也能载入匿名身份确认界面，网络失败不能以旧身份放行。

认证入口背景使用完整柔焦的星空营地场景：高密度星空、远山、松林、帐篷和篝火共用同一景深，卡片保持清晰。完整动态下星层漂移、亮星闪烁、流星划过，并伴随火光呼吸、火星和萤火；减少动态时只保留静态背景。

原 WebM 星空、顶栏和侧栏常驻，站内导航/搜索只切主体，带进度与入场反馈。默认完整动效；右下阅读设置保存字体/字号/圆角/阴影/滤镜及背景播放偏好，背景开关位于设置内。组件和十二个职责样式见 [前台架构](docs/architecture/frontend-ui.md)，最新验证见 [前台功能记录](docs/handoff/frontend-interaction-verification.md)。文章/说说后台类型来自后端注册契约；前台已移除硬编码说说并读取后端正式发布内容，尚未实现说说历史导入。运行与发布步骤见 [内容管理指南](docs/development/content-management.md)。

先阅读 [文档入口](docs/README.md) 和 [当前交接状态](docs/handoff/STATUS.md)，再继续开发。
历史设计与当前实现状态分别记录，原始基线文档中的示例不代表功能已经实现。

## 本地开始

在本项目根目录运行。当前工具链使用 Node.js 22、npm 10，本机已验证版本为 Node.js 22.15.1 / npm 10.9.2；依赖精确锁定在 `package.json` 和 `package-lock.json`。

Windows PowerShell：

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run dev
```

macOS / Linux：

```bash
npm ci --ignore-scripts
npm run dev
```

直接运行时的开发页：[http://127.0.0.1:3000](http://127.0.0.1:3000)，默认监听 `0.0.0.0`。当前容器部署由反向代理占用 3000，Next 使用 3100，按上述容器指南启动。
管理员入口：[http://127.0.0.1:3000/login](http://127.0.0.1:3000/login)。首次管理员由后端 `init.database.py` 创建；本地默认凭据的适用范围和覆盖方式以后端交接为准，不能用于生产部署。
本机 `config.toml` 和公开快照已经准备好；后端地址按用户要求为 `http://127.0.0.1:8001`。新环境需填写实例配置、显式迁移数据库并启动内容/设置接收链路，后台发布或重新同步可生成公开版本；历史导入仍需单独执行，见 [公开阅读运行指南](docs/development/public-reading.md)。缺失/无效快照返回 503，确认不存在的内容返回 404，不使用虚构内容填充。
安装时禁用依赖生命周期脚本；当前 Next.js 所需的预编译包仍由锁文件安装。
后续依赖如确需安装脚本，应审查用途并同步说明，不应直接全局解除限制。

## 检查与构建

Windows 使用 `npm.cmd`；下方命令在其他平台用 `npm`：

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
npm.cmd run start
```

`npm.cmd run check` 合并执行 lint、类型、格式检查与单元测试；构建独立运行。
用户正在运行 next dev 时，用 `npm.cmd run verify:production` 在独立临时副本验证默认生产构建，保留热更新且不覆盖当前 `.next`；停止开发服务后才直接使用普通 build。
`npm.cmd run verify:reader` 额外启动隔离的 Next/FastAPI 进程，检查真实公开阅读、离线快照及管理入口隔离。登录页实际联调记录见 [前端认证验收](docs/handoff/authentication-frontend-verification.md)。
`npm.cmd run format` 格式化代码和工具配置，不修改保存的设计基线。
测试覆盖配置、快照路径约束、安全 HTML/媒体渲染、查询与评论纯文本等基础行为；后续功能按对应验收用例扩展。
CI 使用相同的检查与构建命令。

生产服务启动后，在另一终端执行 `npm.cmd run verify:http -- http://127.0.0.1:3000`，检查真实页面、分页、评论、404、ready 和背景资源。它是 HTTP 检查，不代替浏览器视觉和交互验收。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `src/app/` | 薄 App Router 路由、错误/空/加载状态 |
| `src/core/` | 服务端配置、快照验证、公开查询与安全渲染 |
| `src/themes/argon/` | 可复用主题组件和样式；不混入数据库访问 |
| `src/custom_pages/` | 预留代码定义的自定义页面 |
| `src/plugins/` | 预留随构建部署的可信扩展 |
| `src/generated/` | 后端快照契约生成类型、Schema 与来源提交/哈希 |
| `deploy/`、`tests/` | 预留部署资料与测试 |
| `docs/` | 基线、规范、决策和交接 |

## 当前边界

- 已有：公开阅读页面、严格类型、配置加载、快照验证、HTML/Markdown 安全渲染、主题组件、测试及 CI。
- 已有：`auth-v0.1` 生成客户端、真实登录/退出、管理员 Session 校验、CSRF/Cookie 跨源流程、`/login` 与简要 `/admin`。
- `config.example.toml` 是实例配置结构参考；加载器显式读取 `config.toml` 或 `CONFIG_FILE`，不自动把示例当默认。`backend` 仅服务端；内部令牌只保留结构，当前不运行内部监听。
- 页面按请求读取完整本地公开快照，不设置时间 TTL、不每次访问回源。当前更新方式是后端显式导出并原子替换文件，尚未实现完整 ICP 回调/撤回可靠投递或镜像。
- 文章/说说已有基础草稿 CRUD、Markdown 编辑/预览、版本冲突保护和回收站；媒体库与基本设置已接真实持久接口。正式内容发布/分发、完整页面注册、用户管理、改密/找回、协同编辑、开发代理和 CDN 插件尚未实现。
- 正式业务路径遵循后端 `/v1/*`；生产浏览器直接访问配置中的后端地址。后续如增加开发代理，`/api` 只作为开发入口。
- 前端只消费后端版本化契约，不能手工建立另一套业务字段定义。内部凭据、`backend` 对象及私网地址不能注入浏览器。
- 实际 `config.toml`、环境文件、运行缓存、原始 WordPress 数据和密钥均不提交。
- 文章媒体 `public/uploads/wordpress/` 与 `var/public-snapshots/` 是本地生成数据，不提交；`public/reference/` 保存必要主题资产与来源说明。
- 前台动效阶段已在内置浏览器完成视频、软导航、目录、主题、手机侧栏/Esc 与截图检查；所有真机和系统设置仍需逐步覆盖。旧阶段访问失败记录保留为历史。

依赖选择参考 [Next.js 官方安装文档](https://nextjs.org/docs/app/getting-started/installation) 与 [支持策略](https://nextjs.org/support-policy)。
本次选用 Next.js 16.4.3（16.x Active LTS）和 React 19.3.1；TypeScript 使用 5.9.3，便于与当前 Next.js/ESLint 工具链共同验证。

当前 Next.js 规则包依赖的 React / JSX a11y 插件只声明兼容到 ESLint 9，因此暂锁定 ESLint 9.39.5，未强制覆盖 peer 约束。
[ESLint 官方已将 9.x 标为停止维护](https://eslint.org/version-support/)；此开发工具兼容限制需在插件支持新版时单独升级验证。

后台界面与验证入口见 [后台工作空间](docs/development/admin-workspace.md)。运行 `npm run verify:admin` 可在独立构建中检查私有路由响应，不影响开发服务。

基本站点/主题/系统设置已接入真实 FastAPI 保存与节点应用状态，操作及接收器启动见 [设置运行指南](docs/development/settings.md)，范围与离线验证见 [设置验证记录](docs/handoff/settings-verification.md)。

文章与说说独立入口、示例草稿和开发边界见 [内容管理](docs/development/content-management.md)，当前新增内容保存为私有草稿，不会自动出现在公开首页。

最新编辑器提供顶置标题、根级固定链接、混合 Markdown/HTML 多块、分类标签/封面/SEO/评论设置、文章密码与定时开放；日期控件和后台面板已统一，逐组件浏览器检查为开发约定。版本与结果见 [编辑工作台验收](docs/handoff/editor-workspace-verification.md)。
