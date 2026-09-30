import { Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { SubmitLicenceDto, UpdatePromoterDto } from './dto/promoters.dto';
import { PromotersService } from './promoters.service';

@Roles(Role.PROMOTER)
@Controller('promoters')
export class PromotersController {
  constructor(private readonly promoters: PromotersService) {}

  @Get('me')
  me(@CurrentUser('promoterId') id: string) {
    return this.promoters.me(id);
  }

  @Patch('me')
  update(@CurrentUser('promoterId') id: string, @Body() dto: UpdatePromoterDto) {
    return this.promoters.updateMe(id, dto);
  }

  @Get('me/dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.promoters.dashboard(user);
  }

  @Post('me/licence')
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  licence(@CurrentUser('promoterId') id: string, @Body() dto: SubmitLicenceDto, @UploadedFile() file?: Express.Multer.File) {
    return this.promoters.submitLicence(id, dto, file);
  }
}
