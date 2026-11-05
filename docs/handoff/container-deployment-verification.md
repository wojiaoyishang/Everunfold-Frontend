# 新设备容器 HTTP 部署验收

日期：2026-11-04。记录当前Docker容器中的临时HTTP测试，具体入口由本地忽略配置提供，不记录设备IP或约定长期部署地址。操作见[运行说明](../development/container-deployment.md)，决定见 [ADR0053](../decisions/0053-container-http-development.md)。

## 已完成

- 安装 uv/Python 3.12，按原锁文件同步后端；核对已有 Node 22/npm 10 与前端安装依赖，未升级项目依赖或锁文件。
- 已认证连接指定 PostgreSQL/Redis；预检业务库无表，显式初始化至 `0015_rich_source_leases`，创建独立随机密码的 `admin`，没有使用默认 123456 或复用系统密码。
- Supervisor 管理独立 API、Next、Node 接收器、Worker、Scheduler、Nginx；3000/3100/3001/8001 均监听 `0.0.0.0`。宿主机 3000 映射后，直接访问宿主机 IP 的就绪和页面响应通过，不只是容器内回环检查。
- 公开地址、精确 Origin、Cookie 和 Next 开发允许主机统一为当前 HTTP 部署；同一入口按原路径提供 API/WS/媒体。公开 `/internal` 路径返回 404，内部接收器保留 IP AND Token。
- 设置、节点策略、合法空公开内容完成真实 Worker/Scheduler/Node 投递并确认 applied；首页显示真实空状态，不用 WordPress 试导入内容填充。
- 补齐 HTTP 下 UUID/SHA-256 的共享适配，不改变业务保存协议。配置、两向 Token、管理员密码、运行数据均在忽略范围内，文件权限 0600；运行目录 0700。

## 实际检查结果

| 检查 | 结果 |
| --- | --- |
| `uv lock --check`、Ruff、296 文件格式、mypy 143 源码文件 | 通过 |
| 后端真实数据库完整测试，包含双 API、协同、Worker/Scheduler/Node 与故障恢复 | **156 passed，66.30 秒** |
| 前端 `npm run check` | lint、类型、格式与 **207 项测试通过** |
| 隔离 `npm run verify:admin` | 生产构建、18 个私有入口、匿名隔离、按需代码/公式、离线/撤回/设置损坏检查通过 |
| 远程 HTTP 实际 Cookie/CSRF/管理员登录与退出 | 通过；HttpOnly、`Path=/v1`、HTTP Cookie 无 Secure |
| 匿名管理、错误 Origin、缺失 CSRF、公开内部路径 | 按预期拒绝 |
| 经本容器临时入口的真实WS `/ws/v1/collab/...` | 一次性票据、首帧认证和同步通过，无凭据进入 URL |
| 既有协同草稿源文指纹保存 | SHA-256 校验、整篇 commit 和持久结果核对通过 |
| 测试文章发布与撤回 | 发布投递确认后页面 200，撤回投递确认后 404 |
| 六进程 `restart all`、重复 `start`、重启后已有 Session | 全部通过，Scheduler 租约没有阻塞重启 |
| 桌面登录自启 | 已写入 KDE autostart；本轮未实际注销桌面或重启整个容器 |

后端首次通过 Docker DNS 直接运行测试为 155 passed / 1 failed；原因是旧 WordPress 预览撤回开发工具明确只接受回环地址。未放宽该保护，改用仅回环监听的临时 TCP 转接连接同一个独立测试库，随后完整 156 项通过。转接进程已关闭，本地测试配置已恢复。

Nginx 首次校验遇到其默认 FastCGI 临时目录无写权限，模板已把所有临时目录改至当前用户运行目录；再次 `nginx -t` 通过。Scheduler 首次快速重启受到旧 15 秒租约保护，监督配置改用 SIGINT 清理租约并覆盖异常退出等待窗口，最终真实六进程重启通过。

## 浏览器证据与限制

内置浏览器实际通过宿主机 HTTP 地址打开首页/登录页，以新管理员登录，创建「新设备 HTTP 部署验证」、输入 Markdown/代码并完成首次保存；编辑页显示“修改已同步”和一个在线编辑会话，证明远程 HTTP 的真实 Cookie 与 WS 可用。随后对已保存源文追加修改，但下一次操作时浏览器连接中断，工具表面列表为空，二次保存的实页结果无法继续观察；未把其计为实页通过。

之后使用同一远程 HTTP/WS 入口完成源文指纹提交、真实发布/撤回、重新同步与会话重启恢复，具体本地结果在后端忽略目录 `var/container/verification.json`。共享适配器另有模拟无 randomUUID/subtle 环境的测试，指纹与 Node SHA-256 核对一致。没有用 HTTP 检查冒充桌面/窄屏视觉、原生剪贴板、IME 或完整跨浏览器验收，本轮无截图产物。

测试稿 `fb825e14-aead-48b9-be0c-577065940ebf` 最终已撤回并放入可恢复回收站，公开 URL 为 404。没有修改既有用户文章；新库原本没有旧设备数据。WordPress 备份没有写入或导入，SQL 只读校验为 25,849,820 字节，SHA256 `4587f004a77b96409ee827574836e16d9750b5a712677276c8f3dacc1bd77fd1`。

本次为开发部署，保留热更新。原站生产切换、WordPress 全量导入、旧 Everunfold 数据恢复、无桌面登录的容器启动方式及生产容量/日志仍不在本次验收范围。代码与交接只作本地提交，由用户推送。
