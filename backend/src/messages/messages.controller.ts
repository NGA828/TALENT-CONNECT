import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { SendMessageDto } from './dto/messages.dto';
import { MessagesService } from './messages.service';

@Roles(Role.TALENT, Role.PROMOTER)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations')
  conversations(@CurrentUser('id') id: string) {
    return this.messages.conversations(id);
  }

  @Get('unread-count')
  async unread(@CurrentUser('id') id: string) {
    return { count: await this.messages.unreadCount(id) };
  }

  @Get('conversations/:userId')
  thread(@CurrentUser('id') id: string, @Param('userId') peerId: string) {
    return this.messages.thread(id, peerId);
  }

  @Patch('conversations/:userId/read')
  readConversation(@CurrentUser('id') id: string, @Param('userId') peerId: string) {
    return this.messages.markConversationRead(id, peerId);
  }

  @Post()
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.messages.send(user, dto);
  }

  @Patch(':id/read')
  read(@CurrentUser('id') id: string, @Param('id') messageId: string) {
    return this.messages.markRead(id, messageId);
  }
}
