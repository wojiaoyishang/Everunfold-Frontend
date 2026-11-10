# 前台组件、导航与动效边界

历史主体更新：2026-10-31；父子主题补充：2026-11-07。适用于当前 Next.js App Router 前台；在线 0.1 API/快照保持不变，展示原型另消费后端 0.2.0-preview.1 草案。最新导航检查见 [导航验证](../handoff/frontend-navigation-verification.md)，其余阅读能力见 [说说与阅读工具记录](../handoff/frontend-reader-verification.md)。

2026-11-05实现更新：旧兼容解析、legacy样式及旧摘要/引用汇总已经移除；下文词表仅为历史记录。当前采用`{{< … >}}`原生语法，目录、受控HTML/CSS、自定义保存/应用、只读代码注册和文章插入已接通，见[短代码架构](shortcodes.md)、[ADR0057](../decisions/0057-native-shortcode-implementation.md)。HTML源码可进入可视化修改，源文保留和边界见[ADR0058](../decisions/0058-preserved-html-visual-editing.md)。

## 目录与职责

```text
src/app/                         薄路由、元信息、错误状态；无替换正文的根 loading
  layout.tsx                    文档级根布局（当前仍有待拆分的全局主题样式）
  (blog)/layout.tsx             唯一公共 BlogShell 入口
src/core/
  content/                      后端生成类型、快照校验、展示适配/样例、查询/推荐/元信息
  config/                       仅服务端实例配置
  rendering/                    Server 正文渲染、客户端评论的安全 Markdown 元素树
    native-shortcodes.ts        原生调用渲染，复用后端编译目录，不执行数据库脚本
  browser/                      动效纯策略/订阅、阻尼滚动、页面/锚点历史位置
  navigation/
    targets.ts                  纯 URL / 手势 / 资源导航策略
    presentation.ts             纯目录注册/释放状态约束
    document.ts / transaction.ts 完整公开文档准备、取消/超时/竞争请求状态
src/themes/argon/
  argon.css                     仅有序导入，不堆积整站样式
  components/
    shell.tsx                   常驻背景、顶栏、侧栏、主内容容器和页脚
    background-video.tsx        常驻播放 Provider，阅读设置控制已保存的播放偏好
    route-state.tsx             共享导航上下文与页元信息桥接
    route-content.tsx           主内容入场、滚动 reveal、正文链接增强
    navigation-progress.tsx     导航下缘单行提示、失败强调及自动收起倒计时
    floating-tools.tsx          纵向工具列与回顶出入，不各自固定定位
    reading-state.tsx           阅读进度、活动目录、评论状态
    article-media.tsx           已安全渲染正文的图片和折叠交互
    reader/                     图片查看器与代码工具；由文章、说说和评论共用
    shuoshuo.tsx                轻量说说卡片/详情；不使用整卡遮盖链接
    collapsible-content.tsx     共用长说说/长评论的测量、渐隐和展开
    search-dialog.tsx           常驻壳搜索弹层，复用 SearchForm
    appearance-settings.tsx     主题色、系统/手动外观、纯黑模式
    home-feed-settings.tsx      首页筛选偏好及水合后恢复；公开 URL 优先
    reading-settings.tsx        不锁页面滚动的原生 popover、统一动效选项
    transition-panel.tsx        保留内容的双向高度切换与 inactive/inert
    site-header / sidebar*     共享导航数据与独立区域展示
    header-navigation.tsx       二级菜单、键盘焦点和收起逻辑
    navigation-link.tsx         Next Link/Form 的统一交互适配
    navigation-state.tsx        手机侧栏展开、关闭及焦点共享
    article*.tsx / post-card    Server 正文与可复用内容展示
    story-cover.tsx             上下篇/推荐共用装饰封面和无图回退
    related-articles.tsx        公开相关性排序、横向图片推荐
    comments/                   评论列表/条目/表单/编辑器/访客字段/纯策略/样例
    pagination / archives ...   主题业务展示组件
  navigation.ts                 主题导航/原站品牌映射，不改公开业务 DTO
  hooks/                        动效订阅、details 高度、滚动订阅、图片 dialog 锁
    use-page-navigation.ts      Next 适配、准备后切换、提交后定位及历史交接
  styles/                       按职责拆分的样式文件，保持原级联顺序
```

`styles/` 按职责分为 base/appearance、shell/sidebar/navigation、listing/shuoshuo、article/comments/comment-composer、reader/reader-tools/discovery、controls/motion/navigation-feedback/responsive。响应式与减少动态效果覆盖保持最后；不得按文件名随意重排导入来改变级联。新动效先复用 tokens 和现有类，不复制一套页面样式。

