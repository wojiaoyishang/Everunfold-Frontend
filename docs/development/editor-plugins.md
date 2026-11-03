# 编辑器开发与试用

版本：editor-plugins-7，2026-11-04。使用 [协同架构](../architecture/collaborative-editing.md)、[ADR 0037](../decisions/0037-plugin-editors-and-collaborative-drafts.md) 与 [ADR 0038](../decisions/0038-source-editor-interactions-and-shortcuts.md)，不另维护业务 Schema。

## 启动与验证

1. 后端执行 uv sync --locked，再显式 uv run python init.database.py --config config.toml。迁移 head 为 0015_rich_source_leases，启动服务不会自动迁移。
2. 本地后端：uv run uvicorn app.entrypoints.api:create_app --factory --host 127.0.0.1 --port 8001 --no-proxy-headers --ws-max-size 1500000。部署需支持 WS 升级并配置实际前端 Origin；不使用查询参数 Token。
3. 前端 npm ci --ignore-scripts、npm run dev，保留 3000。动态加载两种编辑器；新建内容先保存一次取得稳定 ID，再进入共享草稿。
4. 本轮新增库/协议后，旧开发标签页手动刷新一次。系统没有添加循环刷新或自动硬跳转。
5. 同一文章打开两页，分别在 Markdown/HTML 输入，检查另一页文字、在线会话和光标；Ctrl/Cmd+Z 只撤销本人操作。工具栏也提供全篇撤销/重做。
6. 断开后端后在两个窗口输入，状态应为本机保存；关闭其中一个，重启后端，剩余窗口应补齐并确认全部输入。没有确认前不能成功发布。刷新后的撤销栈不保留，JSON 导出始终可用于人工恢复。
7. 保存草稿产生完整修订；发布才影响前台。另一编辑者改了已保存修订时仍通过 expected_revision 拦截，查看最新版本只合并业务策略，不用旧 JSON 替换 Y.Doc。

本机留有未发布的「协同编辑试用」，ID 94b76ebe-94f8-4f72-ac87-c9f14234abd8；链接 /admin/content/article/94b76ebe-94f8-4f72-ac87-c9f14234abd8/edit。它是可删除的开发草稿，不是初始化固定数据，也不写入 seed 或前台。

## 注册新的源码界面

当前 core/editor/registry.ts 仅收编译内可信描述，主题 admin/content/plugins/registry.ts 组装两个实际消费者。描述包含 id/version/format/label/adapter；重复 ID 或默认格式拒绝。持久格式和插件实现分开，第三种格式须先扩展后端、生成契约及安全渲染策略；同格式多个编辑器选择还未冻结。

复用 SourceBlockEditor/封装 CodeEditor，提供自己的语言扩展和工具栏动作；通过 shared.text、awareness、undo 接入宿主，不能在插件内建第二个 Y.Doc、独立文本历史或整篇 JSON 保存。媒体使用统一选择器/上传队列和相对位置插入，不能在插件中直传文件、猜物理路径或持久保存解析后的 Base URL。样式使用后台主题变量，深色高亮也由变量派生。

Markdown源码修改即时进入共享工作文档；HTML可视化使用结构化共享片段，HTML源码需暂存后应用；格式切换保留原源文，不进行有损 Markdown↔HTML 转换。预览使用统一可信渲染/清理，不能执行正文脚本。

## 检查与交接

- 后端 Ruff/格式、mypy、pytest；真实 PostgreSQL/Redis/双 API：RUN_DATABASE_TESTS=1 时执行 tests/test_collaboration_processes.py。测试创建并清理专属 everunfold_collab_test_* 库，不对开发库故障注入。
- 前端 npm run check；npm run verify:admin 使用隔离副本构建，不写运行中的 .next。tests/collaboration.test.ts 覆盖并发源文、结构墓碑、仅本人撤销、跨标签页缓存合并、ACK 防复活、密码剔除、失效会话导出范围和协议验证。
- Backend contracts/collaboration-v1.schema.json 是唯一字段权威；提交后 npm run contract:sync -- <后端契约的绝对路径> 生成，生成器按仓库格式输出。前端 collaboration-source.json 固定源版本/提交/哈希，不能手改业务字段。
- 每改可见组件立即检查内置浏览器；P0/截图/未执行项记入验收和 STATUS。只做本地提交，用户自行推送。

## 源码工具与快捷键

- 当前两个块编辑插件版本为 2.0.0，HTML默认可视化；以下源码工具仍供Markdown及HTML源码视图复用。SourceToolbar 管段落样式与动作/模板；SourceSearchPanel 管查找表单；SourceBlockEditor 组合这些控件，不接管业务保存。CodeEditor/useCodeEditorHandle 封装原生编辑面、选择、输入和 Y.Text 绑定。core/editor 处理局部格式变换和可见区搜索高亮。
- 标题/列表作用于当前行或选中多行，常用行内格式可切换；空选区插入并选中占位文本。链接、表格、HTML 列表等为源码模板，插入后继续手工编辑。HTML 代码块转义选中标签；已有 HTML 标题的属性保留。
- Ctrl/Cmd+B 加粗，Ctrl/Cmd+I 斜体，Ctrl/Cmd+F 当前块查找；Ctrl/Cmd+Z、Shift+Z/Y 保持原全篇本人撤销/重做。查找框 Enter 下一项、Shift+Enter 上一项，替换框 Enter 替换，Escape 关闭并回正文。
- 当前编辑页面 Ctrl/Cmd+S 和 Shift+S 均保存草稿，不发布；保存、错误/不确定状态和确认仍复用原逻辑。无修改不生成新修订，按住按键不重复提交，模态弹窗内不触发页面保存。控件恢复后回原焦点。未确认的上次操作只能通过明确重试按钮处理。
- 按用户最新要求保留十行最小编辑高度；超过十行后随内容增长，超过 540px 内部滚动，详见ADR0040。换行和查找是当前块的临时界面状态，不进入协同正文。匹配计数最多显示 1000+，不表示全部替换只处理这些匹配。
- 验证入口：试用草稿分别测试两种工具栏、跨窗口格式/替换与本人撤销；输入后按 Ctrl+S 检查“草稿已保存”和焦点；再修改应显示未保存。长文、320px 折行、模态弹窗、深色与减少动态检查见 [本轮验收](../handoff/source-editor-verification.md)。

