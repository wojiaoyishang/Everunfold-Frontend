# 前端插件、主题与运行时扩展规范

版本：plugin-runtime-6，2026-11-09。已按ADR0079实现，实际检查见[本轮验收](../handoff/independent-plugins-verification.md)。本版替代plugin-runtime-2中的插件随主体编译、根cache和仅显式页面登记规则；数据协议、开放模型与父子主题规则保留。

## 宿主、主题和插件

宿主掌握认证/权限、CSRF、事务、审计、可靠投递、版本/撤回守卫、源文、上传队列和路由。主题提供具名控件、布局、模板与钩子。可选页面、短代码和新控件通过插件贡献。第一方人物页和画廊也使用同一运行时。

主题源码在src/themes/<目录>，固定本地import.meta.glob随主体构建。所有准备提供的主题都在构建时包含；部署后可以切换已经编译的主题，不能新增TSX主题源码。子主题逐级继承、ParentThemeComponent、稳定ID模板和具名钩子见[主题规范](frontend-themes.md)。后台保持Argon管理上下文。

插件源码在src/plugins/<目录>，由独立esbuild编译器处理，主体不导入这些源码。每个plugin.ts以同步setup贡献页面、短代码及组件名；components.tsx提供React实现和可选activate生命周期。插件不能以宿主私有路径或越出自身目录的相对路径导入宿主代码；公共SDK为唯一宿主能力入口。相同React/JSX实例由宿主提供，不在插件中另打包React。

主体编译和插件编译可以分别执行。新增插件无需修改中央注册表或重建主体。目录ID、插件ID、页面ID、短代码UUID/调用名保持稳定，重复声明或保留名冲突属于无效包。缺少展示实现使用占位及局部错误边界，保留配置；组件渲染失败后，新的完整构建会重试该边界，普通更新不通过重挂载边界来清空状态；整个已发布页面实现缺失/版本不匹配继续按既有503边界处理。

## 包、发现与热更新

生产目录为plugins/<目录>/manifest.json及带SHA256文件名的资源，直接覆盖该目录，不设版本号子目录。manifest包含plugin-package-1、SDK协议号1、入口/资源摘要、公开注册元信息及自动构建摘要；源代码中的语义版本仍用于接口/页面数据兼容，不承担浏览器缓存失效。

构建先写完整资源，最后原子rename清单。Node验证协议、目录、资源大小/摘要和共享声明，并把已验证资源复制到var/cache/plugin-packages后加载不可变CJS共享定义。浏览器仅获得公开ESM/CSS及元信息，Node入口不由资产接口提供。导入的图片/字体/视频使用同源插件资产绝对路径，避免随文章URL解析；独立类型检查将其视为URL字符串，和Next静态图像对象类型隔离。正文短代码在Node和浏览器使用同一纯共享逻辑，继续经过宿主HTML/媒体过滤。

并发扫描合并执行。更新失败保留该进程最后一次通过校验的包；冷启动没有历史可用包时展示不可用状态，不伪造成功。开发包不能用于生产。删除目录移除贡献，但不删除数据库页面、原始正文或历史配置。停用已安装插件会隐藏其页面和插入入口，保留源文；缺失代码与主动停用是不同状态。

同源技术接口为GET /__plugins/catalog和GET /__plugins/assets/<目录>/<文件>。目录不携带用户身份和私有配置，使用no-store及内容ETag；资产按摘要不可变缓存。页面每次读取本地已应用设置，不回源依赖FastAPI在线。开发浏览器约1.5秒检查目录，生产活动标签页约10秒，后台标签页暂停检查；这不替代可靠的设置投递或变成公开快照TTL。

开发npm run dev自动编译、监听Docker挂载目录、新增/删除插件并更新对应资源。React Refresh复用Next宿主已初始化的刷新运行时；兼容函数组件保留Hook状态，Hook结构变化仍可能重挂载。编译错误显示开发提示并继续使用旧包，修正后恢复。生产阅读页允许热替换；文章/说说/页面的完整、首次创建和嵌入编辑器固定已加载的插件集合，遇到构建/启停变化先提示重新打开，避免打断草稿。离开编辑界面后可应用待更新集合。activate的onDispose用于释放订阅、事件和计时器；ESM模块本身由浏览器缓存，不能宣称可强制卸载JS内存。

首期运行时React页面/控件在浏览器挂载，首屏显示主题加载占位；任意RSC、Server Action、热装后端Python包和数据库迁移均不属于这一插件协议。插件是受信任部署代码，不是恶意代码沙箱；管理后台不提供远程JS URL或npm安装。

