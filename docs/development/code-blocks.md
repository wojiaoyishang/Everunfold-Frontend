# 代码块编辑与展示

版本：code-blocks-1，2026-11-04。见 [ADR0052](../decisions/0052-shared-code-frames-and-source-options.md)。

## 使用

Markdown 和 HTML 的源码/可视化工具栏共用“代码块”窗口：单个 CodeMirror 编辑框，上方选择语言和可选文件名，“显示选项”展开片段设置。支持补全、括号、缩进、撤销、查找替换；取消/Escape不改变正文，Ctrl/Cmd+Enter插入。窗口中的Ctrl/Cmd+S不会下载网页或提前保存文章，插入后整篇保存。

在代码内放置光标，再点击代码块按钮可以修改现有片段。源码模式定位整个围栏/pre，可视化模式使用本地节点；选择普通文字则创建新片段。单纯切换视图或取消窗口保留原始源码，显式编辑只修改受影响部分及必要片段信息。

后台“主题设置 → 代码块”提供阅读默认值及实际组件预览。代码字号11～20px、行高1.3～2.2、制表宽度2～8格、默认折叠0～200行（0不折叠）；行号/折行可覆盖，深浅配色随展示区域切换。自定义字体从已有字体库选择，沿原媒体上传/进度与引用管理处理。

阅读时长代码底部半透明渐隐，点击“展开代码”显示全部，底部可“收起代码”；顶部仅折行和复制。展开有高度过渡并遵循减少动态设置。折叠阈值按源行而非视觉换行计数，实际高度随折行/字体重新计算。短代码或折叠为0时没有展开栏。无JS或旧派生框体缺少底部插槽时仍可在代码区域内滚动，不会失去正文。

## 源码参数

Markdown围栏语言后可写JSON，例如：

~~~~markdown
```python {"title":"main.py","numbers":"on","start":10,"mark":"11,13-14","wrap":"off","fold":18}
def square(x):
    return x * x
```
~~~~

HTML中使用等价的pre属性：

```html
<pre data-code='{"title":"main.py","numbers":"on","start":10,"mark":"11","fold":0}'><code class="language-python">def square(x):
    return x * x</code></pre>
```

| 参数 | 含义 |
| --- | --- |
| title | 文件名或标题，最多160字符；为空时展示语言 |
| numbers | on/off；省略跟随主题 |
| start | 显示行号起点，1～1000000，默认1 |
| mark | 使用显示行号标记重点，例如11,13-14；最多64个范围/512字符 |
| wrap | on/off；省略跟随主题；不会给源码插入换行 |
| fold | 折叠高度按原始代码行数计算，0～200；0不折叠，省略跟随主题 |

未知属性/非法值忽略；标题转义，不是HTML。语言按项目统一白名单识别，未知语法显示纯文本。阅读端的换行、展开、复制不保存作者参数或读者全站偏好。大块超过100000字符/5000行时回退纯代码；没有JS时仍可读取和滚动代码，操作栏由客户端增强。

## 设置、资源与维护

全站参数来自FastAPI生成契约theme.code，保存仍为PATCH /v1/admin/settings，expected_revision防覆盖；审计和投递同事务，Node接收后应用现有设置快照。前端不另建业务配置表或API。字体只保存media ID，URL/font_info由后端从有效字体资源解析，嵌套引用受安全删除保护。

公开代码、正文/私有预览及评论复用ContentMarkup/CodePreferencesProvider、frameCodeHtml及CodeTools。CSS与字体只对实际含代码的正文声明；字体使用时请求，不预载整个字体库。CodeMirror及语言描述属于编辑侧动态模块；Highlight.js仅加载声明语言，SSR先生成可读高亮，客户端增强不存入正文。

运行npm run check和npm run verify:admin；后端运行Ruff/mypy、契约检查，并显式RUN_DATABASE_TESTS=1运行tests/test_settings_processes.py。后者在专属测试库验证双API冲突/回滚、Worker/Scheduler/Node重放、代码主题/字体解析、引用保护及CDN改址，不对开发库故障注入。最新实页、测试结果及限制见[验收](../handoff/code-blocks-verification.md)。
