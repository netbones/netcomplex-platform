# Phase 36: Survey Builder - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a Google Forms-like survey/question builder in the admin panel. This covers creating and editing surveys with rich question types, sections, media, and drag-and-drop reordering. The existing answer-taking flow and results pages are already built (Phase 24).

**In scope:**
- Dedicated `/admin/surveys/[id]/edit` builder page
- 6 question types for launch
- Accordion/collapsible sections
- Image support in questions and sections
- Drag-and-drop question reordering
- Metadata tags for organizing surveys

**Not in scope (deferred):**
- File upload question type
- Video in questions
- Focus Space deep integration for surveys
- Import questions from other sources
- Focus-area-specific survey display (future enhancement)

</domain>

<decisions>
## Implementation Decisions

### Builder Layout
- **Dedicated full-page route:** `/admin/surveys/[id]/edit`
- The existing Focus Space sidebar and mobile bottom bar remain untouched
- Builder structure: scrollable question preview area + question palette accessed via a "+" button (FAB or toolbar strip)
- Google Forms-style mental model: what you see on the edit page is close to what respondents see
- Drag-and-drop for reordering questions within the builder

### Question Types (Launch — 6 types)
| Type | Database Value | UI Widget |
|------|---------------|-----------|
| Multiple choice | `SINGLE_CHOICE` | Radio buttons (or dropdown — see displayAs) |
| Checkbox | `MULTIPLE_CHOICE` | Checkboxes |
| Short answer / Paragraph | `TEXT` | Single-line or textarea (controlled by config) |
| Star rating | `RATING` | 1-5 star interactive widget |
| Yes / No | `YES_NO` | Two radio options (keep as dedicated type) |
| Linear scale | `LINEAR_SCALE` | 1-N scale with optional endpoint labels |

- `SINGLE_CHOICE` supports a `displayAs` config field: `'radio' | 'dropdown'` — dropdown renders same data as a `<select>` instead of radio buttons
- `YES_NO` kept as a dedicated type (not collapsed into SINGLE_CHOICE) — convenience for admins
- Checkbox grid excluded; `MULTIPLE_CHOICE` with many options covers the same use case
- File upload type excluded for this phase

### Rich Content
- **Images are in scope** for questions and section headers
- **Video is deferred** to a future phase
- TipTap is available for rich text in descriptions (already in the tech stack)
- Media can be embedded inline in question/section descriptions via rich text

### Section Behavior
- **Accordion/collapsible sections** within a single scrollable page
- NOT Google Forms-style page-breaks (no multi-page navigation for respondents)
- Sections can have a title, description, and optional image
- Questions belong to a section; sections are reorderable

### Question Config Storage
- **`options[]` column stays** on the `Question` model (String[]) — used for choice-type question options
- **New `config: Json` column** added to the `Question` model — stores type-specific settings as JSONB:

```jsonc
// SINGLE_CHOICE with dropdown display
{ "displayAs": "dropdown" }

// TEXT type
{ "charLimit": 500, "isParagraph": true }

// LINEAR_SCALE
{ "minValue": 1, "maxValue": 10, "minLabel": "Not likely", "maxLabel": "Very likely" }

// RATING
{ "maxStars": 5 }
```

- This avoids schema migrations when adding new question type features
- The `options[]` column + `config` JSONB together cover all type-specific data

### Survey Model Enhancements
- Add `config: Json` column to Survey model for metadata tags
- Tags can include focus area labels (e.g., `"tags": ["services", "community"]`) for future filtering
- No deep Focus Space integration yet

### Import Questions
- **Deferred** — not in this phase scope
- Noted as a future upgrade possibility

### Responsive Considerations
- The builder page must work within the existing mobile bottom bar and Focus Space sidebar
- Question type palette adapts to smaller screens (likely a bottom sheet on mobile vs sidebar on desktop)

### Claude's Discretion
- Exact drag-and-drop implementation approach (@dnd-kit recommended but implementer can evaluate)
- Loading skeleton design
- Error state handling
- Mobile adaptation details for the builder (bottom sheet vs modal palette)
- Exact color, spacing, and typography choices
- Empty state copy for sections with no questions

</decisions>

<specifics>
## Specific Ideas

- "I like how Google Forms shows the floating + button to add questions without disrupting your view of the form"
- Builder should feel like you're building the form the respondent will see — WYSIWYG mental model
- Linear scale should feel familiar: labeled endpoints, clickable number bubbles

</specifics>

<deferred>
## Deferred Ideas

- **File upload question type** — future expansion
- **Video in questions** — future expansion
- **Focus Space survey integration** (showing relevant surveys in a Focus Space) — future phase
- **Import questions** from CSV, Google Forms, etc. — future enhancement
- **Focus-area-specific survey targeting** — future enhancement

</deferred>

---

*Phase: 36-survey-builder*
*Context gathered: 2026-05-29*
