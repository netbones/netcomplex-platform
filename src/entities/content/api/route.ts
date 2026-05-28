import * as contentService from '../services';

/**
 * Lists content items with localization.
 */
export async function listContent(params: {
  tenantId: string;
  category?: string | null;
  published?: string | null;
  featured?: string | null;
  groupId?: string | null;
  authorId?: string | null;
  locale?: string;
}) {
  const userLocale = contentService.resolveLocale(params.locale);
  const contentItems = await contentService.listContent(params);

  return contentItems.map(item =>
    contentService.transformContentForLocale(item as unknown as Record<string, unknown>, userLocale)
  );
}

/**
 * Creates new content.
 */
export async function createContent(data: {
  tenantId: string;
  title: Record<string, string>;
  content: Record<string, string>;
  excerpt: Record<string, string> | null;
  category: 'ANNOUNCEMENT' | 'NEWS' | 'EVENT' | 'BLOG' | 'CONSERVATION' | 'SERVICES' | 'CAMPAIGN';
  authorId: string;
  groupId?: string | null;
  featured?: boolean;
  published?: boolean;
  publishedAt?: string | null;
  expiresAt?: string | null;
  tags?: string[];
  priority?: string;
  defaultLocale?: string;
  contentType?: string;
}) {
  const now = new Date();

  return contentService.createContent({
    id: crypto.randomUUID(),
    tenantId: data.tenantId,
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    category: data.category,
    authorId: data.authorId,
    groupId: data.groupId || null,
    featured: data.featured || false,
    published: data.published || false,
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    tags: data.tags || [],
    priority: data.priority || 'normal',
    defaultLocale: data.defaultLocale || 'en',
    contentType: data.contentType || 'article',
  });
}
