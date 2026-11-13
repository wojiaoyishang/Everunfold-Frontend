# 主题私有设置开发

版本：theme-settings-runtime-1，2026-11-10。实现决定见 [ADR0100](../decisions/0100-theme-owned-settings-profiles.md)。

## 目录归属

```text
src/core/settings/
  theme-settings-host.tsx   # 公共宿主：主题切换 + 动态加载面板
  theme-options.ts          # 活动主题、默认值和 theme_options 读写
src/themes/argon/
  theme-settings.tsx        # Argon 自己的表单
src/themes/paper/
  theme-settings.tsx        # Paper 自己的表单
```

站点名称、简介、作者格言、页脚、菜单、SEO、术语提示等站点级配置继续在站点设置中。主题的强调色、显示模式、横幅、字体、首页默认值、文章显示、代码样式、背景和主题专属色板属于对应主题目录。

## 站点与文章显示

「站点设置」管理浏览器站点图标、首页与文章列表页、时区、日期格式、订阅及新文章默认值。静态首页和文章列表页只能选择已公开的自定义页面。选中的文章列表页使用该页面的地址与标题，原有 `/article` 仍可访问。新文章保存时确定地址、分类和评论开关，调整默认值不会批量修改现有文章。

Argon 在「外观 → 主题设置 → 顶栏标识」配置前台顶栏左侧的首页链接。可选仅文字、仅图片或图片和文字。文字留空时先取横幅标题，再取站点名称。顶栏 Logo 可从媒体库上传或选择，也可填写图片地址。实时预览读取草稿，保存后由节点同步到前台。站点图标用于浏览器标签页，博主头像在「侧栏博主卡片」中设置。

「文章阅读」设置整站默认显示。「内容设置 → 文章显示覆盖」可逐篇指定布局、署名、分享图及目录、分享、推荐和文末内容的显示行为。

## 添加主题设置

在新增主题目录中创建 `theme-settings.tsx`，默认导出一个 React 组件：

```tsx
"use client";

import { useSettingsEditor } from "@/core/settings/editor";
import {
  activeThemeId,
  themeProfile,
  updateThemeProfile,
} from "@/core/settings/theme-options";
import { SettingsSection } from "../argon/admin/settings/shared";

export default function ThemeSettings() {
  const { draft, setDraft } = useSettingsEditor();
  const id = activeThemeId(draft);
  const theme = themeProfile(draft, id);
  if (!draft || !theme) return null;
  return (
    <SettingsSection id="settings-my-theme" title="我的主题" description="仅属于这个主题。">
      {/* 使用主题 shared Controls；通过 updateThemeProfile(draft, id, patch) 更新。 */}
    </SettingsSection>
  );
}
```

不要在该文件中直接向服务端 PATCH；宿主负责统一保存、修订冲突和可靠投递。媒体字段使用现有 `SettingsMediaField` 或主题控件，不要在客户端拼造媒体 URL。

## profile 与兼容投影

`PublicSettings.theme_options[themeId]` 是各主题的独立配置。`PublicSettings.theme` 是活动主题的兼容投影，不能作为“所有主题共用一个值”的新写入源。读取时使用 `themeProfile(settings)`；写入时使用 `updateThemeProfile(settings, themeId, patch)`。

切换主题只修改 `extensions.theme`，不复制或覆盖其他主题 profile。子主题首次进入时未保存的字段沿用默认值，首次保存后才拥有自己的完整 profile。没有面板的新主题显示不可用提示，不回退到另一个主题的隐藏字段。

## 验收

- `npm run check`：profile、默认值、激活隔离和完整前端测试。
- `npm run verify:admin`：隔离生产构建和后台入口。
- 实际后台切换到 Paper 时只看到 Paper 的纸张底色；切回 Argon 时 Argon 的颜色、字体和阅读设置保持不变。
- 主题设置保存仍使用同一 revision、冲突输入保留、媒体引用校验和节点投递；不要新增第二套配置 API。
