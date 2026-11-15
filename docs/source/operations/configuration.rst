实例配置与环境变量
==================

配置文件位置
------------

- 统一入口是各项目根目录的 ``./setup.sh``，统一部署配置为根目录 ``config.yaml``。
  Docker / 原生使用同一来源；助手自动生成应用 TOML、进程环境和 Compose 参数。
  根 YAML 含私有凭据，权限为 0600，不提交 Git。
- 旧向导的 Docker / 原生实例文件可在首次保存时导入；保存后根 YAML 优先。
  ``config.example.toml`` 保留为底层应用字段参考，普通部署不需要复制和手工填写。
- 后端依次使用显式参数、``CONFIG_FILE``、根 ``config.yaml``（存在时），最后回退根 ``config.toml``。
  YAML 中 ``environment`` 的值在启动器中载入，显式容器环境变量可覆盖它们。
  Docker 的媒体默认使用 ``/data/uploads``；原生使用实例目录的 ``uploads``。
  YAML 中媒体相对路径以数据目录为基准，旧 TOML 相对路径仍以配置目录为基准。
- Next.js、Node 接收器和上报服务使用同一前端加载器。助手从根 YAML 生成根
  ``config.runtime.toml``，Docker 将其只读挂到 ``/workspace/config.runtime.toml``；
  启动器指定 ``CONFIG_FILE``。底层加载器保留旧 ``config.toml`` 的兼容入口。
- 普通服务从进程环境读取变量。开发 Supervisor 的脚本显式载入后端的
  ``.env.container.local``。检查容器中每个进程的工作目录和环境来源。

发布 URL、监听与端口映射
----------------------------------------

统一配置助手
~~~~~~~~~~~~

在项目根目录运行 ``./setup.sh --docker`` 或 ``./setup.sh --native``。
Docker 模式自动构建配置工具镜像；原生模式由 uv 准备锁定的工具依赖。
Textual 彩色界面先列出全部配置，提供顺序配置、按项修改、连接检测、保存、构建和启动。
编辑框支持左右移动、上下调取本项会话历史、Ctrl+U 清空；URL 完整回显，密钥在总览遮盖，
编辑时可查看。新站点自动生成密钥，已有站点加载原值。退出后恢复终端属性。

PostgreSQL 支持分项填写并编码用户名、密码。连接检测执行真实查询、迁移版本核对和
Redis / Broker PING；前端检测后端公开、内部就绪入口。检测不初始化或升级数据库。
修改配置后旧检测结果失效，错误不输出完整凭据。

根 YAML 的 ``application`` 保存应用字段，``environment`` 保存进程参数和凭据，
``docker`` 保存镜像、挂载和端口映射，``assistant`` 保存配对及助手参数。
独立后端连接清单由 ``connection_profiles`` 保存，编辑仅更新 active 项。
使用助手可免于手写这些字段。手工修改 YAML 后，下次启动或构建自动重新生成运行文件；
不要修改派生的 TOML、``.env``、``runtime.env``。

根 ``config.runtime.toml`` 是派生配置；后端直接使用根 YAML。环境文件分别生成到
``docker/runtime.env`` 或 ``var/instance/runtime.env``。Docker CLI 使用另生成的
``runtime.env.docker``，其格式不含 Compose 的包裹引号和变量转义，不要混用。
保存前为变更文件生成 0600 备份，并拒绝覆盖并发修改；写入失败回滚。
默认数据目录随部署方式变化，已有数据不会自动迁移。
新的内部来源列表默认包含 ``127.0.0.1, ::1``；Docker 新配置还包含所选网络的子网，
已有列表保持原值，节点令牌校验继续生效。

容器挂载与网络
~~~~~~~~~~~~~~

配置总览包含代码目录、数据目录、容器名称、主网络、额外网络、端口、镜像名称；
前端另外填写编译产物输出目录。数据目录不再要求包含 ``config.toml``。
主网络默认 ``bridge``，额外网络逗号分隔且须已经存在，例如 ``1panel-network``。
脚本先创建容器、逐个接入额外网络、再启动。配置工具与启动前检查也使用这些网络。
修改网络后，界面连接检测需先保存再重新打开；启动前检查会使用新配置。
默认 bridge 不支持容器名解析，数据库容器名应在双方共享的自定义网络中使用。

修改数据目录不会搬运媒体或快照；若代码目录不等于当前项目，助手会同步根 YAML 到所选代码目录。
旧容器只有归属于当前部署或源码、数据挂载均匹配时才会被替换；同名无关容器会被拒绝。

