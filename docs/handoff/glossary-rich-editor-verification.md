# 术语富文本编辑与弹层验收

版本：glossary-rich-editor-verification-1，2026-11-10。对应 [ADR0099](../decisions/0099-article-scoped-glossary-tooltips.md) 与 [术语指南](../development/glossary.md)。

## 实现

后端 `2d5fe5c` 将术语的单个 `body_markdown` 改为带稳定块 ID 的 `body: GlossaryBlock[]`，支持有序混合 Markdown/HTML；`0037_glossary_rich_body` 把旧正文转换成一个 Markdown 块，迁移后主库 `SCHEMA_REVISION` 为 `0037_glossary_rich_body`。`glossary-v1` 契约为 2.0.0。媒体继续通过 `site://media/<UUID>` 与逐词条 `media_urls` 解析；公开目录、文章匹配和详情都只读取已发布词条。后端补充提交 `e7b8219` 验证 Markdown/HTML 混合正文。

前端 `f444034`：

- `/admin/glossary` 复用文章 `EditorBody`、`BlockComposer`、`DraftPreview`、格式工具栏、代码/公式/媒体、统一上传队列和共享设置分组；正文不再是单文本框。
- 底部保存栏与系统设置一致：左侧读取版本与状态徽标，右侧共享 `admin-button` 撤销/保存；保存使用主按钮和 check 图标，上传或拖动期间禁用。
- 内容语言包含旗帜、“全部语言匹配”和默认 `*`；标题、别名按相同规则匹配。
- 新抽出的共享 `ContentMarkupView` 负责文章、词条详情和 Tooltip 的安全 HTML、代码/公式增强、按需资源和代码工具。Tooltip 复用站内已应用短代码，正文为空时回退 `summary`。
- `popup_source=content` 时，弹层显示文章式富文本；宽度限制在视口内，内部滚动并阻止横向溢出。

## 实际数据

主库留下四个已发布、全部语言匹配的测试词条，供直接验收：

| 标题 | 公开路径                       | 覆盖内容                                         |
| ---- | ------------------------------ | ------------------------------------------------ |
| 代码 | `/glossary/code-rich-demo`     | 标题、粗体、列表、引用、行内/围栏代码、混合 HTML |
| 公式 | `/glossary/formula-rich-demo`  | 行内公式、块级公式、列表                         |
| 篝火 | `/glossary/campfire-rich-demo` | 强调、有序列表、引用                             |
| 文章 | `/glossary/article-rich-demo`  | 站内链接、表格、原生 HTML 折叠                   |

站点术语设置为 `auto_match=true`、页面上限 20、`popup_source=content`；设置 revision 40 已由 `web-main` 应用。验收文章为 `/everunfold-feature-lab.html`，该文章实际命中四个词条。测试词条写入核心开发库，不进入文章正文或 WordPress 备份。

## 实际页面

- 真实文章按需加载后出现 20 个术语装饰；点击“代码”和“公式”分别看到增强后的代码、标题、列表、引用、混合 HTML 与 KaTeX 公式。
- 1440×1000 桌面和 390×844 手机均实际查看；手机页面 `scrollWidth=clientWidth=378`，Tooltip `scrollWidth=clientWidth=355`，内部高度滚动。Escape 关闭后焦点回到原触发词。
- `/glossary/code-rich-demo` 详情在 390px 实际显示标题、摘要、别名、Markdown 正文、代码工具与混合 HTML。
- 术语后台使用真实 `GlossaryAdminPage` 和共享后台组件在 1440/390 检查：文章式正文区块、预览切换、保存栏和旗帜语言选择正常，手机无横向溢出。当前内置浏览器没有 Everunfold 管理员会话，因此登录态后台未向主站写入表单。

## 检查

- 前端 `npm run check`：347 项通过，含 lint、严格 TypeScript、插件类型、格式、生成契约与插件构建。
- 前端 `npm run verify:admin`：隔离生产构建及 36 个后台私有入口通过，后台在无后端和无公开缓存条件下保持隔离。
- 后端真实 PostgreSQL 完整套件：337 项通过，用时 442.53 秒；术语专项 2 项 5.54 秒通过。
- 后端 Ruff 检查、303 文件格式检查、生产源码 mypy 222 文件通过。
- 插件目录已显式同步，API 受控重启；六个容器服务保持运行。公开术语索引、详情和文章均 HTTP 200。

## 边界

未做文章迁移、全浏览器/读屏器矩阵、超大术语库或高并发弹层性能验收。文章级接口仍只返回实际命中词条；同一页面装饰总数受站点上限约束。主站正文、账户、邮件和 WordPress 数据未改写。
