import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CropStage } from '@prisma/client';

export class CropCycleQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter crop cycles by lifecycle stage', enum: CropStage })
  @IsOptional()
  @IsEnum(CropStage)
  stage?: CropStage;

  @ApiPropertyOptional({ description: 'Filter or search by crop name keyword' })
  @IsOptional()
  @IsString()
  cropName?: string;
}
