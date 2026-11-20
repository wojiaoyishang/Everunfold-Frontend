# Everunfold 前端部署入口

前后端统一使用项目根目录的 `setup.sh` 与 `config.yaml`。配置助手在 `deploy/`，不需要进入 `docker/` 运行。完整的逐步教程见[部署教程](../deploy/README.md)。

setup 的“节点控制台”分组可设置启用开关、本机配置密码、会话密钥和控制台访问来源。入口为前端发布 URL 下的 `/admin/_nodes`；后端不可用也可编辑本机连接，全站状态仍验证后端管理员。同步失败查看 `docker logs --follow --tail=100 everunfold-frontend` 中的 `[Everunfold sync]`，含内部目标、HTTP 状态、网络或落盘错误，详见[同步排查](../deploy/README.md#同步失败时看-nodejs-日志)。

选中配置项可查看/复制，F4 查看完整执行结果；终端不支持剪贴板时使用“终端复制”。后端导出后自动显示前端导入命令，带空格的路径也可直接复制。

## 一、Docker 从零构建

1. 安装 Docker Engine、Compose v2、Bash 4+ 和 Git，确认 `docker info` 可用。
2. 克隆本仓库，在仓库根目录执行下列命令。后端需要事先准备 PostgreSQL 和 Redis；前端需要后端导出的节点连接 Base64。
3. 在配置总览填写代码目录、数据目录、容器名称、主网络、额外网络、端口；前端还可选产物输出目录。助手提供连接检测，保存根目录 `config.yaml`。

```bash
./setup.sh --docker
# 在界面导入后端连接 Base64，选择“构建并启动”
# 或仅保存并退出界面后，分开执行：
./setup.sh --docker build
./setup.sh --docker start
```

工具镜像自动构建，退出即删除工具容器；应用镜像的构建日志实时显示。`start` 和容器重启不会重新编译前端。镜像、挂载、持久化、HTTPS 和首次同步的完整说明见[Docker 从零构建与部署](../deploy/README.md#一docker-从零构建与部署)。

需要重新投递当前前端的同步快照时，在向导选择“触发同步”，或执行 `./setup.sh --docker sync`。凭据、来源校验和日志说明见[手动触发同步](../deploy/README.md#手动触发同步)。

插件源码改动可用「编译前端插件」生成独立包，再用「热更新前端」发布。已有预编译包可直接放入前端数据目录的 `plugin-inbox/` 并发布。详见[插件更新](../deploy/README.md#单独编译和热更新前端插件)。

npm 安装默认启用 `--loglevel=verbose --timing`，实时显示详细日志、各阶段耗时及调试日志文件位置；Docker 主体/插件构建和原生构建均生效。更新此安装入口后需重新构建前端镜像。

**npm 下载缓存自动持久化**：助手在所选前端数据目录创建 `npm-cache/`，编译容器将其挂到 `/build/npm-cache`。主体、插件和重试共用缓存，一次性容器退出不会清除；安装优先复用已下载的包，缺失时才下载。每次仍按锁文件执行 `npm ci` 安装依赖。插件构建会自行准备锁定的后端契约，不依赖上一次主体构建留下的文件。

已有部署更新后，在项目根目录执行 `git pull`、`./setup.sh --docker build`，成功后执行 `./setup.sh --docker start`。助手会重建镜像并准备缓存挂载，无需新增配置项；完整挂载说明见[部署教程](../deploy/README.md#npm-下载缓存)。

运行程序直接读取 `CONFIG_FILE` 指定的 YAML，默认宿主项目根 `config.yaml`；助手将其所在目录可写挂到 `/config` 并传入容器路径。浏览器编辑和 setup 写回同一文件，不随新产物覆盖。代码供编译，成功产物挂 `/workspace`，数据挂 `/data`。选择主网络 `bridge` 和额外网络 `1panel-network` 时，脚本先接入全部网络再启动。更新 Dockerfile 后先构建一次镜像。

此目录保留 Dockerfile、Compose、入口脚本和一次性工具镜像的构建文件。数据默认位于 `docker/data`，配置来自根目录 YAML。不要手动维护自动生成的 `.env` 和运行配置。

向导的「前端 Node.js 运行 worker 数」对应根 `config.yaml` 中的 `environment.FRONTEND_WORKERS`，默认为 `"1"`，支持 1–32。可以用同名环境变量覆盖（直接运行容器时使用 `-e FRONTEND_WORKERS=2`）。它只在启动时读取；已有新版产物时，保存后重新创建运行容器即可，无需编译。早于此功能的产物要先编译一次。所有 worker 共用原端口和公开快照；插件清单上报及同步检查仍各运行一次。

推荐两端加入 `1panel-network`，设置别名 `everunfold-backend`、`everunfold-frontend`，使用容器内部端口 `8001` / `3000` 互访，并在两端的内部通信来源字段填写 `1panel-network`。宿主反代通过该网桥访问时，“HTTPS 反向代理的直接来源 IP”也可填这个名称。也可开启 `host.docker.internal` 映射，此时使用宿主映射端口，例如 `3434`。详见[容器互通教程](../deploy/README.md#容器互通推荐共享网络和别名)。本轮前端更新需重新 `build` 主体与镜像，再 `start`；后端更新后执行 `deploy`。日常重启不编译。

## 二、不使用 Docker

安装 uv；前端另外需要 Node.js 22 和 npm 10。仍在项目根目录运行：

```bash
./setup.sh --native
```

与 Docker 使用同一份根目录 `config.yaml`，无需重新抄写密钥。依赖安装、初始化、编译、启动与长期托管见[不使用 Docker](../deploy/README.md#二不使用-docker)。

“仅保存”成功后保留界面。后端“登记并导出 Base64”后也保留界面，显示完整编码和前端导入命令。

前端只使用一个端口（默认 `3000`），网页与 `/internal/*` 同步接口共用。粘贴后端输出的节点连接 Base64，无需共享文件：

```bash
./setup.sh --docker --connection-base64
```

命令提示粘贴 Base64，导入后检查配置再保存。检测只访问后端内部地址。旧双端口版本升级需重建镜像和主体，更新后端接收 URL / 代理上游到前端唯一端口。

自定义配置路径：先 `export CONFIG_FILE=/宿主绝对目录/config.yaml`，再运行上述 setup 命令。默认只读取项目根 `config.yaml`，无 TOML 自动回退。直接创建容器时使用容器内路径，例如 `-e CONFIG_FILE=/data/config/config.yaml`；挂载其所在目录并确保前端运行用户可写。
