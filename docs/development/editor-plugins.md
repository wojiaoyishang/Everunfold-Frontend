# 编辑器开发与试用

版本：editor-plugins-3，2026-11-03。使用 [协同架构](../architecture/collaborative-editing.md)、[ADR 0037](../decisions/0037-plugin-editors-and-collaborative-drafts.md) 与 [ADR 0038](../decisions/0038-source-editor-interactions-and-shortcuts.md)，不另维护业务 Schema。

## 启动与验证

1. 后端执行 uv sync --locked，再显式 uv run python init.database.py --config config.toml。迁移 head 为 0013_collaboration，启动服务不会自动迁移。
2. 本地后端：uv run python -m uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --no-proxy-headers --ws-max-size 1500000。部署需支持 WS 升级并配置实际前端 Origin；不使用查询参数 Token。
3. 前端 npm ci --ignore-scripts、npm run dev，保留 3000。动态加载两种编辑器；新建内容先保存一次取得稳定 ID，再进入共享草稿。
4. 本轮新增库/协议后，旧开发标签页手动刷新一次。系统没有添加循环刷新或自动硬跳转。
5. 同一文章打开两页，分别在 Markdown/HTML 输入，检查另一页文字、在线会话和光标；Ctrl/Cmd+Z 只撤销本人操作。工具栏也提供全篇撤销/重做。
6. 断开后端后在两个窗口输入，状态应为本机保存；关闭其中一个，重启后端，剩余窗口应补齐并确认全部输入。没有确认前不能成功发布。刷新后的撤销栈不保留，JSON 导出始终可用于人工恢复。
7. 保存草稿产生完整修订；发布才影响前台。另一编辑者改了已保存修订时仍通过 expected_revision 拦截，查看最新版本只合并业务策略，不用旧 JSON 替换 Y.Doc。

本机留有未发布的「协同编辑试用」，ID 94b76ebe-94f8-4f72-ac87-c9f14234abd8；链接 /admin/content/article/94b76ebe-94f8-4f72-ac87-c9f14234abd8/edit。它是可删除的开发草稿，不是初始化固定数据，也不写入 seed 或前台。

## 注册新的源码界面

当前 core/editor/registry.ts 仅收编译内可信描述，主题 admin/content/plugins/registry.ts 组装两个实际消费者。描述包含 id/version/format/label/adapter；重复 ID 或默认格式拒绝。持久格式和插件实现分开，第三种格式须先扩展后端、生成契约及安全渲染策略；同格式多个编辑器选择还未冻结。

复用 SourceBlockEditor/封装 CodeEditor，提供自己的语言扩展和工具栏动作；通过 shared.text、awareness、undo 接入宿主，不能在插件内建第二个 Y.Doc、独立文本历史或整篇 JSON 保存。媒体使用统一选择器/上传队列和相对位置插入，不能在插件中直传文件、猜物理路径或持久保存解析后的 Base URL。样式使用后台主题变量，深色高亮也由变量派生。

首版源码修改即时进入共享工作文档；格式切换保留原源文，不进行有损 Markdown↔HTML 转换。预览使用统一可信渲染/清理，不能执行正文脚本。

## 检查与交接

- 后端 Ruff/格式、mypy、pytest；真实 PostgreSQL/Redis/双 API：RUN_DATABASE_TESTS=1 时执行 tests/test_collaboration_processes.py。测试创建并清理专属 everunfold_collab_test_* 库，不对开发库故障注入。
- 前端 npm run check；npm run verify:admin 使用隔离副本构建，不写运行中的 .next。tests/collaboration.test.ts 覆盖并发源文、结构墓碑、仅本人撤销、跨标签页缓存合并、ACK 防复活、密码剔除、失效会话导出范围和协议验证。
- Backend contracts/collaboration-v1.schema.json 是唯一字段权威；提交后 npm run contract:sync -- <后端契约的绝对路径> 生成，生成器按仓库格式输出。前端 collaboration-source.json 固定源版本/提交/哈希，不能手改业务字段。
- 每改可见组件立即检查内置浏览器；P0/截图/未执行项记入验收和 STATUS。只做本地提交，用户自行推送。

## 源码工具与快捷键

- 当前两个块编辑插件版本为 1.1.0。SourceToolbar 管段落样式与动作/模板；SourceSearchPanel 管查找表单；SourceBlockEditor 组合这些控件，不接管业务保存。CodeEditor/useCodeEditorHandle 封装原生编辑面、选择、输入和 Y.Text 绑定。core/editor 处理局部格式变换和可见区搜索高亮。
- 标题/列表作用于当前行或选中多行，常用行内格式可切换；空选区插入并选中占位文本。链接、表格、HTML 列表等为源码模板，插入后继续手工编辑。HTML 代码块转义选中标签；已有 HTML 标题的属性保留。
- Ctrl/Cmd+B 加粗，Ctrl/Cmd+I 斜体，Ctrl/Cmd+F 当前块查找；Ctrl/Cmd+Z、Shift+Z/Y 保持原全篇本人撤销/重做。查找框 Enter 下一项、Shift+Enter 上一项，替换框 Enter 替换，Escape 关闭并回正文。
- 当前编辑页面 Ctrl/Cmd+S 和 Shift+S 均保存草稿，不发布；保存、错误/不确定状态和确认仍复用原逻辑。无修改不生成新修订，按住按键不重复提交，模态弹窗内不触发页面保存。控件恢复后回原焦点。未确认的上次操作只能通过明确重试按钮处理。
- 高度随内容变化，不设置固定大块留白；超过 540px 内部滚动。换行和查找是当前块的临时界面状态，不进入协同正文。匹配计数最多显示 1000+，不表示全部替换只处理这些匹配。
- 验证入口：试用草稿分别测试两种工具栏、跨窗口格式/替换与本人撤销；输入后按 Ctrl+S 检查“草稿已保存”和焦点；再修改应显示未保存。长文、320px 折行、模态弹窗、深色与减少动态检查见 [本轮验收](../handoff/source-editor-verification.md)。

## 区块库与排序

见 [ADR0039](../decisions/0039-block-library-and-anchored-dragging.md)。桌面右侧区块/内容设置切换，不挤压正文；区块类型从blockEditors注册表读取名称/说明。手机使用弹出库点击添加。

- 先点块间加号选择位置，再点类型；或直接拖入插入线。末尾入口选择追加。
- 从六点手柄拖动已有块。键盘空格/Enter拾起，方向键/Home/End选目标，放下或Esc取消；移动作为一次本人撤销。正文文字选择不启动拖动。
- 更多菜单保留位置移动、格式切换与确认删除。格式切换保留源文，不承诺自动转换。
- 结构操作只能经过useDraftEditor.commandBlock，核心按最新ID解析，已有草稿用单个LOCAL事务更新order；不要从主题直接改Y.Doc或提交整篇JSON。
- 拖动反馈和FLIP复用封装DragAndDrop，遵循后台减少动态；拖动中暂停保存/发布/撤销/预览切换。
- 源码首行顶部padding为0，底部12px；行号仍由CodeMirror测量。不要重新加顶部空白或用空行撑版。

本轮检查、截图和真实未覆盖项见 [区块验收](../handoff/block-composer-verification.md)。
