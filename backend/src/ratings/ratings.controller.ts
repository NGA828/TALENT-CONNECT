import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { PaginationQuery } from '../common/utils/pagination';
import { CreateRatingDto } from './dto/ratings.dto';
import { RatingsService } from './ratings.service';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Roles(Role.TALENT) @Get('me')
  mine(@CurrentUser() user: AuthUser, @Query() q: PaginationQuery) {
    q.pageSize = Math.min(q.pageSize, 50);
    return this.ratings.myRatings(user.talentId!, q);
  }

  @Roles(Role.PROMOTER, Role.ADMIN) @Get('talent/:talentId')
  forTalent(@Param('talentId') talentId: string, @Query() q: PaginationQuery) {
    return this.ratings.reviews(talentId, q);
  }

  @Roles(Role.PROMOTER) @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRatingDto) {
    return this.ratings.create(user.promoterId!, user.id, dto);
  }
}
