import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFarmExpenseDto {
  @ApiProperty({
    description: 'Expense category (SEEDS, FERTILIZER, AGROCHEMICALS, LABOUR, EQUIPMENT_RENTAL, IRRIGATION, TRANSPORT, OTHER)',
    example: 'FERTILIZER',
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsString()
  @MaxLength(60)
  category: string;

  @ApiProperty({
    description: 'Detailed description of the expense or input itemization',
    example: 'Procurement of 120 bags of NPK 15:15:15 fertilizer for first top-dressing',
  })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Expenditure amount in currency',
    example: 4800000,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than zero' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional crop cycle UUID if this expense is directly attributed to a specific crop',
    example: '6e2cf153-3d11-4d9d-bd8d-123c199fa6b4',
  })
  @IsOptional()
  @IsUUID('4')
  cropCycleId?: string;

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
    description: 'Date the expense was incurred (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}
