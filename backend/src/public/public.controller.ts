import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStatus, LicenceStatus, ModerationStatus, UserStatus } from '@prisma/client';
import { splitSkills } from '../auth/auth.service';
import { EVENT_CATEGORIES, GENDERS, SPECIALIZATIONS } from '../common/constants';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Public()
@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Static lists used by registration / filter forms. */
  @Get('meta')
  meta() {
    return { specializations: SPECIALIZATIONS, genders: GENDERS, eventCategories: EVENT_CATEGORIES, licenceFee: Number(this.config.get('LICENCE_FEE_AMOUNT') ?? 49), currency: this.config.get('PAYMENT_CURRENCY') ?? 'USD' };
  }

  /** Data for the public landing page – aggregate numbers and a safe subset of public profiles/events. */
  @Get('landing')
  async landing() {
    const now = new Date();
    const [talents, promoters, events, contracts, featured, upcoming, reviews, showcase] = await Promise.all([
      this.prisma.talent.count({ where: { user: { status: UserStatus.ACTIVE } } }),
      this.prisma.promoter.count({ where: { licenceStatus: LicenceStatus.VERIFIED } }),
      this.prisma.event.count({ where: { status: { in: [EventStatus.PUBLISHED, EventStatus.ONGOING, EventStatus.COMPLETED] } } }),
      this.prisma.contract.count({ where: { status: { in: ['ACTIVE', 'COMPLETED'] } } }),
      this.prisma.talent.findMany({
        where: { user: { status: UserStatus.ACTIVE }, ratingCount: { gt: 0 }, portfolios: { some: { mediaType: 'IMAGE', isPublished: true, moderationStatus: ModerationStatus.ACTIVE } } },
        orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
        take: 6,
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, portfolios: { where: { mediaType: 'IMAGE', isPublished: true, moderationStatus: ModerationStatus.ACTIVE }, take: 1, orderBy: { createdAt: 'desc' }, select: { mediaUrl: true } } },
      }),
      this.prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED, eventDate: { gte: now } },
        orderBy: { eventDate: 'asc' },
        take: 4,
        include: { promoter: { select: { agencyName: true, licenceStatus: true } }, _count: { select: { enrollments: true } } },
      }),
      this.prisma.rating.findMany({
        where: { score: { gte: 4 }, comment: { not: null } },
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        take: 3,
        include: { author: { select: { firstName: true, lastName: true, promoter: { select: { agencyName: true } } } }, talent: { select: { specialization: true, user: { select: { firstName: true, lastName: true } } } } },
      }),
      this.prisma.portfolio.findMany({
        where: { mediaType: 'IMAGE', isPublished: true, moderationStatus: ModerationStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, title: true, mediaUrl: true, talent: { select: { specialization: true, user: { select: { firstName: true, lastName: true } } } } },
      }),
    ]);
    return {
      stats: { talents, promoters, events, contracts },
      featuredTalents: featured.map((t) => ({
        id: t.id,
        name: `${t.user.firstName} ${t.user.lastName}`,
        specialization: t.specialization,
        location: t.location,
        ratingAvg: t.ratingAvg,
        ratingCount: t.ratingCount,
        skills: splitSkills(t.skills).slice(0, 3),
        cover: t.portfolios[0]?.mediaUrl ?? null,
      })),
      upcomingEvents: upcoming.map((e) => ({
        id: e.id,
        title: e.title,
        location: e.location,
        category: e.category,
        eventDate: e.eventDate,
        agencyName: e.promoter.agencyName,
        verified: e.promoter.licenceStatus === LicenceStatus.VERIFIED,
        enrollmentCount: e._count.enrollments,
      })),
      testimonials: reviews.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        author: `${r.author.firstName} ${r.author.lastName}`,
        agencyName: r.author.promoter?.agencyName ?? null,
        about: `${r.talent.user.firstName} ${r.talent.user.lastName}, ${r.talent.specialization}`,
      })),
      showcase: showcase.map((p) => ({ id: p.id, title: p.title, mediaUrl: p.mediaUrl, by: `${p.talent.user.firstName} ${p.talent.user.lastName}`, specialization: p.talent.specialization })),
    };
  }
}
