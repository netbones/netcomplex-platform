# User Stories: John & Mary Onboarding

## Scenario Overview

**Characters:**

- **Landlord (Member)**: Property owner, HOA member, doesn't live in village, rents via lease
- **John**: Adult occupant, moving in as tenant
- **Mary**: Adult occupant (spouse/partner), moving in as tenant
- **SEEF**: Letting agent, assisting with induction

**Property Context:**

- Landlord owns Unit 042 in Soralia Village
- Landlord is HOA Member with Standard Seat (`/unit/042`)
- John & Mary sign 12-month lease
- They become Occupants (Profiles) under Landlord's household

---

## User Story 1: Landlord Onboarding

### Title: Landlord Sets Up Their Household on Platform

**As a** Property Owner (Landlord)  
**I want to** register my property and set up my household  
**So that** I can manage my rental property and enable my tenants to join the community

**Scenario:**

```
Given I am a property owner in Soralia Village
When I first access the platform
Then I should be able to register as a Member (Standard Seat)
And my property details (unit number) should be captured
And I should have the option to add occupants (profiles) later
```

**Acceptance Criteria:**

- [ ] Landlord can register with email/password
- [ ] Unit number is captured during registration
- [ ] Platform creates Standard Seat with platform address (e.g., `unit042@soralia.org`)
- [ ] Landlord can access household dashboard at `/unit/{id}`
- [ ] Landlord can add up to 5 profiles for occupants

---

## User Story 2: Letting Agent Invites Occupants

### Title: SEEF Assists in Creating Occupant Profiles

**As a** Letting Agent (SEEF)  
**I want to** create occupant profiles for new tenants  
**So that** they can access the community platform from day one

**Scenario:**

```
Given I am a verified letting agent for Soralia Village
And I have the lease details for a new occupant
When I access the landlord's household management (with permission)
Then I can create a new profile for the occupant
And the occupant receives an invitation email
```

**Acceptance Criteria:**

- [ ] SEEF can request access to a landlord's household management
- [ ] Landlord must approve SEEF's access request
- [ ] SEEF can create occupant profiles with: name, email, move-in date
- [ ] System generates profile address (e.g., `john.unit042@soralia.org`)
- [ ] Invitation email sent to occupant with setup instructions

**Technical Note:**

- Profile initially has no login credentials (managed by landlord)
- Occupant receives "set up your profile" link via landlord's dashboard

---

## User Story 3: Occupant Completes Profile Setup

### Title: John Sets Up His Occupant Profile

**As a** new Occupant (John)  
**I want to** complete my profile setup  
**So that** I can participate in the community

**Scenario:**

```
Given I received an invitation from my landlord
When I click the setup link
Then I should be prompted to create my personal profile
And set my display name, avatar, and preferences
```

**Acceptance Criteria:**

- [ ] John can access setup flow via unique link
- [ ] John can set display name (visible to community)
- [ ] John can upload avatar photo
- [ ] John can select interests for community matching
- [ ] John can set privacy preferences (show contact info, etc.)
- [ ] After setup, John can access `/unit/042/member/{profileId}`

**Profile Page Features:**

- Shows John as occupant of Unit 042
- Cannot edit property details (landlord controls)
- Can join interest groups
- Can participate in messaging
- Can view other residents in directory

---

## User Story 4: Second Occupant Setup

### Title: Mary Joins as Second Occupant

**As a** second Occupant (Mary)  
**I want to** set up my profile under the same household  
**So that** my partner and I both have community access

**Scenario:**

```
Given John is already set up as occupant at Unit 042
When Mary also moves in
Then she should be added as a second profile under the same household
And both John and Mary can use the platform independently
```

**Acceptance Criteria:**

- [ ] Landlord (or SEEF) can add Mary as second profile
- [ ] Mary's profile address: `mary.unit042@soralia.org`
- [ ] Both John and Mary have separate profile pages
- [ ] Both can join groups, send messages independently
- [ ] Directory shows both as occupants of Unit 042

