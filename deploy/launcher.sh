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
  configure|build|deploy|start|check|init-db|migrate|export-node|api|worker|scheduler|web|receiver|render) ;;
  *) echo "用法：./setup.sh [--docker|--native] [configure|build|start|check|init-db|migrate|export-node|render]"; exit 2 ;;
esac
if (( $# > 1 )); then echo "不支持额外参数。" >&2; exit 2; fi
if "$native"; then
  command -v uv >/dev/null || { echo "需要 uv；安装方法见 deploy/README.md。" >&2; exit 1; }
  exec uv run --project "$deploy_dir/assistant" --locked python "$deploy_dir/native.py" "$action"
fi
case "$action" in api|worker|scheduler|web|receiver) echo "单进程入口请使用 --native。" >&2; exit 2 ;; esac
command -v docker >/dev/null || { echo "需要 Docker Engine 和 Compose v2。" >&2; exit 1; }
docker info >/dev/null || { echo "无法连接 Docker daemon。" >&2; exit 1; }
docker compose version >/dev/null
printf '\n\033[1;36mEverunfold · %s · Docker 部署助手\033[0m\n' "$role"
read -r checksum _ < <(cat "$docker_dir/setup/Dockerfile" "$deploy_dir/assistant/uv.lock" | cksum)
setup_image="everunfold-setup:1-$checksum"
if ! docker image inspect "$setup_image" >/dev/null 2>&1; then
  docker build --progress=plain -t "$setup_image" -f "$docker_dir/setup/Dockerfile" "$project_root"
fi
base=(--user "$(id -u):$(id -g)" -e PYTHONDONTWRITEBYTECODE=1 --workdir "$project_root")
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
  local result
  result="$(docker run --rm --network none "${base[@]}" "${mount_args[@]}" "$setup_image" python "$deploy_dir/bootstrap.py" paths)"
  mapfile -t locations <<< "$result"
  if (( ${#locations[@]} != 18 )); then echo "无法确定容器设置。" >&2; exit 1; fi
  network=${locations[0]}; data_dir=${locations[1]}; env_parent=${locations[2]}
  output_dir=${locations[3]}; source_dir=${locations[4]}; profile_parent=${locations[5]}
  container_name=${locations[6]}; image_name=${locations[8]}; bind_host=${locations[9]}
  publish_port=${locations[10]}; listen_port=${locations[11]}; env_file=${locations[12]}
  runtime_user=${locations[13]}; artifact_dir=${locations[14]}; receiver_ports=${locations[15]}
  listen_host=${locations[16]}; runtime_config=${locations[17]}
  IFS=',' read -ra extra_networks <<< "${locations[7]}"
}
refresh_layout() {
  mount_modes=(); mount_order=()
  add_mount "$project_root"
  refresh_mounts
  read_paths
  for directory in "$docker_dir" "$data_dir" "$env_parent"; do
    add_mount "$directory"; mkdir -p "$directory"
  done
  if [[ -d "$source_dir" ]]; then add_mount "$source_dir"; fi
  if [[ "$role" == frontend ]]; then
    add_mount "$output_dir"; mkdir -p "$output_dir" "$data_dir/plugins"
  fi
  refresh_mounts
  read_paths
  add_mount "$profile_parent"; mkdir -p "$profile_parent"
  refresh_mounts
}
ensure_networks() {
  docker network inspect "$network" >/dev/null 2>&1 || docker network create "$network" >/dev/null
  local net
  for net in "${extra_networks[@]}"; do
    [[ -n "$net" && "$net" != "$network" ]] || continue
    docker network inspect "$net" >/dev/null 2>&1 || { echo "额外网络不存在：$net。请先创建该网络或修改配置。" >&2; return 1; }
  done
}
connect_extras() {
  local target=$1 net
  declare -A connected=(["$network"]=1)
  for net in "${extra_networks[@]}"; do
    [[ -n "$net" && ! ${connected["$net"]+yes} ]] || continue
    docker network connect "$net" "$target" || return $?
    connected["$net"]=1
  done
}
# Connect every network before executing tools or application commands. Never mix
# built-in bridge and user-defined networks in one create/run invocation.
run_temporary() (
  local interactive=$1
  shift
  local id result=0 status
  id="$(docker create --network "$network" "$@")" || exit $?
  trap 'docker rm -f "$id" >/dev/null 2>&1 || true' EXIT
  connect_extras "$id" || exit $?
  if [[ "$interactive" == yes ]]; then
    docker start --attach --interactive "$id" || result=$?
  else
    docker start --attach "$id" || result=$?
  fi
  status="$(docker inspect --format '{{.State.ExitCode}}' "$id")" || exit $?
  [[ "$status" =~ ^[0-9]+$ ]] || exit 1
  if (( status == 0 && result != 0 )); then exit "$result"; fi
  exit "$status"
)
run_tool() {
  run_temporary no "${base[@]}" "${mount_args[@]}" "$setup_image" python "$deploy_dir/bootstrap.py" "$@"
}
refresh_layout
ensure_networks
if [[ "$action" == configure ]]; then
  [[ -t 0 && -t 1 ]] || { echo "配置界面需要交互终端。" >&2; exit 1; }
  cidrs="$(docker network inspect --format '{{range .IPAM.Config}}{{.Subnet}},{{end}}' "$network" "${extra_networks[@]}")"
  cidrs=${cidrs//$'\n'/}
  result=0
  run_temporary yes --interactive --tty "${base[@]}" "${mount_args[@]}" \
    -e "TERM=${TERM:-xterm-256color}" -e "EVERUNFOLD_NETWORK_CIDRS=$cidrs" \
    "$setup_image" python "$deploy_dir/configure.py" || result=$?
  case "$result" in
    0) action=render ;;
    10) echo "已退出，未保存本次修改。"; exit 0 ;;
    20) action=build ;; 21) action=deploy ;; 30) action=init-db ;;
    31) action=migrate ;; 32) action=export-node ;; *) exit "$result" ;;
  esac
  refresh_layout
  ensure_networks
