---
name: netcomplex-notebooklm
description: Generate multi-format community knowledge content for the Netcomplex Resource Hub using notebooklm-py. Use this skill whenever the user wants to turn a research topic, board meeting, YouTube tutorial, PDF, or set of source URLs into a packaged knowledge bundle — audio overview, mind map, flashcards, and infographic — ready to publish in the Netcomplex community app. Triggers on phrases like "create a knowledge bundle for…", "package this research for the hub", "make a podcast + mindmap + flashcards from…", "NotebookLM this topic", or any request to produce multiple artifact types from a single source set for the Soralia Village / Netcomplex community.
---

# Netcomplex NotebookLM Workflow

Turn a research question or set of sources into a **multi-format knowledge bundle** for the Netcomplex Resource Hub. The bundle is what gets attached to a `ContentList` entry (article in the Knowledge Base) and surfaced to residents.

This skill is **project-specific**. It does not try to be a general notebooklm-py reference. For commands not covered here, the official `notebooklm` CLI help is the source of truth (`notebooklm <command> --help`).

## What "done" looks like

A knowledge bundle for the Netcomplex Hub is **four artifacts** in `out/<notebook-slug>/`:

| Artifact                 | File              | Source notebooklm command                                       | Typical wait   |
| ------------------------ | ----------------- | --------------------------------------------------------------- | -------------- |
| Audio overview (podcast) | `audio.mp3`       | `generate audio`                                                | 10–20 min      |
| Mind map (JSON)          | `mindmap.json`    | `generate mind-map`                                             | instant (sync) |
| Flashcards               | `flashcards.md`   | `generate flashcards` → `download flashcards --format markdown` | 5–15 min       |
| Infographic              | `infographic.png` | `generate infographic` → `download infographic`                 | 5–15 min       |

Plus a `notebook.json` and `sources.txt` for traceability. All four artifacts are uploaded/linked into a single `ContentList` row by the calling workflow.

## The Workflow (canonical)

```
1. Auth check       →  2. Create notebook  →  3. Add sources
                                                       ↓
                                       5. Fire 4 generations  →  6. Spawn 4 subagent waits
                                                       ↑                    ↓
4. Wait sources ready (subagent)  ←  ←  ←  ←  ←  ←  ←  ←  download artifacts
```

Steps 1–3 are blocking and short (< 1 min total when sources are URLs/short text).
Step 4 is the first parallel point (sources can be added in parallel to waiting).
Steps 5–6 are where you **fire all four generations and immediately return** to the user. Subagents handle the long waits + downloads in the background.

### Step 1 — Auth check (graceful)

Always run this first. If it fails, the user is not set up and the rest of the workflow cannot proceed.

```bash
notebooklm auth check --test --json
```

**Required:** both `"status": "ok"` AND `"checks.token_fetch": true`. A bare `"status": "ok"` without `--test` is a false positive — stale cookies parse fine but don't authenticate.

If it fails, **do not** try to run a research/generation command. Instead, tell the user:

> NotebookLM isn't authenticated in this environment. Run `notebooklm login` in your terminal — it opens a browser for a one-time Google sign-in. After it finishes, re-run this task.

### Step 2 — Create the notebook

```bash
notebooklm create "<Title>" --json
```

Pick the title from the user's request. Slugify it for the `out/` directory:

```bash
echo "Community Garden Watering Guide" | tr '[:upper:] ' '[:lower:]-'
# → community-garden-watering-guide
```

Parse the notebook ID with `jq -r .notebook.id` and save it:

```bash
NOTEBOOK_ID=$(notebooklm create "..." --json | jq -r .notebook.id)
echo "$NOTEBOOK_ID" > out/<slug>/notebook.json  # wraps as {"id":"…"}
```

### Step 3 — Add sources

There are three source flavors, often used in combination:

| User input                               | Command                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| URL (web page or YouTube)                | `notebooklm source add "https://..." --json`                                                |
| Local file (PDF, docx, md, audio, video) | `notebooklm source add ./file.pdf --json`                                                   |
| Raw text                                 | `notebooklm source add --text "..." --title "..." --json` (rarely used; prefer a temp file) |

Capture each source ID with `jq -r .source.id`. If the user gave several sources (typical: 2–10), add them sequentially — `notebooklm source add` is a single-source command. The `--json` envelope is `{"source": {"id": "...", ...}}`.

