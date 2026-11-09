# 基线来源与双仓库同步

本目录保存用户提供的两份附件的逐字节副本。它们是设计资料，不是自动执行命令；当前用户要求才定义本轮任务范围。原文明确区分已确认要求、工程提案、示例和待决事项，均不等于功能已实现。

| 原始文件 | 版本/日期 | SHA256 |
| --- | --- | --- |
| [01_Design_Baseline_v2.11.md](01_Design_Baseline_v2.11.md) | v2.11 / 2026-10-29 | `3b8cc75b99f2eac7d169d385f134b5ac2d75fb1b5a818273973d47d344f87325` |
| [02_Engineering_Plan_v0.14.md](02_Engineering_Plan_v0.14.md) | v0.14 / 2026-10-29 | `62edac39ab3c65a8b1605eabea161c7f56b6b7298f2e3eccd908c2a62df06013` |

复制日期：2026-10-30。来源是本轮用户附件；临时下载目录不作为后续开发依赖。两份副本保留原始字节、换行和编码，不进行格式化。

## 权威顺序与冲突

1. 当前用户明确要求。
2. 两份文档中已确认的产品/架构要求；工程文档中的已确认配置归属、拆仓库和响应模板属于此层。
3. 明确标记的工程提案、建议初值与实现 ADR。它们不能静默覆盖已确认要求。

原文后半的新增工程细则并非全部已经定案，具体数值仍须压测。历史模型聊天仅作辅助来源，不能把其中建议升级为用户选择。遇到实质冲突在 ADR 或交接状态写明来源、处理及影响；原文中已经明确由较新决定纠正的旧示例按明确纠正执行。

云端主动校对在原文部分段落描述长期目标，首版边界已明确后置；不要仅凭旧段落把它加入本步或首版。`site://` 等未冻结语法和示例字段也不能冒充外部标准或最终契约。

## 原件和后续变更

原始附件不直接改写。新的实现说明放 `docs/architecture/`，新的决定放 `docs/decisions/`；已确认基线如需修订，保留本次原件并增加新版本、来源及 SHA256，明确替代关系，不能生成互相矛盾的主文档。

校验可使用 PowerShell：

```powershell
Get-FileHash -Algorithm SHA256 docs/baseline/01_Design_Baseline_v2.11.md
Get-FileHash -Algorithm SHA256 docs/baseline/02_Engineering_Plan_v0.14.md
```

## 公共文件同步规则

两个仓库应逐字节同步以下文件：

- 根 `AGENTS.md`。
- `docs/README.md`。
- 本目录 `README.md` 与两份原始附件。
- `docs/architecture/constraints.md`。
- `docs/development/protocol.md`。
- `docs/development/environment.md` 与 `docs/development/public-reading.md`。
- `docs/decisions/0001-bootstrap.md`（后续跨仓库 ADR 同样同步）。
- 本次 `docs/migration/wordpress-inventory.md` 去敏盘点。
- `docs/architecture/frontend-ui.md`、`docs/development/frontend-motion.md` 和 `docs/handoff/frontend-motion-verification.md` 是本阶段跨仓库前台交接说明，同步维护。
- 动态数据设计阶段的 `docs/architecture/public-dynamic-data.md`、`docs/decisions/0013-public-dynamic-data.md` 和 `docs/handoff/public-dynamic-data-audit.md` 同步维护；其状态为设计/盘点，不能当作运行验收。开发协议相应升级到 development-3。
- 动态请求实施阶段同步 `docs/decisions/0014-page-registered-reader-requests.md`、`docs/development/reader-requests.md` 与 `docs/handoff/reader-requests-verification.md`；设计规范升级为 public-dynamic-2，开发协议为 development-4，明确按页面注册及演示/真实业务边界。ADR 0013 和原盘点保留历史事实。
- 阅读反馈阶段同步 `docs/decisions/0015-reader-feedback-and-comment-likes.md` 与 `docs/handoff/reader-feedback-verification.md`；动态请求指南升级为 reader-requests-2，明确真实匿名评论点赞与演示身份/浏览量的边界。
- 本次界面修订同步 `docs/decisions/0016-anchored-popovers-and-failure-pages.md`、`docs/handoff/failure-pages-verification.md` 与前台架构补充；不更改业务契约、原始基线或开发协议 development-4。
- 媒体设计阶段同步 `docs/architecture/media-storage.md`（media-storage-1）、`docs/decisions/0017-media-storage-and-upload-lifecycle.md`、架构约束与入口索引。仅记录后端上传/静态分发与 CDN 方案，不修改实际配置、代码或原始基线；开发协议仍为 development-4。
- 认证阶段同步 `docs/decisions/0018-authentication-and-admin-entry.md`、`docs/handoff/authentication-verification.md`、`docs/handoff/authentication-frontend-verification.md`、架构约束与入口索引。前后端实现和跨源浏览器联调均已完成；公共说明可记录整体交付，但生产 HTTPS/Cookie、改密和其他后台业务仍未完成。

- 通用登录修订同步 `docs/decisions/0019-shared-login-and-responsive-entry.md`、ADR 0018 补充、入口索引、前台架构与认证前端验收。仅调整前端账号入口/回跳和响应式展示；`auth-v0.1`、原始基线与 development-4 不变。

- 登录交互修订同步 `docs/decisions/0020-login-handoff-and-session-check.md`、ADR 0018/0019 的替代说明、入口索引、前台架构与认证前端验收。只改前端跳转/请求生命周期，`auth-v0.1`、原始基线与 development-4 不变。

- 后台设计阶段同步 `docs/design/admin-reference-research.md`（admin-research-1）、`docs/architecture/admin-ui.md`（admin-ui-1）、`docs/decisions/0021-admin-theme-and-workspace.md`，以及 ADR 0018 替代说明、前台架构、索引、AGENTS 共享规则。协议升级 development-5，架构约束 bootstrap-3；仅明确后台主题归属与隔离规范，运行代码/认证契约和两份原件不变。会话预览为示意，不是运行验收；留档图片 `docs/design/admin-workspace-preview.jpg` 同步维护。

- 后台第一期落地同步 admin-ui-2、ADR 0021 实施记录、前台架构、架构约束、索引、`docs/development/admin-workspace.md` 与 `docs/handoff/admin-workspace-verification.md`。原始基线、auth-v0.1、development-5 与调研原稿不变；不把准备页当作内容/媒体管理已完成。

- 后台导航/动效修订同步 admin-navigation-1、admin-ui-3、admin-workspace-2、ADR 0022、索引与验收记录。可信前端注册和独立动效已实现；后端挂钩仍为设计，不新增业务契约、依赖或修改原始基线。

- 设置与扩展调研同步 settings-inventory-1、settings-design-1、frontend-extensions-1、ADR 0023 及索引/既有架构交叉引用。状态为待讨论提案，未启用插件加载/设置写入/新缓存策略；原始基线、development-5、auth-v0.1 和实际配置均未改变。

修改公共规范时在当前交付同步另一仓库，检查文件 SHA256 相同，并在两仓库状态中记录同步结果。若另一仓库暂时不可访问，明确记为待同步及目标版本，不能声称已一致。两个仓库分别提交，不要求提交哈希相同。

`everunfold-frontend/AGENTS.md` 中由 Next.js 开发服务器自动维护的 `<!-- BEGIN:nextjs-agent-rules -->` 区块是该仓库工具专属内容，不复制到后端。根 `AGENTS.md` 的其余共享内容仍须保持一致；比较时先移除该区块。

根 README、锁文件、代码、检查结果、`docs/handoff/STATUS.md` 与仓库专属设计各自维护，不要求相同。两个根 `config.example.toml` 分别对应各自角色，必须不同；共同参数含义以后端契约与基线为准。版本化契约只由后端发布，前端生成内容不是第二份可编辑契约源。

- 基本设置实施同步 ADR 0024、settings-runtime-1、settings-design-2、settings-verification 与主题设置截图，并更新原设置/扩展/导航设计的已实施边界。公开契约 settings-1 的前端来源固定为后端提交 a4237da，生成目录记录 SHA256；原 v2.11/v0.14 字节不变，开发协议 development-5 不变。

## settings-runtime-1 同步摘要（2026-11-01）

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `faf28e22bc2023646d94e4b61c2dd26ef18711b8573a65201343c402036e6908` |
| `docs/architecture/admin-navigation.md` | `c5b6d82c59147b43eb7ce95b509ed6063452ff1c11b86d7f347ac7de41c71b5e` |
| `docs/architecture/frontend-extensions.md` | `8b44a3cda8ad9bb27f6d26704bb512c752c02cb87a78f35ac410842e0769bd24` |
| `docs/architecture/settings-design.md` | `ad3658f08e8334487831c948ef34ba17d31807d8cde1c99885be22de088f507f` |
| `docs/architecture/theme-configuration.md` | `d6c1f163043499e688bcf7eac049bbf76ba4a88a3c23081bc26e27db7f6e34e5` |
| `docs/decisions/0023-settings-and-extension-boundaries.md` | `d09ac013190f48a0ac110dfc24990057c086ca981238ebf9085d3ecee7a86d9d` |
| `docs/decisions/0024-versioned-settings-delivery.md` | `89da5115a3f2f7f54f9055fc342ed6b46ad9e2287d5a4be7746508fe387171ce` |
| `docs/development/settings.md` | `59c0edaca523b5f35415d601605b6652a67ac409a6919a9089f66618f6584cd9` |
| `docs/handoff/settings-verification.md` | `776e993c6ee3a2869b8a2e7444c011f1e1fad1a67ca77bba4c6ec075328b2316` |
| `docs/design/settings-theme-desktop.png` | `1f0950483422861039e72438eeb38ac48a1a63b4b75bbd47760f8165043707f9` |

## menu-media-runtime-1 同步摘要（2026-11-01）

本轮递归菜单、基础图片/视频库、移动点击展开和标题/正文公告的最终决定见 ADR 0025。settings 1.3.0 生成来源固定后端 9803e71；settings-runtime-3、menu-icons-runtime-2、media-library-runtime-1、media-storage-3、settings-design-4、admin-navigation-3、frontend-extensions-3 和 registered-pages-design-1 区分已实现与设计。历史摘要保留对应旧版，以下为本轮同步后的字节摘要；原始附件和 development-5 不变。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `0907727e08eb7b31976ac4b242b234803e12799aba7817c6135e047b867bfcfa` |
| `docs/architecture/admin-navigation.md` | `fd3608332d08b4639fb95743a5b0752716d90d4dc56feee911d35c5bf0a603cc` |
| `docs/architecture/frontend-extensions.md` | `6dfb4f949c3c741c20e8c6ca817c04ae0b7eef6696bd32be62214a6e1dd02318` |
| `docs/architecture/media-storage.md` | `2d47b653ee6eabadcfa943c1f584280a328c690802ba4ab410e17fbd7c3b8ac1` |
| `docs/architecture/settings-design.md` | `006610ca9afb45649ac067fb85ae423cc8eac20e3005896b3453ffc80a44e6c1` |
| `docs/architecture/theme-configuration.md` | `7140048f4579bfa04b913168022a6d4d6937d7bf4eb75f52957b3801bc046cb7` |
| `docs/architecture/registered-pages.md` | `4cc3b9a82ac88f4e7493244f3f721f85fc81e3ec9c9637e5b6b15b3d5f0814be` |
| `docs/decisions/0017-media-storage-and-upload-lifecycle.md` | `aeccb180724a67541d4d3f84f64eb8b144169d577968af23c1ee03c1c9087d50` |
| `docs/decisions/0025-recursive-menus-and-icon-library.md` | `ea024b1f973a9b6846ff2796ae2514fddb1b5ca2976cf869b1e7720c444362ce` |
| `docs/development/settings.md` | `bb27b8170dff9e201d9f557d70d2352aa80a0c78caef4530fe970d3355b07b23` |
| `docs/development/menu-icons.md` | `441843f7291a8ffddd0e3e8e1276c5842153f92e4c1dfcdfcfd031ee3ac557f7` |
| `docs/development/media-library.md` | `dac06f546972302a7d0973179f063672acf7660dc334622fdab193b2e9a65007` |
| `docs/handoff/menu-icons-verification.md` | `43df36f03fa95d6d7b8818cf9db581483f49ebcd6edacf0727e591b48d7b381b` |
| `docs/design/menu-editor-desktop.png` | `ba6e53e270472266b61b6b0871d45e1819ed6a036bcf3a9ce7bef2b7e5193943` |
| `docs/design/icon-library-picker.png` | `13ae31a6c4b0ed43465a61ad7b9e27d652b2f0069c91466ccda6c119999a9e18` |
| `docs/design/icon-library-mobile.png` | `85eeb31f3bda331b1510e6771945c61efb528ef7d9e3851d2ce8a92a0e20028e` |
| `docs/design/media-field-compact.png` | `3ef52fc04cae02caacc54c281806fba124ba533e037da37f67dba01c0de01a73` |
| `docs/design/sidebar-flyout-desktop.png` | `f16c66cac9a11c4c15c573f76fcc7e490b1920db2ab4161658e995b49ded4e16` |
| `docs/design/sidebar-drawer-mobile.png` | `050425101f5f588f0fea472e9fd73b6d84ed4744ba0492fd7c171f0cd6cd7754` |
| `docs/design/sidebar-drawer-mobile-expanded.png` | `4f44f1a67f79a1f34fb3323c9255f1ba55d7a8136b144216dc7ac58fb92a308d` |
| `docs/design/announcement-settings.png` | `a4f3d1b9cef3d05d98ea8cf2162a47a0fa33b899fb986237940d4cb4bcd4e4cd` |

## media-editor-runtime-1 同步摘要（2026-11-01）

本轮 ADR 0026、media-library-runtime-2、media-storage-4、settings-runtime-4 为已实现更新；settings 1.4.0 生成固定后端 ac25b25。历史摘要保留，原始设计/工程附件及 development-5 不变。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `23c34ef8d50a782072082fb47a23e5b3badd5fffed2af46e89cf9da1a5e1c453` |
| `docs/architecture/media-storage.md` | `736865009e0036a7622181b3044e64513d666af7565974e21804c4db5600757a` |
| `docs/development/settings.md` | `5f6fb0b836e31b3c130b1bbea51c0a0276b467e4e66de4fb7bdcb7b88f01e79d` |
| `docs/development/media-library.md` | `5de66b016ec652dd4ab41566926d849ca685f8217fd04b18829652212cee1a65` |
| `docs/decisions/0026-media-details-and-image-editing.md` | `b9612a8444f20f857e97a8197d668572a65c2194640aee22e5df4b13b51c2083` |
| `docs/handoff/media-editor-verification.md` | `44c5b45902b38880d50ae4f469e6a2b7b27427a6e091dbcdea3d3e900e8bcad5` |
| `docs/design/media-details-desktop.png` | `6c7b6bc90d45366eb9d54dc67c88a0131a12e6c9d52a614981be7681f87685e2` |
| `docs/design/media-editor-desktop.png` | `e87852a07766a4c4a54093aac2e12aa696fd41859c7e79da54f8776b8f8518f9` |
| `docs/design/media-details-mobile.png` | `2f13a98b1b83fd2f4327468e375cfbdd35d7ccc44f0c43dac52380c4f304bc6d` |


## media-upload-runtime-1 同步摘要（2026-11-01）

本轮 ADR 0027 落地统一多文件队列、SHA-256 复用、通用附件和安全/整组删除。development-6、bootstrap-4、media-storage-5、media-library-runtime-3、menu-icons-runtime-3、settings-runtime-5；契约 settings 1.6.0 固定后端 a543d7e。历史摘要保留；原始 v2.11/v0.14 未修改。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `bced126df992a9bc4ca68d10e33f404fb40fa2743912592552ea2632bed4e05d` |
| `docs/development/protocol.md` | `65cd858eb325bf08e03afd8ee5aedf5aa90eb3d4e41f74a9008e07eb697bb7d0` |
| `docs/architecture/constraints.md` | `a8cbba7392a0042eb52936529515913ca07f612355b7ddb5b80889cd98a9c0f0` |
| `docs/architecture/media-storage.md` | `0a9a7d5b6621d627e1b8d2454ab51b64019249eb7b8830dcabedcdfa1c502920` |
| `docs/development/media-library.md` | `76c0c533c72524352a8b8708959dfc4dd33f03216a71923403688355d24df1da` |
| `docs/development/menu-icons.md` | `1b64a7a7a7ab8445c5848c21ca0f81e87b68836f041d03d1d35c5a7ab3fc7e27` |
| `docs/development/settings.md` | `50421b8498f4a421b5e72b6cfca1c60ac7b28be9ac15fc0396eb9c25bf346ff8` |
| `docs/decisions/0027-shared-upload-queue-and-safe-removal.md` | `f48cf1cccca267f4f7fe1a22693c1a4d94a2e4eff595195ee96947234a663b28` |
| `docs/handoff/media-uploads-verification.md` | `4116c6c3d5cc195a5843d7807f0baca03fcae87ceee1875bf29c4324bf6e0516` |
| `docs/design/media-library-inline-actions.png` | `09ad27d30e17845b224bc719d4093e33561d933524c2d9218f80eeca2070cff7` |
| `docs/design/media-library-removal-scope.png` | `f4e10bb1cfc862544945814053be3db6fd77beb0d330733946417ab62791ff9b` |
| `docs/design/media-library-removal-mobile.png` | `1128071af55fc230101da6474e5a495cf2a846493590b09301d2fb20a6cee9c1` |
| `docs/design/media-library-upload-queue.png` | `0bff6589b189adb5ca11313d16e6c1d3f8d21020213d59369d2bb64a2d885be7` |
| `docs/design/icon-library-upload-queue.png` | `1f005f30462fd64ad0d96cdc2538da2cad9dcdd32c11ef600be50f3eb3fd2ef7` |