fi
[[ -d "$source_dir" ]] || { echo "代码目录不存在：$source_dir" >&2; exit 1; }
run_tool render
if [[ "$action" == render ]]; then echo "根目录配置已保存，挂载目录已准备。"; exit 0; fi
compose=(docker compose --project-directory "$docker_dir" -f "$docker_dir/compose.yaml")
export EVERUNFOLD_BUILD_REVISION EVERUNFOLD_BUILD_CREATED
EVERUNFOLD_BUILD_REVISION="$(git -C "$source_dir" rev-parse --short HEAD 2>/dev/null || echo unknown)"
EVERUNFOLD_BUILD_CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
"${compose[@]}" config --quiet
build_image() {
  printf '\nEverunfold %s · 构建运行镜像 · 源码 %s\n' "$role" "$EVERUNFOLD_BUILD_REVISION"
  "${compose[@]}" --progress plain build "$role"
}
build_frontend() {
  local release="release-$(date -u +%Y%m%dT%H%M%S)-$RANDOM"
  local staging="$data_dir/plugin-builds/$release"
  mkdir -p "$staging"
  "${compose[@]}" run --rm builder build "$release"
  FRONTEND_PLUGIN_OUTPUT_DIR="$staging" "${compose[@]}" run --rm builder build-plugins
  run_tool activate "$release"
  run_tool render
  read_paths
}
case "$action" in
  build|deploy)
    build_image
    [[ "$role" != frontend ]] || build_frontend
    if [[ "$action" == build ]]; then echo "构建完成。运行 ./setup.sh --docker start 启动。"; exit 0; fi
    action=start ;;
  init-db|migrate|export-node)
    [[ "$role" == backend ]] || { echo "此操作请在后端仓库执行。" >&2; exit 2; }
    build_image ;;
esac
runtime_args=(--init --user "$runtime_user" --label "org.everunfold.project=$project_root"
              --label "org.everunfold.component=$role"
              --mount "type=bind,source=$data_dir,target=/data")
