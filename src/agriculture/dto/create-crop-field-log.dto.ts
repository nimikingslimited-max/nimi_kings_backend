import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CropStage, MediaType } from '@prisma/client';

export class CreateCropFieldLogMediaDto {
  @ApiPropertyOptional({
    description: 'Type of agronomic media uploaded',
    enum: MediaType,
    default: MediaType.IMAGE,
  })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType = MediaType.IMAGE;

  @ApiProperty({
    description: 'Public CDN or S3 URL of the field photo/video/document',
    example: 'https://cdn.nimikingsltd.com/agriculture/farms/epe/maize-growth-day28.jpg',
  })
  @IsNotEmpty({ message: 'Media URL is required' })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Cloud storage object key or path',
    example: 'agriculture/farms/epe/maize-growth-day28.jpg',
  })
  @IsNotEmpty({ message: 'Storage key is required' })
  @IsString()
  storageKey: string;
}

export class CreateCropFieldLogDto {
  @ApiProperty({
    description: 'Headline or summary title of this agronomic field observation',
    example: 'Week 4 Germination & Early Vegetative Scouting',
  })
  @IsNotEmpty({ message: 'Log title is required' })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Detailed field observations, canopy cover, pest checks, and agronomist remarks',
    example:
      '95% germination rate observed across Plot B. Foliage shows vigorous nitrogen uptake with zero fall armyworm incidence. Soil moisture levels optimal following morning drip irrigation cycle.',
  })
  @IsNotEmpty({ message: 'Notes are required' })
  @IsString()
  notes: string;

  @ApiProperty({
    description: 'Current crop development stage observed in the field',
    enum: CropStage,
    example: CropStage.VEGETATIVE_GROWTH,
  })
  @IsNotEmpty({ message: 'Crop stage is required' })
  @IsEnum(CropStage)
  stage: CropStage;

  @ApiPropertyOptional({
    description: 'Weather conditions during field observation',
    example: 'Partly sunny, 31°C, 65% humidity, zero rain',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  weatherCondition?: string;

  @ApiPropertyOptional({
    description: 'Soil condition, moisture level, or fertility observations',
    example: 'Damp loamy soil, good aeration, no waterlogging',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  soilCondition?: string;

  @ApiPropertyOptional({
    description: 'Estimated biological growth / canopy maturity percentage (0.00% to 100.00%)',
    example: 35.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  growthPercentage?: number;

  @ApiPropertyOptional({
    description: 'Attached media items (drone photos, field pictures, soil lab reports)',
    type: [CreateCropFieldLogMediaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCropFieldLogMediaDto)
  media?: CreateCropFieldLogMediaDto[];
}
