# 插件编辑器与共享草稿

版本：collaborative-editing-5，2026-11-05。状态：试用版已实现；[ADR 0037](../decisions/0037-plugin-editors-and-collaborative-drafts.md) 记录决定，[验收](../handoff/collaborative-editing-verification.md) 区分真实进程、浏览器和未执行项目。

## 边界与目录

文章和说说仍为独立注册的内容类型。块格式是 markdown/html；编辑器插件 ID/版本是前端编译注册信息，不作为正文格式。类型级旧入口 core.markdown 暂保留为多块宿主的兼容标识，不代表全篇只能用 Markdown。

| 层 | 实际职责 |
| --- | --- |
| 前端 core/editor/registry.ts | 可信插件登记、重复 ID/格式检查；不依赖主题 |
| 主题 admin/content/plugins | Markdown源码/预览、HTML可视化/源码，各自组合封装编辑面 |
| 主题 components/ui/code-editor | CodeMirror 生命周期、键盘、选择、相对位置媒体插入；原生 contenteditable 只在此封装层 |
| core/collaboration | 文档投影、更新队列、传输、IndexedDB、跨标签页合并、导出与失效会话恢复 |
| core/content-management/use-draft-editor | 创建、保存/发布命令、权限策略、冲突与共享草稿衔接 |
| 后端 content/collaboration | 私有票据、鉴权、文档校验、持久更新、在线状态、截点提交；由 content.router_init 装配 |

当前两种格式共用原始源码Y.Text及源码/可视化投影，正文实时提交；显式保存/发布建立精确截点。光标、离线分支和独立版本页按[ADR0061](../decisions/0061-cursors-offline-branches-and-version-merges.md)实施，旧整篇保存阶段已被替代。没有加载用户上传的 JS，没有另建编辑器上传通道或独立发布流程。增加新的持久块格式仍须后端契约与渲染策略先支持。

## 一篇草稿一个文档

同一稳定草稿 ID 只在服务器事务内从现有 JSON 初始化一次，生成 epoch。每个浏览器建立自己的 Yjs 客户端，不能从 HTTP JSON 反复播种。

- meta：title/excerpt/seo_title/seo_description 为 Y.Text；settings 为 Y.Map，保存路径、分类、标签、封面、显示时间、置顶、评论开关等。
- blocks：稳定块 ID → Y.Map(type/content/deleted)，content 为 Y.Text。现代source_first文档不再维护可写rich片段；旧文档转换时保留初始基线、归档epoch后重建原始源文，旧队列转恢复分支。
- order：Y.Array 块 ID 列表；投影去重，跳过墓碑。排序不重建文本；删除保留源文，撤销可恢复。并发排序采用 CRDT 的确定性合并，不承诺任意多人移动都等于各人的局部顺序。
- 密码、visibility、opens_at、发布状态、账号、权限不在 CRDT，也不写入本地正文缓存。分类/标签首版为字段级最后写入，共享元文本和正文通过CRDT合并；源码投影无法安全定位的重叠进入人工分支。

正文、共享属性和结构撤销只追踪本人Y.Doc事务，两种视图共用宿主历史。源码和HTML/Markdown视觉投影支持块内成员光标与选区，点击定位；跨块连续选区另做。撤销历史不承诺跨刷新保留。

## 连接、持久化与恢复

浏览器直连配置的 FastAPI。/v1 Cookie 不会自动发送到 /ws，故先以 Cookie+CSRF 调用 POST /v1/admin/content/collaboration/ticket，取得 45 秒、一次有效的票据；票据只在 socket 首帧发送，不能放 URL。实际 WS 是 /ws/v1/collab/{draft_id}，新客户端契约collaboration 2.0.0，先校验精确 Origin，再验证票据、账号、会话与草稿。当前沿用 admin 编辑权限，未交付细粒度作者 ACL。

握手携带 State Vector；服务器给出权威差量和 committed_seq。浏览器先原子保存本地状态+稳定 update_id 的 outbox，再发送。服务器复核权限、内容规则和媒体，按文档连续分配序号，将二进制状态、增量、哈希/操作者回执同事务提交后才 ACK。同 ID 同哈希/操作者重放返回原序号，其他内容拒绝。缺少前置结构或删除依赖的更新不能确认，避免 Yrs 重编码时丢失悬空数据。

Redis 的 collab:{draft_id}:updates 只唤醒 PostgreSQL 补齐；丢通知、订阅故障仍按约 350ms 校对持久序列。在线身份、光标、选区保存在独立 Redis 临时键，身份由服务器覆盖，不接受浏览器自称的用户。房间最多 20 个连接，租约/过期清除幽灵状态；每连接独立收发任务、超时和有界批次。持久化与转发在 FastAPI；不让 Celery/Scheduler 装配房间或执行业务更新。

已实现常量上限：更新 1MiB、编码状态 4MiB、128 个可见块/512 个保留块、单块 100000/正文合计 200000 字符；沿用公开快照 8MiB 上限。每账号/文档写入为 160 次/10s，每账号合计 320 次/10s；这些是试用默认值，尚无后台配置或容量承诺。

IndexedDB以后端地址+已验证账号ID+草稿ID隔离，活动队列再按页面会话隔离，复制新窗口不会共享客户端身份。独立分支另库存储并在同一作用域列出。读/写事务合并所有标签页的 Yjs 状态、outbox 和 ACK 去重记录，不能最后写入覆盖别的窗口；BroadcastChannel 仅通知重新读取已提交的本机记录，缺少此 API 时由重连/重新打开恢复。ACK 后才能移除待确认项，缓存 loaded/synced 不代表服务器已存。浏览器存储失败明确提示导出，不冒充持久保存。

