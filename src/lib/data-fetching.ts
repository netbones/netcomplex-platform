/**
 * Optimized data fetching utilities for Vercel cost reduction
 * Uses aggressive caching and ISR patterns to minimize serverless invocations
 */

import { cache } from 'react';

// Cache dashboard stats for 5 minutes
export const getDashboardStats = cache(async () => {
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
});

// Cache static stats for 10 minutes (these change infrequently)
export const getStaticStats = cache(async () => {
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
});

// Cache user content for 2 minutes
export const getUserContent = cache(async (userId: string) => {
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
});
