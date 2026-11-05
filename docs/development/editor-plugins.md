# 编辑器开发与试用

版本：editor-plugins-16，2026-11-05（Asia/Shanghai）。使用 [协同架构](../architecture/collaborative-editing.md)、[ADR 0037](../decisions/0037-plugin-editors-and-collaborative-drafts.md) 与 [ADR 0038](../decisions/0038-source-editor-interactions-and-shortcuts.md)，不另维护业务 Schema。

当前共享[公式编辑器与全局吐司](formula-editor-and-toasts.md)提供结构化数学输入、LaTeX 源码、模板/键盘及逐文件上传通知。编辑页“正文预览”保留本页检查；“前台预览”读取已保存草稿，有修改/新建时显示“保存并预览”，复用原保存后在独立私有页呈现正式主题，支持刷新/返回。它不会发布内容或写入公开缓存，见[ADR0051](../decisions/0051-private-frontend-content-preview.md)及[验收](../handoff/content-frontend-preview-verification.md)。

## 启动与验证

代码块窗口复用单栏 CodeMirror、按需语言和共享查找替换；Markdown/HTML共用片段参数、阅读框及theme.code默认值。四个整篇操作按钮按紧凑尺寸显示，详情见[代码块指南](code-blocks.md)和[ADR0052](../decisions/0052-shared-code-frames-and-source-options.md)。

1. 后端执行 uv sync --locked，再显式 uv run python init.database.py --config config.toml。迁移 head 为 0017_draft_versions，启动服务不会自动迁移。
2. 本地后端：uv run uvicorn app.entrypoints.api:create_app --factory --host 127.0.0.1 --port 8001 --no-proxy-headers --ws-max-size 1500000。部署需支持 WS 升级并配置实际前端 Origin；不使用查询参数 Token。
3. 前端 npm ci --ignore-scripts、npm run dev，保留 3000。动态加载两种编辑器；新建内容先保存一次取得稳定 ID，再进入共享草稿。
4. 本轮新增库/协议后，旧开发标签页手动刷新一次。系统没有添加循环刷新或自动硬跳转。
5. 同一文章打开两页，分别输入Markdown/HTML，检查实时保存、远端光标/选区和本人撤销。点击成员定位不改变正文。
6. IndexedDB保留确认基线、稳定outbox和独立分支；断网先暂停，继续本地编辑只改分支，恢复后必须比较/合并。旧sessionStorage与共享队列导入恢复分支，不能自动覆盖线上。
7. 保存版本建立检查点；发布才影响前台。独立版本页、人工合并、结果自动保存和最新版锁定见[操作指南](draft-versions.md)；原修订通知继续单调刷新保存基线，私有访问属性保持独立。

## 注册新的源码界面

当前 core/editor/registry.ts 仅收编译内可信描述，主题 admin/content/plugins/registry.ts 组装两个实际消费者。描述包含 id/version/format/label/adapter；重复 ID 或默认格式拒绝。持久格式和插件实现分开，第三种格式须先扩展后端、生成契约及安全渲染策略；同格式多个编辑器选择还未冻结。

复用 SourceBlockEditor/封装 CodeEditor，提供自己的语言扩展和工具栏动作；通过 value/onChange、editorRef、onMedia/onUpload 和 uploadStatus 接入宿主。正文采用本地编辑面历史，共享属性及结构使用宿主 Y.Doc；插件不得另建业务保存通道。媒体使用统一选择器/上传队列和相对位置插入，不能在插件中直传文件、猜物理路径或持久保存解析后的 Base URL。样式使用后台主题变量，深色高亮也由变量派生。

Markdown 和 HTML 均以原始字符串为底稿，切换视图直接同步本页内容，整篇保存时提交正文。格式切换仍保留源文。预览使用统一可信渲染/清理，不能执行正文脚本。

## 检查与交接

