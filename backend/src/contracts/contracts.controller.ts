import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { ContractsService } from './contracts.service';
import { ContractStatusDto, CreateContractDto, ListContractsQuery, RespondContractDto, UpdateContractDto } from './dto/contracts.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListContractsQuery) {
    return this.contracts.list(user, q);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contracts.findOne(user, id);
  }

  @Roles(Role.PROMOTER) @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contracts.create(user, dto);
  }

  @Roles(Role.PROMOTER) @Patch(':id')
  update(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contracts.update(promoterId, id, dto);
  }

  @Roles(Role.PROMOTER) @Patch(':id/status')
  status(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @Body() dto: ContractStatusDto) {
    return this.contracts.setStatus(promoterId, id, dto);
  }

  @Roles(Role.PROMOTER) @Post(':id/document')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  document(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.contracts.uploadDocument(promoterId, id, file);
  }

  @Roles(Role.TALENT) @Post(':id/respond')
  respond(@CurrentUser('talentId') talentId: string, @Param('id') id: string, @Body() dto: RespondContractDto) {
    return this.contracts.respond(talentId, id, dto);
  }
}
