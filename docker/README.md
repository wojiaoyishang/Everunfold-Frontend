# Everunfold 前端 Docker 部署手册

**首次部署先编译一次，再启动。日常重启直接使用已编译的版本。** 先按后端手册启动 API，并确定待在后端 `/_nodes` 登记的节点 ID（例如 `web-main`）和后端来源 UUID。以下命令都在**前端仓库的 `docker/` 目录**执行。

## 1. 准备配置

先在 POSIX 交互终端运行配置向导，需 Python 3.11 或更新版本及其标准库 `termios`：

```bash
python3 configure.py
```

启动后先显示全部向导配置项、当前值及未填项，再显示菜单：

```text
1.按次序配置  2.修改某配置项  3.退出
```

- 选 `1` 按顺序编辑，结束后返回总览；选 `2` 输入配置项编号，只修改该项。
- 输入框预填当前值，直接回车保留；`←/→` 移动光标，`↑/↓` 调取该项在本次会话中的输入，`Ctrl+U` 清空。程序显式设置终端回显和行编辑属性，正常退出、Ctrl+C 或 EOF 后恢复原设置。历史不写入磁盘。
- 所有输入回显；独立令牌在总览中遮盖，进入该项编辑时可查看和修改。
- 选 `3` 后，有修改时选择 `y` 保存并退出、`n` 放弃、`c` 返回。必填项或端口等校验未通过时返回菜单。未修改就退出时不会创建文件。

发布 URL、服务端内部连接、Web/接收器监听与 Docker 宿主映射仍分别配置。“导入后端令牌文件路径”只导入后端 `runtime.env` 的两项令牌，随后可以分别编辑；清空导入路径保留当前令牌值。已有配置会直接加载，可按编号修改，无需重新填写。

保存前在原文件旁创建 `文件名.<标识>.bak` 备份，文件权限为 `0600`。保留向导未编辑的 TOML 字段及其他环境变量，包括所选构建产物目录；TOML 会重新排版，原注释保存在备份中。文件被其他程序修改时拒绝覆盖。支持 `.env` 中自定义的 `FRONTEND_DATA_DIR`、`FRONTEND_ENV_FILE`，以及独立后端连接文件的当前 active 项；其他连接项保留。

共用 Docker 网络需要单独创建。使用向导后，可跳过下列复制模板的命令。

```bash
docker network inspect everunfold >/dev/null 2>&1 || docker network create everunfold
mkdir -p data/plugins output
cp -n ../config.example.toml data/config.toml
cp -n runtime.env.example runtime.env
```

编辑以下文件：

| 文件               | 填写内容                                                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/config.toml` | `PUBLIC_SITE_URL` 填前端公开地址，`BACKEND_BASE_URL` 填反向代理对外提供的 API 根地址。填写与后端节点清单一致的 `FRONTEND_NODE_ID`，以及 `[settings].source_epoch`。在 `[backend]` 中填写实际来源 IP/CIDR 和两个方向的令牌变量名。 |
| `runtime.env`      | 填两个方向令牌的实际值，与后端对应变量一致。`FRONTEND_HOST` 设置 Web 绑定 IP；接收器由 `FRONTEND_RECEIVER_HOST`、`FRONTEND_RECEIVER_PORT` 单独设置，默认监听 `0.0.0.0:3001`。                                                     |
| `.env`             | 设置 Web 容器端口和宿主映射；`FRONTEND_ARTIFACT_DIR=./output/pre-1` 选择构建版本，省略时使用该默认值。编辑时保留向导写入的其他设置。                                                                                              |

在 `data/config.toml` 的现有小节中修改目录，保留同小节的其他字段：

```toml
[settings]
directory = "/data/settings"

