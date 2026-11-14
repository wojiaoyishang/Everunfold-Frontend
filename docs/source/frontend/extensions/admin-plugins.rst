后台插件、菜单与表单动作
========================

后台页面示例
------------

这个最小插件在「设置」分组新增一项。分别创建
``src/plugins/note-settings/plugin.ts`` 和 ``src/plugins/note-settings/components.tsx``。
确保插件 ID、页面 ID 和组件名称稳定。

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

给页面安排菜单
--------------

``adminPages.registerGroup({ id, label, order })`` 注册插件自己的侧栏分组。
如需作为宿主分组下的可折叠分支，提供 ``parent``（如 ``core.settings``）。
页面声明通过 ``menu.group`` 指向插件自己注册的分组或宿主分组；
``menu: false`` 可隐藏侧栏入口，页面仍按声明的权限控制直接访问。
宿主分组和生成的路由对应 ``src/core/admin/builtin-module.ts`` 与
``src/core/plugins/admin-routes.ts``。开发时同时使用管理员和受限账号验证入口和直接访问。

增强宿主的表单字段
------------------

``formFields.register`` 根据 ``scene``、``field`` 匹配宿主已经开放的文本字段。
``stage: "prepare"`` 可以调整输入提示或说明，``stage: "render"`` 通过已登记的
组件添加可点击操作。插件钩子按数字优先级从小到大排序，平局按插件 ID 和钩子 ID 排序。

例如在同一个后台插件的 ``setup`` 中补充：

.. code-block:: typescript

   formFields.register({
     id: "excerpt-hint",
     scene: "content.article.edit",
     field: "excerpt",
     stage: "prepare",
     priority: 50,
     prepare: ({ description }) => ({
       description: description || "写一两句帮助读者判断文章是否相关。",
     }),
   });

对应的 ``setup`` 参数加入 ``formFields``。动作组件接收
``AdminFormFieldActionProps``，通过 ``field.apply(value)`` 请求宿主更新字段。
宿主继续处理禁用状态、当前资源以及保存和协同同步；插件应检查回填是否成功。
需要材料时读取 ``field.source()``，按当前内容的可见性设计交互，
尤其不要把受限内容当作自动投递材料。

``src/plugins/ai-writing/`` 可参考后台菜单、字段开关、明确选择服务商和用户确认回填。
更改 AI 服务商设置、运行队列或权限时，还需要配套后端接口和测试。
