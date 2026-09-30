import { IsString, MaxLength, MinLength } from 'class-validator';
import { Sanitize } from '../../common/utils/sanitize';

export class SendMessageDto {
  @IsString()
  recipientId: string;

  @Sanitize() @IsString() @MinLength(1, { message: 'Write a message first.' }) @MaxLength(2000)
  content: string;
}
