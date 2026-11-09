import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CropStage, AreaUnit } from '@prisma/client';

export class UpdateCropCycleDto {
  @ApiPropertyOptional({
    description: 'Updated crop name',
    example: 'White Maize (Late Season)',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  cropName?: string;

  @ApiPropertyOptional({
    description: 'Updated seed variety or cultivar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  variety?: string;

  @ApiPropertyOptional({
    description: 'Updated crop stage in lifecycle',
    enum: CropStage,
  })
  @IsOptional()
  @IsEnum(CropStage)
  stage?: CropStage;

  @ApiPropertyOptional({
    description: 'Updated land area allocated',
    example: 30.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  allocatedArea?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement for the allocated area',
    enum: AreaUnit,
  })
  @IsOptional()
  @IsEnum(AreaUnit)
  areaUnit?: AreaUnit;

  @ApiPropertyOptional({
    description: 'Updated planting date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Updated expected harvest date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  expectedHarvestDate?: string;

  @ApiPropertyOptional({
    description: 'Actual harvest completion date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  actualHarvestDate?: string;

  @ApiPropertyOptional({
    description: 'Updated target yield projection',
    example: 150.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetYield?: number;

  @ApiPropertyOptional({
    description: 'Yield unit of measurement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  yieldUnit?: string;

  @ApiPropertyOptional({
    description: 'Updated operating budget in NGN',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedBudget?: number;
}