**Profile Limit Check:**

- Household has max 5 profiles (2 used, 3 remaining)

---

## User Story 5: Landlord Manages Occupants

### Title: Landlord Views and Manages Occupant Profiles

**As a** Landlord (Member)  
**I want to** view and manage the profiles in my household  
**So that** I can maintain accurate tenant information

**Scenario:**

```
Given I have occupants living in my property
When I access my household dashboard
Then I should see a list of all profiles
And I should be able to edit or remove profiles
```

**Acceptance Criteria:**

- [ ] Landlord sees all profiles at `/unit/{id}`
- [ ] Landlord can edit profile display name
- [ ] Landlord can set profile visibility (public/private)
- [ ] Landlord can remove profiles (for move-outs)
- [ ] Landlord receives notifications about profile activity

**Landlord Cannot:**

- [ ] View occupant's private messages
- [ ] Change occupant's chosen interests
- [ ] Access occupant's personal settings

---

## User Story 6: Occupant Privacy & Independence

### Title: Occupant Controls Their Own Privacy

**As an** Occupant (John)  
**I want to** control what information is visible  
**So that** I maintain my privacy while participating

**Scenario:**

```
Given I am set up as an occupant
When I access my profile settings
Then I should be able to:
- Show/hide my email address
- Show/hide my phone number
- Set my profile visibility (public/household-only)
```

**Acceptance Criteria:**

- [ ] John can toggle email visibility
- [ ] John can toggle phone visibility
- [ ] John can set profile to private (not in public directory)
- [ ] John can leave household and upgrade to Premium Seat (after 1 year)

---

## User Story 7: Occupant Upgrade Path

### Title: Occupant Upgrades to Premium Seat After Tenure

**As an** Occupant (John)  
**I want to** upgrade to a Premium Seat after 1 year  
**So that** I have independent login and can leave household

**Scenario:**

```
Given I have been an occupant for 1 year
When I access my profile
Then I should see an option to upgrade to Premium Seat
And after upgrade, I have my own login credentials
And I can maintain or detach from the household
```

**Acceptance Criteria:**

- [ ] System tracks occupant tenure (1 year minimum)
- [ ] Upgrade option appears after 1 year
- [ ] John creates personal email/password for login
- [ ] John's platform address becomes `john@soralia.org`
- [ ] John can now access `/resident/{id}` (independent profile)
- [ ] John can optionally remain linked to household or detach

---

## User Story 8: SEEF Induction Assistance

### Title: SEEF Helps New Occupants Get Started

**As a** Letting Agent (SEEF)  
**I want to** guide new occupants through platform induction  
**So that** they fully engage with the community

**Scenario:**

```
Given John and Mary have profiles created
When I assist with their induction
Then I can walk them through:
- Finding their profile page
- Joining interest groups
- Understanding directory features
- Submitting maintenance requests
- Booking facilities
```

**Induction Checklist (SEEF UI):**

- [ ] Show occupants how to find their profile
- [ ] Guide them to join relevant interest groups
- [ ] Demonstrate directory search
- [ ] Explain maintenance request submission
- [ ] Show facility booking calendar
- [ ] Introduce messaging/chat feature

**SEEF Special Access:**

- [ ] SEEF can be granted temporary access to household management
- [ ] SEEF can create profiles (with landlord approval)
- [ ] SEEF cannot access private occupant data

---

## Data Flow Summary

```
LANDLORD (Member - Standard Seat)
├── Platform Address: unit042@soralia.org
├── Route: /unit/042
├── Property: HomeImage ✓
└── Profiles (max 5)
    ├── Profile 1: John
    │   └── Address: john.unit042@soralia.org
    │   └── Route: /unit/042/member/{johnId}
    └── Profile 2: Mary
        └── Address: mary.unit042@sorialia.org
        └── Route: /unit/042/member/{maryId}

AFTER UPGRADE (1 year later):
├── John → Premium Seat
│   └── Address: john@soralia.org
│   └── Route: /resident/{johnId}
└── Mary → Premium Seat
    └── Address: mary@soralia.org
    └── Route: /resident/{maryId}
```

