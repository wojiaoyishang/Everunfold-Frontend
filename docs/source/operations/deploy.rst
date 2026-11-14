部署、启动与升级
================

开发容器
--------

后端仓库的 ``deploy/`` 提供 Supervisor 配置与 Nginx 模板。
这套脚本面向本地联调，包含 Next.js 开发模式、单并发 Worker 及可丢弃的专用查询缓存 Redis。

1. 按 :doc:`../welcome/quickstart` 安装两端依赖、显式初始化数据库，
   并准备节点身份、来源 UUID 和凭据。若从手动运行切换到 Supervisor，释放原有监听端口。
2. 将两个方向的令牌环境变量写入由部署者私下保存的后端 ``.env.container.local``。
   确认后端 ``.venv`` 与前端 ``node_modules`` 已安装。
3. 从 ``deploy/nginx.container.conf.template`` 生成运行文件
   ``var/container/nginx.conf``。将 ``__RUNTIME_DIR__`` 替换为该运行目录的绝对路径，
   将 ``__PUBLIC_HOST__`` 替换为联调主机名。确保运行目录可由服务账号写入。
   容器模板的对外代理端口为 3000，Next.js 端口为 3100，API 端口为 8001。
   ``deploy/start-test.sh`` 预期接收器监听容器内的 ``0.0.0.0:3001``。
   保持 3001 和后端直接端口仅在部署网络可达。
4. 在后端目录执行下列命令。只检查当前状态用 ``--check``。

   .. code-block:: bash

      ./deploy/start-test.sh
      ./deploy/start-test.sh --check
      ./deploy/container-dev.sh status

``EVERUNFOLD_FRONTEND_ROOT`` 可覆盖默认的同级前端检出目录，
``EVERUNFOLD_RUNTIME_DIR`` 可覆盖 Supervisor、Nginx 运行文件与日志所在目录。
默认七个程序为 ``api``、``frontend``、``receiver``、``worker``、``scheduler``、
``query-cache`` 和 ``proxy``。查看、重启或停止时继续使用配置它们的同一后端目录。

.. code-block:: bash

   ./deploy/container-dev.sh restart receiver
   ./deploy/container-dev.sh status

独立托管进程
------------

1. 从同一批预发布记录选择前端、后端及配套契约提交。恢复明确锁定的依赖后先构建前端。
   在预发布环境验证之前，不对外切流。

   .. code-block:: bash

      npm ci --ignore-scripts
      npm run build

2. 挂载 PostgreSQL、媒体目录与前端节点的设置及快照目录。配置 TLS、两个方向的令牌、
   Cookie、CORS 和端口。按 :doc:`configuration` 分别填写两端实例配置。
3. 新站点执行初始化。已有实例在发布窗口中按 :doc:`recovery` 建立恢复点，
   检查迁移头并显式执行 Alembic。

   .. code-block:: bash

      uv run --locked alembic -c migrations/alembic.ini current
      uv run --locked alembic -c migrations/alembic.ini upgrade head

4. 用部署环境的进程管理器分别运行下列三条后端命令。
   同一作用域保持一个 Scheduler，保留 Worker 完成或恢复工作的退出时间。

   .. code-block:: bash

      uv run --locked uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --no-proxy-headers
      uv run --locked celery -A app.entrypoints.worker:celery_app worker --loglevel=INFO
      uv run --locked python -m app.entrypoints.scheduler

   示例 API 命令用于本机代理；分机部署时按私有监听地址、防火墙、TLS 终止位置和服务器设置调整。
   通过代码部署后端插件后，使用下列命令登记清单，以当前部署配置运行。

   .. code-block:: bash

      uv run --locked python -m tools.register_backend_plugins --config config.toml --apply

5. 在每个前端节点运行两个进程。切换监听端口时同步更新本机代理目标、
   接收器地址与访问检查。

   .. code-block:: bash

      npm run start
      npm run settings:receiver

6. 通过 :doc:`nodes` 确认后台看到节点，安排首次同步或重新同步。
   再从公开入口检查一条已发布内容。访问管理员账户验证登录、资产上传和草稿 WebSocket，
   检查入口上的私有路由可见性与缓存策略。

更新顺序与就绪信号
------------------

更新前端之前，确保后端契约、运行迁移和插件清单与前端构建匹配。
选择可控制写入的更新窗口，迁移后以同批版本启动 API、Worker 和 Scheduler，
然后启动节点前端及接收器并核对同步。更新两端配置后，在运行环境确认相应进程已重新载入配置。

- FastAPI ``/health/live`` 验证进程响应，``/health/ready`` 还检查 PostgreSQL、
  迁移版本和运行 Redis。
- Next.js 直接监听地址上的 ``/health/ready`` 检查本地公开快照可读。在单入口模板中，
  从代理访问同名路径获取的是 API 就绪状态。
- 接收器由后端在内部探测。检查后台「节点状态与维护」是否显示上报与相同的期望、实际版本。
- 检查「运行与任务」中的 Scheduler 和 Worker 活动，再通过测试内容观察一次实际发布。
  公开页、``/sitemap.xml`` 和 ``/feed.xml`` 以读者实际拿到的新版本为准。

预发布配对版本和发布记录见 :doc:`../release/prerelease`。