## confirmation-dialog-1 同步摘要（2026-11-01）

本轮新增 ADR 0028，共享确认弹窗接入媒体删除与未保存修改提示；development-7、media-library-runtime-4。后端运行代码、settings 1.6.0 与两份原始基线不变。下列文档和截图逐字节同步；历史摘要保留。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `ebb86f9e9b090f4507d5630e0c70cd0d1d105f1cfca4a960cab0229471e2f119` |
| `docs/development/protocol.md` | `04756803ce09321c171ac0da1988e810ffe0212ef120b4a7e2d566c4ee49d670` |
| `docs/development/media-library.md` | `09b161ccd34eef138ef7610c4d5a2874fcab5a3e72b63dd708b35be215025425` |
| `docs/decisions/0028-shared-confirmation-dialog.md` | `38a12d1d1a78ac0fd9628cb524ac1830479b74d0514708e97883e2d8803ecb1b` |
| `docs/design/media-removal-confirm-dialog.png` | `86e85a67e44990648caf02ef2f3ecd487823127255bb75ac117f72ec763dd73b` |
| `docs/design/media-removal-confirm-mobile.png` | `159b58000352de02b09776b265925e9f5c84ffe953c1dfb1391c1e695078f7ef` |


## interaction-motion-1 同步摘要（2026-11-01）

本轮 development-8、media-library-runtime-5 与 ADR 0029 细化全局交互动效规则和确认退场契约；ADR 0028 使用示例同步。AGENTS 公共动效规则一致，前端独有 Next.js 附加说明保留。后端代码、settings 1.6.0、0008 迁移及两份原始基线未改，历史摘要保留。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `3b324a55b9b27466aab8985929ca64a8203623b42670e8360cf0cbba390c5e22` |
| `docs/development/protocol.md` | `b61615ab876be8450e0a99004f4b09856f2aa6456e364e4a19d0a0db97a5d054` |
| `docs/development/media-library.md` | `9e1a369bab1cdbec1e5a871cdd29c7bd01d11661234348e1d52193f5b283b5df` |
| `docs/decisions/0028-shared-confirmation-dialog.md` | `8b0b5af8aa13dd4d085ea34669a99482fd1d3a9753f8e6e64a43391c0eff7ca0` |
| `docs/decisions/0029-interaction-motion-lifecycle.md` | `da9f36e3be0c92eebe9ee87da9b2b444ebd8c3911833d92730ffe4cce8f847cb` |
| `docs/design/media-confirm-motion.png` | `9949b61bd9f580dd76cf76e9475a648435f132338f47d5e6205aa98e3749f928` |

## content-management-1 同步摘要（2026-11-01）

本轮 ADR 0030、content-types-3、content-management-1 落地注册式文章/说说私有草稿 CRUD。新契约 content-admin 1.0.0 固定后端 2799197，数据库显式升级 0009_content_drafts；公开内容和 settings 1.6.0 不变。正式发布/撤回及可靠内容分发未交付。原始 v2.11/v0.14 字节保持不变，历史摘要保留。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `1b07c53c13e27c89a646ba157ebf58034108324b142478eac69f1e41d5d763a4` |
| `docs/architecture/content-types.md` | `778c2b194f80c51be69b0fba089cb12fef62dd12b7cfe0a48affd3df765fe171` |
| `docs/architecture/constraints.md` | `748f00fb7fe6d475c5e90f26a356a1649df3a808dad6d1474d0c58c033ab96d8` |
| `docs/decisions/0030-registered-content-drafts.md` | `2cac70f45899013aa521bdb917975f25a247f79fc6b977f8213f4dd7681fbdea` |
| `docs/development/content-management.md` | `265be9587afff837973cfa7d4457699cc3fcc712ba715ca3a4bb1ac58b0c85e5` |
| `docs/handoff/content-management-verification.md` | `82a75c6ecfe0be1405e481dff62aacedbdd63a19c9a91dd8362cb4a2d1c1c1ed` |
| `docs/design/content-draft-preview.png` | `0d26dbf91e78e349e2782cea960dea61ff12feeed4a16dc77b2fa131935207d5` |
| `docs/design/content-draft-mobile.png` | `52478a83c57dcd7d9b2fd6d654dd17c1115da14371da212968598b5728a627ba` |
| `docs/design/content-draft-list.png` | `04fc300c35966ae678689b628146b1b90fac0b45e2718a180467c034e74da231` |

## content-publication-1 同步摘要（2026-11-01）

本轮 ADR 0031、content-management-2、content-types-4、settings-runtime-6、bootstrap-5 接通真实文章/说说发布同步与独立编辑页。content-admin 1.1.0 / public 0.2.0 来源提交 a86479b；显式迁移0010。settings 1.6.0 和两份原始附件保持不变，历史摘要保留。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `6f392b340260dc473318406f871a463fc145face09e84ed1e97efdaeb88e004f` |
| `docs/architecture/constraints.md` | `9df244691eb7e6bc6d74b1125c15b27f902a1673b6a0d6c39e67eee1f00e058b` |
| `docs/architecture/content-types.md` | `94b15465e40d4d85f6ab04e324992c7ee7c218e3d0cb85a814787c6028d33594` |
| `docs/development/content-management.md` | `6806a3e81c373867de76aa5be2c02f772ff57987b17bdfab166bab7862bbc870` |
| `docs/development/settings.md` | `f7e8ad684c26255a3a0e148a3cb995483385faee4315ef003b780c434655a13c` |
| `docs/development/public-reading.md` | `345f965dbcb18b9b797c2a14dad5498fa6618f30089bed16d6174d96dc785748` |
| `docs/decisions/0031-content-publication-and-editor-pages.md` | `4eee310ec38e4eb84d25c174af21444f072586b731cfd6a0c1fb45a73f0b5f48` |
| `docs/handoff/content-publication-verification.md` | `4a328d1a4852b47cc1f5aa014a1a66f386a7ec3ce802d7b374b8d3e25cfdb5d0` |
| `docs/design/content-editor-page-desktop.png` | `2b2841178bb622c838024a01824ba72d9a4262369d36b344b7febe6c460181eb` |
| `docs/design/content-editor-page-mobile.png` | `9273b4a6bd57a44f39c1cc81aa0563b4a918c8a4ba350393b48e47d2b8af89c9` |
| `docs/design/content-publication-reading.png` | `460fef4352e3f9b2f4acae5867390129bef9dda440e408cfa0edf295941dec7e` |

## functional-test-data-1 同步摘要（2026-11-02）

用户最新要求测试阶段仅使用后台新数据，按ADR 0032撤回开发库旧公开WordPress试导入并正常同步；原行/媒体保留。同步区域改为局部样式和紧凑响应式布局，指南content-management-3。数据库0010、API契约和两份原始附件不变。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `f67e5b680a1ca9bd1a37d985d0269df9e040b021155a896284cdd68e2ade7c21` |
| `docs/development/content-management.md` | `3b3876d73383ab280df9a847ba3fbb87d320aaccc97160b9dde0b146d7fb7a7e` |
| `docs/development/public-reading.md` | `bfa49cb575336aba6d6c7cd9c96929f27d954999dbb4713351ca522d20729dc1` |
| `docs/decisions/0031-content-publication-and-editor-pages.md` | `05660dc10565e3cfd9f8a3b9d98089e5c0233d01f0bd67549cdf87379b0996aa` |
| `docs/decisions/0032-functional-test-data-and-sync-status.md` | `78f1dd37074d8ba1cb1e6823fb94f8c9f35437d75d3b46bfde9a705025eedd24` |
| `docs/handoff/content-test-data-verification.md` | `686f66e514528cdfb3ad35b5a08ca2aa7426ca2201d8b172ed2f6c3a1975f3bb` |
| `docs/design/content-sync-status-desktop.png` | `466e3a4a9684e817575e7da4a08da763cd614390fb95c6c910b7042210566da4` |
| `docs/design/content-sync-status-mobile.png` | `f631906a9944827eb50862e79718e58c3fca7c8c7ba25291ba2c6fd35fd0f5a6` |
| `docs/design/content-test-data-home.png` | `0975949893f10f8831eda097c0649d76290b312cfce7fb7a27cea5880ab033d1` |

## editor-workspace-1 同步摘要（2026-11-02）

ADR0033–0036、content-management-4、content-types-5、admin-ui-4、development-9已实施。content-admin1.4固定d31b359，public0.4/content-access1.0固定fe1a651，数据库0012；settings1.6和原始基线不变。AGENTS公共部分同步、前端保留Next附录；STATUS按仓库维护。截图仅本地新系统测试数据。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `66df65469d4934a74307a803cfa580baaf9584d6957b348a4724b0c6a01679b7` |
| `docs/architecture/constraints.md` | `4696aec8a2a901f3f19d08a649286d3398bb130d0f880ca956e817abf0e7c438` |
| `docs/architecture/content-types.md` | `8a8c5281a854a701a788b2b8d193d20d7d9e4ebae1fc274573c1b416a986a18c` |
| `docs/architecture/admin-ui.md` | `56b33703292c654593ecdd59ee71e36ec1c07624e10d857869c5f08f37341be5` |
| `docs/development/protocol.md` | `82103e355fd78c6c61e36403243704e0daea378317397cb94841a6bec5f9ee4c` |
| `docs/development/content-management.md` | `3d6bdfe0ee7c7e4d55f2a1c7de024e6eec16741d0417df90e7a79a7d20356d32` |
| `docs/development/public-reading.md` | `291af97b7e5733f48e005c65a6209daa3976bde251a562405ad97c0dfb9efcd9` |
| `docs/decisions/0033-content-editor-workspace.md` | `783f4955845d50cf42b00c6530317b410486fb1a79b8344aa7cd27fcfb7284be` |
| `docs/decisions/0034-wordpress-editor-access-and-taxonomy.md` | `5964451bf2caa57e8dcadaa81e3ba3ebd248d23f731c2f5a471c3f03e112043a` |
| `docs/decisions/0035-admin-panels-and-editor-controls.md` | `f33c1d4718056ad99944745b0a7a69fb62233b2906fb63ff22247dfa39499d24` |
| `docs/decisions/0036-inline-confirmation-and-authorized-editor-links.md` | `ccd955083f2be3649c3c6a2b2246d61b3d760bf5dbb50642cbcb397b258f5078` |
| `docs/handoff/editor-workspace-verification.md` | `a8ca0266fcc551312ce12c48f7f0a4dd7095f606828234b313e11f9126cee0b7` |
| `docs/design/editor-workspace-desktop.jpg` | `631ecbaa3e19ef2af14f54567b28eef99b0bf7610e3a81dd2c6bbf6c2e1b8b03` |
| `docs/design/editor-taxonomy-desktop.jpg` | `81a26abd207750f198e5e3a15e6844c74ce163f7b91a5cf07186d492df7ae6e3` |
| `docs/design/editor-date-time.jpg` | `978ff35fb0382fece172fef8a5ee7c61a9952bfaea79868719792f0ba5fcc199` |
| `docs/design/editor-date-time-mobile.jpg` | `1ab304d346a18b1313b0b3bcbdc800440ae185508b9d57fd72cdaa354385c771` |
| `docs/design/editor-date-time-dark.jpg` | `8b46dc1cd41012cb6fa62737788f84e86435e11e569c6686184e94d5346aecc0` |
| `docs/design/admin-settings-panels.jpg` | `4fcd188b1dfb32694addf3a0455d2f66bd1a2f2a279b5ef32719375b7efddf2f` |
| `docs/design/admin-settings-mobile.jpg` | `c2f4639b938422ae59f4c8b5d83f4a47f1691be3b2fc1ce42024abe1dc24aadf` |
| `docs/design/admin-panels-overview.jpg` | `955b95ca27aae916d667b16fe4228fd5723082e1c47dd511948026cca6f6bb89` |
| `docs/design/public-navbar-gutter.jpg` | `9705bd3a7d5bedb61375beb13574a731fe2f1ff931b0fab3e603fdc024e572fe` |
| `docs/design/editor-block-remove-popover.jpg` | `0d8b76f0c3ee1617e9f1e1f0fa2cd52108457555869b6feb1d3c6317da6b242f` |
| `docs/design/public-content-edit-link.jpg` | `66c723071bc1dcd0133ccbd3fc885f837662f514eb6dc642cb542073dae79cb4` |
| `docs/design/public-meta-alignment.jpg` | `3922d1e12b9e5d347cb36db52fdbd91a5756c50e948a60f587cc139615515247` |


## 2026-11-02 协同试用同步清单

原始基线 v2.11/v0.14 不变。协议 development-10、协同 collaborative-editing-1、编辑器 editor-plugins-1；ADR0037、公共约束/索引和验收逐字节同步。AGENTS保留Next.js框架自动生成块并在两仓库同步，该段仅适用于前端；不得删除以制造干净状态。STATUS保留各仓库历史，最新交付段分别更新。以下是本次当前文件哈希，前表保留历史记录。

| 文件 | SHA256 |
| --- | --- |
| `AGENTS.md` | `f8489f2bfb060035f56d912a906ef04689c1954eb7fa9c44438f2fff4e6cec26` |
| `docs/README.md` | `df2b49267e98e895fc9f8a80b772b46ce3b27111da04f4278d0b77b8995e0c40` |
| `docs/architecture/constraints.md` | `2b4fbd17bc823b2f97b361a36c0d91b2e099cdf47ec05d0d5a1aa8f52064f8cb` |
| `docs/architecture/content-types.md` | `8f0554a294a351d775563877e9cacdee4fd70769768bba9042bac3457d7f33bc` |
| `docs/architecture/frontend-extensions.md` | `dae0ea48aa97b92b1fb662711b1b5952f50e0d0ee10543a9c85816283dc5dfc0` |
| `docs/development/protocol.md` | `dac00ea02717f251147c38227f6cd0b7a883ee9debafdc55b544ad4d49de1030` |
| `docs/development/content-management.md` | `0acd4727aa6c360dbfabf423b6994b2c4ee6ef611b9364836f660aa334ec55fd` |
| `docs/decisions/0037-plugin-editors-and-collaborative-drafts.md` | `71dfbd8d563c482d7feb24812788781cf5f473f129d96047ca2f1e6dd14d2ecf` |
| `docs/architecture/collaborative-editing.md` | `f311532d288f3a46955c81892bc7b3c1673637a0f99d82dbaec1753acca53882` |
| `docs/development/editor-plugins.md` | `8d3d93efe9ec133e188bc3de0886a519eb303dc204e44aa68c645a2f4d1061d6` |
| `docs/handoff/collaborative-editing-verification.md` | `6fcf71bb5ca1af27069d37b86c880ac3006264f3f967e5616d713f5fd4180e03` |
| `docs/design/collaboration-editor-desktop.png` | `bdb4069c445253650248bce2d297d80b85e89419399c645543d82aec1bfd53f6` |
| `docs/design/collaboration-mobile.png` | `31443f624795ac1ddfd1254d6b978ecf9676801592b65bd64d02073abe97e1c7` |
| `docs/design/collaboration-offline.png` | `0b0e075d490d1f998dd5ffa4cb8f843123b1ea780467332b6f93300ca3547932` |
| `docs/design/collaboration-recovery.png` | `59b8a60c891909dc17daf4f65a090bc3ecde551d653accb4c0306a27e227f84b` |

## 2026-11-02 源码编辑器交互同步清单

ADR0038、editor-plugins-2、共享索引/验收/截图逐字节同步。插件界面版本1.1.0；协议development-10、协同schema1.0、数据库0013和原始v2.11/v0.14不变。STATUS各仓库分别保留历史，最新交付段一致。历史哈希表保留，以下是本次文件摘要。

| 文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `d1795e3639f5942a789c6d2b638b0d69ec77f6474bc5d3fe377466cb98756c75` |
| `docs/development/editor-plugins.md` | `a0c1e18a94427f85d32a2919be201af70ac8b85c5ef52e01f1f21b770e4bdb84` |
| `docs/decisions/0038-source-editor-interactions-and-shortcuts.md` | `29d8e20e0c0ee01189e3594f33910881ba006912a71b691ec3fd88002cf0b202` |
| `docs/handoff/source-editor-verification.md` | `c775c9927486d2187273b460e44cb0bba5a9c1a9d98d3d83daf79a0ffd1e3981` |
| `docs/design/source-editor-desktop.png` | `14e4076ca1aa8967415934a38bb474b3033dab3384ed8953be1e1dd3d251ec29` |
| `docs/design/source-editor-mobile.png` | `2b20518a326fbdc4a10f9cf8fd2da131848b0392c82b551d2ba36fb7394ffc77` |
| `docs/design/source-editor-dark.png` | `78d8c4e6a3b6875fd82da9c6faebdb1219d544ba67002240b32d6e85acab2057` |

