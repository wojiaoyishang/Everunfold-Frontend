# 代码高亮与公式

版本：content-features-1，2026-11-04。见 [ADR0049](../decisions/0049-shared-code-and-formula-features.md)。

## 编辑入口

Markdown/HTML 的源码、可视化工具栏均有代码块图标和公式Σ图标（项目SVG）。窗口共用：代码选择语言、输入并预览；公式输入LaTeX、选择行内/独立、预览后插入。公式错误保留输入并禁用插入。取消/Escape不改草稿。

HTML可视化点击公式，或将光标放到代码内，再点击对应按钮可修改。源码可选中内容后插入，也可直接手写。单纯切换不重排原文，仍整篇保存/发布。Markdown示例：

~~~~markdown
行内 $a^2+b^2=c^2$。

$$
\frac{-b\pm\sqrt{b^2-4ac}}{2a}
$$

```python
def square(x):
    return x * x
```
~~~~

独立公式使用单独的块，也支持一行独立块 $$x^2$$。未配对定界符、转义美元、行内/围栏代码保留文字含义；普通价格不应触发公式。新建行内公式的实际换行合并为空格。HTML示例：

```html
<p>行内 <span data-math="inline" data-latex="x^2">x^2</span></p>
<div data-math="block" data-latex="E=mc^2">E=mc^2</div>
<pre><code class="language-python">print(42)</code></pre>
```

手写代码需要转义尖括号，公式属性需要转义引号；面板自动处理。不要把KaTeX排版结果复制为正式源文。

## 开发与资源

- 核心在core/rendering/features；界面复用ContentMarkup/ContentResources及ui/content-feature-dialog。公开服务端用renderContentForReader，客户端安全预览用renderContent+ContentMarkup。受限正文仅在访问检查成功后显示。
- 支持JavaScript/TypeScript、Python、HTML/XML、CSS、JSON、Shell、SQL、C/C++、C#、Java、Go、Rust、PHP、YAML、Markdown、Diff；未知语言为纯文本。插件增加语言须注册可信语法/别名，仍按需加载。
- 禁止在根布局、全局CSS或主题初始化导入KaTeX/全语言高亮包、批量预取字体。由当前渲染正文决定CSS/字体/客户端引擎，资源失败不阻断其他正文。
- public/content-features为本地版本化系统资产。npm run features:assets从锁定KaTeX生成样式、WOFF2和许可证，predev/prebuild执行；隔离构建复制这些资产。升级须同步包版本、资源地址、锁文件及验证，不手改供应商压缩CSS。
- 字体swap、无整库preload；上传字体仍从后端媒体稳定ID解析，遵守原字体按需规则。

限制：LaTeX8000字符、maxExpand1000、maxSize20、trust=false、每次独立宏；100000字符以上代码不高亮。复杂自定义HTML可使用安全只读预览和源码入口；跨视图统一撤销仍属原有未交付范围。

运行npm run check及npm run verify:admin。后者在隔离生产副本检查普通文章无资源、混合正文SSR高亮/MathML、样式/字体200、离线和撤回。浏览器检查资源清单、面板、保存、窄屏、深色、焦点；实际结果和限制见[验收](../handoff/content-features-verification.md)。
