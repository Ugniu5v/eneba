#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cleanup() {
  trap - INT TERM EXIT
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Starting Go API on :8080 and Next.js on :3000…"
(cd "$ROOT/backend" && go run ./cmd/api) &
(cd "$ROOT/frontend" && npm run dev) &
wait