### Example 2: Jim & Molly (Owner + Spouse)

```
JIM (Owner - Standard Seat)
├── Platform Address: jim.unit042@soralia.org
├── Route: /unit/042
├── Property: HomeImage ✓
└── Standard Seat
    └── isPrimaryOwner: true

MOLLY (Spouse - Profile)
├── Profile Address: molly.unit042@soralia.org
├── Route: /unit/042/member/{mollyId}
└── Managed by Jim (no independent login)
```

### Example 3: Jack & Jill (Co-Owners)

```
JACK (Co-Owner - Standard Seat #1)
├── Platform Address: jack.unit055@soralia.org
├── Route: /unit/055
├── Property: HomeImage ✓
└── Standard Seat
    └── isPrimaryOwner: true

JILL (Co-Owner - Standard Seat #2)
├── Platform Address: jill.unit055@soralia.org
├── Route: /unit/055
├── Property: HomeImage (shared) ✓
└── Standard Seat
    └── isPrimaryOwner: false

HOUSEHOLD (unit055)
├── street: "Oak Street"
├── unit: "055"
├── standardSeats: [Jack, Jill]
└── homeImage: (shared)
```

### Example 4: Jack & Jill + Kids

```
JACK (Standard Seat #1)
JILL (Standard Seat #2)

PROFILES (under household unit055):
├── Child 1 (age 8) - MINOR
│   └── Address: child1.unit055@soralia.org
│   └── Route: /unit/055/member/{child1Id}
└── Child 2 (age 14) - MINOR
    └── Address: child2.unit055@soralia.org
    └── Route: /unit/055/member/{child2Id}
```

### Example 5: Non-Resident Board Member

```
BOB (Board Member - Premium Seat)
├── Platform Address: bob@soralia.org
├── Route: /member/{bobId}
├── seatType: MEMBER (not RESIDENT)
├── isComplimentary: true
└── household: null (no property)
```

---

## API Endpoints Needed

| Endpoint                                   | Method | Description                       |
| ------------------------------------------ | ------ | --------------------------------- |
| `/api/household/{id}`                      | GET    | Get household with profiles       |
| `/api/household/{id}/profiles`             | POST   | Add profile (landlord/SEEF)       |
| `/api/household/{id}/profiles/{profileId}` | PATCH  | Update profile                    |
| `/api/household/{id}/profiles/{profileId}` | DELETE | Remove profile                    |
| `/api/profiles/{id}/setup`                 | POST   | Complete profile setup (occupant) |
| `/api/profiles/{id}/upgrade`               | POST   | Request Premium upgrade           |
| `/api/profiles/{id}/tenure`                | GET    | Check upgrade eligibility         |

---

## Additional User Stories

---

## User Story 9: Spouse of Property Owner (Molly & Jim)

### Title: Molly Joins as Spouse of Property Owner

**As a** Spouse/Partner of Property Owner (Molly)  
**I want to** be added to the household  
**So that** I can participate in the community with my spouse

**Scenario:**

```
Given Jim owns a property in Soralia Village
When Jim sets up his household on the platform
Then Molly should be added as a profile under the same household
And both Jim and Molly can access the household
```

**Acceptance Criteria:**

- [ ] Jim (as Member) can add Molly as a profile
- [ ] Molly's profile address: `molly.unitXXX@soralia.org`
- [ ] Molly can set up her own display name and avatar
- [ ] Molly can join interest groups, send messages
- [ ] Both Jim and Molly appear in directory as occupants of the same unit
- [ ] Molly can upgrade to Premium Seat (after 1 year) if she wants independent login

**Key Question**: Should Molly have her own Standard Seat (co-owner) or be a profile (occupant)?

