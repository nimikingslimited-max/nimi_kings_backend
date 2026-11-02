import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeactivateAccountDto {
  @ApiProperty({
    example: 'Password123!',
    description:
      'Current password for confirmation to prevent accidental account deactivation',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    example: 'No longer actively searching for real estate property.',
    description: 'Optional reason for account deactivation',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
