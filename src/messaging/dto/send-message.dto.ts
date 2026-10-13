import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({
    example: 'Good morning! Yes, the surveyor has confirmed the coordinates.',
    description: 'Message body text content',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    enum: MessageType,
    default: MessageType.TEXT,
    example: MessageType.TEXT,
    description: 'Format / category of the message',
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType = MessageType.TEXT;

  @ApiPropertyOptional({
    example: 'https://cdn.nimikingsltd.com/chat/survey-plan.pdf',
    description: 'Cloud storage URL for attached media or documents',
  })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
