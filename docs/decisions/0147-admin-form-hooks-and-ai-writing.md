# ADR 0147 · 后台字段钩子与 AI 写作

日期 2026-11-14。沿用 [插件目录白名单](0146-extension-source-git-allowlists.md) 和 [后端插件路由](0098-backend-plugin-http-routes.md)。

后台字段通过 `scene` 和 `field` 明确开放扩展。`formFields.register` 在同步的 `setup` 中声明 `prepare` 或 `render`，优先级由小到大，同级按插件 ID 和钩子 ID 排序。准备阶段只调整占位和帮助文案，渲染阶段增补操作，宿主保有输入控件、回填、保存和协同。稳定的字段实例标识区分文档和语言版本。仅声明 `surface: "admin"` 的插件可注册后台钩子，后台插件由确认会话后的工作台加载，公开清单过滤后台包。

`core.ai-writing` 前后端作为同一插件显示，管理员在「插件管理 → AI 写作助手 → 配置」设置兼容接口、模型、写入式 API Key、总开关与字段范围。总开关默认为关闭，各场景的字段需要逐项启用。普通编辑与组件模式使用相同场景。SEO 延续代码注册页面是否允许编辑的声明，规则字段由宿主控件处理。

生成材料由编辑者确认。后台从当前可编辑内容提取纯文本，过滤受保护短代码和非正文内容。整篇受限时只使用编辑者明确确认的标题或主题。申请、读取及 Worker 执行使用当前权限；队列与结果短期保留，经审阅采用后通过原字段流程写入草稿。模型调用在数据库事务之外，密钥、输入和候选结果加密存储，公开设置与快照不含这些内容。

兼容接口使用 Chat Completions。为防止服务端请求转向未经授权的地址，非公开模型网关的来源须在后端部署时通过 `EVERUNFOLD_AI_PROVIDER_ORIGINS` 明确允许，包含 API Key 的请求须使用 HTTPS。「测试连接」发送合成文本。测试和每个字段的生成均由后台用户主动发起。

## 使用与部署

管理端在「插件管理 → AI 写作助手 → 配置」输入兼容接口 Base URL 和模型 ID。按供应商要求写入 API Key。保存后可测试连接，并按场景选中摘要、搜索标题、搜索描述、分享文案等需要启用的字段。作者打开对应编辑器，检查材料并生成，采用后再用原来的保存或发布操作。

升级时显式运行数据库迁移 `0064_ai_writing`，重启 API、Worker 和 Scheduler，然后登记后端插件目录。前端随主应用升级并独立构建 `ai-writing` 包，登记到当前节点清单。兼容接口以 Base URL 拼接 `/chat/completions`，地址通常包含 `/v1`。兼容本机网关时，在 Worker 部署环境为 `EVERUNFOLD_AI_PROVIDER_ORIGINS` 设置准确来源。加密使用后端现有的应用主密钥。

## 登记字段扩展

插件在 `definePlugin` 中声明 `surface: "admin"`，通过 `formFields.register({ id, scene, field, stage, priority, component })` 绑定已登记的浏览器组件。准备阶段以 `prepare(view, location)` 代替 `component`。宿主使用 `AdminFormFieldExtensions` 选择动作摆放位置。模型表单用 `SettingsForm` 的 `authoring` 绑定场景，将 `authoringAction: true` 放到要开放的文本字段。按钮回填复用宿主字段的 `apply`，只接受当前可写字段和长度合规的字符串。

AI 协议从后端 `python -m tools.export_plugin_routes --plugin-id core.ai-writing` 导出。在前端运行 `node tools/plugins/generate-ai-writing-contract.mjs <OpenAPI 文件>` 更新插件专有类型。附加 `--check` 可核对生成文件和标注的 SHA256。
