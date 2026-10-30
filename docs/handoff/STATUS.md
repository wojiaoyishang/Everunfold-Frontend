# 前端交接状态

更新：2026-10-30（Asia/Shanghai）。阶段：**第 0 步，基线对齐与项目初始化**。本仓库可独立安装、检查和构建；当前首页是开发占位页。

## 恢复上下文

1. 读本页、[文档索引](../README.md)、[开发协议](../development/protocol.md) 和 [约束](../architecture/constraints.md)。
2. 查看 `git status`、当前分支/提交与 `origin`；保留已有修改。远程同步情况用实际 Git/GitHub 状态核对，不依赖聊天。
3. 原始附件在 `docs/baseline/`，哈希与维护规则在该目录 README；历史聊天只作辅助。确认需求、工程提案和实际代码分别判断。
4. 查看 [本轮验证记录](bootstrap-verification.md) 以及根 README 的复现命令。

## 已完成

- 对齐设计 v2.11 与工程 v0.14，建立逐字节原件副本、来源/哈希、提案与已确认边界说明。
- 建立 `AGENTS.md`、开发协议、ADR 0001、文档分目录和双仓库公共资料同步规则。
- Next.js App Router + React + TypeScript 严格模式、普通 CSS、中文占位首页；标注 `noindex`，不是最终博客主题。
- npm 精确依赖与独立 `package-lock.json`、Node/npm 兼容范围、ESLint/Prettier/类型检查、构建和 CI。
- 预留 `src/core`、`src/themes`、`src/custom_pages`、`src/plugins`、`src/generated` 及部署/测试目录，未用假服务实现填充目录。
- `config.example.toml` 从原文提取，通信设置只放仅服务端 `[backend]`，但**当前没有 TOML 加载器**，复制模板不会连接后端。
- 真实配置、密钥、`node_modules`、构建状态、运行缓存和源 SQL 均忽略提交；本轮备份盘点见 [迁移清点](../migration/wordpress-inventory.md)。

应用版本 `0.1.0` 是骨架包版本，不是后端契约版本。初始化选择 Next.js `16.4.3`、React `19.3.1`、TypeScript `5.9.3`，本机 Node `22.15.1` / npm `10.9.2`；精确依赖与传递依赖以锁文件为准。

## 未实现与限制

- 后端客户端/运行时公开配置、开发代理、认证/用户状态、主题注册、Markdown/HTML 渲染、安全过滤、编辑器/协同尚未实现。
- 尚无公开磁盘快照、cache handler、内部接收端、真实 socket 来源校验、回源/撤回、镜像或 Cloudflare 插件。
- `src/generated` 没有业务类型：后端尚未发布版本化业务契约，禁止先手写另一套接口。
- 当前无需后端即可构建占位页；不代表全站已实现或生产可用。完整主题设计还需审阅线上视觉，当前主题线索来自本地 Argon 源码。
- ESLint 9 工具兼容限制、实际检查结果和未执行项见根 README / 验证记录；不使用未经验证的 peer override 强行升级工具。
- 没有更改线上站点、导入 WordPress、部署生产服务或执行完整 P0 验收。

## 建议下一步

1. 与后端同步第一个版本化业务/内部契约；从后端指定 tag/commit 或发布产物生成 TypeScript 客户端，记录版本/哈希与兼容范围。
2. 按 ADR 交付仅服务端配置加载器、显式公开字段及统一 URL 客户端：生产浏览器直接访问配置的 `BACKEND_BASE_URL + /v1/*`，不泄露内部 `[backend]`。若做开发代理，只剥离一次 `/api`，不代理内部接口。
3. 阅读 Argon 公开主题与线上参考，形成主题/页面规范；可信主题与业务客户端分离，再逐步实现内容渲染、管理界面与组件注册。
4. 等内部协议落地后再实现公开快照存储、版本/撤回和 socket 来源适配，并按原文执行故障验证；无 TTL 不等于永远不更新，已知撤回绝不回退旧正文。

UI 框架、编辑器/Python Yjs 组合、语言清单、完整 Schema 等仍待对应设计阶段决定；不重新开启已确认架构的产品选择题。

## Git 与跨仓库

目标分支 `main`；目标 [Everunfold-Frontend](https://github.com/wojiaoyishang/Everunfold-Frontend)，本机 `origin` 使用同仓库 SSH 地址。后端位置 `E:\Programming\Python\Everunfold-Backend`，目标 [Everunfold-Backend](https://github.com/wojiaoyishang/Everunfold-Backend)。

公共协议/原件按 `docs/baseline/README.md` 同步；环境和本次迁移盘点目前也相同。后端发布契约，前端只消费明确版本。后续每次有意义交付更新本页、实际检查记录和相关 ADR，不能只在聊天中保留进展。