## 2026-11-03 区块库与拖放同步清单

ADR0039、editor-plugins-3、公共索引/验收/4张截图逐字节同步。协议development-10、协同schema1.0、数据库0013及原始v2.11/v0.14不变；STATUS分别保留仓库历史。本轮仅本地提交，远程由用户推送。

| 文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `27f030323ecb7ad44ebb31eeed0868a8cbd443270a833241e8a43b704df9a25b` |
| `docs/development/editor-plugins.md` | `93d7f93b84286b844a2cfc2bbd7a39a1d6338c03333cfb8b105099c0191cfd62` |
| `docs/decisions/0039-block-library-and-anchored-dragging.md` | `10f7323969f2644429eb84b0eaed35d8e1bdb5065578e1cd7c5bd955f6d09c30` |
| `docs/handoff/block-composer-verification.md` | `18dcba0328a1dba32d88a396d525c7caf314d361aeb2f2d58279b1d4779db69a` |
| `docs/design/block-composer-desktop.png` | `6c7239dca51239967e5957de171a5c070c3e47cb709f3470dccaf8c91c989b3c` |
| `docs/design/block-composer-drag.png` | `20b481cd50f7a743d69eea5b017f0487c08297cd4e9760a31d05a760cb6c161a` |
| `docs/design/block-composer-mobile.png` | `a133bd92849909dbbe4701dbe135df1b0d8e8c61123f8eaf6add5185ea01af19` |
| `docs/design/block-composer-mobile-dark.png` | `f5251db94c8e0696a4951ab72b45d96e1cb2f95ce2e224f9b8eea04ea04f8b0a` |

## 2026-11-03 编辑留白与十行高度同步清单

用户最新要求替代首行紧贴/无最小高度；ADR0040、editor-plugins-4、前述ADR替代标记、公共索引/2张截图逐字节同步。STATUS各自保留历史，原始基线、协议development-10、协同schema1.0和数据库0013未改。

| 文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `23b365ab82e3519a6574ebdcaa815ed177287dad1c1631f3c861047584e99770` |
| `docs/development/editor-plugins.md` | `90e5025e92c34c51a19498f635d3a662f5ab6d055acd213ada0730fb848f6914` |
| `docs/decisions/0038-source-editor-interactions-and-shortcuts.md` | `35c5042bdf2c005e09e64a72be85687f089797d09b38bc2050199c1810e61db5` |
| `docs/decisions/0039-block-library-and-anchored-dragging.md` | `4aef31c5180e76d726b93749d1c9ec1ae7e15682dc23620299a4f57b0156eda8` |
| `docs/decisions/0040-source-editor-spacing-and-minimum-height.md` | `55d9fdea03bf4f83d2687aeb86d9d2adc4bd04687f86f97b824c37d849aa2a77` |
| `docs/design/editor-minimum-height-desktop.png` | `bc7921e0b8a834140801ea99ee2f7fc752ceb7d6226f2c2e558afc8d40a6fe6f` |
| `docs/design/editor-minimum-height-mobile.png` | `c4597b150e13efe6c32412db4264aff5d0e0d3c3639f8233baac222b256a094b` |

## 2026-11-03 添加区块选择器同步清单

ADR0041、editor-plugins-5、ADR0039补充/公共索引和2张截图逐字节同步；STATUS分别保留仓库历史。原始基线、协议development-10、协同schema1.0和数据库0013不变，仅本地提交。

| 文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `9156cad3ce0b3caf13052d727acf085b8a6b721ea5d23cdad5b0905ee44acfae` |
| `docs/development/editor-plugins.md` | `86c4812e47a85eab9e765d456c146c1555b3aa8c6b150e98f39e0bf5402695d4` |
| `docs/decisions/0039-block-library-and-anchored-dragging.md` | `f1c7497b77ca53dc5079e4f31d995adf647b57126fffc54c02d6110184d8fdd0` |
| `docs/decisions/0041-block-insert-picker-feedback.md` | `afdd13195e592047c74501bb01948bcd528a470f0532f9a44406c78403fbb984` |
| `docs/design/block-insert-picker-desktop.png` | `3719e933e0246c5dbf25b54baa5c56c0768128bd7963a68762d4e4af73e42b0e` |
| `docs/design/block-insert-picker-mobile.png` | `b74083d8a899852688fbf465eccc98d9a9c8de3c998560e6efc77413996ef2e2` |

## 2026-11-03 字体按需加载规范

development-11 按用户要求明确前台仅请求所用字体、文章依赖收集、系统回退及网络验收；后台预览可独立加载。此段记录规范修订；实施与验收见本页后续交付段。

- docs/development/protocol.md SHA256: 022b4c4734982860db39b1c87c036db626d46048a4bda7e0fa9a51919ffc040f

## 2026-11-03 可视化编辑器与字体库交付

development-11字体按需加载规则已落地；editor-plugins-6、collaborative-editing-2、font-library-1与ADR0042同步。以下是实施/验收文档及真实截图，不替代原始基线。后台字体和暂存源码的范围/限制见验收。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/decisions/0042-visual-editors-and-font-library.md` | `8ba2eebb26e88dad6f595c24cb9813e4d71748aab9b5ab04caa28c3efe3eaf09` |
| `docs/development/editor-plugins.md` | `6495f0154497920c414efa7cc5e18bbf3755d107ef3ef77cb6df284e5ba10e2b` |
| `docs/architecture/collaborative-editing.md` | `e00f7d1fb42e76b00eb0b0840c22005525045c2d5b5fd685ee0c678aa7b07ed0` |
| `docs/development/font-library.md` | `91ebeb746a050f61928b14c9762896787047a67a7b28e59acca46baa8a3678ef` |
| `docs/handoff/visual-editor-font-verification.md` | `9fa9f3fc3d349fbd2f03796e4637e359579cbc1b1edb9b8bfe75e1cff932f253` |
| `docs/README.md` | `90966a5bbe153fc426d75988f4e8f5c706565bae58156468523b649522ab61a7` |
| `docs/design/editor-font-public.png` | `6b4bcac81d189bd25bc2cdeda0e13c8c44d55a67dbf346340504f038ac9066fe` |
| `docs/design/editor-source-recovery.png` | `5b0872b71facde337d5cc01a3bda38dcc11638f90dae1cbc121cb88fa404f607` |
| `docs/design/editor-visual-mobile.png` | `70a384730f1fb4b9883f29618e45af54f101ff095cbfa481ae0197d106196f64` |
| `docs/design/editor-visual-desktop.png` | `4c0f6a661695ecd2fd130905a06e6ee1cf1beb4adf7cdb6e4032e856cbb6a06c` |
| `docs/design/font-library-desktop.png` | `db36535d28eeffa3f5925f4a92746354580e4afaab7f6c53ee4b6639e02b47a4` |

## 2026-11-04 编辑器生命周期与位置历史修复

ADR0043、协同架构3、编辑器指南7与实际回归同步；以下记录更新后的文件哈希，原始基线及development-11不变。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/decisions/0043-rich-editor-lifetime-and-position-history.md` | `269e2c34a5ee1e48114dcd5f357869ea6528dea863d7c6ec5e10f51c646721f7` |
| `docs/handoff/editor-lifecycle-fix-verification.md` | `5057898b2e56d96c5694e33461985fc8eaf07342de97e8da7db4a2ea62cf760a` |
| `docs/architecture/collaborative-editing.md` | `d8cf8562ed8ea4d5a5d6390564c3b9caa3c54a1476ea579c224eaea99b863be5` |
| `docs/development/editor-plugins.md` | `a0d04992d66b58dc1901422449ad39bc771c65c7154f2cda76dbe4b9c3f4dc03` |
| `docs/README.md` | `5fe560a12a60d1673a289d8376c4b219acba6eb066286ea52c275ed442401c0f` |
| `docs/design/editor-lifecycle-fix-desktop.png` | `41af02af36b1d919b14873d8e891e2aa8a20a463511f8ea0d3953058097d5de7` |


## 2026-11-04 源码底稿与图片交互更新

ADR0044/0045、editor-plugins-8、collaborative-editing-4及development-12按用户本轮要求同步。原始基线保留。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/decisions/0044-source-first-blocks-and-whole-draft-save.md` | `7bb17920d50490a5a40cfdd9722432f39c4f546937bcf8c566ee718ea5188a3f` |
| `docs/decisions/0045-inline-image-upload-and-editor-controls.md` | `b781f0548ff838509c3d494ec08b5bf7118204c53150ccf212b58fe848759033` |
| `docs/development/editor-plugins.md` | `573251cea6fc77e7e4cfb1c6263b938f28ad74ccb869901920d4eea19faeee0d` |
| `docs/architecture/collaborative-editing.md` | `54657bad556253fe3e048a9328bd0731eff0a41d6658430ac14230c071d47baa` |
| `docs/development/protocol.md` | `1b9a332dbb5bf713b298cdf7b239ea8c42afd0fb48d037135092ad0810b44a34` |
| `docs/README.md` | `99723534027a8f41bad7067531c79ce93c7f36ed94c4456b0925ce244d71dc98` |
| `docs/handoff/source-first-editor-verification.md` | `844efaee098508aa6a53c066adddd7d5917d199a66211eb25c49c46b60beea6d` |
| `docs/design/editor-toolbar-neutral-desktop.png` | `c44e080a0e34e833ad3437ad4cbe6c418eaa5979035d854a8010d48d8d20d866` |
| `docs/design/editor-source-element-selection.png` | `198583c46f1fe92ca4d2159e22dcde967e99778a3a36af6cc60cecb4a78cfaf7` |
| `docs/design/editor-source-first-mobile.png` | `5d0f4547fcdb1a0b4276672b82d04f2bba95fb2145b2c38c406f572cfad7ef5d` |
| `docs/design/editor-source-first-dark.png` | `076becf423a153d53736c37045fa86723cfc86592e75d1056410fa57f9186e10` |

## 2026-11-04 编辑区容器与锚定表单修复

ADR0046、editor-plugins-9、前轮尺寸验收更正、本轮回归及4张截图逐字节同步。原始基线、development-12、协同契约与数据库0015不变。后端此轮仅文档更新。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `3d08115c027f11e9c7a5b220516b6c5e9447fc936dcd9795d5043a9faceae962` |
| `docs/development/editor-plugins.md` | `d9fc1b45b086558ed826385ee38d73164fe83055e0046c8f88bde2b5621211e4` |
| `docs/decisions/0046-editor-canvas-and-anchored-forms.md` | `e225643fbab845cb6db33ef6d4d087db0451ea9bcbe5195c26ab012b9f433c32` |
| `docs/handoff/source-first-editor-verification.md` | `b8a7c2374ff229726056d8df7663419e37eae04c1dccddb7987ad099ac12ab52` |
| `docs/handoff/editor-canvas-popover-verification.md` | `2a79020d7db20eeef0fba3a085a5889fc8ba3c91440a1222f53660c127c4c896` |
| `docs/design/editor-transparent-canvas-desktop.png` | `2afa07398d2a040847398cd313317a812817d338ae1fd8b873898752a0b363d4` |
| `docs/design/editor-link-popover-desktop.png` | `a16e4b3d61fc142bf7f09d2602f579e2438857fb1f711a6d31df8bdce11b623f` |
| `docs/design/editor-link-popover-mobile.png` | `25b208042d1315bca3294181b0f88cc622323953b8719870093769019e12ff91` |
| `docs/design/editor-link-popover-dark.png` | `ca2fb9ca41abc295a7ba67f5d283161e8de52e1754e8fdcd2c1c46294ceef186` |

## 2026-11-04 单图标视图、大媒体窗口与新增 HTML 分行

ADR0047/0048、editor-plugins-10、media-library-runtime-6、本轮验收与6张截图逐字节同步。原始基线、development-12、协同契约与数据库0015不变。后端仅文档更新；阶段构建与最终检查的范围见验收。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/decisions/0047-compact-editor-views-and-media-picker.md` | `4094b9cc3b9a950147f0d9fe1a5d30cec80631c4deef39b53d0653989b7d94bf` |
| `docs/decisions/0048-new-html-fragment-line-formatting.md` | `42466557467c65cbac533d1ed936021c4aa5779e9503eb07b19656461f48f886` |
| `docs/development/editor-plugins.md` | `f1d904519b25cad06592529c8a96973dd4a1e4c459f73022eb03843ba7f9c0ab` |
| `docs/development/media-library.md` | `6623320fe7959961c3a1c74c111d5e298c361bbbde2a56e4b5a1a31cba341220` |
| `docs/handoff/editor-media-picker-verification.md` | `3eef954a96ed36aae89baf2f5b8e8124a8942a43ffcf0706d3ddcb43d9b41812` |
| `docs/README.md` | `cae9282b6fe4c61b18b185b4886542ff5d162a6a6f0a2da4818810ff833a70d1` |
| `docs/design/editor-view-icons-desktop.png` | `892d96da25ecef4e7fd96eaa52ce117141d857dd992eec3899989411b63c5c6a` |
| `docs/design/editor-view-icons-mobile.png` | `9eaf26ba5942bcda457ff722a39ae2b3486fa697d9b645a87c4a2fdab89e62c1` |
| `docs/design/editor-html-new-lines.png` | `58ac94e6b24dad7d650ebda3f7f847d900d1f7a5b7a1571dc69dc1807baf570f` |
| `docs/design/media-picker-wide-library.png` | `5a41481f47e2f464c81b2036b803e4191bd020ccd0dc0bb3128cbf10f2dda0eb` |
| `docs/design/media-picker-mobile-library.png` | `b0a9887e8db3ccf067f89b6be7f71bf292f399ffffa1f225002532fa4830507f` |
| `docs/design/media-picker-wide-dark.png` | `7fbdbd13d37361d8da50fa3b5e5c8604f3dc16b40a86b2dd6ef779800e3acfe0` |

## 2026-11-04 代码、公式与共享分屏状态栏

