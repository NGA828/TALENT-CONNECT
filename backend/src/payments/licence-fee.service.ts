import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEMO_MTN_MOMO_NUMBER,
  DEMO_ORANGE_MONEY_NUMBER,
  formatCameroonMobile,
  normalizeCameroonMobile,
} from '../common/utils/cameroon';
import { MOBILE_MONEY_METHODS } from './payment-methods';
import { UpdateLicenceFeeDto } from './dto/payments.dto';

/** Stored in the `Setting` table so administrators can manage the licence fee without a redeploy. */
export interface LicenceFeeSettings {
  amount: number;
  currency: string;
  payeeName: string;
  /** Canonical +2376XXXXXXXXX merchant wallets that collect the fee. */
  mtnNumber: string;
  orangeNumber: string;
  mtnEnabled: boolean;
  orangeEnabled: boolean;
  instructions: string;
  updatedAt: string | null;
}

export interface PublicLicenceFeeConfig {
  provider: string;
  automatic: boolean;
  currency: string;
  licenceFee: number;
  payeeName: string;
  instructions: string;
  methods: {
    value: PaymentMethod;
    label: string;
    shortLabel: string;
    ussd: string;
    prefixes: string;
    enabled: boolean;
    /** Merchant wallet to send the money to; empty when the administrator has not set one. */
    number: string | null;
  }[];
}

const KEYS = {
  amount: 'licenceFee.amount',
  currency: 'licenceFee.currency',
  payeeName: 'licenceFee.payeeName',
  mtnNumber: 'licenceFee.mtnNumber',
  orangeNumber: 'licenceFee.orangeNumber',
  mtnEnabled: 'licenceFee.mtnEnabled',
  orangeEnabled: 'licenceFee.orangeEnabled',
  instructions: 'licenceFee.instructions',
} as const;

const ALL_KEYS = Object.values(KEYS);
export const LICENCE_FEE_SETTING_KEYS = ALL_KEYS;

/** Business limits for the Cameroon licence fee (whole CFA francs – the currency has no minor unit). */
export const MIN_LICENCE_FEE = 1000;
export const MAX_LICENCE_FEE = 5_000_000;

const bool = (value: string | undefined, fallback: boolean) => (value === undefined ? fallback : value === 'true');

const isDemoWallet = (value: string) =>
  !!value && (normalizeCameroonMobile(value) === DEMO_MTN_MOMO_NUMBER || normalizeCameroonMobile(value) === DEMO_ORANGE_MONEY_NUMBER);

/**
 * The licence fee is a platform charge, in FCFA, collected with MTN Mobile Money (*126#) or
 * Orange Money (#150#) on merchant wallets. Administrators own every part of it: the amount, the
 * wallets that receive it, and the confirmation of each transfer.
 */
