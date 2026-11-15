# Everunfold 前端 Docker 部署手册

**首次部署先编译一次，再启动。日常重启直接使用已编译的版本。** 先按后端手册启动 API，并拿到节点 ID（例如 `web-main`）和后端来源 UUID。以下命令都在**前端仓库的 `docker/` 目录**执行。

## 1. 准备配置

```bash
docker network inspect everunfold >/dev/null 2>&1 || docker network create everunfold
mkdir -p instance
cp -n ../config.example.toml instance/config.toml
cp -n runtime.env.example runtime.env
```

编辑以下文件：

| 文件                   | 填写内容                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instance/config.toml` | `PUBLIC_SITE_URL` 填前端公开地址，`BACKEND_BASE_URL` 填浏览器可访问的后端 API 地址。填写与后端节点清单一致的 `FRONTEND_NODE_ID`，以及 `[settings].source_epoch`。在 `[backend]` 中填写实际来源 IP/CIDR 和两个方向的令牌变量名。 |
| `runtime.env`          | 填两个方向令牌的实际值，与后端对应变量一致。接收器默认监听 `0.0.0.0:3001`。                                                                                                                                                     |
| `.env`                 | 创建此文件并写入 `FRONTEND_RELEASE=pre-1`，供 Compose 选择构建版本。已有 `.env` 时编辑这一行，保留其他设置。                                                                                                                    |

在 `instance/config.toml` 的现有小节中修改目录，保留同小节的其他字段：

```toml
[settings]
directory = "/data/settings"

[cache]
directory = "/data/public-snapshots"
```

默认宿主 Web 端口为 3000，接收器 3001 仅供部署网络及受限 HTTPS 入口使用。容器互联使用部署网络可解析的地址。启用独立后端连接文件时，按现有规则配置内部 API HTTPS 地址。宿主源码和实例配置需允许容器 UID 1000 读取。

## 2. 首次编译并启动

依次执行：

```bash
docker compose config --quiet
docker compose build frontend
docker compose run --rm builder build-host pre-1
docker compose run --rm builder build-plugins
docker compose up -d frontend
docker compose ps
```

`build-host pre-1` 在临时构建容器内将只读源码复制到可写的 `/build/work`，安装锁定依赖并执行 Next.js 生产构建。成功后把产物保存在持久卷的 `/releases/pre-1`。启动命令用这份产物运行 Web 和接收器。

## 3. 首次同步并验收

后端节点清单启用该节点，并配置受限 HTTPS 接收地址。进入后台「设置 → 节点状态与维护」，选中前端节点，点击「重新同步全部」，确认接收器在线以及后端期望、后端确认和本机版本一致。

```bash
curl -fsS http://127.0.0.1:3000/health/ready
docker compose logs --tail=100 frontend
```

新节点首次收到公开快照前，就绪接口可能返回 HTTP 503。同步后应返回 HTTP 200，再从公开入口访问首页和一篇已发布文章。

## 4. 重启、更新和回滚

- **日常重启**执行 `docker compose restart frontend`，继续使用创建该容器时选定的已构建版本。
- **修改主体、路由或主题**时，先执行 `docker compose run --rm builder build-host pre-2`。成功后将 `.env` 改成 `FRONTEND_RELEASE=pre-2`，再执行 `docker compose up -d frontend`。单实例切换会短暂重启。
- **需要回滚主体**时，将 `.env` 改回旧版本，再执行 `docker compose up -d frontend`。切换前核对后端契约、公开快照和插件 SDK 的兼容性。
- **单独更新插件**时，执行 `docker compose run --rm builder build-plugins 插件目录名`。兼容的插件包可由运行中的前端发现。

## 5. 文件存在哪里

| 路径              | 内容                                                      |
| ----------------- | --------------------------------------------------------- |
| `/workspace`      | 只读挂载的宿主源码                                        |
| `/build`          | 构建工作区、容器内依赖、npm 及 Turbopack 缓存             |
| `/releases`       | 已构建的 Next.js 版本，含各自的静态资源、运行依赖和接收器 |
| `/plugins`        | 独立发布的插件包                                          |
| `/data`           | 公开快照和设置，跨主体版本保留                            |
| `/etc/everunfold` | 从宿主 `instance/` 挂载的配置                             |

日常停机可用 `docker compose stop frontend` 或 `docker compose down`。带 `-v` 的 `down` 会删除这些卷。迁机时备份 `instance/`、`.env` 和私有 `runtime.env`，并按需求保留 `releases`、`plugins` 和 `data` 卷。仅丢失前端快照时，可从后端重新同步。

## 6. 构建与插件维护细节

构建器按 Node/npm 版本及依赖锁决定是否执行 `npm ci`。后续主体构建复用 `.next/cache`，构建成功后才发布候选版本。

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

### 增量更新速查

| 改动                            | 操作                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| 前端插件源码                    | `docker compose run --rm builder build-plugins 插件目录名` |
| 前端主体、路由、主题源码        | `build-host 新版本`，然后切换 `FRONTEND_RELEASE`           |
| 前端依赖锁或契约锁              | 重新执行对应构建，检查后端契约与 SDK 兼容性                |
| Node.js、系统依赖或 Docker 入口 | 重新构建镜像，并按需发布新的主体版本                       |

现有插件编译器先写内容哈希资源，最后原子切换 manifest。发布单个兼容插件不需要重建主体或重启。已打开的编辑器按现有提示重新打开。多节点要分别安装同一构建摘要并确认登记。插件源码只允许可信部署者提供。

新增插件目录后执行单插件构建即可发布产物。替换已有插件前可备份原 manifest，保留它引用的哈希资源。插件回滚时原子恢复旧 manifest。删除源码不会撤下已发布的包。需要下线时，先在后台检查引用并停用，需要移除产物时再从插件卷移走对应目录。

构建并发用 Compose 环境变量 `FRONTEND_BUILD_WORKERS`，默认 2。`FRONTEND_BUILD_NODE_OPTIONS` 默认 `--max-old-space-size=3072`，用于约束构建进程的 V8 堆上限。同一容器内运行一个 Next.js Web 进程和一个接收器进程。接收器的运行环境变量 `FRONTEND_RECEIVER_HOST`、`FRONTEND_RECEIVER_PORT` 可在 `runtime.env` 中设置。前端没有 Celery Worker。
