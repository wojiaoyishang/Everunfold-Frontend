# ADR 0098：后端插件的原生 HTTP 路由

版本：ADR0098-1，2026-11-10。状态：已实现，运行结果另见[验收](../handoff/backend-plugin-routes-verification.md)。用户要求检查后端插件注册自定义路由，检查发现原SDK尚未交付该能力，本次补齐，不改变单一plugin.py入口。

## 决策

setup中使用registry.routes.register(APIRouter, prefix, access, permission, scope)。路由一律归入/v1/plugins/<插件ID>，快照后封闭注册，保留FastAPI路径/查询/请求模型及依赖，不扫描其他固定文件、不让插件修改主应用。API集中装配，Worker/Scheduler不调用路由装配或API生命周期。默认session；public必须显式声明；permission复用现有能力与当前用户/应用/Key权限交集，all为默认授权范围。

请求进入插件依赖前，检查应用目录、依赖启用及代码摘要，按当前凭据加锁重验，再持有站点共享锁检查启停。宿主提供请求内PluginRequestContext，统一事务、错误响应、最小审计与private/no-store。错误/异常回滚，提交后才回成功；站点排他变更等待已获准请求结束，停用提交后不再接受新请求。不强杀旧请求、不把Python代码启停说成同进程热更新。

插件HTTP使用独立CORS分支，允许已有Origin中的浏览器使用常见HTTP方法和自定义头，不扩展核心接口名单；有浏览器Origin始终校验。显式公开接口允许无Origin的服务端调用，匿名不带用户身份；若提供主项目Authorization则验证且错误不降级匿名。Session写入仍需CSRF；所有请求/写体保持边界，不开放任意路径或无界上传。

路由原生OpenAPI可离线单独导出，默认产物进入忽略的var/cache。路径、方法和授权声明参与插件build摘要，不为插件新增一套宿主DTO。现有BackendPluginInfo及宿主业务契约不增加字段，因此无需前端重建或契约同步。新增示例example.routes可用现有插件管理启停。

## 边界

这不是第三方Python安全沙箱，也不负责新能力代码目录、通用配置、自动迁移或资源级归属判断。插件不得自行提交上下文事务、在其中进行外部网络副作用、升级站点启停锁或把ctx留给响应后的任务；可靠外部工作与长连接继续使用Worker/Scheduler。当前注册HTTP APIRoute，WebSocket/Mount不接受。代码变更须部署所有API副本、重启、显式同步。

开发示例、准确参数与部署命令见[路由指南](../development/backend-plugin-routes.md)。本ADR扩展ADR0087当时未交付路由的边界，不覆盖其生命周期、显式迁移或单入口要求。
