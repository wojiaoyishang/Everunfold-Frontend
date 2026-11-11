# 站点地图与订阅浏览器视图验收

版本：discovery-browser-view-verification-1。日期：2026-11-11。对应[ADR0119](../decisions/0119-discovery-documents-for-browsers-and-crawlers.md)。

## 交付范围

- `/sitemap.xml`、`/feed.xml`、`/atom.xml` 保留原地址：普通浏览器直接打开时显示无脚本响应式说明页，机器客户端继续读取 XML。
- 已知爬虫、RSS/Atom 阅读器、非 HTML 请求优先获得 XML；`?format=xml` 可强制读取原始机器文件。
- 站点地图 HTML 显示公开地址、更新时间和语言数量；RSS/Atom HTML显示最近内容、日期、摘要与分类。
- 通知平台菜单改用独立`notification-platform`图标，映射为发送图标，不再与插件管理重复。

## 自动检查

- `npm run check` 373项通过；覆盖站点地图 XML、语言 alternates、浏览器/爬虫识别、HTML转义、原始 XML 入口和通知平台图标唯一性。
- `npm run verify:admin`生产构建、全部后台路由隔离及公开运行矩阵通过，构建路由明确包含`ƒ /sitemap.xml`。
- 实际HTTP验证：浏览器请求站点地图得到`text/html`，Googlebot请求得到`application/xml`；浏览器请求 RSS 得到`text/html`，RSS 阅读器请求得到`application/rss+xml`。
- 浏览器说明页响应包含`Vary: Accept, Sec-Fetch-Dest, User-Agent`、`X-Robots-Tag: noindex, follow`与限制性CSP。

## 实页验收

- Chromium直接访问`/sitemap.xml`与`/feed.xml`均显示完整说明页；`/atom.xml`显示Atom说明页。
- 1440px站点地图、RSS以及390px RSS均无横向溢出或`pageerror`。桌面采用标题、摘要和地址列表的规整层级，手机自动变为单列。
- 真实后台检查通知平台菜单图标为独立发送图标，和插件管理图标路径不同。

## 证据

- [站点地图浏览器视图](../design/sitemap-browser-view.png)
- [RSS浏览器视图](../design/rss-browser-view.png)
- [手机RSS浏览器视图](../design/rss-browser-mobile.png)

## 边界

- HTML视图不执行脚本，也不提供站内搜索或管理操作。
- `robots.txt`继续使用标准纯文本，不在本轮改成HTML视图。
- 搜索引擎是否抓取和展示页面仍由其自身策略决定。
