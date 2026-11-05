# 容器临时测试运行说明

版本：container-deployment-4，2026-11-05（Asia/Shanghai）。本页仅记录当前Docker桌面容器的临时测试过程，端口和目录为该测试环境的运行示例，不约定项目长期部署方式。具体IP与临时公开URL只保留在本地忽略配置和运行记录中。测试按用户要求使用HTTP，服务监听 `0.0.0.0`；决定与兼容边界见 [ADR0053](../decisions/0053-container-http-development.md)。

测试中先使用本机回环入口，随后由用户完成宿主机映射，公开API、媒体及canonical同步到本容器临时测试入口。真实登录、7份媒体和协同WS已通过，[本次验收](../handoff/remote-address-verification.md)只记录测试结果；[功能长文验收](../handoff/feature-lab-article-verification.md)中的回环示例保留为历史测试记录。

## 当前实例

- 项目目录：`/config/Desktop/workspace/Everunfold/Everunfold-Backend`、同级 `Everunfold-Frontend`。容器内同一挂载的物理路径为 `/workspace/Everunfold/`。
- Debian 13，用户 `lovepikachu`；Python 3.12.16、uv 0.13.7、Node.js 22.23.4、npm 10.9.9。后端由 `uv sync --locked` 安装；前端已有与锁文件一致的依赖，未升级版本。
- PostgreSQL：`Postgresql-Service:5432/Everunfold`，数据库角色 `Everunfold`；Redis：`Redis-Service:6379`，应用、Broker、结果配置分别使用 DB 0/1/2，项目前缀 `lovepikachu:container-dev:`。
- 新业务库初始为空，显式初始化到 `0015_rich_source_leases`，创建独立 `admin` 账号。仅重新同步空的合法公开快照和初始设置；未导入 WordPress，未凭空恢复旧设备的 Everunfold 草稿/媒体。
- WordPress 完整备份仍在 `/config/Desktop/workspace/Wordpress/`，本次不修改或导入。旧设备的 PostgreSQL 数据及上传目录若需保留，应另行提供和规划恢复。

## 入口与端口

```text
本容器测试：浏览器 → 临时宿主机入口 → Docker测试端口映射
       → 容器 Nginx :3000
           /v1/*、/ws/v1/*、/media/*、/health/*、API 文档 → FastAPI :8001
           页面、Next 静态资源、热更新连接 → Next.js :3100

Worker / Scheduler → Node 设置与内容接收器 :3001
容器内也可使用回环入口；页面中的公开API/媒体地址以本地实际配置为准。
```

四个监听器均绑定 `0.0.0.0`。宿主机只需映射 3000；3001 是内部接收器，8001/3100 是上游开发进程。容器内没有宿主机 Docker socket，映射由用户在宿主机完成；修改已有容器映射通常需要按原配置重建，须保留 `/config`、`/workspace` 和原桌面/网络配置，不能用一个简化的 `docker run` 覆盖原容器。

Nginx 保留原 API 与 WS 路径，不引入 `/api` 前缀；`/internal` 和 `/internal/*` 在公开入口返回 404。Uvicorn 保留 `--no-proxy-headers`，实际 socket 来源经过代理后是回环地址，当前远程浏览器会共享该来源的限流桶。生产若需按客户端 IP 限流，应单独设计受信代理边界，不能直接信任任意转发头。

## 实际配置

实例文件均在 Git 忽略范围内，权限为 0600，运行目录为 0700：

| 文件 | 用途 |
| --- | --- |
| 后端 `config.toml` | 数据库、Redis、公开地址、精确 Origin、媒体路径、节点和 HTTP 开发开关 |
| 后端 `.env.container.local` | 两个方向的独立随机内部 Token、开发允许的主机名 |
| 后端 `var/container/admin-credentials.json` | 首次管理员用户名与独立随机密码；不复用系统或数据库密码 |
| 前端 `config.toml` | 浏览器 API 地址、服务端回环连接、缓存目录、显式绑定的 source_epoch |
| 后端 `var/container/nginx.conf` | 从 `deploy/nginx.container.conf.template` 替换占位符生成 |

