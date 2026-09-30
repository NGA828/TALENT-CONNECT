import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { MAX_UPLOAD_BYTES } from '../storage/storage.service';
import { CreatePortfolioDto, MyPortfolioQuery, UpdatePortfolioDto } from './dto/portfolios.dto';
import { PortfoliosService } from './portfolios.service';

const upload = () => FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfolios: PortfoliosService) {}

  @Roles(Role.TALENT) @Get('mine')
  mine(@CurrentUser() user: AuthUser, @Query() q: MyPortfolioQuery) {
    return this.portfolios.mine(user.talentId!, q);
  }

  @Roles(Role.PROMOTER, Role.ADMIN, Role.TALENT) @Get('talent/:talentId')
  forTalent(@Param('talentId') talentId: string) {
    return this.portfolios.publicForTalent(talentId);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.portfolios.findOne(user, id);
  }

  @Roles(Role.TALENT) @Post() @UseInterceptors(upload())
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePortfolioDto, @UploadedFile() file: Express.Multer.File) {
    return this.portfolios.create(user.talentId!, dto, file);
  }

  @Roles(Role.TALENT) @Patch(':id') @UseInterceptors(upload())
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePortfolioDto, @UploadedFile() file?: Express.Multer.File) {
    return this.portfolios.update(user.talentId!, id, dto, file);
  }

  @Roles(Role.TALENT) @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.portfolios.remove(user.talentId!, id);
  }
}
