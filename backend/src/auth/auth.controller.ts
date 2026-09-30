import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../common/decorators';
import { AuthService } from './auth.service';
import { LoginDto, RegisterPromoterDto, RegisterTalentDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Throttle({ default: { limit: Number(process.env.AUTH_RATE_LIMIT ?? 10), ttl: 60_000 } })
  @Post('register/talent')
  registerTalent(@Body() dto: RegisterTalentDto) {
    return this.auth.registerTalent(dto);
  }

  @Public() @Throttle({ default: { limit: Number(process.env.AUTH_RATE_LIMIT ?? 10), ttl: 60_000 } })
  @Post('register/promoter')
  registerPromoter(@Body() dto: RegisterPromoterDto) {
    return this.auth.registerPromoter(dto);
  }

  @Public() @Throttle({ default: { limit: Number(process.env.AUTH_RATE_LIMIT ?? 10), ttl: 60_000 } }) @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @HttpCode(200)
  @Post('logout')
  logout(@CurrentUser('id') userId: string) {
    return this.auth.logout(userId);
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }
}
