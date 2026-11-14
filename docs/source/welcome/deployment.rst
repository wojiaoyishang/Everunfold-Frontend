:orphan:

部署指南入口
============

使用这页选择后续的部署或运维步骤。本机安装和第一次发布见 :doc:`quickstart`。

- **区分地址。** 浏览器站点、公开 API、Next.js 服务端 API 和节点接收是四条独立通路。
  部署前先用 :doc:`../operations/topology` 明确每条通路的访问方和信任边界。
- **安排进程。** API、Celery Worker、Scheduler、Next.js 和接收器需要各自运行。
  选择本机代理或独立主机方案，见 :doc:`../operations/deploy`。
- **设置节点。** 用稳定节点 ID 和来源 UUID 关联接收端。公开设置和内容在节点应用后生效，
  见 :doc:`../operations/nodes`。
- **准备恢复。** 运行配置、数据库、部署密钥与媒体按部署范围备份。见
  :doc:`../operations/recovery`，再执行 :doc:`../release/prerelease` 中的发布检查。
