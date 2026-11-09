# ADR 0094：从任务目录手动触发Worker测试

版本：ADR0094-1；2026-11-10。状态：已实现。来源：用户要求任务页可手动触发Worker任务，开发测试时可用任务名称或函数注册名选择。

后台选择器消费已注册有限任务的名称、handler和稳定ID，控制仍按ID；新增debug_run action，要求settings:write及正常CSRF。只有已部署可用且计划已启用的periodic任务接受此操作，不执行任意输入路径，不修改周期或开关。

请求锁计划行，有活动执行则复用，否则创建持久queued执行，由现有Scheduler/Worker认领链路处理。请求审计保存执行ID及复用标记，前端切至该执行的统一进度。队列成功和任务完成分开显示。

无迁移/依赖变更，settings1.22.0增加handler和action。该入口不替代单元/集成测试，也不对任意外部副作用提供永久去重承诺；接口与实际验收见[任务指南](../development/runtime-tasks.md)、[验收记录](../handoff/admin-cloud-manual-verification.md)。
