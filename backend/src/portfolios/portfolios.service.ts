import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, ModerationStatus, Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/decorators';
import { pageArgs, toPage } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UploadedFileLike } from '../storage/storage.service';
import { CreatePortfolioDto, MyPortfolioQuery, UpdatePortfolioDto } from './dto/portfolios.dto';

const ALL_MEDIA = [MediaType.IMAGE, MediaType.VIDEO, MediaType.AUDIO, MediaType.DOCUMENT];

@Injectable()
export class PortfoliosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async mine(talentId: string, q: MyPortfolioQuery) {
    const where: Prisma.PortfolioWhereInput = {
      talentId,
      ...(q.type ? { mediaType: q.type } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { description: { contains: q.q } }] } : {}),
    };
    const [items, total, byType, flagged, published] = await Promise.all([
      this.prisma.portfolio.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.portfolio.count({ where }),
      this.prisma.portfolio.groupBy({ by: ['mediaType'], where: { talentId }, _count: { _all: true } }),
      this.prisma.portfolio.count({ where: { talentId, moderationStatus: { not: ModerationStatus.ACTIVE } } }),
      this.prisma.portfolio.count({ where: { talentId, isPublished: true, moderationStatus: ModerationStatus.ACTIVE } }),
    ]);
    const counts = Object.fromEntries(byType.map((g) => [g.mediaType, g._count._all]));
    return { ...toPage(items, total, q), stats: { total: byType.reduce((a, g) => a + g._count._all, 0), published, flagged, byType: counts } };
  }

  /** Public (published + not moderated) items of one talent. */
  publicForTalent(talentId: string) {
    return this.prisma.portfolio.findMany({
      where: { talentId, isPublished: true, moderationStatus: ModerationStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const item = await this.prisma.portfolio.findUnique({ where: { id }, include: { talent: { select: { id: true, specialization: true, user: { select: { firstName: true, lastName: true } } } } } });
    if (!item) throw new NotFoundException('Portfolio item not found.');
    const isOwner = user.talentId === item.talentId;
    const visible = item.isPublished && item.moderationStatus === ModerationStatus.ACTIVE;
    if (!isOwner && user.role !== Role.ADMIN && !visible) throw new NotFoundException('Portfolio item not found.');
    return item;
  }

  async create(talentId: string, dto: CreatePortfolioDto, file: UploadedFileLike) {
    const stored = await this.storage.save(file, 'portfolio', ALL_MEDIA);
    return this.prisma.portfolio.create({
      data: {
        talentId,
        title: dto.title,
        description: dto.description,
        isPublished: dto.isPublished ?? true,
        mediaType: stored.mediaType,
        mediaUrl: stored.url,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        fileSize: stored.size,
      },
    });
  }

  private async owned(talentId: string, id: string) {
    const item = await this.prisma.portfolio.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Portfolio item not found.');
    if (item.talentId !== talentId) throw new ForbiddenException('You can only manage your own portfolio items.');
    return item;
  }

  async update(talentId: string, id: string, dto: UpdatePortfolioDto, file?: UploadedFileLike) {
    const item = await this.owned(talentId, id);
    if (dto.isPublished && item.moderationStatus === ModerationStatus.REMOVED) {
      throw new ForbiddenException('This item was removed by a moderator and cannot be published.');
    }
    const data: Prisma.PortfolioUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
    };
    if (file) {
      const stored = await this.storage.save(file, 'portfolio', ALL_MEDIA);
      Object.assign(data, { mediaType: stored.mediaType, mediaUrl: stored.url, fileName: stored.fileName, mimeType: stored.mimeType, fileSize: stored.size });
    }
    const updated = await this.prisma.portfolio.update({ where: { id }, data });
    if (file) await this.storage.remove(item.mediaUrl);
    return updated;
  }

  async remove(talentId: string, id: string) {
    const item = await this.owned(talentId, id);
    await this.prisma.portfolio.delete({ where: { id } });
    await this.storage.remove(item.mediaUrl);
    return { success: true };
  }
}
