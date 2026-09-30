
import { IsDateString, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
import { PHONE_REGEX } from '../../common/constants';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';

export class UpdatePromoterDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  firstName?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  lastName?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @Matches(PHONE_REGEX, { message: 'Enter a valid phone number.' })
  phone?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  agencyName?: string;

  @Sanitize() @IsOptional() @IsString() @MaxLength(1500)
  agencyDescription?: string;

  @EmptyToUndefined() @IsOptional() @IsUrl({ require_protocol: true }, { message: 'Enter a full URL starting with https://' }) @MaxLength(200)
  website?: string;

  @Sanitize() @IsOptional() @IsString() @MaxLength(100)
  location?: string;
}

export class SubmitLicenceDto {
  @Sanitize() @IsString() @MinLength(3) @MaxLength(120)
  licenceNumber: string;

  @Sanitize() @IsString() @MinLength(2, { message: 'Enter the issuing authority.' }) @MaxLength(120)
  licenceAuthority: string;

  @IsDateString({}, { message: 'Enter a valid expiry date.' })
  licenceExpiry: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(800)
  licenceInfo?: string;
}

