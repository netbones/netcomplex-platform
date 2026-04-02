# Community Services Marketplace UI Implementation Plan

## Overview

The Community Services Marketplace introduces a new service discovery and booking system within the Soralia Village platform. This plan outlines the UI enhancements required to support service listings, provider management, and admin moderation.

## Directory Page Enhancements

### Services Tab Addition

- **Location**: `/directory` - Add "Services" tab alongside existing Resident Directory tabs
- **Tab Structure**:

  ```
  [ Residents ] [ Services ] [ Events ] [ Facilities ]
  ```

- **Default View**: Service listings grid with filtering sidebar

### Service Directory Cards

**Card Design**: Similar to resident cards but service-focused

```tsx
// ServiceCard component structure
<div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
  {/* Header with service type badge */}
  <div className="flex items-start justify-between mb-3">
    <ServiceTypeBadge type={serviceType} />
    <div className="text-right">
      <div className="flex items-center gap-1">
        <StarRating rating={rating} />
        <span className="text-sm text-gray-600">({reviewCount})</span>
      </div>
    </div>
  </div>

  {/* Service Image */}
  <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 overflow-hidden">
    {images?.[0] && <img src={images[0]} alt={title} className="w-full h-full object-cover" />}
  </div>

  {/* Service Details */}
  <div className="space-y-2">
    <h3 className="font-semibold text-gray-900 line-clamp-2">{title}</h3>
    <p className="text-sm text-gray-600 line-clamp-2">{description}</p>

    {/* Category badges */}
    <div className="flex flex-wrap gap-1">
      <CategoryBadge category={category} />
      {subcategory && <CategoryBadge category={subcategory} variant="secondary" />}
    </div>

    {/* Provider info */}
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <UserAvatar user={provider} size="sm" />
      <span>{provider.name}</span>
      {verified && <VerifiedBadge />}
    </div>

    {/* Pricing */}
    <div className="flex items-center justify-between">
      <PricingDisplay priceType={priceType} price={price} />
      <QuickActionButtons serviceId={id} />
    </div>
  </div>
</div>
```

**Service Type Badges**:

- 🏛️ **Community Service**: Official HOA-provided services (green badge)
- 👤 **Member Service**: Individual resident-provided services (blue badge)
- 🏢 **Trusted Third Party**: Approved external providers (purple badge)

## Dashboard Widgets

### User Dashboard Widgets

#### My Service Listings Widget

```tsx
function MyServiceListingsWidget() {
  // Shows user's active service listings
  // Quick actions: Edit, Publish/Unpublish, View Inquiries
  // Status indicators: Draft, Published, Pending Moderation
}
```

#### My Service Inquiries Widget

```tsx
function MyServiceInquiriesWidget() {
  // Shows inquiries sent to service providers
  // Status tracking: Pending, Responded, Accepted, Completed
  // Quick actions: View Details, Contact Provider
}
```

#### Service Reviews Widget

```tsx
function ServiceReviewsWidget() {
  // Shows reviews received (for providers) or given (for users)
  // Rating summaries and recent review activity
}
```

### Admin Dashboard Widgets

#### Marketplace Moderation Queue

```tsx
function ModerationQueueWidget() {
  // Shows pending service listings requiring approval
  // Quick actions: Approve, Reject, View Details
  // Priority indicators for new vs updated listings
}
```

#### Marketplace Analytics Widget

```tsx
function MarketplaceAnalyticsWidget() {
  // Key metrics: Total listings, active providers, inquiries, reviews
  // Charts: Service category distribution, inquiry conversion rates
  // Trends: Weekly/monthly growth indicators
}
```

#### Service Quality Monitor

```tsx
function ServiceQualityWidget() {
  // Flags: Low-rated services, inactive providers, unresolved complaints
  // Quality scores by category and provider
  // Compliance monitoring for verified providers
}
```

## Service Detail Pages

### Service Listing Detail Page (`/services/[id]`)

- **Hero Section**: Large service image, title, rating, provider info
- **Service Overview**: Description, categories, service areas, availability
- **Pricing & Booking**: Price details, booking/inquiry form
- **Provider Profile**: Credentials, verification status, response time
- **Reviews Section**: Review list with pagination, average rating
- **Related Services**: Similar services in same category

### Service Provider Profile Page (`/services/provider/[id]`)

- **Provider Overview**: Business info, specializations, service areas
- **Portfolio Gallery**: Service photos and examples
- **Active Listings**: Grid of provider's current services
- **Performance Metrics**: Rating, response time, completed services
- **Contact Options**: Inquiry form, booking calendar

## Trusted Third Party Services Portal

### Third Party Registration Page (`/services/third-party/register`)

