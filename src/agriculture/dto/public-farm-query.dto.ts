import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FarmStatus } from '@prisma/client';

export class PublicFarmQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of farms per page', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by farm status', enum: FarmStatus })
  @IsOptional()
  @IsEnum(FarmStatus)
  status?: FarmStatus;

  @ApiPropertyOptional({ description: 'Filter by state' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Filter by city or LGA' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Keyword search across farm name, code, description, and crop focus' })
  @IsOptional()
  @IsString()
  search?: string;
}