- 后端 Ruff/格式、mypy、pytest；真实 PostgreSQL/Redis/双 API：RUN_DATABASE_TESTS=1 时执行 tests/test_collaboration_processes.py。测试创建并清理专属 everunfold_collab_test_* 库，不对开发库故障注入。
- 前端 npm run check；npm run verify:admin 使用隔离副本构建，不写运行中的 .next。tests/collaboration.test.ts 覆盖并发源文、结构墓碑、仅本人撤销、跨标签页缓存合并、ACK 防复活、密码剔除、失效会话导出范围和协议验证。
- Backend contracts/collaboration-v1.schema.json 是唯一字段权威；提交后 npm run contract:sync -- <后端契约的绝对路径> 生成，生成器按仓库格式输出。前端 collaboration-source.json 固定源版本/提交/哈希，不能手改业务字段。
- 每改可见组件立即检查内置浏览器；P0/截图/未执行项记入验收和 STATUS。只做本地提交，用户自行推送。

## 源码工具与快捷键

外层正文容器透明、无独立编辑/预览/状态栏；整篇预览在页面顶部，区块模式按钮仍在块头。链接/图片属性使用有明确期望宽度且可收缩的ActionPopover，表单输入保留原生键盘语义。HTML表格的隐式段落只在编辑面适配，结构修改的有限回写边界见[ADR0046](../decisions/0046-editor-canvas-and-anchored-forms.md)及[本轮回归](../handoff/editor-canvas-popover-verification.md)。

- 当前两个块编辑插件版本为 2.1.0，HTML默认可视化；以下源码工具仍供Markdown及HTML源码视图复用。SourceToolbar 管段落样式与动作/模板；SourceSearchPanel 管查找表单；SourceBlockEditor 组合这些控件，不接管业务保存。CodeEditor/useCodeEditorHandle 封装原生编辑面、选择、输入和 Y.Text 绑定。core/editor 处理局部格式变换和可见区搜索高亮。
- 标题/列表作用于当前行或选中多行，常用行内格式可切换；空选区插入并选中占位文本。链接、表格、HTML 列表等为源码模板，插入后继续手工编辑。HTML 代码块转义选中标签；已有 HTML 标题的属性保留。
- Ctrl/Cmd+B 加粗，Ctrl/Cmd+I 斜体，Ctrl/Cmd+F 当前块查找；Ctrl/Cmd+Z、Shift+Z/Y 在正文内使用当前编辑面的历史。跨视图正文历史目前分开，属性和结构使用上方共享撤销控件。查找框 Enter 下一项、Shift+Enter 上一项，替换框 Enter 替换，Escape 关闭并回正文。
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

## 源码底稿与双视图（历史2.1阶段）

代码/公式共用入口、可视化节点边界与前台按需资源见[ADR0049](../decisions/0049-shared-code-and-formula-features.md)及[指南](content-features.md)。HTML源码/可视化都有公式插入窗口；Markdown分屏只使用一条整宽状态栏，字符数不重复。公式节点只在本页视觉模型存在，不扩展共享WS节点Schema。

当前规则见 [ADR0044](../decisions/0044-source-first-blocks-and-whole-draft-save.md) 和 [ADR0045](../decisions/0045-inline-image-upload-and-editor-controls.md)。

- HTML 默认可视化，单图标切换源码/可视化；Markdown 默认源码，桌面单图标依次切换源码/可视化/分屏，窄屏只在源码/可视化往返。两种格式的可视化均可编辑。模式控件位于区块右上角，图标和可访问名称表示下一次动作，单击直接切换，不弹菜单；详见 [ADR0047](../decisions/0047-compact-editor-views-and-media-picker.md)。
- 切换本身保持原文。HTML 源码选择完整元素标签，Markdown 定位对应文字或图片。受影响部分按源码映射更新，未改部分保留原排布。自定义结构使用安全预览和源码编辑。
- HTML 可视化回车与新插入块级结构按新增片段分行、缩进，保留旧源码、行内内容和 pre 空白；整理后仍需核对完整语义投影，详见 [ADR0048](../decisions/0048-new-html-fragment-line-formatting.md)。
- 两种工具栏的插入项均为直接图标按钮。选中图片后显示快速左/中/右对齐。图片入口和上传入口位于顶部，底部只有共享状态栏。
- Ctrl+V 的二进制图片和顶部多选上传共用队列。视觉占位对应源码中的 everunfold-upload:// 临时 img 标记，完成后变为 site://media/ID。等待或失败占位需要完成/移除后才能保存，刷新后可移除中断占位并重新上传。
- 媒体选择入口共用大窗口 MediaPickerDialog，上传/媒体库标签、左侧文件/右侧只读资料及固定确认区；点击文件只暂选，确认退出后才插入，取消不改正文。设置中的头像/背景也复用该窗口，资料编辑仍在独立媒体库。
- 整篇保存传 block_sources 到原协同 commit 接口，前端生成类型固定在后端 a445b3f 的 collaboration1.2。冲突保留输入和导出，用户确认采用最新版本才丢弃本页改动。
- 旧版源码租约接口仅用于兼容。新模式中移除了单块应用/取消动作。旧源码暂存仍可通过导出取回。
- 正文内撤销历史按编辑面保存，跨 HTML 视图的统一历史尚未交付。前台字体继续按引用加载，后台字体选择与媒体管线共用已有封装。

