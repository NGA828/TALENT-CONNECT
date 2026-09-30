import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Sanitize } from '../../common/utils/sanitize';
import { EmptyToUndefined } from '../../common/utils/sanitize';

export const AI_TASKS = ['IMPROVE_BIO', 'PORTFOLIO_DESCRIPTION', 'MESSAGE_DRAFT', 'EVENT_ADVICE', 'SKILLS_PRESENTATION', 'GENERAL'] as const;

export class ChatDto {
  @Sanitize() @IsString() @MinLength(2, { message: 'Write a longer question.' }) @MaxLength(2000)
  message: string;

  @EmptyToUndefined() @IsOptional() @IsIn(AI_TASKS as unknown as string[])
  task?: (typeof AI_TASKS)[number];

  @EmptyToUndefined() @IsOptional() @IsString()
  eventId?: string;
}
