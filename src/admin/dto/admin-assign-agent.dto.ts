import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminAssignAgentDto {
  @ApiProperty({
    description: 'User UUID of the agent to assign to this property',
    example: 'fe132f98-5e97-46d1-aff1-aa712255af9e',
  })
  @IsNotEmpty({ message: 'Agent ID is required' })
  @IsString()
  agentId: string;

  @ApiPropertyOptional({
    description: 'Assignment notes or special instructions for the agent',
    example: 'Dedicated lead handler for prime waterfront villa inquiries',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
