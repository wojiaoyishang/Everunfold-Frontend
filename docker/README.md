# 前端 Docker 部署

生产运行镜像和一次性构建器共用 Node.js 22。源码只读挂到 `/workspace`。运行时由固定版本目录启动 Next.js 和节点接收器，更新源码不会立即影响现有进程。

| 容器路径           | 用途                                                        |
| ------------------ | ----------------------------------------------------------- |
| `/workspace`       | 宿主源码，只读                                              |
| `/build`           | 构建工作区、容器内依赖、npm 下载缓存和 Turbopack 缓存       |
| `/releases/<版本>` | 完整的 Next.js 构建、静态资源、运行依赖和接收器，按版本保留 |
| `/plugins`         | 已编译的可信插件包，运行容器只读挂载                        |
| `/data`            | 本节点已同步的公开快照及设置，跨版本保留                    |
| `/etc/everunfold`  | 仅运行容器挂载的实例配置                                    |

## 构建、启动和回滚

在仓库的 `docker/` 目录执行。与后端使用同一个已创建的 Docker 网络。如果后端已创建该网络，可直接复用。将 `runtime.env.example` 复制为 `runtime.env`。从根目录的 `config.example.toml` 创建 `instance/config.toml`，填入节点 ID、后端来源 UUID、实际双向令牌变量名和来源 IP/CIDR。

把 `[settings].directory` 设为 `/data/settings`，把 `[cache].directory` 设为 `/data/public-snapshots`。接收端口默认 3001，Compose 不向宿主发布该端口。后端通过受限 HTTPS 入口向接收器投递，保留真实来源 IP 和令牌校验。浏览器使用公开后端地址。修改前端 Web 端口用 Compose 环境中的 `FRONTEND_WEB_PORT`，宿主端口由 `FRONTEND_PUBLISH_PORT` 控制。

容器里的 `127.0.0.1` 指本容器。跨容器连接填部署网络可解析的地址，并让代理只在部署网络访问接收器。启用独立后端连接文件时，内部 API 地址同样按现有规则配置 HTTPS。源码和实例配置应允许镜像中的 UID 1000 读取。

```bash
docker compose build frontend
docker compose run --rm builder build-host pre-1
docker compose run --rm builder build-plugins
FRONTEND_RELEASE=pre-1 docker compose up -d frontend
curl -fsS http://127.0.0.1:3000/health/ready
```

冷节点首次同步前可能返回 503。先在后端完成节点同步，再确认公开页和节点回执。后续发布时先构建新的版本，再用 `FRONTEND_RELEASE=新版本 docker compose up -d frontend` 切换。旧版本可用相同命令恢复。回滚前核对公开快照、后端契约和插件 SDK 兼容性。插件包及快照由所有前端主体版本共享，主体回滚不会同时回滚它们。默认单实例，切换时容器会重建，短暂停机取决于代理和启动时间。

构建器按 Node/npm 版本和依赖锁决定是否执行 `npm ci`。源码变化复用工作区及 `.next/cache`，仍执行正常的完整 Next.js 构建。构建成功后以同一卷内原子重命名发布版本目录。运行容器持续使用当前版本，失败的构建无法切走流量。保留所需回滚版本，按部署计划清理旧版本。构建器不加载运行密钥。

默认挂载当前检出。可用 Compose 环境中的 `FRONTEND_SOURCE_DIR` 指向只读的发布检出。构建期间固定该检出，避免一边复制一边切换分支。每个主体版本包含自己的运行依赖与静态资源。

`contracts.lock.json` 固定后端提交及 SHA-256。公开契约默认按锁文件恢复。离线或私有部署可给 builder 只读挂入包含锁定提交的完整后端 Git 检出，设置 `EVERUNFOLD_BACKEND_PATH` 指向该挂载。宿主 Git 检出应由容器 UID 1000 所有或在构建器的 Git 设置中单独信任该目录。以容器用户可读取的独立检出为例，可在 Compose override 的 builder 中添加：

```yaml
services:
  builder:
    environment:
      EVERUNFOLD_BACKEND_PATH: /backend-contracts
    volumes:
      - /absolute/path/to/backend-checkout:/backend-contracts:ro
```

## 如何增量更新

| 改动                            | 操作                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| 前端插件源码                    | `docker compose run --rm builder build-plugins 插件目录名` |
| 前端主体、路由、主题源码        | `build-host 新版本`，然后切换 `FRONTEND_RELEASE`           |
| 前端依赖锁或契约锁              | 重新执行对应构建，检查后端契约与 SDK 兼容性                |
| Node.js、系统依赖或 Docker 入口 | 重新构建镜像，并按需发布新的主体版本                       |

现有插件编译器先写内容哈希资源，最后原子切换 manifest。发布单个兼容插件不需要重建主体或重启。已打开的编辑器按现有提示重新打开。多节点要分别安装同一构建摘要并确认登记。插件源码只允许可信部署者提供。

新增插件目录后执行单插件构建即可发布产物。替换已有插件前可备份原 manifest，保留它引用的哈希资源。插件回滚时原子恢复旧 manifest。删除源码不会撤下已发布的包。需要下线时，先在后台检查引用并停用，需要移除产物时再从插件卷移走对应目录。

构建并发用 Compose 环境变量 `FRONTEND_BUILD_WORKERS`，默认 2。`FRONTEND_BUILD_NODE_OPTIONS` 默认 `--max-old-space-size=3072`，用于约束构建进程的 V8 堆上限。同一容器内运行一个 Next.js Web 进程和一个接收器进程。接收器的运行环境变量 `FRONTEND_RECEIVER_HOST`、`FRONTEND_RECEIVER_PORT` 可在 `runtime.env` 中设置。前端没有 Celery Worker。
