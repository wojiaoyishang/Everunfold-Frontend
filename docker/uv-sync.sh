#!/bin/sh
set -eu

if [ -z "${EVERUNFOLD_PYPI_INDEX:-}" ]; then
    exec uv sync --locked --no-dev
fi

requirements=$(mktemp)
trap 'rm -f "$requirements"' EXIT
# Keep the official lockfile and its hashes. Passing a different index to "uv sync"
# directly changes the source identity recorded in uv.lock.
uv export --locked --no-dev --no-emit-project --no-header --output-file "$requirements" >/dev/null
uv venv "$UV_PROJECT_ENVIRONMENT"
uv pip sync --python "$UV_PROJECT_ENVIRONMENT/bin/python" --require-hashes \
    --default-index "$EVERUNFOLD_PYPI_INDEX" "$requirements"
