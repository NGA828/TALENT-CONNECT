import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQuery, pageArgs, toPage } from '../common/utils/pagination';

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, input: NotifyInput) {
    return this.prisma.notification.create({ data: { userId, ...input } });
  }

  async createMany(userIds: string[], input: NotifyInput) {
    if (!userIds.length) return;
    await this.prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, ...input })) });
  }

  async list(userId: string, q: PaginationQuery, unreadOnly = false) {
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { sentAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.notification.count({ where }),
    ]);
    return toPage(items, total, q);
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('Notification not found.');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    const r = await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { updated: r.count };
  }
}
