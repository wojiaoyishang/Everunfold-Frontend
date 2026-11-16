# 更多组件

`core.more-components` 在页面和文章的组件编辑器中提供五个部件。先启用插件，再通过组件面板添加。

| 组件       | 用法                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 折叠区     | 设置标题和初始状态，将 Markdown、提示框或链接等组件拖入。编辑时展开子组件。                          |
| 提示框     | 提供说明和提醒样式，支持在框内放入正文和按钮。                                                       |
| 人物分组   | 设置分组标题，选择姓名云或卡片，将「姓名与寄语」拖入分组。                                           |
| 姓名与寄语 | 填写名字、寄语，可选头像和副标题。按下姓名打开寄语，Escape 关闭并回到姓名按钮。                      |
| 视频播放器 | 从媒体库选择视频和封面，或填写站内路径和直接视频 URL。字幕可用 WebVTT 地址。读者按下播放键开始播放。 |

旧「一路有你」的折叠说明可以用「折叠区」，友情链接可以用内部的「提示框」搭配现有「按钮」。按班级排列的姓名和寄语可以用多个「人物分组」。旧「关于网站」使用的标题、正文、短代码、进度条和按钮沿用现有组件，视频可用本插件的播放器。

```bash
npm run plugins:build -- --plugin more-components
```

生产环境将 `plugins/more-components` 放进插件目录，前端宿主需要支持视频媒体字段和 `parseSiteMediaReference` SDK 导出。页面通过原有的组件文档保存和发布。

插件管理的封面来自 `assets/preview.webp`。使用内置 imagegen 生成，构建时打包成独立 WebP 资源。

> Create a wide 16:9 flat illustration for the Everunfold “更多组件” plugin cover. Arrange five simple UI tiles in a balanced central composition: a lavender disclosure panel with a chevron, an amber notice, a row of small avatar circles, a mint speech bubble, and a violet video tile with a large play icon. Warm off-white and pale lavender background, rich grape and lilac with small mint and apricot accents, clean two-dimensional geometry, soft rounded corners, crisp silhouettes, generous margins and no text, branding, watermark, gradients or realistic shadows. Make the composition legible at thumbnail size.
