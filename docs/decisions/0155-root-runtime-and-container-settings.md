# ADR 0155：根配置直读与容器挂载向导

- 状态：已实现；真实 Docker daemon 验收待部署环境执行
- 日期：2026-11-15
- 范围：根配置位置、容器挂载及网络创建
- 衔接：ADR 0154；更新其运行配置位置及 Compose 启动方式
- 后续：ADR 0156 按用户要求增加部署助手的空库自动初始化；已有库仍显式升级。

## 背景

用户使用独立代码、数据目录部署后，Worker 因 `/data/config.toml` 缺失退出；用户要求应用配置位于项目根，并在构建、创建容器前交互询问挂载等设置。另已确认 Docker CLI 不允许在同一创建命令混用内置 bridge 与自定义网络。

## 决定

1. 后端加载器支持根 `config.yaml` 的 `application` 与 `environment`。默认优先根 YAML，兼容显式 TOML 及无 YAML 时根 TOML。Docker 入口先读取 YAML 环境，再启动 API、Worker、Scheduler；显式容器环境覆盖根值，不借助 shell source。缺文件或配置无效在子进程启动前报告，不输出秘密值。
2. 后端配置随代码只读挂在 `/workspace/config.yaml`；`/data` 只承担持久数据。Docker 媒体默认 `/data/uploads`，原生使用实例目录。YAML 的媒体相对目录以数据目录为基准；旧 TOML 的相对路径规则保留。健康检查读取相同根环境中的监听地址和端口。
3. 两端 TUI 先展示代码目录、数据目录、容器名、主网络、额外网络；镜像、端口可编辑，前端另有产物输出目录。保存只修改根 YAML，退出工具后宿主重新建立挂载再生成派生文件，允许选择原工具容器尚未挂载的路径。代码另选目录时同步根 YAML 并备份；数据不自动迁移。
4. 前端底层应用格式仍为 TOML，派生文件改到根 `config.runtime.toml`，运行时单文件只读挂入产物 `/workspace/config.runtime.toml`。根 YAML 是用户唯一维护的配置。CLI env 使用不带 Compose 包裹引号的独立派生文件，避免密码和令牌被错误解析；这些文件均忽略 Git。
5. 主网络默认 `bridge`，额外网络为逗号分隔的已有网络。使用创建容器、分别接入额外网络、最后启动的顺序，工具容器及启动检查亦如此。修改网络后界面检测需先保存重开，实际启动前检查直接采用新配置。已有内部来源允许列表不随网络静默扩展。
6. Compose 负责镜像与前端编译，应用启动由根宿主脚本执行。启动前检查通过才替换当前部署容器；部署标识或源码及数据挂载匹配时允许重新创建，拒绝覆盖无关同名容器。容器删除不带卷删除参数，不删除宿主数据。服务启动不迁移数据库，前端启动不重新编译。
7. 后端新增 PyYAML 6.0.3 及开发类型存根，随 `uv.lock` 锁定。旧镜像需重新构建；入口保留依赖锁一致性检查。

## 验证与限制

配置加载覆盖根优先级、旧 TOML、环境覆盖、媒体目录、非法 YAML、秘密值保护及启动前环境注入；助手与 Docker 命令桩覆盖外部目录、双网络顺序、端口、自定义名称、失败不替换旧容器、前端构建激活及不重编译启动。真实 Compose v2 渲染通过。

隔离 PostgreSQL/Redis 中移走旧数据目录配置后，根入口真实运行后端三进程、前端两进程；后端 `/health/ready` 200（database/redis/schema ok），前端缺初次公开快照为 503，接收器拒绝无凭据请求。真实后端 shell 入口及 YAML 适配器也完成同样的后端启动检查。当前无 Docker daemon，以上不能代替镜像构建、实际双网络接入及部署机端口连通性验收。

依赖兼容依据 [PyYAML 6.0.3](https://pypi.org/project/PyYAML/6.0.3/) 与 [types-PyYAML](https://pypi.org/project/types-PyYAML/6.0.12.20261113/) 官方元数据。网络操作遵循 [Docker network connect](https://docs.docker.com/reference/cli/docker/network/connect/)；实际 CLI 创建限制已由用户报错及 CLI 实现确认。
