本地快速开始
============

本页使用两个同级仓库和一套空的开发数据库。保留两个工作目录，各自运行其命令。
请从本次预发布说明取得前后端的配套提交。

.. code-block:: text

   Everunfold/
     Everunfold-Backend/
     Everunfold-Frontend/

开发环境
--------

- 后端使用 Python 3.12、uv、PostgreSQL 和 Redis。软件依赖从 ``uv.lock`` 恢复。
- 前端使用 Node.js 22 和 npm 10，具体起始版本见 ``.nvmrc``，依赖从
  ``package-lock.json`` 安装。
- 本页统一使用 ``127.0.0.1``。打开浏览器时也使用这个主机名，使 Cookie 和
  精确 Origin 配置匹配。命令示例采用 POSIX Shell。

准备后端
--------

1. 在 ``Everunfold-Backend`` 内安装依赖，复制配置模板和节点清单。

   .. code-block:: bash

      uv sync --locked
      cp config.example.toml config.toml
      cp frontend-nodes.example.toml frontend-nodes.toml

2. 按本机部署修改 ``config.toml``。填好开发数据库 DSN、Redis 地址和 Celery Broker，
   保留浏览器 API 示例地址 ``http://127.0.0.1:8001``，将前端 Origin
   ``http://127.0.0.1:3000`` 加入 ``[cors].allowed_origins``。
   启用根级 ``frontend_nodes_file = "./frontend-nodes.toml"``。
   在节点清单的 ``[frontends.web-main]`` 下设置 ``enabled = true`` 和
   ``settings_receiver_url = "http://127.0.0.1:3001"``，保留两项令牌环境变量名称。

3. 将 ``EVERUNFOLD_ADMIN_PASSWORD`` 设为自己的首次管理员密码。运行初始化前，
   通过本机受控环境为 ``NEXTJS_TO_FASTAPI_WEB_MAIN_TOKEN`` 和
   ``FASTAPI_TO_NEXTJS_WEB_MAIN_TOKEN`` 分别生成并保存随机值。
   后面启动进程的终端需要继承同一套对应凭据。

   .. code-block:: bash

      uv run --locked python init.database.py --config config.toml --no-create-database
      uv run --locked python -m tools.register_backend_plugins --config config.toml --apply

   先在 PostgreSQL 创建配置所用的数据库并给数据库角色授权。
   初始化会执行迁移和首次建号，已有账号及密码保持原样。
   从数据库运行 ``SELECT source_epoch FROM site_settings WHERE id = 1;``，
   取出此后端的来源 UUID，供下方前端接收器使用。

4. 在后端目录的不同终端分别启动 API、Worker 和 Scheduler。

   .. code-block:: bash

      uv run --locked python -m uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --reload --no-proxy-headers
      uv run --locked celery -A app.entrypoints.worker:celery_app worker --pool=solo --concurrency=1 --loglevel=INFO
      uv run --locked python -m app.entrypoints.scheduler

   开发环境使用 ``solo`` Worker。每个运行范围启动一个 Scheduler。
   访问 ``http://127.0.0.1:8001/health/ready``，确认数据库、Redis 和迁移均就绪。

准备前端
--------

1. 切换到 ``Everunfold-Frontend`` 并复制实例配置。

   .. code-block:: bash

      npm ci --ignore-scripts
      cp config.example.toml config.toml

2. 设置根级 ``PUBLIC_SITE_URL = "http://127.0.0.1:3000"``，确认
   ``FRONTEND_NODE_ID = "web-main"`` 与后端节点清单的键一致。
   在 ``[settings]`` 中填入上一步查询到的 ``source_epoch``。
   ``[backend]`` 中的两个凭据引用需与后端对应，运行进程应继承实际值。

3. 分别启动网页进程和节点接收器。

   .. code-block:: bash

      npm run dev
      npm run settings:receiver

   前端准备脚本先在同级后端从锁定提交读取契约。若后端不在同级目录，将
   ``EVERUNFOLD_BACKEND_PATH`` 设置为其本地绝对路径，并确保 Git 历史中有契约锁所用提交。

4. 打开 ``http://127.0.0.1:3000/login``，用初始化时设置的密码进入后台。
   在「设置 → 节点状态与维护」确认当前节点，执行「重新同步全部」。
   查看节点应用状态，再发布一篇测试文章并从公开页访问，核对发布是否送达。
   首次缺少公开快照时，读者页可能暂时返回 503。

.. tip::

   本地需要带域名或端口的代理、独立节点配置文件、测试数据库或生产构建时，
   接着阅读 :doc:`deployment` 及本手册的开发章节。
