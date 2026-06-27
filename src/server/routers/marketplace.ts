import { router } from '@api/server';
import { listingProcedures } from './marketplace/listings';
import { inquiryProcedures } from './marketplace/inquiries';
import { reviewProcedures } from './marketplace/reviews';
import { moderationProcedures } from './marketplace/moderation';
import { analyticsProcedures } from './marketplace/analytics';

export const marketplaceRouter = router({
  ...listingProcedures,
  ...inquiryProcedures,
  ...reviewProcedures,
  ...moderationProcedures,
  ...analyticsProcedures,
});