ADR0049、development-13、editor-plugins-11、content-features-1、验收及5张截图逐字节同步。原始基线、后端契约、共享WS Schema及数据库0015不变；前端新增依赖与资源版本见ADR及锁文件。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/decisions/0049-shared-code-and-formula-features.md` | `73937607d0bd62a72a7675a0bc2c1eef9257632628d79abf640b91232a6a5b71` |
| `docs/development/content-features.md` | `f51db28177c3ff9a6b5f27daaf03590065b6b32dae92053ee112642cf2533f65` |
| `docs/handoff/content-features-verification.md` | `185f333007927be55e915f00c055631b6c438615ad464105202f77d1cd8b5c53` |
| `docs/development/protocol.md` | `2abf989fdd50db3f890a8966052285dbf9b72dc2e7d53949c00c89de06cc858a` |
| `docs/development/editor-plugins.md` | `6d54c1d3283ac1058e7f10e63352856104eef7db8742135877031bf6d5bff1c4` |
| `docs/README.md` | `afed3b8178ecf29e04809a6baee44d961c85a2e35c9b2b8c92dc5238a6081da4` |
| `docs/design/editor-code-math-split.png` | `f8a955b754b4962cc4982dba11dbb7b66d1460a313722274138135af962c91b1` |
| `docs/design/html-formula-dialog-desktop.png` | `d775ce42e4c5642c984e1c7fcefbe848c6ae6d9f6a414237e3dac6ae26a1fc33` |
| `docs/design/html-formula-dialog-mobile.png` | `778036582b5b5dcf210290cda1a88455c10e15afe78d6da39b141deb195a83d7` |
| `docs/design/editor-code-formula-dark.png` | `1eb9bf940ad37d453820dea2d711a518993ff04640767fa01668119bff676525` |
| `docs/design/reader-code-math.png` | `9c99242196f2aebd183cebd1231964c588c617097a277c0e79a012de6946bed8` |

## 2026-11-04 结构化公式、主题吐司与私有前台预览

ADR0050/0051、development-14、editor-plugins-12、content-features-2、新指南1、两份验收及8张截图逐字节同步。前端功能提交见交接；后端代码、契约及数据库0015不变。本表只记录下列文件当前版本，旧表为历史记录。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `7e37b75941de76d09e7733b89b45e83b22ee30f199f5c7606eb174a1d6fa9431` |
| `docs/development/protocol.md` | `e0ffdc4feb75aae05f120ab1050bf0ebe407ac7b4f3eb4806436d035b3650b36` |
| `docs/development/editor-plugins.md` | `295446613b256afe8d88023e374273dfe8d4e308d7e27687c5099f273d863f9a` |
| `docs/development/content-features.md` | `6c89b026fbe7d4a89268b2cfdbd46ca139a5ca486c7f2033b9f856f4e9d58c0c` |
| `docs/development/formula-editor-and-toasts.md` | `c0f5cb029c58ebaff9612d8e58005d8c1229c18014533bf0bf2469a4a805855e` |
| `docs/decisions/0050-structured-formula-editor-and-theme-toasts.md` | `94dd45577fb7ec764a2369678a56d91112d147414ef5146276b96c5b30a721b0` |
| `docs/decisions/0051-private-frontend-content-preview.md` | `3998c9121eba122d0306c86f0cd1d0481d2f1bdedca07b92146553f3c4b65107` |
| `docs/handoff/formula-editor-verification.md` | `5bf1cdac8a07a989d9fcf760910a17a80c29074df1be6ca1959de76d81c12058` |
| `docs/handoff/content-frontend-preview-verification.md` | `61c0cbd09c943126ce62aa63d587564a2e5a8f932f0fbfe9ab2f2bb565ba3b60` |
| `docs/design/formula-editor-desktop.jpg` | `ca8da43e6ccdf71f39d8c94054161560290ebb397a750e450f0f48f3c35f3670` |
| `docs/design/formula-editor-mobile.jpg` | `126027b0611fc1ab0073ea5cacf5c0b7cf65daccb831965689b8d2c5065dd695` |
| `docs/design/editor-image-upload-toast.jpg` | `7095665f661e2208b24f70dbf4040d5acb4805591edb28f763e065ca9f7a4346` |
| `docs/design/editor-image-upload-error.jpg` | `3a3a850559128ba93a33d4e4c9b23722f62cf9c7d93ae99e1b7d9832f1f56d4e` |
| `docs/design/content-frontend-preview-desktop.jpg` | `df18e8a4e1b6274358c68d8ae191f25d93225b39d882bfe2910992309ae0210a` |
| `docs/design/content-frontend-preview-mobile.jpg` | `3566c890b8ad82bea97a0e2abf86db2f11d0d93ca7893517dd5a333f52d1e286` |
| `docs/design/content-frontend-preview-features.jpg` | `66b83ee7baf247963fa9a67cc143688d5d8cd494c68cf10d2228b001cd928dad` |
| `docs/design/content-shuoshuo-preview.jpg` | `41d03cb879eb5fc635fd44ad45f781b448a37b5f176f5334ec674133adc80d99` |

## 2026-11-04 共享代码框与半透明展开

ADR0052、development-15、editor-plugins-13、content-features-3、settings-runtime-7、code-blocks-1、最终验收及5张截图逐字节同步。后端settings1.8.0来自20ecd44，前端464bf54/93fc320；数据库head仍0015。下表为这些文件的当前版本，前面的表保留历史记录。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `ad3d55586c13a67ddac6b83b74186cb4789d7b04e7a43771e58af77c48e13beb` |
| `docs/development/protocol.md` | `84aa16172dfd1f2ce9d9d13ecd629d5b0ae8e51287b1d998fc717429fdfd1404` |
| `docs/development/editor-plugins.md` | `2afd308447a1af311dfe3ab6a509a05129b43a689e2db3a32a2f9cfc7ecb833e` |
| `docs/development/content-features.md` | `ccbc069c6ff55e9b92ddd4cde9a2e77a53ad08352cdd49bc21c2d99a626c1a80` |
| `docs/development/settings.md` | `ef78b23133ae81f12311ae2fb315daadcd6f4b8c7eafda4dfdceaa58ec5d711d` |
| `docs/development/code-blocks.md` | `69f0e79094d2bddb8b315a798d3fe9c4f4cc9337c3b3c162e270f223aac33b07` |
| `docs/decisions/0052-shared-code-frames-and-source-options.md` | `6574e0175e0b2ddb6f105d8b2a2d13f82e500edc63af202a43393a5fb6293513` |
| `docs/handoff/code-blocks-verification.md` | `f642b29830255b6e968c5c4b9f6174b47e09205f1eafa0da4c128b4c02c0198f` |
| `docs/design/code-editor-mobile.jpg` | `d3e5c0c1e2fd1bfe76a7f8df61bcd9d087196b08e0947a00502d33d7f3408cef` |
| `docs/design/code-editor-desktop.jpg` | `6e2d391530304f9a5151e4a0728a4afe261348e5e5418988bc44005a2612c64f` |
| `docs/design/code-reader-light.jpg` | `9176c9e82183c5bcdcaa92723dec93ffa52a8967062ab692288ac27dc7c54c2f` |
| `docs/design/code-reader-dark.jpg` | `4c0f4d8e5c2cdf38f578754ab59be940b61c19f6dcfa1bdea33658c6888cdbe3` |
| `docs/design/code-reader-mobile.jpg` | `3055428fb31a3cad4a7d0fe799fbba2e68b9105cf5d4cde6d7c8c92edcb1b3f3` |

## 2026-11-04 新设备容器 HTTP 部署

ADR0053、container-deployment-1、部署验收及公共索引逐字节同步。当前用户要求HTTP内网开发；原始基线、契约版本及SQL head0015不变。实际TOML、凭据、测试稿、缓存与日志不提交；STATUS各自维护。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `353754f4d0cdf5ebd01fc3e38bd83dcc925757498ab712a0c512b577cc2fc648` |
| `docs/development/container-deployment.md` | `7a01cac059735d99e06572da677613f6d72dd00cb09e41fb0a102411e3f804a7` |
| `docs/decisions/0053-container-http-development.md` | `800d2bb8f36992affaf1f8e7016ce648c8d1e812bdf69c4380234da0e7869248` |
| `docs/handoff/container-deployment-verification.md` | `9384a1cb18cb69116cbbb4ffca4e9bb0f17bc6a202f9d50b1667d8a31112492a` |

## 2026-11-04 功能测试长文与本地联调

公开测试文章保留在业务库；本次同步验收、container-deployment-2、公共索引及4张自建测试截图。无代码/依赖/契约/SQL迁移变化；文章源文、媒体、实际配置和辅助记录不提交。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `3a8d130c6b151959b1fcc76e0154612657550b4f462a04bd809c41b6e144aaf2` |
| `docs/development/container-deployment.md` | `205d2de1fe896f863e845acf84bc9c498a190920c608a3637e0345bcdbe13afb` |
| `docs/handoff/feature-lab-article-verification.md` | `cb235e2eaac4a7152e3328d90d6b5594a431b79e2c1747749f1fa119a9acd1f5` |
| `docs/design/feature-lab-code.jpg` | `814e3c30e068819cd59befbb9de362b38c7e0465819aa484737644d8b132c0d6` |
| `docs/design/feature-lab-formulas.jpg` | `a36373e34f9f3dd8e98dc13d54652ed885cd38101959856374eeefbb003f6d4b` |
| `docs/design/feature-lab-dark.jpg` | `46104ea3e81857d1057398a7dc2f4586a84ed92b9c401653bf97d955e2d4f513` |
| `docs/design/feature-lab-mobile.jpg` | `4497d3aea2c849724e6b2f4c87448b9074768f4f8137d099c6e3baf0afac7f61` |

## 2026-11-04 编辑器预览操作进入导航栏

ADR0054：单组预览操作随滚动迁移，焦点/状态保留、双向动效和窄屏第二行；共同验收、索引及两张自建文章截图同步。只改前端主题布局，不改依赖、业务契约、数据库或实际部署。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `9eff5859d44af1bf585a6b588bf11a4a3d9ed437a2f4cf94f11f592228ef7def` |
| `docs/decisions/0054-scroll-editor-preview-actions.md` | `cf43f0e92ccd6995167ac7574fc05f514de7a18b95f14256d25efa36810f64bf` |
| `docs/handoff/editor-preview-dock-verification.md` | `72399a937c2e8784dd76d51cb771a6cef4b395ed67ea87436ad5fa7c7266f47a` |
| `docs/design/editor-preview-dock-desktop.jpg` | `d3ef55c2bd3847821f5da969f2cc8f5898e993abeaa7aa2a244e4135b15ad007` |
| `docs/design/editor-preview-dock-mobile.jpg` | `5b4d07b412aee99de26dad3dde48fb9ab683241e545db5d4984380c0a12a2ba3` |

## 2026-11-04 Markdown源码语法高亮

ADR0055：共享源码标记分色与浅深色变量、围栏按语言加载；复用既有语言清单和窗口加载缓存。共同验收、索引与3张自建文章截图同步，依赖/业务契约/数据结构不变。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `6467814991dd8c9ec6ba84ae4055059411be2df147fee58f309390684ef9b13f` |
| `docs/decisions/0055-markdown-source-highlighting.md` | `711686eff7b8218a18ad1e6f8f195c155004e0729fe679bc968a68287ba57cb4` |
| `docs/handoff/markdown-source-highlighting-verification.md` | `6730852f6c3f430e6f812396c2cbb8b12681b164d8dc5f36c8df0f03e1ead0b5` |
| `docs/design/markdown-source-highlight-light.jpg` | `a04f8b8b70b515b2e10d10f4f994e77e070b5c2da2e08b3dcb7fce3ea0208620` |
| `docs/design/markdown-source-highlight-dark.jpg` | `7746574acfa16dc3738cae561daecdbab9e7d7e23f98698833c9193d0428f79d` |
| `docs/design/markdown-source-highlight-mobile.jpg` | `3df6f462cb9dd352e90f30855734f37fe41651604ae113328b0e992063541910` |

## 2026-11-05 本容器临时入口测试（Asia/Shanghai）

当次container-deployment-3记录了本容器测试中API/媒体/canonical及派生投影的一致性；内容release8与设置修订1已应用，登录/媒体/WS通过。具体设备IP已按用户要求从说明中移除，该测试不构成长期部署约定。实际配置、数据库投影及私有备份不提交；下表保留该次文档版本的历史哈希，当前版本见后续记录。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `d3cf273c36ab19132a9934b9c089f1ab119448af01a98726c4ede4fa7c597f11` |
| `docs/development/container-deployment.md` | `5e397d50be3b3fab1c9b45552e08956a7178f0f75e95bb8a58f6adbd006175d8` |
| `docs/handoff/remote-address-verification.md` | `f9e2d49442aac6b2e56f6c331aa8d5bd19cb1a43c9c8faf1bf94f08ba8c898cb` |

## 2026-11-05 临时容器信息与交接边界

按用户要求移除交接、旧验收、索引、运行说明和ADR中的具体设备IP；仅记录本容器临时测试，不作为长期部署约定。实际IP/临时URL留在忽略的本地配置与运行记录，通用监听/回环示例保留。运行说明升级container-deployment-4，协议development-16；本轮只改文档，运行配置和服务未改。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `cf1b4a3c083ba846459368f4b04a3f2578dc99a4160ca542dece4b5b3f15089b` |
| `docs/development/container-deployment.md` | `656ac1a0ff25d9ce06f80077c6d2799b797301004c93668d48065bb9659eec84` |
| `docs/development/protocol.md` | `8fd2af4c0ed857f8c8069f3ed4262fa9184f8a72dc6e1bcb999dd4397924baaa` |
| `docs/decisions/0053-container-http-development.md` | `7f613f1bba457cdae56e98de104752b3e79e20d57e0daf25cf8544cb796eeb66` |
| `docs/handoff/remote-address-verification.md` | `348b1976056caf2db9807659e7d42e98001827021d6eb675ed186e9818812afa` |
| `docs/handoff/container-deployment-verification.md` | `5edde5332d8a52c2a94e80fc4ebcea19702043f82a4d698546710d92f5e3a3d2` |
| `docs/handoff/feature-lab-article-verification.md` | `59e0816f8ca02c9f2f04fa34f2fc34b3d9d7859a4f45e07cd9ea860e83b4aa50` |

## 2026-11-05 原生短代码与后台样式库提案

用户已确认不做旧兼容、独立样式库、自定义纯HTML/CSS和注册项只读展示。同步shortcodes-design-1、ADR0056、bootstrap-6、前台历史实现的方向说明、索引及2张方案截图；运行功能尚未切换，语法/路由/Schema未冻结。原始基线附件不变。

| 共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `dc1fedea7eb61b6eeb856a41cd5624497ac3e55c28d82f16d86d681b2ab31a2c` |
| `docs/architecture/shortcodes.md` | `211eea2f8760dfd2e11abfc3731f116562e2f70c343f1a86edceb59037d2abeb` |
| `docs/decisions/0056-native-shortcode-catalog.md` | `2279e08eba2913c9617b28aeee432d20f8f0b6f053b11a3096b5d0b926182902` |
| `docs/architecture/constraints.md` | `7af07539403e56010bdd23d291f4845639010677fdc5c9b5dbd03dd60b7f3572` |
| `docs/architecture/frontend-ui.md` | `67bdda2100be1450b333ca39b15703444ac17e44051151b64a31d7d092852e2a` |
| `docs/design/shortcode-catalog-proposal.jpg` | `d22df5381873f5ca0d60359ed7c78d834a771ab765d761319cdb08ba1ee95f95` |
| `docs/design/shortcode-editor-proposal.jpg` | `56a0c20bbd98f7c13d9aa75f09e9115ada5d244ba529aaf8fe4bd4cc2402c414` |

## 2026-11-05 原生短代码与HTML可视化实施

同步shortcodes-2、bootstrap-7、ADR0057/0058、当前索引/验收与实页截图。原生语法按用户样例实施；旧兼容移除，HTML可视化修改保留源文；settings1.9.0、显式0016和对应真实P0已接通。两份原始基线附件及实际容器地址不变，不把本机入口写入共享文档。STATUS仍各仓库独立维护。

| 共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `8a7c4dc932deb892bd840554bced8eb03f4af522713fd6110ffaf12d33c9a6e8` |
| `docs/architecture/constraints.md` | `98a3342d0112589d37755b10c19efbe4387d547ca35247828b649d2f53bac3e9` |
| `docs/architecture/frontend-ui.md` | `4339eee716931bf7568a634639132f727dc76238d8d8da47f2d28b9c320a3e0d` |
| `docs/architecture/shortcodes.md` | `6aed495639254ac7b43daceada8f9dc097c6ad9d96768202dd63426dc65d8956` |
| `docs/decisions/0056-native-shortcode-catalog.md` | `f9fcaa785c0ec2dde8f2194252bd9ed5652c7ed79f6351fe3ed3252754080f7e` |
| `docs/decisions/0057-native-shortcode-implementation.md` | `f0ef20340044d0728d6d755c02097c9e819ba525d80d72bbff029e81ec579220` |
| `docs/decisions/0058-preserved-html-visual-editing.md` | `0625a75f489e98737f5a11cb83b6d61d6c51df4c9adbae1d38ebef4a52694cd1` |
| `docs/handoff/native-shortcodes-verification.md` | `ae53beebf41fe11418829b90e7d4a246e35806eaca6cb1979a79b23316fe15da` |
| `docs/design/html-visual-source.jpg` | `479d6fdb723a15d41e169166ae568bed47f5cc159087c99b3f24e42542c0948c` |
| `docs/design/html-visual-narrow.jpg` | `061dc72c1c0e0dee3f6adbb93ebb8ce2eaab0e156e3218bc7f5001ecdabec8a9` |
| `docs/design/html-visual-persisted.jpg` | `99e1f348723d6c637ea38540387fb7e7e2270f9518eb1e10f4fb22265e220048` |
| `docs/design/shortcodes-catalog.jpg` | `d877d9c35e743100f27872eb4f4b97089cf6cf6a15d36d4efcc98832a1b62c3d` |
| `docs/design/shortcodes-editor.jpg` | `955c0915330b7014a130ddbb43af5909f8e0a983e2aaaab8f28cdaaaa128f7e0` |
| `docs/design/shortcodes-narrow.jpg` | `d78c83083dc59c678403a21d6180ff97d02167af029cb8031291abbbf2fc8ddb` |
| `docs/design/shortcodes-dark.jpg` | `c483de8ea96c838b471cb09fa33ed4e3ebf1eda625ae05fe55dea9ecc5e56012` |
| `docs/design/shortcodes-article-preview.jpg` | `c10cc46dd98a0c0e0e8e193ebf89f2b11d29a8037cd7f50badccead3cd188c93` |
| `docs/design/shortcodes-picker-narrow.jpg` | `918d22dc0de1d78520ee3d5ed66b40e3bb65e7aacee459d66b607c1763bee7aa` |

## 2026-11-05 区块内编辑工具与保存修订同步

同步shortcodes-3、editor-plugins-14、bootstrap-8、ADR0059/0060、当前索引/验收和5张自建内容截图。短代码区块内插入、视频/文字颜色、光标定位/吸顶，以及修订通知和最低同步截点已实现；沿原源文/授权/媒体与共享Schema，未增加契约字段或迁移。两份原始基线保持，实际设备IP/URL不写入交接；STATUS分别维护。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `2dbc964727c174f87ede1016a908997b6817fe1d35a066ee698f2cfdc6edc55f` |
| `docs/architecture/constraints.md` | `1d75b27fd211e79f27d6b36f0722415d064111e97917fbd92c2eb0311a2a81b4` |
| `docs/architecture/shortcodes.md` | `f83c5699513430da7c6332a939a35b44deddf1a5acaa745e46798d899a6b05e1` |
| `docs/development/editor-plugins.md` | `70f1a6faa60ae5b5660c9e58f582b551ba3136d939125c68112ddc1b95b212d3` |
| `docs/decisions/0059-editor-inline-insertion-and-sticky-blocks.md` | `097de4384efbcafa3fd0f7004fa4016ea66e42e669a4f02c20b36884a1fef9ca` |
| `docs/decisions/0060-collaborative-draft-revision-refresh.md` | `ab18b2260fab17503e0ecfdcc7025fb080e00dea4d7f4529b8eab80afa0cca55` |
| `docs/handoff/editor-inline-tools-verification.md` | `8db02eb6a97e204d5c602c06824c2101c7679c9e963edb8ff414c62de5a47642` |
| `docs/design/editor-toolbar-desktop.jpg` | `0061f02207dc000d9a64f3a9c4c4ee69141181af5d9b0e0775b98ff95f71ddaa` |
| `docs/design/editor-color-narrow.jpg` | `01edbc6be2eaea80d0b0f7b0cb08ae27f746a06f1de61f8b486dd77f49d8c7c4` |
| `docs/design/editor-sticky-narrow.jpg` | `eb06d394867c9a4037ee49be89a9b86b6f920452fd867b896627b0c562f3b990` |
| `docs/design/editor-color-dark.jpg` | `1ec784e19ad27575e9d842630de31b524f148ae611e886a95e841d4451c8d62c` |
| `docs/design/editor-conflict-aligned.jpg` | `80c6b9d44366c42850e5ab8a9daaf7e4ca7d866cc78a84775614faf8b9c5a211` |

## 2026-11-05 前台预览信息对齐

同步现有前台预览验收的排版补充和3张自建测试文章截图。仅调整图标/文字分组与基线，未改变预览授权、读写边界或文章内容；实际设备入口不写入交接，STATUS各自维护。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/handoff/content-frontend-preview-verification.md` | `6bee0b3b521d0af153a214b833278695caceb6a265cccd3fff16e720054b6fd9` |
| `docs/design/preview-label-aligned-desktop.jpg` | `04be102fe723fce17726a03f6d5f5603ee91299ae9e9bd148f053157ecf2c045` |
| `docs/design/preview-label-aligned-medium.jpg` | `f4db8dc5d1817d71cc3bbbe2b90f4f881876da2b10ca22a7bdd3861823db55a0` |
| `docs/design/preview-label-aligned-mobile.jpg` | `591a4e8c4b3636822705ceac515df5d188aff88a0da586e2c1cc62c331e803be` |

