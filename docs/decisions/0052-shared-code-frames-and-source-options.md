# ADR 0052：共享代码框与源码片段参数

状态：已实施，2026-11-04。用户批准代码块调研方案，随后明确代码窗口只用一个编辑框；四个整篇操作按钮需轻巧。

## 决定

- 保留 Highlight.js 11.12.0 阅读高亮；CodeMirror 作为单栏代码输入。仅在打开窗口和选择语言后加载对应编辑语法，新增固定 @codemirror/language-data 6.5.2（MIT、官方 CodeMirror 6 依赖兼容）。本轮不引入 Shiki、在线执行或多文件分组。
- Markdown/HTML、正文预览、前台/私有预览及格式化评论共用可信代码框派生器、按行高亮和操作组件。标题/语言条、行号、重点行、折行/展开/复制均由这一处提供；复制读取未加入行号的原始代码，保留空行、制表符与换行。
- 作者片段参数保留在源码中：Markdown 围栏语言后使用一个 JSON 对象；HTML pre 的 data-code 保存等价 JSON。只接受 title、numbers、start、mark、wrap、fold，限制取值/容量；未知或非法值忽略。浏览器临时折行/展开不修改正文。
- 渲染先清理，再生成可信框体及复制源文属性。逐文本节点拆分高亮，跨行字符串/注释的样式继续保留。大于 100000 字符或 5000 行时保留纯代码阅读，不生成逐行 DOM；不允许作者伪造控制栏、复制源文或活动脚本。
- Tiptap codeOptions 只属于本页可视化模型，类同已有公式节点。共享 richFields/WS 模型不扩展，无法投影的片段仍以原始 HTML 保留；整篇 block_sources 保存仍走既有持久 ACK。切换视图不格式化源文，不增加动画或保存端点。
- theme.code 属于后端 settings 1.8.0：浅/深色配色、行号、折行、折叠阈值、字号、行高、制表宽度及媒体字体 ID。复用 PostgreSQL 设置 revision、审计、可靠投递与节点派生层；旧 JSON 自动补默认值，无 SQL 迁移。字体 URL/元数据由媒体服务解析，嵌套引用受原删除守卫保护，CDN 改址继续由已有同步重发。
- 代码字体及 CSS 仅在正文使用代码时声明；字体文件由浏览器实际使用时请求，font-display:swap。编辑语言库只在编辑侧加载。样式资源升级 code-v2.css，保留旧版本以兼容既有派生页面，不改动框架内部缓存文件。
- 编辑窗口取消或 Escape 不改正文；Ctrl/Cmd+Enter 插入；Ctrl/Cmd+S 拦截并引导先插入。切换语法通过 CodeMirror Compartment 保留内容、选区、历史；源码初始选区立即恢复，避免延迟覆盖首个键盘动作。

## 边界与验证

主题值是全站阅读默认值，片段参数可以覆盖；阅读操作不回写任何一层。未实现细粒度代码注释、多文件切换、代码执行。跨源码/可视化统一撤销仍为原有边界。操作及实际结果见 [指南](../development/code-blocks.md) 和 [验收](../handoff/code-blocks-verification.md)。

参考：[Expressive Code 框体](https://expressive-code.com/key-features/frames/)、[行号](https://expressive-code.com/plugins/line-numbers/)、[标记](https://expressive-code.com/key-features/text-markers/)、[CodeMirror 官方语言描述及延迟加载](https://github.com/codemirror/language-data/blob/main/src/language-data.ts)。这些是实现参考，不增加独立业务插件或后台执行权限。
