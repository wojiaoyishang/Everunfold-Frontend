# 阅读图片查看器验收

版本：reader-image-viewer-verification-2；2026-11-11（Asia/Shanghai）。对应 [ADR0112](../decisions/0112-shared-reader-image-viewer.md)。

## 覆盖

- 文章正文点击真实图片打开共享 `ImageViewer`，关闭按钮正常收回。
- 术语特色图启用时打开同一查看器；`show_image_viewer=false` 时图片仍显示但无按钮角色，点击不弹层。
- 术语正文图片与特色图使用同一画廊范围。
- 自定义页面固定脚本包含图片消息、CSP 哈希与 `show_image_viewer` 渲染身份；禁用后脚本不注册点击处理。
- 代码注册页面的 `imageViewer.enabled`、`imageViewer.selector` 会进入发布包，页面侧按选择器扫描。
- 文章、说说、页面和术语编辑器都有逐项开关；旧数据缺省启用。

## 自动化

- `content-admin-v1 1.20.0`、`pages-v1 1.10.0`、`public-v1 0.14.0`、`presentation 0.2.0-preview.5`、`glossary-v1 3.7.0`、`content-access-v1 1.5.0`。
- 新增迁移 `0043_glossary_image_viewer`，开发库已显式应用，Alembic check 通过。
- 前端完整检查369项通过；读者端独立生产验收通过；后端真实数据库完整测试343项通过。
- 实际文章正文点击真实图片打开并关闭共享查看器；术语特色图启用时打开同一查看器，禁用时图片仍显示且无按钮角色、点击不弹层。

## 范围

本轮不替换被点击图片原本所在按钮或链接的业务动作，也不为封面、头像、列表缩略图自动增加查看器。Fancybox 本身未作为依赖引入。
