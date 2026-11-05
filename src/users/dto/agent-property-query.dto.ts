import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingStatus, ListingType, PropertyType } from '@prisma/client';

export class AgentPropertyQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Lekki',
    description: 'Search term by property title, propertyCode, address, or city',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PropertyType,
    description: 'Filter by property type (HOUSE, LAND, APARTMENT, COMMERCIAL, etc.)',
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    enum: ListingType,
    description: 'Filter by listing transaction type (SALE, RENT, LEASE, INVESTMENT)',
  })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional({
    enum: ListingStatus,
    description: 'Filter by listing status (PUBLISHED, DRAFT, SOLD, RENTED)',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({ example: 'Lagos', description: 'Filter by state' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Lekki', description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;
}
