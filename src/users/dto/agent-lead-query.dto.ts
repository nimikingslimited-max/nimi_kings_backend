import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnquiryStatus, EnquiryType } from '@prisma/client';

export class AgentLeadQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: EnquiryStatus,
    description: 'Filter leads by status (NEW, IN_PROGRESS, RESOLVED, CLOSED)',
  })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  @ApiPropertyOptional({
    enum: EnquiryType,
    description: 'Filter by enquiry type (GENERAL_ENQUIRY, PURCHASE_REQUEST, etc.)',
  })
  @IsOptional()
  @IsEnum(EnquiryType)
  type?: EnquiryType;

  @ApiPropertyOptional({
    description: 'Filter leads by specific property UUID',
    example: 'd2730da4-1234-4567-8901-abcdef123456',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({
    example: 'Okonkwo',
    description: 'Search customer name, email, phone number, or property title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
