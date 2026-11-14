从代码检查到生产验证
====================

基础检查
--------

在前端仓库根使用 Node.js 22 和 npm 10。仓库的版本入口为 ``.nvmrc``，
``package-lock.json`` 固定依赖。Windows PowerShell 可以使用 ``npm.cmd``。

.. code-block:: bash

   npm ci --ignore-scripts
   npm run check

``npm run check`` 准备锁定契约、主题资产和生成文件，检查扩展声明、错误页产物、
ESLint、宿主与插件类型及 Prettier，最后运行自动测试。

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - 命令
     - 用途
   * - ``npm run typecheck``
     - 生成 Next.js 路由类型，并检查宿主 TypeScript。
   * - ``npm run plugins:typecheck``
     - 用插件的独立 TypeScript 配置检查公共 SDK 导入和声明。
   * - ``npm run build``
     - 运行准备脚本，独立编译插件，然后生成 Next.js 生产产物。
   * - ``npm run verify:production``
     - 在临时副本验证生产构建，可与运行中的开发实例并行。
   * - ``npm run verify:reader``
     - 用隔离的 Next.js 和 FastAPI 验证公开阅读、离线快照和管理入口。
       需要准备好公开测试快照及匹配的后端。可用 ``READER_BACKEND_ROOT`` 指定后端目录。
   * - ``npm run verify:admin``
     - 在隔离的生产副本验证后台运行路径。
   * - ``npm run verify:http -- <站点地址>``
     - 向已启动的前端请求关键页面。站点需要已有有效的公开快照。

按场景检查
----------

- 改动路由时，检查直接访问、客户端导航、默认语言、带前缀语言和 404。涉及读取权限时，
  用多个会话验证匿名读者和已登录账号的边界。
- 改动字段或编辑器时，确认已有草稿仍可打开；核对保存、发布、取消、预览和版本恢复。
  涉及协同时，至少用两个标签页检查顺序与回执，并在断线后验证恢复。
- 改动公开副本时，在隔离的前后端、数据库、Redis 与接收器环境走真实同步。
  核对后端提交、节点确认、撤回后读取结果。
- 改动可见组件时，检查桌面和窄屏、键盘焦点、弹窗退出、加载与失败状态；
  动效应尊重当前前台或后台的减少动态选项。

接口变更应更新后端契约、前端锁定和调用处。配对构建和发布记录见
:doc:`../../release/prerelease`。
