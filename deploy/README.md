# Everunfold 前端部署教程

选择下面一条路径。**所有命令都在前端仓库根目录执行**。先按[后端教程](https://github.com/wojiaoyishang/Everunfold-Backend/blob/main/deploy/README.md)启动后端，取得该前端节点的连接 JSON 文件。

**首次部署需要编译；日常重启直接运行已有产物。** 后端生成双向令牌及来源 UUID，前端导入即可，无需重新生成、抄写或查询数据库。

前后端统一在**各自项目根目录**运行 `./setup.sh`，选择 Docker 或原生部署；也可使用下方显式参数。配置助手代码在 `deploy/`，`docker/` 只保存镜像及容器相关文件。

**根目录 `config.yaml` 是唯一需要维护的部署配置**。首次保存自动生成，权限为 `0600`，已加入 Git 忽略。配置、密钥及部署参数均从这里读取；运行所需的 TOML、环境文件由助手自动生成。手动修改 YAML 后，下一次 `build`、`start` 或 `check` 会应用修改。不要再修改生成的 `config.runtime.toml`、`.env`、`runtime.env`。后端直接读取根 YAML；前端使用助手从根 YAML 生成的根目录 `config.runtime.toml`。

已有旧向导配置会在首次保存时导入：Docker 使用原 `docker/data/config.toml` 与 `docker/runtime.env`；原生使用 `var/instance/`。没有点击保存就退出，不会写入配置。使用其他位置的旧实例配置时，应先迁入所选实例目录并保留原密钥。

## 一、Docker 从零构建与部署

### 1. 准备环境和源码

需要 Linux / WSL、Bash 4+、Git、Docker Engine 和 Compose v2。[Docker 官方安装指南](https://docs.docker.com/engine/install/)。宿主无需安装 Node.js、npm 或 Python。首次下载依赖和编译需要网络及足够内存，默认使用 2 个编译 worker、Node 内存上限 3072 MiB，可在助手修改。

```bash
git clone https://github.com/wojiaoyishang/Everunfold-Frontend.git
cd Everunfold-Frontend
mkdir -p docker/data
```

将后端导出的该节点 JSON 私下复制到 `docker/data/connection.json`。它含有节点令牌，请保持权限 `0600`，不要提交到 Git。

```bash
./setup.sh --docker
```

首次运行会自动构建配置工具镜像，默认使用 `bridge`。可填写自定义主网络及额外网络，额外网络须已存在。配置工具容器退出即删除，后续自动构建由宿主脚本执行。

### 2. 导入连接并填写本站地址

总览先询问代码目录、数据目录、容器名称、主网络、额外网络和编译产物输出目录，端口与镜像名称也可修改。代码目录只供编译；部署时 `/workspace` 挂载构建成功的产物，`/data` 挂载所选持久化目录。额外网络可填 `1panel-network`；助手先创建容器、接入全部网络后才启动进程，兼容默认 `bridge` 与自定义网络的组合。

修改网络后，如需在界面检测，先“仅保存”并重新打开助手；实际启动前检查会直接使用新网络。修改数据目录不会搬运旧快照或插件，需保留或迁移原数据。前后端数据目录应独立。

在配置总览中选中“导入后端连接文件”，填写 `docker/data/connection.json`；助手从仓库根目录运行，也接受挂载范围内的绝对路径。导入后自动填写后端发布 URL、节点 ID、来源 UUID 和两项令牌。

| 配置                         | 怎么填                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| 前端发布 URL                 | 本站的 HTTPS 公开根地址，例如 `https://blog.example.com`                     |
| 后端发布 URL                 | 从连接文件导入；浏览器调用 API 的公开入口                                    |
| 后端内部连接 URL             | 默认沿用发布 URL，需要独立线路时填写受信任 HTTPS 入口                        |
| 后端调用接收器的来源 IP/CIDR | 接收器实际看到的 Worker 或内部代理来源；新 Docker 配置包含回环与所选部署网络 |
| Web 绑定和端口               | 默认容器 `0.0.0.0:3000`，宿主 `127.0.0.1:3000`                               |
| 接收器绑定和端口             | 默认容器 `0.0.0.0:3001`，映射到宿主 `127.0.0.1:3001`，用于宿主 HTTPS 代理    |
| 编译 worker / 内存上限       | 默认 2 / 3072 MiB，按机器资源调整                                            |

点击“检测连接”查看后端公开入口和内部入口的就绪情况。容器中的 `127.0.0.1` 指前端容器，不能用于访问另一个容器里的后端。Docker 跨容器凭据传输使用 HTTPS；本机无 HTTPS 的直接联调可采用下方“不使用 Docker”路径。

界面先显示全部配置，支持顺序配置、修改选中项、退出。左右键移动输入光标，上下键回显本项会话历史，Ctrl+U 清空；URL 回显，令牌在总览遮盖、编辑时可查看。

### 3. 自动构建并启动

在助手中选择 **“构建并启动”**，会依次完成：

1. 保存配置、备份已有文件。
2. 构建 `everunfold-frontend:node22` 镜像。
3. 启动一次性编译容器，将源码只读挂到 `/workspace`，安装锁定依赖并编译 Next.js。
4. 将主体导出到所选输出目录的 `release-.../`（默认 `docker/output/release-.../`），插件先编译到独立暂存目录。
5. 主体和全部插件成功后，选择新产物；用实际 Node 配置加载器检查，再启动 Web 和接收器。

每步日志实时回显，命令失败返回非零退出码。构建失败不会选择未完成的主体，也不会把未完成的插件批次替换到运行目录。已保存配置保留，可以直接重试。

如需分开进行：

```bash
./setup.sh --docker build
./setup.sh --docker start
docker logs --tail=100 everunfold-frontend
```

仅想生成配置时选择“仅保存”，不会触发构建。

### 4. HTTPS、节点启用和第一次同步

宿主反向代理分别设置两个入口：

| 公开入口示例                   | 宿主转发目标            | 用途                   |
| ------------------------------ | ----------------------- | ---------------------- |
| `https://blog.example.com`     | `http://127.0.0.1:3000` | 网页                   |
| `https://receiver.example.com` | `http://127.0.0.1:3001` | 后端内部投递，限制来源 |

接收器入口要与后端导出节点时登记的 URL 相同。代理的实际直连来源需要在接收器允许列表内；应用会继续验证对应方向令牌。接收器宿主端口只绑定回环，不作为普通公网 Web 端口。

到后端 `/_nodes` 添加该节点的本站公开 URL 并启用。登录前端管理后台，在“设置 → 节点状态与维护”执行“重新同步全部”。

```bash
curl --fail http://127.0.0.1:3000/health/ready
```

首次同步之前返回 HTTP 503 可能是尚无公开快照；同步完成后应返回 200。再打开首页和一篇已发布文章验收。

### 5. 持久化、重启和升级

```text
config.yaml                 项目根目录的统一部署配置
config.runtime.toml         自动生成的兼容配置，勿手改
docker/
  .env                      自动生成的 Compose 参数
  runtime.env               自动生成的 Compose 环境
  runtime.env.docker        自动生成的 Docker CLI 环境
  output/release-.../        已完成的主体产物
  data/
    setup.json              助手参数
    settings/               已同步设置
    public-snapshots/        公开内容副本
    plugins/                当前独立插件包
    plugin-builds/           构建暂存批次
```

部署模式把选中的产物挂到 `/workspace`，把所选数据目录挂到 `/data`。助手另外将根目录生成的 `config.runtime.toml` 只读挂到 `/workspace/config.runtime.toml`，与产物分开，无需重编译即可修改配置。`/workspace` 可写以容纳 Next.js 派生缓存；公开副本和独立插件使用 `/data`。新配置的容器 UID/GID 与宿主执行助手的账号一致。

- 日常重启：`docker restart everunfold-frontend`，**不重新编译**。
- 更换公开域名或连接参数：重新运行助手保存，再执行 `./setup.sh --docker start`，无需重新编译；同步修改反向代理和后端节点公开地址。
- 修改主体或主题：执行 `./setup.sh --docker build`，成功后 `./setup.sh --docker start`。
- 回滚主体：在根目录 `config.yaml` 的 `docker` 小节将 `FRONTEND_ARTIFACT_DIR` 指向保留的旧产物，再启动；核对插件、契约和快照版本兼容性。
- 单独更新插件：在 `docker/` 目录执行 `docker compose run --rm builder build-plugins 插件目录名`。它沿用原有独立插件发布机制，不要求重新编译主体。
- 备份：保存根目录 `config.yaml`、`data` 和选中的产物。删除应用容器不会删除这些宿主目录。

挂载和容器设置直接在向导中修改，保存到根 `config.yaml` 的 `docker` 小节；相对路径以 `docker/` 为基准。日志和重启命令使用你选定的容器名称。启动请使用 `./setup.sh --docker start`，Compose 负责镜像及编译任务，直接 `compose up` 不会接入额外网络。向导保留根配置的其他字段和环境变量，保存前创建 `*.bak`。独立后端连接只修改当前 active 项；完整连接清单保存在根 YAML 的 `connection_profiles`。Docker 中派生连接文件须放在数据目录内。

## 二、不使用 Docker

### 1. 准备环境和源码

需要 Linux / WSL、Bash、Git、[uv](https://docs.astral.sh/uv/getting-started/installation/)以及 **Node.js 22.15.1 或更高的 22.x、npm 10.9.2 或更高的 10.x**。版本要求以 `package.json` 和 `.nvmrc` 为准。uv 只负责运行配置助手，其 Python 3.12 环境按工具锁文件准备；前端仍由 Node.js 运行。

```bash
git clone https://github.com/wojiaoyishang/Everunfold-Frontend.git
cd Everunfold-Frontend
node --version
npm --version
./setup.sh --native
```

这个入口完全不调用 Docker。导入后端原生助手生成的 `var/instance/connections/节点ID.json`，可以填写该文件的绝对路径。无需手工抄写令牌和 UUID。

两端在本机运行时，本站 URL 可使用 `http://127.0.0.1:3000`，后端 URL 可使用 `http://127.0.0.1:8001`。Web、后端、接收器均可绑定回环。每个前端节点使用独立项目目录、节点 ID、端口和实例目录。

### 2. 构建并运行

选“构建并启动”即可自动安装依赖、构建主体和插件，然后运行两个前端进程。也可先保存，再执行：

```bash
./setup.sh --native build
./setup.sh --native start
```

`build` 执行锁文件安装、主体生产构建和独立插件构建。`start` 自动加载生成的环境文件，运行 Web 和接收器，**不会重新编译**。进程在前台运行，Ctrl+C 统一停止。

若后端契约无法从远端取得，可设置 `EVERUNFOLD_BACKEND_PATH` 指向包含锁定提交的本地后端 Git 检出；前端按 `contracts.lock.json` 校验契约版本。

### 3. 配置位置、节点同步与长期托管

原生同样维护根 `config.yaml`，助手生成根目录 `config.runtime.toml` 供 Node 读取；环境文件及数据位于 `var/instance/`，包含 `runtime.env`、`deploy.env`、`setup.json`、`settings/`、`public-snapshots/`、`plugins/`。无需手工编辑多个文件，也无需 `source` 环境文件。`EVERUNFOLD_INSTANCE_DIR=/绝对路径` 可选择其他实例目录。

后端中登记的接收器 URL 应指向此实例：同机默认 `http://127.0.0.1:3001`。到后端 `/_nodes` 添加并启用本站公开 URL，登录前端后台执行首次同步，再检查：

```bash
./setup.sh --native check
curl --fail http://127.0.0.1:3000/health/ready
```

长期托管可用 systemd / Supervisor 分别运行：

```bash
./setup.sh --native web
./setup.sh --native receiver
```

两条命令使用相同服务账号、实例目录及同一套环境文件。修改配置后重启进程；源码更新后显式重新构建。保留实例目录、配置密钥和可回滚的代码/构建版本。

### 旧开发联调入口

原 Supervisor / Nginx 开发模板继续保留，命令与端口约定见[开发容器部署指南](../docs/development/container-deployment.md)。该模板与本文的根目录部署助手分开使用。
