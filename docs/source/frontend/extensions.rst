插件与子主题
============

选择扩展入口
------------

插件为宿主登记页面、短代码、编辑器组件、表单字段操作或后台入口。可信前端插件独立
构建，可在兼容的宿主上部署。子主题随 Next.js 主应用构建，可继承父主题并覆盖具名
组件、页面模板、插入位置和样式。主题切换使用已部署的主题和后端保存的站点设置。

后台插件示例
------------

下面的插件在「设置」下增加一个页面。分别创建
``src/plugins/note-settings/plugin.ts`` 和
``src/plugins/note-settings/components.tsx``。插件 ID、路由 ID、组件名均作为稳定标识。

``plugin.ts`` 声明注册信息。共享的注册模块会在服务端和浏览器运行，适合放同步、
无副作用的声明。

.. code-block:: typescript

   import { definePlugin } from "@everunfold/plugin-sdk";

   export default definePlugin({
     id: "example.note-settings",
     version: "1.0.0",
     title: "便笺设置",
     surface: "admin",
     setup({ adminPages, components }) {
       components.register("example.note-settings.page");
       adminPages.register({
         id: "settings",
         label: "便笺设置",
         component: "example.note-settings.page",
         permission: "settings:write",
         menu: { group: "core.settings", order: 80 },
       });
     },
   });

``components.tsx`` 的默认导出按同一个组件名映射浏览器实现。

.. code-block:: tsx

   import type { PluginAdminPageProps } from "@everunfold/plugin-sdk";

   function SettingsPage({ pluginId }: PluginAdminPageProps) {
     return <p>{`当前插件为 ${pluginId}。`}</p>;
   }

   export default { "example.note-settings.page": SettingsPage };

插件启用后，通过左侧设置菜单或
``/admin/plugins/example.note-settings/settings`` 打开页面。
``permission`` 控制当前用户能否访问页面，业务接口仍检查自己的会话和权限。
后台专用包使用 ``surface: "admin"``，仅由确认会话后的工作台加载。

用 ``adminPages.registerGroup`` 注册独立菜单分区，或通过其 ``parent`` 放在宿主
分区下。用 ``formFields.register`` 声明字段场景、字段名和优先级；``prepare``
用于调整支持扩展的表单提示，``render`` 用于增补动作控件。宿主继续负责校验、
保存和协作同步。可在 ``src/plugins/ai-writing/`` 查看这两个扩展点组合使用的实例。

公开页面与短代码
----------------

公开插件可在 ``setup`` 中调用 ``pages.register`` 注册 ``CustomPageDefinition``，
再通过 ``components.register`` 关联渲染器。查看 ``src/plugins/honors/`` 如何将
``page.ts``、设置模型和 ``components.tsx`` 配对。页面设置可用标准表单控件或
插件控件编辑，数据通过 JSON 保存。发布后，公开页面配置可被分发到各节点，配置中
仅存放可公开的内容。

短代码通过 ``shortcodes.register`` 提供身份、参数定义和渲染器。
``src/plugins/gallery/`` 演示了可配置参数与媒体选择器。渲染器应转义文本参数，
继续使用宿主的 HTML 和媒体处理规则。表单、弹窗、媒体选择、语言与展示组件可从
``@everunfold/plugin-sdk/client`` 导入。使用 ``activate`` 注册的浏览器订阅
应在 ``onDispose`` 中释放。

构建和登记插件
--------------

在前端仓库运行下列命令。默认输出为仓库根的 ``plugins/``，也可用
``--output`` 指定其他产物目录。开发时 ``npm run dev`` 自动编译和监听
插件，将开发产物放入 ``var/cache/plugins/``。

.. code-block:: console

   $ npm run plugins:build -- --plugin note-settings
   $ npm run extensions:check

部署时复制完整的插件目录。更新包时先放置构建资源，最后原子替换
``manifest.json``。站点仍可能引用较旧的摘要资源，升级时应保留这些资源。
生产的 ``npm start`` 附带节点清单协调器，可登记已部署的扩展。
管理员在后台管理插件的启停。在本地双仓库环境，也可显式登记已构建的插件和主题。

.. code-block:: console

   $ npm run plugins:build
   $ npm run themes:catalog
   $ npm run extensions:register -- --node-id web-main --backend ../Everunfold-Backend

示例中的 ``web-main`` 替换为实际前端节点 ID。登记之前，后端需要已完成数据库
迁移并绑定该节点。插件产物和本地扩展示例目录默认由 Git 忽略，贡献仓库时遵循
现有内置扩展目录的追踪范围。

子主题示例
----------

在 ``src/themes/my-theme/theme.ts`` 声明主题，目录在构建时自动发现。
当 ``styles`` 为 ``true`` 时，在同目录的 ``styles.ts`` 默认导出 CSS 文本。

.. code-block:: typescript

   import type { ThemeDefinition } from "@/core/extensions/types";

   export default {
     id: "my-theme",
     title: "My Theme",
     version: "1.0.0",
     parent: "argon",
     styles: true,
   } satisfies ThemeDefinition;

.. code-block:: typescript

   export default `
     .public-theme[data-theme-chain~="my-theme"] .post-card {
       border-radius: 12px;
     }
   `;

可从 ``src/themes/paper/`` 参考主题设置面板及配色。覆盖组件时，用
``ParentThemeComponent`` 查找父级实现；公共布局、账号页面和后台的样式范围
各自保留。主题图片等资源在 ``src/themes/<id>/assets/`` 维护，构建时生成
可访问的 ``/themes/<id>/`` 地址。主题声明或代码发生变化时重新构建主应用。

.. seealso::

   :doc:`checks` 列出前端检查和生产构建验证命令。
