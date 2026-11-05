import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EnquiryStatus } from '@prisma/client';

export class UpdateAgentLeadDto {
  @ApiPropertyOptional({
    enum: EnquiryStatus,
    description: 'Update the pipeline status of the lead (IN_PROGRESS, RESOLVED, CLOSED)',
    example: EnquiryStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  @ApiPropertyOptional({
    description:
      'Internal agent follow-up notes, conversation logs, customer budget, and next action items',
    example:
      'Spoke with client on phone. Pre-approved for N150M. Arranging private viewing for Thursday afternoon.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  agentNotes?: string;
}
