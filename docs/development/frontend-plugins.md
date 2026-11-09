# 独立插件、页面与短代码开发

版本：frontend-plugins-9，2026-11-09。运行机制见[规范](../architecture/frontend-plugin-runtime.md)，主题另见[子主题指南](child-themes.md)。第一方示例为src/plugins/people、src/plugins/gallery及[荣誉页](honors-page.md)的src/plugins/honors；后者演示包内多语言表单、媒体选择及证书弹窗。

## 源码和命令

```text
src/plugins/example/
  plugin.ts          纯共享声明，setup统一注册贡献
  page.ts            页面身份、默认配置、语言能力
  schema.ts          设置模型
  components.tsx     浏览器具名组件表、可选activate
  render.tsx         页面或控件
  shortcode.ts       纯共享短代码渲染器
  *.module.css       插件样式
src/sdk/             宿主公共SDK实现
src/themes/          随主体编译的主题
plugins/example/     独立生产产物，被Git忽略
var/cache/plugins/   透明开发构建，被Git忽略
```

```sh
npm ci --ignore-scripts
npm run dev
npm run check
npm run build:host
npm run plugins:build -- --plugin people
npm run plugins:build -- --plugin people --output ./plugins
npm run build
npm start
```

dev绑定0.0.0.0，可追加-- --port PORT。首次启动准备契约和主题目录，然后逐个编译插件；个别插件编译失败不阻止主体启动。修改/新增/删除源码由监听器处理，不手动维护产物。普通插件开发无需运行第二个构建进程；改宿主SDK/编译工具本身后重启dev协调进程。插件删除只清除本开发进程管理的开发包，不清理其他部署产物。

build:host只构建主体和已有主题，不读取插件源码；plugins:build默认单独构建全部插件，也可重复--plugin指定多个目录。默认输出根plugins，--output可指定另一个部署根；--dev仅用于开发包，生产拒绝它。build是两次独立构建的串联。check包含插件独立类型检查和测试前包构建；CI不依赖未提交的本地产物。

## 注册声明

plugin.ts及其共享依赖不能使用DOM、React、Node专有模块或SDK/client；它们同时进入浏览器和Node。只使用公共SDK，不导入@/私有源码或跨出本插件目录。

```ts
import { definePlugin } from "@everunfold/plugin-sdk";
import page from "./page";
import { shortcode } from "./shortcode";
export default definePlugin({
  id: "example.feature",
  title: "示例功能",
  description: "示例页面和短代码",
  version: "1.0.0",
  setup({ pages, shortcodes, components }) {
    pages.register(page);
    shortcodes.register(shortcode);
    components.register("example.feature.page");
    components.register("example.feature.control");
  },
});
```

只调用需要的register。setup必须同步，不能稍后追加。页面/短代码定义只是对象，通过插件setup注册，不写顶层自注册副作用。包内及前端插件间的身份、调用名冲突会拒绝该包；后端部署登记另行检查已安装后端插件的调用名。前端主体不再保存后端内置名称表。数据库自定义短代码保留custom:命名空间，调用格式仍是`{{< name key="value" >}}`及容器结束标记。

版本用于语义兼容，不出现在目录名中；资源和构建摘要自动变化。页面registration.version变化后须核对已有发布快照及数据兼容，再显式保存/应用，不用改版本号触发缓存刷新。

## 页面、模型和额外数据

```ts
import type { CustomPageDefinition, SettingsModel } from "@everunfold/plugin-sdk";
const model = {
  fields: [
    { key: "intro", label: "介绍", component: "form.textarea", default: "" },
    { key: "visible", label: "显示", component: "form.boolean", default: true },
    { key: "people", label: "人物", component: "form.list", default: [],
      props: { maxItems: 300, addLabel: "添加人物", itemLabel: "人物" },
      fields: [
        { key: "name", label: "姓名", component: "form.text", default: "" },
        { key: "message", label: "寄语", component: "example.feature.control", default: "" },
      ],
    },
  ],
} satisfies SettingsModel;
export default {
  registration: {
    id: "example.feature", version: "1.0.0", title: "示例页", path: "/example",
    defaults: { intro: "欢迎", visible: true, people: [], extra: { any: [1, null] } },
    settings_schema: JSON.parse(JSON.stringify(model)),
  },
  component: "example.feature.page",
  settingsModel: model,
  localized: true,
} satisfies CustomPageDefinition;
```

options保存公开JSON，不限制为schema中的键；不得放密钥或私有数据。模型只描述表单，宿主处理保存、权限、修订和预览，不在插件中复制整页编辑流程。管理端优先用后端登记的settings_schema，缺省时使用本地模型。字段布局可以改变，未知控件显示占位，配置和JSON高级编辑仍可使用。

