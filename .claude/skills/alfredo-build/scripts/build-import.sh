#!/usr/bin/env bash
# Builds one Alfredo workflow from a worktree and opens it for import, leaving info.plist exactly as it was.
# Usage: build-import.sh <worktree> <package>
set -euo pipefail

worktree="$(cd "${1:?worktree path}" && pwd)"
package="${2:?package name}"
plist="$worktree/projects/packages/$package/info.plist"
backup="$(mktemp -t "$package.info.plist")"

cp "$plist" "$backup"
trap 'cp "$backup" "$plist"; rm -f "$backup"' EXIT

cd "$worktree"
NX_WORKSPACE_ROOT_PATH="$worktree" NX_DAEMON=false pnpm exec nx run "$package:build" --skip-nx-cache --output-style=static

cp "$backup" "$plist"
cmp -s "$backup" "$plist"

open "$worktree/dist/$package/esbuild/$package.alfredworkflow"
echo "Opened $package from $(basename "$worktree") on $(git branch --show-current) at $(git rev-parse --short HEAD)"
