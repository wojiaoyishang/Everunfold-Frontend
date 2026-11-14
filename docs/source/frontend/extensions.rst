扩展开发
========

插件提供站点能力，例如后台配置、托管页面、可插入组件和短代码。前端插件可独立编译，
由部署者安装到同一宿主。子主题用于改变站点的展示，可以继承父主题的组件和页面模板。

选择扩展入口
------------

.. list-table::
   :header-rows: 1
   :widths: 44 56

   * - 想实现的变化
     - 扩展入口
   * - 启用、部署或更新一个前端插件
     - :doc:`extensions/plugin-lifecycle`
   * - 新增后台设置页，或增强一个表单字段
     - :doc:`extensions/admin-plugins`
   * - 为读者提供可配置页面、短代码或组件
     - :doc:`extensions/public-components`
   * - 定制配色、资源、页面外观或展示组件
     - :doc:`extensions/themes`

后台插件示例
------------

:doc:`extensions/admin-plugins` 以便笺设置页演示注册后台菜单和扩展字段。

公开页面与短代码
----------------

:doc:`extensions/public-components` 解释托管页面、短代码和组件编辑器的注册边界。

构建和登记插件
--------------

:doc:`extensions/plugin-lifecycle` 从源码、构建包一直讲到节点登记及启用。

子主题示例
----------

:doc:`extensions/themes` 提供最小继承示例并说明模板、资源和主题切换。

.. toctree::
   :maxdepth: 1

   extensions/plugin-lifecycle
   extensions/admin-plugins
   extensions/public-components
   extensions/themes