| Option                       | Description                         | Implications                                                      |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| **Co-owner (Standard Seat)** | Molly has her own Standard Seat     | Two logins, each can manage household, both have homeImage access |
| **Profile (Occupant)**       | Molly is a profile under Jim's seat | Single login for Jim, Molly managed by Jim                        |

**Recommendation**: Start with Profile for simplicity. Allow upgrade to Standard Seat later if needed (co-ownership request).

---

## User Story 10: Co-Owning Couple (Jack & Jill)

### Title: Jack and Jill Co-Own Property Together

**As a** Co-Owning Couple (Jack & Jill)  
**We want to** both have equal ownership and access to our household  
**So that** we can both manage our property and community participation

**Scenario:**

```
Given Jack and Jill are married and co-own a property in Soralia
When we register on the platform
Then we should both have Standard Seats as co-owners
And either of us can manage the household
```

**Acceptance Criteria:**

- [ ] Both Jack and Jill can register with their own credentials
- [ ] Both have Standard Seats linked to the same household
- [ ] Both have platform addresses: `jack.unitXXX@soralia.org` and `jill.unitXXX@soralia.org`
- [ ] Either can add profiles (children, etc.)
- [ ] Either can manage household settings
- [ ] Both appear as household members in directory

**Data Model Note**:

```prisma
Household
├── memberId: Jack's User ID (primary owner)
└── coOwners: User[]  // Jill and any other co-owners
```

**Alternative (Simpler)**:

```prisma
Household
├── memberId: Jack's User ID (one "primary")
└── // Both Jack and Jill have StandardSeats pointing to same household
```

---

## User Story 11: Family with Minor Children (Jack & Jill + Kids)

### Title: Children Added as Minor Profiles

**As a** Parent (Jack or Jill)  
**I want to** add our children as profiles  
**So that** they can participate in youth programs and family activities

**Scenario:**

```
Given Jack and Jill have two children (ages 8 and 14)
When we access our household management
Then we can add our children as minor profiles
And they appear as part of our household
```

**Acceptance Criteria:**

- [ ] Jack or Jill can add child profiles (max 5 total)
- [ ] Child profiles are marked as MINOR type
- [ ] Children have no independent login (managed by parents)
- [ ] Children can join age-appropriate groups
- [ ] Children appear on household card with avatar stack
- [ ] When child turns 18, they become eligible for Premium Seat upgrade

**Profile Types**:
| Type | Description | Login |
|------|-------------|-------|
| OCCUPANT | Adult renter/tenant | No (managed) |
| FAMILY | Adult family member | No (managed) |
| MINOR | Child under 18 | No (managed) |

---

## User Story 12: Owner-Occupier (No Tenants)

### Title: Owner-Occupier Sets Up Household

**As an** Owner-Occupier  
**I want to** register my household with just myself (and family)  
**So that** I can access the community platform

**Scenario:**

```
Given I own my property and live in it
When I register on the platform
Then I should have a Standard Seat
And I can add family members as profiles
But I don't need to add any occupant profiles (no tenants)
```

**Acceptance Criteria:**

- [ ] Owner registers with their property details
- [ ] Household is created with Standard Seat
- [ ] Owner can add spouse/children as profiles (up to 5)
- [ ] No "tenant" profiles needed
- [ ] HomeImage displayed on household page

**Example**: Jim owns and lives in Unit 042 → `/unit/042`

---

## User Story 13: Landlord with Multiple Properties

### Title: Landlord Owns Multiple Properties

**As a** Property Investor (Landlord)  
**I want to** manage multiple properties  
**So that** I can oversee all my rentals in one place

**Scenario:**

```
Given I own 3 properties in Soralia Village
When I register on the platform
Then I should have 3 households (one per property)
And each household has its own Standard Seat
And I can manage tenants for each separately
```

**Acceptance Criteria:**

