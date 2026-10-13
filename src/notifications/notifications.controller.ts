import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Notifications & Alerts')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get authenticated user in-app notifications with pagination and unread filters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications with unread badge count',
  })
  getUserNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary:
      'Fast counter endpoint for unread notifications (useful for bell icon in frontend navbar)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current unread notification count',
  })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @Post()
  @ApiOperation({
    summary:
      'Send a system / administrative alert to a specific user (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created and dispatched',
  })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all unread notifications for authenticated user as read',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a specific notification as read by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.delete(id, userId);
  }
}
