# Everunfold Frontend

Everunfold 博客重构的独立前端仓库，使用 Next.js App Router、React 和 TypeScript。
当前阶段仅交付可运行的项目骨架与开发规范，首页为开发占位页。

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

开发页：[http://127.0.0.1:3000](http://127.0.0.1:3000)。默认只监听本机。
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

`npm.cmd run check` 合并执行 lint、类型和格式检查；构建独立运行。
`npm.cmd run format` 格式化代码和工具配置，不修改保存的设计基线。
当前无业务逻辑，尚未建立业务测试套件；后续功能按对应验收用例增加测试。
CI 使用相同的检查与构建命令。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `src/app/` | App Router 路由和当前开发占位页 |
| `src/core/` | 预留后端客户端、公开快照与可信渲染基础设施 |
| `src/themes/` | 预留可信主题；当前占位页不是最终主题 |
| `src/custom_pages/` | 预留代码定义的自定义页面 |
| `src/plugins/` | 预留随构建部署的可信扩展 |
| `src/generated/` | 预留由后端发布契约生成的类型/客户端 |
| `deploy/`、`tests/` | 预留部署资料与测试 |
| `docs/` | 基线、规范、决策和交接 |

## 当前边界

- 已有：最小页面、TypeScript 严格检查、ESLint、Prettier、锁文件与 CI。
- `config.example.toml` 保存规划中的服务端配置结构，当前**没有 TOML 加载器**，复制模板不会启用任何服务。当前页面无需后端或数据库即可运行。
- 后端 API 客户端、开发代理、认证、编辑器、内容渲染、公开快照、内部缓存回调及镜像均未实现。
- 正式业务路径遵循后端 `/v1/*`；生产浏览器直接访问配置中的后端地址。后续如增加开发代理，`/api` 只作为开发入口。
- 前端只消费后端版本化契约，不能手工建立另一套业务字段定义。内部凭据、`backend` 对象及私网地址不能注入浏览器。
- 实际 `config.toml`、环境文件、运行缓存、原始 WordPress 数据和密钥均不提交。

依赖选择参考 [Next.js 官方安装文档](https://nextjs.org/docs/app/getting-started/installation) 与 [支持策略](https://nextjs.org/support-policy)。
本次选用 Next.js 16.4.3（16.x Active LTS）和 React 19.3.1；TypeScript 使用 5.9.3，便于与当前 Next.js/ESLint 工具链共同验证。

当前 Next.js 规则包依赖的 React / JSX a11y 插件只声明兼容到 ESLint 9，因此暂锁定 ESLint 9.39.5，未强制覆盖 peer 约束。
[ESLint 官方已将 9.x 标为停止维护](https://eslint.org/version-support/)；此开发工具兼容限制需在插件支持新版时单独升级验证。
