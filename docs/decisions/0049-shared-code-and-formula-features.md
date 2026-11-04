# ADR 0049 共用代码高亮、公式与按需资源

日期：2026-11-04。状态：已实现并验证。来源：用户要求 Markdown/HTML 共用代码高亮、公式和按文章引用加载的资源；追加 HTML 公式窗口、Markdown 分屏共用底栏。

## 统一能力与源文

core/rendering/features 提供统一语言表、高亮函数、公式渲染及资源描述；ContentMarkup/ContentResources 用于文章、说说、受限内容解锁和草稿预览。编辑面复用相同引擎，不分别维护两套 Markdown/HTML 实现。

Markdown 使用围栏代码、行内 $...$、独立 $$...$$；HTML 使用 pre/code 及带 data-math/data-latex 的 span/div。正文只保存代码、语言和 LaTeX，排版结果不入库。源码底稿、局部保真和整篇 block_sources 保存流程不变。

ContentFeatureButtons/ContentFeatureDialog 是两格式、源码/可视化共用的插入窗口：语言/显示方式选择、内容、实时预览、公式错误校验。HTML 两种视图都有公式入口，可视化选中既有代码/公式可修改。关闭沿用 Modal 的退场与焦点恢复。

公式节点、代码装饰只用于本页可视化。共享 richFields 默认转换继续保守保留原 HTML，不向既有 WS/数据库 Schema 写入新节点类型。代码装饰不修改文本；异步结果在视图重建后通知当前视图，插入位置随本页事务映射。Markdown 分屏通过 EditorStatusBar 的出口复用一条整宽底栏，字符数不重复；模式切换仍无动画。

## 按需加载与安全

- 公开首屏按实际内容在服务端动态引入引擎，输出高亮代码和 HTML/MathML，普通阅读不下载客户端排版引擎；受限内容、后台预览按实际需要加载客户端引擎。
- 只有代码声明代码样式，只有公式声明公式布局/KaTeX样式。公式字体为本地版本化 WOFF2、font-display:swap，无整库 preload；浏览器只请求实际字形需要的字体。普通文章不声明这些资源。
- Highlight.js 只注册声明的受支持语言，不加载全部语言、不自动猜测；未知语言和过长代码退回文本。KaTeX trust=false，每次独立宏状态，限制长度、展开和尺寸。错误保留源文，不执行指令或加载外部图片。
- 引擎只处理安全清理后的正文投影。系统内置字体/样式由前端资产提供；上传字体继续使用后端媒体库/稳定ID，两者不混淆。没有运行时CDN依赖。

新增 katex0.19.1（MIT）、highlight.js11.12.0（BSD-3-Clause），锁文件及资产许可证一并提交。官方依据：[KaTeX API](https://katex.org/docs/api)、[选项](https://katex.org/docs/options)、[字体与异步加载](https://katex.org/docs/browser)、[Highlight.js模块](https://highlightjs.org/)。无后端、契约或数据库变更。使用与验收见[指南](../development/content-features.md)和[记录](../handoff/content-features-verification.md)。