## 2026-11-05 工作区日常启动入口

container-deployment-5记录工作区可执行入口、既有Supervisor复用、就绪与绑定检查、并发启动保护和本轮热态验证边界。实际公开地址/密码仍不进入交接；后端脚本随仓库维护，工作区软链接按运行指南重建。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/development/container-deployment.md` | `70fdf1537df886be277b8e60bb650257e414d9bb6e4d0ced5dca314e12fedc97` |
| `docs/handoff/container-deployment-verification.md` | `2796bbc4f19d2e24f156a594266f4d85919a1b4d2d39c4181e8cabc368a999da` |

## collaboration-2 与独立版本页交付（2026-11-05）

bootstrap-9、collaborative-editing-5、editor-plugins-15与draft-versions-1记录正文实时保存、光标/离线分支、PG合并锁与独立对比页。以下当前哈希替代此前后端阶段记录；STATUS分别维护，实际设备地址/密码不进入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `89cfa94a417766ded0e89fdf3d54e1d323cb63309c98671a1fdf2e6f2977fe0c` |
| `docs/architecture/constraints.md` | `ba2b85252f5e1802165ad4c251f69a0f4106abd5f5f035e9a560154c5505d5dc` |
| `docs/architecture/collaborative-editing.md` | `be967396b342452a7f293845591d7240ca17c696d9c9e0dae3a7aa7ec0f35395` |
| `docs/development/editor-plugins.md` | `5fec91dcdf43668f22976fe0face699898889630f5be9508793d276e2db1f85e` |
| `docs/development/draft-versions.md` | `3128a966c6d4a369df86db67632a58c8ef4cc982872eeb6b2615f6515a13d6b0` |
| `docs/decisions/0061-cursors-offline-branches-and-version-merges.md` | `5f4e57f33e1efab38d07e1fdef697e9bb76aa62fbdffe2ffb6143925a67ff3e8` |
| `docs/handoff/cursor-versions-verification.md` | `a0d29cc3ce4e1af86819c353c90fca2376f7bbb44428a61e9879d86e8cb59b9e` |
| `docs/design/cursor-selection.png` | `91e002fe22c650be8a68725ed89827a684ec3225f4a3d752116c69011d03e23e` |
| `docs/design/offline-branch.png` | `ba70e3fbb2571ae8abde7e1a88b9e0e290f093a24204883433444cb99cbe0823` |
| `docs/design/versions-page-visual.png` | `db19001cb9aab6420384944b860a9d4aa7c1e2538d2496d8544c98ee29545dd1` |
| `docs/design/versions-page-source.png` | `7392734fad4f028872e6d0235c78372a1c5b4fca952625fda6110e83a4f4159f` |
| `docs/design/versions-page-narrow.png` | `3d4a73546564c223ee4d957e8f3dc6cf28f6e5475bd786a93b101307836df16c` |
| `docs/design/versions-page-merge.png` | `5ff5a2c1c9f66a12c94274130624685bc780ed6734aec015592955b604306dcc` |

## 顶部版本选择与逐块可视化对比（2026-11-05）

ADR0062与draft-versions-2记录用户新要求和实施；顶部双选替代常驻目录侧栏，HTML默认视觉/Markdown默认源码并可逐块切换。以下当前哈希替代相关文件的上阶段记录，STATUS各仓库维护，不写实际设备地址。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `80f90a1a5ea171bfc82d6a8398a5e88a27f410e9f59e642ef1943c33fd0d6a8a` |
| `docs/decisions/0061-cursors-offline-branches-and-version-merges.md` | `434729990ef09afb78b3807b831e0a773b414ce404ccd8745456f5fd99155935` |
| `docs/decisions/0062-revision-pairs-and-html-visual-diff.md` | `72b8c63d4c26d41de1b07ebcce389c7a26ed8e349e5b78a4c734cd5dc3610e65` |
| `docs/development/draft-versions.md` | `cd0c840e8ae6b51652d20be8c274434a9fccb5a95798f3fb7806c62b789bd16c` |
| `docs/handoff/version-revision-layout-verification.md` | `b772198358dba64e045226778a32e437048fe21a9b827b6aa9cf1c1b192bf342` |
| `docs/design/revision-top-source-desktop.png` | `30b9af9bdc89d55756562770ec5778fb61a63173cd9982b30b5e8969edda5fd6` |
| `docs/design/revision-html-visual-desktop.png` | `6929991e861fc77814fdb13036974a601e9c35a7c8dad62c4f4b45359b483ae7` |
| `docs/design/revision-source-dark.png` | `137c9fd6daff82cf3642e05223ccdcec140359e6aa3b577dfd8dac8b1a3a847e` |
| `docs/design/revision-top-narrow.png` | `9cd962692889ce04cb1fc9936b9580480513c5b353394aa26035304667cdd15a` |
| `docs/design/revision-source-narrow.png` | `3b9fd2374594250edbbc6e9d81ac0c69bee510392892650904a2acd68f9cf7e0` |
| `docs/design/revision-visual-narrow.png` | `a5c61a4321e04781578a68b85b708d1a72c90fc9313b502c485abc5f3d846267` |

## 紧凑列表与编辑工具交付（2026-11-05）

content-admin1.6.0来自后端已提交d42cb8b；content-management-6、editor-plugins-16与ADR0063记录封面/元数据/搜索和链接/短代码工具。以下当前哈希替代相关旧文件记录，STATUS分别维护，实际设备地址/密码不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `145e1da1a7bdc995039da3b0aae23b34a28b23c06d9350281965d306deed59b4` |
| `docs/development/content-management.md` | `2831cafd5fcd6ffef55b584ae655977def48425fb6b160ab05ecef300b429d7a` |
| `docs/development/editor-plugins.md` | `faa1dcf5cca41d0aa264da98d6a9df36220de1cd5cfca9cda809d2bbe1930f40` |
| `docs/decisions/0063-compact-content-lists-and-editor-tools.md` | `0afbc242b512e52c98eafe646eb3f8f0b44efbeda2c824383b5f34bbe0f2adab` |
| `docs/handoff/content-list-tools-verification.md` | `a0619f54c3267bf567cd087af11fc9f21fc68b4cf26d05422bae68b9d37af366` |
| `docs/design/content-list-compact-desktop.png` | `924623dfeb653236bea19d12fc3b4dcdc1656cd64d35ddeabdd9df84f6443900` |
| `docs/design/content-list-compact-narrow.png` | `2f4b0f6ad9ec430381e3ccc126d439be9674540f065670ae71800a2d89910cb2` |
| `docs/design/content-list-compact-dark.png` | `870fcecf05b45bf64a28e719a4c5e90bad406a2472b5b9292a226f6e44eb6b6e` |
| `docs/design/editor-link-tools-desktop.png` | `6d0bfa2b79ac7cb32d1dae7e35821666b647e45e59bbf2c2188d158b50bf3d00` |
| `docs/design/editor-link-tools-narrow.png` | `c6e6cf6ed59f1143cb1ae01289f1c2a2cba897c225d9329139f3f2d2f9d768a8` |

## 桌面设置分区导航（2026-11-05）

ADR0064、settings-runtime-8与实际验收记录右侧目录、原生锚点、滚动高亮及页底短分区焦点。以下当前哈希替代相关旧记录，STATUS分别维护；不写实际设备地址。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `8e675d7441cd35cd2687f1e146ea8da198866c7a2725ba71bf75e4badad88f61` |
| `docs/development/settings.md` | `9851f316c950dd44011c1b456ab644f635b33a9443ff37e2f25e365e78f30bd7` |
| `docs/decisions/0064-desktop-settings-section-navigation.md` | `4833438f5800834152e1c9f5363bc590294d0406a584c12f33ecd3a60d95c79f` |
| `docs/handoff/settings-section-navigation-verification.md` | `b59593b1d75db9f173e70c744473797d2f627031cfdb9a4337a1c085de3e43fa` |
| `docs/design/settings-navigation-desktop.png` | `94685c429086aed791e8fde80e2273c885b60964240d1b3b6c5257e5eb33b992` |
| `docs/design/settings-navigation-code.png` | `6339eada8dff658e18d6d4acb8211f8d50f3ff3ad652c28903946d5be25bec9a` |
| `docs/design/settings-navigation-dark.png` | `67472a5ea3444c9a9435cb9bdf0e8d0f97536267148cd2cdc2a5dd7a47a2329e` |
| `docs/design/settings-navigation-narrow.png` | `6619a284fa1d99805fe4875ef1072d2061cd16db511b6bfff682a281b89b38c8` |

## 多语言内容设计复盘（2026-11-05）

multilingual-design-1及ADR0065记录本轮首批zh-CN/en选择、旧约定和源码缺口，提出入口、URL取舍、事务/语言运行时/公开缓存及验收方案。没有实施业务代码或迁移；下列当前哈希替代相关旧文件记录，STATUS分别维护，实际设备地址不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `19212bbe4ab3838d58b467d6fe6b502f465b05108b02a5307869eeaf02cbf6ce` |
| `docs/architecture/multilingual-content.md` | `dc4f3cfd5d4f23c707052cd7f8e3f2d3b40eb0acd59fea7084178775ceed6a3e` |
| `docs/decisions/0065-multilingual-content-entry-design.md` | `341095d5489fa16fe4a0b58ca92d13a259ddac46421c8a9adda6c708ba6586ec` |

## 可配置多语言、原文合并列表与选择器（2026-11-06）

ADR0066替代0065历史提案，multilingual-runtime-2、content-management-7、settings-runtime-9与bootstrap-10记录语言目录、默认/中文前缀、标志、独立译文/原文一行入口、公开语言和真实验收。下列当前摘要替代相关旧记录；原始附件不变，STATUS分别维护，不写实际设备地址或凭据。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `66430a37b14e1ef21509954f7b1ed1737a43c2a76616fa9af30c02d5b0be0714` |
| `docs/architecture/constraints.md` | `f7d13d4ec62e975f29fa028dc31269d4ba6831b66a6ffe58c7c7840d479eeeb0` |
| `docs/architecture/multilingual-content.md` | `da3377d9366b3360d16293d8d3bf08fab9589f5f9626c8cc7a3a06c4649cb908` |
| `docs/development/content-management.md` | `0db41c9c5b48df35ddaf9eb284fc25051970fa2ba6566e1fa381361c5af1e72d` |
| `docs/development/settings.md` | `c20d7133e9e90c0825be1de262886ec925900e02f6c571d3526774872ab1729f` |
| `docs/decisions/0065-multilingual-content-entry-design.md` | `7e2793cffee7aa5e545d79a27b345a989ae003b55cac5bf019c7fc1c290b80d5` |
| `docs/decisions/0066-configurable-languages-and-grouped-translations.md` | `f841a8a54f4bd6dd00b0f264c9af1df45aed69b0f88fe7ceefb88e02ba4af0f7` |
| `docs/handoff/multilingual-verification.md` | `2f862e25e215d54d1b51ecd43af9cf6e77e3a105c0eb0f9aae1238f9e92f2eff` |
| `docs/design/multilingual-settings-desktop.png` | `4aa4c48f2ad3866c881e4fb69694a49c8ac34135f1ebe857fa4a25a8255cdfd6` |
| `docs/design/multilingual-settings-700.png` | `5fe31f0645b768d794c0a709420adf06a0abd3b5c87342010ef6650ac0d0248b` |
| `docs/design/multilingual-flags.png` | `c2295e3ce8e2b0b45bd521c49ee515bd04475f631c9165e2cc0e2519efc689f6` |
| `docs/design/multilingual-presets.png` | `62bc257de6db50c814473f9045e33943a17ef0acfb82a77c3a6fda7d72817ae4` |
| `docs/design/multilingual-custom-320.png` | `ce3f7d9ac703625c68e105316212fcefa108faddc6e7ce14b4d96bf53c1b5455` |
| `docs/design/multilingual-editor.png` | `51c444668125ffa05d5022612f5470888e790e10e74357b31ee3fbc9dfdc4d58` |

## 语言入口视觉微调（2026-11-06）

仅补充前端语言图标/选中样式的实际验收，不变更原始附件或契约。以下为当前公共验收摘要，STATUS分别维护。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/handoff/multilingual-verification.md` | `d895d621c8d81b762fd61ab1ee88549645a52bee50a50ed6bf63db75ea875b1b` |

## 大量语言入口与前台顶栏交付（2026-11-06）

ADR0067、multilingual-runtime-3和本轮50语言合成验收记录阈值收纳、搜索、原生链接回退及顶栏顺序；不更改业务契约或原始附件。下列当前摘要替代相关旧记录，STATUS分别维护，实际设备地址/凭据不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `bd0af9e7a4fbffc2906095db91c4b96e10aeead2bfa374762c8fedf760cb0361` |
| `docs/architecture/multilingual-content.md` | `f1be4aae0db2def7e979c4770cd7214a8e966a78d72029bac633ac457116c457` |
| `docs/decisions/0067-large-language-pickers-and-header-order.md` | `2c216e2f6fc4c41fa9d0437b72ee378295b51de97deef559c9385bbed3b9acd5` |
| `docs/handoff/language-overflow-verification.md` | `291fcb5ef342c7f7829c2a9152f07f20f56b802b03f4d1add5416c476f43f149` |
| `docs/design/language-overflow-desktop.png` | `7aa6ca351b2c24a450b02705af99a2592a97fc522f7aa06e7f9663b3febf7c90` |
| `docs/design/language-overflow-open.png` | `a968290cc973cd5e0079a0320fc9488b49df3aa04f93719f3455e61cfdfe44e2` |
| `docs/design/language-overflow-320.png` | `684e126036028c5b56fbef9e2bb832398ced46e251ff269143e94a9521fd3a52` |
| `docs/design/language-overflow-320-open.png` | `bb2a926ab68b2b54490db878afc78c79eec4835d7301bc133484ab43936a6f49` |

## 语言旗帜字体统一（2026-11-06）

ADR0068、multilingual-runtime-4及实际验收记录同源按需字体、270种旗帜组合/回退与许可。前端运行时依赖/后端契约和原始附件不变；STATUS各自维护，不写实际设备地址或凭据。以下为当前公共文件摘要。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `8529299a93a89ab1ea345db198ff4cc76fffc39998393b15edd7b99a708eb844` |
| `docs/architecture/multilingual-content.md` | `8534ac1e14540b09572124311c54f44045a8cecb800a9944fbd418f66cc6cd28` |
| `docs/decisions/0068-local-language-flag-font.md` | `9035ec21f08d40b1bd193d10ef6ba51d5ba6f96e027615b989ccf3fb5badd69a` |
| `docs/handoff/language-flag-font-verification.md` | `4ab72494980869cbdbf7d1997ca0f84a5ed46cdbc0d22ba4b93409ff599cabf2` |
| `docs/design/language-flag-font-desktop.png` | `69a45c40b3679c33aa0f5290b6989390bca6ea19b466cd68554a02771f248bc8` |
| `docs/design/language-flag-font-320.png` | `0fd441289acee70de8c1acefcd9d2121fe721e8915ece1ed4e2939d86a5962f2` |

## 账号与双向API Key接入实施起点（2026-11-06）

