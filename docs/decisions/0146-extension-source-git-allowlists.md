# ADR 0146 · 插件和主题源码的 Git 白名单

日期 2026-11-14。沿用 [ADR 0079](0079-runtime-plugin-packages-and-var-cache.md) 和 [ADR 0087](0087-single-entry-backend-plugins.md) 的开发与部署目录。

两个仓库各自用根 `.gitignore` 管理扩展源码。前端的 `src/plugins/` 与 `src/themes/`、后端的 `app/plugins/` 默认忽略新成员，并为现有内置扩展和需要的包根文件保留例外。以后新增项目内置扩展时，在对应仓库显式更新白名单。

自定义插件和主题放在各自源码根下的独立目录。修改内置扩展目录里的文件仍会按普通 Git 规则跟踪。扩展发现与构建继续读取磁盘上的有效源码。前端的 `plugins/` 安装包和 `public/themes/` 派生资源继续忽略。
