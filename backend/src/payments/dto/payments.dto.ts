import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaymentMethod, PaymentPurpose, PaymentStatus } from '@prisma/client';
import { CAMEROON_MOBILE_REGEX } from '../../common/utils/cameroon';
import { PaginationQuery } from '../../common/utils/pagination';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';
import { MAX_LICENCE_FEE, MIN_LICENCE_FEE } from '../licence-fee.service';

const MOBILE_MONEY_METHODS = [PaymentMethod.MTN_MOMO, PaymentMethod.ORANGE_MONEY];

export class CheckoutDto {
  @IsOptional() @IsEnum(PaymentPurpose)
  purpose?: PaymentPurpose;
}

/** The promoter's declaration of the Mobile Money transfer they just made. */
export class SubmitPaymentDto {
  @IsEnum(PaymentMethod, { message: 'Choose MTN Mobile Money or Orange Money.' })
  method: PaymentMethod;

  @Sanitize() @IsString() @MinLength(2, { message: 'Enter the name on the Mobile Money wallet.' }) @MaxLength(80)
  payerName: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @Matches(CAMEROON_MOBILE_REGEX, { message: 'Enter the Cameroonian number that sent the money, e.g. +237 677 12 34 56.' })
  payerPhone: string;

  @Sanitize() @IsString() @MinLength(6, { message: 'Copy the transaction ID from the Mobile Money SMS.' }) @MaxLength(40)
  transactionRef: string;
}

export class ListPaymentsQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @EmptyToUndefined() @IsOptional() @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}

/** Admin → the licence fee itself: amount in whole FCFA and the wallets that collect it. */
export class UpdateLicenceFeeDto {
  @IsOptional() @Type(() => Number) @IsInt({ message: 'Give a whole amount in FCFA.' }) @Min(MIN_LICENCE_FEE) @Max(MAX_LICENCE_FEE)
  amount?: number;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  payeeName?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(500)
  instructions?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @EmptyToUndefined() @IsOptional() @Matches(CAMEROON_MOBILE_REGEX, { message: 'Enter the MTN MoMo merchant number as +237 6XX XX XX XX.' })
  mtnNumber?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @EmptyToUndefined() @IsOptional() @Matches(CAMEROON_MOBILE_REGEX, { message: 'Enter the Orange Money merchant number as +237 6XX XX XX XX.' })
  orangeNumber?: string;

  @IsOptional() @IsBoolean()
  mtnEnabled?: boolean;

  @IsOptional() @IsBoolean()
  orangeEnabled?: boolean;
}

/** Admin → confirm or reject a transfer a promoter declared. */
export class ConfirmPaymentDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(400)
  note?: string;
}

export class RefundPaymentDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(400)
  note?: string;
}

export class RejectPaymentDto {
  @Sanitize() @IsString() @MinLength(3, { message: 'Explain what is wrong with the transfer.' }) @MaxLength(400)
  reason: string;
}

/** Admin → record a fee received outside the app (cash at the office, wallet transfer seen by the accountant). */
export class RecordFeePaymentDto {
  @IsString()
  promoterId: string;

  @IsOptional() @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional() @Type(() => Number) @IsInt({ message: 'Give a whole amount in FCFA.' }) @Min(MIN_LICENCE_FEE) @Max(MAX_LICENCE_FEE)
  amount?: number;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(80)
  payerName?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @EmptyToUndefined() @IsOptional() @Matches(CAMEROON_MOBILE_REGEX, { message: 'Enter the Cameroonian Mobile Money number as +237 6XX XX XX XX.' })
  payerPhone?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(40)
  transactionRef?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(400)
  note?: string;
}

export const mobileMoneyMethods = MOBILE_MONEY_METHODS;
