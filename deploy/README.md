# 容器开发部署

当前实例通过同级后端仓库的 Supervisor 统一管理，操作见[容器部署指南](../docs/development/container-deployment.md)。前端仓库保持独立，不复制后端启停脚本；直接运行 `npm run dev/start` 监听 `0.0.0.0`，容器部署另传 `--port 3100`，公开 HTTP 入口由 Nginx 使用 3000。

`config.toml` 和运行缓存按实例提供，不进入 Git。开发额外允许的主机由 `EVERUNFOLD_DEV_ALLOWED_HOSTS` 明确指定，未设置时不扩展 Next.js 的开发来源名单。
