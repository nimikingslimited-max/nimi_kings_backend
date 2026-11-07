import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProjectUpdateMediaDto } from './create-project-update.dto.js';

export class UpdateProjectUpdateDto {
  @ApiPropertyOptional({
    description: 'Updated title of this progress update',
    example: 'Foundation Concrete Pouring Completed for Blocks A & B',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Title cannot exceed 150 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated field notes, observations, or engineering specs',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated progress percentage (0.00% to 100.00%)',
    example: 32.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Progress percentage must be a number with at most 2 decimal places' })
  @Min(0, { message: 'Progress percentage cannot be negative' })
  @Max(100, { message: 'Progress percentage cannot exceed 100%' })
  progressPercentage?: number;

  @ApiPropertyOptional({
    description: 'Updated milestone association (or null to detach)',
    example: 'b7c02b3e-1087-4345-b461-ea357b931e50',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Milestone ID must be a valid UUID' })
  milestoneId?: string;

  @ApiPropertyOptional({
    description: 'Additional media items to attach to this update',
    type: [CreateProjectUpdateMediaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectUpdateMediaDto)
  newMedia?: CreateProjectUpdateMediaDto[];
}
