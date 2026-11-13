# 后端插件开发

版本：backend-plugins-4，2026-11-10。决定见[ADR0087](../decisions/0087-single-entry-backend-plugins.md)。

## 唯一入口

在后端app/plugins/<目录>/plugin.py导出plugin对象。目录名使用Python标识符风格（小写字母、数字、下划线，字母开头）；插件稳定ID由对象声明，目录名不是身份。其余文件、资源、子目录完全由作者组织，没有必需manifest.toml或captcha.py。入口只构造对象，setup只登记能力，不访问数据库或外部网络。

```python
from app.plugin_sdk import Plugin, PluginRegistry, ShortcodeSource


class MyPlugin(Plugin):
    id = "example.note"
    title = "笔记"
    version = "1.0.0"

    def setup(self, registry: PluginRegistry) -> None:
        registry.shortcodes.register(
            ShortcodeSource(
                name="example:note",
                title="笔记",
                kind="container",
                html='<aside class="note">{{content}}</aside>',
                css=".note{padding:1em;border:1px solid currentColor}",
            )
        )


plugin = MyPlugin()
```

函数形式为define_plugin(id="example.note", title="笔记", setup=setup)，可传version、description、author、requires和异步startup/shutdown函数。类形式覆盖同名方法即可。requires为稳定插件ID元组；接口代号api_version当前为1。依赖缺失、循环、重复ID/名称/提供方、无效模板、异步setup均明确失败，注册结果不会部分发布。

## 已实现的注册方法

| 方法 | 输入及行为 |
| --- | --- |
| registry.shortcodes.register(source, identity=None, revision=1) | ShortcodeSource模型；编译HTML和作用域CSS，可显式保留旧UUID，否则按插件ID和调用名生成稳定UUID |
| registry.captcha.register(provider) | CaptchaProvider(id,title,widget,verify)，verify为真实异步服务端校验 |
| registry.routes.register(router, prefix="", access="session", permission=None, scope="all") | 原生HTTP Router、插件命名空间、实时启停/鉴权及请求事务；详见[路由指南](backend-plugin-routes.md) |
| registry.locales.register(locale, messages) | 任意来源的字典；key自动加插件ID前缀，不规定语言文件位置 |

当前宿主界面提供zh-CN/en语言包；插件可登记其他字典，但不会自行扩展宿主界面语言列表。文案通过i18n.t("插件ID.key", locale=...)读取。任务通过registry.tasks.register(TaskDefinition)登记，包含Worker有限任务及Scheduler所属常驻子进程，见[任务指南](runtime-tasks.md)。HTTP路由已按[ADR0098](../decisions/0098-backend-plugin-http-routes.md)交付，通用插件资源/配置接口仍未交付。

单体kind="leaf"不需结束标记；容器必须有唯一正文插槽。参数用ShortcodeParameter，支持text/url/select/number/boolean。调用名不能使用为用户保留的custom:前缀，所有代码贡献跨插件检查重名。模板遵守[原生短代码](../architecture/shortcodes.md)的转义、HTML/CSS和按需样式边界；数据库用户模板仍可编辑，代码模板在后台只读。

完整示例app/plugins/example_cards/plugin.py同时演示类、容器/单体、参数、样例和文案；basic_shortcodes/plugin.py演示函数式入口和保留UUID。验证码入口可自由import原来的实现文件，宿主不扫描其文件名；回调参数StoredProvider也从app.plugin_sdk导入。

```text
{{< example:card title="阅读笔记" >}}
这里支持 **Markdown**，也能放置其他短代码。
{{< /example:card >}}

{{< example:badge text="更新" >}}
```

## 生命周期与发布

API进程装配只读发现一次，setup结果按依赖排序。API lifespan调用startup(context)，退出逆序shutdown(context)；部分启动失败也执行清理。context.role为api，runtime提供进程资源，不包含当前请求身份/Session。启动钩子不是后台启用回调，运行时启停由业务按当前数据库状态判断。Worker/Scheduler不执行这些API钩子；当前模板无需额外Worker实现。

检查本地插件不连接数据库：

```sh
uv run --locked python -m tools.register_backend_plugins
```

部署代码到所有API进程后重启，再显式同步目录：

```sh
uv run --locked python -m tools.register_backend_plugins --config config.toml --apply
```

登记复用站点锁、媒体引用保护、修订、审计和可靠Outbox。重复无变更不会增加修订。SiteSettings.data._backend_plugins保存私有部署快照，公开PublicSettings.shortcodes为启用代码模板与用户已应用模板的投影。私有短代码目录另提供applied字段，普通编辑者仅需shortcodes:read即可预览/插入已应用模板，不需读取站点设置。浏览器不能覆盖代码模板；保存普通设置只保留用户模板的原存储位置。没有新增数据库表/迁移，服务启动也不写数据库。

后台“插件管理”展示前后端插件；后端登记与进程目录不一致时提示同步，不能重新启用。依赖冲突要求一同调整。使用检查覆盖已应用页面、已发布/定时正文和当前验证码引用；取消还原开关，停用保留数据。安全提供方失效不静默放行；正在验证的请求在提交前重新检查。

短代码具体定义不再由契约生成进前端主体。协议兼容时只部署Python插件、同步目录即可让新模板出现在插入库及公开SSR；需要React交互时另部署对应前端插件。前后端注册重名会拒绝登记，前台对部署中的冲突优先使用后端已应用模板，不让新前端包覆盖其展示。

Python代码更新需要受控重启，不声称同进程热替换。插件内部资源计入构建摘要（隐藏文件和__pycache__除外）；不要把凭据、日志或运行文件写进插件目录。配置沿现有专有服务保存；当前没有通用插件配置/元数据写入API。

不包含在线安装包、第三方Python依赖安装、自动迁移或跨后端节点部署控制器。多副本部署须统一代码后同步；验证码在摘要不匹配时拒绝服务，模板阅读使用持久化的已应用版本。缓存与构建产物继续放忽略的var目录，后端根plugins目录不恢复。

## 部署目录展示元数据

Plugin类或define_plugin可提供homepage、license、preview、readme，原version/author继续使用。preview可填安全URL或 `asset:assets/preview.webp` 等包内图片。包内图片随目录登记，通过按内容哈希生成的公开 URL 提供，支持 WebP、PNG、JPEG 和 GIF，单张上限 4 MiB。readme为Markdown正文；缺省不影响加载。后台统一详情弹窗不执行介绍中的HTML/脚本。特色图见[ADR0139](../decisions/0139-theme-plugin-recommendations.md)。任务注册方法、生命周期和检查点见[任务指南](runtime-tasks.md)。

## 任务参数声明

Worker有限任务可在TaskDefinition提供parameters=PydanticModel、default_parameters={...}，函数接收(config, validated_model)；未声明参数的既有函数不变。默认值须通过模型校验，传参严格JSON且私有持久；公开展示Schema和可展示默认值，Worker重新校验。同参活动任务复用、异参409；具体字段、敏感默认处理与部署见[任务参数指南](runtime-tasks.md)。可参考runtime_example/parameter_task.py及plugin.py登记，示例默认关闭，不要求作者采用固定文件名。
