# ADR0114：主题自有资产与历史残留清理

日期：2026-11-11。状态：已实施。

## 决定

1. 主题自带的背景、封面、视频、动效素材、贴纸、预览图和来源记录统一放在`src/themes/<主题ID>/assets`。
2. 浏览器运行时使用`/themes/<主题ID>/...`。开发与构建前由`tools/theme-assets.mjs`把主题assets原样派生到Git忽略的`public/themes/<主题ID>`；源文件只维护一份。
3. 全局`public`只保留站点级文件（例如favicon）和内容特性资产，不再承载Argon/Paper主题专属素材。
4. 旧设置可能保存`/reference/campfire-background.*`或`/reference/everunfold-night-camp.webp`；Argon在读取、编辑并再次保存主题设置时映射到新地址，避免已保存站点突然丢失背景。
5. 无任何静态入口、可信动态注册或测试引用的`admin/components/collection-toolbar.tsx`、`admin/components/preparation-state.tsx`及其专属样式删除。

## 原因

主题文件夹应是主题展示与素材的唯一所有权边界。把主题视频、贴纸和预览图放在全局`public/reference`会让主题移除、复制和打包不完整，也容易留下无人引用的历史文件。生成运行时目录只负责静态分发，不作为第二份源文件。

## 后果

- 新增或更新主题资产后需运行`npm run themes:assets`；`predev`与`prebuild`已自动执行。
- 部署产物仍包含`public/themes`下的派生文件，但不进入Git。
- 主题不能通过引用未声明、越界或符号链接路径读取其他目录；当前只复制规则目录内的普通文件。
