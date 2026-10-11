import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RiskLevel, VerificationStatus } from '@prisma/client';

export class VerificationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: VerificationStatus,
    description: 'Filter by verification status',
  })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({
    enum: RiskLevel,
    description: 'Filter by assessed risk level',
  })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({
    example: 'a4afb82c-7eef-47fa-b5f3-c5339bc19044',
    description: 'Filter by assigned officer user ID',
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({
    example: 'NK-PROP-537643',
    description: 'Search by property title or verification/property code',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
