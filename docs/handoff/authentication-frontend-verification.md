# 登录与空后台验收

日期：2026-10-31（Asia/Shanghai）。对应 [ADR 0018](../decisions/0018-authentication-and-admin-entry.md)；前端功能提交 `0ab5aee`，后台排版修订 `01be282`。本记录区分已实现、已执行和未执行项，不替代后端 PostgreSQL、多进程或生产 HTTPS 验收。

## 契约与实现

- 生成客户端锁定后端 `ce825d0d83bb7f0894109debd8231a798f9161f6` 的 `auth-v0.1.schema.json`，规范 SHA256 为 `a22eb8952bde4f5ae339b7e1cd322961600dcb5b360856e93802df4396b9eaa6`。
- 公开博客迁入 `(blog)`，管理入口使用 `(management)` 下的 `/login` 与 `/admin`。管理路由不读取公开快照，不挂载 `BlogShell`，不进入公开阅读软导航或预取。
- 登录页具备真实 Session 检查、用户名/密码提交、提交中禁用、错误提示、CSRF 轮换、失败重试、密码显隐和减少动态；登录后的 `next` 只接受本站 `/admin`。
- `/admin` 在服务端只输出“正在确认登录状态”。浏览器取得后端当前管理员身份后才显示真实显示名、用户名、角色、退出和返回站点；没有假统计、文章或媒体操作。
- 管理页和认证响应使用 `private, no-store` 与 `noindex, nofollow`。身份、CSRF 和 Cookie 不写入 `localStorage`、URL 或公开快照；退出必须等待有效的匿名 Session 响应。
- 登录页和管理员身份确认抽取为共享 `ManagementEntry` 卡片，等待、失败、重试和退出状态不改变页面宽度或撑满视口。
- 管理员校验通过后进入主题化后台：顶部站点栏、左侧管理导航、右侧仪表盘工作区及其分栏只参考 WordPress 的排版信息组织，不复制其配色、品牌、字体或控件外观。当前唯一导航是仪表盘，工作区内容为空。
- 认证入口背景采用用户提供的确定性 Canvas 夜景，导出为 2560×1600 WebP（67,952 bytes，SHA256 `adc1e8bd…e628288`）。源 Canvas 在导出前已对整个星空、山脊、松林、帐篷、篝火、地面与烟雾统一施加柔焦；应用内再叠加轻微轨道漂移、亮星闪烁、单条间歇流星、火光呼吸、火星和萤火，登录卡片本身不模糊。

## 已执行检查

- `npm run check`：错误页产物一致性、ESLint、Next typegen/TypeScript、Prettier 和 79 项测试全部通过。新增测试覆盖管理路由边界、`/admin` 返回路径、凭证请求、CSRF 轮换、无自动重试、异常 Session 拒绝及密码控件语义。
- `npm run contract:sync -- <backend/contracts/auth-v0.1.schema.json>`：成功生成类型、Schema、来源和客户端；生成 Schema 的本地 SHA256 与记录值一致。
- `npm run verify:reader`：独立临时副本生产构建通过；真实 FastAPI 停止后，有缓存公开文章继续 200，空缓存公开页面 503/no-store/noindex；`/login` 与 `/admin` 仍为 200/private/no-store/noindex，二者都从共享紧凑入口卡片开始，无公开壳、无 SSR 管理员工作区、无认证字段泄漏。原始公开快照逐字节未变。
- `npm run verify:http -- http://127.0.0.1:3000`：26 个公开页面、搜索、分页、分类/标签、示例详情、真实文章及 404 检查通过，说明路由拆分没有破坏公开博客。
- 真实 FastAPI `8001` 与本地 PostgreSQL：来宾 Session 获取、正确登录、CSRF 轮换、`/v1/admin/session` 管理员读取、退出和退出后匿名检查均为 200；允许来源返回精确 CORS Origin。

## 真实浏览器检查

使用本机 Edge 157.0.4341.30 的无头 Chromium/CDP 会话，前端 `127.0.0.1:3000` 直接请求后端 `127.0.0.1:8001`。原生可见浏览器自动化因工具无法可靠确认当前 URL 被安全终止，未把该工具失败当成页面失败；实际交互由同一浏览器引擎通过 CDP 完成。

- 错误密码停留在 `/login`，显示“用户名或密码不正确”，清空密码并把焦点返回密码框；随后使用本地默认管理员重试成功进入 `/admin`。
- 管理页显示真实显示名、用户名与管理员角色，返回站点目标为 `/`，退出后回到 `/login`，管理员工作区消失。
- 访问 `/login?next=https%3A%2F%2Fevil.example%2Fpwn` 时最终仍位于本站 `/admin`，没有跳往外站。
- 仅阻断浏览器到 `127.0.0.1:8001` 的请求后，登录页显示明确连接失败和重新检查按钮；解除阻断并点击重试后恢复登录表单。
- 密码显隐按钮实际把输入在 `password`/`text` 间切换，并同步 `aria-pressed` 与 `aria-controls`。
- “减少动态”下登录卡片动画为 `none`，控件过渡为 `0s`；深色主题、桌面 1440x1000、390x844 和 320x740 均无横向溢出，固定格式控件没有改变布局。
- 后续排版修订使用正式开发库中的 `admin` 管理员验证：阻断认证 API 时，`/admin` 在登录卡片内显示失败和重试，不再出现整页空白大面板；恢复后登录进入 `/admin`，顶部栏为 1428px、左侧导航 184px、右侧工作区有 3 个真实空状态分区。
- 390px 和 320px 下后台导航转为横向排列，工作区单列展示，文档宽度均等于视口且无横向溢出；深色主题沿用 Everunfold 主题变量。退出后回到 `/login`，管理员工作区消失。
- 星空营地背景实测确认：WebP 原始尺寸为 2560×1600 并成功加载；完整动态下场景轨道、15 个亮星、1 条流星、火光呼吸、4 个火星和 4 个萤火均运行。源画面已柔焦，应用层再使用 `blur(0.6px)` 与动态层 `blur(0.8px)` 统一画面，登录卡片 filter 为 `none`。390px 无横向溢出，深色主题正常；减少动态时场景轨道、亮星、火光动画均为 `none`，流星保持隐藏。
- 登录与后台截图保存在忽略目录 `var/qa/`：早期截图，以及本次 `admin-gate-card.png`、`admin-wordpress-layout-desktop.png`、`admin-wordpress-layout-mobile.png`、`admin-wordpress-layout-320.png`、`admin-wordpress-layout-dark.png`、`login-starry-campfire-desktop.png`、`login-starry-campfire-mobile.png`、`login-starry-campfire-dark.png`。

## 未执行与限制

- 未执行 Safari、Firefox、真实移动硬件、触摸键盘和强制颜色模式的浏览器实操；CSS 提供系统减少动态和强制颜色回退，但不等同上述平台验收。
- 未执行生产 HTTPS、跨站 Cookie/SameSite 域名组合和真实部署来源矩阵；本机使用 `127.0.0.1:3000` 到 `127.0.0.1:8001` 的精确 Origin 跨源流程。
- 当前管理员页在首次校验、页面恢复/聚焦和管理写入前复核 Session；没有持续心跳。服务端主动撤销后，已有静态界面要到下一次聚焦、刷新或受保护操作才会发现。
- 注册、找回/改密、2FA、用户管理、文章/媒体后台写入、审计管理界面和可靠任务仍未实现，不能由当前空后台推定已交付。

本轮只创建前端本地提交，未 push。