## 公共壳只挂载一次

原实现每个列表/文章/归档都包裹 BlogShell；即使 Next 执行软导航，背景和侧栏仍会重建，造成整页刷新感。现在 RootLayout 读取公开 Site DTO 并只挂载一个 BlogShell，路由组件只输出主内容和 PagePresentation。

新增页面应复用现有布局，**不要再次包裹 BlogShell**。背景视频、移动侧栏和导航状态留在常驻壳内；RouteContent 按 pathname + query 更换正文及入场状态，hash 定位不重新播放整个界面。

## 静态正文与动态增强（2026-11-10）

公开文章、列表卡片、标题、摘要、正文和阅读表面必须在首次 HTML 响应中直接输出。静态主题实现从 `components.tsx` 经 `ServerThemeComponent`/`ServerThemeTemplate` 解析；仅供水合的组件从 `client-components.tsx` 进入客户端注册表。不能在 SEO 路径使用带“正在加载组件…”占位的 `React.lazy`/`Suspense`；文章正文继续由 Server 的 `renderContentForReader` 生成，也不得改由 `useEffect` 或水合后的客户端脚本拼装。父子主题继承、局部错误边界和缺失实现回退仍保留，详见 [ADR0102](../decisions/0102-static-seo-content-and-dynamic-enhancements.md)。

正文 HTML 由服务端直接写入带稳定 ID 的 `.article-content` 容器；`ContentMarkupEnhancer` 只接收内容 ID、修订、特性开关和术语选项，在 DOM 已存在后按 ID 接管表格滚动、按需代码/公式增强和 CodeTools。原始 Markdown/HTML 区块、渲染 HTML 字符串和完整内容对象不得作为客户端 props。列表与说说同理只跨边界传递展示 DTO。

术语 Tooltip 和查阅量属于阅读增强，不进入首屏 SEO 内容。术语组件在页面空闲后另行加载，只请求当前文章实际命中的词条并复用 5 分钟客户端缓存；浏览量只在指标接近视口时请求，失败时保持指标隐藏。身份、临时指标和交互状态不得写入公开快照、结构化数据或服务端正文 HTML。新增主题的阅读组件必须能在没有 `window`、`IntersectionObserver` 和浏览器定位 API 时完成服务端预渲染。中文、日文和 emoji 正文直接使用 UTF-8；只有 `&`、`<`、`>` 和引号等 HTML 语法字符保持实体转义。

## 客户端导航与目录

- AppLink 保留 Next 预取和浏览器默认手势，并共享 React transition；SearchForm 保留 GET 可分享地址和无 JS 时的原生能力。
- 普通站内导航先用可取消请求完整准备目标公开文档，再交给 Next；新 DOM 提交后才定位正文，不再滚动旧页。5 秒慢加载、20 秒超时、取消/重试/竞争请求由统一事务管理；状态反馈接在 SiteHeader 下缘，菜单不被覆盖。额外 HTML 请求和 Next 传输回退的边界见 [ADR 0009](../decisions/0009-navigation-readiness-and-feedback.md)。
- 最新反馈规则见 [ADR 0010](../decisions/0010-navigation-feedback-countdown.md)：单行且无操作按钮；失败短暂红色轻抖，恢复后 10 秒整幅底色从右向左退去，边缘微光/气泡跟随，结束自动收起。定时器仍在核心事务内，新导航清除旧倒计时；重复尝试通过再次点击原链接。减少动态关闭装饰，但保留时间反馈。
- 历史正文由 Server 安全渲染，限定在正文容器的事件委托接管真实同源页面链接；外链、资源、下载、新标签和修饰键不接管。同页 hash 使用共享平滑定位并保留独立历史条目，目标在折叠块内时先展开。
- 页目录/最新站点数据由 PagePresentation 在提交后桥接。每次注册拥有独立 token，卸载只释放自己的注册；旧页迟到 cleanup 不能清掉新目录，同一路由进入错误边界也不能残留旧目录。
- Client 组件只获得公开 Site、目录和已渲染 children，不把完整快照、服务端 HTML 清洗器、数据库配置或服务密钥引入客户端。评论的 Markdown 解析器用于编辑预览，通过封闭的 React 元素集合输出，拒绝 HTML 执行。

## 动效与资源策略

