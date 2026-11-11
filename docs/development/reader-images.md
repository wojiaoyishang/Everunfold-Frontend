# 阅读图片查看器

版本：reader-images-1，2026-11-11。决定见 [ADR0112](../decisions/0112-shared-reader-image-viewer.md)。

## 行为

项目使用自研 `ImageViewer`，功能与常见的 Fancybox 灯箱等价，当前不加载第三方 Fancybox 包。文章、说说、评论、术语和托管页面共用同一查看器。

- 点击图片打开；支持键盘 Enter/Space、左右切换、Escape 关闭。
- 支持 100%–400% 缩放、鼠标拖动、触屏横滑、全屏和缩略图画廊。
- 图片失败仍显示原页内重试，不把失败误报为查看器成功。
- 按钮内图片不会被通用查看器劫持，保留页面自己的弹窗或操作。

## 设置

文章、说说和自定义页面在编辑器媒体/页面设置中提供“正文图片点击查看”。术语在基本信息的特色图片下提供开关。缺省和旧数据均为启用。

代码注册页面在 `CustomPageDefinition` 中声明：

```ts
export default {
  registration: {
    id: "example.gallery",
    version: "1.0.0",
    title: "画廊",
    path: "/gallery",
  },
  component: "example.gallery.page",
  imageViewer: { enabled: true, selector: ".gallery" },
} satisfies CustomPageDefinition;
```

`selector` 只在当前页面正文内生效；`enabled:false` 关闭通用查看器。未声明的页面默认启用。

## 托管页面

代码注册页面在宿主 DOM 中扫描正文图片。自定义页面 iframe 的固定脚本按需捕获点击，通过受限消息发送图片清单与 `renderId`；父页面校验来源和渲染 ID 后打开共享查看器。宿主脚本不具备网络、表单或页面导航权限。
