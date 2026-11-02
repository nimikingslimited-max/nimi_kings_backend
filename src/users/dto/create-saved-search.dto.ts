import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PropertyType, ListingType } from '@prisma/client';

export class CreateSavedSearchDto {
  @ApiProperty({
    example: 'Luxury 3-Bed Duplexes in Lekki',
    description: 'Human-friendly title for this saved search alert',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    enum: PropertyType,
    example: PropertyType.HOUSE,
    description: 'Filter by physical property type',
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    enum: ListingType,
    example: ListingType.SALE,
    description: 'Filter by listing type (SALE, RENT, LEASE)',
  })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional({
    example: 'Lekki',
    description: 'Target city or district',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Lagos',
    description: 'Target state',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 40000000,
    description: 'Minimum listing price in NGN',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 120000000,
    description: 'Maximum listing price in NGN',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Minimum number of bedrooms',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Minimum number of bathrooms',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    default: true,
    description:
      'Whether to receive email digests when new matching listings are published',
  })
  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean = true;

  @ApiPropertyOptional({
    default: true,
    description:
      'Whether to receive in-app push alerts when matching listings are published',
  })
  @IsOptional()
  @IsBoolean()
  notifyPush?: boolean = true;
}
