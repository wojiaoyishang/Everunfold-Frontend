# Everunfold Frontend

Everunfold 博客与轻量 CMS 的前端仓库，使用 Next.js App Router、React 和 TypeScript。提供公开阅读、编辑后台、主题及独立插件运行时。

配套仓库 [Everunfold 后端](https://github.com/wojiaoyishang/Everunfold-Backend)。当前整理为预发布版本，配套提交、运行验证和已知限制见[预发布说明](docs/source/release/prerelease.rst)。

## 文档

- [本地快速开始](docs/source/welcome/quickstart.rst) · 初始化、配置和启动两端
- [运行与部署](docs/source/welcome/deployment.rst) · 连接、进程、代理与数据保留
- [前端开发参考](docs/source/frontend/index.rst) · 源码、扩展和检查
- [构建与发布文档](docs/source/release/documentation.rst) · Sphinx 本地预览与 GitHub Pages
- [历史设计索引](docs/README.md) · 基线、决策和交接

## 本地检查

Node.js 22 和 npm 10，具体版本见 `.nvmrc`。在仓库根目录执行：

```bash
npm ci --ignore-scripts
npm run check
npm run verify:production
```

首次启动需准备配套 FastAPI、实例配置和公开快照接收器。本地默认网页端口为 `3000`。运行中的开发实例可以保留，`verify:production` 在独立目录检查生产构建。 完整步骤见[快速开始](docs/source/welcome/quickstart.rst)。

## 目录

| 路径 | 职责 |
| --- | --- |
| `src/app/` | App Router 入口、公开阅读和管理路由 |
| `src/core/`、`src/server/` | 权限与业务适配、服务端配置、快照和接收处理 |
| `src/themes/`、`src/plugins/`、`src/sdk/` | 主题、独立扩展与宿主 SDK |
| `tools/`、`tests/` | 契约生成、构建、验证和测试 |
| `docs/source/` | 可发布的 RST 手册 |
