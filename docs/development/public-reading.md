# 公开阅读第一版：启动与验证

2026-10-30。后端端口按用户要求为 **8001**，前端为 **3000**；两个进程分别启动，不占用其他项目的 8000。

2026-10-31 补充：说说/阅读工具的最新验证见 [交付记录](../handoff/frontend-reader-verification.md)，本页旧浏览器观察只作历史。前端运行实例可保持热更新，使用 `npm run verify:production` 在独立副本构建，避免覆盖它的 .next。前端可在 config.toml 根级或环境变量设置 `PUBLIC_SITE_URL` 为实际前台公开根地址，输出文章 canonical / Open Graph；省略时不推测正式地址，拒绝凭据/路径/查询。该字段不是 FastAPI 地址，本机已填用户原站 https://lovepikachu.top，实际文件仍忽略提交。

草案类型生成命令：`npm run contract:sync -- 'E:\Programming\Python\Everunfold-Backend\contracts\presentation-v0.2.schema.json'`。该草案不替换当前公开 API/快照；此阶段不要为查看说说示例重新运行导入器。

2026-11-01 更新：后台新内容通过发布/撤回与可靠投递接入前台，详见 [内容管理](content-management.md)。本轮前端四条硬编码说说已删除，发布了两篇后台示例文章、两则示例说说用于真实联调。下列试导入数量和旧快照路径是此前记录，不能当作当前总量。

2026-11-02 更新：功能测试只使用新后台发布内容；开发库旧 WordPress 78 篇文章/9 个页面已撤回并同步，当前公开记录为 2 篇文章、2 则说说。不要为填充界面重新导入或恢复历史内容，详见 [ADR 0032](../decisions/0032-functional-test-data-and-sync-status.md)。下文导入步骤仅保留迁移工具说明，当前阶段不执行。

## 初始本机准备情况（历史）

- PostgreSQL 18 与 Redis 已连通，专用 `everunfold_dev` / `everunfold_test` 已建立并显式迁移；真实配置已写入两个项目各自被忽略的 `config.toml`。
- 本地开发库已导入 78 篇公开文章、9 个普通页面、11 条已批准评论、78 个标签、7 个分类；4 个商城系统页及 3 条密码保护内容排除。未迁移账户或评论联系信息。
- 312 项实际引用媒体约 55.3 MB，位于前端忽略目录 `public/uploads/wordpress/`；快照约 1.1 MB，位于 `var/public-snapshots/current.json`。这些数据不随 Git 克隆传播，必要主题背景/头像与去敏来源说明在 `public/reference/`。

## 启动

终端一，后端：

```powershell
Set-Location -LiteralPath 'E:\Programming\Python\Everunfold-Backend'
uv sync --locked
uv run --locked python -m uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --reload --no-proxy-headers
```

终端二，前端：

```powershell
Set-Location -LiteralPath 'E:\Programming\Node\Everunfold-Frontend'
npm.cmd ci --ignore-scripts
npm.cmd run dev -- --port 3000
```

本机已经安装依赖，未变更锁文件时可直接运行启动命令。前端生产验证使用 `npm.cmd run build`，随后 `npm.cmd run start -- --port 3000`。服务均只监听本机，停止用各自终端 Ctrl+C。

## 手工验收清单

| 地址/操作 | 应看到的结果 |
| --- | --- |
| `http://127.0.0.1:3000` | 真实站名、星空透明横幅、紫色主题、左侧栏和文章卡片 |
| 首页下一页，再返回 | 文章切换、URL 保留页码；筛选/搜索不能丢失 |
| `/archives`、`/categories`、`/tags` | 真实归档和分类标签，点击进入对应列表 |
| `/search?q=Python` | 搜索真实文章；无结果有清晰空状态 |
| 点击文章标题 | 保留迁移的正式路径，显示正文、图片、元信息及目录 |
| 有历史评论的文章 | 显示纯文本评论与一级回复关系，不提供假的提交成功入口 |
| 深浅色按钮、窄屏侧栏 | 主题切换与导航可用，正文无横向溢出，键盘可访问 |
| 不存在的文章/标签 | 真实 HTTP 404，与后端不可用/缺快照区分 |
| `http://127.0.0.1:8001/health/ready` | HTTP 200，database/redis/schema 全部 ok |
| `http://127.0.0.1:8001/docs` | 只读公开业务 API；没有 `/api/v1/*` 业务路由 |

浏览器工具在本轮因无法可靠识别当前 URL 被停止，未绕过；上表的实际浏览器视觉/交互需用户自行核对，本轮自动验证范围见交付记录。

## 更新本地公开数据

常规文章/说说更新使用后台的「发布 / 更新发布 / 撤回」，节点异常可「重新同步」。受管缓存启用后，仅导出 current.json 不会改变前台；受控导入后还需在后台内容页重新同步，生成新的不可变 release。不要删除 managed.json 来回退旧正文。

以下保留显式迁移/导出工具的历史用法，原备份始终只读。完整参数与 dry-run 见后端 `tools/wordpress_import/README.md`，先提取再导入。已准备的中间产物可显式重导入并刷新前端：

```powershell
Set-Location -LiteralPath 'E:\Programming\Python\Everunfold-Backend'
uv run --locked python -m tools.wordpress_import.load --config config.toml --input var/wordpress-public.json --export 'E:\Programming\Node\Everunfold-Frontend\var\public-snapshots\current.json'
```

仅重新导出当前数据库可省略 `--input`。相同输入重复导入不重复创建，generation 只有实际变化才增加；完整快照在一致事务读取后原子替换。本阶段只用于受控本地导入/导出，不是生产实时发布/撤回同步方案，也不负责自动删除原媒体或清理历史数据。

前端从本地快照读取，无时间 TTL，页面访问不固定回源；后端暂时关闭时已有完整公开快照仍可读。快照缺失/结构无效返回 503，确实不存在的公开内容返回 404。主题 SVG 图标为可信代码，历史正文 HTML/Markdown 则经过节点级媒体解析和安全过滤。

## 检查与契约更新

后端在项目根运行 Ruff、格式、mypy、pytest；真实 PostgreSQL 测试设置 `RUN_DATABASE_TESTS=1`，只接受独立测试库配置并事务回滚。前端运行 `npm.cmd run check`、`npm.cmd run build`；HTTP 验证脚本按前端 package.json 的 `verify:http` 说明执行。

后端公开 Schema/OpenAPI 在 `contracts/`；前端类型更新用 `npm.cmd run contract:sync -- 'E:\Programming\Python\Everunfold-Backend\contracts\public-v0.1.schema.json'`。权威 Schema 必须先提交，生成来源保留提交号与规范 LF 字节的 SHA256，不手改生成类型。

当前不含登录/后台写入、协同、任务执行、完整 ICP/缓存撤回、镜像和 CDN。不要将本阶段的读取闭环当作全量 CMS 或生产切站验收。

## 提交与推送

代理已按阶段做本地提交，没有推送。用户检查后在两个项目根分别执行 `git push origin main`；真实配置、原始 SQL、生成快照和文章媒体应继续留在忽略目录。
