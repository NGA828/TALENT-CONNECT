import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MediaType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '../common/decorators';
import { AuthService, userInclude } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UploadedFileLike } from '../storage/storage.service';
import { ChangePasswordDto, UpdateAccountDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly storage: StorageService,
  ) {}

  async updateAccount(userId: string, dto: UpdateAccountDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto, include: userInclude });
    return this.auth.publicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) throw new UnauthorizedException('Current password is incorrect.');
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('Choose a new password that differs from the current one.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12), tokenVersion: { increment: 1 } },
    });
    return { success: true, message: 'Password updated. Please sign in again.' };
  }

  async setAvatar(userId: string, file: UploadedFileLike) {
    const stored = await this.storage.save(file, 'avatars', [MediaType.IMAGE]);
    const previous = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarUrl: true } });
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: stored.url }, include: userInclude });
    await this.storage.remove(previous.avatarUrl);
    return this.auth.publicUser(user);
  }

  /** A minimal, privacy-safe card used by the messaging UI. Only the counterpart role (or admin) may be resolved. */
  async summary(viewer: AuthUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { talent: { select: { id: true, specialization: true } }, promoter: { select: { id: true, agencyName: true } } },
    });
    if (!user) throw new NotFoundException('User not found.');
    const allowed = viewer.role === Role.ADMIN || user.id === viewer.id || (viewer.role === Role.TALENT && user.role === Role.PROMOTER) || (viewer.role === Role.PROMOTER && user.role === Role.TALENT);
    if (!allowed) throw new ForbiddenException('You cannot view this user.');
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      headline: user.talent?.specialization ?? user.promoter?.agencyName ?? 'Administrator',
      talentId: user.talent?.id ?? null,
      promoterId: user.promoter?.id ?? null,
    };
  }
}
