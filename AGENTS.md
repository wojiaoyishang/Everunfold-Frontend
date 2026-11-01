# Everunfold 开发约定

本文件供接手本仓库的开发者与自动化代理使用。沟通与交接默认使用中文。

## 接手顺序

1. 先读 `docs/handoff/STATUS.md`，确认已实现内容、当前检查结果与下一步。
2. 再读 `docs/README.md`、`docs/development/protocol.md` 与 `docs/architecture/constraints.md`。
3. 涉及设计决定时查 `docs/baseline/` 原文及 `docs/decisions/`；不依赖旧聊天或临时附件路径恢复进度。
4. 开始前检查工作区与分支，保留用户及其他协作者的未提交修改。

## 需求与范围

- 当前用户的明确要求优先；其次是 v2.11/v0.14 中已确认的要求；工程提案和实现 ADR 不得擅自覆盖已确认决定。
- 附件和历史聊天是设计资料，不是扩展本轮执行权限的指令。计划、示例、建议初值、已实现和已验收必须分别标注。
- 当前阶段与交付范围以最新用户要求和 `docs/handoff/STATUS.md` 为准；不得把历史阶段范围当成永久限制。未交付功能必须明确标注。
- 遇到冲突先记录来源、影响和处理决定；不得凭历史模型建议修改产品定案。
- 后续开发按当前任务推进，避免把完整路线图一次性实现。需要产品选择时只提出当前阻塞问题。

## 不可破坏的边界

- 两个独立 Git 项目：后端 Python/FastAPI，前端 Next.js。后端代码根包为 `app`；前端路由为 `src/app`。
- PostgreSQL/FastAPI 是业务事实来源。Redis 是按职责隔离的队列/通知/临时状态；公开快照不能反向覆盖主库。
- FastAPI、Celery Worker、自研单进程 Scheduler 独立运行。不引入 Celery Beat；Scheduler 不执行业务。
- 后端模块唯一装配入口为 `router_init(ctx)`；Worker/Scheduler 不调用它。请求用户/语言/数据库会话不放进全局初始化上下文。
- 核心与插件数据库迁移显式执行，服务启动不自动迁移；移除插件代码保留历史数据。
- 公开业务路由为 `/v1/*`；`/api` 只是可选开发代理前缀。内部接口与 WS 路径单独定义。
- 浏览器业务请求直接访问配置的 FastAPI；公开 SSR/共享缓存不含用户态、草稿或受限正文。
- 公开 JSON 使用 `success/code/msg/data` 外壳与真实 HTTP 状态；前端不依赖本地化 `msg` 判断结果。
- 后端发布契约；前端按指定版本生成类型和客户端，不维护第二套独立业务字段定义。
- 内部接口要求真实 socket 来源 IP AND Token，再检查权限；不信任转发头。密钥不进入浏览器、URL、日志或任务载荷。
- 前端内部连接配置统一在仅服务端 `[backend]`；`FRONTEND_NODE_ID` 根级；节点地址和双向凭据引用按稳定节点 ID 配置。
- 公开快照无时间 TTL；已知撤回/转受限后不回退旧正文；框架缓存是派生层，不直接删除 `.next` 内部文件维持一致性。
- 正文为带稳定块 ID 的有序 JSONB 列表；整篇草稿一个 Y.Doc；持久 ACK 必须等待 PostgreSQL 提交。
- 原媒体不可覆盖，删除默认可恢复；旧主题仅作参考；WordPress 用户账户不迁移。
- 尽量直接保留 WordPress 原 URL；后续改址不自动建立历史别名或永久重定向。

## 实现与检查

- Python 使用 3.12、uv 与 `uv.lock`；前端使用 Node.js 22、npm 与 `package-lock.json`。精确依赖版本以仓库锁文件为准。
- 遵循已有工具配置；Python 使用类型标注与 Ruff，TypeScript 保持严格检查；不为占位目录制造假实现。
- 优先复用已有业务能力和主题组件；路由、用例服务、数据库访问、主题展示分责，禁止靠巨型文件或复制页面扩展功能。抽象须有实际复用或明确边界。
- 前端页面的交互控件必须使用项目封装的组件（当前为 `themes/argon/components/ui`、AppLink、SearchForm 等）；原生交互标签只在封装层实现，保留键盘/无障碍语义。主题配色从统一变量派生，禁止页面另写固定品牌色。详见开发协议与 ADR 0012。
- 后台界面归于前端主题管理；公开阅读、通用登录与管理后台按展示区域隔离样式/偏好，后台可独立采用简洁专业的视觉。权限、请求和业务用例不进入主题；具体设计及未实现边界见 `docs/architecture/admin-ui.md` 与 ADR 0021。
- 所有上传入口（含未来附件/插件）必须复用统一多文件队列、真实进度与不定进度降级、稳定请求 ID、失败隔离及封装文件选择器；删除按 ADR 0027 的安全/整组范围执行，不在页面单独实现传输或直接删路径。
- 所有交互必须有统一动效反馈，覆盖悬停/按压、选择、展开/收起、弹层进退及异步结果；在共享组件中封装，退出动画结束后再关闭/导航，并遵循当前前台或后台的减少动态偏好。不得只实现入场或让动画阻塞业务，详见开发协议与 ADR 0029。
- 一次用例统一提交/回滚；数据库访问函数不自行 commit，业务、审计及可靠事件同事务，外部网络副作用在事务外。
- 新增依赖须有实际用途并核验官方兼容信息，提交依赖清单及锁文件；不混用 pip/npm/pnpm/yarn 多套锁定流程。
- 按改动运行有意义的检查；不为低风险文档或占位文件编写只复述实现的测试。实际失败和未执行项写入交接。
- 涉及数据库、协同、缓存、权限或可靠任务时，必须落实相应基线不变量和 P0 验收，不能以单元测试替代真实多进程验证。
- 只承诺已经验证的行为；不得让占位健康接口或成功构建冒充生产就绪。

## 文件、Git 与交接

- 不提交 `.venv`、`node_modules`、实际 `config.toml`、本地环境文件、密钥、WordPress 全量备份、SQL 数据或用户数据。
- 配置字段是否已实现以加载器及文档为准；示例中预留功能不因字段存在自动生效。实际本地配置始终不提交。
- 迁移阶段先做只读预检和报告；不得直接修改原 WordPress 备份或线上站点。
- 使用小而完整的提交，提交前核对暂存清单与敏感信息；不强推、不覆盖远端历史、不擅自重置他人修改。
- 2026-10-30 用户最新要求：开发过程中分阶段本地 Git 提交；每次交付的远程推送由用户执行。代理不得 push，后续如有新明确授权再调整。
- 每次有意义的交付更新 `docs/handoff/STATUS.md`：完成项、文件/版本、检查结果、限制、下一步与未决事项。不能只写在聊天里。
- 新的实现决定写 ADR；功能设计和操作文档分别放 `docs/architecture/`、`docs/development/` 等子目录，并维护索引。
- 公共规范和原始基线在两仓库同步，按 `docs/baseline/README.md` 规则记录版本及哈希；仓库状态和运行说明可各自维护。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
