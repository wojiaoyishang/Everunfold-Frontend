# ADR 0159：部署助手复制、节点导入命令和容器互通

- 日期：2026-11-15
- 状态：已实现；本地回归结果见各仓库 `docs/handoff/STATUS.md`。按用户要求未测试其服务器连接；当前环境无 Docker daemon，未验证真实容器互通。
- 来源：用户要求两端文字可复制、检测展示完整地址、Docker 网关/别名辅助互通及内部来源允许、导出后自动生成前端导入命令。

## 决定

1. 配置总览 Ctrl+C 查看/复制选中值，编辑框保留选择复制，Ctrl+Q 退出。F4 展示无截断的完整结果。复制弹层使用只读 TextArea 和 OSC 52；不假定终端已接受剪贴板请求。提供“终端复制”恢复普通终端的鼠标选择，回车回到原界面。密钥仍在总览遮盖，仅用户查看/复制所选项时显示。
2. 后端 TUI、Docker CLI 和原生 CLI 导出后，均显示宿主绝对路径及 `./setup.sh --docker|--native --connection-file PATH`。参数经 `shlex.join` 引号处理，不嵌入令牌。在前端根目录执行；跨主机需先传输连接文件并改路径。导出成功自动展开复制弹层，避免窄终端遮住路径；保留界面和失败重试。
3. 前端检测只访问内部 URL（留空时沿用发布 URL），显示完整 `GET /health/ready` 目标，不跟随重定向去访问另一个入口。Python 与实际 Node 部署检查区分 DNS、连接拒绝、超时、TLS 和 HTTP 状态，不输出原始异常中的私有配置。
4. 两端 Docker 增加 `EVERUNFOLD_NETWORK_ALIAS`（默认本组件名）、`EVERUNFOLD_HOST_GATEWAY`（默认 0）和 `EVERUNFOLD_ALLOW_NETWORK_PEERS`（默认 1）。推荐共享自定义网络，以别名和容器内部端口互访；宿主网关使用 `--add-host host.docker.internal:host-gateway` 和宿主映射端口。工具/检查容器具有同样网络及网关映射，别名只绑定应用容器，防止 DNS 指向临时工具。保持先创建、逐个接入额外网络、再启动的顺序。
5. 启动时从 Docker inspect 得到所选网络的 IPv4/IPv6 CIDR；使用宿主网关时补充默认 bridge 网关 IP。以 `EVERUNFOLD_INTERNAL_PEER_CIDRS` 注入当前进程并追加手动允许列表。非法 CIDR 和全网 `/0` 拒绝启动。关闭开关只采用手动列表；不将动态子网写成永久手动授权，也不改用户原有列表。两端校验仍为真实 socket IP AND Token，不信任转发头。
6. 后端节点部署绑定增加显式 `allow_private_http`，默认 false。Docker 助手新配置默认开启，原生默认关闭，可编辑。开启后仅允许单段容器 DNS 别名、RFC1918/ULA 私有 IP、`host.docker.internal` 的 HTTP 接收地址；HTTPS 和回环规则保留，公网明文仍拒绝。该权限仅由部署端登记，公开节点控制台不能修改；改变已启用节点的该字段仍须先停用。CLI `--bind` 可显式传 `--allow-private-http`。

## 边界与升级

- 不新增监听端口、数据库迁移或业务接口；公开发布 URL 和绑定地址不混用。
- 自动允许子网依赖根 `setup.sh` 编排，直接 `docker compose up` 不处理额外网络、别名或自动来源。原生不主动发现 Docker 网络。
- `docker restart` 沿用创建容器时的网络参数；更换网络后用 `./setup.sh --docker start` 重新创建。
- 宿主只监听 `127.0.0.1` 时不能通过 host-gateway 访问；自定义网关或代理额外来源需手动填写。
- 前端加载器变化需重新构建主体；Node 部署检测在运行镜像内，需重建镜像。后端代码源挂载，按教程更新镜像/重新创建。日常重启不编译。
- 不修改实际部署的根配置、数据库、媒体或已运行服务。
