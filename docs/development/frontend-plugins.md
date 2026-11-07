# 前端插件、主题和设置表单开发

版本：frontend-plugins-2，2026-11-07。当前实现见ADR0077，数据接口见[独立规范](plugin-data-protocol.md)。

## 目录与自动发现

```text
src/plugins/
  people/
    plugin.ts          插件身份和同步setup；贡献页面/组件
    page.ts            页面身份、缺省配置、语言能力
    schema.ts          设置模型，不写表单JSX
    components.tsx     具名组件实现表
    render.tsx         公开人物页
    message-field.tsx  插件自定义控件，复用主题textarea
    message.tsx        寄语弹窗和有限烟花
    *.module.css       该插件的样式
  gallery/
    plugin.ts          setup贡献短代码
    shortcode.ts       定义、参数、渲染、样例和媒体选择
    styles.ts          仅使用时输出的作用域CSS
src/themes/argon/
  theme.ts             主题身份与提供的组件名
  components.tsx       具名组件实现表
  forms/               标准控件及主题样式
src/core/
  extensions/          原生发现、主题hook、组件加载和占位
  plugins/             同步贡献收集、身份/重名守卫
  forms/               模型、递归渲染和值更新
  contracts/           稳定业务契约访问模块
  plugin-data/         数据驱动接口和管理配置拉取适配器
```

仅扫描`src/plugins/*/plugin.ts`与`src/themes/*/theme.ts`。使用当前Next.js/Turbopack的原生import.meta.glob，生产/开发都支持；不适用于改用webpack。组件按各目录`components.tsx`懒加载。新增插件/主题只新增自己的目录，没有中央生成注册文件。目录名用小写字母/数字/连字符，身份使用稳定命名空间；纯声明入口不导入组件、CSS或浏览器API。Node CLI/测试使用同一目录规则的进程内适配器，不写生成源文件。

## 插件声明

```ts
import type { FrontendPlugin } from "@/core/plugins/types";
import page from "./page";
import { shortcode } from "./shortcode";

export default {
  id: "example.feature",
  version: "1.0.0",
  setup({ pages, shortcodes, components }) {
    pages.register(page);
    shortcodes.register(shortcode);
    components.register("example.feature.page");
    components.register("example.feature.control");
  },
} satisfies FrontendPlugin;
```

只调用需要的能力。setup必须同步，关闭收集后不得再注册；重复插件ID、页面ID/路径、短代码ID/调用名是清单错误，构建检查明确失败。后端内置短代码名称/ID保留，自定义数据库模板保留custom:命名空间。没有远端代码下载或后台安装npm包。

## 页面声明与部署

页面贡献类型为`CustomPageDefinition`，包含registration（后端PageRegistration）、component（具名实现）、settingsModel（可选模型）、localized（是否使用站点语言路径）。保持ID和版本稳定，版本不一致或整个实现未部署继续503；只是某个展示控件缺失时显示占位。

registration支持defaults与开放settings_schema。现有人物页把schema序列化给settings_schema，默认值来自模型；后端仅保存JSON，不限制组件名。首次登记创建默认工作稿，后续登记保留已有配置。页面路径、状态、人员等保存/应用后沿原可靠完整快照同步。

```sh
npm run prepare:local
npm run pages:manifest
npm run pages:register -- --node-id web-main
```

第一条恢复构建产物并验证源代码声明；第二条只打印可审阅JSON；第三条显式通过stdin调用相邻后端`.venv`中的安装器。可传`--backend PATH --config PATH --python PATH`；配置中的环境变量需在调用前准备好。为各启用节点登记一致版本，构建/开发本身不写数据库。没有registrations目录。

编译后可修改配置、已注册控件的模型/字段布局与页面路径等：模型经后台声明下发，管理端优先读取registration.settings_schema；未下发模型时才使用本地模型。新增React/TypeScript组件实现仍需构建部署。未知组件可以先保留配置并用JSON编辑，安装匹配实现后再展示，不能把组件名当任意模块路径。

## 模型、主题hook与自定义组件

```ts
const schema = {
  fields: [
    { key: "title", label: "标题", component: "form.text", default: "" },
    { key: "enabled", label: "显示", component: "form.boolean", default: true },
    { key: "people", label: "人物", component: "form.list", default: [],
      props: { maxItems: 300, addLabel: "添加人物", itemLabel: "人物" },
      fields: [
        { key: "name", label: "姓名", component: "form.text", default: "" },
        { key: "message", label: "寄语", component: "example.feature.control", default: "" },
      ],
    },
  ],
};
```

