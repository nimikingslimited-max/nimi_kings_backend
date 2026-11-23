import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class FarmFinanceQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter expenses by category keyword' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter transactions by crop cycle UUID' })
  @IsOptional()
  @IsUUID('4')
  cropCycleId?: string;

  @ApiPropertyOptional({ description: 'Filter transactions on or after date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter transactions on or before date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
