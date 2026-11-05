import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmInspectionDto {
  @ApiPropertyOptional({
    description: 'Meeting point location confirmed by the agent',
    example: 'Main security gate, Admiralty Way, Lekki Phase 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description:
      'Instructions or notes for the customer (e.g. what to bring, arrival advice)',
    example:
      'Please look out for a black Toyota Prado NK-01. I will be on site 10 minutes early.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
