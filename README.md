![Everunfold · 星夜中展开的书页](docs/assets/everunfold-banner.webp)

# Everunfold Frontend

Everunfold 是一个可自行部署的博客与轻量 CMS。这个仓库负责公开阅读、编辑后台、主题和前端插件，使用 Next.js App Router、React 和 TypeScript。内容发布后，前端节点从本地已应用的公开快照渲染读者页面，后台编辑与账号操作通过配套 API 处理。

[配套后端仓库](https://github.com/wojiaoyishang/Everunfold-Backend) · [前端开发手册](https://wojiaoyishang.github.io/Everunfold-Frontend/) · [后端开发手册](https://wojiaoyishang.github.io/Everunfold-Backend/)

**当前处于预发布准备阶段，正在做初步测试。** 如果想试用，可以先在独立环境跑通登录、编辑、发布和节点同步。配套提交、验证清单与已知限制见 [预发布说明](docs/source/release/prerelease.rst)。

这是一个 **vibe coding 项目**。项目发起人 [@wojiaoyishang](https://github.com/wojiaoyishang) 确定整体架构、模块边界和关键设计取舍，使用 AI 辅助实现，并根据代码与联调结果继续优化。

## 主要功能

- **公开阅读**支持文章、说说、普通页面、术语、归档和搜索，以及 Sitemap、RSS 和分享元数据。
- **编辑工作台**提供 Markdown / HTML 区块、协同草稿、版本历史，以及页面模板和组件实时编辑。
- **站点外观**支持主题、菜单、语言与翻译，以及由前端插件注册的页面、组件和短代码。

## 本地开发

使用 Node.js 22 和 npm 10，具体版本见 [`.nvmrc`](.nvmrc)。首次运行时，将前端和后端检出到同一父目录，按 [本地快速开始](https://wojiaoyishang.github.io/Everunfold-Frontend/welcome/quickstart.html) 启动后端并配置节点。前端按 [`contracts.lock.json`](contracts.lock.json) 从指定后端提交生成客户端契约。

在本仓库根目录安装依赖，再按 [配置示例](config.example.toml) 创建本地 `config.toml`，填写地址、节点 ID、来源 UUID 和凭据引用。

```bash
npm ci --ignore-scripts
```

在两个终端分别运行 `npm run dev` 和 `npm run settings:receiver`。手动联调时网页默认监听 `3000`，接收器默认监听 `3001`。在后台完成首次同步后，打开公开页检查快照。

本地检查命令如下。

```bash
npm run check
npm run verify:production
```

`verify:production` 在独立目录检查生产构建。部署与排查见 [运维手册](https://wojiaoyishang.github.io/Everunfold-Frontend/operations/index.html)。

## 源码入口

| 路径                                                                                 | 职责                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------ |
| [`src/app/`](src/app/)                                                               | 公开页面、管理路由及 App Router 布局       |
| [`src/core/`](src/core/)、[`src/server/`](src/server/)                               | 契约、编辑与访问判断、服务端配置和公开快照 |
| [`src/themes/`](src/themes/)、[`src/plugins/`](src/plugins/)、[`src/sdk/`](src/sdk/) | 内置主题、扩展和插件 SDK                   |
| [`tools/`](tools/)、[`tests/`](tests/)                                               | 契约同步、独立插件构建和验证               |

后台操作见 [站点使用指南](https://wojiaoyishang.github.io/Everunfold-Frontend/usage/index.html)。手册源码和发布方法见 [RST 文档](docs/source/index.rst) 与 [文档构建说明](docs/source/release/documentation.rst)。技术决策与交接记录见 [设计索引](docs/README.md)。

## 致谢与许可

- 感谢 **WordPress**。内容管理、媒体库和后台编辑流程参考了 WordPress，原项目采用 GNU GPL v2 或更新版本。 [源码仓库](https://github.com/WordPress/wordpress-develop) · [许可声明](https://wordpress.org/about/license/)
- 感谢 **solstice23 的 WordPress Argon 主题**。Everunfold 的默认阅读主题借鉴了 Argon 1.3.5 的横幅、侧栏和阅读交互，以 React 和 Next.js 实现。Argon 上游声明采用 **GNU GPL v3.0**。 [源码仓库](https://github.com/solstice23/argon-theme) · [LICENSE](https://github.com/solstice23/argon-theme/blob/v1.3.5/LICENSE)
- **Elementor** 的组件面板和实时画布为可视化编辑器提供了交互参考。RST 手册的目录和示例组织参考了 **XiaoHeiHook** 和 **Pear Admin Flask**。 [Elementor](https://github.com/elementor/elementor) · [XiaoHeiHook](https://github.com/wojiaoyishang/XiaoHeiCat) · [Pear Admin Flask](https://gitee.com/pear-admin/pear-admin-flask)

Everunfold 的项目级许可证尚待确定。前端随附来自 Argon 1.3.5 的贴纸，其中「花！」的来源项目声明使用 CC BY 4.0。主题背景和演示图片另有来源记录，部分素材的再分发授权仍待核实。 [花！素材库与许可](https://github.com/k4yt3x/flowerhd#开源许可) · [前端主题素材清单](https://github.com/wojiaoyishang/Everunfold-Frontend/blob/main/src/themes/argon/assets/sources.json) · [演示图片来源](https://github.com/wojiaoyishang/Everunfold-Frontend/blob/main/public/reference/sources.json)
