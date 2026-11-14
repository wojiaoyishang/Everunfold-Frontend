项目简介
========

Everunfold 提供独立的公开阅读前台、编辑后台和内容 API。文章、说说、页面和术语可以单独维护；
文章与说说支持多语言、草稿、版本及发布。公开站点由 Next.js 渲染，登录、权限、持久化与异步服务
由 FastAPI 和应用进程提供。

当前仓库维护 Everunfold 前端。请使用配套的 `Everunfold 后端仓库
<https://github.com/wojiaoyishang/Everunfold-Backend>`__，按预发布说明选用已经一起验证的提交。

阅读顺序
--------

- :doc:`concepts` 说明草稿、发布、节点、快照和契约之间的关系。
- :doc:`quickstart` 给出从空数据库和新检出启动两端的步骤。
- :doc:`../usage/index` 按管理员和编辑者任务说明后台入口。
- :doc:`deployment` 指向部署、运维和数据恢复手册。
- :doc:`../release/index` 记录预发布核验和文档自动发布方式。

文档编排参考
------------

本手册沿用 XiaoHeiHook 的专题分章，将操作指南和扩展接口分开维护。
安装、模块说明和实作示例的安排参考 Pear Admin Flask。示例与配置以
Everunfold 当前实现为准。

- `XiaoHeiHook RST 源码 <https://github.com/wojiaoyishang/XiaoHeiCat/tree/master/docs/source>`__
- `Pear Admin Flask RST 源码 <https://gitee.com/pear-admin/pear-admin-flask/tree/master/docs/source>`__
