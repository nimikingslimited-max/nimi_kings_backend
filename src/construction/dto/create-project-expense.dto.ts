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

export class CreateProjectExpenseDto {
  @ApiProperty({
    description: 'Expense classification category (e.g. MATERIALS, LABOUR, EQUIPMENT, PERMITS, SUBCONTRACTOR, LOGISTICS, OTHER)',
    example: 'MATERIALS',
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsString()
  @MaxLength(60)
  category: string;

  @ApiProperty({
    description: 'Detailed description / itemized receipt narrative for this expenditure',
    example: 'Procurement of 500 bags of Dangote 42.5R Portland cement for second floor decking',
  })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Monetary amount spent in the specified currency (must be positive)',
    example: 4500000,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a valid number with at most 2 decimal places' })
  @Min(0.01, { message: 'Expense amount must be greater than zero' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Three-letter currency code (ISO 4217)',
    example: 'NGN',
    default: 'NGN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'NGN';

  @ApiPropertyOptional({
    description: 'Date the expenditure occurred (ISO 8601). Defaults to current timestamp.',
    example: '2026-11-07T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Expense date must be a valid ISO 8601 string' })
  expenseDate?: string;
}
