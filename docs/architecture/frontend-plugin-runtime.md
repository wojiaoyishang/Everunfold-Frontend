# 前端插件、主题与声明式设置规范

版本：plugin-runtime-2，2026-11-07。状态：本轮实现依据，逐项验证结果在STATUS记录。以用户最新要求替代ADR0076中的custom_pages目录和生成式装配；不把本规范的后续拆分建议当成已交付能力。

## 宿主和扩展

宿主固定掌握认证/授权、CSRF、数据库事务、审计、可靠投递、版本/撤回守卫、源文和上传队列。插件提供可选页面、短代码、设置模型和展示组件；主题提供布局和具名控件实现。数据库配置不能成为动态模块路径。第一方插件与主题同样经过本地可信代码发现；不声称它们是恶意代码的安全沙箱。

只保留src/plugins/<插件>/，不另设custom_pages。每个插件的plugin.ts声明稳定id、version和同步setup，目录可包含页面、短代码、schema、组件与样式。setup通过pages.register、shortcodes.register等已实现能力贡献项目，短代码和页面定义不自行注册。组件由本目录components.tsx按稳定名称导出。主题放src/themes/<主题>/，theme.ts声明身份/父级/模板/钩子和components.tsx提供具名实现；父子主题与作用域CSS见[主题规范](frontend-themes.md)。新增能力只在所属目录维护。

Next.js当前Turbopack支持import.meta.glob，宿主使用固定本地路径自动发现插件/主题及组件表（eager元数据使用模块对象，避免生产默认导出差异），不生成中央组件文件，不允许配置远程JS地址。Node检查/导出工具采用同一目录规则；纯配置清单不导入组件/CSS。插件身份、页面ID、短代码ID/名称的重复声明是部署错误，明确失败；没有注册的展示组件显示主题占位提示，保留原配置，其余设置继续可用。组件实现发生异常时局部错误边界显示提示，不吞掉网络保存失败。

## 配置模型与主题控件

页面设置只声明schema；model字段包含key、component、label、default及可选的props、fields。component是开放的有命名空间字符串，主题或插件可提供新组件，不限定项目内枚举。常用text、textarea、number、boolean、select、object/list等由主题实现。表单宿主负责递归值更新、保持未声明键、禁用与错误反馈；控件通过FormFieldProps读取field、value、onChange、disabled与renderFields，不发业务请求或直接存库。useThemeComponent(name, props)按当前主题及基础控件优先、插件补充新名称返回React节点；缺失时显示可读占位。JSON高级入口与结构化表单编辑同一配置；无效JSON保留输入、阻止保存并维持最后有效预览。

页面设置options是公开JSON键值，不是表单白名单。32层/256KiB和整页512KiB是传输/存储上限；前端自行解释语义并安全输出。私有元数据沿独立权限接口，不通过公开options、组件props、SSR或共享快照泄露。

## 生成物、部署和快速修改

删除src/generated和registrations目录。类型/客户端/Schema等机器产物写入根cache/contracts，HTTP后备页写cache/build，整个/cache被Git忽略。Git仅保留生成工具、精确版本/提交/SHA锁文件及稳定core/contracts访问模块；构建前能从已锁定的后端提交恢复产物，不依赖工作目录里的未提交后端Schema。组件不从产物目录选择UI实现。现有公开运行副本继续var/public-snapshots和var/settings，按用户指示不迁移。

本地开发、检查、生产构建统一prepare。页面声明通过显式pages:register命令直接送后端stdin；构建不写库。配置值、页面路径、启停、人员等数据通过后端保存/应用和可靠回执更新，编译后的站点无需重新构建。新增React组件、TypeScript业务代码或全新主题实现仍需构建部署；目录自动发现减少改中央文件，不意味着运行时执行任意源码。

## 解耦顺序

本轮迁出人物页面、画廊短代码和设置表单。后续优先拆附件/媒体展示、代码与公式展示、评论/互动、搜索展示、导航扩展；编辑器适配继续沿既有插件和单一Y.Doc。用户/API Key管理可以拆展示模块，但认证、权限判定、审计和密钥生命周期由宿主保持。SEO/路由/公开副本是跨插件协调能力，先保留宿主服务，避免插件卸载破坏既有URL和撤回规则。没有消费方的通用事件总线/热代码分发不预建。
