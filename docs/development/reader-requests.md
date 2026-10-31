# 动态请求开发与联调

版本：reader-requests-1，2026-10-31。已实现范围见 [ADR 0014](../decisions/0014-page-registered-reader-requests.md)；验证证据见 [验收记录](../handoff/reader-requests-verification.md)。

## 组件如何接入

公共壳提供 `ReaderDataProvider`。`src/core/http/request.ts` 管理 GET 传输，`src/core/reader/tasks.ts` 管理页面登记和释放，`store.ts` 负责重试、生命周期与批量适配；主题的 `reader-data.tsx` 提供 Hook、面板插槽和指标展示。`backend-status.tsx` 只展示聚合状态，禁止在这里写死业务数据清单。

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

真实 Session/权限/CSRF、持久浏览记账和历史统计导入、评论异步核对/发布、真实点赞、可靠快照同步/撤回通知、生产容量和全部缓存 P0。演示接口明确默认关闭；上线正式能力时应使用正式契约及认证策略，不把演示响应改名当作生产事实。