[cache]
directory = "/data/public-snapshots"
```

默认宿主 Web 端口为 3000，接收器 3001 仅供部署网络及受限 HTTPS 入口使用。容器互联使用部署网络可解析的地址。启用独立后端连接文件时，按现有规则配置内部 API HTTPS 地址。宿主源码和实例配置需允许容器 UID 1000 读取。

### 发布、连接与监听分别配置

| 配置                | 位置与示例                                                                       | 作用                                                                                              |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 前端发布 URL        | `data/config.toml` 的 `PUBLIC_SITE_URL = "https://blog.example.com"`             | 本站 canonical、Open Graph、站点地图和订阅的绝对链接；与后端 `/_nodes` 中该节点的公开地址保持一致 |
| 后端发布 URL        | 同文件的 `BACKEND_BASE_URL = "https://api.example.com"`                          | 浏览器访问 API 的公开入口，与后端的同名配置一致                                                   |
| 后端内部连接 URL    | 同文件的 `[backend].base_url = "https://backend.internal.example.com"`           | Next.js、接收器及上报服务连接后端；省略时沿用后端发布 URL，仅在服务端使用                         |
| Web 进程监听        | `runtime.env` 的 `FRONTEND_HOST=0.0.0.0`；`.env` 的 `FRONTEND_WEB_PORT=3000`     | 容器内 Web 进程绑定地址；Compose 将端口注入为 `FRONTEND_PORT`                                     |
| Docker 宿主端口映射 | `.env` 的 `FRONTEND_BIND_ADDRESS=127.0.0.1`、`FRONTEND_PUBLISH_PORT=13000`       | 将宿主 `127.0.0.1:13000` 转发到容器 Web 端口                                                      |
| 内部接收器监听      | `runtime.env` 的 `FRONTEND_RECEIVER_HOST=0.0.0.0`、`FRONTEND_RECEIVER_PORT=3001` | 独立进程接收后端投递；Compose 不把此端口映射到宿主                                                |

例如 `https://blog.example.com` → 宿主反向代理 → `127.0.0.1:13000` → 容器 Web `0.0.0.0:3000`。`PUBLIC_SITE_URL` 不决定监听地址或端口。Docker 映射通常保留 Web 的 `0.0.0.0` 绑定；健康检查访问实际容器监听地址。Web 和接收器使用不同端口。

`/_nodes` 管理后端认可的多个前端公开地址和启停状态，各前端的 `PUBLIC_SITE_URL` 仍需按该节点独立配置。后端接收器绑定 CLI 中的 URL 是后端访问接收器的目标入口，由受限 HTTPS 代理转发到容器的接收器监听端口。

这些 URL 从部署时挂载的配置读取。更换域名时修改 `data/config.toml`，同步后端 `/_nodes` 与反向代理配置，再执行 `docker compose up -d --force-recreate frontend`，无需重新编译。若 `runtime.env` 中有同名 `PUBLIC_SITE_URL` 或 `BACKEND_BASE_URL`，环境值优先，需一并调整。

## 2. 首次编译并启动

依次执行：

```bash
docker compose config --quiet
docker compose build frontend
docker compose run --rm builder build pre-1
docker compose run --rm builder build-plugins
docker compose up -d frontend
docker compose ps
```

编译日志会实时显示在终端。需要同时保存到宿主机时，用下面的命令替代对应的 `build` 命令。Bash 的 `pipefail` 会保留构建失败的退出状态。

```bash
set -o pipefail
docker compose run --rm builder build pre-1 2>&1 | tee build-pre-1.log
```

编译模式把源码只读挂到 `/workspace`，在容器临时目录里执行 `npm ci` 和 Next.js 生产构建。成功后，`build pre-1` 把产物写到宿主 `output/pre-1/`。临时容器退出后可以删除。可用 Compose 的 `FRONTEND_SOURCE_DIR` 和 `FRONTEND_OUTPUT_DIR` 指定其他宿主路径。

默认启动进入部署模式，把选定的产物目录挂到 `/workspace`，启动 Next.js 和接收器。该挂载可写，以供 Next.js 和插件运行时写缓存。Web 和接收器的运行配置来自宿主 `data/`。编译与部署使用相同平台架构的镜像。

## 3. 首次同步并验收

按后端手册登记受限 HTTPS 接收地址，再在后端 `/_nodes` 填前端公开地址并启用节点。进入后台「设置 → 节点状态与维护」，选中前端节点，点击「重新同步全部」，确认接收器在线以及后端期望、后端确认和本机版本一致。

```bash
curl -fsS http://127.0.0.1:3000/health/ready
docker compose logs --tail=100 frontend
```

