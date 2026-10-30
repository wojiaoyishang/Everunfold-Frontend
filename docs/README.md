# Everunfold 文档入口

本目录是跨上下文、跨开发者的长期交接入口。当前阶段为公开阅读第一版，完整博客/CMS 尚未全部实现。

## 先从这里读

1. [当前状态与下一步](handoff/STATUS.md)：本仓库实际完成了什么、验证结果、限制及接续任务。
2. [开发协议](development/protocol.md)：协作、代码、依赖、Git、检查和交接规则。
3. [架构约束](architecture/constraints.md)：已确认边界、工程提案与待决事项。
4. [基线来源及校验](baseline/README.md)：原始附件、权威顺序和双仓库同步规则。
5. [初始化决定](decisions/0001-bootstrap.md)：本步工程选型及其适用范围。
6. [公开阅读决定](decisions/0002-public-reading.md)：当前交付、数据链路与尚未实现边界。

## 目录职责

| 目录 | 内容与维护时机 |
| --- | --- |
| `baseline/` | 两份原始附件的逐字节副本、来源和 SHA256；保留历史依据，不直接改写原件 |
| `architecture/` | 已落实的架构边界、模块与数据设计；明确区分已实现和计划 |
| `development/` | 开发协议、本地运行和检查方法；随工具或流程变化更新 |
| `decisions/` | 编号 ADR，记录决定、原因、后果和替代关系 |
| `handoff/` | 当前状态、验证记录和下一步；每次有意义交付更新 |

后续可新增 `api/`、`database/`、`migration/`、`operations/` 等子目录。只有实际产生对应文档时才扩展索引，避免大量没有内容的占位文档。

## 操作与验证记录

- [开发环境](development/environment.md)：本机工具、安装方式和项目运行说明。
- [公开阅读运行指南](development/public-reading.md)：8001/3000 启动命令、数据刷新与手工验收。
- [WordPress 只读清点](migration/wordpress-inventory.md)：源备份范围与迁移前置事实；不是导入结果。
- [初始化验证](handoff/bootstrap-verification.md)：本步实际执行的检查、结果与限制。
- [公开阅读验证](handoff/public-reading-verification.md)：当前阶段实际检查与已知限制；初始化记录保留为历史。

## 两仓库分工

- `Everunfold-Backend`：FastAPI、Celery Worker、Scheduler 共用 Python 项目；发布版本化 API/WS/事件契约。
- `Everunfold-Frontend`：独立 Next.js 项目；消费指定版本契约，维护可信主题、页面和节点缓存。
- 本页及公共规范在两仓库保持一致；运行说明、状态、功能设计按所属仓库维护。接口契约仍以后端为唯一权威，不把文档副本当成第二个契约源。
- 根目录 `README.md` 是本仓库运行入口；根目录 `AGENTS.md` 是开发协作规则。实际版本和命令以它们及锁文件为准。

## 记录状态的约定

文档必须明确写出“已确认需求 / 工程提案 / 已实现 / 已验证 / 未实现 / 未执行”。原文存在配置示例和验收计划，不表示参数或生产能力自动生效。当前已做本地公开内容试导入，未执行线上切换或生产部署；远程推送由用户执行。
