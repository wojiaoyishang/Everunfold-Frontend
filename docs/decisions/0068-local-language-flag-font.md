# ADR 0068：语言标志使用本地彩色旗帜字体

日期：2026-11-06（Asia/Shanghai）。状态：已实施；补充ADR0066/0067。

用户反馈部分浏览器将国旗显示成CN等字母，要求统一字体。OS自带emoji字体不保证支持国家/地区组合，因此仅调整系统字体栈无法解决。

## 决定

- 随前端提供旗帜专用的Everunfold Flags字体，基于poppingmoon/twemoji-colr固定发布版0.7.0+2026.09.09裁剪，保留Unicode目录中270种旗帜的组合规则及COLRv0/CPAL彩色层。选用已有彩色轮廓格式，不要求运行时JS检测、安装系统字体或第三方CDN。
- 前后台语言菜单、正文译文标签、封装Select、设置行、旗帜/备选语言弹窗及自定义标志输入统一通过CSS变量优先使用它。font-face仅覆盖旗帜所需码位，不覆盖正文和编辑器，也不改变自定义非旗帜emoji/文字的系统回退。
- 资源位于public/content-features/language-flags-1，WOFF2为86764字节。只声明font-face，不preload；实际出现使用该字体的可见旗帜时才下载，font-display为swap，失败仍可操作、阅读和切换语言。顶栏语言按钮保持纯SVG图标。
- 为彩虹/跨性别/海盗旗增加省略VS16的等价组合规则，仍映射原有彩色字形，同时保留完整序列规则。首次检查发现Chromium会拆开这三种序列，不能仅凭HarfBuzz检查或国家旗帜正常就认为全部通过。
- 记录上游/Unicode目录/输出SHA256，保留原许可证及Twemoji署名和修改说明。构建脚本校验固定源文件，重建属于可选开发工具，正常Node构建不新增Python或npm依赖。扩充旗帜目录必须重建并检查组合覆盖。

## 依据与验证

[Mozilla字体项目](https://github.com/mozilla/twemoji-colr)说明COLR/CPAL来源；[选定发布版](https://github.com/poppingmoon/twemoji-colr/releases/tag/v0.7.0%2B2026.09.09)和[其许可证](https://github.com/poppingmoon/twemoji-colr/blob/v0.7.0%2B2026.09.09/LICENSE.md)提供固定输入及许可。实际文件检查COLR版本为0；[WebKit官方说明](https://webkit.org/blog/12662/customizing-color-fonts-on-the-web/)涵盖该彩色字体格式。浏览器差异问题可参照[TalkJS的国旗字体方案](https://github.com/talkjs/country-flag-emoji-polyfill)，本项目未引入其JS或旧字体。

实际资源、字形组合、按需加载及桌面/窄屏检查见[验收记录](../handoff/language-flag-font-verification.md)。后端业务/契约/迁移不变。浏览器不支持WOFF2或COLR时保留系统回退；未把容器Chromium检查视为Windows/macOS/iOS全矩阵验收。
