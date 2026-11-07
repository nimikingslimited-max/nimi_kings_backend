import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
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

export class UpdateMilestoneDto {
  @ApiPropertyOptional({
    description: 'Updated milestone name',
    example: 'Foundation & Deep Substructure',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated scope description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Sequential order of execution',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({
    description: 'Percentage weight toward completion (0.01 - 100.00)',
    example: 25.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100.0)
  percentage?: number;

  @ApiPropertyOptional({
    description: 'Updated milestone status (PLANNED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED)',
    enum: ProjectStatus,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: 'Milestone start date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Target completion date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @ApiPropertyOptional({
    description: 'Actual date completed (ISO string). Automatically set to current timestamp if status is marked COMPLETED.',
  })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
