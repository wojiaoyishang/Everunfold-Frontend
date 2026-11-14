运行与部署
==========

地址和信任边界
--------------

.. list-table::
   :header-rows: 1
   :widths: 23 38 39

   * - 通路
     - 常用配置
     - 确认事项
   * - 浏览器访问网页
     - 前端 ``PUBLIC_SITE_URL``
     - 正式站点使用 HTTPS。该地址参与 canonical 和 Sitemap。
   * - 浏览器访问 FastAPI
     - 前后端 ``BACKEND_BASE_URL``，后端 ``[cors].allowed_origins``
     - 允许可信前端的精确 Origin，验证 Cookie 与 CSRF。业务路径为 ``/v1/*``，
       协同路径为 ``/ws/v1/*``。
   * - Next.js 服务端访问 FastAPI
     - 前端 ``[backend].base_url``，后端 ``[internal_auth].allowed_peer_ips``
     - 固定内部地址，按真实 socket 来源和令牌校验内部请求。
   * - 后端 Worker 向前端节点投递
     - 后端 ``frontends.<node>.settings_receiver_url``，前端 ``[backend].allowed_peer_ips``
     - 校验节点 ID、来源 UUID、真实 socket 来源及另一个方向的令牌。

生产可将站点与 API 部署在同站点的不同 HTTPS 域名上。内部请求可在同机使用回环；
跨机内部连接使用 HTTPS 并限制实际来源。反向代理应将 ``/internal/*`` 留在内部，
对外转发协同路径时支持 WebSocket Upgrade。节点诊断默认关闭，可按部署需要单独开启
并限制入口。生产使用受信代理处理客户端地址前，请验证限流与来源判定。

进程和配置
----------

- API、Celery Worker 和 Scheduler 分开部署。调度进程在相同 Redis 作用域中保持一个实例。
  数据库迁移在部署时显式执行。修改实例配置或凭据后，重启受影响的进程。
- 前端用 ``npm run build`` 生成应用和独立插件包，由 ``npm run start`` 提供网页。
  ``npm run settings:receiver`` 是另一个进程，接收并落盘公开设置和内容。
  若把接收器与网页部署到不同容器，应为同一节点挂载相同的持久设置与快照目录。
- 前端可以选用 ``backend-node.toml`` 管理后端连接配置，后端以
  ``frontend-nodes.toml`` 提供自己的节点清单。两个文件各自部署。
  前端从内联模式切换至独立配置文件时，按 ``config.example.toml`` 注释移动连接字段。
- 后端运行态 Redis 与 Celery Broker 按用途区分。若配备查询缓存 Redis，独立配置
  ``[query_cache].url`` 或 ``QUERY_CACHE_REDIS_URL``。
- 站点后台需要 SMTP 才能实际投递注册、验证邮箱和找回密码邮件。
  启用 TOTP 和 AI 写作等能力时，为相应后端进程注入稳定的主密钥。
  AI 写作仅向用户生成时确认的服务商投递，私有模型网关来源由运行环境授权。

容器开发
--------

后端仓库的 ``deploy/`` 提供 Supervisor 启停脚本和 Nginx 开发模板。
准备两端实例配置、后端 ``.env.container.local`` 和模板生成的 ``var/container/nginx.conf``，
再从后端目录启动。开发代理入口为 3000，Next.js 服务在 3100，
API 在 8001。模板保留业务路径和协同路径，接收器仍使用内部地址。

.. code-block:: bash

   ./deploy/container-dev.sh start
   ./deploy/container-dev.sh status
   ./deploy/start-test.sh --check

同级前端默认目录为 ``Everunfold-Frontend``，可通过
``EVERUNFOLD_FRONTEND_ROOT`` 显式指定。首次启动前须按 :doc:`quickstart`
准备数据库和节点绑定。容器脚本启动开发进程，生产部署使用本节给出的独立进程入口。

首轮检查
--------

1. 核对后端 ``/health/live`` 和 ``/health/ready``，确认 SQL 迁移、数据库、Redis 和进程状态。
2. 登录管理工作台。检查管理员和普通编辑者的权限、反向代理后的上传与协同连接。
3. 在后台查看节点回执。用测试文章验证保存、发布、撤回和快照版本，确认多节点皆已应用。
4. 检查公开页及 XML。Sitemap 在 ``/sitemap.xml``，RSS 在 ``/feed.xml``。
   按站点索引设置检查可访问性，并确认草稿和后台页的缓存、索引行为。
5. 区分诊断工具和备份。保存 PostgreSQL、上传媒体和部署引用的稳定主密钥。
   验证恢复后绑定的 ``source_epoch`` 与前端节点一致。
   前端公开快照可由后端重新投递。站点后台的导出范围应按实际版本核对。

.. seealso::

   :doc:`../release/index` 记录配套版本、发布验收和 GitHub 文档发布方式。
