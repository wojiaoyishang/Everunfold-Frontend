快速开始：两种部署方式
======================

前后端都是独立仓库，每个仓库均在根目录运行 ``./setup.sh``。
不带参数时先选择部署方式；``--docker`` 和 ``--native`` 可以直接进入对应流程。
两种方式共用各自根目录的 ``config.yaml``，不要再手工维护多个运行配置文件。

助手先显示配置总览，支持顺序配置、按项修改、彩色状态和连接检测。
新站点密钥自动生成且可编辑；已有实例保留原值。
后端导出节点连接 Base64，前端导入即可取得节点 ID、来源 UUID 和双向令牌。

一、Docker 从零构建
-------------------

准备环境
~~~~~~~~

宿主需要 Linux / WSL、Bash 4+、Git、Docker Engine 和 Compose v2。
确认当前账号能执行 ``docker info`` 与 ``docker compose version``。
宿主无需安装 Python、Node.js 或项目依赖。
数据库和 Redis 不包含在应用镜像中：先准备专用 PostgreSQL 数据库及可用的 Redis。
若数据库也是容器，在助手的主网络或额外网络填写服务所在的自定义网络，
例如 ``1panel-network``，连接地址使用容器名；默认 ``bridge`` 不提供容器名解析。

后端配置、初始化和启动
~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   git clone https://github.com/wojiaoyishang/Everunfold-Backend.git
   cd Everunfold-Backend
   ./setup.sh --docker

首次运行自动构建一次性配置工具镜像。先在总览填写代码、数据挂载点、容器名称、网络和端口，
然后填写后端发布 URL、数据库和 Redis。配置保存到项目根目录 ``config.yaml``。
PostgreSQL 可通过分项表单填写。点击“检测连接”查看连接、认证、查询和迁移结果。
新库尚未初始化会显示提示，不会因检测而修改数据库。

新站点保留“空库自动初始化”为 ``1``，直接选择“构建并启动”：
保存根 YAML、构建镜像、检查连接；确认空库后自动初始化、创建管理员、登记插件，
复检通过再启动容器。旧配置缺少此开关时也默认开启；已有库不自动升级。
已保存配置的等价命令：

.. code-block:: bash

   ./setup.sh --docker deploy
   curl --fail http://127.0.0.1:8001/health/ready

API 默认绑定容器 ``0.0.0.0:8001``，宿主仅映射 ``127.0.0.1:8001``。
发布 URL 与监听参数独立。正式入口用 HTTPS 反向代理，并在助手填写节点控制台
实际看到的 TLS 代理来源 IP。管理员和独立节点控制台密码均可在助手查看。

前端配对和构建
~~~~~~~~~~~~~~

1. 在后端助手填写节点 ID 和接收器 URL，例如 ``web-main``、
   ``https://blog.example.com``，选择“登记并导出 Base64”。
   导出成功后保留界面，显示完整 Base64，可单独复制编码及导入命令。
2. 在前端根目录运行 ``./setup.sh --docker --connection-base64``，
   按提示粘贴编码，填写本站发布 URL 和后端内部地址，再保存。
   容器内的 ``127.0.0.1`` 指当前容器；内部地址支持容器网络 HTTP/HTTPS。
3. 点击“检测连接”，选择“构建并启动”。宿主自动构建镜像，再用一次性编译容器
   编译主体和插件，实时输出日志。成功后选择新的主体产物并启动 Web、接收器。
4. Web 和内部接收器共用一个端口，默认映射到宿主回环 ``3000``。
   后端登记的接收器 URL 转发到同一个前端端口；不再配置第二个端口。
   内部来源列表填写实际直连来源；仍须验证对应方向的令牌。
5. 到后端 ``/_nodes`` 添加、启用该节点的公开网页 URL。登录前端后台，
   在“设置 → 节点状态与维护”执行“重新同步全部”，再检查公开页和前端
   ``/health/ready``。首次缺少公开快照时返回 503，不能视为已就绪。

日常启动与数据保留
~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   ./setup.sh --docker build
   ./setup.sh --docker start
   docker logs --tail=100 everunfold-backend   # 改为选定的容器名称

``build`` 显式构建；``start`` 和容器重启不会重新编译。
后端挂载源码到只读 ``/workspace``、数据到 ``/data``；
两端助手将所选配置所在目录挂到 ``/config``，通过 ``CONFIG_FILE`` 明确指定容器路径。
前端部署时把已完成的产物挂到 ``/workspace``、持久数据挂到 ``/data``；
前端配置目录可写，后端只读；未显式选择宿主路径时使用各项目根 ``config.yaml``。
完整的 HTTPS、备份、升级及插件步骤见
`后端部署教程 <https://github.com/wojiaoyishang/Everunfold-Backend/blob/main/deploy/README.md>`__ 和
`前端部署教程 <https://github.com/wojiaoyishang/Everunfold-Frontend/blob/main/deploy/README.md>`__。

二、不使用 Docker
-----------------

准备环境
~~~~~~~~

两端配置助手需要 uv，由工具锁文件准备 Python 3.12 环境。
后端需要 PostgreSQL、Redis；前端另外需要 Node.js 22 和 npm 10，精确版本以
``.nvmrc`` 和 ``package.json`` 为准。该入口不调用 Docker。

后端
~~~~

在后端仓库根目录运行 ``./setup.sh --native``，填写数据库、Redis，保留本机
发布 URL ``http://127.0.0.1:8001``。保存后执行：

.. code-block:: bash

   ./setup.sh --native build
   ./setup.sh --native start

``build`` 安装锁定依赖；``start`` 检查配置与依赖，按开关初始化空库，再以前台方式
启动 API、Worker、Scheduler。若关闭开关，先手动 ``init-db``；初始化按钮保存过配置仍可使用。
Ctrl+C 统一停止。已有实例应走备份及迁移流程，不执行空库初始化。

在后端助手填写节点 ID 和本机接收器 ``http://127.0.0.1:3000``，输出节点连接 Base64：

.. code-block:: bash

   ./setup.sh --native export-node

终端直接显示 Base64，无需连接文件或手工查询来源 UUID。

前端
~~~~

在前端仓库根目录运行 ``./setup.sh --native --connection-base64``，按提示粘贴编码，
本站 URL 使用 ``http://127.0.0.1:3000``。选择“构建并启动”，或保存后执行：

.. code-block:: bash

   ./setup.sh --native build
   ./setup.sh --native start

前端安装锁定依赖，编译主体和独立插件，然后启动 Web 与接收器。
启动不会重新编译。配置文件和令牌由脚本加载，不需要 ``source`` 环境文件。
契约由 ``contracts.lock.json`` 锁定；同级后端不在默认位置时，可设置
``EVERUNFOLD_BACKEND_PATH`` 指向包含锁定提交的 Git 检出。

节点启用、首次同步与 Docker 路径相同：在 ``/_nodes`` 登记本站公开 URL 并启用，
用默认 ``admin`` 和助手中保存的初始密码登录前端后台，执行重新同步全部。
最后分别检查两个真正监听地址：

.. code-block:: bash

   curl --fail http://127.0.0.1:8001/health/ready
   curl --fail http://127.0.0.1:3000/health/ready

原生运行文件和持久数据默认在 ``var/instance/``，统一配置仍在项目根目录
``config.yaml``。长期托管及升级见 :doc:`../operations/deploy`，排错见
:doc:`../operations/diagnostics`。