| 标准组件 | 主要props |
| --- | --- |
| form.text / form.textarea | maxLength、minLength、required |
| form.number | min、max；空值为null |
| form.boolean | 共享Switch |
| form.select | choices为字符串或value/label列表 |
| form.object | 递归fields |
| form.list | fields、maxItems、addLabel、itemLabel、emptyText |

localized:true由实现自行解释站点语言/前缀，同一配置生成代码页的各语言入口；内容不被自动翻译。手工HTML页面的独立译文沿原页面管理流程。

## React组件与SDK

components.tsx的default对象必须按声明名称导出组件，组件定义在模块顶层，不能在render中重新声明。正常import React/ReactDOM/JSX即可，编译器将它们连接到宿主单例。图片、视频和woff2可从本插件目录导入，输出为同源资产URL字符串，不是Next的StaticImageData；配套tsconfig.plugins.json使用SDK的独立资产声明。CSS Modules中的资源引用也使用插件自身路径。

```tsx
import type { CustomPageProps, FormFieldProps, PluginActivationContext } from "@everunfold/plugin-sdk";
import { TextArea, useLocale } from "@everunfold/plugin-sdk/client";
function Page({ page }: CustomPageProps) {
  const { locale } = useLocale();
  return <section lang={locale}><h2>{page.title}</h2><p>{String(page.options?.intro ?? "")}</p></section>;
}
function MessageField({ value, onChange, disabled }: FormFieldProps) {
  return <TextArea value={typeof value === "string" ? value : ""}
    disabled={disabled} onChange={event => onChange(event.target.value)} />;
}
export default { "example.feature.page": Page, "example.feature.control": MessageField };
export function activate({ onDispose }: PluginActivationContext) {
  const onResize = () => { /* 更新插件自己的布局信息 */ };
  window.addEventListener("resize", onResize);
  onDispose(() => window.removeEventListener("resize", onResize));
}
```

运行时等待模块、样式和一次React提交后确认组件已挂载。插件内部的异步资源应另设就绪状态，不能把通用包加载回执当成其业务数据已完成。

| SDK入口 | 已提供能力 |
| --- | --- |
| @everunfold/plugin-sdk | definePlugin及页面/短代码/模型/控件/数据/生命周期类型 |
| @everunfold/plugin-sdk/client | Button、TextField/TextArea、Form、Icon、Avatar、Select、Switch等共享控件 |
| 同上 | Modal、ConfirmDialog、Dialog、Popover、Toast、统一动效/焦点/退出机制 |
| 同上 | ExtensionComponent、ParentThemeComponent、useThemeComponent、SettingsForm、主题Portal作用域 |
| 同上 | useLocale、useLanguageCatalog、UiText、useT；插件可用当前locale管理自己的任意语言字典 |
| 同上 | 按需MediaPickerDialog；复用已有媒体权限、选择/上传队列，不授予额外权限 |
| 同上 | pageConfigurationSource、createPluginDataSource、readPageMetadata/savePageMetadata、管理请求上下文 |

activate可通过components.register补充清单中已声明的实现，通过onDispose释放资源。共享定义与组件模块顶层保持无持久副作用，避免每次热更新重复订阅。业务请求继续直达配置的FastAPI，SDK不提供内部Token、数据库连接或任意后端代码执行。

## 短代码

PluginShortcode包含definition、render及可选preview/classNames/mediaPicker。definition使用权威短代码参数协议，scope须匹配稳定UUID。render得到parameters、已格式化body、当前正文media及escape；参数插入文字时escape，最终HTML仍过公共allowlist/媒体校验。CSS限定本定义scope，仅使用时输出。preview用于目录样例，不替代真实参数校验。

mediaPicker声明参数名、图片类型、数量上限及文案，宿主据此提供媒体选择和当前区块插入。画廊是完整示例，核心没有按gallery名称写解析分支。插件目录项只读；数据库纯HTML/CSS模板仍由原后台短代码库管理。

## 部署、启停和主题选择

将独立包的整个plugins/<目录>复制到目标plugins根中，资源先到、manifest.json最后原子替换。保留旧的摘要资源，已有页面可能仍引用它们。不要把src/plugins源码当运行产物；生产启动不加载插件编译器或Babel开发依赖，也不在运行机器上编译插件源码；协调器沿用现有tsx执行宿主工具。使用与宿主协议兼容的SDK构建。

npm start除Next服务外运行清单协调器，按配置的FRONTEND_NODE_ID和[backend]内部连接登记元数据。后端须先显式升级0027_extensions，并已配置实际socket来源白名单及Next→FastAPI Token。只运行next start时不会自动登记，须自行运行协调器或显式登记：

```sh
npm run plugins:build
npm run themes:catalog
npm run extensions:register -- --node-id web-main --backend ../Everunfold-Backend
```

