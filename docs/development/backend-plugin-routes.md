# 后端插件 HTTP 路由

版本：backend-plugin-routes-1，2026-11-10。决定见[ADR0098](../decisions/0098-backend-plugin-http-routes.md)，插件入口见[总指南](backend-plugins.md)，检查见[验收](../handoff/backend-plugin-routes-verification.md)。

## 最小实现

继续只要求 `app/plugins/<目录>/plugin.py` 导出一个插件对象，其余文件自由命名。用原生 FastAPI APIRouter 声明 HTTP 路由，在同步 setup 中登记，不修改主项目的路由表。

```python
from fastapi import APIRouter
from app.plugin_sdk import (
    JSONResponseSuccess, PluginRegistry, PluginRequest,
    PublicModel, PublicResponse, define_plugin,
)


class Greeting(PublicModel):
    message: str


api = APIRouter()


@api.get("/hello", response_model=PublicResponse[Greeting])
async def hello(ctx: PluginRequest) -> JSONResponseSuccess:
    assert ctx.actor is not None
    return JSONResponseSuccess(data=Greeting(message=f"你好，{ctx.actor.display_name}"))


def setup(registry: PluginRegistry) -> None:
    registry.routes.register(api)  # 默认要求登录 Session。


plugin = define_plugin(id="example.greeting", title="问候", setup=setup)
```

最终地址为 `/v1/plugins/example.greeting/hello`。`prefix="/tools"` 会放在插件命名空间之后，变为 `/v1/plugins/example.greeting/tools/hello`。APIRouter 自身的 prefix 和嵌套 include_router 同样保留。类形式在 Plugin.setup 内执行相同登记。

项目示例 `app/plugins/route_example/plugin.py` 从自由命名的 api.py 导入三个 Router，提供公开问候/回显、登录身份/回显和 settings:read 权限查询；不创建内容或修改用户资料。地址前缀是 `/v1/plugins/example.routes`，启用与目录同步规则与其他插件相同。

## 登记与保护

```python
registry.routes.register(router, prefix="", access="session", permission=None, scope="all")
```

| access | 行为 |
| --- | --- |
| `session`，默认 | 当前有效登录、有效账号且已改初始密码；写方法要求CSRF和允许的Origin。拒绝API Key，适合个人会话操作 |
| `permission` | 必须提供现有权限代码，例如permission="settings:read"；支持Session和面向everunfold的Key，按用户/应用/Key实时权限交集判断，不能借管理员Cookie或角色越过Key上限 |
| `public` | 必须显式声明；无凭据时匿名，可供无Origin的服务端回调。带有Authorization仍按主项目API Key验证，错误凭据不降级匿名；Cookie不自动授予身份 |

`permission` 只接受宿主已登记的CAPABILITIES，不创建新权限代码。`scope`默认all，只持own权限的人/Key不能进入需要all的插件接口。仅支持归属范围的能力可显式选scope="own"，此时允许own或all；插件必须继续使用ctx.actor.allows(capability, owner_id)检查自己资源的归属。访问宿主文章时复用require_content_access，不能将own当作全量查询授权。自动准入不替插件完成资源级授权。

GET/HEAD/OPTIONS是只读语义；POST/PUT/PATCH/DELETE是写方法。请求实际业务语义由作者负责，GET不能修改数据，写业务应声明对应写权限；使用POST做只读查询仍要求浏览器CSRF。公开回调如果会改变状态，作者须另行实现签名/重放验证，不把public当作授权。自定义签名可放在专用Header；Authorization保留给主项目Key。

所有已声明路由仍经过允许的Origin、错误外壳、private/no-store和大小限制。插件专用CORS支持上述方法及自定义请求头，但Origin仍为站点配置的精确名单；这不放宽其他API的CORS。写请求上限64KiB，不是大文件上传入口；大文件复用宿主媒体服务。

## 请求上下文与事务

`PluginRequest` 是原生Depends别名，返回PluginRequestContext，包含plugin_id、runtime、session和actor。actor在无凭据的公开请求中为None。也可同时声明Request、Body/Query/Path/Header、原生Depends和Pydantic模型；普通同步处理函数也由FastAPI按原规则执行，但AsyncSession仍须在异步函数中使用。

