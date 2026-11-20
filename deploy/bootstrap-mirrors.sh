# Sourced by launcher.sh before the Python assistant image exists.
# The checked-in catalog contains only static shell assignments.
source "$deploy_dir/mirror-presets.env"

declare -A saved_mirrors=()
mirror_cache="$(dirname -- "$CONFIG_FILE")/.$(basename -- "$CONFIG_FILE").build-mirrors.env"
if [[ -f "$mirror_cache" ]]; then
  while IFS='=' read -r key value; do
    case "$key" in
      EVERUNFOLD_PYTHON_IMAGE|EVERUNFOLD_UV_IMAGE|EVERUNFOLD_PYPI_INDEX)
        saved_mirrors["$key"]=$value ;;
    esac
  done < "$mirror_cache"
fi

bootstrap_mirror_args=()
bootstrap_mirror_env=()
for key in EVERUNFOLD_PYTHON_IMAGE EVERUNFOLD_UV_IMAGE EVERUNFOLD_PYPI_INDEX; do
  value=${saved_mirrors[$key]:-}
  if [[ "$key" == EVERUNFOLD_PYPI_INDEX && -v EVERUNFOLD_MIRROR_PROFILE ]]; then
    case "$EVERUNFOLD_MIRROR_PROFILE" in
      official|custom) value= ;;
      tuna|ustc)
        preset_key="${EVERUNFOLD_MIRROR_PROFILE}_$key"
        value=${!preset_key} ;;
      *) echo "容器软件源方案无效，请选择 official、tuna、ustc 或 custom。" >&2; exit 2 ;;
    esac
  fi
  if [[ -v "$key" ]]; then
    value=${!key}
    bootstrap_mirror_env+=(-e "$key")
  fi
  [[ -n "$value" ]] || continue
  if [[ "$key" == EVERUNFOLD_PYPI_INDEX ]]; then
    if [[ ! "$value" =~ ^https?://[^[:space:]@?#]+$ ]]; then
      echo "PyPI 镜像须为不含凭据、查询串或片段的 HTTP/HTTPS 地址。" >&2; exit 2
    fi
  elif [[ ! "$value" =~ ^[A-Za-z0-9][A-Za-z0-9._:/-]*(@sha256:[a-f0-9]{64})?$ ]]; then
    echo "基础镜像引用格式无效。" >&2; exit 2
  fi
  bootstrap_mirror_args+=(--build-arg "$key=$value")
done
for key in EVERUNFOLD_MIRROR_PROFILE EVERUNFOLD_APT_MIRROR EVERUNFOLD_APT_SECURITY_MIRROR EVERUNFOLD_NPM_REGISTRY EVERUNFOLD_NODE_IMAGE; do
  if [[ -v "$key" ]]; then bootstrap_mirror_env+=(-e "$key"); fi
done