@Injectable()
export class LicenceFeeService {
  private readonly logger = new Logger(LicenceFeeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Falls back to the environment (LICENCE_FEE_AMOUNT / PAYMENT_CURRENCY) when nothing is stored yet. */
  private defaults() {
    const amount = Number(this.config.get('LICENCE_FEE_AMOUNT') ?? 30000);
    return {
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 30000,
      currency: this.config.get<string>('PAYMENT_CURRENCY') ?? 'XAF',
    };
  }

  async get(): Promise<LicenceFeeSettings> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: ALL_KEYS } } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const defaults = this.defaults();
    const storedAmount = Number(map.get(KEYS.amount));
    return {
      amount: Number.isFinite(storedAmount) && storedAmount > 0 ? Math.round(storedAmount) : defaults.amount,
      currency: map.get(KEYS.currency) ?? defaults.currency,
      payeeName: map.get(KEYS.payeeName) ?? 'Talent Connect Cameroun SARL',
      mtnNumber: map.get(KEYS.mtnNumber) ?? '',
      orangeNumber: map.get(KEYS.orangeNumber) ?? '',
      mtnEnabled: bool(map.get(KEYS.mtnEnabled), true),
      orangeEnabled: bool(map.get(KEYS.orangeEnabled), true),
      instructions:
        map.get(KEYS.instructions) ??
        'Send the exact amount from your own Mobile Money wallet, then copy the transaction ID from the SMS receipt.',
      updatedAt: rows.length ? new Date(Math.max(...rows.map((r) => r.updatedAt.getTime()))).toISOString() : null,
    };
  }

  /** Settings + the fee data the promoter portal needs. */
  async publicConfig(provider: { name: string; automatic: boolean }): Promise<PublicLicenceFeeConfig> {
    const s = await this.get();
    const wallets: Record<string, string> = {
      [PaymentMethod.MTN_MOMO]: s.mtnNumber,
      [PaymentMethod.ORANGE_MONEY]: s.orangeNumber,
    };
    const enabled: Record<string, boolean> = {
      [PaymentMethod.MTN_MOMO]: s.mtnEnabled,
      [PaymentMethod.ORANGE_MONEY]: s.orangeEnabled,
    };
    return {
      provider: provider.name,
      automatic: provider.automatic,
      currency: s.currency,
      licenceFee: s.amount,
      payeeName: s.payeeName,
      instructions: s.instructions,
      methods: MOBILE_MONEY_METHODS.map((m) => ({
        value: m.value,
        label: m.label,
        shortLabel: m.shortLabel,
        ussd: m.ussd,
        prefixes: m.prefixes,
        enabled: enabled[m.value] ?? true,
        number: wallets[m.value] ? formatCameroonMobile(wallets[m.value]) : null,
      })),
    };
  }

  /** Admin view: the raw settings plus the wallets that still carry the shipped demo values. */
  async adminView() {
    const settings = await this.get();
    return {
      settings: { ...settings, mtnNumber: formatCameroonMobileOrEmpty(settings.mtnNumber), orangeNumber: formatCameroonMobileOrEmpty(settings.orangeNumber) },
      limits: { minFee: MIN_LICENCE_FEE, maxFee: MAX_LICENCE_FEE },
      demoWalletsInUse: [
        ...(isDemoWallet(settings.mtnNumber) ? ['MTN MoMo'] : []),
        ...(isDemoWallet(settings.orangeNumber) ? ['Orange Money'] : []),
      ],
    };
  }

  /** Applies an administrator's changes; every field is optional. */
  async update(dto: UpdateLicenceFeeDto): Promise<LicenceFeeSettings> {
    const current = await this.get();
    const nextMtn = dto.mtnEnabled ?? current.mtnEnabled;
    const nextOrange = dto.orangeEnabled ?? current.orangeEnabled;
    if (!nextMtn && !nextOrange) {
      throw new BadRequestException('Keep at least one Mobile Money service enabled (MTN MoMo or Orange Money) so promoters can pay the fee.');
    }
    const writes: { key: string; value: string }[] = [];

    if (dto.amount !== undefined) writes.push({ key: KEYS.amount, value: String(Math.round(dto.amount)) });
    if (dto.payeeName !== undefined) writes.push({ key: KEYS.payeeName, value: dto.payeeName });
    if (dto.instructions !== undefined) writes.push({ key: KEYS.instructions, value: dto.instructions });
    if (dto.mtnNumber !== undefined) writes.push({ key: KEYS.mtnNumber, value: normalizeCameroonMobile(dto.mtnNumber) ?? '' });
    if (dto.orangeNumber !== undefined) writes.push({ key: KEYS.orangeNumber, value: normalizeCameroonMobile(dto.orangeNumber) ?? '' });
    if (dto.mtnEnabled !== undefined) writes.push({ key: KEYS.mtnEnabled, value: String(dto.mtnEnabled) });
    if (dto.orangeEnabled !== undefined) writes.push({ key: KEYS.orangeEnabled, value: String(dto.orangeEnabled) });

    for (const write of writes) {
      await this.prisma.setting.upsert({ where: { key: write.key }, create: write, update: { value: write.value } });
    }
    if (writes.length) this.logger.log(`Licence fee settings updated (${writes.map((w) => w.key).join(', ')})`);

    const next = await this.get();
    if (current.amount !== next.amount) this.logger.log(`Licence fee changed from ${current.amount} to ${next.amount} ${next.currency}`);
    return next;
  }
}

function formatCameroonMobileOrEmpty(value: string) {
  return value ? formatCameroonMobile(value) : '';
}
