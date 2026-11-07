# ADR 0081：自定义页面的脚本执行位置

日期：2026-11-07。状态：已实现；[验收记录](../handoff/page-script-position-verification.md)。

用户要求自定义页面可选择JavaScript在body之前或之后执行。使用标准HTML位置表达：head为正文解析前，在沙箱head中、CSP与样式之后插入脚本；body_end为作者HTML之后、关闭body标签之前。默认body_end，保持已有页面的执行时序。不是宿主页面的Next Script策略，也不等待所有外部媒体加载。

后端PageValue新增javascript_position枚举，保存于现有JSONB工作稿与应用快照，不新增表或迁移；缺字段默认body_end，非法值拒绝。注册页脚本生命周期由可信实现管理，不接受作者位置设置。pages1.6/public0.9/content-admin1.13由后端发布，前端从精确提交恢复类型与校验器。

前台、新窗口与实时预览复用原沙箱生成器。位置加入渲染标识与依赖，只修改位置也必须换内层文档并等待匹配回执。脚本开关、管理员限制、CSP、无同源权限和测高回执保持；HTML内嵌脚本仍留在作者的HTML位置。说明明确head阶段正文DOM尚不可用，避免把位置选择误当作DOMContentLoaded回调。
