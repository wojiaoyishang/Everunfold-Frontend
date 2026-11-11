# ADR0112：统一阅读图片查看器与逐页面开关

日期：2026-11-11。状态：已实施。

## 背景

项目已有自研 `ImageViewer`，具备缩放、全屏、缩略图、键盘切换、触屏切换和画廊，但不依赖第三方 Fancybox。文章、说说和评论已通过 `ArticleMedia` 接入；术语特色图、术语正文与托管页面尚未统一。

## 决定

- 不新增 Fancybox 依赖；所有阅读图片使用现有 `ImageViewer`，避免重复维护弹层、焦点和拖拽逻辑。
- 文章、说说、托管页面和术语默认启用图片查看，可通过 `show_image_viewer=false` 逐项关闭。
- 代码注册页面声明 `imageViewer?: { enabled?: boolean; selector?: string }`，缺省启用；可选选择器限定挂载范围。按钮内图片不自动接管，保留页面自身交互。
- 自定义页面 iframe 通过宿主脚本发送只含图片地址、标题、索引和渲染 ID 的消息，父页面复用同一查看器；脚本继续受既有 CSP 哈希约束。
- 本轮不替换已有页面自有图片交互，例如荣誉页证书弹窗。

## 影响

`content-admin-v1`、`pages-v1`、`public-v1`、`presentation-v0.2`、`glossary-v1`和`content-access-v1`发布新版本；术语新增 `0043_glossary_image_viewer` 迁移。旧数据缺省 `true`。
