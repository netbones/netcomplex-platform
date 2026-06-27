// Server-only public API barrel for @entities/marketplace.
// Import from here in API routes, server components, and server-side utilities.
// Client components must use the default barrel (@entities/marketplace).

export { initializeCheckout, calculatePlatformFee, createPaymentTransaction } from './api/checkout';
export type { CheckoutParams, CheckoutResult } from './api/checkout';
export { checkoutRequestSchema, serviceBookingSchema } from './schema';
export type { CheckoutRequest, ServiceBookingFormData } from './schema';
export {
  notifyInquiryReceived,
  notifyInquiryResponse,
  notifyBookingConfirmed,
  notifyPaymentReceived,
  notifyReviewPosted,
  notifyListingApproved,
  notifyListingRejected,
  notifyBookingCancelled,
} from './api/notification-triggers';

// Re-export provider-platform helpers for marketplace use cases
export { getProviderRecordForUser } from '@shared/api';
