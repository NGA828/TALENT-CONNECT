import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ContractStatus } from '@prisma/client';
import { PaginationQuery } from '../../common/utils/pagination';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';

export class CreateContractDto {
  @IsString() talentId: string;
  @IsString() eventId: string;

  @Sanitize() @IsString() @MinLength(20, { message: 'Describe the contract terms in at least 20 characters.' }) @MaxLength(6000)
  terms: string;

  @EmptyToUndefined() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000)
  amount?: number;

  @EmptyToUndefined() @IsOptional() @IsIn(['USD', 'EUR', 'GBP', 'XAF', 'NGN', 'GHS', 'ZAR', 'KES'])
  currency?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(1500)
  reviewNotes?: string;

  @EmptyToUndefined() @IsOptional() @IsDateString()
  contractDate?: string;
}

export class UpdateContractDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(20) @MaxLength(6000)
  terms?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000)
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
