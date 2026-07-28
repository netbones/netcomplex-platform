---
title: Premium Seat Model Documentation
status: current
reviewed: 2026-07-28
tags: [product, requirements]
audience: product
---

# Premium Seat Model Documentation

## Overview

The Premium Seat model provides property investors with advanced portfolio management capabilities, allowing them to consolidate multiple properties under a unified management system with tiered subscription levels.

## Model Structure

### PremiumSeat Schema

```prisma
model PremiumSeat {
  id              String    @id @default(cuid())

  // User relationship (property investor)
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // PORTFOLIO MANAGEMENT - Links multiple households for unified management
  linkedHouseholds Household[] @relation("PremiumSeatPortfolio")

  // Premium features
  isActive        Boolean   @default(true)
  portfolioName   String?   // Optional custom portfolio name

  // Pricing and billing
  subscriptionTier String   @default("basic") // basic, pro, enterprise
  maxProperties   Int       @default(5)      // Property limit based on tier

  // Platform address (e.g., investor@soralia.org)
  platformAddress String    @unique

  // Multi-tenancy
  organizationId  String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

## Subscription Tiers

### Basic Tier

- **subscriptionTier**: `"basic"`
- **maxProperties**: 5
- **Target**: Small property investors starting out
- **Features**:
  - Unified property portfolio view
  - Basic property listing management
  - Standard agent marketplace access
  - Email/phone support

### Pro Tier

- **subscriptionTier**: `"pro"`
- **maxProperties**: 15
- **Target**: Growing property investors
- **Additional Features**:
  - Advanced portfolio analytics
  - Priority customer support
  - Automated property management tools
  - Custom reporting dashboards
  - Bulk property operations

### Enterprise Tier

- **subscriptionTier**: `"enterprise"`
- **maxProperties**: 50
- **Target**: Large-scale property investors and management companies
- **Additional Features**:
  - Full suite of premium features
  - Dedicated account management
  - Custom integrations
  - White-label options
  - Advanced financial reporting
  - API access for third-party integrations

## Key Relationships

### Linked Households

- Premium Seats can link multiple households for unified management
- Uses `@relation("PremiumSeatPortfolio")` to connect households
- Each household can only belong to one Premium Seat portfolio

### Platform Address

- Unique email-like address for the investor (e.g., `investor@soralia.org`)
- Provides premium identity and communication channel
- Auto-generated from user's name during upgrade

## Business Logic

### Property Limits Enforcement

```typescript
// Example validation logic (to be implemented)
const canAddProperty = (premiumSeat: PremiumSeat, currentProperties: number) => {
  const limits = {
    basic: 5,
    pro: 15,
    enterprise: 50,
  };
  return currentProperties < limits[premiumSeat.subscriptionTier];
};
```

### Portfolio Management

- Users must own all households to be included in portfolio
- Minimum 2 properties required to create Premium Seat
- Existing Premium Seats can be updated to include additional properties

## Current Implementation Status

### ✅ Completed

- Database schema with tier fields
- Basic portfolio creation API (`/api/premium/portfolio`)
- Property listing management for portfolio owners
- Seed data with sample Premium Seat

### ⚠️ Partially Implemented

- Basic tier enforcement in seed data
- Portfolio viewing in dashboard widgets

### ❌ Not Yet Implemented

- Tier-based property limits validation
- Subscription billing and payment processing
- Tier upgrade/downgrade functionality
- Feature gates based on subscription level
- Advanced analytics and reporting
- UI for subscription management

## API Endpoints

### Portfolio Management

- `POST /api/premium/portfolio` - Create/upgrade to Premium Seat
- `GET /api/premium/portfolio` - Get user's portfolio data

### Property Listings

- `GET /api/premium/listings` - Get listings for portfolio properties
- `POST /api/premium/listings` - Create property listing (portfolio owners only)

## Future Development Requirements

### Phase 1: Core Functionality

1. Implement property limit validation in portfolio API
2. Add tier-based feature restrictions
3. Create subscription management UI
4. Add billing integration (Stripe/PayPal)

### Phase 2: Advanced Features

1. Portfolio analytics dashboard
2. Automated property management tools
3. Custom reporting and exports
4. Agent priority matching

### Phase 3: Enterprise Features

1. API access for integrations
2. White-label customization
3. Advanced financial modeling
4. Multi-user portfolio access

## Migration Considerations

### Existing Users

- Current Premium Seats default to "basic" tier
- No breaking changes for existing functionality
- Gradual rollout of tiered features

### Data Integrity

- Validate existing portfolios don't exceed tier limits during rollout
- Implement graceful degradation for over-limit portfolios
- Provide upgrade paths for users approaching limits

## Integration Points

### Related Models

- **User**: Premium Seat ownership
- **Household**: Properties in portfolio
- **PropertyListing**: Market listings for portfolio properties
- **AgentAccess**: Agent permissions for portfolio properties

### External Systems

- Payment processor for subscription management
- Email service for platform address communication
- Analytics platforms for portfolio insights

## Testing Strategy

### Unit Tests

- Property limit validation logic
- Tier-based feature access
- Portfolio creation/update operations

### Integration Tests

- End-to-end portfolio management flow
- Subscription upgrade scenarios
- Property listing creation for portfolios

### E2E Tests

- Complete user journey from free to premium
- Multi-property portfolio management
- Billing and subscription management

---

## Quick Reference

### Creating a Premium Seat

```typescript
await prisma.premiumSeat.create({
  data: {
    userId: user.id,
    platformAddress: 'investor@soralia.org',
    subscriptionTier: 'basic',
    maxProperties: 5,
    linkedHouseholds: {
      connect: householdIds.map(id => ({ id })),
    },
  },
});
```

### Checking Tier Limits

```typescript
const tierLimits = {
  basic: 5,
  pro: 15,
  enterprise: 50,
};

const canAddMore = portfolio.linkedHouseholds.length < tierLimits[portfolio.subscriptionTier];
```

---

_Last updated: 2026-04-02_
_Document version: 1.0_</content>
<parameter name="filePath">PremiumModelNote.md
