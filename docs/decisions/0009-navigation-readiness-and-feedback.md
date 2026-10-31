# ADR 0009：先准备页面，再切换与定位

日期：2026-10-31。状态：已实现，检查与限制见 [本轮验证](../handoff/frontend-navigation-verification.md)。

后续替代：[ADR 0010](0010-navigation-feedback-countdown.md) 将横幅改成无按钮的单行自动提示，失败强调后用整条横幅倒计时 10 秒并收起。以下按钮/高度说明保留为历史，页面准备与传输边界仍有效。

## 来源与替代关系

用户要求顶部导航完全透明、取消鼠标点击残留的选中框；点击文章应先获得内容，再切页和定位。超过 5 秒时进度条展开为带颜文字的横幅，失败/超时提供提示。根据后续反馈，最终采用浅色通栏，**紧接导航栏下缘，作为导航延伸**，没有悬浮间距、圆角卡片或覆盖菜单的行为。

本决定替代 ADR 0004 第 5 项的“先平滑回阅读起点”，细化 ADR 0003/0006 的导航交接，替代 ADR 0008 实现中顶部导航的浅品牌色填充。原基线、业务契约、缓存一致性及权限边界不变。

## 已实现的顺序

1. AppLink、搜索及正文同源链接共用 usePageNavigation；修饰键、新窗口、下载、外链和同页锚点仍使用原规则。
2. 启动唯一 NavigationTransaction，显示细进度条，保持旧页面和位置。对目标公开路由发送可取消的 HTML GET，读取完整响应体并验证 HTTP 状态、文档类型及 PagePresentation 输出的就绪标记。只收到响应头不视为准备完成。
3. 准备成功后，使用 Next 公共 router.push/replace（scroll:false）和 React transition。新路由实际提交后，useLayoutEffect 再定位新正文；首页定位顶部，显式 scroll:false 保留位置，hash 交给既有锚点能力。旧页面不预先向上滚。
4. 统一计时从点击开始，覆盖准备和 Next 路由阶段。5 秒是用户要求；20 秒为本轮工程初值，集中定义在 core/navigation/transaction.ts。成功后进度完成并收起；超时、404、不可用、连接错误及准备不完整分别提示。
5. 失败不自动循环请求，可“再试一次”或继续阅读。准备阶段取消 AbortController；进入 Next 阶段后以公共 router.replace(origin) 取代旧导航。新点击撤销前一个意图，迟到的准备响应不能提交或清除新提示；重复点击同一目标不重新计时。popstate 取消等待但不额外写入历史。
6. 页面和锚点的原有 history.state 阅读位置继续复用，保留 Next 字段；不增加另一套路由或内容缓存。

## 组件与外观

- core/navigation/document.ts 负责可取消的完整文档准备；transaction.ts 负责状态、时间界限及竞争请求隔离。主题 hook 只适配 Next、偏好与滚动；NavigationProgress 只展示状态。
- NavigationProgress 是 SiteHeader 的子组件，用 top:100% 接在实际导航高度下方，不硬编码桌面/手机顶距。菜单层高于横幅，手机侧栏和搜索仍能操作。横幅绝对定位，不挤动正在阅读的文档。
- 桌面慢加载横幅高 58px，窄屏 76px；失败时展开操作行。浅色/深色继承主题表面与强调色，颜文字只作装饰，真实提示提供 status/alert。关闭/重试操作使用 SVG Icon。
- 动效遵循既有减少动态偏好；收起后内部控件 inert，不进入键盘焦点顺序。鼠标点击顶栏链接会释放焦点，键盘操作仍有可见下划线；aria-current 语义保留，侧栏当前页标识不变。

## 代价与边界

Next 的公开 push/replace/prefetch 没有可 await 的完成结果或取消句柄，因此本轮选择先读取公开文档、再使用正常 Next 软导航。代价是一次额外 HTML 请求和传输；预读 HTML 仅验证就绪，不注入 DOM，不作为业务快照落盘。没有建立带 TTL 的旧正文回退，也没有将浏览器业务请求代理到新的前端 JSON 接口。

Next 阶段仍由框架管理传输，公共 replace 用于撤销等待，不能声称提供框架内部网络请求的物理 abort。实测该阶段延迟超过 20 秒可保留旧页、显示超时并丢弃迟到结果；但该阶段立即返回 503 时，Next 会回退到完整文档导航，成功打开文章并回到文档顶部。此框架回退不由本事务拦截，不能承诺所有传输故障都软失败；准备成功后立即完全断网未验收。直接首屏加载、浏览器完整重载也不属于准备流程。

未来若消除额外传输和上述边界，应单独设计受版本契约约束的路由数据装载；不依赖私有 RSC 解码、劫持全局 fetch 或注入服务端 HTML。

依据：[Next useRouter 公共接口](https://nextjs.org/docs/app/api-reference/functions/use-router)、[React useTransition](https://react.dev/reference/react/useTransition)，并核对锁定的 Next 16.4.3 实现。没有新增依赖、数据库迁移、后台配置、正式说说/评论写入或整体导入；远程推送仍由用户执行。
