# DISCUSSION A: Proxy Voting Module

Design a proxy vote submission module. Use case: Owner cannot physically attend the AGM. The rules on virtual attendance have not been implemented. He or she is required to submit a signed proxy form to the HOA prior to the meeting, the proxy nominee / person is also required to sign the form. It should be a simple click flow. Nothing elaborate.

Given Netcomplex's architecture, I would not model this as a "form builder". I would model it as a lightweight workflow attached to an AGM Event. It should feel like checking in for an event rather than applying for something.

## Module Name

**Proxy Vote**

Can be enabled only for events where:

- AGM
- SGM
- Special Resolution Meeting
- Trustee Election

---

## Resident Journey

### Step 1 — Open Meeting

```
Annual General Meeting 2026

Date: 28 August 2026

Attendance
○ I will attend
○ I cannot attend

[Continue]
```

If **I cannot attend**...

---

### Step 2 — Appoint Proxy

Simple search box.

```
Who will represent you?

Search resident...

John Smith
12 Oak Drive

Selected ✓
```

If the nominee is not a resident:

```
My proxy is not a resident

Name
Email
Phone
```

Most HOAs allow non-members if permitted by the constitution.

---

### Step 3 — Upload Signed Proxy Form

```
Upload signed proxy form

[ Upload PDF ]

✓ Owner signature

Next
```

No OCR.

No AI.

Simply upload the signed document.

Supported:

- PDF
- JPG
- PNG

---

### Step 4 — Proxy Acceptance

The nominated person receives a notification.

```
You have been nominated
as a proxy for

David Jones

AGM 2026

View Form
```

Buttons

```
Accept
Decline
```

---

If accepted...

---

### Step 5 — Digital Signature

Very simple.

```
Please confirm.

I agree to act as proxy
for David Jones.

Draw signature

_____________

Submit
```

or simply

```
Type Full Name

✓ I agree
```

depending on HOA legal requirements.

---

### Step 6 — Complete

```
✓ Proxy Submitted

Owner signature ✓

Proxy signature ✓

Status

Submitted to HOA
Pending verification
```

That's it.

---

# HOA Dashboard

Admin widget

```
Proxy Votes

────────────────────

David Jones

Proxy:
John Smith

✓ Owner Signed

✓ Proxy Signed

✓ Form Uploaded

Status

Pending Approval

[Approve]
```

or

```
Needs Attention

Missing proxy signature
```

---

After approval

```
Approved

QR Reference

PV-2026-0043
```

---

# Status Lifecycle

```
Draft

↓

Waiting for Upload

↓

Waiting for Proxy

↓

Pending HOA Review

↓

Approved

↓

Rejected

↓

Withdrawn
```

Only six states.

---

# Notifications

Owner

- Proxy accepted
- Proxy declined
- HOA approved
- HOA rejected

Proxy

- You've been nominated
- Reminder to sign
- Submission complete

HOA

- New proxy received
- Proxy accepted
- Ready for review

---

# Suggested Database Model

```
MeetingProxy

id

meetingId

ownerUserId

ownerHouseholdId

proxyUserId (nullable)

proxyName

proxyEmail

proxyPhone

formDocumentId

ownerSignedAt

proxySignedAt

approvedBy

approvedAt

status

notes

createdAt

updatedAt
```

Keep the uploaded document in your existing media/document subsystem rather than storing files directly on the proxy record. This aligns with the platform's existing document management approach.

---

# Optional Nice-to-Haves (Future)

These are not required for the initial implementation:

- Allow one proxy holder to represent multiple owners (subject to HOA constitution limits).
- Show the number of voting units represented at check-in.
- Export an attendance register including proxy allocations.
- Generate a PDF register for the chairperson.
- Automatically invalidate outstanding proxies once the meeting closes.

---

## Why this fits Netcomplex

This design deliberately follows the platform's modular philosophy: a focused workflow, minimal UI, and reuse of existing capabilities such as Events, Notifications, User Directory, and Media uploads rather than introducing a separate document or approval framework. The result is a low-friction process that satisfies the typical HOA requirement of collecting a signed owner proxy, obtaining the nominee's acceptance, and giving administrators a straightforward approval queue before the AGM.

