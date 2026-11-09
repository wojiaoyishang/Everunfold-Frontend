# 0087：单入口后端插件与运行时短代码目录

日期：2026-11-09。状态：已实施；实际检查见[验收](../handoff/backend-plugins-verification.md)。

用户要求后端插件只有一个入口文件，其他文件布局自由，通过函数或类方法声明能力，并提供简单短代码插件。覆盖ADR0086中验证码专用captcha.py发现方式，不改变验证码规则、权限和公开/私有数据边界。

- 唯一发现位置为app/plugins/*/plugin.py，导出plugin对象。Plugin子类和define_plugin函数共享接口；元信息在代码中，没有必需manifest或固定内部目录。
- 同步setup通过PluginRegistry注册短代码、验证码提供方、具名文案。注册结束封闭，重复ID/贡献、缺失或循环依赖、不兼容接口和异步setup阻止装配；API lifespan按依赖顺序startup、逆序shutdown，处理部分启动失败。请求身份/Session不进入setup。
- 当前不提供无消费者的通用路由、任务或数据RPC占位接口；未来按实际用例扩展。API仍由原router_init装配；Worker/Scheduler不执行API生命周期。
- notice/accordion移入基础插件，稳定UUID/调用名/模板保持。example.cards为完整单文件示例，贡献容器example:card与单体example:badge。两个验证码适配器使用同一注册器，保留提供方ID和前端widget引用。
- 本地入口发现不写数据库。显式register_backend_plugins命令验证模板、冲突与媒体后，将部署目录快照存入SiteSettings私有JSON，修订/审计/Outbox同事务；重复登记无变更。只公开生效的已编译模板，沿原可靠设置流同步，前端契约不再内嵌已安装短代码。
- 管理端合并前后端插件，沿已有保存/取消/使用检查。停用移除目录和插入入口，正文源文不重写，重新启用恢复。代码模板不能通过设置PATCH或短代码API编辑。依赖插件须同时启用；后端代码/部署记录不一致不能重新启用。
- 验证码调用要求当前提供方插件已登记、启用且匹配本进程部署摘要；不可用时拒绝验证，不回退免验证。事务围栏重新检查插件状态，插件切换和重新启用使在途证明失效。
- 后端代码为可信部署内容，新增/修改Python后重启有关进程并显式同步目录；无在线上传执行、热替换Python模块或自动数据库迁移。前端纯模板目录更新无需重新构建主体；交互组件继续用独立前端插件包。

实施指南见[后端插件](../development/backend-plugins.md)。
