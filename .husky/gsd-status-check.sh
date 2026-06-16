#!/usr/bin/env bash
# Pre-commit status drift check for GSD planning docs.
#
# Runs gsd-sdk query validate.health and fails the commit if any
# errors or warnings are present. INFO items (advisory) are allowed.
#
# This enforces the "status drift rule" codified in AGENTS.md:
# a phase marked Complete must have a SUMMARY.md. ROADMAP.md status
# must match the actual artifacts in .planning/phases/.
#
# Triggered by lint-staged when files under .planning/**/*.md change.
# See package.json -> "lint-staged" -> ".planning/**/*.md".

set -euo pipefail

output=$(gsd-sdk query validate.health 2>&1)
status=$(echo "$output" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    errors = len(d.get('errors', []))
    warnings = len(d.get('warnings', []))
    info = len(d.get('info', []))
    print(f'errors={errors} warnings={warnings} info={info}')
    if errors > 0:
        sys.exit(1)
except json.JSONDecodeError as e:
    print(f'PARSE_ERROR: {e}', file=sys.stderr)
    sys.exit(2)
" 2>&1) || {
  echo "  GSD status drift detected:"
  echo ""
  echo "$output" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    for sev in ('errors', 'warnings'):
        for item in d.get(sev, []):
            print(f\"  [{sev[:-1].upper()}] {item.get('code', '')}: {item.get('message', '')}\")
except Exception:
    pass
" 2>&1 || echo "  (could not parse output)"
  echo ""
  echo "  Fix the drift before committing. See:"
  echo "    - AGENTS.md (Status drift rule)"
  echo "    - .planning/MILESTONES.md (Section 7.1)"
  echo "    - .planning/STATE.md (current position)"
  echo ""
  exit 1
}

echo "  gsd-status-check: $status"
exit 0
