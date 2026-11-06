# 语言国旗字体验收

日期：2026-11-06（Asia/Shanghai）。规则见[ADR0068](../decisions/0068-local-language-flag-font.md)，指南multilingual-runtime-4。仅前端字体、资源和检查发生变化，后端业务、契约、依赖和数据库未变。

## 已检查

- 固定上游TTF校验SHA256，使用FontTools 4.68.0/Brotli裁剪并重命名；重复构建输出相同，最终WOFF2为86764字节，SHA256为`065679c4a1a9427cb9b5db91f1932fbba2803b3eb0e846c643666a7edb0f71d9`。许可证、Twemoji来源/修改署名和source.json随资源提交，普通Node构建无需Python。
- HarfBuzz对目录270种完整序列逐一组合：每项恰好一个具有COLRv0彩色层的可见字形，没有缺字。Chromium CDP再逐个检查旗帜弹窗270项，最终全部来自Everunfold Flags、isCustomFont=true、glyphCount=1，涵盖CN/GB/CQ/EU/UN/XK、英格兰/苏格兰/威尔士及通用旗帜。
- 初版国家/地区旗帜正常，但Chromium把彩虹/跨性别/海盗旗拆成两个字形；补齐省略VS16的等价GSUB规则后全量通过，完整原序列规则保留。不能将仅HarfBuzz通过当成实页全量通过。
- 登录页语言菜单、正文语言标签、后台设置行/默认Select、旗帜弹窗、备选语言弹窗、自定义输入/预览均核对统一字体。自定义中国旗帜仍用本地字体，自定义⭐退回系统Noto Color Emoji，不覆盖语言名称、正文、编辑器或用户字体。
- 新上下文登录页在语言菜单关闭时没有旗帜字体请求；展开后只请求同源WOFF2并返回200，无CDN或preload。模拟字体请求失败，语言名称与登录表单仍可见、可操作，320px无横向溢出。缓存复用沿浏览器资源机制，不引入全站字体扫描。
- 登录菜单1280/320px、设置弹窗1440/320px和正文桌面/320px通过，弹窗滚动及关闭退场后焦点回旗帜按钮。正文系统深色/减少动态检查通过；纯SVG语言按钮无国旗角标。未向服务器保存标志、语言目录、文章或译文。
- 回归登录入场修复：连续三轮打开/关闭语言菜单、输入框聚焦和点击标题，entry-assemble无重播；真实语言切换仅文案160ms淡入，表单节点和临时占位输入保持。占位值随后清空，后台验证另用忽略文件中的凭据，不保存凭据或Cookie。

内置浏览器连接提示需要重新认证，改用用户已授权的容器独立Chromium。登录检查使用当前实例配置的精确来源；直接从其他来源访问造成的认证请求失败没有通过放宽Origin策略规避。页面错误0，未改实际访问配置或暴露设备地址。

## 检查命令与范围

- `npm run check`：错误页产物、ESLint、Next类型生成/TypeScript、Prettier、251项测试通过；新增资源完整性检查防止旗帜目录与字体输入/输出哈希脱节。
- `npm run verify:admin`：隔离生产构建、21私有入口、匿名SSR隔离、公开离线读取/撤回、设置故障和本地资源200检查通过；资源清单增加新旗帜WOFF2。运行副本独立清理，不覆盖开发.next。
- 构建脚本Ruff/格式检查通过；真实字形组合由本地libharfbuzz和浏览器双重验证。源字体版本变更必须主动复核，脚本拒绝非固定SHA输入。
- 工作区启动脚本`--check`通过：六进程、四个0.0.0.0端口及HTTP就绪。未重复后端192项/数据库协同P0，未执行Windows/macOS/iOS/Firefox完整实机矩阵，不把容器Chromium冒称全部浏览器已验收。

## 自建截图

仅截语言控件，不含设备地址、账号、正文或凭据。

- [桌面全部旗帜选择器](../design/language-flag-font-desktop.png)。
- [320px旗帜选择器](../design/language-flag-font-320.png)。

源码入口：前端`styles/language-flags.css`、语言标签/Select及设置CSS、`tools/build-language-flag-font.py`、`public/content-features/language-flags-1/`。当前浏览器支持WOFF2/COLR时使用项目字形，下载失败或格式不支持时继续系统回退；没有改变正文语言身份与翻译关系。两仓库同步规范和哈希，各自STATUS维护，仅本地提交，由用户推送。
