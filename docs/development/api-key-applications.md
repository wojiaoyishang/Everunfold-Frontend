# API Key接入应用

版本：api-key-applications-3，2026-11-09。主项目是唯一签发/授权来源；接口Schema见后端`contracts/api-key-protocol-v1.schema.json`，浏览器管理另见`accounts-v1`及[账号指南](accounts.md)。页面及部署见[验收记录](../handoff/accounts-verification.md)。

## 身份与接口目标

`app_id`标识调用项目，`audience`标识受保护接口。接入博客的应用使用`audience=everunfold`和博客内置能力；保护自己接口的应用使用自己的app_id作为audience并定义权限目录。Key同时绑定两者，不能跨项目查询，也不能拿外部audience的Key访问博客。用户授权按audience分组；有效权限取用户当前授权、Key显式权限、应用目录三者交集。内置管理员不会自动把全部能力转给Key，用户/应用管理能力禁止用于Key。

个人Key为随机不透明值，主库只存摘要。创建成功仅当次展示；相同operation_id重试返回回执和secret=null，无法找回丢失明文，应撤销后重新创建。密码/操作输入的幂等指纹使用带盐Argon2，回执不保存密码或生成密钥。

## 部署材料

`auth.application_master_key_env`引用部署变量，值为至少43个Base64URL字符的随机主密钥。API与Worker必须读取同一稳定值，备份与权限由部署管理；它不进入数据库、浏览器、任务正文或仓库。不同app_id、方向、代次通过HMAC派生独立应用密钥。主密钥意外变化会使全部旧签名失效，不能把它当普通滚动配置；主动更换须重新分配应用凭据。

查询和回调使用独立密钥及key_id，轮换只影响选定方向，新代次立即生效。管理员需把新材料安全交给子项目，再重试/重新同步；不提供读取旧明文或隐式双代次宽限。部署显式填写`auth.callback_allowed_origins`，管理员只能登记其中的回调URL；HTTP/私网允许情况由部署确定。回调拒绝URL凭据、查询参数、fragment和重定向，允许来源代表部署对该网络目标的信任，域名解析仍须由部署控制。

## 签名协议

采用自定义`EF-AUTH-HMAC-SHA256-V1`，参考[RFC9421](https://www.rfc-editor.org/rfc/rfc9421.html)的消息绑定原则，**不是RFC9421线格式**。所有参与者应逐字节使用以下UTF-8串，以LF连接，末尾无LF：

1. `EF-AUTH-HMAC-SHA256-V1`
2. 大写方法`POST`；响应/回执使用`RESPONSE`
3. 完整规范目标URL（管理员页面复制的query_url或登记的callback_url，禁止自行拼接代理Host）
4. app_id
5. key_id（`app_id:query:代次`或`app_id:callback:代次`）
6. Unix秒数十进制timestamp
7. 每请求随机nonce（24~80个Base64URL字符）
8. 实际HTTP正文原始字节的SHA256小写hex

使用显示给应用的密钥字符串UTF-8字节做HMAC-SHA256，结果小写hex。头部为`X-Everunfold-App/Key-Id/Timestamp/Nonce/Signature`（均带`X-Everunfold-`前缀），`Content-Type: application/json`。响应签实际响应原始字节，并沿用请求nonce；调用方必须检查该nonce相等。允许时钟误差120秒；查询nonce由主项目Redis NX保留240秒，Redis不可用时拒绝校验。时钟需要同步。TLS/HTTP属于部署传输选择；签名绑定消息而不加密内容，当前HTTP测试保持原约定。

子→主：POST `/v1/auth/api-keys/introspect`，正文`{"token":"用户Key","mode":"read"}`或`write`。不接受查询参数；先验证应用及签名，再验证Key归属、用户启停/强制改密/当前权限/到期/撤销。成功使用统一外壳，inactive时仅`data.active=false`；active时返回最小subject、权限、audience、Key/用户/应用版本及绝对截止时间。错误按真实HTTP状态处理，不缓存错误为授权成功。管理/资料接口仅Session，不接受Bearer替代或降级。

主→子：POST登记URL，最小信封含protocol=`everunfold.api-key.v1`、event_id、app_id、audience、type、app_version、occurred_at及相关用户/Key ID和版本。不含Key明文或权限快照。接收方先验签/nonce/归属，再清除该应用的授权缓存，保留单调版本。回执是无外壳JSON：event_id、app_id、app_version、received=true、applied=true/false；用回调密钥签回执，沿用请求nonce。HTTP200且applied=false仅表示接收，主项目继续重试；只有签名及事件绑定正确且applied=true才标记已应用。

## 缓存与可靠性

读取缓存默认最多30秒，以服务端`cache_until`、Key到期和本地从请求开始计时的上限取最小值；命中、多层转存、迟到响应不得刷新期限。参考客户端同时用`checked_at`到截止时间的服务端区间与本地单调时钟限制租约，避免时钟差延长授权；迟到的过期正响应不能直接放行。写入每次查询。事件在权限变更的同一PG事务登记，Worker租约认领后在事务外投递，Scheduler只投递任务。失败退避达到上限后可手动重试，保留event_id，每次换nonce。账号/应用停用会影响现有Key；应用停用后仍投递撤销通知，清空callback_url才停止投递。密码重置/停用使旧Key永久失效，重新启用不会恢复它们；普通降权/恢复则按显式权限交集实时计算。

接收方须防止较新回调后迟到的旧查询回填，单调app_version和请求开始的本地generation共同守卫。`examples/api-key-client.mjs`给出Node22独立实现，支持验签、绝对短缓存、只读/写入、nonce、重复/乱序回调及迟到响应保护，不依赖主项目Python代码。示例缓存限1000项、nonce限10000项；只供单个子项目服务进程使用。多进程子项目应将版本下界/失效通过共享Redis等原子存储传播到所有进程，或禁用读取缓存；仅通知一个进程不能声称整个集群已应用。示例只清缓存，重复事件无额外业务效果；扩展业务副作用须另做持久event_id幂等。

网络分区无法承诺零延迟撤销，普通读取以短期限兜底，过期无法确认就拒绝。已在执行的操作不回滚；长任务执行关键步骤仍需重新授权。回调只传失效事件，不接收子项目更改主项目权限。

## 阅读侧验证码与机器请求

机器查询及Callback继续使用上面的签名/nonce/期限协议，不增加人工验证码。博客阅读侧新增独立的 `captcha:read_bypass` 和 `captcha:comment_bypass` 权限：与全局许可同时满足时才免去对应挑战，已有Key不自动增权；撤销、缩权、密码和评论审核继续生效。每Key的阅读侧额度、私有回执及鉴权围栏见[验证码指南](captcha.md#api-key-与机器调用)。这不是对所有管理业务API统一新增限额。
