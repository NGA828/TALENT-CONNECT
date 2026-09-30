import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { SearchTalentsQuery, UpdateTalentDto } from './dto/talents.dto';
import { TalentsService } from './talents.service';

@Controller('talents')
export class TalentsController {
  constructor(private readonly talents: TalentsService) {}

  @Roles(Role.TALENT) @Get('me')
  me(@CurrentUser('talentId') talentId: string) {
    return this.talents.me(talentId);
  }

  @Roles(Role.TALENT) @Patch('me')
  update(@CurrentUser('talentId') talentId: string, @Body() dto: UpdateTalentDto) {
    return this.talents.updateMe(talentId, dto);
  }

  @Roles(Role.TALENT) @Get('me/dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.talents.dashboard(user);
  }

  @Roles(Role.PROMOTER, Role.ADMIN) @Get('specializations')
  specializations() {
    return this.talents.specializations();
  }

  @Roles(Role.PROMOTER, Role.ADMIN) @Get()
  search(@Query() q: SearchTalentsQuery) {
    return this.talents.search(q);
  }

  @Roles(Role.PROMOTER, Role.ADMIN) @Get(':id')
  profile(@CurrentUser() viewer: AuthUser, @Param('id') id: string) {
    return this.talents.profile(viewer, id);
  }
}
