import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { AiService } from './ai.service';
import { ChatDto } from './dto/ai.dto';

@Roles(Role.TALENT)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  status() {
    return this.ai.status();
  }

  @Get('history')
  history(@CurrentUser('id') id: string) {
    return this.ai.history(id);
  }

  @Delete('history')
  clear(@CurrentUser('id') id: string) {
    return this.ai.clear(id);
  }

  @Throttle({ default: { limit: Number(process.env.AI_RATE_LIMIT ?? 20), ttl: 60_000 } }) @HttpCode(200)
  @Post('chat')
  chat(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    return this.ai.chat(user, dto);
  }
}
