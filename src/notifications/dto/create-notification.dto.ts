import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'a4afb82c-7eef-47fa-b5f3-c5339bc19044',
    description: 'Target user ID to receive the notification',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    default: NotificationType.GENERAL,
    example: NotificationType.NEW_MESSAGE,
    description: 'Category of the notification',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.GENERAL;

  @ApiProperty({
    example: 'New Message Received',
    description: 'Notification headline/title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Agent Sarah sent you a message regarding Guzape Diplomatic Crest.',
    description: 'Body text content of the notification',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: { conversationId: 'uuid', propertyCode: 'NK-PROP-876436' },
    description: 'Arbitrary JSON payload for deep-linking in frontend',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
