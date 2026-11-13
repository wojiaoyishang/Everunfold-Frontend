# 前端本机节点诊断

`/admin/_nodes` 默认关闭。页面和本机诊断接口在关闭时返回 404。公开页面、节点上报和同步接收器仍按本机服务端配置运行。

## 手工配置连接

从 [backend-node.example.toml](../../backend-node.example.toml) 复制一份 `backend-node.toml`，在前端 `config.toml` 的根级设置 `backend_node_file = "./backend-node.toml"`。相对路径以主配置所在目录为准。将原有 `BACKEND_BASE_URL`、`[backend]` 和 `settings.source_epoch` 移入选定的连接条目。如果由环境变量提供 `BACKEND_BASE_URL`，切换为独立文件前移除该环境变量。主配置继续维护 `FRONTEND_NODE_ID`、磁盘目录和接收器监听参数。原有内联配置仍可使用。

每个后端填写其实际来源 UUID。可从已鉴权的后端设置响应读取 `source_epoch`。在该后端登记相同的前端节点 ID、接收地址和双向 Token 引用。实际 Token 分别注入服务环境。跨设备内部 API 地址使用 HTTPS，接收器监听与白名单按实际来源部署。公开 API 地址和浏览器会话仍由后端的 HTTPS、Origin、CORS 与 Cookie 配置控制。

独立连接文件的 `active` 决定当前使用哪个后端。切换后重启独立接收器，然后在对应后端为该节点重新同步。公开内容按来源保存在缓存目录的 `sources/<source_epoch>` 下。首次采用独立文件时也要重发公开内容。该来源尚无有效副本时，公开页面会返回 503。

## 开启诊断

在前端主配置添加以下内容，并为 Next.js 进程注入独立签名密钥。

```toml
[nodes_monitor]
enabled = true
origin = "https://blog.example.com"
session_secret_env = "EVERUNFOLD_FRONTEND_NODES_SESSION_SECRET"
```

运行 `npm run nodes:password`，在终端输入自己设置的密码，将输出的 `password_hash` 加到 `[nodes_monitor]`。使用 `node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64url"))'` 生成会话签名密钥。前端各副本若服务同一个本机运维入口，须使用相同的本地配置及签名密钥。多个设备各自设置密码和密钥。只需在线诊断时可省略离线密码和密钥。

生产入口使用 HTTPS，并由受信代理保持正确的 Host 和协议。HTTP 调试入口只对本机回环开放。配置 Origin 必须与浏览器实际访问一致。前端直接访问公开 FastAPI 时，仍需配置该后端的允许来源及跨源 Cookie，建议使用同站 HTTPS 域名。

后端可达时，只有站点管理员可以读全站状态和修改本机活动连接。本机授权还要求此节点已经在后端启用，双向凭据有效，并且来源 UUID 匹配。后端无法连接时，本机密码只授权查看本机副本和切换预先登记的连接。页面每 15 秒重新检查，后端恢复后回到管理员鉴权。关闭入口后可以继续在文件中手动选择活动连接。

页面只修改 `active`。新增或修改连接、地址、IP 白名单和凭据引用仍在前端服务器手工操作。页面保存需要该文件所在目录可写，建议使用独立的部署配置目录，避免同时手工编辑。服务异常退出若留下 `.switch.lock`，在确认该节点已无写入进程后移除锁文件即可继续。
