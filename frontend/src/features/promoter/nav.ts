import { Bell, Building2, CalendarDays, CreditCard, FileSignature, LayoutDashboard, MessageSquare, ScrollText, Users } from 'lucide-react';
import type { NavEntry } from '@/components/layout/sidebar-shell';

export const promoterNav: NavEntry[] = [
  { href: '/promoter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/promoter/events', label: 'My events', icon: CalendarDays },
  { href: '/promoter/talents', label: 'Find talent', icon: Users },
  { href: '/promoter/contracts', label: 'Contracts', icon: FileSignature },
  { href: '/promoter/licence', label: 'Licence', icon: ScrollText },
  { href: '/promoter/payments', label: 'Payments', icon: CreditCard },
  { href: '/promoter/messages', label: 'Messages', icon: MessageSquare, badge: 'messages' },
  { href: '/promoter/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
  { href: '/promoter/profile', label: 'Agency profile', icon: Building2 },
];