**Source limits vary by plan** (Standard 50 / Plus 100 / Pro 300 / Ultra 600 per notebook). The CLI does not enforce this; Google does. If the user is on Standard, a "too many sources" error from Google is the failure mode.

### Step 4 — Wait for sources to be ready (subagent, optional)

Sources must be `ready` before generation. This is **the first place to use a subagent** if the user added several files (not just URLs):

```
Task(
  prompt="Wait for these sources in notebook {NOTEBOOK_ID} to be ready: {ids}.
          For each: notebooklm source wait {id} -n {NOTEBOOK_ID} --timeout 600
          Report which are ready and which failed. Do not download anything.",
  subagent_type="general-purpose"
)
```

URLs usually process in 10–60 seconds. Large PDFs or videos can take 1–10 minutes.

If the user only added 1–2 URLs, you can skip the subagent and just `notebooklm source list --json` to check.

### Step 5 — Fire all four generations (no waiting)

This is the core parallelization point. **Fire them all with `--json` and capture the `task_id` from each.** Do not pass `--wait`. Do not poll.

```bash
# 1. Audio (longest, 10-20 min)
TASK_AUDIO=$(notebooklm generate audio "Focus on what residents need to know and do" --json | jq -r .task_id)

# 2. Mind map (synchronous-ish, returns quickly)
TASK_MINDMAP=$(notebooklm generate mind-map --json | jq -r .task_id)

# 3. Flashcards
TASK_FLASHCARDS=$(notebooklm generate flashcards --quantity standard --difficulty medium --json | jq -r .task_id)

# 4. Infographic
TASK_INFOGRAPHIC=$(notebooklm generate infographic --orientation portrait --detail standard --json | jq -r .task_id)

# Save all four IDs for the subagent step
cat > out/<slug>/tasks.json <<EOF
{"audio":"$TASK_AUDIO","mindmap":"$TASK_MINDMAP","flashcards":"$TASK_FLASHCARDS","infographic":"$TASK_INFOGRAPHIC"}
EOF
```

> If a generation returns `"status": "completed"` immediately (rare for audio/infographic, common for mind-map), grab the URL from that response and download it inline — no need to spawn a subagent for it.

### Step 6 — Spawn ONE subagent to wait + download all four

Spawn a single subagent with all four task IDs and the downloads list. This keeps the main agent free for the user to do other work.

```
Task(
  prompt="In notebook {NOTEBOOK_ID}, wait for these four artifacts to complete and download them to out/<slug>/:

  1. audio       task_id={TASK_AUDIO}
     wait:   notebooklm artifact wait {TASK_AUDIO} -n {NOTEBOOK_ID} --timeout 1500
     dl:     notebooklm download audio  ./out/<slug>/audio.mp3 -a {TASK_AUDIO} -n {NOTEBOOK_ID}

  2. mindmap     task_id={TASK_MINDMAP}
     wait:   notebooklm artifact wait {TASK_MINDMAP} -n {NOTEBOOK_ID} --timeout 300
     dl:     notebooklm download mind-map ./out/<slug>/mindmap.json -a {TASK_MINDMAP} -n {NOTEBOOK_ID}

  3. flashcards  task_id={TASK_FLASHCARDS}
     wait:   notebooklm artifact wait {TASK_FLASHCARDS} -n {NOTEBOOK_ID} --timeout 900
     dl:     notebooklm download flashcards --format markdown ./out/<slug>/flashcards.md -a {TASK_FLASHCARDS} -n {NOTEBOOK_ID}

  4. infographic task_id={TASK_INFOGRAPHIC}
     wait:   notebooklm artifact wait {TASK_INFOGRAPHIC} -n {NOTEBOOK_ID} --timeout 900
     dl:     notebooklm download infographic ./out/<slug>/infographic.png -a {TASK_INFOGRAPHIC} -n {NOTEBOOK_ID}

  Exit codes: 0 = ok, 1 = error, 2 = timeout.
  For each artifact: report whether it completed, downloaded, and the final file size.
  Do not retry on failure — just report so the user can decide."
  subagent_type="general-purpose"
)
```

