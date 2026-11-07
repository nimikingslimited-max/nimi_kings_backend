import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '@prisma/client';

export class UpdateConstructionProjectDto {
  @ApiPropertyOptional({
    description: 'Updated title/name of the project',
    example: 'NIMI Palms Waterfront Duplexes - Structural Shell',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated scope or engineering notes',
    example: 'Updated scope to include solar microgrid installation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    description: 'UUID of the linked physical property',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Property ID must be a valid UUID' })
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the designated Project Manager',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Project Manager ID must be a valid UUID' })
  projectManagerId?: string;

  @ApiPropertyOptional({
    description: 'Current project execution status',
    enum: ProjectStatus,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: 'Project start date (ISO string)',
    example: '2026-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Expected completion date (ISO string)',
    example: '2027-11-30T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @ApiPropertyOptional({
    description: 'Actual completion date (ISO string)',
    example: '2027-10-15T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  actualEndDate?: string;

  @ApiPropertyOptional({
    description: 'Approved construction budget (in NGN)',
    example: 480000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Budget cannot be negative' })
  budget?: number;
}
