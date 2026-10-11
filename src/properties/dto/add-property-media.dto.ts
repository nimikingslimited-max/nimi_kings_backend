import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '@prisma/client';

export class AddPropertyMediaDto {
  @ApiProperty({
    enum: MediaType,
    default: MediaType.IMAGE,
    description: 'Media category',
  })
  @IsEnum(MediaType)
  @IsNotEmpty()
  type: MediaType;

  @ApiProperty({
    example: 'https://cdn.nimikingsltd.com/properties/guzape-front.jpg',
    description: 'CDN or S3 public access URL',
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    example: 'properties/guzape-front.jpg',
    description: 'Cloud object storage key for lifecycle management',
  })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiProperty({
    example: 'https://cdn.nimikingsltd.com/properties/guzape-front-thumb.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ example: 0, default: 0, required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({
    example: true,
    default: false,
    description: 'Whether this media is the primary thumbnail card',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
