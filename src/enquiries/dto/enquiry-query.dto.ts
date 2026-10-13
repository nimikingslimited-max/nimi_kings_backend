import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnquiryStatus, EnquiryType } from '@prisma/client';

export class EnquiryQueryDto {
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
    enum: EnquiryStatus,
    description: 'Filter enquiries by status',
  })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  @ApiPropertyOptional({
    enum: EnquiryType,
    description: 'Filter enquiries by type',
  })
  @IsOptional()
  @IsEnum(EnquiryType)
  type?: EnquiryType;

  @ApiPropertyOptional({
    description: 'Filter by property UUID or Property Code',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned agent user ID',
  })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Search by customer name, email, property title, or message',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
