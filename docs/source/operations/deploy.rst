部署、启动与升级
================

首次安装按 :doc:`../welcome/quickstart`，分别完成后端、节点配对和前端首次同步。
所有配置操作都从各仓库根目录的 ``setup.sh`` 进入，统一配置文件是根目录
``config.yaml``。助手在 ``deploy/``，镜像与容器编排在 ``docker/``。


复制结果与导入命令
------------------

选中配置项按 Ctrl+C 或点“查看 / 复制选中项”；输入框可用 Shift+方向键选择后复制。
F4 打开完整执行结果；复制按钮使用终端剪贴板能力。SSH 或网页终端未允许剪贴板时，
点“终端复制”回到普通终端选中文字，回车返回助手。Ctrl+Q 退出。
后端导出后自动展开复制弹层并保留界面，显示文件宿主绝对路径和前端导入命令（路径自动安全引号）：

.. code-block:: bash

   # 在前端项目根目录执行；原生模式使用 --native
   ./setup.sh --docker --connection-file /opt/everunfold/Everunfold-Data/backend/connections/web-main.json

跨主机需先私下传输 JSON，再使用前端宿主上的绝对路径。命令不含令牌。
前端检测结果显示完整内部目标 URL 和 DNS、拒绝连接、超时、TLS 或 HTTP 失败原因；
不跟随重定向，遇到跳转时提示填写最终内部地址。

容器别名与宿主网关
~~~~~~~~~~~~~~~~~~

推荐前后端加入同一个自定义网络，例如 ``1panel-network``，分别设置网络别名
``everunfold-backend``、``everunfold-frontend``，内部地址使用
``http://everunfold-backend:8001`` 和 ``http://everunfold-frontend:3000``。
别名使用容器内部端口，不使用宿主映射端口；默认 ``bridge`` 没有别名解析。
临时工具容器不会占用应用别名。

后端配对可开启“允许私有网络 HTTP 接收”（Docker 新配置默认开启、原生关闭）。
仅适用于可信私有网络中的单段容器别名、私有 IP、``host.docker.internal``。
公开地址和公网传输继续使用 HTTPS；内部来源和令牌检查保留。

两端“自动允许所选网络内部调用”默认 1，启动时读取所选网络 CIDR，追加手动来源列表。
动态范围不写成永久手动授权；关闭则只采用手动列表。切换网络后用根 ``setup.sh start``
重新创建，不能只重启旧容器。跨主机或其他代理来源需手填，仍以真实 socket IP 为准。

“映射 host.docker.internal”默认 0；开启后工具、检查和运行容器均添加
``--add-host host.docker.internal:host-gateway``。此时填写宿主映射端口，例如
``http://host.docker.internal:3434``，并确保宿主端口绑定到容器可访问的接口。
开启自动允许时还追加默认 bridge 网关 IP；自定义网关或代理来源须手动配置。
修改网络或网关后，在配置界面检测前先保存、重新打开；构建/启动直接应用新设置。

一、Docker 从零构建与维护
-------------------------

配置与构建
~~~~~~~~~~

安装 Docker Engine、Compose v2 和 Bash 4+，准备可达的 PostgreSQL / Redis 后运行
``./setup.sh --docker``。选择保存、构建或构建并启动。
后端的“空库自动初始化”默认开启；构建并启动或 ``start`` 会先检查依赖，
仅确认空库时初始化、创建管理员、登记插件，复检通过后启动服务。
已有数据库仍须显式升级迁移，业务进程入口自身不执行 DDL。

镜像默认为 ``everunfold-backend:python312`` 和 ``everunfold-frontend:node22``，
构建阶段、镜像标签、启动日志均带 Everunfold 组件标识和源码版本。
一次性配置容器不挂 Docker socket，实际镜像构建由宿主脚本执行。

在总览中填写代码目录、数据目录、容器名、主网络、额外网络和端口。
主网络默认 ``bridge``，额外网络可填 ``1panel-network``；所有网络在进程启动前接入。
主网络可以创建，额外网络须已存在。启动统一使用根助手，直接 ``compose up`` 不处理额外网络。

后端只有源码 ``/workspace`` 与持久化 ``/data`` 两个挂载。
配置从 ``/workspace/config.yaml`` 读取，不依赖 ``/data/config.toml``。
前端镜像有编译和部署两种模式：编译模式接收只读源码，安装锁定依赖，导出新产物；
部署模式运行所选产物，另外将根 ``config.runtime.toml`` 只读挂到产物内同名文件。
``start`` 和重启不编译。
主体与整个插件批次构建成功后才更新所选版本；失败不选择未完成的产物。

前端编译自动将所选数据目录下的 ``npm-cache/`` 挂到 ``/build/npm-cache``，
主体与插件的临时容器共用下载缓存，容器删除和失败重试不会清除它。
每次仍按锁文件执行 ``npm ci --prefer-offline``，重建本次依赖目录，缺失的包才下载。
安装保留详细日志和阶段耗时；生成契约与编译工作区不持久化。
独立插件入口先准备锁定契约，因此不依赖主体编译留下的文件。
升级后运行 ``./setup.sh --docker build`` 会重建镜像并创建缓存目录。

初始化开关与失败处理
~~~~~~~~~~~~~~~~~~~~

后端新增“初始化数据库并构建启动”，命令为 ``./setup.sh --docker init-deploy``
或 ``./setup.sh --native init-deploy``：构建一次，显式初始化空库，复检并启动。
它不受自动初始化开关限制，也不改写开关；已有库跳过，旧版本仍要求显式迁移，失败停止。

