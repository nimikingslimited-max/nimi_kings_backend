import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RescheduleInspectionDto {
  @ApiProperty({
    example: '2026-11-15T14:00:00.000Z',
    description: 'New desired inspection date and time (ISO 8601 string)',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiPropertyOptional({
    example: 'I have an unavoidable work commitment at the originally scheduled time.',
    description: 'Reason for requesting a reschedule',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
