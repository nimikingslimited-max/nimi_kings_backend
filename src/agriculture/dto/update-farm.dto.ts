import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FarmStatus, AreaUnit } from '@prisma/client';

export class UpdateFarmDto {
  @ApiPropertyOptional({
    description: 'Updated name of the farm',
    example: 'NIMI Green Horizon Farm Estate (Phase 1 & 2)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the farm asset',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Linked Property UUID in the catalog (or null to unlink)',
    example: 'd8c4fa01-3e4b-4b2a-89a5-7b561c21d8b1',
  })
  @IsOptional()
  @IsUUID('4')
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'User UUID of the assigned Farm Manager',
  })
  @IsOptional()
  @IsUUID('4')
  farmManagerId?: string;

  @ApiPropertyOptional({
    description: 'Operational status of the farm',
    enum: FarmStatus,
  })
  @IsOptional()
  @IsEnum(FarmStatus)
  status?: FarmStatus;

  @ApiPropertyOptional({
    description: 'Total land area',
    example: 65.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalArea?: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement for the farm area',
    enum: AreaUnit,
  })
  @IsOptional()
  @IsEnum(AreaUnit)
  areaUnit?: AreaUnit;

  @ApiPropertyOptional({
    description: 'Updated soil profile notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  soilType?: string;

  @ApiPropertyOptional({
    description: 'Updated irrigation infrastructure specifications',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  irrigationSource?: string;

  @ApiPropertyOptional({
    description: 'Physical address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({
    description: 'City or town',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({
    description: 'State',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional({
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({
    description: 'Latitude GPS coordinate (-90 to 90)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude GPS coordinate (-180 to 180)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Updated operating budget in NGN',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget?: number;
}
