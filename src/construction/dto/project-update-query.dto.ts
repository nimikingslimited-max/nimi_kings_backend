import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ProjectUpdateQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of updates per page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter updates by milestone UUID' })
  @IsOptional()
  @IsUUID('4')
  milestoneId?: string;

  @ApiPropertyOptional({ description: 'Filter updates created on or after date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter updates created on or before date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
