import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus, EventStatus, LicenceStatus, NotificationType, Prisma, Role } from '@prisma/client';
import { splitSkills } from '../auth/auth.service';
import { AuthUser } from '../common/decorators';
import { pageArgs, toPage } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BrowseEventsQuery, CreateEventDto, EnrollDto, MyEnrollmentsQuery, MyEventsQuery, UpdateEventDto } from './dto/events.dto';

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['DRAFT', 'ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const eventInclude = {
  promoter: {
    select: {
      id: true, userId: true, agencyName: true, agencyDescription: true, website: true, location: true, licenceStatus: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
  },
  _count: { select: { enrollments: true, contracts: true } },
} satisfies Prisma.EventInclude;

type EventWithRel = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private map(e: EventWithRel, extra: Record<string, unknown> = {}) {
    return {
      id: e.id,
      title: e.title,
      location: e.location,
      description: e.description,
      category: e.category,
      talentNeeded: e.talentNeeded,
      budget: e.budget,
      eventDate: e.eventDate,
      status: e.status,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      enrollmentCount: e._count.enrollments,
      contractCount: e._count.contracts,
      promoter: {
        id: e.promoter.id,
        userId: e.promoter.userId,
        agencyName: e.promoter.agencyName,
        description: e.promoter.agencyDescription,
        website: e.promoter.website,
        location: e.promoter.location,
        verified: e.promoter.licenceStatus === LicenceStatus.VERIFIED,
        contactName: `${e.promoter.user.firstName} ${e.promoter.user.lastName}`,
        avatarUrl: e.promoter.user.avatarUrl,
      },
      ...extra,
    };
  }

  private assertFuture(date: Date) {
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid event date.');
    if (date.getTime() < Date.now()) throw new BadRequestException('The event date must be in the future.');
  }

  private async assertVerified(promoterId: string) {
    const p = await this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId }, select: { licenceStatus: true } });
    if (p.licenceStatus !== LicenceStatus.VERIFIED) {
      throw new ForbiddenException('Your agency licence must be verified by an administrator before you can publish events.');
    }
  }

  private async ownedEvent(promoterId: string, id: string) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Event not found.');
    if (e.promoterId !== promoterId) throw new ForbiddenException('You can only manage your own events.');
    return e;
  }

  // ─────────────── discovery (talents) ───────────────

  async browse(user: AuthUser, q: BrowseEventsQuery) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const tokens = (q.q ?? '').split(/\s+/).filter(Boolean).slice(0, 5);
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      eventDate: { gte: q.from ? new Date(q.from) : startOfToday, ...(q.to ? { lte: new Date(q.to) } : {}) },
      ...(q.category ? { category: q.category } : {}),
      ...(q.location ? { location: { contains: q.location } } : {}),
      ...(tokens.length
        ? { AND: tokens.map((t) => ({ OR: [{ title: { contains: t } }, { description: { contains: t } }, { location: { contains: t } }, { talentNeeded: { contains: t } }, { promoter: { agencyName: { contains: t } } }] })) }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({ where, include: eventInclude, orderBy: q.sort === 'newest' ? { createdAt: 'desc' } : { eventDate: 'asc' }, ...pageArgs(q) }),
      this.prisma.event.count({ where }),
    ]);
    const enrolled = user.talentId
      ? new Set((await this.prisma.talentEvent.findMany({ where: { talentId: user.talentId, eventId: { in: rows.map((r) => r.id) } }, select: { eventId: true } })).map((x) => x.eventId))
      : new Set<string>();
    return toPage(rows.map((r) => this.map(r, { enrolled: enrolled.has(r.id) })), total, q);
  }

  async findOne(user: AuthUser, id: string) {
    const e = await this.prisma.event.findUnique({ where: { id }, include: eventInclude });
    if (!e) throw new NotFoundException('Event not found.');

    let enrollment: { id: string; enrolledAt: Date } | null = null;
    let contract: { id: string; status: ContractStatus } | null = null;
    if (user.talentId) {
      enrollment = await this.prisma.talentEvent.findUnique({ where: { talentId_eventId: { talentId: user.talentId, eventId: id } }, select: { id: true, enrolledAt: true } });
      contract = await this.prisma.contract.findFirst({ where: { talentId: user.talentId, eventId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true } });
    }
    const isOwner = !!user.promoterId && e.promoterId === user.promoterId;
    const visible = e.status !== EventStatus.DRAFT && (e.status === EventStatus.PUBLISHED || !!enrollment || !!contract);
    if (user.role !== Role.ADMIN && !isOwner && !visible) throw new NotFoundException('Event not found.');
    return this.map(e, { enrolled: !!enrollment, enrolledAt: enrollment?.enrolledAt ?? null, myContract: contract, isOwner });
  }

  // ─────────────── promoter management ───────────────

  async mine(promoterId: string, q: MyEventsQuery) {
    const where: Prisma.EventWhereInput = {
      promoterId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { location: { contains: q.q } }] } : {}),
    };
    const [rows, total, groups] = await Promise.all([
      this.prisma.event.findMany({ where, include: eventInclude, orderBy: { eventDate: 'desc' }, ...pageArgs(q) }),
      this.prisma.event.count({ where }),
      this.prisma.event.groupBy({ by: ['status'], where: { promoterId }, _count: { _all: true } }),
    ]);
    return { ...toPage(rows.map((r) => this.map(r)), total, q), counts: Object.fromEntries(groups.map((g) => [g.status, g._count._all])) };
  }

  async create(promoterId: string, dto: CreateEventDto) {
    const date = new Date(dto.eventDate);
    this.assertFuture(date);
    if (dto.publish) await this.assertVerified(promoterId);
    const e = await this.prisma.event.create({
      data: {
        promoterId,
        title: dto.title,
        location: dto.location,
        description: dto.description,
        category: dto.category,
        talentNeeded: dto.talentNeeded,
        budget: dto.budget,
        eventDate: date,
        status: dto.publish ? EventStatus.PUBLISHED : EventStatus.DRAFT,
      },
      include: eventInclude,
    });
    return this.map(e);
  }

  async update(promoterId: string, id: string, dto: UpdateEventDto) {
    const existing = await this.ownedEvent(promoterId, id);
    if (existing.status === EventStatus.COMPLETED || existing.status === EventStatus.CANCELLED) {
      throw new ConflictException(`A ${existing.status.toLowerCase()} event can no longer be edited.`);
    }
    const { eventDate, ...rest } = dto;
    const data: Prisma.EventUpdateInput = { ...rest };
    if (eventDate) {
      const d = new Date(eventDate);
      if (existing.status === EventStatus.DRAFT || existing.status === EventStatus.PUBLISHED) this.assertFuture(d);
      data.eventDate = d;
    }
    const e = await this.prisma.event.update({ where: { id }, data, include: eventInclude });
    if (existing.status !== EventStatus.DRAFT) {
      const enrolled = await this.prisma.talentEvent.findMany({ where: { eventId: id }, select: { talent: { select: { userId: true } } } });
      await this.notifications.createMany(enrolled.map((x) => x.talent.userId), {
        type: NotificationType.EVENT,
        title: 'Event details updated',
        message: `"${e.title}" has been updated by ${e.promoter.agencyName}. Review the latest details.`,
        link: `/talent/events/${e.id}`,
      });
    }
    return this.map(e);
  }

  async transition(promoterId: string, id: string, next: EventStatus) {
    const event = await this.ownedEvent(promoterId, id);
    if (!TRANSITIONS[event.status].includes(next)) {
      throw new ConflictException(`An event that is ${event.status.toLowerCase()} cannot be changed to ${next.toLowerCase()}.`);
    }
    if (next === EventStatus.PUBLISHED) {
      await this.assertVerified(promoterId);
      this.assertFuture(event.eventDate);
    }
    if (next === EventStatus.DRAFT) {
      const count = await this.prisma.talentEvent.count({ where: { eventId: id } });
      if (count > 0) throw new ConflictException('This event already has enrolled talents. Cancel it instead of unpublishing.');
    }

    const enrolled = await this.prisma.talentEvent.findMany({ where: { eventId: id }, select: { talent: { select: { userId: true } } } });
    const talentUserIds = enrolled.map((x) => x.talent.userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (next === EventStatus.CANCELLED) {
        await tx.contract.updateMany({ where: { eventId: id, status: { in: [ContractStatus.PENDING, ContractStatus.ACTIVE] } }, data: { status: ContractStatus.CANCELLED } });
      }
      if (next === EventStatus.COMPLETED) {
        await tx.contract.updateMany({ where: { eventId: id, status: ContractStatus.ACTIVE }, data: { status: ContractStatus.COMPLETED } });
      }
      return tx.event.update({ where: { id }, data: { status: next }, include: eventInclude });
    });

    if (next === EventStatus.CANCELLED) {
      const contractTalents = await this.prisma.contract.findMany({ where: { eventId: id }, select: { talent: { select: { userId: true } } } });
      const ids = [...new Set([...talentUserIds, ...contractTalents.map((c) => c.talent.userId)])];
      await this.notifications.createMany(ids, {
        type: NotificationType.EVENT,
        title: 'Event cancelled',
        message: `"${updated.title}" has been cancelled by the organiser. Related contracts were cancelled.`,
        link: `/talent/events/${id}`,
      });
    } else if (next === EventStatus.COMPLETED) {
      await this.notifications.createMany(talentUserIds, {
        type: NotificationType.EVENT,
        title: 'Event completed',
        message: `"${updated.title}" is complete. Your active contracts were marked as completed.`,
        link: '/talent/contracts',
      });
    }
    return this.map(updated);
  }

  async remove(promoterId: string, id: string) {
    const event = await this.ownedEvent(promoterId, id);
    const [enrollments, contracts] = await Promise.all([this.prisma.talentEvent.count({ where: { eventId: id } }), this.prisma.contract.count({ where: { eventId: id } })]);
    if (event.status !== EventStatus.DRAFT || enrollments > 0 || contracts > 0) {
      throw new ConflictException('Only draft events without enrollments or contracts can be deleted. Cancel the event instead.');
    }
    await this.prisma.event.delete({ where: { id } });
    return { success: true };
  }

  async enrollments(user: AuthUser, id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    if (user.role !== Role.ADMIN && event.promoterId !== user.promoterId) throw new ForbiddenException('You can only view enrollments of your own events.');
    const rows = await this.prisma.talentEvent.findMany({
      where: { eventId: id },
      orderBy: { enrolledAt: 'desc' },
      include: { talent: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, contracts: { where: { eventId: id }, select: { id: true, status: true }, take: 1, orderBy: { createdAt: 'desc' } } } } },
    });
    return rows.map((r) => ({
      id: r.id,
      enrolledAt: r.enrolledAt,
      note: r.note,
      talent: {
        id: r.talent.id,
        userId: r.talent.user.id,
        firstName: r.talent.user.firstName,
        lastName: r.talent.user.lastName,
        avatarUrl: r.talent.user.avatarUrl,
        specialization: r.talent.specialization,
        location: r.talent.location,
        skills: splitSkills(r.talent.skills),
        ratingAvg: r.talent.ratingAvg,
        ratingCount: r.talent.ratingCount,
      },
      contract: r.talent.contracts[0] ?? null,
    }));
  }

  // ─────────────── enrollment (talents) ───────────────

  async enroll(user: AuthUser, eventId: string, dto: EnrollDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, include: { promoter: { select: { userId: true } } } });
    if (!event || event.status !== EventStatus.PUBLISHED) throw new NotFoundException('This event is not open for enrollment.');
    if (event.eventDate.getTime() < Date.now()) throw new ConflictException('This event has already taken place.');
    const existing = await this.prisma.talentEvent.findUnique({ where: { talentId_eventId: { talentId: user.talentId!, eventId } } });
    if (existing) throw new ConflictException('You are already enrolled in this event.');

    let enrollment;
    try {
      enrollment = await this.prisma.talentEvent.create({ data: { talentId: user.talentId!, eventId, note: dto.note } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('You are already enrolled in this event.'); // race condition safety net
      throw e;
    }
    await Promise.all([
      this.notifications.create(event.promoter.userId, {
        type: NotificationType.EVENT,
        title: 'New talent enrollment',
        message: `${user.firstName} ${user.lastName} enrolled in "${event.title}".`,
        link: `/promoter/events/${eventId}`,
      }),
      this.notifications.create(user.id, {
        type: NotificationType.EVENT,
        title: 'Enrollment confirmed',
        message: `You are enrolled in "${event.title}". The organiser has been notified.`,
        link: `/talent/events/${eventId}`,
      }),
    ]);
    return enrollment;
  }

  async withdraw(user: AuthUser, eventId: string) {
    const enrollment = await this.prisma.talentEvent.findUnique({
      where: { talentId_eventId: { talentId: user.talentId!, eventId } },
      include: { event: { include: { promoter: { select: { userId: true } } } } },
    });
    if (!enrollment) throw new NotFoundException('You are not enrolled in this event.');
    const active = await this.prisma.contract.count({ where: { talentId: user.talentId!, eventId, status: ContractStatus.ACTIVE } });
    if (active > 0) throw new ConflictException('You have an active contract for this event and cannot withdraw.');
    await this.prisma.talentEvent.delete({ where: { id: enrollment.id } });
    await this.notifications.create(enrollment.event.promoter.userId, {
      type: NotificationType.EVENT,
      title: 'Talent withdrew',
      message: `${user.firstName} ${user.lastName} withdrew from "${enrollment.event.title}".`,
      link: `/promoter/events/${eventId}`,
    });
    return { success: true };
  }

  async myEnrollments(talentId: string, q: MyEnrollmentsQuery) {
    const now = new Date();
    const when = q.when ?? 'all';
    const where: Prisma.TalentEventWhereInput = {
      talentId,
      ...(when === 'upcoming' ? { event: { eventDate: { gte: now }, status: { notIn: [EventStatus.CANCELLED, EventStatus.COMPLETED] } } } : {}),
      ...(when === 'past' ? { event: { OR: [{ eventDate: { lt: now } }, { status: { in: [EventStatus.CANCELLED, EventStatus.COMPLETED] } }] } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.talentEvent.findMany({ where, orderBy: { event: { eventDate: when === 'past' ? 'desc' : 'asc' } }, ...pageArgs(q), include: { event: { include: eventInclude } } }),
      this.prisma.talentEvent.count({ where }),
    ]);
    return toPage(rows.map((r) => ({ ...this.map(r.event, { enrolled: true, enrolledAt: r.enrolledAt }) })), total, q);
  }
}
