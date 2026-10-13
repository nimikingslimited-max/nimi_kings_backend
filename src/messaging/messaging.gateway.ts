import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service.js';

interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: string;
      email: string;
      roles: string[];
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {
    // Connect notification emitter to websocket broadcasts
    this.notificationsService.setRealtimeEmitter(
      (userId, event, data) => {
        this.emitToUser(userId, event, data);
      },
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No JWT provided`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      client.data.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
      };

      // Automatically join user-specific private room for instant personal alerts
      client.join(`user_${payload.sub}`);
      this.logger.log(
        `⚡ Client connected: ${payload.email} (Socket: ${client.id})`,
      );
    } catch (err: any) {
      this.logger.warn(`Auth failed for socket ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      const room = `conversation_${data.conversationId}`;
      client.join(room);
      this.logger.log(
        `User ${client.data.user?.email} joined room ${room}`,
      );
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      const room = `conversation_${data.conversationId}`;
      client.leave(room);
      return { status: 'left', room };
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId && client.data.user) {
      client.to(`conversation_${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: client.data.user.id,
        email: client.data.user.email,
        isTyping: true,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId && client.data.user) {
      client.to(`conversation_${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: client.data.user.id,
        email: client.data.user.email,
        isTyping: false,
      });
    }
  }

  emitToConversation(conversationId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`conversation_${conversationId}`).emit(event, data);
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`user_${userId}`).emit(event, data);
    }
  }
}
