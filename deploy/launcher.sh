#!/usr/bin/env bash
set -euo pipefail

deploy_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$deploy_dir/.." && pwd)"
docker_dir="$project_root/docker"
cd "$project_root"
role=frontend
[[ ! -d "$project_root/app" ]] || role=backend
native=false
if [[ "${1:-}" == --native ]]; then native=true; shift; fi
action=${1:-configure}
case "$action" in
  configure|build|deploy|start|check|init-db|migrate|export-node|api|worker|scheduler|web|receiver) ;;
  *)
    echo "用法：./setup.sh [--docker|--native] [configure|build|deploy|start|check|init-db|migrate|export-node]"
    exit 2
    ;;
esac
if (( $# > 1 )); then echo "不支持额外参数。" >&2; exit 2; fi

if "$native"; then
  command -v uv >/dev/null || { echo "不使用 Docker 时需要 uv；安装方法见 docker/README.md。" >&2; exit 1; }
  exec uv run --project "$deploy_dir/assistant" --locked python "$deploy_dir/native.py" "$action"
fi
case "$action" in
  api|worker|scheduler|web|receiver) echo "单独运行进程请使用 --native。" >&2; exit 2 ;;
esac
command -v docker >/dev/null || { echo "需要 Docker Engine 和 Compose v2；安装方法见 docker/README.md。" >&2; exit 1; }
docker info >/dev/null || { echo "无法连接 Docker daemon。" >&2; exit 1; }
docker compose version >/dev/null
printf '\n\033[1;36mEverunfold · %s · Docker 部署助手\033[0m\n' "$role"
read -r checksum _ < <(cat "$docker_dir/setup/Dockerfile" "$deploy_dir/assistant/uv.lock" | cksum)
setup_image="everunfold-setup:1-$checksum"
if ! docker image inspect "$setup_image" >/dev/null 2>&1; then
  docker build --progress=plain -t "$setup_image" -f "$docker_dir/setup/Dockerfile" "$project_root"
fi
# The bootstrap mounts the project initially; add external instance paths before
# resolving a separate frontend connection profile. Each mount target is unique.
base=(docker run --rm --user "$(id -u):$(id -g)" -e PYTHONDONTWRITEBYTECODE=1
      --workdir "$project_root")
mount_args=()
declare -A mount_modes=()
declare -a mount_order=()
add_mount() {
  local directory=$1 mode=${2:-rw}
  if [[ "$directory" == *','* || "$directory" == *$'\n'* || "$directory" == *$'\r'* ]]; then
    echo "挂载路径不能包含逗号或换行。" >&2; exit 2
  fi
  [[ ${mount_modes["$directory"]+yes} ]] || mount_order+=("$directory")
  if [[ "${mount_modes["$directory"]:-}" != rw ]]; then mount_modes["$directory"]=$mode; fi
}
refresh_mounts() {
  mount_args=()
  local directory readonly
  for directory in "${mount_order[@]}"; do
    readonly=
    [[ "${mount_modes[$directory]}" != ro ]] || readonly=,readonly
    mount_args+=(--mount "type=bind,source=$directory,target=$directory$readonly")
  done
}
read_paths() {
  local path_result
  path_result="$("${base[@]}" "${mount_args[@]}" "$setup_image" python "$deploy_dir/bootstrap.py" paths)"
  mapfile -t locations <<< "$path_result"
  if (( ${#locations[@]} != 6 )); then echo "无法确定挂载目录。" >&2; exit 1; fi
}
add_mount "$project_root"
refresh_mounts
read_paths
network=${locations[0]}
data_dir=${locations[1]}
env_parent=${locations[2]}
output_dir=${locations[3]}
source_dir=${locations[4]}
[[ -d "$source_dir" ]] || { echo "源码目录不存在：$source_dir" >&2; exit 1; }
add_mount "$source_dir" ro
for directory in "$docker_dir" "$data_dir" "$env_parent"; do
  add_mount "$directory"
  mkdir -p "$directory"
done
if [[ "$role" == frontend ]]; then
  add_mount "$output_dir"
  mkdir -p "$output_dir" "$data_dir/plugins"
fi
refresh_mounts
read_paths
profile_parent=${locations[5]}
add_mount "$profile_parent"
mkdir -p "$profile_parent"
refresh_mounts
docker network inspect "$network" >/dev/null 2>&1 || docker network create "$network" >/dev/null
cidrs="$(docker network inspect --format '{{range .IPAM.Config}}{{.Subnet}},{{end}}' "$network")"
tool=("${base[@]}" "${mount_args[@]}" --network "$network" -e "EVERUNFOLD_NETWORK_CIDRS=$cidrs")
compose=(docker compose --project-directory "$docker_dir" -f "$docker_dir/compose.yaml")
export EVERUNFOLD_BUILD_REVISION
EVERUNFOLD_BUILD_REVISION="$(git -C "$source_dir" rev-parse --short HEAD 2>/dev/null || echo unknown)"
export EVERUNFOLD_BUILD_CREATED
EVERUNFOLD_BUILD_CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ "$action" == configure ]]; then
  if [[ ! -t 0 || ! -t 1 ]]; then echo "配置界面需要交互终端。" >&2; exit 1; fi
  result=0
  "${tool[@]}" -it -e "TERM=${TERM:-xterm-256color}" "$setup_image" \
    python "$deploy_dir/configure.py" || result=$?
  case "$result" in
    0) echo "配置已保存。"; exit 0 ;;
    10) echo "已退出，未保存本次修改。"; exit 0 ;;
    20) action=build ;;
    21) action=deploy ;;
    30) action=init-db ;;
    31) action=migrate ;;
    32) action=export-node ;;
    *) exit "$result" ;;
  esac
