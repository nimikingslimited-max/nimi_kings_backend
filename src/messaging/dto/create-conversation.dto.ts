import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    example: 'a4afb82c-7eef-47fa-b5f3-c5339bc19044',
    description: 'User ID of the recipient to converse with',
  })
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @ApiPropertyOptional({
    example: 'DIRECT',
    default: 'DIRECT',
    description: 'Type of conversation: DIRECT, PROPERTY_INQUIRY, or SUPPORT',
  })
  @IsOptional()
  @IsString()
  type?: string = 'DIRECT';

  @ApiPropertyOptional({
    example: 'Hello, I have an inquiry about the Guzape property.',
    description: 'Optional initial message to dispatch upon conversation start',
  })
  @IsOptional()
  @IsString()
  initialMessage?: string;
}
