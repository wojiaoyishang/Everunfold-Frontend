# Everunfold 前端部署入口

前后端统一使用项目根目录的 `setup.sh` 与 `config.yaml`。配置助手在 `deploy/`，不需要进入 `docker/` 运行。完整的逐步教程见[部署教程](../deploy/README.md)。

## 一、Docker 从零构建

1. 安装 Docker Engine、Compose v2、Bash 4+ 和 Git，确认 `docker info` 可用。
2. 克隆本仓库，在仓库根目录执行下列命令。后端需要事先准备 PostgreSQL 和 Redis；前端需要后端导出的节点连接 JSON。
3. 在配置总览填写代码目录、数据目录、容器名称、主网络、额外网络、端口；前端还可选产物输出目录。助手提供连接检测，保存根目录 `config.yaml`。

```bash
./setup.sh --docker
# 在界面导入后端连接 JSON，选择“构建并启动”
# 或仅保存并退出界面后，分开执行：
./setup.sh --docker build
./setup.sh --docker start
```

工具镜像自动构建，退出即删除工具容器；应用镜像的构建日志实时显示。`start` 和容器重启不会重新编译前端。镜像、挂载、持久化、HTTPS 和首次同步的完整说明见[Docker 从零构建与部署](../deploy/README.md#一docker-从零构建与部署)。

根 `config.yaml` 生成根目录 `config.runtime.toml`，由助手只读挂入运行产物；不要求数据目录保存配置。代码供编译，成功产物挂 `/workspace`，数据挂 `/data`。选择主网络 `bridge` 和额外网络 `1panel-network` 时，脚本先接入全部网络再启动。更新 Dockerfile 后先构建一次镜像。

此目录保留 Dockerfile、Compose、入口脚本和一次性工具镜像的构建文件。数据默认位于 `docker/data`，配置来自根目录 YAML。不要手动维护自动生成的 `.env` 和运行配置。

## 二、不使用 Docker

安装 uv；前端另外需要 Node.js 22 和 npm 10。仍在项目根目录运行：

```bash
./setup.sh --native
```

与 Docker 使用同一份根目录 `config.yaml`，无需重新抄写密钥。依赖安装、初始化、编译、启动与长期托管见[不使用 Docker](../deploy/README.md#二不使用-docker)。

“仅保存”成功后保留界面。后端登记并导出节点后也保留界面，显示文件的宿主绝对路径。

前端只使用一个端口（默认 `3000`），网页与 `/internal/*` 同步接口共用。导入同一宿主的后端连接文件：

```bash
./setup.sh --docker --connection-file /opt/everunfold/Everunfold-Data/backend/connections/web-main.json
```

检测只访问后端内部地址；导入文件只读挂入临时配置容器。旧双端口版本升级需重建镜像和主体，更新后端接收 URL / 代理上游到前端唯一端口。
