'use client';

import { useApi } from '@/lib/use-api';

/** Unread badges for the sidebar / topbar. Polls quietly every 30 seconds. */
export function useUnreadCounts(messages: boolean) {
  const notifications = useApi<{ count: number }>('/notifications/unread-count', undefined, { pollMs: 30000 });
  const msgs = useApi<{ count: number }>(messages ? '/messages/unread-count' : null, undefined, { pollMs: 20000 });
  return { notifications: notifications.data?.count ?? 0, messages: msgs.data?.count ?? 0, reload: () => Promise.all([notifications.reload(), msgs.reload()]) };
}
