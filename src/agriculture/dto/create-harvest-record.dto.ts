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
} from 'class-validator';
import { Type } from 'class-transformer';
import { QualityGrade } from '@prisma/client';

export class CreateHarvestRecordDto {
  @ApiProperty({
    description: 'Harvested physical quantity (gross or sorted weight)',
    example: 18.5,
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Quantity must be a valid number with at most 2 decimal places' })
  @Min(0.01, { message: 'Harvest quantity must be greater than zero' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement for harvested produce',
    example: 'METRIC_TONS',
    default: 'KG',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string = 'KG';

  @ApiPropertyOptional({
    description: 'Produce quality grading assessment',
    enum: QualityGrade,
    default: QualityGrade.GRADE_A,
  })
  @IsOptional()
  @IsEnum(QualityGrade)
  qualityGrade?: QualityGrade = QualityGrade.GRADE_A;

  @ApiPropertyOptional({
    description: 'Date the harvest occurred (ISO 8601). Defaults to current timestamp.',
    example: '2026-11-09T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({
    description: 'Warehouse, silo, cold room, or storage facility location',
    example: 'Silo 2, Epe Grain Storage & Processing Hub',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Estimated market or farm-gate value in currency',
    example: 9250000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;

  @ApiPropertyOptional({
    description: 'Currency code for estimated value',
    example: 'NGN',
    default: 'NGN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'NGN';

  @ApiPropertyOptional({
    description: 'Moisture content, post-harvest sorting, or drying notes',
    example: 'Harvested at 14% kernel moisture. Cleaned, destoned, and packaged in 50kg branded sacks.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
