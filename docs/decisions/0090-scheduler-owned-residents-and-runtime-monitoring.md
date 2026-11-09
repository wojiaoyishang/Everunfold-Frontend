# ADR 0090：Scheduler 所属常驻任务与运行管理

版本：ADR0090-1；日期：2026-11-09。状态：接受并完成第一阶段实现。

## 来源

用户要求先写开发规划，再实现 Scheduler/Worker 及后台存活信息；长连接在产品和部署上都归属 Scheduler，不能拆为另一个独立服务。同轮要求补齐插件来源/详情/特色图/Markdown 与全宽列表、真实标签词云及无验证码登录留白。

## 决定

沿用 API、Celery Worker、Scheduler 三类职责。Scheduler 负责持久登记有限任务并派发至 Worker；常驻任务通过 spawn 子进程执行，父进程掌握生命周期。主循环不执行插件业务，与“不阻塞调度”约束一致。

任务通过已有 plugin.py 入口和 registry.tasks.register(TaskDefinition) 声明，无第二个固定目录协议。PostgreSQL 保存计划、执行、租约与恢复位置；Redis 保存队列、拥有者租约和有期限的观测快照。使用数据库认领与所有权校验限制重复执行和过期写入；外部业务继续依赖对端幂等键，不宣称全局 exactly-once。

管理 API 加入原 settings 契约，权限、CSRF、审计及响应外壳共用；前端使用生成客户端。健康、调度扫描、连接是否建立分别表示，不能只看 PID 就显示健康。插件列表元数据进入现有部署目录和摘要，无单独介绍数据库。

## 影响和边界

需要显式 0032_runtime_tasks 迁移和更新运行进程；不新增部署角色、不引入依赖。后端插件摘要变更后须显式登记。任务恢复、退避、未知结果暂停及保留策略见[开发指南](../development/runtime-tasks.md)。没有交付通用 Cron、任意任务参数编辑、在线 Python 安装或完整监控平台。真实检查和未执行矩阵见[验收](../handoff/runtime-tasks-verification.md)。