`component`是开放字符串，不需要扩展后端枚举。`SettingsForm`负责递归值更新；模型未声明的键、嵌套额外值和显式null保持。主题实现通过`FormFieldProps`接收field、value、onChange、disabled和renderFields。JSON高级模式与表单修改同一配置；无效JSON保留源文、禁用保存/应用，项目内离开会确认。

| 标准组件名 | 主题实现及主要props |
| --- | --- |
| form.text / form.textarea | 共享AccountField；maxLength、minLength、required |
| form.number | 数字输入；min、max；空值为null |
| form.boolean | 共享Switch |
| form.select | 共享Select；choices为字符串或value/label列表 |
| form.object | 按fields递归编辑对象 |
| form.list | 按fields编辑对象列表；maxItems、addLabel、itemLabel、emptyText |

`useThemeComponent(name, props)`返回已解析的React节点，或直接使用`<ExtensionComponent name="..." {...props}/>`。主题（含基础主题）负责已有控件样式，插件补充新名称；`ThemeComponentsProvider`可为局部界面选择已发现主题的控件表。组件类型在模块装配时固定，输入变化不会重新创建组件/丢失焦点。公开阅读与授权前台预览现在通过父子主题选择组件、可组合模板与插入钩子；后台上下文仍独立。详见[子主题指南](child-themes.md)与ADR0078。

主题新增控件时在theme.ts的components列出名称，并在components.tsx的default对象提供同名实现。插件使用components.register声明并提供自己的components.tsx。未注册名称、没有实现的声明显示“组件暂不可用”及名称；不会删配置或让整个表单白屏。插件自定义寄语控件`people/message-field.tsx`是可运行示例：内部通过主题textarea组合，实现计数，页面schema只引用core.people.message。

## 短代码贡献

`PluginShortcode`同时包含definition、render、可选preview/classNames/mediaPicker。definition沿权威短代码参数协议，scope须与稳定UUID一致。宿主由这一次贡献派生正文解析和后台只读目录，主题/核心不按gallery名称写分支。

render获得parameters、已格式化body、当前正文media及escape。参数插入文字时使用escape，最终HTML仍走公共allowlist与媒体解析；classNames只为需要的类显式授权。CSS保留该定义作用域、仅实际使用时输出。preview用于目录空态示例，不允许替代真实插入时的参数/媒体校验。mediaPicker只声明参数、图片类型、限额和文案，宿主复用原媒体权限/选择/上传/引用保护。

## 产物与缓存

| 内容 | 位置 | Git |
| --- | --- | --- |
| 稳定契约入口与精确提交/SHA锁 | src/core/contracts、contracts.lock.json | 提交 |
| 类型/客户端/Schema和派生目录数据 | cache/contracts | 忽略 |
| 主题HTTP错误后备文档 | cache/build | 忽略 |
| 运行公开内容和已应用设置副本 | 原var目录 | 忽略，未迁移 |
| 私有协作离线稿 | 浏览器IndexedDB | 不进入仓库 |

不存在src/generated。恢复优先读取EVERUNFOLD_BACKEND_PATH（缺省相邻后端）的锁定Git对象，其次校验已有本地产物；缺少时可下载该精确GitHub提交的Schema，必须通过SHA验证。私有/未推送提交需提供包含它们的后端checkout，不以最新分支替代锁定提交。`contract:sync`仅接受已提交后端契约并更新锁文件；首次安装后先prepare/check再开发。

生成器内容未变时保留mtime，变化时原子发布，避免检查命令反复触发开发编辑器重载。不要把cache添加到Git；当前版本已从Git移除旧生成目录，历史提交保留。

## 数据与后续拆分

`pageConfigurationSource(baseUrl).refresh({pageId})`立即读取授权工作稿配置，只返回options/修订/时间，不写公共缓存。数据驱动的通知、等待、取消/超时接口见独立规范；真实deferred后端操作需要插件实际后端资源及契约，不因有接口类型就自动存在。

下一步优先把评论/互动、搜索展示、媒体/附件展示、代码/公式等可选展示能力按实际消费者拆分；认证、权限、主库事务、审计与可靠投递保留宿主。现有块编辑器继续沿单一Y.Doc和既有适配接口，不另建文档或保存流程。