该命令只读已编译包，通过stdin调用相邻后端安装器；支持--config/--python。构建不写数据库；登记首次创建默认未启用页面，之后保留已有页面数据。pages:register保留为同一命令的旧名称，pages:manifest仍用于开发时查看页面声明。

后台“插件管理”切换开关后保存，后端用修订守卫并可靠同步至节点。“主题设置→已安装主题”选择主题并保存；已有主题无需重构建或重启。主题/插件未在所有启用节点登记一致描述/构建时，选择或重新启用返回提示，草稿保留。节点时间为最后登记记录，不能视为在线健康状态。

保存插件启停前，管理端查询当前应用的页面、已发布正文与定时发布冻结版本中的短代码引用。有使用时会列出插件、方向及数量，选择“继续并保存”或“取消”；取消或Esc会还原本批次插件开关，其他未保存设置保留，无使用直接保存。仅修改插件开关时，取消后恢复无修改状态；保存成功保持新开关状态。查询失败不会保存，缺少清单则显示人工核对提示；原部署/修订守卫不被绕过。历史草稿及脚本动态调用不在静态统计内，详见[ADR0083](../decisions/0083-plugin-activation-usage-confirmation.md)。

未启用或部署不可用插件的注册页面从“页面”列表隐藏，数据仍保留；重新启用后同一条目恢复。首次登记的页面只是未应用工作稿，不因插件缺省启用就自动公开。插件作者须保持贡献ID与调用名稳定，归属清单由独立构建产出，不额外维护第二张引用表。

生产阅读页取得更新包；正在打开的完整/嵌入编辑器提示重新打开，宿主草稿继续保留。开发兼容Hook状态尽量保留，修改Hook顺序/签名可能重置插件内部状态；重要编辑值应交给宿主字段onChange，不只存在组件useState。

## 缓存、版本与验证

| 内容 | 位置 | Git |
| --- | --- | --- |
| 契约入口和精确提交/SHA锁 | src/core/contracts、contracts.lock.json | 提交 |
| 契约类型/客户端/Schema | var/cache/contracts | 忽略 |
| 错误后备页/编译主题清单 | var/cache/build | 忽略 |
| 开发包/验证后不可变副本 | var/cache/plugins、var/cache/plugin-packages | 忽略 |
| 独立生产插件包 | plugins | 忽略 |
| 运行公开副本/已应用设置 | 原var/public-snapshots、var/settings | 忽略，位置不变 |
| 私有协作离线稿 | 浏览器IndexedDB | 不入Git |

根cache和src/generated不存在。契约恢复依旧校验锁定后端提交和SHA；私有未推送提交需要包含它们的后端checkout。产物不变时保留mtime，变化时原子发布。var/cache可在服务停止后重建，不要把var/settings、公开副本或用户数据当构建缓存删除。

npm run check覆盖类型、格式、注册不变量和包完整性/回退检查；npm run verify:admin在隔离副本中编译插件后删除其源码再构建主体，并验证公开/私有故障边界。设置PLAYWRIGHT_MODULE和CHROMIUM_EXECUTABLE可额外运行真实生产浏览器的后部署新增、热替换、编辑保护及生命周期检查。具体结果见[验收](../handoff/independent-plugins-verification.md)。

立即数据refresh、私有元数据、版本通知后重新鉴权及未来deferred消费者继续遵循[数据接口规范](plugin-data-protocol.md)。运行时包不意味着通用后端异步资源已经存在。可继续解耦评论、搜索和媒体展示；认证、事务、可靠投递与单一Y.Doc留在宿主。

## 字体注册

同步setup可fonts.register(defineFont(...))；客户端用FontStyles/useFont按ID引用。主题也可用同一defineFont在ThemeDefinition.fonts中注册。字体业务统一src/core/fonts，插件asset:字体按原哈希资产协议独立打包，支持开发热更新；系统栈不下载，文件只随实际引用加载。完整范例、文件约定与宿主更新边界见[字体指南](font-registration.md)。

## 验证码组件

[验证码指南](captcha.md)描述随项目提供的src/plugins/captcha、SDK CaptchaWidgetProps及后端验证接口。前端按components.register贡献具名组件，后端可信验证器通过app/plugins/*/plugin.py的setup登记，见[单入口后端SDK](backend-plugins.md)。本文src/plugins和产物plugins均指前端仓库；后端根plugins旧占位已删除。


## 后端模板协作

后端注册的纯HTML/CSS模板通过可靠设置流的PublicSettings.shortcodes抵达节点，前端按当前应用目录解析，不在contracts缓存生成已安装短代码清单。前端贡献继续负责自定义渲染和交互，后端模板只读。管理端ShortcodeCatalog.applied提供编辑器所需的已应用模板，普通编辑者无需settings:read权限；草稿模板不会提前影响插入和预览。运行时类名白名单与当前插件目录同步更新，避免晚加载、热替换或停用后使用过期清单。