if [[ "$role" == backend ]]; then
  workspace_dir="$source_dir"
  [[ -f "$source_dir/config.yaml" ]] || { echo "代码目录缺少根 config.yaml，请重新运行配置助手保存。" >&2; exit 1; }
  runtime_args+=(--mount "type=bind,source=$source_dir,target=/workspace,readonly"
                 -e CONFIG_FILE=/workspace/config.yaml -e EVERUNFOLD_DATA_DIR=/data
                 -e "API_HOST=$listen_host" -e "API_PORT=$listen_port")
else
  workspace_dir="$artifact_dir"
  [[ -s "$artifact_dir/.next/BUILD_ID" ]] || { echo "前端产物未构建，请先执行 build。" >&2; exit 1; }
  runtime_args+=(--mount "type=bind,source=$artifact_dir,target=/workspace"
                 --mount "type=bind,source=$runtime_config,target=/workspace/config.runtime.toml,readonly"
                 --env-file "$env_file.docker" -e CONFIG_FILE=/workspace/config.runtime.toml
                 -e "FRONTEND_PORT=$listen_port" -e "FRONTEND_RECEIVER_PORT=${receiver_ports##*:}")
fi
run_runtime() { run_temporary no "${runtime_args[@]}" "$image_name" "$@"; }
check_runtime() {
  if [[ "$role" == backend ]]; then run_runtime python deploy/runtime_check.py
  else run_runtime node --import tsx /usr/local/lib/everunfold-check.mjs; fi
}
remove_previous() {
  docker container inspect "$container_name" >/dev/null 2>&1 || return 0
  local owner mounted_source mounted_data
  owner="$(docker inspect --format '{{index .Config.Labels "org.everunfold.project"}}' "$container_name")"
  mounted_source="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Source}}{{end}}{{end}}' "$container_name")"
  mounted_data="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}' "$container_name")"
  if [[ "$owner" != "$project_root" && ( "$mounted_source" != "$workspace_dir" || "$mounted_data" != "$data_dir" ) ]]; then
    echo "同名容器不属于此部署且挂载不匹配，请在向导中更换容器名称：$container_name" >&2
    return 1
  fi
  docker stop --time 130 "$container_name" >/dev/null
  docker rm "$container_name" >/dev/null
}
case "$action" in
  init-db)
    run_runtime python deploy/runtime_check.py --initialize
    echo "数据库已就绪。此操作只初始化；执行 ./setup.sh --docker start 启动容器。" ;;
  migrate)
    remove_previous
    run_runtime alembic -c migrations/alembic.ini upgrade head
    run_runtime python -m tools.register_backend_plugins --config /workspace/config.yaml --apply
    check_runtime
    echo "迁移完成。运行 ./setup.sh --docker start 启动。" ;;
  export-node)
    run_runtime python deploy/node_bundle.py
    echo "节点连接文件位于 $data_dir/connections/。" ;;
  check) check_runtime ;;
  start)
    if [[ "$role" == backend ]]; then
      echo "启动准备：检查依赖，并按配置初始化空数据库。"
      run_runtime python deploy/runtime_check.py --prepare
    else
      check_runtime
    fi
    printf '创建容器 %s：%s → /workspace，%s → /data，%s:%s → %s\n' "$container_name" "$workspace_dir" "$data_dir" "$bind_host" "$publish_port" "$listen_port"
    remove_previous
    ports=(-p "$bind_host:$publish_port:$listen_port")
    [[ "$role" != frontend ]] || ports+=(-p "127.0.0.1:$receiver_ports")
    docker create --name "$container_name" --network "$network" --restart unless-stopped \
      --stop-timeout 130 "${ports[@]}" "${runtime_args[@]}" "$image_name" >/dev/null
    connect_extras "$container_name"
    docker start "$container_name"
    if [[ "$role" == frontend ]]; then
      echo "首次同步公开快照前 /health/ready 可能为 503，请完成节点启用及同步。"
    fi
    echo "查看日志：docker logs --tail 100 $container_name" ;;
esac
