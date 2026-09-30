import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IsBooleanString, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators';
import { PaginationQuery } from '../common/utils/pagination';
import { NotificationsService } from './notifications.service';

class ListNotificationsQuery extends PaginationQuery {
  @IsOptional() @IsBooleanString()
  unread?: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query() q: ListNotificationsQuery) {
    return this.service.list(userId, q, q.unread === 'true');
  }

  @Get('unread-count')
  async unread(@CurrentUser('id') userId: string) {
    return { count: await this.service.unreadCount(userId) };
  }

  @Patch('read-all')
  readAll(@CurrentUser('id') userId: string) {
    return this.service.markAllRead(userId);
  }

  @Patch(':id/read')
  read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.markRead(userId, id);
  }
}
