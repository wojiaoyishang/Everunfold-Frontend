# ADR 0095：任务参数声明与持久执行

版本：ADR0095-1；2026-11-10。状态：已实现。用户要求手动触发与刷新并列，并允许为需要参数的任务提供参数；承接ADR0094。

以TaskDefinition中的Pydantic模型作为参数权威，自动导出Schema和可展示默认值。手动弹窗映射基本字段并提供JSON复杂编辑，输入不持久化到浏览器。API严格校验后将参数写入独立TaskRun.parameters JSONB，Worker再次验证并传入handler第二个位置参数；队列只携带执行ID，原无参数handler仍接收config。

注册默认参数必须有效，用于自动周期执行快照。手动触发只在归一化参数一致时复用活动执行，异参返回409；规范JSON消除对象键顺序差异，同时区分布尔与数字。原有权限、CSRF、计划串行及租约认领继续生效。

日志/审计/运行投影不输出实参。公开Schema/defaults剔除writeOnly/password默认值，拒绝会导致掩码序列化失真的SecretStr/SecretBytes；32KiB、深度16和有限数字限制同时实施。0035显式迁移，settings1.23.0；部署与实际检查见[指南](../development/runtime-tasks.md)、[验收](../handoff/worker-parameters-verification.md)。
