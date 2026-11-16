# ADR 0160：独立插件契约准备与 npm 下载缓存

- 日期：2026-11-16
- 状态：已实现

## 原因

主体和插件分别在一次性容器中构建。主体入口会生成契约，但这些文件随其工作区消失；原插件入口直接加载注册表，新的工作区因缺少 `@contracts/content-types.json` 而失败。npm 缓存原先仅指向容器内 `/build/npm-cache`，没有宿主持久化挂载，重试需要再次下载依赖。

## 决定

1. `npm run plugins:build` 显式先执行 `contracts:prepare`，成功后才加载插件编译器。继续按 `contracts.lock.json` 的后端提交和 SHA 校验生成文件，不手写或提交派生契约。使用显式命令串联，使调用者设置 `ignore-scripts` 时也不会跳过必要准备；保留插件和输出目录参数。
2. Docker builder 将 `${FRONTEND_DATA_DIR}/npm-cache` 挂到 `/build/npm-cache`，数据目录未配置时沿用 `docker/data`。部署助手先以部署账号创建目录，Compose 禁止自动创建宿主路径；主体、插件、失败重试和后续构建共用下载缓存。
3. 安装保留 `npm ci`、锁文件与 `--ignore-scripts`，增加 `--prefer-offline`，沿用 verbose 日志与 timing。原生部署使用当前账号已有的 npm 缓存。每次仍安装本次依赖，未缓存的包仍需联网；不持久化 `node_modules`、契约生成目录或整个编译工作区。
4. 编译容器依旧用完即删。产物选择、插件发布和日常重启不编译的规则保持原样。已部署实例需更新代码后执行根 `./setup.sh --docker build`，成功后再 `start`；直接 Compose 构建前用根助手 `render` 准备目录。

## 验证与边界

- 回归测试从仅有源码和锁定原始 schema 的临时目录运行实际插件命令，确认生成契约后成功构建；同时设置 npm 离线和忽略生命周期脚本，避免测试依赖网络或隐式前置钩子。
- 使用实际 Docker 入口脚本，在只读源码副本、空缓存和两个独立工作目录完成两次全部六插件构建。第二次禁用 npm 网络，复用首次下载缓存仍成功，六个插件的产物哈希一致；契约获取仍独立进行，不声称整个构建可以离线。
- 部署助手测试覆盖自定义数据目录创建缓存和重复生成时保留已有内容。Compose 渲染检查默认、自定义路径及挂载目标。
- 验证环境没有 Docker daemon，以上实际执行使用宿主 Node.js 22、npm 10 和 rsync；不代表已完成镜像构建或真实容器挂载验收。未测试用户服务器连接或修改其配置、数据。

依据：[npm 10 配置说明](https://docs.npmjs.com/cli/v10/using-npm/config/)、[Compose bind 挂载](https://docs.docker.com/reference/compose-file/services/#volumes)。
