# ADR0119：发现文件的浏览器视图与机器 XML

日期：2026-11-11。状态：已实施。

## 背景

站点地图、RSS 和 Atom 是给搜索引擎与订阅器读取的机器文件。用户直接在浏览器地址栏打开时只能看到连续 XML，难以确认站点包含哪些地址或最近有哪些文章。简单地把这些端点改成 HTML 会破坏爬虫和订阅器，因此需要在不改变原 URL、XML 结构和现有订阅发现链接的前提下提供人读视图。

## 决定

1. `/sitemap.xml`、`/feed.xml`、`/atom.xml` 同时承担浏览器阅读与机器读取，不建立第二套公开地址。
2. 只有普通浏览器页面导航、接受`text/html`且 User-Agent 不属于已知爬虫/订阅器时返回 HTML。已知机器人始终优先获得 XML。
3. `?format=xml`强制返回机器 XML；HTML 页面提供“查看原始 XML”入口。
4. XML 与 HTML 响应都声明`Vary: Accept, Sec-Fetch-Dest, User-Agent`，防止共享缓存混用表示。
5. HTML 页面无客户端脚本、无外部资源，使用响应式静态排版和系统字体；标题、摘要、路径、语言与更新时间全部重新转义。
6. HTML 视图使用`noindex, follow`；正文页面索引规则、权限和公开快照不改。
7. `/sitemap.xml`由 Route Handler 生成标准`urlset`，保留语言 alternates、lastmod、changefreq和priority字段。RSS/Atom 继续复用既有稳定 ID、语言过滤和 XML 转义生成器。
8. 订阅停用或语言无效时，爬虫仍收到404；浏览器收到同样404状态的专业空态说明，不伪装成功。

## 结果

- 用户可以直接阅读站点地图和订阅内容，不需要查看原始 XML。
- 爬虫、RSS/Atom 阅读器、curl 等机器客户端保持标准 Content-Type 和 XML 结构。
- 搜索引擎自动发现链接、robots.txt 中的 sitemap 地址和现有订阅地址都不需要修改。

## 验证

单元测试覆盖 XML 结构、爬虫识别、HTML转义与原始XML入口；实际服务器分别验证浏览器HTML、Googlebot/RSS阅读器XML及站点地图/订阅桌面与手机布局。详见[验收](../handoff/discovery-browser-view-verification.md)。
