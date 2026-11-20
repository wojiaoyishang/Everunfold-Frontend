#!/bin/sh
set -eu

if [ -n "${EVERUNFOLD_APT_MIRROR:-}${EVERUNFOLD_APT_SECURITY_MIRROR:-}" ]; then
    sources=${1:-/etc/apt/sources.list.d/debian.sources}
    updated=$(mktemp)
    trap 'rm -f "$updated"' EXIT
    awk '
        $1 == "URIs:" && $2 ~ /^https?:\/\/(deb|security)\.debian\.org\/debian-security\/?$/ {
            if (ENVIRON["EVERUNFOLD_APT_SECURITY_MIRROR"] != "") {
                $0 = "URIs: " ENVIRON["EVERUNFOLD_APT_SECURITY_MIRROR"]
                security = 1
            }
        }
        $1 == "URIs:" && $2 ~ /^https?:\/\/deb\.debian\.org\/debian\/?$/ {
            if (ENVIRON["EVERUNFOLD_APT_MIRROR"] != "") {
                $0 = "URIs: " ENVIRON["EVERUNFOLD_APT_MIRROR"]
                main = 1
            }
        }
        { print }
        END {
            if ((ENVIRON["EVERUNFOLD_APT_MIRROR"] != "" && !main) ||
                (ENVIRON["EVERUNFOLD_APT_SECURITY_MIRROR"] != "" && !security)) exit 1
        }
    ' "$sources" >"$updated" || {
        echo 'Unable to locate the configured Debian Bookworm APT sources.' >&2
        exit 1
    }
    cat "$updated" >"$sources"
fi