fi

"${tool[@]}" "$setup_image" python "$deploy_dir/bootstrap.py" render
"${compose[@]}" config --quiet
build_image() {
  printf '\n\033[1;36mEverunfold %s · 构建运行镜像 · 源码 %s\033[0m\n' "$role" "$EVERUNFOLD_BUILD_REVISION"
  "${compose[@]}" --progress plain build "$role"
}
build_frontend() {
  local release="release-$(date -u +%Y%m%dT%H%M%S)-$RANDOM"
  local staging="$data_dir/plugin-builds/$release"
  mkdir -p "$staging"
  "${compose[@]}" run --rm builder build "$release"
  FRONTEND_PLUGIN_OUTPUT_DIR="$staging" "${compose[@]}" run --rm builder build-plugins
  "${tool[@]}" "$setup_image" python "$deploy_dir/bootstrap.py" activate "$release"
}
case "$action" in
  build|deploy)
    build_image
    if [[ "$role" == frontend ]]; then build_frontend; fi
    if [[ "$action" == build ]]; then echo "构建完成。启动请运行 ./setup.sh --docker start"; exit 0; fi
    action=start
    ;;
  init-db|migrate|export-node)
    if [[ "$role" != backend ]]; then echo "此操作请在后端仓库执行。" >&2; exit 2; fi
    build_image
    ;;
esac
case "$action" in
  init-db)
    "${compose[@]}" run --rm backend python deploy/runtime_check.py --require-empty
    "${compose[@]}" run --rm backend python init.database.py --config /data/config.toml --no-create-database
    "${compose[@]}" run --rm backend python -m tools.register_backend_plugins --config /data/config.toml --apply
    "${compose[@]}" run --rm backend python deploy/runtime_check.py
    ;;
  migrate)
    "${compose[@]}" stop backend
    "${compose[@]}" run --rm backend alembic -c migrations/alembic.ini upgrade head
    "${compose[@]}" run --rm backend python -m tools.register_backend_plugins --config /data/config.toml --apply
    "${compose[@]}" run --rm backend python deploy/runtime_check.py
    echo "迁移完成。运行 ./setup.sh --docker start 启动。"
    ;;
  export-node)
    "${compose[@]}" run --rm backend python deploy/node_bundle.py
    echo "将 $data_dir/connections/ 下对应节点的 JSON 复制到前端 docker/data/，再从前端助手导入。"
    ;;
  check)
    if [[ "$role" == backend ]]; then
      "${compose[@]}" run --rm backend python deploy/runtime_check.py
    else
      "${compose[@]}" run --rm frontend node --import tsx /usr/local/lib/everunfold-check.mjs
    fi
    ;;
  start)
    if [[ "$role" == backend ]]; then
      "${compose[@]}" run --rm backend python deploy/runtime_check.py
    else
      "${compose[@]}" run --rm frontend node --import tsx /usr/local/lib/everunfold-check.mjs
    fi
    "${compose[@]}" up -d "$role"
    "${compose[@]}" ps
    if [[ "$role" == frontend ]]; then
      echo "首次同步公开快照前 /health/ready 可能为 503；请完成节点登记和首次同步。"
    fi
    ;;
esac
