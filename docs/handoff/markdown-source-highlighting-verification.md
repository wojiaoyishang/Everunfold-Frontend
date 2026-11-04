# Markdown 源码高亮验收

日期：2026-11-04。范围：ADR0055，后台源码编辑的语法配色与Markdown代码围栏按需高亮。

## 实现与边界

原CodeEditor已经安装CodeMirror解析/高亮，但标题、粗体、斜体大多没有颜色差异，Markdown的monospace/url/列表/引用等标签没有完整配色，代码围栏也没有配置语言解析。

本轮新增共享 `components/ui/source-highlight.ts` 与后台浅深语法变量，复用既有CodeEditor。`core/editor/code-language.ts` 抽取原窗口的语言加载、规范名/别名与共享Promise，并提供围栏LanguageDescription；`markdown-language.ts` 只用于源码编辑。原可视化映射解析器、发布渲染、业务源文、协同/保存用例不变。清单含纯文本共18项，未知语言或加载失败保留普通文本，没有新增依赖。

## 实际检查

- 内置浏览器原宿主机地址不可达，沿用用户此前允许的127.0.0.1联调，新开本地自建测试文章 `cdf7eadc-dee0-4ac6-8fc6-8ec535635ec1` 并用既有admin账号登录。原远程标签未改，HTTP/服务0.0.0.0配置未动。
- 源码实页确认标题为蓝色、粗体为紫色、斜体为棕金色、行内代码为绿色并有淡背景，引用/列表为青色，删除线弱化、HTML标签有色。读取实际DOM得到7种标记前景色；普通段落仍用正文色。
- 带JSON片段选项的Python围栏实际显示紫色from/import/class/return、绿色字符串/布尔值及弱化注释，源码与参数保留。深色模式关键字实际rgb(210,165,238)、字符串rgb(139,206,177)，没有沿用浅色深墨色。
- 对后台画布色静态计算7类前景变量的对比度：浅色最低4.86:1、深色最低7.19:1；这只证明该变量组合，不代替读屏或所有叠加背景的无障碍验收。
- 390px/320px实页无整页横向溢出，320px的clientWidth/scrollWidth同为308px；行号、换行与工具栏仍可用。截图见[浅色源码](../design/markdown-source-highlight-light.jpg)、[深色围栏](../design/markdown-source-highlight-dark.jpg)、[窄屏](../design/markdown-source-highlight-mobile.jpg)。
- 完成第一块源码→可视化→分屏→源码切换，没有保存；源码中Shift+右方向键后底栏显示行1列2/已选1字符，焦点仍在正文块1。随后清除选区。测试中第四块HTML临时进入源码后也已回到原可视化模式。
- 保存草稿始终禁用，第一块仍891字符，未输入、保存、发布或撤回文章。最终恢复跟随系统颜色、原轻量动效与视口override，保留本地已登录的源码页。
- 新增4项测试覆盖GFM标签/源文保持、带参数的JavaScript语法选择、别名/未知围栏/共享加载，以及清单中全部17种非纯文本语法真实加载。首次将Node的CJS Markdown树与动态导入的ESM Lezer树混合高亮时遇到双实例错误；测试改为分别验证源码标记与实际加载的语言解析器，嵌套围栏由上述真实浏览器检查验证，不把该Node问题作为浏览器缺陷。
- 最终 `npm run check`：错误页产物一致、ESLint、严格类型、Prettier和211项测试通过；`npm run verify:admin`：隔离生产构建、18条私有入口与匿名SSR/private/no-store/noindex、正文资源按需、离线阅读/撤回及设置损坏检查通过。没有覆盖运行中.next，日志位于忽略目录var/source-highlight-*.log。

## 未执行与交接

本轮没有改后端、契约、依赖锁、数据结构、协同持久管线或WordPress备份，没有重跑数据库/双API/Worker/Scheduler故障P0。未执行跨浏览器/实机读屏、语言模块下载故障注入或单独减少动态矩阵；不新增动画，沿用已有编辑反馈。不提供超出现有语言清单的任意语法，也未新增Markdown中LaTeX的嵌套着色。

ADR/验收/索引/三张自建截图与哈希双仓库同步，仅本地Git提交，由用户推送。