宿主先检查已部署目录，再鉴权并取得插件启停共享锁，重新检查后才执行插件自定义依赖/处理函数。当前处理函数及响应构造在同一会话内，HTTP状态小于400提交，错误响应或异常回滚，返回前提交失败不会发送虚假成功。认证写请求的最小审计随同提交，Key使用时间也在同一事务保存；日志不记录请求体、凭据或验证码。

使用ctx.session的代码不要自行commit/rollback、关闭会话、创建逃逸的后台协程，或在事务内调用外部网络副作用。插件业务、审计及可靠意图应在同一事务；外部工作交给Worker。不要在该会话里修改SiteSettings或插件启停目录以升级宿主共享锁，应走原管理接口。需要媒体引用等其他全局锁的复杂业务应沿宿主用例服务的既定锁顺序设计，不能直接嵌套会自行提交的服务。

上下文只活到当前处理函数/响应构造结束，不能留给StreamingResponse生成器、BackgroundTasks或全局对象。此阶段面向有限时长HTTP业务；长连接继续由Scheduler管理常驻任务。需要自己的持久数据时安排显式迁移，不在setup或启动时自动建表。

JSON请使用SDK导出的PublicModel/PublicResponse与JSONResponseSuccess/JSONResponseFail，保持success/code/msg/data和真实HTTP状态。失败优先抛AuthFailure或明确返回错误Response；不能用200外壳伪装失败。服务端副作用的幂等编号、Outbox与外部回调仍由具体用例负责，宿主不自动重试请求。

## 启停、冲突与部署

- 只有显式登记、插件及其依赖启用、当前API代码摘要与应用目录一致时才执行。未登记或停用返回404，代码/依赖摘要不一致返回503；数据库不可用也不放行。
- 启停、登记的排他锁会等待已有处理结束。已经获准的请求可以完成，停用提交后新请求不再进入处理函数；不会强杀正在执行的Python逻辑。
- 路径统一受插件命名空间约束，不能覆盖核心路由。拒绝路径穿越、编码路径、重复斜线、模糊的同形参数路径/方法、重复operation_id、TRACE/CONNECT、WebSocket和Mount。静态地址应放在可匹配它的参数地址之前，沿原生匹配顺序。
- setup结束后注册器封闭，保存登记时的路由快照；后续在原APIRouter增加路由不会悄悄进入API。路由身份、方法和访问声明进入插件构建摘要。插件源码及依赖仍是可信代码，不是安全沙箱。
- Router只贡献HTTP声明；API启动资源使用Plugin.startup/shutdown。不要使用Router事件或lifespan代替插件生命周期，嵌套Router也遵循此规则。Worker/Scheduler可以发现声明，但不会装配API路由或执行API生命周期。

部署Python源码到所有API副本并受控重启，然后显式同步目录：

```sh
uv run --locked python -m tools.register_backend_plugins --config config.toml --apply
```

启用/停用已有代码无需重启；新增或修改Python路由仍须受控重启和目录同步，不声称Python同进程热替换。停用保留数据和路由声明，OpenAPI中仍可见声明，但调用会被拒绝。

## 插件自己的接口契约

路由出现在API的 `/openapi.json`，operation_id自动加插件命名空间，多方法定义拆成唯一操作，保留原生模型/依赖及插件标签。自动准入错误使用项目ErrorResponse模型。

也可离线导出该插件自己的完整OpenAPI，无需连接数据库或启用插件：

```sh
uv run --locked python -m tools.export_plugin_routes --plugin-id example.routes
# 默认 var/cache/plugin-contracts/example.routes.openapi.json，受Git忽略。
```

可用 `--output` 指定要版本化的契约文件；不要把默认构建缓存提交Git，也不要把导出产物放回插件源码目录造成构建摘要循环变化。契约带有插件ID及当前build摘要，消费者据此生成客户端；主项目固定契约不为每个插件复制DTO。通用主项目鉴权/评论等接口契约版本本次不变。

实现对照当前锁定FastAPI0.162.0的原生RouteContext和APIRouter行为；框架升级须重验嵌套包含、快照、依赖与多方法导出。[FastAPI官方多Router说明](https://fastapi.tiangolo.com/tutorial/bigger-applications/)提供原生背景，项目的启停和授权边界以本指南为准。
