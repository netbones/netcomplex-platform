export type ContentCategory =
  | 'ANNOUNCEMENT'
  | 'NEWS'
  | 'EVENT'
  | 'BLOG'
  | 'CONSERVATION'
  | 'SERVICES'
  | 'CAMPAIGN';

export const ContentCategoryEnum: Record<ContentCategory, ContentCategory> = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  NEWS: 'NEWS',
  EVENT: 'EVENT',
  BLOG: 'BLOG',
  CONSERVATION: 'CONSERVATION',
  SERVICES: 'SERVICES',
  CAMPAIGN: 'CAMPAIGN',
};
