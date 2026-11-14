路由、布局与工作台
==================

公开路由
--------

``src/app/(blog)/`` 提供首页、文章和说说列表、分类、标签、归档、搜索、术语等
公开入口。括号中的路由组用于共用布局。带参数的路由使用 ``[slug]`` 等目录，
由 Next.js 将路径片段交给页面。任意已发布内容和托管页面的路径交给
``src/app/(blog)/[...contentPath]/page.tsx``，根据站点公开快照分派到相应主题视图。

``src/proxy.ts`` 在 App Router 之前处理路径与访问面的边界。新增公开固定路由时，
需要同时检查它在 ``src/core/content/routes.ts`` 中的登记与冲突规则。
分类或标签详情等动态公开页需要分别核对原始路径、语言前缀和不存在的资源。
可配置的页面用 :doc:`../extensions/public-components` 的页面类型登记实现。
阅读页返回 404 或 503 的判定见 :doc:`../content/snapshots`。

管理路由
--------

``src/app/(management)/`` 组织登录、账号中心、工作台、内容预览及后台工具。
``admin/layout.tsx`` 和 ``admin/workspace.tsx`` 负责进入工作台的会话边界。
应用在确认会话后显示后台壳与管理员插件，API 权限仍由后端逐请求检查。

内置菜单由 ``src/core/admin/`` 的注册器和各业务模块提供。后台主题负责菜单、
面包屑、窄屏抽屉和共享控件。新增宿主页面时更新相应注册声明及路由权限；
插件页面通过 :doc:`../extensions/admin-plugins` 注册。测试应同时覆盖从导航进入和
直接打开地址。

特殊路由
--------

.. list-table::
   :header-rows: 1
   :widths: 45 55

   * - 路径
     - 读取来源
   * - ``/admin/content/<type>/<id>/preview``、``/admin/pages/<id>/preview``
     - 授权读取保存后的草稿，展示时复用公开阅读主题。
   * - ``/admin/_nodes``
     - 前端节点诊断入口，对应 ``src/app/(node-console)/``。
   * - ``/health/ready``
     - 检查当前前端配置和公开快照状态。
   * - ``/robots.txt``、``/sitemap.xml``、``/feed.xml``、``/atom.xml``
     - 按已应用设置及公开内容生成的索引或订阅响应。
