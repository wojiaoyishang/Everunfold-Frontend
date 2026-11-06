# 动态请求开发与联调

版本：reader-requests-3，2026-11-06。初版见 [ADR 0014](../decisions/0014-page-registered-reader-requests.md)；阅读反馈与匿名点赞见 [ADR 0015](../decisions/0015-reader-feedback-and-comment-likes.md)、[本轮验收](../handoff/reader-feedback-verification.md)。

## 当前账号入口

2026-11-06按[ADR0070](../decisions/0070-header-account-entry-and-avatar-readiness.md)把真实账号入口放到右上角云端面板，移除侧栏单独入口。`usePublicAccount`复用生成的Session客户端与现有检查器，身份只在浏览器组件内存；不能登记到ReaderStore、写进公开快照、SSR或持久偏好。演示访客/读者仍明确是独立联调演示，不能作为真实账号。

头像预加载后先打钩再显现，已显现头像在重查时保留；失败/无头像回退云图标，减少动态直接显现。页面部分失败/离线继续显示小型状态标记与面板原始结果，不用头像成功替代动态数据状态。背景复核沿用既有有效Session的断网保留策略；到期或身份否定后不继续显示身份，任何私有操作仍由后端重新鉴权。实际结果见[验收](../handoff/header-account-entry-verification.md)。

## 组件如何接入

公共壳提供 `ReaderDataProvider`。`src/core/http/request.ts` 管理 GET 传输，`src/core/reader/tasks.ts` 管理页面登记和释放，`store.ts` 负责重试、生命周期与批量适配；主题的 `reader-data.tsx` 提供 Hook、面板插槽和指标展示。`backend-status.tsx`组合聚合状态与独立账号卡片，不在这里写死页面业务数据清单。

1. 先由后端发布对应能力的契约并提交，前端生成客户端。业务字段不在页面重新定义。
2. 页面/功能组件调用 `usePageRequest(key, load)`，`load` 使用生成客户端并传入协调层提供的 signal/timeout。`load` 应为模块级函数或稳定的 `useCallback`。键包含模块、资源及影响结果的参数；同键多个组件共享一次工作，最后一个组件卸载后自动取消并从状态集合移除。
3. 在该功能区域订阅返回的 idle/loading/ready/error 状态，按功能规范展示。可选数字只在 ready 时显示；零值是成功值，不用真假判断过滤。写操作不能复用只读自动重试策略。
4. 仅当页面确有额外说明/操作时，调用 `useStatusSlot(key, Component)`。Component 使用稳定的模块级定义，可自己订阅数据；没有插槽的页面只有通用状态，不会出现“无需更新”的业务占位行。
5. 不把单个请求成功等同于后端持续在线、写权限就绪或全部快照同步。页面切换/注销后不能再汇报旧请求结果。

当前实际接入例子：`components/reader-preview.tsx` 为文章注册演示身份和控件，`ViewMetric` 为可见元信息注册内容指标。不同页面可以直接复用登记机制，不需要先增加新的全局状态字段。登记只在客户端 Effect 中进行，公开 SSR 使用空动态状态。

批量指标使用专用适配器而非逐卡调用 GET：可视区前后 120px 触发，24ms 合并，最多 20 个 ID 一批；同 ID 多处展示共用读取。离开页面会取消，组件移除再出现也有独立登记代次保护。演示 ID 不发真实请求。

## 本机体验

后端实际 `config.toml` 已在本轮本机开启以下段落，配置不入 Git；新环境需要手工显式开启：

```toml
[reader_preview]
enabled = true
```

后端继续使用 8001，前端 3000；启动命令见 [公开阅读指南](public-reading.md)。前端只下发公开 `BACKEND_BASE_URL`，不下发内部连接或凭据。CORS 需允许实际前端来源。

- 首页/列表：可见文章的演示浏览量成功后出现，顶栏搜索旁的云图标展示本页更新状态。
- 文章页：打开云图标可切换“演示访客 / 演示读者”。切换会真实请求演示端点，但不创建账号、Cookie 或持久登录状态；未知/失败不得显示已登录。离开文章页，扩展内容自动移除。
- 重新检查：清理本轮动态结果再读取；失败数字隐藏，正文不消失。浏览器恢复在线后仍需请求成功才能显示更新完成。
- 假数值由公开 ID 派生，范围 0–996，不是历史访问统计，反复读取不会增加。界面标为演示，不进入 SEO/公开快照。

