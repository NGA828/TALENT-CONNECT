import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ContractStatus } from '@prisma/client';
import { PaginationQuery } from '../../common/utils/pagination';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';

/** FCFA has no minor unit, so fees are whole numbers. */
const MAX_FEE = 100_000_000;
const FEE_MESSAGE = 'Enter the fee as a whole number of FCFA (no decimals).';
const MAX_FEE_MESSAGE = 'The fee cannot exceed 100,000,000 FCFA.';

export class CreateContractDto {
  @IsString() talentId: string;
  @IsString() eventId: string;

  @Sanitize() @IsString() @MinLength(20, { message: 'Describe the contract terms in at least 20 characters.' }) @MaxLength(6000)
  terms: string;

  @EmptyToUndefined() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 0 }, { message: FEE_MESSAGE }) @Min(0) @Max(MAX_FEE, { message: MAX_FEE_MESSAGE })
  amount?: number;

  /** Contracts are always in Central African CFA francs; the field is accepted for API compatibility. */
  @EmptyToUndefined() @IsOptional() @IsIn(['XAF'], { message: 'Contracts are paid in Central African CFA francs (XAF).' })
  currency?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(1500)
  reviewNotes?: string;

  @EmptyToUndefined() @IsOptional() @IsDateString()
  contractDate?: string;
}

export class UpdateContractDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(20) @MaxLength(6000)
  terms?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 0 }, { message: FEE_MESSAGE }) @Min(0) @Max(MAX_FEE, { message: MAX_FEE_MESSAGE })
  amount?: number;

  @Sanitize() @IsOptional() @IsString() @MaxLength(1500)
  reviewNotes?: string;
}

export class ContractStatusDto {
  @IsEnum(ContractStatus) @IsIn([ContractStatus.CANCELLED, ContractStatus.COMPLETED], { message: 'Promoters can only cancel or complete a contract.' })
  status: ContractStatus;
}

export class RespondContractDto {
  @IsIn(['ACCEPT', 'REJECT'])
  decision: 'ACCEPT' | 'REJECT';

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @Length(0, 800)
  note?: string;
}

export class ListContractsQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(ContractStatus)
  status?: ContractStatus;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(80)
  q?: string;
}
