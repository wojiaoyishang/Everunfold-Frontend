# ADR 0042：可视化 HTML、Markdown 预览与字体库

日期：2026-11-03。状态：已实现并完成开发环境验收；尚非生产容量承诺。后续用户要求已纳入：字体按需加载、工具栏轻量化并与正文区分。

## 决定与边界

HTML 块默认可视化，源码为同一块的独立视图；Markdown 保留源码并增加预览/分屏。保留稳定块 ID、一篇草稿一个 Y.Doc、本人撤销、原媒体及提交后 ACK 管线。富文本使用 Tiptap/ProseMirror 的结构化共享片段；不以每次序列化整段 HTML 覆盖 Y.Text 实现协同。旧源码保留，不能表达的 HTML 保留为原始片段。

- HTML 使用 Tiptap 3.32.2、y-tiptap 3.0.12 的 Y.XmlFragment；Markdown 继续绑定 Y.Text。支持的格式投影未变化时返回原源文；自定义结构保留为 rawHtml 原子，预览仍清理脚本。
- 不使用会在卸载时销毁传入 UndoManager 的 yUndoPlugin。两个编辑器及源码应用都接入宿主的本人撤销；跨块选区不在本轮范围。
- 源码先取得 PostgreSQL 的单块租约（60秒，前端每20秒续期），暂存不覆盖共享正文。应用使用原内容指纹、稳定操作ID和同事务持久回执；世代号阻止旧离线富文本覆盖已应用源码。租约期间其他块仍可编辑。
- 旧草稿在取得票据时按文档行锁补齐富文本片段，不重置 epoch 或历史日志。迁移0014/0015仍必须显式执行；服务启动不自动迁移。
- 暂存源码按已验证账号、后端、文档及当前标签页保存于 sessionStorage；回到该文档先展示当前共享源码，核对后才可应用。它不等于已提交的协同更新，关闭标签页前应应用或下载。已提交更新继续使用原 IndexedDB/outbox/ACK 事务合并。
- 字体库是独立注册菜单，复用不可变媒体、多文件进度队列、哈希复用、引用守卫及安全删除。允许 WOFF2/WOFF/TTF/OTF，单文件20MiB，读取实际字体表；不使用文件名作为CSS家族名。
- FontTools 4.68.0 读取字体元数据，稳定媒体UUID对应独立CSS家族别名。Base URL/CDN由已有配置解析；公共快照携带引用字体的描述，不携带后台字体目录。
- 前台按正文和主题实际引用生成 @font-face，font-display:swap；不把 /v1/fonts.css 或整个字体目录全局挂入根布局，不批量 preload。全站主题字体只有选定后才声明；字形缺失和请求失败使用系统回退。
- 工具栏使用淡色表面、细分隔线、27px基础控件及轻量图标；正文保留独立白色/深色表面。长字体名称截断，完整名称在自定义选择器中查看。切换视图有进退场，并把焦点交还新编辑面。

## 依据与验收

依赖兼容核验来自 [Tiptap React](https://tiptap.dev/docs/editor/getting-started/install/react)、[协同扩展](https://tiptap.dev/docs/editor/extensions/functionality/collaboration) 与 [FontTools ttLib](https://fonttools.readthedocs.io/en/latest/ttLib/index.html)，精确版本见锁文件。不加载用户上传的JS，不另建文档、上传或发布流程。

实现、操作、真实进程/浏览器证据和未覆盖项见 [编辑器指南](../development/editor-plugins.md)、[字体库指南](../development/font-library.md) 和 [本轮验收](../handoff/visual-editor-font-verification.md)。
