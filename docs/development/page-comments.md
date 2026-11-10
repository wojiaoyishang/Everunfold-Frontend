# 自定义页面评论与插件 SDK

版本：page-comments-2，2026-11-10。适用于后台创建的 HTML 页面与插件注册页面；决策见 [ADR0096](../decisions/0096-managed-page-comments-and-plugin-sdk.md)。页面编辑、应用和沙箱规则沿用[页面指南](pages.md)，验证码规则沿用[验证码指南](captcha.md)。

## 后台与发布行为

页面通用设置提供“允许评论”开关，对 HTML 页面和注册页面均有效。`PageValue.comments_open` 默认 `true`；历史页面缺少此字段时也按开启处理，保持原有评论行为。开关随页面工作稿保存，与标题、路径、源码和插件配置使用同一套版本检查及保存接口。

- “保存草稿”只保存工作稿，不改变当前前台的评论开关。
- “保存并应用”发布当前配置；页面启用时，新的评论开关随应用快照生效。
- 关闭评论只禁止新评论和回复，不删除已审核通过的历史评论。页面仍公开且通过阅读门禁时，历史评论可以继续阅读；既无历史评论又关闭评论时，不显示空评论区。
- 停用、回收页面或撤销阅读权限仍按页面本身的可访问性处理，关闭评论不能绕过这些限制。

完整编辑器、实时预览左侧编辑器共用页面组件。切换开关会进入原有未保存状态，右侧预览使用当前草稿；预览不会替作者自动保存或应用。

插件的 `registration.comments_open` 只决定首次登记并创建该页面时的初值。之后重新登记插件、修改版本或热更新，不覆盖管理员已经保存的开关；管理员在页面通用设置中维护当前工作稿。

## HTML 页面与可信注册页面

后台输入的 HTML、CSS、JavaScript 继续运行在不透明来源的独立 iframe 沙箱内。公共评论区由站点宿主渲染在 iframe 外部，不把管理会话、验证码响应或阅读凭据交给用户脚本。HTML 中自行添加的选择器不能把站点评论区拖入沙箱，也不能使用 React 插件 SDK。

可信前端插件可以复用宿主评论区、指定放置位置，或自行实现评论 UI。页面登记仍通过插件的 `setup({ pages })` 调用 `pages.register(definition)`，不添加另一套中央注册表。`comments` 是前端 `CustomPageDefinition` 中的放置声明，与同步给后端的 `registration.comments_open` 分开：前者控制位置，后者只提供初始业务值。

```ts
import type { CustomPageDefinition } from "@everunfold/plugin-sdk";

export default {
  registration: {
    id: "example.guestbook",
    version: "1.0.0",
    title: "留言簿",
    path: "/guestbook",
    comments_open: true,
    defaults: {},
  },
  component: "example.guestbook.page",
  comments: { placement: "manual" },
} satisfies CustomPageDefinition;
```

放置声明支持：

| 声明                                                       | 行为                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 不声明 `comments`，或 `{ placement: "auto" }`              | 默认在页面末尾展示宿主评论区；页面内存在评论锚点时使用锚点                   |
| `{ placement: "manual" }`                                  | 由组件放入 `PageComments` 锚点；无锚点时不自动追加，适合完全自行实现评论 UI  |
| `{ placement: "auto", selector: ".guestbook-comments" }`   | 将宿主评论区放入该页面正文内的目标元素；目标尚未出现或选择器无效时回退页尾   |
| `{ placement: "manual", selector: ".guestbook-comments" }` | 使用选择器指定位置；找不到目标时同样回退页尾，避免配置目标缺失时丢失评论入口 |

`PageComments` 锚点优先于 `selector`。选择器只查询当前页面的 `data-managed-page-body` 范围，不允许选入站点导航、后台、iframe 或评论区本身。异步页面稍后加入目标元素时，宿主会移动同一个评论容器，保持表单输入、验证码与焦点，不重新创建多份评论区。一个页面只放一个锚点；多个锚点使用第一个，不产生重复的评论 ID。

最小组件只需放入锚点，不必自己接管请求或验证码：

```tsx
"use client";
import { PageComments } from "@everunfold/plugin-sdk/client";

export default function GuestbookPage() {
  return (
    <section>
      <PageComments className="guestbook-comments" />
    </section>
  );
}
```

`PageComments` 只提供锚点，实际 UI 由宿主的 `public.page.comments` 组件提供。它必须位于宿主托管的页面上下文内，不能拿到普通后台或任意 React 根节点单独使用。

标准主题评论表单在点击发送后才按需加载验证，必要时使用项目小窗；不在页内预留验证码空间。成功/失败/发送中使用颜文字横幅，失败保留输入。该流程同用于文章、说说与页面；自行实现UI的插件仍自行决定视觉流程，见[验证码指南](captcha.md)。

