实例配置与环境变量
==================

配置文件位置
------------

- 每个仓库的 ``config.example.toml`` 用于创建本端的 ``config.toml``。实际配置和凭据留在部署环境。
- 后端从显式参数、``CONFIG_FILE`` 或仓库根的 ``config.toml`` 加载，按此顺序取一个文件，
  再应用受支持的环境变量覆盖。媒体相对目录以该配置文件所在目录为准。
- Next.js、Node 接收器和上报服务使用同一前端加载器。``CONFIG_FILE`` 缺省为项目根的
  ``config.toml``，前端设置与快照的相对目录采用运行项目根。
- 普通服务从进程环境读取变量。开发 Supervisor 的脚本显式载入后端的
  ``.env.container.local``。检查容器中每个进程的工作目录和环境来源。

发布 URL、监听与端口映射
----------------------------------------

三个层次独立配置。例如后端发布在 ``https://api.example.com``，宿主反向代理访问
``127.0.0.1:18001``，Docker 再映射到容器中 Uvicorn 监听的 ``0.0.0.0:8001``。
发布 URL 用于生成资源链接；进程绑定地址决定监听哪张网卡和端口；宿主映射决定
Docker 如何将外部连接转给容器。发布 URL 不从监听参数或请求 Host 推导。

后端 Docker 的 ``runtime.env`` 设置 ``API_HOST``，Compose 的 ``.env`` 设置
``BACKEND_API_PORT``、``BACKEND_BIND_ADDRESS``、``BACKEND_PUBLISH_PORT``。
其中 ``BACKEND_API_PORT`` 被注入为容器的 ``API_PORT``，其余两项仅控制宿主映射。
前端对应为 ``FRONTEND_HOST``、``FRONTEND_WEB_PORT``、``FRONTEND_BIND_ADDRESS``、
``FRONTEND_PUBLISH_PORT``，容器端口变量为 ``FRONTEND_PORT``。
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

旧版向导省略了后端发布 URL，升级时在主 TOML 的首个小节之前补齐
``BACKEND_BASE_URL``，再重新创建容器。加载器保留旧配置相对 ``/media`` 的兼容行为，
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
