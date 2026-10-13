import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { EnquiryStatus } from '@prisma/client';

export class UpdateEnquiryStatusDto {
  @ApiProperty({
    enum: EnquiryStatus,
    example: EnquiryStatus.IN_PROGRESS,
    description: 'Updated lifecycle status of the enquiry',
  })
  @IsEnum(EnquiryStatus)
  @IsNotEmpty()
  status: EnquiryStatus;
}
