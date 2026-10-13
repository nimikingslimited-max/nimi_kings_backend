import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnquiryType } from '@prisma/client';

export class CreateEnquiryDto {
  @ApiProperty({
    example: 'NK-PROP-537643',
    description: 'Property UUID or Property Code (e.g. NK-PROP-XXXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiPropertyOptional({
    enum: EnquiryType,
    default: EnquiryType.GENERAL_ENQUIRY,
    example: EnquiryType.PURCHASE_REQUEST,
    description: 'Category of the customer enquiry',
  })
  @IsOptional()
  @IsEnum(EnquiryType)
  type?: EnquiryType = EnquiryType.GENERAL_ENQUIRY;

  @ApiProperty({
    example:
      'I am interested in purchasing 2 plots at this estate. Is the 12-month payment plan available?',
    description: 'Detailed message or inquiry from the customer',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
