#!/usr/bin/env bash
# Compatibility entrypoint. Render only needs the files under backend/.
set -euo pipefail
PROVISION_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
exec bash "$PROVISION_ROOT/backend/scripts/deployment/provision-demo-academy.sh" "$@"
