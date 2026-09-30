import { ConflictException, ForbiddenException, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationType, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterPromoterDto, RegisterTalentDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
// A real hash used to keep login timing constant when the e-mail does not exist.
const DUMMY_HASH = bcrypt.hashSync('talent-connect-dummy', BCRYPT_ROUNDS);

export const userInclude = {
  talent: {
    select: { id: true, specialization: true, gender: true, bio: true, location: true, skills: true, experienceYears: true, website: true, ratingAvg: true, ratingCount: true },
  },
  promoter: { select: { id: true, agencyName: true, licenceStatus: true, licenceFeePaid: true } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertPasswords(password: string, confirm: string) {
    if (password !== confirm) {
      throw new UnprocessableEntityException({ message: 'Validation failed', errors: { confirmPassword: ['Passwords do not match.'] } });
    }
  }

  private async assertEmailFree(email: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('An account with this email already exists.');
  }

  async registerTalent(dto: RegisterTalentDto) {
    this.assertPasswords(dto.password, dto.confirmPassword);
    await this.assertEmailFree(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.TALENT,
        talent: { create: { gender: dto.gender, specialization: dto.specialization } },
      },
      include: userInclude,
    });
    await this.notifications.create(user.id, {
      type: NotificationType.ADMIN,
      title: 'Welcome to Talent Connect',
      message: 'Complete your profile and publish your first portfolio item to start getting noticed by promoters.',
      link: '/talent/profile',
    });
    return this.session(user);
  }

  async registerPromoter(dto: RegisterPromoterDto) {
    this.assertPasswords(dto.password, dto.confirmPassword);
    await this.assertEmailFree(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.PROMOTER,
        promoter: { create: { agencyName: dto.agencyName, licenceNumber: dto.licenceNumber, licenceInfo: dto.licenceInfo } },
      },
      include: userInclude,
    });
    await this.notifications.create(user.id, {
      type: NotificationType.LICENCE,
      title: 'Next step: verify your agency',
      message: 'Submit your licence and pay the licence fee so an administrator can verify your agency.',
      link: '/promoter/licence',
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: userInclude });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password.');
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        user.status === UserStatus.SUSPENDED ? 'Your account has been suspended. Contact the platform administrator.' : 'This account has been deactivated.',
      );
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.session(user);
  }

  /** Invalidates every token issued so far for this user. */
  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude });
    return this.publicUser(user);
  }

  private session(user: Awaited<ReturnType<AuthService['findForSession']>>) {
    const accessToken = this.jwt.sign({ sub: user.id, role: user.role, tv: user.tokenVersion });
    return { accessToken, user: this.publicUser(user) };
  }

  private findForSession(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, include: userInclude });
  }

  publicUser(user: Awaited<ReturnType<AuthService['findForSession']>>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, tokenVersion, ...safe } = user as any;
    return {
      ...safe,
      talent: user.talent ? { ...user.talent, skills: splitSkills(user.talent.skills) } : null,
    };
  }
}

export const splitSkills = (s: string | null | undefined) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
