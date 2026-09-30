import { Bell, CalendarDays, FileSignature, Images, LayoutDashboard, MessageSquare, Sparkles, Star, UserRound } from 'lucide-react';
import type { NavEntry } from '@/components/layout/sidebar-shell';

export const talentNav: NavEntry[] = [
  { href: '/talent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/talent/profile', label: 'My profile', icon: UserRound },
  { href: '/talent/portfolio', label: 'Portfolio', icon: Images },
  { href: '/talent/events', label: 'Events', icon: CalendarDays },
  { href: '/talent/contracts', label: 'Contracts', icon: FileSignature },
  { href: '/talent/ratings', label: 'Ratings', icon: Star },
  { href: '/talent/messages', label: 'Messages', icon: MessageSquare, badge: 'messages' },
  { href: '/talent/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
  { href: '/talent/ai-assistant', label: 'AI assistant', icon: Sparkles },
];
