#!/usr/bin/env bash
# One fixed operation, requested by the interactive assistant. No command text
# from the container is ever evaluated by the host.
set -euo pipefail
bridge=$1
launcher=$2
cleanup() { rm -f -- "$bridge/alive"; }
trap cleanup EXIT
touch "$bridge/alive"
while [[ -d "$bridge" ]]; do
  if [[ -f "$bridge/request" ]]; then
    request=$(cat "$bridge/request")
    rm -f -- "$bridge/request"
    status=2
    if [[ "$request" == export-node ]]; then
      status=0
      EVERUNFOLD_SETUP_RESULT_FILE="$bridge/path" \
        bash "$launcher" export-node >"$bridge/output.log" 2>&1 || status=$?
    fi
    printf '%s\n' "$status" >"$bridge/status.tmp"
    mv -- "$bridge/status.tmp" "$bridge/status"
  fi
  sleep 0.2
done