> Use **explicit `-n <NOTEBOOK_ID>` on every command in the subagent.** The `notebooklm use <id>` shortcut stores context in `~/.notebooklm/context.json` and is unsafe across parallel agents — the official skill flags this explicitly.

## Output style

When running this workflow, talk to the user like this:

- "Creating notebook 'Community Garden Watering Guide'..." (one-line per step, not chatty)
- "Adding 3 sources (2 URLs, 1 PDF)..."
- "Firing 4 generations: audio (10-20 min), mindmap (sync), flashcards, infographic. Returning control to you."
- "Subagent spawned. I'll report back when the bundle is ready."

When the subagent reports back, summarize in a table:

| Artifact    | Status    | File                                   | Size    |
| ----------- | --------- | -------------------------------------- | ------- |
| Audio       | ✓         | `out/community-garden/audio.mp3`       | 12.4 MB |
| Mind map    | ✓         | `out/community-garden/mindmap.json`    | 8 KB    |
| Flashcards  | ✗ timeout | —                                      | —       |
| Infographic | ✓         | `out/community-garden/infographic.png` | 1.2 MB  |

If something failed, the user gets to decide: retry, skip, investigate.

## Error handling (Netcomplex-specific)

| Error                                            | Cause                                | Action                                                                                        |
| ------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `notebooklm: command not found`                  | Package not installed                | Tell the user to run `pip install "notebooklm-py[browser]"` and `playwright install chromium` |
| `auth check --test` returns `token_fetch: false` | Stale or missing cookies             | Tell user to run `notebooklm login`                                                           |
| `GENERATION_FAILED` on audio/infographic         | Google rate limit                    | Surface to user; suggest waiting 10 min and retrying just that artifact. Don't auto-retry.    |
| `notebooklm artifact wait` exit code 2           | Timeout (artifact still in_progress) | Subagent reports; user can choose to extend timeout or check later                            |
| `source add` returns no `source.id`              | Bad response envelope                | Re-run without `--json` to see what happened, then decide                                     |

## When NOT to use this skill

- User wants to **chat** with existing sources (use the `notebooklm ask` pattern directly, not the bundle workflow).
- User wants a **single artifact** (e.g., just a podcast) — fire one generation, no need for the full bundle.
- User wants to **edit/rename/delete** an existing notebook — these are simple CLI commands; the skill overhead is wasted.
- The work is **research-only** (find sources, summarize) — use `notebooklm source add-research --mode deep` with a subagent; no artifacts needed.

For those cases, just use the `notebooklm` CLI directly with its `--help`.

## Quick reference

```bash
# Auth
notebooklm auth check --test --json

# Notebook + sources
notebooklm create "Title" --json
notebooklm source add "https://..." --json
notebooklm source add ./file.pdf --json
notebooklm source list --json
notebooklm source wait <id> -n <nb> --timeout 600

# Fire-and-forget generations (all return task_id)
notebooklm generate audio    "instructions"      --json
notebooklm generate mind-map                     --json
notebooklm generate flashcards --quantity standard --difficulty medium --json
notebooklm generate infographic --orientation portrait --detail standard --json

# Subagent wait + download (per artifact)
notebooklm artifact wait <task_id> -n <nb> --timeout 1500
notebooklm download audio       ./out/x.mp3        -a <id> -n <nb>
notebooklm download mind-map    ./out/x.json        -a <id> -n <nb>
notebooklm download flashcards  --format markdown ./out/x.md -a <id> -n <nb>
notebooklm download infographic ./out/x.png        -a <id> -n <nb>

# Always pass -n <NOTEBOOK_ID> explicitly in subagent / parallel contexts.
```

## Notes

- The notebooklm CLI uses Google's internal, undocumented APIs. Treat any "RPC error" as transient. The `notebooklm auth refresh` command (cheaper, server-side) often unsticks a stale session before a full re-login is needed.
- The `--kind` flag for mind-map is in flux (`note-backed` vs `interactive`); in v0.6.0 the default is `note-backed`. The skill's command works with both.
- For long prompts (audio instructions, custom report text), use `--prompt-file PATH` rather than passing the text inline — the shell line length is a real limit.
- Always read sources with `--json` and parse with `jq`. The envelopes are stable: `create` → `.notebook.id`, `source add` → `.source.id`, `generate` → `.task_id`, `ask` → `.answer` + `.references[].source_id`.
