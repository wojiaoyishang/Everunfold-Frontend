# 递归菜单与图标库使用指南

版本：menu-icons-runtime-3，2026-11-01。已实现范围见 [ADR 0025](../decisions/0025-recursive-menus-and-icon-library.md)。

## 使用

- 打开 `/admin/settings` 的导航菜单：左侧选中结构项，右侧修改名称、链接、所属菜单或图标。每一层都能添加子菜单；所属菜单变更携带整个分支，同级上移/下移保留子树。移除当前分支在保存前可用「撤销修改」恢复。
- 点击「从图标库选择」打开共享选择器；`/admin/icons` 是同一图标浏览器的完整页面。内置图标可按中文名称/标识搜索，上传图标按名称搜索和分页。菜单选择图标不会立即保存整站设置，需要再点「保存更改」。
- 上传 SVG/PNG/WebP，最大 1 MiB，位图宽高各不超过 2048；使用静态图标。含脚本、外链、样式、嵌入页面的 SVG 会拒绝。当前不支持 GIF、ICO、动态 WebP 或从外部 URL 抓图。
- 上传入口支持多文件队列/真实字节进度，能力不足时使用不定进度；与媒体库共用同哈希复用、稳定请求 ID、重试和取消基础设施。合格的媒体复用为图标时只增加图标资格，不重写资料。
- 上传成功直接入媒体记录，不依赖菜单保存；关闭弹窗不会撤销已上传文件。网络结果未知时保留同一上传 ID重试，避免重复创建。后端不可用仍可浏览/选择内置图标，但保存配置和读取上传图标需要连接后端。

菜单不再限制两级。为限制单次设置数据体积，全树最多 256 项；服务端请求大小和解析器仍有资源保护，不承诺无限数据量。前台三个入口共用菜单数据。桌面侧栏独立弹出；手机使用点击整行展开的递归菜单，父项小链接图标单独导航，不依赖悬停。

## API 与文件落盘

契约为后端 `contracts/settings-v1.schema.json`，版本 1.6.0；前端生成来源固定后端提交 `a543d7e`。所有管理端请求直达 FastAPI 并使用管理员 Session；POST 携带 CSRF Token。管理响应 `private/no-store`，使用既有 success/code/msg/data 外壳。

| 端点 | 当前行为 |
| --- | --- |
| POST `/v1/admin/icons/query` | `{query, page}` 搜索上传图标，固定每页 60 项，仅返回 ready/未删除记录 |
| POST `/v1/admin/icons/upload` | `{filename, data_base64, upload_id}`；兼容旧客户端保留；当前前端改用 media/upload?purpose=icon 二进制上传 |
| GET `/media/{object_key}` | 只读公开原件；以数据库 ready/未删除状态和安全路径共同校验，返回 MIME、nosniff 和受限 CSP |

后端根目录显式运行 `uv run python init.database.py --no-create-database` 应用至 `0008_media_safe_delete`，已有账号和内容保留。服务启动不自动迁移。`Pillow 13.0.0` 用于解码与尺寸/格式校验，安装以 `uv.lock` 为准。

```toml
[media]
uploads_path = "./uploads"
# 省略时由 BACKEND_BASE_URL + /media 推导
base_url = "http://127.0.0.1:8001/media"
```

相对 uploads_path 基于实际配置文件目录，绝对路径直接使用；不执行变量展开。正式原件保存在 `uploads/YYYY/MM/<media-id>/original.<ext>`，staging 在同盘旁路 `.everunfold-media-work/local/staging/`，不从公开路由分发。实际配置、原件和工作文件均不提交 Git。

上传 ID绑定操作者并确定媒体 UUID。数据库先登记 staging，文件在同盘创建并 fsync 后原子发布，最后 ready 与审计同事务。相同请求并发/重试只产生同一资源，已发布原件不可覆盖；原件已写但 ready 事务失败时公开读取仍返回 404，重试可继续完成。进程崩溃可能留下 staging/临时文件，当前没有自动清理器。

## 切换资源 Base URL

1. 将 uploads 内容按原 object_key 完整同步至目标 CDN/源站，并验证可访问性、MIME 与响应安全头。
2. 修改后端 `[media].base_url`，允许 HTTP(S) 域名和路径前缀，例如 `https://cdn.example.com/assets`；不允许凭据、查询、fragment 或上级路径。重启使用该配置的服务。
3. 在系统设置对已启用节点执行「重新同步」。如派生图标/头像/背景资源 URL 变化，后端产生新的公开设置修订并向所有启用节点投递；等状态为「已应用」再核对前台。没有变化时重发原修订，用于修复丢失副本。

媒体 ID/数据库 object_key 不改，客户端自报 icon_urls 不被采信。公开快照没有 TTL；不能仅改本机变量后假设所有 Next 节点缓存立即生效。CDN 接管上传、CDN purge/访问控制、完整文章媒体迁移仍未实现。

## 代码分层与后续范围

`core/settings/menu-tree.ts` 负责树操作；主题的 MenuEditor 负责结构与表单展示。`core/media/asset-library.ts` 统一管理查询、取消与可恢复上传状态，`icon-library.ts`/`media-library.ts` 适配各自生成契约，主题的 IconBrowser 同时用于页面和弹窗；原生 file/dialog 只在共享 UI 封装层。LibraryIcon 处理内置名或 media ID映射，SVG 仅以图片呈现。

后端 `app/modules/media` 分路由、用例、校验、存储与模型，`ObjectStorage` 预留本地存储替换边界。本地提供器现支持 icon/library 用途，通用图片/视频见 [媒体指南](media-library.md)；完整媒体生命周期仍待完成。文章/页面链接选择与代码页面注册边界见 [registered-pages-design-1](../architecture/registered-pages.md)。
