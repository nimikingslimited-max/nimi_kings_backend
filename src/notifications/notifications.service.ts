import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';

@Injectable()
export class NotificationsService {
  // Real-time emitter function hook (set by MessagingGateway or WebSocket service)
  private realtimeEmitter?: (userId: string, event: string, data: any) => void;

  constructor(private readonly prisma: PrismaService) {}

  setRealtimeEmitter(
    emitter: (userId: string, event: string, data: any) => void,
  ) {
    this.realtimeEmitter = emitter;
  }

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type ?? 'GENERAL',
        title: dto.title,
        message: dto.message,
        data: dto.data ? (dto.data as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    // Real-time WebSocket dispatch to recipient's personal room
    if (this.realtimeEmitter) {
      this.realtimeEmitter(dto.userId, 'new_notification', notification);
    }

    return notification;
  }

  async getUserNotifications(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId };

    if (query.unreadOnly) {
      where.readAt = null;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: notifications,
      unreadCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unreadCount };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification '${id}' not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return {
      message: 'All notifications marked as read',
      count: result.count,
    };
  }

  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification '${id}' not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own notifications',
      );
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { message: 'Notification deleted successfully' };
  }
}
