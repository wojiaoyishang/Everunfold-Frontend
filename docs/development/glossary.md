# 术语表与文章按需 Tooltip

版本：glossary-runtime-2，2026-11-10。实现决定见 [ADR0099](../decisions/0099-article-scoped-glossary-tooltips.md)。当前功能属于后端插件 `everunfold.glossary`，文章和正文快照不做术语迁移。

## 管理入口

管理员在「内容 → 术语表」打开 `/admin/glossary`：

- 标题和别名都会参与正文匹配；同一语言内不能与其他非归档词条重复。
- 简短提示用于默认 Tooltip，完整说明是安全 Markdown，用于详情页或选择“完整词条说明”时。
- 草稿不进入公开目录和文章匹配；发布后进入；归档后保留记录但不再公开。
- 保存使用 `operation_id` 幂等和 `expected_revision` 冲突保护。冲突时保留当前输入，刷新词条后再合并。
- 公开路径为 `/glossary/{slug}`。路径是稳定公开标识，修改已有词条的 slug 会改变旧链接。

后台采用与其他系统设置一致的布局：页面接入 `admin-settings-page`，编辑区用 `SettingsSection` / `SettingsText` / `admin-settings-field`，目录与状态使用共享的后台按钮、搜索、徽标和空状态。术语页面不应重新用裸标签和浏览器默认控件拼装表单。默认弹层使用简短提示，完整 Markdown 说明在详情页或选择“完整词条说明”时使用。

## 后端匹配与缓存边界

文章级接口：

```text
GET /v1/plugins/everunfold.glossary/for-content/{content_id}
```

响应中的 `terms` 是文章实际命中的已发布词条；没有命中时必须是空数组。服务端会检查内容类型、公开状态、语言和正文可见区块。代码、链接和 HTML 标签不参与普通正文匹配。文章正文继续走原公开内容快照，不需要因术语表重新生成文章快照。

前端 `loadGlossaryMatches` 的缓存键由 API 地址、内容 ID 和内容修订组成，寿命 5 分钟；命中、未命中以及多个组件同时请求都共享同一个 pending Promise。失败会移除缓存，页面继续可读。不要改成启动时下载整份术语目录再在浏览器匹配，也不要让术语请求阻塞文章首屏。

公开目录接口 `GET /index` 只用于 `/glossary`，不是文章 Tooltip 的批量索引。详情接口 `GET /terms/{slug}` 按当前语言读取。

## 前端交互

内容 HTML 渲染后，前端在普通文本节点中按后端返回的 `matched_texts` 做二次精确匹配：

- 同一页面最多提示 `site.glossary.max_matches_per_page` 个，默认 20。
- 长别名优先，区间不重叠；ASCII 词不能命中更长英文单词内部。
- 链接、按钮、代码、公式、脚本、隐藏文本和已有提示节点不装饰。
- Tooltip 支持点击/触屏打开、Enter/空格、Escape 关闭并回到触发词；悬停离开有短暂延迟，便于进入弹层。
- `summary` 只显示简短提示；`content` 使用现有安全 Markdown 渲染器显示详情。

关闭 `site.glossary.auto_match` 后，文章不再加载术语组件，正文缓存仍正常工作。提示的最大值只限制当前页面，不删除目录或词条。

## 发布与排错

1. 后端执行迁移 `0036_glossary_plugin`，启动 API 后显式同步插件目录：

   ```bash
   uv run --locked python -m tools.register_backend_plugins --config config.toml --apply
   ```

2. 保持 Receiver、Worker 和 Scheduler 正常，确认插件状态为已同步；`50389` 表示插件部署清单尚未应用到节点。
3. 访问含术语的文章，等待空闲术语请求；若正文有词但没有提示，检查文章语言、词条是否为发布状态、正文是否在链接/代码/公式中，以及页面大小限制。
4. 访问不含术语的文章，确认接口 `terms` 为空且页面没有 `.glossary-term`；不要用公开 `/glossary` 全量列表填充文章 Tooltip。

## 当前边界

不自动为正文中的每个术语生成永久链接，不跨内联节点拼接被拆开的文字，也不把作者短代码参数当作已验证的可见正文。新增规则时应先补真实 API/浏览器测试，再扩大匹配范围。
