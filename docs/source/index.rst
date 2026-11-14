Everunfold 前端文档
====================

Everunfold 是一个独立部署前后端的博客与轻量 CMS。第一次运行时，从
:doc:`welcome/quickstart` 开始。已经有站点时，可以按下面的任务直接进入对应章节。

.. list-table::
   :header-rows: 1
   :widths: 25 75

   * - 需要完成的任务
     - 从这里开始
   * - 搭建第一套环境
     - :doc:`welcome/quickstart`，从空库到发布第一篇测试文章。
   * - 管理现有站点
     - :doc:`usage/index`，维护内容、站点外观、账号、通知和 AI 写作。
   * - 修改程序或扩展
     - :doc:`frontend/index`，按目录找到职责、接口、扩展示例和测试。
   * - 上线或排查
     - :doc:`operations/index`，处理代理、节点同步、备份与恢复。
   * - 交付预发布版本
     - :doc:`release/index`，记录配套版本、验收和文档发布。

本手册以前端源码为准。另一侧的开发参考随
`Everunfold 后端仓库 <https://github.com/wojiaoyishang/Everunfold-Backend>`__ 维护。
两份手册共用入门、后台使用和部署指南。

.. toctree::
   :maxdepth: 2
   :caption: 开始使用

   welcome/index

.. toctree::
   :maxdepth: 2
   :caption: 管理站点

   usage/index

.. toctree::
   :maxdepth: 3
   :caption: 源码与扩展

   frontend/index

.. toctree::
   :maxdepth: 2
   :caption: 运行环境

   operations/index

.. toctree::
   :maxdepth: 2
   :caption: 发布与贡献

   release/index