## 检查命令

后端工作目录：

```powershell
uv run ruff check app tests tools
uv run ruff format --check app tests tools
uv run mypy
$env:RUN_DATABASE_TESTS = '1'
uv run pytest -q
```

真实数据库测试使用独立测试库与回滚 fixture，不能用开发库替代。导出演示契约后先检查并提交后端，再在前端执行：

```powershell
node tools/sync-contract.mjs E:/Programming/Python/Everunfold-Backend/contracts/reader-preview-v0.1.schema.json
npm run check
npm run verify:reader
```

`verify:reader` 在临时目录复制源码、依赖和公开缓存，构建独立生产实例，启动测试 FastAPI 8991、带缓存 Next.js 3991 和空缓存 Next.js 3992，随后真实停止测试后端检查响应。端口被占用会失败，不杀其他项目。测试不写开发业务数据，不删除/改写原公开缓存或正在运行的 `.next`。需要本机已有有效公开快照、后端依赖和数据库配置；后端路径可通过 `READER_BACKEND_ROOT` 指定。

需要保留测试窗口做浏览器交互时，在前端目录直接执行（避免某些 PowerShell/npm 包装器吞掉参数）：

```powershell
node tools/verify-production.mjs --reader --interactive
```

自动检查通过后会打印本次文章 URL；终端输入 `offline` 停测试后端，`online` 恢复正常速度，`slow` 将测试读取延迟设为 4 秒以观察外圈加载动画，`quit` 关闭测试进程并清理经过路径检查的临时副本。日常 3000/8001 不受影响。浏览器打开带缓存文章确认内容/历史留言可读、指标隐藏与未知身份；打开空缓存地址确认暂不可用；恢复后用“重新检查”确认补充结果回来。自动化终端需要保留 stdin/TTY；stdin 关闭时会退出交互并清理，不长期残留服务。

## 尚未交付

此段最初记录2026-10-31的未交付范围。Session/权限/CSRF、账号管理及可靠快照/撤回现已有实施，见[账号指南](accounts.md)与STATUS；持久浏览记账、完整评论发布等其他能力仍依各阶段记录。演示身份/浏览量默认关闭，不把演示响应改名当作生产事实。

## 阅读反馈与历史评论点赞

- 当前页圆周进度使用 `readerProgress(snapshot)`，只统计登记能力的结束数量；失败结束仍显示失败，不因达到 100% 宣称同步成功。不同端点的页面请求自动加入统计，换页释放。
- 浏览量未成功时横向占位为零，出现后通过网格与间距过渡移动同行元信息；窄屏间距共用变量。减少动态停止装饰过渡。
- 已有索引中的正文链接通过 `AppLink expectedContent` 标记，准备/提交阶段的 404、503 或缺少页面就绪标记转为同步失败横幅，保留原页。直接访问未知 URL 仍为真实 404；没有合法快照为真实 503。不要为绕过失败恢复旧正文。
- 前端点赞从后端 `75471b1` 的 `comment-likes-v0.1.schema.json` 生成；独立于 preview 开关。部署显式执行 `uv run alembic -c migrations/alembic.ini upgrade head`，再更新 API 和前端。开发库与隔离测试库已显式迁移，应用启动不做迁移。
- `useCommentLikes` 只为可见历史留言注册读取，连续阅读按最多 50 条拆批。浏览器随机匿名标识按后端隔离，只用于偏好去重；更换浏览器不保持同一身份。PUT 等真实确认，不自动重试；迟到初始读取不覆盖新确认，离开页取消订阅与写入回调。
- 示例/仅本页留言没有真实后端 ID，点赞禁用并说明原因。请求中爱心换为加载图标；成功/失败使用 `FeedbackProvider/useFeedback` 主题全局反馈，不占用正文布局。正文评论发布仍是原本明确标注的本页预览。
- 隔离联调的 `slow` 命令同时延迟演示读取和评论请求 4 秒，便于查看进度及点赞加载状态；`offline/online/quit` 仍只控制测试进程。
