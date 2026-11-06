# 大目录语言入口与顶栏验收

日期：2026-11-06（Asia/Shanghai）。前端代码abeb062；规则见[ADR0067](../decisions/0067-large-language-pickers-and-header-order.md)，当前指南为multilingual-runtime-3。后端业务、依赖、契约、迁移和实际站点设置未变。

## 完成与检查

- 前台语言按钮去掉国旗角标；按用户明确答复，将顶栏改为连接状态、语言、搜索的DOM/键盘顺序。现有双语文章实页700px确认图标无旗帜，语言菜单仍有标志，正文两项可见。
- 正文3种语言平铺；4种及50种只显示当前项和更多入口。搜索保留全部真实版本，原生名/英文名/代码/重音无关检索、空结果、Escape退场及焦点恢复通过；Tab/Enter实际导航到日语成员，当前标记与html.lang随之更新。
- 专用临时副本包含3/4/50语言文章及50语言说说，1050/320px、超长自定义名称、浅深色和减少动态通过。50语言手机收起后仍单行；展开弹层宽296px，左右各12px，完整落在820px高的视口内。搜索栏固定、结果区独立滚动，关闭后隐藏字段不可见。
- 无JavaScript浏览器确认50个可访问的版本链接，原生跳转到日语URL并得到ja页面身份及当前标记。首轮自动化等待完整load事件超时，随后核对实际URL/DOM与服务端200，未据此改写业务逻辑。
- 最终npm run check：250项通过，包含新增语言检索边界；ESLint、完整Next类型生成/TypeScript、Prettier和错误页产物检查通过。没有新增依赖；未重复后端192项、多进程P0或生产构建。本轮为前端展示/搜索调整，不将历史结果当本轮执行。
- 现有容器启动脚本--check六进程、四个0.0.0.0端口及HTTP就绪通过。实际文章/正文/语言设置/WordPress未保存或导入，模拟数据不写开发库或现有缓存；只提交代码/规范/自建截图，未push。

实现过程中，模拟数据的额外成员字段及缺失设置必填项被现有契约拒绝，已修正生成器，没有放宽验证。临时Next开发副本最初未放行自己的开发资源来源，按已有allowedDevOrigins环境配置解决；未改真实实例访问策略。搜索字段使用独立程序键，避免与既有“搜索语言”筛选文案重复；弹层只在popover-open时使用flex布局，保留原生隐藏/退出语义。早期截图在水合完成前临时隐藏输入光标，触发caret-color样式属性警告；最终改用全新浏览器上下文，等到控件就绪后再截图，无水合/运行时警告，页面错误0。

## 截图

均为独立合成内容，不含实际设备地址、浏览器地址栏或凭据。

- [50语言收起](../design/language-overflow-desktop.png)、[桌面展开](../design/language-overflow-open.png)。
- [320px收起](../design/language-overflow-320.png)、[320px展开](../design/language-overflow-320-open.png)。

## 复现模拟

先创建系统临时目录下以everunfold-build-开头的副本，只复制src、node_modules、public、package.json、package-lock.json、tsconfig.json、next.config.ts，不复制真实config.toml、var或.next。在原仓库运行：

```bash
node --import tsx tools/fixtures/many-language-snapshot.mts /tmp/everunfold-build-example
```

生成器建立独立完整快照和language-preview.toml；然后在临时副本运行：

```bash
CONFIG_FILE=./language-preview.toml \
EVERUNFOLD_PROJECT_ROOT="$PWD" \
EVERUNFOLD_DEV_ALLOWED_HOSTS=127.0.0.1,localhost \
node node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port 3220
```

副本路径/article-3/en.html、/article-4/en.html、/article-50/en.html、/article-50/eo.html及/shuoshuo-50/en.html分别用于阈值、长名称和类型验证。后台地址刻意不可用，只验证本地公开快照；它不是生产部署或真实译文。验收后停止自己的临时进程并只清理该副本。实际服务不需要添加50种语言。

## 边界

50是本轮样例规模，不是功能上限或大规模性能承诺。没有执行数千成员/长时间压力、真实移动设备全矩阵、完整读屏与RTL矩阵；搜索和收纳不改变已有8MiB公开快照及设置传输容量约束，也不自动翻译内容。语言未安装程序包时仍沿配置回退界面。