失去权限后拒绝上传、关闭 socket；当前已授权页面的内存副本可导出。后台会话检查失败时不保留后台操作，只展示本地恢复面板；需要旧已验证账号和同一路径匹配，不能让缓存身份授权新页面。冷启动且后端不可用时不会绕过认证开放编辑器。JSON 导出剔除文章密码，并包含 removed_blocks，避免正在编辑的块被远端移除后无法找回源文。

## 保存和发布

POST /v1/admin/content/collaboration/commit 接受 epoch、确认过的序号、expected_revision、稳定 operation_id、动作、私有访问策略和可选 block_sources。服务器从持久状态重建该截点，再复用草稿完整修订、审计、公开投影与可靠分发事务；HTTP 应答不能覆盖之后的协同输入。旧 save/publish 整篇 JSON 入口对已经初始化的协同草稿返回 40972；更早已成功的幂等回执仍可重取。

账号权限读锁使用 PostgreSQL SHARE，阻止权限变更与当前写入交错，又兼容旧用例写入审计外键的 KEY SHARE。不能在全局引用锁前持有用户 UPDATE 锁再等待其他引用写入者。

正文保存稳定 site://media/ID；新媒体映射经私有 socket 重新解析到编辑预览。媒体引用保守累计，覆盖已提交的共享输入和撤销历史；可能因此暂不能清理已经移出正文的文件，不能直接删媒体路径来绕开守卫。

## 明确后续

当前状态是检查点，但保留初始状态、全部持久日志/回执和本机 ACK 记录，没有自动 GC/历史压缩删除。老截点重建成本随日志增长，未做长时间/大文档/大房间压测。完整审核工作流、代码页面协同、细粒度 ACL、跨块选区、导出文件自动导入都未交付；显式离线分支恢复、版本比较/合并已按ADR0061交付。原始 WordPress 文章不恢复来填充测试。

## 历史阶段：旧版结构化 HTML 与源码事务兼容

以下描述旧版客户端的兼容协议，新前端正文采用 ADR0044 的原始源码与整篇保存。HTML片段保存段落、文字格式、列表、表格、图片说明/对齐与稳定字体引用。schema1.1增加sources帧及rich_versions；原collab-1传输、稳定更新ID、PG提交后ACK和精确保存截点不变。旧草稿首次取得新票据时在行锁内补齐缺失片段，保留原epoch与日志。

source_leases以文档/块记录generation、客户端、会话哈希和60秒租约，数据库为权威，Redis在线状态不授予编辑权。源码acquire/renew/release/apply使用认证HTTP；apply按指纹、租约和稳定operation_id校验，与协同更新、媒体引用及持久回执同事务提交。WS传播提交结果；本人与远端来源区分，宿主UndoManager保留本人撤销。

服务端拒绝租约期间同块富文本、修改保留源文、旧世代离线更新；其他块可继续写。失效更新不ACK、不从outbox删除，留作恢复导出。源码租约过期不是丢弃本地草稿；重新取得后必须核对当前正文。暂存源码为每标签页sessionStorage，和已提交CRDT的IndexedDB持久化分开，使用边界见[编辑器指南](../development/editor-plugins.md)。

字体描述由后端媒体记录解析进公开/私有映射，富文本只保存稳定site://media/ID，不保存CDN地址。字体被协同草稿引用后沿用媒体引用守卫，不能因尚未手工保存而误删。


## 2026-11-04 位置历史兼容

[ADR0043](../decisions/0043-rich-editor-lifetime-and-position-history.md)限定接收y-tiptap3.0.12嵌套块的位置迁移根Map，验证数据形状、数值/容量和只追加不变量；这些不是业务根，不进入正文投影。任意其他根和业务策略仍被拒绝。所有富文本操作仍等待PG提交后ACK，不通过清除旧客户端outbox规避兼容问题。界面以文档/块绑定隔离引擎实例，管理器为空时不再访问命令或渲染工具栏。

## 2026-11-04 正文保存与图片占位

两种源码的未保存输入按账号、后端、草稿、标签页存放，与 IndexedDB 中的已确认共享文档分开。其后端媒体引用仅在正式提交时得到持久守卫，上传完成尚未保存的引用在保存时再次验证。

block_sources 在历史截点和最新文档上分别检查块 ID、类型和原文 SHA256。精确源码、兼容富文本、协同更新、媒体引用、修订及回执同事务提交。失败回滚和双 API 幂等重试见本轮 P0，保存成功经原 WS 序列传播。

插件复用宿主回调，上传共用 UploadQueue/mediaLibraryAdapter。临时占位仅在本页出现，后端通过正文校验拒绝未完成占位。恢复、格式限制及逐组件验收见[本轮记录](../handoff/source-first-editor-verification.md)。

## 当前版本页与合并

[版本指南](../development/draft-versions.md)记录独立页、人工冲突处理、自动保存结果、最新版本保护和暂停/超时恢复。PG合并租约覆盖全部写入口；旧epoch及迟到输入不能绕过，晚到IME保留本地分支。正式发布与合并工作草稿分离。具体真实验收见[本轮记录](../handoff/cursor-versions-verification.md)。
