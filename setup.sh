#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-}" in
  --docker) shift; exec "$project_root/deploy/launcher.sh" "$@" ;;
  --native) exec "$project_root/deploy/launcher.sh" "$@" ;;
  "")
    [[ -t 0 && -t 1 ]] || { echo "用法：./setup.sh --docker 或 ./setup.sh --native" >&2; exit 2; }
    printf '\n\033[1;36mEverunfold · 部署方式\033[0m\n1. Docker\n2. 不使用 Docker\n'
    read -r -p "请选择 [1]: " choice
    case "${choice:-1}" in
      1) exec "$project_root/deploy/launcher.sh" ;;
      2) exec "$project_root/deploy/launcher.sh" --native ;;
      *) echo "请选择 1 或 2。" >&2; exit 2 ;;
    esac
    ;;
  *) echo "用法：./setup.sh [--docker|--native] [configure|build|start|check|init-db|migrate|export-node]" >&2; exit 2 ;;
esac
