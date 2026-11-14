#!/usr/bin/env bash
set -euo pipefail

source_root=/workspace
build_root=/build/work
releases=/releases
plugins=/plugins
export npm_config_cache=/build/npm-cache

validate_release() {
  if [[ ! "${1:-}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$ ]]; then
    echo 'Supply a release ID using letters, digits, dots, hyphens or underscores.' >&2
    exit 2
  fi
}

prepare_source() {
  local kind=$1
  local -a filters=(--exclude=/public/themes/)
  if [[ "$kind" == host ]]; then filters+=(--exclude=/src/plugins/); fi

  mkdir -p "$build_root"
  exec 9>/build/build.lock
  flock 9
  cd "$source_root"
  rsync -rlt --checksum --safe-links --delete --delete-excluded "${filters[@]}" \
    src tools public package.json package-lock.json contracts.lock.json .npmrc .prettierrc.json \
    next.config.ts tsconfig.json tsconfig.plugins.json "$build_root/"
  cd "$build_root"

  local fingerprint
  fingerprint="$(node -p 'process.version + ":" + process.platform + ":" + process.arch'
    npm --version
    sha256sum package.json package-lock.json .npmrc)"
  if [[ ! -x node_modules/.bin/next || ! -f .dependencies ||
        "$(<.dependencies)" != "$fingerprint" ]]; then
    : >.dependencies
    npm ci --ignore-scripts --include=dev --no-audit --prefer-offline
    printf '%s\n' "$fingerprint" >.dependencies
  fi
}

build_host() {
  local version=${1:-}
  validate_release "$version"
  prepare_source host
  if [[ -e "$releases/$version" ]]; then
    printf 'Host release %s already exists. Choose a new ID.\n' "$version" >&2
    exit 2
  fi

  npm run build:host
  test -s .next/BUILD_ID
  (
    candidate="$(mktemp -d "$releases/.$version.XXXXXXXX")"
    trap 'rm -rf -- "$candidate"' EXIT
    # Receiver and inventory resolve their TypeScript imports from the release.
    rsync -a --exclude=/.next/cache/ \
      .next node_modules src tools public package.json package-lock.json contracts.lock.json \
      next.config.ts tsconfig.json tsconfig.plugins.json "$candidate/"
    mkdir -p "$candidate/var/cache"
    rsync -a var/cache/build var/cache/contracts "$candidate/var/cache/"
    mv -T -- "$candidate" "$releases/$version"
    trap - EXIT
  )
  printf 'Host release %s is ready to start.\n' "$version"
}

build_plugins() {
  prepare_source plugins
  local -a arguments=()
  local name
  for name in "$@"; do
    arguments+=(--plugin "$name")
  done
  npm run plugins:build -- --output "$plugins" "${arguments[@]}"
}

start_web() {
  exec node --import tsx tools/plugins/run.mts start --port "${FRONTEND_PORT:-3000}"
}

start_receiver() {
  exec node --import tsx tools/settings-receiver.mts
}

stop_services() {
  trap '' TERM INT
  kill -TERM "${children[@]}" 2>/dev/null || true
  wait "${children[@]}" 2>/dev/null || true
}

serve() {
  local version=${FRONTEND_RELEASE:-}
  validate_release "$version"
  if [[ ! -s "$releases/$version/.next/BUILD_ID" ]]; then
    printf 'Host release %s is missing. Run build-host first.\n' "$version" >&2
    exit 1
  fi
  cd "$releases/$version"
  export NODE_ENV=production EVERUNFOLD_PROJECT_ROOT="$PWD" PLUGINS_DIRECTORY="$plugins"
  children=()
  trap 'stop_services; exit 0' TERM INT
  start_web & children+=("$!")
  start_receiver & children+=("$!")
  local status=0
  wait -n "${children[@]}" || status=$?
  echo 'A frontend process exited; stopping the remaining process.' >&2
  stop_services
  exit "$((status == 0 ? 1 : status))"
}

case "${1:-serve}" in
  build-host) build_host "${2:-}" ;;
  build-plugins) shift; build_plugins "$@" ;;
  serve) serve ;;
  *) exec "$@" ;;
esac
