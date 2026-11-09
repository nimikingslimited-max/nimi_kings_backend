import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QualityGrade } from '@prisma/client';

export class UpdateHarvestRecordDto {
  @ApiPropertyOptional({
    description: 'Updated harvest quantity',
    example: 20.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @ApiPropertyOptional({
    description: 'Quality grading',
    enum: QualityGrade,
  })
  @IsOptional()
  @IsEnum(QualityGrade)
  qualityGrade?: QualityGrade;

  @ApiPropertyOptional({
    description: 'Updated harvest date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({
    description: 'Updated storage location',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  storageLocation?: string;

  @ApiPropertyOptional({
    description: 'Updated estimated valuation',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;

  @ApiPropertyOptional({
    description: 'Updated notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
