# 子主题开发与启用

版本：child-themes-4，2026-11-09。规范见[父子主题](../architecture/frontend-themes.md)；可直接参考src/themes/paper。默认主题始终为argon。

## 主题卡片与开发者信息

后台“主题设置→已安装主题”使用卡片选择；点击仅修改工作稿，“保存更改”才应用。可随时选择“实例默认”恢复跟随部署配置。右侧快速导航点击后平滑定位，减少动态时即时定位，保留可恢复的URL片段。

在theme.ts与身份/父主题一起声明可选展示字段，不需要额外注册文件：

```ts
import type { ThemeDefinition } from "@/core/extensions/types";
export default {
  id: "my-theme",
  title: "My Theme",
  version: "1.0.0",
  parent: "argon",
  description: "A short description of the theme.",
  preview: "/reference/themes/my-theme.webp",
  author: { name: "Your name", url: "https://example.test/author" },
  homepage: "https://example.test/theme",
  repository: "https://example.test/source",
  license: "Your declared license",
  styles: true,
} satisfies ThemeDefinition;
```

title最长80字，description最长500字，开发者名称/许可证最长100字，各URL最长2048字；图片可以是站内路径或HTTP(S)地址。建议把静态图片放在public/reference/themes，引用/reference/themes/文件名；该目录走既有静态资源入口，正式部署须把图片一并复制。内置Argon/Paper提供不含业务数据的SVG示意图。未提供图片或图片不可用时显示占位，其他资料和选择按钮仍可使用；未声明许可证不推断为某个开源许可。

元数据经npm run themes:catalog输出到忽略的var/cache/build/theme-catalog.json，再由节点协调器向后端登记。dev启动/prepare自动导出；开发时改完声明可运行该命令或重启dev更新清单。正式部署更新主题声明仍需要主构建；主题切换本身不需要重建。各启用节点需登记一致描述，元数据是部署资料，不是另一份站点设置。协议详见[ADR0084](../decisions/0084-theme-cards-metadata-and-settings-scroll.md)。

## 最小子主题

在src/themes/my-theme/添加theme.ts。目录自动发现，不修改中央注册表。只改样式时不需要components.tsx：

```ts
import type { ThemeDefinition } from "@/core/extensions/types";
export default {
  id: "my-theme",
  version: "1.0.0",
  parent: "argon",
  styles: true,
} satisfies ThemeDefinition;
```

本目录styles.ts导出CSS文本，例如：

```ts
const css = `
.public-theme[data-theme-chain~="my-theme"] .post-card { border-radius: 18px; }
.public-theme[data-theme-chain~="my-theme"] [data-theme-content="内容UUID"] .article-content { line-height: 2; }
.public-theme[data-theme-chain~="my-theme"] [data-theme-page="core.people"] { --radius: 16px; }
`;
export default css;
```

仅当前主题链输出CSS，按祖先到子级排序。变量使用原主题的--accent、--surface、--text、--muted、--line等，保留深色与减少动态偏好。不要选择html/body或管理界面；CSS Modules也应限定在自己的组件元素上。共享Modal/ConfirmDialog与人物寄语弹窗挂到当前展示容器，继承作用域CSS；自定义Portal可用core/themes/portal的surfacePortalTarget，仍须使用共享控件和弹窗焦点/退出机制。

## 从Paper开始

Paper 2.0.0是纯CSS子主题，只有两个源文件：

```text
src/themes/paper/
  theme.ts    # 身份、版本、父主题及样式声明
  styles.ts   # 背景、导航、短横幅、细边框和正文行距
```

复制这个目录为src/themes/my-theme/，把theme.ts的id和styles.ts选择器中的paper一并改成my-theme，即可开始二次开发；parent继续使用argon。颜色、圆角、深浅色和动效偏好沿用父主题变量，无需复制完整布局或注册组件。只想叠加Paper样式时，也可以新建主题并声明parent: "paper"。

Paper不再提供public.hero包装、paper.people模板和paper.footer-note钩子组件。若其他子主题引用了这些旧实现，应改为继承Argon，或在自己的目录提供需要的实现；因此版本升为2.0.0。组件、模板和插入钩子的扩展方式见下文，生产构建中的多级组合测试放在tools/fixtures/extensions.mjs，不作为Paper的启动代码。实际效果与检查见[精简验收](../handoff/paper-starter-verification.md)。

## 覆盖组件、复用父组件

在theme.ts的components中列出要提供或覆盖的名称，并在components.tsx的default对象导出同名组件。未知组件显示占位；模板缺失时同时保留父结果。React组件定义在模块顶层，不能在渲染过程中临时声明。

```tsx
"use client";
import { ParentThemeComponent } from "@/core/extensions/components";
import type { Site } from "@/core/content/types";
function Hero({ site }: { site: Site }) {
  return <div className="my-hero"><ParentThemeComponent name="public.hero" site={site}/></div>;
}
const components = { "public.hero": Hero };
export default components;
```

