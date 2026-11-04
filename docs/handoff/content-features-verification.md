# 代码、公式与共享分屏底栏验收

日期2026-11-04。代码b1196f3，katex0.19.1、highlight.js11.12.0，ADR0049。后端/契约/数据库0015/依赖未改。

## 浏览器与真实保存

- Markdown源码/可视化/分屏的高亮、公式、共用窗口、JavaScript/Python选择/预览/插入及围栏/LaTeX源码；HTML两视图公式入口、行内显示、独立求和公式插入、既有TypeScript代码读取语言/内容并修改。
- 错误分式保留输入并禁用插入；正确公式实时预览。选择、鼠标/Enter、取消/Escape、退出及返回焦点已操作。移动端初次自动定位滚动时点击未命中；稳定后鼠标与键盘均复测成功。
- 分屏仅一条横贯两栏的底栏，字符数一次；出口子节点1、宽度与区块一致，查找/关闭、换行和行列显示可用。
- 320px公式窗口宽/滚动宽294，页面308/308（已有滚动条预留）；手机阅读308/308。深色和减少动态下公式/操作正常；恢复跟随系统、舒适密度、轻量动效和全部视口覆盖。
- 两格式Ctrl+S真实保存成功；临时发布后前台3个代码块、5个公式正常。代码工具显示复制成功反馈，本轮未另核对系统剪贴板字节，不扩大为跨浏览器剪贴板保证。

## 前台资源与环境

服务端首屏已生成高亮与MathML。冷加载验收页控制台错误0。pageAssets的resource记录观察到代码CSS、公式布局CSS、KaTeX CSS，及实际用到的KaTeX_Math-Italic、Main-Regular、Size2-Regular三份WOFF2；未观察到其他公式字体或客户端KaTeX/Highlight.js引擎资源。普通「编辑功能验证」文章：功能资源0、功能link0、错误0。没有用仅检查import代替资源观察；浏览器DOM环境无performance API，改用pageAssets。

发布初期发现开发投递进程未运行，临时启动既有receiver/Worker/Scheduler，未改配置。Next长时间开发会话还遇到热更新旧模块的features读取错误，一次有界重启后，冷加载和隔离生产均正常。未删.next、未加自动刷新。完整软导航/缓存命中、浏览器断网/字体失败、实机IME矩阵没有额外执行。

## 自动检查及恢复

- npm run check：186项、lint、严格类型、格式通过。新增10项覆盖资源条件、价格/转义/代码中的美元、两格式一致输出、转义/语言/长度回退、公式错误/外链禁用/宏隔离、共享Schema保留、源码保真和本地字体。
- 隔离npm run verify:admin通过：生产构建、16个私有管理入口、离线阅读、混合正文SSR高亮/MathML、普通文章无功能资源、CSS/字体200、撤回404及设置损坏关闭。构建后仅补齐分屏空余背景/边界，已实页复核。git diff --check通过；无持久协议变化，本轮不重复后端P0。
- 仅操作验收稿09049c74-24e1-4be1-b12d-27825368d80f，功能修订保留。临时发布已撤回，原URL404；原Markdown57字符、HTML215字符逐字恢复并保存，保存禁用。原用户322062a6、WordPress/备份未改。
- 临时投递进程及临时浏览器页清理，保留验收编辑页；Next3000/API8001保留。仅本地提交，用户推送。

## 截图

- [Markdown共享底栏](../design/editor-code-math-split.png)
- [HTML公式窗口](../design/html-formula-dialog-desktop.png)
- [320px公式窗口](../design/html-formula-dialog-mobile.png)
- [深色公式窗口](../design/editor-code-formula-dark.png)
- [真实阅读页](../design/reader-code-math.png)
