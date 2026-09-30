import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EmptyToUndefined, Sanitize } from '../../common/utils/sanitize';

export class CreateRatingDto {
  @IsString()
  contractId: string;

  @IsInt() @Min(1) @Max(5)
  score: number;

  @EmptyToUndefined() @Sanitize() @IsOptional() @IsString() @MaxLength(800)
  comment?: string;
}
