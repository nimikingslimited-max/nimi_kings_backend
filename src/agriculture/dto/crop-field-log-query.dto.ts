import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CropStage } from '@prisma/client';

export class CropFieldLogQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of logs per page', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter logs by crop lifecycle stage', enum: CropStage })
  @IsOptional()
  @IsEnum(CropStage)
  stage?: CropStage;

  @ApiPropertyOptional({ description: 'Filter logs recorded on or after date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter logs recorded on or before date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
