import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus, NotificationType } from '@prisma/client';
import { PaginationQuery, pageArgs, toPage } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/ratings.dto';

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async summary(talentId: string) {
    const groups = await this.prisma.rating.groupBy({ by: ['score'], where: { talentId }, _count: { _all: true } });
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    let sum = 0;
    for (const g of groups) {
      distribution[g.score] = g._count._all;
      count += g._count._all;
      sum += g.score * g._count._all;
    }
    return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
  }

  async reviews(talentId: string, q: PaginationQuery) {
    const where = { talentId };
    const [rows, total] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q),
        include: {
          author: { select: { firstName: true, lastName: true, avatarUrl: true, promoter: { select: { agencyName: true } } } },
          contract: { select: { id: true, event: { select: { id: true, title: true } } } },
        },
      }),
      this.prisma.rating.count({ where }),
    ]);
    const items = rows.map((r) => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt,
      author: { name: `${r.author.firstName} ${r.author.lastName}`, avatarUrl: r.author.avatarUrl, agencyName: r.author.promoter?.agencyName ?? null },
      event: r.contract?.event ?? null,
    }));
    return toPage(items, total, q);
  }

  async myRatings(talentId: string, q: PaginationQuery) {
    const [summary, reviews] = await Promise.all([this.summary(talentId), this.reviews(talentId, q)]);
    return { summary, reviews };
  }

  /** Promoters rate talents they have completed a contract with (one rating per contract). */
  async create(promoterId: string, authorId: string, dto: CreateRatingDto) {
    const contract = await this.prisma.contract.findUnique({ where: { id: dto.contractId }, include: { event: { select: { title: true } } } });
    if (!contract) throw new NotFoundException('Contract not found.');
    if (contract.promoterId !== promoterId) throw new ForbiddenException('You can only rate talents you have contracted.');
    if (contract.status !== ContractStatus.COMPLETED) throw new BadRequestException('You can rate a talent once the contract is completed.');
    const existing = await this.prisma.rating.findUnique({ where: { contractId: contract.id } });
    if (existing) throw new ConflictException('You have already rated this contract.');

    const rating = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rating.create({
        data: { talentId: contract.talentId, authorId, contractId: contract.id, score: dto.score, comment: dto.comment },
      });
      const agg = await tx.rating.aggregate({ where: { talentId: contract.talentId }, _avg: { score: true }, _count: { _all: true } });
      await tx.talent.update({
        where: { id: contract.talentId },
        data: { ratingAvg: Math.round((agg._avg.score ?? 0) * 10) / 10, ratingCount: agg._count._all },
      });
      return created;
    });

    const talent = await this.prisma.talent.findUniqueOrThrow({ where: { id: contract.talentId }, select: { userId: true } });
    await this.notifications.create(talent.userId, {
      type: NotificationType.RATING,
      title: 'You received a new rating',
      message: `A promoter rated your work on "${contract.event.title}" ${dto.score}/5.`,
      link: '/talent/ratings',
    });
    return rating;
  }
}
