import {
  Controller,
  Get,
  Post,
  Body,
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
import { MessagingService } from './messaging.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { MessageQueryDto } from './dto/message-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Conversations & Real-Time Chat')
@ApiBearerAuth('JWT-auth')
@Controller('conversations')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @ApiOperation({
    summary:
      'Start a new conversation or retrieve existing chat with a recipient user',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created or retrieved',
  })
  getOrCreateConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.getOrCreateConversation(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List all conversations for authenticated user with unread counts and latest messages',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
  })
  getUserConversations(@CurrentUser('id') userId: string) {
    return this.messagingService.getUserConversations(userId);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary:
      'Get paginated messages in a conversation (automatically marks conversation as read)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated message history ordered chronologically',
  })
  getMessages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.messagingService.getMessages(id, userId, query);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary:
      'Send a message in a conversation (broadcasts in real-time over WebSocket and creates notifications)',
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(id, userId, dto);
  }

  @Delete(':conversationId/messages/:messageId')
  @ApiOperation({
    summary: 'Soft-delete a message sent by the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Message deleted',
  })
  deleteMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagingService.deleteMessage(
      conversationId,
      messageId,
      userId,
    );
  }
}
