import { router } from '@api/server';
import { listingProcedures } from './listings';
import { inquiryProcedures } from './inquiries';
import { reviewProcedures } from './reviews';
import { moderationProcedures } from './moderation';
import { analyticsProcedures } from './analytics';
import { serviceBookingProcedures } from './service-bookings';
import { checkoutProcedures } from './checkout';
import { urgencyProcedures } from './urgency';
import { premiumProcedures } from './premium';

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
