/**
 * Optimized data fetching utilities for Vercel cost reduction
 * Uses aggressive caching and ISR patterns to minimize serverless invocations
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from './revalidation';

// Cache dashboard stats with ISR tags for on-demand revalidation
export const getDashboardStats = unstable_cache(
  async () => {
    try {
      const [reqRes, bookRes, msgRes, notifRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/maintenance`, {
          next: { revalidate: 300 }, // 5 minutes
        }),
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/bookings`, {
          next: { revalidate: 300 },
        }),
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/conversations`, {
          next: { revalidate: 300 },
        }),
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications`, {
          next: { revalidate: 300 },
        }),
      ]);

      const [requests, bookings, conversations, notifications] = await Promise.all([
        reqRes.json(),
        bookRes.json(),
        msgRes.json(),
        notifRes.json(),
      ]);

      return {
        requests: requests.length || 0,
        bookings: bookings.length || 0,
        messages: conversations.length || 0,
        notifications: notifications.length || 0,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      return {
        requests: 0,
        bookings: 0,
        messages: 0,
        notifications: 0,
      };
    }
  },
  ['dashboard-stats'],
  {
    revalidate: 300, // 5 minutes
    tags: [
      CACHE_TAGS.STATS,
      CACHE_TAGS.MAINTENANCE,
      CACHE_TAGS.BOOKINGS,
      CACHE_TAGS.MESSAGES,
      CACHE_TAGS.NOTIFICATIONS,
    ],
  }
);

// Cache static stats for 10 minutes with revalidation tags
export const getStaticStats = unstable_cache(
  async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/stats`, {
        next: { revalidate: 600 }, // 10 minutes
      });
      return await res.json();
    } catch (error) {
      console.error('Failed to fetch static stats:', error);
      return {
        homes: 180,
        years: 15,
        birdSpecies: 47,
        nativePlants: 150,
        residents: 0,
        groups: 0,
        conservationArticles: 0,
      };
    }
  },
  ['static-stats'],
  {
    revalidate: 600, // 10 minutes
    tags: [CACHE_TAGS.STATS],
  }
);

// Cache user content for 2 minutes with revalidation tags
export const getUserContent = unstable_cache(
  async (userId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/content?authorId=${userId}`,
        {
          next: { revalidate: 120 }, // 2 minutes
        }
      );
      return await res.json();
    } catch (error) {
      console.error('Failed to fetch user content:', error);
      return [];
    }
  },
  ['user-content'],
  {
    revalidate: 120, // 2 minutes
    tags: [CACHE_TAGS.CONTENT],
  }
);