背景使用原 WebM/VP9、5 秒循环、3200×2400、25fps、无音轨。组件默认静音循环、行内播放；可见且策略允许时才设置源地址。播放拒绝/资源失败时保留静态图，设置中可重试。隐藏标签暂停不改变偏好；core/browser/playback-policy 与 playback-preference 分别负责优先级和存储订阅。未设置时跟随站点动效（默认为完整），明确播放/暂停持久化到 localStorage，跨页、刷新保留；不读旧 sessionStorage 暂停键。最新决定见 ADR 0006。

正文过渡约 460ms，保留旧内容直至下一页就绪；顶端进度和读屏状态反馈 pending。卡片有限错落入场，屏幕外项目按 IntersectionObserver 进入显示；hero 只在公共壳首次进入时播放。hover/press/focus、主题图标、目录/概览高度、手机侧栏/遮罩具有来回过渡。阅读设置与图片查看采用 display/overlay 离散过渡延后移出顶层；details 只在交互时使用 Web Animations 测量自然高度。不添加常驻动画总线。

统一策略见 ADR 0005：默认完整动效、可选跟随系统/减少动态，CSS 与 JS 共用 html data-motion 和 motion.ts 订阅；系统 reduce=true 不能覆盖用户选择的完整模式。SSR 首屏脚本避免闪错偏好，关闭动效仍确保内容可见。桌面侧栏菜单随页面滚动，概览/目录区 sticky 顶距 90px；手机侧栏 top=0，内部面板取消 sticky。

滚动核心只在用户输入/定位时安排有限 rAF。纵向 wheel 支持小数与像素/行/页单位，采用时间相关指数阻尼并累积有界目标，跳过输入框、嵌套滚动区、弹层、代码区、缩放和横向手势。触屏保持原生；不创建第二套页面滚动容器。阅读设置不锁 body；图片 dialog 仍锁背景，根 scrollbar-gutter 稳定横向位置。历史位置有界存于内存并用 history.state 独立键定位，保留 Next 自有字段；完整页面重载不承诺跨会话保存阅读位置。

短代码仅展示转换，转换产物仍走 HTML allowlist 和真实媒体节点映射；不要添加执行脚本、任意类名/样式、查询 WordPress 数据的能力。ref 转为跨块顺序编号及文末往返链接，代码/注释/属性中的例子仍保留字面量。图片仅增强无链接图片及明确指向图片文件的链接，其他链接图片保留导航语义；贴纸不打开大图。

## 后续维护

ArticleHeader 在服务端分有图/无图展示，ArticleActions 负责留言定位、分享弹层、复制反馈与浏览器原生分享；关闭评论时不输出写留言入口。PostCard 的覆盖链接是原生 AppLink，元信息和标签链接保持独立层级，不嵌套 anchor；说说正文保留独立图片、链接及操作。相关文章按公开标签/分类匹配，再按时间和稳定 ID 排序。

评论的历史条目由后端生成 PublicComment 适配为界面模型，示例和临时行只存在主题内。CommentSection 编排全局排序/分页/回复/本页赞同，CommentItem 展示一级缩进，CommentComposer 协调验证和提交演示，CommentEditor/CommentIdentity 分别维护编辑与访客字段。CommentBody 仅用 React 输出有限格式；历史正文始终纯文本。样例不进入 DTO、快照或后端写 API，刷新/离开页面丢弃；正式评论接入时替换编排与接口，不把演示成功提示当作发布成功。

评论展示细节见 [ADR 0011](../decisions/0011-comment-focus-and-scrollbars.md)：EmotionPicker 通过 data-kind 区分 Emoji/完整颜文字/贴纸布局，样式集中在 emotion-picker.css。分组选择与键盘焦点分开，内描边不被 TransitionPanel 裁切；编辑器外框仅跟随正文输入焦点。全站原生滚动条在 scrollbars.css 消费主题变量，保留标准属性回退、系统强制颜色和根稳定 gutter，不改滚动控制逻辑。

文章/说说顶层 type 的展示草案来自后端，见 [内容类型衔接](content-types.md)。legacy kind 只在 core/content/presentation.ts 适配，样例集中在 examples.ts；不修改在线 0.1 快照和生成文件。正式迁移仍待后端版本化发布。

外观偏好由 core/browser/appearance-policy、appearance 和 use-appearance 统一校验、订阅和应用；ThemeToggle 与设置共用。主题色自动派生适合深浅背景的文字色，模式与纯黑偏好跨刷新保存，保留旧 everunfold.theme 选择。右侧设置仍用非模态 popover；搜索使用原生 dialog，复用稳定滚动条与焦点处理。阅读进度仅在确需滚动的文章/说说详情正文内显示，列表和评论区域隐藏。

