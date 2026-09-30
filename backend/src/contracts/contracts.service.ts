import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus, EventStatus, LicenceStatus, MediaType, NotificationType, Prisma, Role, UserStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators';
import { pageArgs, toPage } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UploadedFileLike } from '../storage/storage.service';
import { ContractStatusDto, CreateContractDto, ListContractsQuery, RespondContractDto, UpdateContractDto } from './dto/contracts.dto';

const include = {
  talent: { select: { id: true, userId: true, specialization: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
  promoter: { select: { id: true, userId: true, agencyName: true, licenceStatus: true, user: { select: { firstName: true, lastName: true } } } },
  event: { select: { id: true, title: true, location: true, eventDate: true, status: true } },
  rating: { select: { id: true, score: true, comment: true } },
} satisfies Prisma.ContractInclude;

type ContractRow = Prisma.ContractGetPayload<{ include: typeof include }>;

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  private map(c: ContractRow) {
    return {
      id: c.id,
      status: c.status,
      contractDate: c.contractDate,
      terms: c.terms,
      amount: c.amount,
      currency: c.currency,
      documentUrl: c.documentUrl,
      documentName: c.documentName,
      reviewNotes: c.reviewNotes,
      talentResponseNote: c.talentResponseNote,
      respondedAt: c.respondedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      talent: {
        id: c.talent.id,
        userId: c.talent.userId,
        firstName: c.talent.user.firstName,
        lastName: c.talent.user.lastName,
        avatarUrl: c.talent.user.avatarUrl,
        specialization: c.talent.specialization,
      },
      promoter: {
        id: c.promoter.id,
        userId: c.promoter.userId,
        agencyName: c.promoter.agencyName,
        verified: c.promoter.licenceStatus === LicenceStatus.VERIFIED,
        contactName: `${c.promoter.user.firstName} ${c.promoter.user.lastName}`,
      },
      event: c.event,
      rating: c.rating,
    };
  }

  private async load(id: string) {
    const c = await this.prisma.contract.findUnique({ where: { id }, include });
    if (!c) throw new NotFoundException('Contract not found.');
    return c;
  }

  private assertCanView(user: AuthUser, c: ContractRow) {
    const ok = user.role === Role.ADMIN || (user.talentId && c.talentId === user.talentId) || (user.promoterId && c.promoterId === user.promoterId);
    if (!ok) throw new ForbiddenException('You do not have access to this contract.');
  }

  private async loadOwnedByPromoter(promoterId: string, id: string) {
    const c = await this.load(id);
    if (c.promoterId !== promoterId) throw new ForbiddenException('You can only manage your own contracts.');
    return c;
  }

  async list(user: AuthUser, q: ListContractsQuery) {
    const tokens = (q.q ?? '').split(/\s+/).filter(Boolean).slice(0, 4);
    const where: Prisma.ContractWhereInput = {
      ...(user.role === Role.TALENT ? { talentId: user.talentId! } : user.role === Role.PROMOTER ? { promoterId: user.promoterId! } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(tokens.length
        ? {
            AND: tokens.map((t) => ({
              OR: [
                { event: { title: { contains: t } } },
                { talent: { user: { firstName: { contains: t } } } },
                { talent: { user: { lastName: { contains: t } } } },
                { promoter: { agencyName: { contains: t } } },
              ],
            })),
          }
        : {}),
    };
    const base = user.role === Role.TALENT ? { talentId: user.talentId! } : user.role === Role.PROMOTER ? { promoterId: user.promoterId! } : {};
    const [rows, total, groups] = await Promise.all([
      this.prisma.contract.findMany({ where, include, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.contract.count({ where }),
      this.prisma.contract.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
    ]);
    return { ...toPage(rows.map((r) => this.map(r)), total, q), counts: Object.fromEntries(groups.map((g) => [g.status, g._count._all])) };
  }

  async findOne(user: AuthUser, id: string) {
    const c = await this.load(id);
    this.assertCanView(user, c);
    return this.map(c);
  }

  async create(user: AuthUser, dto: CreateContractDto) {
    const promoterId = user.promoterId!;
    const promoter = await this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId } });
    if (promoter.licenceStatus !== LicenceStatus.VERIFIED) throw new ForbiddenException('Your agency must be verified before you can create contracts.');

    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Event not found.');
    if (event.promoterId !== promoterId) throw new ForbiddenException('You can only create contracts for your own events.');
    if (event.status !== EventStatus.PUBLISHED && event.status !== EventStatus.ONGOING) {
      throw new ConflictException('Contracts can only be created for published or ongoing events.');
    }
    const talent = await this.prisma.talent.findUnique({ where: { id: dto.talentId }, include: { user: true } });
    if (!talent || talent.user.status !== UserStatus.ACTIVE) throw new NotFoundException('Talent not found.');
    const duplicate = await this.prisma.contract.findFirst({ where: { talentId: dto.talentId, eventId: dto.eventId, status: { in: [ContractStatus.PENDING, ContractStatus.ACTIVE] } } });
    if (duplicate) throw new ConflictException('This talent already has an open contract for this event.');

    const created = await this.prisma.contract.create({
      data: {
        talentId: dto.talentId,
        promoterId,
        eventId: dto.eventId,
        terms: dto.terms,
        amount: dto.amount,
        currency: 'XAF',
        reviewNotes: dto.reviewNotes,
        contractDate: dto.contractDate ? new Date(dto.contractDate) : new Date(),
      },
      include,
    });
    await this.notifications.create(talent.userId, {
      type: NotificationType.CONTRACT,
      title: 'New contract to review',
      message: `${promoter.agencyName} sent you a contract for "${event.title}".`,
      link: `/talent/contracts/${created.id}`,
    });
    return this.map(created);
  }

  async update(promoterId: string, id: string, dto: UpdateContractDto) {
    const c = await this.loadOwnedByPromoter(promoterId, id);
    if (c.status !== ContractStatus.PENDING && c.status !== ContractStatus.ACTIVE) throw new ConflictException(`A ${c.status.toLowerCase()} contract can no longer be edited.`);
    const material = (dto.terms !== undefined && dto.terms !== c.terms) || (dto.amount !== undefined && dto.amount !== c.amount);
    const reset = material && c.status === ContractStatus.ACTIVE;
    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        ...(dto.terms !== undefined ? { terms: dto.terms } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.reviewNotes !== undefined ? { reviewNotes: dto.reviewNotes || null } : {}),
        ...(reset ? { status: ContractStatus.PENDING, respondedAt: null, talentResponseNote: null } : {}),
      },
      include,
    });
    await this.notifications.create(c.talent.userId, {
      type: NotificationType.CONTRACT,
      title: reset ? 'Contract changed – please review again' : 'Contract updated',
      message: `${c.promoter.agencyName} updated the contract for "${c.event.title}".${reset ? ' It needs your confirmation again.' : ''}`,
      link: `/talent/contracts/${id}`,
    });
    return this.map(updated);
  }

  async uploadDocument(promoterId: string, id: string, file: UploadedFileLike) {
    const c = await this.loadOwnedByPromoter(promoterId, id);
    if (c.status === ContractStatus.CANCELLED || c.status === ContractStatus.REJECTED) throw new ConflictException('Documents cannot be attached to a closed contract.');
    const stored = await this.storage.save(file, 'contracts', [MediaType.DOCUMENT]);
    const updated = await this.prisma.contract.update({ where: { id }, data: { documentUrl: stored.url, documentName: stored.fileName }, include });
    await this.storage.remove(c.documentUrl);
    await this.notifications.create(c.talent.userId, {
      type: NotificationType.CONTRACT,
      title: 'Contract document added',
      message: `A contract document was attached to "${c.event.title}".`,
      link: `/talent/contracts/${id}`,
    });
    return this.map(updated);
  }

  async setStatus(promoterId: string, id: string, dto: ContractStatusDto) {
    const c = await this.loadOwnedByPromoter(promoterId, id);
    const allowed = dto.status === ContractStatus.CANCELLED ? [ContractStatus.PENDING, ContractStatus.ACTIVE] : [ContractStatus.ACTIVE];
    if (!allowed.includes(c.status as any)) throw new ConflictException(`A ${c.status.toLowerCase()} contract cannot be ${dto.status.toLowerCase()}.`);
    const updated = await this.prisma.contract.update({ where: { id }, data: { status: dto.status }, include });
    await this.notifications.create(c.talent.userId, {
      type: NotificationType.CONTRACT,
      title: dto.status === ContractStatus.COMPLETED ? 'Contract completed' : 'Contract cancelled',
      message: `${c.promoter.agencyName} marked your contract for "${c.event.title}" as ${dto.status.toLowerCase()}.`,
      link: `/talent/contracts/${id}`,
    });
    return this.map(updated);
  }

  /** Talents cannot edit promoter-owned content; they can only accept or decline and leave a note. */
  async respond(talentId: string, id: string, dto: RespondContractDto) {
    const c = await this.load(id);
    if (c.talentId !== talentId) throw new ForbiddenException('This contract was not issued to you.');
    if (c.status !== ContractStatus.PENDING) throw new ConflictException('Only pending contracts can be accepted or declined.');
    if (dto.decision === 'REJECT' && !dto.note) throw new BadRequestException('Please add a short note explaining why you are declining.');
    const accepted = dto.decision === 'ACCEPT';
    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: accepted ? ContractStatus.ACTIVE : ContractStatus.REJECTED, talentResponseNote: dto.note, respondedAt: new Date() },
      include,
    });
    await this.notifications.create(c.promoter.userId, {
      type: NotificationType.CONTRACT,
      title: accepted ? 'Contract accepted' : 'Contract declined',
      message: `${c.talent.user.firstName} ${c.talent.user.lastName} ${accepted ? 'accepted' : 'declined'} the contract for "${c.event.title}".`,
      link: `/promoter/contracts/${id}`,
    });
    return this.map(updated);
  }
}
