#!/usr/bin/env bash
set -euo pipefail

printf 'Everunfold Frontend | runtime image %s | mode %s\n' "${EVERUNFOLD_IMAGE_REVISION:-unknown}" "${1:-deploy}"

source_root=/workspace
build_root=/build/work
output=/output
export npm_config_cache=/build/npm-cache

build_log() {
  printf '[build] %s\n' "$*"
}

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

  build_log "Copying sources from $source_root."
  mkdir -p "$build_root"
  cd "$source_root"
  rsync -rlt --safe-links "${filters[@]}" \
    src tools public package.json package-lock.json contracts.lock.json .npmrc .prettierrc.json \
    next.config.ts tsconfig.json tsconfig.plugins.json "$build_root/"
  cd "$build_root"

  build_log "Installing locked npm dependencies; download cache: $npm_config_cache."
  /usr/local/bin/everunfold-npm-ci
}

build() {
  local version=${1:-}
  validate_release "$version"
  if [[ -e "$output/$version" ]]; then
    printf 'Host release %s already exists. Choose a new ID.\n' "$version" >&2
    exit 2
  fi

  prepare_source host
  build_log 'Preparing contracts and assets, then compiling Next.js.'
  npm run build:host
  test -s .next/BUILD_ID
  build_log "Exporting the build to $output/$version."
  (
    candidate="$(mktemp -d "$output/.$version.XXXXXXXX")"
    trap 'rm -rf -- "$candidate"' EXIT
    # Receiver and inventory resolve their TypeScript imports from the release.
    rsync -a --exclude=/.next/cache/ \
      .next node_modules src tools public package.json package-lock.json contracts.lock.json \
      next.config.ts tsconfig.json tsconfig.plugins.json "$candidate/"
    mkdir -p "$candidate/var/cache"
    rsync -a var/cache/build var/cache/contracts "$candidate/var/cache/"
    mv -T --no-clobber -- "$candidate" "$output/$version"
    test ! -d "$candidate"
    trap - EXIT
  )
  build_log "Build complete: $output/$version."
}

build_plugins() {
  prepare_source plugins
  local -a arguments=()
  local name
  for name in "$@"; do
    arguments+=(--plugin "$name")
  done
  build_log 'Preparing pinned contracts, then compiling and publishing plugin packages.'
  npm run plugins:build -- --output /plugins "${arguments[@]}"
  build_log 'Plugin build complete.'
}

report_build_exit() {
  local status=$?
  if (( status != 0 )); then
    printf '[build] Failed with exit code %s.\n' "$status" >&2
  fi
}

deploy() {
  cd "$source_root"
  if [[ ! -s .next/BUILD_ID || ! -x node_modules/.bin/next ]]; then
    echo 'Mount a successfully built artifact at /workspace before deploying.' >&2
    exit 1
  fi
  export NODE_ENV=production EVERUNFOLD_PROJECT_ROOT="$PWD" PLUGINS_DIRECTORY=/data/plugins
  exec node --import tsx tools/plugins/run.mts start
}

case "${1:-deploy}" in
  build) trap report_build_exit EXIT; build "${2:-}" ;;
  build-plugins) trap report_build_exit EXIT; shift; build_plugins "$@" ;;
  deploy) deploy ;;
  *) exec "$@" ;;
esac
