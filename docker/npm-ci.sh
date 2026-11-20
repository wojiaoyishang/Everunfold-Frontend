#!/usr/bin/env bash
set -euo pipefail

options=(--ignore-scripts --include=dev --no-audit --prefer-offline --loglevel=verbose --timing)
if [[ -z "${EVERUNFOLD_NPM_REGISTRY:-}" ]]; then
  exec npm ci "${options[@]}"
fi

export npm_config_registry="$EVERUNFOLD_NPM_REGISTRY"
# npm 10 does not preserve registry path prefixes when replacing lockfile URLs.
# Rewrite only npmjs tarball locations in this disposable build workspace.
export npm_config_replace_registry_host=never
original=$(mktemp .package-lock.XXXXXXXX)
if ! cp -p package-lock.json "$original"; then
  rm -f -- "$original"
  exit 1
fi
trap 'mv -f -- "$original" package-lock.json' EXIT
node --input-type=module - "$original" >package-lock.json <<'JS'
import { readFileSync } from 'node:fs';
const officialRegistry = 'https://registry.npmjs.org/';
const mirror = new URL(process.env.npm_config_registry.replace(/\/?$/, '/'));
if (!['https:', 'http:'].includes(mirror.protocol) ||
    mirror.username || mirror.password || mirror.search || mirror.hash) {
  throw new Error('The npm mirror must be an HTTP(S) URL without credentials or query parameters.');
}
const lockfile = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const pkg of Object.values(lockfile.packages)) {
  if (typeof pkg.resolved === 'string' && pkg.resolved.startsWith(officialRegistry)) {
    pkg.resolved = new URL(pkg.resolved.slice(officialRegistry.length), mirror).href;
  }
}
process.stdout.write(JSON.stringify(lockfile));
JS
npm ci "${options[@]}"
