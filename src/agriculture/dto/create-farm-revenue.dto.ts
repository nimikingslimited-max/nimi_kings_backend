import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFarmRevenueDto {
  @ApiProperty({
    description: 'Produce item sold',
    example: '50 Metric Tons White Maize (Grade A Grain)',
  })
  @IsNotEmpty({ message: 'Produce description is required' })
  @IsString()
  @MaxLength(150)
  produceSold: string;

  @ApiProperty({
    description: 'Quantity sold',
    example: 50.0,
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'METRIC_TONS',
    default: 'KG',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string = 'KG';

  @ApiProperty({
    description: 'Unit price per quantity sold in currency',
    example: 550000,
  })
  @IsNotEmpty({ message: 'Unit price is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Total revenue amount. If omitted, calculated automatically as quantity * unitPrice.',
    example: 27500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Name of the off-taker, agro-processor, or bulk commodity buyer',
    example: 'Crown Flour Mills & Feed Millers Ltd',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  buyerName?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'NGN',
    default: 'NGN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'NGN';

  @ApiPropertyOptional({
    description: 'Date the sale was executed (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  saleDate?: string;
}
