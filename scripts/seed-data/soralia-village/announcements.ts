import type { AnnouncementInput } from '../types';

export const announcements: AnnouncementInput[] = [
  {
    id: 'announcement-pool-closure',
    title: { en: 'Pool Maintenance — June 20-22' },
    content:
      'The community pool will be closed for scheduled maintenance from June 20 to June 22. We apologise for the inconvenience.',
    author: 'Sarah Mitchell',
    priority: 'high',
    targetFilter: 'ALL',
    targetRoles: ['RESIDENT', 'BOARD', 'COMMITTEE'],
    expiresAt: new Date('2026-06-23'),
  },
  {
    id: 'announcement-annual-meeting',
    title: { en: 'Annual General Meeting — July 15' },
    content:
      'The Annual General Meeting will be held on July 15 at 18:00 in the community hall. All residents are encouraged to attend. Agenda items include budget review, committee elections, and upcoming projects.',
    author: 'John Smith',
    priority: 'normal',
    targetFilter: 'ALL',
    targetRoles: ['RESIDENT', 'BOARD', 'COMMITTEE'],
    expiresAt: new Date('2026-07-16'),
  },
  {
    id: 'announcement-noise-works',
    title: { en: 'Scheduled Construction Noise — Block C' },
    content:
      'Construction work on Block C will take place on weekdays from 8:00 to 17:00 through end of July. Some noise disruption is expected. Please contact management with any concerns.',
    author: 'Sarah Mitchell',
    priority: 'normal',
    targetFilter: 'ALL',
    targetRoles: ['RESIDENT', 'BOARD', 'COMMITTEE'],
    expiresAt: new Date('2026-07-31'),
  },
  {
    id: 'announcement-waste-collection',
    title: { en: 'Recycling Collection Schedule Change' },
    content:
      'Recycling collection has been moved to Thursdays effective immediately. Please ensure bins are placed at the kerb by 06:00.',
    author: 'David van der Merwe',
    priority: 'low',
    targetFilter: 'ALL',
    targetRoles: ['RESIDENT'],
  },
  {
    id: 'announcement-garden-workshop',
    title: { en: 'Community Garden Workshop — Saturday June 28' },
    content:
      'Join us for a hands-on gardening workshop in the community garden. Tools and refreshments provided. All skill levels welcome!',
    author: 'Lisa Chen',
    priority: 'normal',
    targetFilter: 'ALL',
    targetRoles: ['RESIDENT'],
    expiresAt: new Date('2026-06-29'),
  },
];
