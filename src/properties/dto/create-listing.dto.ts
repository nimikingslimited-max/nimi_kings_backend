import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingStatus, ListingType } from '@prisma/client';

export class CreateListingDto {
  @ApiProperty({
    enum: ListingType,
    default: ListingType.SALE,
    description: 'Type of commercial offer (SALE, RENT, LEASE, INVESTMENT)',
  })
  @IsEnum(ListingType)
  @IsNotEmpty()
  listingType: ListingType;

  @ApiProperty({ example: 120000000, description: 'Price amount in designated currency' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'NGN', default: 'NGN', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    example: true,
    default: false,
    description: 'Whether installment/payment plans are supported',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  paymentPlanAvailable?: boolean;

  @ApiProperty({
    enum: ListingStatus,
    default: ListingStatus.DRAFT,
    description: 'Publishing status',
    required: false,
  })
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;
}