ADR0069记录用户确认方向与实施顺序，接口细节是待实现设计；不修改原始附件，不冒称账号或Key已交付。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `3275505910b445269ec80d233624d7218d4766bfbde27cbcb03ca595069da1d6` |
| `docs/decisions/0069-accounts-api-keys-and-signed-callbacks.md` | `995a0d5a6cc3ff83ef9f6fead0e7a66dd0b6074040e2bfd20abd361fd33e6413` |

## accounts-runtime-2 同步（2026-11-06）

服务端授权与签名回调阶段；前端仍实施中。

| 公共文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `ba8717c6680d608c592a7c3f33348652151852c7d7b1f367abde7c20dcf6b87b` |
| `docs/decisions/0069-accounts-api-keys-and-signed-callbacks.md` | `c98e94b1a5b2b6ff3de45d41b742230220c1033227d87d8460f7ce825cad4737` |
| `docs/development/api-key-applications.md` | `3c2343f7589e681dca6c2a5ec03d0c9bffd9cb7a73e0f123f0604c797a380587` |

## accounts-runtime-3 同步（2026-11-06）

个人头像补充约定已同步；ADR0069 SHA256：`43f8535a433a3ef100540a1a68aad30f57c826cace0657ce37c11ea7cd09159e`。前端资料美化与头像页仍实施中。

## 账号、独立头像库与双向Key交付（2026-11-06）

accounts-runtime-4、api-key-applications-2、bootstrap-11与ADR0069记录本次实现、用户确认的头像初值及真实验收；下列为当前共同文件摘要，替代相关旧摘要。原始附件不改，STATUS分仓库维护，设备地址和凭据不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `ebdb0fd790182e698b817b924e2ee57ec3977f1571de661892757a00da42656f` |
| `docs/architecture/constraints.md` | `70da33732e586ad9b9adb10278367125bdb7d33bbdc528c72a261d1c09902b99` |
| `docs/decisions/0069-accounts-api-keys-and-signed-callbacks.md` | `3faa57499374f7b4fedaa0139cda80e799da1c8cede98564e8646cdc78447639` |
| `docs/development/accounts.md` | `6d01923b64b5ef50af24a54b114cc67eec452fd08aa5c682cc8f201dfc7bc5c0` |
| `docs/development/api-key-applications.md` | `66e620bccd01db0eb5cb13d52b269d199c8a5e7519d3b24b188427df60005a2c` |
| `docs/handoff/accounts-verification.md` | `4d6088d18ef45599af755b661aefbcd919fa8def7bf9b1c9080d2ec41a3768f8` |
| `docs/design/accounts-profile-desktop.png` | `7aa1444c233cac5c824c6950aee84a2730faf378ad47fe6349ca12a4a42bfaa8` |
| `docs/design/accounts-profile-dark-320.png` | `13efea3799ca05e24cb5940839d8b5e9442aa582c10fae5cd5bf6e520974dd19` |
| `docs/design/accounts-avatar-picker.png` | `beadd84ea592455efcaa88ab4dfa8aebf6cde0b5ed94e165940b42d548a22a6f` |
| `docs/design/accounts-users.png` | `46fdff3a854f9dff5e2e3b38b5bb5c258752251793860eafd6e393c540cc5d32` |
| `docs/design/accounts-applications.png` | `ca43ea3951abbd2bb31b60410899f334d91020fb1348c5b3459d487dc24ecae8` |

## 云端账号入口与头像就绪动效（2026-11-06）

ADR0070、accounts-runtime-5与reader-requests-3记录用户后续入口/菜单要求及实页验收。以下为当前公共摘要，替代相关旧摘要；原始附件不变，用户测试图片不提交，STATUS分别维护。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `5af5c26f465efa5cef4ea0a4d28017caec07251d1b3bc91b5be4b8d5d564b602` |
| `docs/development/accounts.md` | `c47f3f1f5ce786577bc839433b512f84b1b8fec126054182ee5e59a5ff6e356f` |
| `docs/development/reader-requests.md` | `4224cddbd50b5d2ed732a28dd7a3553b59b5429c494853e8d1f8c997a0cf2abd` |
| `docs/decisions/0069-accounts-api-keys-and-signed-callbacks.md` | `5f1c19650944415d54f2563ee3b92499c0995a0ff0e1f295313f660747ee101d` |
| `docs/decisions/0070-header-account-entry-and-avatar-readiness.md` | `f858fb1442edb2fb34ace6954e7684844b5885ff3ce18035c00cc80c4fe77a45` |
| `docs/handoff/header-account-entry-verification.md` | `425f6b0d8675ccbbcd8225be6effc00767dfc953a47746a972c0c54623ab5370` |

## 顶栏头像与图标对齐补充（2026-11-06）

ADR0070与reader-requests-4记录用户排版反馈后的容器对齐及去角标；以下为当前公共摘要，替代对应旧摘要。未改原始附件，用户头像/实际设备地址不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/decisions/0070-header-account-entry-and-avatar-readiness.md` | `7449335d04c2dcef1b3bed0aebb260fe9171688c063160a23d667743b69100b3` |
| `docs/development/reader-requests.md` | `7fad62883e583803a3d4e551ae97a21349fbcc39f2bca559c9bb13996f802753` |
| `docs/handoff/header-account-entry-verification.md` | `53854b4dcb4b44747e389ed34e8ba4d4f75e67143d7ebb104ef088ad123c9dfc` |

## 可配置身份预设交付（2026-11-06）

ADR0071、accounts-runtime-6与bootstrap12记录管理员维护预设、用户显式应用权限快照、版本/幂等/授权边界及本轮完整检查。修改或删除模板不自动覆盖已有用户；头像限制密码文案统一。下列为当前共同文件摘要，替代相关旧摘要；原始附件不变，STATUS分别维护，设备IP/凭据及用户头像不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `3d0240e76e95851926c6e863240bc4c204f12c3d6d06f162b547f96ae50a18fb` |
| `docs/architecture/constraints.md` | `acaf35f76ef9dcc9b800281c2fe196e20ceab29c4212a197ddbb8582ba462dd4` |
| `docs/development/accounts.md` | `39e3d3a4fc31db132524a1e9718cc71f4ca8b9d4a46b14fb9a089c96288110c5` |
| `docs/decisions/0071-user-permission-presets.md` | `6a6df7ee9a3a66120ce4883263edfb0294e7f6ba1a1679d336c07206643c7427` |
| `docs/handoff/user-presets-verification.md` | `37690b0b407b2e896a51deea9b7617cf1d9860781803fd5c691ea91c950f7413` |

## 页面管理与独立实时预览交付（2026-11-06）

ADR0072、registered-pages-runtime-2、pages-runtime-1、development17与bootstrap13记录本轮用户授权：独立源码沙箱、可信人物页、私有元数据及页面/文章/说说独立实时预览。当前共同摘要如下，替代相应旧摘要；原始基线不变，STATUS分别维护，实际设备IP、凭据和用户头像不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `dd25235688f705797f31d974de23b676c7327dcd4456284ff45cdca74e77693b` |
| `docs/architecture/constraints.md` | `e39b9e4483a3949b80e34df01e75ba091e3002f86e82ff6e37adda8ed33878c0` |
| `docs/architecture/frontend-extensions.md` | `dcde06c5fbd956e570978363b89a5f85df98589e0ddf0dc59b19de96506fca90` |
| `docs/architecture/registered-pages.md` | `150ec6af3020e3057c4a8bd1166dc7b10ff0d5b6d00df6ed182e9fd1f241e5ed` |
| `docs/decisions/0072-managed-pages-and-people-messages.md` | `90ca6d0d5a671228d6ad219ec3e5b5e3938ca339bd43145e568565507a409628` |
| `docs/development/content-management.md` | `562db6c35d8d9c6e47b3b6a578c7809b277d1bd559d812832183f7b549a312ca` |
| `docs/development/protocol.md` | `fa5c0765ba30d178cd88f925652d3b2bade1ef4207e74523d37664bdc70c2b6f` |
| `docs/development/pages.md` | `b7d6d0744de158355e224004f2bf702cf3d7dce243f8cb58f0f0b5995e179d37` |
| `docs/handoff/pages-live-preview-verification.md` | `3b0c01fa15afd6b66e5e94af2052f094d8e5b6c2552cf5c3226baa80f0c42a56` |

## 编辑操作组与保存回执修正（2026-11-06）

用户要求文章/说说保存发布与预览同组随滚动进入顶栏，页面也合并操作并将返回列表左置；追加ADR0054、pages-runtime-2及本轮验收。同步修复旧协作HTTP回执Schema缺少已有owner_id字段，保持业务/WS协议。以下为当前共同摘要，替代对应旧摘要；STATUS分别维护，原始基线不变，设备IP/凭据和用户图片不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `878e3aa0bc0cd8dff47c5ccd39d1f3e94fb3a2c3b42487ba11f60090328826b5` |
| `docs/decisions/0054-scroll-editor-preview-actions.md` | `0758dac2d24fc881d2070ba6415abd676c92d28f258beb5c3b56f60528315657` |
| `docs/development/pages.md` | `9f550b5bd7055bc18352538a73259cef8c5738c82e891faf80a8a09ae16d572d` |
| `docs/handoff/editor-actions-dock-verification.md` | `c0666d08461028fd7220e4708d69faaf0d8b2bea00b8ac80cf25b7be89f18627` |

## 定时发布与阅读/列表细节交付（2026-11-06）

ADR0073、content-management-9、pages-runtime-3与bootstrap14记录本轮用户要求及已验证范围：冻结单次排期、Worker可靠发布/取消、页面移除读取按钮、列表前台入口/铅笔及右下背景进度。以下为当前共同摘要，替代对应旧摘要；STATUS分别维护，原始基线不变，实际设备地址、凭据与用户图片不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `69ce51d110808affc20a562859efc7f01f9e6f2bf388ef4d53002060751217e0` |
| `docs/architecture/constraints.md` | `5a2a146b9faa05d83cb772c2cac3e8dc4cbc73702e8e77d9132ca580d8fd57fc` |
| `docs/decisions/0073-scheduled-content-publication.md` | `150fa67d123c60445e97a53ea9903b6183af0a2440123604a9797cca5bd72e90` |
| `docs/development/content-management.md` | `097294b86e00912dd14cae591d78e5747ac547f14abdebdf68311ca1f127f7b7` |
| `docs/development/pages.md` | `582d3daa8beab17bb298273a1c64ab39d246264058f563c9c75f246c0aad7187` |
| `docs/handoff/scheduled-publication-verification.md` | `a7d5d2da711ae8722d6ceb0f23ef58122a213f36fb9805e957caf505102616b3` |

## 页面语言与预览后续实施（2026-11-06）

新增ADR0074记录本轮明确要求。以下为当前共享文件；阶段进度由各仓库STATUS记录，后续交付更新相应摘要。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `a761afc522bc3c82c3e1647f9f4c69d1fe50de904f231f8eca9da04318868424` |
| `docs/decisions/0074-page-languages-linked-navigation-and-live-preview.md` | `179afbfda44cdcd43010f9c5e3faeb2fd0db0993dbcfdcd3656ad9fc6b47b10f` |

## 页面语言、关联菜单与预览交付（2026-11-06）

ADR0074、pages-runtime-4、settings-runtime-10、multilingual-runtime-5、registered-pages-runtime-3与bootstrap15记录当前交付。以下摘要替代对应旧记录；两个STATUS分别维护，实际设备信息/凭据不入文档。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `15607f01574f424cb833927c7f5dd6d13ac1fcbda047ea14bd9608cb7245d752` |
| `docs/architecture/constraints.md` | `97fe4cf7c2eebb23a1d58cc4da04d0165d22b4304c897d1a285b5c83d3e8cd0f` |
| `docs/architecture/multilingual-content.md` | `55653f65dd45681d3ed36f513fa53cb88b666109bc2bdf7702a434607c963d14` |
| `docs/architecture/registered-pages.md` | `f218c89def6f9546298bd31ea69e2d5602470a1f5b10576c99fce6f72e92b7bf` |
| `docs/decisions/0074-page-languages-linked-navigation-and-live-preview.md` | `2406ea1bba03a480c37865db490d1c39ae1d81a12a3be28794bd148ff4e810ef` |
| `docs/development/pages.md` | `d2796c36324a42d3863aefb77d198d1aed582055a6b2128fa451f9b67d305e3d` |
| `docs/development/settings.md` | `0cc53c0992ef483f623d0e6d27115ef83cdec6ba92e8ecd4677c86cc708640aa` |
| `docs/handoff/page-languages-preview-verification.md` | `7fb4791c9f306df8d0c97f1b0587c67aff2b4b20da9efbb4e34c3901988f6e20` |

## 脚本与头像限制提示、侧栏高亮（2026-11-07）

用户最新要求由ADR0075覆盖旧密码确认规则。当前pages-runtime-5、accounts-runtime-7、registered-pages-runtime-4与bootstrap16；以下摘要替代同名文件旧摘要。原始基线和历史验收不改，STATUS分别维护。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `59d56b11dde0ec068843e9e1a30f53744268e6a7f50da623079ba595f183d428` |
| `docs/architecture/constraints.md` | `a04d10d7280830f608c72ac67a830cdf3fd7ec3519d43bf3d2a68de469395bf7` |
| `docs/architecture/registered-pages.md` | `fc5eb761c348ec4ece49ad8fc9cba192c96829eabfdbc86101db391b99dc8c84` |
| `docs/decisions/0072-managed-pages-and-people-messages.md` | `fba7c71a18875fd5de38b11fad430ab2e2914b66eb6e8ae150dba5e39a12e43a` |
| `docs/decisions/0074-page-languages-linked-navigation-and-live-preview.md` | `58bdc120c47f515722b839891a9c4ab046a89da510de00a0a7d2a8278c464dfa` |
| `docs/decisions/0075-admin-page-script-and-avatar-policy-warnings.md` | `7bf600c4b65751827d1bb6fd59904cd7504094b7406acbfb60c5cf42a303c657` |
| `docs/development/pages.md` | `243e69bc2c738d8a5fc2c10264eb81ec8ff4c20582bb3b423733b59d4f3609a6` |
| `docs/development/accounts.md` | `4679c6db821a2e5a89b4ba96f8b6d7fafcf881aa2915612b2efaa75b08cb7ccf` |
| `docs/handoff/admin-warnings-navigation-verification.md` | `108f4cd3a2a66a61382cdfafea9fb1bba5858d44a55e5ac08ab2aead8c96fde0` |

## 统一插件/主题与生成物隔离（2026-11-07）

用户最新要求由ADR0077覆盖ADR0076的分散目录与提交生成物决定。当前bootstrap17、development18、pages-runtime6、registered-pages-runtime5、shortcodes4、frontend-extensions5；新增运行/插件/数据规范及验收。STATUS分别维护，原始基线与旧验收不改。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `f1c32f57d7e27518f184d96e715a0587476f6393a92f6a34b1e9ad8199d2e9ec` |
| `docs/architecture/constraints.md` | `270daa5427d04b3cccffc493b594b331f7cf7c77579bb48283a604e03b2237a9` |
| `docs/architecture/frontend-extensions.md` | `be26dab27e49bccd6f38dc6be517ee20b485196a18699f2967bb1e95bf5d5a66` |
| `docs/architecture/frontend-plugin-runtime.md` | `5b9bba08ef6db922f3c9d154a945be5e73b4b1b9c68179c7fc716111dbf046d6` |
| `docs/architecture/frontend-ui.md` | `2a4c87c5abc115999fded73592d68caa0cc053425711df8cae4e746585bade00` |
| `docs/architecture/registered-pages.md` | `72f6552e193f422033d506ac1c881cff9ab818d0fbe822bc40fbc6d170b578da` |
| `docs/architecture/shortcodes.md` | `1e3cfcc66d7e023fbe338897b4085e60599f06a553ef362ea4d4917da422179f` |
| `docs/decisions/0076-directory-pages-plugin-shortcodes-and-open-configuration.md` | `902b01e197296cb4aaa636b0feb7c3b774d961222aded8ab175035937cba8541` |
| `docs/decisions/0077-unified-plugin-theme-schema-and-artifact-boundaries.md` | `aa513da0d29de5bfff2d5d26f032fb853e6d4a8c991eea1a2e5a155fe29cd305` |
| `docs/development/frontend-plugins.md` | `2c75a571a7be955abcd7cf026b8dd5c87205ef518058749f2229fa025c2f2eb2` |
| `docs/development/pages.md` | `a801c2603cc534b3809fda6a4f1dadec4479b97ca57682363edb2acf682a717e` |
| `docs/development/plugin-data-protocol.md` | `22049e14ec71a48a6c7392794033bebc2d14105f3793daf58bee197eddeb285e` |
| `docs/development/protocol.md` | `983d504423702ad080a134a1aa2cd8c9418250865d31cc4537c7f5d5f4bea648` |
| `docs/handoff/plugin-runtime-verification.md` | `b389614e383d19a8cf6aab5ce2aa7885933002fbc4877e0ddfac40e13ad6ece6` |

## 父子主题实施约定（2026-11-07）

新增frontend-themes-1与ADR0078；本节是实现前的约定存档，最终验收另记。原始基线不改。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `c90519b1103dec72b5781436208311e51494bbf9779a5075bdef9a69921fbf95` |
| `docs/architecture/frontend-themes.md` | `97e91642fe30fc13fa307dbcbcd582294aafca695e2d61e970fb4fc8807d315a` |
| `docs/decisions/0078-parent-child-themes-and-public-hooks.md` | `3efad4efb0154a5ea9cc6e97709196fad11a8ad54e0af001cd08970ad48b048e` |

## 父子主题与前台展示钩子交付（2026-11-07）

ADR0078已实现，源码前端721f0bb；当前bootstrap-18、plugin-runtime-2、frontend-plugins-2、frontend-themes-1、child-themes-1与本轮验收。以下摘要替代这些文件的旧摘要，实施前存档与原始基线保留。STATUS各仓库单独维护。

| 当前共同文件 | SHA256 |
| --- | --- |
| `docs/README.md` | `4ed75f34c388f4a0ac37effe99ad770d6c9ad0fa75bce9804af44ed7dfac3fb4` |
| `docs/architecture/constraints.md` | `c3e3ea90751e1193b44315547027c052d2abd42830d4ed531971fdc74e412e4c` |
| `docs/architecture/frontend-plugin-runtime.md` | `78d4f93a05fa82cb40d9f49dedde70addb650daad1da62a0d3ef66fb76a36280` |
| `docs/architecture/frontend-themes.md` | `c03c06f9582a33ee194d4f7948c99c275a5862d763d32a488808c5e8b14b37e6` |
| `docs/architecture/frontend-ui.md` | `ce556c4938027b9c3f1b246500e5a73de61dd3042b4abb08138cb3d57aabfc34` |
| `docs/development/frontend-plugins.md` | `1005dd3a3cdb2a95b95cdf7997fd33d3fa2391fae96bcb315c197721f25cebde` |
| `docs/development/child-themes.md` | `e21f88af63c45e8b5d6fe3c2781bf8cca30055874578d8fd0d1813d97f7f49cd` |
| `docs/decisions/0078-parent-child-themes-and-public-hooks.md` | `b0ee213a3a9fe6748e6971aa10f17a1bf893cb7631cf8bd72235032bb9f0d534` |
| `docs/handoff/child-themes-verification.md` | `4657e912fea3ca390e414820e22f4688172985f19c7350feeef0d0b5f99003d8` |


## 独立插件、动态主题与var/cache交付（2026-11-07）

ADR0079已实现，前端d28bd75/aceee88/fd5d52d、后端650a0f0/4dc394b。当前plugin-runtime-3、frontend-plugins-3、frontend-themes-2、child-themes-2、pages-runtime-7、development-19、bootstrap-19与independent-plugins-1替代相应旧说明；原始基线及历史摘要保持。STATUS各仓库单独维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `9775db0320e9a67e4151919a5b67b9d663141e48842c1e0bf4e9d08a6f70f4ce` |
| `docs/architecture/constraints.md` | `bootstrap-19` | `92bb4dac189f4b58a1b5157d9bcde3ae13069266a7f9269e46436c55c8bf150e` |
| `docs/architecture/frontend-plugin-runtime.md` | `plugin-runtime-3` | `4601bbc508b96ad732cc4fc10605f64b4fd4e6769fe452e9cd8bf2e17f4a4fae` |
| `docs/architecture/frontend-themes.md` | `frontend-themes-2` | `cfbad882198ca5a29a644f872cab41645f453a12dd951583b24a850eac470eab` |
| `docs/architecture/frontend-ui.md` | `本轮更新` | `9d98c886c20f630e3382db5228e3ccb458e232f2d5f5fa05ae71bf4ee035c265` |
| `docs/development/protocol.md` | `development-19` | `f9d9e36ed631c22bb4df034ecf0f0df08c84304a2b5f458240b212278eac7673` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-3` | `6fa4bf3a78e9f3871f5a1459f46dfb430afc1007a1c2febcbe3912bea232ea67` |
| `docs/development/child-themes.md` | `child-themes-2` | `7656f535cf9871f9735647da83485302eda71e1af2e46914469a845991a7b4f4` |
| `docs/development/pages.md` | `pages-runtime-7` | `2cd45ca4e69942f2266f2d53597f839ab992996e8454fb4dc8877e28841eb4f5` |
| `docs/decisions/0079-runtime-plugin-packages-and-var-cache.md` | `本轮更新` | `36055d32c7726ef36855b92e758dd57e6a2241d53df6f7de429751b9da0058ae` |
| `docs/handoff/independent-plugins-verification.md` | `independent-plugins-1` | `348d69a3b88856a5ae553d7cba8ffef376ff882b75cd62abd76b2398872f78ff` |


