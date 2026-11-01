# 后台工作空间开发与验证

版本：admin-workspace-1，2026-11-01。设计依据为 [admin-ui-2](../architecture/admin-ui.md) 和 [ADR 0021](../decisions/0021-admin-theme-and-workspace.md)。

## 当前可以使用

正常前后端启动后访问 `http://127.0.0.1:3000/admin`。使用已初始化的真实管理员登录；当前账号及角色来自 FastAPI。无明确返回地址时管理员进入工作台；直达内容/媒体页会保留安全返回目标。通用登录页仍服务普通账号。

- 工作台：当前账户、可用能力状态、内容与媒体入口。
- 内容：文章/说说共用页面模式，表格、工具栏及明确准备状态。
- 媒体库：文件分类工具栏与准备状态。
- 顶栏可访问站点、修改后台外观、退出；左侧按钮收起/展开侧栏。860px 以下使用封装 Dialog 抽屉，支持 Esc、焦点返回和关闭后恢复页面滚动。
- 后台外观支持跟随系统/浅/深，舒适/紧凑间距。按后端地址与账号保存，仅包含外观；不会读取前台字号/滤镜当后台配置。

内容查询、筛选、分页、编辑、保存、发布和上传未实现；对应控件禁用，页面明确准备中，不把“未查询”显示为 0 条或空媒体库。未接管理端业务，不新增业务 Schema，不把公开快照作为私有列表后端。

## 维护入口

- `src/app/(management)/admin/layout.tsx`：读取服务端配置；`workspace.tsx`：组合会话与主题。
- `src/core/admin/navigation.ts`：三个已注册目的地，同时用于安全登录返回白名单。新增路由要同步登记和私有代理验证；权限仍在后端。
- `src/core/admin/use-admin-access.ts`：复用 useSession，集中退出/失败/401 回跳；主题不得另发身份请求。
- `src/core/admin/preferences.ts`：本地偏好 v1 校验与命名空间；`use-admin-preferences.ts`：浏览器保存/跨标签同步。
- `src/themes/argon/admin`：布局、展示页、共享页面组件及四份后台样式。业务页面只拼组合，不复制壳。
- `src/themes/argon/auth`：通用登录展示；原 management 混合目录已迁移。
- `src/themes/argon/components/ui`：继续使用 Button/Select/Popover/Dialog 等；代码路由使用新 RouteLink，公开阅读继续用 AppLink。

公开 CSS 客户端导航后可能保留。任何新的 html/body 根选择器须明确排除 admin，弹层应保留在 admin DOM 范围内继承 token；不能直接把新 Portal 挂 body 丢失展示上下文。后台只跟随系统减少动态，公开阅读“全站动效”选择属于 public 区域。

## 检查方法

```powershell
npm run check
npm run verify:admin
```

第二项先在工具创建的临时目录生产构建，再启动独立端口的 Next 与固定返回 503 的测试后端；不复制实际 config 或公开快照、不启动/迁移数据库、不停正常 3000/8001。断言 login 和三个后台入口在无公开缓存时仍是 200 匿名壳、private/no-store/noindex，SSR 未输出当前账户且未读取公开后端。工具自动结束自己启动的进程并清理自己的临时树。

浏览器依次检查：直达内容页→登录→返回内容，三页切换，刷新，折叠与偏好保存，后台→前台→返回，390/320px 抽屉与弹层，退出后再直达后台。内容/媒体正式接入后补权限、失败、竞争、保存、上传和持久事务测试，不能以本轮结构测试代替。
