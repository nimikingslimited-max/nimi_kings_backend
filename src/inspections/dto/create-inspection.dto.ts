import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateInspectionDto {
  @ApiProperty({
    example: 'NK-PROP-537643',
    description: 'Property UUID or Property Code (e.g. NK-PROP-XXXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    example: '2026-10-20T10:00:00.000Z',
    description: 'Preferred ISO 8601 date and time for the site inspection',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiPropertyOptional({
    example: 'Main Entrance Gate, Diplomatic Zone, Guzape',
    description: 'Preferred meeting point or pickup landmark',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'Coming with my surveyor to inspect plot boundaries.',
    description: 'Additional notes or instructions for the field agent',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
