import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { CheckoutDto, ListPaymentsQuery, SubmitPaymentDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@Roles(Role.PROMOTER)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Licence fee in FCFA + the MTN MoMo / Orange Money wallets that collect it. */
  @Get('config')
  config(@CurrentUser() user: AuthUser) {
    return this.payments.getConfig(user);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListPaymentsQuery) {
    return this.payments.list(user, q);
  }

  /** Step 1 – opens a fee record and returns the reference to quote in the transfer. */
  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.payments.checkout(user, dto);
  }

  /** Step 2 – declares the Mobile Money transfer, with the receipt (image or PDF) as evidence. */
  @Post(':id/submit')
  @UseInterceptors(FileInterceptor('receipt', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitPaymentDto, @UploadedFile() receipt?: Express.Multer.File) {
    return this.payments.submit(user, id, dto, receipt);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payments.findOne(user, id);
  }
}