根 YAML 的 ``environment.EVERUNFOLD_AUTO_INIT_EMPTY_DB`` 取字符串 ``"1"``（默认）或 ``"0"``。
旧配置未写此项也默认开启。检测连接和 ``check`` 只读；关闭开关时可单独执行 ``init-db``。
“初始化新库”不再按配置文件是否保存来判断站点类型，已初始化则跳过；该操作结束后提示 ``start`` 命令。

空库判断包含所有非系统 schema 的用户表、视图、序列、外部表及复合关系，
能识别当前角色无权读取的已有表。缺少迁移表的非空数据库会停止，旧迁移版本提示显式升级。
初始化全程持有数据库会话锁，避免两个部署同时初始化；各阶段失败停止，不启动服务。

后端升级
~~~~~~~~

先按 :doc:`recovery` 备份数据库、根配置和媒体，在维护窗口执行：

.. code-block:: bash

   ./setup.sh --docker build
   ./setup.sh --docker migrate
   ./setup.sh --docker start
   curl --fail http://127.0.0.1:8001/health/ready

迁移命令停止当前配置选定的后端容器，显式升级核心、登记插件并检查依赖。
成功后由 ``start`` 恢复 API、Worker、Scheduler，保持每个范围一个 Scheduler。
它不会迁移 PostgreSQL 服务本身，也不会自动升级其他实例。

前端升级与插件
~~~~~~~~~~~~~~

.. code-block:: bash

   ./setup.sh --docker build
   ./setup.sh --docker start
   docker logs --tail=100 everunfold-frontend

修改域名、连接和进程参数只需重新保存、启动，无需编译。
主体或主题源码变化要显式构建；独立插件沿用插件发布机制，可在 ``docker/`` 内执行
``docker compose run --rm builder build-plugins 插件目录名``。
直接运行该命令前，先在项目根目录执行 ``./setup.sh --docker render`` 准备挂载目录。
回滚主体时，在根 YAML 的 ``docker.FRONTEND_ARTIFACT_DIR`` 指向保留产物，再启动并核对兼容性。

宿主 HTTPS 代理默认转发 API 到 ``127.0.0.1:8001``；网页与内部接收器统一转给
``127.0.0.1:3000``。对应发布 URL 与实际监听分别配置，内部路径继续校验真实来源和令牌。
数据默认位于 ``docker/data/``；前端产物在 ``docker/output/``。
实际目录可由向导修改；修改挂载不会搬运旧数据，前后端数据目录应独立。
删除应用容器不删除这些宿主目录。日志和重启命令使用选定的容器名称。备份根 ``config.yaml``、数据、所选产物和 PostgreSQL。

二、不使用 Docker
-----------------

构建与运行
~~~~~~~~~~

安装 uv；前端另外安装 Node.js 22 / npm 10。根目录运行 ``./setup.sh --native``，
同样使用根 YAML，派生 TOML 位于项目根，环境文件和数据位于 ``var/instance/``。
``EVERUNFOLD_INSTANCE_DIR`` 可指定实例目录，托管进程须使用相同值。
更换部署方式不会搬运现有数据，切换前需安排媒体、快照和插件目录迁移。

.. code-block:: bash

   ./setup.sh --native build
   ./setup.sh --native start

后端安装锁定 Python 依赖；前端安装锁定 npm 依赖、编译主体和插件。
原生前端沿用当前账号的 npm 下载缓存，同样优先复用已有包并显示详细安装日志。
``start`` 自动载入配置、执行部署检查；后端按开关初始化空库，再启动本端进程，Ctrl+C 统一停止。
前端首次同步前的 503 属于未就绪状态，不能用配置检查通过代替公开读取验收。

长期托管
~~~~~~~~

使用 systemd / Supervisor 分别运行后端的三个入口：

.. code-block:: bash

   ./setup.sh --native api
   ./setup.sh --native worker
   ./setup.sh --native scheduler

前端分别运行：

.. code-block:: bash

   ./setup.sh --native web
   ./setup.sh --native receiver

使用相同服务账号和实例目录，根 YAML 的环境值由启动器加载，无需在服务文件中重复凭据。
单进程入口用于托管；发布前先执行 ``./setup.sh --native check``。
已有 Supervisor / Nginx 本地联调模板继续保留在后端 ``deploy/``，
其中开发模式和端口约定独立，不是本页生产运行入口。

升级与验收
~~~~~~~~~~

先停止托管进程，备份根配置、数据库和媒体，更新同批代码及契约。
后端执行 ``./setup.sh --native build``、``./setup.sh --native migrate``，再重启。
前端执行 ``./setup.sh --native build`` 后重启；原生构建直接更新本检出的 ``.next``，
需要回滚时应保留另一套代码和构建目录。

- API ``/health/ready`` 核对数据库、迁移与 Redis。
- 前端直连 ``/health/ready`` 核对本地公开快照，首次启用后执行完整同步。
- 后台节点页核对期望、实际版本；运行与任务页面核对 Worker 和 Scheduler。
- 用测试内容验证一次真实发布，再验证登录、媒体上传和草稿 WebSocket。

完整命令和文件布局见
`后端部署教程 <https://github.com/wojiaoyishang/Everunfold-Backend/blob/main/deploy/README.md>`__ 与
`前端部署教程 <https://github.com/wojiaoyishang/Everunfold-Frontend/blob/main/deploy/README.md>`__。
