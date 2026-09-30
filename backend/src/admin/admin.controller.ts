import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { ConfirmPaymentDto, RecordFeePaymentDto, RefundPaymentDto, RejectPaymentDto, UpdateLicenceFeeDto } from '../payments/dto/payments.dto';
import { AdminService } from './admin.service';
import { ListAdminEventsQuery, ListAdminPaymentsQuery, ListPortfoliosQuery, ListPromotersQuery, ListUsersQuery, ModeratePortfolioDto, ReportQuery, UpdateUserStatusDto, VerifyPromoterDto } from './dto/admin.dto';

@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats') stats() { return this.admin.stats(); }
  @Get('monitoring') monitoring() { return this.admin.monitoring(); }

  @Get('users') users(@Query() q: ListUsersQuery) { return this.admin.users(q); }
  @Patch('users/:id/status') setStatus(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) { return this.admin.setUserStatus(admin, id, dto); }

  @Get('promoters') promoters(@Query() q: ListPromotersQuery) { return this.admin.promoters(q); }
  @Get('promoters/:id') promoter(@Param('id') id: string) { return this.admin.promoter(id); }
  @Patch('promoters/:id/verify') verify(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: VerifyPromoterDto) { return this.admin.verifyPromoter(admin, id, dto); }

  @Get('portfolios') portfolios(@Query() q: ListPortfoliosQuery) { return this.admin.portfolios(q); }
  @Patch('portfolios/:id/moderate') moderate(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: ModeratePortfolioDto) { return this.admin.moderatePortfolio(admin, id, dto); }

  @Get('events') events(@Query() q: ListAdminEventsQuery) { return this.admin.events(q); }

  // ── licence fee management: the amount, the Mobile Money wallets and every transfer ──
  @Get('licence-fee') licenceFee() { return this.admin.licenceFee(); }
  @Patch('licence-fee') updateLicenceFee(@Body() dto: UpdateLicenceFeeDto) { return this.admin.updateLicenceFee(dto); }
  @Get('payments') payments(@Query() q: ListAdminPaymentsQuery) { return this.admin.paymentsList(q); }
  @Post('payments/manual') recordPayment(@CurrentUser() admin: AuthUser, @Body() dto: RecordFeePaymentDto) { return this.admin.recordFeePayment(admin, dto); }
  @Post('payments/:id/confirm') confirm(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: ConfirmPaymentDto) { return this.admin.confirmPayment(admin, id, dto); }
  @Post('payments/:id/reject') rejectPayment(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: RejectPaymentDto) { return this.admin.rejectPayment(admin, id, dto); }
  @Post('payments/:id/refund') refund(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: RefundPaymentDto) { return this.admin.refundPayment(admin, id, dto); }

  @Get('reports/:type')
  async report(@Param('type') type: string, @Query() q: ReportQuery, @Res({ passthrough: true }) res: Response) {
    if (q.format === 'csv') {
      const { filename, csv } = await this.admin.reportCsv(type, q.from, q.to);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return csv;
    }
    return this.admin.report(type, q.from, q.to);
  }
}
