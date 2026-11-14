:orphan:

部署与运维
==========

按实际任务查阅本章。初次配置开发环境时，先按 :doc:`../welcome/quickstart` 启动最小实例。
准备预发布或正式托管环境时，从部署拓扑和配置顺序开始。

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - 任务
     - 阅读入口
   * - 选择单机或多设备布局
     - :doc:`topology` 明确网关、WebSocket、私有接收器和持久存储。
   * - 填写实例配置
     - :doc:`configuration` 对照 TOML、环境变量和地址的作用范围。
   * - 启动与升级进程
     - :doc:`deploy` 提供 Supervisor 开发容器和独立托管进程的操作顺序。
   * - 新增节点或重新同步
     - :doc:`nodes` 从绑定节点 ID 和来源 UUID 开始，检查上报、磁盘和回执。
   * - 备份、导入与恢复
     - :doc:`recovery` 说明三类数据的恢复方法和原生内容包的操作。
   * - 排查故障
     - :doc:`diagnostics` 按症状定位代理、登录、运行任务、缓存和节点投递。

- :doc:`topology`
- :doc:`configuration`
- :doc:`deploy`
- :doc:`nodes`
- :doc:`recovery`
- :doc:`diagnostics`
