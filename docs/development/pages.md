# 页面管理与实时预览指南

版本：pages-runtime-2，2026-11-06。产品边界见[页面架构](../architecture/registered-pages.md)和[ADR0072](../decisions/0072-managed-pages-and-people-messages.md)。

## 管理页面

在后台“页面”查看来源、启用状态、草稿/应用修订，按标题或路径搜索。新建自定义页面，输入标题和站内绝对路径，分别编辑HTML/CSS/JavaScript。页面和JavaScript默认关闭；“保存草稿”不影响公开内容，“保存并应用”才更新入口；关闭启用后“保存并停用”。改址后旧路径失效，不产生别名。

JavaScript仅在独立沙箱内运行；开启后每次持久修改需当前管理员密码。沙箱没有同源权限，不能直接操作站点DOM或调用管理Session。脚本关闭时HTML事件也关闭。HTML/CSS不进入管理页文档，文章/短代码继续保留原安全过滤。

注册页标记“前端注册”，只能维护暴露选项和通用设置。当前“一路有你”支持页面介绍、姓名云/人物卡片、显示搜索及人物姓名、分组、头像地址、寄语和顺序。姓名必填；人物数量上限300、姓名/分组80字、寄语5000字。没有真实人员种子数据；注册组件不可在后台改源码。

回收自定义页面会停用并保留源码；恢复后仍停用。注册页可停用，通过代码部署维护清单，不能在后台删除登记。界面提示版本冲突时输入保留，可读取服务器版本后核对；不要重放过期版本或覆盖他人修改。

## 预览入口

普通编辑页将预览、保存、发布/应用放在顶部同一操作组，下滑时一起进入固定导航，上滑后归位；返回页面列表在左侧。文章/说说采用相同规则，键盘焦点和按钮状态保持，见[验收](../handoff/editor-actions-dock-verification.md)。

小图标旁的文字区分“前台预览”和“实时预览”，悬停有用途说明。页面前台预览可展示当前未保存输入；文章/说说沿原保存/ACK准备后预览。

实时预览打开独立工作界面：左侧编辑、右侧实际前台。顶部左侧用退出图标进入完整编辑器新窗口；保存和发布在右上角。控件直接调用当前编辑会话，页面仍需显式保存/应用，文章/说说仍实时持久化；公开发布都需明确操作。

拖动分界线调整左侧宽度；聚焦分界线用左右键16px微调，Shift为64px，Home/End移到边界，双击恢复390px。左侧限制300–720px并保留右侧空间。电脑视图自适应，iPad上限820px，手机上限390px；可用空间不足时自动适配。设备切换和宽度调整不重建编辑窗口。窄屏用“显示编辑器/查看页面”切换，不丢弃输入。

预览窗口内编辑涉及离线、合并或权限变化时遵循原文章流程；预览不绕过只读/合并锁，不自动发布、不提交浏览/点赞/评论。主编辑页不再嵌入页面的即时预览或双栏，复杂内容保持隔离。

## 登记新的可信组件

1. 在可信前端仓库声明`PageRegistration`，在`src/core/pages/registry.ts`装配实现版本，并在主题渲染层显式选择组件。不能填写任意模块路径。
2. 运行`npx tsx tools/export-page-manifest.mts`，审阅`registrations/pages-v1.json`；提交组件和清单。
3. 后端显式迁移到`0024_page_internal_metadata`；针对每个配置的启用节点安装清单：

```sh
uv run --locked python -m tools.register_frontend_pages \
  --config config.toml --node-id web-main \
  --manifest /path/to/Everunfold-Frontend/registrations/pages-v1.json
```

4. 各启用节点部署匹配实现/清单后，在后台填配置并应用。清单缺失/不同不能启用；旧数据保留。首次默认路径冲突会生成安全缺省路径，管理员可再改。

仅部署命令能登记后端验证Schema。浏览器创建清单、在线安装插件、自动选项迁移不在本轮范围。声明公开选项时不要放私有内部数据。

## 内部元数据接口

pages1.1.0提供管理Session专用接口：

| 方法/路径 | 权限与行为 |
| --- | --- |
| GET `/v1/admin/pages/{page_id}/metadata` | pages:read；返回page_id、独立revision、JSON对象value；初值revision0/空对象 |
| PATCH 同路径 | pages:write、精确Origin/CSRF；请求expected_revision、operation_id、value；成功递增内部revision，来源页面修订保持 |

请求包含JSON封装的HTTP上限64KiB；非有限数值拒绝，元数据不是源码执行入口。相同操作ID/载荷重试返回原回执；过期修订返回40999，输入应保留、重读、合并后用新操作ID提交。更新与回执、审计同事务，不发布公开快照。回收保留元数据，但须恢复页面才能修改。

从后端已提交契约生成的前端客户端使用示例：

```ts
import { readPageMetadata, savePageMetadata } from "@/generated/pages-client";

const current = await readPageMetadata(baseUrl, pageId, { signal });
await savePageMetadata(baseUrl, pageId, {
  expected_revision: current.data.revision,
  operation_id: crypto.randomUUID(),
  value: { ...current.data.value, import_cursor: "next-record" },
}, csrfToken, { signal });
```

客户端供已授权管理表单使用；普通访客和自定义iframe脚本不能调用此管理能力。私有元数据不包含在页面目录/详情或公开DTO中，不存公开前端副本；需要时单独私有读取。现有页面设置只在应用后进入公开`public-content`完整快照，继续由已有接收器及文件存储维护版本、失效与离线读取。无需新增“任意缓存键/任意后端URL”接口。
