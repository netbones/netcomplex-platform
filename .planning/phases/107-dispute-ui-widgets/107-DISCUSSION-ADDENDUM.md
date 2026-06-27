I've reviewed the Phase 107 specification, context, and discussion log. Overall, I think this is one of the stronger UI phases you've produced. It fits the widget-first philosophy you've established across Netcomplex, reuses existing entity components rather than inventing new ones, and avoids introducing a dedicated "Disputes" area that would increase navigation complexity.

That said, I see several areas where I would strengthen the design before implementation.

## What is particularly strong

### 1. Widget-first workflow

Making dispute filing originate from the resident dashboard instead of another page is consistent with the architecture you've been moving toward.

Residents think:

> "I have a problem."

not

> "I should visit the Disputes module."

The widget approach also scales nicely when additional modules are introduced.

---

### 2. Intake before form

The four-stage intake is psychologically much better than presenting a legal-style form immediately.

The progression

Emotion
→ Checklist
→ AI advice
→ Conflict tips
→ Form

feels supportive instead of bureaucratic.

---

### 3. Separation of widget and detail page

Using the widget only for:

- discovery
- filing
- summary

while moving actual case management onto `/disputes/[id]`

is exactly the right balance.

The widget remains lightweight while the detail page can evolve indefinitely.

---

### 4. Reuse of entity components

The plan consistently reuses:

- badges
- indicators
- thread
- evidence widgets

instead of rebuilding them.

That keeps the FSD boundaries clean.

---

## Areas I would improve

### 1. Introduce a "Review before Submit" step

Right now the flow is:

Wizard
→ Form
→ POST

I would instead make it:

Wizard
→ Form
→ Review
→ Submit

The review page could show

- title
- respondent
- category
- severity
- desired outcome
- attachments
- AI warning (if applicable)

Residents often realise mistakes only once they see everything together.

It also reduces accidental submissions.

---

### 2. Don't completely hide previous disputes

Currently the widget becomes

# Entire widget

Wizard

Personally I'd leave a tiny breadcrumb such as

```
← Back to My Disputes

You have 3 active disputes
```

rather than making the previous list disappear completely.

It gives better orientation.

---

### 3. Add auto-save

The specification mentions drafts only after submitting the form.

I'd auto-save wizard progress locally every few seconds.

Example:

```
Emotion ✓

Checklist ✓

Description...

(saved 10 seconds ago)
```

If the browser crashes, residents don't lose everything.

---

### 4. Add "Estimated process"

Many users have no idea what mediation means.

Before the form I'd show something like:

```
What happens next

1 Submit dispute

2 Moderator reviews

3 Mediation begins

4 Resolution

Average time:
7–14 days
```

This dramatically reduces anxiety.

---

### 5. Timeline deserves prominence

The detail page layout is

Header

Left
Timeline

Centre
Thread

Right
Evidence

I'd actually elevate the timeline into the header.

Example

```
Submitted
↓

Assigned
↓

Mediation

↓

Resolved
```

Users constantly ask

> "Where am I in the process?"

rather than

> "What evidence have I uploaded?"

Making the timeline immediately visible answers that question.

---

### 6. AI panel shouldn't disappear

The AI frivolity check currently exists only during intake and then again in the right sidebar.

I'd keep a compact advisory banner after submission.

Example

```
AI noted:

Tone appears emotional.

Consider focusing on facts.

[Edit description]
```

That gives residents one final opportunity to improve their submission before mediation begins.

---

### 7. Evidence uploader should encourage chronology

Instead of

```
Upload Evidence
```

I'd encourage organisation:

```
Evidence

1 Photo

2 Screenshot

3 PDF

4 Video

Optional note

"When was this taken?"
```

Chronological evidence is far easier for moderators to interpret.

---

### 8. Thread should distinguish mediation from chat

Since you're reusing chat concepts, be careful it doesn't feel like a messaging app.

I'd visually differentiate:

Resident

Mediator

System

using clearly distinct message styles.

For example:

- resident messages normal
- mediator messages highlighted
- system events centred on the timeline

That reinforces that this is a structured mediation process rather than casual conversation.

---

### 9. Admin widget needs urgency indicators

The moderation queue currently shows

- status
- category
- complainant
- filed date

I'd also include:

- oldest pending age
- severity
- SLA indicator

For example:

```
URGENT

Pending 6 days

Needs assignment
```

Moderators naturally prioritise by urgency rather than filing order.

---

### 10. Empty states deserve more attention

Both widgets will frequently be empty.

Resident:

```
No disputes.

Most neighbour issues can be solved through conversation.

Need help?

File a Dispute
```

Admin:

```
No disputes awaiting moderation.

Great!

Everything is up to date.
```

These make the interface feel more welcoming.

---

## One architectural suggestion

I would avoid hard-coding the intake wizard specifically for disputes.

You've already extracted `useMultiStep`, which is a good start.

I would go one step further and create a generic workflow framework:

```
Workflow

Step

Condition

Validation

Transition
```

Then future features such as:

- maintenance request diagnostics
- onboarding
- CSOS applications
- insurance claims
- architectural approvals
- incident reporting

could all reuse the same engine instead of each implementing their own multi-step flow.

## Overall assessment

I would score this phase:

| Area                     |  Score |
| ------------------------ | -----: |
| Information architecture |  10/10 |
| FSD alignment            |  10/10 |
| Widget philosophy        |  10/10 |
| Mobile strategy          |   9/10 |
| Accessibility            |   9/10 |
| Resident UX              | 9.5/10 |
| Moderator UX             |   9/10 |
| Future extensibility     | 9.5/10 |

**Overall: 9.6/10**

The specification is cohesive, aligns well with the rest of the Netcomplex architecture, and demonstrates a consistent design philosophy. The improvements I'd prioritise before implementation are:

1. Add a **Review before Submit** screen.
2. Implement **automatic draft saving** during the intake and form flow.
3. Surface the **case timeline** more prominently.
4. Introduce a reusable **workflow engine** that extends beyond disputes, allowing future guided processes to share the same infrastructure.
