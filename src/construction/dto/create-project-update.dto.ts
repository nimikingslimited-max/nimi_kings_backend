import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '@prisma/client';

export class CreateProjectUpdateMediaDto {
  @ApiPropertyOptional({
    description: 'Type of media uploaded',
    enum: MediaType,
    default: MediaType.IMAGE,
  })
  @IsOptional()
  @IsEnum(MediaType, {
    message: 'Media type must be IMAGE, VIDEO, PANORAMA_360, or DOCUMENT',
  })
  type?: MediaType = MediaType.IMAGE;

  @ApiProperty({
    description: 'Public CDN or S3 URL of the uploaded media file',
    example: 'https://cdn.nimikingsltd.com/construction/updates/foundation-pour-day3.jpg',
  })
  @IsNotEmpty({ message: 'Media URL is required' })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Cloud storage object key or path',
    example: 'construction/projects/proj-123/updates/foundation-pour-day3.jpg',
  })
  @IsNotEmpty({ message: 'Storage key is required' })
  @IsString()
  storageKey: string;
}

export class CreateProjectUpdateDto {
  @ApiProperty({
    description: 'Headline or summary title of this progress update',
    example: 'Foundation Concrete Pouring Completed for Block A',
  })
  @IsNotEmpty({ message: 'Update title is required' })
  @IsString()
  @MaxLength(150, { message: 'Title cannot exceed 150 characters' })
  title: string;

  @ApiProperty({
    description: 'Detailed field observations, engineering logs, and notes',
    example:
      'High-grade C30/37 concrete pour finished for ground floor raft foundation. Quality cube tests taken for 7-day and 28-day curing assessment. Weather conditions were favorable with zero rain disruption.',
  })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  description: string;

  @ApiProperty({
    description:
      'Cumulative or stage progress percentage achieved (0.00% to 100.00%)',
    example: 28.5,
  })
  @IsNotEmpty({ message: 'Progress percentage is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Progress percentage must be a number with at most 2 decimal places' })
  @Min(0, { message: 'Progress percentage cannot be negative' })
  @Max(100, { message: 'Progress percentage cannot exceed 100%' })
  progressPercentage: number;

  @ApiPropertyOptional({
    description: 'Associated construction milestone ID if this update tracks a specific phase',
    example: 'b7c02b3e-1087-4345-b461-ea357b931e50',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Milestone ID must be a valid UUID' })
  milestoneId?: string;

  @ApiPropertyOptional({
    description: 'Attached media items (photos, videos, drone imagery, site reports)',
    type: [CreateProjectUpdateMediaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectUpdateMediaDto)
  media?: CreateProjectUpdateMediaDto[];
}