测试时前后端公开 `BACKEND_BASE_URL`、前端 `PUBLIC_SITE_URL` 与后端 `frontends.web-main.base_url` 指向同一临时入口；实际值只在忽略配置中维护。仅服务端API和内部接收器使用回环连接，精确Origin按测试需要配置，不使用通配符。回环地址是内部通信方式，不是对外部署入口。

公开内容会持久保存派生媒体地址，改配置后不能只重启。此次只重定向当前已发布投影中的原回环 `/media/` 地址，保留正文、时间、编辑属性及草稿修订，生成不可变内容release8并经原Outbox投递确认；历史release不改写。设置走既有重新同步，当前修订1已应用。实际配置和投影更新前备份、一次性检查位于后端忽略目录 `var/container/url-change-20261105/`，不得提交。

后端 `[auth]` 显式设置 `allow_private_http=true`、`cookie_secure=false`、`cookie_samesite="lax"`。该开关默认关闭，只对字面 RFC1918 IPv4 和 IPv6 ULA 地址生效；不通过 DNS 推断内网，不允许公网/链路本地地址。HttpOnly、CSRF、精确 Origin 和内部 IP AND Token 校验仍生效。内部接收 URL 为回环 HTTP，非回环内部凭据传输仍要求 HTTPS。

前端开发服务的允许主机来自 `EVERUNFOLD_DEV_ALLOWED_HOSTS`，只包含本容器测试需要的显式主机；具体列表留在忽略的环境文件中。更换测试入口时同步更新两端实际TOML、Origin和该变量，再重启相应服务。`npm run dev/start` 默认监听 `0.0.0.0`；本次容器测试给Next传入 `--port 3100`。

## 启停与重启

容器没有正在运行的 systemd。使用当前用户的独立 Supervisor，经 Unix socket 管理六个进程：API、前端、接收器、Worker、单进程 Scheduler、Nginx。命令见后端 [deploy 说明](../../deploy/README.md)；前端仓库读者应在同级后端运行这些命令。

```bash
cd /config/Desktop/workspace/Everunfold/Everunfold-Backend
./deploy/container-dev.sh start
./deploy/container-dev.sh status
./deploy/container-dev.sh restart all
```

Scheduler 使用 SIGINT 退出，以执行租约清理；异常退出后的启动重试窗口覆盖原 15 秒租约过期时间。不得在同一 Redis scope 启动第二套 Scheduler。服务异常退出由 Supervisor 拉起，日志在后端 `var/container/`，有大小和备份数量限制。API、Nginx 关闭访问日志以免把请求参数写入普通访问日志；这不替代后续生产结构化日志与统一脱敏工作。

已配置当前桌面用户的 `~/.config/autostart/everunfold.desktop`：容器重启后登录 KDE 桌面会启动此部署。完全没有桌面登录的启动方式需要宿主机另行管理；不要把桌面自启当容器主进程配置。

数据库升级保持显式执行，服务启动不迁移。新实例先准备配置及独立管理员密码环境变量，再运行 `uv run --locked python init.database.py --no-create-database`；重复执行不会清库或重置已有账号。

## HTTP 浏览器兼容

远程 HTTP 不提供 `crypto.randomUUID`、`crypto.subtle` 等安全上下文接口。前端统一用共享适配器：UUID 继续使用浏览器安全随机数；源文 SHA-256 在没有 Web Crypto 时使用现有锁定依赖 lib0，指纹格式与后端保持一致。没有使用 `Math.random` 替代安全随机数，没有另建保存通道。

已有复制按钮保留浏览器拒绝剪贴板时的手工复制提示；HTTP 不保证系统分享或异步剪贴板能力。键盘复制/粘贴及编辑器的粘贴事件仍可使用。

## 检查与接续

部署验收见 [容器部署验证](../handoff/container-deployment-verification.md)，各仓库最新结果见 `docs/handoff/STATUS.md`。先确认远程登录、编辑保存、WebSocket 和公开投递，再继续 WordPress 只读预检及导入计划。

后端测试使用独立 `everunfold_test` 和独立 scope。原撤回开发工具有额外回环地址保护；Docker DNS 地址直接运行该 P0 会被拒绝。本次使用仅绑定回环、临时端口的 TCP 转接连接同一测试服务完成验证，结束后销毁转接进程并恢复本地测试配置；未放宽该工具的保护或指向业务库运行故障注入。
