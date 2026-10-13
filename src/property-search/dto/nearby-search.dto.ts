import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingType, PropertyType } from '@prisma/client';

export class NearbySearchDto {
  @ApiProperty({
    example: 9.0355,
    description: 'Latitude of the search center point (e.g. Abuja Guzape)',
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @ApiProperty({
    example: 7.5152,
    description: 'Longitude of the search center point',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({
    example: 15,
    default: 15,
    description: 'Search radius in kilometers (km)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(500)
  @Type(() => Number)
  radiusKm?: number = 15;

  @ApiPropertyOptional({
    enum: PropertyType,
    description: 'Filter by property type',
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    enum: ListingType,
    description: 'Filter by listing type',
  })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional({
    example: false,
    description: 'Only include verified properties',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Maximum number of nearby properties to return',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