补充：品牌填充使用 --brand-accent，与深色模式的浅色文字强调色区分；顶栏、侧栏标题/底色和进度条同步变色。首页筛选的纯 URL 策略和存储在 core/browser/home-feed-*，use-home-feed 为主题桥接；RouteState 在普通首页导航前应用偏好。公共 SSR 只按显式参数渲染，直接访问的本机偏好在水合后恢复。详细缓存责任见 [主题配置与缓存边界](theme-configuration.md)，本轮没有实现后台配置同步。

ArticleNeighbors 的顺序来自 core/content/related.ts，固定两格并使用非链接边界占位；与 RelatedArticles 共用 StoryCover。横向推荐最多六条，原生滚动、焦点和缩略图投影均在 discovery.css；容器限制最小宽度，避免图片/长文本撑宽文档。列表/正文后续区/评论使用 --content-gap 保持间距一致。

公开分享地址由仅服务端 PUBLIC_SITE_URL 显式提供，不从 API 地址/请求 Host 推断。文章 metadata 输出公开标题、摘要、图片、时间和 canonical；示例 noindex 且没有正式 canonical，受限投影不输出正文摘要/图片。当前复制/系统分享使用浏览器实际访问地址，便于本机预览；发布后自然使用真实站点地址。

UI 交互用原有组件和纯策略扩展；新页面的内容与安全渲染继续在 Server 侧。先运行 npm run check，再按手工步骤验证客户端交互；保留热更新时使用独立生产构建命令，不直接覆盖正在运行的 .next。

## 统一控件与交互细节（2026-10-31）

开发约定与边界见 [ADR 0012](../decisions/0012-shared-controls-and-theme-consistency.md)。`components/ui/` 封装所有基础交互控件，`ui-controls.css` 负责其默认样式；页面组合组件，仅维护业务事件和布局。Select 的选项/定位纯策略便于测试；useAnchoredPopover 只在打开时观察尺寸/滚动，使用 top layer 避免被搜索 dialog 或设置面板裁切。SearchContentType 让两处搜索使用同一组选项及 GET 语义。不得在新页面直接引入原生选择框或颜色对话框。

HorizontalRail 将原生横向列表与 core/browser/horizontal-wheel 连接，复用纵向滚动的时间阻尼/单位换算。监听只消费还能横移的纵向滚轮，边界留 1px 容差兼容缩放取整；到边缘、无溢出、Shift、缩放及横向输入保留页面/浏览器行为，不另造滚动条。关闭动效立即更新，触摸保持原生，卸载释放资源。

评论定位由 useCommentLocation 在分页提交后安排。scrollToPosition 返回是否真正到达；scrollToAnchor 的可选到达回调只对仍连接的目标调用。只有正常完成才聚焦并设置临时定位标记，2 秒后清理；连续点击/卸载清理前次标记，中断不触发误强调。CSS 只强调头像光晕与作者名字，不使用整行底色、竖线或卡片选中框；减少动态仅保留静态头像/名字提示。

颜色变量统一覆盖选中/主按钮、分页、标签、焦点、正文链接、图片工具及卡片/表单底色，自选色下深浅表面同步染色；错误语义、头像识别色及媒体独立。原生滚动条轨道在顶部导航高度内共用 --header-fill，顶端保持透明；不改变 stable gutter 或弹层锁定时的内容宽度。

## 悬浮层与错误页（2026-10-31）

详见 [ADR 0016](../decisions/0016-anchored-popovers-and-failure-pages.md)。共享 anchored popover 的触发按钮在水合前禁用；每次打开重新测量，`data-positioned` 写入之前不显示，避免原生弹出先于 React 定位。仍支持打开期间观察尺寸与滚动，关闭动画不丢坐标。

`themes/argon/failure/` 统一状态展示、样式和四组翻牌配对；`FailureView` 用于 Next 的局部/根错误边界，`document` 用于 Proxy 独立 404/503。前者消费同一组件/游戏，后者消费 `tools/generate-failure-pages.mts` 构建时生成的 `var/cache/build/failure-pages.json`，不能在 Proxy 运行时导入 React 服务端渲染器。此 JSON 是展示产物，不是业务契约。修改主题源码后运行 `npm run failure:generate`；启动开发/生产构建自动生成，`npm run check` 与独立构建拒绝过期产物。

