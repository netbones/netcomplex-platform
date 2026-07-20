import { tenantProcedure, router, toEnvelope } from '@api/server';
import { listUserImages } from '@api/server';

export const mediaRouter = router({
  /**
   * List current user's uploaded images — tenant-scoped.
   * Replaces GET /api/media
   */
  listMedia: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/media/list',
        tags: ['Media'],
        summary: 'List user media images',
        protect: true,
      },
    })
    .query(async ({ ctx }) => {
      const images = await listUserImages(ctx.userId);
      return toEnvelope({ images });
    }),
});
