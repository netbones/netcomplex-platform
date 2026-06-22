# CHAT E2EE

> **Status (2026-06-22):** Groundwork complete. Phase 48 architecture hardening and Discussion C payload abstraction shipped. Future work (Phases 49–54) tracked in BD `soralia-village-m5ug`.
>
> | Layer                               | Status               |
> | ----------------------------------- | -------------------- |
> | Message payload abstraction         | ✅ done (`380098e6`) |
> | Message versioning (messageVersion) | ✅ done (`380098e6`) |
> | VOICE/FILE MessageType              | ✅ done (`380098e6`) |
> | ModerationProvider interface        | ✅ done (`380098e6`) |
> | MessageSearchProvider interface     | ✅ done (`380098e6`) |
> | Conversation capabilities (jsonb)   | ✅ done (`cd6d542c`) |
> | SECURE_DIRECT/SECURE_GROUP types    | ✅ done (`cd6d542c`) |
> | UserKey model                       | ✅ done (`cd6d542c`) |
> | UserDevice model                    | ✅ done (`cd6d542c`) |
> | Schema reorganized (FSD sections)   | ✅ done (`ea76f96a`) |
> | DB migration to apply               | ⏳ pending           |
> | Phase 49: Device Identity UI        | 📋 planned           |
> | Phase 51: Secure Direct Messaging   | 📋 planned           |
> | Phase 52–54: Recovery/Media/Groups  | 📋 planned           |

## DISCUSSION PART A

QUERY: I'm interested in offering end-to-end encryption on our realtime chat for premium users. I notice this page https://medium.com/@mateza/create-a-real-time-chat-with-end-to-end-encryption-using-supabase-and-reactjs-chat-gpt-d7a47873fbb2, but not sure how this adds to our infrastructure overhead?

ANSWER:
For NetComplex, I would be very cautious about adding end-to-end encryption (E2EE) to chat, especially if your current architecture is:

- Next.js
- Supabase Postgres
- Supabase Realtime
- Better Auth
- Multi-tenant SaaS
- Moderation/admin features
- Searchable conversations
- Future AI/automation possibilities

Your current chat architecture (Phase 09) is essentially server-visible messaging. The database stores plaintext messages and Supabase Realtime simply broadcasts them.

### What E2EE Actually Changes

Without E2EE:

```
Sender
  ↓
NetComplex API
  ↓
Supabase DB (plaintext)
  ↓
Supabase Realtime
  ↓
Recipient
```

With E2EE:

```
Sender
  ↓ encrypt
NetComplex API
  ↓
Supabase DB (ciphertext)
  ↓
Supabase Realtime
  ↓
Recipient
  ↓ decrypt
```

The server never sees message content.

---

### Infrastructure Cost Impact

The good news:

#### Almost no additional server cost

You are not adding:

- More Supabase instances
- More Realtime channels
- More Vercel functions
- More database load

Encryption happens in the browser.

Typical client-side libraries:

- `libsodium`
- `tweetnacl`
- `@signalapp/libsignal-client`

The actual CPU cost is borne by the user device.

So your monthly infrastructure bill might increase by:

**~0–5%**

which is effectively negligible.

---

### The Real Cost: Complexity

This is where people underestimate E2EE.

#### Key Management

You must introduce:

```text
User
 ├─ Public Key
 └─ Private Key
```

Potential schema additions:

```prisma
model UserKey {
  id
  userId
  publicKey
  createdAt
}
```

Then you need:

- Key generation
- Key rotation
- Device registration
- Recovery strategy

---

#### Multi-Device Support

User logs in on:

- Laptop
- Phone
- Tablet

Which private key decrypts messages?

Signal solves this with a sophisticated device identity system.

WhatsApp solves this with device linking.

Building this yourself is non-trivial.

---

#### Lost Device Problem

Resident loses phone.

Questions become:

- Can they recover old messages?
- Can HOA help?
- Can platform admins help?

True E2EE means:

**No.**

If the private key is gone:

```
Messages = gone forever
```

unless you build a backup system.

---

### Features You Lose

#### Search

Today:

```sql
WHERE content ILIKE '%pool%'
```

works.

With E2EE:

```sql
WHERE ciphertext ILIKE '%pool%'
```

is useless.

You lose:

- Conversation search
- Keyword search
- Message indexing

unless you build encrypted search (very difficult).

---

#### Moderation

