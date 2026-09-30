import { formatMoney } from '../common/utils/money';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { LicenceStatus, MediaType, NotificationType, PaymentMethod, PaymentPurpose, PaymentStatus, Role, UserStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AuthUser } from '../common/decorators';
import { formatCameroonMobile, normalizeCameroonMobile } from '../common/utils/cameroon';
import { pageArgs, toPage } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotersService } from '../promoters/promoters.service';
import { StorageService, UploadedFileLike } from '../storage/storage.service';
import { CheckoutDto, ConfirmPaymentDto, ListPaymentsQuery, RecordFeePaymentDto, RejectPaymentDto, SubmitPaymentDto } from './dto/payments.dto';
import { LicenceFeeService } from './licence-fee.service';
import { METHOD_LABEL, methodInfo } from './payment-methods';
import { MobileMoneyProvider } from './providers/mobile-money.provider';

const reference = () => `TC-LIC-${randomBytes(3).toString('hex').toUpperCase()}`;

/**
 * Licence-fee collection for Cameroon.
 *
 * The fee is paid with MTN Mobile Money (*126#) or Orange Money (#150#) to a merchant wallet that
 * administrators manage. The promoter declares the transfer (wallet number + transaction ID) and an
 * administrator confirms that the money arrived; only then does the licence enter the review queue.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: MobileMoneyProvider,
    private readonly notifications: NotificationsService,
    private readonly promoters: PromotersService,
    private readonly licenceFee: LicenceFeeService,
    private readonly storage: StorageService,
  ) {}

  /** Everything the promoter portal needs to display the fee and how to pay it. */
  async getConfig(user?: AuthUser) {
    const config = await this.licenceFee.publicConfig({ name: this.provider.name, automatic: this.provider.automatic });
    if (!user) return config;
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
    return { ...config, suggestedPayerPhone: normalizeCameroonMobile(u?.phone ?? '') };
  }

  /**
   * Step 1 – create (or reuse) the fee record for a promoter. The returned `providerRef` is the
   * reference the promoter quotes in the Mobile Money transfer.
   */
  async checkout(user: AuthUser, _dto: CheckoutDto) {
    const promoterId = user.promoterId!;
    const promoter = await this.prisma.promoter.findUniqueOrThrow({ where: { id: promoterId } });
    if (await this.hasPaidFee(promoterId, promoter.licenceFeePaid)) throw new ConflictException('The licence fee has already been paid.');
    const awaiting = await this.prisma.payment.findFirst({ where: { promoterId, purpose: PaymentPurpose.LICENCE_FEE, status: PaymentStatus.PENDING, submittedAt: { not: null } }, select: { id: true } });
    if (awaiting) throw new ConflictException('A transfer is already waiting for administrator confirmation. Follow it up from your payments page.');

    const settings = await this.licenceFee.get();
    const pending = await this.prisma.payment.findFirst({
      where: { promoterId, purpose: PaymentPurpose.LICENCE_FEE, status: PaymentStatus.PENDING, submittedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const payment = pending
      ? await this.prisma.payment.update({
          where: { id: pending.id },
          data: { amount: settings.amount, currency: settings.currency, provider: this.provider.name },
        })
      : await this.prisma.payment.create({
          data: {
            promoterId,
            purpose: PaymentPurpose.LICENCE_FEE,
            amount: settings.amount,
            currency: settings.currency,
            provider: this.provider.name,
            providerRef: reference(),
            description: `Licence fee – ${promoter.agencyName}`,
          },
        });
    return { payment, config: await this.getConfig(user) };
  }

  /**
   * Step 2 – the promoter declares the MTN MoMo / Orange Money transfer they made. With the bundled
   * manual adapter the payment stays PENDING until an administrator confirms it.
   */
  async submit(user: AuthUser, id: string, dto: SubmitPaymentDto, file?: UploadedFileLike) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.promoterId !== user.promoterId) throw new ForbiddenException('This payment belongs to another account.');
    if (payment.status === PaymentStatus.SUCCESS) throw new ConflictException('This licence fee has already been confirmed.');
    if (payment.status === PaymentStatus.REFUNDED) throw new ConflictException('This payment was refunded. Start a new payment.');
    if (payment.status === PaymentStatus.PENDING && payment.submittedAt) throw new ConflictException('This transfer is already waiting for administrator confirmation.');

    const settings = await this.licenceFee.get();
    const info = methodInfo(dto.method);
    if (dto.method === PaymentMethod.MTN_MOMO && !settings.mtnEnabled) throw new UnprocessableEntityException({ message: 'Validation failed', errors: { method: ['MTN Mobile Money is not available at the moment.'] } });
    if (dto.method === PaymentMethod.ORANGE_MONEY && !settings.orangeEnabled) throw new UnprocessableEntityException({ message: 'Validation failed', errors: { method: ['Orange Money is not available at the moment.'] } });

    const transactionRef = dto.transactionRef.trim();
    const alreadyUsed = await this.prisma.payment.findFirst({
      where: { transactionRef, id: { not: id }, status: { in: [PaymentStatus.PENDING, PaymentStatus.SUCCESS] } },
      select: { id: true },
    });
    if (alreadyUsed) throw new ConflictException('This transaction ID has already been submitted. Check the SMS receipt.');

    let receiptUrl = payment.receiptUrl;
    if (file) {
      const stored = await this.storage.save(file, 'receipts', [MediaType.IMAGE, MediaType.DOCUMENT]);
      if (receiptUrl) await this.storage.remove(receiptUrl);
      receiptUrl = stored.url;
    }

    const result = await this.provider.collect({
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.id,
      description: payment.description ?? 'Talent Connect licence fee',
      method: dto.method,
      payerName: dto.payerName,
      payerPhone: dto.payerPhone,
      transactionRef,
    });

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        method: dto.method,
        payerName: dto.payerName,
        payerPhone: dto.payerPhone,
        transactionRef,
        receiptUrl,
        providerRef: result.providerRef || payment.providerRef,
        status: result.status === 'FAILED' ? PaymentStatus.FAILED : result.status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
        failureReason: result.status === 'FAILED' ? (result.failureReason ?? 'The transfer could not be recorded.') : null,
        // A resubmission after a rejection starts a clean review.
        reviewNote: null,
        reviewedById: null,
        submittedAt: new Date(),
        confirmedAt: result.status === 'SUCCESS' ? new Date() : null,
      },
    });

    const amount = formatMoney(payment.amount, payment.currency);
    if (result.status === 'SUCCESS') {
      await this.promoters.markFeePaid(payment.promoterId);
      await this.notifications.create(user.id, {
        type: NotificationType.PAYMENT,
        title: 'Licence fee confirmed',
        message: `Your ${info?.shortLabel ?? 'Mobile Money'} transfer of ${amount} was confirmed.`,
        link: '/promoter/payments',
      });
    } else if (result.status === 'FAILED') {
      await this.notifications.create(user.id, {
        type: NotificationType.PAYMENT,
        title: 'Licence fee not confirmed',
        message: `Your ${info?.shortLabel ?? 'Mobile Money'} transfer of ${amount} was rejected: ${updated.failureReason}`,
        link: '/promoter/licence',
      });
    } else {
      await this.notifyAdmins({
        title: 'Licence fee to confirm',
        message: `${updated.payerName} transferred ${amount} with ${info?.shortLabel ?? 'Mobile Money'} (transaction ${transactionRef}).`,
        link: '/admin/licence-fees',
      });
      await this.notifications.create(user.id, {
        type: NotificationType.PAYMENT,
        title: 'Transfer submitted',
        message: `We received your ${info?.shortLabel ?? 'Mobile Money'} transaction ${transactionRef}. An administrator confirms it before your licence goes for review.`,
        link: '/promoter/payments',
      });
    }

    const promoter = await this.prisma.promoter.findUniqueOrThrow({ where: { id: payment.promoterId }, select: { licenceStatus: true, licenceFeePaid: true } });
    return { payment: updated, licence: promoter };
  }

  async list(user: AuthUser, q: ListPaymentsQuery) {
    const where = { promoterId: user.promoterId!, ...(q.status ? { status: q.status } : {}), ...(q.method ? { method: q.method } : {}) };
    const [items, total, agg, awaiting] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ where: { promoterId: user.promoterId!, status: PaymentStatus.SUCCESS }, _sum: { amount: true } }),
      this.prisma.payment.count({ where: { promoterId: user.promoterId!, status: PaymentStatus.PENDING, submittedAt: { not: null } } }),
    ]);
    const promoter = await this.prisma.promoter.findUniqueOrThrow({ where: { id: user.promoterId! }, select: { licenceFeePaid: true, licenceStatus: true } });
    return { ...toPage(items, total, q), totalPaid: agg._sum.amount ?? 0, awaitingConfirmation: awaiting, licence: promoter, config: await this.getConfig(user) };
  }

  async findOne(user: AuthUser, id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Payment not found.');
    if (user.role !== Role.ADMIN && p.promoterId !== user.promoterId) throw new ForbiddenException('This payment belongs to another account.');
    return p;
  }

  // ─────────────── administrator actions ───────────────

  /** Confirm that the transfer landed on the platform's MTN MoMo / Orange Money wallet. */
  async confirm(admin: AuthUser, id: string, dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { promoter: { include: { user: { select: { id: true } } } } } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== PaymentStatus.PENDING) throw new ConflictException('Only a transfer waiting for confirmation can be confirmed.');
    if (!payment.submittedAt) throw new ConflictException('The promoter has not submitted the transaction details yet.');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.SUCCESS, confirmedAt: new Date(), reviewedById: admin.id, reviewNote: dto.note ?? null, failureReason: null },
    });
    await this.promoters.markFeePaid(payment.promoterId);
    await this.notifications.create(payment.promoter.user.id, {
      type: NotificationType.PAYMENT,
      title: 'Licence fee confirmed',
      message: `Your ${METHOD_LABEL[payment.method ?? ''] ?? 'Mobile Money'} transfer of ${formatMoney(payment.amount, payment.currency)} was confirmed.`,
      link: '/promoter/payments',
    });
    return updated;
  }

  /** Reject a declared transfer (wrong amount, unreadable receipt, transaction never received …). */
  async reject(admin: AuthUser, id: string, dto: RejectPaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { promoter: { include: { user: { select: { id: true } } } } } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== PaymentStatus.PENDING) throw new ConflictException('Only a transfer waiting for confirmation can be rejected.');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.FAILED, failureReason: dto.reason, reviewNote: dto.reason, reviewedById: admin.id },
    });
    await this.notifications.create(payment.promoter.user.id, {
      type: NotificationType.PAYMENT,
      title: 'Licence fee not confirmed',
      message: `${dto.reason} Check the transaction ID and submit the transfer again from /promoter/licence.`,
      link: '/promoter/licence',
    });
    return updated;
  }

  /** Record a fee received outside the app: cash at the office or a transfer the accountant saw. */
  async recordFeePayment(admin: AuthUser, dto: RecordFeePaymentDto) {
    const promoter = await this.prisma.promoter.findUnique({ where: { id: dto.promoterId }, include: { user: { select: { id: true } } } });
    if (!promoter) throw new NotFoundException('Promoter not found.');
    if (promoter.licenceFeePaid) throw new ConflictException('The licence fee of this promoter is already settled.');

    const settings = await this.licenceFee.get();
    const method = dto.method ?? PaymentMethod.OFFLINE;
    const now = new Date();
    const created = await this.prisma.payment.create({
      data: {
        promoterId: promoter.id,
        purpose: PaymentPurpose.LICENCE_FEE,
        amount: dto.amount ?? settings.amount,
        currency: settings.currency,
        status: PaymentStatus.SUCCESS,
        method,
        provider: this.provider.name,
        providerRef: `TC-LIC-ADMIN-${randomBytes(2).toString('hex').toUpperCase()}`,
        transactionRef: dto.transactionRef,
        payerName: dto.payerName ?? promoter.agencyName,
        payerPhone: dto.payerPhone,
        description: `Licence fee – recorded by an administrator (${METHOD_LABEL[method] ?? method})`,
        submittedAt: now,
        confirmedAt: now,
        reviewedById: admin.id,
        reviewNote: dto.note ?? 'Fee received outside the app and recorded by an administrator.',
      },
    });
    await this.promoters.markFeePaid(promoter.id);
    await this.notifications.create(promoter.user.id, {
      type: NotificationType.PAYMENT,
      title: 'Licence fee recorded',
      message: `An administrator recorded your licence fee of ${formatMoney(created.amount, created.currency)} (${METHOD_LABEL[method] ?? method}).`,
      link: '/promoter/payments',
    });
    return created;
  }

  /** Refund a confirmed fee: the money is sent back from the MTN MoMo / Orange Money merchant wallet. */
  async refund(admin: AuthUser, id: string, note?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { promoter: { include: { user: { select: { id: true } } } } } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== PaymentStatus.SUCCESS) throw new ConflictException('Only confirmed payments can be refunded.');

    const r = await this.provider.refund(payment.providerRef ?? '', payment.amount, payment.currency);
    if (!r.success) throw new ConflictException(r.failureReason ?? 'The provider rejected the refund.');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED, reviewedById: admin.id, reviewNote: note ?? payment.reviewNote },
    });
    if (payment.purpose === PaymentPurpose.LICENCE_FEE) {
      await this.prisma.promoter.update({
        where: { id: payment.promoterId },
        data: {
          licenceFeePaid: false,
          ...(payment.promoter.licenceStatus === LicenceStatus.PENDING ? { licenceStatus: LicenceStatus.NOT_SUBMITTED } : {}),
        },
      });
    }
    await this.notifications.create(payment.promoter.user.id, {
      type: NotificationType.PAYMENT,
      title: 'Licence fee refunded',
      message: `Your payment of ${formatMoney(payment.amount, payment.currency)} was sent back to your Mobile Money wallet by an administrator.`,
      link: '/promoter/payments',
    });
    return updated;
  }

  /** Admin list of every fee transfer, including the promoter contact details. */
  async adminList(q: ListPaymentsQuery & { awaiting?: boolean; q?: string }) {
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.method ? { method: q.method } : {}),
      ...(q.awaiting ? { status: PaymentStatus.PENDING, submittedAt: { not: null } } : {}),
      ...(q.q
        ? {
            OR: [
              { promoter: { agencyName: { contains: q.q } } },
              { payerName: { contains: q.q } },
              { payerPhone: { contains: q.q } },
              { transactionRef: { contains: q.q } },
              { providerRef: { contains: q.q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q), include: { promoter: { select: { id: true, agencyName: true, licenceStatus: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } } } } }),
      this.prisma.payment.count({ where }),
    ]);
    return toPage(items, total, q);
  }

  /** Numbers behind Admin → Licence fees. */
  async feeOverview() {
    const settings = await this.licenceFee.get();
    const [groups, paid, unpaid, awaitingAgg] = await Promise.all([
      this.prisma.payment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.promoter.count({ where: { licenceFeePaid: true } }),
      this.prisma.promoter.count({ where: { licenceFeePaid: false } }),
      this.prisma.payment.aggregate({ where: { status: PaymentStatus.PENDING, submittedAt: { not: null } }, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const group = (status: PaymentStatus) => groups.find((g) => g.status === status);
    return {
      currency: settings.currency,
      licenceFee: settings.amount,
      collected: group(PaymentStatus.SUCCESS)?._sum.amount ?? 0,
      refunded: group(PaymentStatus.REFUNDED)?._sum.amount ?? 0,
      awaitingAmount: awaitingAgg._sum.amount ?? 0,
      counts: {
        confirmed: group(PaymentStatus.SUCCESS)?._count._all ?? 0,
        awaiting: awaitingAgg._count._all ?? 0,
        rejected: group(PaymentStatus.FAILED)?._count._all ?? 0,
        refunded: group(PaymentStatus.REFUNDED)?._count._all ?? 0,
      },
      promoters: { total: paid + unpaid, feePaid: paid, feeUnpaid: unpaid },
    };
  }

  /** Promoters who still owe the fee, for the admin "record a payment" picker. */
  async promotersOwingFee() {
    return this.prisma.promoter.findMany({
      where: { licenceFeePaid: false, user: { status: UserStatus.ACTIVE } },
      orderBy: { agencyName: 'asc' },
      take: 200,
      select: { id: true, agencyName: true, licenceStatus: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    });
  }

  // ─────────────── helpers ───────────────

  private async hasPaidFee(promoterId: string, licenceFeePaid: boolean) {
    if (licenceFeePaid) return true;
    const count = await this.prisma.payment.count({ where: { promoterId, status: PaymentStatus.SUCCESS, purpose: PaymentPurpose.LICENCE_FEE } });
    return count > 0;
  }

  private async notifyAdmins(input: { title: string; message: string; link?: string }) {
    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN, status: UserStatus.ACTIVE }, select: { id: true } });
    await this.notifications.createMany(admins.map((a) => a.id), { type: NotificationType.ADMIN, ...input });
  }

  /** Display helpers reused by the receipt screens. */
  static formatWallet(value?: string | null) {
    return formatCameroonMobile(value);
  }
}
