# 原生短代码与后台短代码库

版本：shortcodes-5，2026-11-09（Asia/Shanghai）。用户已确认下面的原生语法、去掉旧兼容及自定义HTML可视化编辑。实现决定见[ADR0057](../decisions/0057-native-shortcode-implementation.md)、[HTML编辑决定](../decisions/0058-preserved-html-visual-editing.md)，实际检查与限制见[验收记录](../handoff/native-shortcodes-verification.md)。ADR0056与两张proposal图片仅保留上一轮设计历史。

## 调用协议

```text
{{< gallery id="site://media/图片UUID" columns="3" >}}

{{< notice type="warning" title="请留意" >}}
这里是 **Markdown** 正文。

{{< accordion title="详细说明" >}}
可以嵌套相同或不同的容器。
{{< /accordion >}}
{{< /notice >}}

{{< custom:reading-tip title="阅读提示" >}}
自定义模板的正文。
{{< /custom:reading-tip >}}
```

- 注册定义决定单体或容器。单体不需要斜杠或结束标记；容器使用`{{< /名称 >}}`，必须正确配对，最多32层。建议把调用独立放在区块或行上。
- 名称小写，内置/代码注册项可用notice等名称；自定义名称必须使用`custom:`命名空间。自定义的数据库UUID与调用名称创建后固定；已应用模板的单体/容器类型也不能修改。
- 参数是`名称="值"`，只接受双引号，支持JSON字符串转义；同一个调用不能有重复、未知参数。支持文字、链接、枚举、有限数字与true/false字符串；缺省值来自定义，必填项必须非空。参数最多16个，值最长1000字符。
- Markdown围栏、缩进代码、行内代码、HTML的pre/code、属性字符串与注释不会展开。Markdown可用`\{{< … >}}`展示字面调用；HTML可把首个左花括号写成`&#123;`。模板不做递归源文替换，参数中的短代码文字不会变成第二次调用。
- 未知项、错误参数、未配对调用保留源文，并返回范围诊断；错误不会吞掉后续正文。正文按所在Markdown/HTML区块渲染，预览与公开阅读使用同一个解析器和渲染器。
- 没有方括号兼容、旧名称映射或旧参数别名。旧标记现在是普通正文；转换器、legacy类名/CSS、旧摘要清理和参考资料汇总路径已删除。保留作者正文和WordPress原备份，不批量改写历史数据。

## 后台入口与目录

`/admin/shortcodes`在工作空间导航登记，侧栏、窄屏导航、面包屑、登录回跳复用原注册机制。

样式卡片展示名称、调用、真实效果、来源与草稿/应用状态。来源可筛选，归档项单独查看。详情可试填参数和正文、查看调用源码；代码注册项的实现是只读源码展示，不提供保存/应用/归档按钮。权限由后端复核，不能靠隐藏按钮保证。

当前注册项：后端core.basic-shortcodes插件提供notice提示框、accordion折叠内容，example.cards提供example:card容器和example:badge单体；前端core.gallery插件提供gallery图片画廊；管理员可创建自定义HTML/CSS模板。画廊样式库无图片时显示明确的样式示例；文章插入时从现有媒体库选择真实图片，调用保留`site://media/UUID`引用。多个图片引用用英文逗号分隔，复用原上传队列、媒体解析和删除保护。

文章/说说的Markdown/HTML工具栏提供“插入短代码”，源码与可视化模式均可用；区块标题栏不再放置该按钮。选择项与参数来自同一目录，只提供未归档、已有应用版本的定义；自定义有未应用修改时插入器仍使用其已应用定义。确认后在当前区块的光标/选区中插入，保持区块ID和数量，源文保存原生调用，不保存展开DOM，也不创建短代码专用Y.Doc。本地可视化用调用原文原子保留分隔符，周围文字继续可编辑；参数和调用正文在源码中修改。见[ADR0059](../decisions/0059-editor-inline-insertion-and-sticky-blocks.md)。

实页截图：[画廊](../design/shortcodes-catalog.jpg)、[模板编辑](../design/shortcodes-editor.jpg)、[窄屏](../design/shortcodes-narrow.jpg)、[深色](../design/shortcodes-dark.jpg)、[文章预览](../design/shortcodes-article-preview.jpg)、[窄屏插入](../design/shortcodes-picker-narrow.jpg)。

## 自定义模板

HTML、CSS、参数三个标签；HTML另有源码/可视化切换，两种方式修改同一份源文。源码创建的类名、数据属性、布局容器不再导致整段HTML变成不可编辑预览。模板可视化修改复用正文编辑器，不是通用网页搭建器。

```html
<section class="card">
  <h3>{{ title }}</h3>
  <div>{{ content }}</div>
</section>
```

