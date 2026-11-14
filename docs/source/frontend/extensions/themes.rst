子主题、模板与资源
==================

选择定制范围
------------

``src/themes/argon/`` 提供默认主题。``src/themes/paper/`` 演示一套可运行的子主题。
子主题继承父级组件、页面模板、插入位置和样式；它随 Next.js 主应用构建。
如果能力涉及自有业务页面、权限或表单扩展，可组合使用主题和插件。

最小子主题
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

检查主题切换
------------

1. 运行 ``npm run themes:catalog`` 检查主题声明与继承关系；
   再运行 ``npm run themes:assets`` 检查资源目录输出。
2. 重启开发编译后在站点后台选择已部署主题，等待节点确认公开设置。
3. 同时打开读者页面、登录页和后台页面，核对样式作用域、图片、字体和移动端。
   测试从父主题继承的组件在无子主题覆盖时仍能显示。
4. 在多节点部署中确认每台节点都构建了对应主题版本。排查流程见
   :doc:`../checks/troubleshooting`。
