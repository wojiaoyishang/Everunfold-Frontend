# 公式编辑器与主题吐司

版本：formula-editor-and-toasts-1，2026-11-04。见 [ADR0050](../decisions/0050-structured-formula-editor-and-theme-toasts.md)。

## 公式窗口

两种格式的源码/可视化工具栏使用相同入口。左侧结构化输入，右侧 CodeMirror LaTeX 源码，可立即开关源码；标题栏选择独立/行内并打开数学键盘。分类、搜索与模板插入到上次编辑的面板，占位槽用 Enter 前进。源码支持高亮和命令补全；无效输入保留、显示诊断并禁用插入。矩阵先点击单元格再增删行列，不能在矩阵外误造多行环境。

定位选区只匹配唯一、可识别的片段；重复或超过有界搜索时提示而不猜位置。单纯开关保持源码空白和排布；实际可视化编辑可能规范化 LaTeX。两侧历史独立。Ctrl/Cmd+Enter 插入，窗口内 Ctrl/Cmd+S 提示先插入，不触发文章保存。确认退场后才改本页块，取消/Escape 不改正文，之后仍需整篇保存。

- core/editor/formula：可信模板、语言辅助、选区和矩阵上下文判断。
- themes/argon/components/ui/formula：窗口、样式及 MathLive 生命周期边界；只有 math-field.tsx 动态导入运行时。
- core/rendering/features/math：统一 KaTeX 校验，8000 字符、trust=false、限制展开/尺寸和独立宏状态。
- npm run features:assets：生成版本化 KaTeX 阅读资源与 MathLive 编辑字体；predev/prebuild 执行。对上游字体 CSS 的 font-display 引号作规范化，其余不手改供应商资产。

MathLive 仅在打开窗口时加载，本地 WOFF2 使用 swap，无 CDN/声音；前台仍按实际正文使用 KaTeX。模板保留固有尺寸，禁止把内部 SVG 当成按钮图标统一改宽高。完整 TeX 文档、TikZ、计算机代数、任意宏插件、实机触摸/IME 与跨浏览器矩阵尚未交付或验收。

## 全局吐司

客户端主题组件调用 useToast，show 必须提供本功能拥有的稳定 ID；同一 ID 更新原通知，dismiss 开始退场，remove 立即清理本组件通知。不在全局关闭其他功能的 ID，不把网络传输放进通知组件。

```tsx
const toast = useToast();
const id = "my-feature:upload:stable-file-id";
toast.show({ id, title: "正在上传图片", tone: "loading", progress: null });
toast.show({ id, title: "正在上传图片", tone: "loading", progress: 45 });
toast.show({ id, title: "图片已上传", tone: "success", duration: 3500 });
```

progress 的 undefined 不展示轨道、null 不定进度、数字为真实百分比。传输 100% 不等于保存成功。actions 只调用原有用例；成功/信息默认 4 秒，错误/加载默认持续，悬停/键盘焦点暂停关闭。关闭不夺取焦点，退出遵守当前主题减少动态偏好。

通知在发布/更新时选择活动 dialog 或当前主题表面。持久错误通知期间连续打开/关闭不相关弹窗的迁移未单独验收，新增跨弹窗消费者须补该场景。正文适配器仍使用 useInlineImageUploads；失败占位必须重试或移除后才能保存，媒体库独立页保留 UploadQueueView。

运行 npm run check 与隔离 npm run verify:admin，立即检查可见组件。实际结果见[验收](../handoff/formula-editor-verification.md)。
