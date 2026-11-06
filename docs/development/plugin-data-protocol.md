# 插件数据拉取与后端回调规范

版本：plugin-data-1，2026-11-07。规范先于后续代码实现；当前实现与尚需真实后端资源的边界分别列出。所有业务仍由FastAPI授权，前端接口不自动创建后端操作。

## 资源接口

每个资源有稳定resource_id、scope（public/session）、参数/结果模型及真实后端operation。宿主提供`createPluginDataSource(driver)`，一个实例绑定一个资源，避免接受任意URL。方法如下：

```ts
data.refresh(params, { signal })
data.request(params, operationId, { signal })
data.wait(params, { afterRevision, sourceEpoch, timeoutMs, signal })
data.subscribe(params, onValue, onError) // 返回幂等的取消订阅函数
```

`refresh`立刻调用真实操作；`request`只有driver提供异步后端操作时才可用，接受稳定operationId，返回request_id、accepted_revision和pending。等待某个请求时由该资源的参数模型包含request_id，不在URL嵌入Token。`wait`先订阅再立即补拉，处理回调早于订阅的竞争；超时/取消释放监听，只停止等待，不撤销已提交任务。

每个实例公开capabilities.refresh/notifications/deferred。调用方据此展示入口，没有真实通知或异步操作时明确不可用，不虚构排队/完成接口。驱动需使用生成客户端验证后端模型，不能通过公开RPC代理任意私有接口。

结果PluginDataValue包含resource_id、scope、source_epoch、revision、updated_at和data。公开回调epoch必填；既有私有GET未提供epoch时允许null，仅用于本次授权读取，不参与跨epoch公共缓存。revision在同一资源、参数和epoch内单调；通知不得携带被浏览器直接信任的私有正文。

## 立即读取与浏览器通知

`pageConfigurationSource(baseUrl).refresh({pageId})`已接入真实readManagedPage，返回该工作稿options、修订与时间。沿原Session、精确Origin、private/no-store及pages:read，不授予新权限，不返回内部元数据或把结果写入共享磁盘/localStorage。

驱动subscribe只传递resource_id、source_epoch和revision的已授权失效通知。宿主再次refresh，用当前会话重新鉴权后才通知使用者；过滤错误资源、重复/旧修订、已退役epoch和晚到的旧请求结果。失败不会把失败修订记作已应用，重复通知可重试。退出/取消幂等释放监听和AbortController。权限撤销后正常读取必须失败，不能凭旧通知恢复数据。

当前页面配置driver的notifications/deferred均为false；通用SDK已实现这些驱动接口及等待/竞争/超时处理，但尚未给所有插件创建统一异步后端RPC、SSE或WS服务。业务接入须有真实后端消费者和契约，不能把单元测试通知当成生产Callback已上线。

## 服务器Callback

公开页面配置已经沿应用事务→完整public-content快照→Outbox/Worker→Node接收器可靠下发。继续复用节点身份、真实socket来源IP AND Token、修订下界、摘要、撤回及持久ACK，不能另发一条绕过版本保护的HTTP通知。源码、草稿、私有内部元数据不进入公开配置Callback。

后续独立异步资源的Callback信封应包含protocol、event_id、node_id、resource_id、scope、request_id、params_digest、source_epoch、revision、state（ready/failed/invalidated）、完整公开结果或失效通知及payload_digest。目标为受信Node内部接收器，凭据只在服务器配置；浏览器参数不接受任意callback_url。

公开ready在持久化完成后才ACK。按资源/参数摘要隔离，拒绝错误摘要、乱序和撤回后的旧结果；ACK含event_id、applied_revision及applied/already_applied/stale/rejected。任务、审计和Outbox在同一PostgreSQL事务；Worker执行业务，Scheduler只调度。私有回调只提示请求ID/修订，再由浏览器授权拉取，不能落公共缓存。

SSE/WS只是提示通道，断线/丢事件用授权refresh恢复，不依赖浏览器常在线。第一条真实新异步资源上线前必须发布后端契约并完成重复/乱序、请求先完成后订阅、超时、重启、权限撤销与双API/Worker/Node验证。现有公开配置可靠同步已由原P0覆盖；本轮SDK驱动测试与服务器可靠投递验收分别记录。
