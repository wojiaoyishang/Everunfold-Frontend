# 父主题、子主题与前台展示钩子

版本：frontend-themes-1，2026-11-07。状态：已实现；验证结果单列在[交接记录](../handoff/child-themes-verification.md)。

现有Argon为缺省父主题。子主题放在src/themes/<id>/，theme.ts声明parent；自动发现沿用现有本地可信源码机制。省略parent的非Argon主题默认继承Argon，允许多级继承；不存在的父主题、循环或重复身份属于部署错误，不能静默退回另一主题。后台/账号界面继续使用原控件上下文；只有公开阅读与授权前台预览进入选中的主题上下文。

## 覆盖规则

- components.tsx提供具名组件。解析顺序为当前主题、逐级父主题、插件原实现、缺失占位。子主题只列出覆盖项。ParentThemeComponent从当前实现所属主题的父级继续解析，方便组合原组件而不递归调用自己。
- templates在theme.ts中把模板名称映射到具名组件。模板组件接收children（父主题结果）及context（只含当前视图需要的公开站点/内容/页面、路径、preview标志），可以包装或替换。每一级先匹配稳定ID再匹配通用类型，从父到子组合。单篇使用content:<UUID>；手建页面使用page:<UUID>；注册页面先page:<实例UUID>再page:<implementation_id>。通用模板为home/feed/search/archives/taxonomy/article/shuoshuo/page。URL/语言变更不会失去ID绑定。
- slots是具名插入位置，对应组件列表。父到子追加；子级false清空继承项，再下级仍可添加。名单中的组件沿活动主题链解析，可以覆盖继承的钩子实现。钩子只承载展示，不修改权限、保存、路由或公开数据。缺失展示实现给出占位，模板同时保留父结果。
- styles:true启用本目录styles.ts的CSS文本；仅当前继承链按父到子输出。使用.public-theme[data-theme-chain~="<id>"]作为作用域；单页选择data-theme-content/data-theme-page。CSS变量优先，组件样式可用CSS Modules。共享对话框与人物寄语Portal保留主题容器作用域。不得选择html/body或全局管理界面。Argon现有基础CSS沿用。

宿主保留公开快照、元信息、路由/404/撤回/受限内容守卫、服务端正文渲染、预览权限及回执。模板为可在服务端预渲染的同步React展示组件，不能在客户端导入Node渲染器；复用children保留已渲染正文，不下发整份快照。后台输入不会被自定义页面CSS/JS污染。受限文章的访问门禁不作为可替换模板。

## 启用与部署

服务端config.toml的[theme].active选择主题，缺省argon；FRONTEND_THEME可覆盖。每次服务端请求读取，已构建主题切换后刷新生效；不需要重新编译已有代码。浏览器只收到主题ID，配置中的内部地址/凭据不进入组件。全新React/TypeScript/CSS实现仍需构建部署；不能声称能够运行时安装源码。运行中已打开页面维持当前上下文，刷新后获取新主题。

交付包含可运行的paper子主题：继承默认布局，组合父横幅组件、修改阅读样式、给人物页加单页模板并在页脚插入说明。默认配置仍为argon，示例不修改站点业务数据。

具名组件名称和公开props作为可复用接口维护，优先追加钩子；破坏变更须升级主题主版本并核对子主题。当前parent绑定已发现的主题ID，不实现远程版本解析或npm安装。
