export type ContentCategory =
  | 'ANNOUNCEMENT'
  | 'NEWS'
  | 'EVENT'
  | 'BLOG'
  | 'CONSERVATION'
  | 'SERVICES'
  | 'RESOURCES';

export const ContentCategoryEnum: Record<ContentCategory, ContentCategory> = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  NEWS: 'NEWS',
  EVENT: 'EVENT',
  BLOG: 'BLOG',
  CONSERVATION: 'CONSERVATION',
  SERVICES: 'SERVICES',
  RESOURCES: 'RESOURCES',
};
