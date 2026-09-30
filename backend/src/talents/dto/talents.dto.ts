import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { GENDERS, PHONE_REGEX } from '../../common/constants';
import { PaginationQuery } from '../../common/utils/pagination';
import { EmptyToUndefined, Sanitize, cleanText } from '../../common/utils/sanitize';

const toSkills = () =>
  Transform(({ value }) => {
    const arr = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value;
    return Array.isArray(arr) ? [...new Set(arr.map((s) => (typeof s === 'string' ? cleanText(s) : s)).filter(Boolean))] : arr;
  });

export class UpdateTalentDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  firstName?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  lastName?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @Matches(PHONE_REGEX, { message: 'Enter a valid phone number.' })
  phone?: string;

  @EmptyToUndefined() @IsOptional() @IsIn(GENDERS as unknown as string[])
  gender?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(60)
  specialization?: string;

  @Sanitize() @IsOptional() @IsString() @MaxLength(1500)
  bio?: string;

  @Sanitize() @IsOptional() @IsString() @MaxLength(100)
  location?: string;

  @toSkills() @IsOptional() @IsArray() @ArrayMaxSize(15) @IsString({ each: true }) @MaxLength(30, { each: true })
  skills?: string[];

  @IsOptional() @IsInt() @Min(0) @Max(60)
  experienceYears?: number;

  @EmptyToUndefined() @IsOptional() @IsUrl({ require_protocol: true }, { message: 'Enter a full URL starting with https://' }) @MaxLength(200)
  website?: string;
}

export class SearchTalentsQuery extends PaginationQuery {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(80)
  q?: string;

  @EmptyToUndefined() @IsOptional() @IsString() @MaxLength(60)
  specialization?: string;

  @EmptyToUndefined() @IsOptional() @IsString() @MaxLength(80)
  location?: string;

  @EmptyToUndefined() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5)
  minRating?: number;

  @EmptyToUndefined() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60)
  minExperience?: number;

  @EmptyToUndefined() @IsOptional() @IsIn(GENDERS as unknown as string[])
  gender?: string;

  @EmptyToUndefined() @IsOptional() @IsIn(['rating', 'experience', 'newest', 'name'])
  sort?: 'rating' | 'experience' | 'newest' | 'name';
}
