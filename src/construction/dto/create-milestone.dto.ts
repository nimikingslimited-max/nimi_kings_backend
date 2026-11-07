import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '@prisma/client';

export class CreateMilestoneDto {
  @ApiProperty({
    description: 'Name of the milestone / construction phase',
    example: 'Foundation & Substructure',
  })
  @IsNotEmpty({ message: 'Milestone name is required' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: 'Technical scope and milestone specifications',
    example: 'Excavation, piling, raft foundation casting, and ground beam curing.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Sequential order of this phase within the project lifecycle',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number = 1;

  @ApiProperty({
    description:
      'Percentage weight of this milestone toward overall project completion (0.00 - 100.00)',
    example: 20.0,
  })
  @IsNotEmpty({ message: 'Milestone percentage weight is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Milestone percentage weight must be greater than 0' })
  @Max(100.0, { message: 'Milestone percentage weight cannot exceed 100' })
  percentage: number;

  @ApiPropertyOptional({
    description: 'Current milestone execution status',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNED,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus = ProjectStatus.PLANNED;

  @ApiPropertyOptional({
    description: 'Planned or actual start date (ISO string)',
    example: '2026-12-05T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Target completion date for this milestone (ISO string)',
    example: '2027-01-30T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;
}
