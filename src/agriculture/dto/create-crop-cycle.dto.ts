import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CropStage, AreaUnit } from '@prisma/client';

export class CreateCropCycleDto {
  @ApiProperty({
    description: 'Name of the crop being cultivated (e.g. Cassava, White Maize, Soybean, Oil Palm, Tomato)',
    example: 'White Maize',
  })
  @IsNotEmpty({ message: 'Crop name is required' })
  @IsString()
  @MinLength(2, { message: 'Crop name must be at least 2 characters' })
  @MaxLength(100)
  cropName: string;

  @ApiPropertyOptional({
    description: 'Specific seed variety or cultivar',
    example: 'Oba Super 2 (High Yield Hybrid)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  variety?: string;

  @ApiPropertyOptional({
    description: 'Initial stage of the crop cycle',
    enum: CropStage,
    default: CropStage.PLANNED,
  })
  @IsOptional()
  @IsEnum(CropStage)
  stage?: CropStage = CropStage.PLANNED;

  @ApiProperty({
    description: 'Land area allocated to this crop cycle',
    example: 25.0,
  })
  @IsNotEmpty({ message: 'Allocated area is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Allocated area must be greater than zero' })
  allocatedArea: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement for the allocated area',
    enum: AreaUnit,
    default: AreaUnit.HECTARES,
  })
  @IsOptional()
  @IsEnum(AreaUnit)
  areaUnit?: AreaUnit = AreaUnit.HECTARES;

  @ApiPropertyOptional({
    description: 'Target planting or cycle commencement date (ISO 8601)',
    example: '2026-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Expected harvest date based on crop maturation period (ISO 8601)',
    example: '2027-02-28T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expectedHarvestDate?: string;

  @ApiPropertyOptional({
    description: 'Target yield projection for this cycle',
    example: 120.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetYield?: number;

  @ApiPropertyOptional({
    description: 'Yield unit of measurement (e.g. METRIC_TONS, KG, BAGS)',
    example: 'METRIC_TONS',
    default: 'KG',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  yieldUnit?: string = 'KG';

  @ApiPropertyOptional({
    description: 'Estimated operating budget for this crop cycle in NGN',
    example: 18500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedBudget?: number;
}