ParentThemeComponent沿当前实现的父级查找，支持多级继承；不要在覆盖public.hero时再次调用同名ExtensionComponent，否则会递归。完整替换public.shell时仍保留BlogShell宿主的数据/导航上下文；自行提供布局及主内容容器。通常覆盖横幅、页眉、页脚或卡片即可。

| 默认组件名 | 接收数据 |
| --- | --- |
| public.shell | children；站点/导航/阅读数据通过现有上下文读取 |
| public.header / public.hero / public.footer | site |
| public.sidebar | site、toc、contentKey |
| public.tools | 无业务props |
| public.article.card / public.article.body | content、rendered、interactive |
| public.article.header | content、interactive、liveMetrics |
| public.post.card | content（列表展示模型） |
| public.shuoshuo.card | entry、rendered、detail、interactive |
| public.page.surface | page、translations、onReady |
| public.page.heading | page、translations |

页面/短代码/插件控件的具名实现也可覆盖；仍按子→父→插件解析。表单默认保持后台Argon上下文；局部ThemeComponentsProvider可以显式选择其他主题。

## 覆盖模板和单个页面

theme.ts提供templates映射，值为本主题具名组件。通用名称为home、feed、search、archives、taxonomy、article、shuoshuo、page；单篇用content:<UUID>，手建页面用page:<UUID>，注册页面可用page:<实例UUID>或page:<implementation_id>。

```ts
components: ["my.article", "my.people"],
templates: {
  article: "my.article",
  "page:core.people": "my.people",
}
```

模板实现接收ThemeTemplateProps：children是上级已渲染的结果；context包含当前需要的site/content/page/path/preview，不是整份快照。可以包裹children，也可以替换整个展示。每层先实例/内容ID、再注册实现ID、再通用模板；然后从父到子组合，各层实现从该层开始解析，保留清晰的父结果。不要在模板中再次渲染同名ThemeTemplate。

路由、SEO、正文服务端渲染、404/撤回和权限属于宿主。受限文章的门禁不允许模板替换；主题只能处理已允许下发的展示。预览中的interactive=false必须继续传给父卡片，避免提交浏览/互动；页面组件应保留onReady回调，异步内容真实就绪后才通知宿主。模板如果完整替换children，接收并在自身就绪后调用onReady；仅包裹父结果无需重复通知。ExtensionComponent的notifyReady=false表示只透传回调、等待内部内容确认，public.page.surface使用此模式，不能把外壳挂载当成iframe/插件内容就绪。

## 插入钩子

slots的每个位置接收组件名列表，父到子追加；false清除该位置的继承名单。名单中的具名组件按当前活动主题解析，因此子主题也能替换父级钩子组件；模板各级组合规则保持独立。组件接收ThemeSlotProps.context，Shell位置有site，文章位置有content/preview，页面位置有page/preview。

```ts
components: ["my.note"],
slots: {
  "article.body.after": ["my.note"],
  "shell.footer.after": false,
}
```

| 区域 | 可用位置 |
| --- | --- |
| Shell | shell.header.before/after、shell.hero.before/after、shell.content.before/after、shell.footer.before/after |
| 文章卡片 | article.header.before/after、article.body.before/after |
| 管理页面的前台展示 | page.header.before/after、page.body.before/after |

Shell的content位置位于路由切换容器之外，适合全站说明；正文插入使用文章/页面位置。自定义组件也可以声明自己的ThemeSlot，不存在贡献时不产生空容器。

## 构建和选择

```sh
npm run check
npm run build
```

服务端实例config.toml：

```toml
[theme]
active = "paper"
```

可用FRONTEND_THEME覆盖实例缺省。后台“主题设置→已安装主题”提供实际已部署主题选择；保存并等待节点应用后生效。选“实例默认”才读取上述本地配置，否则后端extensions.theme优先。新增/修改主题源码后执行build:host或完整build并部署，启动协调器登记主题目录；全新主题不能在生产临时新增。

```sh
npm run build:host
npm start
```

npm start从var/cache/build/theme-catalog.json报告部署元数据。发布时一并保留此构建目录；不要在正式机器重新扫描源码推断已编译主题。也可按[插件指南](frontend-plugins.md)显式登记。多个启用节点登记一致ID/版本/父级后，选择器才允许切换；主题改动应更新语义版本并部署各节点。已安装主题的切换无需重建或重启，后台仍独立使用Argon。更多运行时验收见[本轮记录](../handoff/independent-plugins-verification.md)。

初版Paper与三层继承的历史验收见[原验收记录](../handoff/child-themes-verification.md)。Paper 2.0.0的精简展示和隔离四层继承检查见[精简验收](../handoff/paper-starter-verification.md)。
