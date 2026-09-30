import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { GENDERS, PASSWORD_MESSAGE, PASSWORD_REGEX, PHONE_REGEX, SPECIALIZATIONS } from '../../common/constants';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';
import { Transform } from 'class-transformer';

const lower = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export class LoginDto {
  @lower() @IsEmail({}, { message: 'Enter a valid email address.' })
  email: string;

  @IsString() @IsNotEmpty({ message: 'Password is required.' }) @MaxLength(72)
  password: string;
}

class BaseRegisterDto {
  @Sanitize() @IsString() @MinLength(2) @MaxLength(50)
  firstName: string;

  @Sanitize() @IsString() @MinLength(2) @MaxLength(50)
  lastName: string;

  @lower() @IsEmail({}, { message: 'Enter a valid email address.' }) @MaxLength(120)
  email: string;

  @Sanitize() @Matches(PHONE_REGEX, { message: 'Enter a valid phone number.' })
  phone: string;

  @IsString() @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @IsString() @IsNotEmpty({ message: 'Please confirm your password.' })
  confirmPassword: string;
}

export class RegisterTalentDto extends BaseRegisterDto {
  @IsIn(GENDERS as unknown as string[], { message: 'Select a valid gender option.' })
  gender: string;

  @Sanitize() @IsString() @MinLength(2) @MaxLength(60)
  specialization: string;
}

export class RegisterPromoterDto extends BaseRegisterDto {
  @Sanitize() @IsString() @MinLength(2) @MaxLength(100)
  agencyName: string;

  @Sanitize() @IsString() @MinLength(3, { message: 'Enter your licence number or registration details.' }) @MaxLength(120)
  licenceNumber: string;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(500)
  licenceInfo?: string;
}

export const SPECIALIZATION_SUGGESTIONS = SPECIALIZATIONS;
