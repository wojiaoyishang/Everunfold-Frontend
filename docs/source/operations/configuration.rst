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

后端配置
--------

.. list-table::
   :header-rows: 1
   :widths: 43 57

   * - 字段
     - 作用
   * - ``BACKEND_BASE_URL``
     - 公开 API 根地址，用于认证与公开链接派生。示例为 ``https://api.example.com``。
   * - ``[cors].allowed_origins``
     - 可信网页的精确 Origin 列表。默认的开发地址应按实例替换。
   * - ``[auth].cookie_name``、``cookie_samesite``、``cookie_secure``
     - 浏览器会话设置。HTTPS 保持 Secure。通常保留 API 主机的默认 Cookie 域范围。
   * - ``[database].url``、``[media].uploads_path``
     - 数据库连接和媒体目录。部署时为上传启用持久存储与适当权限。
   * - ``[media].base_url``
     - 公开媒体地址。留空时使用 API 根下的 ``/media``。
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

前端配置
--------

.. list-table::
   :header-rows: 1
   :widths: 43 57

   * - 字段
     - 作用
   * - ``PUBLIC_SITE_URL``、``FRONTEND_NODE_ID``
     - 站点公开根地址与稳定节点 ID。节点 ID 与后端条目的键一致。
   * - ``BACKEND_BASE_URL``、``[backend].base_url``
     - 分别用于浏览器和 Next.js 服务端。内部地址可显式指向单独的私有监听。
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
