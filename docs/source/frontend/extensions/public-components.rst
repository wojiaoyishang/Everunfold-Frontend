公开页面、短代码与组件
======================

托管页面入口
------------

插件用 ``pages.register`` 登记 ``CustomPageDefinition``，再用
``components.register`` 关联具名渲染器。类型定义在
``src/core/pages/registration.ts``，由插件 SDK 导出。
内置的 ``src/plugins/book/page.ts`` 是完整示例，它声明默认路径、选项模型、
全宽布局和文章分类列表。选择页面类型后，后台再保存该实例的标题、路径和选项。

``settingsModel`` 用于编辑界面的设置字段。自定义字段组件与读者组件通过具名组件
登记。选项以 JSON 形式保存在相应页面，应用后可能分发至公开节点，
因此应只存放可以公开的配置。页面启用 ``localized: true`` 时可用当前阅读语言
渲染，并使用该实例的共享选项。需要评论时通过 SDK 的共享评论入口挂载。

短代码
------

短代码通过 ``shortcodes.register`` 注册。描述包括稳定定义、参数、适用样式
及渲染器。内置的 ``src/plugins/gallery/shortcode.ts`` 演示
参数声明、多媒体选择、空值预览及正式渲染。渲染器接收
``parameters``、``body``、``media`` 与 ``escape``；输出来自公开正文时
仍走宿主的安全渲染及媒体规则。验证时同时检查编辑器插入、预览和读者页面。

可视化组件
----------

插件通过 ``builder.register`` 声明带命名空间的组件类型和字段，再用
``components.register`` 登记自己的渲染器。宿主将节点及字段值传给渲染器。
字段用 ``key``、``label``、``type`` 描述；选择字段声明选项；
``container`` 表示可容纳子节点。
实用的字段类型有 ``text``、``url``、``media``、``markdown`` 等。
``src/core/builder/registry.ts`` 展示内置组件的字段模型，
``src/core/builder/types.ts`` 定义节点、属性和参数结构。

修改组件的类型或字段前先检查已保存页面和模板。字段名需保持稳定；
如组件被禁用，宿主保留原节点和字段，编辑时显示当前实现不可用。
布局和模板参数的使用见 :doc:`../content/pages`。
