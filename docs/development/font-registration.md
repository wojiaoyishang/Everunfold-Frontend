# 主题和插件的统一字体注册

版本：font-registration-1，2026-11-09。实现决定见[ADR0085](../decisions/0085-shared-font-registration.md)。字体业务代码统一放在src/core/fonts；上传字体的资源、数据库身份与site://media引用保持，未迁移用户文件。

## 共用声明

主题使用`@/core/fonts`，独立插件使用`@everunfold/plugin-sdk`，两者提供同一个defineFont、FontDefinition、fontStack和registeredFontFamily。注册是同步纯声明，不请求文件，不在进程全局追加可变状态。

```ts
import { defineFont } from "@/core/fonts";

export const bodyFont = defineFont({
  id: "my-theme.body",
  label: "My Body Font",
  fallbacks: ["system-ui", "Microsoft YaHei", "sans-serif"],
  faces: [{
    src: "/reference/fonts/my-theme/body.woff2",
    format: "woff2",
    weight: [300, 800],
    style: "normal",
    unicodeRange: "U+0000-00FF",
  }],
  license: "填写本字体实际的授权说明",
});
```

新静态字体建议统一放public/reference/fonts/<主题ID>/，保留授权文件，部署时随public复制。也支持HTTP(S)地址，外部服务需要字体CORS与正确MIME。媒体库、公式引擎与国旗的现有资源URL保持；统一的是注册、引用和字体业务模块，不复制或重写它们的存量文件。

ID使用命名空间。主题声明的ID须以主题ID加点开头，插件声明须以插件ID加点开头；共享系统项为system.sans、system.serif、system.mono。同ID不同定义被拒绝，重复的相同定义可复用。没有faces的声明是系统字体栈，不下载文件。CSS使用稳定别名ef-registered-<ID>，与上传字体ef-font-<UUID>分开。

## 主题使用

```ts
import type { ThemeDefinition } from "@/core/extensions/types";
import { bodyFont } from "./font";

export default {
  id: "my-theme",
  version: "1.0.0",
  parent: "argon",
  fonts: [bodyFont],
  typography: {
    body: "my-theme.body",
    heading: "my-theme.body",
    code: "system.mono",
  },
} satisfies ThemeDefinition;
```

字体不限定由插件注册。主题可直接声明fonts；typography按父到子合并三个角色，子主题只覆盖需要的项，null清除继承，省略保持继承。所有已构建主题的字体可被稳定ID引用，注册目录本身不下载文件。Paper在theme.ts注册paper.ui系统字体栈并使用以上角色，仍只保留声明和样式两个文件。

正文角色作用于前台主题容器，标题角色暴露--theme-heading-font；父主题以低优先级规则使用它，子主题/插件可继续覆盖。代码角色暴露--code-font-family，只在含代码的ContentMarkup中声明相应文件。用户在站点设置选择的上传字体优先于主题正文/标题默认；单独选择的上传代码字体优先于主题代码默认。正文选区字体继续按各自引用工作。

## 插件使用和独立打包

```ts
import { definePlugin, defineFont } from "@everunfold/plugin-sdk";

export default definePlugin({
  id: "example.cards",
  version: "1.0.0",
  setup({ fonts, components }) {
    fonts.register(defineFont({
      id: "example.cards.title",
      label: "Card Title",
      fallbacks: ["Georgia", "serif"],
      faces: [{ src: "asset:fonts/title.woff2", format: "woff2" }],
    }));
    components.register("example.cards.view");
  },
});
```

文件放在该插件fonts/title.woff2。asset:是构建声明，禁止上级路径和逃逸的软链接。独立编译器将字体写入完整内容哈希文件，加入manifest.assets并把字体目录中的源地址解析为/__plugins/assets/<目录>/<哈希文件>；运行目录不需要原字体源码。校验、原子发布、旧资源保留及dev自动编译沿既有插件机制。支持WOFF2/WOFF/TTF/OTF，包内单文件上限16MiB；上传字体的20MiB规则不变。

客户端在实际使用的位置声明资源：

```tsx
import { FontStyles, useFont } from "@everunfold/plugin-sdk/client";

export function CardTitle() {
  const font = useFont("example.cards.title");
  return <>
    <FontStyles ids={["example.cards.title"]} />
    <h2 style={{ fontFamily: font.family }}>A small story</h2>
  </>;
}
```

FontStyles仅生成所列可用字体的CSS，不preload、不调用FontFace.load；浏览器在文本实际使用字体时请求。所有文件声明固定font-display:swap，支持字重范围、样式及unicodeRange。useFont同时返回available/font，缺项返回可读系统字体栈；停用/移除插件后目录和声明消失，文章仍可读。useRegisteredFonts提供只读目录和按ID查询。

## 后台与部署

/admin/fonts展示独立的“已注册字体”目录，支持现有搜索和手动预览；代码条目不提供媒体编辑/删除。点击某项预览才声明其文件。原上传字体区及选择弹窗继续使用后端媒体记录，编辑器和站点设置的持久选择目前仍使用上传字体；不能把注册ID伪造成媒体UUID提交。

字体注册、主题默认与manifest可选字段属于前端能力，没有改后端设置契约或增加数据库迁移。旧插件包不含fonts字段也可继续校验，读取时不补字段影响旧哈希。使用字体SDK的新插件需部署本版宿主；修改宿主SDK/编译器后需重启dev协调进程，随后插件字体文件变更可无感自动编译和更新。主题字体声明随主体构建，生产新增主题字体仍需要主构建。

按需、热替换、来源删除与真实浏览器结果见[本轮验收](../handoff/theme-browser-paper-fonts-verification.md)。未承诺未测试浏览器、远程CDN或完整中文字体覆盖。
