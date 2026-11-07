import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProjectExpenseDto {
  @ApiPropertyOptional({
    description: 'Updated expense category',
    example: 'EQUIPMENT',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the expenditure',
    example: 'Rental of 45-ton mobile crane for precast beam placement (adjusted)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated monetary amount',
    example: 3200000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a valid number with at most 2 decimal places' })
  @Min(0.01, { message: 'Expense amount must be greater than zero' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Updated currency code',
    example: 'NGN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Updated date of expenditure (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Expense date must be a valid ISO 8601 string' })
  expenseDate?: string;
}
