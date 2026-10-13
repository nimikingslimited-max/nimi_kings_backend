import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingType, PropertyType } from '@prisma/client';

export class AdvancedSearchDto {
  @ApiPropertyOptional({
    example: 'Guzape Hillside',
    description:
      'Keyword search across property title, description, address, city, or property code',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    enum: PropertyType,
    example: PropertyType.LAND,
    description: 'Filter by property category',
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    enum: ListingType,
    example: ListingType.SALE,
    description: 'Filter by commercial listing type (SALE, RENT, LEASE, INVESTMENT)',
  })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional({
    example: 'FCT',
    description: 'Filter by state / region',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'Abuja',
    description: 'Filter by city / district',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 5000000,
    description: 'Minimum listing price in NGN',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 150000000,
    description: 'Maximum listing price in NGN',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Minimum number of bedrooms',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minBedrooms?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum number of bathrooms',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minBathrooms?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Minimum land size in sqm',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minLandSize?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Maximum land size in sqm',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxLandSize?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Only include listings offering flexible payment plans',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  paymentPlanAvailable?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Only include properties that have completed NIMI KINGS title verification (VERIFIED)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({
    example: 'Access Road,Perimeter Fencing',
    description: 'Comma-separated list of required property features/amenities',
  })
  @IsOptional()
  @IsString()
  features?: string;

  @ApiPropertyOptional({
    enum: ['newest', 'price_asc', 'price_desc', 'land_size_desc'],
    default: 'newest',
    description: 'Sorting order for search results',
  })
  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc', 'land_size_desc'])
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'land_size_desc' = 'newest';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 12;
}
