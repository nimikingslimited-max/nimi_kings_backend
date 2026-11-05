import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListingStatus } from '@prisma/client';

export class UpdateListingStatusDto {
  @ApiProperty({
    description: 'Target commercial listing status (PUBLISHED, DRAFT, PENDING_APPROVAL, SUSPENDED, SOLD, RENTED, EXPIRED)',
    enum: ListingStatus,
    example: ListingStatus.PUBLISHED,
  })
  @IsNotEmpty({ message: 'Listing status is required' })
  @IsEnum(ListingStatus)
  status: ListingStatus;

  @ApiPropertyOptional({
    description: 'Administrative reason or justification for status change',
    example: 'Approved for public listing following successful C of O document verification',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