地址的三种职责
~~~~~~~~~~~~~~

三个层次独立配置。例如后端发布在 ``https://api.example.com``，宿主反向代理访问
``127.0.0.1:18001``，Docker 再映射到容器中 Uvicorn 监听的 ``0.0.0.0:8001``。
发布 URL 用于生成资源链接；进程绑定地址决定监听哪张网卡和端口；宿主映射决定
Docker 如何将外部连接转给容器。发布 URL 不从监听参数或请求 Host 推导。

后端根 YAML 的 ``environment.API_HOST`` / ``API_PORT`` 设置进程绑定；
``docker.BACKEND_BIND_ADDRESS``、``BACKEND_PUBLISH_PORT`` 设置宿主映射。
Compose 使用的 ``BACKEND_API_PORT`` 自动从进程端口生成，无需重复修改；
前端 Web 和接收器端口也按此规则生成，宿主地址和宿主端口独立。
前端对应为 ``FRONTEND_HOST``、``FRONTEND_WEB_PORT``、``FRONTEND_BIND_ADDRESS``、
``FRONTEND_PUBLISH_PORT``，容器端口变量为 ``FRONTEND_PORT``。
接收器另用 ``FRONTEND_RECEIVER_PORT`` 和 ``FRONTEND_RECEIVER_PUBLISH_PORT``，
宿主映射固定绑定回环，供受限 HTTPS 代理转发。
直接启动进程时使用 Uvicorn/Next.js 的监听参数，直接 ``docker run`` 时设置容器变量。
Docker 端口映射通常要求进程绑定 ``0.0.0.0``，各端健康检查访问容器内监听地址。

后端配置
--------

.. list-table::
   :header-rows: 1
   :widths: 43 57

   * - 字段
     - 作用
   * - ``BACKEND_BASE_URL``
     - 后端发布根 URL，用于媒体等绝对资源链接、第三方签名查询 URL 和 Cookie 的 HTTPS 配置。
       反代部署填外部入口，例如 ``https://api.example.com``；不带 ``/api`` 或 ``/v1``。
   * - ``[cors].allowed_origins``
     - 可信网页的精确 Origin 列表。默认的开发地址应按实例替换。
   * - ``[auth].cookie_name``、``cookie_samesite``、``cookie_secure``
     - 浏览器会话设置。HTTPS 保持 Secure。通常保留 API 主机的默认 Cookie 域范围。
   * - ``[database].url``、``[media].uploads_path``
     - 数据库连接和媒体目录。部署时为上传启用持久存储与适当权限。
   * - ``[media].base_url``
     - 独立媒体域名或 CDN 前缀。省略时使用 ``BACKEND_BASE_URL + /media``，
       上传目录仍由 ``uploads_path`` 决定。
   * - ``[redis].url``、``[redis].namespace_scope``、``[project].key``
     - 运行 Redis 及命名空间。开发、预发布与生产使用独立作用域。
   * - ``[celery].broker_url``
     - Scheduler 和 Worker 连接的任务 Broker。不同环境使用隔离配置。
   * - ``[query_cache].enabled``、``url``、``ttl_seconds``、``timeout_ms``、``max_value_bytes``
     - 后端公开查询缓存。默认 TTL 为 45 秒。配置专用 Redis 地址后生效，地址缺失、
       超时或不可用时从 PostgreSQL 查询。
   * - ``[internal_auth].allowed_peer_ips``
     - API 内部入口应看到的实际连接来源。填写前端服务或受信的内部代理 IP/CIDR。
   * - ``[frontends.<节点 ID>]``
     - 节点公开网页地址 ``base_url``、启停 ``enabled``、接收端
       ``settings_receiver_url`` 和两个方向的令牌环境变量名。

后端支持 ``DATABASE_URL``、``REDIS_URL``、``QUERY_CACHE_REDIS_URL``、
``CELERY_BROKER_URL`` 与 ``CELERY_RESULT_BACKEND_URL`` 覆盖对应连接值，
以及 ``BACKEND_BASE_URL`` 覆盖公开 API 根地址。当前任务配置使用持久业务记录查看状态。
声明了专用查询 Redis 仍需验证该进程的实际连接。

