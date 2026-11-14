搜索索引、订阅与页面元数据
==========================

配置的来源和优先级
------------------

站点 SEO 设置决定站点名称、搜索展示和默认分享图片。文章、说说、页面或词条还可
在适用的编辑表单中填写单项设置。前端从已应用的站点设置和公开投影读取这些值。
页面的索引与分享规则在 ``src/core/seo/`` 统一处理。
编辑表单受配置或插件页面声明约束，提交之前可以用私有预览确认展示。

``PUBLIC_SITE_URL`` 是 canonical、绝对分享地址与订阅地址的来源。
当前站点和内容的索引条件同时满足，页面才符合索引资格；
已发布的多语言路径用于生成 hreflang。修改单项标题或 canonical 后，检查是否与
其他内容的路径发生冲突。

索引与订阅的验证
----------------

.. list-table::
   :header-rows: 1
   :widths: 35 65

   * - 入口
     - 核对项
   * - ``/robots.txt``
     - 读取有效站点设置，并在启用时告知爬虫 Sitemap 地址。
   * - ``/sitemap.xml``
     - XML 列举符合索引条件的 canonical 路径及可用的语言版本。
       浏览入口位于 ``/sitemap.xml/preview``，也可通过 ``?format=html`` 到达。
   * - ``/feed.xml?format=xml``、``/atom.xml?format=xml``
     - 强制读取 RSS 或 Atom XML。订阅可用 ``language`` 查询参数选择已启用语言。
       浏览器还可显示易读的内容列表。
   * - 正文页面 ``<head>``
     - 查看标题、描述、canonical、Open Graph、hreflang 及启用时的结构化数据。

检查时先确保节点已应用新版设置和内容。用公开文章、设为不索引的页面和受限文章
对照实际结果；同时确认 XML 的响应类型和 URL，区分 XML 订阅与供浏览的 HTML。
独立的程序读取者应优先使用 XML 链接。相关规则的定向测试见
``tests/discovery.test.ts`` 和 ``tests/search-discovery.test.ts``。