## Paper精简主题交付（2026-11-07）

前端dd515fa与ADR0080将Paper升级为2.0.0的纯CSS子主题。当前frontend-themes-3、child-themes-3及paper-starter-1替代对应当前说明；历史验收和原始基线保留，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `7fa776d79603dd913973283f4581c5be887674a227feecac9abdc3772ecf1a6b` |
| `docs/architecture/frontend-themes.md` | `frontend-themes-3` | `9c43e82502732afd6cc49c4778aa34f02130556b60d0c7055530937047c19182` |
| `docs/development/child-themes.md` | `child-themes-3` | `d201d552c0dda2e79907926abdc57c5b8b1f6c6b5562fefac23b64a8c5ad0cf8` |
| `docs/decisions/0080-minimal-paper-starter-theme.md` | `ADR0080` | `4103f5fbcb0ea72f6785b203fb696f50d4cf5ec207b114022f96322ee977f7ac` |
| `docs/handoff/paper-starter-verification.md` | `paper-starter-1` | `0bb8a03ecf1cff4e60a07359bdf067bd7fe14a73f8a0936bb5baa40a40391ae1` |


## 自定义页面脚本位置交付（2026-11-07）

后端b6fbaf7、前端1b86420按ADR0081实现Head/Body末尾执行。pages1.6/public0.9/content-admin1.13为权威契约；以下当前说明替代相应旧摘要，历史验收和原始基线保留，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `74266d6b80fda5da8ec9100daf327f4074763e8716594c2561be34a125322df4` |
| `docs/architecture/registered-pages.md` | `registered-pages-runtime-6` | `178dfcadb55b4888bae6a21d52d9cafa651b2ac0959279d1f28f55be7cdcb410` |
| `docs/development/pages.md` | `pages-runtime-8` | `801ae38e3f8ed03418a32ecadd8b358a5e3c5791509ecc5bd840124bc8adc85c` |
| `docs/decisions/0081-authored-page-script-position.md` | `ADR0081` | `c00a8520ce569a93e34354aad5d6d7dd322526f7e2e5586709e2f25fd529d6a5` |
| `docs/handoff/page-script-position-verification.md` | `page-script-position-1` | `b6c3b91a39cd28051e26607ced0e226e62e417513e52f1bfcad416786e1430b7` |


## 我的荣誉插件注册页面交付（2026-11-07）

前端c74138a按ADR0082实现core.honors 1.0.0。以下当前页面/插件说明替代相应旧摘要，原始基线及历史验收保留；后端仅同步文档，STATUS各自维护。24条记录与22张证书属于本实例业务数据，不进入源码。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `c0a165905032141033408989d0361ccb9368354041156529b924a006bfbd1c0d` |
| `docs/architecture/registered-pages.md` | `registered-pages-runtime-7` | `ede13f8105d385770c4bedc77eb3adf6f0836708d98365136bd26dd84bb5263b` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-4` | `bb01b5431f408e5fe18bb651121b6e961ea8f9a85afee1309ce71a4c95b08b74` |
| `docs/development/pages.md` | `pages-runtime-9` | `b0e49016b335df4c1e6e90e68b025ade43a52fe0d86d4bedb035720a5ccef578` |
| `docs/development/honors-page.md` | `honors-page-1` | `2e9442130cec4dacd839156972371168b3f348c642e2be36c909e72332eec2b6` |
| `docs/decisions/0082-honors-registered-page-plugin.md` | `ADR0082` | `aef281588ab7eae6e5c8a83f00ce49157d706321b84d8cf291c0cf06940b0025` |
| `docs/handoff/honors-page-verification.md` | `honors-verification-1` | `38dc6dc41b4e7833dbb22c37bb10927275d4d7765109a2ffcbc2805720aaa3a2` |


## 插件启停使用提示与目录过滤交付（2026-11-08）

前端72a4156、后端f335cf8按ADR0083交付，settings 1.13锁定精确提交/SHA；页面配置和原始正文不因插件停用删除。以下版本覆盖对应旧摘要，历史基线与验收保留，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `0c259316af33c64e6a3709b8d4ec77d1fb96cc5344c17ac886bdb374b07f3933` |
| `docs/architecture/frontend-plugin-runtime.md` | `plugin-runtime-4` | `8c68cbe42b228f4985b3340cd23766b470695629105d2795d95300086ac9fce6` |
| `docs/architecture/registered-pages.md` | `registered-pages-runtime-8` | `85eba3384701898444137a4cec649f650be35ec9880d41b9ed01b307bb30e8ce` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-5` | `598bb484136a99bbae4d5467dedd07ac440a51cee9359b2ef4758702cf937a97` |
| `docs/development/pages.md` | `pages-runtime-10` | `62a2b1a5f0f2171580a22b2f7b3d004a35ecb8876d07d464ba8a439e795c7f6e` |
| `docs/decisions/0083-plugin-activation-usage-confirmation.md` | `ADR0083` | `b7a1d6df773619d28a80314e0ab4264d02c9dd0afc9929b80c905c3cab86dc87` |
| `docs/handoff/plugin-activation-usage-verification.md` | `plugin-activation-usage-1` | `2570b4d97754259e03d63093cfd6c0a0e442b1579d83f5c07a235f89b7df6afe` |


## 插件取消还原开关修正（2026-11-09）

前端f0033bd按用户要求取消时还原本批次插件开关，保留其他设置修改，成功关闭保持新状态。后端仅同步文档，原settings 1.13契约/部署规则不变。以下当前共同版本替代相应旧摘要，历史验收保留，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `d2bab867048a9f7d8bc64395b6f1061d86b86ae295a9f14fc9b0b16ca0959199` |
| `docs/architecture/frontend-plugin-runtime.md` | `plugin-runtime-5` | `8d696a3772653cbe4493b84888bdf8c34fef8fbc9484c7e041cc6b22784c67ec` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-6` | `9c03941ab135cf4ac1a65ac6e88bad60146b47013951966b2624875145771d92` |
| `docs/decisions/0083-plugin-activation-usage-confirmation.md` | `ADR0083-2` | `573f60a327575a0183a50c589933d628b482e850d10130d979d13a5f9054c07f` |
| `docs/handoff/plugin-activation-usage-verification.md` | `plugin-activation-usage-2` | `adb9d21083735f597ecc6d76004c5217f58df703fe4c61e71b536a41a08efe61` |


## 主题卡片、分区滚动与证书操作栏交付（2026-11-09）

前端522f8a1、证书布局f203e9b，后端d51ff20/settings 1.14。以下共同版本替代相应旧摘要；首次荣誉导入与历史验收保留，元数据不进入另一份用户配置，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `b8f8d3a7cfcc6329550ff81624656714fd9858030bceb08cd16585f6c19c421c` |
| `docs/architecture/frontend-plugin-runtime.md` | `plugin-runtime-6` | `5e8dc1c2e4d376b6c65360a046c2a3ec03d57270a8312320a64c3dc3b7331607` |
| `docs/architecture/frontend-themes.md` | `frontend-themes-4` | `6599acdab68e0e70f7f8b70e869a5e9875fe3d6461c2ba0b5f3812f9a0db6ef1` |
| `docs/development/child-themes.md` | `child-themes-4` | `c9fa7cd62c41233899cbb80f7e8489afd751cf53635345aabe220b0d06c03c27` |
| `docs/development/honors-page.md` | `honors-page-2` | `3c6a3720a65339d6a4190c1b7f522c496393a516239858e3a3eb4e202a35358b` |
| `docs/decisions/0082-honors-registered-page-plugin.md` | `ADR0082-2` | `23f02ff570f68e3a4bbc6fbfeec805c560d56aac3365d18bcf77b4189eb286ab` |
| `docs/decisions/0084-theme-cards-metadata-and-settings-scroll.md` | `ADR0084` | `a1dad3662a927d66e3c4a01e0872c65e9099ab30062843bbf14ae476969c75a0` |
| `docs/handoff/honors-page-verification.md` | `honors-verification-2` | `991a98587437ee0b3a46393a10049504ff92fb7c56084c98705ef909cf9af74b` |
| `docs/handoff/theme-cards-and-navigation-verification.md` | `theme-cards-navigation-1` | `3c31fff122f1f9aa71c4f10b0b6cf97cca79ff763726306bf56d8a5c4f0b71a3` |


## 主题浏览、Paper、统一字体与视觉间距（2026-11-09）

前端6682396/9157c54/5fc570c，后端仅文档同步，settings 1.14和业务契约保持。主题详情独立启用、卡片/列表、Paper 2.0.1及三篇业务示例、主题/插件字体共用与按需打包完成；用户指出的标题贴卡片已修复并按桌面/窄屏复核。以下当前共同版本替代旧摘要，历史验收保留，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `96f8ad7eb2a9a61ca9f9abcf685085979b231e867fdc164f2453fe7a687e4a29` |
| `docs/architecture/frontend-plugin-runtime.md` | `plugin-runtime-7` | `db9e22e99903f51488e6b7b2d62e931d1615fec79efe2c763522433edaacb61c` |
| `docs/architecture/frontend-themes.md` | `frontend-themes-5` | `fcfc1d11529dedef2900661db33d3ccc0270820b54c3b069e344449b75aa67f0` |
| `docs/development/child-themes.md` | `child-themes-5` | `7ed3f9439d46600db7422b7cef26391bb90eefada62ea238de9aca39f606ad09` |
| `docs/development/font-library.md` | `font-library-2` | `16fb0b8a4274038a03e8882e9c5b5954299d87dd3a37ade88936f017d5eb3637` |
| `docs/development/font-registration.md` | `font-registration-1` | `c83fce15b8be12fb3980f615d6762d128c1aa60930fb448f8be83d1684c60389` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-7` | `08fced8dc6f6b1b6af0faf598b97b670f27205d54132234b5b7daae8d7022465` |
| `docs/development/settings.md` | `settings-runtime-11` | `131ab1bb5903f01f988bd0d2b050a529f4d1b354e84afee7c46782a60134b61a` |
| `docs/development/protocol.md` | `development-20` | `3e9f07ba561e742c6d5be7b256a62852601a321cda2e6b624f4ea0c08e529e36` |
| `docs/decisions/0080-minimal-paper-starter-theme.md` | `ADR0080-2` | `0f7a9b020c64afdd569241fae67dbc272b3ec2028474d72e44f0c1c5bcc5f9f7` |
| `docs/decisions/0084-theme-cards-metadata-and-settings-scroll.md` | `ADR0084-2` | `e39535b125f6d5103544a6e4f05eb490f52da2447a2fa884a244c241da708551` |
| `docs/decisions/0085-shared-font-registration.md` | `ADR0085` | `60c7c469e00620f86f1ea1bc4bf0491bd3b0d45dbe445b8175d4b1e6fe63062d` |
| `docs/handoff/paper-starter-verification.md` | `paper-starter-2` | `0d6fd1a719714c8ea6714b159ddc908efc9e9c2216bca6ddccadd747f2babbab` |
| `docs/handoff/theme-cards-and-navigation-verification.md` | `theme-cards-navigation-2` | `2fbdc49507e7725b78af2a3606e5b7621ac78b6d2c4830ef0c335aff60adf70d` |
| `docs/handoff/theme-browser-paper-fonts-verification.md` | `theme-browser-paper-fonts-1` | `b8b875c5cbc200f23b17df93e42cab8f7e6c07d7c92ef0221b9ab196bb98cf1c` |


## 验证码与 API Key 策略交付（2026-11-09）

