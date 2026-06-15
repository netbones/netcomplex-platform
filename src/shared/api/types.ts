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

export type ContentLicense = 'CC0' | 'CC_BY' | 'CC_BY_SA' | 'CC_BY_NC' | 'ALL_RIGHTS_RESERVED';

export const ContentLicenseEnum: Record<ContentLicense, ContentLicense> = {
  CC0: 'CC0',
  CC_BY: 'CC_BY',
  CC_BY_SA: 'CC_BY_SA',
  CC_BY_NC: 'CC_BY_NC',
  ALL_RIGHTS_RESERVED: 'ALL_RIGHTS_RESERVED',
};

export type ModerationStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'FLAGGED';

export const ModerationStatusEnum: Record<ModerationStatus, ModerationStatus> = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
  FLAGGED: 'FLAGGED',
};
