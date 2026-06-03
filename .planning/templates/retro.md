# Milestone Retro Template

**Milestone:** M\_ — {Name}
**Date:** {YYYY-MM-DD}
**Author:** {whoever runs the retro}
**Verifiable spec:** {link to MILESTONES.md §2 verifiable line}

---

## 1. What we said we'd deliver

{Copy the milestone's "Goal" + "Verifiable" lines from MILESTONES.md §2.}

## 2. What we actually delivered

{For each Verifiable criterion: pass / fail / partial + evidence.}

- [ ] {Criterion 1}: {pass/fail/partial} — {evidence: test output, URL, manual test}
- [ ] {Criterion 2}: {pass/fail/partial} — {evidence}
- [ ] {Criterion 3}: {pass/fail/partial} — {evidence}

## 3. Velocity data

{From CADENCE.md or directly from git log.}

- Plans shipped: {N} of {M} planned
- Phases shipped: {N} of {M} planned
- Wall-clock duration: {start date} → {end date} ({N weeks})
- Active days: {N} of {M total days}
- Peak day: {date} ({N} plans)
- Burst pattern: {describe}

## 4. What worked

{2–4 bullets. Specific behaviors, tools, or decisions that paid off.}

- {e.g., "Wave-based plan execution kept the diff small"}
- {e.g., "Worktree isolation prevented collision with the dev branch"}

## 5. What didn't work

{2–4 bullets. Honest about process gaps. Reference gap IDs from MILESTONES.md if applicable.}

- {e.g., "M3 milestone had 10 phases; in retrospect M3a/M3b split would have been clearer (Gap C2)"}
- {e.g., "Status drift on Phase 33/38/40 went undetected (Gap ζ → S4)"}

## 6. Carry-over to next milestone

{Concrete items, not vague intentions.}

- [ ] {item 1}
- [ ] {item 2}
- [ ] {item 3}

## 7. Process changes for next milestone

{Policies or rituals to add/change in AGENTS.md or this template.}

- {e.g., "Add pre-commit hook for status drift (Gap S4)"}
- {e.g., "Tag the milestone on main after retro is written (Gap N3)"}
