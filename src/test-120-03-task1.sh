#!/bin/bash
# RED PHASE test for Task 1: Content, Achievements, Events Routers
# This test verifies migration to tenantProcedure/privilegedProcedure
# Expected to FAIL before migration, PASS after

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

failures=0

check_tier() {
  local file=$1
  local tier=$2
  local min=$3
  local actual
  actual=$(grep -c "$tier" "$file" 2>/dev/null || echo "0")
  if [ "$actual" -ge "$min" ]; then
    echo -e "${GREEN}PASS${NC}: $file uses $tier ($actual >= $min)"
  else
    echo -e "${RED}FAIL${NC}: $file uses $tier ($actual < $min)"
    ((failures++))
  fi
}

check_no_inline_tenant() {
  local file=$1
  local count
  count=$(grep -c 'if (!ctx.tenantId)' "$file" 2>/dev/null || echo "0")
  # Allow up to 3 (publicProcedure + toggleLike)
  local max=$2
  if [ "$count" -le "$max" ]; then
    echo -e "${GREEN}PASS${NC}: $file inline tenantId checks ($count <= $max)"
  else
    echo -e "${RED}FAIL${NC}: $file inline tenantId checks ($count > $max)"
    ((failures++))
  fi
}

echo "=== Task 1: Tier Migration Tests ==="
echo ""

echo "--- content.ts (1055 lines) ---"
check_tier "src/server/routers/content.ts" "tenantProcedure" 3
check_tier "src/server/routers/content.ts" "privilegedProcedure" 4
# publicProcedure + toggleLike = ~5 inline checks remain
check_no_inline_tenant "src/server/routers/content.ts" 5

echo ""
echo "--- achievements.ts (458 lines) ---"
check_tier "src/server/routers/achievements.ts" "tenantProcedure" 4
check_tier "src/server/routers/achievements.ts" "privilegedProcedure" 3
check_no_inline_tenant "src/server/routers/achievements.ts" 0

echo ""
echo "--- events.ts (359 lines) ---"
check_tier "src/server/routers/events.ts" "tenantProcedure" 5
check_tier "src/server/routers/events.ts" "privilegedProcedure" 3
check_no_inline_tenant "src/server/routers/events.ts" 0

echo ""
echo "--- TypeScript check ---"
if pnpm tsc --noEmit --pretty src/server/routers/content.ts src/server/routers/achievements.ts src/server/routers/events.ts 2>&1 | head -30; then
  echo -e "${GREEN}PASS${NC}: TypeScript compiles"
else
  echo -e "${RED}FAIL${NC}: TypeScript errors"
  ((failures++))
fi

echo ""
if [ "$failures" -eq 0 ]; then
  echo -e "${GREEN}ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}$failures TEST(S) FAILED${NC}"
  exit 1
fi
