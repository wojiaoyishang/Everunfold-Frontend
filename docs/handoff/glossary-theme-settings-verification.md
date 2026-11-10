# 术语表、Tooltip 与主题私有设置验收

状态：公开功能、后端 API、设置契约和隔离生产构建已验证。日期：2026-11-10。范围是功能实现，不包含 WordPress 文章迁移或远程推送。

## 交付

- 后端插件 `everunfold.glossary` 1.0.0，新增 `glossary-v1` 1.0.0、settings 1.25.0、迁移 `0036_glossary_plugin`。
- 公开 `/glossary`、`/glossary/{slug}`，后台 `/admin/glossary`，以及文章级按需 Tooltip。
- 主题表单拆分到 `src/themes/<id>/theme-settings.tsx`；`theme_options` 按主题 ID 独立保存。Argon 与 Paper 各自提供设置，主题切换仍在公共宿主。
- 站点设置增加作者格言、结构化页脚和术语显示规则；文章显示、首页默认值、目录序号和 Paper 纸张底色接入前台。

## 文章级匹配证据

真实 PostgreSQL/API 测试创建一篇含“金灵”的文章和一篇不含该词的文章，发布“金灵”词条后：

- 命中文章只返回“金灵”词条及 `matched_texts`。
- 未命中文章的 `terms` 为 `[]`。
- 代码围栏、行内代码、Markdown/HTML 链接和 HTML 标签中的文字不参与匹配。
- ASCII 术语使用单词边界，`JSON` 不会错误命中 `JS`。
- 归档词条立即退出文章匹配和公开目录。

远程实际页使用临时“代码”词条验收：功能测试文章命中并最多装饰 20 个普通文本节点；无术语示例文章请求完成但装饰数为 0。Tooltip 点击打开、Escape 关闭并把焦点还给触发词。桌面和 390px 手机截图已查看，手机页面 `scrollWidth` 与 `clientWidth` 相等，无横向溢出。验收结束后两条 QA 词条均归档，主站文章未改。

## 自动化检查

- 后端真实库完整套件：`337 passed in 416.03s`。
- 后端术语专项（含归档边界）：`2 passed in 5.68s`。
- 后端 Ruff check 与 338 文件格式检查通过；生产代码 mypy `222 source files` 通过。
- 全仓 mypy 仍报告既有测试文件类型问题（约 151 项，集中在历史进程测试和未注解夹具），本轮没有把这些历史债务伪装成通过。
- 前端 `npm run check`：345 项通过，lint、两套 TypeScript、格式、插件构建和测试均通过。
- 前端 `npm run verify:admin`：隔离生产构建成功，`/glossary`、`/glossary/[slug]`、`/admin/glossary` 和主题设置路由包含在构建清单；后台私有路由检查加入 `/admin/glossary`。

## 视觉与浏览器边界

- 已实际查看桌面 Tooltip、390px Tooltip、390px 术语目录和详情；提示层使用原主题的表面、边框、文字、强调色和减少动态规则。
- 内置浏览器当前只有用户 WordPress 后台会话，没有 Everunfold 管理会话。因此未用真实登录状态重走后台术语增删改和 Argon/Paper 表单切换；这部分由真实 API、组件测试、路由/构建检查覆盖。后台实页视觉检查仍建议在用户登录 Everunfold 后补一次。
- 未做全浏览器、读屏器全矩阵、长期负载或超大术语库性能测试。

## 数据与服务

- 后端插件目录已显式同步，API `/v1/plugins/everunfold.glossary/index` 返回 200。
- QA 词条 `qa-code`、`qa-blog` 已通过插件服务归档，保留记录与修订，不删除文章或其他业务数据。
- 修改仅本地 Git 提交，没有 push；文章迁移、远端发布和服务配置变更不在本轮范围。
