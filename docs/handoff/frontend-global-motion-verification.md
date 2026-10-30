# 整站动效：实际 Edge 环境修复与验证

日期：2026-10-30。针对用户反馈的四项问题实施；后端只同步交接文档。决定见 [ADR 0005](../decisions/0005-site-motion-policy.md)。

## 定位与修复

用户实际 Edge 的系统减少动态查询为 true，旧页面卡片/顶栏 transitionDuration=0s、animationName=none，背景 readyState=4 但 paused=true。这解释了多个动效一起失效；旧滚轮整数阈值和阅读设置 body 滚动锁是另两个独立问题。前一轮内置浏览器记录保留为历史，不能代表此次实际环境。

现在整站默认完整动效，统一开关覆盖 CSS、视频和滚动；背景暂停仅在当前挂载访问中保留。设置为非模态浮层，所有纵向滚轮增量统一缓动。页面、卡片、按钮、菜单、工具列、目录面板、正文折叠、主题图标和弹层增加双向过渡。

## 实际验证

| 检查 | 本轮证据 |
| --- | --- |
| 代码检查 | npm run check 通过：ESLint、严格类型、Prettier、22 项测试。新增站点完整动效覆盖系统 reduce、阻尼持续/帧率一致性及小数滚轮回归 |
| 生产构建 | npm run verify:production：独立临时副本默认 Turbopack 成功，保留用户正在运行的 .next |
| HTTP | 14 项公开页面状态检查、ready 和背景资源通过，真实不存在路径仍为 404 |
| 实际环境 | 用户 Edge 原 3000 标签，系统 reduce=true 保持不变；html data-motion=full，卡片 transition 为 0.25s/0.3s/0.32s，页面入场 reading-arrive=0.46s |
| 默认视频 | 重载后不点击播放，video paused=false，currentTime 持续推进并循环；源仍是原 WebM |
| 暂停范围 | 手动暂停于 2.0077s，从我的荣誉软切首页仍保持该帧；重载初始化后无需点击播放，readyState=4/paused=false，采样时间 1.4754s→4.3977s |
| 模式切换 | 减少动态→CSS 0s、video paused=true；跟随系统在该 Edge 同样 reduced；完整动效恢复 full 和播放。测试结束保留完整动效 |
| 设置滚动条 | 打开前后 document clientWidth=1684、主容器 x=242，body overflowY=visible；没有写入 hidden。打开瞬间 opacity=0/scale=.96，完成=1；关闭后仍保留 display:block 退出，随后为 none/opacity=0 |
| 滚轮惯性 | 实际浏览器 wheel 操作触发 data-scroll-animating=wheel，采样 y=0、590、704.67，停止输入后继续到 897.33 并清除运行标记；没有依赖点击回顶代替 wheel 验证 |
| 页面导航 | 点击“一路有你”时旧页面保持、出现“正在加载下一页”；提交后主内容 reading-arrive，背景仍播放，公共壳未换成 loading 占位 |
| 目录/概览 | 点击概览时旧目录仍有高度但已 inert，新面板从 0 开始；最终目录高度 0、概览 345.05px。隐藏内容不进入键盘焦点 |
| 正文折叠 | 一路有你“关于”从 242.79px 开始收起，关闭期间保留 open 并约束 overflow，最终 57.5px/open=false；Enter 再从收起高度展开 |
| 图片查看器 | 原生模态打开/退出过渡存在；右箭头 1/24→2/24，Escape 关闭、恢复“查看图片”焦点，关闭事件后恢复正文滚动 |
| 窄屏侧栏 | 390×844：滑入从 translateX(-308px) 到 0，退出先保留 visible 再 hidden，遮罩 1→0；Escape 恢复触发按钮焦点和滚动 |
| 窄屏设置 | clientWidth/scrollWidth 均 375；浮层最终 x=11.67、right=296.67，未超出内容视口。检查后恢复默认桌面视口 |
| 服务保持 | 收尾时 3000 ready 报告 public_read=true，8001 ready 报告 database/redis/schema=ok；未停止用户实例，热更新继续可用 |

截图保存在忽略目录 var/qa/global-motion-settings.png；截图只证明布局/设置界面，播放和运动判断以上述真实 DOM 状态变化与交互为依据。

## 限制及交付

- 未穷举所有鼠标/触控板和真机；阻尼手感仍可按用户体验调整。触摸滑动保持浏览器原生行为。
- 完整动效是本站明确默认，保留减少动态选择；未更改系统设置。浏览器若拦截媒体播放会显示手动重试，不能承诺绕过浏览器策略。
- 本轮不改后端代码/数据库/契约、真实配置、公开快照、原备份或线上站点。未重跑后端测试；服务存活检查与后端完整测试分别记录。
- 本地实现提交 fd59021；后续细节与文档提交见 git log。无远程 push，用户自行推送。
