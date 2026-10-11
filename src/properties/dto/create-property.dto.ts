import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PropertyType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePropertyDto {
  @ApiProperty({
    example: 'Luxury 4-Bedroom Terrace Duplex',
    description: 'Title of the property',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Exquisite modern duplex in a gated estate with top infrastructure.',
    description: 'Detailed description of the property',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: PropertyType,
    example: PropertyType.HOUSE,
    description: 'Physical property type',
  })
  @IsEnum(PropertyType)
  @IsNotEmpty()
  propertyType: PropertyType;

  @ApiProperty({
    example: 450.5,
    description: 'Land or floor size area',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  landSize?: number;

  @ApiProperty({
    example: 'sqm',
    description: 'Unit of measurement (sqm, hectares, plots)',
    default: 'sqm',
    required: false,
  })
  @IsString()
  @IsOptional()
  landSizeUnit?: string;

  @ApiProperty({ example: 4, description: 'Number of bedrooms', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @ApiProperty({ example: 5, description: 'Number of bathrooms', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;

  @ApiProperty({ example: 2, description: 'Number of parking spaces', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  parkingSpaces?: number;

  @ApiProperty({
    example: 'Plot 12, Guzape District',
    description: 'Physical street address',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Abuja', description: 'City location' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'FCT', description: 'State location' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'Nigeria', default: 'Nigeria', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 9.0432, description: 'GPS Latitude', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({ example: 7.5021, description: 'GPS Longitude', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({
    example: ['Perimeter Fencing & Security Post', '24/7 Electricity'],
    description: 'List of feature/amenity names to associate',
    required: false,
    type: [String],
  })
  @IsOptional()
  featureNames?: string[];
}