## 后端权威设置与节点清单

settings 1.12.0新增PublicSettings.extensions：theme为空时使用实例默认，否则为已部署主题ID；disabled_plugins为停用的稳定插件ID列表。新增插件缺省启用，首次登记的页面仍是未启用工作稿，须另行审阅/应用。设置沿原PATCH /v1/admin/settings的修订、权限、CSRF、事务、审计及可靠投递，不在本地配置另存一套开关。

GET /v1/admin/extensions返回配置的前端节点及最后登记清单，使用settings:read权限。reported_at代表登记时间，enabled代表节点配置，不能解释为在线探测。选择主题时要求所有启用节点都登记相同主题ID/版本/父级描述；重新启用插件时要求这些节点都有相同构建摘要。缺失/不一致返回42298，不改变设置修订。

settings 1.14为主题目录增加可选简介、特色图、开发者、主页、源码及许可证；声明在theme.ts，统一导出和验证，旧声明仍可用。后台通过卡片选择并沿原设置保存/同步，不在用户配置或缓存另存元数据副本。展示图片不会被后端下载，默认放在已有/reference静态空间；详见[主题指南](../development/child-themes.md)及[ADR0084](../decisions/0084-theme-cards-metadata-and-settings-scroll.md)。

settings 1.13新增POST /v1/admin/extensions/usage，输入plugin_ids（每次1至100个稳定ID），响应scanned_at与plugins数组；每项包含plugin_id/title/registered/applied_pages/published_contents/scheduled_contents。要求settings:write；浏览器POST保留CSRF/Origin验证。只返回计数，不暴露私有内容。归属从所有已存清单收集，停用时仍能检查；计数读取权威应用快照与正文，定时内容取冻结计划，不取后来修改的工作稿。

设置保存统一检查启停差异，有使用或注册信息未知时显示可继续的项目确认弹窗，无使用直接保存；失败保留输入且不保存。取消或Esc按预检时原状态还原本批次插件开关，保留其他工作稿字段；成功关闭不执行回退。预检不锁全站，不能推断任意脚本或配置隐式依赖。页面目录过滤不可用的注册页，按ID记录与配置仍保留；重新启用并部署就绪后恢复，已打开目录随插件清单变化重新读取。详见[ADR0083](../decisions/0083-plugin-activation-usage-confirmation.md)与[本轮验收](../handoff/plugin-activation-usage-verification.md)。

Node的dev/start协调进程从本地完整包和构建出的主题清单形成extensions-1，变化时登记，平时约60秒更新记录；失败在后台重试，读页面不等待网络。POST /internal/extensions/{node_id}验证真实socket来源IP AND该节点的Next→FastAPI环境变量Token，忽略X-Forwarded-For。清单最多512KiB，只接受元数据，不接收执行代码。浏览器不能调用它安装程序。

登记在与设置/页面引用相同的锁下事务更新节点目录，并复用页面登记器。第一次创建未启用页面工作稿；之后保留既有data、发布快照、修订及应用状态，不用代码defaults覆盖用户配置。显式CLI登记继续可用，构建命令本身不连接数据库。迁移0027_extensions显式建立节点清单表；服务启动不自动迁移。

## 配置模型、数据和缓存

页面options继续是开放JSON对象，不是表单白名单；32层/256KiB及整页512KiB是既有上限。字段使用开放component名称及key/label/default/props/fields，主题提供标准控件，插件补充新控件。SettingsForm递归更新、保留未声明键；无效JSON保留输入并阻止保存。模型、UI和保存逻辑不进入generated目录。

所有派生产物集中在被Git忽略的var/cache：contracts为精确锁定契约，build为错误后备页及主题目录，plugins为开发包，plugin-packages为验证后的不可变运行副本。根cache已移除，无兼容软链接；src/generated、registrations、custom_pages均不恢复。原var/settings、var/public-snapshots及浏览器IndexedDB位置保持，生产plugins也是被忽略的部署产物。

公开配置可随原页面快照下发；私有元数据继续走独立鉴权接口，不进入options、公开props或公共缓存。SDK立即refresh、通知后重新鉴权拉取、deferred等待/取消等边界见[数据规范](../development/plugin-data-protocol.md)。已有pageConfigurationSource实现立即读取管理工作稿；没有真实后端消费者的资源不宣称已有Callback或异步执行服务。
