# 页面代码注入与菜单样式

在「插件管理」启用 **页面代码注入**，然后从「外观 → 页面代码注入」打开设置。只有站点管理员可以保存。添加的规则默认不启用，填好条件及源码后单独开启并保存。

- 页面范围可选所有站点页面、前台、后台、账号中心或有顶部菜单的前台页。页面类型可细分首页、文章、说说、独立页面、归档和列表、搜索结果、术语等。登录、编辑预览、节点控制台、插件管理及注入规则编辑页不执行。
- URL 只填写站内路径，例如 `/about`、`/tag/*` 或 `/docs/**`。`*` 不跨斜杠，`**` 可以跨多层。忽略查询和锚点；网址中的语言前缀属于路径。已填写的条件同时生效。
- HTML、CSS、JavaScript 共用一条规则，使用三个源码编辑页签。HTML 使用常用元素与属性，脚本及事件处理属性会被移除；样式和脚本分别写入对应页签。浏览器的内容安全策略仍生效。
- JavaScript 支持 `context.pathname`、`context.root` 和 `context.onCleanup(fn)`。在软导航离开页面时，宿主移除规则插入的 HTML、样式和脚本元素；作者应释放自行安装的监听、计时器和 DOM 改动。例如：

  ```javascript
  const item = document.querySelector('[data-menu-position="header"].nav-diary');
  item?.classList.add('menu-highlight');
  context.onCleanup(() => item?.classList.remove('menu-highlight'));
  ```

最多保存 32 条规则。每个源码字段上限 16000 字符，合计上限 64 KB，同时受整份公开设置投递体积限制。公开规则的源码对访客可见，不应写入凭据。只适用于后台或账号中心的规则使用各自的会话接口读取，也不应在浏览器源码中保存密钥。

## 菜单项

在「菜单设置」选中条目，填写空格分隔的「额外 CSS 类名」，例如 `nav-diary featured`。每项同时提供固定的 `data-menu-item-id`。顶部和侧栏可用 `data-menu-position="header"` 或 `"sidebar"` 区分，侧栏桌面和移动版复用同一菜单 ID。

「菜单项 CSS」使用源码编辑器；`:scope` 指菜单自身的行，`:scope a` 指该行内的链接。支持 `@media` 和 `@supports`，不支持外部资源函数。作用域不会扩展到兄弟菜单项。部署先更新后端，再构建前端和独立插件；所有节点更新后再开启规则。