独立 404/503 的核心说明与样式不依赖脚本、快照或远程资产；游戏只在本地内存运行。Next 意外渲染错误依赖框架客户端错误边界接管，不声称具有同等的无脚本可用性。原有导航准备/超时/旧页保留及撤回内容禁回退规则不变。

## 通用账号入口（2026-11-01）

[ADR 0019](../decisions/0019-shared-login-and-responsive-entry.md) 将 `/login` 明确为通用账号入口；[ADR 0020](../decisions/0020-login-handoff-and-session-check.md) 随后更新缺省目的地：管理员为 `/admin`，普通账号为 `/`，明确安全返回地址优先，服务端权限检查不变。认证页仍独立于公开博客壳和快照。

`ManagementEntry` 组合简洁头部、单列表单和 `SessionFeedback`；共享 `ui/FormField` 只负责标签、图标和错误外观，字段及按钮继续使用既有封装。登录展示已迁至 `themes/argon/auth`，样式由 `auth.css`（登录基础）、`scene.css`（背景）、`entry.css`（登录/身份确认卡片）分责，只在 login 布局导入。

背景定位平面保持 8:5 原比例并铺满视口，窄竖屏调整营地重心，内层单独执行漂移。布局定位和动画不得共用 transform；图片与火光叠层不得分别裁切缩放。入口卡片桌面最大 440px，仅保留必要内容并留足表单内间距；手机保持正常字号/控件尺寸；减少动态关闭入场与环境动画。

`LoginSuccess` 与 `login-handoff` 分离展示和动画生命周期，先显示勾选成功再轻微收起卡片，最后导航；目标预取不触发提前切换，减少动态保持短暂静态反馈。`core/auth/session-check` 合并挂载/焦点/恢复期间的同一次读取，后台复核不拆掉已显示工作区，但失败立即退出已确认状态；请求截止时间不能被焦点事件重置，旧回调与卸载后的请求不能覆盖新会话。

## 后台展示分区设计（2026-11-01）

用户允许后台采用简洁专业、独立于博客前台的视觉；[后台设计规范](admin-ui.md) 和 [ADR 0021](../decisions/0021-admin-theme-and-workspace.md) 定义主题内 public/auth/admin 分区。用户批准样例后已完成主题内 auth/admin 拆分，后台三个入口为 `/admin`、`/admin/content`、`/admin/media`。

`core/admin` 负责认证协调、导航登记和外观偏好；路由适配器组合主题壳，展示留在 `themes/argon/admin/{layout,components,pages,styles}`。`RouteLink` 封装 Next.js 私有代码路由导航，弹层/表单控件复用 UI 封装。`shared.css` 留基础层，博客样式只在 blog 布局导入；根配色/滤镜/字号/动效规则显式排除 admin，后台 token 与偏好独立。内容和媒体只有准备页，下一步按后端契约逐项接业务，详见 [运行指南](../development/admin-workspace.md) 与 [验证](../handoff/admin-workspace-verification.md)。

后台补充见 [ADR 0022](../decisions/0022-admin-navigation-and-motion.md) 与 [导航注册](admin-navigation.md)：`core/admin/registry` 确定性组装可信模块元信息，主题复用同一目录生成桌面/移动菜单；实际 Next 页面适配器仍显式提供。`RouteLink` 可显示真实 pending，后台分段入场/侧栏/选中项/抽屉动效独立保存在 `admin/styles/motion.css`。后台外观新增轻量/系统/减少动态偏好，默认轻量，不继承 public 的 `data-motion`。后端挂钩仅设计，尚无远程菜单接口或插件加载器。

## 插件控件与产物隔离（2026-11-07）

页面/短代码均由可信插件提供，组件模块原生自动发现，不从自动生成文件选择界面。设置使用core/forms的声明模型与渲染宿主，Argon/forms实现标准控件，插件可声明新组件名；缺失时显示主题占位。core/contracts是业务契约访问边界，类型/客户端在忽略的cache中恢复。详见ADR0077和[插件指南](../development/frontend-plugins.md)。

## 父子主题补充（2026-11-07）

Argon作为默认父主题。公开壳、卡片、页面和授权前台预览现通过具名组件、模板和插入钩子参与主题继承；后台保持独立上下文。不要继续把本文件历史目录图理解为新主题须复制整套Argon，见[主题规范](frontend-themes.md)、[操作指南](../development/child-themes.md)与ADR0078。
