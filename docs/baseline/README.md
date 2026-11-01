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

修改公共规范时在当前交付同步另一仓库，检查文件 SHA256 相同，并在两仓库状态中记录同步结果。若另一仓库暂时不可访问，明确记为待同步及目标版本，不能声称已一致。两个仓库分别提交，不要求提交哈希相同。

`everunfold-frontend/AGENTS.md` 中由 Next.js 开发服务器自动维护的 `<!-- BEGIN:nextjs-agent-rules -->` 区块是该仓库工具专属内容，不复制到后端。根 `AGENTS.md` 的其余共享内容仍须保持一致；比较时先移除该区块。

根 README、锁文件、代码、检查结果、`docs/handoff/STATUS.md` 与仓库专属设计各自维护，不要求相同。两个根 `config.example.toml` 分别对应各自角色，必须不同；共同参数含义以后端契约与基线为准。版本化契约只由后端发布，前端生成内容不是第二份可编辑契约源。