You have community-focused tenants and eventually merits, disputes, governance, and moderation workflows.

With E2EE:

Platform cannot see:

- Harassment
- Threats
- Spam
- Fraud
- Abuse reports

Users must manually report messages.

This creates operational challenges for HOAs.

---

#### AI Features

Future features become impossible:

- AI summaries
- AI moderation
- AI search
- AI assistants

because the server cannot read content.

---

#### Premium Feature Viability

Offering E2EE only on premium plans is actually a sensible model.

Example:

| Tier         | Storage                     |
| ------------ | --------------------------- |
| Foundation   | Standard chat               |
| Depth        | Standard chat               |
| Core/Premium | Optional E2EE conversations |

A user could create:

```text
Conversation
 ├─ Standard
 └─ Secure
```

Where secure conversations use E2EE.

That avoids forcing the entire platform into encrypted mode.

---

## Recommended Architecture

I would not encrypt every chat.

Instead:

```text
ConversationType
 ├─ DIRECT
 ├─ GROUP
 └─ SECURE
```

For `SECURE`:

- Generate per-conversation symmetric key
- Encrypt message locally
- Store ciphertext in Supabase
- Store participant public keys
- Deliver ciphertext through Realtime

This is much simpler than implementing the full Signal protocol.

---

## For NetComplex Specifically

Given your platform's community-management focus, I would rank priorities as:

1. Standard chat (already done)
2. Message retention controls
3. Tenant-configurable retention
4. Audit logging
5. User blocking/reporting
6. Optional E2EE direct messages
7. Full Signal-style E2EE

I would **not** make all conversations E2EE.

I would implement:

> "Secure Conversations" as a premium/Core-tier module, available only for direct resident-to-resident chats, while keeping community groups, maintenance conversations, bookings, governance discussions, and admin communications server-visible.

That gives you most of the marketing value of "End-to-End Encrypted Messaging" while avoiding the operational burden of making your entire community platform opaque to administrators and moderators.

## DISCUSSION PART B

I think this is one of those features where the architecture decisions you make _before_ implementing E2EE matter more than the encryption itself.

Right now your chat system is a standard server-visible messaging platform built around the NetComplex Conversation domain and Supabase Realtime. That is actually a good foundation because you can evolve toward E2EE without rewriting the messaging subsystem.

The biggest mistake would be tightly coupling message storage, moderation, search, notifications, and future AI capabilities directly to plaintext message content.

---

## TECHNICAL PROPOSAL

### Secure Conversations Module

#### Business Goal

Introduce a premium-tier capability called:

```text
Secure Conversations
```

Rather than:

```text
End-to-End Encryption Everywhere
```

This distinction is important.

Most HOA/community communications should remain visible to community administrators:

- Maintenance discussions
- Booking communications
- Governance discussions
- Committee communications
- Moderation investigations

E2EE should be reserved for:

- Resident-to-resident chats
- Private family chats
- Optional premium group chats

---

#### Product Positioning

##### New Module

```ts
ModuleKey = 'secureMessaging';
```

Tier:

```ts
core;
```

or

```ts
premium;
```

depending on future tier alignment.

---

## Conversation Types

Current:

```ts
DIRECT;
GROUP;
```

Future:

```ts
DIRECT;
GROUP;
SECURE_DIRECT;
SECURE_GROUP;
```

Avoid a boolean:

```ts
encrypted: true;
```

Conversation types scale better.

---

#### Prepare For Encryption

Do this now.

##### Introduce Message Payload Abstraction

Today many systems eventually become:

```ts
message.content;
```

Everywhere.

Avoid that.

Instead:

```ts
interface MessagePayload {
  body: string;
}
```

Message:

```ts
interface Message {
  id: string;
  payload: MessagePayload;
}
```

Later:

```ts
interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  version: number;
}
```

No major refactor required.

---

##### Add Message Versioning

Add now:

```prisma
messageVersion Int @default(1)
```

Future:

```text
1 = plaintext
2 = encrypted
3 = encrypted-v2
```

Migration becomes trivial.

---

#### Introduce Conversation Capabilities

Add:

```ts
ConversationCapabilities;
```

Example:

```ts
{
  searchable: true,
  moderated: true,
  encrypted: false
}
```

UI can adapt automatically.

---

## Cryptographic Foundation

### User Key Pairs

Add:

