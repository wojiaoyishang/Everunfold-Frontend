# 后端插件路由验收

版本：backend-plugin-routes-verification-1，2026-11-10。对应[ADR0098](../decisions/0098-backend-plugin-http-routes.md)、[开发指南](../development/backend-plugin-routes.md)。后端源代码2f6ae8b，已部署容器；本地存档未推送。

## 本轮实现

插件通过registry.routes.register登记原生HTTP Router，默认Session保护，可显式public或permission；统一/v1/plugins/<插件ID>。冻结嵌套路由、类型和依赖，封闭setup，按方法生成唯一operation_id，检查穿越/模糊重名/不支持的路由。请求执行插件依赖前检查目录、启用、依赖摘要和当前身份，持有站点共享锁到事务结束，失败/异常回滚。

PluginRequest提供请求内Runtime/AsyncSession/Actor，JSON/错误外壳及接口级无缓存继续沿宿主。公开回调可无Origin，浏览器Origin仍精确验证，Session写入需CSRF，机器Key受当前权限交集和撤销控制。插件CORS独立支持常见方法和自定义头，不放宽核心接口。新增example.routes示例及独立契约导出，默认输出到受忽略var/cache。

没有数据库迁移、新依赖或宿主DTO字段变化，不需要前端契约同步或重新构建。原固定contracts/public-openapi-v0.1.json未全量重排；插件路由的权威原生契约由运行时/openapi.json及tools.export_plugin_routes提供，导出示例为6路径/7操作及所需模型。

## 检查结果

- 最终完整后端真实数据库套件333项通过，352.50秒。Ruff通过，367文件格式通过，mypy216源文件通过。
- 新增与既有插件定向合计20项/14.72秒通过：原生嵌套prefix和Depends保留、单/多HTTP方法、快照后添加不生效、setup封闭、拒绝危险路径/WebSocket/冲突/无效授权，依赖启停及摘要一致性，OpenAPI及错误模型。
- 真实PostgreSQL事务验证：未登录401、写入缺CSRF403，在插件自定义依赖执行前拒绝；POST/PUT/PATCH/DELETE成功提交4条探针，返回409及抛异常500均无落库。自定义Header的DELETE预检通过；原始回调体不改变，64KiB上限及非法Origin拒绝。
- 两份真实Uvicorn进程及独立数据库验证：未登记404，显式登记后两副本公开路由/查询/模型200和422；私有Session、Key权限不足403、不借管理员Cookie越过Key上限，授权Key正确识别，机器POST无需Origin、恶意Origin403；Session-only拒绝Key。撤销Key后另一副本401，停用后两副本404，再启用无需重启；部署摘要不一致503，修复后200。
- 真实并发验证：已获准请求持站点共享锁，另一连接停用被阻塞；旧请求200完成后停用提交，随后请求404。没有“停用已成功而旧事务仍未准入”的覆盖窗口；不承诺强杀已经运行的请求。
- 离线导出不打开Runtime/数据库，6路径、7个唯一操作、模型及标准401错误Schema完整。Worker/Scheduler原有测试全量通过，不调用API装配。

第一次FastAPI深复制探测遇到线程锁不可pickle，改为RouteContext展开及显式原生声明快照，未将deepcopy用于实现。初次定向用例的ResponseSuccess|ResponseFail返回注解不符合原生推断，夹具改response_model=None后通过；首次静态检查的格式和可空类型问题已修复并全量重验。未把这些失败记作通过。

## 容器部署

只读预检记录原插件build、disabled列表和任务enabled状态；原有声明逐项一致。API受控重启，显式运行register_backend_plugins --apply，新增example.routes并排入可靠设置同步。再逐项比较，原插件摘要、插件启停和任务启停均保留。

实际本机HTTP公开hello返回200，未登录me返回401，均private/no-store。主站没有执行示例回显写请求、用户退出、权限变更或真实评论/邮件；写入和启停/撤销验收在独立测试库完成。最终六服务、四端口0.0.0.0、健康/后台HTTP200通过，继续HTTP。无需重启前端；Worker/Scheduler无需为无任务贡献的HTTP示例重启。

QA日志、导出契约及私有比较快照仅在忽略var目录，不提交主机地址、凭据或用户内容。后台没有新可见组件，本轮不做浏览器UI验收，也未重复前端套件或正式构建。

## 限制

当前注册原生HTTP APIRoute，WebSocket/Mount不接受。流式响应/BackgroundTasks不能继续使用已结束的PluginRequest事务；长连接仍归Scheduler。没有通用插件配置写入、动态新增权限目录、在线Python热替换、自动迁移或任意资源级授权。可信插件必须遵守外部副作用、事务和锁顺序约定；宿主不是Python安全沙箱。

没有新增跨节点代码分发，也未测试所有代理/浏览器、全厂商第三方插件及长期负载。请求可能在数据库提交后客户端断开，业务幂等和可靠Outbox仍由具体用例实现，不能把HTTP成功等同外部恰好一次效果。
