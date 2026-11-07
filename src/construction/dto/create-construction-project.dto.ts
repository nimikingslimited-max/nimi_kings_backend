import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
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

export class CreateConstructionProjectDto {
  @ApiProperty({
    description: 'Title/name of the construction project or development',
    example: 'NIMI Palms Luxury Villas - Phase 1 Construction',
  })
  @IsNotEmpty({ message: 'Project name is required' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description, structural scope, and technical deliverables',
    example:
      'Construction of four 5-bedroom luxury waterfront detached duplexes with smart home automation, private swimming pools, and dedicated power sub-station.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom unique project code. If omitted, one will be auto-generated (e.g. NK-CP-9812A).',
    example: 'NK-CP-LEK-01',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectCode?: string;

  @ApiPropertyOptional({
    description: 'UUID of the physical property catalog record linked to this project',
    example: 'a373281e-fe7e-4e08-ac1f-891328f9e64a',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Property ID must be a valid UUID' })
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the designated Project Manager or Construction Engineer',
    example: 'fe132f98-5e97-46d1-aff1-aa712255af9e',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Project Manager ID must be a valid UUID' })
  projectManagerId?: string;

  @ApiPropertyOptional({
    description: 'Initial project execution status',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNED,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus = ProjectStatus.PLANNED;

  @ApiPropertyOptional({
    description: 'Official ground-breaking / start date (ISO string)',
    example: '2026-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Expected completion and key handover date (ISO string)',
    example: '2027-11-30T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @ApiProperty({
    description: 'Total approved construction capital expenditure budget (in NGN)',
    example: 450000000,
  })
  @IsNotEmpty({ message: 'Project budget is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Budget cannot be negative' })
  budget: number;
}