新节点首次收到公开快照前，就绪接口可能返回 HTTP 503。同步后应返回 HTTP 200，再从公开入口访问首页和一篇已发布文章。

## 4. 重启、更新和回滚

- **日常重启**执行 `docker compose restart frontend`，继续使用创建该容器时选定的已构建版本。
- **修改主体、路由或主题**时，先执行 `docker compose run --rm builder build pre-2`。成功后将 `.env` 改成 `FRONTEND_ARTIFACT_DIR=./output/pre-2`，再执行 `docker compose up -d frontend`。单实例切换会短暂重启。
- **需要回滚主体**时，将 `.env` 改回旧版本，再执行 `docker compose up -d frontend`。切换前核对后端契约、公开快照和插件 SDK 的兼容性。
- **单独更新插件**时，执行 `docker compose run --rm builder build-plugins 插件目录名`。兼容的插件包可由运行中的前端发现。

## 5. 备份和目录迁移

- `output/pre-1/` 等目录是自带依赖的产物。保留需要回滚的版本，并随时可移到另一台同平台机器部署。
- `data/` 是独立的宿主目录，挂到 `/data`。其中 `config.toml` 保存实例配置，`settings/` 和 `public-snapshots/` 保存公开副本，`plugins/` 保存独立编译的插件。使用 `FRONTEND_DATA_DIR` 可指定其他数据目录。
- 日常停机用 `docker compose stop frontend`。移除容器后宿主目录仍保留。迁移时备份 `data/`、选定的产物目录、`.env` 和私有 `runtime.env`。旧版 Compose 已有数据时，先将原命名卷中的副本和插件及原实例配置复制到新目录。
- 仅丢失前端公开副本时，可从后端重新同步。回滚主体会继续使用当前插件和公开副本。

## 6. 构建与插件维护细节

每次显式编译都在新容器中完成。日常启动和重启继续使用原产物。构建期间固定源码检出，避免边复制边切换分支。

### 用 `docker run` 只编译产物

如果只想把镜像当作一次性编译工具，在本仓库 `docker/` 目录执行：

```bash
docker build -t everunfold-frontend:node22 .
mkdir -p output
docker run --rm --init \
  --mount "type=bind,source=$(cd .. && pwd),target=/workspace,readonly" \
  --mount "type=bind,source=$(pwd)/output,target=/output" \
  everunfold-frontend:node22 build pre-1
```

将第一个挂载的宿主路径换成其他 Everunfold 前端检出即可编译那个目录。输出目录需要允许容器 UID 1000 写入。编译成功后，直接把宿主的 `output/pre-1/` 用作部署产物。每次构建使用新的产物名，已有目录会保留。

### 构建所需的后端契约

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
| 前端主体、路由、主题源码        | `build 新版本`，然后修改 `FRONTEND_ARTIFACT_DIR`           |
| 前端依赖锁或契约锁              | 重新执行对应构建，检查后端契约与 SDK 兼容性                |
| Node.js、系统依赖或 Docker 入口 | 重新构建镜像，并按需发布新的主体版本                       |

现有插件编译器先写内容哈希资源，最后原子切换 manifest。发布单个兼容插件不需要重建主体或重启。已打开的编辑器按现有提示重新打开。多节点要分别安装同一构建摘要并确认登记。插件源码只允许可信部署者提供。

新增插件目录后执行单插件构建即可发布产物。替换已有插件前可备份原 manifest，保留它引用的哈希资源。插件回滚时原子恢复旧 manifest。删除源码不会撤下已发布的包。需要下线时，先在后台检查引用并停用，再从宿主 `data/plugins/` 移走对应产物目录。

构建并发用 Compose 环境变量 `FRONTEND_BUILD_WORKERS`，默认 2。`FRONTEND_BUILD_NODE_OPTIONS` 默认 `--max-old-space-size=3072`，用于约束构建进程的 V8 堆上限。同一容器内运行一个 Next.js Web 进程和一个接收器进程。运行监听参数按上表配置；直接 `docker run` 部署时，Web 端口使用 `FRONTEND_PORT`。前端没有 Celery Worker。
