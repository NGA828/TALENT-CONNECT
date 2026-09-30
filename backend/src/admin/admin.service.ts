import { formatMoney } from '../common/utils/money';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LicenceStatus, ModerationStatus, NotificationType, PaymentStatus, Prisma, ReviewAction, Role, UserStatus } from '@prisma/client';
import os from 'node:os';
import { AuthUser } from '../common/decorators';
import { toCsv } from '../common/utils/csv';
import { pageArgs, toPage } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListAdminEventsQuery, ListAdminPaymentsQuery, ListPortfoliosQuery, ListPromotersQuery, ListUsersQuery, ModeratePortfolioDto, UpdateUserStatusDto, VerifyPromoterDto } from './dto/admin.dto';

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const groupToObj = <T extends { _count: { _all: number } }>(rows: (T & Record<string, any>)[], key: string) => Object.fromEntries(rows.map((r) => [r[key], r._count._all]));

@Injectable()
export class AdminService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
  ) {}

  // ─────────────── overview ───────────────

  async stats() {
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const [users, userGroups, statusGroups, pending, eventGroups, contractGroups, payGroups, revenue, flagged, removed, activeUsers, newUsers7d, pendingList, recentUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.promoter.count({ where: { licenceStatus: LicenceStatus.PENDING } }),
      this.prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.contract.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.payment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS }, _sum: { amount: true } }),
      this.prisma.portfolio.count({ where: { moderationStatus: ModerationStatus.FLAGGED } }),
      this.prisma.portfolio.count({ where: { moderationStatus: ModerationStatus.REMOVED } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.promoter.findMany({ where: { licenceStatus: LicenceStatus.PENDING }, orderBy: { licenceSubmittedAt: 'asc' }, take: 5, include: { user: { select: { firstName: true, lastName: true } } } }),
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, firstName: true, lastName: true, role: true, createdAt: true, status: true } }),
    ]);
    const roles = groupToObj(userGroups as any, 'role');
    const events = groupToObj(eventGroups as any, 'status');
    const contracts = groupToObj(contractGroups as any, 'status');
    return {
      users: { total: users, talents: roles.TALENT ?? 0, promoters: roles.PROMOTER ?? 0, admins: roles.ADMIN ?? 0, active7d: activeUsers, new7d: newUsers7d, byStatus: groupToObj(statusGroups as any, 'status') },
      pendingVerification: pending,
      events: { total: Object.values(events).reduce((a: number, b) => a + (b as number), 0), byStatus: events },
      contracts: { total: Object.values(contracts).reduce((a: number, b) => a + (b as number), 0), active: contracts.ACTIVE ?? 0, byStatus: contracts },
      payments: {
        revenue: revenue._sum.amount ?? 0,
        byStatus: Object.fromEntries(payGroups.map((g) => [g.status, { count: g._count._all, amount: g._sum.amount ?? 0 }])),
      },
      portfolios: { flagged, removed },
      pendingPromoters: pendingList.map((p) => ({ id: p.id, agencyName: p.agencyName, owner: `${p.user.firstName} ${p.user.lastName}`, submittedAt: p.licenceSubmittedAt })),
      recentUsers,
    };
  }

  async monitoring() {
    const days = 14;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    const [users, contracts, events, payments, licenceGroups, moderationGroups, activities, dbStart] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: since }, role: { not: Role.ADMIN } }, select: { createdAt: true, role: true } }),
      this.prisma.contract.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.event.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.payment.findMany({ where: { createdAt: { gte: since }, status: PaymentStatus.SUCCESS }, select: { createdAt: true, amount: true } }),
      this.prisma.promoter.groupBy({ by: ['licenceStatus'], _count: { _all: true } }),
      this.prisma.portfolio.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
      this.recentActivity(),
      Promise.resolve(Date.now()),
    ]);
    await this.prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbStart;

    const series = Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      return { date: dayKey(d), talents: 0, promoters: 0, contracts: 0, events: 0, revenue: 0 };
    });
    const idx = new Map(series.map((s, i) => [s.date, i]));
    const bump = (date: Date, field: 'talents' | 'promoters' | 'contracts' | 'events' | 'revenue', by = 1) => {
      const i = idx.get(dayKey(date));
      if (i !== undefined) series[i][field] += by;
    };
    users.forEach((u) => bump(u.createdAt, u.role === Role.TALENT ? 'talents' : 'promoters'));
    contracts.forEach((c) => bump(c.createdAt, 'contracts'));
    events.forEach((e) => bump(e.createdAt, 'events'));
    payments.forEach((p) => bump(p.createdAt, 'revenue', p.amount));

    const [userTotal, eventTotal, contractTotal, paymentTotal] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.event.count(),
      this.prisma.contract.count(),
      this.prisma.payment.count(),
    ]);
    return {
      series,
      licencePipeline: groupToObj(licenceGroups as any, 'licenceStatus'),
      moderation: groupToObj(moderationGroups as any, 'moderationStatus'),
      activity: activities,
      system: {
        status: 'operational',
        uptimeSeconds: Math.round(process.uptime()),
        startedAt: new Date(this.startedAt).toISOString(),
        node: process.version,
        platform: `${os.type()} ${os.release()}`,
        memoryMb: Math.round(process.memoryUsage().rss / 1048576),
        dbLatencyMs,
        records: { users: userTotal, events: eventTotal, contracts: contractTotal, payments: paymentTotal },
      },
    };
  }

  private async recentActivity() {
    const [users, events, contracts, payments, reviews] = await Promise.all([
      this.prisma.user.findMany({ where: { role: { not: Role.ADMIN } }, orderBy: { createdAt: 'desc' }, take: 6, select: { firstName: true, lastName: true, role: true, createdAt: true } }),
      this.prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { title: true, status: true, createdAt: true, promoter: { select: { agencyName: true } } } }),
      this.prisma.contract.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { status: true, createdAt: true, event: { select: { title: true } } } }),
      this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { status: true, amount: true, currency: true, createdAt: true, promoter: { select: { agencyName: true } } } }),
      this.prisma.licenceReview.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { action: true, createdAt: true, promoter: { select: { agencyName: true } } } }),
    ]);
    const feed = [
      ...users.map((u) => ({ kind: 'user', text: `${u.firstName} ${u.lastName} joined as ${u.role.toLowerCase()}`, at: u.createdAt })),
      ...events.map((e) => ({ kind: 'event', text: `${e.promoter.agencyName} created "${e.title}" (${e.status.toLowerCase()})`, at: e.createdAt })),
      ...contracts.map((c) => ({ kind: 'contract', text: `Contract for "${c.event.title}" is ${c.status.toLowerCase()}`, at: c.createdAt })),
      ...payments.map((p) => ({ kind: 'payment', text: `${p.promoter.agencyName}: ${formatMoney(p.amount, p.currency)} payment ${p.status.toLowerCase()}`, at: p.createdAt })),
      ...reviews.map((r) => ({ kind: 'verification', text: `${r.promoter.agencyName} licence ${r.action.toLowerCase()}`, at: r.createdAt })),
    ];
    return feed.sort((a, b) => +b.at - +a.at).slice(0, 12);
  }

  // ─────────────── users ───────────────

  async users(q: ListUsersQuery) {
    const tokens = (q.q ?? '').split(/\s+/).filter(Boolean).slice(0, 4);
    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(tokens.length ? { AND: tokens.map((t) => ({ OR: [{ firstName: { contains: t } }, { lastName: { contains: t } }, { email: { contains: t } }] })) } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q),
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true, avatarUrl: true, createdAt: true, lastLoginAt: true, talent: { select: { id: true, specialization: true } }, promoter: { select: { id: true, agencyName: true, licenceStatus: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return toPage(rows, total, q);
  }

  async setUserStatus(admin: AuthUser, id: string, dto: UpdateUserStatusDto) {
    if (id === admin.id) throw new ForbiddenException('You cannot change your own account status.');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === Role.ADMIN) throw new ForbiddenException('Administrator accounts cannot be modified here.');
    if (user.status === dto.status) throw new ConflictException(`This user is already ${dto.status.toLowerCase()}.`);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status, ...(dto.status !== UserStatus.ACTIVE ? { tokenVersion: { increment: 1 } } : {}) },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });
    await this.notifications.create(id, {
      type: NotificationType.ADMIN,
      title: dto.status === UserStatus.ACTIVE ? 'Account reactivated' : dto.status === UserStatus.SUSPENDED ? 'Account suspended' : 'Account deactivated',
      message: dto.status === UserStatus.ACTIVE ? 'An administrator reactivated your account.' : `An administrator ${dto.status.toLowerCase()} your account.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
    });
    return updated;
  }

  // ─────────────── promoters / verification ───────────────

  async promoters(q: ListPromotersQuery) {
    const tokens = (q.q ?? '').split(/\s+/).filter(Boolean).slice(0, 4);
    const where: Prisma.PromoterWhereInput = {
      ...(q.status ? { licenceStatus: q.status } : {}),
      ...(tokens.length ? { AND: tokens.map((t) => ({ OR: [{ agencyName: { contains: t } }, { licenceNumber: { contains: t } }, { user: { email: { contains: t } } }, { user: { lastName: { contains: t } } }] })) } : {}),
    };
    const [rows, total, groups] = await Promise.all([
      this.prisma.promoter.findMany({
        where,
        orderBy: [{ licenceSubmittedAt: 'asc' }, { createdAt: 'desc' }],
        ...pageArgs(q),
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } }, _count: { select: { events: true, contracts: true } } },
      }),
      this.prisma.promoter.count({ where }),
      this.prisma.promoter.groupBy({ by: ['licenceStatus'], _count: { _all: true } }),
    ]);
    return { ...toPage(rows, total, q), counts: groupToObj(groups as any, 'licenceStatus') };
  }

  async promoter(id: string) {
    const p = await this.prisma.promoter.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, createdAt: true, lastLoginAt: true } },
        reviews: { orderBy: { createdAt: 'desc' }, include: { admin: { select: { firstName: true, lastName: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
        events: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, status: true, eventDate: true } },
        _count: { select: { events: true, contracts: true } },
      },
    });
    if (!p) throw new NotFoundException('Promoter not found.');
    const { reviews, ...rest } = p;
    return { ...rest, history: reviews.map((r) => ({ id: r.id, action: r.action, reason: r.reason, createdAt: r.createdAt, admin: r.admin ? `${r.admin.firstName} ${r.admin.lastName}` : null })) };
  }

  async verifyPromoter(admin: AuthUser, id: string, dto: VerifyPromoterDto) {
    const p = await this.prisma.promoter.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Promoter not found.');
    if (p.licenceStatus !== LicenceStatus.PENDING) throw new ConflictException(`This application is ${p.licenceStatus.replace('_', ' ').toLowerCase()} and cannot be reviewed.`);
    if (!dto.approved && !dto.reason) throw new BadRequestException('A rejection reason is required.');
    if (dto.approved && !p.licenceFeePaid) throw new ConflictException('The licence fee has not been paid, so the promoter cannot be approved.');

    const [updated] = await this.prisma.$transaction([
      this.prisma.promoter.update({
        where: { id },
        data: { licenceStatus: dto.approved ? LicenceStatus.VERIFIED : LicenceStatus.REJECTED, licenceReviewedAt: new Date(), licenceRejectionReason: dto.approved ? null : dto.reason },
      }),
      this.prisma.licenceReview.create({ data: { promoterId: id, adminId: admin.id, action: dto.approved ? ReviewAction.APPROVED : ReviewAction.REJECTED, reason: dto.reason } }),
    ]);
    await this.notifications.create(p.userId, {
      type: NotificationType.LICENCE,
      title: dto.approved ? 'Your agency is verified' : 'Licence verification rejected',
      message: dto.approved ? 'Congratulations! You can now publish events and create contracts.' : `Your licence was rejected. Reason: ${dto.reason}. Update your details and resubmit.`,
      link: '/promoter/licence',
    });
    return updated;
  }

  // ─────────────── portfolios ───────────────

  async portfolios(q: ListPortfoliosQuery) {
    const where: Prisma.PortfolioWhereInput = {
      ...(q.status ? { moderationStatus: q.status } : {}),
      ...(q.type ? { mediaType: q.type } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { description: { contains: q.q } }, { talent: { user: { lastName: { contains: q.q } } } }, { talent: { user: { firstName: { contains: q.q } } } }] } : {}),
    };
    const [rows, total, groups] = await Promise.all([
      this.prisma.portfolio.findMany({ where, orderBy: [{ updatedAt: 'desc' }], ...pageArgs(q), include: { talent: { select: { id: true, specialization: true, user: { select: { firstName: true, lastName: true } } } } } }),
      this.prisma.portfolio.count({ where }),
      this.prisma.portfolio.groupBy({ by: ['moderationStatus'], _count: { _all: true } }),
    ]);
    return { ...toPage(rows, total, q), counts: groupToObj(groups as any, 'moderationStatus') };
  }

  async moderatePortfolio(admin: AuthUser, id: string, dto: ModeratePortfolioDto) {
    const item = await this.prisma.portfolio.findUnique({ where: { id }, include: { talent: { select: { userId: true } } } });
    if (!item) throw new NotFoundException('Portfolio item not found.');
    const next = dto.action === 'FLAG' ? ModerationStatus.FLAGGED : dto.action === 'REMOVE' ? ModerationStatus.REMOVED : ModerationStatus.ACTIVE;
    if (item.moderationStatus === next) throw new ConflictException(`This item is already ${next.toLowerCase()}.`);
    if (dto.action !== 'RESTORE' && !dto.note) throw new BadRequestException('Add a short moderation note so the talent understands the decision.');
    const updated = await this.prisma.portfolio.update({
      where: { id },
      data: { moderationStatus: next, moderationNote: dto.action === 'RESTORE' ? null : dto.note, moderatedAt: new Date(), ...(dto.action === 'REMOVE' ? { isPublished: false } : {}) },
    });
    await this.notifications.create(item.talent.userId, {
      type: NotificationType.ADMIN,
      title: dto.action === 'RESTORE' ? 'Portfolio item restored' : dto.action === 'FLAG' ? 'Portfolio item flagged' : 'Portfolio item removed',
      message:
        dto.action === 'RESTORE'
          ? `"${item.title}" was reviewed and restored.`
          : `"${item.title}" was ${dto.action === 'FLAG' ? 'flagged for review' : 'removed'} by a moderator. Note: ${dto.note}`,
      link: '/talent/portfolio',
    });
    return updated;
  }

  // ─────────────── events & payments monitoring ───────────────

  async events(q: ListAdminEventsQuery) {
    const where: Prisma.EventWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { location: { contains: q.q } }, { promoter: { agencyName: { contains: q.q } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.event.findMany({ where, orderBy: { eventDate: 'desc' }, ...pageArgs(q), include: { promoter: { select: { id: true, agencyName: true } }, _count: { select: { enrollments: true, contracts: true } } } }),
      this.prisma.event.count({ where }),
    ]);
    return toPage(items, total, q);
  }

  async paymentsList(q: ListAdminPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = q.status ? { status: q.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q), include: { promoter: { select: { id: true, agencyName: true } } } }),
      this.prisma.payment.count({ where }),
    ]);
    return toPage(items, total, q);
  }

  refund(id: string) {
    return this.payments.refund(id);
  }

  // ─────────────── reports ───────────────

  async report(type: string, from?: string, to?: string) {
    const range = (field = 'createdAt') => ({
      ...(from || to ? { [field]: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to.slice(0, 10)}T23:59:59.999Z`) } : {}) } } : {}),
    });
    let rows: Record<string, unknown>[];
    let title: string;
    switch (type) {
      case 'users': {
        title = 'User registry';
        const data = await this.prisma.user.findMany({ where: range(), orderBy: { createdAt: 'desc' }, include: { talent: true, promoter: true } });
        rows = data.map((u) => ({ name: `${u.firstName} ${u.lastName}`, email: u.email, role: u.role, status: u.status, specialization_or_agency: u.talent?.specialization ?? u.promoter?.agencyName ?? '', registered: u.createdAt, last_login: u.lastLoginAt }));
        break;
      }
      case 'events': {
        title = 'Events report';
        const data = await this.prisma.event.findMany({ where: range(), orderBy: { eventDate: 'desc' }, include: { promoter: true, _count: { select: { enrollments: true, contracts: true } } } });
        rows = data.map((e) => ({ title: e.title, promoter: e.promoter.agencyName, location: e.location, category: e.category ?? '', status: e.status, event_date: e.eventDate, enrollments: e._count.enrollments, contracts: e._count.contracts, created: e.createdAt }));
        break;
      }
      case 'contracts': {
        title = 'Contracts report';
        const data = await this.prisma.contract.findMany({ where: range(), orderBy: { createdAt: 'desc' }, include: { event: true, promoter: true, talent: { include: { user: true } } } });
        rows = data.map((c) => ({ event: c.event.title, promoter: c.promoter.agencyName, talent: `${c.talent.user.firstName} ${c.talent.user.lastName}`, status: c.status, amount: c.amount ?? '', currency: c.currency, created: c.createdAt }));
        break;
      }
      case 'payments': {
        title = 'Payments report';
        const data = await this.prisma.payment.findMany({ where: range(), orderBy: { createdAt: 'desc' }, include: { promoter: true } });
        rows = data.map((p) => ({ promoter: p.promoter.agencyName, purpose: p.purpose, amount: p.amount, currency: p.currency, status: p.status, provider: p.provider, reference: p.providerRef ?? '', created: p.createdAt }));
        break;
      }
      case 'verifications': {
        title = 'Promoter verification history';
        const data = await this.prisma.licenceReview.findMany({ where: range(), orderBy: { createdAt: 'desc' }, include: { promoter: true, admin: true } });
        rows = data.map((r) => ({ promoter: r.promoter.agencyName, action: r.action, reason: r.reason ?? '', reviewed_by: r.admin ? `${r.admin.firstName} ${r.admin.lastName}` : 'system', date: r.createdAt }));
        break;
      }
      case 'moderation': {
        title = 'Portfolio moderation';
        const data = await this.prisma.portfolio.findMany({ where: { ...range('updatedAt'), moderationStatus: { not: ModerationStatus.ACTIVE } }, orderBy: { updatedAt: 'desc' }, include: { talent: { include: { user: true } } } });
        rows = data.map((p) => ({ title: p.title, talent: `${p.talent.user.firstName} ${p.talent.user.lastName}`, media_type: p.mediaType, status: p.moderationStatus, note: p.moderationNote ?? '', moderated: p.moderatedAt }));
        break;
      }
      default:
        throw new NotFoundException('Unknown report type.');
    }
    const columns = rows[0] ? Object.keys(rows[0]) : [];
    return { type, title, generatedAt: new Date().toISOString(), total: rows.length, columns, rows };
  }

  async reportCsv(type: string, from?: string, to?: string) {
    const r = await this.report(type, from, to);
    return { filename: `talent-connect-${type}-${new Date().toISOString().slice(0, 10)}.csv`, csv: toCsv(r.rows, r.columns) };
  }
}

