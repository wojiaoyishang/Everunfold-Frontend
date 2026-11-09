# Scheduler、Worker 与运行管理

版本：runtime-tasks-2；2026-11-09。状态：第一阶段已实现；具体已执行检查及未覆盖项目见[验收](../handoff/runtime-tasks-verification.md)。开发前先登记的规划由本版补充实际接口，不把后续能力标为交付。

## 产品与进程归属

Scheduler 是唯一调度程序。有限时长的任务由它派发给 Celery Worker；长连接是 Scheduler 管理的常驻任务，以内部子进程执行。没有独立部署的长连接服务，也没有 Celery Beat。主循环只登记、派发和监督，不执行插件业务，不调用 API 的 router_init。

后台“设置 → 运行与任务”（/admin/settings/runtime）提供概览、定时任务、常驻任务和执行记录。可看到 Scheduler/Worker 的节点、PID、启动时间、心跳、最近扫描、队列消息数、执行情况，以及常驻连接状态、重启次数与最近通信。心跳与连接状态分开显示，网络错误显示待确认；Worker 队列统计是全队列值，并非单进程负载。

## 持久化与恢复

PostgreSQL 的 runtime_task_plans 保存启停、下次检查及恢复检查点；runtime_task_runs 保存执行 ID、计划时间、认领者、租约和结果。Redis 只保存队列与带期限的实例心跳，不作为业务事实来源。

- 每个任务计划串行执行，计划行锁控制登记；执行消息只携带执行 ID。重复消息只有一次 queued → running 认领成功。
- 已登记但未认领的执行会重新派发，30 秒后可重投；未登记的历史周期合并到当前检查，不逐次追赶。文章定时发布沿用持久排期，因此停机期间到期的文章仍会恢复处理。
- Scheduler 使用带拥有者令牌的 Redis 租约。失去租约时退出并清理自己的子进程。守护进程可按原部署方式重新拉起。
- 常驻子进程每 3 秒检查父进程、计划、插件部署与执行租约；租约 20 秒。收到停止先协作退出，5 秒后取消；父进程关闭时还有 terminate/kill 兜底。同步阻塞库应在子进程内使用线程适配并设置 I/O 超时。
- 常驻失败或租约过期从 15 秒指数退避，最长 300 秒；连续 8 次失败/未知后暂停。管理员修复原因后重新打开任务开关。停止保留检查点。停用插件后禁止新执行，运行中的常驻任务协作停止；已开始的有限任务允许结束。
- 有限插件任务失去执行租约标记结果待确认并暂停计划，避免自动重复未知的外部副作用。原有三项核心任务依赖既有 Outbox/排期的幂等及围栏恢复。
- 本机所有权控制不能保证任意外部系统“绝对只执行一次”。插件调用对端须使用业务幂等键；检查点应在业务持久完成后写入。Redis Pub/Sub 示例只演示连接，不提供丢失消息补读承诺。
- 心跳快照保留一天，20 秒未更新显示过期；无心跳不冒充健康。核心无业务变动的成功轮询记录仅保留一小时，真实业务执行和异常保留；管理界面最多读取 100 条，运行中的记录优先。

## 单入口注册

仍只固定 app/plugins/<目录>/plugin.py。其他文件名称和组织自由。setup 只登记声明，不建连接或写数据库。

```python
from app.plugin_sdk import PluginRegistry, TaskDefinition, define_plugin


def setup(registry: PluginRegistry) -> None:
    registry.tasks.register(TaskDefinition(
        id="example.sync.refresh",
        title="刷新外部目录",
        handler="app.plugins.my_sync.jobs:refresh",
        interval=60,
        timeout=120,
        manual=True,
        enabled=False,
    ))
    registry.tasks.register(TaskDefinition(
        id="example.sync.subscription",
        title="事件订阅",
        handler="app.plugins.my_sync.jobs:listen",
        kind="resident",
        interval=15,
        enabled=False,
    ))


plugin = define_plugin(
    id="example.sync", title="目录同步", version="1.0.0", setup=setup,
)
```

