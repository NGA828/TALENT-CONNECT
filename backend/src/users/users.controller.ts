import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser } from '../common/decorators';
import { MAX_UPLOAD_BYTES } from '../storage/storage.service';
import { ChangePasswordDto, UpdateAccountDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  update(@CurrentUser('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.users.updateAccount(id, dto);
  }

  @Patch('me/password')
  password(@CurrentUser('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  avatar(@CurrentUser('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.users.setAvatar(id, file);
  }

  @Get(':id/summary')
  summary(@CurrentUser() viewer: AuthUser, @Param('id') id: string) {
    return this.users.summary(viewer, id);
  }
}
