# 前端本机节点配置

`/admin/_nodes` 默认关闭。在项目根运行 `./setup.sh`，启用“节点控制台”并设置本机配置密码和会话密钥。入口跟随 `PUBLIC_SITE_URL`；生产使用 HTTPS。全站状态仍须后端管理员，本机配置密码可在后端在线、离线、403/500 或网络失败时使用。

## 配置位置

外部环境变量 `CONFIG_FILE` 指定唯一部署文件，默认项目根 `config.yaml`。相对路径基于项目根，缺失即报错，不回退查找。setup、浏览器编辑、Node 接收器和上报服务共用此 YAML。Docker 助手显式挂载其所在目录到 `/config`，前端可写；原生可通过 `export CONFIG_FILE=/绝对目录/config.yaml` 选择位置。页面只在本机密码验证后显示文件的绝对路径。

## 新增与修改

解锁后选择已有连接或“新增连接…”，填写节点 ID、后端发布 URL、内部 URL、来源 UUID、允许后端调用前端的 IP/CIDR 和双向令牌。公开地址与内部地址分开；内网可用容器别名及 HTTP。令牌须与后端导出一致，原文不从接口回显，编辑时留空保留。

“保存并使用”写回 YAML 的 `connection_profiles` 和 `environment`；最多 16 个连接，保留其他条目。成功后页面保留并显示路径，重启前端进程或容器加载接收身份，无需重新编译。切换来源时内容缓存按 `sources/<source_epoch>` 隔离；首次从内联转换后从后端重新同步。接收器发现身份或凭据变化后拒绝处理，直到重启。

保存使用 0600 临时文件、独占锁、修订检查和原子替换。只读挂载、UID/GID 无权限、单文件 bind mount、磁盘空间不足或并发修改会显示具体原因。配置目录必须可写，不要求源码目录可写。setup 也使用相同锁和文件；异常遗留 `.switch.lock` 时，确认没有写入进程后再移除。

## 旧 TOML

显式 `CONFIG_FILE=/绝对路径/config.toml` 可继续读取旧配置及 `backend_node_file`，已有切换入口保留。浏览器新增/编辑要求部署 YAML：先由 setup 导入并保存，再切换 `CONFIG_FILE`，重建新版前端产物并启动。不要修改派生的 `config.runtime.toml`。

后端节点连接通过 Base64 交接。`connection-bundle.ts` 在本机编辑器中有界解码并校验协议版本、地址、UUID 与双向令牌，只填入表单；保存复用原有鉴权、修订锁和原子写入。编码不放进 URL 或日志，不影响容器内部地址/来源列表。setup 支持相同格式和旧 JSON 兼容导入。

2026-11-16 修复 ESM/CommonJS 配置模块重复载入导致 YAML 令牌在上报进程中丢失的问题，升级后重新构建前端产物一次。`inventory_token_missing` 日志包含 `config_file` 和 `token_env`，可核对实际挂载、导入保存和外部环境覆盖。前端的 `PUBLIC_SITE_URL` 通过已鉴权的上报同步到后端，无须在后端节点页重复填写；后端保留来源 IP、令牌、节点登记及启停校验。见 [ADR 0165](../decisions/0165-pairing-runtime-and-frontend-origins.md)。
