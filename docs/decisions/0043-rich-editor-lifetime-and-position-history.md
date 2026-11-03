# ADR0043：富文本实例生命周期与位置历史兼容

日期：2026-11-04。状态：已实施并完成开发环境回归。继承ADR0042，修复用户指定编辑页的extensions空引用与回归时发现的结构同步问题，不修改发布权限、缓存或业务字段。

## 实例生命周期

用户提供的堆栈为RichTextEditor.useEffect读取null.extensions。Tiptap销毁实例时会清空extensionManager、schema与commandManager；useEditor依赖变化会在效果阶段销毁旧实例，而其他效果/句柄可能仍引用该渲染快照。新会话起初未稳定复现用户的500，修复依据为该堆栈和锁定版本的实际销毁实现；不把HTTP200等同于客户端无异常。

RichTextEditor按本地或doc.guid+blockId绑定选择独立子组件；改变共享文档时由React重建完整引擎生命周期，不在useEditor依赖效果内重建并沿用旧闭包。访问命令、schema、插件状态及延迟媒体插入前同时检查管理器和实例存活；扩展管理器为空时不渲染工具栏，不把已销毁实例交回EditorContent。继续复用宿主Y.Doc与UndoManager，不新建协同或发布管线。

## 引擎位置历史

真实结构编辑可生成y-tiptap3.0.12的__tiptap_position_migrations:item:<client>:<clock>根Map。原后端只接受meta/order/blocks，因而以42270拒绝并停止同步；这是独立于500的兼容缺口。

只显式允许该内部命名空间，验证版本1、client/clock、seen与transfers（source/target身份、边界、长度、assoc）；拒绝额外字段、字符串/布尔/非整数数值、未知根与top-level tname。单文档额外根最多1024，每Map记录最多20000，每条seen最多4096、transfers最多20000；更新1MiB/状态4MiB等原容量限制仍生效。这些是开发保护值，不是压测承诺。

已接受的位置历史只能追加，不能改写或删除；业务投影不读取这些元数据。业务根、访问策略和媒体/源码世代校验仍沿用原规则。未来SDK或编辑插件新增持久辅助结构必须显式审核并校验，不可放开任意根。拒绝日志只记录异常类别及函数/行号，不记录正文或凭据。

本轮无SQL迁移、依赖升级或HTTP/WS字段变化，原生成契约保持。后端a89a410和前端2b03414共同交付，实际证据见[验收](../handoff/editor-lifecycle-fix-verification.md)。
