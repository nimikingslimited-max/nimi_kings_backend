import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AgentInspectionReportDto {
  @ApiProperty({
    description:
      'Standard outcome of the physical site inspection (e.g. INTERESTED, OFFER_MADE, FOLLOW_UP_REQUIRED, NOT_INTERESTED, CLIENT_NO_SHOW)',
    example: 'INTERESTED',
  })
  @IsNotEmpty({ message: 'Inspection outcome is required' })
  @IsString()
  outcome: string;

  @ApiProperty({
    description:
      'Detailed report notes from the agent on site, including client questions, objections, feedback on price, and next steps',
    example:
      'Customer arrived on time with spouse. Loved the high ceilings and kitchen. Requested official survey plan and wants to make an offer of N180M.',
  })
  @IsNotEmpty({ message: 'Agent inspection report is required' })
  @IsString()
  @MaxLength(3000)
  agentReport: string;

  @ApiPropertyOptional({
    description:
      'Whether to officially mark the inspection as COMPLETED upon report submission (defaults to true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  markAsCompleted?: boolean = true;
}
