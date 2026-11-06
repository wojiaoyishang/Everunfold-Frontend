# ADR0077：统一插件、主题控件与产物边界

日期：2026-11-07。状态：按用户最新要求实施并通过本轮验收；规范先于后续代码修改，本地checkpoint保留阶段源码。具体结果和边界见[验收](../handoff/plugin-runtime-verification.md)。

用户明确覆盖ADR0076：页面与短代码都由同一个src/plugins目录中的插件实现；插件和主题自动发现，设置由模型声明组件名、主题hook解析控件，插件/主题可扩展组件名，缺失实现显示占位而非整页报错。src/generated及registrations移除，自动生成产物不提交Git；已有运行缓存按用户指示不迁移。

采用[前端运行规范](../architecture/frontend-plugin-runtime.md)和[数据接口规范](../development/plugin-data-protocol.md)。立即拉取/后端Callback按资源身份、权限、epoch/修订、持久ACK和去重协调；配置数据可在部署后直接应用，新增可信源码仍走构建。只迁移有实际消费者的人物/画廊/设置控件，其他可选能力列出拆分顺序，核心鉴权/事务/投递不改为可关闭插件。

本轮可用能力、测试及尚未落地的数据操作必须写STATUS和验收记录，不能把接口类型或规范当作后端服务已经实现。

接口落点：pages1.5的PageRegistration增加开放JSON settings_schema，后端不限定组件名，字段模型只供前端具名控件使用；未注册组件由前端占位处理，不阻止保存合法配置。
