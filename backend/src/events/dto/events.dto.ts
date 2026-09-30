
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, IsEnum } from 'class-validator';
import { EventStatus } from '@prisma/client';
import { EVENT_CATEGORIES } from '../../common/constants';
import { PaginationQuery } from '../../common/utils/pagination';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';
import { FOREIGN_CURRENCY_PATTERN } from '../../common/utils/money';

/** Budgets are free text shown to talent, but must be expressed in FCFA (no $, €, USD, …). */
const FCFA_ONLY = new RegExp(`^(?![\\s\\S]*${FOREIGN_CURRENCY_PATTERN.source})[\\s\\S]*$`, 'i');
const FcfaBudget = () => Matches(FCFA_ONLY, { message: 'Express the budget in FCFA (Central African CFA francs), e.g. 300,000 – 450,000 FCFA.' });

export class CreateEventDto {
  @Sanitize() @IsString() @MinLength(3) @MaxLength(120)
  title: string;

  @Sanitize() @IsString() @MinLength(2) @MaxLength(160)
  location: string;

  @Sanitize() @IsString() @MinLength(20, { message: 'Describe the event in at least 20 characters.' }) @MaxLength(4000)
  description: string;

  @EmptyToUndefined() @IsOptional() @IsIn(EVENT_CATEGORIES as unknown as string[])
  category?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(120)
  talentNeeded?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(80) @FcfaBudget()
  budget?: string;

  @IsDateString({}, { message: 'Provide a valid event date.' })
  eventDate: string;

  /** When true the event is published immediately (requires a verified agency). */
  @IsOptional() @IsBoolean()
  publish?: boolean;
}

export class UpdateEventDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(3) @MaxLength(120)
  title?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  location?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(20) @MaxLength(4000)
  description?: string;

  @EmptyToUndefined() @IsOptional() @IsIn(EVENT_CATEGORIES as unknown as string[])
  category?: string;

  @Sanitize() @IsOptional() @IsString() @MaxLength(120)
  talentNeeded?: string;

  @Sanitize() @IsOptional() @IsString() @MaxLength(80) @FcfaBudget()
  budget?: string;

  @IsOptional() @IsDateString()
  eventDate?: string;
}

export class SetStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;
}

export class BrowseEventsQuery extends PaginationQuery {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(80)
  q?: string;

  @EmptyToUndefined() @IsOptional() @IsString() @MaxLength(60)
  category?: string;

  @EmptyToUndefined() @IsOptional() @IsString() @MaxLength(80)
  location?: string;

  @EmptyToUndefined() @IsOptional() @IsDateString()
  from?: string;

  @EmptyToUndefined() @IsOptional() @IsDateString()
  to?: string;

  @EmptyToUndefined() @IsOptional() @IsIn(['date', 'newest'])
  sort?: 'date' | 'newest';
}

export class MyEventsQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(EventStatus)
  status?: EventStatus;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(80)
  q?: string;
}

export class EnrollDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

export class MyEnrollmentsQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsIn(['upcoming', 'past', 'all'])
  when?: 'upcoming' | 'past' | 'all';
}

