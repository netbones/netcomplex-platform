#!/usr/bin/env bash
# Steiger FSD architecture check on staged changes.
# Runs the full scan (Steiger does not yet support per-file scanning).
# Exits early if no FSD-relevant files are staged.
set -euo pipefail

# Only run when FSD-relevant files are staged (src/**, steiger.config.js, package.json).
staged=$(git diff --cached --name-only -- 'src/**' 'steiger.config.js' 'package.json' 2>/dev/null || true)
if [ -z "${staged}" ]; then
  echo "steiger-staged: no FSD-relevant files staged, skipping"
  exit 0
fi

echo "steiger-staged: scanning $(echo "${staged}" | wc -l) staged file group(s)"
pnpm fsd:check