## 区块库与排序

见 [ADR0039](../decisions/0039-block-library-and-anchored-dragging.md)。桌面右侧区块/内容设置切换，不挤压正文；区块类型从blockEditors注册表读取名称/说明。所有屏幕的添加按钮均打开弹出选择器；桌面保留右侧区块库点击/拖入。

- 点击块间或末尾加号，直接弹出类型选择器；选中类型后插入到对应位置并聚焦新块。也可从右侧区块库拖入插入线。弹出选择器始终显式绑定入口的before ID，详见 [ADR0041](../decisions/0041-block-insert-picker-feedback.md)。
- 从六点手柄拖动已有块。键盘空格/Enter拾起，方向键/Home/End选目标，放下或Esc取消；移动作为一次本人撤销。正文文字选择不启动拖动。
- 更多菜单保留位置移动、格式切换与确认删除。格式切换保留源文，不承诺自动转换。
- 结构操作只能经过useDraftEditor.commandBlock，核心按最新ID解析，已有草稿用单个LOCAL事务更新order；不要从主题直接改Y.Doc或提交整篇JSON。
- 拖动反馈和FLIP复用封装DragAndDrop，遵循后台减少动态；拖动中暂停保存/发布/撤销/预览切换。
- 源码上下各保留16px；以十行可见文本为最小高度（当前277px），行号栏铺满同样高度，仍由CodeMirror测量行号。不要为了高度往正文插入空行；规则见 [ADR0040](../decisions/0040-source-editor-spacing-and-minimum-height.md)。

本轮检查、截图和真实未覆盖项见 [区块验收](../handoff/block-composer-verification.md)。

## 可视化 HTML 与 Markdown 预览（2.0）

- Markdown支持编写、实时预览和桌面分屏；窄屏隐藏分屏入口，编写/预览不会销毁原CodeMirror实例和选区。分屏滚动按比例联动，预览沿用统一安全渲染。
- HTML默认可视化：段落/标题、加粗/斜体/下划线/删除线、列表、引用、链接、代码、分隔线、表格及上下文行列操作；图片支持替代文本、说明、宽度及对齐；字体/字号复用字体库选择。
- core/editor/rich-text、rich-extensions管理结构导入/投影及可信扩展；主题components/ui/rich-text-editor封装引擎；主题plugins管理模式、轻量工具栏和界面反馈。插件通过shared.rich/host接入原文档，不得反向把整篇HTML写回Y.Text。
- HTML按钮取得单块源码租约。改动仅在本页暂存，应用才进入共享正文；期间禁止保存/发布/整篇预览。其他编辑者的同块可视化暂时只读，其他块仍可输入。取消有确认，退场后返回并恢复焦点。
- 暂存源码使用sessionStorage，可在同一标签页内离开后返回恢复；显示当前共享源码，核对后才能应用。关闭标签页、隐私模式或存储失败不承诺保留，先应用或下载HTML/整篇导出。导出unapplied_html不包含文章密码。
- 源码编辑中断后最长等待60秒过期；正常离开主动释放编辑权。续期/指纹/世代冲突时不自动覆盖正文，保留并提示下载对照。未确认的应用只能重试原operation_id；刷新后不保证保留该HTTP操作的内存重试状态，应先核对服务器结果。
- 普通富文本操作可CRDT合并；整块源码替换不承诺自动合并旧离线富文本。旧世代更新被拒绝且仍保留在本地恢复/导出中。更新插件和契约后手动刷新旧编辑页。
- 不支持的自定义HTML、复杂内联CSS保留为源码原子。可视化展示清理后的预览，修改原始结构需进源码；不承诺复刻WordPress插件/短代码。字体加载规则见[字体库指南](font-library.md)。

本机本轮试用草稿：322062a6-039a-494d-8685-127b5045b0a6（字体与编辑器验收1103），已撤回公开发布，保留Markdown/HTML及测试媒体供后续验证。详细证据见[验收](../handoff/visual-editor-font-verification.md)。


## 2026-11-04 生命周期与SDK辅助数据

编辑面以本地或doc.guid+blockId绑定为生命周期边界；不要仅用useEditor依赖变化销毁旧引擎，再让同轮其他效果/快捷句柄访问它。除isDestroyed外必须确认extensionManager仍有效，延迟插入需重新检查。销毁与重挂不能销毁宿主UndoManager，也不能重置Y.Doc。

新增编辑引擎时用真实结构编辑验证其Yjs辅助数据；当前只额外接受已严格校验的__tiptap_position_migrations:item命名空间，不能让插件向任意根写业务/权限数据。兼容问题不得以删除缓存或ACK未提交更新处理。具体边界和回归见[ADR0043](../decisions/0043-rich-editor-lifetime-and-position-history.md)及[验收](../handoff/editor-lifecycle-fix-verification.md)。
