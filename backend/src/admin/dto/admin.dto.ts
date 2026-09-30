
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { EventStatus, LicenceStatus, MediaType, ModerationStatus, PaymentMethod, PaymentStatus, Role, UserStatus } from '@prisma/client';
import { PaginationQuery } from '../../common/utils/pagination';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';

const Q = () => [EmptyToUndefined(), Sanitize(), IsOptional(), IsString(), MaxLength(80)];
const apply = (...decorators: PropertyDecorator[]) => (target: object, key: string) => decorators.forEach((d) => d(target, key));

export class ListUsersQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(Role) role?: Role;
  @EmptyToUndefined() @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @apply(...Q()) q?: string;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus) status: UserStatus;
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(400) reason?: string;
}

export class ListPromotersQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(LicenceStatus) status?: LicenceStatus;
  @apply(...Q()) q?: string;
}

export class VerifyPromoterDto {
  @IsBoolean() approved: boolean;
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ListPortfoliosQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(ModerationStatus) status?: ModerationStatus;
  @EmptyToUndefined() @IsOptional() @IsEnum(MediaType) type?: MediaType;
  @apply(...Q()) q?: string;
}

export class ModeratePortfolioDto {
  @IsIn(['FLAG', 'REMOVE', 'RESTORE']) action: 'FLAG' | 'REMOVE' | 'RESTORE';
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(400) note?: string;
}

export class ListAdminEventsQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @apply(...Q()) q?: string;
}

/** Admin → the Mobile Money fee transfers, filtered by state, network, promoter or transaction ID. */
export class ListAdminPaymentsQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @EmptyToUndefined() @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(80) q?: string;
  /** Only the transfers that are waiting for an administrator to confirm them. */
  @Transform(({ value }) => value === true || value === 'true') @IsOptional() @IsBoolean() awaiting?: boolean;
}

export class ReportQuery {
  @EmptyToUndefined() @IsOptional() @IsDateString() from?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() to?: string;
  @EmptyToUndefined() @IsOptional() @IsIn(['json', 'csv']) format?: 'json' | 'csv';
}