后端9d54f9e/9033616/1bf2161、前端3711671/369196c；captcha1.1.0及content-access1.3.0锁定9033616，嵌套公开/协同契约已统一。全局/单篇规则、提供方、受限投影和Key独立豁免/限流/撤销围栏完成；后端根plugins旧占位按用户要求删除。以下当前共同版本替代对应旧摘要，原始基线保留，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `a4d80715063154e11aeb07c1daa4ba17bf04fa75d6e6101aec11c027841dd239` |
| `docs/architecture/constraints.md` | `bootstrap-20` | `cd2a21ae3975302e1539edfd19873f35cd680ec0ef550aa0e5817b400877e576` |
| `docs/development/captcha.md` | `captcha-1` | `fa0505cdf4d93abafcfd9085ce81cf75f241f0e365892a8067559c6dca4f1a4e` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-8` | `75e6eb8fe2271c4f73f22cda65e561eb8032f7a95badfd7ca538aa7a7db8f184` |
| `docs/development/settings.md` | `settings-runtime-12` | `d07fc1dbf18bdf6770825136aa27ab9cb9b17420406328f3fb684cd1f759bead` |
| `docs/development/accounts.md` | `accounts-runtime-8` | `6518285dcd777aea888bbe8894eae190ba46d0d4a60636cc71518a0922f6035b` |
| `docs/development/api-key-applications.md` | `api-key-applications-3` | `37182da1da60291ab1bbc191265ee628488630874ae2be5b9299be849e91e553` |
| `docs/decisions/0086-captcha-providers-and-content-policies.md` | `ADR0086` | `b5b957a4e9a8ec83e842e9bd28f564aaee723a153438a9a24e2451180394c0f4` |
| `docs/handoff/captcha-verification.md` | `captcha-verification-1` | `b8551fdc6e9e0f0a2ce0c774b23dfc7cfbc05d772bed52009cbd2bc10a18e73f` |


## 单入口后端插件交付（2026-11-09）

后端4df1fdb/3b85ad2、前端5ad3705；settings1.16.1锁定3b85ad2。单入口函数/类SDK、动态只读短代码目录、统一验证码注册及后台启停完成，前端不再内嵌后端模板。以下版本替代对应旧摘要，原始基线保留，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `7c0f481e35b1768464579437d66970b7b5c549f3d619226ca1b59cf0e38fc315` |
| `docs/architecture/constraints.md` | `bootstrap-21` | `570ec4165cb0d054371eee1de7d3811d9bfd143cd3d1e533a88d7d59d81dcee6` |
| `docs/architecture/shortcodes.md` | `shortcodes-5` | `505809d37027e674164987c79a3424bba8e767c78d2f058d467538fc15e0f5ab` |
| `docs/development/backend-plugins.md` | `backend-plugins-1` | `5085944a5692753e4700fdc02c766b2ee57d80af3dfd7557c7e1db4aa9842b0d` |
| `docs/development/captcha.md` | `captcha-2` | `9cb168c0e834d47095c262e3fb9759d71405fe40b7e785302644a598006fe59b` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-9` | `9e5de60218bb9abe4c34a0f6cf52b093866126d73e432f4374c2364b801b3120` |
| `docs/development/settings.md` | `settings-runtime-13` | `f51ba1aa09ac329814575c7ac6a28602e5c714255fef096c9185d704659ca6ba` |
| `docs/decisions/0086-captcha-providers-and-content-policies.md` | `ADR0086-2` | `bb5e28e49bb8b27649a8709648dd8fa0f197e326d074aa8afe89a29ccd5eee5b` |
| `docs/decisions/0087-single-entry-backend-plugins.md` | `ADR0087` | `e26b023a5349c712c43a3c33033603910770fefbc28d1e99152ff1ce85510918` |
| `docs/handoff/backend-plugins-verification.md` | `backend-plugins-verification-1` | `b0b884c7a7eb38290c577ce916b370281f602d021dd241fe67b92804d8931df8` |


## 评论运营与搜索发现第一批（2026-11-09）

后端6f39606/787301d、前端5b87263；受影响契约固定6f39606。评论审核、真实工作台及SEO/地图/订阅已完成，其余ADR0088路线保持后续。以下版本替代对应旧摘要，原始基线不改，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `81f5d9d2aa85e0377d771599f0565deb784f2d0509ee795a2da5798ad2acc76e` |
| `docs/architecture/constraints.md` | `bootstrap-22` | `a92cfbd3f07a70a25e251b46f6eaebf9aca844960b7c221e2fd1cba25b31730d` |
| `docs/development/settings.md` | `settings-runtime-14` | `72ada1d2ddb4d39a95a197ccb7fb048f4d6fdf2b47e55d1232b72a5baa112ad3` |
| `docs/development/operations-and-search.md` | `operations-search-1` | `08f29b3f8fca838d6f1ebe79ad95ea93c793b7a99b95664fb7f05f16a5af0a81` |
| `docs/decisions/0088-operations-workflows-and-search-discovery.md` | `ADR0088-2` | `a7a5d6fec980c98a280922d9d56fed5396a6f479eb2cf7060f5d5e647496c95a` |
| `docs/handoff/operations-search-verification.md` | `operations-search-verification-1` | `c4cef5bd7e3d305b8145a04aae3bde2b4b6fb3c53996db9592a19e8c75eb0e0f` |

## 评论界面与原文入口（2026-11-09）

前端8b9558d，后端仅文档同步，operations1.0.0及其余契约保持。共享表单修正、动作图标/语义色和原文类型/标题/地址入口完成；以下版本替代对应旧摘要，原始基线不改，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `8aa16d49641468cd5acdf947217ca1f201e308427848506f8eddd7ea4104c58d` |
| `docs/development/operations-and-search.md` | `operations-search-2` | `b394e09ec50b9a291c18fcf7d7704712580b5a821e3e88fcd25dd9620f67fe58` |
| `docs/decisions/0088-operations-workflows-and-search-discovery.md` | `ADR0088-3` | `8388bef6f697773812948caf02c6d20213025e43170af7fd0161106c5c3bc79e` |
| `docs/handoff/comment-ui-verification.md` | `comment-ui-verification-1` | `1975870114dd65a934ee3874da24a4948a7867d54607bd14b44ce7316022256e` |

## 评论默认全部、对齐与加载后定位（2026-11-09）

前端57a22a4/264cccf，后端仅同步文档，operations1.0.0及业务契约保持。默认全部筛选、原文信息首行对齐和资源稳定后评论定位已完成；主动交互取消旧请求，实际检查及边界见共同验收。以下版本替代对应旧摘要，原始基线不改，STATUS各自维护。

| 当前共同文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `本轮更新` | `ba194fc49f8c4faff09e8c388a2d4a9f799a4aed4b8f13ec682eb4fb57ac8584` |
| `docs/development/operations-and-search.md` | `operations-search-3` | `0cb3eee862715f0f638483f71d3778807079ce8a1a93bead090c73b5700f5221` |
| `docs/decisions/0088-operations-workflows-and-search-discovery.md` | `ADR0088-4` | `6036ff88547408259af66bc366899d30559e99eeab5cc10c8a9574552fa73f66` |
| `docs/handoff/comment-ui-verification.md` | `comment-ui-verification-2` | `435577962d735b472f6a2acd14f0826235bc5954f66a937e4ef0afc46a6e6c33` |


## 内容运营与统一拖拽上传（2026-11-09）

后端097ddd7/fbde989/0b02472、前端e8f7339；本次替代下列文档旧摘要，原始基线不变，STATUS各自维护。新契约的精确提交及SHA由前端锁文件固定。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-content-operations-1` | `c614079b81df44f4eb513d1aebe63843cd50e58e20bfe7948da20adbc621803e` |
| `docs/decisions/0089-content-management-workflows.md` | `ADR0089-1` | `5a12ab6f1999173ce824959b8ec5b15590053813713917c16c4cc72b3b5d3162` |
| `docs/development/content-operations.md` | `content-operations-1` | `93ecafe39209fee4e378f32464f6590d62a626b18c25a6ebf08035fb628c5a96` |
| `docs/development/content-management.md` | `content-management-10` | `7175e2e2ee54c19c69f39f38b0edb471a8a960d499f1f768334bb3374de9a69a` |
| `docs/development/operations-and-search.md` | `operations-search-4` | `0394d9c8a28b541c364fd93c3f869de53a30fcd673781b8f79e0d6236cc57be4` |
| `docs/handoff/content-operations-verification.md` | `content-operations-verification-1` | `119be469dc31aa2312f9e94f47b7781ff61e0219e266dbe59ffd0b86388a0d21` |


## Scheduler所属常驻任务与运行管理（2026-11-09）

先登记开发规划，后实施任务SDK与管理界面。settings1.18.1固定284d82c及精确SHA；以下版本替代对应旧摘要，原始基线不变，STATUS各自维护。真实验证及未执行边界见验收。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-runtime-tasks-1` | `342876cf3c45393bc8a3c06258525d19eba08371dd970b7a4cac305b4dee052d` |
| `docs/development/runtime-tasks.md` | `runtime-tasks-2` | `0902bda597f2caba7dff512ff1bf05d91e04479975129eff9c9282334ef11479` |
| `docs/decisions/0090-scheduler-owned-residents-and-runtime-monitoring.md` | `ADR0090-1` | `45ef33d3722cc343d55355344ea246ed7a4dca9f6aeb83120e5c9a529316502c` |
| `docs/development/backend-plugins.md` | `backend-plugins-2` | `2d68adf02f63b6084e419fc9fb926ea16ad2d18fe10f3bbea21abc2c4ab609b6` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-10` | `ffded62cccfa34f7f060bb36c3bb65a3ac3104a90a46e162d5436be8239d8d60` |
| `docs/handoff/runtime-tasks-verification.md` | `runtime-tasks-verification-1` | `51fb52aa696854a711c58d96e741996b7cf5c4bd5e0c176b97f6ec2db79cc435` |


## 系统子菜单与邮件配置（2026-11-09）

后端25ae8b9、前端28350cd；settings1.19.0固定后端提交及SHA。菜单与配置已实现，实际凭据由用户填写，发送仍为后续规划。以下版本替代对应旧摘要，原始基线不变，STATUS各自维护。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-mail-1` | `8d647ae7a3201109085ca75fef166d8d550150a13b503f4a1c8b6c12be44808e` |
| `docs/architecture/admin-navigation.md` | `admin-navigation-4` | `1edd61d51797a44620050bc571ba11dd11624a367cbbf94c33b8463cf686c806` |
| `docs/development/mail.md` | `mail-1` | `ff927931b00b7acd6037baa2ea3d73ef33dda334fbeec7ae5d69aded9f038f00` |
| `docs/decisions/0091-system-submenus-and-private-mail-settings.md` | `ADR0091-1` | `aa5f3bd807e9ec86db097793116dc6584957d8686d9988779b39d31b33da7704` |
| `docs/handoff/navigation-mail-verification.md` | `navigation-mail-verification-1` | `dca9acb4113acaa99e364f017bdbf40007ac8d07067f6e0523814caf257e12fa` |


## 设置归类、悬停固定与测试邮件（2026-11-09）

后端37c6a62/398b36f、前端81fd5ee；settings1.20.0固定37c6a62及精确SHA，0033_mail_test显式部署。以下替代对应旧摘要，原始基线不变，STATUS各自维护。实际测试和未执行边界见验收。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-mail-2` | `2e7776993c189e33457fa6475662344cd0458fd557f2375446d0ebfe7ebe265e` |
| `docs/architecture/admin-navigation.md` | `admin-navigation-5` | `a1e7fcb264ffc91315b10cd7d04eda3d7d814dd32422bee9bbc27b8a04093355` |
| `docs/development/mail.md` | `mail-2` | `de5ac034dc6a2d08d91b2008f63007ca3fc3e28fbde231fc0cb016f3ba0830c0` |
| `docs/decisions/0092-settings-hover-and-test-mail.md` | `ADR0092-1` | `a4c0e18ceb3d891a60c61236d2af1b99382bb984c625ef1d47d6c9b6aaa61699` |
| `docs/handoff/navigation-mail-verification.md` | `navigation-mail-verification-2` | `f964a3aeec12c99481c278b0ad28ebcd051adfc3f4ce90cdc0072e0f2db74f15` |


## 统一任务进度与SMTP报文（2026-11-09）

后端21a60c1/8aec05e/7f2d791、前端f66ce9e；settings1.21.0固定21a60c1及精确SHA。0034显式部署，最后过期边界仅定向重验；以下替代对应旧摘要，原始基线不变，STATUS分别维护，检查与未覆盖见验收。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-task-progress-1` | `8baa6d9d06d483377a26bafae60ca39243ec3ccfa47a8af70cb679a99616d4c9` |
| `docs/development/task-progress.md` | `task-progress-1` | `fccc5d6cea7c2d7f4baa1005d29b44a7b12898a959098be816741f97e10a23dd` |
| `docs/development/runtime-tasks.md` | `runtime-tasks-3` | `e50c79372a67b083dc57d4d9520cbbeb137a2a12204b046b944919eff91761d9` |
| `docs/development/mail.md` | `mail-3` | `8d7e7f694610b050a86bfba4abcb6328fdb3f2294ea347338b6871d116d829a3` |
| `docs/decisions/0093-unified-task-progress-and-smtp-transcripts.md` | `ADR0093-1` | `24c3f011afa0cd780fcaab655b6dfa8d0bb2e53443c9f1ee258eb7819631bcf6` |
| `docs/handoff/task-progress-verification.md` | `task-progress-verification-1` | `f4c8073a59ac97b1e205c904e7fd0b917c9c23d54d395e066f848825b9a8de4e` |


## SMTP TLS主机身份修复（2026-11-10）

后端23755d9、前端5b30729；无契约或迁移变化。以下替代对应旧摘要，实际TLS回归与未覆盖范围见验收，原始基线保持。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/development/mail.md` | `mail-4` | `a6bbe4bb5c2b1951da38f848c687dc4ae1c74921a9212343dfd822de4cda2d93` |
| `docs/handoff/task-progress-verification.md` | `task-progress-verification-2` | `b7097826df28ca6af6d6b7be908728c3ffed09ed2edbf7b5367c362f4229cc0d` |


## 管理词云、菜单一致性与Worker手动测试（2026-11-10）

后端e3da550、前端1714eb4；settings1.22.0固定e3da550及精确SHA。无迁移变化，检查与限制见验收。以下替代对应旧摘要，原始基线不变，STATUS分别维护。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-admin-cloud-manual-1` | `3a5c0ad905de309fcff48cc9f4a74523e916996f70976be9a313762e7b117f3b` |
| `docs/development/content-operations.md` | `content-operations-2` | `8ad1b4adeee6841ed529259efe663ee97a4e40a0e2a5b60e652768ae97fc5b4b` |
| `docs/architecture/admin-navigation.md` | `admin-navigation-6` | `93cda9363eea3f69999466c4e770b30e034388053ae9bb4c97cda1e7fb0f0e5b` |
| `docs/development/runtime-tasks.md` | `runtime-tasks-4` | `e24961dc10617cb2efc79eaabfc2b87757cf1f0accc05604bab45b305cfb7ce2` |
| `docs/decisions/0094-manual-worker-dispatch.md` | `ADR0094-1` | `f7a51f96e6c4e1800eb4d32cfb52067e03960af9737e7bc817b02126dedbf383` |
| `docs/handoff/admin-cloud-manual-verification.md` | `admin-cloud-manual-verification-1` | `38ad0cca2965fd31187a511bd816ac17bb202f0190e3cf259d72a1f664a0adcd` |


## Worker参数声明与私有执行（2026-11-10）

后端4a81d6d/224be3c、前端845a99f；settings1.23.0固定4a81d6d及精确SHA，0035显式部署。以下替代对应旧摘要，原始基线不变，检查与限制见验收，STATUS分别维护。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-worker-parameters-1` | `4026b0b8998547f9a55bd5c8f605b063090b3607b525557dfbacef5287d6bc87` |
| `docs/development/runtime-tasks.md` | `runtime-tasks-5` | `0e78f7a9f7ed4257442289bf3b6180731bd73a851ba490f4821ca0e6c22dbce8` |
| `docs/development/backend-plugins.md` | `backend-plugins-3` | `9c814b56261fbad12e5556e7d92c00b892cb33236f2a38a10ef6f03575afe2b7` |
| `docs/decisions/0095-typed-worker-invocation-parameters.md` | `ADR0095-1` | `9c46745f452dde2471bcb14e833baf4e1e6e9bee346abc73f81d420b9bc89ba5` |
| `docs/handoff/worker-parameters-verification.md` | `worker-parameters-verification-1` | `027097ebc8acac6d75914a8f5f63067ff48df89c10333e2c5ef5483a4e9b57d9` |


## 页面评论与插件SDK（2026-11-10）

后端eb2ae91、前端f808291，五份契约精确固定后端提交及SHA。无迁移；部署与检查详见验收。以下替代相应旧摘要，原始基线不变，STATUS分别维护。

| 文件 | 版本 | SHA256 |
| --- | --- | --- |
| `docs/README.md` | `index-page-comments-1` | `333aa8506f93654070ee7536309fa5b0e497db330f437f3051dac4f32a3313f8` |
| `docs/architecture/registered-pages.md` | `registered-pages-runtime-9` | `a8cb27b94f5480c4767b9ae97e4fb297c4df40e53059ca9fbc0c5064b7867f1f` |
| `docs/development/pages.md` | `pages-runtime-11` | `c93b3e4039b6ed4284d465c249d00a1f6d38402cd6a90cbc53c615c69aac58b3` |
| `docs/development/frontend-plugins.md` | `frontend-plugins-11` | `ec15eef717dd03712dcc64836e38f767f8b03752ce3a52d33bdcb5a43ae091bc` |
| `docs/development/captcha.md` | `captcha-3` | `fc5ebce5749e1680ade5e866ebc237571e1d12b436532d6cded3cc7ffc67c23d` |
| `docs/development/page-comments.md` | `page-comments-1` | `de49df9f78e008e8aa6e72ae1f812ca1bd639def5773c7745a08dcefaab9b4a3` |
| `docs/decisions/0096-managed-page-comments-and-plugin-sdk.md` | `ADR0096-1` | `21b5b6d66d12b26f731dd4a18e731a174b272160d1e0a6cfb7928988a327f442` |
| `docs/handoff/page-comments-verification.md` | `page-comments-verification-1` | `292cf3892fdb9cdb1aa248f90270fbc2f5f28629584feb58cc1b9ffd4c4167cf` |