- **Registration Form**: Business details, licensing, insurance verification
- **Document Upload**: License certificates, insurance policies, references
- **Verification Process**: Automated checks + manual review workflow
- **Onboarding Flow**: Welcome guide, platform training, listing creation

### Third Party Dashboard (`/services/third-party/dashboard`)

- **Provider Overview**: Account status, verification level, subscription tier
- **Listing Management**: Create, edit, publish service listings
- **Analytics**: Views, inquiries, conversion rates, revenue tracking
- **Customer Management**: Inquiry responses, booking management
- **Billing**: Subscription management, transaction history

### Third Party Service Management

```tsx
function ThirdPartyDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'inquiries' | 'analytics'>(
    'overview'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Navigation Tabs */}
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'overview' && <ProviderOverview />}
      {activeTab === 'listings' && <ServiceListingsManager />}
      {activeTab === 'inquiries' && <InquiryManager />}
      {activeTab === 'analytics' && <ProviderAnalytics />}
    </div>
  );
}
```

## Admin Moderation Interface

### Moderation Dashboard (`/admin/services/moderation`)

- **Queue Management**: Filter by status, category, submission date
- **Bulk Actions**: Approve/Reject multiple listings
- **Review Interface**: Side-by-side comparison of listing details
- **Audit Trail**: Moderation history and decision rationale

### Service Category Management

- **Category Editor**: Add/edit service categories and subcategories
- **Guidelines Management**: Category-specific listing requirements
- **Quality Standards**: Minimum requirements per category

## Mobile Responsiveness

### Responsive Design Considerations

- **Service Cards**: Stack vertically on mobile, maintain key info visibility
- **Directory Filters**: Collapsible sidebar on mobile, top filter bar
- **Service Detail Pages**: Optimized layouts for mobile viewing
- **Dashboard Widgets**: Single column layout on mobile devices

## Component Architecture

### Shared Components

```tsx
// Reusable components across marketplace
export { ServiceCard } from '@/components/services/ServiceCard';
export { ServiceTypeBadge } from '@/components/services/ServiceTypeBadge';
export { CategoryBadge } from '@/components/services/CategoryBadge';
export { PricingDisplay } from '@/components/services/PricingDisplay';
export { ReviewStars } from '@/components/services/ReviewStars';
export { InquiryForm } from '@/components/services/InquiryForm';
export { ModerationActions } from '@/components/admin/services/ModerationActions';
```

### Page Structure

```
src/
├── app/
│   ├── directory/
│   │   └── page.tsx (add Services tab)
│   ├── services/
│   │   ├── [id]/page.tsx (service detail)
│   │   ├── provider/[id]/page.tsx (provider profile)
│   │   └── third-party/
│   │       ├── register/page.tsx
│   │       └── dashboard/page.tsx
│   └── admin/
│       └── services/
│           └── moderation/page.tsx
├── components/
│   ├── services/
│   │   ├── ServiceCard.tsx
│   │   ├── ServiceTypeBadge.tsx
│   │   ├── CategoryBadge.tsx
│   │   ├── PricingDisplay.tsx
│   │   ├── ReviewStars.tsx
│   │   └── InquiryForm.tsx
│   └── dashboard/
│       └── widgets/
│           ├── MyServiceListingsWidget.tsx
│           ├── ServiceInquiriesWidget.tsx
│           └── MarketplaceAnalyticsWidget.tsx
```

## Implementation Phases

### Phase 1: Core Directory Integration

1. Add Services tab to directory page [x]
2. Implement ServiceCard component [x]
3. Create basic service listing display [x]
4. Add service type filtering []

### Phase 2: Service Detail Pages

1. Service detail page with booking/inquiry
2. Provider profile pages
3. Review and rating display
4. Related services recommendations

### Phase 3: Dashboard Integration

1. User dashboard service widgets
2. Provider dashboard functionality
3. Admin moderation widgets
4. Analytics integration

### Phase 4: Third Party Portal

1. Third party registration flow
2. Provider dashboard
3. Advanced analytics
4. Billing integration

### Phase 5: Advanced Features

1. Booking calendar integration
2. Payment processing
3. Notification system
4. Mobile app optimization

## Success Metrics

- **User Engagement**: Service inquiry conversion rates, user retention
- **Provider Satisfaction**: Listing creation ease, inquiry response rates
- **Admin Efficiency**: Moderation processing time, quality compliance
- **Platform Growth**: Service listing growth, third-party provider adoption
- **Revenue Impact**: Transaction volume, platform fee collection

This UI plan provides a comprehensive framework for integrating the Community Services Marketplace into the existing Soralia Village platform while maintaining design consistency and user experience quality.
