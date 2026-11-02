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
