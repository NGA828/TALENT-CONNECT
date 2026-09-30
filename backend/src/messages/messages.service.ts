import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role, UserStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/messages.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private headline(u: { talent: { specialization: string } | null; promoter: { agencyName: string } | null }) {
    return u.talent?.specialization ?? u.promoter?.agencyName ?? '';
  }

  async conversations(userId: string) {
    const msgs = await this.prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { sentAt: 'desc' },
      take: 1500,
      select: { id: true, senderId: true, recipientId: true, content: true, sentAt: true, isRead: true },
    });
    const byPeer = new Map<string, { last: (typeof msgs)[number]; unread: number }>();
    for (const m of msgs) {
      const peer = m.senderId === userId ? m.recipientId : m.senderId;
      const entry = byPeer.get(peer) ?? { last: m, unread: 0 };
      if (m.recipientId === userId && !m.isRead) entry.unread += 1;
      byPeer.set(peer, entry);
    }
    if (!byPeer.size) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...byPeer.keys()] } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, talent: { select: { specialization: true } }, promoter: { select: { agencyName: true } } },
    });
    return users
      .map((u) => {
        const e = byPeer.get(u.id)!;
        return {
          user: { id: u.id, firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl, role: u.role, headline: this.headline(u) },
          lastMessage: { id: e.last.id, content: e.last.content, sentAt: e.last.sentAt, fromMe: e.last.senderId === userId },
          unread: e.unread,
        };
      })
      .sort((a, b) => +new Date(b.lastMessage.sentAt) - +new Date(a.lastMessage.sentAt));
  }

  async thread(userId: string, peerId: string) {
    const rows = await this.prisma.message.findMany({
      where: { OR: [{ senderId: userId, recipientId: peerId }, { senderId: peerId, recipientId: userId }] },
      orderBy: { sentAt: 'desc' },
      take: 200,
    });
    return rows.reverse();
  }

  async send(user: AuthUser, dto: SendMessageDto) {
    if (dto.recipientId === user.id) throw new BadRequestException('You cannot message yourself.');
    const recipient = await this.prisma.user.findUnique({ where: { id: dto.recipientId } });
    if (!recipient || recipient.status !== UserStatus.ACTIVE) throw new NotFoundException('Recipient not found.');
    const valid = (user.role === Role.TALENT && recipient.role === Role.PROMOTER) || (user.role === Role.PROMOTER && recipient.role === Role.TALENT);
    if (!valid) throw new ForbiddenException('Messaging is available between talents and promoters.');

    const hadUnread = await this.prisma.message.count({ where: { senderId: user.id, recipientId: recipient.id, isRead: false } });
    const message = await this.prisma.message.create({ data: { senderId: user.id, recipientId: recipient.id, content: dto.content } });
    if (hadUnread === 0) {
      // Only notify for the first unread message of a burst to avoid notification spam.
      const base = recipient.role === Role.TALENT ? '/talent' : '/promoter';
      await this.notifications.create(recipient.id, {
        type: NotificationType.MESSAGE,
        title: `New message from ${user.firstName} ${user.lastName}`,
        message: dto.content.length > 90 ? `${dto.content.slice(0, 90)}…` : dto.content,
        link: `${base}/messages?with=${user.id}`,
      });
    }
    return message;
  }

  async markConversationRead(userId: string, peerId: string) {
    const r = await this.prisma.message.updateMany({ where: { senderId: peerId, recipientId: userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return { updated: r.count };
  }

  async markRead(userId: string, id: string) {
    const m = await this.prisma.message.findUnique({ where: { id } });
    if (!m || m.recipientId !== userId) throw new NotFoundException('Message not found.');
    return this.prisma.message.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  unreadCount(userId: string) {
    return this.prisma.message.count({ where: { recipientId: userId, isRead: false } });
  }
}