```prisma
model UserKey {
  id
  userId
  publicKey
  createdAt
  revokedAt
}
```

Only store:

```text
Public Key
```

Server never stores private keys.

---

#### Preferred Crypto Stack

I would use:

```text
libsodium
```

Specifically:

```text
libsodium-wrappers
```

Reasons:

- Mature
- Audited
- Browser friendly
- Simpler than Signal protocol
- Used widely in secure applications

---

## Device Model

This is where most implementations fail.

Do not tie keys to users.

Tie keys to devices.

### New Model

```prisma
model UserDevice {
  id
  userId
  publicKey
  deviceName
  lastSeenAt
}
```

Examples:

```text
Dav's Laptop
Dav's Android
Dav's Tablet
```

Each device gets its own key pair.

This future-proofs:

- Multi-device sync
- Device revocation
- Device recovery

---

## Secure Direct Conversations

When a secure conversation is created:

### Generate

```text
Conversation Key
```

Example:

```text
AES-256 key
```

---

### Encrypt

Sender:

```text
Message
  ↓
Encrypt
  ↓
Ciphertext
```

Database stores:

```json
{
  "ciphertext": "...",
  "nonce": "...",
  "version": 1
}
```

---

### Realtime

Supabase Realtime still works exactly as today.

It merely transports ciphertext.

Infrastructure impact:

```text
Minimal
```

---

## Recovery Strategy

This decision must be made before launch.

You have three options.

---

### Option A

#### True Zero Knowledge

Private key only on devices.

Pros:

- Maximum privacy

Cons:

- Lost device = lost messages

Recommended for:

```text
Privacy purists
```

---

### Option B

#### Encrypted Backup

Private key encrypted with user password.

Stored server-side.

Pros:

- Recoverable

Cons:

- Slightly weaker model

Recommended for:

```text
NetComplex
```

---

### Option C

#### Escrow

Platform retains recovery ability.

Pros:

- Easier support

Cons:

- Not true E2EE

Not recommended.

---

#### Tenant Controls

Community administrators need visibility.

Add:

```ts
secureMessagingEnabled;
```

Per tenant.

And:

```ts
allowSecureGroups;
```

Per tenant.

Example:

```text
Residential HOA
  Secure Direct = Yes
  Secure Groups = No
```

---

## Premium Features

Secure Messaging becomes a module.

Potential premium features:

### Secure Direct Messages

Resident ↔ Resident

### Message Expiry

```text
24 hours
7 days
30 days
```

### Read Receipts

Encrypted metadata.

### Secure Media

Images encrypted before upload.

### Secure File Sharing

Documents encrypted before storage.

---

# Future-Proofing Decisions To Make Now

These are the most important items.

## 1. Separate Metadata From Content

Store:

```ts
Conversation;
Participants;
CreatedAt;
LastReadAt;
```

independently from message body.

Metadata should remain queryable.

Only content becomes encrypted.

---

## 2. Never Build Search Directly Against Content ✅

Introduce:

```ts
MessageSearchProvider;
```

now. (Implemented: `src/entities/chat/model/search-provider.ts`)

Even if it simply does:

```sql
ILIKE
```

today.

Future:

```ts
PlaintextSearchProvider;
EncryptedSearchProvider;
```

---

## 3. Build Moderation As An Interface ✅

Instead of:

```ts
scanMessage(message.content);
```

Use:

```ts
ModerationProvider.review(message);
```

(Implemented: `src/entities/chat/model/moderation-provider.ts`)

Future:

```text
Standard Chat → automatic moderation
Secure Chat → user reports only
```

---

#### Version Message Formats ✅

Never assume:

```ts
message.content;
```

Always:

```ts
message.payload;
```

with version numbers. (Implemented: `messageVersion` column + `MessagePayload` types.)

---

## Recommended Roadmap

### GSD Phase 48 – Chat Architecture Hardening ✅

- Message payload abstraction ✅
- Message versioning ✅
- Conversation capabilities ✅
- Moderation provider abstraction ✅
- Search provider abstraction ✅

### Phase 49 – Device Identity

- UserDevice model
- Public key infrastructure
- Device management UI

### Phase 51 – Secure Direct Messaging

- libsodium integration
- Conversation keys
- Encrypted payloads
- Premium module

### Phase 52 – Recovery & Backup

- Encrypted key backup
- Device linking
- Key rotation

### Phase 53 – Secure Media

