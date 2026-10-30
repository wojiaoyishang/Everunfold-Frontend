# 本地环境与可复现安装

记录日期：2026-10-30（Asia/Shanghai）。适用于两个独立项目；具体依赖以各自提交的锁文件为准。本阶段已将公开 WordPress 内容导入本机专用新库并生成前端快照；原备份与线上站点未修改。

| 项目 | 本机路径 | 工具选择 |
| --- | --- | --- |
| 后端 | `E:\Programming\Python\Everunfold-Backend` | Python 3.12 标准 64 位解释器，uv，项目内 `.venv` |
| 前端 | `E:\Programming\Node\Everunfold-Frontend` | Node.js 22，npm，项目内 `node_modules` |
| 迁移源 | `E:\Wordpress全量备份` | 仓库外只读源数据，不执行 PHP/SQL |

本机已用 Python 3.12.4、uv 0.9.0、Node 22.15.1、npm 10.9.2 初始化。安装新环境时使用所选版本系列的维护版本，并重新验证；不要混用本机默认 Python 3.11、32 位 Python 或 free-threaded Python。`.python-version` / `.nvmrc` 与锁文件决定项目环境，安装器工具自身不提交到仓库。

## 后端

以本项目根为工作目录（如果当前在前端项目，先切换到后端）：

```powershell
Set-Location -LiteralPath 'E:\Programming\Python\Everunfold-Backend'
uv sync --locked
uv run --locked python -m uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8001 --reload --no-proxy-headers
```

在 IDE 选 `.venv\Scripts\python.exe`，无需全局安装应用包、改 `PYTHONPATH` 或开启管理员权限。`uv run` 不依赖手动激活环境。活性检查 `/health/live` 不检查数据库；`/health/ready` 检查数据库、Redis 及迁移版本。Worker、Scheduler 尚未实现。`--no-proxy-headers` 是本地启动选择，不能视为已实现内部入口的完整 IP 校验。后端端口按用户指定固定为本地示例 `8001`，避免其他项目使用的 `8000`。

验证：`uv lock --check`、`uv run --locked ruff check .`、`uv run --locked ruff format --check .`、`uv run --locked mypy`、`uv run --locked pytest`。新增依赖通过 `uv add` / `uv add --dev` 精确指定并提交 `pyproject.toml`、`uv.lock`，升级需复核兼容性；CI 使用锁文件同步。

## 前端

```powershell
Set-Location -LiteralPath 'E:\Programming\Node\Everunfold-Frontend'
npm.cmd ci --ignore-scripts
npm.cmd run dev
```

浏览器访问 `http://localhost:3000`。PowerShell 下使用 `npm.cmd` 可避免全局执行策略影响 npm 的 PowerShell 包装器。验证命令和支持的 Node 范围见根 `package.json` / README；常用 `npm.cmd run lint`、`npm.cmd run typecheck`、`npm.cmd run format:check`、`npm.cmd run build`。生产构建成功不等于博客功能或缓存协议完成。

当前安装命令禁用依赖生命周期脚本，其他安装策略见 `.npmrc`；如锁定依赖确需安装脚本，先核对对应依赖及必要性，再记录例外。不要为绕过安装问题关闭 TLS 校验或无记录地更换依赖源。

## 配置边界

两个项目均已实现严格 TOML 配置加载，只读取真实 `config.toml` 或显式 `CONFIG_FILE`，不回退示例。环境变量仅覆盖列明字段，错误拒绝就绪/公开读取且不输出秘密。内部认证/Worker/Scheduler 的预留字段仍未启用对应服务，示例参数也不是压测承诺。

后端实例连接本机 `127.0.0.1:5432/everunfold_dev` 与 `127.0.0.1:6379`，测试库是 `everunfold_test`；Redis scope 为 dev/test。前端根 `BACKEND_BASE_URL` 是 `http://127.0.0.1:8001`，整个 `[backend]` 始终仅服务端。真实 `config.toml`、`config.test.local.toml`、`.env*`、密钥、数据库及运行数据在 `.gitignore` 中排除。详细命令与当前边界见 `public-reading.md`。

## Git 与远程

两个项目独立 `main` 分支，分别推送同名 GitHub 仓库。HTTPS 地址对应用户指定仓库；本机现有 SSH 密钥已通过 GitHub 账号认证，因此 `origin` 使用等价 SSH 地址：

- `git@github.com:wojiaoyishang/Everunfold-Backend.git`
- `git@github.com:wojiaoyishang/Everunfold-Frontend.git`

SSH 私钥不复制到项目。其他开发者可按自身凭据使用 HTTPS 或 SSH；不依赖某个开发者的绝对路径/私钥才能构建。推送前检查差异、忽略规则和锁文件，正常推送不强制覆盖已有历史。

最新用户约定：代理只做阶段性本地提交，交付后的远程推送由用户自行执行；不再沿用初始化阶段的代理推送授权。
