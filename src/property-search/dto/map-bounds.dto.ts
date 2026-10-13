import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingType, PropertyType } from '@prisma/client';

export class MapBoundsDto {
  @ApiProperty({
    example: 9.15,
    description: 'North-East bounding box latitude',
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  northEastLat: number;

  @ApiProperty({
    example: 7.6,
    description: 'North-East bounding box longitude',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  northEastLng: number;

  @ApiProperty({
    example: 8.95,
    description: 'South-West bounding box latitude',
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  southWestLat: number;

  @ApiProperty({
    example: 7.4,
    description: 'South-West bounding box longitude',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  southWestLng: number;

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
}
