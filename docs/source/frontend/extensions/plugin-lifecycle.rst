前端插件结构、构建与部署
========================

组织源码
--------

在 ``src/plugins/<目录>/`` 内创建 ``plugin.ts``，以
``@everunfold/plugin-sdk`` 的 ``definePlugin`` 声明稳定 ID、版本和
同步注册函数。可选 ``components.tsx`` 用默认导出关联已登记的组件。
有封面时，可在声明引用 ``asset:assets/<文件>``，构建时会打包该资源。

共享的注册模块可能在 Node.js 和浏览器中运行。它只做同步注册；
浏览器控件从 ``@everunfold/plugin-sdk/client`` 在组件侧引入。
如需在激活时注册订阅，可在插件客户端的 ``activate`` 使用
``onDispose`` 释放订阅。后台专用插件声明 ``surface: "admin"``，
其包由通过会话确认的后台加载。

构建与登记
----------

在前端仓库根执行：

.. code-block:: bash

   npm run extensions:check
   npm run plugins:build -- --plugin note-settings
   npm run themes:catalog
   npm run extensions:register -- --node-id web-main --backend ../Everunfold-Backend

``note-settings`` 是 :doc:`admin-plugins` 中的示例目录。
``plugins:build`` 默认把生产插件输出到仓库根的 ``plugins/``，
也可用 ``--output`` 指定专用目录。开发时 ``npm run dev``
在 ``var/cache/plugins/`` 编译并监听扩展。修改公共 SDK 或构建器后
重新启动开发协调进程。

部署时复制完整的包。更新时先放置构建资源，再原子替换
``manifest.json``，保留仍可能被浏览器使用的旧摘要资源。
生产的 ``npm start`` 附带节点清单协调器，可按运行配置上报扩展。
本地双仓库也可显式登记构建结果；先完成后端数据库迁移并绑定目标节点。
不同节点应部署同一版本，待各自清单就绪后，再在后台启用。

如果插件停用，宿主会隐藏其专有入口，已有内容和配置仍按各业务流程处理。
调整页面或短代码插件前，检查已发布内容、模板引用和节点状态。
源码跟踪范围由仓库的内置扩展白名单管理；本地插件产物和仅本机使用的扩展目录不入库。
