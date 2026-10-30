# ADR 0005：整站动效默认值与双向交互

- 日期：2026-10-30。
- 状态：已实现。用户明确要求背景默认播放、整站过渡、设置不隐藏滚动条和鼠标惯性。
- 替代：ADR 0004 的第 4、6、7 项中滚轮筛选、背景暂停持久化、阅读设置模态行为；其他决定继续有效。
- 后续变更：用户随后要求保存背景偏好并移入设置；本页第 3 项的访问级暂停策略由 [ADR 0006](0006-public-ui-completion.md) 替代，本页保留当时决定与证据。

## 问题证据

在用户实际打开的 Edge 页面中，系统媒体查询 `prefers-reduced-motion: reduce` 为 true。旧 CSS 把卡片和顶栏过渡设为 0s，视频已加载但暂停，滚动也走无动画分支。此前内置浏览器通过不能代表该实际环境通过。另有整数且大于阈值的滚轮筛选，会遗漏小数输入；阅读设置的原生模态 dialog 明确写入 body overflow=hidden，导致滚动条消失。

## 决定

1. 依当前用户要求，站点默认 **完整动效**。阅读设置提供完整动效 / 跟随系统 / 减少动态三种选择，保存于 `everunfold.motion.v1`。不改 Windows 或浏览器设置。只有“跟随系统”使用系统减少动态信号决定开关。
2. `core/browser/motion-policy.ts` 维护纯策略和首屏初始化，`motion.ts` 提供存储/跨标签/系统变化订阅，主题 `use-motion` 使用同一状态。CSS 统一读 html 的 data-motion；不得再单独用系统媒体查询把站点完整动效关掉。
3. 背景默认静音播放，暂停留在当前挂载访问中，跨站内导航保留当前帧；刷新或重新打开恢复默认播放。旧会话暂停键不再参与初始化。减少动态模式默认静态，仍可单独手动播放；隐藏标签暂停，播放失败保留静态图与重试按钮。
4. 所有纵向 wheel 增量（含小数、行/页单位）进入时间相关的指数阻尼，目标累积、反向及时响应、距离有界、结束后停止 rAF。触屏原生滚动、缩放手势、横向滚动、输入框、代码区、弹层及嵌套滚动区不接管。不移动整个页面、不常驻空帧循环。
5. 阅读设置改用非模态原生 popover，不锁 body 滚动，原生按钮关系、外部点击和 Escape 仍可用。透明背景层不遮暗整页；打开和收起都有 CSS 过渡。根元素保留 scrollbar-gutter: stable，图片模态框仍可以锁住背景。
6. 动效覆盖状态来回两端：统一 hover/press/focus，页面 460ms 入场，卡片/菜单/工具过渡，太阳月亮淡入旋转，侧栏遮罩退出、目录与概览高度切换，正文 details 高度开合，图片查看器和设置进入/退出。页面等待期间继续保留旧内容及进度提示。
7. `TransitionPanel` 复用高度切换；非活动面板 inert/aria-hidden。`use-details-motion` 只增强已净化的原生 details，保留键盘与无 JS 行为，处理中断/反向/清理。原生 dialog 的焦点限制只用于图片查看。
8. 沿用原生 CSS、Web Animations 与既有 React 能力，无新增依赖、影片渲染框架、第二套路由或动画总线。

## 验证与维护

见 [整站动效验证](../handoff/frontend-global-motion-verification.md)。必须在实际系统减少动态为 true 的环境验证“完整动效”，不能再用最终截图或编译成功代替播放/过渡/输入状态检查。所有未来组件都遵守本站开关并具有明确的进入、退出、悬停和按压行为；不是让每个静态文字持续运动。

技术依据：[MDN Popover 过渡](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using#transitioning_a_popover)、[离散 CSS 过渡](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-behavior)、[滚动条空间](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter)。不支持离散过渡的旧浏览器不承诺相同退出动画；本轮实测当前 Edge。