- [ ] Landlord can have multiple Households
- [ ] Each household has its own platform address: `unit042@soralia.org`, `unit043@soralia.org`, etc.
- [ ] Landlord can add different occupants to each household
- [ ] Landlord sees all households in their dashboard
- [ ] Occupants of one property cannot see other properties

**Data Model Note**:

```prisma
User (Landlord)
├── Household 1 (unit042)
│   └── profiles: [John, Mary]
├── Household 2 (unit043)
│   └── profiles: [Tenant A]
└── Household 3 (unit044)
    └── profiles: [Tenant B, Tenant C]
```

---

## User Story 14: Non-Resident Member (Board Member)

### Title: Non-Resident HOA Member

**As an** HOA Board Member who doesn't live in the village  
**I want to** maintain my membership and participate in governance  
**So that** I can access board features and community discussions

**Scenario:**

```
Given I am an HOA Board Member but do not live in Soralia Village
When I register on the platform
Then I should have a Premium Seat (MEMBER type)
And I can access board-only features
But I don't have a household or property
```

**Acceptance Criteria:**

- [ ] Board member registers without property details
- [ ] Gets Premium Seat with platform address: `name@soralia.org`
- [ ] Seat type: MEMBER (not RESIDENT)
- [ ] Can access board-only content and discussions
- [ ] Can be marked as complimentary (no charge)
- [ ] Can still appear in directory (as board member, not resident)

---

## User Story 15: Property Agent (Letting Company)

### Title: Agent Manages Property on Behalf of Owner

**As a** Property Agent (SEEF Letting)  
**I want to** manage properties on behalf of multiple landlords  
**So that** I can handle tenant inductions, evictions, and property transitions

**Scenario:**

```
Given I work for SEEF (a letting agent)
And I manage several properties in Soralia Village on behalf of landlords
When a landlord grants me temporary access to their household
Then I can perform property management tasks
But my access expires when the mandate ends
```

**Acceptance Criteria:**

- [ ] Agent registers as a platform user with AGENT role
- [ ] Agent can request access to a landlord's household
- [ ] Landlord must approve agent access (with expiry date)
- [ ] Agent can view household dashboard when access is active
- [ ] Agent can add new occupant profiles (for new tenants)
- [ ] Agent can remove occupant profiles (for evicted/moving tenants)
- [ ] Agent can see move-in/move-out dates
- [ ] Agent access automatically expires after mandate end date
- [ ] Agent cannot change ownership or primary settings
- [ ] Agent cannot access occupant private data (messages, etc.)
- [ ] Agent appears in household audit log

**Agent Capabilities by Permission Level**:

| Permission        | Description                    | Included |
| ----------------- | ------------------------------ | -------- |
| View Dashboard    | See household overview         | ✅       |
| Add Profile       | Add new tenant                 | ✅       |
| Remove Profile    | Remove tenant                  | ✅       |
| View Move Dates   | See move-in/out                | ✅       |
| Change Ownership  | Transfer to new owner          | ❌       |
| Modify Settings   | Change household settings      | ❌       |
| View Messages     | Access occupant communications | ❌       |
| View Private Data | See occupant personal info     | ❌       |

**Data Model Note**:

```prisma
model AgentAccess {
  id              String    @id @default(cuid())
  agentId         String    // User with AGENT role
  householdId     String    // The household being managed
  grantedById     String    // The member/owner who granted access
  startedAt       DateTime
  expiresAt       DateTime  // Mandate end date
  isActive        Boolean   @default(true)
  reason          String?   // e.g., "tenant induction", "eviction"
}
```

---

## User Story 16: Agent Handles Tenant Eviction

### Title: Agent Removes Tenant Profile (Eviction)

**As a** Property Agent  
**I want to** remove a tenant profile when evicting  
**So that** the tenant loses platform access immediately

**Scenario:**

```
Given I have active access to a household
And a tenant has been lawfully evicted
When I remove their profile from the household
Then the tenant immediately loses access to the platform
And the tenant's data is archived (for compliance)
```

