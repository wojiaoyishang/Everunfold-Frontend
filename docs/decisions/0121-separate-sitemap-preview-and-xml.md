# ADR0121：站点地图阅读页与 XML 使用独立入口

日期：2026-11-12。状态：已实施。仅替代 [ADR0119](0119-discovery-documents-for-browsers-and-crawlers.md) 中站点地图的响应协商。

此前同一站点地图地址按请求头选择 HTML 或 XML。用户要求同时保留前台可视化和爬虫兼容，现有 XML 地址继续作为机器入口，避免抓取器或代理使用浏览器请求头时得到 HTML。

- `/sitemap.xml` 固定提供 UTF-8 XML，`robots.txt` 公布此地址。旧的 `?format=xml` 继续读取原文件。
- `/sitemap.xml/preview` 保留无脚本阅读样式，标记 `noindex, follow`，并链接到 XML。旧的 `?format=html` 跳转到阅读页。阅读页位于已保留的系统路径下。
- 站点页脚与后台「站点地图与订阅」提供阅读入口。仍使用现有生成开关、全站收录策略和部署配置中的公开域名。
- 两个入口从同一份公开快照使用同一组地址过滤规则。阅读页显示最多 100 条并标明截取，XML 仍输出完整列表。站点地图停用或缺少公开站点地址时返回 404，公开快照临时不可用时返回 503。
- RSS 与 Atom 继续按 [ADR0119](0119-discovery-documents-for-browsers-and-crawlers.md) 提供浏览器视图和机器文件。

开发环境验收通过：不同请求头返回相同 XML，XML 解析、HEAD、robots 声明、旧链接跳转、页脚键盘导航与 390 像素阅读页均已验证。