```css
& { margin-block: 1em; }
.card { padding: 1.25em; border: 1px solid currentColor; border-radius: 8px; }
.card > h3 { margin-top: 0; }
```

普通插槽插入经过转义的参数文字。容器必须且只能有一个`{{ content }}`正文插槽，不能放到属性里。href的完整插槽必须是URL参数；title/alt/aria-label支持文字，data-variant支持枚举。静态class由编译器重命名；HTML事件、脚本、内联style、任意模板函数、查询与循环不支持。

CSS由后端tinycss2语法树解析，逐条限定选择器、命名空间类名与验证声明。`&`表示根；支持后代/子元素和@media/@supports，不支持跳到根的兄弟元素、外部URL、@import、@font-face、@keyframes、z-index及fixed/absolute等定位。最终CSS不能结束所在style标签；阅读与后台预览表面都有布局/绘制隔离。

源码HTML/CSS各最多8000字符，草稿最多100项；所有公开设置与已应用模板合计最多60KiB，接收信封上限仍为64KiB。资源样式只随实际使用的短代码输出；不因目录中有模板就给所有文章下载整套样式。稳定媒体引用经原媒体服务解析，草稿和历史版本也加入删除保护。

## 保存、应用与历史

保存草稿不会改公开样式；应用前用共享确认窗口说明全站引用范围，应用会影响所有调用该定义的公开文章。当前未实现精确的文章引用数量/逐篇影响清单，不展示推测统计。

后台显示草稿版本、最后应用版本及前台节点实际投递状态。“保存到主库”“已应用定义”“节点已接收”是分开的状态。版本冲突返回409并保留输入。应用历史不可覆盖；恢复历史先产生新草稿，检查并再次应用后才改变公开样式。归档停止新插入，保留现有已发布调用；不提供永久删除。

后端shortcodes模块通过唯一`router_init(ctx)`装配。显式迁移0016创建定义表与不可变应用源文版本表，数据库为权威。API位于`/v1/admin/shortcodes`及save/preview/apply/archive/restore，沿用shortcodes:read/write授权、精确Origin、CSRF和private/no-store；settings契约1.16.1权威导出并生成前端类型与客户端。目录的applied字段仅包含当前应用模板，插入器、版本比较和正文预览不需额外授予settings:read，也不读取自定义模板的未应用草稿。

应用把定义、不可变版本、审计及投递意图放进同一事务。编译后的公开目录是`PublicSettings.shortcodes`的独立类型字段，沿既有public-settings代次和可靠Outbox发送；不能通过普通设置PATCH绕过目录写入。它不是主题CSS字符串或任意JSON扩展，也没有新增一套不可靠通知通道。

SSR每次读本地已经持久应用的完整设置副本，正文/后台预览/私有前台预览共用渲染。后台预览可先看到主库已应用的新定义，公开节点以真实回执状态为准。既有无TTL、source_epoch、幂等/乱序和损坏拒绝回退规则继续适用。

## 当前边界

没有批量迁移旧短代码、任意数据库JS、热下载展示器、精确引用图或可视化布局拖拽器。模板定义采用版本冲突管理，未额外做多人实时协同；文章本身继续沿原整篇协同/源文指纹保存。

历史测试长文中仍有旧方括号标记，现在按普通文字呈现。这是去兼容的已知影响；本轮没有静默重写或重新发布它。当前容器创建的“阅读提示”是独立验收示例，源数据和具体测试入口不写入Git。

## 插件注册（2026-11-07）

前端短代码不自行注册。宿主自动发现`src/plugins/*/plugin.ts`，插件同步setup获得`shortcodes.register`，贡献定义、渲染、预览、媒体选择与按需CSS。后台只读目录、正文解析、样式/插入均由同一贡献派生，核心/主题不再按gallery名称分支。已有UUID、调用语法与媒体引用保持；后端模板从已应用设置读取，契约只描述协议，不再内嵌安装目录。前后端登记检查名称冲突；部署间隙中前台优先采用已应用的后端模板，不能让新前端包覆盖其渲染。预览保留前端插件的专属示例渲染器，HTML清理白名单随当前插件目录更新。参见[插件指南](../development/frontend-plugins.md)。


后端也仅由插件setup注册：`app/plugins/*/plugin.py` 通过 `app.plugin_sdk` 提供函数或类式入口，其余文件无需规定名称。显式 `tools.register_backend_plugins --apply` 保存私有部署快照并推送当前启用模板；禁用后目录/插入器隐藏对应项，源文保持，恢复启用后继续显示。原notice/accordion的UUID、语法和样式保持，不需重写文章。新增纯模板后无需重新构建前端，具体命令和限制见[后端指南](../development/backend-plugins.md)。
