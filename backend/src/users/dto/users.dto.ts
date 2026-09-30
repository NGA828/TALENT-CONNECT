import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX, PHONE_REGEX } from '../../common/constants';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';

export class UpdateAccountDto {
  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  firstName?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MinLength(2) @MaxLength(50)
  lastName?: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @Matches(PHONE_REGEX, { message: 'Enter a valid phone number.' })
  phone?: string;
}

export class ChangePasswordDto {
  @IsString() @MaxLength(72)
  currentPassword: string;

  @IsString() @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
