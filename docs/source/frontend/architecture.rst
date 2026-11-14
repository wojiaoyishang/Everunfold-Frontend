架构与源码导航
==============

前端的路由、业务状态、服务端能力和主题展示分开维护。开发时从目标页面定位
路由，再沿它调用的模块找到适用的校验和状态，最后决定应该修改哪个层次。

.. list-table::
   :header-rows: 1
   :widths: 36 64

   * - 目录
     - 负责的内容
   * - ``src/app/``、``src/proxy.ts``
     - App Router 入口、布局、公开路径匹配、管理请求标记和 HTTP 边界。
   * - ``src/core/``
     - 访问判断、内容与页面查询、编辑协作、契约、表单、主题注册和国际化。
   * - ``src/server/``
     - 在 Node.js 读取并写入公开副本，加载已安装插件包和本地缓存。
   * - ``src/themes/argon/``、``src/themes/paper/``
     - 默认父主题和子主题。界面显示从当前主题和对应的访问面取得。
   * - ``src/plugins/``、``src/sdk/``
     - 内置可信插件源码和前端公共 SDK。
   * - ``tools/``、``tests/``
     - 契约同步、独立插件构建、生产验证和行为测试。

从路由找到实现
--------------

先从 :doc:`architecture/routes` 判断改动影响公开页面、后台工作台还是专用进程。

常用修改入口
------------

切换后台显示语言或增加可翻译文案时，从 :doc:`architecture/localization` 查看语言目录与回退规则。

地址、请求与构建输入
--------------------

有跨域、配置或契约变更时，按 :doc:`architecture/requests` 分清浏览器、服务端和节点接收器。

.. toctree::
   :maxdepth: 1

   architecture/routes
   architecture/requests
   architecture/localization
