import { Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus, EventStatus, ModerationStatus, Prisma, UserStatus } from '@prisma/client';
import { splitSkills } from '../auth/auth.service';
import { AuthUser } from '../common/decorators';
import { pageArgs, toPage } from '../common/utils/pagination';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { PrismaService } from '../prisma/prisma.service';
import { RatingsService } from '../ratings/ratings.service';
import { SearchTalentsQuery, UpdateTalentDto } from './dto/talents.dto';

type TalentWithUser = Prisma.TalentGetPayload<{ include: { user: true } }>;

@Injectable()
export class TalentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolios: PortfoliosService,
    private readonly ratings: RatingsService,
  ) {}

  private map(t: TalentWithUser, opts: { includePrivate?: boolean } = {}) {
    return {
      id: t.id,
      userId: t.userId,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      avatarUrl: t.user.avatarUrl,
      specialization: t.specialization,
      gender: t.gender,
      bio: t.bio,
      location: t.location,
      skills: splitSkills(t.skills),
      experienceYears: t.experienceYears,
      website: t.website,
      ratingAvg: t.ratingAvg,
      ratingCount: t.ratingCount,
      memberSince: t.createdAt,
      ...(opts.includePrivate ? { email: t.user.email, phone: t.user.phone } : {}),
    };
  }

  private async getOrFail(talentId: string) {
    const t = await this.prisma.talent.findUnique({ where: { id: talentId }, include: { user: true } });
    if (!t) throw new NotFoundException('Talent not found.');
    return t;
  }

  async me(talentId: string) {
    const t = await this.getOrFail(talentId);
    const completion = await this.completion(t);
    return { ...this.map(t, { includePrivate: true }), completion };
  }

  async updateMe(talentId: string, dto: UpdateTalentDto) {
    const t = await this.getOrFail(talentId);
    const { firstName, lastName, phone, skills, ...profile } = dto;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: t.userId }, data: { firstName, lastName, phone } }),
      this.prisma.talent.update({
        where: { id: talentId },
        data: { ...profile, ...(skills ? { skills: skills.join(',') } : {}) },
      }),
    ]);
    return this.me(talentId);
  }

  /** Profile completion = 10 equally weighted checklist items. */
  private async completion(t: TalentWithUser) {
    const published = await this.prisma.portfolio.count({ where: { talentId: t.id, isPublished: true, moderationStatus: ModerationStatus.ACTIVE } });
    const items = [
      { key: 'avatar', label: 'Add a profile photo', done: !!t.user.avatarUrl },
      { key: 'phone', label: 'Add a contact phone number', done: !!t.user.phone },
      { key: 'gender', label: 'Select your gender', done: !!t.gender },
      { key: 'specialization', label: 'Choose your specialization', done: !!t.specialization },
      { key: 'bio', label: 'Write a bio of at least 40 characters', done: (t.bio ?? '').length >= 40 },
      { key: 'location', label: 'Set your location', done: !!t.location },
      { key: 'skills', label: 'List at least 3 skills', done: splitSkills(t.skills).length >= 3 },
      { key: 'experience', label: 'Add your years of experience', done: t.experienceYears !== null },
      { key: 'portfolio1', label: 'Publish your first portfolio item', done: published >= 1 },
      { key: 'portfolio3', label: 'Publish 3 or more portfolio items', done: published >= 3 },
    ];
    const done = items.filter((i) => i.done).length;
    return { percent: Math.round((done / items.length) * 100), items };
  }

  async dashboard(user: AuthUser) {
    const talentId = user.talentId!;
    const t = await this.getOrFail(talentId);
    const now = new Date();
    const [completion, portfolioTotal, portfolioPublished, upcoming, contractGroups, unreadMessages, unreadNotifications, recentNotifications, pendingContracts] =
      await Promise.all([
        this.completion(t),
        this.prisma.portfolio.count({ where: { talentId } }),
        this.prisma.portfolio.count({ where: { talentId, isPublished: true, moderationStatus: ModerationStatus.ACTIVE } }),
        this.prisma.talentEvent.findMany({
          where: { talentId, event: { eventDate: { gte: now }, status: { in: [EventStatus.PUBLISHED, EventStatus.ONGOING] } } },
          orderBy: { event: { eventDate: 'asc' } },
          take: 5,
          include: { event: { include: { promoter: { select: { agencyName: true } }, images: { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }], take: 1, select: { url: true } } } } },
        }),
        this.prisma.contract.groupBy({ by: ['status'], where: { talentId }, _count: { _all: true } }),
        this.prisma.message.count({ where: { recipientId: user.id, isRead: false } }),
        this.prisma.notification.count({ where: { userId: user.id, isRead: false } }),
        this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { sentAt: 'desc' }, take: 5 }),
        this.prisma.contract.findMany({
          where: { talentId, status: ContractStatus.PENDING },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { event: { select: { title: true, eventDate: true } }, promoter: { select: { agencyName: true } } },
        }),
      ]);
    const byStatus = Object.fromEntries(contractGroups.map((g) => [g.status, g._count._all]));
    const summary = await this.ratings.summary(talentId);
    return {
      profile: { firstName: t.user.firstName, specialization: t.specialization, avatarUrl: t.user.avatarUrl },
      completion,
      rating: { average: summary.average, count: summary.count },
      portfolio: { total: portfolioTotal, published: portfolioPublished },
      upcomingEventsCount: upcoming.length,
      upcomingEvents: upcoming.map((e) => ({
        id: e.event.id,
        title: e.event.title,
        location: e.event.location,
        eventDate: e.event.eventDate,
        status: e.event.status,
        agencyName: e.event.promoter.agencyName,
        coverImageUrl: e.event.images[0]?.url ?? null,
      })),
      contracts: { active: byStatus.ACTIVE ?? 0, pending: byStatus.PENDING ?? 0, completed: byStatus.COMPLETED ?? 0, total: Object.values(byStatus).reduce((a: number, b) => a + (b as number), 0) },
      pendingContracts: pendingContracts.map((c) => ({ id: c.id, eventTitle: c.event.title, eventDate: c.event.eventDate, agencyName: c.promoter.agencyName, createdAt: c.createdAt })),
      unreadMessages,
      unreadNotifications,
      recentNotifications,
    };
  }

  // ───────────────────── promoter-facing discovery ─────────────────────

  async search(q: SearchTalentsQuery) {
    const tokens = (q.q ?? '').split(/\s+/).filter(Boolean).slice(0, 5);
    const where: Prisma.TalentWhereInput = {
      user: { status: UserStatus.ACTIVE },
      ...(q.specialization ? { specialization: { contains: q.specialization } } : {}),
      ...(q.location ? { location: { contains: q.location } } : {}),
      ...(q.minRating ? { ratingAvg: { gte: q.minRating } } : {}),
      ...(q.minExperience ? { experienceYears: { gte: q.minExperience } } : {}),
      ...(q.gender ? { gender: q.gender } : {}),
      ...(tokens.length
        ? {
            AND: tokens.map((tok) => ({
              OR: [
                { user: { firstName: { contains: tok } } },
                { user: { lastName: { contains: tok } } },
                { specialization: { contains: tok } },
                { skills: { contains: tok } },
                { bio: { contains: tok } },
                { location: { contains: tok } },
              ],
            })),
          }
        : {}),
    };
    const orderBy: Prisma.TalentOrderByWithRelationInput[] =
      q.sort === 'experience' ? [{ experienceYears: 'desc' }]
      : q.sort === 'newest' ? [{ createdAt: 'desc' }]
      : q.sort === 'name' ? [{ user: { firstName: 'asc' } }]
      : [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }];

    const [rows, total] = await Promise.all([
      this.prisma.talent.findMany({ where, orderBy, ...pageArgs(q), include: { user: true } }),
      this.prisma.talent.count({ where }),
    ]);
    const ids = rows.map((r) => r.id);
    const media = await this.prisma.portfolio.findMany({
      where: { talentId: { in: ids }, isPublished: true, moderationStatus: ModerationStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      select: { id: true, talentId: true, title: true, mediaType: true, mediaUrl: true },
    });
    const items = rows.map((r) => {
      const own = media.filter((m) => m.talentId === r.id);
      const preview = [...own.filter((m) => m.mediaType === 'IMAGE'), ...own.filter((m) => m.mediaType !== 'IMAGE')].slice(0, 3);
      return { ...this.map(r), portfolioCount: own.length, portfolioPreview: preview };
    });
    return toPage(items, total, q);
  }

  async specializations() {
    const rows = await this.prisma.talent.groupBy({ by: ['specialization'], where: { user: { status: UserStatus.ACTIVE } }, _count: { _all: true } });
    return rows.map((r) => ({ name: r.specialization, count: r._count._all })).sort((a, b) => b.count - a.count);
  }

  async profile(viewer: AuthUser, talentId: string) {
    const t = await this.prisma.talent.findUnique({ where: { id: talentId }, include: { user: true } });
    if (!t || (t.user.status !== UserStatus.ACTIVE && viewer.role !== 'ADMIN')) throw new NotFoundException('Talent not found.');
    const [portfolio, summary, reviews, contracts] = await Promise.all([
      this.portfolios.publicForTalent(talentId),
      this.ratings.summary(talentId),
      this.ratings.reviews(talentId, { page: 1, pageSize: 6 }),
      viewer.promoterId
        ? this.prisma.contract.findMany({
            where: { talentId, promoterId: viewer.promoterId },
            orderBy: { createdAt: 'desc' },
            include: { event: { select: { title: true } }, rating: { select: { id: true } } },
          })
        : Promise.resolve([]),
    ]);
    return {
      ...this.map(t),
      portfolio,
      rating: summary,
      reviews: reviews.items,
      contractsWithYou: contracts.map((c) => ({ id: c.id, status: c.status, eventTitle: c.event.title, rated: !!c.rating })),
    };
  }
}
