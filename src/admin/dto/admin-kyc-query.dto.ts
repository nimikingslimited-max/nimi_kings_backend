import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KycStatus, IdType } from '@prisma/client';

export class AdminKycQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by customer KYC compliance status',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;

  @ApiPropertyOptional({
    description: 'Search customer name, email, phone, or idNumber',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by national/government identity document type',
    enum: IdType,
  })
  @IsOptional()
  @IsEnum(IdType)
  idType?: IdType;

  @ApiPropertyOptional({
    description: 'Field to sort results by',
    enum: ['kycSubmittedAt', 'createdAt', 'kycReviewedAt'],
    default: 'kycSubmittedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'kycSubmittedAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
