import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { MessagingGateway } from './messaging.gateway.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { MessageQueryDto } from './dto/message-query.dto.js';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: MessagingGateway,
  ) {}

  async getOrCreateConversation(
    userId: string,
    dto: CreateConversationDto,
  ) {
    if (userId === dto.recipientId) {
      throw new BadRequestException('Cannot create a conversation with yourself');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient || recipient.status !== 'ACTIVE') {
      throw new NotFoundException('Recipient user not found or inactive');
    }

    const convType = dto.type ?? 'DIRECT';

    // Check if conversation already exists between these two participants
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: convType,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: dto.recipientId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                customerProfile: { select: { profileImage: true } },
                agentProfile: { select: { agentCode: true } },
              },
            },
          },
        },
      },
    });

    if (existing) {
      if (dto.initialMessage) {
        await this.sendMessage(existing.id, userId, {
          content: dto.initialMessage,
        });
      }
      return existing;
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        type: convType,
        participants: {
          create: [
            { userId, lastReadAt: new Date() },
            { userId: dto.recipientId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                customerProfile: { select: { profileImage: true } },
                agentProfile: { select: { agentCode: true } },
              },
            },
          },
        },
      },
    });

    if (dto.initialMessage) {
      await this.sendMessage(conversation.id, userId, {
        content: dto.initialMessage,
      });
    }

    return conversation;
  }

  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                customerProfile: { select: { profileImage: true } },
                agentProfile: { select: { agentCode: true } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            senderId: true,
            content: true,
            messageType: true,
            attachmentUrl: true,
            createdAt: true,
            deletedAt: true,
          },
        },
      },
    });

    // Compute unread count for each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const myParticipant = conv.participants.find(
          (p) => p.userId === userId,
        );
        const lastReadAt = myParticipant?.lastReadAt ?? new Date(0);

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: lastReadAt },
            deletedAt: null,
          },
        });

        const lastMessage = conv.messages[0]
          ? {
              ...conv.messages[0],
              content: conv.messages[0].deletedAt
                ? 'This message was deleted'
                : conv.messages[0].content,
            }
          : null;

        return {
          id: conv.id,
          type: conv.type,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          unreadCount,
          lastMessage,
          participants: conv.participants.map((p) => ({
            id: p.id,
            joinedAt: p.joinedAt,
            lastReadAt: p.lastReadAt,
            user: p.user,
          })),
        };
      }),
    );

    return enriched;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: MessageQueryDto,
  ) {
    // Verify membership
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
    };

    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              customerProfile: { select: { profileImage: true } },
            },
          },
        },
      }),
    ]);

    // Update lastReadAt for the user and notify socket room
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    this.gateway.emitToConversation(conversationId, 'messages_read', {
      conversationId,
      userId,
      readAt: new Date(),
    });

    // Sanitize soft-deleted message content
    const sanitizedMessages = messages.map((m) => ({
      ...m,
      content: m.deletedAt ? 'This message was deleted' : m.content,
    }));

    return {
      data: sanitizedMessages.reverse(), // chronologically ordered for UI
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, email: true } },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation '${conversationId}' not found`);
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === senderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Create the message and update conversation updatedAt
    const [message] = await Promise.all([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId,
          messageType: dto.messageType ?? 'TEXT',
          content: dto.content,
          attachmentUrl: dto.attachmentUrl,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              customerProfile: { select: { profileImage: true } },
            },
          },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
      this.prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: senderId,
          },
        },
        data: { lastReadAt: new Date() },
      }),
    ]);

    // 1. Broadcast real-time event to conversation room
    this.gateway.emitToConversation(conversationId, 'new_message', message);

    // 2. Broadcast to other participants' personal rooms & create in-app notification
    const sender = conversation.participants.find((p) => p.userId === senderId);
    const senderName = sender?.user
      ? `${sender.user.firstName}`
      : 'Someone';

    for (const p of conversation.participants) {
      if (p.userId !== senderId) {
        this.gateway.emitToUser(p.userId, 'new_message', message);

        await this.notificationsService.create({
          userId: p.userId,
          type: 'NEW_MESSAGE',
          title: `New message from ${senderName}`,
          message:
            dto.content.length > 80
              ? `${dto.content.substring(0, 77)}...`
              : dto.content,
          data: {
            conversationId,
            messageId: message.id,
            senderId,
          },
        });
      }
    }

    return message;
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
    userId: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
    });

    if (!message) {
      throw new NotFoundException(`Message '${messageId}' not found`);
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException(
        'You can only delete messages sent by yourself',
      );
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    this.gateway.emitToConversation(conversationId, 'message_deleted', {
      conversationId,
      messageId,
    });

    return {
      message: 'Message deleted successfully',
      id: updated.id,
    };
  }
}