DISCUSSION B:

Q: How do we future proof digital signatures?

Given Netcomplex's architecture, I would not model this as a "form builder". I would model it as a lightweight workflow attached to an AGM Event. It should feel like checking in for an event rather than applying for something.

## Module Name

**Proxy Vote**

Can be enabled only for events where:

- AGM
- SGM
- Special Resolution Meeting
- Trustee Election

---

## Resident Journey

### Step 1 — Open Meeting

```
Annual General Meeting 2026

Date: 28 August 2026

Attendance
○ I will attend
○ I cannot attend

[Continue]
```

If **I cannot attend**...

---

### Step 2 — Appoint Proxy

Simple search box.

```
Who will represent you?

Search resident...

John Smith
12 Oak Drive

Selected ✓
```

If the nominee is not a resident:

```
My proxy is not a resident

Name
Email
Phone
```

Most HOAs allow non-members if permitted by the constitution.

---

### Step 3 — Upload Signed Proxy Form

```
Upload signed proxy form

[ Upload PDF ]

✓ Owner signature

Next
```

No OCR.

No AI.

Simply upload the signed document.

Supported:

- PDF
- JPG
- PNG

---

### Step 4 — Proxy Acceptance

The nominated person receives a notification.

```
You have been nominated
as a proxy for

David Jones

AGM 2026

View Form
```

Buttons

```
Accept
Decline
```

---

If accepted...

---

### Step 5 — Digital Signature

Very simple.

```
Please confirm.

I agree to act as proxy
for David Jones.

Draw signature

_____________

Submit
```

or simply

```
Type Full Name

✓ I agree
```

depending on HOA legal requirements.

---

### Step 6 — Complete

```
✓ Proxy Submitted

Owner signature ✓

Proxy signature ✓

Status

Submitted to HOA
Pending verification
```

That's it.

---

# HOA Dashboard

Admin widget

```
Proxy Votes

────────────────────

David Jones

Proxy:
John Smith

✓ Owner Signed

✓ Proxy Signed

✓ Form Uploaded

Status

Pending Approval

[Approve]
```

or

```
Needs Attention

Missing proxy signature
```

---

After approval

```
Approved

QR Reference

PV-2026-0043
```

---

# Status Lifecycle

```
Draft

↓

Waiting for Upload

↓

Waiting for Proxy

↓

Pending HOA Review

↓

Approved

↓

Rejected

↓

Withdrawn
```

Only six states.

---

# Notifications

Owner

- Proxy accepted
- Proxy declined
- HOA approved
- HOA rejected

Proxy

- You've been nominated
- Reminder to sign
- Submission complete

HOA

- New proxy received
- Proxy accepted
- Ready for review

---

# Suggested Database Model

```
MeetingProxy

id

meetingId

ownerUserId

ownerHouseholdId

proxyUserId (nullable)

proxyName

proxyEmail

proxyPhone

formDocumentId

ownerSignedAt

proxySignedAt

approvedBy

approvedAt

status

notes

createdAt

updatedAt
```

Keep the uploaded document in your existing media/document subsystem rather than storing files directly on the proxy record. This aligns with the platform's existing document management approach.

---

# Optional Nice-to-Haves (Future)

These are not required for the initial implementation:

- Allow one proxy holder to represent multiple owners (subject to HOA constitution limits).
- Show the number of voting units represented at check-in.
- Export an attendance register including proxy allocations.
- Generate a PDF register for the chairperson.
- Automatically invalidate outstanding proxies once the meeting closes.

---

## Why this fits Netcomplex

This design deliberately follows the platform's modular philosophy: a focused workflow, minimal UI, and reuse of existing capabilities such as Events, Notifications, User Directory, and Media uploads rather than introducing a separate document or approval framework. The result is a low-friction process that satisfies the typical HOA requirement of collecting a signed owner proxy, obtaining the nominee's acceptance, and giving administrators a straightforward approval queue before the AGM.
