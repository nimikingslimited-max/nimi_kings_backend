import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
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

export class CreateFarmDto {
  @ApiProperty({
    description: 'Name of the farm estate or agricultural facility',
    example: 'NIMI Green Horizon Farm Estate',
  })
  @IsNotEmpty({ message: 'Farm name is required' })
  @IsString()
  @MinLength(3, { message: 'Farm name must be at least 3 characters' })
  @MaxLength(150, { message: 'Farm name cannot exceed 150 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the farm asset, topography, and farming focus',
    example:
      '50-hectare commercial agricultural estate specialized in high-yield cassava and hybrid maize cultivation with integrated drip irrigation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional Property UUID if this farm is linked to a registered land title in the property catalog',
    example: 'd8c4fa01-3e4b-4b2a-89a5-7b561c21d8b1',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Property ID must be a valid UUID' })
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'User UUID of the assigned Farm Manager or Chief Agronomist',
    example: '91748b6a-e70e-4342-a7e2-899b8c11ec2a',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Farm Manager ID must be a valid UUID' })
  farmManagerId?: string;

  @ApiPropertyOptional({
    description: 'Operational status of the farm',
    enum: FarmStatus,
    default: FarmStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(FarmStatus, { message: 'Status must be PLANNED, ACTIVE, FALLOW, or INACTIVE' })
  status?: FarmStatus = FarmStatus.ACTIVE;

  @ApiProperty({
    description: 'Total land area of the farm estate',
    example: 50.0,
  })
  @IsNotEmpty({ message: 'Total area is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Total area must be a number with at most 2 decimal places' })
  @Min(0.01, { message: 'Total area must be greater than zero' })
  totalArea: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement for the farm area',
    enum: AreaUnit,
    default: AreaUnit.HECTARES,
  })
  @IsOptional()
  @IsEnum(AreaUnit, { message: 'Area unit must be HECTARES, ACRES, SQM, or PLOTS' })
  areaUnit?: AreaUnit = AreaUnit.HECTARES;

  @ApiPropertyOptional({
    description: 'Soil classification and agronomic profile',
    example: 'Sandy Loam with rich organic humus layer and pH 6.5',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  soilType?: string;

  @ApiPropertyOptional({
    description: 'Primary irrigation infrastructure and water source',
    example: 'Industrial solar-powered borehole with automated drip lines and reservoir',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  irrigationSource?: string;

  @ApiPropertyOptional({
    description: 'Physical address or access road of the farm',
    example: 'KM 14, Epe-Ijebu Ode Agro-Corridor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({
    description: 'City or town where the farm is situated',
    example: 'Epe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({
    description: 'State where the farm is located',
    example: 'Lagos',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional({
    description: 'Country of the farm estate',
    example: 'Nigeria',
    default: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string = 'Nigeria';

  @ApiPropertyOptional({
    description: 'Latitude GPS coordinate (-90 to 90)',
    example: 6.5833,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude GPS coordinate (-180 to 180)',
    example: 3.9833,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Total operating budget allocated for this farm asset in NGN',
    example: 120000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget?: number;
}
