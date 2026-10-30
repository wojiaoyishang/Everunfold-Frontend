# 本地环境与可复现安装

记录日期：2026-10-30（Asia/Shanghai）。适用于两个独立项目；具体依赖以各自提交的锁文件为准。此次只初始化开发环境，未修改线上站点、启动数据库或导入 WordPress。

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
uv run --locked python -m uvicorn app.entrypoints.api:app --host 127.0.0.1 --port 8000 --reload --no-proxy-headers
```

在 IDE 选 `.venv\Scripts\python.exe`，无需全局安装应用包、改 `PYTHONPATH` 或开启管理员权限。`uv run` 不依赖手动激活环境。活性检查 `/health/live` 不检查数据库、不表示业务就绪；`/health/ready`、Worker、Scheduler 尚未实现。`--no-proxy-headers` 是本地启动选择，不能视为已实现内部入口的完整 IP 校验。

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

两个 `config.example.toml` 均来自工程计划，仅作规划模板；当前代码没有 TOML 加载器，不会自动读取示例或真实 `config.toml`，不存在已启用的内部服务。示例地址不是生产默认地址，示例参数不是压测承诺。

下一阶段实现加载器时需按 ADR 落地：项目根定位、显式文件路径、明确环境覆盖表、严格 Schema、错误拒绝与凭据脱敏。生产浏览器的 `BACKEND_BASE_URL` 需单独公开允许字段；前端整个 `[backend]` 始终仅服务端。真实 `config.toml`、`.env*`、密钥、数据库及运行数据在 `.gitignore` 中排除。

## Git 与远程

两个项目独立 `main` 分支，分别推送同名 GitHub 仓库。HTTPS 地址对应用户指定仓库；本机现有 SSH 密钥已通过 GitHub 账号认证，因此 `origin` 使用等价 SSH 地址：

- `git@github.com:wojiaoyishang/Everunfold-Backend.git`
- `git@github.com:wojiaoyishang/Everunfold-Frontend.git`

SSH 私钥不复制到项目。其他开发者可按自身凭据使用 HTTPS 或 SSH；不依赖某个开发者的绝对路径/私钥才能构建。推送前检查差异、忽略规则和锁文件，正常推送不强制覆盖已有历史。
