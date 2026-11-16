# ADR 0163：按 Docker 网络配置内部调用和宿主机反代

状态：已实现。日期：2026-11-16。版本：ADR0163-1。

同一容器接入多个网络时，用户希望指定哪张网允许内部调用，以及宿主机 HTTPS 反代使用哪张网的网关。两端 setup 提供独立的字段，保存于各自配置的 `docker` 小节。

- `EVERUNFOLD_INTERNAL_PEER_NETWORKS` 填写逗号分隔的已连接网络名。启动脚本读取这些网络的 IPAM 子网，用 `EVERUNFOLD_INTERNAL_PEER_CIDRS` 追加到手填来源。显式名单优先于 `EVERUNFOLD_ALLOW_NETWORK_PEERS`；留空沿用原有全部/手动开关。临时来源以接收端实际 socket IP 与所选子网匹配，双向节点令牌及后端节点启停继续检查。
- `EVERUNFOLD_TLS_PROXY_NETWORK` 填写一张已连接的 Docker 网桥名称。启动脚本读取其实际网关 IP，用 `EVERUNFOLD_NODES_TLS_PROXY_IPS` 追加到各自的 `nodes_monitor.trusted_tls_proxy_ips`。HTTPS 节点控制台只信任网关或手填的精确 IP，反代发送公开 Host 和 `X-Forwarded-Proto: https`。前端在单端口 Node 入口读取真实 socket，用请求上下文传到节点页面和本机配置 API；已有未配置代理名单的前端入口兼容原行为。

明确选择网络后，每次 Docker 助手启动重新查询当前地址，派生值存于容器运行环境，不写进手填授权，也不用于其他用途。错误网络或缺少网关会在替换运行容器前提示。程序容器不访问 Docker socket。原生部署可手填来源或代理 IP。

按网关信任适用于宿主机反代的连接确实从该网桥进入。若代理直接连接容器的来源是其他地址，手填实际代理 IP。多个网络仍允许分别承载数据库、前端同步与反代通信。网络数据来源见 [Docker network inspect](https://docs.docker.com/reference/cli/docker/network/inspect/) 和 [网桥驱动](https://docs.docker.com/engine/network/drivers/bridge/)。测试范围见各仓库交接状态。