任务 ID 必须属于插件 ID 命名空间。handler 是 app 内的模块:函数引用，由执行进程导入。interval 为 1–86400 秒，timeout 为 5–3600 秒；manual 表示允许后台“执行一次”。enabled 只作首次计划默认值，后续开关来自数据库。插件本身启用且部署摘要一致时，任务才可执行。

有限任务实现为 async def refresh(config)，返回可 JSON 序列化的 dict；timeout 控制异步执行时间，Worker 另有总时限兜底。函数中的外部调用必须设置自己的超时；不可用阻塞调用拖住事件循环。

常驻任务实现为 async def listen(context: ResidentContext)，提供以下接口：

| 方法/属性 | 含义 |
| --- | --- |
| context.config | 当前后端配置，仅执行进程使用 |
| context.stopping | asyncio.Event；循环应检查它并在 finally 关闭资源 |
| context.connected() | 更新连接成功状态，不等于整个进程健康 |
| context.received() | 更新最近通信时间；不保存消息正文 |
| await context.checkpoint() | 读取该任务的持久恢复位置 |
| await context.checkpoint({...}) | 持有有效执行所有权时更新，最多 64 KiB JSON |

可直接参考 app/plugins/runtime_example/plugin.py 和 subscription.py：真实 Redis 订阅由 Scheduler 派生，默认任务关闭。开启后监听当前项目命名空间 runtime:example，只保存接收计数；停止、崩溃恢复和父进程归属已有真实进程验收。检查点中不要写入凭据。

## 管理接口与部署

GET /v1/admin/runtime 要求 settings:read；POST /v1/admin/runtime/control 要求 settings:write 和原浏览器 CSRF，body 为 {task_id, action}，action 支持 enable/disable/run。所有操作写审计；仅注册任务可用，manual=false 拒绝手动派发。沿用 success/code/msg/data 外壳、no-store 和权限体系。返回 DTO 不含原始任务参数、检查点、消息正文或连接凭据。

1. 显式运行迁移至 0032_runtime_tasks，服务启动不自动迁移。
2. 部署后端代码，受控重启 API、Worker、Scheduler；显式执行 uv run python -m tools.register_backend_plugins --config config.toml --apply。
3. 保持原 Scheduler 和 Celery Worker 启动命令，无额外 runner 命令；检查后台最近心跳/扫描及三项核心任务。
4. 前端固定 settings 1.18.1 的精确契约提交与 SHA，生成客户端只放忽略的 var/cache。修改插件构建工具后重启开发协调进程；普通插件源码编辑继续自动编译。

当前阶段只提供固定间隔声明和启停、执行历史，不提供任意命令/任务参数编辑、Cron 日历、拖动流程图、跨地域分布式锁或无限时间序列监控。日志仍使用现有进程管理器。Python 插件更新需要受控部署，不是在线热安装 Python 包。

## 同期界面调整

插件管理改为全宽列表，区分前端/后端/前后端来源；详情弹窗读取 version、author、homepage、license、preview、readme。新增元数据可选，旧包继续有效。preview 是安全的 HTTP(S)/同源资源地址；readme 是安全 Markdown 文本，不执行 HTML/JavaScript。前端插件在 definePlugin 中声明，后端在 define_plugin 或 Plugin 类上声明，进入原目录登记流程；不另建介绍服务。

插件停用影响检查加入正在排队/执行的任务数量。仍由原确认弹窗确认，取消还原开关；普通任务启停在运行页立即生效。

登录无错误和无验证码时不再保留空消息高度。公开标签页面按当前语言的真实公开文章计数生成词云：字体随权重变化，测量文本后无重叠排列，最多放置 80 个常用标签；查看全部显示所有标签与数量，窄屏重新布局，服务端和无脚本保持可用列表。
