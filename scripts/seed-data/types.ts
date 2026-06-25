/**
 * TenantSeedData — the single source of truth for what a per-tenant seed
 * provides to the orchestrator (`scripts/seed-drizzle.ts`).
 *
 * Every tenant seed module (e.g. `soralia-village.ts`, `soralia-heights.ts`)
 * exports a `TenantSeedData` const matching this shape. To add a new tenant,
 * drop a new file in this directory and register it in `seed-drizzle.ts`.
 *
 * The shape mirrors the entities the orchestrator inserts, in the order it
 * inserts them. Fields prefixed with `T_` are stamped automatically by the
 * builder (tenantId, createdAt, updatedAt, etc.) — tenant data files should
 * NOT include them.
 *
 *   import type { TenantSeedData } from './types';
 *   export const MY_TENANT: TenantSeedData = { ... };
 */

export type UserRole = 'RESIDENT' | 'BOARD' | 'ADMIN' | 'COMMITTEE' | 'AGENT';

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export interface TenantInput {
  /** Display name, e.g. "Soralia Village" */
  name: string;
  /** URL slug, unique. Used as the tenant identifier in URL paths. */
  slug: string;
  /** Brand primary color, hex. */
  primaryColor: string;
  /** Brand accent color, hex. */
  accentColor: string;
  /**
   * Subscription tier. Stored as free-form `text` in the database, but
   * the application code coerces it to `TierLevel` (see
   * `src/shared/lib/constants/tiers.ts`). Must be one of:
   *   - `foundation` — entry tier, community basics
   *   - `depth`      — adds marketplace, maintenance, surveys
   *   - `core`       — flagship tier, all features including white-label
   */
  subscriptionTier: 'foundation' | 'depth' | 'core';
  /** Platform tier enum. */
  tier: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  /** Free-form feature flags, e.g. { i18n: true }. */
  featureFlags: Record<string, unknown>;
  /** Marketing tagline shown on the public landing page. */
  tagline?: string;
  /** Short description, used in directory listings. */
  description?: string;
  /** Letter prefix used for ticket numbers, e.g. "SRV" → SRV-2026-0001. */
  ticketPrefix: string;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface UserInput {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  interests: string[];
  avatar?: string;
  profileImage?: string;
  books?: Array<{
    id: string;
    title: string;
    author: string;
    coverUrl: string;
  }>;
  isPublic?: boolean;
  isActive?: boolean;
  emailVerified?: boolean;
  /** Platform admin flag (cross-tenant access). */
  isPlatformAdmin?: boolean;
}

export interface PropertyInput {
  id: string;
  platformAddress: string;
  /** "Pagoda Rd" for free-standing homes, "Block A / Unit 304" for condos. */
  street: string;
  unit: string;
  ownerId: string;
  homeImage?: string;
}

export interface HouseholdInput {
  id: string;
  propertyId: string;
  occupancyType: 'OWNER_OCCUPIED' | 'RENTAL';
  moveInDate: Date;
  status?: string;
}

export interface ProfileInput {
  id: string;
  householdId: string;
  userId: string;
  displayName: string;
  profileAddress: string;
  householdRole: 'OCCUPANT' | 'MINOR' | 'FAMILY';
  residencyType: 'OWNER' | 'RENTER' | 'FAMILY';
  occupantSince: Date;
  isPublic?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  status?: string;
}

export interface StandardSeatInput {
  id: string;
  userId: string;
  propertyId: string;
  isPrimaryOwner: boolean;
  platformAddress: string;
}

export interface SoloSeatInput {
  id: string;
  userId: string;
  platformAddress: string;
  propertyId?: string;
  seatType: 'RESIDENT' | 'MEMBER';
  isComplimentary?: boolean;
  linkedFromProfileId?: string;
}

export interface PremiumSeatInput {
  id: string;
  userId: string;
  platformAddress: string;
  portfolioName?: string;
  subscriptionTier?: string;
  maxProperties?: number;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Community services marketplace
// ---------------------------------------------------------------------------

export interface ServiceListingInput {
  id: string;
  providerId: string;
  providerType?: 'COMMUNITY' | 'THIRD_PARTY';
  title: string;
  description: string;
  category: string;
  priceType: 'HOURLY' | 'FIXED' | 'QUOTE' | 'FREE';
  price?: string;
  serviceAreas: string[];
  availability: Record<string, boolean>;
  licenseNumber?: string;
  insuranceExpiry?: Date;
  images: string[];
  portfolio: string[];
  contactMethods: string[];
  verified: boolean;
  rating: number;
  reviewCount: number;
  status: 'ACTIVE' | 'DRAFT' | 'PENDING' | 'SOLD' | 'RENTED' | 'WITHDRAWN';
  isPublished: boolean;
  termsAndConditions?: string;
  cancellationPolicy?: string;
}

export interface ServiceReviewInput {
  id: string;
  listingId: string;
  reviewerId: string;
  rating: number;
  title: string;
  comment: string;
  serviceDate: Date;
  responseQuality: number;
  isPublished: boolean;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface GroupInput {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  isPublic: boolean;
  residentFilter: 'ALL' | 'OWNERS_ONLY' | 'RENTERS_ONLY';
  ownerId: string;
}

export interface GroupMemberInput {
  id: string;
  userId: string;
  groupId: string;
  role: 'MEMBER' | 'ADMIN' | 'MODERATOR';
}

// ---------------------------------------------------------------------------
// Resources (governance documents, DIY guides, etc.)
// ---------------------------------------------------------------------------

export type ResourceCategory =
  | 'ARCHITECTURAL'
  | 'ENGINEERING'
  | 'GOVERNANCE'
  | 'FINANCIAL'
  | 'LEGAL'
  | 'DIY'
  | 'BOARD_REPORT';

export type ResourceVisibility = 'ALL_RESIDENTS' | 'OWNERS_ONLY' | 'COMMITTEE_ONLY';

export interface ResourceInput {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  version: string;
  visibility: ResourceVisibility;
  authorId: string;
  publishedAt: Date;
}

// ---------------------------------------------------------------------------
// Content (CMS — news, blogs, events, campaigns, conservation)
// ---------------------------------------------------------------------------

export type ContentCategory =
  | 'NEWS'
  | 'BLOG'
  | 'ANNOUNCEMENT'
  | 'EVENT'
  | 'CONSERVATION'
  | 'CAMPAIGN';

export interface ContentInput {
  id: string;
  title: { en: string };
  content: unknown; // TipTap doc structure
  excerpt?: { en: string };
  image?: string;
  category: ContentCategory;
  tags: string[];
  authorId: string;
  published: boolean;
  featured: boolean;
  publishedAt: Date;
  expiresAt?: Date;
}

// ---------------------------------------------------------------------------
// Events (calendar)
// ---------------------------------------------------------------------------

export interface EventInput {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  organizer: string;
  image?: string;
  isPublic: boolean;
}

// ---------------------------------------------------------------------------
// Surveys
// ---------------------------------------------------------------------------

export interface SurveyInput {
  id: string;
  title: string;
  description: string;
  type: 'INTERNAL' | 'EXTERNAL';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate: Date;
}

export interface SurveyQuestionInput {
  id: string;
  surveyId: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT' | 'RATING' | 'YES_NO';
  options: string[];
  required: boolean;
  order: number;
}

export interface SurveyResponseInput {
  id: string;
  surveyId: string;
  userId: string;
  answers: Record<string, string | string[]>;
}

// ---------------------------------------------------------------------------
// Competitions
// ---------------------------------------------------------------------------

export interface CompetitionInput {
  id: string;
  title: string;
  description: string;
  rules: string;
  prizeInfo: string;
  startDate: Date;
  endDate: Date;
  status: 'ACTIVE' | 'DRAFT' | 'CANCELLED' | 'ENDED';
  type?: 'RAFFLE' | 'PHOTO' | 'SCORE';
  winnersCount?: number;
  maxParticipants?: number | null;
  entryCount: number;
  image?: string;
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export interface MaintenanceCategoryInput {
  id: string;
  value: string;
  label: string;
  description: string;
  isActive: boolean;
}

export interface MaintenanceTeamInput {
  id: string;
  name: string;
  trade: string;
  contactName: string;
  isActive: boolean;
}

export interface ServiceProviderInput {
  id: string;
  companyName: string;
  trade: string;
  phone: string;
  isActive: boolean;
}

export type RequestStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export interface MaintenanceRequestInput {
  id: string;
  userId: string;
  category: string;
  priority: RequestPriority;
  status: RequestStatus;
  ticketNumber: string;
  assignedTeamId?: string;
  assignedProviderId?: string;
  description: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingInput {
  id: string;
  key: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export interface AnnouncementInput {
  id: string;
  title: { en: string };
  content: string;
  author: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  targetFilter?: 'ALL' | 'OWNERS_ONLY' | 'RENTERS_ONLY';
  targetRoles?: string[];
  expiresAt?: Date;
}

// ---------------------------------------------------------------------------
// Provider Billing
// ---------------------------------------------------------------------------

export interface SubscriptionTierInput {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency?: string;
  maxListings: number | null;
  features: Record<string, unknown>;
  platformFeePercent: string;
  verificationRequired: boolean;
}

export interface ProviderReputationInput {
  id: string;
  providerId: string;
  totalScore: number;
  responseTimeScore: number | null;
  qualityScore: number | null;
  reviewScore: number | null;
  complianceScore: number | null;
  engagementScore: number | null;
  lastCalculatedAt: Date | null;
}

export interface ProviderMeritInput {
  id: string;
  providerId: string;
  meritType: string;
  points: number;
  description?: string;
  referenceId?: string | null;
  evidenceUrl?: string;
  createdAt?: string;
}

export interface ProviderSubscriptionInput {
  id: string;
  providerId: string;
  tierId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  startDate: Date;
  endDate: Date | null;
  nextBillingDate: Date | null;
  price: string;
  currency?: string;
  paymentGateway: 'PAYSTACK' | 'PAYPAL' | null;
}

export interface PaymentTransactionInput {
  id: string;
  providerId: string;
  subscriptionId: string;
  amount: string;
  currency?: string;
  platformFee: string;
  processorFee: string;
  netAmount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  gateway: 'PAYSTACK' | 'PAYPAL';
  externalRef: string | null;
  invoiceUrl: string | null;
}

export interface ProviderChargeInput {
  id: string;
  providerId: string;
  subscriptionId: string;
  transactionId: string | null;
  description: string;
  amount: string;
  currency?: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  gateway: 'PAYSTACK' | 'PAYPAL' | null;
  externalRef: string | null;
  dueDate: Date;
  paidAt: Date | null;
}

export interface ProviderInvoiceInput {
  id: string;
  providerId: string;
  subscriptionId: string;
  transactionId: string;
  invoiceNumber: string;
  items: unknown;
  total: string;
  platformFee: string;
  processorFee: string;
  netAmount: string;
  currency?: string;
  status: 'PENDING' | 'PAID' | 'VOID';
  paidAt: Date | null;
  pdfUrl: string | null;
}

export interface RevenueRecordInput {
  id: string;
  providerId: string;
  transactionId: string;
  grossAmount: string;
  platformFee: string;
  processorFee: string;
  netAmount: string;
  currency?: string;
  period: string;
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

/**
 * The complete set of seed entities for a single tenant. The orchestrator
 * inserts them in dependency order.
 */
export interface TenantSeedData {
  tenant: TenantInput;
  users: UserInput[];
  properties: PropertyInput[];
  households: HouseholdInput[];
  profiles: ProfileInput[];
  standardSeats: StandardSeatInput[];
  soloSeats?: SoloSeatInput[];
  premiumSeats?: PremiumSeatInput[];
  serviceListings: ServiceListingInput[];
  serviceReviews: ServiceReviewInput[];
  groups: GroupInput[];
  groupMembers: GroupMemberInput[];
  resources: ResourceInput[];
  content: ContentInput[];
  events: EventInput[];
  surveys: SurveyInput[];
  surveyQuestions: SurveyQuestionInput[];
  surveyResponses: SurveyResponseInput[];
  competitions: CompetitionInput[];
  maintenanceCategories: MaintenanceCategoryInput[];
  maintenanceTeams: MaintenanceTeamInput[];
  serviceProviders: ServiceProviderInput[];
  maintenanceRequests: MaintenanceRequestInput[];
  settings: SettingInput[];
  announcements?: AnnouncementInput[];
  subscriptionTiers: SubscriptionTierInput[];
  providerReputations: ProviderReputationInput[];
  providerMerits: ProviderMeritInput[];
  providerSubscriptions: ProviderSubscriptionInput[];
  paymentTransactions: PaymentTransactionInput[];
  providerCharges: ProviderChargeInput[];
  providerInvoices: ProviderInvoiceInput[];
  revenueRecords: RevenueRecordInput[];
}
