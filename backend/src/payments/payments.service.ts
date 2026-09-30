import { formatMoney } from '../common/utils/money';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LicenceStatus, NotificationType, PaymentPurpose, PaymentStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators';
import { pageArgs, toPage } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotersService } from '../promoters/promoters.service';
import { CheckoutDto, ListPaymentsQuery, PayDto } from './dto/payments.dto';
import { PaymentProvider } from './providers/payment.provider';
import { SANDBOX_TEST_CARDS } from './providers/sandbox.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymentProvider,
    private readonly notifications: NotificationsService,
    private readonly promoters: PromotersService,
    private readonly config: ConfigService,
  ) {}

  get licenceFee() {
    return Number(this.config.get('LICENCE_FEE_AMOUNT') ?? 30000);
  }
  get currency() {
    return this.config.get<string>('PAYMENT_CURRENCY') ?? 'XAF';
  }

  getConfig() {
    return {
      provider: this.provider.name,
      sandbox: this.provider.sandbox,
      currency: this.currency,
      licenceFee: this.licenceFee,
      testCards: this.provider.sandbox ? SANDBOX_TEST_CARDS : [],
    };
  }

  /** Step 1 – create (or reuse) a pending licence-fee payment. */
  async checkout(user: AuthUser, _dto: CheckoutDto) {
    const promoterId = user.promoterId!;
    const promoter = await this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId } });
    const alreadyPaid = promoter.licenceFeePaid || (await this.prisma.payment.count({ where: { promoterId, status: PaymentStatus.SUCCESS, purpose: PaymentPurpose.LICENCE_FEE } })) > 0;
    if (alreadyPaid) throw new ConflictException('The licence fee has already been paid.');

    const pending = await this.prisma.payment.findFirst({ where: { promoterId, status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] }, purpose: PaymentPurpose.LICENCE_FEE }, orderBy: { createdAt: 'desc' } });
    const payment =
      pending ??
      (await this.prisma.payment.create({
        data: {
          promoterId,
          purpose: PaymentPurpose.LICENCE_FEE,
          amount: this.licenceFee,
          currency: this.currency,
          provider: this.provider.name,
          description: `Promoter licence fee – ${promoter.agencyName}`,
        },
      }));
    return { payment, config: this.getConfig() };
  }

  /** Step 2 – charge the card through the provider and persist the result. */
  async pay(user: AuthUser, id: string, dto: PayDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.promoterId !== user.promoterId) throw new ForbiddenException('This payment belongs to another account.');
    if (payment.status === PaymentStatus.SUCCESS) throw new ConflictException('This payment has already been completed.');
    if (payment.status === PaymentStatus.REFUNDED) throw new ConflictException('This payment was refunded. Start a new checkout.');

    const now = new Date();
    if (dto.expYear === now.getFullYear() && dto.expMonth < now.getMonth() + 1) {
      throw new UnprocessableEntityException({ message: 'Validation failed', errors: { expMonth: ['This card has expired.'] } });
    }

    let result;
    try {
      result = await this.provider.charge({
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.id,
        description: payment.description ?? 'Talent Connect payment',
        card: { holder: dto.cardholderName, number: dto.cardNumber, expMonth: dto.expMonth, expYear: dto.expYear, cvc: dto.cvc },
      });
    } catch {
      result = { success: false, providerRef: payment.providerRef ?? '', failureReason: 'The payment provider is unavailable. Please try again.' } as const;
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: result.success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        providerRef: result.providerRef || payment.providerRef,
        cardBrand: (result as any).cardBrand,
        cardLast4: (result as any).last4,
        failureReason: result.success ? null : (result.failureReason ?? 'Payment failed.'),
      },
    });

    if (result.success) {
      await this.promoters.markFeePaid(payment.promoterId);
      await this.notifications.create(user.id, {
        type: NotificationType.PAYMENT,
        title: 'Payment successful',
        message: `Your licence fee of ${formatMoney(payment.amount, payment.currency)} was received.`,
        link: '/promoter/payments',
      });
    } else {
      await this.notifications.create(user.id, {
        type: NotificationType.PAYMENT,
        title: 'Payment failed',
        message: `Your licence-fee payment failed: ${updated.failureReason}`,
        link: '/promoter/licence',
      });
    }
    const promoter = await this.prisma.promoter.findUniqueOrThrow({ where: { id: payment.promoterId }, select: { licenceStatus: true, licenceFeePaid: true } });
    return { payment: updated, licence: promoter };
  }

  async list(user: AuthUser, q: ListPaymentsQuery) {
    const where = { promoterId: user.promoterId!, ...(q.status ? { status: q.status } : {}) };
    const [items, total, agg] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ where: { promoterId: user.promoterId!, status: PaymentStatus.SUCCESS }, _sum: { amount: true } }),
    ]);
    const promoter = await this.prisma.promoter.findUniqueOrThrow({ where: { id: user.promoterId! }, select: { licenceFeePaid: true, licenceStatus: true } });
    return { ...toPage(items, total, q), totalPaid: agg._sum.amount ?? 0, licence: promoter, config: this.getConfig() };
  }

  async findOne(user: AuthUser, id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Payment not found.');
    if (user.role !== 'ADMIN' && p.promoterId !== user.promoterId) throw new ForbiddenException('This payment belongs to another account.');
    return p;
  }

  /** Admin-only refund. */
  async refund(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { promoter: true } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== PaymentStatus.SUCCESS) throw new ConflictException('Only successful payments can be refunded.');
    const r = await this.provider.refund(payment.providerRef ?? '', payment.amount, payment.currency);
    if (!r.success) throw new ConflictException(r.failureReason ?? 'The provider rejected the refund.');
    const updated = await this.prisma.payment.update({ where: { id }, data: { status: PaymentStatus.REFUNDED } });
    if (payment.purpose === PaymentPurpose.LICENCE_FEE) {
      await this.prisma.promoter.update({
        where: { id: payment.promoterId },
        data: {
          licenceFeePaid: false,
          ...(payment.promoter.licenceStatus === LicenceStatus.PENDING ? { licenceStatus: LicenceStatus.NOT_SUBMITTED } : {}),
        },
      });
    }
    await this.notifications.create(payment.promoter.userId, {
      type: NotificationType.PAYMENT,
      title: 'Payment refunded',
      message: `Your payment of ${formatMoney(payment.amount, payment.currency)} was refunded by an administrator.`,
      link: '/promoter/payments',
    });
    return updated;
  }
}
