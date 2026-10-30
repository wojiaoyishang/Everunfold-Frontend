# 前台组件、导航与动效边界

更新：2026-10-30。适用于当前 Next.js App Router 前台；后端公开契约与读取数据保持不变。

## 目录与职责

```text
src/app/                         薄路由、元信息、错误状态；无替换正文的根 loading
  layout.tsx                    唯一公共 BlogShell 入口
src/core/
  content/                      后端生成类型、快照校验和纯查询
  config/                       仅服务端实例配置
  rendering/                    Server 侧正文安全渲染和媒体解析
    shortcodes.ts               展示语法白名单，不执行旧插件
  browser/                      动效纯策略/订阅、阻尼滚动、页面/锚点历史位置
  navigation/
    targets.ts                  纯 URL / 手势 / 资源导航策略
    presentation.ts             纯目录注册/释放状态约束
src/themes/argon/
  argon.css                     仅有序导入，不堆积整站样式
  components/
    shell.tsx                   常驻背景、顶栏、侧栏、主内容容器和页脚
    background-video.tsx        常驻播放 Provider，按钮从工具列读取状态
    route-state.tsx             导航 transition、页元信息桥接、滚动交接
    route-content.tsx           主内容入场、滚动 reveal、正文链接增强
    navigation-progress.tsx     延迟显示、推进、完成与淡出
    floating-tools.tsx          纵向工具列与回顶出入，不各自固定定位
    reading-state.tsx           阅读进度、活动目录、评论状态
    article-media.tsx           已安全渲染正文的图片和折叠交互
    reading-settings.tsx        不锁页面滚动的原生 popover、统一动效选项
    transition-panel.tsx        保留内容的双向高度切换与 inactive/inert
    site-header / sidebar*     共享导航数据与独立区域展示
    navigation-link.tsx         Next Link/Form 的统一交互适配
    navigation-state.tsx        手机侧栏展开、关闭及焦点共享
    article*.tsx / post-card    Server 正文与可复用内容展示
    pagination / archives ...   主题业务展示组件
  navigation.ts                 主题导航/原站品牌映射，不改公开业务 DTO
  hooks/                        动效订阅、details 高度、滚动订阅、图片 dialog 锁
  styles/                       九个职责样式文件，保持原级联顺序
```

`styles/` 分为 base（变量/基础）、shell、sidebar、listing、article、reader、controls、motion、responsive。响应式与减少动态效果覆盖保持最后；不得按文件名随意重排导入来改变级联。新动效先复用 tokens 和现有类，不复制一套页面样式。

## 公共壳只挂载一次

原实现每个列表/文章/归档都包裹 BlogShell；即使 Next 执行软导航，背景和侧栏仍会重建，造成整页刷新感。现在 RootLayout 读取公开 Site DTO 并只挂载一个 BlogShell，路由组件只输出主内容和 PagePresentation。

新增页面应复用现有布局，**不要再次包裹 BlogShell**。背景视频、移动侧栏和导航状态留在常驻壳内；RouteContent 按 pathname + query 更换正文及入场状态，hash 定位不重新播放整个界面。

## 客户端导航与目录

- AppLink 保留 Next 预取和浏览器默认手势，并共享 React transition；SearchForm 保留 GET 可分享地址和无 JS 时的原生能力。
- 历史正文由 Server 安全渲染，限定在正文容器的事件委托接管真实同源页面链接；外链、资源、下载、新标签和修饰键不接管。同页 hash 使用共享平滑定位并保留独立历史条目，目标在折叠块内时先展开。
- 页目录/最新站点数据由 PagePresentation 在提交后桥接。每次注册拥有独立 token，卸载只释放自己的注册；旧页迟到 cleanup 不能清掉新目录，同一路由进入错误边界也不能残留旧目录。
- Client 组件只获得公开 Site、目录和已渲染 children，不把完整快照、HTML 解析器、数据库配置或服务密钥引入客户端。

## 动效与资源策略

背景使用原 WebM/VP9、5 秒循环、3200×2400、25fps、无音轨。组件默认静音循环、行内播放；可见且策略允许时才设置源地址。播放拒绝/资源失败时保留静态图，用户可重试。隐藏标签暂停；手动暂停仅在当前持久 Provider 挂载期间保留，跨页保持当前帧、刷新重新播放；不读旧 sessionStorage 暂停键。

正文过渡约 460ms，保留旧内容直至下一页就绪；顶端进度和读屏状态反馈 pending。卡片有限错落入场，屏幕外项目按 IntersectionObserver 进入显示；hero 只在公共壳首次进入时播放。hover/press/focus、主题图标、目录/概览高度、手机侧栏/遮罩具有来回过渡。阅读设置与图片查看采用 display/overlay 离散过渡延后移出顶层；details 只在交互时使用 Web Animations 测量自然高度。不添加常驻动画总线。

统一策略见 ADR 0005：默认完整动效、可选跟随系统/减少动态，CSS 与 JS 共用 html data-motion 和 motion.ts 订阅；系统 reduce=true 不能覆盖用户选择的完整模式。SSR 首屏脚本避免闪错偏好，关闭动效仍确保内容可见。桌面侧栏菜单随页面滚动，概览/目录区 sticky 顶距 90px；手机侧栏 top=0，内部面板取消 sticky。

滚动核心只在用户输入/定位时安排有限 rAF。纵向 wheel 支持小数与像素/行/页单位，采用时间相关指数阻尼并累积有界目标，跳过输入框、嵌套滚动区、弹层、代码区、缩放和横向手势。触屏保持原生；不创建第二套页面滚动容器。阅读设置不锁 body；图片 dialog 仍锁背景，根 scrollbar-gutter 稳定横向位置。历史位置有界存于内存并用 history.state 独立键定位，保留 Next 自有字段；完整页面重载不承诺跨会话保存阅读位置。

短代码仅展示转换，转换产物仍走 HTML allowlist 和真实媒体节点映射；不要添加执行脚本、任意类名/样式、查询 WordPress 数据的能力。图片查看保留链接图片的原链接语义，非链接图片才加键盘可访问的查看行为。

## 后续维护

UI 交互用原有组件和纯策略扩展；新页面的内容与安全渲染继续在 Server 侧。先运行 npm run check，再按手工步骤验证客户端交互；保留热更新时使用独立生产构建命令，不直接覆盖正在运行的 .next。
