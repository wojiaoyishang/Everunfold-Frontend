# 基础媒体库运行指南

版本：media-library-runtime-1，2026-11-01。当前实现见 [ADR 0025](../decisions/0025-recursive-menus-and-icon-library.md)；完整生命周期规划见 [媒体存储设计](../architecture/media-storage.md)。

## 页面与表单

管理员在 `/admin/media` 上传、按图片/视频过滤、名称搜索并分页浏览。头像、背景图片、背景视频旁的「媒体库」打开同一浏览组件，按目标字段过滤；图标页面仍使用独立的图标用途/大小规则。头像和背景图可以选择媒体库中已有的图标图片。

表单中的 42px 缩略图与地址输入框同行，单击查看大图或播放视频。选择资源只修改本地设置草稿，需要保存更改并等待节点应用；上传本身已独立完成，撤销草稿不会撤销上传。手填/清空地址会清空该字段的媒体关联。

## 当前端点与限制

后端发布 `contracts/settings-v1.schema.json`，当前 1.3.0（1.2.0 引入媒体操作，1.3.0 增加公告标题）。前端固定后端提交 9803e71 生成客户端、类型及校验，不另定义业务字段。

| 方法/路径 | 已实现行为 |
| --- | --- |
| POST `/v1/admin/media/query` | 名称、类型、页码查询；60 项/页，只返回 ready 且未软删除的资源 |
| POST `/v1/admin/media/upload?filename=…&upload_id=…` | 原始字节 `application/octet-stream`；查询只放文件名/重试标识，不放凭据；管理员 Session 和 CSRF 校验 |
| GET `/media/{object_key}` | 通过数据库状态门控的公开原件，支持视频 Range/206；安全路径、MIME、nosniff 与受限 CSP |

- 静态 JPEG/PNG/WebP：最多 20 MiB，边长最多 8192、总像素最多 40M；Pillow 真实解码并拒绝动画图。
- SVG：最多 1 MiB，沿用安全标签/属性规则，拒绝脚本、样式、外链等主动内容；只以图片加载，不注入 DOM。
- MP4/WebM：最多 128 MiB，检查容器结构、必要段/轨道及支持标识。没有转码或完整视频解码扫描，不能保证所有浏览器/编码都能播放；浏览器失败时保留可操作的预览状态。
- 有界流读取后在内存校验，不是分片上传或断点续传协议。客户端上传超时 120 秒；未知结果由用户使用同一 upload_id 重试，写请求不自动重复。

## 身份、存储与版本

`avatar_media_id`、`background_media_id`、`background_video_media_id` 保存 `media:<UUID>`。服务端检查资源存在、ready/未删除及图片/视频类型，忽略伪造的绑定 URL，按存储记录派生公开地址；手填地址仍受 HTTP(S)/站内路径校验。类型错误不会保存新设置版本。

原件遵循 `uploads/YYYY/MM/<UUID>/original.<ext>`；工作目录在同盘旁路 `.everunfold-media-work/local/staging/`，不公开。文件不可覆盖。数据库登记 staging 后发布文件，再在同一事务中提交 ready 和审计；相同操作者/upload_id/字节重试复用同一资源。详见 [图标与存储指南](menu-icons.md)。

切换 `[media].base_url` 前先完整同步原 object_key；重启后在系统设置执行「重新同步」。派生 URL 变化时生成新的公开设置修订，已确认的旧文件保持不变。地址未变的重同步仍可修复丢失的本地设置副本。公开快照无时间 TTL。

## 暂未交付

编辑元信息、引用计数、分类/标签、删除/回收站 UI、派生缩略图、转码、断点上传、自动孤儿清理、CDN 直传和 purge 均未实现。WordPress 原资源与试导入图片没有移动或删除；文章媒体整体导入仍后续进行。`ObjectStorage` 是可替换存储边界，不等于已经完成 CDN 上传协议。
