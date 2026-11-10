# 父主题、子主题与前台展示钩子

版本：frontend-themes-6，2026-11-10。状态：已实现；基础机制见[原交接记录](../handoff/child-themes-verification.md)，Paper精简见[本轮验收](../handoff/paper-starter-verification.md)。

现有Argon为缺省父主题。子主题放在src/themes/<id>/，theme.ts声明parent；自动发现沿用现有本地可信源码机制。省略parent的非Argon主题默认继承Argon，允许多级继承；不存在的父主题、循环或重复身份属于部署错误，不能静默退回另一主题。后台/账号界面继续使用原控件上下文；只有公开阅读与授权前台预览进入选中的主题上下文。

## 覆盖规则

- components.tsx提供服务端静态具名组件；client-components.tsx提供需要进入水合图的同名实现。文章、列表卡片、标题和正文由服务端注册表直接输出，壳层、表单和交互组件由客户端注册表解析。两者都沿当前主题和逐级父主题查找；子主题只列出覆盖项。ParentThemeComponent从当前实现所属主题的父级继续解析，方便组合原组件而不递归调用自己。
- templates在theme.ts中把模板名称映射到具名组件。模板组件接收children（父主题结果）及context（只含当前视图需要的公开站点/内容/页面、路径、preview标志），可以包装或替换。每一级先匹配稳定ID再匹配通用类型，从父到子组合。单篇使用content:<UUID>；手建页面使用page:<UUID>；注册页面先page:<实例UUID>再page:<implementation_id>。通用模板为home/feed/search/archives/taxonomy/article/shuoshuo/page。URL/语言变更不会失去ID绑定。
- slots是具名插入位置，对应组件列表。父到子追加；子级false清空继承项，再下级仍可添加。名单中的组件沿活动主题链解析，可以覆盖继承的钩子实现。钩子只承载展示，不修改权限、保存、路由或公开数据。缺失展示实现给出占位，模板同时保留父结果。
- styles:true启用本目录styles.ts的CSS文本；仅当前继承链按父到子输出。使用.public-theme[data-theme-chain~="<id>"]作为作用域；单页选择data-theme-content/data-theme-page。CSS变量优先，组件样式可用CSS Modules。共享对话框与人物寄语Portal保留主题容器作用域。不得选择html/body或全局管理界面。Argon现有基础CSS沿用。

宿主保留公开快照、元信息、路由/404/撤回/受限内容守卫、服务端正文渲染、预览权限及回执。模板与静态组件可在服务端预渲染，不能把 Node 渲染器带进客户端；复用children保留已渲染正文，不下发整份快照或原始正文块。水合组件必须从独立注册表进入客户端图。后台输入不会被自定义页面CSS/JS污染。受限文章的访问门禁不作为可替换模板。

## 启用与部署

settings 1.14支持主题展示元数据，ThemeDefinition可选title/description/preview/author{name,url}/homepage/repository/license；从权威契约取类型，构建目录只输出白名单字段。元数据属于当前主题自身，不随父主题覆盖或增加执行权限。后台按已部署清单显示卡片，图片沿既有静态资源或HTTP(S)地址加载，缺失使用占位；开发者链接与选择分开。选择仍只写extensions.theme，实例默认和节点一致性规则保持，见[ADR0084](../decisions/0084-theme-cards-metadata-and-settings-scroll.md)。

所有主题随主体构建；部署后通过“主题设置→已安装主题”选择已登记主题，extensions.theme在PostgreSQL保存并沿原设置审计/可靠投递同步。空值“实例默认”才读取服务端config.toml的[theme].active（FRONTEND_THEME可覆盖实例缺省），最终缺省argon。各启用节点须登记一致主题ID/版本/父级描述后才能切换。节点已应用设置后，新请求使用新主题，活动浏览器通过目录更新也可取得新选择；无需重启或重新构建已有主题。后台保持原管理上下文。

[theme].active不是后台设置的第二份权威值。更新主题源码须按语义版本维护部署描述，并在各节点完成主构建；不能靠向plugins目录复制文件新增主题。选择器不会安装任意源码。浏览器只得到公开ID与目录，内部连接地址/Token仍仅服务端。插件包规则见[运行规范](frontend-plugin-runtime.md)。

Paper 2.0.0作为精简的二次开发起点，仅保留theme.ts和styles.ts，所有组件、模板和钩子继承Argon。局部CSS提供减淡背景、纯色导航、短横幅、细边框与正文行距，不额外包裹父组件、覆盖人物模板或添加页脚说明。复杂组合由隔离生产测试夹具覆盖，开发方式见[子主题指南](../development/child-themes.md)和[ADR0080](../decisions/0080-minimal-paper-starter-theme.md)。默认配置仍为argon，示例不修改站点业务数据。

具名组件名称和公开props作为可复用接口维护，优先追加钩子；破坏变更须升级主题主版本并核对子主题。当前parent绑定已发现的主题ID，不实现远程版本解析或npm安装。

## 字体与主题详情

ThemeDefinition.fonts可直接使用共享defineFont，typography定义正文/标题/代码角色，父到子合并与null重置。公共接口不归某个插件私有；实际文件只按可见使用加载，上传字体显式选择优先。规范见[字体注册](../development/font-registration.md)。

后台默认横向卡片、可切纵向列表；先开详情，右下角启用主题。主题选择独立保存且保留其他工作稿，偏好不回写服务器，详见ADR0084更新。Paper 2.0.1在两文件中提供纸白/浅灰、左文右栏、简约工具/阅读关联及独立中性表面，仍继承Argon交互与阅读偏好。
