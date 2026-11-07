# 荣誉与证书插件

`core.honors`注册`/myhonor`页面及自己的配置控件。开发服务自动发现/编译；生产单独构建并部署本插件包，不修改中央注册列表。源码不含用户证书或荣誉种子数据。

| 文件 | 职责 |
| --- | --- |
| plugin.ts / page.ts | 插件setup、页面身份、默认配置和语言路由声明 |
| schema.ts | 配置模型；列表字段、开关、布局和排序 |
| components.tsx | 具名组件导出 |
| field.tsx / image-field.tsx | 本地化标签后委托主题控件；使用SDK媒体选择器 |
| model.ts | 开放JSON配置的展示投影、日期精度、筛选和URL校验 |
| render.tsx / image.tsx / certificate.tsx | 荣誉墙、图片和共享Dialog证书查看 |
| labels.ts / styles.module.css | 包内界面文案与作用域样式 |

后台的“页面→我的荣誉”可维护介绍、网格/时间线、默认排序、搜索/年份/统计开关及荣誉列表。分类来自记录，没有固定分类枚举；日期为展示文字，支持年、年月、年月日（例如2025、2025.06、2025-06-18），缺失/未知日期保持原文并在日期排序中靠后。列表顺序即录入顺序。

每条记录支持title、category、date、award、description、image_url、link_url；id是可选稳定标记，额外JSON键由宿主原样保留。图片和链接支持HTTP(S)及站内绝对路径；拒绝执行协议、协议相对地址和内嵌凭据。图片为空时仍显示文字记录。

页面默认停用，默认没有荣誉记录。保存工作稿不改变前台，应用后通过现有可靠快照同步。用户数据保存在后端页面options，来源/导入指纹存私有metadata，不打包进插件。新增组件仅在本目录声明、实现并经setup贡献；不直接导入宿主私有源码。主题可覆盖`core.honors.page`、`core.honors.field`或`core.honors.image`。

localized声明复用站点语言目录的所有启用前缀。界面文案随宿主uiLocale选择包内字典，未知词原样显示；荣誉名称和说明属于用户内容，不自动翻译。扩充界面语言时维护labels.ts，无需修改宿主字典或路由。

```sh
npm run plugins:typecheck
npm run plugins:build -- --plugin honors
```

证书查看复用SDK的Dialog、焦点管理、退出动效及减少动态偏好，左右方向键/按钮切换当前筛选结果中的图片，Escape关闭并恢复原焦点。媒体入口仍要求原媒体权限，不绕过后台鉴权。
