# WordPress 迁移源盘点

2026-10-30 初始化时的只读盘点；源目录 `E:\Wordpress全量备份`。这是文件存在性与导出结构检查，**不是恢复成功或数据完整性的证明**。盘点时未修改备份、导入 SQL、执行 PHP 或更改线上站点。后续公开阅读阶段已单独执行本地白名单提取和 PostgreSQL 试导入，见下方补充。

| 项目 | 结果 |
| --- | --- |
| 文件总量 | 36,295 个文件，1,209,843,738 字节（约 1.13 GiB） |
| SQL 导出 | `db_lovepikachu_20261030023000vimdw.sql`，25,849,820 字节 |
| SQL SHA-256 | `4587F004A77B96409EE827574836E16D9750B5A712677276C8F3DACC1BD77FD1` |
| 表结构 | 100 个 `CREATE TABLE`，表前缀 `pikachu_` |
| 原媒体与派生文件目录 | `wp-content/uploads`，3,334 文件、695,582,829 字节；有 2021—2026 年份目录 |
| 主题 | `wp-content/themes/argon`，`style.css` 头部声明 1.3.5 |
| 插件目录 | 33 个；目录存在不代表启用 |

| 目录 | 文件数 | 字节 |
| --- | ---: | ---: |
| `.well-known` | 1 | 87 |
| `wp-admin` | 1,165 | 18,748,021 |
| `wp-content` | 30,172 | 1,029,247,109 |
| `wp-includes` | 4,934 | 135,766,044 |

## 已找到的迁移来源

以下表同时存在结构与 INSERT：`pikachu_posts` / `pikachu_postmeta`（内容及附件元数据）、`pikachu_comments` / `pikachu_commentmeta`（历史评论）、`pikachu_terms` / `pikachu_term_taxonomy` / `pikachu_term_relationships`（分类、标签、关联）、`pikachu_options`（后续只按白名单提取所需配置）。未核对各 `post_type` 实际行数，不根据 INSERT 语句数量推算文章数。

原用户表虽存在，按基线不迁移账户。未读取或展示 `wp-config.php`、密钥、密码散列、邮箱及评论正文等敏感值。源 SQL、媒体和整站代码保留在仓库外，仅提交去敏报告。

## 主题与旧内容线索

主题公开头部描述及默认样式指向两栏、左浮动侧栏、目录、自适应和夜间模式，默认主色 `#5e72e4`；这是本地 Argon 源码默认值，**尚未核对线上实际定制效果**。线上参考为 [lovepikachu.top](https://lovepikachu.top)，本轮网页读取超时，后续主题设计需重新做视觉审阅。备份另有 `wp-content/Sakurairo-Vision` 及相关历史表，不能据此判断当前启用主题。

插件目录清单：`admin-bar`、`captcha-plus`、`classic-editor`、`disable-comments`、`elementor`、`elementor-pro`、`enlighter`、`fwduvp`、`image-optimization`、`insert-php`、`jwt-auth`、`loco-translate`、`mammoth-docx-converter`、`markup-markdown`、`members`、`one-user-avatar`、`plus-webp`、`redis-cache`、`seo-by-rank-math`、`the-paste`、`tinymce-advanced`、`tooltips-pro`、`uipress-lite`、`uipress-pro`、`ultimate-markdown`、`user-role-editor`、`woocommerce`、`wp-custom-markdown-editor`、`wp-fastest-cache`、`wp-fastest-cache-premium`、`wp-mail-smtp`、`wpjam-basic`、`yith-woocommerce-customize-myaccount-page`。

`insert-php`、Elementor、Markdown、视频与短代码相关数据需独立盘点转换规则；不执行或直接移植旧插件，不扩展为迁移 WooCommerce 等非博客业务的默认承诺。

## 后续迁移顺序

1. 保留源副本，先在隔离环境恢复数据库，按类型核对文章、普通页面、附件、评论、分类和标签数量；外部备份方案另行验收。
2. 建立旧内容 ID、作者归属、正式 URL、媒体 ID/哈希与新虚拟引用映射；内容保留有效 Markdown/HTML，未识别块隔离报告。新账号按管理员流程建立，不沿用 WordPress 认证数据。
3. 尽量把旧 URL 直接设为正式 URL；与代码路由冲突时输出差异给管理员处理。基线不允许自动创建历史别名或 301/308 兼容层。
4. 历史评论保留来源与不可编辑约束；后续验证邮箱控制权只能建立关联，不能授予修改旧评论的权限。
5. 媒体复制到新存储，原始文件不可覆盖；校验文件、引用、派生格式和哈希。源媒体不因迁移成功而自动删除。
6. 实现可重复导入与错误隔离，抽样页面、短代码、HTML 安全过滤、评论关系、语言和链接；完成数量与差异报告后再制定切站、回退和隔离恢复演练。

初始化盘点之后，已在本机新建 PostgreSQL 开发库完成受控公开内容试导入，未恢复整个 MySQL 数据库、执行旧 PHP、修改原备份或生产切站。

## 公开阅读阶段补充

实际提取并导入 78 篇无密码公开文章、9 个普通页面、11 条已批准评论、78 标签、7 分类；4 个 WooCommerce 系统页和 3 条密码保护内容排除。312 项实际引用媒体约 55.3 MB 复制到前端忽略目录；两个缺失 JPG 尺寸引用已找到现有 WebP 对应，当前没有未解决的本地引用媒体缺失。7 个未导入同源目标保留原站外链并报告，不把独立应用假装迁入。

工具位于后端 `tools/wordpress_import/`，SQL 解析、媒体、链接/文本投影、原子文件与 DB 导入分责；重复导入已验证新增 0、更新 0、generation 保持 3。实际完整快照约 1.1 MB，数据及详细报告留在忽略的 `var/`，不进入 Git。原始账户和评论联系信息未迁移。

完整迁移、受限内容、正式修订与生产切换仍须后续完成，不能把这次公开阅读试导入视为全部 WordPress 数据迁移验收。操作方式见 [公开阅读运行指南](../development/public-reading.md)，当前结果见各仓库交接与验证记录。
