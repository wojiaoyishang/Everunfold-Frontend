进程和网络拓扑
==============

单机开发可以使用一个 HTTP 代理，对外统一访问一个本地入口。
独立部署通常将网页和 API 放在同一站点的不同 HTTPS 主机名上。下图中的全域名仅作示例。

.. code-block:: text

   浏览器
     ├── 网页、静态资源 ─────────> https://blog.example.com ──> Next.js
     └── API、受限内容、WebSocket ─> https://api.example.com  ──> FastAPI
                                      FastAPI ──> PostgreSQL / Redis
   Next.js 节点 ── 内部上报 ──> FastAPI
   Scheduler ── 计划执行 ──> Celery Broker ──> Worker
   Worker ── 内部投递 ──> Node 接收器 ──> 当前节点的副本目录 ──> Next.js

进程职责
--------

.. list-table::
   :header-rows: 1
   :widths: 25 75

   * - 进程
     - 职责
   * - Next.js
     - 提供读者页面和后台界面。使用节点当前已应用的公开数据生成读者页面，
       浏览器后台请求使用公开 API 地址。
   * - FastAPI
     - 鉴权、协调草稿、保存设置、提交发布，以及提供对外业务接口。发布后登记
       需要执行的任务和节点投递。
   * - Celery Worker
     - 执行节点投递、邮件、媒体派生、可选的 AI 生成等后台工作。
   * - Scheduler
     - 扫描计划、派发或恢复到期任务。同一 Redis 作用域保持一个实例。
   * - Node 接收器
     - 校验来源并落盘公开内容、站点设置及节点策略。接收器与 Next.js 须读写
       同一节点、同一来源和同一组副本目录。
   * - PostgreSQL 和 Redis
     - PostgreSQL 保存业务记录、任务及投递状态。运行态 Redis 用于通知和临时状态，
       Celery Broker 负责传输任务，公开查询缓存可使用专用 Redis 实例。

代理路径
--------

.. list-table::
   :header-rows: 1
   :widths: 33 28 39

   * - 路径
     - 服务
     - 转发要点
   * - ``/``、``/admin``、``/_next/``、``/feed.xml``、``/sitemap.xml``
     - Next.js
     - 保留原路径。认证页面、草稿与私有预览不得进入共享缓存。
   * - ``/v1/``、``/media/``
     - FastAPI
     - 保留业务 API 版本和媒体路径。核对请求体限制和上传超时。
   * - ``/ws/v1/``
     - FastAPI
     - 转发 WebSocket Upgrade，允许协同连接保持，并检查认证和 Origin。
   * - ``/health/live``、``/health/ready``
     - FastAPI 或指定的服务监听
     - 单入口开发模板把 ``/health/`` 转给 FastAPI。需要独立检查 Next.js 的公开快照时，
       直接访问 Next.js 监听地址上的 ``/health/ready``。
   * - ``/docs``、``/openapi.json``
     - FastAPI
     - 按部署需要开放交互文档。RST 开发手册由独立的静态站点提供。
   * - ``/internal``、``/internal/``
     - 私有监听或受限入口
     - 开发模板在公开代理拒绝这些路径。按真实连接来源 IP/CIDR 和方向令牌共同校验。

API 端口、接收器端口以及数据库和 Redis 的暴露范围按实际网络隔离。
连接跨设备时使用 HTTPS 并限制来源。TLS 终止代理的来源是后端实际观察到的 socket 对端；
校验以该连接为准。部署变更时分别验收代理后的业务身份与服务间身份。

浏览器地址和服务间地址
----------------------

浏览器通过 ``BACKEND_BASE_URL`` 找 API，通过 Cookie 维持站点会话。
后端 ``[cors].allowed_origins`` 只填写实际网页 Origin。更改协议、域名或端口都需要同时更新 Origin。
设置 ``PUBLIC_SITE_URL`` 后，Next.js 用它构造 canonical 与 Sitemap。

服务端上报使用前端 ``[backend].base_url``。Worker 投递使用后端节点条目中的
``settings_receiver_url``。两条通路使用独立令牌及各自的来源白名单，路径和方向见
:doc:`configuration`。同机服务可用回环 HTTP。容器分开时，回环地址指向各自容器；
使用实际私网入口并按跨设备规则设置内部 TLS。
