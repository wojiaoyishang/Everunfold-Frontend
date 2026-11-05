# 本容器临时入口连通性验收

日期：2026-11-05，Asia/Shanghai。仅记录当前容器的临时连通性测试，不约定项目长期部署地址。具体IP和临时公开URL只保留在本地忽略配置与运行记录中，不写入交接；本次不改变业务实现或权限。

## 配置与派生数据

- 本次测试中，两端实际TOML的公开BACKEND_BASE_URL、前端PUBLIC_SITE_URL及后端web-main公开地址指向同一临时入口；精确Origin和Next开发允许主机原已包含该入口。服务端API8001、内部接收器3001仍使用回环，不将内部凭据改为远程传输。保留HTTP与0.0.0.0监听。
- 实际配置先备份至后端忽略目录 `var/container/url-change-20261105/`，仍为0600；六个监督进程按原启动脚本重启。没有数据库迁移或重新初始化账号。
- 预检发现1份当前已发布内容仍含旧回环媒体地址。仅更新公开投影的media_urls/cover_url中原本机媒体URL前缀，增加public_generation并通过ContentPublication.stage生成release8、同事务审计和Outbox。原位备份在忽略目录；以哈希核对标题、正文、编辑属性、发布时间和修改时间完全相同，草稿不更新，不从未发布草稿重新发布。
- 设置调用原SettingsService.retry重算派生地址并投递；当前设置修订1保持。历史内容release和正文/正式修订不改写，WordPress备份不改。

## 实际结果

- 通过本容器临时入口真实HTTP检查：主页/登录页200，/health/ready显示database、redis、schema全部ok。登录页客户端配置与测试入口一致，没有旧的本机公开地址。
- 使用既有admin凭据完成独立测试会话的预会话CSRF、登录及/admin/session，认证成功；Access-Control-Allow-Origin精确为宿主机入口。测试完成后退出该检查会话，没有操作用户浏览器中的会话。
- 内容release8在web-main状态applied、applied_revision=8；设置修订1投递applied。
- 功能测试文章的公开API返回7份当前媒体全部使用宿主机地址，实际读取图片、视频、字体、ZIP与0字节附件成功。非空文件支持Range206；0字节文件对bytes=0-0返回416，普通GET200且为空，按其边界预期验收。
- 正文HTML中旧回环公开地址为0；canonical与本次临时入口一致，文章路径保持 `/everunfold-feature-lab.html`。
- 通过宿主机HTTP取得一次性协同ticket，以准确Origin连接宿主机WS，经Nginx收到sync帧、媒体地址均为宿主机地址；未发送正文更新，草稿修订仍为4，随后关闭连接。
- API、前端、接收器、Worker、Scheduler、代理六个进程均RUNNING；监听3000/3001/3100/8001仍全部为0.0.0.0。真实检查结果保存在忽略目录的verification.json，不保存测试凭据、Cookie或ticket到验收文档。

## 范围与接续

实际配置、投影数据和一次性脚本不入Git；只同步运行说明4、本验收、索引/交接和哈希，本地提交后由用户推送。没有代码/依赖/契约改变，没有重复211项前端或完整后端故障P0；本轮以真实六进程、HTTP、媒体、投递和WS检查临时入口。未进行额外视觉矩阵。

此处只保留本容器测试结果，具体入口从本地实际配置读取；后续环境按用户当时要求重新配置与验收。切换测试入口时应同步派生媒体投影并确认原持久投递，不能只改前端API地址。
