import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { InspectionStatus } from '@prisma/client';

export class UpdateInspectionDto {
  @ApiPropertyOptional({
    enum: InspectionStatus,
    example: InspectionStatus.CONFIRMED,
    description: 'Updated status of the site inspection',
  })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiPropertyOptional({
    example: '2026-10-21T14:00:00.000Z',
    description: 'Rescheduled date and time for the inspection',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    example: 'a4afb82c-7eef-47fa-b5f3-c5339bc19044',
    description: 'Assigned field agent user ID',
  })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({
    example: 'NIMI KINGS Site Office, Block B, Guzape',
    description: 'Confirmed meeting point or site office location',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'Client confirmed attendance. Site gate pass prepared.',
    description: 'Agent or staff remarks / outcome notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
