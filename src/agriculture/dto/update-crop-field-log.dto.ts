import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CropStage } from '@prisma/client';
import { CreateCropFieldLogMediaDto } from './create-crop-field-log.dto.js';

export class UpdateCropFieldLogDto {
  @ApiPropertyOptional({
    description: 'Updated log title',
    example: 'Week 4 Germination Scouting & Foliar Fertilizer Application',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated agronomic notes and observations',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Updated crop stage',
    enum: CropStage,
  })
  @IsOptional()
  @IsEnum(CropStage)
  stage?: CropStage;

  @ApiPropertyOptional({
    description: 'Updated weather conditions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  weatherCondition?: string;

  @ApiPropertyOptional({
    description: 'Updated soil observations',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  soilCondition?: string;

  @ApiPropertyOptional({
    description: 'Updated growth percentage (0.00% to 100.00%)',
    example: 40.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  growthPercentage?: number;

  @ApiPropertyOptional({
    description: 'Additional media items to attach to this log',
    type: [CreateCropFieldLogMediaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCropFieldLogMediaDto)
  newMedia?: CreateCropFieldLogMediaDto[];
}
