import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EventStatus, Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { BrowseEventsQuery, CreateEventDto, EnrollDto, MyEnrollmentsQuery, MyEventsQuery, SetStatusDto, UpdateEventDto } from './dto/events.dto';
import { EventsService, MAX_EVENT_IMAGES } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** Discovery: only PUBLISHED events are returned. */
  @Roles(Role.TALENT, Role.PROMOTER, Role.ADMIN) @Get()
  browse(@CurrentUser() user: AuthUser, @Query() q: BrowseEventsQuery) {
    return this.events.browse(user, q);
  }

  @Roles(Role.PROMOTER) @Get('mine')
  mine(@CurrentUser('promoterId') promoterId: string, @Query() q: MyEventsQuery) {
    return this.events.mine(promoterId, q);
  }

  @Roles(Role.TALENT) @Get('enrolled/mine')
  enrolled(@CurrentUser('talentId') talentId: string, @Query() q: MyEnrollmentsQuery) {
    return this.events.myEnrollments(talentId, q);
  }

  @Roles(Role.PROMOTER) @Post()
  create(@CurrentUser('promoterId') promoterId: string, @Body() dto: CreateEventDto) {
    return this.events.create(promoterId, dto);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.findOne(user, id);
  }

  @Roles(Role.PROMOTER) @Patch(':id')
  update(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(promoterId, id, dto);
  }

  @Roles(Role.PROMOTER) @Delete(':id')
  remove(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string) {
    return this.events.remove(promoterId, id);
  }

  @Roles(Role.PROMOTER) @Patch(':id/status')
  status(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.events.transition(promoterId, id, dto.status);
  }

  @Roles(Role.PROMOTER) @Post(':id/publish')
  publish(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string) {
    return this.events.transition(promoterId, id, EventStatus.PUBLISHED);
  }

  @Roles(Role.PROMOTER) @Post(':id/unpublish')
  unpublish(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string) {
    return this.events.transition(promoterId, id, EventStatus.DRAFT);
  }

  @Roles(Role.PROMOTER) @Post(':id/cancel')
  cancel(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string) {
    return this.events.transition(promoterId, id, EventStatus.CANCELLED);
  }

  /** multipart/form-data, field `images` (one or more JPEG/PNG/GIF/WebP files, 10 MB each). */
  @Roles(Role.PROMOTER) @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', MAX_EVENT_IMAGES, { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: MAX_EVENT_IMAGES } }))
  addImages(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @UploadedFiles() files?: Express.Multer.File[]) {
    return this.events.addImages(promoterId, id, files);
  }

  @Roles(Role.PROMOTER) @Patch(':id/images/:imageId/cover')
  setCover(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @Param('imageId') imageId: string) {
    return this.events.setCover(promoterId, id, imageId);
  }

  @Roles(Role.PROMOTER) @Delete(':id/images/:imageId')
  removeImage(@CurrentUser('promoterId') promoterId: string, @Param('id') id: string, @Param('imageId') imageId: string) {
    return this.events.removeImage(promoterId, id, imageId);
  }

  @Roles(Role.PROMOTER, Role.ADMIN) @Get(':id/enrollments')
  enrollments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.enrollments(user, id);
  }

  @Roles(Role.TALENT) @Post(':id/enroll')
  enroll(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EnrollDto) {
    return this.events.enroll(user, id, dto);
  }

  @Roles(Role.TALENT) @Delete(':id/enroll')
  withdraw(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.withdraw(user, id);
  }
}
