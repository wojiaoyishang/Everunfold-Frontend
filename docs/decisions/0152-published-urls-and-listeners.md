# ADR 0152 · 发布 URL、进程监听与宿主映射

状态：已采用。依据：用户明确要求后端保留独立发布 URL，用于生成资源链接；同时检查前端配置是否混淆。取代 ADR 0151 中后端向导省略发布 URL、默认依赖各前端同源 `/media` 的部署建议，保留其中数据库节点清单与来源校验的设计。

## 配置职责

- 后端 `BACKEND_BASE_URL` 是完整的对外发布根 URL，例如 `https://api.example.com`。资源 URL 默认由它与 `/media/<object_key>` 拼接；`[media].base_url` 可单独指定 CDN 前缀。发布 URL 不决定 Uvicorn 的绑定地址，也不随请求 Host、转发头或 Docker 映射推导。
- 后端进程由 `API_HOST`、`API_PORT` 监听；Compose 从 `.env` 的 `BACKEND_API_PORT` 注入容器端口，`BACKEND_BIND_ADDRESS` 与 `BACKEND_PUBLISH_PORT` 只决定宿主端口映射。
- 前端 `PUBLIC_SITE_URL` 用于本站 SEO、站点地图与订阅链接；`BACKEND_BASE_URL` 是浏览器 API 入口，与后端发布 URL 一致；`[backend].base_url` 是服务端连接后端的目标，允许独立配置。
- 前端 Web 监听由 `FRONTEND_HOST` 和 `FRONTEND_PORT` 控制；Compose 从 `.env` 的 `FRONTEND_WEB_PORT` 注入容器端口，`FRONTEND_BIND_ADDRESS` 与 `FRONTEND_PUBLISH_PORT` 决定宿主映射。接收器继续使用独立的 `FRONTEND_RECEIVER_HOST` 和 `FRONTEND_RECEIVER_PORT`。Web 健康检查跟随实际绑定 IP。
- 后端 `/_nodes` 管理多个前端的公开地址和启停；各前端的 `PUBLIC_SITE_URL` 与对应节点地址保持一致。后端私有绑定中的接收器目标 URL 与接收器自身监听地址分别配置。

## 向导与兼容

两端向导将发布 URL、容器进程监听、Docker 宿主映射分组，公开 URL 要求用户明确填写。生产使用 HTTPS，本地回环可用 HTTP；内网 HTTP 联调仍按已有配置规则手工启用。已有字段名称保持兼容，真实部署文件不覆盖。后端加载器继续兼容缺失发布 URL 的旧配置，但新的部署教程要求显式填写，并提供旧向导产物的补齐步骤。

域名及 API 地址从前端运行配置读取，修改后重新创建运行容器，不重新编译主体。发布 URL 变化还需更新反向代理和对应节点清单；主体、主题或运行脚本源码改变仍需构建新产物。

## 验证范围

检查向导真实终端交互与生成文件、Compose 端口和环境注入、后端媒体前缀及签名查询 URL、前端公开与内部地址隔离，以及现有生产产物在不同运行 URL 下的响应。具体检查结果与环境限制记录在两端交接状态。
