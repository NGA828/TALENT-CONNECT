import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { PaymentPurpose, PaymentStatus } from '@prisma/client';
import { PaginationQuery } from '../../common/utils/pagination';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';

@ValidatorConstraint({ name: 'luhn', async: false })
class LuhnConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (typeof value !== 'string' || !/^\d{13,19}$/.test(value)) return false;
    let sum = 0;
    for (let i = 0; i < value.length; i++) {
      let d = Number(value[value.length - 1 - i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  }
  defaultMessage() {
    return 'Enter a valid card number.';
  }
}

export class CheckoutDto {
  @IsOptional() @IsEnum(PaymentPurpose)
  purpose?: PaymentPurpose;
}

export class PayDto {
  @Sanitize() @IsString() @MinLength(2, { message: 'Enter the cardholder name.' }) @MaxLength(80)
  cardholderName: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value)) @Validate(LuhnConstraint)
  cardNumber: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(12)
  expMonth: number;

  @Type(() => Number) @IsInt() @Min(new Date().getFullYear()) @Max(new Date().getFullYear() + 20, { message: 'Enter a valid expiry year.' })
  expYear: number;

  @Matches(/^\d{3,4}$/, { message: 'Enter the 3 or 4 digit security code.' })
  cvc: string;
}

export class ListPaymentsQuery extends PaginationQuery {
  @EmptyToUndefined() @IsOptional() @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
