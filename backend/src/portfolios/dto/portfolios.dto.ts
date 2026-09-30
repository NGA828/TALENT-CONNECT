import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MediaType } from '@prisma/client';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';
import { PaginationQuery } from '../../common/utils/pagination';

const toBool = () => Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value));

export class CreatePortfolioDto {
  @Sanitize() @IsString() @MinLength(2) @MaxLength(100)
  title: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @toBool() @IsOptional() @IsBoolean()
  isPublished?: boolean;
}

export class UpdatePortfolioDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  title?: string;

  @Sanitize() @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @toBool() @IsOptional() @IsBoolean()
  isPublished?: boolean;
}

export class MyPortfolioQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(MediaType)
  type?: MediaType;

  @EmptyToUndefined() @IsOptional() @IsString() @MaxLength(80)
  q?: string;
}
