# 前台组件、导航与动效边界

更新：2026-10-30。适用于当前 Next.js App Router 前台；后端公开契约与读取数据保持不变。

## 目录与职责

```text
src/app/                         薄路由、元信息、加载/错误状态
  layout.tsx                    唯一公共 BlogShell 入口
src/core/
  content/                      后端生成类型、快照校验和纯查询
  config/                       仅服务端实例配置
  rendering/                    Server 侧正文安全渲染和媒体解析
  navigation/
    targets.ts                  纯 URL / 手势 / 资源导航策略
    presentation.ts             纯目录注册/释放状态约束
src/themes/argon/
  argon.css                     仅有序导入，不堆积整站样式
  components/
    shell.tsx                   常驻背景、顶栏、侧栏、主内容容器和页脚
    background-video.tsx        视频播放策略与控制，独立于路由
    route-state.tsx             主题路由过渡、页元信息桥接与滚动 reveal
    navigation-link.tsx         Next Link/Form 的统一交互适配
    navigation-state.tsx        手机侧栏展开、关闭及焦点共享
    article*.tsx / post-card    Server 正文与可复用内容展示
    pagination / archives ...   主题业务展示组件
  styles/                       八个职责样式文件，保持原级联顺序
```

`styles/` 分为 base（变量/基础）、shell、sidebar、listing、article、controls、motion、responsive。响应式与减少动态效果覆盖保持最后；不得按文件名随意重排导入来改变级联。新动效先复用 tokens 和现有类，不复制一套页面样式。

## 公共壳只挂载一次

原实现每个列表/文章/归档都包裹 BlogShell；即使 Next 执行软导航，背景和侧栏仍会重建，造成整页刷新感。现在 RootLayout 读取公开 Site DTO 并只挂载一个 BlogShell，路由组件只输出主内容和 PagePresentation。

新增页面应复用现有布局，**不要再次包裹 BlogShell**。背景视频、移动侧栏和导航状态留在常驻壳内；RouteContent 按 pathname + query 更换正文及入场状态，hash 定位不重新播放整个界面。

## 客户端导航与目录

- AppLink 保留 Next 预取和浏览器默认手势，并共享 React transition；SearchForm 保留 GET 可分享地址和无 JS 时的原生能力。
- 历史正文由 Server 安全渲染，限定在正文容器的事件委托接管真实同源页面链接；外链、资源、下载、新标签和修饰键不接管，纯 hash 继续原生定位。
- 页目录/最新站点数据由 PagePresentation 在提交后桥接。每次注册拥有独立 token，卸载只释放自己的注册；旧页迟到 cleanup 不能清掉新目录，同一路由进入错误边界也不能残留旧目录。
- Client 组件只获得公开 Site、目录和已渲染 children，不把完整快照、HTML 解析器、数据库配置或服务密钥引入客户端。

## 动效与资源策略

背景使用原 WebM/VP9、5 秒循环、3200×2400、25fps、无音轨。组件静音循环、行内播放；读到客户端偏好后才设置源地址。自动播放拒绝/资源失败时保留静态 poster，用户可手动重试。减少动态效果、省流量默认静态，隐藏标签暂停，手动暂停偏好只存浏览器本地。

正文过渡约 320ms，保留旧内容直至下一页就绪；顶端进度和读屏状态反馈 pending。卡片有限错落入场，屏幕外项目按 IntersectionObserver 进入显示；hero 只在公共壳首次进入时播放。hover/focus、主题、目录、手机侧栏保持共同节奏，不添加常驻每帧 JavaScript 或通用动画总线。

系统减少动态效果时关闭非必要动画并确保内容可见；BackToTop 也不强制平滑滚动。桌面侧栏 sticky 顶距 104px，避开固定顶栏；手机布局继续 top=0。

## 后续维护

UI 交互用原有组件和纯策略扩展；新页面的内容与安全渲染继续在 Server 侧。先运行 npm run check，再按手工步骤验证客户端交互；保留热更新时使用独立生产构建命令，不直接覆盖正在运行的 .next。