- Encrypted attachments
- Encrypted image delivery
- Encrypted file delivery

### Phase 54 – Secure Groups

- Group key management
- Membership rekeying
- Secure community groups

If you start Phase 48 now, the eventual E2EE implementation becomes an additive feature. If you postpone the abstraction work and continue building chat around plaintext message content, every new feature added to chat will increase the cost and risk of introducing encryption later.

## DISCUSSION PART C

Voice messaging is actually much cheaper and simpler than E2EE chat.

For NetComplex, I would view voice notes as a relatively low-risk enhancement that can be layered onto your existing chat architecture with minimal disruption.

## Two Very Different Features

People often conflate these:

### Voice Notes

Like WhatsApp voice messages.

```text
Hold button
Record
Upload
Play back
```

This is essentially file storage.

---

### Voice Calls

Like WhatsApp calling.

```text
Live audio stream
WebRTC
NAT traversal
TURN servers
```

This is real-time media infrastructure.

The overhead difference is enormous.

---

# Voice Notes

If you're talking about:

```text
Resident records 30-second message
Uploads it
Recipient plays it later
```

then the architecture is:

```text
Browser
  ↓
Supabase Storage
  ↓
Store URL in Message
  ↓
Supabase Realtime notifies recipient
```

You already have:

- PostgreSQL
- Supabase
- Realtime
- Upload endpoints

Looking at your project structure, you already have media upload infrastructure and storage-related APIs, so you're much closer than starting from scratch.

---

# Infrastructure Overhead

## Database

Almost none.

Instead of:

```json
{
  "content": "Hello"
}
```

store:

```json
{
  "type": "voice",
  "url": "...",
  "duration": 22
}
```

---

## Realtime

No additional load.

Realtime broadcasts:

```text
New voice message available
```

exactly like a text message.

---

## Storage

This is the primary cost.

Typical Opus recordings:

| Length | Size    |
| ------ | ------- |
| 10 sec | ~50 KB  |
| 30 sec | ~150 KB |
| 1 min  | ~300 KB |
| 5 min  | ~1.5 MB |

Even:

```text
1000 users
10 voice notes/day
30 sec each
```

is only:

```text
~1.5 GB/day
~45 GB/month
```

which is manageable.

---

# Technical Debt Prevention

If you think voice is likely in the future, do this now.

---

## Replace Message Content With Payloads

Instead of:

```ts
Message {
  content: string;
}
```

Use:

```ts
Message {
  payload: Json;
  type: MessageType;
}
```

Example:

```ts
TEXT;
VOICE;
IMAGE;
FILE;
SYSTEM;
```

---

### Text

```json
{
  "body": "Hello"
}
```

---

### Voice

```json
{
  "url": "...",
  "duration": 24,
  "waveform": [...]
}
```

---

### Image

```json
{
  "url": "...",
  "width": 1024,
  "height": 768
}
```

---

# Waveforms

A huge UX improvement.

When recording:

```text
▁▂▄▅▇▆▃▁
```

Store the waveform array.

Playback becomes much more modern.

The overhead is tiny.

---

# Voice Transcription

This is where things become interesting for NetComplex.

I would not treat voice notes as just audio.

I would immediately design for:

```text
Voice Note
     ↓
Transcription
     ↓
Searchable
```

---

Example:

Resident sends:

> "The clubhouse gate is broken."

Store:

```json
{
  "audioUrl": "...",
  "transcript": "The clubhouse gate is broken."
}
```

Now:

- Search works
- Moderation works
- AI summaries work
- Future analytics work

---

# Premium Opportunity

You could make:

### Standard

- Text
- Images

### Core/Premium

- Voice notes
- Voice transcription
- Secure conversations

This aligns nicely with your tiered module architecture.

---

# Voice Calls Are Different

If you mean:

```text
Resident calls resident
```

then overhead increases dramatically.

You need:

- WebRTC
- Signalling server
- STUN servers
- TURN servers
- Call state management
- Push notifications
- Device permissions
- Call recovery

And TURN traffic can become one of the most expensive services in your stack.

For NetComplex I would implement:

1. Text chat
2. Voice notes
3. E2EE secure conversations
4. Voice transcription
5. Only then evaluate voice/video calling

Voice notes deliver roughly 80% of the communication benefit while adding perhaps 10% of the complexity of live calling. That's a very favorable trade-off for a community platform.
