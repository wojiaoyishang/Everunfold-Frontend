# 插件特色图

使用内置 ImageGen 分别生成 12 张简洁的扁平插画。各插件目录中的 WebP 为交付文件，尺寸 960 × 540。

| 插件 | ID | 文件 |
| --- | --- | --- |
| 书籍页面 | `core.book` | `Everunfold-Frontend/src/plugins/book/assets/preview.webp` |
| 第三方验证码 | `core.captcha` | `Everunfold-Frontend/src/plugins/captcha/assets/preview.webp` |
| 图片画廊 | `core.gallery` | `Everunfold-Frontend/src/plugins/gallery/assets/preview.webp` |
| 荣誉与证书 | `core.honors` | `Everunfold-Frontend/src/plugins/honors/assets/preview.webp` |
| 人物与寄语 | `core.people` | `Everunfold-Frontend/src/plugins/people/assets/preview.webp` |
| 基础短代码 | `core.basic-shortcodes` | `Everunfold-Backend/app/plugins/basic_shortcodes/assets/preview.webp` |
| Google 验证码 | `core.captcha-google` | `Everunfold-Backend/app/plugins/captcha_google/assets/preview.webp` |
| Cloudflare 验证码 | `core.captcha-turnstile` | `Everunfold-Backend/app/plugins/captcha_turnstile/assets/preview.webp` |
| 术语表与悬浮提示 | `everunfold.glossary` | `Everunfold-Backend/app/plugins/glossary/assets/preview.webp` |
| 示例卡片 | `example.cards` | `Everunfold-Backend/app/plugins/example_cards/assets/preview.webp` |
| HTTP 路由示例 | `example.routes` | `Everunfold-Backend/app/plugins/route_example/assets/preview.webp` |
| 常驻任务示例 | `example.runtime` | `Everunfold-Backend/app/plugins/runtime_example/assets/preview.webp` |

## 生成提示词

每张图的完整提示词由共同段落与对应主题拼接。

> Use case: stylized-concept. Asset type: a single horizontal 16:9 feature cover for an installed plugin in Everunfold, shown at 120×68 and in a larger details panel. Contemporary FLAT vector-like editorial pictogram. Crisp 2D geometric silhouettes, opaque solid-color fills, no texture, no gradients, no shadow, no 3D, no material effects, no text, no glyphs, no numbers, no logos. One bold, unmistakable motif and at most two supporting geometric shapes. All focal elements must stay within the central 58% of the full canvas width and central 60% of its height. Large intentional negative space. Uniform solid edge-to-edge background. Tight palette: background plus up to three foreground colors. Calm, graphic, simple and friendly, with clean alignment and slightly rounded corners where appropriate. Avoid rings, sparkles or any extra decoration unless explicitly called for. Layout and palette:

- `core.book` One open book viewed straight from above in silhouette, two broad ivory pages and one short mint ribbon bookmark dropping from the center seam. Use a muted deep forest green full background, ivory pages and sage green bookmark. A couple of very short straight rules on one page if necessary. Strong symmetry.
- `core.captcha` A compact lavender square with a clear white checkmark, next to a simple geometric white puzzle-piece silhouette. Flat deep indigo background. The square and puzzle piece align horizontally and read as one verification motif. Keep large clean shapes.
- `core.gallery` Two overlapping landscape photo tiles at a small offset. The front tile contains a single round sun and two abstract cutout mountain triangles. Full pale lilac background, plum outlines and fills, warm apricot sun. No text or extra photos.
- `core.honors` A single large gold award medal with an unmistakable short V-shaped ribbon and a simple inset circle. Full soft rose-clay background, flat ochre gold, muted ivory and deep wine-red ribbon. Centered symmetry. No inscription, no star field.
- `core.people` Three connected friendly person silhouettes built only from separate circular heads and rounded shoulder shapes, organized as one centered group. Full pale warm-peach background with burnt coral, plum and ivory foreground. Use different heights, generous clear spacing, no facial details.
- `core.basic-shortcodes` A single compact pale cream callout card with two broad horizontal rules and one round accent dot on its left. A pair of deep terracotta angle brackets, one on either side of the card, clearly frames this as a content insert. Full dark warm plum background. No numbers, no additional punctuation or copy.
- `core.captcha-google` A simple pale ivory browser widget card with a dark-blue square checkbox and one large green checkmark, plus at most two small muted blue placeholder bars. Full soft blue background, deep navy and teal details. Generic verification metaphor without brands or logo colors.
- `core.captcha-turnstile` One stylized deep purple security gate with two simple pillars and a flat orange swing arm, with an abstract white cloud silhouette centered over the gate. Full warm light-apricot background. Use big simple geometry and clearly distinguish the gate from a web form. No logos.
- `everunfold.glossary` A white square dictionary card with three short slate-blue abstract ruled lines and a prominent leaf-green definition speech bubble partly overlapping one corner. Full deep teal background, clean ivory and lime forms. No letters or actual words.
- `example.cards` Two overlapping rounded cards, one white with a single lilac circle, one saturated lilac with a single pale peach rounded square. Full cool pale periwinkle background. Only simple sample UI blocks with no lines or text.
- `example.routes` A graphic route diagram, with one starting dot on the left and two destination dots stacked on the right, linked by a single thick angular branching path. Warm pale lemon full background, cobalt blue path and cyan endpoint dots, all rounded and boldly visible at small scale. No mapping details or labels.
- `example.runtime` One large simple navy clock face with a light dial and two thick hands, partly framed by one bold mint circular motion arrow. Full muted lavender-blue background. No digits or tick marks. Clean isolated shapes.
