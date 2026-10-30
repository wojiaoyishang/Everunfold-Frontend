# 前端初始化验证记录

日期：2026-10-30，Windows / PowerShell，项目根 `E:\Programming\Node\Everunfold-Frontend`。这里只记录本轮骨架检查，不是完整博客或生产验收。

## 实际执行

| 检查 | 结果 |
| --- | --- |
| 依赖安装 | `npm.cmd install --ignore-scripts` 完成，348 个包，生成独立锁文件 |
| 锁文件复现 | `npm.cmd ci --ignore-scripts --prefer-offline` 成功，未改变锁文件 |
| `npm.cmd run lint` | 通过，无警告 |
| `npm.cmd run typecheck` | 通过，Next 路由类型生成及 `tsc --noEmit` |
| `npm.cmd run format:check` | 通过，代码及工具配置符合 Prettier |
| `npm.cmd run build` | 通过，Next.js 16.4.3 生产构建，首页与 not-found 为静态产物 |
| 生产模式 HTTP 冒烟 | 本机 `127.0.0.1:3100`，首页 200、中文标题/正文、`lang=zh-CN`、`noindex,nofollow` 均符合预期；无 `X-Powered-By` |
| 本机服务清理 | 冒烟后正常退出，确认 3100 端口无监听，没有留下后台服务 |
| 配置示例 TOML | 两项目均语法通过；没有声称 Next 自动加载模板 |
| 公共文件与原件 | 10 份公共资料两仓库逐字节一致；两份原件与附件相同，SHA256 见基线 README |
| 忽略规则 | `node_modules`、`.next`、真实配置/环境、运行缓存、SQL/压缩 SQL、密钥和旧站媒体目录被忽略 |

精确直接依赖：Next.js `16.4.3`，React / ReactDOM `19.3.1`；TypeScript `5.9.3`，ESLint `9.39.5`，`eslint-config-next` `16.4.3`，Prettier `3.9.10`。其他依赖与完整来源/完整性信息见 `package.json` / `package-lock.json`。本机工具为 Node `22.15.1`、npm `10.9.2`。

## 工具链限制和未执行项

- 当前 Next 规则包依赖的 React/JSX a11y 插件 peer 范围仍到 ESLint 9；暂保留可验证组合，没有强制 override。ESLint 9 已停止维护，后续需在插件支持时升级并验证，依据见根 README 的 [官方支持表](https://eslint.org/version-support/)。
- 当前没有业务逻辑，所以没有建立只验证占位页面实现的业务测试套件；后续按真实功能与 P0 增加测试。
- 未实现/未验证 API 客户端、生产跨源身份、WS、Markdown/HTML 安全过滤、快照、内部 socket IP 校验、撤回/乱序、镜像和 CDN。构建成功不能代替这些验收。
- 未执行生产部署、线上切换或数据库/媒体导入；默认占位页的 `noindex` 不是最终 SEO 方案。线上主题视觉审阅尚未完成。
- GitHub Actions 配置已建立，本地检查不等于远端 Actions 已通过；远端执行情况以仓库检查为准。工作流仅检查/构建，不部署。

## 提交与复查

目标为 `main` → 用户指定仓库，使用已认证账号的同仓库 SSH 地址。远程在初始化前无引用，不覆盖已有历史。推送及当前工作区状态以实际 Git 记录为准。

提交前核对：暂存清单不含依赖/构建产物、备份/媒体、真实配置和密钥；两份原件按 `.gitattributes` 的 `-text` 保持字节，并与原附件已记录 SHA256、已校验的后端提交 blob 比对；除原件外检查新增文件空白与本仓库 Markdown 链接。临时附件路径在最终复查时已不可用，仓库内原件及哈希足以独立恢复，不依赖临时目录。复现使用根 README 中的锁文件安装、检查和构建命令。
