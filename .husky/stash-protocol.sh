#!/usr/bin/env bash
# Stash ownership protocol check — AGENTS.md §"Stash Ownership Protocol"
#
# Warns (does not block) when any git stash lacks the required `owner=`
# field. Lint-staged's "automatic backup" stashes are exempt — those are
# created when prettier/eslint auto-fix a staged file, and the post-commit
# hook drops them automatically once the commit succeeds.
#
# Also warns for session-end stashes that should be dropped before the
# next session boundary.
#
# Called from .husky/pre-commit. Safe to run manually:
#   bash .husky/stash-protocol.sh

set +e

stash_list=$(git stash list 2>/dev/null)
[ -z "$stash_list" ] && exit 0

# 1. Stashes missing owner= (excluding lint-staged auto-backups)
violators=$(echo "$stash_list" | grep -v 'owner=' | grep -v 'lint-staged automatic backup')
if [ -n "$violators" ]; then
  echo ""
  echo "  Stash ownership violation (owner= required by AGENTS.md):"
  echo "$violators" | sed 's/^/    /'
  echo "  → Either drop the stash, or rewrite with: git stash push -m \"owner=<id>:<intent>:<expiry>\""
fi

# 2. Session-end stashes that should be dropped before next session.
# Per AGENTS.md §"Stash Ownership Protocol", the format is
# `owner=<id>:<intent>:<expiry>` — so session-end appears as the final
# colon-separated field of the stash message.
expired=$(echo "$stash_list" | grep -E ':(session-end|manual|[0-9]{4}-[0-9]{2}-[0-9]{2})$')
if [ -n "$expired" ]; then
  echo ""
  echo "  Stashes with explicit expiry (review per AGENTS.md):"
  echo "$expired" | sed 's/^/    /'
  echo "  → session-end: drop before next session. manual: needs owner sign-off. YYYY-MM-DD: review at expiry."
fi

exit 0
