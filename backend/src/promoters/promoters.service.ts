import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ContractStatus, EventStatus, LicenceStatus, MediaType, NotificationType, PaymentStatus, ReviewAction, Role, UserStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UploadedFileLike } from '../storage/storage.service';
import { SubmitLicenceDto, UpdatePromoterDto } from './dto/promoters.dto';

@Injectable()
export class PromotersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  private async load(promoterId: string) {
    return this.prisma.promoter.findUniqueOrThrow({
      where: { id: promoterId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, createdAt: true } }, reviews: { orderBy: { createdAt: 'desc' }, include: { admin: { select: { firstName: true, lastName: true } } } } },
    });
  }

  private map(p: Awaited<ReturnType<PromotersService['load']>>) {
    const { reviews, user, ...rest } = p;
    return {
      ...rest,
      user,
      licenceHistory: reviews.map((r) => ({ id: r.id, action: r.action, reason: r.reason, createdAt: r.createdAt, admin: r.admin ? `${r.admin.firstName} ${r.admin.lastName}` : null })),
    };
  }

  async me(promoterId: string) {
    return this.map(await this.load(promoterId));
  }

  async updateMe(promoterId: string, dto: UpdatePromoterDto) {
    const p = await this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId } });
    const { firstName, lastName, phone, ...agency } = dto;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: p.userId }, data: { firstName, lastName, phone } }),
      this.prisma.promoter.update({ where: { id: promoterId }, data: agency }),
    ]);
    return this.me(promoterId);
  }

  // ─────────────── licence workflow ───────────────

  async submitLicence(promoterId: string, dto: SubmitLicenceDto, file?: UploadedFileLike) {
    const p = await this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId } });
    if (p.licenceStatus === LicenceStatus.VERIFIED) throw new ConflictException('Your licence is already verified.');
    const expiry = new Date(dto.licenceExpiry);
    if (expiry.getTime() < Date.now()) throw new BadRequestException('The licence has already expired. Submit a valid licence.');

    let documentUrl = p.licenceDocumentUrl;
    if (file) {
      const stored = await this.storage.save(file, 'licences', [MediaType.DOCUMENT, MediaType.IMAGE]);
      documentUrl = stored.url;
      await this.storage.remove(p.licenceDocumentUrl);
    }
    await this.prisma.promoter.update({
      where: { id: promoterId },
      data: { licenceNumber: dto.licenceNumber, licenceAuthority: dto.licenceAuthority, licenceExpiry: expiry, licenceInfo: dto.licenceInfo, licenceDocumentUrl: documentUrl },
    });
    await this.completeSubmissionIfReady(promoterId);
    return this.me(promoterId);
  }

  /** Called after licence details are saved and after a successful licence-fee payment. */
  async completeSubmissionIfReady(promoterId: string) {
    const p = await this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId }, include: { user: true } });
    const hasDetails = !!(p.licenceNumber && p.licenceAuthority && p.licenceExpiry);
    const open = p.licenceStatus === LicenceStatus.NOT_SUBMITTED || p.licenceStatus === LicenceStatus.REJECTED;
    if (!(hasDetails && p.licenceFeePaid && open)) return false;

    await this.prisma.$transaction([
      this.prisma.promoter.update({
        where: { id: promoterId },
        data: { licenceStatus: LicenceStatus.PENDING, licenceSubmittedAt: new Date(), licenceRejectionReason: null },
      }),
      this.prisma.licenceReview.create({ data: { promoterId, action: ReviewAction.SUBMITTED } }),
    ]);
    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN, status: UserStatus.ACTIVE }, select: { id: true } });
    await this.notifications.createMany(admins.map((a) => a.id), {
      type: NotificationType.ADMIN,
      title: 'Promoter licence awaiting review',
      message: `${p.agencyName} submitted a licence for verification.`,
      link: `/admin/promoters/${promoterId}`,
    });
    await this.notifications.create(p.userId, {
      type: NotificationType.LICENCE,
      title: 'Licence submitted',
      message: 'Your licence and fee were received. An administrator will review your agency shortly.',
      link: '/promoter/licence',
    });
    return true;
  }

  async markFeePaid(promoterId: string) {
    await this.prisma.promoter.update({ where: { id: promoterId }, data: { licenceFeePaid: true } });
    return this.completeSubmissionIfReady(promoterId);
  }

  // ─────────────── dashboard ───────────────

  async dashboard(user: AuthUser) {
    const promoterId = user.promoterId!;
    const now = new Date();
    const [p, eventGroups, contractGroups, talentsOnPlatform, enrolledDistinct, payments, upcoming, recentEnrollments, unreadMessages, unreadNotifications, recentNotifications, pendingContracts] = await Promise.all([
      this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId } }),
      this.prisma.event.groupBy({ by: ['status'], where: { promoterId }, _count: { _all: true } }),
      this.prisma.contract.groupBy({ by: ['status'], where: { promoterId }, _count: { _all: true } }),
      this.prisma.talent.count({ where: { user: { status: UserStatus.ACTIVE } } }),
      this.prisma.talentEvent.findMany({ where: { event: { promoterId } }, distinct: ['talentId'], select: { talentId: true } }),
      this.prisma.payment.findMany({ where: { promoterId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.event.findMany({
        where: { promoterId, eventDate: { gte: now }, status: { in: [EventStatus.PUBLISHED, EventStatus.ONGOING, EventStatus.DRAFT] } },
        orderBy: { eventDate: 'asc' },
        take: 4,
        include: { _count: { select: { enrollments: true } } },
      }),
      this.prisma.talentEvent.findMany({
        where: { event: { promoterId } },
        orderBy: { enrolledAt: 'desc' },
        take: 5,
        include: { event: { select: { id: true, title: true } }, talent: { select: { id: true, specialization: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
      }),
      this.prisma.message.count({ where: { recipientId: user.id, isRead: false } }),
      this.prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { sentAt: 'desc' }, take: 5 }),
      this.prisma.contract.findMany({
        where: { promoterId, status: ContractStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: { event: { select: { title: true } }, talent: { select: { user: { select: { firstName: true, lastName: true } } } } },
      }),
    ]);
    const ev = Object.fromEntries(eventGroups.map((g) => [g.status, g._count._all]));
    const ct = Object.fromEntries(contractGroups.map((g) => [g.status, g._count._all]));
    const paid = payments.filter((x) => x.status === PaymentStatus.SUCCESS);
    return {
      agency: { name: p.agencyName, licenceStatus: p.licenceStatus, licenceFeePaid: p.licenceFeePaid, rejectionReason: p.licenceRejectionReason },
      events: { total: Object.values(ev).reduce((a: number, b) => a + (b as number), 0), byStatus: ev },
      contracts: { active: ct.ACTIVE ?? 0, pending: ct.PENDING ?? 0, completed: ct.COMPLETED ?? 0, total: Object.values(ct).reduce((a: number, b) => a + (b as number), 0) },
      talentsOnPlatform,
      talentsInMyEvents: enrolledDistinct.length,
      payments: { totalPaid: paid.reduce((a, x) => a + x.amount, 0), count: payments.length, last: payments[0] ?? null },
      upcomingEvents: upcoming.map((e) => ({ id: e.id, title: e.title, location: e.location, eventDate: e.eventDate, status: e.status, enrollmentCount: e._count.enrollments })),
      recentEnrollments: recentEnrollments.map((r) => ({
        id: r.id,
        enrolledAt: r.enrolledAt,
        event: r.event,
        talent: { id: r.talent.id, name: `${r.talent.user.firstName} ${r.talent.user.lastName}`, specialization: r.talent.specialization, avatarUrl: r.talent.user.avatarUrl },
      })),
      pendingContracts: pendingContracts.map((c) => ({ id: c.id, eventTitle: c.event.title, talentName: `${c.talent.user.firstName} ${c.talent.user.lastName}`, createdAt: c.createdAt })),
      unreadMessages,
      unreadNotifications,
      recentNotifications,
    };
  }
}

