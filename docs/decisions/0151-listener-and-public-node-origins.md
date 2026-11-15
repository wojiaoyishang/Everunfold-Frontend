# ADR 0151 · 后端监听与节点公开地址

更新：后端向导省略发布 URL 的建议已由 [ADR 0152](0152-published-urls-and-listeners.md) 取代。后端自身发布 URL 继续用于拼接公开资源链接，与监听和前端节点清单分别配置。

后端 Docker 向导只设置监听、宿主发布、基础连接和凭据。前端公开地址、启停状态在受保护的 `/_nodes` 控制台维护并写入 PostgreSQL。部署人员通过 `tools.import_frontend_nodes --bind` 登记内部接收地址和令牌引用，无需在文件里预填节点公开地址。既有 TOML 导入方式仍可使用。

启用 `[cors].use_frontend_registry` 后，只追加已绑定且启用节点的精确公开 Origin。HTTP 预检和写入、点赞及协作连接共用这项判定。现有显式 Origin 继续生效。节点禁用或公开地址修改后，新请求读取当前清单。接收器地址与浏览器 Origin 的权限独立。

后端公开 API 根地址可以省略。此时认证 Cookie 保持 Secure，媒体默认从同源 `/media` 提供，第三方签名查询需要另设绝对 API 根地址。节点控制台启用时独立配置运维 Origin。HTTPS 由反代终止时，只有明确登记的直接连接代理 IP 可以提供控制台的 HTTPS 协议标记，Host 仍须匹配配置。