节点条目可以内联在主配置中，也可以使用根键 ``frontend_nodes_file`` 引用只含
``[frontends.*]`` 的独立 TOML。相对引用从主 TOML 所在目录解析。
若节点清单已导入数据库，请按 :doc:`nodes` 更新存储的部署绑定。
多个前端的公开地址和启停由后端 ``/_nodes`` 管理；
``[cors].use_frontend_registry = true`` 时，已绑定且启用节点的精确 Origin 参与来源校验。

旧版向导省略了后端发布 URL，升级时在根配置助手中补齐后端发布 URL，再启动。加载器保留旧配置相对 ``/media`` 的兼容行为，
多前端部署应显式设置发布 URL，避免媒体地址解析到各前端站点。

前端配置
--------

.. list-table::
   :header-rows: 1
   :widths: 43 57

   * - 字段
     - 作用
   * - ``PUBLIC_SITE_URL``
     - 本前端的发布根 URL，用于 canonical、Open Graph、站点地图和订阅链接；
       与后端 ``/_nodes`` 中对应节点的公开地址一致。
   * - ``FRONTEND_NODE_ID``
     - 稳定节点 ID，与后端节点清单条目的键一致。
   * - ``BACKEND_BASE_URL``
     - 浏览器调用 API 的公开入口，与后端发布 URL 一致。
   * - ``[backend].base_url``
     - 前端服务端连接后端的目标 URL，省略时沿用 ``BACKEND_BASE_URL``。
       可独立设置内网入口，仅服务端可见，与前端自身监听地址独立。
   * - ``[backend].allowed_peer_ips``
     - Node 接收器允许的真实连接来源。填写 Worker 或接收器前的受信内部代理。
   * - ``[settings].directory``、``source_epoch``
     - 设置副本目录和数据库来源 UUID。接收器启动需要来源 UUID。
   * - ``[settings].receiver_host``、``receiver_port``
     - Node 接收器监听 IP 和端口，缺省为 ``127.0.0.1:3001``。
   * - ``[cache].directory``、``max_snapshot_bytes``
     - 公开内容快照目录及单份快照大小限制。
   * - ``[theme].active``、``[plugins].directory``
     - 实例默认主题和独立插件包目录。已应用的站点扩展设置参与主题选择。

前端支持 ``BACKEND_BASE_URL``、``PUBLIC_SITE_URL``、``FRONTEND_NODE_ID``、
``FRONTEND_THEME`` 和 ``PLUGINS_DIRECTORY`` 覆盖。采用独立连接时，
``backend-node.toml`` 保存 ``active`` 和 ``[profiles.<连接 ID>]``。
连接项中包含 ``BACKEND_BASE_URL``、``source_epoch``、可选的 ``browser_loopback_origin``
以及对应的 ``[profiles.<连接 ID>.backend]``。主配置保留站点地址、节点 ID、目录和监听；
将根级 API 地址、内部 ``[backend]`` 和 ``[settings].source_epoch`` 从主配置移至连接配置，
同时解除环境中的 ``BACKEND_BASE_URL`` 覆盖。

发布 URL 和内部连接从挂载的运行配置读取，修改域名后更新相应节点清单与反向代理，
重新创建前端容器即可，无需重新编译主体。配置中的 ``PUBLIC_SITE_URL`` 和
``BACKEND_BASE_URL`` 若被同名环境变量覆盖，需一并调整覆盖值。

凭据的方向与存放位置
--------------------

- ``nextjs_to_fastapi_token_env`` 在两端引用同一个上报令牌。前端服务端发送，FastAPI 验证。
- ``fastapi_to_nextjs_token_env`` 在两端引用同一个投递令牌。Worker 发送，Node 接收器验证。
- 两个令牌使用不同随机值。接收器要求令牌至少 32 字符且来源白名单非空。
  连接配置保存变量名，实际值由部署环境注入相关进程。
- 后端初始化读取 ``EVERUNFOLD_ADMIN_PASSWORD``。TOTP 及应用主密钥按
  ``[auth].totp_master_key_env`` 和 ``[auth].application_master_key_env`` 引用，
  同一站点的相关后端实例保持稳定值。AI 写作使用应用主密钥保护配置密钥；
  由实际执行请求的 Worker 负责连接，私有网关是否允许取决于
  ``EVERUNFOLD_AI_PROVIDER_ORIGINS``。
- 节点诊断使用独立的 ``[nodes_monitor]`` 配置。设置前端与后端时各自生成密码哈希、
  配置 HTTPS 或回环 Origin，并分别注入对应的会话密钥。
