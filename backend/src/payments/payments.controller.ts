import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { CheckoutDto, ListPaymentsQuery, PayDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@Roles(Role.PROMOTER)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('config')
  config() {
    return this.payments.getConfig();
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListPaymentsQuery) {
    return this.payments.list(user, q);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.payments.checkout(user, dto);
  }

  @Post(':id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PayDto) {
    return this.payments.pay(user, id, dto);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payments.findOne(user, id);
  }
}
