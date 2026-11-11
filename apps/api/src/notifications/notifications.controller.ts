import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.notifications.list(user.sub);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { sub: string }) {
    return this.notifications.unreadCount(user.sub);
  }

  @Patch('read-all')
  readAll(@CurrentUser() user: { sub: string }) {
    return this.notifications.readAll(user.sub);
  }

  @Patch(':id/read')
  read(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.notifications.read(user.sub, id);
  }
}