**Acceptance Criteria:**

- [ ] Agent can select profile to remove
- [ ] Agent must select reason: "eviction", "move-out", "lease-ended"
- [ ] Profile is archived with removal reason and date
- [ ] Tenant's platform address is deactivated
- [ ] Tenant cannot log in (if they had independent login via upgrade)
- [ ] Removal is logged in household audit trail
- [ ] Landlord receives notification of removal

---

## User Story 17: Agent Inducts New Tenant

### Title: Agent Creates Profile for New Tenant

**As a** Property Agent  
**I want to** create a new tenant profile during induction  
**So that** the tenant can access the platform from day one

**Scenario:**

```
Given I have active access to a household
And a new tenant has signed a lease
When I create a profile for the new tenant
Then the tenant receives an invitation to set up their profile
And they can immediately access community features
```

**Acceptance Criteria:**

- [ ] Agent enters tenant details: name, email, lease start date
- [ ] System generates profile address: `name.unitXXX@soralia.org`
- [ ] Agent can set up profile immediately or send invitation
- [ ] Tenant receives email with setup link
- [ ] Tenant can customize display name, avatar, interests
- [ ] Tenant appears on household card immediately
- [ ] Agent can add notes about tenant (internal, not visible to tenant)
- [ ] Lease duration tracked for upgrade eligibility (1 year)

---

## User Story 18: Agent Manages Multiple Properties

### Title: Agent Oversees Multiple Households

**As a** Property Agent  
**I want to** see all properties I manage  
**So that** I can efficiently handle multiple tenant transitions

**Scenario:**

```
Given I manage 5 properties across Soralia Village
When I log into my agent dashboard
Then I see all 5 households I'm authorized to manage
And I can quickly switch between properties
```

**Acceptance Criteria:**

- [ ] Agent sees list of all authorized households
- [ ] Each household shows: address, current occupants, access expiry
- [ ] Agent can filter by: property, status, access expiry soon
- [ ] Agent can see upcoming move-ins/move-outs
- [ ] Agent gets reminders before access expires
- [ ] Agent can request access renewal from landlord

---

## Scenario Comparison Table (Updated)

| Scenario            | Member Type     | Seat Type          | Profiles    | Example            |
| ------------------- | --------------- | ------------------ | ----------- | ------------------ |
| Landlord + Tenant   | Property Owner  | Standard           | 1-5 tenants | John & Mary        |
| Owner + Spouse      | Property Owner  | Standard + Profile | 1 spouse    | Jim & Molly        |
| Co-Owners           | Co-Owners       | 2x Standard        | optional    | Jack & Jill        |
| Co-Owners + Kids    | Co-Owners       | 2x Standard        | 2 minors    | Jack & Jill + Kids |
| Owner-Occupier      | Property Owner  | Standard           | family      | Single owner       |
| Non-Resident Member | Board/Committee | Premium (MEMBER)   | none        | HOA Board          |
| Upgraded Occupant   | Former Tenant   | Premium (RESIDENT) | none        | After 1 year       |
| Property Agent      | AGENT role      | (no seat)          | manage only | SEEF Letting       |

---

## Open Questions (Updated)

1. **SEEF Access Model**: Should SEEF have a special agent role, or just request access per household?
2. **Profile Setup Links**: How secure should the initial setup link be? Token-based with expiration?
3. **Occupant Communication**: Should occupants receive messages via landlord's address or their own?
4. **Lease End**: What happens to profiles when lease ends? Automatic archive or manual removal?
5. **Premium Upgrade Cost**: How is the 1.5x rate handled? One-time payment or recurring?
6. **Co-Ownership**: Should co-owners have separate Standard Seats or share one?
7. **Child Privacy**: What data can minors access vs parents see?
8. **Multiple Properties**: Should landlord see unified or per-property dashboard?

---

_Last Updated: 2026-03-30_