本轮独立草稿 09049c74-24e1-4be1-b12d-27825368d80f 保留未发布的双视图及粘贴上传图片验收内容，原用户草稿未由代理覆盖。详情见[验收](../handoff/source-first-editor-verification.md)。

## 2026-11-04 生命周期与SDK辅助数据

编辑面以本地或doc.guid+blockId绑定为生命周期边界；不要仅用useEditor依赖变化销毁旧引擎，再让同轮其他效果/快捷句柄访问它。除isDestroyed外必须确认extensionManager仍有效，延迟插入需重新检查。销毁与重挂不能销毁宿主UndoManager，也不能重置Y.Doc。

新增编辑引擎时用真实结构编辑验证其Yjs辅助数据；当前只额外接受已严格校验的__tiptap_position_migrations:item命名空间，不能让插件向任意根写业务/权限数据。兼容问题不得以删除缓存或ACK未提交更新处理。具体边界和回归见[ADR0043](../decisions/0043-rich-editor-lifetime-and-position-history.md)及[验收](../handoff/editor-lifecycle-fix-verification.md)。

## 区块内插入与视图定位（2026-11-05）

- 短代码按钮位于两种格式的源码/可视化工具栏，替换当前选区或在光标处插入，不新增区块。可视化中的调用原子保留完整源文；已应用定义/参数/预览复用原短代码库。
- 视频按钮筛选视频媒体。Markdown保存`![](site://media/UUID){type=video}`（URL也可用尖括号包围），HTML保存video标签；两种可视化均可插入、显示播放器，私有预览和正式阅读沿同一解析。代码示例和转义不触发视频。
- HTML文字颜色支持常用色、自定义六位十六进制与可视化恢复默认；源码入口包裹所选文字。颜色保留在HTML源文和安全阅读样式中。
- HTML切换保留文本光标/选区，新高度稳定后即时定位并避让导航/区块栏。标题栏在本块范围内固定，距实测导航底部8px；窄屏考虑预览操作第二行。跨视图撤销仍分开。
- 保存/协同仍用原block_sources、截点、源文指纹和租约；本地短代码/视频节点不加入共享Schema。具体决定见[ADR0059](../decisions/0059-editor-inline-insertion-and-sticky-blocks.md)，检查见[验收](../handoff/editor-inline-tools-verification.md)。

## 当前共享编辑与版本管理（collaboration 2.0.0）

上文整篇block_sources提交、分离的正文撤销栈属于历史阶段。现有宿主以source_first的Y.Text作为唯一正文，源码与视觉编辑写最小变更、共享本人撤销和成员位置。无源码变化的presence不能重置表单。新插件应复用SharedSource及统一媒体/上传通道；不能向旧整篇save写入协同草稿，也不能绕过持久合并锁。详细流程见[ADR0061](../decisions/0061-cursors-offline-branches-and-version-merges.md)及[版本指南](draft-versions.md)。

## 工具入口与链接表单（2026-11-05）

Markdown/HTML源码和可视化工具栏复用18px主要图标。短代码使用“图标＋短代码”文字按钮，合并结果编辑器也提供相同入口；选区捕获、原生调用和区块内插入沿原实现。暂停或无权编辑合并时按钮禁用。

可视化链接弹层提供标题、地址、取消/应用；已有链接才显示移除。新链接为空地址，提交去除首尾空白，非法协议保留输入和错误提示。340px期望宽度按视口收缩，焦点回到原触发器，原生键盘输入和Escape关闭保持。实现与验收见[ADR0063](../decisions/0063-compact-content-lists-and-editor-tools.md)及[检查记录](../handoff/content-list-tools-verification.md)。
