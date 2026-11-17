# 短代码插入表单和调用规范

## 选择表单方式

| 方式 | 注册内容 | 快捷插入 |
| --- | --- | --- |
| 参数声明 | `definition.parameters` | 宿主按定义顺序和类型生成控件，容器另外显示正文输入区。 |
| 自定义控件 | `definition.parameters` 和 `PluginShortcode.editor` | 宿主加载具名 React 组件，由组件提供整张参数和正文表单。 |

`parameters` 在两种方式下都定义正式调用允许的参数名、类型、默认值和必填规则。自定义控件可以把多个输入组合为一个参数，也可以构造包含子短代码的正文。前端内建短代码在主体中注册。独立前端插件在 `plugin.ts` 的 `setup` 中用 `shortcodes.register` 注册，使用同一个插件的 `components.register` 声明编辑器，再在 `components.tsx` 的默认组件表中实现。声明式的 `mediaPicker` 属于自动表单，自定义控件可调用 SDK 的媒体选择器。

## 注册和实现自定义控件

`plugin.ts` 保持共享声明，渲染器可在 Node 与浏览器中运行。

```ts
import { definePlugin, type PluginShortcode } from "@everunfold/plugin-sdk";

const note: PluginShortcode = {
  definition: {
    id: "b28e3a86-603c-4d7f-80f4-79673330e237",
    name: "example:note",
    title: "示例说明",
    description: "显示一段带名称的说明。",
    kind: "container",
    parameters: [{ name: "title", label: "标题", type: "text", default: "说明" }],
    html: "",
    css: "",
    scope: "ef-sc-b28e3a86603c4d7f80f479673330e237",
    revision: 1,
  },
  editor: "example.note.editor",
  render({ body, parameters, escape }) {
    return `<aside><strong>${escape(parameters.title)}</strong>${body}</aside>`;
  },
};

export default definePlugin({
  id: "example.note",
  title: "示例说明",
  version: "1.0.0",
  setup({ shortcodes, components }) {
    shortcodes.register(note);
    components.register("example.note.editor");
  },
});
```

`components.tsx` 的编辑器用 `definition` 生成调用，`initialBody` 提供当前选区或初始正文，`format` 是目标正文区块的格式，`language` 是内容语言。`source` 是宿主最近接收的完整调用。`media` 提供当前正文媒体，选择媒体后用 `onMedia(item)` 登记其引用。

```tsx
import { useEffect, useState } from "react";
import { shortcodeCall, type ShortcodeEditorProps } from "@everunfold/plugin-sdk";
import { HtmlSourceEditor, TextArea, TextField } from "@everunfold/plugin-sdk/client";

function NoteEditor({ definition, initialBody, format, onChange }: ShortcodeEditorProps) {
  const [title, setTitle] = useState("说明");
  const [body, setBody] = useState(initialBody);
  useEffect(() => {
    onChange(shortcodeCall(definition, { title }, body));
  }, [body, definition, onChange, title]);
  return (
    <>
      <TextField aria-label="标题" value={title} onChange={(event) => setTitle(event.target.value)} />
      {format === "html" ? (
        <HtmlSourceEditor label="说明 HTML" value={body} onChange={setBody} disabled={false} />
      ) : (
        <TextArea aria-label="说明正文" value={body} onChange={(event) => setBody(event.target.value)} />
      )}
    </>
  );
}

export default { "example.note.editor": NoteEditor };
```

每次有效编辑调用 `onChange(完整调用)`。控件可用 `onChange("")` 表示尚未生成可插入的内容。宿主负责预览、显示源码、校验、取消及在捕获的正文位置插入。自定义控件使用共享界面组件，HTML 编辑使用 `HtmlSourceEditor`。数据库管理的自定义模板沿用参数声明和模板过滤规则。

## 完整调用

```text
{{< example:badge label="草稿" >}}

{{< example:note title="标题含有 \"引号\"" >}}
这里是正文。正文可以再调用 {{< example:badge label="提示" >}}。
{{< /example:note >}}
```

- 每次提交恰好包含一个与所选定义同名的最外层调用。完整调用可以带首尾空白。容器使用配对结束标记，单体调用只有开始标记。
- 开始标记写为 `{{< 名称 参数名="值" >}}`。参数最多 16 个，名称唯一，值使用 JSON 字符串的双引号和转义，单个值最多 1000 字符。布尔值和数字也写在双引号中。结束标记只含斜杠和名称。
- SDK 的 `shortcodeCall(definition, values, body)` 按定义顺序序列化。缺省参数取定义的默认值或空串。正文按目标区块格式编写，嵌套短代码放在正文中。代码块、行内代码、HTML 属性和注释中的示例保留字面内容。
- 宿主用当前短代码目录和站点嵌套限制校验源码。缺少结束标记、未知参数、无效参数值或超限会在预览显示诊断。发布保存原始调用，公开阅读按当前注册定义安全渲染。

## 术语弹窗

`glossary` 的正文是读者可触发的区域。弹窗内容可来自 `term` 指定的已发布词条、`text` 指定的纯文本，或一个直接子级 `glossary-popup`。三者填写其中一种，`title` 可给手写说明命名。词条填路径最后一段，编辑器可以按词条标题、路径或别名搜索。

```text
{{< glossary term="日记" >}}这里说的日记{{< /glossary >}}

{{< glossary title="本处的归档" text="按年份归档。" >}}日记归档{{< /glossary >}}

{{< glossary title="归档方法" >}}
日记归档
{{< glossary-popup format="html" >}}
<p>按年份浏览 {{< glossary term="日记" >}}日记{{< /glossary >}}。</p>
{{< /glossary-popup >}}
{{< /glossary >}}
```

`format` 可选 `html` 或 `markdown`，省略时沿用外层的格式。说明沿用正文过滤，触发区和说明区都可包含已注册短代码。源码层数包括 `glossary-popup`，默认 32，可在「站点设置 → 短代码」设为 1 至 64。多个弹窗逐层打开，Esc 关闭当前层，循环引用的词条到再次遇到时保留触发文字。加密文章的触发区域随正文解锁出现。
