import { router } from '@api/server';
import { listingProcedures } from './marketplace/listings';
import { inquiryProcedures } from './marketplace/inquiries';
import { reviewProcedures } from './marketplace/reviews';
import { moderationProcedures } from './marketplace/moderation';
import { analyticsProcedures } from './marketplace/analytics';
import { serviceBookingProcedures } from './marketplace/service-bookings';
import { checkoutProcedures } from './marketplace/checkout';
import { urgencyProcedures } from './marketplace/urgency';
import { premiumProcedures } from './marketplace/premium';

export const marketplaceRouter = router({
  ...listingProcedures,
  ...inquiryProcedures,
  ...reviewProcedures,
  ...moderationProcedures,
  ...analyticsProcedures,
  ...serviceBookingProcedures,
  ...checkoutProcedures,
  ...urgencyProcedures,
  ...premiumProcedures,
});