## 自行实现评论 UI

从 `@everunfold/plugin-sdk/client` 导入以下接口。自定义 UI 必须使用 SDK 的共享表单与 `Button` 等控件，提供请求中的禁用状态、错误提示和重试，不能只渲染一个直接发送请求的裸按钮。

| 接口                                                    | 作用                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `usePageComments()`                                     | 读取宿主上下文：`page`、`pageId`、`path`、已下发的 `comments`、`open`、`preview`、可选 `readReceipt` 与 `baseUrl`；不主动发请求 |
| `usePageCommentClient()`                                | 在相同上下文上增加 `captcha`、`canSubmit`、`read(page?, pageSize?, options?)` 和 `submit(input, options?)`                      |
| `CaptchaField`                                          | 以 `<CaptchaField control={client.captcha} />` 复用本地或插件验证码 UI；控制器由 `usePageCommentClient()` 提供                  |
| `useCaptcha`、`readPageComments`、`submitReaderComment` | 较低层接口，供需要完整控制请求流程的实现使用；调用者仍需遵守阅读门禁、评论开关、预览和幂等规则                                  |

`usePageCommentClient().submit` 接收 `{ author, body, parent_id? }`。客户端自动使用当前页面 ID、当前阅读凭据、验证码与稳定 `operation_id`；同一输入失败重试沿用操作 ID，成功后重置，完成请求后刷新验证码。提交结果为“待审核”，不能直接作为已公开评论插入历史列表。调用者维护提交中的状态与错误展示，并在 `canSubmit` 为 false、`open` 为 false 或 `preview` 为 true 时禁止提交。

`read()` 返回分页的已审核评论，调用者自行维护页码、加载状态和结果；初始页面已下发的评论可直接从上下文读取，不必在挂载时重复请求。`options` 沿用宿主请求选项，例如通过 `signal` 取消卸载后的请求。需要完全定制 UI 时，将页面声明为 `placement: "manual"`，不放 `PageComments`，避免自定义 UI 与宿主表单同时出现。

## 分页读取与阅读凭据

SDK 的 `readPageComments` 使用 `POST /v1/reader/page-comments`，请求体是：

```json
{
  "id": "页面 UUID",
  "page": 1,
  "page_size": 50
}
```

受阅读验证码保护的页面，在完成 `POST /v1/reader/access-page` 解锁后，由宿主通过上下文传入 `readReceipt`；客户端把它作为请求体的 `read_receipt` 发送。该端点是只读操作，使用 POST 避免把阅读凭据写进 URL。后端按页面当前公开状态、阅读策略和阅读凭据验证权限，只返回已审核评论。`page_size` 还受站点 HTTP 分页上限约束。提交评论继续使用现有 `POST /v1/reader/comments`，不另建页面专用写入口。

阅读凭据是短期、不可解释的授权证明，绑定目标、请求来源和策略；服务端保存其摘要对应记录并带过期时间。前端只在当前组件内存中保留，不能写进 localStorage、IndexedDB、公开快照、HTML、URL、插件配置或日志。验证码答案和响应也保持内存态。凭据过期或页面策略改变时，保留用户输入、提示重新解锁，不能无限重试旧凭据。页面关闭评论后，持有先前凭据也不能继续提交。

## 预览、安全与主题覆盖

预览中 `preview` 为 true。宿主共享评论区只展示可用历史与预览提示，不发起评论验证码、点赞或提交请求；`usePageCommentClient().read()` 与 `submit()` 在预览中拒绝执行。自定义组件也应优先读取 `preview`，不主动调用低层接口绕过这一行为。这里的“零请求”针对评论互动，不表示页面素材或插件自身完全不加载资源。

评论开关和 UI 禁用只是体验层，后端仍重新检查已应用页面、阅读策略、评论开关、验证码及回复目标。验证码通过不等于评论自动通过审核；服务不可用或授权过期时保持拒绝，不能降级成匿名直发。页面撤回或策略改变后，旧的幂等提交回执也不能越过最新准入检查。

父子主题可覆盖 `public.page.comments`，并通过 `usePageComments()` 读取上下文，或用 `ParentThemeComponent` 包装父实现。覆盖组件不接收整份站点快照，不从沙箱读取私有数据；完整替换时继续遵守 `open`、`preview` 与 `readReceipt`。需要直接复用标准评论表单的插件优先使用 `PageComments`；仅改样式可沿用主题链与现有评论样式，不重复实现验证和提交逻辑。

本指南描述实现契约，不代替实际检查记录；部署检查结果由本阶段交接文档单独记录。
